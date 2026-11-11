import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { answerItems, assignments, classes, exams, questions, students, submissionEvents, submissions } from "../db/schema";
import { type AssignmentStats, type ItemRow, type MonitorRow, type MonitorState, type ResultRow, type SubRow, analyze, buildMonitor, resultRows } from "../domain/analytics";
import { AssignmentInput, ASSIGNMENT_STATUS, type AssignmentKind, type AssignmentStatus, type ReviewItem, type ShowSolution, type SubmissionStatus, answeredCount, displayOrder, resolveSettings, reviewItems, variantByCode } from "../domain/assignment";
import { type Role, assertCan } from "../domain/authz";
import { maxPoints, round2, rulesForSubject } from "../domain/scoring";
import { type Variant, makeVariants } from "../domain/variants";
import { ConflictError, NotFoundError, ValidationError } from "../errors";
import { sortedRoster } from "./credentials";

type Actor = { userId: string; orgId: string; role: Role };
export type AssignmentRow = typeof assignments.$inferSelect;

export type AssignmentSummary = {
  id: string;
  classId: string;
  title: string;
  kind: AssignmentKind;
  subject: string;
  status: AssignmentStatus;
  source: "exam" | "bank";
  opensAt: string;
  dueAt: string;
  durationMinutes: number | null;
  attemptsAllowed: number;
  showSolution: ShowSolution;
  shuffle: boolean;
  questionCount: number;
  variantCodes: string[];
  maxScore: number;
  createdAt: string;
};
export type AssignmentListItem = AssignmentSummary & { rosterSize: number; submitted: number; inProgress: number };

const Uuid = z.uuid();
const Iso = z.iso.datetime({ offset: true });
export type MonitorPayload = { assignment: AssignmentSummary; serverNow: string; counts: Record<MonitorState, number>; rows: MonitorRow[] };
export type ResultsPayload = { assignment: AssignmentSummary; rows: ResultRow[]; stats: AssignmentStats };
export type SubmissionDetail = {
  student: { id: string; fullName: string; seat: number | null };
  submission: { id: string; attempt: number; status: SubmissionStatus; variantCode: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; pending: number; leaveCount: number };
  items: ReviewItem[];
  events: { at: string; kind: string }[];
};
export const GradeEssayBody = z.object({ points: z.record(z.string().regex(/^\d{1,3}$/), z.number().min(0).max(100)) });
const MONITOR_TTL_MS = 2000;

export const AssignmentPatch = z.object({
  title: z.string().trim().normalize("NFC").min(1).max(160).optional(),
  dueAt: Iso.optional(),
  status: z.enum(ASSIGNMENT_STATUS).optional(),
});

export function summarize(r: AssignmentRow): AssignmentSummary {
  const first = r.variants[0];
  return {
    id: r.id,
    classId: r.classId,
    title: r.title,
    kind: r.kind,
    subject: r.subject,
    status: r.status,
    source: "examId" in r.source ? "exam" : "bank",
    opensAt: r.opensAt.toISOString(),
    dueAt: r.dueAt.toISOString(),
    durationMinutes: r.durationMinutes,
    attemptsAllowed: r.attemptsAllowed,
    showSolution: r.showSolution,
    shuffle: r.shuffle,
    questionCount: first?.items.length ?? 0,
    variantCodes: r.variants.map((v) => v.code),
    maxScore: round2((first?.items ?? []).reduce((s, it) => s + maxPoints(it.question, r.rules), 0)),
    createdAt: r.createdAt.toISOString(),
  };
}

