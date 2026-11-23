/**
 * Dạng câu hỏi đặc thù môn Ngữ văn (CTGDPT 2018) + bộ chuyển tương thích với `server/src/domain/question.ts`.
 * Gồm:
 *  1. Đọc hiểu theo đoạn trích (4 mức: NB → TH → VD → VDC).
 *  2. Nhận diện biện pháp tu từ.
 *  3. Sắp xếp dàn ý nghị luận (Luận đề → Luận điểm → Luận cứ → Kết luận).
 *  4. Tự luận / Nghị luận chấm theo rubric (dùng lại `normalizeEssay` & rubric P7/P8, bước 0,25 đ).
 * Thuần, không I/O.
 */
import { z } from "zod";
import { type EssayResult, normalizeEssay } from "../../domain/essay";
import { type Level, type QuestionInput, parseQuestion } from "../../domain/question";
import { round2 } from "../../domain/scoring";

export const VAN_LEVELS = ["NB", "TH", "VD", "VDC"] as const;
export type VanLevel = (typeof VAN_LEVELS)[number];

export const VAN_LEVEL_LABEL: Record<VanLevel, string> = {
  NB: "Nhận biết",
  TH: "Thông hiểu",
  VD: "Vận dụng",
  VDC: "Vận dụng cao",
};

export const RHETORICAL_DEVICES = [
  "so_sanh",
  "an_du",
  "hoan_du",
  "nhan_hoa",
  "diep_ngu",
  "dao_ngu",
  "phep_doi",
  "tuong_phan",
  "noi_qua",
  "noi_giam_noi_tranh",
  "liet_ke",
  "cau_hoi_tu_tu",
] as const;
export type RhetoricalDevice = (typeof RHETORICAL_DEVICES)[number];

export const RHETORICAL_DEVICE_LABEL: Record<RhetoricalDevice, string> = {
  so_sanh: "So sánh",
  an_du: "Ẩn dụ",
  hoan_du: "Hoán dụ",
  nhan_hoa: "Nhân hoá",
  diep_ngu: "Điệp ngữ / Điệp cấu trúc",
  dao_ngu: "Đảo ngữ",
  phep_doi: "Phép đối",
  tuong_phan: "Tương phản",
  noi_qua: "Nói quá",
  noi_giam_noi_tranh: "Nói giảm nói tránh",
  liet_ke: "Liệt kê",
  cau_hoi_tu_tu: "Câu hỏi tu từ",
};

const Str = (max: number) => z.string().trim().normalize("NFC").min(1).max(max);

export const PassageMetaSchema = z.object({
  title: Str(200),
  author: Str(120),
  source: Str(240),
  genre: z.enum(["tho", "truyen", "nghi_luan", "ky", "kich"]).default("tho"),
  copyrightStatus: z.enum(["public_domain", "short_excerpt"]).default("short_excerpt"),
  excerpt: Str(4000),
});
export type PassageMeta = z.infer<typeof PassageMetaSchema>;

/** Tiêu chí rubric (tương thích P8 `skills/rubric-tu-luan`, bước điểm 0,25). */
export const RubricCriterionSchema = z.object({
  name: Str(200),
  maxPoints: z.number().positive().max(100),
  levels: z
    .array(
      z.object({
        label: Str(60),
        points: z.number().min(0).max(100),
        descriptor: Str(500),
      }),
    )
    .min(2)
    .max(5),
});

export const LiteratureRubricSchema = z.object({
  totalPoints: z.number().positive().max(100),
  criteria: z.array(RubricCriterionSchema).min(2).max(8),
  notes: z.string().trim().max(1000).default(""),
});
export type LiteratureRubric = z.infer<typeof LiteratureRubricSchema>;

/** 1. Câu đọc hiểu theo đoạn trích (4 mức NB/TH/VD/VDC). */
export const DocHieuItemSchema = z.discriminatedUnion("format", [
  z.object({
    format: z.literal("mcq"),
    level: z.enum(VAN_LEVELS),
    stem: Str(1000),
    options: z.array(Str(400)).length(4),
    answer: z.number().int().min(0).max(3),
    explanation: Str(1500),
  }),
  z.object({
    format: z.literal("short_answer"),
    level: z.enum(VAN_LEVELS),
    stem: Str(1000),
    answer: Str(400),
    acceptedKeywords: z.array(Str(120)).min(1).max(12).optional(),
    explanation: Str(1500),
  }),
  z.object({
    format: z.literal("essay"),
    level: z.enum(VAN_LEVELS),
    stem: Str(1200),
    points: z.number().positive().max(10),
    rubric: LiteratureRubricSchema,
    reference: z.string().trim().max(2000).default(""),
  }),
]);
export type DocHieuItem = z.infer<typeof DocHieuItemSchema>;

