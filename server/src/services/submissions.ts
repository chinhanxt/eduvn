import { randomInt } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { StudentActor } from "../auth/student";
import type { Db } from "../db/client";
import { answerItems, assignments, submissionEvents, submissions } from "../db/schema";
import {
  type Answers,
  type AssignmentKind,
  type PublicItem,
  type ResultLevel,
  type ReviewItem,
  type StudentState,
  type SubmissionStatus,
  SaveBody,
  answeredCount,
  computeDeadline,
  displayOrder,
  gradeAnswers,
  isExpired,
  pickVariant,
  publicItems,
  resultLevel,
  reviewItems,
  saveCutoff,
  studentState,
  toScore10,
  variantByCode,
} from "../domain/assignment";
import { ConflictError, NotFoundError } from "../errors";
import { loadFreshStudent } from "./credentials";

export type RoomPayload = {
  submission: { id: string; attempt: number; status: SubmissionStatus; seq: number; answers: Answers; startedAt: string; deadlineAt: string; variantCode: string };
  assignment: { id: string; title: string; kind: AssignmentKind; subject: string; durationMinutes: number | null; dueAt: string; attemptsAllowed: number };
  questions: PublicItem[];
  serverNow: string;
};
export type SaveResult = { ok: true; seq: number; serverNow: string; deadlineAt: string };
export type StudentResult = {
  submissionId: string;
  assignmentId: string;
  title: string;
  status: SubmissionStatus;
  attempt: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  canRetry: boolean;
  score: number | null;
  maxScore: number | null;
  score10: number | null;
  pending: number;
  correctCount: number;
  startedAt: string;
  submittedAt: string | null;
  level: ResultLevel;
  items: ReviewItem[];
};
export type MyAssignment = {
  id: string;
  title: string;
  kind: AssignmentKind;
  subject: string;
  questionCount: number;
  durationMinutes: number | null;
  opensAt: string;
  dueAt: string;
  attemptsAllowed: number;
  attemptsUsed: number;
  state: StudentState;
  canStart: boolean;
  answered: number;
  score10: number | null;
  currentSubmissionId: string | null;
  lastSubmissionId: string | null;
};

