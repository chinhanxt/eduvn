// Sinh câu hỏi: ý tưởng → câu hỏi đúng schema ngân hàng EDUVN → bản nháp (GV duyệt) hoặc luyện ngay.
// Port từ DeepTutor deeptutor/agents/question (idea_agent → deep_question → followup_agent) (Apache-2.0),
// đã sửa: bỏ vòng explore/tool, tư liệu lấy bằng BM25, đầu ra kiểm bằng zod QuestionInput, hỏi lại một lần khi sai schema.
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { insertQuestion } from "../db/repo";
import { tutorDrafts } from "../db/schema";
import { assertCan } from "../domain/authz";
import { LEVELS, QUESTION_TYPES, QuestionInput, type QuestionType } from "../domain/question";
import { NotFoundError, ValidationError } from "../errors";
import { type Ai, parseAiJson } from "../services/ai";
import type { Learner } from "./chat";
import type { Actor, KbService } from "./kb";
import type { PracticeService } from "./practice";
import { toPublic } from "./practice";
import { FOLLOWUP_SYSTEM, FOLLOWUP_USER, IDEA_SYSTEM, QUESTION_SYSTEM } from "./prompts/vi/question";
import { TASK, fill } from "./tasks";

const GenInput = z.object({
  kbId: z.uuid().optional(),
  subject: z.string().trim().min(1),
  grade: z.number().int().min(1).max(16),
  topic: z.string().trim().min(1).max(200),
  count: z.number().int().min(1).max(10).default(5),
  types: z.array(z.enum(QUESTION_TYPES)).min(1).default(["mcq", "true_false", "short_answer"]),
  level: z.enum(LEVELS).optional(),
  /** draft = vào hàng chờ duyệt của GV; practice = HS luyện ngay (riêng tư). */
  mode: z.enum(["draft", "practice"]).default("draft"),
});

type Idea = { focus: string; level: (typeof LEVELS)[number]; type: QuestionType };

function pickIdeas(raw: unknown, input: z.infer<typeof GenInput>): Idea[] {
  const list = Array.isArray((raw as { ideas?: unknown })?.ideas) ? ((raw as { ideas: Record<string, unknown>[] }).ideas) : [];
  const ideas: Idea[] = [];
  for (let i = 0; i < input.count; i++) {
    const r = list[i] ?? {};
    const type = input.types.includes(r.type as QuestionType) ? (r.type as QuestionType) : input.types[i % input.types.length]!;
    const level = input.level ?? (LEVELS.includes(r.level as never) ? (r.level as Idea["level"]) : LEVELS[i % LEVELS.length]!);
    ideas.push({ focus: typeof r.focus === "string" && r.focus ? r.focus : input.topic, level, type });
  }
  return ideas;
}

const stripLabel = (s: unknown) => (typeof s === "string" ? s.replace(/^\s*[A-Da-d][.)]\s+/, "") : s);

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k]!);
    }
  }));
  return out;
}