export const DocHieuSetSchema = z.object({
  grade: z.number().int().min(6).max(12),
  topic: Str(200),
  passage: PassageMetaSchema,
  items: z.array(DocHieuItemSchema).min(4).max(8),
});
export type DocHieuSet = z.infer<typeof DocHieuSetSchema>;

/** 2. Dạng câu nhận diện biện pháp tu từ. */
export const RhetoricalQuestionSchema = z.object({
  grade: z.number().int().min(6).max(12),
  topic: Str(200),
  level: z.enum(VAN_LEVELS).default("TH"),
  excerpt: Str(1500),
  targetPhrase: Str(300),
  author: Str(120),
  source: Str(240),
  device: z.enum(RHETORICAL_DEVICES),
  distractors: z.array(z.enum(RHETORICAL_DEVICES)).length(3),
  effectExplanation: Str(1200),
});
export type RhetoricalQuestion = z.infer<typeof RhetoricalQuestionSchema>;

/** 3. Dạng câu sắp xếp dàn ý nghị luận (Luận đề → Luận điểm → Luận cứ → Kết luận). */
export const OutlineStepSchema = z.object({
  id: Str(32),
  role: z.enum(["luan_de", "giai_thich", "luan_diem", "luan_cu", "phan_de", "ket_luan"]),
  text: Str(400),
});
export const OutlineOrderQuestionSchema = z.object({
  grade: z.number().int().min(6).max(12),
  topic: Str(200),
  level: z.enum(VAN_LEVELS).default("VD"),
  prompt: Str(600),
  /** Thứ tự đúng từ đầu đến cuối. */
  steps: z.array(OutlineStepSchema).min(3).max(8),
  /** Thứ tự xáo trộn ban đầu trình bày cho HS (mảng chỉ số 0..n-1). */
  shuffledIndices: z.array(z.number().int().min(0)).min(3).max(8).optional(),
  explanation: Str(1200),
});
export type OutlineOrderQuestion = z.infer<typeof OutlineOrderQuestionSchema>;

/** Kiểm tra tất định tính hợp lệ của rubric nghị luận (tổng điểm, bước 0,25, mức cao nhất = maxPoints). */
export function validateLiteratureRubric(rubric: LiteratureRubric): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const isQuarter = (x: number) => Math.abs(Math.round(x * 4) - x * 4) < 1e-6;
  const sum = round2(rubric.criteria.reduce((acc, c) => acc + c.maxPoints, 0));
  if (Math.abs(sum - rubric.totalPoints) > 1e-4) {
    issues.push(`Tổng điểm tiêu chí (${sum}) khác tổng điểm thang chấm (${rubric.totalPoints})`);
  }
  for (const c of rubric.criteria) {
    if (!isQuarter(c.maxPoints)) issues.push(`Tiêu chí "${c.name}" có điểm tối đa ${c.maxPoints} không phải bội của 0,25`);
    const maxLvl = Math.max(...c.levels.map((l) => l.points));
    const minLvl = Math.min(...c.levels.map((l) => l.points));
    if (Math.abs(maxLvl - c.maxPoints) > 1e-4) {
      issues.push(`Tiêu chí "${c.name}": mức cao nhất (${maxLvl}) phải bằng maxPoints (${c.maxPoints})`);
    }
    if (minLvl !== 0) issues.push(`Tiêu chí "${c.name}": cần có mức 0 điểm`);
    for (const lv of c.levels) {
      if (!isQuarter(lv.points)) issues.push(`Tiêu chí "${c.name}" mức "${lv.label}" (${lv.points}) không phải bội của 0,25`);
    }
  }
  return { ok: issues.length === 0, issues };
}

