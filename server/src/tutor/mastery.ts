// Lộ trình thành thạo: chẩn đoán → giải thích → luyện → chẩn lỗi → ôn, theo dõi mức thành thạo từng chủ đề.
// Port từ DeepTutor deeptutor/learning (prompts, scheduler) + capabilities/mastery (Apache-2.0), đã sửa:
// luồng prompt tuần tự thay cho vòng agent 19 tool; trạng thái lưu một bản jsonb mỗi lộ trình.
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { type TutorPathBody, tutorPaths } from "../db/schema";
import { KNOWLEDGE_TYPES, type KnowledgeType, type Point, applyEvidence, dueForReview, newPoint, nextPoint, progressOf } from "../domain/tutorLearning";
import { NotFoundError, ValidationError } from "../errors";
import { type Ai, parseAiJson } from "../services/ai";
import type { Learner } from "./chat";
import { gradeShortAnswers } from "./grader";
import type { Actor, KbService } from "./kb";
import { DIAGNOSTIC_SYSTEM, ERROR_DIAGNOSIS_SYSTEM, EXPLAIN_SYSTEM, FEYNMAN_SYSTEM, PRACTICE_SYSTEM, REVIEW_SYSTEM, TOPIC_SYSTEM, TOPIC_USER } from "./prompts/vi/learning";
import { TASK, fill } from "./tasks";

const CreateBody = z.object({ name: z.string().trim().min(1).max(120), goal: z.string().trim().min(1).max(500), subject: z.string().trim().min(1), grade: z.number().int().min(1).max(16), kbId: z.uuid().optional() });
const StepBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("diagnostic") }),
  z.object({ action: z.literal("explain"), pointId: z.string() }),
  z.object({ action: z.literal("quiz"), pointId: z.string(), count: z.number().int().min(1).max(8).default(3) }),
  z.object({ action: z.literal("grade"), answers: z.array(z.string().max(2000)).min(1).max(10) }),
  z.object({ action: z.literal("feynman"), pointId: z.string(), explanation: z.string().trim().min(10).max(3000) }),
  z.object({ action: z.literal("review") }),
]);

const asType = (t: unknown): KnowledgeType => ((KNOWLEDGE_TYPES as readonly string[]).includes(t as string) ? (t as KnowledgeType) : "concept");
const obj = <T,>(raw: string): T => parseAiJson(raw) as T;

