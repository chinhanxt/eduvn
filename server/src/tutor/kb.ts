// Kho tri thức: tài liệu → trang → đoạn → chỉ mục BM25 (trong bộ nhớ, dựng lại khi kho đổi).
// Port từ DeepTutor deeptutor/services/rag + knowledge (Apache-2.0), đã sửa: bỏ embedding, BM25 thuần,
// phân quyền theo vai trò EDUVN (GV tải, mọi người đã đăng nhập đọc/tra cứu).
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { type TutorCitation, lessonPlans, tutorChunks, tutorDocs, tutorKbs } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type LessonPlan } from "../domain/lesson";
import { Bm25, chunkPages } from "../domain/tutorSearch";
import { NotFoundError, ValidationError } from "../errors";
import { extractPages, lessonPlanPages } from "./extract";

export type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type Passage = { id: string; docId: string; doc: string; page: number; text: string };

const KbInput = z.object({ name: z.string().trim().min(1).max(120), subject: z.string().trim().min(1).max(60), grade: z.number().int().min(1).max(16), classId: z.uuid().optional() });

export type DocInput =
  | { name: string; contentBase64: string }
  | { name: string; text: string }
  | { lessonPlanId: string };

export function createKbService(db: Db) {
  const indexes = new Map<string, { index: Bm25<Passage>; docs: Map<string, string> }>();

  async function loadKb(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy kho tri thức");
    const [kb] = await db.select().from(tutorKbs).where(and(eq(tutorKbs.id, id), eq(tutorKbs.orgId, orgId)));
    if (!kb) throw new NotFoundError("Không tìm thấy kho tri thức");
    return kb;
  }

  async function create(actor: Actor, input: unknown) {
    assertCan(actor.role, "tutor:manage");
    const v = KbInput.parse(input);
    const [row] = await db.insert(tutorKbs).values({ orgId: actor.orgId, ownerId: actor.userId, name: v.name, subject: v.subject, grade: v.grade, classId: v.classId ?? null }).returning();
    return row!;
  }

  async function list(actor: Actor) {
    const kbs = await db.select().from(tutorKbs).where(eq(tutorKbs.orgId, actor.orgId)).orderBy(desc(tutorKbs.createdAt));
    const docCounts = await db.select({ kbId: tutorDocs.kbId, n: count() }).from(tutorDocs).where(eq(tutorDocs.orgId, actor.orgId)).groupBy(tutorDocs.kbId);
    const byKb = new Map(docCounts.map((d) => [d.kbId, d.n]));
    return kbs.map((k) => ({ ...k, docCount: byKb.get(k.id) ?? 0 }));
  }

  async function get(actor: Actor, id: string) {
    const kb = await loadKb(actor.orgId, id);
    const docs = await db.select().from(tutorDocs).where(eq(tutorDocs.kbId, kb.id)).orderBy(asc(tutorDocs.createdAt));
    return { ...kb, docs };
  }

  async function remove(actor: Actor, id: string) {
    assertCan(actor.role, "tutor:manage");
    const kb = await loadKb(actor.orgId, id);
    await db.delete(tutorKbs).where(eq(tutorKbs.id, kb.id));
    indexes.delete(kb.id);
  }

  async function addDocument(actor: Actor, kbId: string, input: DocInput) {
    assertCan(actor.role, "tutor:manage");
    const kb = await loadKb(actor.orgId, kbId);
    let name: string;
    let source: string;
    let pages: string[];
    if ("lessonPlanId" in input) {
      if (!Uuid.safeParse(input.lessonPlanId).success) throw new NotFoundError("Không tìm thấy giáo án");
      const [lp] = await db.select().from(lessonPlans).where(and(eq(lessonPlans.id, input.lessonPlanId), eq(lessonPlans.orgId, actor.orgId)));
      if (!lp) throw new NotFoundError("Không tìm thấy giáo án");
      name = `Giáo án: ${lp.title}`;
      source = "lesson";
      pages = lessonPlanPages(lp.body as LessonPlan);
    } else if ("text" in input) {
      name = input.name.trim() || "Ghi chú";
      source = "text";
      pages = await extractPages(`${name}.txt`, Buffer.from(input.text, "utf8"));
    } else {
      name = input.name.trim();
      if (!name) throw new ValidationError(["Thiếu tên file"]);
      source = "upload";
      pages = await extractPages(name, Buffer.from(input.contentBase64, "base64"));
    }
    const chunks = chunkPages(pages);
    if (!chunks.length) throw new ValidationError(["Tài liệu không có đoạn chữ nào đủ dài để lập chỉ mục"]);
    const chars = pages.reduce((a, p) => a + p.length, 0);
    const doc = await db.transaction(async (tx) => {
      const [d] = await tx.insert(tutorDocs).values({ kbId: kb.id, orgId: actor.orgId, name, source, pages: pages.length, chars }).returning();
      for (let i = 0; i < chunks.length; i += 500) {
        await tx.insert(tutorChunks).values(chunks.slice(i, i + 500).map((c) => ({ docId: d!.id, kbId: kb.id, page: c.page, idx: c.idx, text: c.text })));
      }
      return d!;
    });
    indexes.delete(kb.id);
    void indexOf(kb.id).catch(() => {}); // dựng sẵn chỉ mục để câu hỏi đầu tiên không phải chờ
    return { ...doc, chunks: chunks.length };
  }

  async function removeDocument(actor: Actor, kbId: string, docId: string) {
    assertCan(actor.role, "tutor:manage");
    const kb = await loadKb(actor.orgId, kbId);
    if (!Uuid.safeParse(docId).success) throw new NotFoundError("Không tìm thấy tài liệu");
    const del = await db.delete(tutorDocs).where(and(eq(tutorDocs.id, docId), eq(tutorDocs.kbId, kb.id))).returning({ id: tutorDocs.id });
    if (!del.length) throw new NotFoundError("Không tìm thấy tài liệu");
    indexes.delete(kb.id);
  }

  async function indexOf(kbId: string) {
    let hit = indexes.get(kbId);
    if (!hit) {
      const rows = await db
        .select({ id: tutorChunks.id, docId: tutorChunks.docId, doc: tutorDocs.name, page: tutorChunks.page, text: tutorChunks.text })
        .from(tutorChunks)
        .innerJoin(tutorDocs, eq(tutorDocs.id, tutorChunks.docId))
        .where(eq(tutorChunks.kbId, kbId))
        .orderBy(asc(tutorDocs.createdAt), asc(tutorChunks.idx));
      hit = { index: new Bm25<Passage>(rows), docs: new Map() };
      indexes.set(kbId, hit);
    }
    return hit;
  }

  /** Tra cứu BM25 trong một kho. */
  async function search(actor: Actor, kbId: string, query: string, k = 5): Promise<(Passage & { score: number })[]> {
    await loadKb(actor.orgId, kbId);
    const { index } = await indexOf(kbId);
    return index.search(query, k).map((h) => ({ ...h.item, score: h.score }));
  }

  /** Đoạn trích dẫn đánh số 1..n để đưa vào prompt + gửi cho web. */
  function toCitations(hits: Passage[]): TutorCitation[] {
    return hits.map((h, i) => ({ n: i + 1, docId: h.docId, doc: h.doc, page: h.page, snippet: h.text.length > 220 ? `${h.text.slice(0, 220)}…` : h.text }));
  }

  async function docNames(actor: Actor, kbId: string): Promise<string[]> {
    await loadKb(actor.orgId, kbId);
    return (await db.select({ name: tutorDocs.name }).from(tutorDocs).where(eq(tutorDocs.kbId, kbId)).orderBy(asc(tutorDocs.createdAt))).map((d) => d.name);
  }

  /** Vài đoạn đầu của mỗi tài liệu làm tư liệu dựng lộ trình/giáo trình. */
  async function overview(actor: Actor, kbId: string, perDoc = 6): Promise<{ doc: string; text: string }[]> {
    await loadKb(actor.orgId, kbId);
    const { index } = await indexOf(kbId);
    const seen = new Map<string, number>();
    const out: { doc: string; text: string }[] = [];
    for (const p of index.items) {
      const n = seen.get(p.docId) ?? 0;
      if (n >= perDoc) continue;
      seen.set(p.docId, n + 1);
      out.push({ doc: p.doc, text: p.text });
    }
    return out;
  }

  return { create, list, get, remove, addDocument, removeDocument, search, toCitations, docNames, overview, loadKb: (actor: Actor, id: string) => loadKb(actor.orgId, id) };
}
export type KbService = ReturnType<typeof createKbService>;
