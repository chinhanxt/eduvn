import { SignJWT, jwtVerify } from "jose";

export type DownloadClaims = { orgId: string; examId: string; kind: "exam" | "key"; code?: string };

export function createDownloadSigner(secret: string, ttl: string | number = "15m") {
  if (secret.length < 32) throw new Error("DOWNLOAD_SECRET must be at least 32 characters");
  const key = new TextEncoder().encode(secret);
  return {
    sign(claims: DownloadClaims): Promise<string> {
      return new SignJWT({ ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(ttl).sign(key);
    },
    async verify(token: string): Promise<DownloadClaims> {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      const { orgId, examId, kind, code } = payload as Record<string, unknown>;
      if (typeof orgId !== "string" || typeof examId !== "string" || (kind !== "exam" && kind !== "key")) {
        throw new Error("invalid download token");
      }
      return { orgId, examId, kind, code: typeof code === "string" ? code : undefined };
    },
  };
}
