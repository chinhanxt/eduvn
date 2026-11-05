import type { QuestionInput, QuestionType, StoredQuestion } from "./question";
import { type Rng, mulberry32, shuffle } from "./rng";
import { DEFAULT_RULES, type PointRules, type ResponseValue, maxPoints, round2, scoreItem } from "./scoring";

export const SECTION_ORDER: readonly QuestionType[] = ["mcq", "true_false", "short_answer", "essay"];

export type VariantItem = { no: number; section: QuestionType; sectionNo: number; questionId: string; question: QuestionInput };
export type Variant = { code: string; items: VariantItem[] };

function withShuffledOptions(q: StoredQuestion, rng: Rng): QuestionInput {
  if (q.type !== "mcq") return q;
  const order = shuffle([0, 1, 2, 3], rng);
  return { ...q, options: order.map((i) => q.options[i] as string), answer: order.indexOf(q.answer) };
}

export function makeVariants(questions: readonly StoredQuestion[], count: number, seed: number, firstCode = 101): Variant[] {
  if (!Number.isInteger(count) || count < 1) throw new Error("count must be a positive integer");
  return Array.from({ length: count }, (_, v) => {
    const rng = mulberry32(seed + v);
    const items: VariantItem[] = [];
    for (const section of SECTION_ORDER) {
      const inSection = shuffle(
        questions.filter((q) => q.type === section),
        rng,
      );
      inSection.forEach((q, i) => {
        items.push({ no: items.length + 1, section, sectionNo: i + 1, questionId: q.id, question: withShuffledOptions(q, rng) });
      });
    }
    return { code: String(firstCode + v), items };
  });
}

export type KeyEntry = { no: number; section: QuestionType; sectionNo: number; answer: string };

const LETTERS = ["A", "B", "C", "D"] as const;

function keyOf(q: QuestionInput): string {
  switch (q.type) {
    case "mcq":
      return LETTERS[q.answer] ?? "?";
    case "true_false":
      return q.answer.map((b) => (b ? "Đ" : "S")).join("");
    case "short_answer":
      return q.answer;
    case "essay":
      return "Tự luận";
  }
}

export function answerKey(v: Variant): KeyEntry[] {
  return v.items.map((it) => ({ no: it.no, section: it.section, sectionNo: it.sectionNo, answer: keyOf(it.question) }));
}

export type GradeResult = { total: number; autoMax: number; pendingEssay: number[]; items: { no: number; points: number | null }[] };

export function gradeVariant(v: Variant, responses: Record<number, ResponseValue>, rules: PointRules = DEFAULT_RULES): GradeResult {
  const items = v.items.map((it) => ({ no: it.no, points: scoreItem(it.question, responses[it.no], rules) }));
  const total = round2(items.reduce((s, i) => s + (i.points ?? 0), 0));
  const autoMax = round2(v.items.reduce((s, it) => s + (it.question.type === "essay" ? 0 : maxPoints(it.question, rules)), 0));
  return { total, autoMax, pendingEssay: items.filter((i) => i.points === null).map((i) => i.no), items };
}
