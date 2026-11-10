// Gia sư chat: truy hồi kho tri thức → trả lời stream có trích dẫn [n], nhớ hội thoại, Socratic.
// Port từ DeepTutor deeptutor/agents/chat + services/{chat_hints,mastery_hints,rag/query_rewrite}.py
// (Apache-2.0), đã sửa: một lượt truy hồi + một lượt trả lời (bỏ vòng agentic nhiều tool), lưu Postgres.
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { type TutorCitation, tutorBookPages, tutorMessages, tutorSessions } from "../db/schema";
import { citedNumbers, foldVi } from "../domain/tutorSearch";
import { NotFoundError } from "../errors";
import type { Ai, AiMessage, AiPart } from "../services/ai";
import type { KbService } from "./kb";
import { ASK_HINT_SYSTEM, CONTEXT_BLOCK, REWRITE_SYSTEM, SOCRATIC_SYSTEM, STARTERS_SYSTEM, SUMMARY_SYSTEM, TITLE_SYSTEM, TUTOR_SYSTEM } from "./prompts/vi/chat";
import { TASK, fill } from "./tasks";

export type Learner = { orgId: string; learnerKey: string; classId?: string };
type Actor = { userId: string; orgId: string; role: import("../domain/authz").Role };
export const learnerOf = (a: Actor): Learner => ({ orgId: a.orgId, learnerKey: a.userId });

const ChatBody = z.object({
  sessionId: z.uuid().optional(),
  kbId: z.uuid().optional(),
  message: z.string().trim().min(1, "Hãy nhập câu hỏi").max(4000),
  mode: z.enum(["chat", "hint"]).default("chat"),
  hintLevel: z.number().int().min(1).max(3).default(1),
  images: z.array(z.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,/).max(6_000_000)).max(3).default([]),
  context: z.object({ bookPageId: z.uuid().optional() }).default({}),
});

export type ChatEvent =
  | { type: "meta"; sessionId: string; citations: TutorCitation[]; query: string }
  | { type: "delta"; text: string }
  | { type: "done"; messageId: string; citations: TutorCitation[] }
  | { type: "title"; title: string };

const HISTORY_WINDOW = 16;
const KEEP_AFTER_SUMMARY = 6;
const SUMMARY_TRIGGER_CHARS = 6000;
/** Ngân sách (ms) cho việc viết lại truy vấn bằng AI trước khi gia sư trả lời. Mặc định 0 = tắt: dùng ngay bản ghép từ khoá của câu trước
 *  để chữ đầu của gia sư không bị chậm thêm một lượt gọi AI (đặt TUTOR_REWRITE_BUDGET_MS=2000 để bật). Quá hạn thì cũng rơi về bản ghép. */
const rewriteBudget = () => Number(process.env.TUTOR_REWRITE_BUDGET_MS ?? 0);
const ANAPHORA = new Set("no do nay kia vay the tiep con ay day".split(" "));

export function isFollowUp(message: string, hasHistory: boolean): boolean {
  if (!hasHistory) return false;
  const words = foldVi(message).match(/[a-z0-9]+/g) ?? [];
  return message.length < 50 || words.some((w) => ANAPHORA.has(w));
}

const clean = (raw: string) => {
  for (const line of raw.split("\n")) {
    const t = line.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
    if (t) return t;
  }
  return "";
};

