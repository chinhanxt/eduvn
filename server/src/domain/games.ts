import { z } from "zod";
import type { QuestionInput } from "./question";

/** Trò chơi ôn tập sinh từ câu hỏi trong ngân hàng / đề. */

export const GAME_KINDS = ["quiz", "flashcards"] as const;
export type GameKind = (typeof GAME_KINDS)[number];
export const MIN_QUESTIONS = 4;
export const MAX_QUESTIONS = 200;

export type GameItem = {
  kind: "choice" | "text";
  q: string;
  /** Chỉ với kind "choice". */
  options?: string[];
  /** choice: chỉ số phương án đúng; text: đáp án chuẩn. */
  answer: number | string;
  explain: string;
};
export type GameBody = { kind: GameKind; items: GameItem[]; timerSeconds: number; source: string };

export const GameKindSchema = z.enum(GAME_KINDS);
export const TimerSchema = z.number().int().min(0).max(300);

export const usable = (q: QuestionInput): boolean => q.type === "mcq" || q.type === "true_false" || q.type === "short_answer";

/** mcq → 1 mục; true_false → mỗi ý là một mục Đúng/Sai; short_answer → mục gõ đáp án. Tự luận bị bỏ qua. */
export function itemsFromQuestions(qs: readonly QuestionInput[]): GameItem[] {
  const out: GameItem[] = [];
  for (const q of qs) {
    const explain = q.explanation?.trim() ?? "";
    if (q.type === "mcq") out.push({ kind: "choice", q: q.stem, options: [...q.options], answer: q.answer, explain });
    else if (q.type === "true_false") {
      q.statements.forEach((st, i) => out.push({ kind: "choice", q: `${q.stem}\n${st}`, options: ["Đúng", "Sai"], answer: q.answer[i] ? 0 : 1, explain }));
    } else if (q.type === "short_answer") out.push({ kind: "text", q: q.stem, answer: q.answer, explain });
  }
  return out;
}

export type GameBuild = { ok: true; body: GameBody } | { ok: false; issues: string[] };

export function buildGame(kind: GameKind, qs: readonly QuestionInput[], opts: { timerSeconds?: number; source: string }): GameBuild {
  const ok = qs.filter(usable);
  const skipped = qs.length - ok.length;
  if (ok.length < MIN_QUESTIONS) {
    return { ok: false, issues: [`Cần ít nhất ${MIN_QUESTIONS} câu trắc nghiệm / đúng-sai / trả lời ngắn, hiện chỉ có ${ok.length}${skipped > 0 ? ` (bỏ qua ${skipped} câu tự luận)` : ""}`] };
  }
  const picked = ok.slice(0, MAX_QUESTIONS);
  return { ok: true, body: { kind, items: itemsFromQuestions(picked), timerSeconds: kind === "quiz" ? (opts.timerSeconds ?? 0) : 0, source: opts.source } };
}

/** Nguồn câu hỏi: đề + mã đề, bộ lọc ngân hàng, hoặc danh sách id. */
export const GameSource = z.union([
  z.object({ examId: z.string().min(1), code: z.string().min(1).optional() }).strict(),
  z.object({ questionIds: z.array(z.string().min(1)).min(1).max(MAX_QUESTIONS) }).strict(),
  z.object({
    subject: z.string().trim().min(1),
    grade: z.coerce.number().int().min(1).max(16),
    topic: z.string().trim().min(1).optional(),
    level: z.enum(["NB", "TH", "VD"]).optional(),
    type: z.enum(["mcq", "true_false", "short_answer"]).optional(),
    limit: z.coerce.number().int().min(1).max(MAX_QUESTIONS).optional(),
  }).strict(),
]);
export type GameSource = z.infer<typeof GameSource>;

export const GAME_SHAPE_HELP = `Nguồn câu hỏi (source) — chọn MỘT trong ba: { "examId": "...", "code"?: "101" } (lấy câu của một mã đề; bỏ code thì dùng mã đầu), { "questionIds": ["..."] }, hoặc bộ lọc ngân hàng { "subject": "Toán", "grade": 10, "topic"?: "...", "level"?: "NB"|"TH"|"VD", "type"?: "mcq"|"true_false"|"short_answer", "limit"?: 20 }. kind: "quiz" (đố vui có điểm, tuỳ chọn timerSeconds mỗi câu, 0 = tắt) hoặc "flashcards" (thẻ lật). Hỗ trợ trắc nghiệm, đúng/sai (mỗi ý thành một câu Đúng/Sai), trả lời ngắn (quiz: gõ đáp án). Tự luận bị bỏ qua. Cần ≥ ${MIN_QUESTIONS} câu.`;
