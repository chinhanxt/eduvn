// server/src/subjects/su/questions.ts — 4 dạng câu hỏi đặc thù môn Lịch sử (CTGDPT 2018),
// bộ chấm tất định, chuyển đổi sang QuestionInput của ngân hàng câu hỏi hiện có, và prompt AI soạn câu.
import { z } from "zod";
import { Level, QuestionInput, type QuestionInput as BankQuestion } from "../../domain/question";
import { foldVi } from "../../domain/tutorSearch";
import type { HistoricalPlace } from "./gazetteer";
import { HistoryClaimSchema } from "./verify";

export const SU_QUESTION_TYPES = [
  "sap_xep_thoi_gian",
  "noi_nhan_vat_su_kien",
  "doc_luoc_do",
  "phan_tich_nguyen_nhan_y_nghia",
] as const;
export type SuQuestionType = (typeof SU_QUESTION_TYPES)[number];

export const SU_TYPE_LABEL: Record<SuQuestionType, string> = {
  sap_xep_thoi_gian: "Sắp xếp sự kiện theo thời gian",
  noi_nhan_vat_su_kien: "Nối nhân vật – sự kiện",
  doc_luoc_do: "Đọc lược đồ lịch sử",
  phan_tich_nguyen_nhan_y_nghia: "Phân tích nguyên nhân / ý nghĩa",
};

const Str = (max: number) => z.string().trim().normalize("NFC").min(1).max(max);

const baseSu = {
  grade: z.number().int().min(4).max(12),
  topic: Str(160),
  level: Level,
  stem: Str(2000),
  explanation: z.string().trim().normalize("NFC").max(3000).optional(),
  tags: z.array(z.string().trim().min(1).max(80)).default([]),
  /** Danh sách mốc năm / địa danh / nhân vật để máy chủ tự kiểm nguồn (Wikidata / tài liệu GV). */
  claims: z.array(HistoryClaimSchema).max(20).default([]),
};

export const SapXepThoiGianSchema = z
  .object({
    ...baseSu,
    suType: z.literal("sap_xep_thoi_gian"),
    items: z
      .array(
        z.object({
          id: z.string().regex(/^[1-6]$/, "Mã mục là số 1..6"),
          text: Str(240),
          year: z.number().int().min(-3000).max(2100).optional(),
        }),
      )
      .min(3)
      .max(6),
    /** Thứ tự đúng theo chiều thời gian (từ sớm đến muộn), là hoán vị của items[].id. */
    correctOrder: z.array(z.string().regex(/^[1-6]$/)).min(3).max(6),
  })
  .superRefine((q, ctx) => {
    const ids = q.items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "Mã các sự kiện không được trùng nhau" });
    }
    if (q.correctOrder.length !== ids.length || new Set(q.correctOrder).size !== ids.length || !q.correctOrder.every((id) => ids.includes(id))) {
      ctx.addIssue({ code: "custom", path: ["correctOrder"], message: "correctOrder phải là hoán vị đủ của items[].id" });
    }
    // Nếu mọi mục đều có năm, kiểm tra thứ tự correctOrder không giảm theo năm
    const byId = new Map(q.items.map((i) => [i.id, i]));
    let prevYear = -Infinity;
    for (const id of q.correctOrder) {
      const y = byId.get(id)?.year;
      if (y !== undefined) {
        if (y < prevYear) {
          ctx.addIssue({ code: "custom", path: ["correctOrder"], message: `Thứ tự năm không tăng dần tại mục ${id} (năm ${y} < ${prevYear})` });
          break;
        }
        prevYear = y;
      }
    }
  });

