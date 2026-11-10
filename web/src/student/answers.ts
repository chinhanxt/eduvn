import type { AnswerValue, Answers } from "./types";

/** Giống server/src/domain/assignment.ts: đúng/sai phải đủ 4 ý mới tính là đã làm. */
export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.every((x) => x !== null);
  return v.trim() !== "";
}
/** Đúng/sai mới chọn vài ý: hiện "làm dở" trên bảng số câu. */
export const isPartial = (v: AnswerValue | undefined): boolean => Array.isArray(v) && !isAnswered(v) && v.some((x) => x !== null);
export const answeredCount = (a: Answers, nos: readonly number[]): number => nos.filter((n) => isAnswered(a[String(n)])).length;
export const unanswered = (a: Answers, nos: readonly number[]): number[] => nos.filter((n) => !isAnswered(a[String(n)]));
