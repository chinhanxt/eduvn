import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const user = { current: { access_token: "tok-gv", expired: false } as { access_token: string; expired: boolean } | null };
vi.mock("../src/auth", () => ({ userManager: { getUser: async () => user.current, removeUser: async () => undefined }, readStoredUser: () => null, getUserManager: async () => ({}) }));

const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;
const bus = new EventTarget();
Object.assign(globalThis, { window: globalThis, addEventListener: bus.addEventListener.bind(bus), removeEventListener: bus.removeEventListener.bind(bus), dispatchEvent: bus.dispatchEvent.bind(bus) });

const { ApiError } = await import("../src/api");
const D = await import("../src/ui/data");
const Q = await import("../src/ui/data/query");

const deferred = <T,>() => {
  let resolve!: (v: T) => void, reject!: (e: unknown) => void;
  const promise = new Promise<T>((a, b) => ((resolve = a), (reject = b)));
  return { promise, resolve, reject };
};
const flush = () => new Promise((r) => setTimeout(r, 0));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const sseBody = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(c) {
      const enc = new TextEncoder();
      for (const s of chunks) c.enqueue(enc.encode(s));
      c.close();
    },
  });

let now = 1_000_000;
beforeEach(() => {
  store.clear();
  user.current = { access_token: "tok-gv", expired: false };
  now = 1_000_000;
  Q._setClock(() => now);
  Q._resetCache();
  D.reportFetchSuccess();
});
afterEach(() => vi.unstubAllGlobals());

