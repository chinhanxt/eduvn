import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Actor } from "../../service";
import type { PhotoGradingService } from "../../services/photoGrading";

export type PhotoRouteCtx = { photo: PhotoGradingService; authenticate: (req: FastifyRequest) => Promise<Actor> };

const BIG = { bodyLimit: 40 * 1024 * 1024 };

/** /api/photo/*: lưu kết quả phiếu quét, phiên âm + chấm bài viết tay. */
export function registerPhotoGradingRoutes(app: FastifyInstance, { photo, authenticate }: PhotoRouteCtx): void {
  app.get<{ Querystring: { kind?: string } }>("/api/photo/results", async (req) => photo.list(await authenticate(req), req.query.kind));
  app.delete<{ Params: { id: string } }>("/api/photo/results/:id", async (req, reply) => {
    await photo.remove(await authenticate(req), req.params.id);
    return reply.code(204).send();
  });
  app.post<{ Params: { id: string } }>("/api/photo/results/:id/gradebook", async (req) => photo.toGradebook(await authenticate(req), req.params.id, req.body));
  app.get<{ Params: { id: string } }>("/api/photo/classes/:id/roster", async (req) => photo.roster(await authenticate(req), req.params.id));
  app.post("/api/photo/omr", async (req, reply) => reply.code(201).send(await photo.saveOmr(await authenticate(req), req.body)));
  app.get<{ Params: { id: string } }>("/api/photo/exams/:id/essays", async (req) => photo.essaysOf(await authenticate(req), req.params.id));
  app.post("/api/photo/essay/transcribe", BIG, async (req) => photo.transcribe(await authenticate(req), req.body));
  app.post("/api/photo/essay/grade", async (req) => photo.gradeEssay(await authenticate(req), req.body));
  app.post("/api/photo/essay", async (req, reply) => reply.code(201).send(await photo.saveEssay(await authenticate(req), req.body)));
}
