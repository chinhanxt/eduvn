/**
 * Dạng câu hỏi đặc thù môn Hoá học (CTGDPT 2018) gắn trên schema QuestionInput sẵn có (`server/src/domain/question.ts`):
 *  1. Cân bằng phương trình (`hoa_can_bang`) — chấm tất định theo ma trận bảo toàn nguyên tử + điện tích + tối giản.
 *  2. Bài toán mol / nồng độ / hiệu suất (`hoa_mol_nong_do`) — chấm đáp số kèm dung sai + tự kiểm lại từ công thức tính.
 *  3. Nhận biết chất (`hoa_nhan_biet`) — dùng `mcq` / `true_false` / `short_answer` kèm hiện tượng chuẩn SGK.
 *  4. Viết cấu hình electron (`hoa_cau_hinh_e`) — chấm tất định bằng `matchElectronConfig` theo số hiệu Z (và điện tích ion).
 *
 * Kèm prompt AI soạn câu hỏi + bộ hậu kiểm tất định (AI không tự chấm đáp số của chính mình).
 */
import { z } from "zod";
import { Level, type QuestionInput, QuestionInput as BaseQuestionSchema } from "../../domain/question";
import { matchShortAnswer, normalizeAnswer, parseNumber } from "../../domain/shortAnswer";
import { balanceEquation, checkStudentBalance, parseEquation } from "./balancer";
import { electronConfiguration, matchElectronConfig } from "./electronConfig";
import { checkChemistrySafety } from "./molecules";

export const HOA_QUESTION_KINDS = ["can_bang", "mol_nong_do", "nhan_biet", "cau_hinh_e"] as const;
export type HoaQuestionKind = (typeof HOA_QUESTION_KINDS)[number];

/** Siêu dữ liệu tất định đi kèm câu hỏi Hoá (lưu trong tags hoặc payload mở rộng, tương thích QuestionInput). */
export const HoaQuestionMeta = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("can_bang"),
    /** Phương trình chưa cân bằng (vd "Fe + O2 -> Fe3O4"). */
    equation: z.string().trim().min(3),
  }),
  z.object({
    kind: z.literal("mol_nong_do"),
    /** Đáp số chuẩn dạng số thực. */
    expectedValue: z.number().finite(),
    /** Đơn vị hiển thị (vd "g", "mol", "M", "L", "%"). */
    unit: z.string().trim().max(24).default(""),
    /** Dung sai tương đối (mặc định 1% = 0.01). */
    relTol: z.number().min(0).max(0.1).default(0.01),
    /** Dung sai tuyệt đối tối thiểu (mặc định 0.01). */
    absTol: z.number().min(0).max(1).default(0.01),
  }),
  z.object({
    kind: z.literal("nhan_biet"),
    /** Thuốc thử chuẩn SGK và các chất cần phân biệt. */
    substances: z.array(z.string().trim().min(1)).min(2).max(6),
    reagent: z.string().trim().min(1),
  }),
  z.object({
    kind: z.literal("cau_hinh_e"),
    z: z.number().int().min(1).max(118),
    charge: z.number().int().min(-4).max(7).default(0),
    requireFull: z.boolean().default(false),
    requireShellOrder: z.boolean().default(false),
  }),
]);
export type HoaQuestionMeta = z.infer<typeof HoaQuestionMeta>;

export interface HoaGradeResult {
  correct: boolean;
  scoreRatio: number; // 0 hoặc 1 (trắc nghiệm đúng/sai theo thang CV 7991 dùng scoreItem gốc)
  feedback: string;
  expected?: string;
  details?: Record<string, unknown>;
}

/** Tách dãy hệ số từ chuỗi học sinh nhập: "2, 1, 2" / "2-1-2" / "2 1 2" / "2 : 1 : 2". */
function parseCoeffList(input: string): number[] | null {
  const s = input.trim();
  if (!/^[\d\s,;:\-/]+$/.test(s)) return null;
  const nums = s
    .split(/[\s,;:\-/]+/)
    .filter(Boolean)
    .map(Number);
  if (nums.length < 2 || nums.some((n) => !Number.isInteger(n) || n <= 0)) return null;
  return nums;
}

