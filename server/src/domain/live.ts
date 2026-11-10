import type { GameItem } from "./games";
import type { QuestionInput } from "./question";
import { normalizeShort } from "./scoring";

/** Trò chơi trực tiếp cả lớp (P11): luật điểm, mã PIN, quy đổi câu hỏi. Thuần, không I/O. */

export const DEFAULT_LIMIT_SECONDS = 20;
export const MAX_PLAYERS = 500;
export const NAME_MAX = 24;

/** Câu hỏi cho phòng chơi: giữ nguyên công thức $…$ (màn hình tự dựng LaTeX). Tự luận bỏ qua. */
export function liveItems(qs: readonly QuestionInput[]): GameItem[] {
  const out: GameItem[] = [];
  for (const q of qs) {
    const explain = q.explanation?.trim() ?? "";
    if (q.type === "mcq") out.push({ kind: "choice", q: q.stem, options: [...q.options], answer: q.answer, explain });
    else if (q.type === "true_false") q.statements.forEach((st, i) => out.push({ kind: "choice", q: `${q.stem}\n${st}`, options: ["Đúng", "Sai"], answer: q.answer[i] ? 0 : 1, explain }));
    else if (q.type === "short_answer") out.push({ kind: "text", q: q.stem, answer: q.answer, explain });
  }
  return out;
}

/** PIN 6 chữ số, không bắt đầu bằng 0, không trùng PIN đang dùng. */
export function newPin(taken: ReadonlySet<string>, rand: () => number = Math.random): string {
  for (let i = 0; i < 1000; i++) {
    const pin = String(100000 + Math.floor(rand() * 900000));
    if (!taken.has(pin)) return pin;
  }
  throw new Error("Hết mã PIN trống");
}

/** Thưởng chuỗi đúng liên tiếp: từ câu đúng thứ 2 trở đi +50 mỗi bậc, tối đa +250. */
export function streakBonus(streakAfter: number): number {
  return Math.min(Math.max(streakAfter - 1, 0), 5) * 50;
}

/** Đúng × (500 + 500 × phần thời gian còn lại) + thưởng chuỗi. Sai/hết giờ = 0. */
export function scoreAnswer(correct: boolean, elapsedMs: number, limitMs: number, streakAfter: number): number {
  if (!correct) return 0;
  const left = Math.min(1, Math.max(0, 1 - elapsedMs / limitMs));
  return Math.round(500 + 500 * left) + streakBonus(streakAfter);
}

export type LiveAnswerInput = { choice?: number; text?: string };

export function isCorrect(item: GameItem, a: LiveAnswerInput): boolean {
  if (item.kind === "choice") return typeof a.choice === "number" && a.choice === item.answer;
  return typeof a.text === "string" && a.text.trim() !== "" && normalizeShort(a.text) === normalizeShort(String(item.answer));
}

/** Tên hợp lệ: cắt khoảng trắng, 1–24 ký tự, không ký tự điều khiển. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: loại ký tự điều khiển
  const s = raw.normalize("NFC").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  return s.length >= 1 && s.length <= NAME_MAX ? s : null;
}

/** Điểm sổ điểm thang 10 = tỉ lệ câu đúng × 10, làm tròn 1 chữ số. */
export function gradebookScore(correctCount: number, total: number): number {
  return total <= 0 ? 0 : Math.round((correctCount / total) * 100) / 10;
}

/** Xếp hạng: điểm giảm dần, hoà thì nhiều câu đúng hơn, rồi tên. Hạng 1,2,3… theo vị trí (không chia hạng đồng). */
export function rankPlayers<T extends { name: string; score: number; correct: number }>(ps: readonly T[]): T[] {
  return [...ps].sort((a, b) => b.score - a.score || b.correct - a.correct || a.name.localeCompare(b.name, "vi"));
}