export function createMasteryService(deps: { db: Db; ai: Ai; kb: KbService }) {
  const { db, ai, kb } = deps;
  const asActor = (l: Learner): Actor => ({ userId: l.learnerKey, orgId: l.orgId, role: "student" });

  async function load(l: Learner, id: string) {
    if (!z.uuid().safeParse(id).success) throw new NotFoundError("Không tìm thấy lộ trình");
    const [p] = await db.select().from(tutorPaths).where(and(eq(tutorPaths.id, id), eq(tutorPaths.orgId, l.orgId), eq(tutorPaths.learnerKey, l.learnerKey)));
    if (!p) throw new NotFoundError("Không tìm thấy lộ trình");
    return p;
  }

  const save = (id: string, body: TutorPathBody) => db.update(tutorPaths).set({ body, updatedAt: new Date() }).where(eq(tutorPaths.id, id));

  function view(p: typeof tutorPaths.$inferSelect) {
    const b = p.body;
    const now = Date.now();
    return {
      id: p.id, name: p.name, goal: p.goal, subject: p.subject, grade: p.grade, kbId: p.kbId, description: b.description,
      modules: b.modules.map((m) => ({ name: m.name, objective: m.objective, points: m.pointIds.map((id) => b.points.find((x) => x.id === id)!).filter(Boolean) })),
      progress: progressOf(b.points),
      next: nextPoint(b.points),
      due: dueForReview(b.points, now),
      diagnosed: b.diagnosed,
      pending: b.pending ? { kind: b.pending.kind, pointId: b.pending.pointId, questions: b.pending.items.map((i) => i.question) } : null,
      errors: b.errors.slice(-10),
    };
  }

  async function create(l: Learner, raw: unknown) {
    const b = CreateBody.parse(raw);
    let sources = "(chưa có tài liệu — dựa vào Chương trình giáo dục phổ thông 2018)";
    if (b.kbId) {
      const ov = await kb.overview(asActor(l), b.kbId, 4);
      if (ov.length) sources = JSON.stringify({ documents: [...new Set(ov.map((o) => o.doc))], excerpts: ov.slice(0, 14).map((o) => ({ doc: o.doc, text: o.text.slice(0, 400) })) });
    }
    const out = await ai.chat(TASK.learn, [{ role: "system", content: fill(TOPIC_SYSTEM, { moduleLimit: 6 }) }, { role: "user", content: fill(TOPIC_USER, { name: b.name, subject: b.subject, grade: b.grade, goal: b.goal, sources }) }], { json: true });
    const parsed = obj<{ description?: string; modules?: { name?: string; objective?: string; knowledge_points?: { name?: string; type?: string }[] }[] }>(out);
    const points: Point[] = [];
    const modules: TutorPathBody["modules"] = [];
    for (const m of parsed.modules ?? []) {
      const ids: string[] = [];
      for (const k of m.knowledge_points ?? []) {
        if (!k.name) continue;
        const pt = newPoint(`p${points.length + 1}`, String(k.name), asType(k.type));
        points.push(pt);
        ids.push(pt.id);
      }
      if (ids.length) modules.push({ name: String(m.name ?? "Mô-đun"), objective: String(m.objective ?? ""), pointIds: ids });
    }
    if (!points.length) throw new ValidationError(["AI chưa dựng được lộ trình, hãy mô tả mục tiêu cụ thể hơn"]);
    const body: TutorPathBody = { description: String(parsed.description ?? ""), modules, points, pending: null, diagnosed: false, errors: [] };
    const [row] = await db.insert(tutorPaths).values({ orgId: l.orgId, learnerKey: l.learnerKey, kbId: b.kbId ?? null, name: b.name, goal: b.goal, subject: b.subject, grade: b.grade, body }).returning();
    return view(row!);
  }

  async function list(l: Learner) {
    const rows = await db.select().from(tutorPaths).where(and(eq(tutorPaths.orgId, l.orgId), eq(tutorPaths.learnerKey, l.learnerKey))).orderBy(desc(tutorPaths.updatedAt));
    return rows.map((r) => ({ id: r.id, name: r.name, goal: r.goal, subject: r.subject, grade: r.grade, progress: progressOf(r.body.points), updatedAt: r.updatedAt }));
  }

  async function get(l: Learner, id: string) {
    return view(await load(l, id));
  }

  async function remove(l: Learner, id: string) {
    const p = await load(l, id);
    await db.delete(tutorPaths).where(eq(tutorPaths.id, p.id));
  }

  async function context(l: Learner, p: typeof tutorPaths.$inferSelect, query: string) {
    if (!p.kbId) return { text: "", citations: [] };
    const hits = await kb.search(asActor(l), p.kbId, query, 4);
    const citations = kb.toCitations(hits);
    return { text: hits.map((h, i) => `[${i + 1}] (${h.doc}, trang ${h.page}) ${h.text}`).join("\n\n"), citations };
  }

  const pointOf = (b: TutorPathBody, id: string) => {
    const pt = b.points.find((x) => x.id === id);
    if (!pt) throw new NotFoundError("Không có mục tiêu này trong lộ trình");
    return pt;
  };
  const patch = (b: TutorPathBody, pt: Point) => ({ ...b, points: b.points.map((x) => (x.id === pt.id ? pt : x)) });

  async function step(l: Learner, id: string, raw: unknown) {
    const s = StepBody.parse(raw);
    const p = await load(l, id);
    let b = p.body;
    const now = Date.now();
    switch (s.action) {
      case "diagnostic": {
        const names = b.points.map((x) => x.name);
        const ctx = await context(l, p, `${p.name} ${names.slice(0, 4).join(" ")}`);
        const out = await ai.chat(TASK.learn, [{ role: "system", content: DIAGNOSTIC_SYSTEM }, { role: "user", content: `Chủ đề: ${p.name} (${p.subject} lớp ${p.grade})\nCác mục tiêu của lộ trình:\n${names.map((n) => `- ${n}`).join("\n")}${ctx.text ? `\n\nTư liệu:\n${ctx.text}` : ""}` }], { json: true });
        const qs = obj<{ questions?: { point?: string; question?: string; answer?: string; explanation?: string }[] }>(out).questions ?? [];
        const items = qs.filter((q) => q.question && q.answer).slice(0, 8).map((q) => ({ question: String(q.question), answer: String(q.answer), explanation: String(q.explanation ?? ""), pointId: (b.points.find((x) => x.name === q.point) ?? b.points.find((x) => q.point && (x.name.includes(q.point) || q.point.includes(x.name))) ?? b.points[0]!).id }));
        if (!items.length) throw new ValidationError(["AI chưa tạo được bài chẩn đoán, hãy thử lại"]);
        b = { ...b, pending: { kind: "diagnostic", pointId: null, items } };
        await save(p.id, b);
        return { kind: "diagnostic", questions: items.map((i) => ({ question: i.question, point: pointOf(b, i.pointId).name })) };
      }
      case "explain": {
        const pt = pointOf(b, s.pointId);
        const ctx = await context(l, p, `${pt.name} ${p.name}`);
        const text = await ai.chat(TASK.learn, [{ role: "system", content: EXPLAIN_SYSTEM }, { role: "user", content: `Giải thích mục tiêu: ${pt.name} (loại ${pt.type}), thuộc chủ đề "${p.name}", ${p.subject} lớp ${p.grade}.${ctx.text ? `\n\nTÀI LIỆU THAM KHẢO:\n${ctx.text}` : ""}` }]);
        b = patch(b, { ...pt, explained: true, status: pt.status === "new" ? "learning" : pt.status });
        await save(p.id, b);
        return { markdown: text, citations: ctx.citations };
      }
      case "quiz": {
        const pt = pointOf(b, s.pointId);
        const ctx = await context(l, p, `${pt.name} ${p.name}`);
        const out = await ai.chat(TASK.learn, [{ role: "system", content: fill(PRACTICE_SYSTEM, { count: s.count }) }, { role: "user", content: `Mục tiêu: ${pt.name}\nChủ đề: ${p.name} (${p.subject} lớp ${p.grade})${ctx.text ? `\n\nTư liệu:\n${ctx.text}` : ""}` }], { json: true });
        const qs = obj<{ questions?: { question?: string; answer?: string; explanation?: string }[] }>(out).questions ?? [];
        const items = qs.filter((q) => q.question && q.answer).slice(0, s.count).map((q) => ({ question: String(q.question), answer: String(q.answer), explanation: String(q.explanation ?? ""), pointId: pt.id }));
        if (!items.length) throw new ValidationError(["AI chưa tạo được bài luyện, hãy thử lại"]);
        b = { ...b, pending: { kind: "quiz", pointId: pt.id, items } };
        await save(p.id, b);
        return { kind: "quiz", pointId: pt.id, questions: items.map((i) => ({ question: i.question, point: pt.name })) };
      }
      case "grade": {
        const pending = b.pending;
        if (!pending) throw new ValidationError(["Chưa có bài nào đang chờ chấm"]);
        const answers = pending.items.map((_, i) => s.answers[i] ?? "");
        const res = await gradeShortAnswers(ai, pending.items.map((it, i) => ({ question: it.question, expected: it.answer, answer: answers[i]! })));
        // Mỗi mục tiêu nhận một bằng chứng = điểm trung bình các câu thuộc mục tiêu đó.
        const per = new Map<string, number[]>();
        pending.items.forEach((it, i) => per.set(it.pointId, [...(per.get(it.pointId) ?? []), res[i]!.score]));
        for (const [pid, scores] of per) b = patch(b, applyEvidence(pointOf(b, pid), scores.reduce((a, x) => a + x, 0) / scores.length, now));
        if (pending.kind === "diagnostic") b = { ...b, diagnosed: true };
        const wrong = pending.items.map((it, i) => ({ it, r: res[i]!, answer: answers[i]! })).filter((x) => !x.r.correct);
        let diagnoses: { question: string; errorType: string; why: string; remediation: string }[] = [];
        if (wrong.length) {
          try {
            const out = await ai.chat(TASK.learn, [{ role: "system", content: ERROR_DIAGNOSIS_SYSTEM }, { role: "user", content: JSON.stringify(wrong.map((w, index) => ({ index, question: w.it.question, expected: w.it.answer, studentAnswer: w.answer }))) }], { json: true });
            const ds = obj<{ diagnoses?: { index?: number | string; error_type?: string; ai_confirmation?: string; remediation?: string }[] }>(out).diagnoses ?? [];
            const found = ds.flatMap((d) => {
              const w = wrong[Number(d.index)];
              return w ? [{ w, errorType: String(d.error_type ?? "application"), why: String(d.ai_confirmation ?? ""), remediation: String(d.remediation ?? "") }] : [];
            });
            diagnoses = found.map((f) => ({ question: f.w.it.question, errorType: f.errorType, why: f.why, remediation: f.remediation }));
            b = { ...b, errors: [...b.errors, ...found.map((f) => ({ pointId: f.w.it.pointId, question: f.w.it.question, errorType: f.errorType, remediation: f.remediation, at: now }))].slice(-30) };
          } catch (e) {
            // Chẩn lỗi là phần phụ: cổng AI bận thì vẫn trả kết quả chấm.
            console.warn("tutor: chẩn lỗi không thực hiện được:", (e as Error).message);
          }
        }
        b = { ...b, pending: null };
        await save(p.id, b);
        return {
          results: pending.items.map((it, i) => ({ question: it.question, answer: answers[i], expected: it.answer, explanation: it.explanation, correct: res[i]!.correct, score: res[i]!.score, feedback: res[i]!.feedback })),
          diagnoses,
          path: view({ ...p, body: b }),
        };
      }
      case "feynman": {
        const pt = pointOf(b, s.pointId);
        const out = await ai.chat(TASK.learn, [{ role: "system", content: FEYNMAN_SYSTEM }, { role: "user", content: `Khái niệm: ${pt.name}\n\nEm giải thích:\n${s.explanation}` }], { json: true });
        const r = obj<{ passed?: boolean; score?: number; feedback?: string; gap?: string }>(out);
        const score = typeof r.score === "number" ? Math.min(1, Math.max(0, r.score)) : r.passed ? 0.9 : 0.3;
        b = patch(b, applyEvidence(pt, r.passed === false ? Math.min(score, 0.5) : score, now));
        await save(p.id, b);
        return { passed: r.passed ?? score >= 0.8, feedback: String(r.feedback ?? ""), gap: String(r.gap ?? ""), point: pointOf(b, pt.id) };
      }
      case "review": {
        const due = dueForReview(b.points, now);
        if (!due.length) return { due: [], markdown: "" };
        const ctx = await context(l, p, due.map((d) => d.name).join(" "));
        const markdown = await ai.chat(TASK.learn, [{ role: "system", content: REVIEW_SYSTEM }, { role: "user", content: `Các mục tiêu cần ôn:\n${due.map((d) => `- ${d.name}`).join("\n")}${ctx.text ? `\n\nTư liệu:\n${ctx.text}` : ""}` }]);
        return { due, markdown, citations: ctx.citations };
      }
    }
  }

  return { create, list, get, remove, step };
}
export type MasteryService = ReturnType<typeof createMasteryService>;