/** finalize: chốt các bài quá hạn của một bài giao trước khi GV đọc (từ SubmissionService.finalizeExpired). */
export function createAssignmentService(db: Db, opts: { now?: () => Date; finalize?: (assignmentId: string) => Promise<number> } = {}) {
  const now = opts.now ?? (() => new Date());
  const monitorCache = new Map<string, { at: number; data: MonitorPayload }>();

  async function loadClass(orgId: string, classId: string) {
    if (!Uuid.safeParse(classId).success) throw new NotFoundError("Không tìm thấy lớp");
    const [c] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.orgId, orgId)));
    if (!c) throw new NotFoundError("Không tìm thấy lớp");
    return c;
  }

  async function load(orgId: string, id: string): Promise<AssignmentRow> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài giao");
    const [a] = await db.select().from(assignments).where(and(eq(assignments.id, id), eq(assignments.orgId, orgId)));
    if (!a) throw new NotFoundError("Không tìm thấy bài giao");
    return a;
  }

  /** Giao bài từ đề (chụp các mã đề) hoặc từ nhóm câu ngân hàng (1 mã đề). */
  async function create(actor: Actor, classId: string, raw: unknown): Promise<AssignmentSummary> {
    assertCan(actor.role, "assignment:manage");
    const c = await loadClass(actor.orgId, classId);
    const p = AssignmentInput.parse(raw);
    let variants: Variant[];
    let subject: string;
    let examDuration: number | null = null;
    if ("examId" in p.source) {
      const [exam] = await db.select().from(exams).where(and(eq(exams.id, p.source.examId), eq(exams.orgId, actor.orgId)));
      if (!exam) throw new NotFoundError("Không tìm thấy đề");
      variants = exam.variants;
      subject = exam.matrix.subject;
      examDuration = exam.durationMinutes;
    } else {
      const ids = [...new Set(p.source.questionIds)];
      const rows = await db.select({ id: questions.id, body: questions.body }).from(questions).where(and(eq(questions.orgId, actor.orgId), inArray(questions.id, ids)));
      if (rows.length !== ids.length) throw new ValidationError(["Có câu hỏi không còn trong ngân hàng"]);
      const byId = new Map(rows.map((r) => [r.id, r.body]));
      const picked = ids.map((id) => ({ ...(byId.get(id) as (typeof rows)[number]["body"]), id }));
      variants = makeVariants(picked, 1, randomInt(2147483647));
      subject = picked[0]?.subject ?? c.subject ?? "";
    }
    if (!variants[0]?.items.length) throw new ValidationError(["Đề không có câu hỏi"]);
    const s = resolveSettings(p, now(), examDuration);
    if (!s.ok) throw new ValidationError(s.issues);
    const [row] = await db
      .insert(assignments)
      .values({ orgId: actor.orgId, classId: c.id, ownerId: actor.userId, title: p.title, subject, source: p.source, variants, rules: rulesForSubject(subject), ...s.settings, status: p.publish ? "published" : "draft" })
      .returning();
    if (!row) throw new Error("assignment insert: no row");
    return summarize(row);
  }

  async function list(actor: Actor, classId: string): Promise<AssignmentListItem[]> {
    assertCan(actor.role, "assignment:read");
    const c = await loadClass(actor.orgId, classId);
    const rows = await db.select().from(assignments).where(eq(assignments.classId, c.id)).orderBy(desc(assignments.createdAt));
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(students).where(eq(students.classId, c.id));
    const counts = rows.length
      ? await db
          .select({
            id: submissions.assignmentId,
            submitted: sql<number>`count(distinct ${submissions.studentId}) filter (where ${submissions.status} <> 'in_progress')::int`,
            inProgress: sql<number>`count(*) filter (where ${submissions.status} = 'in_progress')::int`,
          })
          .from(submissions)
          .where(inArray(submissions.assignmentId, rows.map((r) => r.id)))
          .groupBy(submissions.assignmentId)
      : [];
    const by = new Map(counts.map((x) => [x.id, x]));
    return rows.map((r) => ({ ...summarize(r), rosterSize: n, submitted: by.get(r.id)?.submitted ?? 0, inProgress: by.get(r.id)?.inProgress ?? 0 }));
  }

  async function get(actor: Actor, id: string): Promise<AssignmentSummary> {
    assertCan(actor.role, "assignment:read");
    return summarize(await load(actor.orgId, id));
  }

  /** Đổi tên, gia hạn (bài đang làm được nới hạn theo), mở/đóng. Đã có bài làm thì không về nháp. */
  async function update(actor: Actor, id: string, raw: unknown): Promise<AssignmentSummary> {
    assertCan(actor.role, "assignment:manage");
    const a = await load(actor.orgId, id);
    const p = AssignmentPatch.parse(raw);
    const dueAt = p.dueAt ? new Date(p.dueAt) : undefined;
    if (dueAt && dueAt.getTime() <= a.opensAt.getTime()) throw new ValidationError(["Hạn nộp phải sau giờ mở bài"]);
    if (p.status === "draft" && a.status !== "draft") {
      const [has] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.assignmentId, id)).limit(1);
      if (has) throw new ConflictError("Bài đã có học sinh làm, không chuyển về nháp được");
    }
    const [row] = await db
      .update(assignments)
      .set({ ...(p.title !== undefined && { title: p.title }), ...(dueAt && { dueAt }), ...(p.status && { status: p.status }) })
      .where(eq(assignments.id, id))
      .returning();
    if (dueAt) {
      const due = dueAt.toISOString();
      await db
        .update(submissions)
        .set({
          deadlineAt:
            a.durationMinutes === null ? dueAt : sql`least(${submissions.startedAt} + make_interval(mins => ${a.durationMinutes}), ${due}::timestamptz)`,
        })
        .where(and(eq(submissions.assignmentId, id), eq(submissions.status, "in_progress")));
    }
    return summarize(row as AssignmentRow);
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "assignment:manage");
    await load(actor.orgId, id);
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  async function subRows(assignmentId: string, variants: Variant[]): Promise<SubRow[]> {
    const rows = await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
    return rows.map((s) => ({ ...s, answered: answeredCount(s.answers, variantByCode(variants, s.variantCode)) }));
  }

  /** Theo dõi trực tiếp (GV hỏi lại mỗi 5 giây): cache 2 giây phía máy chủ. */
  async function monitor(actor: Actor, id: string): Promise<MonitorPayload> {
    assertCan(actor.role, "assignment:read");
    const a = await load(actor.orgId, id);
    const t = now().getTime();
    const hit = monitorCache.get(id);
    if (hit && t - hit.at < MONITOR_TTL_MS) return hit.data;
    await opts.finalize?.(id);
    const [roster, subs] = await Promise.all([sortedRoster(db, a.classId), subRows(id, a.variants)]);
    const data: MonitorPayload = { assignment: summarize(a), serverNow: new Date(t).toISOString(), ...buildMonitor(roster, subs, a.variants[0]?.items.length ?? 0) };
    if (monitorCache.size > 500) for (const [k, v] of monitorCache) if (t - v.at >= MONITOR_TTL_MS) monitorCache.delete(k);
    monitorCache.set(id, { at: t, data });
    return data;
  }

  async function results(actor: Actor, id: string): Promise<ResultsPayload> {
    assertCan(actor.role, "assignment:read");
    const a = await load(actor.orgId, id);
    await opts.finalize?.(id);
    const [roster, subs, items] = await Promise.all([
      sortedRoster(db, a.classId),
      subRows(id, a.variants),
      db
        .select({ submissionId: answerItems.submissionId, questionId: answerItems.questionId, topic: answerItems.topic, level: answerItems.level, type: answerItems.type, points: answerItems.points, maxPoints: answerItems.maxPoints, correct: answerItems.correct, choice: answerItems.choice })
        .from(answerItems)
        .where(eq(answerItems.assignmentId, id)) as Promise<ItemRow[]>,
    ]);
    const questionsMeta = (a.variants[0]?.items ?? []).map((it) => ({ questionId: it.questionId, label: it.no, stem: it.question.stem }));
    return { assignment: summarize(a), rows: resultRows(roster, subs), stats: analyze({ roster, subs, items, questions: questionsMeta, dueAt: a.dueAt, now: now() }) };
  }

  async function loadSubmission(a: AssignmentRow, submissionId: string) {
    if (!Uuid.safeParse(submissionId).success) throw new NotFoundError("Không tìm thấy bài làm");
    const [s] = await db.select().from(submissions).where(and(eq(submissions.id, submissionId), eq(submissions.assignmentId, a.id)));
    if (!s) throw new NotFoundError("Không tìm thấy bài làm");
    return s;
  }

  /** Bài làm của một HS cho GV: đáp án, đúng/sai, hướng dẫn chấm tự luận, nhật ký rời tab. */
  async function submissionDetail(actor: Actor, id: string, submissionId: string): Promise<SubmissionDetail> {
    assertCan(actor.role, "assignment:read");
    const a = await load(actor.orgId, id);
    const s = await loadSubmission(a, submissionId);
    const [st] = await db.select().from(students).where(eq(students.id, s.studentId));
    const items = await db.select({ no: answerItems.no, points: answerItems.points, correct: answerItems.correct }).from(answerItems).where(eq(answerItems.submissionId, s.id));
    const events = await db.select({ at: submissionEvents.at, kind: submissionEvents.kind }).from(submissionEvents).where(eq(submissionEvents.submissionId, s.id)).orderBy(submissionEvents.at);
    const v = variantByCode(a.variants, s.variantCode);
    return {
      student: { id: s.studentId, fullName: st?.fullName ?? "", seat: st?.seat ?? null },
      submission: { id: s.id, attempt: s.attempt, status: s.status, variantCode: s.variantCode, startedAt: s.startedAt.toISOString(), submittedAt: s.submittedAt?.toISOString() ?? null, score: s.score, maxScore: s.maxScore, pending: s.pending, leaveCount: s.leaveCount },
      items: reviewItems(v, displayOrder(v, false, 0), a.rules, s.answers, new Map(items.map((i) => [i.no, i])), "full", true),
      events: events.map((e) => ({ at: e.at.toISOString(), kind: e.kind })),
    };
  }

  /** GV chấm tay câu tự luận: { points: { [no]: điểm } }, 0 ≤ điểm ≤ tối đa của câu. */
  async function gradeEssays(actor: Actor, id: string, submissionId: string, raw: unknown): Promise<{ score: number; maxScore: number; pending: number }> {
    assertCan(actor.role, "exam:grade");
    const a = await load(actor.orgId, id);
    const s = await loadSubmission(a, submissionId);
    if (s.status === "in_progress") throw new ConflictError("Bài chưa nộp");
    const p = GradeEssayBody.parse(raw);
    return db.transaction(async (tx) => {
      const rows = await tx.select().from(answerItems).where(eq(answerItems.submissionId, s.id));
      const issues: string[] = [];
      for (const [no, pts] of Object.entries(p.points)) {
        const r = rows.find((x) => x.no === Number(no));
        if (!r || r.type !== "essay") issues.push(`Câu ${no} không phải câu tự luận`);
        else if (pts > r.maxPoints) issues.push(`Câu ${no}: tối đa ${String(r.maxPoints).replace(".", ",")} điểm`);
      }
      if (issues.length) throw new ValidationError(issues);
      for (const [no, pts] of Object.entries(p.points)) {
        const r = rows.find((x) => x.no === Number(no)) as (typeof rows)[number];
        await tx.update(answerItems).set({ points: pts, correct: pts >= r.maxPoints }).where(and(eq(answerItems.submissionId, s.id), eq(answerItems.no, r.no)));
        r.points = pts;
      }
      const score = round2(rows.reduce((m, r) => m + (r.points ?? 0), 0));
      const pending = rows.filter((r) => r.points === null).length;
      await tx.update(submissions).set({ score, pending }).where(eq(submissions.id, s.id));
      monitorCache.delete(id);
      return { score, maxScore: s.maxScore ?? 0, pending };
    });
  }
  return { create, list, get, update, remove, load, monitor, results, submissionDetail, gradeEssays };
}
export type AssignmentService = ReturnType<typeof createAssignmentService>;
