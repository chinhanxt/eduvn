import { z } from "zod";
import type { QuestionInput } from "./question";

export type PointRules = {
  mcq: number;
  /** Điểm theo số ý đúng 0..4 của câu đúng/sai. */
  trueFalseByCorrect: readonly [number, number, number, number, number];
  shortAnswer: number;
};

/** CV 7991/BGDĐT-GDTrH. */
export const DEFAULT_RULES: PointRules = { mcq: 0.25, trueFalseByCorrect: [0, 0.1, 0.25, 0.5, 1], shortAnswer: 0.25 };
export const MATH_RULES: PointRules = { ...DEFAULT_RULES, shortAnswer: 0.5 };

export const ResponseValue = z.union([z.number().int(), z.array(z.boolean().nullable()), z.string(), z.null()]);
export type ResponseValue = z.infer<typeof ResponseValue>;

function foldVietnamese(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}

export function rulesForSubject(subject: string): PointRules {
  return foldVietnamese(subject).startsWith("toan") ? MATH_RULES : DEFAULT_RULES;
}

export function normalizeShort(s: string): string {
  return s.normalize("NFC").trim().toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function maxPoints(q: QuestionInput, rules: PointRules): number {
  switch (q.type) {
    case "mcq":
      return rules.mcq;
    case "true_false":
      return rules.trueFalseByCorrect[4];
    case "short_answer":
      return rules.shortAnswer;
    case "essay":
      return q.points;
  }
}

export function scoreItem(q: QuestionInput, r: ResponseValue | undefined, rules: PointRules = DEFAULT_RULES): number | null {
  switch (q.type) {
    case "mcq":
      return r === q.answer ? rules.mcq : 0;
    case "true_false": {
      if (!Array.isArray(r) || r.length !== 4) return 0;
      const correct = q.answer.filter((v, i) => r[i] === v).length;
      return rules.trueFalseByCorrect[correct] ?? 0;
    }
    case "short_answer":
      return typeof r === "string" && normalizeShort(r) === normalizeShort(q.answer) ? rules.shortAnswer : 0;
    case "essay":
      return null;
  }
}
