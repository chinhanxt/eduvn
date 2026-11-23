// server/src/subjects/su/routes.ts — các route HTTP của gói môn Lịch sử (/api/su/*).
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Db } from "../../db/client";
import { Level } from "../../domain/question";
import type { Actor, Service } from "../../service";
import { type Ai, disabledAi } from "../../services/ai";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";
import { SU_QUESTION_TYPES } from "./questions";
import { createSuService } from "./service";
import { HistoryClaimSchema } from "./verify";
import type { WikidataClient } from "./wikidata";

export type SuRoutesCtx = {
  db: Db;
  ai?: Ai;
  bank: Service;
  authenticate: (req: FastifyRequest) => Promise<Actor>;
  wikidata?: WikidataClient;
};

const VerifyBody = z.object({
  claims: z.array(HistoryClaimSchema).min(1).max(40),
  kbId: z.uuid().optional(),
  teacherDocs: z
    .array(z.object({ doc: z.string().trim().min(1).max(160), page: z.number().int().min(1).max(9999), text: z.string().trim().min(1).max(4000) }))
    .max(20)
    .optional(),
});

const DraftBody = z.object({
  grade: z.number().int().min(4).max(12),
  topic: z.string().trim().min(1).max(160),
  suType: z.enum(SU_QUESTION_TYPES),
  level: Level,
  count: z.number().int().min(1).max(6).default(2),
  yccd: z.string().trim().max(1000).optional(),
  contextText: z.string().trim().max(3000).optional(),
  kbId: z.uuid().optional(),
  save: z.boolean().default(false),
});

export function registerSuRoutes(app: FastifyInstance, ctx: SuRoutesCtx): void {
  const ai = withTaskOverrides(ctx.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));
  const svc = createSuService({ db: ctx.db, ai, bank: ctx.bank, wikidata: ctx.wikidata });

  /** Dữ liệu công khai chuẩn SGK cho trang học sinh /hoc/su/dong-thoi-gian (không chứa dữ liệu tổ chức). */
  app.get<{ Querystring: { loai?: string; q?: string } }>("/api/su/places", async (req, reply) => {
    reply.header("cache-control", "public, max-age=300");
    return { places: svc.listPlaces({ loai: req.query.loai, q: req.query.q }) };
  });

  app.get<{ Querystring: { era?: string; grade?: string; q?: string } }>("/api/su/timeline", async (req, reply) => {
    reply.header("cache-control", "public, max-age=300");
    const grade = req.query.grade ? Number(req.query.grade) : undefined;
    return svc.getTimeline({
      era: req.query.era || undefined,
      grade: Number.isInteger(grade) ? grade : undefined,
      q: req.query.q || undefined,
    });
  });

  app.post("/api/su/verify", async (req) => {
    const actor = await ctx.authenticate(req);
    const body = VerifyBody.parse(req.body);
    return svc.verifyClaims(body.claims, { orgId: actor.orgId, kbId: body.kbId, teacherDocs: body.teacherDocs });
  });

  app.post("/api/su/questions/draft", async (req) => {
    const actor = await ctx.authenticate(req);
    const body = DraftBody.parse(req.body);
    return svc.draftQuestions(actor, body);
  });
}
