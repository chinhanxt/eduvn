import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/http/app";
import { JobStore } from "../src/jobs";
import { PriorityLimiter } from "../src/limiter";
import { LlmService } from "../src/llm";
import { parseTasks } from "../src/routes";
import type { Backend, BackendInput, BackendOutput } from "../src/types";

const TOKEN = "t".repeat(32);
class EchoBackend implements Backend {
  readonly name = "acp";
  calls: BackendInput[] = [];
  available() {
    return true;
  }
  async complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
    this.calls.push(input);
    const last = input.messages.at(-1)!;
    const text = typeof last.content === "string" ? last.content : last.content.map((p) => (p.type === "text" ? p.text : `[ảnh ${p.mimeType}]`)).join(" ");
    if (text.includes("lỗi")) throw new Error("hỏng");
    const out = text.includes("json") ? '{"ok":true}' : `Đáp: ${text}`;
    for (const part of [out.slice(0, 4), out.slice(4)]) onDelta?.(part);
    return { text: out, deniedTools: 0, usage: { inputTokens: 3, outputTokens: out.length } };
  }
}
const tasks = parseTasks({ defaults: { model: "claude-sonnet-5-5-low", timeoutMs: 5000, backend: "acp" }, tasks: { gia_su_chat: { model: "claude-sonnet-5-5-low", priority: "interactive" } } });
let backend: EchoBackend;
function mk() {
  backend = new EchoBackend();
  const llm = new LlmService({ tasks, backends: { acp: backend }, limiter: new PriorityLimiter(4) });
  return buildApp({ llm, jobs: new JobStore(), token: TOKEN, health: () => ({ pool: { alive: 2 } }), models: () => [{ id: "claude-sonnet-5-5-low", name: "Claude Sonnet 5.5 (Low)" }] });
}
const auth = { authorization: `Bearer ${TOKEN}` };
let app: ReturnType<typeof mk> | null = null;
afterEach(async () => {
  await app?.close();
  app = null;
});

describe("HTTP cổng AI", () => {
  it("health không cần token; route khác cần token", async () => {
    app = mk();
    expect((await app.inject({ method: "GET", url: "/health" })).json()).toEqual({ ok: true, pool: { alive: 2 } });
    const r = await app.inject({ method: "GET", url: "/v1/models" });
    expect(r.statusCode).toBe(401);
    expect(r.json().error.code).toBe("unauthorized");
    expect((await app.inject({ method: "GET", url: "/v1/models", headers: { authorization: "Bearer sai" } })).statusCode).toBe(401);
  });
  it("liệt kê tác vụ và model", async () => {
    app = mk();
    const ids = (await app.inject({ method: "GET", url: "/v1/models", headers: auth })).json().data.map((m: { id: string }) => m.id);
    expect(ids).toEqual(["task:gia_su_chat", "claude-sonnet-5-5-low"]);
  });
  it("chat không stream: định dạng OpenAI + thông tin eduvn", async () => {
    app = mk();
    const r = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "gia_su_chat", user: "hs-1", messages: [{ role: "user", content: "chào cô" }] } });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.object).toBe("chat.completion");
    expect(b.choices[0]).toEqual({ index: 0, message: { role: "assistant", content: "Đáp: chào cô" }, finish_reason: "stop" });
    expect(b.usage).toEqual({ prompt_tokens: 3, completion_tokens: 12, total_tokens: 15 });
    expect(b.eduvn).toMatchObject({ task: "gia_su_chat", backend: "acp", retried: false });
    expect(backend.calls[0]).toMatchObject({ conversation: "hs-1", priority: 0 });
  });
  it("chat stream: các mảnh SSE rồi [DONE]", async () => {
    app = mk();
    const r = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", stream: true, messages: [{ role: "user", content: "hi" }] } });
    expect(r.headers["content-type"]).toContain("text/event-stream");
    const events = r.body.split("\n\n").filter(Boolean).map((l) => l.replace(/^data: /, ""));
    expect(events.at(-1)).toBe("[DONE]");
    const chunks = events.slice(0, -1).map((e) => JSON.parse(e));
    expect(chunks[0].choices[0].delta).toEqual({ role: "assistant" });
    expect(chunks.slice(1, -1).map((c) => c.choices[0].delta.content).join("")).toBe("Đáp: hi");
    expect(chunks.at(-1).choices[0].finish_reason).toBe("stop");
    expect(backend.calls[0]!.priority).toBe(0); // stream = tương tác
  });
  it("lỗi trong lúc stream gửi sự kiện error rồi [DONE]", async () => {
    app = mk();
    const r = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", stream: true, messages: [{ role: "user", content: "gây lỗi" }] } });
    expect(r.body).toContain('"error"');
    expect(r.body.trim().endsWith("data: [DONE]")).toBe(true);
  });
  it("ảnh data URL thành phần ảnh; URL thường bị từ chối", async () => {
    app = mk();
    const ok = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", messages: [{ role: "user", content: [{ type: "text", text: "xem" }, { type: "image_url", image_url: { url: "data:image/png;base64,AA==" } }] }] } });
    expect(ok.json().choices[0].message.content).toBe("Đáp: xem [ảnh image/png]");
    const bad = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "https://x.y/a.png" } }] }] } });
    expect(bad.statusCode).toBe(400);
  });
  it("response_format json_object trả JSON đã kiểm", async () => {
    app = mk();
    const r = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", response_format: { type: "json_object" }, messages: [{ role: "user", content: "cho json" }] } });
    expect(JSON.parse(r.json().choices[0].message.content)).toEqual({ ok: true });
  });
  it("tác vụ không có → 404, body sai → 400", async () => {
    app = mk();
    expect((await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "task:khong_co", messages: [{ role: "user", content: "x" }] } })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", messages: [] } })).statusCode).toBe(400);
  });
  it("batch chờ xong: kết quả theo thứ tự, lỗi từng mục không làm hỏng cả lô", async () => {
    app = mk();
    const r = await app.inject({
      method: "POST",
      url: "/v1/batch",
      headers: auth,
      payload: { model: "default", wait: true, concurrency: 2, items: [{ id: "a", messages: [{ role: "user", content: "một" }] }, { messages: [{ role: "user", content: "lỗi" }] }, { id: "c", messages: [{ role: "user", content: "ba" }] }] },
    });
    const b = r.json();
    expect(b).toMatchObject({ status: "done", total: 3, done: 3, failed: 1 });
    expect(b.results.map((x: { id: string; ok: boolean }) => [x.id, x.ok])).toEqual([["a", true], ["1", false], ["c", true]]);
    expect(b.results[0].text).toBe("Đáp: một");
    expect(backend.calls.every((c) => c.priority === 1)).toBe(true);
  });
  it("batch không chờ: trả id, hỏi trạng thái qua /v1/jobs/:id", async () => {
    app = mk();
    const start = (await app.inject({ method: "POST", url: "/v1/batch", headers: auth, payload: { model: "default", items: [{ messages: [{ role: "user", content: "x" }] }] } })).json();
    expect(start.status).toBe("running");
    let j = start;
    for (let i = 0; i < 50 && j.status !== "done"; i++) {
      await new Promise((r) => setTimeout(r, 10));
      j = (await app.inject({ method: "GET", url: `/v1/jobs/${start.id}`, headers: auth })).json();
    }
    expect(j).toMatchObject({ status: "done", done: 1 });
    expect((await app.inject({ method: "GET", url: "/v1/jobs/khong-co", headers: auth })).statusCode).toBe(404);
  });
});
