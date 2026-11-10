import { createVerifier } from "../../src/auth/verify";
import { type AppDeps, buildApp } from "../../src/http/app";
import { testDb } from "./db";
import { AUDIENCE, ISSUER, makeIssuer } from "./tokens";

export const PUBLIC_URL = "http://eduvn.test";

export async function testApp(extra: Partial<AppDeps> = {}) {
  const db = await testDb();
  const kc = await makeIssuer();
  const app = buildApp({
    db,
    verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
    issuer: ISSUER,
    publicUrl: PUBLIC_URL,
    downloadSecret: "test-secret-test-secret-test-secret!",
    ...extra,
  });
  return { app, db, sign: (claims: Record<string, unknown>) => kc.sign(claims) };
}
