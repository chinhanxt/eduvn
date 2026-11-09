import { describe, expect, it, vi } from "vitest";
import { ServerClock } from "../src/student/clock";
import { EventOutbox, LeaveTracker, watchLeave } from "../src/student/leave";
import { AnswerSync, type Draft, type DraftStore, type SendResult, memoryStore, watchFlushOnHide } from "../src/student/syncQueue";
import { autosaveSender, hsFetch, loadSession } from "../src/student/studentApi";
import { acquireWriter } from "../src/student/writerLock";

const ok = (seq: number): SendResult => ({ kind: "ok", seq });

describe("ServerClock neo performance.now", () => {
  it("đổi giờ hệ thống không làm nhảy now()", () => {
    let mono = 100;
    const wall = { v: 5_000_000 }; // giờ hệ thống: không được dùng
    const c = new ServerClock(() => mono);
    c.sample(new Date(1_000_050).toISOString(), 100, 200); // offset = 1_000_050 - 150
    mono += 1000;
    wall.v += 3_600_000;
    expect(c.now()).toBe(mono + 1_000_050 - 150);
    expect(c.remainingMs(new Date(1_011_000).toISOString())).toBe(1_011_000 - (mono + 1_000_050 - 150));
  });
  it("mẫu may mắn sớm rồi trôi lệch: sau 60 s nhận mẫu trễ hơn để sửa; lệch > 2 s cần hai mẫu liên tiếp", () => {
    let mono = 0;
    const c = new ServerClock(() => mono);
    c.sample(new Date(10_005).toISOString(), 0, 10); // rtt 10, offset 10_000
    expect(c.now()).toBe(10_000);
    mono = 10_000;
    c.sample(new Date(20_000 + 10_100 + 150).toISOString(), 10_000, 10_300); // rtt 300 > 60 → bỏ (best còn mới)
    expect(c.now()).toBe(20_000);
    mono = 70_000; // đồng hồ máy trôi: server thật = mono + 10_150
    c.sample(new Date(70_000 + 10_150 + 100).toISOString(), 70_000, 70_200); // rtt 200, best đã cũ → nhận
    expect(c.now()).toBe(80_150);
    // nhảy > 2 s: một mẫu lẻ bị bỏ, hai mẫu khớp nhau thì nhận
    mono = 71_000;
    c.sample(new Date(71_000 + 30_000 + 400).toISOString(), 71_000, 71_800);
    expect(c.now()).toBe(71_000 + 10_150);
    c.sample(new Date(71_000 + 30_000 + 400).toISOString(), 71_000, 71_800);
    expect(c.now()).toBe(71_000 + 30_000);
  });
});

