import { type JWTVerifyGetKey, createRemoteJWKSet, jwtVerify } from "jose";

export type Identity = { sub: string; email?: string; name?: string };
export type VerifyToken = (token: string) => Promise<Identity>;

export function createVerifier(o: {
  issuer: string;
  audience: string;
  jwksUrl?: string;
  keys?: JWTVerifyGetKey;
  algorithms?: string[];
}): VerifyToken {
  const keys = o.keys ?? (o.jwksUrl ? createRemoteJWKSet(new URL(o.jwksUrl)) : undefined);
  if (!keys) throw new Error("createVerifier: need jwksUrl or keys");
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer: o.issuer,
      audience: o.audience,
      algorithms: o.algorithms ?? ["RS256"],
      requiredClaims: ["exp", "sub"],
    });
    if (typeof payload.sub !== "string" || payload.sub === "") throw new Error("token has no sub");
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  };
}