/** So sánh 2 vế phương trình (cho phép đảo thứ tự chất trong cùng một vế). */
function matchSideMultiset(
  expected: readonly { formula: { canonical: string } }[],
  given: readonly { formula: { canonical: string }; givenCoeff: number | null }[],
): number[] | null {
  if (expected.length !== given.length) return null;
  const remaining = given.map((g, idx) => ({ idx, canonical: g.formula.canonical, coeff: g.givenCoeff ?? 1 }));
  const aligned: number[] = [];
  for (const e of expected) {
    const pos = remaining.findIndex((x) => x.canonical === e.formula.canonical);
    if (pos < 0) return null;
    aligned.push(remaining[pos]!.coeff);
    remaining.splice(pos, 1);
  }
  return aligned;
}

/** Bóc số kèm bỏ đơn vị phổ biến tiếng Việt/Hoá học ("2,48 g", "0.5 mol/L", "80%", "1,5 M"). */
export function parseNumericWithUnit(raw: string): number | null {
  const s = raw
    .normalize("NFC")
    .trim()
    .replace(/\$/g, "")
    .replace(/≈|\\approx/g, "")
    .replace(/\s*(g\/mol|mol\/l|mol\/L|g\/ml|g\/mL|gam|gram|g|mol|mL|ml|L|lít|lit|M|%)\s*$/iu, "")
    .trim();
  const norm = normalizeAnswer(s);
  return parseNumber(norm);
}

/**
 * Chấm điểm tất định cho 4 dạng câu hỏi đặc thù môn Hoá học.
 */
