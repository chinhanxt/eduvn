import type { Level, QuestionType } from "./question";
import type { ExamMatrix } from "./matrix";
import { type PointRules, maxPoints, round2 } from "./scoring";
import type { Variant } from "./variants";

export const LEVEL_ORDER: readonly Level[] = ["NB", "TH", "VD"];
export const TYPE_ORDER: readonly QuestionType[] = ["mcq", "true_false", "short_answer", "essay"];
export const LEVEL_VI: Record<Level, string> = { NB: "Biết", TH: "Hiểu", VD: "Vận dụng" };
export const TYPE_VI: Record<QuestionType, string> = {
  mcq: "Phần I. Nhiều lựa chọn",
  true_false: "Phần II. Đúng/sai",
  short_answer: "Phần III. Trả lời ngắn",
  essay: "Tự luận",
};

type Bucket = { count: number; points: number };
const empty = (): Bucket => ({ count: 0, points: 0 });

export type MatrixReport = {
  subject: string;
  grade: number;
  topics: { topic: string; cells: Record<QuestionType, Record<Level, Bucket>>; count: number; points: number; percent: number }[];
  /** Tổng theo dạng câu × mức độ. */
  columns: Record<QuestionType, Record<Level, Bucket>>;
  totalCount: number;
  totalPoints: number;
  levelRatio: Record<Level, { count: number; points: number; percent: number }>;
  /** Bản đặc tả: chủ đề × mức độ. */
  spec: { topic: string; level: Level; yccd: string; counts: Record<QuestionType, number> }[];
  warnings: string[];
};

const grid = (): Record<QuestionType, Record<Level, Bucket>> => ({
  mcq: { NB: empty(), TH: empty(), VD: empty() },
  true_false: { NB: empty(), TH: empty(), VD: empty() },
  short_answer: { NB: empty(), TH: empty(), VD: empty() },
  essay: { NB: empty(), TH: empty(), VD: empty() },
});

const unitPoints = (t: Exclude<QuestionType, "essay">, rules: PointRules) =>
  t === "mcq" ? rules.mcq : t === "true_false" ? rules.trueFalseByCorrect[4] : rules.shortAnswer;

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

/**
 * Ma trận + đặc tả (CV 7991). Điểm từng ô: lấy từ câu thật của một mã đề (để tự luận đúng điểm);
 * không có mã đề thì suy từ luật điểm (tự luận mặc định 1 điểm/câu).
 */
export function buildMatrixReport(matrix: ExamMatrix, rules: PointRules, variant?: Variant): MatrixReport {
  const topicsOrder: string[] = [];
  const perTopic = new Map<string, Record<QuestionType, Record<Level, Bucket>>>();
  const yccdOf = new Map<string, string[]>();
  const ensure = (topic: string) => {
    let g = perTopic.get(topic);
    if (!g) {
      g = grid();
      perTopic.set(topic, g);
      topicsOrder.push(topic);
    }
    return g;
  };

  for (const c of matrix.cells) {
    const b = ensure(c.topic)[c.type][c.level];
    b.count += c.count;
    if (!variant) b.points += c.type === "essay" ? c.count : round2(c.count * unitPoints(c.type, rules));
    if (c.yccd) {
      const k = `${c.topic}\u0000${c.level}`;
      const l = yccdOf.get(k) ?? [];
      if (!l.includes(c.yccd)) l.push(c.yccd);
      yccdOf.set(k, l);
    }
  }
  if (variant) {
    // chỉ tính các câu thuộc ô của ma trận (ghi đè điểm ước lượng)
    for (const g of perTopic.values()) for (const t of TYPE_ORDER) for (const l of LEVEL_ORDER) g[t][l].points = 0;
    for (const it of variant.items) {
      const q = it.question;
      const b = perTopic.get(q.topic)?.[q.type]?.[q.level];
      if (b) b.points = round2(b.points + maxPoints(q, rules));
    }
  }

  const columns = grid();
  const levelRatio = { NB: { count: 0, points: 0, percent: 0 }, TH: { count: 0, points: 0, percent: 0 }, VD: { count: 0, points: 0, percent: 0 } };
  let totalCount = 0;
  let totalPoints = 0;
  for (const g of perTopic.values())
    for (const t of TYPE_ORDER)
      for (const l of LEVEL_ORDER) {
        const b = g[t][l];
        columns[t][l].count += b.count;
        columns[t][l].points = round2(columns[t][l].points + b.points);
        levelRatio[l].count += b.count;
        levelRatio[l].points = round2(levelRatio[l].points + b.points);
        totalCount += b.count;
        totalPoints = round2(totalPoints + b.points);
      }
  for (const l of LEVEL_ORDER) levelRatio[l].percent = pct(levelRatio[l].points, totalPoints);

  const topics = topicsOrder.map((topic) => {
    const cells = perTopic.get(topic) ?? grid();
    let count = 0;
    let points = 0;
    for (const t of TYPE_ORDER) for (const l of LEVEL_ORDER) {
      count += cells[t][l].count;
      points = round2(points + cells[t][l].points);
    }
    return { topic, cells, count, points, percent: pct(points, totalPoints) };
  });

  const spec: MatrixReport["spec"] = [];
  for (const topic of topicsOrder)
    for (const level of LEVEL_ORDER) {
      const g = perTopic.get(topic) ?? grid();
      const counts = { mcq: g.mcq[level].count, true_false: g.true_false[level].count, short_answer: g.short_answer[level].count, essay: g.essay[level].count };
      if (Object.values(counts).every((n) => n === 0)) continue;
      spec.push({ topic, level, yccd: (yccdOf.get(`${topic}\u0000${level}`) ?? []).join("; "), counts });
    }

  const warnings: string[] = [];
  if (totalPoints !== 10) warnings.push(`Tổng điểm là ${String(totalPoints).replace(".", ",")}, chưa đạt 10 điểm`);

  return { subject: matrix.subject, grade: matrix.grade, topics, columns, totalCount, totalPoints, levelRatio, spec, warnings };
}
