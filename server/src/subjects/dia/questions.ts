// server/src/subjects/dia/questions.ts
// 3 dạng câu hỏi đặc thù môn Địa lí (tương thích 100% schema QuestionInput của server/src/domain/question.ts):
// 1. Chọn dạng biểu đồ thích hợp (mcq, kiểm chứng bằng luật tất định suggestChartType)
// 2. Đọc Atlat / bản đồ (mcq / true_false, gắn địa danh trong dia-danh.json & lớp 34/63 tỉnh)
// 3. Tính toán số liệu Địa lí (short_answer, chấm tất định qua gradeDiaCalculation)
import { z } from "zod";
import { parseQuestion, type QuestionInput, type Level } from "../../domain/question";
import {
  type DiaCalcProblem,
  DiaCalcProblemSchema,
  fmtVn,
  solveDiaCalc,
  suggestChartType,
  type DiaChartIntent,
} from "./calc";
import { type DiaDataTable, DiaDataTableSchema, verifyNumbersFromSource } from "./verify";

export const DIA_QUESTION_KINDS = ["chon_bieu_do", "doc_atlat_ban_do", "tinh_toan_so_lieu"] as const;
export type DiaQuestionKind = (typeof DIA_QUESTION_KINDS)[number];

/** Xây dựng câu hỏi trắc nghiệm "Chọn dạng biểu đồ thích hợp" và tự kiểm đáp án tất định. */
export function buildChartChoiceQuestion(args: {
  grade: number;
  topic: string;
  level: Level;
  bang: DiaDataTable;
  intent: DiaChartIntent;
  yeuCauDeBai: string;
  distractors?: [string, string, string];
}): QuestionInput {
  const suggestion = suggestChartType(args.bang, args.intent);
  const allCharts = [
    "Biểu đồ tròn",
    "Biểu đồ miền",
    "Biểu đồ đường",
    "Biểu đồ cột",
    "Biểu đồ kết hợp (Cột – Đường)",
  ];
  const correctLabel =
    suggestion.dangTotNhat === "nhiet-am" || suggestion.dangTotNhat === "ket-hop"
      ? "Biểu đồ kết hợp (Cột – Đường)"
      : suggestion.dangTotNhat === "tron"
        ? "Biểu đồ tròn"
        : suggestion.dangTotNhat === "mien"
          ? "Biểu đồ miền"
          : suggestion.dangTotNhat === "duong"
            ? "Biểu đồ đường"
            : "Biểu đồ cột";

  const others = args.distractors ?? (allCharts.filter((c) => c !== correctLabel).slice(0, 3) as [string, string, string]);
  const options = [correctLabel, ...others] as [string, string, string, string];

  const tableSummary = args.bang.chuoi
    .map((s) => `- ${s.ten} (${s.donVi || "đơn vị"}): ${args.bang.nhan.map((lb, i) => `${lb}: ${fmtVn(s.giaTri[i]!, 1)}`).join("; ")}`)
    .join("\n");

  return parseQuestion({
    type: "mcq",
    subject: "Địa lí",
    grade: args.grade,
    topic: args.topic,
    level: args.level,
    stem: `Cho bảng số liệu "${args.bang.tieuDe}":\n${tableSummary}\nTheo bảng số liệu, để ${args.yeuCauDeBai}, dạng biểu đồ nào sau đây là thích hợp nhất?`,
    options,
    answer: 0,
    explanation: `${suggestion.tenDang} là thích hợp nhất vì: ${suggestion.lyDo} Lưu ý: ${suggestion.luuYVe.join(" ")}`,
    tags: ["dia", "dia:chon_bieu_do", `dia:bieu_do:${suggestion.dangTotNhat}`, "dia:da_kiem"],
  });
}

/** Xây dựng câu hỏi "Tính toán số liệu Địa lí" (short_answer) với đáp số tính tất định 100%. */
export function buildCalcQuestion(args: {
  grade: number;
  topic: string;
  level: Level;
  stem: string;
  problem: DiaCalcProblem;
}): QuestionInput {
  const parsedProblem = DiaCalcProblemSchema.parse(args.problem);
  const solved = solveDiaCalc(parsedProblem);
  const ansVn = fmtVn(solved.expected, parsedProblem.lamTron);
  // Quy ước shortAnswer.ts của EDUVN: không dùng dấu chấm hàng nghìn trong đáp án (tránh mơ hồ dạng "2.621").
  const ansKey = parsedProblem.lamTron > 0
    ? solved.expected.toFixed(parsedProblem.lamTron).replace(".", ",")
    : String(Math.round(solved.expected));

  return parseQuestion({
    type: "short_answer",
    subject: "Địa lí",
    grade: args.grade,
    topic: args.topic,
    level: args.level,
    stem: args.stem,
    answer: ansKey,
    explanation: `Công thức: ${solved.formula}\n${solved.steps.join("\n")}\nĐáp số: ${ansVn} ${solved.unit}.`,
    tags: ["dia", "dia:tinh_toan_so_lieu", `dia:phep_tinh:${parsedProblem.phepTinh}`, "dia:da_kiem"],
  });
}

