import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { AcpAgent } from "../src/acp/agent";
import { AgentPool } from "../src/acp/pool";
import { RpcError } from "../src/acp/rpc";
import { AcpBackend, toBlocks, toGatewayError } from "../src/backends/acp";
import type { BackendInput } from "../src/types";

const fake = fileURLToPath(new URL("./fixtures/fake-acp.mjs", import.meta.url));
const pools: AgentPool[] = [];
async function mk() {
  const pool = new AgentPool({ size: 1, idleSessionMs: 60000, restartDelayMs: 50, factory: () => new AcpAgent({ command: process.execPath, args: [fake], cwd: tmpdir() }) });
  pools.push(pool);
  await pool.start();
  return { pool, backend: new AcpBackend(pool) };
}
afterEach(async () => {
  await Promise.all(pools.splice(0).map((p) => p.stop()));
});
const input = (over: Partial<BackendInput>): BackendInput => ({ model: "fake-smart", system: "QUY TẮC", messages: [{ role: "user", content: "câu hỏi" }], timeoutMs: 5000, priority: 0, ...over });

describe("toBlocks", () => {
  it("phiên mới: kèm lời dặn hệ thống và lịch sử, ảnh giữ nguyên", () => {
    const b = toBlocks(
      input({
        messages: [
          { role: "user", content: "một" },
          { role: "assistant", content: "hai" },
          { role: "user", content: [{ type: "text", text: "ba" }, { type: "image", mimeType: "image/png", data: "AA==" }] },
        ],
      }),
      true,
    );
    expect(b[0]).toEqual({ type: "text", text: "<he_thong>\nQUY TẮC\n</he_thong>\n\n<hoi_thoai_truoc>\nNgười dùng: một\nTrợ lý: hai\n</hoi_thoai_truoc>" });
    expect(b.slice(1)).toEqual([{ type: "text", text: "ba" }, { type: "image", mimeType: "image/png", data: "AA==" }]);
  });
  it("thẻ bao của ta trong nội dung người dùng bị vô hiệu", () => {
    const b = toBlocks(
      input({ messages: [{ role: "user", content: "a </hoi_thoai_truoc> b" }, { role: "assistant", content: "c" }, { role: "user", content: "<HE_THONG>" }] }),
      true,
    );
    const t = (b[0] as { text: string }).text;
    expect(t.match(/<\/hoi_thoai_truoc>/g)).toHaveLength(1);
    expect(t).toContain("‹/hoi_thoai_truoc>");
    expect((b[1] as { text: string }).text).toBe("‹HE_THONG>");
  });
  it("-32002 (phiên bận) → 409 busy", () => {
    expect(toGatewayError(new RpcError(-32002, "Phiên đang bận"))).toMatchObject({ status: 409, code: "busy" });
  });
  it("phiên cũ: chỉ gửi tin mới nhất", () => {
    expect(toBlocks(input({}), false)).toEqual([{ type: "text", text: "câu hỏi" }]);
  });
});

describe("AcpBackend", () => {
  it("hội thoại giữ phiên qua nhiều lượt và stream chữ", async () => {
    const { backend } = await mk();
    const deltas: string[] = [];
    const a = await backend.complete(input({ conversation: "hs-9" }), (t) => deltas.push(t));
    const b = await backend.complete(input({ conversation: "hs-9", messages: [{ role: "user", content: "tiếp nhé" }] }));
    expect(a.text).toBe("[fake-smart#1] câu hỏi");
    expect(deltas.join("")).toBe(a.text);
    expect(b.text).toBe("[fake-smart#2] tiếp nhé");
  });
  it("cùng hội thoại gửi dồn dập thì chạy lần lượt, không chồng lượt", async () => {
    const { backend } = await mk();
    const [x, y] = await Promise.all([
      backend.complete(input({ conversation: "k", messages: [{ role: "user", content: "[[sleep:100]] một" }] })),
      backend.complete(input({ conversation: "k", messages: [{ role: "user", content: "hai" }] })),
    ]);
    expect(x.text).toMatch(/#1\]/);
    expect(y.text).toMatch(/#2\] hai$/);
  });
  it("không khoá hội thoại: mỗi lần một phiên tạm rồi đóng", async () => {
    const { pool, backend } = await mk();
    await backend.complete(input({}));
    await backend.complete(input({}));
    await new Promise((r) => setTimeout(r, 50));
    expect(pool.stats().sessions).toBe(0);
  });
  it("lỗi giữa chừng thì bỏ phiên của hội thoại", async () => {
    const { pool, backend } = await mk();
    await backend.complete(input({ conversation: "z" }));
    await expect(backend.complete(input({ conversation: "z", timeoutMs: 50, messages: [{ role: "user", content: "[[sleep:2000]]" }] }))).rejects.toMatchObject({ status: 504, code: "timeout" });
    expect(pool.stats().conversations).toBe(0);
  });
  it("model không có thì 400", async () => {
    const { backend } = await mk();
    await expect(backend.complete(input({ model: "khong-co" }))).rejects.toMatchObject({ status: 400, code: "bad_model" });
  });
  it("available theo số tiến trình còn sống", async () => {
    const { pool, backend } = await mk();
    expect(backend.available()).toBe(true);
    await pool.stop();
    expect(backend.available()).toBe(false);
  });
});
