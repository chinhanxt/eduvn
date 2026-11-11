// server/src/http/routes/solutions.ts — P13: giải từng bước (SSE), lời giải theo câu ngân hàng, chia sẻ công khai, thư viện /loi-giai.
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { StudentActor } from "../../auth/student";
import type { Db } from "../../db/client";
import type { Ai } from "../../services/ai";
import { createSolutionService } from "../../services/solutions";
import type { Tutor } from "../../tutor";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";
import type { Actor } from "../../service";

export type SolutionRouteCtx = {
  db: Db;
  ai: Ai;
  publicUrl: string;
  webUrl?: string;
  authenticate: (req: FastifyRequest) => Promise<Actor>;
  /** phiên HS cổng /hs (mã/thẻ/QR) — cho kết quả bài làm + "Chưa hiểu bước này" */
  student?: (req: FastifyRequest) => Promise<StudentActor>;
  tutor?: Tutor;
};

/** Ghi sinh sự kiện thành SSE. Lỗi trước sự kiện đầu (sai dữ liệu, không thấy câu, cổng AI tắt) vẫn trả mã HTTP đúng. */
async function pipeSse(req: FastifyRequest, reply: FastifyReply, start: (signal: AbortSignal) => AsyncGenerator<unknown, void, void>, fail: { busy: string; other: string; log: string }) {
  void req;
  const ac = new AbortController();
  reply.raw.on("close", () => {
    if (!reply.raw.writableEnded) ac.abort();
  });
  const it = start(ac.signal);
  const first = await it.next();
  reply.hijack();
  reply.raw.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache, no-transform", connection: "keep-alive", "x-accel-buffering": "no" });
  const send = (e: unknown) => reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
  try {
    if (!first.done) send(first.value);
    for (let r = first.done ? first : await it.next(); !r.done; r = await it.next()) send(r.value);
    send({ type: "end" });
  } catch (e) {
    const name = (e as Error).name;
    if (!ac.signal.aborted) send({ type: "error", message: name === "AiUnavailableError" ? (e as Error).message || fail.busy : fail.other });
    if (name !== "AiUnavailableError" && !ac.signal.aborted) console.error(fail.log, e);
  } finally {
    reply.raw.end();
  }
}

const StepHint = z.object({
  sessionId: z.uuid().optional(),
  message: z.string().trim().min(1).max(4000),
  hintLevel: z.number().int().min(1).max(3).default(1),
});

