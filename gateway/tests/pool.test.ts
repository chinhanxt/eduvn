import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { AcpAgent } from "../src/acp/agent";
import { AgentPool } from "../src/acp/pool";

const fake = fileURLToPath(new URL("./fixtures/fake-acp.mjs", import.meta.url));
const pools: AgentPool[] = [];
function mk(size = 2, idleSessionMs = 60000) {
  const p = new AgentPool({
    size,
    idleSessionMs,
    restartDelayMs: 50,
    factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir() }),
  });
  pools.push(p);
  return p;
}
afterEach(async () => {
  await Promise.all(pools.splice(0).map((p) => p.stop()));
});
const waitFor = async (fn: () => boolean, ms = 3000) => {
  const until = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > until) throw new Error("hết giờ chờ");
    await new Promise((r) => setTimeout(r, 20));
  }
};

describe("AgentPool", () => {
  it("khởi động đủ tiến trình và báo model", async () => {
    const p = mk(2);
    await p.start();
    expect(p.stats()).toMatchObject({ size: 2, alive: 2, sessions: 0, conversations: 0, active: 0 });
    const l = await p.lease(undefined, "fake-fast");
    l.release();
    expect(p.models().map((m) => m.id)).toEqual(["fake-fast", "fake-smart"]);
  });
  it("hội thoại có khoá dùng lại đúng phiên", async () => {
    const p = mk(2);
    await p.start();
    const a = await p.lease("hs-1", "fake-smart");
    expect(a.fresh).toBe(true);
    const r1 = await a.agent.prompt(a.sessionId, [{ type: "text", text: "một" }]);
    a.release();
    const b = await p.lease("hs-1", "fake-smart");
    expect(b.fresh).toBe(false);
    expect(b.sessionId).toBe(a.sessionId);
    const r2 = await b.agent.prompt(b.sessionId, [{ type: "text", text: "hai" }]);
    b.release();
    expect(r1.text).toBe("[fake-smart#1] một");
    expect(r2.text).toBe("[fake-smart#2] hai");
    expect(p.stats().conversations).toBe(1);
  });
  it("đổi model trong cùng hội thoại thì mở phiên mới", async () => {
    const p = mk(1);
    await p.start();
    const a = await p.lease("k", "fake-fast");
    a.release();
    const b = await p.lease("k", "fake-smart");
    expect(b.fresh).toBe(true);
    expect(b.sessionId).not.toBe(a.sessionId);
    b.release();
  });
  it("phiên không khoá được đóng khi trả", async () => {
    const p = mk(1);
    await p.start();
    const l = await p.lease(undefined, "fake-fast");
    expect(p.stats().sessions).toBe(1);
    l.release();
    await waitFor(() => p.stats().sessions === 0);
  });
  it("dọn hội thoại để lâu không dùng", async () => {
    const p = mk(1, 1000);
    await p.start();
    const l = await p.lease("cu", "fake-fast");
    l.release();
    p.sweep(Date.now() + 5000);
    expect(p.stats().conversations).toBe(0);
    await waitFor(() => p.stats().sessions === 0);
  });
  it("chia việc cho tiến trình đang rảnh hơn", async () => {
    const p = mk(2);
    await p.start();
    const a = await p.lease(undefined, "fake-fast");
    const busy = a.agent.prompt(a.sessionId, [{ type: "text", text: "[[sleep:300]]" }]);
    await new Promise((r) => setTimeout(r, 20));
    expect(p.pick()).not.toBe(a.agent);
    await busy;
    a.release();
  });
  it("tiến trình chết thì tự khởi động lại", async () => {
    const p = mk(2);
    await p.start();
    const a = await p.lease("x", "fake-fast");
    await expect(a.agent.prompt(a.sessionId, [{ type: "text", text: "[[crash]]" }])).rejects.toThrow();
    expect(p.stats().alive).toBe(1);
    expect(p.stats().conversations).toBe(0);
    await waitFor(() => p.stats().alive === 2);
  });
  it("không còn tiến trình nào thì báo 503", async () => {
    const p = new AgentPool({ size: 1, idleSessionMs: 1000, restartDelayMs: 60000, factory: () => new AcpAgent({ command: "/khong/co", args: [], cwd: tmpdir() }) });
    pools.push(p);
    await expect(p.start()).rejects.toThrow();
    expect(() => p.pick()).toThrow(expect.objectContaining({ status: 503, code: "ai_unavailable" }));
  });
  it("báo model ngay sau start, chưa cần thuê phiên", async () => {
    const p = mk(1);
    await p.start();
    expect(p.models().map((m) => m.id)).toEqual(["fake-fast", "fake-smart"]);
    expect(p.stats().sessions).toBe(0);
  });
  it("khởi động lại có lùi dần và dừng hẳn sau stop()", async () => {
    let calls = 0;
    const logs: string[] = [];
    const p = new AgentPool({
      size: 1,
      idleSessionMs: 1000,
      restartDelayMs: 20,
      onLog: (m) => logs.push(m),
      factory: () => {
        calls++;
        return new AcpAgent({ command: "/khong/co", args: [], cwd: tmpdir() });
      },
    });
    pools.push(p);
    await expect(p.start()).rejects.toThrow();
    await new Promise((r) => setTimeout(r, 200));
    expect(calls).toBeLessThanOrEqual(5);
    expect(calls).toBeGreaterThan(1);
    expect(logs.length).toBeGreaterThan(0);
    await p.stop();
    const after = calls;
    await new Promise((r) => setTimeout(r, 250));
    expect(calls).toBe(after);
  });
  it("sweep không đóng hội thoại đang chạy lượt", async () => {
    const p = mk(1, 1000);
    await p.start();
    const l = await p.lease("bận", "fake-fast");
    const run = l.agent.prompt(l.sessionId, [{ type: "text", text: "[[sleep:300]]" }]);
    p.sweep(Date.now() + 100000);
    expect(p.stats().conversations).toBe(1);
    await run;
    l.release();
    p.sweep(Date.now() + 100000);
    expect(p.stats().conversations).toBe(0);
  });
  it("hai lần thuê đồng thời cùng khoá dùng chung một phiên", async () => {
    const p = mk(2);
    await p.start();
    const [a, b] = await Promise.all([p.lease("k", "fake-fast"), p.lease("k", "fake-fast")]);
    expect(a.sessionId).toBe(b.sessionId);
    expect(p.stats().sessions).toBe(1);
    a.release();
    b.release();
  });
});

