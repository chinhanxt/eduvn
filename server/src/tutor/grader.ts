// Chấm ngữ nghĩa qua AI. Port từ DeepTutor deeptutor/learning/semantic_assessment.py và
// capabilities/ask_questions quiz_judge (Apache-2.0), đã sửa: gọi cổng AI, JSON có kiểm.
import type { QuestionInput } from "../domain/question";
import { type Ai, parseAiJson } from "../services/ai";
import { GRADE_SYSTEM } from "./prompts/vi/learning";
import { TASK } from "./tasks";

export type ShortItem = { question: string; expected: string; answer: string };
export type ShortResult = { score: number; correct: boolean; feedback: string };

/** Chấm nhiều câu trả lời ngắn theo nghĩa. Lỗi AI → ném (nơi gọi quyết định rơi về chấm cứng). */
export async function gradeShortAnswers(ai: Ai, items: ShortItem[]): Promise<ShortResult[]> {
  if (!items.length) return [];
  const raw = await ai.chat(TASK.aux, [{ role: "system", content: GRADE_SYSTEM }, { role: "user", content: JSON.stringify(items) }], { json: true, signal: AbortSignal.timeout(45_000) });
  const parsed = parseAiJson(raw) as { results?: { score?: number; correct?: boolean; feedback?: string }[] };
  const results = parsed.results ?? [];
  return items.map((_, i) => {
    const r = results[i] ?? {};
    const score = typeof r.score === "number" ? Math.min(1, Math.max(0, r.score)) : r.correct ? 1 : 0;
    return { score, correct: r.correct ?? score >= 0.8, feedback: String(r.feedback ?? "") };
  });
}

/** Chấm tự luận theo rubric của câu trong ngân hàng; trả điểm 0..1. */
export async function gradeEssay(ai: Ai, q: Extract<QuestionInput, { type: "essay" }>, answer: string): Promise<ShortResult> {
  const system = `Bạn là giáo viên chấm bài tự luận theo thang chấm (rubric) được đưa. Chấm từng ý, cho điểm rộng lượng với cách diễn đạt khác nhưng đúng bản chất. Trả về JSON: {"score":0.0,"feedback":"nhận xét 2-3 câu, nêu ý đã đúng và ý còn thiếu"}; score từ 0 đến 1 là tỉ lệ so với điểm tối đa. Chỉ trả JSON.`;
  const raw = await ai.chat(TASK.grade, [{ role: "system", content: system }, { role: "user", content: `Đề: ${q.stem}\n\nRubric (tối đa ${q.points} điểm):\n${q.rubric}\n\nBài làm của em:\n${answer}` }], { json: true });
  const p = parseAiJson(raw) as { score?: number; feedback?: string };
  const score = Math.min(1, Math.max(0, Number(p.score ?? 0)));
  return { score, correct: score >= 0.8, feedback: String(p.feedback ?? "") };
}
