/** Tuyến HTTP cho gói môn Sinh học (/api/sinh/*).
 *  Các công cụ tính toán phòng lab (lai Mendel, phân bào, ADN, dịch mã, tự kiểm) mở cho HS và GV dùng trực tiếp;
 *  route soạn câu hỏi AI yêu cầu đăng nhập GV có quyền question:write. */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { assertCan } from "../../domain/authz";
import { Level, QuestionType } from "../../domain/question";
import type { Actor } from "../../service";
import { type Ai, disabledAi } from "../../services/ai";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";
import {
  type CellPhaseId,
  calculateGametogenesis,
  calculateMitosisRounds,
  countCellPhase,
  listDivisionTimeline,
} from "./cellDivision";
import { solveDna } from "./dnaCalc";
import { expressGeneFromTemplate, translateMrna } from "./geneticCode";
import { type CrossOptions, crossMendel, gradeProbabilityAnswer, gradeRatioAnswer, reduceFrac } from "./mendel";
import {
  SAMPLE_SINH_QUESTIONS,
  SINH_KIND_META,
  SINH_QUESTION_KINDS,
  draftAndVerifySinhQuestions,
} from "./questions";
import { SinhCheckSchema, verifySinhClaims } from "./verify";

type Ctx = {
  ai?: Ai;
  authenticate: (req: FastifyRequest) => Promise<Actor>;
};

const TraitSchema = z.object({
  dominant: z.string().trim().min(1).max(60),
  intermediate: z.string().trim().min(1).max(60).optional(),
  recessive: z.string().trim().min(1).max(60),
});

const CrossBody = z.object({
  p1: z.string().trim().min(2).max(40),
  p2: z.string().trim().min(2).max(40),
  dominance: z.union([z.enum(["complete", "incomplete"]), z.record(z.string(), z.enum(["complete", "incomplete"]))]).optional(),
  traits: z.record(z.string(), TraitSchema).optional(),
  splitPhenotypeBySex: z.boolean().optional(),
});

const DivisionBody = z.object({
  twoN: z.coerce.number().int().min(2).max(200).default(4),
  division: z.enum(["nguyen_phan", "giam_phan"]).default("nguyen_phan"),
  phase: z
    .enum([
      "gian_ki_g1", "gian_ki_s_g2", "ki_dau", "ki_giua", "ki_sau", "ki_cuoi",
      "gp_gian_ki_g2", "gp1_ki_dau", "gp1_ki_giua", "gp1_ki_sau", "gp1_ki_cuoi",
      "gp2_ki_dau", "gp2_ki_giua", "gp2_ki_sau", "gp2_ki_cuoi",
    ])
    .optional(),
  rounds: z.coerce.number().int().min(0).max(30).optional(),
  initialCells: z.coerce.number().int().min(1).max(1000).optional(),
  gameteSex: z.enum(["duc", "cai"]).optional(),
});

const DnaBody = z.object({
  sequence: z.string().trim().max(2000).optional(),
  N: z.number().positive().optional(),
  A: z.number().nonnegative().optional(),
  T: z.number().nonnegative().optional(),
  G: z.number().nonnegative().optional(),
  C: z.number().nonnegative().optional(),
  pctA: z.number().min(0).max(50).optional(),
  pctG: z.number().min(0).max(50).optional(),
  lengthAngstrom: z.number().positive().optional(),
  lengthNm: z.number().positive().optional(),
  turns: z.number().positive().optional(),
  mass: z.number().positive().optional(),
  hydrogenBonds: z.number().positive().optional(),
  replications: z.number().int().min(0).max(30).optional(),
});

const TranslateBody = z.object({
  templateDna3to5: z.string().trim().max(2000).optional(),
  mrna5to3: z.string().trim().max(2000).optional(),
  requireStartCodon: z.boolean().optional(),
  notation: z.enum(["2018", "truyen_thong"]).optional(),
});

const VerifyBody = z.object({
  checks: z.array(SinhCheckSchema).min(1).max(20),
});

