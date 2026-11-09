import { randomUUID } from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import type { Job, JobStore } from "../jobs";
import type { LlmService } from "../llm";
import { type ChatMessage, type ContentPart, GatewayError, safeEqual } from "../types";

export type AppDeps = {
  llm: LlmService;
  jobs: JobStore;
  token: string;
  health: () => Record<string, unknown>;
  models: () => { id: string; name: string }[];
};

const Part = z.union([
  z.object({ type: z.literal("text"), text: z.string() }),
  z.object({ type: z.literal("image_url"), image_url: z.object({ url: z.string().regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/) }) }),
]);
const Msg = z.object({ role: z.enum(["system", "user", "assistant"]), content: z.union([z.string(), z.array(Part).min(1)]) });
type MsgIn = z.infer<typeof Msg>;
const ChatBody = z.object({
  model: z.string().min(1).max(100),
  messages: z.array(Msg).min(1).max(200),
  stream: z.boolean().default(false),
  user: z.string().min(1).max(200).optional(),
  response_format: z.object({ type: z.enum(["text", "json_object"]) }).optional(),
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
  return ms.map((m) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : m.content.map((p): ContentPart => (p.type === "text" ? { type: "text", text: p.text } : dataUrl(p.image_url.url))),
  }));
}
const view = (j: Job) => ({ id: j.id, status: j.status, total: j.total, done: j.done, failed: j.failed, results: j.results });

export function buildApp(d: AppDeps): FastifyInstance {
  const app = Fastify({ bodyLimit: 20 * 1024 * 1024 });

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

  app.get("/health", async () => ({ ok: true, ...d.health() }));

  app.get("/v1/models", async () => ({
    object: "list",
    data: [
      ...d.llm.taskNames().map((t) => ({ id: `task:${t}`, object: "model", owned_by: "eduvn" })),
      ...d.models().map((m) => ({ id: m.id, object: "model", owned_by: "agy", name: m.name })),
    ],
  }));

  app.post("/v1/chat/completions", async (req, reply) => {
    const b = ChatBody.parse(req.body);
    const base = {
      model: b.model,
      messages: toMessages(b.messages),
      conversation: b.user,
      json: b.response_format?.type === "json_object" ? true : undefined,
      interactive: b.stream || !!b.user,
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
    raw.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive", "x-accel-buffering": "no" });
    const send = (o: unknown) => raw.write(`data: ${JSON.stringify(o)}\n\n`);
    const chunk = (delta: object, finish: string | null, model = b.model) =>
      send({ id, object: "chat.completion.chunk", created, model, choices: [{ index: 0, delta, finish_reason: finish }] });
    chunk({ role: "assistant" }, null);
    try {
      const r = await d.llm.complete({ ...base, onDelta: (t) => chunk({ content: t }, null) });
      chunk({}, "stop", r.model);
    } catch (e) {
      const err = e instanceof GatewayError ? e : new GatewayError(500, "internal", "Lỗi cổng AI");
      send({ error: { code: err.code, message: err.message } });
    }
    raw.end("data: [DONE]\n\n");
  });

  app.post("/v1/batch", async (req) => {
    const b = BatchBody.parse(req.body);
    d.llm.route(b.model); // tác vụ không có → 404 ngay
    const job = d.jobs.startBatch(d.llm, {
      model: b.model,
      concurrency: b.concurrency,
      items: b.items.map((it) => ({ id: it.id, messages: toMessages(it.messages), json: it.json })),
    });
    if (b.wait) await d.jobs.wait(job.id);
    return view(job);
  });

  app.get<{ Params: { id: string } }>("/v1/jobs/:id", async (req, reply) => {
    const j = d.jobs.get(req.params.id);
    if (!j) return reply.code(404).send({ error: { code: "not_found", message: "Không có việc này" } });
    return view(j);
  });

  return app;
}
