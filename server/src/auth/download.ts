import { SignJWT, jwtVerify } from "jose";

type Ids = "examId" | "code" | "classId" | "lessonId" | "vanBanId" | "slideId" | "gameId";
type Only<T> = T & { [K in Exclude<Ids, keyof T>]?: undefined };

export type DownloadClaims =
  | Only<{ orgId: string; examId: string; kind: "exam" | "key" | "matrix"; code?: string }>
  | Only<{ orgId: string; classId: string; kind: "class_list" | "gradebook" }>
  | Only<{ orgId: string; lessonId: string; kind: "lesson" }>
  | Only<{ orgId: string; vanBanId: string; kind: "van_ban" }>
  | Only<{ orgId: string; slideId: string; kind: "slide" }>
  | Only<{ orgId: string; gameId: string; kind: "game" }>;

export function createDownloadSigner(secret: string, ttl: string | number = "15m") {
  if (secret.length < 32) throw new Error("DOWNLOAD_SECRET must be at least 32 characters");
  const key = new TextEncoder().encode(secret);
  return {
    sign(claims: DownloadClaims): Promise<string> {
      return new SignJWT({ ...claims }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(ttl).sign(key);
    },
    async verify(token: string): Promise<DownloadClaims> {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      const { orgId, examId, classId, lessonId, vanBanId, slideId, gameId, kind, code } = payload as Record<string, unknown>;
      if (typeof orgId === "string" && typeof examId === "string" && (kind === "exam" || kind === "key" || kind === "matrix")) {
        return { orgId, examId, kind, code: typeof code === "string" ? code : undefined };
      }
      if (typeof orgId === "string" && typeof classId === "string" && (kind === "class_list" || kind === "gradebook")) {
        return { orgId, classId, kind };
      }
      if (typeof orgId === "string" && typeof lessonId === "string" && kind === "lesson") return { orgId, lessonId, kind };
      if (typeof orgId === "string" && typeof vanBanId === "string" && kind === "van_ban") return { orgId, vanBanId, kind };
      if (typeof orgId === "string" && typeof slideId === "string" && kind === "slide") return { orgId, slideId, kind };
      if (typeof orgId === "string" && typeof gameId === "string" && kind === "game") return { orgId, gameId, kind };
      throw new Error("invalid download token");
    },
  };
}
