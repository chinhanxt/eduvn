import { z } from "zod";
import type { Db } from "../db/client";
import { createOrg, ensureUser, getRole, membershipsOf } from "../db/repo";
import { ForbiddenError } from "../domain/authz";
import type { Actor } from "../service";
import type { Identity } from "./verify";

const OrgId = z.uuid();

/** Identity → Actor. Chưa thuộc tổ chức nào → tự tạo không gian cá nhân (owner). */
export async function resolveActor(db: Db, identity: Identity, orgId?: string): Promise<Actor> {
  const user = await ensureUser(db, identity);
  if (orgId !== undefined) {
    const role = OrgId.safeParse(orgId).success ? await getRole(db, orgId, user.id) : null;
    if (!role) throw new ForbiddenError("Bạn không phải thành viên của tổ chức này");
    return { userId: user.id, orgId, role };
  }
  const [first] = await membershipsOf(db, user.id);
  if (first) return { userId: user.id, orgId: first.orgId, role: first.role };
  const org = await createOrg(db, `Không gian của ${identity.name ?? identity.email ?? "tôi"}`, user.id);
  return { userId: user.id, orgId: org.id, role: "owner" };
}