const GradeRatioBody = z.object({
  answer: z.string().max(120),
  expectedParts: z.array(z.number().positive()).min(2).max(16).optional(),
  expectedProbability: z.object({ num: z.number().int().nonnegative(), den: z.number().int().positive() }).optional(),
  orderMatters: z.boolean().optional(),
});

const DraftQuestionsBody = z.object({
  kind: z.enum(SINH_QUESTION_KINDS),
  grade: z.number().int().min(6).max(16),
  topic: z.string().trim().min(1).max(200),
  level: Level,
  type: QuestionType.optional(),
  count: z.number().int().min(1).max(6).default(2),
  isUniversity: z.boolean().optional(),
});

export function registerSinhRoutes(app: FastifyInstance, ctx: Ctx): void {
  const ai = withTaskOverrides(ctx.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));

  app.post("/api/sinh/lai", async (req, reply) => {
    const b = CrossBody.parse(req.body);
    try {
      const result = crossMendel(b.p1, b.p2, b as CrossOptions);
      const verification = verifySinhClaims([{ type: "mendel", p1: b.p1, p2: b.p2, dominance: b.dominance, splitPhenotypeBySex: b.splitPhenotypeBySex }]);
      return { result, verification };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/sinh/phan-bao", async (req, reply) => {
    const b = DivisionBody.parse(req.body);
    try {
      const timeline = listDivisionTimeline(b.twoN, b.division);
      const current = b.phase ? countCellPhase(b.twoN, b.phase as CellPhaseId) : timeline[0]!;
      const mitosisRounds =
        b.rounds !== undefined ? calculateMitosisRounds(b.twoN, b.initialCells ?? 1, b.rounds) : undefined;
      const gametogenesis =
        b.gameteSex !== undefined ? calculateGametogenesis(b.twoN, b.initialCells ?? 1, b.gameteSex) : undefined;
      return { twoN: b.twoN, division: b.division, current, timeline, mitosisRounds, gametogenesis };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/sinh/adn", async (req, reply) => {
    const b = DnaBody.parse(req.body);
    try {
      const result = solveDna(b);
      const verification = verifySinhClaims([
        { type: "dna", input: b, expect: { N: result.N, hydrogenBonds: result.hydrogenBonds, lengthAngstrom: result.lengthAngstrom } },
      ]);
      return { result, verification };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/sinh/dich-ma", async (req, reply) => {
    const b = TranslateBody.parse(req.body);
    try {
      if (b.templateDna3to5) {
        const out = expressGeneFromTemplate(b.templateDna3to5, { requireStartCodon: b.requireStartCodon, notation: b.notation });
        return out;
      }
      if (b.mrna5to3) {
        const translation = translateMrna(b.mrna5to3, { requireStartCodon: b.requireStartCodon, notation: b.notation });
        return { translation };
      }
      return reply.code(400).send({ error: "Cần cung cấp templateDna3to5 hoặc mrna5to3" });
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/sinh/kiem", async (req) => {
    const b = VerifyBody.parse(req.body);
    return verifySinhClaims(b.checks);
  });

  app.post("/api/sinh/cham-ti-le", async (req, reply) => {
    const b = GradeRatioBody.parse(req.body);
    if (b.expectedParts) {
      return { correct: gradeRatioAnswer(b.answer, b.expectedParts, { orderMatters: b.orderMatters ?? false }) };
    }
    if (b.expectedProbability) {
      return { correct: gradeProbabilityAnswer(b.answer, reduceFrac(b.expectedProbability.num, b.expectedProbability.den)) };
    }
    return reply.code(400).send({ error: "Cần cung cấp expectedParts hoặc expectedProbability" });
  });

  app.get("/api/sinh/mau", async () => ({
    kinds: SINH_KIND_META,
    questions: SAMPLE_SINH_QUESTIONS,
  }));

  app.post("/api/sinh/cau-hoi/soan", async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "question:write");
    const b = DraftQuestionsBody.parse(req.body);
    return draftAndVerifySinhQuestions(ai, b);
  });
}