/** Xây dựng câu hỏi "Đọc Atlat / bản đồ" gắn lớp bản đồ (vn34/vn63) & mã địa danh đã kiểm. */
export function buildMapReadingQuestion(args: {
  grade: number;
  topic: string;
  level: Level;
  stem: string;
  options: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  mapLayer: "vn34" | "vn63" | "atlat";
  placeIds: string[];
}): QuestionInput {
  return parseQuestion({
    type: "mcq",
    subject: "Địa lí",
    grade: args.grade,
    topic: args.topic,
    level: args.level,
    stem: args.stem,
    options: args.options,
    answer: args.answer,
    explanation: args.explanation,
    tags: ["dia", "dia:doc_atlat_ban_do", `dia:lop:${args.mapLayer}`, ...args.placeIds.map((id) => `dia:place:${id}`), "dia:da_kiem"],
  });
}

/** Bộ câu hỏi mẫu Địa lí chuẩn CTGDPT 2018 (đủ cả 3 dạng đặc thù, đã tự kiểm tất định). */
export function sampleDiaQuestions(): QuestionInput[] {
  return [
    buildChartChoiceQuestion({
      grade: 12,
      topic: "Kĩ năng biểu đồ · Chuyển dịch cơ cấu kinh tế",
      level: "TH",
      bang: {
        tieuDe: "Cơ cấu GDP phân theo khu vực kinh tế Việt Nam giai đoạn 2010–2023 (%)",
        nhan: ["2010", "2015", "2018", "2023"],
        nam: [2010, 2015, 2018, 2023],
        chuoi: [
          { ten: "Nông, lâm nghiệp và thủy sản", donVi: "%", giaTri: [15.4, 14.5, 13.9, 12.0] },
          { ten: "Công nghiệp và xây dựng", donVi: "%", giaTri: [33.0, 34.3, 35.4, 37.1] },
          { ten: "Dịch vụ và thuế sản phẩm", donVi: "%", giaTri: [51.6, 51.2, 50.7, 50.9] },
        ],
        nguon: "Tổng cục Thống kê Việt Nam",
      },
      intent: "chuyen_dich_co_cau",
      yeuCauDeBai: "thể hiện sự chuyển dịch cơ cấu GDP phân theo khu vực kinh tế của nước ta giai đoạn 2010–2023",
    }),
    buildMapReadingQuestion({
      grade: 12,
      topic: "Vị trí địa lí, lãnh thổ và hành chính Việt Nam (từ 01/07/2025)",
      level: "NB",
      stem: "Theo Nghị quyết 202/2025/QH15 (hiệu lực 01/07/2025), hai quần đảo Hoàng Sa và Trường Sa của Việt Nam lần lượt thuộc đơn vị hành chính cấp tỉnh nào sau đây?",
      options: [
        "TP. Đà Nẵng và tỉnh Khánh Hòa",
        "TP. Huế và tỉnh Khánh Hòa",
        "TP. Đà Nẵng và tỉnh Lâm Đồng",
        "Tỉnh Quảng Ngãi và tỉnh Khánh Hòa",
      ],
      answer: 0,
      explanation: "Đặc khu Hoàng Sa (Quần đảo Hoàng Sa) thuộc TP. Đà Nẵng; Đặc khu Trường Sa (Quần đảo Trường Sa) thuộc tỉnh Khánh Hòa.",
      mapLayer: "vn34",
      placeIds: ["hoang-sa", "truong-sa", "da-nang", "nha-trang"],
    }),
    buildMapReadingQuestion({
      grade: 12,
      topic: "Địa lí tự nhiên Việt Nam · Đọc Atlat Địa lí Việt Nam",
      level: "TH",
      stem: "Căn cứ vào bản đồ Địa hình Việt Nam, đèo nào sau đây nằm trên dãy Bạch Mã (vĩ tuyến 16°B), là ranh giới khí hậu quan trọng giữa miền khí hậu phía Bắc và phía Nam?",
      options: ["Đèo Ngang", "Đèo Hải Vân", "Đèo Cả", "Đèo Cù Mông"],
      answer: 1,
      explanation: "Đèo Hải Vân (cao 496 m, trên nhánh núi Bạch Mã đâm ngang ra biển giữa TP. Huế và TP. Đà Nẵng) chắn gió mùa Đông Bắc, tạo ranh giới phân hoá khí hậu Bắc – Nam.",
      mapLayer: "atlat",
      placeIds: ["deo-hai-van", "bach-ma", "hue", "da-nang"],
    }),
    buildCalcQuestion({
      grade: 12,
      topic: "Địa lí dân cư · Tính mật độ dân số",
      level: "VD",
      stem: "Theo số liệu sắp xếp đơn vị hành chính năm 2025, TP. Hà Nội có dân số 8.807.523 người và diện tích tự nhiên 3.359,84 km². Tính mật độ dân số của TP. Hà Nội (làm tròn kết quả đến hàng đơn vị của người/km²).",
      problem: {
        phepTinh: "mat_do_dan_so",
        danSo: 8807523,
        donViDanSo: "nguoi",
        dienTich: 3359.84,
        donViDienTich: "km2",
        lamTron: 0,
      },
    }),
    buildCalcQuestion({
      grade: 12,
      topic: "Kĩ năng số liệu · Tính tốc độ tăng trưởng",
      level: "VD",
      stem: "Trị giá xuất khẩu hàng hoá của Việt Nam tăng từ 162,0 tỉ USD (năm 2015) lên 355,5 tỉ USD (năm 2023). Lấy năm 2015 = 100%, tính tốc độ tăng trưởng trị giá xuất khẩu năm 2023 (làm tròn kết quả đến một chữ số thập phân của %).",
      problem: {
        phepTinh: "toc_do_tang_truong",
        giaTriNamSau: 355.5,
        giaTriNamGoc: 162.0,
        lamTron: 1,
      },
    }),
    buildCalcQuestion({
      grade: 12,
      topic: "Kĩ năng số liệu · Tính tỉ trọng",
      level: "TH",
      stem: "Năm 2023, tổng trị giá xuất nhập khẩu của Việt Nam đạt 683,0 tỉ USD, trong đó trị giá xuất khẩu đạt 355,5 tỉ USD. Tính tỉ trọng trị giá xuất khẩu trong tổng kim ngạch xuất nhập khẩu (làm tròn đến một chữ số thập phân của %).",
      problem: {
        phepTinh: "ti_trong",
        giaTriThanhPhan: 355.5,
        tongGiaTri: 683.0,
        lamTron: 1,
      },
    }),
  ];
}

