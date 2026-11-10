import type { QuizQ } from "../../../server/src/export/slideHtml";

export const estimateMs = (text: string) => Math.max(1500, Math.round((text.length / 14) * 1000));

const MAX_CUE = 140;
/** Câu quá dài chia tiếp ở dấu phẩy/hai chấm hoặc khoảng trắng gần giữa (khớp server/src/export/aiLessonTimeline.ts). */
function halve(c: string): string[] {
  if (c.length <= MAX_CUE) return [c];
  const mid = c.length / 2;
  let best = -1;
  let bd = Number.POSITIVE_INFINITY;
  for (const m of c.matchAll(/[,:;] |\s/g)) {
    const pos = (m.index ?? 0) + (m[0].length > 1 ? 1 : 0);
    const d = Math.abs(pos - mid) - (m[0].length > 1 ? 25 : 0);
    if (pos > 20 && pos < c.length - 20 && d < bd) {
      bd = d;
      best = pos;
    }
  }
  if (best < 0) return [c];
  return [...halve(c.slice(0, best).trim()), ...halve(c.slice(best).trim())];
}

/** Chia lời giảng theo câu (khớp server/src/export/aiLessonTimeline.ts). */
export function splitCues(text: string, durationMs: number): { text: string; startMs: number; durationMs: number }[] {
  const parts = (text.match(/[^.!?…;\n]+[.!?…;]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  const merged: string[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.length < 40) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p);
  }
  const chunks = merged.length > 0 ? merged.flatMap(halve) : [text];
  const total = chunks.reduce((n, c) => n + c.length, 0) || 1;
  let t = 0;
  return chunks.map((c, i) => {
    const d = i === chunks.length - 1 ? durationMs - t : Math.round((c.length / total) * durationMs);
    const cue = { text: c, startMs: t, durationMs: Math.max(d, 200) };
    t += d;
    return cue;
  });
}

/** Chấm quiz: single/multiple so đáp án; short_answer không chấm. */
export function gradeQuestion(q: QuizQ, picked: string[]): "dung" | "sai" | "khong-cham" {
  if (q.type === "short_answer" || !q.answer?.length) return "khong-cham";
  const a = [...q.answer].sort().join("|");
  return [...picked].sort().join("|") === a ? "dung" : "sai";
}

/** px ⇄ cqw trong HTML phần tử khi sửa chữ trực tiếp. */
export const cqwToPx = (html: string) => html.replace(/(-?\d*\.?\d+)cqw/g, (_m, n: string) => `${Math.round(Number(n) * 100) / 10}px`);

/** Giá trị trường nhập → giá trị thật theo kiểu của ví dụ (số, chữ, bật/tắt, còn lại là JSON). */
export function coerceField(example: unknown, raw: string | boolean): unknown {
  if (typeof example === "number") return Number(raw);
  if (typeof example === "boolean") return raw === true || raw === "true";
  if (typeof example === "string") return String(raw);
  return JSON.parse(String(raw));
}
