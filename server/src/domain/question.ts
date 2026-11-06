import { z } from "zod";
import { hasBalancedMath } from "./mathText";

export const LEVELS = ["NB", "TH", "VD"] as const; // Nhận biết, Thông hiểu, Vận dụng
export const QUESTION_TYPES = ["mcq", "true_false", "short_answer", "essay"] as const;

export const Level = z.enum(LEVELS);
export type Level = z.infer<typeof Level>;
export const QuestionType = z.enum(QUESTION_TYPES);
export type QuestionType = z.infer<typeof QuestionType>;

const MATH_MSG = "Công thức thiếu dấu $ đóng (ký hiệu đô la thường viết \\$)";
/** Chuỗi bắt buộc, cho phép công thức $…$. */
const mathText = () => z.string().trim().min(1).refine(hasBalancedMath, MATH_MSG);

const base = {
  subject: z.string().trim().normalize("NFC").min(1),
  /** 1–12: lớp phổ thông; 13–16: năm 1–4 đại học. */
  grade: z.number().int().min(1).max(16),
  topic: z.string().trim().normalize("NFC").min(1),
  level: Level,
  stem: mathText(),
  explanation: z.string().refine(hasBalancedMath, MATH_MSG).optional(),
  tags: z.array(z.string()).default([]),
};

export const McqQuestion = z.object({
  ...base,
  type: z.literal("mcq"),
  options: z.array(mathText()).length(4),
  /** Chỉ số phương án đúng 0–3 (A–D). */
  answer: z.number().int().min(0).max(3),
});

export const TrueFalseQuestion = z.object({
  ...base,
  type: z.literal("true_false"),
  statements: z.array(mathText()).length(4),
  answer: z.array(z.boolean()).length(4),
});

export const ShortAnswerQuestion = z.object({
  ...base,
  type: z.literal("short_answer"),
  answer: mathText(),
});

export const EssayQuestion = z.object({
  ...base,
  type: z.literal("essay"),
  rubric: mathText(),
  points: z.number().positive(),
});

export const QuestionInput = z.discriminatedUnion("type", [McqQuestion, TrueFalseQuestion, ShortAnswerQuestion, EssayQuestion]);
export type QuestionInput = z.infer<typeof QuestionInput>;
export type StoredQuestion = QuestionInput & { id: string };

export function parseQuestion(input: unknown): QuestionInput {
  return QuestionInput.parse(input);
}

export const QuestionFilter = z.object({
  subject: z.string().trim().normalize("NFC").min(1),
  grade: z.coerce.number().int().min(1).max(16),
  topic: z.string().trim().normalize("NFC").min(1).optional(),
  level: Level.optional(),
  type: QuestionType.optional(),
  limit: z.coerce.number().int().min(1).max(10000).optional(),
});
export type QuestionFilter = z.infer<typeof QuestionFilter>;