export function createChatService(deps: { db: Db; ai: Ai; kb: KbService }) {
  const { db, ai, kb } = deps;
  const background = new Set<Promise<unknown>>();
  const track = (p: Promise<unknown>) => {
    const q = p.catch(() => {}).finally(() => background.delete(q));
    background.add(q);
  };

  async function loadSession(l: Learner, id: string) {
    const [s] = await db.select().from(tutorSessions).where(and(eq(tutorSessions.id, id), eq(tutorSessions.orgId, l.orgId), eq(tutorSessions.learnerKey, l.learnerKey)));
    if (!s) throw new NotFoundError("Không tìm thấy cuộc trò chuyện");
    return s;
  }

  async function history(sessionId: string) {
    return db.select().from(tutorMessages).where(eq(tutorMessages.sessionId, sessionId)).orderBy(asc(tutorMessages.seq));
  }

  async function addMessage(sessionId: string, seq: number, role: "user" | "assistant", content: string, citations: TutorCitation[] = []) {
    const [row] = await db.insert(tutorMessages).values({ sessionId, seq, role, content, citations }).returning({ id: tutorMessages.id });
    await db.update(tutorSessions).set({ updatedAt: new Date() }).where(eq(tutorSessions.id, sessionId));
    return row!.id;
  }

  /** Viết lại truy vấn khi là câu nối tiếp; thất bại thì ghép với câu hỏi trước (fail-open). */
  async function rewriteQuery(message: string, hist: { role: string; content: string }[]): Promise<string> {
    if (!isFollowUp(message, hist.length > 0)) return message;
    const lastUser = [...hist].reverse().find((m) => m.role === "user")?.content ?? "";
    const fallback = `${lastUser} ${message}`.trim();
    const budget = rewriteBudget();
    if (budget <= 0) return fallback;
    try {
      const tail = hist.slice(-4).map((m) => `${m.role === "user" ? "Học sinh" : "Gia sư"}: ${m.content.slice(0, 500)}`).join("\n");
      const raw = await ai.chat(TASK.aux, [{ role: "system", content: REWRITE_SYSTEM }, { role: "user", content: `Hội thoại gần đây:\n${tail}\n\nCâu hỏi mới: ${message}\n\nCâu truy vấn độc lập:` }], { signal: AbortSignal.timeout(budget) });
      return clean(raw) || fallback;
    } catch {
      return fallback;
    }
  }

  async function pageContext(orgId: string, pageId: string | undefined): Promise<string> {
    if (!pageId) return "";
    const [p] = await db.select().from(tutorBookPages).where(eq(tutorBookPages.id, pageId));
    if (!p) return "";
    const text = p.blocks.map((b) => b.markdown ?? "").filter(Boolean).join("\n\n").slice(0, 5000);
    return `Em đang đọc trang giáo trình "${p.title}". Nội dung trang:\n${text}\nHãy ưu tiên giải thích đúng phần em đang đọc.`;
  }

  async function* stream(l: Learner, raw: unknown, signal?: AbortSignal): AsyncGenerator<ChatEvent, void, void> {
    const body = ChatBody.parse(raw);
    let session = body.sessionId ? await loadSession(l, body.sessionId) : null;
    const kbId = body.kbId ?? session?.kbId ?? undefined;
    if (kbId) await kb.loadKb({ ...l, userId: l.learnerKey, role: "student" }, kbId);
    if (!session) {
      [session] = await db.insert(tutorSessions).values({ orgId: l.orgId, learnerKey: l.learnerKey, kbId: kbId ?? null, mode: body.mode, context: body.context }).returning();
    } else if (body.context.bookPageId && session.context.bookPageId !== body.context.bookPageId) {
      await db.update(tutorSessions).set({ context: { ...session.context, bookPageId: body.context.bookPageId } }).where(eq(tutorSessions.id, session.id));
    }
    const s = session!;
    const hist = await history(s.id);

    // Truy hồi.
    const query = kbId ? await rewriteQuery(body.message, hist) : body.message;
    const actor = { userId: l.learnerKey, orgId: l.orgId, role: "student" as const };
    const hits = kbId ? await kb.search(actor, kbId, query, 5) : [];
    const citations = kb.toCitations(hits);
    yield { type: "meta", sessionId: s.id, citations, query };

    // Lắp prompt.
    const system = body.mode === "hint" ? fill(SOCRATIC_SYSTEM, { level: body.hintLevel }) : TUTOR_SYSTEM;
    const sys: AiMessage[] = [{ role: "system", content: system }];
    if (citations.length) sys.push({ role: "system", content: fill(CONTEXT_BLOCK, { sources: citations.map((c, i) => `[${c.n}] (${c.doc}, trang ${c.page})\n${hits[i]!.text}`).join("\n\n") }) });
    else if (kbId) sys.push({ role: "system", content: "Kho tri thức không có đoạn nào liên quan tới câu hỏi này; hãy nói rõ và trả lời từ kiến thức chung, không chèn trích dẫn." });
    const pageCtx = await pageContext(l.orgId, body.context.bookPageId ?? s.context.bookPageId);
    if (pageCtx) sys.push({ role: "system", content: pageCtx });
    if (s.summary) sys.push({ role: "system", content: `TÓM TẮT CUỘC TRÒ CHUYỆN TRƯỚC ĐÓ:\n${s.summary}` });
    const recent = (s.summary ? hist.slice(s.summarizedCount) : hist).slice(-HISTORY_WINDOW);
    const turns: AiMessage[] = recent.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const parts: AiPart[] = [{ type: "text", text: body.message }, ...body.images.map((url): AiPart => ({ type: "image_url", image_url: { url } }))];
    const userMsg: AiMessage = { role: "user", content: body.images.length ? parts : body.message };

    let seq = hist.length;
    await addMessage(s.id, seq++, "user", body.images.length ? `${body.message}\n\n[đính kèm ${body.images.length} ảnh]` : body.message);

    let answer = "";
    let savedId = "";
    let savedCites: TutorCitation[] = [];
    try {
      for await (const t of ai.stream(TASK.chat, [...sys, ...turns, userMsg], { signal })) {
        answer += t;
        yield { type: "delta", text: t };
      }
    } finally {
      // Dù bị ngắt giữa chừng vẫn lưu phần đã trả lời.
      if (answer) {
        const used = citedNumbers(answer);
        const cites = citations.filter((c) => used.includes(c.n));
        const id = await addMessage(s.id, seq++, "assistant", answer, cites);
        savedId = id;
        savedCites = cites;
      }
    }
    yield { type: "done", messageId: savedId, citations: savedCites };

    const total = hist.length + 2;
    if (hist.length === 0 && s.title === "Cuộc trò chuyện mới") {
      const title = await makeTitle(body.message, answer);
      if (title) {
        await db.update(tutorSessions).set({ title }).where(eq(tutorSessions.id, s.id));
        yield { type: "title", title };
      }
    }
    track(maybeSummarize(s.id, total));
  }
  async function makeTitle(q: string, a: string): Promise<string> {
    try {
      const raw = await ai.chat(TASK.aux, [{ role: "system", content: TITLE_SYSTEM }, { role: "user", content: `Học sinh hỏi: ${q.slice(0, 300)}\nGia sư trả lời: ${a.slice(0, 300)}` }], { signal: AbortSignal.timeout(8000) });
      return clean(raw).slice(0, 60);
    } catch {
      return q.slice(0, 40);
    }
  }

  /** Tóm tắt khi phần chưa tóm tắt quá dài (context_summary_agent). */
  async function maybeSummarize(sessionId: string, total: number): Promise<void> {
    const [s] = await db.select().from(tutorSessions).where(eq(tutorSessions.id, sessionId));
    if (!s) return;
    const msgs = await history(sessionId);
    const pending = msgs.slice(s.summarizedCount, Math.max(s.summarizedCount, msgs.length - KEEP_AFTER_SUMMARY));
    if (!pending.length || msgs.slice(s.summarizedCount).reduce((a, m) => a + m.content.length, 0) < SUMMARY_TRIGGER_CHARS) return;
    const text = pending.map((m) => `${m.role === "user" ? "Học sinh" : "Gia sư"}: ${m.content}`).join("\n\n");
    const summary = await ai.chat(TASK.aux, [{ role: "system", content: SUMMARY_SYSTEM }, { role: "user", content: `${s.summary ? `Bản tóm tắt hiện có:\n${s.summary}\n\n` : ""}Tư liệu mới:\n${text}` }], { signal: AbortSignal.timeout(30_000) });
    if (summary.trim()) await db.update(tutorSessions).set({ summary: summary.trim(), summarizedCount: s.summarizedCount + pending.length }).where(eq(tutorSessions.id, sessionId));
    void total;
  }

  async function listSessions(l: Learner) {
    return db
      .select({ id: tutorSessions.id, title: tutorSessions.title, kbId: tutorSessions.kbId, mode: tutorSessions.mode, updatedAt: tutorSessions.updatedAt })
      .from(tutorSessions)
      .where(and(eq(tutorSessions.orgId, l.orgId), eq(tutorSessions.learnerKey, l.learnerKey)))
      .orderBy(desc(tutorSessions.updatedAt))
      .limit(100);
  }

  async function getSession(l: Learner, id: string) {
    const s = await loadSession(l, id);
    const msgs = await history(s.id);
    return { id: s.id, title: s.title, kbId: s.kbId, mode: s.mode, summary: s.summary, messages: msgs.map((m) => ({ id: m.id, role: m.role, content: m.content, citations: m.citations })) };
  }

  async function removeSession(l: Learner, id: string) {
    const s = await loadSession(l, id);
    await db.delete(tutorSessions).where(eq(tutorSessions.id, s.id));
  }

  /** Dự đoán một câu hỏi học sinh có thể hỏi tiếp (chat_hints). Chưa có lượt nào → rỗng, không gọi AI. */
  async function askHint(l: Learner, id: string): Promise<{ hint: string }> {
    const s = await loadSession(l, id);
    const msgs = (await history(s.id)).slice(-4);
    if (!msgs.length) return { hint: "" };
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.content ?? "";
    try {
      const raw = await ai.chat(TASK.aux, [{ role: "system", content: ASK_HINT_SYSTEM }, { role: "user", content: msgs.map((m) => `${m.role === "user" ? "Học sinh" : "Gia sư"}: ${m.content.slice(0, 700)}`).join("\n") }], { signal: AbortSignal.timeout(12_000) });
      const lines = raw.split("\n").map((x) => x.trim()).filter(Boolean);
      const t = (lines[0] ?? "").replace(/^[-•*#\s]+/, "").replace(/^["“]|["”]$/g, "").trim();
      if (lines.length !== 1 || !t || t.length > 120 || !t.endsWith("?")) return { hint: "" };
      const a = foldVi(t);
      const b = foldVi(lastUser);
      if (a.length >= 6 && (b.includes(a) || a.includes(b))) return { hint: "" };
      return { hint: t };
    } catch {
      return { hint: "" };
    }
  }

  /** Câu gợi mở màn hình đầu (chat_starters). */
  async function starters(actor: Actor, kbId: string | undefined): Promise<{ starters: string[] }> {
    const fallback = ["Em chưa hiểu bài này, thầy/cô giải thích giúp em từ đầu được không?", "Cho em một ví dụ có lời giải cụ thể nhé.", "Gợi ý cho em cách bắt đầu bài tập này với.", "Em tóm tắt thế này đã đúng chưa, thầy/cô kiểm tra giúp em?"];
    if (!kbId) return { starters: fallback };
    const names = await kb.docNames(actor, kbId);
    const kbRow = await kb.loadKb(actor, kbId);
    try {
      const raw = await ai.chat(TASK.aux, [{ role: "system", content: STARTERS_SYSTEM }, { role: "user", content: `Kho: ${kbRow.name} (${kbRow.subject} lớp ${kbRow.grade})\nTài liệu: ${names.slice(0, 8).join("; ")}` }], { signal: AbortSignal.timeout(10_000) });
      const list = raw.split("\n").map((x) => x.replace(/^[-•*\d.)\s]+/, "").replace(/^["“]|["”]$/g, "").trim()).filter((x) => x.length > 5 && x.length < 140).slice(0, 4);
      return { starters: list.length ? list : fallback };
    } catch {
      return { starters: fallback };
    }
  }

  return { stream, listSessions, getSession, removeSession, askHint, starters, idle: async () => void (await Promise.all([...background])) };
}
export type ChatService = ReturnType<typeof createChatService>;
