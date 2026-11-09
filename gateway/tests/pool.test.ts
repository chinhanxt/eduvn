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
});
