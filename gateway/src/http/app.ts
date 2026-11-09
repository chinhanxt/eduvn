import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import type { Job, JobStore } from "../jobs";
import type { LlmService } from "../llm";
import { type ChatMessage, type ContentPart, GatewayError, safeEqual, textOf } from "../types";

export type AppDeps = {
  llm: LlmService;
  jobs: JobStore;
  token: string;
  health: () => Record<string, unknown>;
  models: () => { id: string; name: string }[];
  /** Chu kỳ gửi `: ping` khi stream (mặc định 10 s). */
  pingMs?: number;
  /** Thời gian tối đa `/v1/batch` với wait=true chờ (mặc định 120 s). */
  batchWaitMs?: number;
  /** Số lô chạy cùng lúc tối đa (mặc định 20). */
  maxJobs?: number;
  /** Cấu hình log Fastify (mặc định tắt; gateway truyền cấu hình thật). Không bao giờ ghi nội dung yêu cầu. */
  logger?: boolean | object;
};

const Part = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string().regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/) }) }),
]);
// Tương thích OpenAI: vai "tool", content null; tool_calls/name/tool_call_id bị bỏ qua (z.object tự lược khoá lạ).
const Msg = z.object({ role: z.enum(["system", "user", "assistant", "tool"]), content: z.union([z.string(), z.array(Part).min(1)]).nullish() });
type MsgIn = z.infer<typeof Msg>;
const ChatBody = z.object({
  model: z.string().min(1).max(100),
  messages: z.array(Msg).min(1).max(200),
  stream: z.boolean().default(false),
  user: z.string().min(1).max(200).optional(),
  conversation: z.string().min(1).max(200).optional(),
  // json_schema chỉ bật chế độ JSON (đọc và kiểm là JSON hợp lệ); lược đồ bên trong KHÔNG được ép.
  response_format: z.object({ type: z.enum(["text", "json_object", "json_schema"]) }).optional(),
  stream_options: z.object({ include_usage: z.boolean().nullish() }).nullish(),
  tools: z.array(z.unknown()).nullish(),
  tool_choice: z.unknown().optional(),
  n: z.number().int().nullish(),
  // max_tokens, max_completion_tokens, temperature, top_p, stop: nhận và bỏ qua (z.object tự lược khoá lạ).
});
const BatchBody = z.object({
  model: z.string().min(1).max(100),
  items: z
    .array(z.object({ id: z.string().max(100).optional(), messages: z.array(Msg).min(1).max(50), json: z.boolean().optional() }))
    .min(1)
    .max(200),
  concurrency: z.number().int().min(1).max(8).default(3),
  wait: z.boolean().default(false),
});

function dataUrl(url: string): ContentPart {
  const m = /^data:(image\/[a-z]+);base64,(.*)$/s.exec(url)!;
  return { type: "image", mimeType: m[1]!, data: m[2]! };
}
export function toMessages(ms: MsgIn[]): ChatMessage[] {
  return ms.map((m): ChatMessage => {
    const content: ChatMessage["content"] =
      m.content == null ? "" : typeof m.content === "string" ? m.content : m.content.map((p): ContentPart => (p.type === "text" ? { type: "text", text: p.text } : dataUrl(p.image_url.url)));
    if (m.role !== "tool") return { role: m.role, content };
    return { role: "user", content: "Kết quả công cụ: " + textOf(content) };
  });
}
const view = (j: Job) => ({ id: j.id, status: j.status, total: j.total, done: j.done, failed: j.failed, results: j.results });

export type GatewayApp = FastifyInstance & { abortAll: () => void };

