import type { Ai, AiMessage } from "../../src/services/ai";
import * as chat from "../../src/tutor/prompts/vi/chat";
import * as learn from "../../src/tutor/prompts/vi/learning";
import * as q from "../../src/tutor/prompts/vi/question";
import * as book from "../../src/tutor/prompts/vi/book";

export type Call = { task: string; messages: AiMessage[]; json?: boolean };
const head = (s: string) => s.slice(0, 40);
const text = (m: AiMessage | undefined) => (typeof m?.content === "string" ? m.content : (m?.content.map((p) => (p.type === "text" ? p.text : "[ảnh]")).join(" ") ?? ""));

/** AI giả theo prompt hệ thống; ghi lại mọi lệnh gọi. `fail` = ném khi gọi các task này. */
export function fakeTutorAi(opts: { failTasks?: string[]; streamText?: string } = {}) {
  const calls: Call[] = [];
  const answer = opts.streamText ?? "Hằng đẳng thức $(a+b)^2=a^2+2ab+b^2$ [1]. Em thử áp dụng với $a=x$, $b=3$ nhé.";
  const is = (sys: string, c: string) => sys.startsWith(head(c));
  const respond = (task: string, messages: AiMessage[]): string => {
    const sys = text(messages[0]);
    const user = text(messages[messages.length - 1]);
    if (is(sys, chat.REWRITE_SYSTEM)) return "hằng đẳng thức bình phương của một tổng";
    if (is(sys, chat.TITLE_SYSTEM)) return "Bình phương một tổng";
    if (is(sys, chat.SUMMARY_SYSTEM)) return "Mục tiêu: học hằng đẳng thức.";
    if (is(sys, chat.ASK_HINT_SYSTEM)) return "Vì sao bình phương một tổng lại có hạng tử 2ab?";
    if (is(sys, chat.STARTERS_SYSTEM)) return "Hằng đẳng thức là gì?\nCho em ví dụ về bình phương một tổng.\nGợi ý bài khai triển giúp em.\nEm đã hiểu bài chưa?";
    if (is(sys, q.IDEA_SYSTEM)) return JSON.stringify({ ideas: [{ focus: "Nhận biết dạng", level: "NB", type: "mcq" }, { focus: "Khai triển", level: "TH", type: "true_false" }, { focus: "Tính giá trị", level: "VD", type: "short_answer" }] });
    if (is(sys, q.QUESTION_SYSTEM)) {
      if (user.includes("Loại câu: true_false")) return JSON.stringify({ type: "true_false", stem: "Xét các khẳng định về $(a+b)^2$", statements: ["$(a+b)^2=a^2+b^2$", "$(a+b)^2=a^2+2ab+b^2$", "$(a-b)^2=a^2-2ab+b^2$", "$(a+b)^2=a^2-2ab+b^2$"], answer: [false, true, true, false], explanation: "Theo hằng đẳng thức." });
      if (user.includes("Loại câu: short_answer")) return JSON.stringify({ type: "short_answer", stem: "Tính $(x+1)^2$ khi $x=2$", answer: "9", explanation: "$3^2=9$" });
      return JSON.stringify({ type: "mcq", stem: "Khai triển $(a+b)^2$ bằng", options: ["A. $a^2+b^2$", "B. $a^2+2ab+b^2$", "C. $a^2-2ab+b^2$", "D. $2a+2b$"], answer: 1, explanation: "Bình phương một tổng." });
    }
    if (is(sys, q.FOLLOWUP_SYSTEM)) return "Em sai ở chỗ thiếu hạng tử $2ab$.";
    if (is(sys, learn.TOPIC_SYSTEM)) return JSON.stringify({ description: "Làm chủ hằng đẳng thức", modules: [{ name: "Bình phương", objective: "Khai triển được bình phương", knowledge_points: [{ name: "Bình phương một tổng", type: "procedure" }, { name: "Bình phương một hiệu", type: "procedure" }] }, { name: "Hiệu hai bình phương", objective: "Phân tích được", knowledge_points: [{ name: "Hiệu hai bình phương", type: "concept" }] }] });
    if (is(sys, learn.DIAGNOSTIC_SYSTEM)) return JSON.stringify({ questions: [{ point: "Bình phương một tổng", question: "Khai triển $(a+b)^2$", answer: "a^2+2ab+b^2", explanation: "HĐT 1" }, { point: "Hiệu hai bình phương", question: "Phân tích $x^2-9$", answer: "(x-3)(x+3)", explanation: "HĐT 3" }] });
    if (is(sys, learn.PRACTICE_SYSTEM)) return JSON.stringify({ questions: [{ question: "Khai triển $(x+2)^2$", answer: "x^2+4x+4", explanation: "HĐT 1" }, { question: "Khai triển $(2x+1)^2$", answer: "4x^2+4x+1", explanation: "HĐT 1" }] });
    if (is(sys, learn.GRADE_SYSTEM)) {
      const items = JSON.parse(user) as { expected: string; answer: string }[];
      return JSON.stringify({ results: items.map((i) => ({ score: i.expected === i.answer ? 1 : 0, correct: i.expected === i.answer, feedback: i.expected === i.answer ? "Đúng" : "Chưa đúng" })) });
    }
    if (is(sys, learn.ERROR_DIAGNOSIS_SYSTEM)) return JSON.stringify({ diagnoses: [{ index: 0, error_type: "deviation", ai_confirmation: "Nhầm dấu", remediation: "Làm lại 3 bài tương tự" }] });
    if (is(sys, learn.EXPLAIN_SYSTEM)) return "Bình phương một tổng bằng tổng bình phương cộng hai lần tích [1].";
    if (is(sys, learn.FEYNMAN_SYSTEM)) return JSON.stringify({ passed: true, score: 0.9, feedback: "Em giải thích rõ", gap: "" });
    if (is(sys, learn.REVIEW_SYSTEM)) return "Ôn: bình phương một tổng.";
    if (is(sys, book.IDEATION_SYSTEM)) return JSON.stringify({ title: "Hằng đẳng thức đáng nhớ", description: "Giáo trình ngắn", scope: "Lớp 8", target_level: "introductory", estimated_chapters: 2 });
    if (is(sys, book.SPINE_SYSTEM)) return JSON.stringify({ chapters: [{ title: "Bình phương một tổng", learning_objectives: ["Khai triển được $(a+b)^2$"], content_type: "theory", summary: "HĐT số 1" }, { title: "Hiệu hai bình phương", learning_objectives: ["Phân tích được"], content_type: "practice", summary: "HĐT số 3" }] });
    if (is(sys, book.PLANNER_SYSTEM)) return JSON.stringify({ blocks: [{ type: "section", focus: "HĐT", transition_in: "", params: { role: "core" } }, { type: "callout", focus: "Lưu ý", transition_in: "Cần nhớ", params: { variant: "common_pitfall" } }, { type: "figure", focus: "Hình", params: {} }, { type: "flash_cards", focus: "Thẻ", params: { count: 3 } }, { type: "hologram", focus: "x", params: {} }] });
    if (is(sys, book.SECTION_SYSTEM)) return "### Công thức\n$(a+b)^2=a^2+2ab+b^2$ [1]";
    if (is(sys, book.CALLOUT_SYSTEM)) return "Đừng quên hạng tử $2ab$.";
    if (is(sys, book.FIGURE_SYSTEM)) return JSON.stringify({ title: "Hình vuông cạnh a+b", caption: "Diện tích chia 4 phần.", mermaid: "flowchart TD\nA-->B" });
    if (is(sys, book.FLASH_SYSTEM)) return JSON.stringify({ cards: [{ front: "$(a+b)^2$?", back: "$a^2+2ab+b^2$", hint: "" }] });
    return "OK";
  };
  const ai: Ai = {
    async chat(task, messages, o) {
      calls.push({ task, messages, json: o?.json });
      if (opts.failTasks?.includes(task)) throw new Error("fail");
      // essay grading dùng task cham_tu_luan
      if (task === "cham_tu_luan") return JSON.stringify({ score: 0.75, feedback: "Thiếu ý cuối" });
      return respond(task, messages);
    },
    async *stream(task, messages) {
      calls.push({ task, messages });
      for (const w of answer.match(/.{1,12}/gs) ?? []) yield w;
    },
  };
  return { ai, calls, answer };
}
