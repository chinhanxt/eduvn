import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Actor } from "../../service";
import type { LiveService } from "../../services/live";

type Ctx = { live: LiveService; authenticate: (req: FastifyRequest) => Promise<Actor> };

/** Trò chơi trực tiếp: GV (cần đăng nhập) và HS (công khai, token người chơi). Thời gian thực bằng SSE. */
export function registerLiveRoutes(app: FastifyInstance, { live, authenticate }: Ctx): void {
  const stream = (req: FastifyRequest, reply: import("fastify").FastifyReply, attach: (res: import("node:http").ServerResponse) => () => void) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
    res.write("retry: 2000\n\n");
    let detach: () => void;
    try {
      detach = attach(res);
    } catch (e) {
      res.write(`event: gone\ndata: ${JSON.stringify({ error: (e as Error).message })}\n\n`);
      res.end();
      return;
    }
    req.raw.on("close", detach);
  };
  const noStore = { "cache-control": "no-store" };

  // ----- GV -----
  app.post("/api/live", async (req, reply) => reply.code(201).send(await live.create(await authenticate(req), req.body)));
  app.get("/api/live", async (req) => live.listMine(await authenticate(req)));
  app.get("/api/live/sessions", async (req) => live.listSessions(await authenticate(req)));
  app.get<{ Params: { id: string } }>("/api/live/sessions/:id", async (req) => live.getSession(await authenticate(req), req.params.id));
  app.post<{ Params: { id: string } }>("/api/live/sessions/:id/gradebook", async (req) => live.writeGradebook(await authenticate(req), req.params.id, req.body));
  app.get<{ Params: { pin: string } }>("/api/live/room/:pin", async (req) => live.hostInfo(await authenticate(req), req.params.pin));
  app.post<{ Params: { pin: string } }>("/api/live/room/:pin/control", async (req) => live.control(await authenticate(req), req.params.pin, (req.body as { action?: unknown } | null)?.action));
  app.get<{ Params: { pin: string }; Querystring: { t?: string } }>("/api/live/room/:pin/host-stream", (req, reply) => stream(req, reply, (res) => live.attachHost(req.params.pin, req.query.t ?? "", res)));

  // ----- HS (công khai) -----
  app.get<{ Params: { pin: string } }>("/api/live/pin/:pin", async (req, reply) => reply.headers(noStore).send(live.lookup(req.params.pin, req.ip)));
  app.post<{ Params: { pin: string } }>("/api/live/pin/:pin/join", async (req, reply) => reply.headers(noStore).send(live.join(req.params.pin, req.ip, req.body)));
  app.get<{ Querystring: { t?: string } }>("/api/live/stream", (req, reply) => stream(req, reply, (res) => live.attachPlayer(req.query.t ?? "", res)));
  app.post("/api/live/answer", async (req, reply) => reply.headers(noStore).send(live.answer(req.body)));
}
