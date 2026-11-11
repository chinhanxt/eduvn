// Giáo trình sống (Book): ý tưởng → dàn chương → từng trang (hoạch định khối → viết khối) từ kho tri thức.
// Port từ DeepTutor deeptutor/book (engine, agents, blocks) (Apache-2.0), đã sửa: bỏ khối animation/interactive/
// concept_graph/quiz, source_explorer thay bằng truy hồi BM25, figure xuất mô tả + Mermaid, lưu Postgres.
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { type BookBlock, type TutorCitation, tutorBookPages, tutorBooks } from "../db/schema";
import { assertCan } from "../domain/authz";
import { citedNumbers } from "../domain/tutorSearch";
import { dedupeHeadings, headingsOf } from "../domain/bookBlocks";
import { NotFoundError, ValidationError } from "../errors";
import { type Ai, parseAiJson } from "../services/ai";
import type { Actor, KbService } from "./kb";
import { CALLOUT_SYSTEM, CODE_SYSTEM, DEEP_DIVE_SYSTEM, FIGURE_SYSTEM, FLASH_SYSTEM, IDEATION_SYSTEM, PLANNER_SYSTEM, PLANNER_USER, SECTION_SYSTEM, SPINE_SYSTEM, TEXT_SYSTEM, TIMELINE_SYSTEM } from "./prompts/vi/book";
import { TASK, fill } from "./tasks";

const CreateBody = z.object({ kbId: z.uuid(), intent: z.string().trim().min(3).max(1000) });
const BLOCK_TYPES = ["section", "text", "callout", "figure", "flash_cards", "timeline", "code", "deep_dive"] as const;
type BlockType = (typeof BLOCK_TYPES)[number];
type Planned = { type: BlockType; focus: string; transition: string; params: Record<string, unknown> };
const LEVELS: Record<string, string> = { introductory: "nhập môn", intermediate: "trung bình", advanced: "nâng cao", mixed: "đa dạng" };

const json = <T,>(raw: string): T => parseAiJson(raw) as T;

