import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { decks, lessonPlans } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type SlideDeck, slidesFromLessonPlan, validateDeck } from "../domain/slides";
import { NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type DeckSummary = { id: string; title: string; subject: string | null; grade: number | null; slideCount: number; sourceLessonPlanId: string | null; updatedAt: string };

export function createSlideService(db: Db) {
  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bộ slide");
    const [row] = await db.select().from(decks).where(and(eq(decks.id, id), eq(decks.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy bộ slide");
    return row;
  }

  const summary = (r: { id: string; title: string; body: SlideDeck; sourceLessonPlanId: string | null; updatedAt: Date }): DeckSummary => ({
    id: r.id,
    title: r.title,
    subject: r.body.subject ?? null,
    grade: r.body.grade ?? null,
    slideCount: r.body.slides.length,
    sourceLessonPlanId: r.sourceLessonPlanId,
    updatedAt: r.updatedAt.toISOString(),
  });

  /** Tạo (không có id) hoặc cập nhật từ JSON. Sai giới hạn thì ném ValidationError, không lưu. */
  async function save(actor: Actor, input: { id?: string; deck: unknown; sourceLessonPlanId?: string | null }): Promise<DeckSummary & { created: boolean }> {
    assertCan(actor.role, "slide:manage");
    const v = validateDeck(input.deck);
    if (!v.ok) throw new ValidationError(v.issues);
    const values = { title: v.deck.title, body: v.deck, updatedAt: new Date() };
    if (input.id) {
      const cur = await load(actor.orgId, input.id);
      await db.update(decks).set(values).where(eq(decks.id, input.id));
      return { ...summary({ id: input.id, ...values, sourceLessonPlanId: cur.sourceLessonPlanId }), created: false };
    }
    const src = input.sourceLessonPlanId ?? null;
    const [row] = await db.insert(decks).values({ ...values, orgId: actor.orgId, ownerId: actor.userId, sourceLessonPlanId: src }).returning({ id: decks.id });
    if (!row) throw new Error("deck insert: no row");
    return { ...summary({ id: row.id, ...values, sourceLessonPlanId: src }), created: true };
  }

  /** Dựng bộ slide từ giáo án đã lưu (CV 5512). */
  async function fromLesson(actor: Actor, lessonId: string): Promise<DeckSummary & { created: boolean }> {
    assertCan(actor.role, "slide:manage");
    assertCan(actor.role, "lesson:read");
    if (!Uuid.safeParse(lessonId).success) throw new NotFoundError("Không tìm thấy giáo án");
    const [lp] = await db.select().from(lessonPlans).where(and(eq(lessonPlans.id, lessonId), eq(lessonPlans.orgId, actor.orgId)));
    if (!lp) throw new NotFoundError("Không tìm thấy giáo án");
    return save(actor, { deck: slidesFromLessonPlan(lp.body), sourceLessonPlanId: lp.id });
  }

  async function list(actor: Actor): Promise<DeckSummary[]> {
    assertCan(actor.role, "slide:read");
    const rows = await db.select().from(decks).where(eq(decks.orgId, actor.orgId)).orderBy(desc(decks.updatedAt));
    return rows.map(summary);
  }

  async function get(actor: Actor, id: string) {
    assertCan(actor.role, "slide:read");
    const r = await load(actor.orgId, id);
    return { ...summary(r), deck: r.body };
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "slide:manage");
    await load(actor.orgId, id);
    await db.delete(decks).where(eq(decks.id, id));
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadForExport(orgId: string, id: string): Promise<{ title: string; deck: SlideDeck }> {
    const r = await load(orgId, id);
    return { title: r.title, deck: r.body };
  }

  async function idFor(actor: Actor, id: string): Promise<string> {
    assertCan(actor.role, "slide:read");
    return (await load(actor.orgId, id)).id;
  }

  return { save, fromLesson, list, get, remove, loadForExport, idFor };
}
export type SlideService = ReturnType<typeof createSlideService>;