describe("AgentPool giới hạn dài hạn", () => {
  it("vượt maxConversations thì bỏ hội thoại rảnh lâu nhất", async () => {
    const p = new AgentPool({ size: 1, idleSessionMs: 60000, maxConversations: 2, factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir() }) });
    pools.push(p);
    await p.start();
    for (const k of ["a", "b"]) (await p.lease(k, "fake-fast")).release();
    await new Promise((r) => setTimeout(r, 10));
    (await p.lease("a", "fake-fast")).release(); // a mới dùng, b cũ nhất
    (await p.lease("c", "fake-fast")).release();
    expect(p.stats().conversations).toBe(2);
    expect((await p.lease("a", "fake-fast")).fresh).toBe(false);
    expect((await p.lease("b", "fake-fast")).fresh).toBe(true);
  });
  it("chữ ký khác thì mở phiên mới", async () => {
    const p = mk(1);
    await p.start();
    const a = await p.lease("k", "fake-fast", "s1");
    a.release();
    expect((await p.lease("k", "fake-fast", "s1")).fresh).toBe(false);
    expect((await p.lease("k", "fake-fast", "s2")).fresh).toBe(true);
  });
  it("tiến trình mở đủ phiên thì nghỉ: không nhận mới khi còn cái khác, hết hội thoại thì được thay mới", async () => {
    const logs: string[] = [];
    const p = new AgentPool({ size: 2, idleSessionMs: 60000, restartDelayMs: 50, recycleAfterSessions: 2, onLog: (m) => logs.push(m), factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir() }) });
    pools.push(p);
    await p.start();
    const ls = [];
    for (const k of ["a", "b", "c"]) {
      const l = await p.lease(k, "fake-fast");
      l.release();
      ls.push(l);
    }
    const old = ls[0]!.agent; // a và c cùng một tiến trình (a, c) → đủ 2 phiên
    expect(ls[2]!.agent).toBe(old);
    expect(p.stats().draining).toBe(1);
    const d = await p.lease("d", "fake-fast");
    d.release();
    expect(d.agent).not.toBe(old);
    p.forget("a");
    p.forget("c");
    await waitFor(() => !old.alive && p.stats().alive === 2);
    expect(p.alive()).not.toContain(old);
    expect(p.stats().restarts).toBe(0);
    expect((await p.lease("b", "fake-fast")).fresh).toBe(false);
    await waitFor(() => logs.join("\n").includes("thay mới"));
  });
  it("tiến trình chết ghi log kèm stderr và đếm restarts", async () => {
    const logs: string[] = [];
    const p = new AgentPool({ size: 1, idleSessionMs: 60000, restartDelayMs: 50, onLog: (m) => logs.push(m), factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir() }) });
    pools.push(p);
    await p.start();
    const a = await p.lease("x", "fake-fast");
    await expect(a.agent.prompt(a.sessionId, [{ type: "text", text: "[[crash]]" }])).rejects.toThrow();
    await waitFor(() => p.stats().alive === 1 && p.stats().restarts === 1);
    expect(logs.some((m) => m.includes("đã dừng"))).toBe(true);
  });
});