export const NoiNhanVatSuKienSchema = z
  .object({
    ...baseSu,
    suType: z.literal("noi_nhan_vat_su_kien"),
    figures: z
      .array(z.object({ id: z.string().regex(/^[1-6]$/), name: Str(120), qid: z.string().regex(/^Q\d+$/).optional() }))
      .min(3)
      .max(6),
    events: z
      .array(z.object({ id: z.string().regex(/^[A-F]$/), text: Str(240), year: z.number().int().min(-3000).max(2100).optional() }))
      .min(3)
      .max(6),
    pairs: z.array(z.object({ figureId: z.string().regex(/^[1-6]$/), eventId: z.string().regex(/^[A-F]$/) })).min(3).max(6),
  })
  .superRefine((q, ctx) => {
    const fIds = new Set(q.figures.map((f) => f.id));
    const eIds = new Set(q.events.map((e) => e.id));
    if (fIds.size !== q.figures.length) ctx.addIssue({ code: "custom", path: ["figures"], message: "Mã nhân vật bị trùng" });
    if (eIds.size !== q.events.length) ctx.addIssue({ code: "custom", path: ["events"], message: "Mã sự kiện bị trùng" });
    if (q.pairs.length !== q.figures.length) {
      ctx.addIssue({ code: "custom", path: ["pairs"], message: "Mỗi nhân vật cần đúng một cặp nối" });
    }
    const seenF = new Set<string>();
    const seenE = new Set<string>();
    for (const [idx, p] of q.pairs.entries()) {
      if (!fIds.has(p.figureId) || !eIds.has(p.eventId)) {
        ctx.addIssue({ code: "custom", path: ["pairs", idx], message: `Cặp ${p.figureId}-${p.eventId} tham chiếu mã không tồn tại` });
      }
      if (seenF.has(p.figureId) || seenE.has(p.eventId)) {
        ctx.addIssue({ code: "custom", path: ["pairs", idx], message: "Không nối trùng nhân vật hoặc sự kiện" });
      }
      seenF.add(p.figureId);
      seenE.add(p.eventId);
    }
  });

export const DocLuocDoSchema = z
  .object({
    ...baseSu,
    suType: z.literal("doc_luoc_do"),
    mapKind: z.enum(["vietnam", "tay-bac", "dien-bien-phu", "dong-nam-a"]).default("vietnam"),
    /** Mọi placeId phải thuộc services/anim-kit-data/dia-danh-lich-su.json (không tự bịa toạ độ). */
    placeIds: z.array(z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)).min(1).max(10),
    arrows: z
      .array(
        z.object({
          from: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
          to: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
          kind: z.enum(["tien-cong", "rut-lui", "bao-vay"]).default("tien-cong"),
          label: z.string().trim().max(60).optional(),
        }),
      )
      .max(8)
      .default([]),
    options: z.array(Str(240)).length(4),
    answer: z.number().int().min(0).max(3),
  })
  .superRefine((q, ctx) => {
    const norm = q.options.map((o) => foldVi(o.replace(/^\s*[A-D][.)]\s*/, "").trim()));
    if (new Set(norm).size < 4) {
      ctx.addIssue({ code: "custom", path: ["options"], message: "Các phương án nhiễu không được trùng nhau" });
    }
  });

export const PhanTichNguyenNhanYNghiaSchema = z
  .object({
    ...baseSu,
    suType: z.literal("phan_tich_nguyen_nhan_y_nghia"),
    eventName: Str(160),
    eventYear: z.number().int().min(-3000).max(2100).optional(),
    focus: z.enum(["nguyen_nhan", "y_nghia", "ca_hai"]).default("ca_hai"),
    keyPoints: z
      .array(
        z.object({
          label: Str(120),
          points: z.number().positive().max(10),
          description: Str(400),
        }),
      )
      .min(2)
      .max(6),
    points: z.number().positive().max(10),
  })
  .superRefine((q, ctx) => {
    const sum = Math.round(q.keyPoints.reduce((acc, k) => acc + k.points, 0) * 100) / 100;
    if (Math.abs(sum - q.points) > 0.001) {
      ctx.addIssue({ code: "custom", path: ["points"], message: `Tổng điểm thành phần (${sum}) phải bằng points (${q.points})` });
    }
  });

export const HistoryQuestionSchema = z.discriminatedUnion("suType", [
  SapXepThoiGianSchema,
  NoiNhanVatSuKienSchema,
  DocLuocDoSchema,
  PhanTichNguyenNhanYNghiaSchema,
]);
export type HistoryQuestion = z.infer<typeof HistoryQuestionSchema>;

/** Chuẩn hoá đáp án sắp xếp ("2 - 4 - 1 - 3" hoặc ["2","4","1","3"] → "2-4-1-3"). */
export function normalizeOrderAnswer(raw: string | string[]): string {
  const arr = Array.isArray(raw) ? raw : raw.split(/[\s,\-–→>;]+/);
  return arr.map((x) => x.trim()).filter(Boolean).join("-");
}