const Id = (req: FastifyRequest) => z.uuid({ message: "Mã lời giải không hợp lệ" }).parse((req.params as { id: string }).id);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const plain = (s: string) => s.replace(/\$([^$]*)\$/g, "$1").replace(/[*_#`>]/g, "").replace(/\s+/g, " ").trim();

export function registerSolutionRoutes(app: FastifyInstance, ctx: SolutionRouteCtx) {
  const svc = createSolutionService(ctx.db, withTaskOverrides(ctx.ai, parseOverrides(process.env.AI_TASK_OVERRIDES)));
  const { authenticate } = ctx;

  app.post("/api/solutions/solve", async (req, reply) => {
    const actor = await authenticate(req);
    await pipeSse(req, reply, (signal) => svc.solve(actor, req.body, signal), { busy: "AI đang bận, thử lại sau ít giây.", other: "Giải bài gặp lỗi, thử lại nhé.", log: "solutions solve" });
  });

  app.get("/api/solutions/:id", async (req) => svc.get(await authenticate(req), Id(req)));
  app.delete("/api/solutions/:id", async (req, reply) => {
    await svc.remove(await authenticate(req), Id(req));
    return reply.code(204).send();
  });
  app.post("/api/solutions/:id/publish", async (req) => {
    const body = z.object({ public: z.boolean() }).parse(req.body);
    return svc.publish(await authenticate(req), Id(req), body.public);
  });
  app.get<{ Params: { qid: string } }>("/api/questions/:qid/solution", async (req) => ({ solution: await svc.forQuestion(await authenticate(req), z.uuid().parse(req.params.qid)) }));
  app.post("/api/solutions/status", async (req) => svc.statusFor(await authenticate(req), z.object({ ids: z.array(z.uuid()).max(500) }).parse(req.body).ids));

  // ——— HS cổng /hs ———
  if (ctx.student) {
    const student = ctx.student;
    app.get<{ Params: { id: string } }>("/api/student/submissions/:id/solutions", async (req) => ({ solutions: await svc.forSubmission(await student(req), z.uuid({ message: "Mã bài làm không hợp lệ" }).parse(req.params.id)) }));
    /** "Chưa hiểu bước này": gia sư P6 ở chế độ gợi ý từng bước, phiên riêng của HS (learnerKey hs:<id>). */
    if (ctx.tutor) {
      const tutor = ctx.tutor;
      app.post("/api/student/tutor/step", async (req, reply) => {
        const sa = await student(req);
        const b = StepHint.parse(req.body);
        const learner = { orgId: sa.orgId, learnerKey: `hs:${sa.studentId}`, classId: sa.classId };
        await pipeSse(req, reply, (signal) => tutor.chat.stream(learner, { sessionId: b.sessionId, message: b.message, mode: "hint", hintLevel: b.hintLevel }, signal), { busy: "AI đang bận, em thử lại sau ít giây nhé.", other: "Gia sư gặp lỗi, em thử lại nhé.", log: "student step tutor" });
      });
    }
  }

  // ——— công khai ———
  app.get<{ Querystring: { topic?: string; q?: string; page?: string } }>("/api/public/solutions", async (req, reply) => {
    reply.header("cache-control", "public, max-age=60");
    return svc.publicList({ topic: req.query.topic, q: req.query.q, page: Number(req.query.page) || 1 });
  });
  app.get<{ Params: { slug: string } }>("/api/public/solutions/:slug", async (req) => svc.publicGet(z.string().max(120).parse(req.params.slug)));
  /** Trang HTML có thẻ meta/OG cho Google và mạng xã hội (máy quét không chạy JS); người xem được chuyển sang trang web. */
  app.get<{ Params: { slug: string } }>("/chia-se/loi-giai/:slug", async (req, reply) => {
    const slug = z.string().max(120).parse(req.params.slug);
    const s = await svc.publicGet(slug, false);
    const web = (ctx.webUrl ?? ctx.publicUrl).replace(/\/+$/, "");
    const url = `${web}/loi-giai/${encodeURIComponent(slug)}`;
    const title = `Lời giải: ${plain(s.solution.problem).slice(0, 80)}`;
    const desc = `${s.topic ? `${s.topic} · ` : ""}${s.solution.steps.length} bước, đáp số ${plain(s.solution.answer).slice(0, 60)}${s.solution.verification.status === "verified" ? " — đã kiểm đáp số" : ""}.`;
    const ld = { "@context": "https://schema.org", "@type": "QAPage", mainEntity: { "@type": "Question", name: plain(s.solution.problem).slice(0, 200), answerCount: 1, acceptedAnswer: { "@type": "Answer", text: s.solution.steps.map((x) => `${x.title}: ${plain(x.body)}`).join("\n").slice(0, 4000), url } } };
    return reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300")
      .send(
        `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}">` +
          `<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(url)}"><meta name="twitter:card" content="summary">` +
          `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script><meta http-equiv="refresh" content="0;url=${esc(url)}"></head>` +
          `<body><h1>${esc(title)}</h1><ol>${s.solution.steps.map((x) => `<li><b>${esc(x.title)}</b> ${esc(plain(x.body))}</li>`).join("")}</ol><p>Đáp số: ${esc(plain(s.solution.answer))}</p><a href="${esc(url)}">Xem lời giải từng bước có hình</a></body></html>`,
      );
  });
}
