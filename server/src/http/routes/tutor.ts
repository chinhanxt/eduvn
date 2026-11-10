import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { type Actor } from "../../service";
import { learnerOf } from "../../tutor/chat";
import type { DocInput } from "../../tutor/kb";
import type { Tutor } from "../../tutor";

export type TutorRouteCtx = { tutor: Tutor; authenticate: (req: FastifyRequest) => Promise<Actor> };

const Id = (req: FastifyRequest) => (req.params as { id: string }).id;
const BIG_DOC = { bodyLimit: 30 * 1024 * 1024 };
const BIG_CHAT = { bodyLimit: 24 * 1024 * 1024 };
const DocBody = z.union([z.object({ name: z.string().min(1), contentBase64: z.string().min(1) }), z.object({ name: z.string().default("Ghi chú"), text: z.string().min(20).max(500_000) }), z.object({ lessonPlanId: z.uuid() })]);

/** Mọi route /api/tutor/*: học sinh dùng cho chính mình; GV/owner/admin (tutor:manage) quản lý kho và giáo trình. */
export function registerTutorRoutes(app: FastifyInstance, { tutor, authenticate }: TutorRouteCtx): void {
  const learner = async (req: FastifyRequest) => learnerOf(await authenticate(req));

  // ---- Kho tri thức ----
  app.get("/api/tutor/kbs", async (req) => tutor.kb.list(await authenticate(req)));
  app.post("/api/tutor/kbs", async (req, reply) => reply.code(201).send(await tutor.kb.create(await authenticate(req), req.body)));
  app.get("/api/tutor/kbs/:id", async (req) => tutor.kb.get(await authenticate(req), Id(req)));
  app.delete("/api/tutor/kbs/:id", async (req, reply) => {
    await tutor.kb.remove(await authenticate(req), Id(req));
    return reply.code(204).send();
  });
  app.post("/api/tutor/kbs/:id/docs", BIG_DOC, async (req, reply) => {
    const actor = await authenticate(req);
    return reply.code(201).send(await tutor.kb.addDocument(actor, Id(req), DocBody.parse(req.body) as DocInput));
  });
  app.delete<{ Params: { id: string; docId: string } }>("/api/tutor/kbs/:id/docs/:docId", async (req, reply) => {
    await tutor.kb.removeDocument(await authenticate(req), req.params.id, req.params.docId);
    return reply.code(204).send();
  });
  app.get("/api/tutor/kbs/:id/ocr", async (req) => ({ ocr: await tutor.kb.progress(await authenticate(req), Id(req)) }));
  app.get<{ Params: { id: string }; Querystring: { q?: string; k?: string } }>("/api/tutor/kbs/:id/search", async (req) => {
    const actor = await authenticate(req);
    const hits = await tutor.kb.search(actor, req.params.id, req.query.q ?? "", Math.min(10, Number(req.query.k) || 5));
    return { hits: hits.map((h) => ({ doc: h.doc, page: h.page, score: Math.round(h.score * 100) / 100, text: h.text })) };
  });

  // ---- Gia sư chat (SSE) ----
  app.post("/api/tutor/chat", BIG_CHAT, async (req, reply) => {
    const l = await learner(req);
    const ac = new AbortController();
    reply.raw.on("close", () => {
      if (!reply.raw.writableEnded) ac.abort();
    });
    const it = tutor.chat.stream(l, req.body, ac.signal);
    // Lỗi trước khi có chữ đầu (sai dữ liệu, không thấy phiên, ...) vẫn trả mã HTTP đúng.
    const first = await it.next();
    reply.hijack();
    reply.raw.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
    const send = (e: unknown) => reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
    try {
      if (!first.done) send(first.value);
      for (let r = first.done ? first : await it.next(); !r.done; r = await it.next()) send(r.value);
      send({ type: "end" });
    } catch (e) {
      if (!ac.signal.aborted) send({ type: "error", message: (e as Error).name === "AiUnavailableError" ? "AI đang bận, em thử lại sau ít giây nhé." : "Gia sư gặp lỗi, em thử lại nhé." });
      if ((e as Error).name !== "AiUnavailableError" && !ac.signal.aborted) console.error("tutor chat", e);
    } finally {
      reply.raw.end();
    }
  });
  app.get("/api/tutor/sessions", async (req) => tutor.chat.listSessions(await learner(req)));
  app.get("/api/tutor/sessions/:id", async (req) => tutor.chat.getSession(await learner(req), Id(req)));
  app.delete("/api/tutor/sessions/:id", async (req, reply) => {
    await tutor.chat.removeSession(await learner(req), Id(req));
    return reply.code(204).send();
  });
  app.post("/api/tutor/sessions/:id/ask-hint", async (req) => tutor.chat.askHint(await learner(req), Id(req)));
  app.get<{ Querystring: { kbId?: string } }>("/api/tutor/starters", async (req) => tutor.chat.starters(await authenticate(req), req.query.kbId));

  // ---- Luyện tập + ôn giãn cách ----
  app.get("/api/tutor/practice/next", async (req) => tutor.practice.next(await learner(req), req.query));
  app.post("/api/tutor/practice/answer", async (req) => tutor.practice.answer(await learner(req), req.body));
  app.post("/api/tutor/practice/rate", async (req) => tutor.practice.rate(await learner(req), req.body));
  app.get<{ Querystring: { days?: string } }>("/api/tutor/practice/stats", async (req) => tutor.practice.stats(await learner(req), req.query.days));

  // ---- Lộ trình thành thạo ----
  app.get("/api/tutor/paths", async (req) => tutor.mastery.list(await learner(req)));
  app.post("/api/tutor/paths", async (req, reply) => reply.code(201).send(await tutor.mastery.create(await learner(req), req.body)));
  app.get("/api/tutor/paths/:id", async (req) => tutor.mastery.get(await learner(req), Id(req)));
  app.delete("/api/tutor/paths/:id", async (req, reply) => {
    await tutor.mastery.remove(await learner(req), Id(req));
    return reply.code(204).send();
  });
  app.post("/api/tutor/paths/:id/step", async (req) => tutor.mastery.step(await learner(req), Id(req), req.body));

  // ---- Sinh câu hỏi ----
  app.post("/api/tutor/questions/generate", async (req, reply) => reply.code(201).send(await tutor.questions.generate(await authenticate(req), req.body)));
  app.get("/api/tutor/drafts", async (req) => tutor.questions.listDrafts(await authenticate(req)));
  app.post("/api/tutor/drafts/:id/approve", async (req) => tutor.questions.approve(await authenticate(req), Id(req), (req.body as { edited?: unknown } | null)?.edited));
  app.post("/api/tutor/drafts/:id/reject", async (req, reply) => {
    await tutor.questions.reject(await authenticate(req), Id(req));
    return reply.code(204).send();
  });
  app.post("/api/tutor/questions/followup", async (req) => tutor.questions.followup(await learner(req), req.body));

  // ---- Giáo trình sống ----
  app.get("/api/tutor/books", async (req) => tutor.books.list(await authenticate(req)));
  app.post("/api/tutor/books", async (req, reply) => reply.code(201).send(await tutor.books.create(await authenticate(req), req.body)));
  app.get("/api/tutor/books/:id", async (req) => tutor.books.get(await authenticate(req), Id(req)));
  app.delete("/api/tutor/books/:id", async (req, reply) => {
    await tutor.books.remove(await authenticate(req), Id(req));
    return reply.code(204).send();
  });
  app.get<{ Params: { id: string; idx: string } }>("/api/tutor/books/:id/pages/:idx", async (req) => tutor.books.getPage(await authenticate(req), req.params.id, Number(req.params.idx)));
  app.post<{ Params: { id: string; idx: string } }>("/api/tutor/books/:id/pages/:idx/compile", async (req) => tutor.books.compilePage(await authenticate(req), req.params.id, Number(req.params.idx)));
}