export function gradeHoaQuestion(
  meta: HoaQuestionMeta,
  studentResponse: string | number | (boolean | null)[],
  baseQuestion?: QuestionInput,
): HoaGradeResult {
  if (meta.kind === "can_bang") {
    const bal = balanceEquation(meta.equation);
    if (!bal.ok) {
      return { correct: false, scoreRatio: 0, feedback: `Phương trình đề bài lỗi: ${bal.error}` };
    }
    if (typeof studentResponse !== "string" || !studentResponse.trim()) {
      return { correct: false, scoreRatio: 0, feedback: "Chưa nhập hệ số hoặc phương trình cân bằng.", expected: bal.balancedUnicode };
    }

    // Cách 1: HS nhập dãy hệ số (vd: "4, 3, 2" hoặc "2 1 2")
    const coeffList = parseCoeffList(studentResponse);
    if (coeffList) {
      if (coeffList.length !== bal.coefficients.length) {
        return {
          correct: false,
          scoreRatio: 0,
          feedback: `Phương trình có ${bal.coefficients.length} chất nhưng bài làm ghi ${coeffList.length} hệ số.`,
          expected: bal.coefficients.join(", "),
        };
      }
      const fb = checkStudentBalance(bal.parsed, coeffList);
      return {
        correct: fb.ok,
        scoreRatio: fb.ok ? 1 : 0,
        feedback: fb.message + (fb.hint ? ` Gợi ý: ${fb.hint}` : ""),
        expected: bal.balancedUnicode,
        details: { atoms: fb.atoms, charge: fb.charge, gcd: fb.gcd },
      };
    }

    // Cách 2: HS nhập cả phương trình (vd: "4Fe + 3O2 -> 2Fe2O3", có thể đảo thứ tự chất trong vế)
    try {
      const userEq = parseEquation(studentResponse);
      const alignedL = matchSideMultiset(bal.parsed.reactants, userEq.reactants);
      const alignedR = matchSideMultiset(bal.parsed.products, userEq.products);
      if (!alignedL || !alignedR) {
        return {
          correct: false,
          scoreRatio: 0,
          feedback: "Các chất tham gia hoặc sản phẩm trong bài làm không khớp với phương trình đề bài.",
          expected: bal.balancedUnicode,
        };
      }
      const fb = checkStudentBalance(bal.parsed, [...alignedL, ...alignedR]);
      return {
        correct: fb.ok,
        scoreRatio: fb.ok ? 1 : 0,
        feedback: fb.message + (fb.hint ? ` Gợi ý: ${fb.hint}` : ""),
        expected: bal.balancedUnicode,
        details: { atoms: fb.atoms, charge: fb.charge, gcd: fb.gcd },
      };
    } catch (e) {
      return {
        correct: false,
        scoreRatio: 0,
        feedback: `Không đọc được bài làm: ${(e as Error).message}`,
        expected: bal.balancedUnicode,
      };
    }
  }

  if (meta.kind === "mol_nong_do") {
    const num = typeof studentResponse === "number" ? studentResponse : typeof studentResponse === "string" ? parseNumericWithUnit(studentResponse) : null;
    const expectedText = `${String(meta.expectedValue).replace(".", ",")}${meta.unit ? ` ${meta.unit}` : ""}`;
    if (num === null || !Number.isFinite(num)) {
      return { correct: false, scoreRatio: 0, feedback: "Đáp án cần là một giá trị số hợp lệ (vd: 0,25 hoặc 2,48 g).", expected: expectedText };
    }
    const tol = Math.max(meta.absTol, Math.abs(meta.expectedValue) * meta.relTol);
    const diff = Math.abs(num - meta.expectedValue);
    const ok = diff <= tol + 1e-12;
    return {
      correct: ok,
      scoreRatio: ok ? 1 : 0,
      feedback: ok
        ? `Chính xác (đáp số ${expectedText}, sai lệch ${Math.round(diff * 1e6) / 1e6} ≤ dung sai ${Math.round(tol * 1e6) / 1e6}).`
        : `Chưa đúng: bài làm ra ${String(num).replace(".", ",")}, đáp số chuẩn là ${expectedText} (dung sai cho phép ±${Math.round(tol * 1e4) / 1e4}).`,
      expected: expectedText,
      details: { measured: num, expectedValue: meta.expectedValue, diff, tol },
    };
  }

  if (meta.kind === "cau_hinh_e") {
    if (typeof studentResponse !== "string" || !studentResponse.trim()) {
      const cfg = electronConfiguration(meta.z, meta.charge);
      return { correct: false, scoreRatio: 0, feedback: "Chưa nhập cấu hình electron.", expected: cfg.unicode };
    }
    const res = matchElectronConfig(studentResponse, meta.z, {
      charge: meta.charge,
      requireFull: meta.requireFull,
      requireShellOrder: meta.requireShellOrder,
    });
    return {
      correct: res.ok,
      scoreRatio: res.ok ? 1 : 0,
      feedback: res.ok
        ? `Chính xác! Cấu hình electron chuẩn: ${res.expectedUnicode}${res.expectedNobleUnicode !== res.expectedUnicode ? ` (viết gọn: ${res.expectedNobleUnicode})` : ""}.`
        : res.reason ?? "Cấu hình electron chưa chính xác.",
      expected: res.expectedUnicode,
    };
  }

  // nhan_biet: dựa trên baseQuestion (mcq / true_false / short_answer)
  if (!baseQuestion) {
    return { correct: false, scoreRatio: 0, feedback: "Thiếu câu hỏi gốc cho dạng nhận biết chất." };
  }
  if (baseQuestion.type === "mcq") {
    const ok = studentResponse === baseQuestion.answer;
    return {
      correct: ok,
      scoreRatio: ok ? 1 : 0,
      feedback: ok ? "Chính xác!" : `Chưa đúng. Đáp án đúng là phương án ${String.fromCharCode(65 + baseQuestion.answer)}.`,
      expected: baseQuestion.options[baseQuestion.answer],
    };
  }
  if (baseQuestion.type === "true_false") {
    if (!Array.isArray(studentResponse) || studentResponse.length !== 4) {
      return { correct: false, scoreRatio: 0, feedback: "Cần chọn Đúng/Sai cho đủ 4 ý." };
    }
    const rightCount = baseQuestion.answer.filter((v, i) => studentResponse[i] === v).length;
    const ratioByCount = [0, 0.1, 0.25, 0.5, 1] as const;
    return {
      correct: rightCount === 4,
      scoreRatio: ratioByCount[rightCount] ?? 0,
      feedback: `Đúng ${rightCount}/4 ý.`,
    };
  }
  if (baseQuestion.type === "short_answer") {
    const ok = typeof studentResponse === "string" && matchShortAnswer(studentResponse, baseQuestion.answer);
    return {
      correct: ok,
      scoreRatio: ok ? 1 : 0,
      feedback: ok ? "Chính xác!" : `Chưa khớp đáp án (${baseQuestion.answer}).`,
      expected: baseQuestion.answer,
    };
  }
  return { correct: false, scoreRatio: 0, feedback: "Câu tự luận cần giáo viên chấm theo rubric." };
}

