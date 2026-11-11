import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Actor } from "../service";
import type { AssignmentService } from "../services/assignments";
import type { CredentialService } from "../services/credentials";

export type ClassroomDeps = { authenticate: (req: FastifyRequest) => Promise<Actor>; credentials: CredentialService; assignments: AssignmentService };

type P = { Params: { id: string; sid: string } };
const JoinBody = z.object({ open: z.boolean() });
const LinkBody = z.object({ approve: z.boolean() });

/** Route GV cho lớp học trực tuyến: thẻ lớp, mã tham gia, bài giao. */
export function registerClassroomRoutes(app: FastifyInstance, d: ClassroomDeps): void {
  app.get<P>("/api/classes/:id/credentials", async (req) => d.credentials.status(await d.authenticate(req), req.params.id));
  app.post<P>("/api/classes/:id/credentials", async (req, reply) => reply.code(201).send(await d.credentials.issue(await d.authenticate(req), req.params.id, req.body)));
  app.put<P>("/api/classes/:id/join", async (req) => {
    const actor = await d.authenticate(req);
    return d.credentials.setJoin(actor, req.params.id, JoinBody.parse(req.body).open);
  });
  app.post<P>("/api/classes/:id/students/:sid/link", async (req) => {
    const actor = await d.authenticate(req);
    return d.credentials.resolveLink(actor, req.params.id, req.params.sid, LinkBody.parse(req.body).approve);
  });
  app.get<P>("/api/classes/:id/assignments", async (req) => d.assignments.list(await d.authenticate(req), req.params.id));
  app.post<P>("/api/classes/:id/assignments", async (req, reply) => reply.code(201).send(await d.assignments.create(await d.authenticate(req), req.params.id, req.body)));
  app.get<P>("/api/assignments/:id", async (req) => d.assignments.get(await d.authenticate(req), req.params.id));
  app.patch<P>("/api/assignments/:id", async (req) => d.assignments.update(await d.authenticate(req), req.params.id, req.body));
  app.get<P>("/api/assignments/:id/monitor", async (req) => d.assignments.monitor(await d.authenticate(req), req.params.id));
  app.get<P>("/api/assignments/:id/results", async (req) => d.assignments.results(await d.authenticate(req), req.params.id));
  app.get<P>("/api/assignments/:id/submissions/:sid", async (req) => d.assignments.submissionDetail(await d.authenticate(req), req.params.id, req.params.sid));
  app.put<P>("/api/assignments/:id/submissions/:sid/grades", async (req) => d.assignments.gradeEssays(await d.authenticate(req), req.params.id, req.params.sid, req.body));
  app.delete<P>("/api/assignments/:id", async (req, reply) => {
    await d.assignments.remove(await d.authenticate(req), req.params.id);
    return reply.code(204).send();
  });
}