const Uuid = z.uuid();
export const EventsBody = z.object({ events: z.array(z.object({ kind: z.enum(["leave", "return"]) })).min(1).max(50) });
type SubRow = typeof submissions.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createSubmissionService(db: Db, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  const subsOf = (assignmentId: string, studentId: string) =>
    db.select().from(submissions).where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).orderBy(asc(submissions.attempt));

  async function loadForStudent(sa: StudentActor, assignmentId: string) {
    if (!Uuid.safeParse(assignmentId).success) throw new NotFoundError("Không tìm thấy bài");
    const [a] = await db.select().from(assignments).where(and(eq(assignments.id, assignmentId), eq(assignments.classId, sa.classId), ne(assignments.status, "draft")));
    if (!a) throw new NotFoundError("Không tìm thấy bài");
    return a;
  }

  /** Chốt một bài trong một giao dịch: khoá dòng, chấm, ghi answer_items. Bài đã chốt thì không làm gì (trả false). */
  async function finalize(id: string, o: { studentId?: string; body?: SaveBody } = {}): Promise<boolean> {
    const t = now();
    return db.transaction(async (tx: Tx) => {
      const [s] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
      if (!s || (o.studentId !== undefined && s.studentId !== o.studentId)) throw new NotFoundError("Không tìm thấy bài làm");
      if (s.status !== "in_progress") return false;
      const [a] = await tx.select({ variants: assignments.variants, rules: assignments.rules }).from(assignments).where(eq(assignments.id, s.assignmentId));
      if (!a) throw new NotFoundError("Không tìm thấy bài");
      const late = isExpired(s.deadlineAt, t);
      const useBody = o.body !== undefined && !late && o.body.seq > s.seq;
      const answers = useBody ? (o.body as SaveBody).answers : s.answers;
      const g = gradeAnswers(variantByCode(a.variants, s.variantCode), answers, a.rules);
      await tx
        .update(submissions)
        .set({
          status: o.body !== undefined && !late ? "submitted" : "auto_submitted",
          submittedAt: late ? s.deadlineAt : t,
          answers,
          seq: useBody ? (o.body as SaveBody).seq : s.seq,
          score: g.score,
          maxScore: g.maxScore,
          pending: g.pending,
          updatedAt: t,
        })
        .where(eq(submissions.id, id));
      if (g.items.length) await tx.insert(answerItems).values(g.items.map((i) => ({ ...i, submissionId: id, assignmentId: s.assignmentId })));
      return true;
    });
  }

  /** Chốt các bài quá hạn + ân hạn (gọi khi đọc và mỗi phút từ main.ts). */
  async function finalizeExpired(o: { assignmentId?: string; limit?: number } = {}): Promise<number> {
    const conds = [eq(submissions.status, "in_progress"), lt(submissions.deadlineAt, saveCutoff(now()))];
    if (o.assignmentId) conds.push(eq(submissions.assignmentId, o.assignmentId));
    const ids = await db.select({ id: submissions.id }).from(submissions).where(and(...conds)).limit(o.limit ?? 500);
    let n = 0;
    for (const { id } of ids) if (await finalize(id)) n++;
    return n;
  }

  async function listMine(sa: StudentActor): Promise<MyAssignment[]> {
    await loadFreshStudent(db, sa);
    const rows = await db.select().from(assignments).where(and(eq(assignments.classId, sa.classId), ne(assignments.status, "draft"))).orderBy(desc(assignments.dueAt));
    if (!rows.length) return [];
    const load = () => db.select().from(submissions).where(and(eq(submissions.studentId, sa.studentId), inArray(submissions.assignmentId, rows.map((r) => r.id))));
    let subs = await load();
    const t = now();
    const expired = subs.filter((s) => s.status === "in_progress" && isExpired(s.deadlineAt, t));
    if (expired.length) {
      for (const s of expired) await finalize(s.id);
      subs = await load();
    }
    return rows.map((a) => {
      const mine = subs.filter((s) => s.assignmentId === a.id).sort((x, y) => x.attempt - y.attempt);
      const cur = mine.find((s) => s.status === "in_progress");
      const done = mine.filter((s) => s.status !== "in_progress");
      const best = done.reduce<number | null>((m, s) => Math.max(m ?? -1, toScore10(s.score, s.maxScore) ?? -1), null);
      const st = studentState(a, mine, t);
      return {
        id: a.id,
        title: a.title,
        kind: a.kind,
        subject: a.subject,
        questionCount: a.variants[0]?.items.length ?? 0,
        durationMinutes: a.durationMinutes,
        opensAt: a.opensAt.toISOString(),
        dueAt: a.dueAt.toISOString(),
        attemptsAllowed: a.attemptsAllowed,
        attemptsUsed: mine.length,
        state: st.state,
        canStart: st.canStart,
        answered: cur ? answeredCount(cur.answers, variantByCode(a.variants, cur.variantCode)) : 0,
        score10: best === null || best < 0 ? null : best,
        currentSubmissionId: cur?.id ?? null,
        lastSubmissionId: done[done.length - 1]?.id ?? null,
      };
    });
  }

  /** Vào phòng: tiếp tục lượt đang làm, hoặc mở lượt mới nếu còn lượt và bài đang mở. */
  async function start(sa: StudentActor, assignmentId: string): Promise<RoomPayload> {
    const me = await loadFreshStudent(db, sa);
    const a = await loadForStudent(sa, assignmentId);
    const t = now();
    let subs = await subsOf(a.id, sa.studentId);
    const stale = subs.find((s) => s.status === "in_progress" && isExpired(s.deadlineAt, t));
    if (stale) {
      await finalize(stale.id);
      subs = await subsOf(a.id, sa.studentId);
    }
    let cur: SubRow | undefined = subs.find((s) => s.status === "in_progress");
    if (!cur) {
      const st = studentState(a, subs, t);
      if (!st.canStart) throw new ConflictError(subs.length >= a.attemptsAllowed ? "Em đã dùng hết lượt làm bài này" : "Bài chưa mở hoặc đã hết hạn", { state: st.state });
      const v = pickVariant(a.variants, me.seat, sa.studentId);
      const [ins] = await db
        .insert(submissions)
        .values({
          assignmentId: a.id,
          studentId: sa.studentId,
          attempt: subs.reduce((m, s) => Math.max(m, s.attempt), 0) + 1,
          variantCode: v.code,
          seed: randomInt(2147483647),
          startedAt: t,
          deadlineAt: computeDeadline(t, a.durationMinutes, a.dueAt),
          updatedAt: t,
        })
        .onConflictDoNothing()
        .returning();
      cur = ins ?? (await subsOf(a.id, sa.studentId)).find((s) => s.status === "in_progress");
      if (!cur) throw new ConflictError("Bài đang được mở ở máy khác, em tải lại trang nhé");
    }
    const v = variantByCode(a.variants, cur.variantCode);
    return {
      submission: { id: cur.id, attempt: cur.attempt, status: cur.status, seq: cur.seq, answers: cur.answers, startedAt: cur.startedAt.toISOString(), deadlineAt: cur.deadlineAt.toISOString(), variantCode: cur.variantCode },
      assignment: { id: a.id, title: a.title, kind: a.kind, subject: a.subject, durationMinutes: a.durationMinutes, dueAt: a.dueAt.toISOString(), attemptsAllowed: a.attemptsAllowed },
      questions: publicItems(v, displayOrder(v, a.shuffle, cur.seed), a.rules),
      serverNow: t.toISOString(),
    };
  }

  /** Tự lưu: đúng MỘT câu UPDATE theo khoá chính (không đọc trước). Trượt thì mới đọc để giải thích. */
  async function save(sa: StudentActor, id: string, raw: unknown): Promise<SaveResult> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    const p = SaveBody.parse(raw);
    const t = now();
    const [row] = await db
      .update(submissions)
      .set({ answers: p.answers, seq: p.seq, updatedAt: t })
      .where(and(eq(submissions.id, id), eq(submissions.studentId, sa.studentId), lt(submissions.seq, p.seq), eq(submissions.status, "in_progress"), gte(submissions.deadlineAt, saveCutoff(t))))
      .returning({ seq: submissions.seq, deadlineAt: submissions.deadlineAt });
    if (row) return { ok: true, seq: row.seq, serverNow: t.toISOString(), deadlineAt: row.deadlineAt.toISOString() };
    const [s] = await db.select({ studentId: submissions.studentId, status: submissions.status, seq: submissions.seq, deadlineAt: submissions.deadlineAt }).from(submissions).where(eq(submissions.id, id));
    if (!s || s.studentId !== sa.studentId) throw new NotFoundError("Không tìm thấy bài làm");
    if (s.status === "in_progress" && !isExpired(s.deadlineAt, t)) return { ok: true, seq: s.seq, serverNow: t.toISOString(), deadlineAt: s.deadlineAt.toISOString() };
    if (s.status === "in_progress") await finalize(id);
    throw new ConflictError(s.status === "in_progress" ? "Đã hết giờ làm bài. Bài đã được nộp với các câu đã lưu." : "Bài đã nộp rồi", { status: s.status === "in_progress" ? "auto_submitted" : s.status });
  }

  async function events(sa: StudentActor, id: string, raw: unknown): Promise<{ ok: true; leaveCount: number }> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    const p = EventsBody.parse(raw);
    const leaves = p.events.filter((e) => e.kind === "leave").length;
    const [row] = await db
      .update(submissions)
      .set({ leaveCount: sql`${submissions.leaveCount} + ${leaves}` })
      .where(and(eq(submissions.id, id), eq(submissions.studentId, sa.studentId), eq(submissions.status, "in_progress")))
      .returning({ leaveCount: submissions.leaveCount });
    if (!row) throw new NotFoundError("Không tìm thấy bài đang làm");
    await db.insert(submissionEvents).values(p.events.map((e) => ({ submissionId: id, kind: e.kind, at: now() })));
    return { ok: true, leaveCount: row.leaveCount };
  }

  /** Nộp: idempotent. Quá hạn + ân hạn thì bỏ bản gửi kèm, chốt bằng bản đã lưu (auto_submitted). */
  async function submit(sa: StudentActor, id: string, raw: unknown): Promise<StudentResult> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    await finalize(id, { studentId: sa.studentId, body: SaveBody.parse(raw) });
    return resultOf(sa, id);
  }

  async function result(sa: StudentActor, id: string): Promise<StudentResult> {
    await loadFreshStudent(db, sa);
    return resultOf(sa, id);
  }

  async function resultOf(sa: StudentActor, id: string): Promise<StudentResult> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    const t = now();
    let [s] = await db.select().from(submissions).where(and(eq(submissions.id, id), eq(submissions.studentId, sa.studentId)));
    if (!s) throw new NotFoundError("Không tìm thấy bài làm");
    if (s.status === "in_progress" && isExpired(s.deadlineAt, t)) {
      await finalize(id);
      [s] = await db.select().from(submissions).where(eq(submissions.id, id));
    }
    if (!s || s.status === "in_progress") throw new ConflictError("Bài chưa nộp", { status: "in_progress" });
    const [a] = await db.select().from(assignments).where(eq(assignments.id, s.assignmentId));
    if (!a) throw new NotFoundError("Không tìm thấy bài");
    const items = await db.select({ no: answerItems.no, points: answerItems.points, correct: answerItems.correct }).from(answerItems).where(eq(answerItems.submissionId, id));
    const all = await subsOf(a.id, sa.studentId);
    const v = variantByCode(a.variants, s.variantCode);
    const level = resultLevel(a.showSolution, a.dueAt, t);
    return {
      submissionId: s.id,
      assignmentId: a.id,
      title: a.title,
      status: s.status,
      attempt: s.attempt,
      attemptsAllowed: a.attemptsAllowed,
      attemptsUsed: all.length,
      canRetry: studentState(a, all, t).canStart && !all.some((x) => x.status === "in_progress"),
      score: s.score,
      maxScore: s.maxScore,
      score10: toScore10(s.score, s.maxScore),
      pending: s.pending,
      correctCount: level === "score" ? 0 : items.filter((i) => i.correct === true).length,
      startedAt: s.startedAt.toISOString(),
      submittedAt: s.submittedAt?.toISOString() ?? null,
      level,
      items: reviewItems(v, displayOrder(v, a.shuffle, s.seed), a.rules, s.answers, new Map(items.map((i) => [i.no, i])), level),
    };
  }

  return { listMine, start, save, events, submit, result, finalize, finalizeExpired };
}
export type SubmissionService = ReturnType<typeof createSubmissionService>;
