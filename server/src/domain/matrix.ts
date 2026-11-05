import { z } from "zod";
import { Level, QuestionType, type StoredQuestion } from "./question";
import { type Rng, shuffle } from "./rng";

export const MatrixCell = z.object({
  topic: z.string().trim().normalize("NFC").min(1),
  level: Level,
  type: QuestionType,
  count: z.number().int().positive(),
});
export type MatrixCell = z.infer<typeof MatrixCell>;

export const ExamMatrix = z.object({
  subject: z.string().trim().normalize("NFC").min(1),
  grade: z.number().int().min(1).max(16),
  cells: z.array(MatrixCell).min(1),
});
export type ExamMatrix = z.infer<typeof ExamMatrix>;

export type Shortage = { cell: MatrixCell; need: number; have: number };

export function selectQuestions(
  pool: readonly StoredQuestion[],
  matrix: ExamMatrix,
  rng: Rng,
): { selected: StoredQuestion[]; shortages: Shortage[] } {
  const used = new Set<string>();
  const selected: StoredQuestion[] = [];
  const shortages: Shortage[] = [];

  for (const cell of matrix.cells) {
    const candidates = pool.filter(
      (q) =>
        !used.has(q.id) &&
        q.subject === matrix.subject &&
        q.grade === matrix.grade &&
        q.topic === cell.topic &&
        q.level === cell.level &&
        q.type === cell.type,
    );
    if (candidates.length < cell.count) shortages.push({ cell, need: cell.count, have: candidates.length });
    for (const q of shuffle(candidates, rng).slice(0, cell.count)) {
      used.add(q.id);
      selected.push(q);
    }
  }
  return { selected, shortages };
}
