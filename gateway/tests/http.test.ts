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
class SlowBackend implements Backend {
  readonly name = "acp";
  constructor(private readonly ms: number) {}
  available() {
    return true;
  }
  async complete(): Promise<BackendOutput> {
    await new Promise((r) => setTimeout(r, this.ms));
    return { text: "xong", deniedTools: 0 };
  }
}
class HangBackend implements Backend {
  readonly name = "acp";
  started: Promise<void>;
  aborted: Promise<void>;
  private markStarted!: () => void;
  private markAborted!: () => void;
  constructor() {
    this.started = new Promise((r) => (this.markStarted = r));
    this.aborted = new Promise((r) => (this.markAborted = r));
  }
  available() {
    return true;
  }
  complete(input: BackendInput): Promise<BackendOutput> {
    this.markStarted();
    return new Promise((_, rej) => {
      input.signal?.addEventListener("abort", () => {
        this.markAborted();
        rej(new Error("aborted"));
      });
    });
  }
}
const tasks = parseTasks({ defaults: { model: "claude-sonnet-5-5-low", timeoutMs: 5000, backend: "acp" }, tasks: { gia_su_chat: { model: "claude-sonnet-5-5-low", priority: "interactive" } } });
let backend: EchoBackend;
function mk(extra: Partial<Parameters<typeof buildApp>[0]> = {}, be?: Backend) {
  backend = new EchoBackend();
  const llm = new LlmService({ tasks, backends: { acp: be ?? backend }, limiter: new PriorityLimiter(4) });
  return buildApp({ llm, jobs: new JobStore(), token: TOKEN, health: () => ({ pool: { alive: 2 } }), models: () => [{ id: "claude-sonnet-5-5-low", name: "Claude Sonnet 5.5 (Low)" }], ...extra });
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
    expect(backend.calls[0]).toMatchObject({ conversation: "gia_su_chat:hs-1", priority: 0 });
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
  it("tương thích OpenAI: vai tool, assistant content null, khoá lạ bị bỏ qua", async () => {
    app = mk();
    const r = await app.inject({
      method: "POST",
      url: "/v1/chat/completions",
      headers: auth,
      payload: {
        model: "default",
        foo: 1,
        messages: [
          { role: "user", content: "hỏi" },
          { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "f", arguments: "{}" } }] },
          { role: "tool", tool_call_id: "c1", name: "f", content: "42" },
        ],
      },
    });
    expect(r.statusCode).toBe(200);
    expect(backend.calls[0]!.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(backend.calls[0]!.messages[1]!.content).toBe("");
    expect(backend.calls[0]!.messages[2]!.content).toBe("Kết quả công cụ: 42");
  });
  it("stream gửi : ping khi backend chậm", async () => {
    app = mk({ pingMs: 20 }, new SlowBackend(120));
    const r = await app.inject({ method: "POST", url: "/v1/chat/completions", headers: auth, payload: { model: "default", stream: true, messages: [{ role: "user", content: "x" }] } });
    expect(r.body).toContain(": ping\n\n");
    expect(r.body.trim().endsWith("data: [DONE]")).toBe(true);
  });
  it("batch wait bị chặn thời gian: trả running", async () => {
    app = mk({ batchWaitMs: 50 }, new SlowBackend(300));
    const r = await app.inject({ method: "POST", url: "/v1/batch", headers: auth, payload: { model: "default", wait: true, items: [{ messages: [{ role: "user", content: "x" }] }] } });
    expect(r.json().status).toBe("running");
  });
  it("quá 20 lô đang chạy → 429", async () => {
    const slow = new SlowBackend(400);
    app = mk({}, slow);
    const body = { model: "default", items: [{ messages: [{ role: "user", content: "x" }] }] };
    for (let i = 0; i < 20; i++) expect((await app.inject({ method: "POST", url: "/v1/batch", headers: auth, payload: body })).statusCode).toBe(200);
    const r = await app.inject({ method: "POST", url: "/v1/batch", headers: auth, payload: body });
    expect(r.statusCode).toBe(429);
    expect(r.json().error.code).toBe("too_many_jobs");
  });
  it("khách ngắt stream giữa chừng: backend thấy abort, không chuyển dự phòng", async () => {
    const hang = new HangBackend();
    const fb = new EchoBackend();
    backend = fb;
    const llm = new LlmService({ tasks, backends: { acp: hang, anthropic: { ...fb, name: "anthropic", available: () => true, complete: fb.complete.bind(fb) } as Backend }, limiter: new PriorityLimiter(4), fallback: "anthropic" });
    app = buildApp({ llm, jobs: new JobStore(), token: TOKEN, health: () => ({}), models: () => [] });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = (app.server.address() as { port: number }).port;
    const ac = new AbortController();
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ model: "default", stream: true, messages: [{ role: "user", content: "x" }] }), signal: ac.signal });
    const reader = res.body!.getReader();
    await reader.read();
    await hang.started;
    ac.abort();
    await hang.aborted;
    await new Promise((r) => setTimeout(r, 30));
    expect(fb.calls.length).toBe(0);
  });
});