/** Chuyển rubric cấu trúc sang văn bản lưu trong trường `rubric` của `EssayQuestion` (`question.ts`). */
export function formatRubricText(r: LiteratureRubric): string {
  const lines = [`Thang điểm: ${r.totalPoints} điểm (bước 0,25).`];
  for (const c of r.criteria) {
    lines.push(`- ${c.name} (${c.maxPoints} đ): ${c.levels.map((l) => `${l.label} ${l.points} đ — ${l.descriptor}`).join("; ")}`);
  }
  if (r.notes) lines.push(`Lưu ý: ${r.notes}`);
  return lines.join("\n");
}

/** Map 4 mức Văn (NB/TH/VD/VDC) sang 3 mức schema hiện tại của `server/src/domain/question.ts` + tag bảo toàn VDC. */
export function toBankLevel(level: VanLevel): { level: Level; levelTag: string } {
  return { level: level === "VDC" ? "VD" : level, levelTag: `muc:${level}` };
}

/** Chuyển bộ đọc hiểu 4 mức sang mảng `QuestionInput` tương thích 100% với ngân hàng câu hỏi hiện có. */
export function docHieuSetToBankQuestions(raw: DocHieuSet): QuestionInput[] {
  const set = DocHieuSetSchema.parse(raw);
  const header = `Đọc đoạn trích sau (${set.passage.title} — ${set.passage.author}, ${set.passage.source}):\n“${set.passage.excerpt}”\n\n`;
  return set.items.map((item, idx) => {
    const { level, levelTag } = toBankLevel(item.level);
    const tags = ["van:doc_hieu", levelTag, `the_loai:${set.passage.genre}`, `cau:${idx + 1}`];
    if (item.format === "mcq") {
      return parseQuestion({
        subject: "Ngữ văn",
        grade: set.grade,
        topic: set.topic,
        level,
        type: "mcq",
        stem: `${header}${item.stem}`,
        options: item.options,
        answer: item.answer,
        explanation: item.explanation,
        tags,
      });
    }
    if (item.format === "short_answer") {
      return parseQuestion({
        subject: "Ngữ văn",
        grade: set.grade,
        topic: set.topic,
        level,
        type: "short_answer",
        stem: `${header}${item.stem}`,
        answer: item.answer,
        explanation: item.explanation,
        tags,
      });
    }
    return parseQuestion({
      subject: "Ngữ văn",
      grade: set.grade,
      topic: set.topic,
      level,
      type: "essay",
      stem: `${header}${item.stem}`,
      rubric: formatRubricText(item.rubric),
      points: item.points,
      explanation: item.reference || undefined,
      tags: [...tags, "van:nghi_luan"],
    });
  });
}

/** Chuyển câu nhận diện biện pháp tu từ sang `McqQuestion` trong ngân hàng câu hỏi. */
export function rhetoricalToBankQuestion(raw: RhetoricalQuestion, answerSlot = 0): QuestionInput {
  const q = RhetoricalQuestionSchema.parse(raw);
  const uniqueCheck = new Set([q.device, ...q.distractors]);
  if (uniqueCheck.size < 4) throw new Error("Các phương án biện pháp tu từ không được trùng nhau");
  const slot = Math.max(0, Math.min(3, answerSlot));
  const ordered = [...q.distractors];
  ordered.splice(slot, 0, q.device);
  const { level, levelTag } = toBankLevel(q.level);
  return parseQuestion({
    subject: "Ngữ văn",
    grade: q.grade,
    topic: q.topic,
    level,
    type: "mcq",
    stem: `Cho đoạn trích (${q.author}, ${q.source}):\n“${q.excerpt}”\n\nCụm từ “${q.targetPhrase}” sử dụng biện pháp tu từ nào nổi bật nhất?`,
    options: ordered.map((d) => RHETORICAL_DEVICE_LABEL[d]),
    answer: slot,
    explanation: `${RHETORICAL_DEVICE_LABEL[q.device]}: ${q.effectExplanation}`,
    tags: ["van:nhan_dien_tu_tu", levelTag, `bien_phap:${q.device}`],
  });
}

