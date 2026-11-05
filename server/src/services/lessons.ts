import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { lessonPlans } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type LessonPlan, validateLessonPlan } from "../domain/lesson";
import { NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type LessonSummary = { id: string; title: string; subject: string; grade: number; periods: number; updatedAt: string };

export function createLessonService(db: Db) {
  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy giáo án");
    const [row] = await db.select().from(lessonPlans).where(and(eq(lessonPlans.id, id), eq(lessonPlans.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy giáo án");
    return row;
  }

  /** Tạo (không có id) hoặc cập nhật. Có lỗi cấu phần thì ném ValidationError, không lưu. */
  async function save(actor: Actor, input: { id?: string; plan: unknown }): Promise<{ id: string; created: boolean } & LessonSummary> {
    assertCan(actor.role, "lesson:manage");
    const v = validateLessonPlan(input.plan);
    if (!v.ok) throw new ValidationError(v.issues);
    const plan: LessonPlan = v.plan;
    const h = plan.header;
    const values = { subject: h.subject, grade: h.grade as number, title: h.title, body: plan, updatedAt: new Date() };
    if (input.id) {
      await load(actor.orgId, input.id);
      await db.update(lessonPlans).set(values).where(eq(lessonPlans.id, input.id));
      return { ...summary(input.id, values), created: false };
    }
    const [row] = await db.insert(lessonPlans).values({ ...values, orgId: actor.orgId, ownerId: actor.userId }).returning({ id: lessonPlans.id });
    if (!row) throw new Error("lesson insert: no row");
    return { ...summary(row.id, values), created: true };
  }

  const summary = (id: string, v: { subject: string; grade: number; title: string; body: LessonPlan; updatedAt: Date }): LessonSummary => ({
    id,
    title: v.title,
    subject: v.subject,
    grade: v.grade,
    periods: v.body.header.periods ?? 1,
    updatedAt: v.updatedAt.toISOString(),
  });

  async function list(actor: Actor): Promise<LessonSummary[]> {
    assertCan(actor.role, "lesson:read");
    const rows = await db.select().from(lessonPlans).where(eq(lessonPlans.orgId, actor.orgId)).orderBy(desc(lessonPlans.updatedAt));
    return rows.map((r) => summary(r.id, r));
  }

  async function get(actor: Actor, id: string) {
    assertCan(actor.role, "lesson:read");
    const r = await load(actor.orgId, id);
    return { ...summary(r.id, r), plan: r.body };
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "lesson:manage");
    await load(actor.orgId, id);
    await db.delete(lessonPlans).where(eq(lessonPlans.id, id));
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadForExport(orgId: string, id: string): Promise<{ title: string; plan: LessonPlan }> {
    const r = await load(orgId, id);
    return { title: r.title, plan: r.body };
  }

  async function idFor(actor: Actor, id: string): Promise<string> {
    assertCan(actor.role, "lesson:read");
    return (await load(actor.orgId, id)).id;
  }

  return { save, list, get, remove, loadForExport, idFor };
}
export type LessonService = ReturnType<typeof createLessonService>;
