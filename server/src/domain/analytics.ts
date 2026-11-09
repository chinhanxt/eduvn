// server/src/domain/analytics.ts
import { type SubmissionStatus, toScore10 } from "./assignment";
import type { QuestionType } from "./question";
import { round2 } from "./scoring";

/** Thống kê cổ điển (CTT) cho một bài giao, tính trên các dòng answer_items (lớp nhỏ nên tính trong bộ nhớ).
 *  p = điểm đạt / điểm tối đa; D = p(nhóm 27% cao) − p(nhóm 27% thấp), chỉ tính khi ≥ 10 bài. */
export type RosterRow = { id: string; seat: number | null; fullName: string };
export type SubRow = {
  id: string;
  studentId: string;
  attempt: number;
  status: SubmissionStatus;
  score: number | null;
  maxScore: number | null;
  pending: number;
  leaveCount: number;
  answered: number;
  startedAt: Date;
  submittedAt: Date | null;
  updatedAt: Date;
};
export type ItemRow = { submissionId: string; questionId: string; topic: string; level: string; type: QuestionType; points: number | null; maxPoints: number; correct: boolean | null; choice: string | null };
/** label = số câu trong mã đề đầu tiên (để GV đối chiếu đề). */
export type QuestionMeta = { questionId: string; label: number; stem: string };

export const MIN_FOR_D = 10;
export type ItemFlag = "Khó" | "Dễ" | "Xem lại";
export type ItemStat = {
  questionId: string;
  label: number;
  stem: string;
  topic: string;
  level: string;
  type: QuestionType;
  n: number;
  p: number | null;
  d: number | null;
  flag: ItemFlag | null;
  choices: { choice: string; count: number; correct: boolean }[];
};
export type StudentRef = { studentId: string; fullName: string; score10: number };
export type AtRisk = { studentId: string; fullName: string; seat: number | null; score10: number | null; reasons: string[] };
export type AssignmentStats = {
  rosterSize: number;
  started: number;
  submitted: number;
  /** 0–1 */
  submitRate: number;
  mean: number | null;
  median: number | null;
  best: StudentRef | null;
  worst: StudentRef | null;
  /** 10 ô theo thang 10: [0,1), [1,2), …, [9,10]. */
  distribution: number[];
  items: ItemStat[];
  topics: { topic: string; n: number; rate: number }[];
  atRisk: AtRisk[];
};

const finalized = (s: SubRow) => s.status !== "in_progress";

/** Mỗi HS lấy lượt đã nộp có điểm thang 10 cao nhất (bằng nhau thì lượt sau). */
export function bestByStudent(subs: readonly SubRow[]): Map<string, SubRow> {
  const out = new Map<string, SubRow>();
  for (const s of subs) {
    if (!finalized(s)) continue;
    const cur = out.get(s.studentId);
    const a = toScore10(s.score, s.maxScore) ?? -1;
    const b = cur ? (toScore10(cur.score, cur.maxScore) ?? -1) : -2;
    if (!cur || a > b || (a === b && s.attempt > cur.attempt)) out.set(s.studentId, s);
  }
  return out;
}

const pOf = (rows: readonly ItemRow[]): number | null => {
  const graded = rows.filter((r) => r.points !== null);
  const max = graded.reduce((s, r) => s + r.maxPoints, 0);
  return graded.length && max > 0 ? graded.reduce((s, r) => s + (r.points ?? 0), 0) / max : null;
};

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return round2(s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2);
}

