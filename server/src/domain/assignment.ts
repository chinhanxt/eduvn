// server/src/domain/assignment.ts
import { z } from "zod";
import type { QuestionType } from "./question";
import { mulberry32, shuffle } from "./rng";
import { type PointRules, type ResponseValue, maxPoints, round2, scoreItem } from "./scoring";
import { SECTION_ORDER, type Variant, type VariantItem, answerKey } from "./variants";

/** Bài giao cho lớp (P9a): bản chụp mã đề lúc giao, luật thời gian, chấm, phần HS được xem. */
export const ASSIGNMENT_KINDS = ["practice", "test"] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];
export const SHOW_SOLUTION = ["after_submit", "after_due", "never"] as const;
export type ShowSolution = (typeof SHOW_SOLUTION)[number];
export const ASSIGNMENT_STATUS = ["draft", "published", "closed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[number];
export const SUBMISSION_STATUS = ["in_progress", "submitted", "auto_submitted"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[number];
export type AssignmentSource = { examId: string } | { questionIds: string[] };

/** Ân hạn mạng chậm sau giờ hết bài. */
export const GRACE_MS = 30_000;

const Iso = z.iso.datetime({ offset: true, message: "Thời điểm dạng ISO 8601, vd 2026-11-10T07:30:00+07:00" });

export const AssignmentInput = z.object({
  title: z.string().trim().normalize("NFC").min(1, "Thiếu tên bài").max(160),
  kind: z.enum(ASSIGNMENT_KINDS).default("test"),
  source: z.union([
    z.object({ examId: z.uuid() }).strict(),
    z.object({ questionIds: z.array(z.uuid()).min(1, "Chọn ít nhất 1 câu").max(100, "Tối đa 100 câu") }).strict(),
  ]),
  opensAt: Iso.optional(),
  dueAt: Iso,
  /** undefined = theo đề (nếu có); null = không giới hạn trong cửa sổ mở. */
  durationMinutes: z.number().int().min(1).max(300).nullable().optional(),
  attemptsAllowed: z.number().int().min(1).max(10).optional(),
  showSolution: z.enum(SHOW_SOLUTION).optional(),
  shuffle: z.boolean().default(false),
  publish: z.boolean().default(false),
});
export type AssignmentInputParsed = z.output<typeof AssignmentInput>;

export type AssignmentSettings = {
  kind: AssignmentKind;
  opensAt: Date;
  dueAt: Date;
  durationMinutes: number | null;
  attemptsAllowed: number;
  showSolution: ShowSolution;
  shuffle: boolean;
};

export function resolveSettings(p: AssignmentInputParsed, now: Date, examDuration: number | null): { ok: true; settings: AssignmentSettings } | { ok: false; issues: string[] } {
  const opensAt = p.opensAt ? new Date(p.opensAt) : now;
  const dueAt = new Date(p.dueAt);
  const issues: string[] = [];
  if (dueAt.getTime() <= opensAt.getTime()) issues.push("Hạn nộp phải sau giờ mở bài");
  if (dueAt.getTime() <= now.getTime()) issues.push("Hạn nộp phải ở tương lai");
  if (issues.length) return { ok: false, issues };
  const test = p.kind === "test";
  return {
    ok: true,
    settings: {
      kind: p.kind,
      opensAt,
      dueAt,
      durationMinutes: p.durationMinutes === undefined ? examDuration : p.durationMinutes,
      attemptsAllowed: p.attemptsAllowed ?? (test ? 1 : 3),
      showSolution: p.showSolution ?? (test ? "after_due" : "after_submit"),
      shuffle: p.shuffle,
    },
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mã đề chia đều theo số thứ tự; HS chưa có số thứ tự thì theo băm id. */
export function pickVariant(variants: readonly Variant[], seat: number | null, studentId: string): Variant {
  if (variants.length === 0) throw new Error("assignment has no variants");
  const idx = seat !== null && seat > 0 ? (seat - 1) % variants.length : hashString(studentId) % variants.length;
  return variants[idx] as Variant;
}

export function variantByCode(variants: readonly Variant[], code: string): Variant {
  const v = variants.find((x) => x.code === code);
  if (!v) throw new Error(`variant ${code} not found`);
  return v;
}

/** Thứ tự hiển thị (danh sách `no`): giữ thứ tự các phần CV 7991; shuffle thì đảo trong từng phần theo seed. */
export function displayOrder(v: Variant, doShuffle: boolean, seed: number): number[] {
  if (!doShuffle) return v.items.map((i) => i.no);
  const rng = mulberry32(seed);
  return SECTION_ORDER.flatMap((s) =>
    shuffle(
      v.items.filter((i) => i.section === s),
      rng,
    ).map((i) => i.no),
  );
}

type ItemBase = { no: number; section: QuestionType; stem: string; maxPoints: number };
/** Câu hỏi gửi xuống trình duyệt HS: KHÔNG có đáp án, lời giải, hướng dẫn chấm. */
export type PublicItem =
  | (ItemBase & { type: "mcq"; options: string[] })
  | (ItemBase & { type: "true_false"; statements: string[] })
  | (ItemBase & { type: "short_answer" })
  | (ItemBase & { type: "essay" });

export function publicItems(v: Variant, order: readonly number[], rules: PointRules): PublicItem[] {
  const byNo = new Map(v.items.map((i) => [i.no, i]));
  return order.map((no) => {
    const it = byNo.get(no) as VariantItem;
    const q = it.question;
    const base: ItemBase = { no, section: it.section, stem: q.stem, maxPoints: maxPoints(q, rules) };
    switch (q.type) {
      case "mcq":
        return { ...base, type: "mcq" as const, options: [...q.options] };
      case "true_false":
        return { ...base, type: "true_false" as const, statements: [...q.statements] };
      case "short_answer":
        return { ...base, type: "short_answer" as const };
      case "essay":
        return { ...base, type: "essay" as const };
    }
  });
}

export function computeDeadline(startedAt: Date, durationMinutes: number | null, dueAt: Date): Date {
  if (durationMinutes === null) return dueAt;
  return new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, dueAt.getTime()));
}
/** Còn lưu được khi deadline_at >= saveCutoff(now). */
export const saveCutoff = (now: Date): Date => new Date(now.getTime() - GRACE_MS);
export const isExpired = (deadlineAt: Date, now: Date): boolean => now.getTime() > deadlineAt.getTime() + GRACE_MS;

/** Đáp án HS: trắc nghiệm = chỉ số 0–3; đúng/sai = 4 ý (null = chưa chọn); trả lời ngắn = LaTeX/chữ; tự luận = chữ. */
export const AnswerValue = z.union([z.number().int().min(0).max(3), z.array(z.boolean().nullable()).length(4), z.string().max(5000), z.null()]);
export type AnswerValue = z.infer<typeof AnswerValue>;
export const Answers = z.record(z.string().regex(/^\d{1,3}$/), AnswerValue).refine((a) => Object.keys(a).length <= 200, "Quá nhiều câu trả lời");
export type Answers = z.infer<typeof Answers>;
export const SaveBody = z.object({ seq: z.number().int().min(1).max(2_000_000_000), answers: Answers });
export type SaveBody = z.infer<typeof SaveBody>;

export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.every((x) => x !== null);
  return v.trim() !== "";
}
export const answeredCount = (a: Answers): number => Object.values(a).filter(isAnswered).length;

export type ItemResult = {
  no: number;
  questionId: string;
  topic: string;
  level: string;
  type: QuestionType;
  /** null = tự luận chờ GV chấm. */
  points: number | null;
  maxPoints: number;
  correct: boolean | null;
  /** Lựa chọn của HS để đếm đáp án nhiễu: trắc nghiệm = nội dung phương án; đúng/sai = "ĐS_Đ"; trả lời ngắn = chuỗi đã nhập. */
  choice: string | null;
};
export type Graded = { score: number; maxScore: number; pending: number; items: ItemResult[] };

export function choiceOf(q: VariantItem["question"], r: ResponseValue | undefined): string | null {
  if (r === undefined || r === null) return null;
  switch (q.type) {
    case "mcq":
      return typeof r === "number" ? (q.options[r] ?? null) : null;
    case "true_false":
      return Array.isArray(r) ? r.map((b) => (b === null ? "_" : b ? "Đ" : "S")).join("") : null;
    case "short_answer":
      return typeof r === "string" && r.trim() ? r.trim().slice(0, 200) : null;
    case "essay":
      return null;
  }
}

export function gradeAnswers(v: Variant, answers: Answers, rules: PointRules): Graded {
  const items: ItemResult[] = v.items.map((it) => {
    const r = answers[String(it.no)];
    const points = scoreItem(it.question, r, rules);
    const max = maxPoints(it.question, rules);
    return {
      no: it.no,
      questionId: it.questionId,
      topic: it.question.topic,
      level: it.question.level,
      type: it.question.type,
      points,
      maxPoints: max,
      correct: points === null ? null : points >= max,
      choice: choiceOf(it.question, r),
    };
  });
  return {
    score: round2(items.reduce((s, i) => s + (i.points ?? 0), 0)),
    maxScore: round2(items.reduce((s, i) => s + i.maxPoints, 0)),
    pending: items.filter((i) => i.points === null).length,
    items,
  };
}

export const toScore10 = (score: number | null, max: number | null): number | null => (score === null || max === null || max <= 0 ? null : round2((score / max) * 10));

/** Mức HS được xem sau khi nộp: full = điểm + đúng/sai + đáp án + lời giải; marks = điểm + đúng/sai; score = chỉ điểm. */
export type ResultLevel = "full" | "marks" | "score";
export function resultLevel(show: ShowSolution, dueAt: Date, now: Date): ResultLevel {
  if (show === "never") return "score";
  if (show === "after_submit") return "full";
  return now.getTime() >= dueAt.getTime() ? "full" : "marks";
}

export type ReviewItem = PublicItem & { response: AnswerValue | null; points: number | null; correct: boolean | null; key?: string; explanation?: string; rubric?: string };

export function reviewItems(
  v: Variant,
  order: readonly number[],
  rules: PointRules,
  answers: Answers,
  graded: ReadonlyMap<number, { points: number | null; correct: boolean | null }>,
  level: ResultLevel,
  includeRubric = false,
): ReviewItem[] {
  const keys = new Map(answerKey(v).map((k) => [k.no, k.answer]));
  const byNo = new Map(v.items.map((i) => [i.no, i]));
  return publicItems(v, order, rules).map((p) => {
    const q = (byNo.get(p.no) as VariantItem).question;
    const g = graded.get(p.no);
    const out: ReviewItem = { ...p, response: answers[String(p.no)] ?? null, points: level === "score" ? null : (g?.points ?? null), correct: level === "score" ? null : (g?.correct ?? null) };
    if (level === "full") {
      if (q.type !== "essay") out.key = keys.get(p.no);
      if (q.explanation) out.explanation = q.explanation;
      if (includeRubric && q.type === "essay") out.rubric = q.rubric;
    }
    return out;
  });
}

export type StudentState = "chua_mo" | "chua_lam" | "dang_lam" | "da_nop" | "qua_han";

export function studentState(
  a: { opensAt: Date; dueAt: Date; status: AssignmentStatus; attemptsAllowed: number },
  subs: readonly { status: SubmissionStatus }[],
  now: Date,
): { state: StudentState; canStart: boolean } {
  const open = a.status === "published" && now.getTime() >= a.opensAt.getTime() && now.getTime() < a.dueAt.getTime();
  if (subs.some((s) => s.status === "in_progress")) return { state: "dang_lam", canStart: true };
  if (subs.length > 0) return { state: "da_nop", canStart: open && subs.length < a.attemptsAllowed };
  if (a.status === "published" && now.getTime() < a.opensAt.getTime()) return { state: "chua_mo", canStart: false };
  if (!open) return { state: "qua_han", canStart: false };
  return { state: "chua_lam", canStart: true };
}
