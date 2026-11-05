import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError, z } from "zod";
import { resolveActor } from "../auth/actor";
import { type DownloadClaims, createDownloadSigner } from "../auth/download";
import type { Identity, VerifyToken } from "../auth/verify";
import type { Db } from "../db/client";
import { ForbiddenError } from "../domain/authz";
import { ResponseValue } from "../domain/scoring";
import { answerKey } from "../domain/variants";
import { NotFoundError, UnauthorizedError } from "../errors";
import { renderAnswerKeyDocx, renderExamDocx } from "../export/docx";
import { buildMcpServer } from "../mcp/server";
import { type Actor, type ExamLinks, GenerateExamInput, createService } from "../service";

export type AppDeps = { db: Db; verify: VerifyToken; issuer: string; publicUrl: string; downloadSecret: string };

const GradeBody = z.object({ code: z.string().min(1), responses: z.record(z.string(), ResponseValue) });
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const LINK_TTL_MINUTES = 15;

export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false, routerOptions: { maxParamLength: 2048 } });
  const service = createService(deps.db);
  const signer = createDownloadSigner(deps.downloadSecret, `${LINK_TTL_MINUTES}m`);
  const metadataUrl = `${deps.publicUrl}/.well-known/oauth-protected-resource`;

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof UnauthorizedError) {
      return reply.code(401).header("www-authenticate", `Bearer resource_metadata="${metadataUrl}"`).send({ error: err.message });
    }
    if (err instanceof ForbiddenError) return reply.code(403).send({ error: err.message });
    if (err instanceof NotFoundError) return reply.code(404).send({ error: err.message });
    if (err instanceof ZodError) return reply.code(400).send({ error: "Dữ liệu không hợp lệ", issues: err.issues });
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
    const url = async (kind: "exam" | "key", code?: string) =>
      `${deps.publicUrl}/dl/${await signer.sign({ orgId: actor.orgId, examId: exam.id, kind, code })}`;
    return {
      exams: await Promise.all(exam.variants.map(async (v) => ({ code: v.code, url: await url("exam", v.code) }))),
      answerKey: await url("key"),
      expiresInMinutes: LINK_TTL_MINUTES,
    };
  }

  app.get("/health", async () => ({ ok: true }));

  app.get("/.well-known/oauth-protected-resource", async () => ({
    resource: `${deps.publicUrl}/mcp`,
    authorization_servers: [deps.issuer],
    bearer_methods_supported: ["header"],
  }));

  app.post("/api/questions", async (req, reply) => reply.code(201).send(await service.addQuestion(await authenticate(req), req.body)));

  app.get("/api/questions", async (req) => service.searchQuestions(await authenticate(req), req.query));

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

  app.get<{ Params: { token: string } }>("/dl/:token", async (req, reply) => {
    let claims: DownloadClaims;
    try {
      claims = await signer.verify(req.params.token);
    } catch {
      throw new NotFoundError("Link tải đã hết hạn hoặc không hợp lệ");
    }
    const exam = await service.loadExamForExport(claims.orgId, claims.examId);
    const meta = { title: exam.title, subject: exam.matrix.subject, grade: exam.matrix.grade, durationMinutes: exam.durationMinutes };
    const shortId = exam.id.slice(0, 8);
    let buffer: Buffer;
    let filename: string;
    if (claims.kind === "key") {
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

  app.post("/mcp", async (req, reply) => {
    const actor = await authenticate(req);
    const server = buildMcpServer({ service, actor, makeLinks: (examId) => makeLinks(actor, examId) });
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
