import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { AcpAgent } from "../src/acp/agent";

export const fakeAcpPath = fileURLToPath(new URL("./fixtures/fake-acp.mjs", import.meta.url));
const agents: AcpAgent[] = [];
function mk(extra: { dataDir?: string; command?: string; noInit?: boolean } = {}) {
  const a = new AcpAgent({
    command: extra.command ?? process.execPath,
    args: extra.command ? [] : [fakeAcpPath],
    cwd: tmpdir(),
    env: { ...(extra.dataDir ? { FAKE_DATA_DIR: extra.dataDir } : {}), ...(extra.noInit ? { FAKE_NO_INIT: "1" } : {}) },
    dataDir: extra.dataDir,
    startTimeoutMs: extra.noInit ? 200 : undefined,
  });
  agents.push(a);
  return a;
}
afterEach(async () => {
  await Promise.all(agents.splice(0).map((a) => a.stop()));
});

describe("AcpAgent", () => {
  it("mở phiên, đặt model, nhận chữ chảy dần", async () => {
    const a = mk();
    await a.start();
    expect(a.alive).toBe(true);
    const sid = await a.newSession("fake-smart");
    expect(a.models.map((m) => m.id)).toContain("fake-smart");
    const deltas: string[] = [];
    const r = await a.prompt(sid, [{ type: "text", text: "xin chào" }], (t) => deltas.push(t));
    expect(r.text).toBe("[fake-smart#1] xin chào");
    expect(deltas.length).toBeGreaterThan(1);
    expect(deltas.join("")).toBe(r.text);
    expect(r.stopReason).toBe("end_turn");
    expect(r.usage?.inputTokens).toBeGreaterThan(0);
    const r2 = await a.prompt(sid, [{ type: "text", text: "lần hai" }]);
    expect(r2.text).toBe("[fake-smart#2] lần hai");
    expect(r2.usage?.cachedReadTokens).toBe(100);
  });
  it("model không có thì báo lỗi và không giữ phiên", async () => {
    const a = mk();
    await a.start();
    await expect(a.newSession("khong-co")).rejects.toThrow(/Unknown model ID/);
    expect(a.sessionCount).toBe(0);
  });
  it("từ chối mọi yêu cầu dùng công cụ", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    const r = await a.prompt(sid, [{ type: "text", text: "chạy lệnh đi [[tool]]" }]);
    expect(r.text).toBe("");
    expect(r.deniedTools).toBe(1);
  });
  it("gửi được ảnh", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    const r = await a.prompt(sid, [{ type: "text", text: "xem ảnh" }, { type: "image", mimeType: "image/png", data: "iVBORw0KGgo=" }]);
    expect(r.text).toContain("(ảnh:1)");
  });
  it("quá thời gian thì huỷ, phiên vẫn dùng tiếp được", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    await expect(a.prompt(sid, [{ type: "text", text: "[[sleep:5000]]" }], undefined, 100)).rejects.toThrow(/quá thời gian/);
    const r = await a.prompt(sid, [{ type: "text", text: "tiếp" }]);
    expect(r.text).toMatch(/#2\] tiếp$/);
    expect(a.activePrompts).toBe(0);
  });
  it("tiến trình chết thì báo exit, prompt đang chờ bị từ chối", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    const exited = new Promise((r) => a.once("exit", r));
    await expect(a.prompt(sid, [{ type: "text", text: "[[crash]]" }])).rejects.toThrow(/đã dừng/);
    await exited;
    expect(a.alive).toBe(false);
    expect(a.sessionCount).toBe(0);
  });
  it("lệnh không tồn tại thì start thất bại", async () => {
    const a = mk({ command: "/khong/co/lenh-agy" });
    await expect(a.start()).rejects.toThrow();
    expect(a.alive).toBe(false);
  });
  it("đóng phiên thì xoá dữ liệu phiên trong dataDir", async () => {
    const dir = mkdtempSync(join(tmpdir(), "acp-data-"));
    const a = mk({ dataDir: dir });
    await a.start();
    const sid = await a.newSession();
    expect(existsSync(join(dir, "conversations", `${sid}.db`))).toBe(true);
    await a.closeSession(sid);
    expect(existsSync(join(dir, "conversations", `${sid}.db`))).toBe(false);
    expect(existsSync(join(dir, "conversations", `${sid}.db-wal`))).toBe(false);
    expect(existsSync(join(dir, "conversations", `${sid}.db-shm`))).toBe(false);
    expect(existsSync(join(dir, "brain", sid))).toBe(false);
    expect(a.sessionCount).toBe(0);
  });
  it("huỷ do quá giờ: chữ đến muộn không lọt sang lượt sau", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    await expect(a.prompt(sid, [{ type: "text", text: "[[sleep:5000]] [[latechunks]]" }], undefined, 100)).rejects.toThrow(/quá thời gian/);
    const r = await a.prompt(sid, [{ type: "text", text: "lượt mới" }]);
    expect(r.text).not.toContain("LATE");
    expect(r.text).toMatch(/lượt mới$/);
  });
  it("prompt thứ hai cùng phiên khi đang bận bị từ chối", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    const first = a.prompt(sid, [{ type: "text", text: "[[sleep:300]]" }]);
    await expect(a.prompt(sid, [{ type: "text", text: "x" }])).rejects.toThrow(/Phiên đang bận/);
    await first;
  });
  it("initialize quá giờ thì start thất bại và tiến trình con bị giết", async () => {
    const a = mk({ noInit: true });
    await expect(a.start()).rejects.toThrow();
    const pid = (a as unknown as { proc: { pid: number } }).proc.pid;
    await new Promise((r) => setTimeout(r, 200));
    expect(() => process.kill(pid, 0)).toThrow();
    expect(a.alive).toBe(false);
  });
  it("stdout đóng mà tiến trình còn sống: coi như chết", async () => {
    const a = mk();
    await a.start();
    const sid = await a.newSession();
    let exits = 0;
    a.on("exit", () => exits++);
    await expect(a.prompt(sid, [{ type: "text", text: "[[closeout]]" }])).rejects.toThrow(/đã dừng/);
    expect(a.alive).toBe(false);
    expect(exits).toBe(1);
  });
  it("tiến trình chết khi còn phiên mở thì xoá dữ liệu phiên", async () => {
    const dir = mkdtempSync(join(tmpdir(), "acp-data-"));
    const a = mk({ dataDir: dir });
    await a.start();
    const sid = await a.newSession();
    expect(existsSync(join(dir, "conversations", `${sid}.db`))).toBe(true);
    const exited = new Promise((r) => a.once("exit", r));
    await expect(a.prompt(sid, [{ type: "text", text: "[[crash]]" }])).rejects.toThrow();
    await exited;
    expect(existsSync(join(dir, "conversations", `${sid}.db`))).toBe(false);
    expect(existsSync(join(dir, "brain", sid))).toBe(false);
  });
});
