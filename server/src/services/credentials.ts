import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { type StudentActor, type StudentAuth, SESSION_TTL_SECONDS, hashPin, verifyPin } from "../auth/student";
import type { Identity } from "../auth/verify";
import type { Db } from "../db/client";
import { ensureUser } from "../db/repo";
import { classes, students } from "../db/schema";
import { ForbiddenError, type Role, assertCan } from "../domain/authz";
import { compareVietnameseNames, normName, parseDob } from "../domain/roster";
import { PinGuard, assignSeats, isCode, isPin, makeCode, makePin, normalizeCode } from "../domain/studentAuth";
import { NotFoundError, TooManyRequestsError, UnauthorizedError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
type ClassRow = typeof classes.$inferSelect;
export type StudentRow = typeof students.$inferSelect;

export type BadgeCard = { studentId: string; seat: number; fullName: string; pin: string; qrToken: string };
export type CredentialStatus = {
  classId: string;
  className: string;
  subject: string | null;
  classCode: string | null;
  joinCode: string | null;
  joinOpen: boolean;
  students: { id: string; seat: number | null; fullName: string; dob: string | null; hasPin: boolean; linked: boolean; linkPending: boolean }[];
};
export type StudentSession = { token: string; expiresInSeconds: number; student: { id: string; fullName: string; seat: number | null }; class: { id: string; name: string; subject: string | null } };
export type JoinPending = { pending: true; message: string };

const Uuid = z.uuid();
const LOGIN_FAIL = "Mã lớp, số thứ tự hoặc PIN chưa đúng";
const QR_FAIL = "Thẻ QR không hợp lệ hoặc đã được cấp lại";
const STALE = "Phiên đã hết, em đăng nhập lại nhé";
const PENDING = "Đã gửi yêu cầu vào lớp. Em chờ giáo viên xác nhận rồi đăng nhập lại nhé.";
export const BadgeLogin = z.object({ classCode: z.string().max(20), seat: z.coerce.number().int().min(1).max(9999), pin: z.string().max(12) });
export const QrLogin = z.object({ token: z.string().min(10).max(2000) });
export const OidcJoin = z.object({ joinCode: z.string().max(20), fullName: z.string().trim().normalize("NFC").min(1).max(80).optional(), dob: z.string().max(20).optional() });
export const IssueInput = z.object({ studentIds: z.array(z.uuid()).max(2000).optional() });

/** Thứ tự danh sách lớp VN (như services/classes.ts): tên → họ đệm → position. */
export const vnOrder = (a: StudentRow, b: StudentRow): number =>
  compareVietnameseNames(a.fullName, b.fullName) || a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();

export async function sortedRoster(db: Db, classId: string): Promise<StudentRow[]> {
  return (await db.select().from(students).where(eq(students.classId, classId))).sort(vnOrder);
}

/** Phiên HS còn hiệu lực với DB: đúng lớp, đúng phiên bản thẻ, không chờ xác nhận. Dùng ở các route không nóng. */
export async function loadFreshStudent(db: Db, sa: StudentActor): Promise<StudentRow> {
  const [s] = await db.select().from(students).where(eq(students.id, sa.studentId));
  if (!s || s.classId !== sa.classId || s.badgeVersion !== sa.ver || s.linkPending) throw new UnauthorizedError(STALE);
  return s;
}

export function createCredentialService(db: Db, auth: StudentAuth, opts: { guard?: PinGuard; now?: () => Date } = {}) {
  const guard = opts.guard ?? new PinGuard();
  const now = opts.now ?? (() => new Date());
  const rand = (n: number) => randomInt(n);

  async function loadClass(orgId: string, classId: string): Promise<ClassRow> {
    if (!Uuid.safeParse(classId).success) throw new NotFoundError("Không tìm thấy lớp");
    const [row] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy lớp");
    return row;
  }

  async function uniqueCode(col: "code" | "joinCode"): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const c = makeCode(rand);
      const [hit] = await db.select({ id: classes.id }).from(classes).where(eq(col === "code" ? classes.code : classes.joinCode, c));
      if (!hit) return c;
    }
    throw new Error("could not generate a unique class code");
  }

  async function ensureCodes(c: ClassRow): Promise<{ code: string; joinCode: string }> {
    if (c.code && c.joinCode) return { code: c.code, joinCode: c.joinCode };
    const code = c.code ?? (await uniqueCode("code"));
    const joinCode = c.joinCode ?? (await uniqueCode("joinCode"));
    await db.update(classes).set({ code, joinCode }).where(eq(classes.id, c.id));
    return { code, joinCode };
  }

  async function status(actor: Actor, classId: string): Promise<CredentialStatus> {
    assertCan(actor.role, "class:read");
    const c = await loadClass(actor.orgId, classId);
    const rows = await sortedRoster(db, c.id);
    return {
      classId: c.id,
      className: c.name,
      subject: c.subject,
      classCode: c.code,
      joinCode: c.joinCode,
      joinOpen: c.joinOpen,
      students: rows.map((s) => ({ id: s.id, seat: s.seat, fullName: s.fullName, dob: s.dob, hasPin: s.pinHash !== null, linked: s.userId !== null && !s.linkPending, linkPending: s.linkPending })),
    };
  }

  /** Cấp PIN + thẻ QR. Không truyền studentIds: các HS chưa có PIN. Có studentIds: cấp lại (thẻ và phiên cũ hết dùng).
   *  PIN chỉ trả về đúng một lần (DB lưu bản băm). */
  async function issue(actor: Actor, classId: string, raw: unknown): Promise<{ classCode: string; cards: BadgeCard[] }> {
    assertCan(actor.role, "student:credentials");
    const input = IssueInput.parse(raw ?? {});
    const c = await loadClass(actor.orgId, classId);
    const { code } = await ensureCodes(c);
    const before = await sortedRoster(db, c.id);
    const unknown = (input.studentIds ?? []).filter((id) => !before.some((r) => r.id === id));
    if (unknown.length) throw new ValidationError([`Không có học viên ${unknown.join(", ")} trong lớp`]);
    const wanted = input.studentIds ? new Set(input.studentIds) : null;
    const targets = before.filter((r) => (wanted ? wanted.has(r.id) : r.pinHash === null));
    const pins = targets.map(() => makePin(rand));
    const hashes: string[] = [];
    for (let i = 0; i < pins.length; i += 16) hashes.push(...(await Promise.all(pins.slice(i, i + 16).map(hashPin))));
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from classes where id = ${c.id} for update`);
      const rows = (await tx.select().from(students).where(eq(students.classId, c.id))).sort(vnOrder);
      const seats = assignSeats(rows);
      for (const [id, seat] of seats) await tx.update(students).set({ seat }).where(eq(students.id, id));
      const out: { id: string; seat: number; fullName: string; ver: number; pin: string }[] = [];
      for (const [i, t] of targets.entries()) {
        const [r] = await tx
          .update(students)
          .set({ pinHash: hashes[i] as string, badgeVersion: sql`${students.badgeVersion} + 1` })
          .where(eq(students.id, t.id))
          .returning({ id: students.id, seat: students.seat, fullName: students.fullName, ver: students.badgeVersion });
        if (r) out.push({ id: r.id, seat: r.seat as number, fullName: r.fullName, ver: r.ver, pin: pins[i] as string });
      }
      return out;
    });
    const cards = await Promise.all(updated.map(async (u) => ({ studentId: u.id, seat: u.seat, fullName: u.fullName, pin: u.pin, qrToken: await auth.signBadge({ studentId: u.id, ver: u.ver }) })));
    return { classCode: code, cards: cards.sort((a, b) => a.seat - b.seat) };
  }

  async function setJoin(actor: Actor, classId: string, open: boolean): Promise<{ classCode: string; joinCode: string; joinOpen: boolean }> {
    assertCan(actor.role, "student:credentials");
    const c = await loadClass(actor.orgId, classId);
    const { code, joinCode } = await ensureCodes(c);
    await db.update(classes).set({ joinOpen: open }).where(eq(classes.id, c.id));
    return { classCode: code, joinCode, joinOpen: open };
  }

  async function resolveLink(actor: Actor, classId: string, studentId: string, approve: boolean): Promise<{ approved: boolean }> {
    assertCan(actor.role, "student:credentials");
    const c = await loadClass(actor.orgId, classId);
    const [s] = Uuid.safeParse(studentId).success ? await db.select().from(students).where(and(eq(students.id, studentId), eq(students.classId, c.id))) : [];
    if (!s?.linkPending) throw new NotFoundError("Không có yêu cầu vào lớp của học viên này");
    await db.update(students).set(approve ? { linkPending: false } : { linkPending: false, userId: null }).where(eq(students.id, s.id));
    return { approved: approve };
  }

  async function sessionFor(s: StudentRow, c: ClassRow): Promise<StudentSession> {
    const token = await auth.signSession({ studentId: s.id, classId: c.id, orgId: c.orgId, ver: s.badgeVersion });
    return { token, expiresInSeconds: SESSION_TTL_SECONDS, student: { id: s.id, fullName: s.fullName, seat: s.seat }, class: { id: c.id, name: c.name, subject: c.subject } };
  }

  async function loginBadge(raw: unknown, ip: string): Promise<StudentSession> {
    const p = BadgeLogin.safeParse(raw);
    if (!p.success) throw new UnauthorizedError(LOGIN_FAIL);
    const code = normalizeCode(p.data.classCode);
    const seatKey = `${code}:${p.data.seat}`;
    const ipKey = `ip:${ip}`;
    const att = guard.attempt(seatKey, ipKey, code, now().getTime());
    if (!att.ok) throw new TooManyRequestsError("Sai quá nhiều lần. Em chờ ít phút rồi thử lại nhé.", Math.ceil(att.retryAfterMs / 1000));
    const [row] =
      isCode(code) && isPin(p.data.pin)
        ? await db
            .select({ s: students, c: classes })
            .from(students)
            .innerJoin(classes, eq(classes.id, students.classId))
            .where(and(eq(classes.code, code), eq(students.seat, p.data.seat)))
        : [];
    const ok = await verifyPin(p.data.pin, row?.s.pinHash ?? null);
    if (!row || !ok) {
      guard.fail(att.token);
      throw new UnauthorizedError(LOGIN_FAIL);
    }
    guard.success(att.token);
    return sessionFor(row.s, row.c);
  }

  async function loginQr(raw: unknown): Promise<StudentSession> {
    const p = QrLogin.safeParse(raw);
    if (!p.success) throw new UnauthorizedError(QR_FAIL);
    let b: { studentId: string; ver: number };
    try {
      b = await auth.verifyBadge(p.data.token);
    } catch {
      throw new UnauthorizedError(QR_FAIL);
    }
    const [row] = await db.select({ s: students, c: classes }).from(students).innerJoin(classes, eq(classes.id, students.classId)).where(eq(students.id, b.studentId));
    if (!row || row.s.badgeVersion !== b.ver || row.s.pinHash === null) throw new UnauthorizedError(QR_FAIL);
    return sessionFor(row.s, row.c);
  }

  /** Tài khoản Keycloak + mã tham gia → phiên HS. Trùng họ tên + ngày sinh với HS có sẵn: chờ GV xác nhận. */
  async function loginOidc(identity: Identity, raw: unknown): Promise<StudentSession | JoinPending> {
    const p = OidcJoin.parse(raw);
    const code = normalizeCode(p.joinCode);
    const [c] = isCode(code) ? await db.select().from(classes).where(eq(classes.joinCode, code)) : [];
    if (!c) throw new NotFoundError("Mã tham gia không đúng");
    const user = await ensureUser(db, identity);
    const [mine] = await db.select().from(students).where(and(eq(students.classId, c.id), eq(students.userId, user.id)));
    if (mine) return mine.linkPending ? { pending: true, message: PENDING } : sessionFor(mine, c);
    if (!c.joinOpen) throw new ForbiddenError("Lớp đang tắt mã tham gia. Em hỏi giáo viên nhé.");
    const fullName = (p.fullName ?? identity.name ?? "").trim().replace(/\s+/g, " ");
    if (!fullName) throw new ValidationError(["Thiếu họ tên"]);
    const dob = parseDob(p.dob);
    if (dob === undefined) throw new ValidationError([`Ngày sinh "${p.dob}" sai, dùng dd/mm/yyyy`]);
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from classes where id = ${c.id} for update`);
      const rows = (await tx.select().from(students).where(eq(students.classId, c.id))).sort(vnOrder);
      const match = dob ? rows.find((r) => r.userId === null && r.dob === dob && normName(r.fullName) === normName(fullName)) : undefined;
      if (match) {
        await tx.update(students).set({ userId: user.id, linkPending: true }).where(eq(students.id, match.id));
        return { pending: true as const, message: PENDING };
      }
      // HS có sẵn chưa có số thứ tự thì cấp theo danh sách trước, HS mới vào sau cùng
      const seats = assignSeats(rows);
      for (const [id, n] of seats) await tx.update(students).set({ seat: n }).where(eq(students.id, id));
      const seat = Math.max(0, ...rows.map((r) => r.seat ?? 0), ...seats.values()) + 1;
      const position = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1;
      const [s] = await tx.insert(students).values({ classId: c.id, fullName, dob, position, seat, userId: user.id }).returning();
      return sessionFor(s as StudentRow, c);
    });
  }

  async function me(sa: StudentActor): Promise<Omit<StudentSession, "token" | "expiresInSeconds">> {
    const s = await loadFreshStudent(db, sa);
    const [c] = await db.select().from(classes).where(eq(classes.id, s.classId));
    if (!c) throw new UnauthorizedError(STALE);
    return { student: { id: s.id, fullName: s.fullName, seat: s.seat }, class: { id: c.id, name: c.name, subject: c.subject } };
  }

  return { status, issue, setJoin, resolveLink, loginBadge, loginQr, loginOidc, me };
}
export type CredentialService = ReturnType<typeof createCredentialService>;