describe("AgentPool thay mới có lượt đến giữa chừng", () => {
  it("lượt đến lúc tiến trình thay thế đang khởi động: cái cũ ở lại chạy nốt, dừng khi rảnh", async () => {
    let n = 0;
    const p = new AgentPool({
      size: 1,
      idleSessionMs: 60000,
      restartDelayMs: 50,
      recycleAfterSessions: 1,
      factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir(), env: n++ > 0 ? { FAKE_START_DELAY: "400" } : {} }),
    });
    pools.push(p);
    await p.start();
    const a = await p.lease("a", "fake-fast");
    a.release();
    const old = a.agent;
    p.forget("a"); // rảnh → bắt đầu thay (cái mới khởi động chậm)
    await new Promise((r) => setTimeout(r, 150));
    const b = await p.lease("b", "fake-fast"); // lượt đến cái cũ giữa chừng
    expect(b.agent).toBe(old);
    await waitFor(() => p.alive()[0] !== old, 5000);
    expect(old.alive).toBe(true); // chưa bị dừng khi còn việc
    const r = await b.agent.prompt(b.sessionId, [{ type: "text", text: "vẫn chạy" }]);
    expect(r.text).toContain("vẫn chạy");
    b.release();
    p.forget("b");
    await waitFor(() => !old.alive, 5000);
    expect(p.stats().alive).toBe(1);
  });
});

describe("AgentPool danh sách model ưu tiên và tiến trình hỏng", () => {
  const mkEnv = (env: Record<string, string>, extra: Partial<ConstructorParameters<typeof AgentPool>[0]> = {}) => {
    const p = new AgentPool({ size: 1, idleSessionMs: 60000, restartDelayMs: 50, factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir(), env }), ...extra });
    pools.push(p);
    return p;
  };
  it("chọn model đầu tiên có trong kho; báo model đã chọn", async () => {
    const p = mkEnv({ FAKE_MODELS: "gem-a,son-4" });
    await p.start();
    const l = await p.lease(undefined, ["son-5", "son-4", "gem-a"]);
    expect(l.model).toBe("son-4");
    l.release();
  });
  it("set_model từ chối (Unknown model ID) thì thử model kế", async () => {
    const p = mkEnv({ FAKE_MODELS: "m1,m2", FAKE_REJECT: "m1" });
    await p.start();
    const l = await p.lease("k", ["m1", "m2"]);
    expect(l.model).toBe("m2");
    l.release();
    expect((await p.lease("k", ["m1", "m2"])).fresh).toBe(false); // phiên đang dùng model trong danh sách → giữ
  });
  it("không model nào dùng được thì lỗi -32602", async () => {
    const p = mkEnv({ FAKE_MODELS: "m1" });
    await p.start();
    await expect(p.lease(undefined, ["x1", "x2"])).rejects.toMatchObject({ code: -32602 });
    expect(p.stats().sessions).toBe(0);
  });
  it("3 lần trả lời trống liền thì cho nghỉ và thay bằng tiến trình mới", async () => {
    const logs: string[] = [];
    const p = mkEnv({}, { onLog: (m) => logs.push(m) });
    await p.start();
    const old = p.alive()[0]!;
    for (let i = 0; i < 3; i++) {
      const l = await p.lease(undefined, "fake-fast");
      const r = await l.agent.prompt(l.sessionId, [{ type: "text", text: "[[agyblock]]" }]);
      expect(r.text).toBe("");
      l.release();
    }
    await waitFor(() => !old.alive && p.stats().alive === 1, 5000);
    expect(p.alive()[0]).not.toBe(old);
    expect(p.stats().unhealthyRecycles).toBe(1);
    expect(logs.join("\n")).toContain("3 lần liền");
  });
  it("một câu trả lời tốt xen giữa thì đếm lại từ đầu", async () => {
    const p = mkEnv({});
    await p.start();
    const old = p.alive()[0]!;
    for (const t of ["[[agyblock]]", "[[agyblock]]", "tốt", "[[agyblock]]", "[[agyblock]]"]) {
      const l = await p.lease(undefined, "fake-fast");
      await l.agent.prompt(l.sessionId, [{ type: "text", text: t }]);
      l.release();
    }
    await new Promise((r) => setTimeout(r, 200));
    expect(old.alive).toBe(true);
    expect(p.stats().unhealthyRecycles).toBe(0);
  });
});
