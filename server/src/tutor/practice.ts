// Luyện tập + ôn giãn cách trên ngân hàng câu hỏi EDUVN.
// Port từ DeepTutor deeptutor/services/practice (scheduler.py, answers.py, analytics.py) (Apache-2.0),
// đã sửa: Postgres thay SQLite, chấm bằng domain/scoring.ts của EDUVN, câu mở chấm qua AI.
import { and, asc, eq, gte, inArray, lte, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { questions, tutorDrafts, tutorReviewEvents, tutorReviewState } from "../db/schema";
import type { QuestionInput } from "../domain/question";
import { type ResponseValue, maxPoints, rulesForSubject, scoreItem } from "../domain/scoring";
import { DAY_MS, INITIAL_STATE, type Rating, type ReviewState, autoRating, schedule } from "../domain/tutorLearning";
import { NotFoundError, ValidationError } from "../errors";
import type { Ai } from "../services/ai";
import type { Learner } from "./chat";
import { gradeEssay, gradeShortAnswers } from "./grader";

export type PracticeQuestion = { id: string; subject: string; grade: number; topic: string; level: string; body: QuestionInput };

/** Bản gửi cho học sinh: bỏ đáp án, lời giải, rubric. */
export function toPublic(q: PracticeQuestion) {
  const b = q.body;
  const base = { id: q.id, type: b.type, subject: q.subject, grade: q.grade, topic: q.topic, level: q.level, stem: b.stem };
  switch (b.type) {
    case "mcq":
      return { ...base, options: b.options };
    case "true_false":
      return { ...base, statements: b.statements };
    case "short_answer":
      return base;
    case "essay":
      return { ...base, points: b.points };
  }
}

const Filter = z.object({ subject: z.string().trim().min(1), grade: z.coerce.number().int().min(1).max(16), topic: z.string().trim().min(1).optional() });
const AnswerBody = z.object({ questionId: z.uuid(), response: z.union([z.number().int(), z.array(z.boolean()), z.string(), z.null()]) });
const RateBody = z.object({ questionId: z.uuid(), rating: z.enum(["again", "hard", "good", "easy"]) });

const LEVEL_ORDER: Record<string, number> = { NB: 0, TH: 1, VD: 2 };

export function createPracticeService(db: Db, ai: Ai) {
  async function resolve(l: Learner, id: string): Promise<PracticeQuestion> {
    const [q] = await db.select().from(questions).where(and(eq(questions.id, id), eq(questions.orgId, l.orgId)));
    if (q) return { id: q.id, subject: q.subject, grade: q.grade, topic: q.topic, level: q.level, body: q.body };
    const [d] = await db.select().from(tutorDrafts).where(and(eq(tutorDrafts.id, id), eq(tutorDrafts.orgId, l.orgId), eq(tutorDrafts.ownerId, l.learnerKey), eq(tutorDrafts.status, "practice")));
    if (d) return { id: d.id, subject: d.subject, grade: d.grade, topic: d.topic, level: d.body.level, body: d.body };
    throw new NotFoundError("Không tìm thấy câu hỏi");
  }

  const scope = (l: Learner) => and(eq(tutorReviewState.orgId, l.orgId), eq(tutorReviewState.learnerKey, l.learnerKey));

  async function next(l: Learner, rawFilter: unknown) {
    const f = Filter.parse(rawFilter);
    const now = new Date();
    const match = and(scope(l), eq(tutorReviewState.subject, f.subject), eq(tutorReviewState.grade, f.grade), f.topic ? eq(tutorReviewState.topic, f.topic) : undefined);
    const dueRows = await db.select().from(tutorReviewState).where(and(match, lte(tutorReviewState.dueAt, now))).orderBy(sql`${tutorReviewState.isMistake} desc`, asc(tutorReviewState.dueAt)).limit(50);
    const seenIds = (await db.select({ id: tutorReviewState.questionId }).from(tutorReviewState).where(and(scope(l), eq(tutorReviewState.subject, f.subject), eq(tutorReviewState.grade, f.grade)))).map((r) => r.id);
    const fresh = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.orgId, l.orgId), eq(questions.subject, f.subject), eq(questions.grade, f.grade), f.topic ? eq(questions.topic, f.topic) : undefined, seenIds.length ? notInArray(questions.id, seenIds) : undefined))
      .limit(500);
    const counts = { due: dueRows.length, new: fresh.length };
    for (const r of dueRows) {
      try {
        const q = await resolve(l, r.questionId);
        return { mode: "review" as const, question: toPublic(q), counts };
      } catch {
        // Câu đã bị xoá khỏi ngân hàng: bỏ trạng thái ôn mồ côi.
        await db.delete(tutorReviewState).where(and(scope(l), eq(tutorReviewState.questionId, r.questionId)));
      }
    }
    if (fresh.length) {
      const rows = await db.select().from(questions).where(inArray(questions.id, fresh.map((x) => x.id)));
      rows.sort((a, b) => (LEVEL_ORDER[a.level] ?? 1) - (LEVEL_ORDER[b.level] ?? 1) || (a.id < b.id ? -1 : 1));
      const lowest = LEVEL_ORDER[rows[0]!.level] ?? 1;
      const pool = rows.filter((r) => (LEVEL_ORDER[r.level] ?? 1) === lowest);
      const pick = pool[Math.floor(Math.random() * pool.length)]!;
      return { mode: "new" as const, question: toPublic({ id: pick.id, subject: pick.subject, grade: pick.grade, topic: pick.topic, level: pick.level, body: pick.body }), counts };
    }
    return { mode: "done" as const, question: null, counts };
  }

  async function answer(l: Learner, raw: unknown) {
    const b = AnswerBody.parse(raw);
    const q = await resolve(l, b.questionId);
    const rules = rulesForSubject(q.subject);
    const max = maxPoints(q.body, rules);
    let ratio = 0;
    let feedback = "";
    let graded: "auto" | "ai" = "auto";
    if (q.body.type === "essay") {
      if (typeof b.response !== "string" || !b.response.trim()) throw new ValidationError(["Em chưa viết bài làm"]);
      const g = await gradeEssay(ai, q.body, b.response);
      ratio = g.score;
      feedback = g.feedback;
      graded = "ai";
    } else {
      const pts = scoreItem(q.body, b.response as ResponseValue, rules) ?? 0;
      ratio = max ? pts / max : 0;
      if (ratio < 1 && q.body.type === "short_answer" && typeof b.response === "string" && b.response.trim()) {
        try {
          const [g] = await gradeShortAnswers(ai, [{ question: q.body.stem, expected: q.body.answer, answer: b.response }]);
          if (g) {
            graded = "ai";
            feedback = g.feedback;
            if (g.correct) ratio = 1;
          }
        } catch {
          // Cổng AI bận: giữ kết quả chấm cứng.
        }
      }
    }
    const correct = ratio >= 0.999;
    const rating: Rating = ratio >= 0.999 ? autoRating(true) : ratio >= 0.5 ? "hard" : "again";
    const now = Date.now();
    const [cur] = await db.select().from(tutorReviewState).where(and(scope(l), eq(tutorReviewState.questionId, q.id)));
    const prevState: Partial<ReviewState> | undefined = cur ? stateOf(cur) : undefined;
    const st = schedule(prevState ?? INITIAL_STATE, rating, now);
    const row = {
      intervalDays: st.intervalDays, ease: st.ease, streak: st.streak, lapses: st.lapses, reviewCount: st.reviewCount, version: st.version,
      dueAt: new Date(st.dueAt), lastReviewAt: new Date(now), prev: (prevState ?? null) as Record<string, number> | null, lastCorrect: correct,
      isMistake: !correct, subject: q.subject, grade: q.grade, topic: q.topic,
    };
    await db.insert(tutorReviewState).values({ orgId: l.orgId, learnerKey: l.learnerKey, questionId: q.id, ...row, firstWrongAt: correct ? null : new Date(now) })
      .onConflictDoUpdate({ target: [tutorReviewState.orgId, tutorReviewState.learnerKey, tutorReviewState.questionId], set: { ...row, firstWrongAt: correct ? sql`${tutorReviewState.firstWrongAt}` : sql`coalesce(${tutorReviewState.firstWrongAt}, ${new Date(now)})` } });
    await db.insert(tutorReviewEvents).values({ orgId: l.orgId, learnerKey: l.learnerKey, questionId: q.id, rating, correct });
    return {
      correct, partial: !correct && ratio > 0, score: Math.round(ratio * max * 100) / 100, max, graded, feedback,
      explanation: q.body.explanation ?? null, answer: revealAnswer(q.body), rating, nextDueAt: new Date(st.dueAt).toISOString(), intervalDays: st.intervalDays,
    };
  }

  /** HS tự đánh giá độ khó sau khi trả lời đúng (hard/good/easy) → xếp lại lịch từ trạng thái trước lần trả lời. */
  async function rate(l: Learner, raw: unknown) {
    const b = RateBody.parse(raw);
    const [cur] = await db.select().from(tutorReviewState).where(and(scope(l), eq(tutorReviewState.questionId, b.questionId)));
    if (!cur) throw new NotFoundError("Em chưa làm câu này");
    if (!cur.lastCorrect && b.rating !== "again") throw new ValidationError(["Câu này em làm chưa đúng nên chỉ có thể đặt \"ôn lại ngay\""]);
    const st = schedule((cur.prev as Partial<ReviewState> | null) ?? INITIAL_STATE, b.rating, Date.now());
    await db.update(tutorReviewState).set({ intervalDays: st.intervalDays, ease: st.ease, streak: st.streak, lapses: st.lapses, reviewCount: st.reviewCount, version: st.version, dueAt: new Date(st.dueAt) }).where(and(scope(l), eq(tutorReviewState.questionId, b.questionId)));
    return { rating: b.rating, nextDueAt: new Date(st.dueAt).toISOString(), intervalDays: st.intervalDays };
  }

  function stateOf(r: typeof tutorReviewState.$inferSelect): ReviewState {
    return { intervalDays: r.intervalDays, ease: r.ease, streak: r.streak, lapses: r.lapses, dueAt: r.dueAt.getTime(), lastReviewAt: r.lastReviewAt.getTime(), reviewCount: r.reviewCount, version: r.version };
  }

  async function stats(l: Learner, rawDays: unknown) {
    const days = z.coerce.number().int().min(1).max(90).catch(7).parse(rawDays);
    const since = new Date(Date.now() - days * DAY_MS);
    const events = await db.select().from(tutorReviewEvents).where(and(eq(tutorReviewEvents.orgId, l.orgId), eq(tutorReviewEvents.learnerKey, l.learnerKey), gte(tutorReviewEvents.reviewedAt, since)));
    const byDay = new Map<string, { date: string; answered: number; correct: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
      byDay.set(d, { date: d, answered: 0, correct: 0 });
    }
    for (const e of events) {
      const cell = byDay.get(e.reviewedAt.toISOString().slice(0, 10));
      if (cell) {
        cell.answered++;
        if (e.correct) cell.correct++;
      }
    }
    const states = await db.select().from(tutorReviewState).where(scope(l));
    const now = Date.now();
    const topics = new Map<string, { subject: string; grade: number; topic: string; learned: number; mistakes: number; due: number }>();
    for (const s of states) {
      const k = `${s.subject}|${s.grade}|${s.topic}`;
      const t = topics.get(k) ?? { subject: s.subject, grade: s.grade, topic: s.topic, learned: 0, mistakes: 0, due: 0 };
      t.learned++;
      if (s.isMistake) t.mistakes++;
      if (s.dueAt.getTime() <= now) t.due++;
      topics.set(k, t);
    }
    return {
      days,
      learned: states.length,
      due: states.filter((s) => s.dueAt.getTime() <= now).length,
      mistakes: states.filter((s) => s.isMistake).length,
      answered: events.length,
      accuracy: events.length ? Math.round((100 * events.filter((e) => e.correct).length) / events.length) : null,
      daily: [...byDay.values()],
      topics: [...topics.values()].sort((a, b) => b.mistakes - a.mistakes || b.due - a.due),
    };
  }

  return { next, answer, rate, stats, resolve };
}
export type PracticeService = ReturnType<typeof createPracticeService>;

function revealAnswer(b: QuestionInput): unknown {
  switch (b.type) {
    case "mcq":
    case "true_false":
    case "short_answer":
      return b.answer;
    case "essay":
      return b.rubric;
  }
}