describe("HTTP cổng AI: hợp đồng OpenAI cho OpenMAIC/DeepTutor", () => {
  const chat = (payload: object, headers: Record<string, string> = {}) =>
    app!.inject({ method: "POST", url: "/v1/chat/completions", headers: { ...auth, ...headers }, payload: { model: "gia_su_chat", messages: [{ role: "user", content: "chào" }], ...payload } });
  it("khoá hội thoại: body conversation > header > user", async () => {
    app = mk();
    await chat({ conversation: "A", user: "U" }, { "x-eduvn-conversation": "H" });
    await chat({ user: "U" }, { "x-eduvn-conversation": "H" });
    await chat({ user: "U" });
    expect(backend.calls.map((c) => c.conversation)).toEqual(["gia_su_chat:A", "gia_su_chat:H", "gia_su_chat:U"]);
    expect((await chat({ conversation: "x".repeat(201) })).statusCode).toBe(400);
  });
  it("response_format json_schema bật chế độ JSON", async () => {
    app = mk();
    const r = await chat({ messages: [{ role: "user", content: "cho json" }], response_format: { type: "json_schema", json_schema: { name: "x", schema: { type: "object" } } } });
    expect(JSON.parse(r.json().choices[0].message.content)).toEqual({ ok: true });
  });
  it("tools / tool_choice → 400 tools_unsupported; tool_choice none và tools rỗng được", async () => {
    app = mk();
    const a = await chat({ tools: [{ type: "function", function: { name: "f" } }] });
    expect(a.statusCode).toBe(400);
    expect(a.json().error.code).toBe("tools_unsupported");
    expect((await chat({ tool_choice: "auto" })).statusCode).toBe(400);
    expect((await chat({ tools: [], tool_choice: "none" })).statusCode).toBe(200);
  });
  it("nhận và bỏ qua max_tokens, temperature…; n>1 → 400", async () => {
    app = mk();
    expect((await chat({ max_tokens: 10, max_completion_tokens: 10, temperature: 0.2, top_p: 1, stop: ["x"], n: 1 })).statusCode).toBe(200);
    expect((await chat({ n: 2 })).statusCode).toBe(400);
  });
  it("stream_options.include_usage thêm mảnh usage trước [DONE]", async () => {
    app = mk();
    const r = await chat({ stream: true, stream_options: { include_usage: true } });
    const events = r.body.split("\n\n").filter(Boolean).map((l) => l.replace(/^data: /, ""));
    expect(events.at(-1)).toBe("[DONE]");
    const last = JSON.parse(events.at(-2)!);
    expect(last.choices).toEqual([]);
    expect(last.usage).toEqual({ prompt_tokens: 3, completion_tokens: 9, total_tokens: 12 });
    const plain = await chat({ stream: true });
    expect(plain.body).not.toContain('"usage"');
  });
  it("/v1/models có created", async () => {
    app = mk();
    const d = (await app.inject({ method: "GET", url: "/v1/models", headers: auth })).json().data;
    expect(d.every((m: { created: number }) => Number.isInteger(m.created) && m.created > 1e9)).toBe(true);
  });
  it("health 503 khi không có backend nào", async () => {
    app = mk({ health: () => ({ ok: false, pool: { alive: 0 } }) });
    const r = await app.inject({ method: "GET", url: "/health" });
    expect(r.statusCode).toBe(503);
    expect(r.json().ok).toBe(false);
  });
  it("abortAll huỷ stream đang chạy", async () => {
    const hang = new HangBackend();
    const llm = new LlmService({ tasks, backends: { acp: hang }, limiter: new PriorityLimiter(4) });
    app = buildApp({ llm, jobs: new JobStore(), token: TOKEN, health: () => ({}), models: () => [] });
    await app.listen({ port: 0, host: "127.0.0.1" });
    const port = (app.server.address() as { port: number }).port;
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, { method: "POST", headers: { ...auth, "content-type": "application/json" }, body: JSON.stringify({ model: "default", stream: true, messages: [{ role: "user", content: "x" }] }) });
    const reader = res.body!.getReader();
    await reader.read();
    await hang.started;
    app.abortAll();
    await hang.aborted;
  });
});