export function createQuestionService(deps: { db: Db; ai: Ai; kb: KbService; practice: PracticeService }) {
  const { db, ai, kb, practice } = deps;

  async function writeOne(idea: Idea, input: z.infer<typeof GenInput>, context: string): Promise<QuestionInput | null> {
    const userMsg = `Môn: ${input.subject} lớp ${input.grade}\nChủ đề: ${input.topic}\nÝ tưởng: ${idea.focus}\nMức: ${idea.level}\nLoại câu: ${idea.type}${context ? `\n\nTƯ LIỆU THAM KHẢO:\n${context}` : ""}`;
    let issues = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const raw = await ai.chat(TASK.question, [{ role: "system", content: QUESTION_SYSTEM }, { role: "user", content: issues ? `${userMsg}\n\nLần trước câu hỏi sai định dạng, hãy sửa:\n${issues}` : userMsg }], { json: true });
      let obj: Record<string, unknown>;
      try {
        obj = parseAiJson(raw) as Record<string, unknown>;
      } catch {
        issues = "Không phải JSON hợp lệ";
        continue;
      }
      if (Array.isArray(obj.options)) obj.options = obj.options.map(stripLabel);
      if (Array.isArray(obj.statements)) obj.statements = obj.statements.map(stripLabel);
      const parsed = QuestionInput.safeParse({ ...obj, type: obj.type ?? idea.type, subject: input.subject, grade: input.grade, topic: input.topic, level: idea.level, tags: ["ai-gia-su"] });
      if (parsed.success) return parsed.data;
      issues = parsed.error.issues.map((i) => `${i.path.join(".") || "gốc"}: ${i.message}`).join("; ");
    }
    return null;
  }

  async function generate(actor: Actor, raw: unknown) {
    const input = GenInput.parse(raw);
    if (input.mode === "draft") assertCan(actor.role, "tutor:manage");
    let context = "";
    if (input.kbId) {
      const hits = await kb.search(actor, input.kbId, input.topic, 6);
      context = hits.map((h) => `- (${h.doc}, trang ${h.page}) ${h.text}`).join("\n");
    }
    let ideas: Idea[];
    try {
      const rawIdeas = await ai.chat(TASK.question, [{ role: "system", content: fill(IDEA_SYSTEM, { count: input.count }) }, { role: "user", content: `Môn: ${input.subject} lớp ${input.grade}\nChủ đề: ${input.topic}\nLoại câu cho phép: ${input.types.join(", ")}${input.level ? `\nMức: ${input.level}` : ""}${context ? `\n\nTƯ LIỆU:\n${context}` : ""}` }], { json: true });
      ideas = pickIdeas(parseAiJson(rawIdeas), input);
    } catch {
      ideas = pickIdeas({}, input);
    }
    const written = await pool(ideas, 4, (idea) => writeOne(idea, input, context));
    const ok = written.filter((q): q is QuestionInput => q !== null);
    if (!ok.length) throw new ValidationError(["AI chưa sinh được câu hỏi hợp lệ, hãy thử lại hoặc đổi chủ đề"]);
    const status = input.mode === "draft" ? "pending" : "practice";
    const rows = await db.insert(tutorDrafts).values(ok.map((body) => ({ orgId: actor.orgId, ownerId: actor.userId, status, kbId: input.kbId ?? null, subject: input.subject, grade: input.grade, topic: input.topic, body }))).returning();
    return {
      requested: input.count,
      created: rows.length,
      status,
      questions: rows.map((r) => (input.mode === "practice" ? toPublic({ id: r.id, subject: r.subject, grade: r.grade, topic: r.topic, level: r.body.level, body: r.body }) : { id: r.id, status: r.status, subject: r.subject, grade: r.grade, topic: r.topic, body: r.body })),
    };
  }

  async function listDrafts(actor: Actor) {
    assertCan(actor.role, "tutor:manage");
    return db.select().from(tutorDrafts).where(and(eq(tutorDrafts.orgId, actor.orgId), eq(tutorDrafts.status, "pending"))).orderBy(desc(tutorDrafts.createdAt)).limit(200);
  }

  async function loadDraft(actor: Actor, id: string) {
    if (!z.uuid().safeParse(id).success) throw new NotFoundError("Không tìm thấy bản nháp");
    const [d] = await db.select().from(tutorDrafts).where(and(eq(tutorDrafts.id, id), eq(tutorDrafts.orgId, actor.orgId), eq(tutorDrafts.status, "pending")));
    if (!d) throw new NotFoundError("Không tìm thấy bản nháp đang chờ duyệt");
    return d;
  }

  /** GV duyệt: chuyển vào ngân hàng câu hỏi (có thể sửa nội dung trước khi duyệt). */
  async function approve(actor: Actor, id: string, edited?: unknown) {
    assertCan(actor.role, "tutor:manage");
    const d = await loadDraft(actor, id);
    const body = edited === undefined ? d.body : QuestionInput.parse(edited);
    const stored = await insertQuestion(db, actor.orgId, actor.userId, body);
    await db.update(tutorDrafts).set({ status: "approved", bankQuestionId: stored.id, body }).where(eq(tutorDrafts.id, d.id));
    return stored;
  }

  async function reject(actor: Actor, id: string) {
    assertCan(actor.role, "tutor:manage");
    const d = await loadDraft(actor, id);
    await db.update(tutorDrafts).set({ status: "rejected" }).where(eq(tutorDrafts.id, d.id));
  }

  /** Hỏi tiếp về một câu bài tập (followup_agent). */
  async function followup(l: Learner, raw: unknown) {
    const b = z.object({ questionId: z.uuid(), message: z.string().trim().min(1).max(2000), userAnswer: z.unknown().optional(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(3000) })).max(10).default([]) }).parse(raw);
    const q = await practice.resolve(l, b.questionId);
    const body = q.body;
    const ctx = [`Đề: ${body.stem}`, body.type === "mcq" ? `Phương án: ${body.options.map((o, i) => `${"ABCD"[i]}. ${o}`).join(" | ")}` : "", body.type === "true_false" ? `Các ý: ${body.statements.map((s, i) => `${"abcd"[i]}) ${s}`).join(" | ")}` : "", b.userAnswer !== undefined ? `Bài làm của em: ${JSON.stringify(b.userAnswer)}` : "", `Đáp án đúng: ${JSON.stringify(body.type === "essay" ? body.rubric : body.answer)}`, body.explanation ? `Lời giải: ${body.explanation}` : ""].filter(Boolean).join("\n");
    const reply = await ai.chat(TASK.chat, [{ role: "system", content: FOLLOWUP_SYSTEM }, { role: "user", content: fill(FOLLOWUP_USER, { question: ctx, history: b.history.map((h) => `${h.role === "user" ? "Em" : "Gia sư"}: ${h.content}`).join("\n") || "(chưa có)", message: b.message }) }]);
    return { reply };
  }

  return { generate, listDrafts, approve, reject, followup };
}
export type QuestionService = ReturnType<typeof createQuestionService>;
