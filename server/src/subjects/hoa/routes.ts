/**
 * Route HTTP cho gói môn Hoá học (`/api/hoa/*`):
 *  - Các công cụ tính toán & phòng thí nghiệm tất định (bảng tuần hoàn, cấu hình electron, cân bằng phương trình, kiểm tra hệ số HS, phân tử SGK, tính mol/nồng độ/hiệu suất, tự kiểm nội dung).
 *  - Route AI soạn câu hỏi Hoá học kèm hậu kiểm tất định (bắt buộc xác thực + quyền `question:write`).
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { assertCan } from "../../domain/authz";
import { Level, QuestionInput } from "../../domain/question";
import type { Actor } from "../../service";
import { type Ai, disabledAi, parseAiJson } from "../../services/ai";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";
import { balanceEquation, checkStudentBalance } from "./balancer";
import { electronConfiguration } from "./electronConfig";
import { formatFormulaHtml, formatFormulaUnicode, parseFormula } from "./formula";
import { CATEGORY_LABELS, ELEMENTS, PERIODIC_TABLE_SOURCE, elementDetail, searchElements } from "./periodicTable";
import { SAFE_MOLECULES, checkChemistrySafety, moleculeById } from "./molecules";
import {
  HOA_QUESTION_KINDS,
  HOA_QUESTION_SYSTEM_PROMPT,
  HoaQuestionMeta,
  buildBankQuestion,
  buildHoaQuestionUserPrompt,
  gradeHoaQuestion,
} from "./questions";
import {
  actualFromYield,
  gasVolumeFromMoles,
  massFromMoles,
  massPercent,
  molarMass,
  molarity,
  molarityFromPercent,
  molesFromGasVolume,
  molesFromMass,
  reactionYield,
  solveReactionStoichiometry,
  titrationCurve,
} from "./stoichiometry";
import { HoaCheckSchema, verifyChemistryContent } from "./verify";

export type HoaRouteCtx = {
  ai?: Ai;
  authenticate: (req: FastifyRequest) => Promise<Actor>;
};

const BalanceReq = z.object({ equation: z.string().trim().min(3).max(400) });
const CheckBalanceReq = z.object({
  equation: z.string().trim().min(3).max(400),
  coefficients: z.array(z.number().int().min(1).max(200)).min(2).max(12),
});
const FormulaReq = z.object({ formula: z.string().trim().min(1).max(120) });

const StoichReq = z.discriminatedUnion("op", [
  z.object({ op: z.literal("molar_mass"), formula: z.string().min(1), mode: z.enum(["sgk", "iupac"]).default("sgk") }),
  z.object({ op: z.literal("moles_from_mass"), massG: z.number().min(0), formula: z.string().min(1), mode: z.enum(["sgk", "iupac"]).default("sgk") }),
  z.object({ op: z.literal("mass_from_moles"), moles: z.number().min(0), formula: z.string().min(1), mode: z.enum(["sgk", "iupac"]).default("sgk") }),
  z.object({ op: z.literal("moles_from_gas"), volumeL: z.number().min(0), gasCondition: z.enum(["dkc", "dktc"]).default("dkc") }),
  z.object({ op: z.literal("gas_from_moles"), moles: z.number().min(0), gasCondition: z.enum(["dkc", "dktc"]).default("dkc") }),
  z.object({ op: z.literal("molarity"), moles: z.number().min(0), volumeL: z.number().positive() }),
  z.object({ op: z.literal("mass_percent"), soluteMassG: z.number().min(0), solutionMassG: z.number().positive() }),
  z.object({ op: z.literal("molarity_from_percent"), cPercent: z.number().min(0).max(100), densityGPerMl: z.number().positive(), formula: z.string().min(1) }),
  z.object({ op: z.literal("yield"), actual: z.number().min(0), theoretical: z.number().positive() }),
  z.object({ op: z.literal("actual_from_yield"), theoretical: z.number().min(0), yieldPercent: z.number().min(0).max(100) }),
  z.object({
    op: z.literal("reaction"),
    equation: z.string().min(3),
    given: z.array(z.object({ formula: z.string().min(1), moles: z.number().optional(), massG: z.number().optional(), gasVolumeL: z.number().optional(), gasCondition: z.enum(["dkc", "dktc"]).optional() })).min(1),
    yieldPercent: z.number().min(0.1).max(100).default(100),
    mode: z.enum(["sgk", "iupac"]).default("sgk"),
  }),
  z.object({ op: z.literal("titration"), ca: z.number().positive(), vaMl: z.number().positive(), cb: z.number().positive(), vMaxMl: z.number().positive().optional(), ka: z.number().positive().optional() }),
]);

const VerifyReq = z.object({
  text: z.string().max(20000).optional(),
  equations: z.array(z.string().max(400)).max(50).optional(),
  checks: z.array(HoaCheckSchema).max(40).optional(),
});

const GradeReq = z.object({
  meta: HoaQuestionMeta,
  response: z.union([z.string(), z.number(), z.array(z.boolean().nullable())]),
  question: QuestionInput.optional(),
});

const DraftReq = z.object({
  grade: z.number().int().min(8).max(12),
  topic: z.string().trim().min(1).max(200),
  kind: z.union([z.enum(HOA_QUESTION_KINDS), z.literal("mix")]).default("mix"),
  level: Level.default("TH"),
  count: z.number().int().min(1).max(8).default(3),
});

export function registerHoaRoutes(app: FastifyInstance, ctx: HoaRouteCtx): void {
  const ai = withTaskOverrides(ctx.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));

  app.get<{ Querystring: { q?: string } }>("/api/hoa/bang-tuan-hoan", async (req, reply) => {
    reply.header("cache-control", "public, max-age=3600");
    const items = req.query.q ? searchElements(req.query.q) : ELEMENTS;
    return { source: PERIODIC_TABLE_SOURCE, categories: CATEGORY_LABELS, count: items.length, elements: items };
  });

  app.get<{ Params: { id: string } }>("/api/hoa/bang-tuan-hoan/:id", async (req, reply) => {
    const raw = req.params.id.trim();
    const zNum = /^\d+$/.test(raw) ? Number(raw) : raw;
    const detail = elementDetail(zNum);
    if (!detail) return reply.code(404).send({ error: `Không tìm thấy nguyên tố "${raw}"` });
    return detail;
  });

  app.get<{ Querystring: { z: string; charge?: string } }>("/api/hoa/cau-hinh-electron", async (req, reply) => {
    const zVal = Number(req.query.z);
    const charge = req.query.charge !== undefined ? Number(req.query.charge) : 0;
    try {
      return electronConfiguration(zVal, charge);
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/hoa/phan-tich-cong-thuc", async (req, reply) => {
    const { formula } = FormulaReq.parse(req.body);
    try {
      const parsed = parseFormula(formula);
      return { ...parsed, unicode: formatFormulaUnicode(parsed), html: formatFormulaHtml(parsed) };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/hoa/can-bang", async (req) => {
    const { equation } = BalanceReq.parse(req.body);
    return balanceEquation(equation);
  });

  app.post("/api/hoa/kiem-tra-can-bang", async (req, reply) => {
    const body = CheckBalanceReq.parse(req.body);
    try {
      return checkStudentBalance(body.equation, body.coefficients);
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.post("/api/hoa/tinh-toan", async (req, reply) => {
    const body = StoichReq.parse(req.body);
    try {
      switch (body.op) {
        case "molar_mass":
          return { value: molarMass(body.formula, body.mode), unit: "g/mol" };
        case "moles_from_mass":
          return { value: molesFromMass(body.massG, body.formula, body.mode), unit: "mol" };
        case "mass_from_moles":
          return { value: massFromMoles(body.moles, body.formula, body.mode), unit: "g" };
        case "moles_from_gas":
          return { value: molesFromGasVolume(body.volumeL, body.gasCondition), unit: "mol" };
        case "gas_from_moles":
          return { value: gasVolumeFromMoles(body.moles, body.gasCondition), unit: "L" };
        case "molarity":
          return { value: molarity(body.moles, body.volumeL), unit: "M" };
        case "mass_percent":
          return { value: massPercent(body.soluteMassG, body.solutionMassG), unit: "%" };
        case "molarity_from_percent":
          return { value: molarityFromPercent(body.cPercent, body.densityGPerMl, body.formula), unit: "M" };
        case "yield":
          return { value: reactionYield(body.actual, body.theoretical), unit: "%" };
        case "actual_from_yield":
          return { value: actualFromYield(body.theoretical, body.yieldPercent) };
        case "reaction":
          return solveReactionStoichiometry({ equation: body.equation, given: body.given, yieldPercent: body.yieldPercent, mode: body.mode });
        case "titration":
          return titrationCurve({ ca: body.ca, vaMl: body.vaMl, cb: body.cb, vMaxMl: body.vMaxMl, ka: body.ka });
      }
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.get<{ Querystring: { id?: string; category?: string } }>("/api/hoa/phan-tu", async (req, reply) => {
    reply.header("cache-control", "public, max-age=3600");
    if (req.query.id) {
      const m = moleculeById(req.query.id);
      if (!m) return reply.code(404).send({ error: `Không tìm thấy phân tử "${req.query.id}"` });
      return m;
    }
    const items = req.query.category ? SAFE_MOLECULES.filter((m) => m.category === req.query.category) : SAFE_MOLECULES;
    return { count: items.length, molecules: items };
  });

  app.post("/api/hoa/kiem-tra-noi-dung", async (req) => {
    const body = VerifyReq.parse(req.body);
    return verifyChemistryContent(body);
  });

  app.post("/api/hoa/cham-cau-hoi", async (req) => {
    const body = GradeReq.parse(req.body);
    return gradeHoaQuestion(body.meta, body.response, body.question);
  });

  app.post("/api/hoa/soan-cau-hoi", async (req) => {
    const actor = await ctx.authenticate(req);
    assertCan(actor.role, "question:write");
    const r = DraftReq.parse(req.body);
    const safetyPrompt = checkChemistrySafety(r.topic);
    if (!safetyPrompt.safe) {
      return { questions: [], rejected: [{ index: 0, issues: safetyPrompt.violations }] };
    }
    const rawText = await ai.chat(
      "hoa_soan_cau_hoi",
      [
        { role: "system", content: HOA_QUESTION_SYSTEM_PROMPT },
        { role: "user", content: buildHoaQuestionUserPrompt(r) },
      ],
      { json: true },
    );
    const parsed = parseAiJson(rawText) as { questions?: unknown[] };
    const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const questions: { question: QuestionInput; meta: HoaQuestionMeta; verification: ReturnType<typeof verifyChemistryContent> }[] = [];
    const rejected: { index: number; issues: string[] }[] = [];

    list.forEach((item, i) => {
      try {
        const obj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
        const meta = HoaQuestionMeta.parse(obj.meta);
        const q = buildBankQuestion({
          grade: r.grade,
          topic: r.topic,
          level: Level.parse(obj.level ?? r.level),
          stem: String(obj.stem ?? ""),
          explanation: typeof obj.explanation === "string" ? obj.explanation : undefined,
          meta,
          type: typeof obj.type === "string" ? (obj.type as QuestionInput["type"]) : undefined,
          options: Array.isArray(obj.options) ? obj.options.map(String) : undefined,
          answer: obj.answer as number | string | boolean[] | undefined,
          statements: Array.isArray(obj.statements) ? obj.statements.map(String) : undefined,
        });
        const verification = verifyChemistryContent({
          text: `${q.stem}\n${q.explanation ?? ""}`,
          checks:
            meta.kind === "cau_hinh_e"
              ? [{ type: "electron_config", z: meta.z, charge: meta.charge, stated: electronConfiguration(meta.z, meta.charge).ascii, requireFull: false }]
              : [],
        });
        if (verification.status === "mismatch") {
          rejected.push({ index: i + 1, issues: verification.details.filter((d) => d.ok === false).map((d) => d.label) });
        } else {
          questions.push({ question: q, meta, verification });
        }
      } catch (e) {
        rejected.push({ index: i + 1, issues: [(e as Error).message] });
      }
    });

    return { questions, rejected };
  });
}
