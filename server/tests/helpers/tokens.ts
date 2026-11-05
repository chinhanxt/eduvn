import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";

export const ISSUER = "http://kc.test/realms/eduvn";
export const AUDIENCE = "eduvn-api";

/** Một "Keycloak giả": cặp khoá RSA + JWKS cục bộ. */
export async function makeIssuer() {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, opts: { aud?: string; iss?: string; exp?: string | number } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(opts.iss ?? ISSUER)
      .setAudience(opts.aud ?? AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "5m")
      .sign(privateKey);
  return { keys, sign };
}