describe("AnswerSync: nhiều tab, kho hỏng, pagehide", () => {
  const noSend = async (seq: number) => ok(seq);

  it("tab không giữ khoá chuyển chỉ-đọc, báo sự kiện, không ghi", async () => {
    const store = memoryStore();
    const ev: string[] = [];
    const sent: number[] = [];
    const s = await AnswerSync.open(store, "a", { seq: 0, answers: {} }, async (q) => (sent.push(q), ok(q)), undefined, undefined, { onEvent: (e) => ev.push(e), acquire: async () => ({ held: false, release() {} }) });
    expect(s.readonly).toBe(true);
    expect(ev).toEqual(["readonly"]);
    await s.set(1, 1);
    await s.flush();
    expect(s.answers).toEqual({});
    expect(sent).toEqual([]);
    expect(await store.get("a")).toBeUndefined();
  });

  it("mất khoá giữa chừng → chỉ-đọc", async () => {
    let lost = () => {};
    const ev: string[] = [];
    const s = await AnswerSync.open(memoryStore(), "a", { seq: 0, answers: {} }, noSend, undefined, undefined, { onEvent: (e) => ev.push(e), acquire: async (_i, onLost) => ((lost = onLost), { held: true, release() {} }) });
    await s.set(1, 1);
    lost();
    await s.set(1, 2);
    expect(s.answers["1"]).toBe(1);
    expect(s.readonly && ev.includes("readonly")).toBe(true);
  });

  it("seq = max(bản hiện tại, sàn lúc mở)+1", async () => {
    const store = memoryStore();
    await store.put({ submissionId: "a", seq: 10, syncedSeq: 3, answers: { "1": 1 }, flags: [], updatedAt: 0 }); // bản máy cũ ghi tới 10
    const s = await AnswerSync.open(store, "a", { seq: 20, answers: {} }, noSend);
    await s.set(1, 2);
    expect(s.seq).toBe(21);
    expect((await s.forSubmit()).seq).toBe(22);
  });

  it("keepalive bỏ qua giờ chờ và lần gửi đang chạy", async () => {
    let t = 0;
    const sent: [number, boolean][] = [];
    const results: SendResult[] = [{ kind: "retry", afterMs: 60_000 }];
    const s = await AnswerSync.open(memoryStore(), "a", { seq: 0, answers: {} }, async (q, _a, o) => (sent.push([q, o.keepalive]), results.shift() ?? ok(q)), undefined, () => t);
    await s.set(1, 1);
    await s.flush();
    await s.flush();
    expect(sent).toHaveLength(1);
    await s.flush(true);
    expect(sent).toEqual([[1, false], [1, true]]);
    expect(s.status).toBe("saved");
    // đang gửi dở vẫn cho keepalive đi song song
    let release: (r: SendResult) => void = () => {};
    const sent2: boolean[] = [];
    const s2 = await AnswerSync.open(memoryStore(), "b", { seq: 0, answers: {} }, (q, _a, o) => (sent2.push(o.keepalive), sent2.length === 1 ? new Promise<SendResult>((r) => (release = r)) : Promise.resolve(ok(q))));
    await s2.set(1, 1);
    const p = s2.flush();
    await Promise.resolve();
    await s2.flush(true);
    release(ok(1));
    await p;
    expect(sent2).toEqual([false, true]);
  });

  it("pagehide và visibilitychange→hidden gọi flush(true)", () => {
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible" }) as unknown as Document;
    const win = new EventTarget() as unknown as Window;
    const calls: boolean[] = [];
    const off = watchFlushOnHide((k) => calls.push(k), doc, win);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(calls).toEqual([]);
    (doc as { visibilityState: string }).visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    win.dispatchEvent(new Event("pagehide"));
    expect(calls).toEqual([true, true]);
    off();
    win.dispatchEvent(new Event("pagehide"));
    expect(calls).toHaveLength(2);
  });

  it("kho máy hỏng: chuyển bộ nhớ, giữ bản nháp, báo degraded, vẫn gửi", async () => {
    let puts = 0;
    const bad: DraftStore = { get: async () => undefined, put: async () => { if (puts++ > 0) throw new Error("quota"); } };
    const ev: string[] = [];
    const sent: number[] = [];
    const s = await AnswerSync.open(bad, "a", { seq: 0, answers: {} }, async (q) => (sent.push(q), ok(q)), undefined, undefined, { onEvent: (e) => ev.push(e) });
    expect(s.degraded).toBe(false);
    await s.set(1, 5);
    expect(s.degraded).toBe(true);
    expect(s.answers["1"]).toBe(5);
    expect(ev).toEqual(["degraded"]);
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    expect(sent).toEqual([1]);
    expect(s.status).toBe("saved");
  });

  it("get hỏng lúc mở cũng không mất bài", async () => {
    const bad: DraftStore = { get: async () => { throw new Error("blocked"); }, put: async () => {} };
    const s = await AnswerSync.open(bad, "a", { seq: 2, answers: { "1": 1 } }, noSend);
    expect(s.degraded).toBe(true);
    expect(s.answers).toEqual({ "1": 1 });
  });

  it("401 khi gửi → sự kiện unauthorized", async () => {
    const ev: string[] = [];
    const s = await AnswerSync.open(memoryStore(), "a", { seq: 0, answers: {} }, async () => ({ kind: "unauthorized" }), undefined, undefined, { onEvent: (e) => ev.push(e) });
    await s.set(1, 1);
    await s.flush();
    expect(ev).toEqual(["unauthorized"]);
    expect(s.status).toBe("offline");
  });

  it("purge xoá bản nháp sau khi nộp; sự kiện rời tab được giữ trong bản nháp", async () => {
    const store = memoryStore();
    const s = await AnswerSync.open(store, "a", { seq: 0, answers: {} }, noSend);
    await s.saveEvents([{ kind: "leave", at: 5 }]);
    await s.set(1, 1);
    const again = await AnswerSync.open(store, "a", { seq: 0, answers: {} }, noSend);
    expect(again.events).toEqual([{ kind: "leave", at: 5 }]);
    await s.purge();
    expect(await store.get("a")).toBeUndefined();
    const d: Draft = { submissionId: "z", seq: 1, syncedSeq: 1, answers: {}, flags: [], updatedAt: 0 };
    await store.put(d);
    await store.purgeAll!();
    expect(await store.get("z")).toBeUndefined();
  });
});

