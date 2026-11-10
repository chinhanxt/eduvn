import type { FastifyInstance, FastifyRequest } from "fastify";
import type { StudentAuth } from "../../auth/student";
import type { Db } from "../../db/client";
import { users } from "../../db/schema";
import { UnauthorizedError } from "../../errors";
import type { Actor } from "../../service";
import { membershipsOf } from "../../db/repo";
import { loadFreshStudent } from "../../services/credentials";
import type { TodayService } from "../../services/today";
import { eq } from "drizzle-orm";

export type TodayRouteDeps = { db: Db; today: TodayService; authenticate: (req: FastifyRequest) => Promise<Actor>; studentAuth: StudentAuth };

/** Endpoint gộp cho 2 màn "Hôm nay": GV (Keycloak) và Học (phiên mã lớp P9a hoặc tài khoản Keycloak). */
export function registerTodayRoutes(app: FastifyInstance, d: TodayRouteDeps): void {
  const noStore = { "cache-control": "private, no-store" };
  app.get("/api/gv/hom-nay", async (req, reply) => reply.headers(noStore).send(await d.today.teacher(await d.authenticate(req))));

  app.get("/api/hoc/hom-nay", async (req, reply) => {
    const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
    if (!m?.[1]) throw new UnauthorizedError("Thiếu access token");
    // Phiên HS (HS256 do lõi ký) thử trước — rẻ, không gọi Keycloak.
    const session = await d.studentAuth.verifySession(m[1]).catch(() => null);
    if (session) {
      const s = await loadFreshStudent(d.db, session);
      // HS đã liên kết tài khoản: dữ liệu gia sư nằm ở tổ chức mặc định của tài khoản đó (như resolveActor).
      const org = s.userId ? (await membershipsOf(d.db, s.userId))[0]?.orgId : undefined;
      const learner = s.userId && org ? { orgId: org, learnerKey: s.userId } : null;
      return reply.headers(noStore).send(await d.today.student({ studentIds: [s.id], name: s.fullName, learner }));
    }
    const actor = await d.authenticate(req);
    const [u] = await d.db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, actor.userId));
    const ids = await d.today.studentIdsOfUser(actor.userId);
    return reply.headers(noStore).send(await d.today.student({ studentIds: ids, name: u?.name ?? u?.email ?? "", learner: { orgId: actor.orgId, learnerKey: actor.userId } }));
  });
}