/** Tạo một QuestionInput tương thích hoàn toàn với ngân hàng câu hỏi EDUVN (server/src/domain/question.ts) cho 4 dạng câu Hoá. */
export function buildBankQuestion(input: {
  grade: number;
  topic: string;
  level: z.infer<typeof Level>;
  stem: string;
  explanation?: string;
  meta: HoaQuestionMeta;
  type?: QuestionInput["type"];
  options?: string[];
  answer?: number | string | boolean[];
  statements?: string[];
}): QuestionInput {
  const safety = checkChemistrySafety([input.stem, input.explanation ?? "", ...(input.options ?? []), ...(input.statements ?? [])].join("\n"));
  if (!safety.safe) {
    throw new Error(`Nội dung câu hỏi không đạt an toàn SGK: ${safety.violations.join("; ")}`);
  }

  const tags = [`hoa:${input.meta.kind}`];
  if (input.meta.kind === "can_bang") {
    const bal = balanceEquation(input.meta.equation);
    if (!bal.ok) throw new Error(`Phương trình không cân bằng được: ${bal.error}`);
    return BaseQuestionSchema.parse({
      subject: "Hoá học",
      grade: input.grade,
      topic: input.topic,
      level: input.level,
      type: "short_answer",
      stem: input.stem,
      answer: `${bal.coefficients.join(", ")}|${bal.balancedAscii}`,
      explanation: input.explanation ?? `Phương trình cân bằng tối giản: ${bal.balancedUnicode}`,
      tags: [...tags, `hoa:eq:${bal.balancedAscii}`],
    });
  }
  if (input.meta.kind === "mol_nong_do") {
    const ansVn = String(input.meta.expectedValue).replace(".", ",");
    return BaseQuestionSchema.parse({
      subject: "Hoá học",
      grade: input.grade,
      topic: input.topic,
      level: input.level,
      type: "short_answer",
      stem: input.stem,
      answer: ansVn,
      explanation: input.explanation,
      tags: [...tags, `hoa:tol:${input.meta.relTol}`, ...(input.meta.unit ? [`hoa:unit:${input.meta.unit}`] : [])],
    });
  }
  if (input.meta.kind === "cau_hinh_e") {
    const cfg = electronConfiguration(input.meta.z, input.meta.charge);
    const accepted = cfg.nobleGasAscii !== cfg.ascii ? `${cfg.ascii}|${cfg.nobleGasAscii}` : cfg.ascii;
    return BaseQuestionSchema.parse({
      subject: "Hoá học",
      grade: input.grade,
      topic: input.topic,
      level: input.level,
      type: "short_answer",
      stem: input.stem,
      answer: accepted,
      explanation: input.explanation ?? `Cấu hình electron (Z = ${input.meta.z}): ${cfg.unicode} (${cfg.nobleGasUnicode}).`,
      tags: [...tags, `hoa:z:${input.meta.z}`],
    });
  }

  // nhan_biet
  const qType = input.type ?? "mcq";
  if (qType === "mcq") {
    return BaseQuestionSchema.parse({
      subject: "Hoá học",
      grade: input.grade,
      topic: input.topic,
      level: input.level,
      type: "mcq",
      stem: input.stem,
      options: input.options,
      answer: input.answer,
      explanation: input.explanation,
      tags,
    });
  }
  if (qType === "true_false") {
    return BaseQuestionSchema.parse({
      subject: "Hoá học",
      grade: input.grade,
      topic: input.topic,
      level: input.level,
      type: "true_false",
      stem: input.stem,
      statements: input.statements,
      answer: input.answer,
      explanation: input.explanation,
      tags,
    });
  }
  return BaseQuestionSchema.parse({
    subject: "Hoá học",
    grade: input.grade,
    topic: input.topic,
    level: input.level,
    type: "short_answer",
    stem: input.stem,
    answer: String(input.answer ?? input.meta.reagent),
    explanation: input.explanation,
    tags,
  });
}