describe("acquireWriter", () => {
  it("Web Locks: tab đầu giữ, tab sau chỉ-đọc, nhả thì tab sau lấy được", async () => {
    const held = new Set<string>();
    const locks = {
      request: async (name: string, _o: unknown, cb: (l: unknown) => Promise<void> | void) => {
        if (held.has(name)) return cb(null);
        held.add(name);
        await cb({ name });
        held.delete(name);
      },
    };
    const a = await acquireWriter("s", () => {}, { locks });
    const b = await acquireWriter("s", () => {}, { locks });
    expect([a.held, b.held]).toEqual([true, false]);
    a.release();
    await new Promise((r) => setTimeout(r, 0));
    expect((await acquireWriter("s", () => {}, { locks })).held).toBe(true);
  });
  it("BroadcastChannel dự phòng: tab mới nhất thắng, tab cũ chỉ-đọc", async () => {
    const chans: { onmessage: ((e: { data: unknown }) => void) | null }[] = [];
    const mk = () => {
      const c = { onmessage: null as ((e: { data: unknown }) => void) | null, close() {}, postMessage(m: unknown) { for (const o of chans) if (o !== c) o.onmessage?.({ data: m }); } };
      chans.push(c);
      return c;
    };
    let lostOld = 0;
    let lostNew = 0;
    const old = await acquireWriter("s", () => lostOld++, { locks: null, channel: mk, tabId: "a", now: () => 1 });
    const fresh = await acquireWriter("s", () => lostNew++, { locks: null, channel: mk, tabId: "b", now: () => 2 });
    expect([old.held, fresh.held, lostOld, lostNew]).toEqual([false, true, 1, 0]);
  });
});

describe("LeaveTracker: chỉ blur", () => {
  function mk(hasFocus = () => false) {
    const ev: [string, number | undefined][] = [];
    let timer: (() => void) | null = null;
    let now = 100;
    const t = new LeaveTracker((k, at) => ev.push([k, at]), { now: () => now, hasFocus, setTimer: (fn) => ((timer = fn), 1), clearTimer: () => (timer = null) });
    return { t, ev, fire: () => timer?.(), advance: (n: number) => (now += n), pending: () => timer !== null };
  }
  it("ẩn tab = rời ngay, có at", () => {
    const m = mk();
    m.t.update(false, false);
    expect(m.ev).toEqual([["leave", 100]]);
  });
  it("blur rồi focus về trước 400 ms: không tính", () => {
    const m = mk();
    m.t.update(true, false);
    m.t.update(true, true);
    m.fire();
    expect(m.ev).toEqual([]);
  });
  it("blur quá hạn: rời, at là lúc blur; hasFocus() true (focus vào iframe) thì bỏ qua", () => {
    const m = mk();
    m.t.update(true, false);
    m.advance(400);
    m.fire();
    expect(m.ev).toEqual([["leave", 100]]);
    const k = mk(() => true);
    k.t.update(true, false);
    k.fire();
    expect(k.ev).toEqual([]);
  });
  it("watchLeave: focus ở iframe trong tài liệu không tính là rời", () => {
    const doc = Object.assign(new EventTarget(), { visibilityState: "visible", hasFocus: () => false, activeElement: { tagName: "IFRAME" } }) as unknown as Document;
    const win = new EventTarget() as unknown as Window;
    const seen: string[] = [];
    const t = new LeaveTracker((k) => seen.push(k), { blurDelayMs: 0 });
    watchLeave(t, doc, win);
    win.dispatchEvent(new Event("blur"));
    expect(seen).toEqual([]);
  });
});

describe("EventOutbox bền", () => {
  it("ghi hàng đợi qua persist và khôi phục từ initial", async () => {
    const saved: unknown[][] = [];
    const o = new EventOutbox((e) => void saved.push(e), [{ kind: "leave", at: 1 }]);
    o.push("return", 2);
    expect(saved.at(-1)).toEqual([{ kind: "leave", at: 1 }, { kind: "return", at: 2 }]);
    let got: unknown;
    await o.flush(async (e) => ((got = e), true));
    expect(got).toEqual([{ kind: "leave", at: 1 }, { kind: "return", at: 2 }]);
    expect(saved.at(-1)).toEqual([]);
  });
});