/** Chấm tất định câu sắp xếp dàn ý (exact match + điểm từng phần theo cặp thứ tự đúng Kendall). */
export function gradeOutlineOrder(
  submittedIds: readonly string[],
  correctIds: readonly string[],
): { exact: boolean; scoreRatio: number; correctPairs: number; totalPairs: number; misplaced: string[] } {
  const n = correctIds.length;
  if (n < 2) return { exact: true, scoreRatio: 1, correctPairs: 0, totalPairs: 0, misplaced: [] };
  const exact = submittedIds.length === n && submittedIds.every((id, i) => id === correctIds[i]);
  const rank = new Map(correctIds.map((id, i) => [id, i]));
  let correctPairs = 0;
  const totalPairs = (n * (n - 1)) / 2;
  for (let i = 0; i < submittedIds.length; i++) {
    for (let j = i + 1; j < submittedIds.length; j++) {
      const ra = rank.get(submittedIds[i]!);
      const rb = rank.get(submittedIds[j]!);
      if (ra !== undefined && rb !== undefined && ra < rb) correctPairs++;
    }
  }
  const misplaced = submittedIds.filter((id, i) => id !== correctIds[i]);
  return {
    exact,
    scoreRatio: round2(correctPairs / totalPairs),
    correctPairs,
    totalPairs,
    misplaced,
  };
}

/** Chuyển câu sắp xếp dàn ý sang `ShortAnswerQuestion` (đáp án dạng "2-1-4-3" theo thứ tự hiển thị). */
export function outlineOrderToBankQuestion(raw: OutlineOrderQuestion): QuestionInput {
  const q = OutlineOrderQuestionSchema.parse(raw);
  const n = q.steps.length;
  const perm = q.shuffledIndices && q.shuffledIndices.length === n ? q.shuffledIndices : q.steps.map((_, i) => (i + 1) % n);
  const displayLines = perm.map((origIdx, dispIdx) => `(${dispIdx + 1}) ${q.steps[origIdx]!.text}`).join("\n");
  // Thứ tự số hiển thị tương ứng với trình tự đúng 0..n-1
  const answerSeq = q.steps.map((_, origIdx) => perm.indexOf(origIdx) + 1).join("-");
  const { level, levelTag } = toBankLevel(q.level);
  return parseQuestion({
    subject: "Ngữ văn",
    grade: q.grade,
    topic: q.topic,
    level,
    type: "short_answer",
    stem: `${q.prompt}\n\n${displayLines}\n\nNhập trình tự đúng (ví dụ 2-1-4-3):`,
    answer: answerSeq,
    explanation: q.explanation,
    tags: ["van:sap_xep_dan_y", levelTag],
  });
}

/** Chuẩn hoá kết quả chấm nghị luận AI bằng hàm P7 `normalizeEssay` + làm tròn bước 0,25 đ. */
export function normalizeLiteratureEssay(raw: unknown, maxPoints: number): EssayResult {
  const res = normalizeEssay(raw, maxPoints);
  const snapQuarter = (x: number) => Math.round(x * 4) / 4;
  const criteria = res.criteria.map((c) => {
    const pts = Math.min(c.max, Math.max(0, snapQuarter(c.points)));
    return { ...c, points: round2(pts) };
  });
  const total = round2(Math.min(maxPoints, criteria.reduce((s, c) => s + c.points, 0)));
  return { ...res, criteria, total };
}