describe("query: gộp request, cache, SWR", () => {
  it("cùng key đang bay → một lần gọi, cùng kết quả", async () => {
    const d = deferred<number>();
    const f = vi.fn(() => d.promise);
    const a = D.query("k", f);
    const b = D.query("k", f);
    expect(f).toHaveBeenCalledTimes(1);
    expect(D.getQueryState("k")).toMatchObject({ loading: true, stale: false, fetching: true });
    d.resolve(7);
    expect(await a).toBe(7);
    expect(await b).toBe(7);
    expect(D.getQueryState("k")).toMatchObject({ data: 7, loading: false, fetching: false, updatedAt: now });
  });

  it("còn tươi → trả cache không gọi lại; quá staleMs → trả cũ ngay + làm tươi nền", async () => {
    let n = 0;
    const f = vi.fn(async () => ++n);
    expect(await D.query("k", f)).toBe(1);
    now += 10_000;
    expect(await D.query("k", f)).toBe(1);
    expect(f).toHaveBeenCalledTimes(1);
    now += D.STALE_MS;
    const d = deferred<number>();
    const g = vi.fn(() => d.promise);
    expect(await D.query("k", g)).toBe(1);
    expect(g).toHaveBeenCalledTimes(1);
    expect(D.getQueryState("k")).toMatchObject({ data: 1, stale: true, loading: false });
    d.resolve(2);
    await flush();
    expect(D.getQueryState("k")).toMatchObject({ data: 2, stale: false });
  });

  it("force tải lại dù còn tươi; staleMs riêng theo key", async () => {
    let n = 0;
    const f = async () => ++n;
    await D.query("k", f, { staleMs: 1000 });
    expect(await D.query("k", f, { force: true })).toBe(2);
    now += 1500;
    await D.query("k", f);
    await flush();
    expect(D.getQueryState("k").data).toBe(3);
  });

  it("lỗi → error, giữ dữ liệu cũ; lần sau thành công thì xoá lỗi", async () => {
    await D.query("k", async () => 1);
    now += D.STALE_MS + 1;
    await D.query("k", async () => {
      throw new Error("hỏng");
    });
    await flush();
    expect(D.getQueryState("k")).toMatchObject({ data: 1, fetching: false });
    expect((D.getQueryState("k").error as Error).message).toBe("hỏng");
    await D.query("k", async () => 2, { force: true });
    expect(D.getQueryState("k")).toMatchObject({ data: 2, error: undefined });
  });

  it("không có fetcher và chưa có dữ liệu → reject", async () => {
    await expect(D.query("lạ")).rejects.toThrow(/chưa có fetcher/);
  });

  it("subscribe được báo khi đổi; snapshot ổn định giữa hai lần đọc", async () => {
    const cb = vi.fn();
    const off = D.subscribeQuery("k", cb);
    expect(D.getQueryState("k")).toBe(D.getQueryState("k"));
    await D.query("k", async () => 1);
    expect(cb).toHaveBeenCalledTimes(2); // bắt đầu tải + xong
    off();
  });

  it("người xem cuối rời màn khi chưa có dữ liệu → huỷ request (AbortSignal)", async () => {
    let sig: AbortSignal | undefined;
    const off = D.subscribeQuery("k", () => undefined);
    const p = D.query("k", (s) => {
      sig = s;
      return new Promise((_, no) => s.addEventListener("abort", () => no(new DOMException("x", "AbortError"))));
    });
    off();
    expect(sig?.aborted).toBe(true);
    await expect(p).rejects.toThrow();
    expect(D.getQueryState("k")).toMatchObject({ fetching: false, error: undefined });
  });

  it("invalidate(prefix): key đang xem tải lại ngay, key không xem chỉ bị đánh dấu cũ", async () => {
    const a = vi.fn(async () => "a");
    const b = vi.fn(async () => "b");
    const c = vi.fn(async () => "c");
    await D.query("lop/1", a);
    await D.query("lop/2", b);
    await D.query("bai/1", c);
    const off = D.subscribeQuery("lop/1", () => undefined);
    D.invalidate("lop/");
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
    await D.query("lop/2", b); // đã cũ → làm tươi nền
    expect(b).toHaveBeenCalledTimes(2);
    await D.query("bai/1", c);
    expect(c).toHaveBeenCalledTimes(1);
    off();
  });

  it("invalidate khi đang bay → kết quả cũ không ghi đè kết quả mới", async () => {
    const first = deferred<string>();
    const calls: AbortSignal[] = [];
    let i = 0;
    const f = (s: AbortSignal) => {
      calls.push(s);
      return i++ === 0 ? first.promise : Promise.resolve("mới");
    };
    const off = D.subscribeQuery("k", () => undefined);
    void D.query("k", f).catch(() => undefined);
    D.invalidate("k");
    expect(calls[0].aborted).toBe(true);
    await flush();
    first.resolve("cũ");
    await flush();
    expect(D.getQueryState("k").data).toBe("mới");
    off();
  });

  it("prefetch nuốt lỗi; dữ liệu đã tải trước dùng ngay", async () => {
    await expect(D.prefetch("x", async () => Promise.reject(new Error("e")))).resolves.toBeUndefined();
    const f = vi.fn(async () => 5);
    await D.prefetch("y", f);
    expect(await D.query("y", f)).toBe(5);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("setQueryData cập nhật lạc quan + hoàn tác", async () => {
    await D.query("ds", async () => [1, 2]);
    const undo = D.setQueryData<number[]>("ds", (o) => [...(o ?? []), 3]);
    expect(D.getQueryState("ds").data).toEqual([1, 2, 3]);
    undo();
    expect(D.getQueryState("ds").data).toEqual([1, 2]);
  });

  it("refreshStale chỉ làm tươi key đang xem và đã cũ", async () => {
    const f = vi.fn(async () => 1);
    const g = vi.fn(async () => 1);
    await D.query("a", f);
    await D.query("b", g);
    const off = D.subscribeQuery("a", () => undefined);
    D.refreshStale();
    expect(f).toHaveBeenCalledTimes(1);
    now += D.STALE_MS;
    D.refreshStale();
    expect(f).toHaveBeenCalledTimes(2);
    expect(g).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("useAction / createAction", () => {
  it("khoá khi đang chạy: bấm lặp trả cùng promise, fn chạy một lần", async () => {
    const d = deferred<string>();
    const fn = vi.fn((_ctx: { idempotencyKey: string }, _x: number) => d.promise);
    const a = D.createAction(fn);
    const p1 = a.run(1);
    const p2 = a.run(1);
    expect(p1).toBe(p2);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(a.get()).toMatchObject({ pending: true, done: false });
    d.resolve("ok");
    expect(await p1).toBe("ok");
    expect(a.get()).toMatchObject({ pending: false, done: true, data: "ok", error: undefined });
  });

  it("mỗi lần bấm một Idempotency-Key mới (≥ 8 ký tự)", async () => {
    const keys: string[] = [];
    const a = D.createAction(async (ctx) => void keys.push(ctx.idempotencyKey));
    await a.run();
    await a.run();
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0].length).toBeGreaterThanOrEqual(8);
  });

  it("lỗi mạng → thử lại cùng tham số dùng lại khoá cũ; khác tham số / lỗi HTTP → khoá mới", async () => {
    const keys: string[] = [];
    let fail: unknown = new TypeError("Failed to fetch");
    const a = D.createAction(async (ctx, _body: { n: number }) => {
      keys.push(ctx.idempotencyKey);
      if (fail) throw fail;
      return 1;
    });
    await expect(a.run({ n: 1 })).rejects.toThrow();
    expect(a.get()).toMatchObject({ pending: false, done: false });
    expect(a.get().error).toBeInstanceOf(TypeError);
    await expect(a.run({ n: 1 })).rejects.toThrow();
    expect(keys[1]).toBe(keys[0]);
    await expect(a.run({ n: 2 })).rejects.toThrow();
    expect(keys[2]).not.toBe(keys[1]);
    fail = new ApiError(500, null);
    await expect(a.run({ n: 2 })).rejects.toThrow();
    expect(keys[3]).toBe(keys[2]);
    await expect(a.run({ n: 2 })).rejects.toThrow();
    expect(keys[4]).not.toBe(keys[3]);
    fail = null;
    await a.run({ n: 2 });
    expect(a.get()).toMatchObject({ done: true, error: undefined });
    a.reset();
    expect(a.get()).toMatchObject({ done: false, data: undefined });
  });

  it("gửi header Idempotency-Key qua request()", async () => {
    const fetchMock = vi.fn(async (_u: string, _i: RequestInit) => json({ id: "x" }, 201));
    vi.stubGlobal("fetch", fetchMock);
    const a = D.createAction((ctx, body: unknown) => D.request<{ id: string }>("/api/exams", { method: "POST", body, idempotencyKey: ctx.idempotencyKey }));
    await a.run({ t: 1 });
    const h = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(h["idempotency-key"]).toMatch(/.{8,}/);
    expect(h.authorization).toBe("Bearer tok-gv");
  });
});

describe("request: header đăng nhập chung với api.ts", () => {
  it("Bearer Keycloak + x-org-id + JSON", async () => {
    store.set("eduvn.org", "org-1");
    const fetchMock = vi.fn(async (_u: string, _i: RequestInit) => json({ a: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await D.request("/api/x", { body: { q: 1 } })).toEqual({ a: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"q":1}');
    expect(init.headers).toMatchObject({ authorization: "Bearer tok-gv", "x-org-id": "org-1", "content-type": "application/json" });
  });

  it("hết phiên → ApiError 401, không gọi fetch", async () => {
    user.current = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(D.request("/api/x")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("phiên HS P9a (auth: hs) dùng token mã lớp/PIN; auth: none không có header", async () => {
    store.set("eduvn.hs", JSON.stringify({ token: "tok-hs", expiresAt: Date.now() + 3_600_000, student: {}, class: {} }));
    const fetchMock = vi.fn(async (_u: string, _i: RequestInit) => json({}));
    vi.stubGlobal("fetch", fetchMock);
    await D.request("/api/hs/x", { auth: "hs" });
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).authorization).toBe("Bearer tok-hs");
    await D.request("/api/public", { auth: "none" });
    expect(fetchMock.mock.calls[1][1].headers).toEqual({});
    store.delete("eduvn.hs");
    await expect(D.request("/api/hs/x", { auth: "hs" })).rejects.toMatchObject({ status: 401 });
  });

  it("HTTP lỗi → ApiError có body; 403 xoá tổ chức đã lưu", async () => {
    store.set("eduvn.org", "org-cu");
    vi.stubGlobal("fetch", async () => json({ error: "Không có quyền" }, 403));
    const e = await D.request("/api/x").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 403, message: "Không có quyền" });
    expect(store.has("eduvn.org")).toBe(false);
  });
});

describe("useOnline: navigator.onLine + lỗi fetch", () => {
  it("lỗi mạng → offline; fetch thành công lại → online; AbortError không tính", async () => {
    const cb = vi.fn();
    const off = D.subscribeOnline(cb);
    expect(D.isOnline()).toBe(true);
    vi.stubGlobal("fetch", async () => Promise.reject(new TypeError("Failed to fetch")));
    await expect(D.request("/api/x")).rejects.toBeInstanceOf(TypeError);
    expect(D.isOnline()).toBe(false);
    expect(cb).toHaveBeenCalledTimes(1);
    vi.stubGlobal("fetch", async () => Promise.reject(new DOMException("x", "AbortError")));
    await expect(D.request("/api/x")).rejects.toThrow();
    expect(D.isOnline()).toBe(false);
    vi.stubGlobal("fetch", async () => json({}));
    await D.request("/api/x");
    expect(D.isOnline()).toBe(true);
    expect(cb).toHaveBeenCalledTimes(2);
    off();
  });

  it("sự kiện online xoá cờ lỗi fetch", async () => {
    const off = D.subscribeOnline(() => undefined);
    D.reportFetchFailure();
    expect(D.isOnline()).toBe(false);
    window.dispatchEvent(new Event("online"));
    expect(D.isOnline()).toBe(true);
    off();
  });

  it("navigator.onLine = false → offline", () => {
    vi.stubGlobal("navigator", { onLine: false });
    expect(D.isOnline()).toBe(false);
  });
});

describe("useUrlState: slug, đọc/ghi tham số", () => {
  it("slug không dấu", () => {
    expect(D.slugify("Hàm số bậc hai")).toBe("ham-so-bac-hai");
    expect(D.slugify("  Đường tròn — Ôn tập lớp 10A1! ")).toBe("duong-tron-on-tap-lop-10a1");
    expect(D.slugify("KT 15' Tích vô hướng")).toBe("kt-15-tich-vo-huong");
    expect(D.slugify("Ữ ỹ ặ ờ")).toBe("u-y-a-o");
  });

  it("readParam theo kiểu mặc định", () => {
    const p = new URLSearchParams("lop=10&muc=TH,VD&trang=2&x=abc");
    expect(D.readParam(p, "lop", "")).toBe("10");
    expect(D.readParam(p, "muc", [] as string[])).toEqual(["TH", "VD"]);
    expect(D.readParam(p, "trang", 1)).toBe(2);
    expect(D.readParam(p, "x", 1)).toBe(1);
    expect(D.readParam(p, "khong", "mac-dinh")).toBe("mac-dinh");
  });

  it("writeParam: bỏ giá trị mặc định/rỗng; đổi lọc về trang 1; đổi trang giữ lọc", () => {
    const p = new URLSearchParams("lop=10&trang=3");
    expect(D.writeParam(p, "chu-de", "ham-so", "").toString()).toBe("lop=10&chu-de=ham-so");
    expect(D.writeParam(p, "lop", "", "").toString()).toBe("");
    expect(D.writeParam(p, "muc", ["TH", "VD"], []).toString()).toBe("lop=10&muc=TH%2CVD");
    expect(D.writeParam(p, "trang", 4, 1).toString()).toBe("lop=10&trang=4");
    expect(D.writeParam(p, "trang", 1, 1).toString()).toBe("lop=10");
    expect(p.toString()).toBe("lop=10&trang=3"); // không sửa bản gốc
  });

  it("trang/tab → push, lọc → replace, ép được", () => {
    expect(D.historyMode("trang")).toBe("push");
    expect(D.historyMode("tab")).toBe("push");
    expect(D.historyMode("lop")).toBe("replace");
    expect(D.historyMode("lop", "push")).toBe("push");
  });
});

describe("stream: SSE qua fetch + ReadableStream", () => {
  it("tách sự kiện bị cắt giữa mẩu, CRLF, nhiều dòng data, comment, event", () => {
    const got: unknown[] = [];
    const p = D.createSseParser((e) => got.push([e.event, e.data]));
    p.push(': ping\r\n');
    p.push('data: {"type":"del');
    p.push('ta","text":"Xin"}\r');
    p.push("\n\r\n");
    p.push("event: step\ndata: dòng 1\ndata: dòng 2\n\n");
    p.push("data: cuối");
    p.end();
    expect(got).toEqual([
      ["message", { type: "delta", text: "Xin" }],
      ["step", "dòng 1\ndòng 2"],
      ["message", "cuối"],
    ]);
  });

  it("POST có auth, gọi onChunk từng sự kiện, dừng ở [DONE]", async () => {
    const fetchMock = vi.fn(async (_u: string, _i: RequestInit) => new Response(sseBody(['data: {"t":"a"}\n\nda', 'ta: {"t":"b"}\n\n', "data: [DONE]\n\n", 'data: {"t":"sau"}\n\n']), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const got: unknown[] = [];
    expect(await D.stream("/api/ai", { q: 1 }, (d) => got.push(d))).toBe("done");
    expect(got).toEqual([{ t: "a" }, { t: "b" }]);
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ authorization: "Bearer tok-gv", accept: "text/event-stream" });
  });

  it("Dừng giữa chừng → 'stopped', giữ phần đã nhận", async () => {
    const ctrl = new AbortController();
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => {
      const enc = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(enc.encode('data: {"t":"a"}\n\n'));
          init.signal?.addEventListener("abort", () => c.error(new DOMException("aborted", "AbortError")));
        },
      });
      return new Response(body, { status: 200 });
    });
    const got: unknown[] = [];
    const p = D.stream("/api/ai", {}, (d) => {
      got.push(d);
      ctrl.abort();
    }, ctrl.signal);
    expect(await p).toBe("stopped");
    expect(got).toEqual([{ t: "a" }]);
  });

  it("abort trước khi có phản hồi → 'stopped'; HTTP lỗi → ApiError", async () => {
    vi.stubGlobal("fetch", async () => Promise.reject(new DOMException("x", "AbortError")));
    expect(await D.stream("/api/ai", {}, () => undefined)).toBe("stopped");
    vi.stubGlobal("fetch", async () => json({ error: "Hết hạn mức" }, 429));
    await expect(D.stream("/api/ai", {}, () => undefined)).rejects.toMatchObject({ status: 429, message: "Hết hạn mức" });
  });
});
