import { createVerifier } from "../../src/auth/verify";
import { buildApp } from "../../src/http/app";
import type { Ai } from "../../src/services/ai";
import { testDb } from "./db";
import { AUDIENCE, ISSUER, makeIssuer } from "./tokens";

export const PUBLIC_URL = "http://eduvn.test";

export async function testApp(opts: { ai?: Ai } = {}) {
  const db = await testDb();
  const kc = await makeIssuer();
  const app = buildApp({
    db,
    verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
    issuer: ISSUER,
    publicUrl: PUBLIC_URL,
    downloadSecret: "test-secret-test-secret-test-secret!",
    ai: opts.ai,
  });
  return { app, db, sign: (claims: Record<string, unknown>) => kc.sign(claims) };
}
