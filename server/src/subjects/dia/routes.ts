// server/src/subjects/dia/routes.ts
// REST API cho gói môn Địa lí: bản đồ TopoJSON, công cụ vẽ biểu đồ + nhận xét gợi ý, tự kiểm tất định, chấm tính toán, soạn câu hỏi.
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { type Ai, disabledAi, parseAiJson } from "../../services/ai";
import { parseOverrides, withTaskOverrides } from "../../tutor/tasks";
import {
  buildDeterministicCommentary,
  DiaCalcProblemSchema,
  gradeDiaCalculation,
  suggestChartType,
} from "./calc";
import { DIA_PRESET_TABLES, GEO_LAYERS, type GeoLayerKey, loadGeoLayer } from "./geoData";
import {
  buildDiaQuestionPrompt,
  GenerateDiaQuestionReqSchema,
  sampleDiaQuestions,
  verifyGeneratedDiaQuestion,
} from "./questions";
import {
  DiaChartCheckInputSchema,
  DiaDataTableSchema,
  extractNumbersFromText,
  verifyDiaChart,
  verifyGeoSovereignty,
  verifyNumbersFromSource,
} from "./verify";

export type DiaRouteDeps = {
  ai?: Ai;
};

export function registerDiaRoutes(app: FastifyInstance, deps: DiaRouteDeps = {}) {
  const ai = withTaskOverrides(deps.ai ?? disabledAi, parseOverrides(process.env.AI_TASK_OVERRIDES));

  // 1. Dữ liệu bản đồ TopoJSON & bộ địa danh (cache dài hạn, công khai cho cổng /hoc và /gv)
  app.get("/api/dia/geo/:layer", async (req, reply) => {
    const { layer } = z.object({ layer: z.enum(Object.keys(GEO_LAYERS) as [GeoLayerKey, ...GeoLayerKey[]]) }).parse(req.params);
    const data = loadGeoLayer(layer);
    reply.header("cache-control", "public, max-age=3600");
    return data;
  });

  // 2. Bảng số liệu mẫu & câu hỏi mẫu môn Địa lí
  app.get("/api/dia/presets", async () => ({
    tables: DIA_PRESET_TABLES,
    sampleQuestions: sampleDiaQuestions(),
  }));

  // 3. Gợi ý dạng biểu đồ + nhận xét gợi ý tất định (+ tuỳ chọn gọi AI gateway kiểm đối chiếu nguồn số liệu)
  app.post("/api/dia/suggest-chart", async (req) => {
    const body = z
      .object({
        bang: DiaDataTableSchema,
        intent: z.enum(["auto", "co_cau", "chuyen_dich_co_cau", "toc_do_tang_truong", "quy_mo_so_sanh", "hai_dai_luong", "nhiet_am"]).default("auto"),
        useAi: z.boolean().default(false),
      })
      .parse(req.body);

    const suggestion = suggestChartType(body.bang, body.intent);
    const deterministicNotes = buildDeterministicCommentary(body.bang);
    const verification = verifyDiaChart({
      loaiBieuDo: suggestion.dangTotNhat,
      bang: body.bang,
      vanBanHienThi: deterministicNotes.join(" "),
    });

    let aiNotes: string | null = null;
    let aiVerified: boolean | null = null;
    let aiNoteIssue: string | null = null;

    if (body.useAi) {
      try {
        const tableJson = JSON.stringify(body.bang);
        const text = await ai.chat("dia_nhan_xet_bieu_do", [
          {
            role: "system",
            content:
              "Bạn là giáo viên Địa lí THPT. Từ bảng số liệu JSON, viết 3–4 gạch đầu dòng nhận xét ngắn gọn, học thuật tiếng Việt có dấu (xu hướng chung, dẫn chứng số liệu tăng/giảm, cực trị hoặc chuyển dịch cơ cấu). TUYỆT ĐỐI không bịa số liệu ngoài bảng hoặc không tính ra được từ bảng.",
          },
          { role: "user", content: `Dạng biểu đồ: ${suggestion.tenDang}.\nBảng số liệu:\n${tableJson}` },
        ]);
        const nums = extractNumbersFromText(text);
        const chk = verifyNumbersFromSource(body.bang, nums);
        aiNotes = text.trim();
        aiVerified = chk.ok === true;
        if (chk.ok === false) aiNoteIssue = chk.label;
      } catch {
        aiNotes = null;
      }
    }

    return {
      suggestion,
      notes: deterministicNotes,
      verification,
      ai: aiNotes ? { text: aiNotes, verified: aiVerified, issue: aiNoteIssue } : null,
    };
  });

  // 4. Tự kiểm tất định biểu đồ / số liệu / chủ quyền bản đồ (huy hiệu "Đã kiểm" P13)
  app.post("/api/dia/verify", async (req) => {
    const body = z
      .object({
        chart: DiaChartCheckInputSchema.optional(),
        checkSovereigntyLayer: z.enum(["vn34", "vn63", "ne_vnm_admin0"]).optional(),
      })
      .parse(req.body);

    if (body.checkSovereigntyLayer) {
      const topo = loadGeoLayer(body.checkSovereigntyLayer);
      const d = verifyGeoSovereignty(topo);
      return { status: d.ok ? "verified" : "mismatch", details: [d] };
    }
    if (!body.chart) {
      return { status: "unchecked", details: [] };
    }
    return verifyDiaChart(body.chart);
  });

  // 5. Chấm tất định bài toán tính toán số liệu Địa lí
  app.post("/api/dia/grade-calc", async (req) => {
    const body = z
      .object({
        problem: DiaCalcProblemSchema,
        response: z.string(),
      })
      .parse(req.body);
    return gradeDiaCalculation(body.problem, body.response);
  });

  // 6. Soạn câu hỏi Địa lí qua AI gateway kèm tự kiểm tất định
  app.post("/api/dia/questions/generate", async (req) => {
    const input = GenerateDiaQuestionReqSchema.parse(req.body);
    const prompt = buildDiaQuestionPrompt(input);
    const rawText = await ai.chat(
      "dia_soan_cau_hoi",
      [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      { json: true },
    );
    const parsed = parseAiJson(rawText) as { questions?: unknown[] };
    const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const results = list.map((item) => verifyGeneratedDiaQuestion(item));
    return {
      accepted: results.filter((r) => r.ok && r.question).map((r) => r.question),
      rejected: results.filter((r) => !r.ok).map((r) => ({ issues: r.issues })),
    };
  });
}
