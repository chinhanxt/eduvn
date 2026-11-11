// Trợ lý AI dạng tác tử: /api/tro-ly/* (gói G6). Lượt chạy nền; web theo dõi bằng SSE có nối lại (Last-Event-ID).
import type { FastifyInstance, FastifyRequest } from "fastify";
import { type AgentRuntime, type SeqEvent, createAgentRuntime, kbSearchTool } from "../../agent";
import type { Db } from "../../db/client";
import { type Ai, disabledAi } from "../../services/ai";
import type { Actor } from "../../service";
import type { Tutor } from "../../tutor";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";

export type TutorAgentCtx = { db: Db; ai?: Ai; tutor: Tutor; authenticate: (req: FastifyRequest) => Promise<Actor>; runtime?: AgentRuntime };

const Id = (req: FastifyRequest) => (req.params as { id: string }).id;
const PING_MS = 15_000;
const BIG = { bodyLimit: 24 * 1024 * 1024 };

/** Đăng ký route + công cụ mặc định; trả runtime để gói khác đăng ký thêm công cụ/năng lực (runtime.tools.register, runtime.capabilities.register). */
export function registerTutorAgentRoutes(app: FastifyInstance, ctx: TutorAgentCtx): AgentRuntime {
  const runtime = ctx.runtime ?? createAgentRuntime({ db: ctx.db, ai: withTaskOverrides(ctx.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES)) });
  if (!runtime.tools.get("tra_kho_tri_thuc")) runtime.tools.register(kbSearchTool(ctx.tutor.kb));
  const owner = async (req: FastifyRequest) => ({ actor: await ctx.authenticate(req) });

  app.get("/api/tro-ly/nang-luc", async (req) => {
    const { actor } = await owner(req);
    return runtime.capabilities.list(actor).map((c) => ({ id: c.id, title: c.title, description: c.description, icon: c.icon }));
  });
  app.get("/api/tro-ly/cong-cu", async (req) => {
    const { actor } = await owner(req);
    return runtime.tools.available(actor, {}).map((t) => ({ name: t.name, title: t.title, description: t.description }));
  });

  app.post("/api/tro-ly/luot", { ...BIG, config: { rateLimit: { max: 30, timeWindow: 60_000 } } }, async (req, reply) => reply.code(201).send(await runtime.start(await owner(req), req.body)));
  app.get<{ Querystring: { su_kien?: string } }>("/api/tro-ly/luot/:id", async (req) => runtime.get(await owner(req), Id(req), req.query.su_kien === "1"));
  app.post("/api/tro-ly/luot/:id/huy", async (req) => runtime.cancel(await owner(req), Id(req)));
  app.post("/api/tro-ly/luot/:id/tra-loi", async (req) => runtime.answer(await owner(req), Id(req), req.body));
  app.get("/api/tro-ly/mach/:id", async (req) => runtime.thread(await owner(req), Id(req)));

  // SSE: id = seq; nối lại bằng header Last-Event-ID (hoặc ?sau=). Kết thúc bằng {"type":"end","status":…} khi lượt xong hoặc chờ ask_user.
  app.get<{ Querystring: { sau?: string } }>("/api/tro-ly/luot/:id/su-kien", async (req, reply) => {
    const o = await owner(req);
    const header = req.headers["last-event-id"];
    const after = Math.max(0, Number(typeof header === "string" ? header : req.query.sau) || 0);
    const buf: string[] = [];
    let open = false;
    let ended = false;
    let ping: ReturnType<typeof setInterval> | undefined;
    const write = (s: string) => (open ? reply.raw.write(s) : buf.push(s));
    const finish = () => {
      if (ended) return;
      ended = true;
      if (ping) clearInterval(ping);
      if (open) reply.raw.end();
    };
    const onEvent = (e: SeqEvent) => {
      if (ended) return;
      if (e.seq === -1) {
        write(`data: ${JSON.stringify({ type: "end", status: (e as { status: string }).status })}\n\n`);
        finish();
        return;
      }
      write(`id: ${e.seq}\ndata: ${JSON.stringify(e)}\n\n`);
    };
    const f = await runtime.follow(o, Id(req), after, onEvent);
    reply.hijack();
    reply.raw.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
    open = true;
    for (const s of buf) reply.raw.write(s);
    if (ended) {
      reply.raw.end();
      return;
    }
    ping = setInterval(() => reply.raw.write(": ping\n\n"), PING_MS);
    reply.raw.on("close", () => {
      f.close();
      if (ping) clearInterval(ping);
      ended = true;
    });
  });

  app.addHook("onClose", async () => runtime.stop());
  return runtime;
}