/** Prompt hệ thống chuẩn CTGDPT 2018 cho AI soạn 4 dạng câu hỏi Hoá học (kèm kiểm định tất định phía server). */
export const HOA_QUESTION_SYSTEM_PROMPT = `Bạn là giáo viên Hoá học giỏi, am hiểu sâu Chương trình GDPT 2018 (SGK Hoá học 8–12: Kết nối tri thức, Chân trời sáng tạo, Cánh diều).

QUY TẮC BẮT BUỘC:
1. Danh pháp IUPAC tiếng Việt theo CTGDPT 2018: Hydrogen, Oxygen, Nitrogen, Carbon, Sodium, Potassium, Iron, Copper, Aluminium, Sulfur, Chlorine, Acid, Base, Oxide, Salt, Ethanol, Ethanoic acid...
2. Điều kiện khí chuẩn CTGDPT 2018: đkc (25 °C, 1 bar) có V_m = 24,79 L/mol. Nguyên tử khối làm tròn theo SGK (H=1, C=12, N=14, O=16, Na=23, Mg=24, Al=27, S=32, Cl=35,5, K=39, Ca=40, Fe=56, Cu=64, Zn=65, Ag=108, Ba=137).
3. MỌI phương trình hoá học xuất hiện trong đề bài hoặc lời giải PHẢI cân bằng chính xác, hệ số nguyên dương tối giản.
4. AN TOÀN TUYỆT ĐỐI: Chỉ dùng hoá chất và thí nghiệm ở mức SGK phổ thông. KHÔNG đề cập quy trình điều chế chất nổ, chất độc cấm hay phản ứng gây nguy hiểm.
5. Trả về đúng JSON hợp lệ, không bọc markdown, theo cấu trúc:
{
  "questions": [
    {
      "kind": "can_bang" | "mol_nong_do" | "nhan_biet" | "cau_hinh_e",
      "level": "NB" | "TH" | "VD",
      "stem": "Đề bài tiếng Việt có dấu",
      "explanation": "Lời giải ngắn gọn, rõ ràng",
      "meta": { ... },
      "type": "mcq" | "true_false" | "short_answer",
      "options": ["...", "...", "...", "..."],
      "answer": 0
    }
  ]
}
Trong đó "meta" phụ thuộc vào "kind":
- can_bang: { "kind": "can_bang", "equation": "Fe + O2 -> Fe3O4" } (chỉ ghi công thức chưa cân bằng, hệ thống sẽ tự cân bằng tất định).
- mol_nong_do: { "kind": "mol_nong_do", "expectedValue": 0.25, "unit": "mol", "relTol": 0.01, "absTol": 0.01 } và nên kèm trường "calcCheck": { "formula": "...", "massG": ..., "equation": ... } để máy chủ kiểm lại đáp số.
- nhan_biet: { "kind": "nhan_biet", "substances": ["HCl", "NaOH", "NaCl"], "reagent": "Quỳ tím" } kèm "type": "mcq", "options" (4 phương án khác nhau), "answer" (0..3).
- cau_hinh_e: { "kind": "cau_hinh_e", "z": 26, "charge": 0, "requireFull": false }.`;

export function buildHoaQuestionUserPrompt(req: {
  grade: number;
  topic: string;
  kind: HoaQuestionKind | "mix";
  level: z.infer<typeof Level>;
  count: number;
}): string {
  const kindLabel: Record<HoaQuestionKind | "mix", string> = {
    can_bang: "cân bằng phương trình hoá học (can_bang)",
    mol_nong_do: "bài toán tính số mol / nồng độ / hiệu suất (mol_nong_do)",
    nhan_biet: "nhận biết chất bằng thuốc thử chuẩn SGK (nhan_biet)",
    cau_hinh_e: "viết cấu hình electron theo Z (cau_hinh_e)",
    mix: "kết hợp đủ 4 dạng (can_bang, mol_nong_do, nhan_biet, cau_hinh_e)",
  };
  return `Soạn ${req.count} câu hỏi Hoá học lớp ${req.grade}, chủ đề "${req.topic}", mức độ ${req.level}, dạng ${kindLabel[req.kind]}. Đảm bảo số liệu đẹp, đúng CTGDPT 2018 và an toàn SGK.`;
}
