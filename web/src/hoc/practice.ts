// Hàm thuần màn Luyện tập (cổng Học v2) — có test.

export type PQ = { id: string; type: "mcq" | "true_false" | "short_answer" | "essay"; topic: string; level: string; stem: string; options?: string[]; statements?: string[]; points?: number };
export type Next = { mode: "review" | "new" | "done"; question: PQ | null; counts: { due: number; new: number } };
export type Result = { correct: boolean; partial: boolean; score: number; max: number; graded: string; feedback: string; explanation: string | null; answer: unknown; rating: string; nextDueAt: string; intervalDays: number };
export type Stats = { learned: number; due: number; mistakes: number; accuracy: number | null; answered: number; daily: { date: string; answered: number; correct: number }[]; topics: { topic: string; learned: number; mistakes: number; due: number }[] };
export type Mark = "ok" | "bad" | "part";

const LEVEL: Record<string, [string, number]> = { NB: ["Nhận biết", 1], TH: ["Thông hiểu", 2], VD: ["Vận dụng", 3], VDC: ["Vận dụng cao", 4] };
/** "TH" → ["Thông hiểu", 2] (bậc 1–4 cho chấm màu .lvl.lN); mã lạ giữ nguyên, bậc 2. */
export const levelOf = (code: string): [string, number] => LEVEL[code.toUpperCase()] ?? [code, 2];

/** Trạng thái một phương án sau khi chấm: đáp án đúng, em chọn sai, mờ; chưa chấm: chọn/không. */
export function optState(i: number, resp: unknown, key: unknown, locked: boolean): "right" | "wrong" | "dim" | "on" | "" {
  if (!locked) return resp === i ? "on" : "";
  if (key === i) return "right";
  if (resp === i) return "wrong";
  return "dim";
}
/** Đã đủ câu trả lời để nộp chưa (đúng/sai cần đủ mọi ý). */
export function canSubmit(q: Pick<PQ, "type" | "statements">, resp: unknown): boolean {
  if (resp === null || resp === undefined) return false;
  if (q.type === "true_false") return Array.isArray(resp) && resp.length === (q.statements?.length ?? 4) && resp.every((x) => x === true || x === false);
  if (typeof resp === "string") return resp.trim() !== "";
  return typeof resp === "number";
}
export const markOf = (r: Pick<Result, "correct" | "partial">): Mark => (r.correct ? "ok" : r.partial ? "part" : "bad");

/** "sau 10 phút" / "trong hôm nay" / "sau 3 ngày". */
export function againIn(days: number): string {
  if (days < 1 / 24) return `sau ${Math.max(1, Math.round(days * 24 * 60))} phút`;
  if (days < 1) return "trong hôm nay";
  return `sau ${Math.round(days)} ngày`;
}
/** "2′40″" từ số giây. */
export const clockText = (s: number): string => {
  const m = Math.floor(s / 60);
  return m ? `${m}′${String(s % 60).padStart(2, "0")}″` : `${s}″`;
};
/** Chấm tiến độ phiên: thẻ đã làm + thẻ đang làm + chỗ trống tới tổng (ít nhất 8 chấm). */
export function sessionDots(marks: readonly Mark[], due: number, current: boolean): ("ok" | "bad" | "part" | "cur" | "")[] {
  const out: ("ok" | "bad" | "part" | "cur" | "")[] = [...marks];
  if (current) out.push("cur");
  const total = Math.min(30, Math.max(8, marks.length + (current ? 1 : 0) + Math.max(0, due - (current ? 1 : 0))));
  while (out.length < total) out.push("");
  return out.slice(0, Math.max(total, out.length));
}
