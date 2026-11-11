import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import rateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError, z } from "zod";
import { resolveActor } from "../auth/actor";
import { type DownloadClaims, createDownloadSigner } from "../auth/download";
import { createStudentAuth } from "../auth/student";
import type { Identity, VerifyToken } from "../auth/verify";
import type { Db } from "../db/client";
import { ForbiddenError } from "../domain/authz";
import { ResponseValue } from "../domain/scoring";
import { answerKey } from "../domain/variants";
import { AiUnavailableError, ConflictError, NotFoundError, TooManyRequestsError, UnauthorizedError, ValidationError } from "../errors";
import { createAssignmentService } from "../services/assignments";
import { createCredentialService } from "../services/credentials";
import { createSubmissionService } from "../services/submissions";
import { registerClassroomRoutes } from "./classroom";
import { bearer, registerStudentRoutes } from "./student";
import { type Ai, disabledAi } from "../services/ai";
import { createDiagramService } from "../services/diagrams";
import { buildFigure } from "../services/geometry";
import { parseOverrides, withTaskOverrides } from "../tutor/tasks";
import { renderAnswerKeyDocx, renderExamDocx } from "../export/docx";
import { renderLessonDocx } from "../export/lesson";
import { renderMatrixDocx } from "../export/matrix";
import { buildMatrixReport } from "../domain/matrixReport";
import { rulesForSubject } from "../domain/scoring";
import { createLessonService } from "../services/lessons";
import { createVanBanService } from "../services/vanban";
import { renderVanBanDocx } from "../export/vanban";
import { renderGameHtml } from "../export/game";
import { renderSlidesPptx } from "../export/slides";
import { createBoardService } from "../services/boards";
import { createGameService } from "../services/games";
import { createSlideService } from "../services/slides";
import type { AiLessonsCfg } from "../services/aiLessons/service";
import { registerAiLessonRoutes } from "./routes/aiLessons";
import { registerAiSkillRoutes } from "./routes/aiSkills";
import { registerLiveRoutes } from "./routes/liveGame";
import { createLiveService } from "../services/live";
import { renderClassListXlsx, renderGradebookXlsx } from "../export/xlsx";
import { buildMcpServer } from "../mcp/server";
import { createClassService } from "../services/classes";
import { StudentItem } from "../domain/roster";
import { createTutor } from "../tutor";
import { registerInkRoutes } from "./routes/ink";
import { registerTutorRoutes } from "./routes/tutor";
import { registerSolutionRoutes } from "./routes/solutions";
import { type Actor, type ExamLinks, GenerateExamInput, createService } from "../service";

export type AppDeps = {
  db: Db;
  verify: VerifyToken;
  issuer: string;
  publicUrl: string;
  downloadSecret: string;
  /** Khoá ký phiên HS + thẻ QR (HS256, ≥ 32 ký tự). */
  studentSecret: string;
  ai?: Ai;
  aiLessons?: AiLessonsCfg;
  /** Đồng hồ (test truyền đồng hồ giả). */
  now?: () => Date;
  /** Bật @fastify/under-pressure: quá tải trả 503 + Retry-After. Test không bật. */
  pressure?: { maxEventLoopDelay: number };
  /** Giới hạn mỗi bài làm trên route ghi của HS; mặc định 60 lần/phút. */
  studentRateLimit?: { max: number; timeWindow: number };
  /** Chu kỳ quét chốt bài quá hạn (ms); 0/không có = tắt. */
  sweepMs?: number;
};