// ===================== PROMPT AI SOẠN CÂU HỎI ĐỊA LÍ =====================

export const GenerateDiaQuestionReqSchema = z.object({
  kind: z.enum(DIA_QUESTION_KINDS),
  grade: z.number().int().min(6).max(12).default(12),
  topic: z.string().trim().min(2).max(160),
  level: z.enum(["NB", "TH", "VD"]).default("TH"),
  count: z.number().int().min(1).max(5).default(2),
});
export type GenerateDiaQuestionReq = z.infer<typeof GenerateDiaQuestionReqSchema>;

export function buildDiaQuestionPrompt(req: GenerateDiaQuestionReq): { system: string; user: string } {
  const kindGuide: Record<DiaQuestionKind, string> = {
    chon_bieu_do: `Dạng "chọn dạng biểu đồ thích hợp" (type: "mcq"):
- Đề bài cho một bảng số liệu ngắn có nguồn rõ ràng (tối đa 4–5 mốc năm, 2–3 đối tượng).
- Tuân thủ nghiêm ngặt quy tắc đề thi TN THPT:
  + Cơ cấu 1–3 năm → Biểu đồ tròn; Chuyển dịch cơ cấu ≥ 4 năm → Biểu đồ miền;
  + Tốc độ tăng trưởng / diễn biến nhiều năm → Biểu đồ đường;
  + 2 đại lượng khác đơn vị → Biểu đồ kết hợp (cột – đường);
  + Quy mô, so sánh sản lượng/diện tích → Biểu đồ cột.
- Bắt buộc trả kèm trường "bang" (theo schema DiaDataTable) và "intent" để máy chủ tự kiểm tất định đáp án.`,
    doc_atlat_ban_do: `Dạng "đọc Atlat / bản đồ Việt Nam" (type: "mcq" hoặc "true_false"):
- Khai thác bản đồ hành chính 34 tỉnh/thành (từ 01/07/2025, Nghị quyết 202/2025/QH15) hoặc Atlat Địa lí Việt Nam (địa hình, khí hậu, sông ngòi, kinh tế).
- Mọi địa danh (thành phố, núi, đèo, cửa khẩu, đảo) phải chính xác tuyệt đối. Khẳng định chủ quyền Quần đảo Hoàng Sa (TP. Đà Nẵng) và Quần đảo Trường Sa (tỉnh Khánh Hòa).`,
    tinh_toan_so_lieu: `Dạng "tính toán số liệu Địa lí" (type: "short_answer"):
- Chọn một trong các phép tính: tỉ trọng (%), tốc độ tăng trưởng (%, năm gốc = 100%), mật độ dân số (người/km²), biên độ nhiệt (°C), cán cân xuất nhập khẩu, năng suất (tạ/ha), tỉ lệ gia tăng tự nhiên (%).
- Ghi rõ yêu cầu làm tròn (hàng đơn vị hoặc 1 chữ số thập phân) và đơn vị trong đề bài.
- Bắt buộc trả kèm trường "problem" (object DiaCalcProblem) để máy chủ tự tính lại và ghi đè đáp số tất định.`,
  };

  return {
    system: `Bạn là chuyên gia ra đề môn Địa lí THPT theo CTGDPT 2018 và cấu trúc đề thi tốt nghiệp THPT từ năm 2025.
Quy tắc bắt buộc:
1. Số liệu phải chân thực, nhất quán, ghi nguồn (Tổng cục Thống kê / Nghị quyết 202/2025/QH15 / Atlat Địa lí Việt Nam).
2. Số thập phân tiếng Việt dùng dấu phẩy (vd 24,5), hàng nghìn dùng dấu chấm (vd 1.460).
3. Chỉ trả về đúng một JSON hợp lệ: { "questions": [ ... ] }, không thêm chữ ngoài JSON.`,
    user: `Hãy soạn ${req.count} câu hỏi Địa lí lớp ${req.grade}, chủ đề "${req.topic}", mức độ ${req.level}.
${kindGuide[req.kind]}

Cấu trúc JSON mỗi phần tử trong "questions":
- Với mcq: { "type": "mcq", "subject": "Địa lí", "grade": ${req.grade}, "topic": "${req.topic}", "level": "${req.level}", "stem": "...", "options": ["A","B","C","D"], "answer": 0, "explanation": "...", "bang": { ... } (nếu chon_bieu_do) }
- Với short_answer: { "type": "short_answer", "subject": "Địa lí", "grade": ${req.grade}, "topic": "${req.topic}", "level": "${req.level}", "stem": "...", "answer": "...", "explanation": "...", "problem": { ... } }`,
  };
}