export function analyze(input: { roster: readonly RosterRow[]; subs: readonly SubRow[]; items: readonly ItemRow[]; questions: readonly QuestionMeta[]; dueAt: Date; now: Date }): AssignmentStats {
  const { roster, subs, now, dueAt } = input;
  const names = new Map(roster.map((r) => [r.id, r]));
  const best = bestByStudent(subs);
  const chosen = new Set([...best.values()].map((s) => s.id));
  const items = input.items.filter((i) => chosen.has(i.submissionId));
  const scored = [...best.values()]
    .map((s) => ({ s, v: toScore10(s.score, s.maxScore) }))
    .filter((x): x is { s: SubRow; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
  const values = scored.map((x) => x.v);
  const distribution = Array.from({ length: 10 }, () => 0);
  for (const v of values) distribution[Math.min(9, Math.floor(v))]! += 1;
  const ref = (x: { s: SubRow; v: number } | undefined): StudentRef | null => (x ? { studentId: x.s.studentId, fullName: names.get(x.s.studentId)?.fullName ?? "", score10: x.v } : null);

  const k = Math.max(1, Math.round(0.27 * scored.length));
  const upper = new Set(scored.slice(0, k).map((x) => x.s.id));
  const lower = new Set(scored.slice(-k).map((x) => x.s.id));
  const enough = scored.length >= MIN_FOR_D;

  const byQ = new Map<string, ItemRow[]>();
  for (const r of items) (byQ.get(r.questionId) ?? byQ.set(r.questionId, []).get(r.questionId)!).push(r);
  const meta = new Map(input.questions.map((q) => [q.questionId, q]));
  const itemStats: ItemStat[] = [...byQ.entries()].map(([questionId, rows]) => {
    const first = rows[0] as ItemRow;
    const p = pOf(rows);
    const pu = pOf(rows.filter((r) => upper.has(r.submissionId)));
    const pl = pOf(rows.filter((r) => lower.has(r.submissionId)));
    const d = enough && pu !== null && pl !== null ? round2(pu - pl) : null;
    const flag: ItemFlag | null = p === null ? null : p < 0.3 ? "Khó" : p > 0.9 ? "Dễ" : d !== null && d < 0.2 ? "Xem lại" : null;
    const counts = new Map<string, { count: number; correct: boolean }>();
    for (const r of rows) {
      if (r.choice === null) continue;
      const c = counts.get(r.choice) ?? { count: 0, correct: false };
      c.count++;
      c.correct ||= r.correct === true;
      counts.set(r.choice, c);
    }
    const choices = [...counts.entries()]
      .map(([choice, c]) => ({ choice, ...c }))
      .sort((a, b) => b.count - a.count || a.choice.localeCompare(b.choice))
      .slice(0, 5);
    const m = meta.get(questionId);
    return { questionId, label: m?.label ?? 0, stem: m?.stem ?? "", topic: first.topic, level: first.level, type: first.type, n: rows.filter((r) => r.points !== null).length, p: p === null ? null : round2(p), d, flag, choices };
  });
  itemStats.sort((a, b) => a.label - b.label);

  const byTopic = new Map<string, ItemRow[]>();
  for (const r of items) if (r.points !== null) (byTopic.get(r.topic) ?? byTopic.set(r.topic, []).get(r.topic)!).push(r);
  const topics = [...byTopic.entries()].map(([topic, rows]) => ({ topic, n: rows.length, rate: round2(pOf(rows) ?? 0) })).sort((a, b) => a.rate - b.rate || a.topic.localeCompare(b.topic, "vi"));

  const pastDue = now.getTime() >= dueAt.getTime();
  const atRisk: AtRisk[] = [];
  for (const r of roster) {
    const mine = subs.filter((s) => s.studentId === r.id);
    const b = best.get(r.id);
    const s10 = b ? toScore10(b.score, b.maxScore) : null;
    const reasons: string[] = [];
    if (!b && pastDue) reasons.push(mine.length ? "Chưa nộp" : "Chưa vào bài");
    if (s10 !== null && s10 < 5) reasons.push("Dưới 5 điểm");
    const leaves = mine.reduce((m, s) => Math.max(m, s.leaveCount), 0);
    if (leaves >= 3) reasons.push(`Rời bài ${leaves} lần`);
    if (reasons.length) atRisk.push({ studentId: r.id, fullName: r.fullName, seat: r.seat, score10: s10, reasons });
  }
  atRisk.sort((a, b) => b.reasons.length - a.reasons.length || (a.score10 ?? -1) - (b.score10 ?? -1));

  return {
    rosterSize: roster.length,
    started: new Set(subs.map((s) => s.studentId)).size,
    submitted: best.size,
    submitRate: roster.length ? round2(best.size / roster.length) : 0,
    mean: values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null,
    median: median(values),
    best: ref(scored[0]),
    worst: ref(scored[scored.length - 1]),
    distribution,
    items: itemStats,
    topics,
    atRisk,
  };
}

export type MonitorState = "chua_vao" | "dang_lam" | "da_nop" | "tu_nop";
export type MonitorRow = {
  studentId: string;
  seat: number | null;
  fullName: string;
  state: MonitorState;
  answered: number;
  total: number;
  leaveCount: number;
  score10: number | null;
  updatedAt: string | null;
  submissionId: string | null;
};

/** Theo dõi trực tiếp: lượt mới nhất của từng HS. */
export function buildMonitor(roster: readonly RosterRow[], subs: readonly SubRow[], total: number): { counts: Record<MonitorState, number>; rows: MonitorRow[] } {
  const latest = new Map<string, SubRow>();
  for (const s of subs) {
    const cur = latest.get(s.studentId);
    if (!cur || s.attempt > cur.attempt) latest.set(s.studentId, s);
  }
  const counts: Record<MonitorState, number> = { chua_vao: 0, dang_lam: 0, da_nop: 0, tu_nop: 0 };
  const rows = roster.map((r): MonitorRow => {
    const s = latest.get(r.id);
    const state: MonitorState = !s ? "chua_vao" : s.status === "in_progress" ? "dang_lam" : s.status === "submitted" ? "da_nop" : "tu_nop";
    counts[state]++;
    return {
      studentId: r.id,
      seat: r.seat,
      fullName: r.fullName,
      state,
      answered: s?.answered ?? 0,
      total,
      leaveCount: s?.leaveCount ?? 0,
      score10: s ? toScore10(s.score, s.maxScore) : null,
      updatedAt: s ? s.updatedAt.toISOString() : null,
      submissionId: s?.id ?? null,
    };
  });
  return { counts, rows };
}

export type ResultRow = {
  studentId: string;
  seat: number | null;
  fullName: string;
  submissionId: string | null;
  status: SubmissionStatus | null;
  attempts: number;
  score: number | null;
  maxScore: number | null;
  score10: number | null;
  pending: number;
  leaveCount: number;
  submittedAt: string | null;
};

/** Bảng điểm GV: mỗi HS một dòng (lượt tốt nhất; chưa nộp thì lượt đang làm nếu có). */
export function resultRows(roster: readonly RosterRow[], subs: readonly SubRow[]): ResultRow[] {
  const best = bestByStudent(subs);
  return roster.map((r) => {
    const mine = subs.filter((s) => s.studentId === r.id);
    const s = best.get(r.id) ?? mine.find((x) => x.status === "in_progress");
    return {
      studentId: r.id,
      seat: r.seat,
      fullName: r.fullName,
      submissionId: s?.id ?? null,
      status: s?.status ?? null,
      attempts: mine.length,
      score: s && finalized(s) ? s.score : null,
      maxScore: s && finalized(s) ? s.maxScore : null,
      score10: s && finalized(s) ? toScore10(s.score, s.maxScore) : null,
      pending: s?.pending ?? 0,
      leaveCount: mine.reduce((m, x) => Math.max(m, x.leaveCount), 0),
      submittedAt: s?.submittedAt ? s.submittedAt.toISOString() : null,
    };
  });
}