/** Chuẩn hoá đáp án nối ("1-B, 2-A; 3:C" → mảng cặp sắp theo figureId). */
export function normalizeMatchAnswer(raw: string | Record<string, string>): string {
  const entries: [string, string][] = [];
  if (typeof raw === "string") {
    for (const m of raw.toUpperCase().matchAll(/([1-6])\s*[-–:=→]\s*([A-F])/g)) {
      entries.push([m[1]!, m[2]!]);
    }
  } else {
    for (const [k, v] of Object.entries(raw)) {
      entries.push([k.trim().toUpperCase(), v.trim().toUpperCase()]);
    }
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.map(([k, v]) => `${k}-${v}`).join(", ");
}

export type GradeResult = {
  correct: boolean | null;
  score: number;
  maxScore: number;
  expectedKey: string;
  feedback: string;
};

/** Chấm điểm tất định cho câu hỏi Lịch sử. Câu tự luận trả correct=null kèm rubric chấm tay/AI. */
export function gradeHistoryQuestion(q: HistoryQuestion, answer: unknown): GradeResult {
  if (q.suType === "sap_xep_thoi_gian") {
    const key = q.correctOrder.join("-");
    const given = typeof answer === "string" || Array.isArray(answer) ? normalizeOrderAnswer(answer as string | string[]) : "";
    const ok = given === key;
    return {
      correct: ok,
      score: ok ? 1 : 0,
      maxScore: 1,
      expectedKey: key,
      feedback: ok ? "Đúng trình tự thời gian." : `Thứ tự đúng là ${key}.`,
    };
  }
  if (q.suType === "noi_nhan_vat_su_kien") {
    const sortedPairs = [...q.pairs].sort((a, b) => a.figureId.localeCompare(b.figureId));
    const key = sortedPairs.map((p) => `${p.figureId}-${p.eventId}`).join(", ");
    const given =
      typeof answer === "string" || (answer && typeof answer === "object")
        ? normalizeMatchAnswer(answer as string | Record<string, string>)
        : "";
    const ok = given === key;
    return {
      correct: ok,
      score: ok ? 1 : 0,
      maxScore: 1,
      expectedKey: key,
      feedback: ok ? "Nối chính xác tất cả các cặp nhân vật – sự kiện." : `Đáp án đúng: ${key}.`,
    };
  }
  if (q.suType === "doc_luoc_do") {
    const idx = typeof answer === "number" ? answer : typeof answer === "string" ? "ABCD".indexOf(answer.trim().toUpperCase()) : -1;
    const ok = idx === q.answer;
    const letter = String.fromCharCode(65 + q.answer);
    return {
      correct: ok,
      score: ok ? 1 : 0,
      maxScore: 1,
      expectedKey: letter,
      feedback: ok ? `Chính xác (${letter}).` : `Đáp án đúng là ${letter}. ${q.options[q.answer]}`,
    };
  }
  const rubricLines = q.keyPoints.map((k, i) => `${i + 1}. ${k.label} (${k.points} đ): ${k.description}`).join("\n");
  return {
    correct: null,
    score: 0,
    maxScore: q.points,
    expectedKey: rubricLines,
    feedback: "Câu tự luận phân tích nguyên nhân/ý nghĩa — chấm theo thang điểm gợi ý.",
  };
}

/**
 * Ánh xạ 4 dạng câu hỏi đặc thù Lịch sử sang schema QuestionInput hiện có của ngân hàng câu hỏi
 * (`server/src/domain/question.ts`) — không cần sửa schema lõi hay tạo migration 0028.
 */
export function toBankQuestion(q: HistoryQuestion, opts: { figureDataUrl?: string } = {}): BankQuestion {
  const commonTags = [...new Set(["mon:su", `su:dang:${q.suType}`, ...q.tags])];

  if (q.suType === "sap_xep_thoi_gian") {
    const listText = q.items.map((it) => `(${it.id}) ${it.text}`).join("\n");
    const key = q.correctOrder.join("-");
    return QuestionInput.parse({
      type: "short_answer",
      subject: "Lịch sử",
      grade: q.grade,
      topic: q.topic,
      level: q.level,
      stem: `${q.stem}\n${listText}\n(Ghi thứ tự đúng từ sớm đến muộn dạng: 1-2-3-4)`,
      answer: key,
      explanation: q.explanation,
      tags: commonTags,
    });
  }

  if (q.suType === "noi_nhan_vat_su_kien") {
    const colA = q.figures.map((f) => `${f.id}. ${f.name}`).join("\n");
    const colB = q.events.map((e) => `${e.id}. ${e.text}`).join("\n");
    const key = [...q.pairs]
      .sort((a, b) => a.figureId.localeCompare(b.figureId))
      .map((p) => `${p.figureId}-${p.eventId}`)
      .join(", ");
    return QuestionInput.parse({
      type: "short_answer",
      subject: "Lịch sử",
      grade: q.grade,
      topic: q.topic,
      level: q.level,
      stem: `${q.stem}\nCột A (Nhân vật):\n${colA}\nCột B (Sự kiện):\n${colB}\n(Ghi cặp nối dạng: 1-B, 2-A, ...)`,
      answer: key,
      explanation: q.explanation,
      tags: commonTags,
    });
  }

  if (q.suType === "doc_luoc_do") {
    const arrowSummary = q.arrows.length
      ? `\nCác mũi tên trên lược đồ: ${q.arrows.map((a) => `${a.from} → ${a.to} (${a.kind}${a.label ? `: ${a.label}` : ""})`).join("; ")}.`
      : "";
    return QuestionInput.parse({
      type: "mcq",
      subject: "Lịch sử",
      grade: q.grade,
      topic: q.topic,
      level: q.level,
      stem: `${q.stem}${arrowSummary}`,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      tags: [...commonTags, `su:map:${q.mapKind}`, ...q.placeIds.map((id) => `su:place:${id}`)],
      ...(opts.figureDataUrl && { figure: opts.figureDataUrl }),
    });
  }

  const rubric = q.keyPoints.map((k, i) => `- Ý ${i + 1} — ${k.label} (${k.points} điểm): ${k.description}`).join("\n");
  return QuestionInput.parse({
    type: "essay",
    subject: "Lịch sử",
    grade: q.grade,
    topic: q.topic,
    level: q.level,
    stem: q.stem,
    rubric,
    points: q.points,
    explanation: q.explanation,
    tags: [...commonTags, `su:focus:${q.focus}`],
  });
}

// ---------- Prompt AI soạn câu hỏi Lịch sử ----------

export const HISTORY_QUESTION_SYSTEM = `Bạn là giáo viên Lịch sử biên soạn câu hỏi kiểm tra theo Chương trình GDPT 2018.
Quy tắc bắt buộc:
1. Giữ giọng trung lập, khách quan, chuẩn sách giáo khoa; dùng tiếng Việt có dấu.
2. TUYỆT ĐỐI KHÔNG tự bịa năm tháng, toạ độ địa lý hay tên nhân vật không có nguồn xác thực.
3. Với dạng "doc_luoc_do", mọi mã trong placeIds và arrows[].from/to PHẢI lấy đúng từ danh sách mã địa danh được cung cấp; luôn tôn trọng đầy đủ chủ quyền Việt Nam (Hoàng Sa, Trường Sa thuộc Việt Nam).
4. Mỗi câu hỏi PHẢI kèm mảng "claims" liệt kê các mốc năm (kind:"year"), địa danh (kind:"place"), nhân vật (kind:"figure") xuất hiện trong câu để máy chủ đối chiếu tự động với Wikidata hoặc tài liệu giáo viên.
5. Trả về DUY NHẤT một đối tượng JSON theo mẫu {"questions": [...]}, không kèm markdown hay chữ thừa.`;

export type HistoryDraftRequest = {
  grade: number;
  topic: string;
  suType: SuQuestionType;
  level: "NB" | "TH" | "VD";
  count: number;
  yccd?: string;
  contextText?: string;
};

const SCHEMA_HINT: Record<SuQuestionType, string> = {
  sap_xep_thoi_gian: `{"suType":"sap_xep_thoi_gian","grade":12,"topic":"...","level":"TH","stem":"Hãy sắp xếp các sự kiện sau theo đúng trình tự thời gian:","items":[{"id":"1","text":"...","year":1945},{"id":"2","text":"...","year":1954},{"id":"3","text":"...","year":1975},{"id":"4","text":"...","year":1930}],"correctOrder":["4","1","2","3"],"explanation":"...","tags":["yccd:..."],"claims":[{"kind":"year","subject":"Cách mạng tháng Tám","year":1945}]}`,
  noi_nhan_vat_su_kien: `{"suType":"noi_nhan_vat_su_kien","grade":12,"topic":"...","level":"NB","stem":"Nối mỗi nhân vật lịch sử ở cột A với sự kiện tương ứng ở cột B:","figures":[{"id":"1","name":"Võ Nguyên Giáp"},{"id":"2","name":"Ngô Quyền"},{"id":"3","name":"Quang Trung"}],"events":[{"id":"A","text":"Chiến thắng Bạch Đằng năm 938","year":938},{"id":"B","text":"Chiến thắng Ngọc Hồi – Đống Đa năm 1789","year":1789},{"id":"C","text":"Chỉ huy Chiến dịch Điện Biên Phủ năm 1954","year":1954}],"pairs":[{"figureId":"1","eventId":"C"},{"figureId":"2","eventId":"A"},{"figureId":"3","eventId":"B"}],"explanation":"...","tags":[],"claims":[{"kind":"figure","name":"Võ Nguyên Giáp","eventName":"Chiến dịch Điện Biên Phủ","eventYear":1954}]}`,
  doc_luoc_do: `{"suType":"doc_luoc_do","grade":12,"topic":"...","level":"TH","stem":"Quan sát lược đồ Chiến dịch Điện Biên Phủ (1954), cứ điểm nào bị quân ta tiêu diệt mở màn Đợt 1 ngày 13/3/1954?","mapKind":"dien-bien-phu","placeIds":["tuan-giao","him-lam","doi-doc-lap","muong-thanh"],"arrows":[{"from":"tuan-giao","to":"him-lam","kind":"tien-cong","label":"Đợt 1 (13/3/1954)"}],"options":["Cứ điểm Him Lam","Đồi A1","Phân khu Hồng Cúm","Hầm Đờ Cát"],"answer":0,"explanation":"...","tags":[],"claims":[{"kind":"place","placeId":"him-lam","name":"Cứ điểm Him Lam"},{"kind":"year","subject":"Chiến dịch Điện Biên Phủ","year":1954}]}`,
  phan_tich_nguyen_nhan_y_nghia: `{"suType":"phan_tich_nguyen_nhan_y_nghia","grade":12,"topic":"...","level":"VD","stem":"Phân tích nguyên nhân thắng lợi và ý nghĩa lịch sử của Chiến thắng Điện Biên Phủ năm 1954.","eventName":"Chiến dịch Điện Biên Phủ","eventYear":1954,"focus":"ca_hai","keyPoints":[{"label":"Nguyên nhân chủ quan","points":1,"description":"Sự lãnh đạo đúng đắn của Đảng, Chủ tịch Hồ Chí Minh và tinh thần chiến đấu của quân dân ta."},{"label":"Ý nghĩa lịch sử","points":1,"description":"Giáng đòn quyết định, buộc thực dân Pháp ký Hiệp định Giơ-ne-vơ năm 1954."}],"points":2,"explanation":"...","tags":[],"claims":[{"kind":"year","subject":"Chiến dịch Điện Biên Phủ","year":1954}]}`,
};

export function buildHistoryQuestionPrompt(req: HistoryDraftRequest, places: readonly HistoricalPlace[]): string {
  const placeList = places
    .slice(0, 45)
    .map((p) => `${p.id} (${p.ten})`)
    .join(", ");
  return [
    `Soạn ${req.count} câu hỏi môn Lịch sử lớp ${req.grade}, chủ đề "${req.topic}", mức độ ${req.level}, dạng "${req.suType}" (${SU_TYPE_LABEL[req.suType]}).`,
    req.yccd ? `Yêu cầu cần đạt (YCCĐ): ${req.yccd}` : "",
    req.contextText ? `Tài liệu tham chiếu của giáo viên (ưu tiên bám sát):\n${req.contextText.slice(0, 2500)}` : "",
    `Danh sách mã địa danh được phép dùng cho placeIds/arrows/claims: ${placeList}.`,
    `Định dạng mỗi phần tử trong mảng "questions":\n${SCHEMA_HINT[req.suType]}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
