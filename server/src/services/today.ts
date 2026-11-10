// Endpoint gộp màn "Hôm nay" (UI v2): mỗi màn một lần gọi, đủ dữ liệu để vẽ cả màn.
import { and, eq, gte, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import type { Db } from "../db/client";
import { answerItems, assignments, boards, classes, lessonPlans, scores, students, submissions, tutorReviewEvents, tutorReviewState, users } from "../db/schema";
import { type ItemRow, type QuestionMeta, type SubRow, analyze, bestByStudent } from "../domain/analytics";
import { answeredCount, studentState, toScore10, variantByCode } from "../domain/assignment";
import { type Role, assertCan, can } from "../domain/authz";
import { columnsFor } from "../domain/gradebook";
import {
  DAY_MS,
  type Evidence,
  type MasteryRow,
  bandCounts,
  currentTerm,
  dailyCounts,
  delta,
  dueGroup,
  dueLabel,
  isHot,
  masteryBySubject,
  mean,
  onTimeRate,
  parseViDate,
  partialAverage,
  round1,
  startOfVnDay,
  streakOf,
  taskCode,
  vnDay,
  vnTime,
  vnWeekday,
} from "../domain/today";

type Actor = { userId: string; orgId: string; role: Role };

// ---------- Kiểu trả về: GV ----------
export type GvAssignmentDetail = {
  type: "assignment";
  assignmentId: string;
  classId: string;
  kind: "practice" | "test";
  rosterSize: number;
  submitted: number;
  missing: { id: string; fullName: string }[];
  graded: number;
  pendingAnswers: number;
  estMinutes: number;
  dueAt: string;
  open: boolean;
  /** 10 ô điểm [0,1) … [9,10] của các bài đã chấm xong. */
  histogram: number[];
  scored: number;
  mean: number | null;
  median: number | null;
  hardest: { label: string; p: number; topic: string }[];
};
export type GvLessonDetail = { type: "lesson"; lessonId: string; subject: string; grade: number; periods: number | null; date: string; boardId: string | null };
export type GvTask = {
  id: string;
  kind: "grade" | "due" | "lesson";
  group: "today" | "week";
  title: string;
  className: string;
  classId: string | null;
  progress: { done: number; total: number } | null;
  note: string | null;
  dueAt: string | null;
  dueLabel: string;
  hot: boolean;
  href: string;
  detail: GvAssignmentDetail | GvLessonDetail;
};
export type GvClassRow = { id: string; name: string; subject: string | null; rosterSize: number; bands: [number, number, number, number]; basis: "so-diem" | "bai-giao" | null; avg: number | null; deltaMonth: number | null; onTime: number | null };
export type GvAttention = { studentId: string; fullName: string; classId: string; className: string; reasons: string[]; last: number | null };
export type GvToday = {
  now: string;
  date: { day: string; weekday: string };
  kpis: {
    pendingGrading: { value: number; today: number };
    onTime: { value: number | null; delta: number | null };
    weekAvg: { value: number | null; delta: number | null };
    attention: { value: number; classes: number };
    lessonsToday: { value: number; first: string | null };
    dueToday: { value: number; times: string[] };
  };
  tasks: GvTask[];
  classes: GvClassRow[];
  attention: GvAttention[];
};

// ---------- Kiểu trả về: Học ----------
export type HocUpcoming = { assignmentId: string; title: string; subject: string; kind: "practice" | "test"; dueAt: string; day: string; dayNum: string; hot: boolean; answered: number; total: number; attemptsAllowed: number; state: string; canStart: boolean };
export type HocToday = {
  now: string;
  date: { day: string; weekday: string };
  student: { name: string; className: string | null; classId: string | null };
  next: (HocUpcoming & { teacher: string | null; className: string; minutes: number }) | null;
  upcoming: HocUpcoming[];
  subjects: { subject: string; metric: { kind: "mastery" | "score" | "cards" | "none"; value: number | null }; next: { title: string; when: string } | null }[];
  mastery: { subject: string; rows: MasteryRow[]; weakest: { topic: string; pct: number } | null } | null;
  review: { due: number; minutes: number } | null;
  days: { date: string; weekday: string; count: number }[];
  streak: { current: number; longest: number; goal: number };
  canTutor: boolean;
};

export const DAILY_GOAL = 15;
const STREAK_WINDOW = 120;

const asSub = (s: { id: string; studentId: string; attempt: number; status: SubRow["status"]; score: number | null; maxScore: number | null; pending: number; leaveCount: number; startedAt: Date; submittedAt: Date | null; updatedAt: Date }): SubRow => ({ ...s, answered: 0 });

export function createTodayService(db: Db, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  async function teacher(actor: Actor): Promise<GvToday> {
    assertCan(actor.role, "assignment:read");
    const t = now();
    const dayStart = startOfVnDay(t);
    const term = currentTerm(t);
    const mineOnly = actor.role === "teacher";

    const cls = await db.select().from(classes).where(eq(classes.orgId, actor.orgId)).orderBy(classes.name);
    const classIds = cls.map((c) => c.id);
    const roster = classIds.length ? await db.select({ id: students.id, classId: students.classId, fullName: students.fullName, seat: students.seat }).from(students).where(inArray(students.classId, classIds)) : [];
    const rosterOf = new Map<string, typeof roster>();
    for (const r of roster) (rosterOf.get(r.classId) ?? rosterOf.set(r.classId, []).get(r.classId)!).push(r);

    // Bài giao: hạn trong 60 ngày qua trở đi, hoặc còn câu tự luận chờ chấm.
    const pendingIds = (
      await db
        .selectDistinct({ id: submissions.assignmentId })
        .from(submissions)
        .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
        .where(and(eq(assignments.orgId, actor.orgId), sql`${submissions.pending} > 0`, ne(submissions.status, "in_progress")))
    ).map((r) => r.id);
    const asg = await db
      .select({ id: assignments.id, classId: assignments.classId, ownerId: assignments.ownerId, title: assignments.title, kind: assignments.kind, status: assignments.status, opensAt: assignments.opensAt, dueAt: assignments.dueAt, durationMinutes: assignments.durationMinutes })
      .from(assignments)
      .where(
        and(
          eq(assignments.orgId, actor.orgId),
          ne(assignments.status, "draft"),
          mineOnly ? eq(assignments.ownerId, actor.userId) : undefined,
          or(gte(assignments.dueAt, new Date(t.getTime() - 60 * DAY_MS)), pendingIds.length ? inArray(assignments.id, pendingIds) : undefined),
        ),
      );
    const asgIds = asg.map((a) => a.id);
    const subs = asgIds.length
      ? await db
          .select({ id: submissions.id, assignmentId: submissions.assignmentId, studentId: submissions.studentId, attempt: submissions.attempt, status: submissions.status, score: submissions.score, maxScore: submissions.maxScore, pending: submissions.pending, leaveCount: submissions.leaveCount, startedAt: submissions.startedAt, submittedAt: submissions.submittedAt, updatedAt: submissions.updatedAt })
          .from(submissions)
          .where(inArray(submissions.assignmentId, asgIds))
      : [];
    const subsOf = new Map<string, SubRow[]>();
    for (const s of subs) (subsOf.get(s.assignmentId) ?? subsOf.set(s.assignmentId, []).get(s.assignmentId)!).push(asSub(s));
    const className = new Map(cls.map((c) => [c.id, c.name]));

    // ---- Việc từ bài giao ----
    const endWeek = t.getTime() + 7 * DAY_MS;
    type Cand = (typeof asg)[number] & { pending: number; submitted: number; graded: number; roster: number; open: boolean };
    const cands: Cand[] = [];
    for (const a of asg) {
      const ss = subsOf.get(a.id) ?? [];
      const best = bestByStudent(ss);
      const fin = [...best.values()];
      const pending = fin.reduce((n, s) => n + s.pending, 0);
      const open = a.status === "published" && a.dueAt.getTime() > t.getTime();
      const rosterSize = rosterOf.get(a.classId)?.length ?? 0;
      const c = { ...a, pending, submitted: fin.length, graded: fin.filter((s) => s.pending === 0).length, roster: rosterSize, open };
      if (pending > 0 || (open && a.dueAt.getTime() < endWeek && fin.length < rosterSize)) cands.push(c);
    }
    const detailIds = cands.map((c) => c.id);
    const [items, variantsRows] = detailIds.length
      ? await Promise.all([
          db.select({ assignmentId: answerItems.assignmentId, submissionId: answerItems.submissionId, questionId: answerItems.questionId, topic: answerItems.topic, level: answerItems.level, type: answerItems.type, points: answerItems.points, maxPoints: answerItems.maxPoints, correct: answerItems.correct, choice: answerItems.choice }).from(answerItems).where(inArray(answerItems.assignmentId, detailIds)),
          db.select({ id: assignments.id, variants: assignments.variants }).from(assignments).where(inArray(assignments.id, detailIds)),
        ])
      : [[], []];
    const metaOf = new Map<string, QuestionMeta[]>(variantsRows.map((v) => [v.id, (v.variants[0]?.items ?? []).map((it) => ({ questionId: it.questionId, label: it.no, stem: "" }))]));
    const tasks: GvTask[] = cands.map((c) => {
      const ros = rosterOf.get(c.classId) ?? [];
      const ss = subsOf.get(c.id) ?? [];
      const its = items.filter((i) => i.assignmentId === c.id) as (ItemRow & { assignmentId: string })[];
      const st = analyze({ roster: ros, subs: ss, items: its, questions: metaOf.get(c.id) ?? [], dueAt: c.dueAt, now: t });
      const done = new Set(bestByStudent(ss).keys());
      const pendingAnswers = c.pending;
      const grade = pendingAnswers > 0;
      const cname = className.get(c.classId) ?? "";
      const scoredDone = [...bestByStudent(ss).values()].filter((s) => s.pending === 0);
      const histogram = Array.from({ length: 10 }, () => 0);
      const vals = scoredDone.map((s) => toScore10(s.score, s.maxScore)).filter((v): v is number => v !== null);
      for (const v of vals) histogram[Math.min(9, Math.floor(v))]! += 1;
      const sorted = [...vals].sort((a, b) => a - b);
      const med = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2]! : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2) : null;
      const hardest = st.items
        .filter((i) => i.p !== null && i.n > 0)
        .sort((a, b) => (a.p ?? 0) - (b.p ?? 0) || a.label - b.label)
        .slice(0, 3)
        .map((i) => ({ label: `Câu ${i.label}`, p: Math.round((i.p ?? 0) * 100), topic: i.topic }));
      const g = dueGroup(c.dueAt, t);
      return {
        id: taskCode(c.kind === "test" ? "KT" : "LT", c.dueAt, cname),
        kind: grade ? "grade" : "due",
        group: grade ? "today" : g === "today" ? "today" : "week",
        title: `${grade ? "Chấm" : "Hạn nộp"} · ${c.title}`,
        className: cname,
        classId: c.classId,
        progress: grade ? { done: c.graded, total: Math.max(c.submitted, 1) } : { done: c.submitted, total: ros.length },
        note: null,
        dueAt: c.dueAt.toISOString(),
        dueLabel: dueLabel(c.dueAt, t),
        hot: isHot(c.dueAt, t),
        href: `/lop-hoc/${c.classId}?tab=${grade ? "ket-qua" : "theo-doi"}&bai=${c.id}`,
        detail: {
          type: "assignment",
          assignmentId: c.id,
          classId: c.classId,
          kind: c.kind,
          rosterSize: ros.length,
          submitted: c.submitted,
          missing: ros.filter((r) => !done.has(r.id)).map((r) => ({ id: r.id, fullName: r.fullName })),
          graded: c.graded,
          pendingAnswers,
          estMinutes: Math.max(1, Math.round(pendingAnswers * 1.1)),
          dueAt: c.dueAt.toISOString(),
          open: c.open,
          histogram,
          scored: vals.length,
          mean: vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
          median: med === null ? null : round1(med),
          hardest,
        },
      } satisfies GvTask;
    });

    // ---- Tiết học (giáo án có ngày dạy) ----
    const lessons = can(actor.role, "lesson:read")
      ? await db
          .select({ id: lessonPlans.id, title: lessonPlans.title, subject: lessonPlans.subject, grade: lessonPlans.grade, ownerId: lessonPlans.ownerId, date: sql<string | null>`${lessonPlans.body}->'header'->>'date'`, periods: sql<number | null>`(${lessonPlans.body}->'header'->>'periods')::int` })
          .from(lessonPlans)
          .where(and(eq(lessonPlans.orgId, actor.orgId), mineOnly ? eq(lessonPlans.ownerId, actor.userId) : undefined))
      : [];
    const today = vnDay(t);
    const weekEnd = vnDay(new Date(t.getTime() + 6 * DAY_MS));
    const dated = lessons.map((l) => ({ ...l, iso: parseViDate(l.date) })).filter((l): l is typeof l & { iso: string } => l.iso !== null && l.iso >= today && l.iso <= weekEnd);
    const boardRows = dated.length ? await db.select({ id: boards.id, title: boards.title, topic: boards.topic }).from(boards).where(eq(boards.orgId, actor.orgId)) : [];
    const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim();
    for (const l of dated) {
      const board = boardRows.find((b) => norm(b.title) === norm(l.title) || (b.topic && norm(b.topic) === norm(l.title)));
      const at = new Date(`${l.iso}T00:00:00+07:00`);
      tasks.push({
        id: taskCode("TIET", at, `L${l.grade}`),
        kind: "lesson",
        group: l.iso === today ? "today" : "week",
        title: `Lên lớp · ${l.title}`,
        className: `Lớp ${l.grade}`,
        classId: null,
        progress: null,
        note: board ? "Bảng giảng sẵn" : "Chưa có bảng giảng",
        dueAt: null,
        dueLabel: l.iso === today ? "Hôm nay" : vnWeekday(at),
        hot: false,
        href: board ? `/bang-giang/${board.id}` : `/giao-an/${l.id}`,
        detail: { type: "lesson", lessonId: l.id, subject: l.subject, grade: l.grade, periods: l.periods, date: l.iso, boardId: board?.id ?? null },
      });
    }
    const order = { today: 0, week: 1 } as const;
    tasks.sort((a, b) => order[a.group] - order[b.group] || Number(b.hot) - Number(a.hot) || (a.kind === "lesson" ? -1 : 0) - (b.kind === "lesson" ? -1 : 0) || (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

    // ---- Chỉ số ----
    const pendingSubs = [...asg].flatMap((a) => [...bestByStudent(subsOf.get(a.id) ?? []).values()].filter((s) => s.pending > 0));
    const subAt = (a: (typeof asg)[number]) => {
      const m = new Map<string, Date>();
      for (const s of subsOf.get(a.id) ?? []) if (s.status !== "in_progress" && s.submittedAt && (!m.has(s.studentId) || m.get(s.studentId)!.getTime() > s.submittedAt.getTime())) m.set(s.studentId, s.submittedAt);
      return m;
    };
    const onTimeItems = asg.map((a) => ({ dueAt: a.dueAt, rosterIds: (rosterOf.get(a.classId) ?? []).map((r) => r.id), submittedAt: subAt(a), classId: a.classId }));
    const d28 = 28 * DAY_MS;
    const onTimeNow = onTimeRate(onTimeItems, new Date(t.getTime() - d28), t);
    const onTimePrev = onTimeRate(onTimeItems, new Date(t.getTime() - 2 * d28), new Date(t.getTime() - d28));
    const scoreIn = (from: number, to: number, classId?: string) =>
      mean(
        asg
          .filter((a) => !classId || a.classId === classId)
          .flatMap((a) => [...bestByStudent(subsOf.get(a.id) ?? []).values()])
          .filter((s) => s.pending === 0 && s.submittedAt && s.submittedAt.getTime() >= from && s.submittedAt.getTime() < to)
          .map((s) => toScore10(s.score, s.maxScore))
          .filter((v): v is number => v !== null),
      );
    const w = 7 * DAY_MS;
    const weekNow = scoreIn(t.getTime() - w, t.getTime() + 1);
    const weekPrev = scoreIn(t.getTime() - 2 * w, t.getTime() - w);

    // ---- HS cần quan tâm: 3 bài gần nhất TB < 5, hoặc bỏ ≥ 2 bài đã hết hạn trong 4 tuần ----
    const attention: GvAttention[] = [];
    for (const c of cls) {
      const ros = rosterOf.get(c.id) ?? [];
      const ca = asg.filter((a) => a.classId === c.id);
      for (const r of ros) {
        const mine = ca
          .map((a) => ({ a, s: bestByStudent((subsOf.get(a.id) ?? []).filter((s) => s.studentId === r.id)).get(r.id) }))
          .sort((x, y) => y.a.dueAt.getTime() - x.a.dueAt.getTime());
        const graded = mine.filter((m) => m.s && m.s.pending === 0).map((m) => toScore10(m.s!.score, m.s!.maxScore)).filter((v): v is number => v !== null);
        const last3 = graded.slice(0, 3);
        const avg = mean(last3);
        const missed = mine.filter((m) => !m.s && m.a.dueAt.getTime() <= t.getTime() && m.a.dueAt.getTime() > t.getTime() - d28).length;
        const reasons: string[] = [];
        if (avg !== null && last3.length >= 2 && avg < 5) reasons.push(`TB ${last3.length} bài gần nhất ${String(round1(avg)).replace(".", ",")}`);
        if (missed >= 2) reasons.push(`Bỏ ${missed} bài trong 4 tuần`);
        if (reasons.length) attention.push({ studentId: r.id, fullName: r.fullName, classId: c.id, className: c.name, reasons, last: graded[0] ?? null });
      }
    }
    attention.sort((a, b) => b.reasons.length - a.reasons.length || (a.last ?? -1) - (b.last ?? -1));

    // ---- Bảng lớp: học lực theo sổ điểm (ĐTB tạm tính học kỳ hiện tại), thiếu thì theo bài giao ----
    const sc = roster.length ? await db.select().from(scores).where(and(inArray(scores.studentId, roster.map((r) => r.id)), eq(scores.term, term))) : [];
    const scoresOf = new Map<string, Record<string, number>>();
    for (const s of sc) (scoresOf.get(s.studentId) ?? scoresOf.set(s.studentId, {}).get(s.studentId)!)[s.column] = s.value;
    const classRows: GvClassRow[] = cls.map((c) => {
      const ros = rosterOf.get(c.id) ?? [];
      const cols = c.columns.length ? c.columns : columnsFor(c.scale);
      let values = c.scale === "TT27" ? [] : ros.map((r) => partialAverage(cols, scoresOf.get(r.id) ?? {})).filter((v): v is number => v !== null);
      let basis: GvClassRow["basis"] = values.length ? "so-diem" : null;
      if (!values.length) {
        const ca = asg.filter((a) => a.classId === c.id);
        values = ros
          .map((r) => mean(ca.map((a) => bestByStudent((subsOf.get(a.id) ?? []).filter((s) => s.studentId === r.id)).get(r.id)).filter((s): s is SubRow => !!s && s.pending === 0).map((s) => toScore10(s.score, s.maxScore)).filter((v): v is number => v !== null)))
          .filter((v): v is number => v !== null);
        if (values.length) basis = "bai-giao";
      }
      const avg = mean(values);
      const m30 = 30 * DAY_MS;
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        rosterSize: ros.length,
        bands: bandCounts(values),
        basis,
        avg: avg === null ? null : round1(avg),
        deltaMonth: delta(scoreIn(t.getTime() - m30, t.getTime() + 1, c.id), scoreIn(t.getTime() - 2 * m30, t.getTime() - m30, c.id)),
        onTime: onTimeRate(onTimeItems.filter((i) => i.classId === c.id), new Date(t.getTime() - d28), t),
      };
    });

    const dueToday = asg.filter((a) => a.status === "published" && vnDay(a.dueAt) === today).sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
    const lessonsToday = dated.filter((l) => l.iso === today);
    return {
      now: t.toISOString(),
      date: { day: today, weekday: vnWeekday(t) },
      kpis: {
        pendingGrading: { value: pendingSubs.length, today: pendingSubs.filter((s) => s.submittedAt && s.submittedAt.getTime() >= dayStart.getTime()).length },
        onTime: { value: onTimeNow, delta: delta(onTimeNow, onTimePrev) },
        weekAvg: { value: weekNow === null ? null : round1(weekNow), delta: delta(weekNow === null ? null : round1(weekNow), weekPrev === null ? null : round1(weekPrev)) },
        attention: { value: attention.length, classes: new Set(attention.map((a) => a.classId)).size },
        lessonsToday: { value: lessonsToday.length, first: lessonsToday[0]?.title ?? null },
        dueToday: { value: dueToday.length, times: dueToday.map((a) => vnTime(a.dueAt)) },
      },
      tasks,
      classes: classRows,
      attention,
    };
  }

  /** HS: `studentIds` = các hồ sơ HS (phiên mã lớp: 1; tài khoản Keycloak: mọi lớp đã liên kết). `learner` = khoá gia sư (chỉ tài khoản). */
  async function student(input: { studentIds: string[]; name: string; learner: { orgId: string; learnerKey: string } | null }): Promise<HocToday> {
    const t = now();
    const today = vnDay(t);
    const studs = input.studentIds.length ? await db.select({ id: students.id, classId: students.classId, fullName: students.fullName }).from(students).where(inArray(students.id, input.studentIds)) : [];
    const classIds = [...new Set(studs.map((s) => s.classId))];
    const cls = classIds.length ? await db.select({ id: classes.id, name: classes.name }).from(classes).where(inArray(classes.id, classIds)) : [];
    const asg = classIds.length
      ? await db
          .select({ id: assignments.id, classId: assignments.classId, ownerId: assignments.ownerId, title: assignments.title, kind: assignments.kind, subject: assignments.subject, status: assignments.status, opensAt: assignments.opensAt, dueAt: assignments.dueAt, durationMinutes: assignments.durationMinutes, attemptsAllowed: assignments.attemptsAllowed, variants: assignments.variants })
          .from(assignments)
          .where(and(inArray(assignments.classId, classIds), ne(assignments.status, "draft")))
      : [];
    const sids = studs.map((s) => s.id);
    const subs = asg.length && sids.length ? await db.select().from(submissions).where(and(inArray(submissions.assignmentId, asg.map((a) => a.id)), inArray(submissions.studentId, sids))) : [];

    const upcoming: HocUpcoming[] = [];
    for (const a of asg) {
      const mine = subs.filter((s) => s.assignmentId === a.id);
      const st = studentState(a, mine, t);
      if (!(st.state === "dang_lam" || st.state === "chua_lam" || st.state === "chua_mo")) continue;
      const cur = mine.find((s) => s.status === "in_progress");
      const total = a.variants[0]?.items.length ?? 0;
      const answered = cur ? answeredCount(cur.answers, variantByCode(a.variants, cur.variantCode)) : 0;
      const isToday = vnDay(a.dueAt) === today;
      upcoming.push({
        assignmentId: a.id,
        title: a.title,
        subject: a.subject,
        kind: a.kind,
        dueAt: a.dueAt.toISOString(),
        day: isToday ? "Nay" : vnWeekday(a.dueAt),
        dayNum: isToday ? `${Number(vnTime(a.dueAt).slice(0, 2))}h` : String(Number(vnDay(a.dueAt).slice(8, 10))),
        hot: isHot(a.dueAt, t),
        answered,
        total,
        attemptsAllowed: a.attemptsAllowed,
        state: st.state,
        canStart: st.canStart,
      });
    }
    upcoming.sort((x, y) => Number(y.state === "dang_lam") - Number(x.state === "dang_lam") || Number(y.canStart) - Number(x.canStart) || x.dueAt.localeCompare(y.dueAt));
    const first = upcoming.find((u) => u.canStart) ?? null;
    let next: HocToday["next"] = null;
    if (first) {
      const a = asg.find((x) => x.id === first.assignmentId)!;
      const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, a.ownerId));
      next = { ...first, teacher: owner?.name ?? null, className: cls.find((c) => c.id === a.classId)?.name ?? "", minutes: Math.max(1, a.durationMinutes ?? Math.round((first.total - first.answered) * 2)) };
    }
    upcoming.sort((x, y) => x.dueAt.localeCompare(y.dueAt));

    // ---- Bằng chứng thành thạo + hoạt động theo ngày ----
    const since30 = new Date(t.getTime() - 30 * DAY_MS);
    const sinceStreak = new Date(startOfVnDay(t).getTime() - (STREAK_WINDOW - 1) * DAY_MS);
    const subjOf = new Map(asg.map((a) => [a.id, a.subject]));
    const fin = subs.filter((s) => s.status !== "in_progress" && s.submittedAt);
    const finIds = fin.filter((s) => s.submittedAt!.getTime() >= sinceStreak.getTime()).map((s) => s.id);
    const its = finIds.length ? await db.select({ submissionId: answerItems.submissionId, assignmentId: answerItems.assignmentId, topic: answerItems.topic, points: answerItems.points, maxPoints: answerItems.maxPoints }).from(answerItems).where(inArray(answerItems.submissionId, finIds)) : [];
    const subAt = new Map(fin.map((s) => [s.id, s.submittedAt!]));
    const ev: Evidence[] = [];
    const activity: { at: Date; n?: number }[] = [];
    for (const i of its) {
      const at = subAt.get(i.submissionId)!;
      activity.push({ at });
      if (at.getTime() >= since30.getTime() && i.points !== null && i.maxPoints > 0) ev.push({ subject: subjOf.get(i.assignmentId) ?? "", topic: i.topic, value: i.points / i.maxPoints });
    }
    let review: HocToday["review"] = null;
    const dueBySubject = new Map<string, number>();
    if (input.learner) {
      const l = input.learner;
      const scope = and(eq(tutorReviewState.orgId, l.orgId), eq(tutorReviewState.learnerKey, l.learnerKey));
      const [states, events] = await Promise.all([
        db.select({ questionId: tutorReviewState.questionId, subject: tutorReviewState.subject, topic: tutorReviewState.topic, dueAt: tutorReviewState.dueAt }).from(tutorReviewState).where(scope),
        db.select({ questionId: tutorReviewEvents.questionId, correct: tutorReviewEvents.correct, reviewedAt: tutorReviewEvents.reviewedAt }).from(tutorReviewEvents).where(and(eq(tutorReviewEvents.orgId, l.orgId), eq(tutorReviewEvents.learnerKey, l.learnerKey), gte(tutorReviewEvents.reviewedAt, sinceStreak))),
      ]);
      const byQ = new Map(states.map((s) => [s.questionId, s]));
      for (const e of events) {
        activity.push({ at: e.reviewedAt });
        const s = byQ.get(e.questionId);
        if (s && e.reviewedAt.getTime() >= since30.getTime()) ev.push({ subject: s.subject, topic: s.topic, value: e.correct ? 1 : 0 });
      }
      const due = states.filter((s) => s.dueAt.getTime() <= t.getTime());
      for (const s of due) dueBySubject.set(s.subject, (dueBySubject.get(s.subject) ?? 0) + 1);
      review = { due: due.length, minutes: due.length ? Math.max(1, Math.round(due.length * 0.4)) : 0 };
    }
    const mastery = masteryBySubject(ev);
    let best: HocToday["mastery"] = null;
    for (const [subject, rows] of mastery) {
      const n = rows.reduce((a, r) => a + r.n, 0);
      if (!subject) continue;
      if (!best || n > best.rows.reduce((a, r) => a + r.n, 0)) {
        const known = rows.filter((r): r is MasteryRow & { pct: number } => r.pct !== null);
        const weakest = known.length ? known.reduce((m, r) => (r.pct < m.pct ? r : m)) : null;
        best = { subject, rows: rows.slice(0, 8), weakest: weakest ? { topic: weakest.topic, pct: weakest.pct } : null };
      }
    }

    // ---- Thẻ môn học ----
    const subjectsSet = new Set<string>([...asg.map((a) => a.subject), ...dueBySubject.keys()].filter(Boolean));
    const lastScore = (subject: string): number | null => {
      const s = fin.filter((x) => subjOf.get(x.assignmentId) === subject && x.pending === 0).sort((a, b) => b.submittedAt!.getTime() - a.submittedAt!.getTime())[0];
      return s ? toScore10(s.score, s.maxScore) : null;
    };
    const subjects: HocToday["subjects"] = [...subjectsSet]
      .map((subject) => {
        const rows = mastery.get(subject) ?? [];
        const n = rows.reduce((a, r) => a + r.n, 0);
        const known = rows.filter((r) => r.pct !== null);
        const pct = n >= 10 && known.length ? Math.round(known.reduce((a, r) => a + r.pct! * r.n, 0) / known.reduce((a, r) => a + r.n, 0)) : null;
        const ls = lastScore(subject);
        const cards = dueBySubject.get(subject) ?? 0;
        const metric = pct !== null ? { kind: "mastery" as const, value: pct } : ls !== null ? { kind: "score" as const, value: round1(ls) } : cards ? { kind: "cards" as const, value: cards } : { kind: "none" as const, value: null };
        const u = upcoming.find((x) => x.subject === subject);
        const nextItem = u
          ? { title: u.title, when: `${vnDay(new Date(u.dueAt)) === today ? "Hôm nay" : weekdayLong(new Date(u.dueAt))} ${vnTime(new Date(u.dueAt))}${u.attemptsAllowed === 1 ? " · làm 1 lần" : ""}` }
          : cards
            ? { title: `${cards} thẻ ôn đến hạn`, when: `Ôn trong ${Math.max(1, Math.round(cards * 0.4))} phút` }
            : null;
        return { subject, metric, next: nextItem, weight: n + (u ? 100 : 0) + cards };
      })
      .sort((a, b) => b.weight - a.weight || a.subject.localeCompare(b.subject, "vi"))
      .slice(0, 3)
      .map(({ weight: _w, ...s }) => s);

    const counts = dailyCounts(activity, t, STREAK_WINDOW);
    const streak = streakOf(counts.map((c) => c.count));
    const me = studs[0];
    return {
      now: t.toISOString(),
      date: { day: today, weekday: vnWeekday(t) },
      student: { name: me?.fullName ?? input.name, className: cls.find((c) => c.id === me?.classId)?.name ?? null, classId: me?.classId ?? null },
      next,
      upcoming: upcoming.slice(0, 6),
      subjects,
      mastery: best,
      review,
      days: counts.slice(-14),
      streak: { ...streak, goal: DAILY_GOAL },
      canTutor: input.learner !== null,
    };
  }

  /** Hồ sơ HS của một tài khoản Keycloak (đã được GV xác nhận). */
  async function studentIdsOfUser(userId: string): Promise<string[]> {
    return (await db.select({ id: students.id }).from(students).where(and(eq(students.userId, userId), eq(students.linkPending, false), isNotNull(students.userId)))).map((r) => r.id);
  }

  return { teacher, student, studentIdsOfUser };
}
export type TodayService = ReturnType<typeof createTodayService>;

const LONG = { CN: "Chủ nhật", T2: "Thứ Hai", T3: "Thứ Ba", T4: "Thứ Tư", T5: "Thứ Năm", T6: "Thứ Sáu", T7: "Thứ Bảy" } as const;
const weekdayLong = (d: Date) => LONG[vnWeekday(d)];