/** Kiểm chứng tất định câu hỏi AI sinh ra (không tin số AI tự tính: máy chủ tính lại và kiểm khớp). */
export function verifyGeneratedDiaQuestion(raw: unknown): {
  ok: boolean;
  question?: QuestionInput;
  issues: string[];
} {
  const issues: string[] = [];
  if (!raw || typeof raw !== "object") return { ok: false, issues: ["Câu hỏi không phải object JSON"] };
  const obj = raw as Record<string, unknown>;

  // Nếu có `problem` (câu tính toán), tự tính lại đáp số tất định!
  if (obj.problem) {
    const p = DiaCalcProblemSchema.safeParse(obj.problem);
    if (!p.success) {
      issues.push(`Thông số phép tính không hợp lệ: ${p.error.issues[0]?.message ?? ""}`);
    } else {
      const solved = solveDiaCalc(p.data);
      const ansKey = p.data.lamTron > 0
        ? solved.expected.toFixed(p.data.lamTron).replace(".", ",")
        : String(Math.round(solved.expected));
      obj.answer = ansKey;
      obj.tags = [...(Array.isArray(obj.tags) ? obj.tags : []), "dia", "dia:tinh_toan_so_lieu", "dia:da_kiem"];
    }
  }

  // Nếu có `bang` (câu chọn dạng biểu đồ), kiểm số liệu trong lời giải có khớp bảng nguồn
  if (obj.bang) {
    const b = DiaDataTableSchema.safeParse(obj.bang);
    if (b.success && typeof obj.explanation === "string") {
      const nums = (obj.explanation.match(/\d+(?:[.,]\d+)?/g) ?? []).map((s) => Number(s.replace(",", "."))).filter(Number.isFinite);
      if (nums.length) {
        const chk = verifyNumbersFromSource(b.data, nums);
        if (chk.ok === false) issues.push(chk.label);
      }
    }
  }

  const parsed = z.safeParse(z.unknown(), obj);
  try {
    const q = parseQuestion(parsed.data);
    return { ok: issues.length === 0, question: q, issues };
  } catch (err) {
    issues.push(`Schema câu hỏi lỗi: ${(err as Error).message}`);
    return { ok: false, issues };
  }
}