export function buildApp(d: AppDeps): GatewayApp {
  const app = Fastify({ bodyLimit: 20 * 1024 * 1024, logger: d.logger ?? false, forceCloseConnections: true }) as unknown as GatewayApp;
  const startedAt = Math.floor(Date.now() / 1000);
  const aborts = new Set<AbortController>();
  app.decorate("abortAll", () => {
    for (const ac of aborts) ac.abort();
  });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof GatewayError) return reply.code(err.status).send({ error: { code: err.code, message: err.message } });
    if (err instanceof z.ZodError) return reply.code(400).send({ error: { code: "bad_request", message: "Dữ liệu gửi lên không hợp lệ" } });
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.code(status).send({ error: { code: "bad_request", message: (err as Error).message } });
    app.log.error(err);
    return reply.code(500).send({ error: { code: "internal", message: "Lỗi cổng AI" } });
  });

  app.addHook("onRequest", async (req, reply) => {
    if (req.url === "/health") return;
    const h = req.headers.authorization ?? "";
    if (!safeEqual(h, `Bearer ${d.token}`)) return reply.code(401).send({ error: { code: "unauthorized", message: "Thiếu hoặc sai token" } });
  });

  app.get("/health", async (_req, reply) => {
    const h = d.health();
    const ok = h.ok !== false;
    if (!ok) reply.code(503);
    return { ...h, ok };
  });

  app.get("/v1/models", async () => ({
    object: "list",
    data: [
      ...d.llm.taskNames().map((t) => ({ id: `task:${t}`, object: "model", created: startedAt, owned_by: "eduvn" })),
      ...d.models().map((m) => ({ id: m.id, object: "model", created: startedAt, owned_by: "agy", name: m.name })),
    ],
  }));

  app.post("/v1/chat/completions", async (req, reply) => {
    const b = ChatBody.parse(req.body);
    if (b.tools?.length || (b.tool_choice != null && b.tool_choice !== "none")) throw new GatewayError(400, "tools_unsupported", "Cổng AI không hỗ trợ gọi công cụ (tools)");
    if (b.n != null && b.n > 1) throw new GatewayError(400, "n_unsupported", "Cổng AI chỉ trả một lựa chọn (n=1)");
    const header = req.headers["x-eduvn-conversation"];
    const hv = typeof header === "string" ? header : undefined;
    if (hv !== undefined && (hv.length < 1 || hv.length > 200)) throw new GatewayError(400, "bad_request", "x-eduvn-conversation phải dài 1-200 ký tự");
    const conversation = b.conversation ?? hv ?? b.user;
    const base = {
      model: b.model,
      messages: toMessages(b.messages),
      conversation,
      json: b.response_format?.type === "json_object" || b.response_format?.type === "json_schema" ? true : undefined,
      interactive: b.stream || !!conversation,
    };
    const id = `chatcmpl-${randomUUID()}`;
    const created = Math.floor(Date.now() / 1000);
    if (!b.stream) {
      const r = await d.llm.complete(base);
      const pt = r.usage?.inputTokens ?? 0;
      const ct = r.usage?.outputTokens ?? 0;
      return {
        id,
        object: "chat.completion",
        created,
        model: r.model,
        choices: [{ index: 0, message: { role: "assistant", content: r.text }, finish_reason: "stop" }],
        usage: { prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct },
        eduvn: { task: r.task, backend: r.backend, ms: r.ms, retried: r.retried },
      };
    }
    d.llm.route(b.model, true); // tác vụ không có → lỗi 404 trước khi mở stream
    reply.hijack();
    const raw = reply.raw;
    const ac = new AbortController();
    aborts.add(ac);
    let closed = false;
    let ping: NodeJS.Timeout | undefined;
    raw.on("close", () => {
      aborts.delete(ac);
      closed = true;
      clearInterval(ping);
      if (!raw.writableFinished) ac.abort();
    });
    const send = (o: unknown) => {
      if (!closed) raw.write(`data: ${JSON.stringify(o)}\n\n`);
    };
    const chunk = (delta: object, finish: string | null, model = b.model) =>
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta, finish_reason: finish }] });
    try {
      raw.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" });
      chunk({ role: "assistant" }, null);
      ping = setInterval(() => {
        if (!closed) raw.write(": ping\n\n");
      }, d.pingMs ?? 10000);
      try {
        const r = await d.llm.complete({ ...base, signal: ac.signal, onDelta: (t) => chunk({ content: t }, null) });
        chunk({}, "stop", r.model);
        if (b.stream_options?.include_usage) {
          const pt = r.usage?.inputTokens ?? 0;
          const ct = r.usage?.outputTokens ?? 0;
          send({ id, object: "chat.completion.chunk", created, model: r.model, choices: [], usage: { prompt_tokens: pt, completion_tokens: ct, total_tokens: pt + ct } });
        }
      } catch (e) {
        const err = e instanceof GatewayError ? e : new GatewayError(500, "internal", "Lỗi cổng AI");
        send({ error: { code: err.code, message: err.message } });
      }
      clearInterval(ping);
      if (!closed) raw.end("data: [DONE]\n\n");
    } catch {
      clearInterval(ping);
      raw.destroy();
    }
  });

  app.post("/v1/batch", async (req) => {
    const b = BatchBody.parse(req.body);
    d.llm.route(b.model); // tác vụ không có → 404 ngay
    if (d.jobs.running() >= (d.maxJobs ?? 20)) throw new GatewayError(429, "too_many_jobs", "Đang chạy quá nhiều lô, thử lại sau");
    const job = d.jobs.startBatch(d.llm, {
      model: b.model,
      concurrency: b.concurrency,
      items: b.items.map((it) => ({ id: it.id, messages: toMessages(it.messages), json: it.json })),
    });
    // Chờ tối đa batchWaitMs (mặc định 120 s) rồi trả trạng thái hiện tại (có thể vẫn "running"); client hỏi tiếp qua /v1/jobs/:id.
    if (b.wait) {
      let t: NodeJS.Timeout | undefined;
      await Promise.race([d.jobs.wait(job.id), new Promise<void>((r) => (t = setTimeout(r, d.batchWaitMs ?? 120000)))]);
      clearTimeout(t);
    }
    return view(job);
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id", async (req, reply) => {
    const j = d.jobs.get(req.params.id);
    if (!j) return reply.code(404).send({ error: { code: "not_found", message: "Không có việc này" } });
    return view(j);
  });

  return app;
}