export function createBookService(deps: { db: Db; ai: Ai; kb: KbService }) {
  const { db, ai, kb } = deps;

  async function loadBook(orgId: string, id: string) {
    if (!z.uuid().safeParse(id).success) throw new NotFoundError("Không tìm thấy giáo trình");
    const [b] = await db.select().from(tutorBooks).where(and(eq(tutorBooks.id, id), eq(tutorBooks.orgId, orgId)));
    if (!b) throw new NotFoundError("Không tìm thấy giáo trình");
    return b;
  }

  async function create(actor: Actor, raw: unknown) {
    assertCan(actor.role, "tutor:manage");
    const b = CreateBody.parse(raw);
    const kbRow = await kb.loadKb(actor, b.kbId);
    const ov = await kb.overview(actor, b.kbId, 5);
    if (!ov.length) throw new ValidationError(["Kho tri thức chưa có tài liệu nào để dựng giáo trình"]);
    const material = JSON.stringify({ documents: [...new Set(ov.map((o) => o.doc))], excerpts: ov.slice(0, 16).map((o) => ({ doc: o.doc, text: o.text.slice(0, 350) })) });
    const idea = json<{ title?: string; description?: string; scope?: string; target_level?: string; estimated_chapters?: number }>(
      await ai.chat(TASK.learn, [{ role: "system", content: IDEATION_SYSTEM }, { role: "user", content: `Ý định: ${b.intent}\nKho: ${kbRow.name} (${kbRow.subject} lớp ${kbRow.grade})\n\n[Nguồn tri thức]\n${material}\n\nĐề xuất giáo trình. Chỉ trả JSON.` }], { json: true }),
    );
    const title = String(idea.title ?? kbRow.name).slice(0, 120);
    const spine = json<{ chapters?: { title?: string; learning_objectives?: string[]; content_type?: string; summary?: string }[] }>(
      await ai.chat(TASK.learn, [{ role: "system", content: SPINE_SYSTEM }, { role: "user", content: `Đề xuất đã duyệt:\n${JSON.stringify(idea)}\n\nTư liệu trong kho:\n${material}\n\nThiết kế dàn chương. Chỉ trả JSON.` }], { json: true }),
    );
    const chapters = (spine.chapters ?? []).filter((c) => c.title).slice(0, 10);
    if (!chapters.length) throw new ValidationError(["AI chưa dựng được dàn chương, hãy thử lại"]);
    const book = await db.transaction(async (tx) => {
      const [row] = await tx.insert(tutorBooks).values({ orgId: actor.orgId, ownerId: actor.userId, kbId: b.kbId, title, description: String(idea.description ?? ""), scope: String(idea.scope ?? ""), level: String(idea.target_level ?? "mixed") }).returning();
      await tx.insert(tutorBookPages).values(chapters.map((c, i) => ({ bookId: row!.id, idx: i, title: String(c.title), summary: String(c.summary ?? ""), objectives: (c.learning_objectives ?? []).map(String), contentType: String(c.content_type ?? "theory") })));
      return row!;
    });
    return get(actor, book.id);
  }

  async function list(actor: Actor) {
    return db.select().from(tutorBooks).where(eq(tutorBooks.orgId, actor.orgId)).orderBy(desc(tutorBooks.createdAt));
  }

  async function get(actor: Actor, id: string) {
    const book = await loadBook(actor.orgId, id);
    const pages = await db.select({ id: tutorBookPages.id, idx: tutorBookPages.idx, title: tutorBookPages.title, summary: tutorBookPages.summary, objectives: tutorBookPages.objectives, status: tutorBookPages.status }).from(tutorBookPages).where(eq(tutorBookPages.bookId, book.id)).orderBy(asc(tutorBookPages.idx));
    return { ...book, pages };
  }

  async function getPage(actor: Actor, bookId: string, idx: number) {
    const book = await loadBook(actor.orgId, bookId);
    const [p] = await db.select().from(tutorBookPages).where(and(eq(tutorBookPages.bookId, book.id), eq(tutorBookPages.idx, idx)));
    if (!p) throw new NotFoundError("Không có trang này");
    return { ...p, bookTitle: book.title, kbId: book.kbId };
  }

  async function remove(actor: Actor, id: string) {
    assertCan(actor.role, "tutor:manage");
    const book = await loadBook(actor.orgId, id);
    await db.delete(tutorBooks).where(eq(tutorBooks.id, book.id));
  }

  const defaultPlan = (p: { title: string }): Planned[] => [
    { type: "section", focus: p.title, transition: "", params: { role: "core" } },
    { type: "callout", focus: p.title, transition: "", params: { variant: "key_idea" } },
    { type: "flash_cards", focus: p.title, transition: "", params: { count: 5 } },
  ];

  async function compilePage(actor: Actor, bookId: string, idx: number) {
    assertCan(actor.role, "tutor:manage");
    const book = await loadBook(actor.orgId, bookId);
    const [page] = await db.select().from(tutorBookPages).where(and(eq(tutorBookPages.bookId, book.id), eq(tutorBookPages.idx, idx)));
    if (!page) throw new NotFoundError("Không có trang này");
    const level = LEVELS[book.level] ?? "đa dạng";

    // Tìm tư liệu (source_explorer): truy hồi BM25 bằng tên chương + mục tiêu.
    let hits: Awaited<ReturnType<KbService["search"]>> = [];
    if (book.kbId) hits = await kb.search(actor, book.kbId, `${page.title} ${page.summary} ${page.objectives.join(" ")}`, 6);
    const cites: TutorCitation[] = kb.toCitations(hits);
    const evidence = hits.map((h, i) => `[${i + 1}] (${h.doc}, trang ${h.page}) ${h.text}`).join("\n\n");
    const objectives = page.objectives.map((o) => `- ${o}`).join("\n") || "- (chưa nêu)";
    // chương trước đã học: đưa tóm tắt vào prompt để không giảng lại
    const prev = await db.select({ idx: tutorBookPages.idx, title: tutorBookPages.title, summary: tutorBookPages.summary }).from(tutorBookPages).where(eq(tutorBookPages.bookId, book.id)).orderBy(asc(tutorBookPages.idx));
    const before = prev.filter((p) => p.idx < page.idx).map((p) => `${p.idx + 1}. ${p.title}${p.summary ? ` — ${p.summary}` : ""}`).join("\n");
    const after = prev.filter((p) => p.idx > page.idx).map((p) => `${p.idx + 1}. ${p.title}`).join("\n");
    const header = `Chương: ${page.title}\nTóm tắt: ${page.summary}\nMục tiêu:\n${objectives}${before ? `\n\nCác chương TRƯỚC (em đã học — không giảng lại, chỉ nhắc một câu khi cần):\n${before}` : ""}${after ? `\n\nCác chương SAU (sẽ học — không giảng trước nội dung của chúng):\n${after}` : ""}`;

    let plan: Planned[];
    try {
      const raw = json<{ blocks?: { type?: string; focus?: string; transition_in?: string; params?: Record<string, unknown> }[] }>(
        await ai.chat(TASK.learn, [{ role: "system", content: PLANNER_SYSTEM }, { role: "user", content: fill(PLANNER_USER, { title: page.title, summary: page.summary, contentType: page.contentType, objectives, evidence: evidence ? evidence.slice(0, 4000) : "(chưa có tư liệu)" }) }], { json: true }),
      );
      plan = (raw.blocks ?? [])
        .filter((x) => BLOCK_TYPES.includes(x.type as BlockType))
        .slice(0, 9)
        .map((x) => ({ type: x.type as BlockType, focus: String(x.focus ?? page.title), transition: String(x.transition_in ?? ""), params: x.params ?? {} }));
      if (!plan.some((x) => x.type === "section")) plan.unshift({ type: "section", focus: page.title, transition: "", params: { role: "core" } });
    } catch {
      plan = defaultPlan(page);
    }
    if (!plan.length) plan = defaultPlan(page);

    const used = (md: string) => cites.filter((c) => citedNumbers(md).includes(c.n));
    // dàn ý cả trang: mỗi khối chỉ viết đúng phần của mình, không lặp ý/tiêu đề của khối khác
    const outlineText = plan.map((x, i) => `${i + 1}. [${x.type}] ${x.focus}`).join("\n");
    const usedHeadings: string[] = [];
    const write = async (b: Planned, k: number): Promise<BookBlock | null> => {
      const taken = usedHeadings.length ? `\nTiêu đề tiểu mục ĐÃ dùng ở các khối trước (không dùng lại, không giảng lại các ý đó): ${usedHeadings.map((h) => `"${h}"`).join(", ")}` : "";
      const user = `${header}\n\nDàn ý trang (${plan.length} khối):\n${outlineText}\nBạn đang viết khối số ${k + 1}. Chỉ viết đúng trọng tâm của khối này; các khối khác đã/ sẽ lo phần còn lại — không lặp định nghĩa, công thức, ví dụ hay tiêu đề của khối khác.${taken}\nTrọng tâm khối: ${b.focus}`;
      const lead = b.transition ? `*${b.transition}*\n\n` : "";
      switch (b.type) {
        case "section": {
          const md = await ai.chat(TASK.book, [{ role: "system", content: fill(SECTION_SYSTEM, { words: Number(b.params.target_words) || 700, level }) }, { role: "user", content: `${user}\n\nTƯ LIỆU:\n${evidence || "(chưa có tư liệu, viết từ kiến thức chương trình)"}` }]);
          return { type: "section", markdown: lead + md.trim(), citations: used(md) };
        }
        case "text": {
          const md = await ai.chat(TASK.learn, [{ role: "system", content: TEXT_SYSTEM }, { role: "user", content: `${user}\n\nTư liệu:\n${evidence.slice(0, 2500)}` }]);
          return { type: "text", markdown: lead + md.trim(), citations: used(md) };
        }
        case "callout": {
          const variant = String(b.params.variant ?? "key_idea");
          const md = await ai.chat(TASK.learn, [{ role: "system", content: CALLOUT_SYSTEM }, { role: "user", content: `${user}\nLoại hộp: ${variant}` }]);
          return { type: "callout", title: variant, markdown: md.trim(), data: { variant } };
        }
        case "figure": {
          const f = json<{ title?: string; caption?: string; mermaid?: string }>(await ai.chat(TASK.learn, [{ role: "system", content: FIGURE_SYSTEM }, { role: "user", content: `${user}\nKiểu hình: ${String(b.params.variant ?? "diagram")}` }], { json: true }));
          return { type: "figure", title: String(f.title ?? "Hình minh hoạ"), markdown: String(f.caption ?? ""), data: { mermaid: String(f.mermaid ?? "") } };
        }
        case "flash_cards": {
          const count = Math.min(8, Math.max(3, Number(b.params.count) || 5));
          const f = json<{ cards?: { front?: string; back?: string; hint?: string }[] }>(await ai.chat(TASK.learn, [{ role: "system", content: `${FLASH_SYSTEM}\nSố thẻ: ${count}.` }, { role: "user", content: user }], { json: true }));
          const cards = (f.cards ?? []).filter((c) => c.front && c.back).map((c) => ({ front: String(c.front), back: String(c.back), hint: String(c.hint ?? "") }));
          return cards.length ? { type: "flash_cards", title: "Thẻ ghi nhớ", data: { cards } } : null;
        }
        case "timeline": {
          const t = json<{ events?: { date?: string; title?: string; description?: string }[] }>(await ai.chat(TASK.learn, [{ role: "system", content: TIMELINE_SYSTEM }, { role: "user", content: user }], { json: true }));
          const events = (t.events ?? []).filter((e) => e.title).map((e) => ({ date: String(e.date ?? ""), title: String(e.title), description: String(e.description ?? "") }));
          return events.length ? { type: "timeline", title: "Dòng thời gian", data: { events } } : null;
        }
        case "code": {
          const c = json<{ language?: string; code?: string; explanation?: string }>(await ai.chat(TASK.learn, [{ role: "system", content: CODE_SYSTEM }, { role: "user", content: `${user}\nNgôn ngữ ưu tiên: ${String(b.params.language ?? "python")}` }], { json: true }));
          return c.code ? { type: "code", title: "Ví dụ mã", markdown: String(c.explanation ?? ""), data: { language: String(c.language ?? "python"), code: String(c.code) } } : null;
        }
        case "deep_dive": {
          const d = json<{ suggestions?: { topic?: string; rationale?: string }[] }>(await ai.chat(TASK.learn, [{ role: "system", content: DEEP_DIVE_SYSTEM }, { role: "user", content: header }], { json: true }));
          const suggestions = (d.suggestions ?? []).filter((x) => x.topic).slice(0, 3).map((x) => ({ topic: String(x.topic), rationale: String(x.rationale ?? "") }));
          return suggestions.length ? { type: "deep_dive", title: "Đào sâu thêm", data: { suggestions } } : null;
        }
      }
    };

    // Viết lần lượt theo nhóm 3 để giữ thứ tự mà vẫn song song.
    let blocks: BookBlock[] = [];
    for (let i = 0; i < plan.length; i += 3) {
      const done = await Promise.all(plan.slice(i, i + 3).map((b, j) => write(b, i + j).catch(() => null)));
      for (const d of done) if (d) {
        blocks.push(d);
        if (d.markdown) usedHeadings.push(...headingsOf(d.markdown));
      }
    }
    blocks = dedupeHeadings(blocks, page.title).blocks;
    if (!blocks.some((b) => b.type === "section")) throw new ValidationError(["AI chưa viết được nội dung chương, hãy thử biên soạn lại"]);
    await db.update(tutorBookPages).set({ blocks, status: "ready", updatedAt: new Date() }).where(eq(tutorBookPages.id, page.id));
    await db.update(tutorBooks).set({ updatedAt: new Date() }).where(eq(tutorBooks.id, book.id));
    return getPage(actor, bookId, idx);
  }

  return { create, list, get, getPage, remove, compilePage };
}
export type BookService = ReturnType<typeof createBookService>;
