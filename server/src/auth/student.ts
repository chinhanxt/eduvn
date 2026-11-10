import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";

/** Phiên HS do lõi tự ký (HS256, sống 12 giờ) + thẻ QR (HS256, không hết hạn, thu hồi bằng badge_version). */
export type StudentActor = { studentId: string; classId: string; orgId: string; ver: number };

const ISSUER = "eduvn-student";
const AUD_SESSION = "hs-session";
const AUD_BADGE = "hs-badge";
export const SESSION_TTL_SECONDS = 12 * 3600;

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
/** N = 4096 ≈ 45 ms/lần trên máy dev, chạy ở threadpool (không chặn event loop). */
const SCRYPT_N = 4096;
/** Dùng khi không có HS khớp: vẫn băm một lần để thời gian trả lời như nhau. */
const DUMMY_HASH = `s1$${SCRYPT_N}$${"A".repeat(22)}$${"A".repeat(43)}`;

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(pin, salt, 32, { N: SCRYPT_N, r: 8, p: 1 });
  return `s1$${SCRYPT_N}$${salt.toString("base64url")}$${h.toString("base64url")}`;
}

export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  const [, n, salt, want] = (stored ?? DUMMY_HASH).split("$");
  const expected = Buffer.from(want ?? "", "base64url");
  const got = await scrypt(pin, Buffer.from(salt ?? "", "base64url"), 32, { N: Number(n) || SCRYPT_N, r: 8, p: 1 });
  return stored !== null && expected.length === got.length && timingSafeEqual(expected, got);
}

export function createStudentAuth(secret: string) {
  if (secret.length < 32) throw new Error("STUDENT_SECRET must be at least 32 characters");
  // Nhập khoá một lần: jwtVerify với CryptoKey nhanh gấp đôi so với truyền Uint8Array mỗi lần.
  const keyP = crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

  return {
    async signSession(a: StudentActor): Promise<string> {
      return new SignJWT({ cid: a.classId, oid: a.orgId, ver: a.ver })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(ISSUER)
        .setAudience(AUD_SESSION)
        .setSubject(a.studentId)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .sign(await keyP);
    },
    async verifySession(token: string): Promise<StudentActor> {
      const { payload } = await jwtVerify(token, await keyP, { issuer: ISSUER, audience: AUD_SESSION, algorithms: ["HS256"], requiredClaims: ["exp", "sub"] });
      const { sub, cid, oid, ver } = payload as Record<string, unknown>;
      if (typeof sub !== "string" || typeof cid !== "string" || typeof oid !== "string" || typeof ver !== "number") throw new Error("bad student session");
      return { studentId: sub, classId: cid, orgId: oid, ver };
    },
    /** Token in trên thẻ QR: ngắn (không iss/exp) để mã QR thưa, dễ quét. */
    async signBadge(b: { studentId: string; ver: number }): Promise<string> {
      return new SignJWT({ v: b.ver }).setProtectedHeader({ alg: "HS256" }).setAudience(AUD_BADGE).setSubject(b.studentId).sign(await keyP);
    },
    async verifyBadge(token: string): Promise<{ studentId: string; ver: number }> {
      const { payload } = await jwtVerify(token, await keyP, { audience: AUD_BADGE, algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || typeof payload.v !== "number") throw new Error("bad badge");
      return { studentId: payload.sub, ver: payload.v };
    },
  };
}
export type StudentAuth = ReturnType<typeof createStudentAuth>;