describe("studentApi nhỏ", () => {
  it("keepalive không chờ gửi lại 429/503", async () => {
    const fetchMock = vi.fn(async () => new Response("", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await hsFetch("/x", { keepalive: true, token: null });
    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
  it("autosaveSender: 401 xoá phiên + unauthorized", async () => {
    const store = new Map<string, string>([["eduvn.hs", "{}"]]);
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));
    expect(await autosaveSender("/api/x")(1, {}, { keepalive: false })).toEqual({ kind: "unauthorized" });
    expect(store.has("eduvn.hs")).toBe(false);
    vi.unstubAllGlobals();
  });
  it("loadSession xoá phiên hết hạn", () => {
    const store = new Map<string, string>([["eduvn.hs", JSON.stringify({ token: "t", expiresAt: 1 })]]);
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: () => {}, removeItem: (k: string) => store.delete(k) });
    expect(loadSession()).toBeNull();
    expect(store.size).toBe(0);
    vi.unstubAllGlobals();
  });
});

describe("vòng 2", () => {
  it("hai set() song song + flush xen giữa: không trùng seq, máy chủ giữ đủ cả hai đáp án", async () => {
    const m = new Map<string, Draft>();
    const slow: DraftStore = { get: async (id) => m.get(id), put: async (d) => { await new Promise((r) => setTimeout(r, 5)); m.set(d.submissionId, d); } };
    const server = { seq: 0, answers: {} as Record<string, unknown> };
    const log: number[] = [];
    const send = async (seq: number, answers: Record<string, unknown>) => {
      log.push(seq);
      if (seq > server.seq) { server.seq = seq; server.answers = answers; } // trùng/cũ bị bỏ như máy chủ thật
      return ok(seq);
    };
    const s = await AnswerSync.open(slow, "a", { seq: 0, answers: {} }, send);
    const p1 = s.set(1, "A");
    const p2 = s.set(2, "B");
    await new Promise((r) => setTimeout(r, 7)); // set(1) đã ghi xong, set(2) đang ghi
    await s.flush();
    await Promise.all([p1, p2]);
    await s.flush();
    expect(server.answers).toEqual({ "1": "A", "2": "B" });
    expect(log).toEqual([...log].sort((a, b) => a - b));
    expect(new Set(log).size).toBe(log.length);
    expect(server.seq).toBe(2);
    expect(s.dirty).toBe(false);
  });

  it("rejected: ngừng gửi, báo sự kiện kèm mã, giữ bản nháp", async () => {
    const ev: [string, number | undefined][] = [];
    const sent: number[] = [];
    const store = memoryStore();
    const s = await AnswerSync.open(store, "a", { seq: 0, answers: {} }, async (q) => (sent.push(q), { kind: "rejected", status: 413 }), undefined, undefined, { onEvent: (e, d) => ev.push([e, d]) });
    await s.set(1, 1);
    await s.flush();
    await s.flush(true);
    expect(sent).toEqual([1]);
    expect(ev).toEqual([["rejected", 413]]);
    expect((await store.get("a"))?.answers).toEqual({ "1": 1 });
  });

  describe("autosaveSender", () => {
    const send = (status: number, body: unknown = {}, headers: Record<string, string> = {}) => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status, headers })));
      return autosaveSender("/api/x")(3, {}, { keepalive: false });
    };
    it.each([
      [400, { kind: "rejected", status: 400 }],
      [404, { kind: "rejected", status: 404 }],
      [413, { kind: "rejected", status: 413 }],
      [409, { kind: "closed", status: "submitted" }],
      [500, { kind: "offline" }],
    ])("HTTP %s", async (status, want) => {
      expect(await send(status)).toEqual(want);
      vi.unstubAllGlobals();
    });
    it("429/503 → retry theo Retry-After", async () => {
      expect(await send(429, {}, { "retry-after": "2" })).toMatchObject({ kind: "retry" });
      expect(await send(503)).toMatchObject({ kind: "retry" });
      vi.unstubAllGlobals();
    });
    it("lỗi mạng → offline", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("x"); }));
      expect(await autosaveSender("/api/x")(1, {}, { keepalive: false })).toEqual({ kind: "offline" });
      vi.unstubAllGlobals();
    });
    it("200: dùng seq của máy chủ và nạp serverNow vào ServerClock", async () => {
      let m = 1000;
      const clock = new ServerClock(() => m);
      vi.stubGlobal("fetch", vi.fn(async () => { m += 100; return new Response(JSON.stringify({ ok: true, seq: 7, serverNow: new Date(5_050).toISOString(), deadlineAt: "x" }), { status: 200 }); }));
      const r = await autosaveSender("/api/x", { clock, mono: () => m })(7, {}, { keepalive: false });
      expect(r).toEqual({ kind: "ok", seq: 7 });
      expect(clock.now()).toBe(5100); // offset = 5050 - (1000+50) = 4000; now = 1100 + 4000
      vi.unstubAllGlobals();
    });
  });
});
