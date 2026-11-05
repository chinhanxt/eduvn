import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { vanBan } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type VanBan, soKyHieu, validateVanBan } from "../domain/vanban";
import { NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type VanBanSummary = { id: string; loai: string; trichYeu: string; soKyHieu: string; ngay: string; updatedAt: string };

export function createVanBanService(db: Db) {
  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy văn bản");
    const [row] = await db.select().from(vanBan).where(and(eq(vanBan.id, id), eq(vanBan.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy văn bản");
    return row;
  }

  const summary = (id: string, loai: string, trichYeu: string, body: VanBan, updatedAt: Date): VanBanSummary => ({
    id,
    loai,
    trichYeu,
    soKyHieu: soKyHieuText(body),
    ngay: body.ngay,
    updatedAt: updatedAt.toISOString(),
  });

  /** Tạo (không có id) hoặc cập nhật. Thiếu thành phần thể thức thì ném ValidationError, không lưu. */
  async function save(actor: Actor, input: { id?: string; vanBan: unknown }): Promise<VanBanSummary & { created: boolean }> {
    assertCan(actor.role, "vanban:manage");
    const v = validateVanBan(input.vanBan);
    if (!v.ok) throw new ValidationError(v.issues);
    const doc = v.doc;
    const values = { loai: doc.loai, trichYeu: doc.trich_yeu, body: doc, updatedAt: new Date() };
    if (input.id) {
      await load(actor.orgId, input.id);
      await db.update(vanBan).set(values).where(eq(vanBan.id, input.id));
      return { ...summary(input.id, values.loai, values.trichYeu, doc, values.updatedAt), created: false };
    }
    const [row] = await db.insert(vanBan).values({ ...values, orgId: actor.orgId, ownerId: actor.userId }).returning({ id: vanBan.id });
    if (!row) throw new Error("van_ban insert: no row");
    return { ...summary(row.id, values.loai, values.trichYeu, doc, values.updatedAt), created: true };
  }

  async function list(actor: Actor): Promise<VanBanSummary[]> {
    assertCan(actor.role, "vanban:read");
    const rows = await db.select().from(vanBan).where(eq(vanBan.orgId, actor.orgId)).orderBy(desc(vanBan.updatedAt));
    return rows.map((r) => summary(r.id, r.loai, r.trichYeu, r.body, r.updatedAt));
  }

  async function get(actor: Actor, id: string) {
    assertCan(actor.role, "vanban:read");
    const r = await load(actor.orgId, id);
    return { ...summary(r.id, r.loai, r.trichYeu, r.body, r.updatedAt), vanBan: r.body };
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "vanban:manage");
    await load(actor.orgId, id);
    await db.delete(vanBan).where(eq(vanBan.id, id));
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadForExport(orgId: string, id: string): Promise<{ loai: string; trichYeu: string; doc: VanBan }> {
    const r = await load(orgId, id);
    return { loai: r.loai, trichYeu: r.trichYeu, doc: r.body };
  }

  async function idFor(actor: Actor, id: string): Promise<string> {
    assertCan(actor.role, "vanban:read");
    return (await load(actor.orgId, id)).id;
  }

  return { save, list, get, remove, loadForExport, idFor };
}
export type VanBanService = ReturnType<typeof createVanBanService>;

const soKyHieuText = (b: VanBan) => soKyHieu(b).replace(/^Số:\s*/, "");