const GradeBody = z.object({ code: z.string().min(1), responses: z.record(z.string(), ResponseValue) });
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const LINK_TTL_MINUTES = 15;

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024, routerOptions: { maxParamLength: 2048 } });
  const service = createService(deps.db);
  const classes = createClassService(deps.db);
  const lessons = createLessonService(deps.db);
  const vanBan = createVanBanService(deps.db);
  const slides = createSlideService(deps.db);
  const games = createGameService(deps.db);
  const boardsSvc = createBoardService(deps.db);
  const now = deps.now ?? (() => new Date());
  const studentAuth = createStudentAuth(deps.studentSecret);
  const credentials = createCredentialService(deps.db, studentAuth, { now });
  const submissionsSvc = createSubmissionService(deps.db, { now });
  const assignmentsSvc = createAssignmentService(deps.db, { now, finalize: (id) => submissionsSvc.finalizeExpired({ assignmentId: id }) });
  const diagramsSvc = createDiagramService(deps.db, deps.ai ?? disabledAi);
  const signer = createDownloadSigner(deps.downloadSecret, `${LINK_TTL_MINUTES}m`);
  const metadataUrl = `${deps.publicUrl}/.well-known/oauth-protected-resource`;

  if (deps.pressure) app.register(underPressure, { maxEventLoopDelay: deps.pressure.maxEventLoopDelay, retryAfter: 2, exposeStatusRoute: false });
  app.register(rateLimit, { global: false, errorResponseBuilder: (_req, ctx) => ({ statusCode: 429, message: `Gửi quá nhanh, thử lại sau ${Math.ceil(ctx.ttl / 1000)} giây` }) });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof UnauthorizedError) {
      return reply.code(401).header("www-authenticate", `Bearer resource_metadata="${metadataUrl}"`).send({ error: err.message });
    }
    if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
    if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
    if (err instanceof AiUnavailableError) return reply.code(503).header("retry-after", "5").send({ error: err.message });
    if (err instanceof ValidationError) return reply.code(400).send({ error: err.message, issues: err.issues });
    if (err instanceof ZodError) return reply.code(400).send({ error: "Dữ liệu không hợp lệ", issues: err.issues });
    if (err instanceof TooManyRequestsError) return reply.code(429).header("retry-after", String(err.retryAfterSec)).send({ error: err.message });
    if (err instanceof ConflictError) return reply.code(409).send({ error: err.message, ...err.extra });
    const code = (err as { code?: string }).code;
    if (code === "FST_UNDER_PRESSURE") return reply.code(503).send({ error: "Máy chủ đang bận, thử lại sau giây lát" });
    if (code === "FST_ERR_CTP_BODY_TOO_LARGE")
      return reply.code(413).send({ error: req.url.startsWith("/api/boards") || req.url.startsWith("/api/diagrams") ? "Bài giảng quá lớn (tối đa 4 MB) — xoá bớt nét vẽ hoặc tách trang." : "Dữ liệu gửi lên quá lớn" });
    const status = (err as { statusCode?: number }).statusCode;
    if (status !== undefined && status >= 400 && status < 500) return reply.code(status).send({ error: (err as Error).message });
    console.error(err);
    return reply.code(500).send({ error: "Lỗi máy chủ" });
  });

  async function authenticate(req: FastifyRequest): Promise<Actor> {
    const header = req.headers.authorization;
    const m = /^Bearer\s+(.+)$/i.exec(header ?? "");
    if (!m?.[1]) throw new UnauthorizedError("Thiếu access token");
    let identity: Identity;
    try {
      identity = await deps.verify(m[1]);
    } catch {
      throw new UnauthorizedError("Access token không hợp lệ hoặc đã hết hạn");
    }
    const orgHeader = req.headers["x-org-id"];
    return resolveActor(deps.db, identity, typeof orgHeader === "string" ? orgHeader : undefined);
  }

  async function makeLinks(actor: Actor, examId: string): Promise<ExamLinks> {
    const exam = await service.getExam(actor, examId);
    const url = async (kind: "exam" | "key" | "matrix", code?: string) =>
      `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, examId: exam.id, kind, code })}`;
    return {
      exams: await Promise.all(exam.variants.map(async (v) => ({ code: v.code, url: await url("exam", v.code) }))),
      answerKey: await url("key"),
      matrix: await url("matrix"),
      expiresInMinutes: LINK_TTL_MINUTES,
    };
  }

  async function makeClassLink(actor: Actor, classRef: string, kind: "class_list" | "gradebook", term?: "HK1" | "HK2") {
    const classId = await classes.classIdFor(actor, classRef, "class:read");
    return { url: `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, classId, kind, ...(term && { term }) })}`, expiresInMinutes: LINK_TTL_MINUTES };
  }

  async function makeMatrixLink(actor: Actor, examId: string) {
    const exam = await service.getExam(actor, examId);
    const report = buildMatrixReport(exam.matrix, rulesForSubject(exam.matrix.subject), exam.variants[0]);
    const url = `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, examId: exam.id, kind: "matrix" })}`;
    return { url, expiresInMinutes: LINK_TTL_MINUTES, totalCount: report.totalCount, totalPoints: report.totalPoints, levelRatio: report.levelRatio, warnings: report.warnings };
  }

  async function makeLessonLink(actor: Actor, lessonId: string) {
    const id = await lessons.idFor(actor, lessonId);
    return { url: `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, lessonId: id, kind: "lesson" })}`, expiresInMinutes: LINK_TTL_MINUTES };
  }

  async function makeVanBanLink(actor: Actor, vanBanId: string) {
    const id = await vanBan.idFor(actor, vanBanId);
    return { url: `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, vanBanId: id, kind: "van_ban" })}`, expiresInMinutes: LINK_TTL_MINUTES };
  }

  async function makeSlideLink(actor: Actor, slideId: string) {
    const id = await slides.idFor(actor, slideId);
    return { url: `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, slideId: id, kind: "slide" })}`, expiresInMinutes: LINK_TTL_MINUTES };
  }

  async function makeGameLink(actor: Actor, gameId: string) {
    const id = await games.idFor(actor, gameId);
    return { url: `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, gameId: id, kind: "game" })}`, expiresInMinutes: LINK_TTL_MINUTES };
  }

  const slug = (s: string, fallback: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || fallback;

  app.get("/health", async () => ({ ok: true }));

  registerStudentRoutes(app, { auth: studentAuth, verify: deps.verify, credentials, submissions: submissionsSvc, rateLimit: deps.studentRateLimit ?? { max: 60, timeWindow: 60_000 } });
  registerClassroomRoutes(app, { authenticate, credentials, assignments: assignmentsSvc });

  if (deps.sweepMs) {
    let timer: NodeJS.Timeout | undefined;
    app.addHook("onReady", async () => {
      timer = setInterval(() => {
        submissionsSvc.finalizeExpired().catch((e: unknown) => console.error("sweep", e));
      }, deps.sweepMs);
      timer.unref();
    });
    app.addHook("onClose", async () => clearInterval(timer));
  }

  app.get("/.well-known/oauth-protected-resource", async () => ({
    resource: `${deps.publicUrl}/mcp`,
    authorization_servers: [deps.issuer],
    bearer_methods_supported: ["header"],
  }));

  app.get("/api/me", async (req) => service.me(await authenticate(req)));

  app.get("/api/exams", async (req) => service.listExamSummaries(await authenticate(req)));

  app.post("/api/questions", async (req, reply) => reply.code(201).send(await service.addQuestion(await authenticate(req), req.body)));

  app.get("/api/questions", async (req) => service.searchQuestions(await authenticate(req), req.query));
  app.get("/api/questions/related", async (req) => service.relatedQuestions(await authenticate(req), req.query));

  app.post("/api/exams", async (req, reply) => {
    const actor = await authenticate(req);
    const result = await service.generateExam(actor, GenerateExamInput.parse(req.body));
    return reply.code(result.ok ? 201 : 422).send(result);
  });

  app.get<{ Params: { id: string } }>("/api/exams/:id/key", async (req, reply) => {
    const keys = await service.getAnswerKeys(await authenticate(req), req.params.id);
    return reply.header("cache-control", "no-store").send(keys);
  });

  app.post<{ Params: { id: string } }>("/api/exams/:id/grade", async (req) => {
    const actor = await authenticate(req);
    const body = GradeBody.parse(req.body);
    return service.grade(actor, req.params.id, body.code, body.responses);
  });

  app.post<{ Params: { id: string } }>("/api/exams/:id/links", async (req) => makeLinks(await authenticate(req), req.params.id));

  app.post<{ Params: { id: string } }>("/api/exams/:id/matrix", async (req) => makeMatrixLink(await authenticate(req), req.params.id));

  app.get("/api/lessons", async (req) => lessons.list(await authenticate(req)));
  app.get("/api/lessons/:id", async (req) => lessons.get(await authenticate(req), Cid(req)));
  app.post("/api/lessons", async (req, reply) => {
    const r = await lessons.save(await authenticate(req), { plan: req.body });
    return reply.code(201).send(r);
  });
  app.put("/api/lessons/:id", async (req) => lessons.save(await authenticate(req), { id: Cid(req), plan: req.body }));
  app.delete("/api/lessons/:id", async (req, reply) => {
    await lessons.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });
  app.post("/api/lessons/:id/export", async (req) => makeLessonLink(await authenticate(req), Cid(req)));

  app.get("/api/van-ban", async (req) => vanBan.list(await authenticate(req)));
  app.get("/api/van-ban/:id", async (req) => vanBan.get(await authenticate(req), Cid(req)));
  app.post("/api/van-ban", async (req, reply) => {
    const r = await vanBan.save(await authenticate(req), { vanBan: req.body });
    return reply.code(201).send(r);
  });
  app.put("/api/van-ban/:id", async (req) => vanBan.save(await authenticate(req), { id: Cid(req), vanBan: req.body }));
  app.delete("/api/van-ban/:id", async (req, reply) => {
    await vanBan.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });
  app.post("/api/van-ban/:id/export", async (req) => makeVanBanLink(await authenticate(req), Cid(req)));

  app.get("/api/slides", async (req) => slides.list(await authenticate(req)));
  app.get("/api/slides/:id", async (req) => slides.get(await authenticate(req), Cid(req)));
  app.post("/api/slides", async (req, reply) => {
    const actor = await authenticate(req);
    const b = (req.body ?? {}) as { lessonPlanId?: unknown; deck?: unknown };
    if (typeof b.lessonPlanId === "string") return reply.code(201).send(await slides.fromLesson(actor, b.lessonPlanId));
    return reply.code(201).send(await slides.save(actor, { deck: b.deck ?? req.body }));
  });
  app.put("/api/slides/:id", async (req) => slides.save(await authenticate(req), { id: Cid(req), deck: req.body }));
  app.delete("/api/slides/:id", async (req, reply) => {
    await slides.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });
  app.post("/api/slides/:id/export", async (req) => makeSlideLink(await authenticate(req), Cid(req)));

  app.get("/api/games", async (req) => games.list(await authenticate(req)));
  app.post("/api/games", async (req, reply) => reply.code(201).send(await games.create(await authenticate(req), req.body)));
  app.delete("/api/games/:id", async (req, reply) => {
    await games.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });
  app.post("/api/games/:id/export", async (req) => makeGameLink(await authenticate(req), Cid(req)));

  const BIG = { bodyLimit: 4 * 1024 * 1024 };
  app.get("/api/boards", async (req) => boardsSvc.list(await authenticate(req)));
  app.get("/api/boards/:id", async (req) => boardsSvc.get(await authenticate(req), Cid(req)));
  app.post("/api/boards", BIG, async (req, reply) => reply.code(201).send(await boardsSvc.create(await authenticate(req), req.body)));
  app.put("/api/boards/:id", BIG, async (req) => boardsSvc.save(await authenticate(req), Cid(req), req.body));
  app.delete("/api/boards/:id", async (req, reply) => {
    await boardsSvc.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });

  const geoAi = withTaskOverrides(deps.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));
  app.post("/api/geometry/ai", async (req) => buildFigure(geoAi, await authenticate(req), req.body));

  app.get("/api/diagrams", async (req) => diagramsSvc.list(await authenticate(req)));
  app.post("/api/diagrams/ai", async (req) => diagramsSvc.draw(await authenticate(req), req.body));
  app.get("/api/diagrams/:id", async (req) => diagramsSvc.get(await authenticate(req), Cid(req)));
  app.post("/api/diagrams", BIG, async (req, reply) => reply.code(201).send(await diagramsSvc.create(await authenticate(req), req.body)));
  app.put("/api/diagrams/:id", BIG, async (req) => diagramsSvc.save(await authenticate(req), Cid(req), req.body));
  app.delete("/api/diagrams/:id", async (req, reply) => {
    await diagramsSvc.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });

  app.get<{ Params: { token: string }; Querystring: { mo?: string } }>("/dl/:token", async (req, reply) => {
    let claims: DownloadClaims;
    try {
      claims = await signer.verify(req.params.token);
    } catch {
      throw new NotFoundError("Link tải đã hết hạn hoặc không hợp lệ");
    }
    if (claims.slideId !== undefined) {
      const d = await slides.loadForExport(claims.orgId, claims.slideId);
      return reply.header("content-type", PPTX).header("cache-control", "no-store").header("content-disposition", `attachment; filename="slide-${slug(d.title, "bai-giang")}.pptx"`).send(await renderSlidesPptx(d.deck));
    }
    if (claims.gameId !== undefined) {
      const g = await games.loadForExport(claims.orgId, claims.gameId);
      const disp = req.query.mo === "1" ? "inline" : "attachment";
      return reply
        .header("content-type", "text/html; charset=utf-8")
        .header("cache-control", "no-store")
        .header("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; sandbox allow-scripts")
        .header("content-disposition", `${disp}; filename="${g.body.kind === "quiz" ? "do-vui" : "the-lat"}-${slug(g.title, "tro-choi")}.html"`)
        .send(renderGameHtml(g.title, g.body));
    }
    if (claims.vanBanId !== undefined) {
      const d = await vanBan.loadForExport(claims.orgId, claims.vanBanId);
      const slug = d.trichYeu.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40) || "van-ban";
      const file = `${d.loai.replace(/_/g, "-")}-${slug}.docx`;
      return reply.header("content-type", DOCX).header("cache-control", "no-store").header("content-disposition", `attachment; filename="${file}"`).send(await renderVanBanDocx(d.doc));
    }
    if (claims.lessonId !== undefined) {
      const l = await lessons.loadForExport(claims.orgId, claims.lessonId);
      const file = `giao-an-${l.title.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 50) || "bai"}.docx`;
      return reply.header("content-type", DOCX).header("cache-control", "no-store").header("content-disposition", `attachment; filename="${file}"`).send(await renderLessonDocx(l.plan));
    }
    if (claims.classId !== undefined) {
      const gb = await classes.loadForExport(claims.orgId, claims.classId, claims.term);
      const isList = claims.kind === "class_list";
      const file = `${isList ? "danh-sach" : "so-diem"}-${gb.class.name.replace(/[^\w-]+/g, "")}-${gb.class.schoolYear}${isList ? "" : `-${gb.term.toLowerCase()}`}.xlsx`;
      return reply.header("content-type", XLSX).header("cache-control", "no-store").header("content-disposition", `attachment; filename="${file}"`).send(isList ? await renderClassListXlsx(gb) : await renderGradebookXlsx(gb));
    }
    const exam = await service.loadExamForExport(claims.orgId, claims.examId);
    const meta = { title: exam.title, subject: exam.matrix.subject, grade: exam.matrix.grade, durationMinutes: exam.durationMinutes };
    const shortId = exam.id.slice(0, 8);
    let buffer: Buffer;
    let filename: string;
    if (claims.kind === "matrix") {
      const report = buildMatrixReport(exam.matrix, rulesForSubject(exam.matrix.subject), exam.variants[0]);
      buffer = await renderMatrixDocx(`${exam.title}`, report);
      filename = `ma-tran-${shortId}.docx`;
    } else if (claims.kind === "key") {
      buffer = await renderAnswerKeyDocx(meta, exam.variants.map((v) => ({ code: v.code, entries: answerKey(v) })));
      filename = `dap-an-${shortId}.docx`;
    } else {
      const v = exam.variants.find((x) => x.code === claims.code);
      if (!v) throw new NotFoundError("Không có mã đề này");
      buffer = await renderExamDocx(meta, v);
      filename = `de-${v.code}-${shortId}.docx`;
    }
    return reply.header("content-type", DOCX).header("cache-control", "no-store").header("content-disposition", `attachment; filename="${filename}"`).send(buffer);
  });

  const Cid = (req: FastifyRequest) => (req.params as { id: string }).id;
  const StudentsBody = z.object({ text: z.string().optional(), students: z.array(StudentItem).optional() });
  const XlsxBody = z.object({ contentBase64: z.string().min(1) });
  const ScoresBody = z.object({ term: z.enum(["HK1", "HK2"]).default("HK1"), column: z.string().min(1), scores: z.record(z.string(), z.union([z.string(), z.number(), z.null()])) });
  const AttBody = z.object({ date: z.string(), records: z.record(z.string(), z.string()).default({}), defaultStatus: z.string().optional() });
  const CommentsBody = z.object({ term: z.string(), items: z.array(z.object({ student: z.string(), text: z.string(), level: z.string() })) });

  app.get("/api/classes", async (req) => classes.listClasses(await authenticate(req)));
  app.post("/api/classes", async (req, reply) => reply.code(201).send(await classes.createClass(await authenticate(req), req.body)));
  app.get("/api/classes/:id", async (req) => classes.getClass(await authenticate(req), Cid(req)));
  app.patch("/api/classes/:id", async (req) => classes.updateClass(await authenticate(req), Cid(req), req.body));
  app.post("/api/classes/:id/students", async (req, reply) => reply.code(201).send(await classes.addStudents(await authenticate(req), Cid(req), StudentsBody.parse(req.body))));
  app.post("/api/classes/:id/students/xlsx", { bodyLimit: 4 * 1024 * 1024 }, async (req, reply) => {
    const actor = await authenticate(req);
    const body = XlsxBody.parse(req.body);
    if (body.contentBase64.length > Math.ceil((2 * 1024 * 1024) / 3) * 4 + 4) throw new ValidationError(["File Excel quá lớn (tối đa 2 MB)"]);
    const buf = Buffer.from(body.contentBase64, "base64");
    if (buf.length > 2 * 1024 * 1024) throw new ValidationError(["File Excel quá lớn (tối đa 2 MB)"]);
    return reply.code(201).send(await classes.addStudentsFromXlsx(actor, Cid(req), buf));
  });
  app.delete<{ Params: { id: string; sid: string } }>("/api/classes/:id/students/:sid", async (req, reply) => {
    await classes.removeStudent(await authenticate(req), req.params.id, req.params.sid);
    return reply.code(204).send();
  });
  app.get<{ Params: { id: string }; Querystring: { term?: string } }>("/api/classes/:id/gradebook", async (req) => classes.gradebook(await authenticate(req), req.params.id, undefined, req.query.term ?? "HK1"));
  app.get<{ Params: { id: string }; Querystring: { student?: string; term?: string } }>("/api/classes/:id/profile", async (req) => classes.gradebook(await authenticate(req), req.params.id, req.query.student, req.query.term ?? "HK1"));
  app.put("/api/classes/:id/scores", async (req) => {
    const actor = await authenticate(req);
    const b = ScoresBody.parse(req.body);
    return classes.enterScores(actor, Cid(req), b.column, b.scores, b.term);
  });
  app.get<{ Params: { id: string }; Querystring: { date: string } }>("/api/classes/:id/attendance", async (req) => classes.attendanceOn(await authenticate(req), req.params.id, req.query.date ?? ""));
  app.put("/api/classes/:id/attendance", async (req) => {
    const actor = await authenticate(req);
    const b = AttBody.parse(req.body);
    return classes.markAttendance(actor, Cid(req), b.date, b.records, b.defaultStatus);
  });
  app.put("/api/classes/:id/comments", async (req) => {
    const actor = await authenticate(req);
    const b = CommentsBody.parse(req.body);
    return classes.saveComments(actor, Cid(req), b.term, b.items);
  });
  app.post("/api/classes/:id/export", async (req) => {
    const actor = await authenticate(req);
    const { kind, term } = z.object({ kind: z.enum(["class_list", "gradebook"]), term: z.enum(["HK1", "HK2"]).optional() }).parse(req.body);
    return makeClassLink(actor, Cid(req), kind, term);
  });

  registerAiLessonRoutes(app, { db: deps.db, ai: deps.ai, cfg: deps.aiLessons ?? { dataDir: "./data" }, service, authenticate });
  registerAiSkillRoutes(app, { ai: deps.ai, lessons, classes, authenticate });
  registerInkRoutes(app, { ai: deps.ai, authenticate });
  const live = createLiveService({ db: deps.db, ai: deps.ai ?? disabledAi, classes, games, secret: deps.downloadSecret });
  app.addHook("onClose", async () => live.dispose());
  registerLiveRoutes(app, { live, authenticate });
  const tutor = createTutor(deps.db, deps.ai);
  registerTutorRoutes(app, { tutor, authenticate });
  registerSolutionRoutes(app, { db: deps.db, ai: deps.ai ?? disabledAi, publicUrl: deps.publicUrl, webUrl: process.env.WEB_URL, authenticate, tutor, student: (req) => studentAuth.verifySession(bearer(req)).catch(() => Promise.reject(new UnauthorizedError("Phiên đã hết, em đăng nhập lại nhé"))) });

  app.post("/mcp", async (req, reply) => {
    const actor = await authenticate(req);
    const server = buildMcpServer({ service, actor, assignments: assignmentsSvc, makeLinks: (examId) => makeLinks(actor, examId), classes, makeClassLink: (ref, kind, term) => makeClassLink(actor, ref, kind, term), lessons, makeLessonLink: (id) => makeLessonLink(actor, id), vanBan, makeVanBanLink: (id) => makeVanBanLink(actor, id), slides, games, makeSlideLink: (id) => makeSlideLink(actor, id), makeGameLink: (id) => makeGameLink(actor, id), makeMatrixLink: (id) => makeMatrixLink(actor, id) });
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    reply.raw.on("close", () => {
      server.close().catch((err) => console.error("mcp close", err));
    });
    await server.connect(transport);
    reply.hijack();
    try {
      await transport.handleRequest(req.raw, reply.raw, req.body);
    } catch (err) {
      console.error("mcp handleRequest", err);
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "content-type": "application/json" });
        reply.raw.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Lỗi máy chủ" }, id: null }));
      } else reply.raw.end();
    }
  });

  const methodNotAllowed = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.code(405).header("allow", "POST").send({ error: "MCP endpoint chỉ nhận POST" });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}
