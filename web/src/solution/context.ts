// web/src/solution/context.ts — phần thuần (có test): ngữ cảnh gửi gia sư khi HS bấm "Chưa hiểu bước này".
import type { Solution } from "./types";

/** Lời nhắn gửi gia sư khi HS bấm "Chưa hiểu bước này": đề + các bước trước + bước đang vướng. */
export function stuckMessage(s: Pick<Solution, "problem" | "steps">, index: number): string {
  const prev = s.steps.slice(0, index).map((st, i) => `Bước ${i + 1} — ${st.title}: ${st.body}`).join("\n");
  const cur = s.steps[index]!;
  return `Em đang xem lời giải bài sau và chưa hiểu bước ${index + 1}.\n\nĐề bài:\n${s.problem}\n\n${prev ? `Các bước trước:\n${prev}\n\n` : ""}Bước em chưa hiểu — Bước ${index + 1}: ${cur.title}\n${cur.body}\n\nThầy/cô gợi ý từng chút để em tự hiểu bước này (vì sao làm vậy, dùng kiến thức gì), đừng giải lại cả bài nhé.`;
}
