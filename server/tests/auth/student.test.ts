import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { createStudentAuth, hashPin, verifyPin } from "../../src/auth/student";

const SECRET = "student-secret-student-secret-0123";

describe("token HS", () => {
  const auth = createStudentAuth(SECRET);
  const actor = { studentId: "s-1", classId: "c-1", orgId: "o-1", ver: 2 };
  it("phiên ký/kiểm HS256, sống 12 giờ", async () => {
    const t = await auth.signSession(actor);
    expect(await auth.verifySession(t)).toEqual(actor);
    const [, body] = t.split(".");
    const p = JSON.parse(Buffer.from(body!, "base64url").toString());
    expect(p.exp - p.iat).toBe(12 * 3600);
    expect(p.iss).toBe("eduvn-student");
  });
  it("thẻ QR không dùng làm phiên được và ngược lại; khoá khác bị từ chối", async () => {
    const badge = await auth.signBadge({ studentId: "s-1", ver: 2 });
    expect(await auth.verifyBadge(badge)).toEqual({ studentId: "s-1", ver: 2 });
    expect(badge.length).toBeLessThan(140);
    await expect(auth.verifySession(badge)).rejects.toThrow();
    await expect(auth.verifyBadge(await auth.signSession(actor))).rejects.toThrow();
    const other = createStudentAuth("x".repeat(32));
    await expect(other.verifySession(await auth.signSession(actor))).rejects.toThrow();
    const noVer = await new SignJWT({ cid: "c", oid: "o" }).setProtectedHeader({ alg: "HS256" }).setIssuer("eduvn-student").setAudience("hs-session").setSubject("s").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
    await expect(auth.verifySession(noVer)).rejects.toThrow();
  });
  it("từ chối secret ngắn", () => {
    expect(() => createStudentAuth("short")).toThrow(/32/);
  });
});

describe("PIN băm scrypt", () => {
  it("băm có muối; kiểm đúng/sai; không có HS vẫn trả false", async () => {
    const h = await hashPin("042917");
    expect(h).toMatch(/^s1\$4096\$/);
    expect(h).not.toBe(await hashPin("042917"));
    expect(await verifyPin("042917", h)).toBe(true);
    expect(await verifyPin("042918", h)).toBe(false);
    expect(await verifyPin("042917", null)).toBe(false);
  });
});