/** Hai khung rubric chuẩn CTGDPT 2018 (tái sử dụng cho P7/P8 và /hoc/van/doc-hieu). */
export const RUBRIC_DOAN_VAN_200: LiteratureRubric = {
  totalPoints: 2,
  criteria: [
    {
      name: "Hình thức đoạn văn & dung lượng",
      maxPoints: 0.25,
      levels: [
        { label: "Đầy đủ", points: 0.25, descriptor: "Viết đúng một đoạn văn hoàn chỉnh (~150–200 chữ), không tách đoạn." },
        { label: "Chưa đạt", points: 0, descriptor: "Tách nhiều đoạn hoặc quá sơ sài (< 70 chữ)." },
      ],
    },
    {
      name: "Xác định đúng vấn đề nghị luận",
      maxPoints: 0.25,
      levels: [
        { label: "Đầy đủ", points: 0.25, descriptor: "Nêu trực tiếp, chính xác vấn đề đề yêu cầu ngay ở câu chủ đề." },
        { label: "Chưa đạt", points: 0, descriptor: "Nêu chung chung, lan man hoặc lạc đề." },
      ],
    },
    {
      name: "Triển khai luận điểm, lí lẽ & bằng chứng",
      maxPoints: 1.0,
      levels: [
        { label: "Đầy đủ", points: 1.0, descriptor: "Lí lẽ sắc sảo, có dẫn chứng tiêu biểu khớp nguyên văn/xác thực, phân tích sâu." },
        { label: "Khá", points: 0.75, descriptor: "Đủ ý chính, có dẫn chứng nhưng phân tích chưa thật sâu." },
        { label: "Một phần", points: 0.5, descriptor: "Nêu được vài ý đúng nhưng sơ sài hoặc thiếu dẫn chứng." },
        { label: "Sơ lược", points: 0.25, descriptor: "Chạm nhẹ vấn đề, lập luận rời rạc." },
        { label: "Chưa đạt", points: 0, descriptor: "Không triển khai được lập luận." },
      ],
    },
    {
      name: "Chính tả, diễn đạt & sáng tạo",
      maxPoints: 0.5,
      levels: [
        { label: "Đầy đủ", points: 0.5, descriptor: "Chuẩn tiếng Việt, liên kết mạch lạc, có góc nhìn sâu sắc hoặc diễn đạt giàu hình ảnh." },
        { label: "Một phần", points: 0.25, descriptor: "Diễn đạt rõ ràng, đúng chính tả ở mức an toàn." },
        { label: "Chưa đạt", points: 0, descriptor: "Nhiều lỗi chính tả, câu tối nghĩa." },
      ],
    },
  ],
  notes: "Chấp nhận cách diễn đạt khác nhưng thuyết phục; chấm theo bước 0,25 điểm; đối chiếu nguyên văn trích dẫn nếu có nguồn.",
};

export const RUBRIC_BAI_VAN_600: LiteratureRubric = {
  totalPoints: 4,
  criteria: [
    {
      name: "Cấu trúc bài văn nghị luận (Mở – Thân – Kết)",
      maxPoints: 0.25,
      levels: [
        { label: "Đầy đủ", points: 0.25, descriptor: "Đủ 3 phần cân đối, chuyển đoạn mạch lạc." },
        { label: "Chưa đạt", points: 0, descriptor: "Thiếu Mở bài hoặc Kết bài." },
      ],
    },
    {
      name: "Xác định đúng vấn đề nghị luận",
      maxPoints: 0.5,
      levels: [
        { label: "Đầy đủ", points: 0.5, descriptor: "Xác định chính xác, bao quát trọn vẹn trọng tâm đề." },
        { label: "Một phần", points: 0.25, descriptor: "Đúng hướng nhưng hẹp hoặc diễn đạt chưa rõ." },
        { label: "Chưa đạt", points: 0, descriptor: "Lạc đề." },
      ],
    },
    {
      name: "Triển khai hệ thống luận điểm, lí lẽ & dẫn chứng",
      maxPoints: 2.5,
      levels: [
        { label: "Xuất sắc", points: 2.5, descriptor: "≥ 2 luận điểm rõ ràng, phân tích sâu, dẫn chứng xác thực, có phản đề/đánh giá nghệ thuật." },
        { label: "Khá", points: 1.75, descriptor: "Đủ luận điểm và dẫn chứng nhưng phần mở rộng/đánh giá còn nhẹ." },
        { label: "Trung bình", points: 1.0, descriptor: "Luận điểm còn chung chung, dẫn chứng chưa phân tích kỹ." },
        { label: "Sơ sài", points: 0.5, descriptor: "Chỉ kể lại hoặc nêu ý rời rạc." },
        { label: "Chưa đạt", points: 0, descriptor: "Không làm rõ được vấn đề." },
      ],
    },
    {
      name: "Chính tả, ngữ pháp & tính sáng tạo",
      maxPoints: 0.75,
      levels: [
        { label: "Xuất sắc", points: 0.75, descriptor: "Văn phong trong sáng, giàu sức biểu cảm, có suy nghĩ độc đáo." },
        { label: "Khá", points: 0.5, descriptor: "Ít lỗi chính tả, câu văn rõ ràng, có điểm nhấn." },
        { label: "Đạt", points: 0.25, descriptor: "Đảm bảo chuẩn chính tả cơ bản." },
        { label: "Chưa đạt", points: 0, descriptor: "Mắc nhiều lỗi chính tả, dùng từ sai." },
      ],
    },
  ],
  notes: "Thang 4,0 điểm theo đề thi THPT CTGDPT 2018; mọi tiêu chí chấm bước 0,25 điểm.",
};
