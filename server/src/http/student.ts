import type { FastifyInstance, FastifyRequest } from "fastify";
import type { StudentActor, StudentAuth } from "../auth/student";
import type { VerifyToken } from "../auth/verify";
import { UnauthorizedError } from "../errors";
import type { CredentialService } from "../services/credentials";
import type { SubmissionService } from "../services/submissions";

export type StudentRouteDeps = {
  auth: StudentAuth;
  verify: VerifyToken;
  credentials: CredentialService;
  submissions: SubmissionService;
  /** Giới hạn mỗi bài làm trên các route ghi (lưu, sự kiện, nộp). */
  rateLimit: { max: number; timeWindow: number };
};

export function bearer(req: FastifyRequest): string {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
  if (!m?.[1]) throw new UnauthorizedError("Thiếu access token");
  return m[1];
}

/** /api/student/*: chỉ nhận phiên HS (HS256 do lõi ký); riêng các route đăng nhập thì nhận mã/thẻ/token Keycloak. */
export function registerStudentRoutes(app: FastifyInstance, d: StudentRouteDeps): void {
  app.register(async (s) => {
    const student = async (req: FastifyRequest): Promise<StudentActor> => {
      const token = bearer(req);
      try {
        return await d.auth.verifySession(token);
      } catch {
        throw new UnauthorizedError("Phiên đã hết, em đăng nhập lại nhé");
      }
    };

    s.post("/api/student/session", async (req) => d.credentials.loginBadge(req.body, req.ip));
    s.post("/api/student/session/qr", async (req) => d.credentials.loginQr(req.body));
    s.post("/api/student/session/oidc", async (req, reply) => {
      let identity;
      try {
        identity = await d.verify(bearer(req));
      } catch {
        throw new UnauthorizedError("Em đăng nhập tài khoản trước rồi mới tham gia lớp");
      }
      const r = await d.credentials.loginOidc(identity, req.body);
      return reply.code("pending" in r ? 202 : 200).send(r);
    });
    s.get("/api/student/me", async (req) => d.credentials.me(await student(req)));

    type P = { Params: { id: string } };
    const SMALL = 256 * 1024;
    const limited = { rateLimit: { ...d.rateLimit, keyGenerator: (req: FastifyRequest) => `${(req.params as { id: string }).id}:${req.routeOptions.url}` } };
    s.get("/api/student/assignments", async (req) => d.submissions.listMine(await student(req)));
    s.post<P>("/api/student/assignments/:id/start", async (req) => d.submissions.start(await student(req), req.params.id));
    s.put<P>("/api/student/submissions/:id/answers", { bodyLimit: SMALL, config: limited }, async (req) => d.submissions.save(await student(req), req.params.id, req.body));
    s.post<P>("/api/student/submissions/:id/events", { config: limited }, async (req) => d.submissions.events(await student(req), req.params.id, req.body));
    s.post<P>("/api/student/submissions/:id/submit", { bodyLimit: SMALL, config: limited }, async (req) => d.submissions.submit(await student(req), req.params.id, req.body));
    s.get<P>("/api/student/submissions/:id", async (req) => d.submissions.result(await student(req), req.params.id));
  });
}
