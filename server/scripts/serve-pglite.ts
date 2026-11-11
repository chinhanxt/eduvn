// Server thử cục bộ không cần Docker: PGlite trong tiến trình + Keycloak giả (khoá RSA tạm).
// Cổng AI thật (tuỳ chọn): GATEWAY_URL + GATEWAY_TOKEN; AI_TASK_OVERRIDES như server chính.
// Chạy: PORT=4323 TOKEN_FILE=/tmp/p9a-token.txt pnpm --filter @eduvn/server exec tsx scripts/serve-pglite.ts
import { writeFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createVerifier } from "../src/auth/verify";
import { MIGRATIONS_DIR } from "../src/db/client";
import * as schema from "../src/db/schema";
import { buildApp } from "../src/http/app";
import { createAi } from "../src/services/ai";
import { AUDIENCE, ISSUER, makeIssuer } from "../tests/helpers/tokens";

const port = Number(process.env.PORT ?? 4323);
const db = drizzle(new PGlite(), { schema });
await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
const kc = await makeIssuer();
const token = await kc.sign({ sub: "gv-demo", email: "gv.demo@example.test", name: "Cô Lan (thử)" }, { exp: "8h" });
if (process.env.TOKEN_FILE) writeFileSync(process.env.TOKEN_FILE, token);
const app = buildApp({
  db,
  verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
  issuer: ISSUER,
  publicUrl: `http://127.0.0.1:${port}`,
  downloadSecret: "demo-secret-demo-secret-demo-secret!!",
  studentSecret: "demo-student-secret-demo-student-secret",
  sweepMs: 60_000,
  ai: process.env.GATEWAY_TOKEN ? createAi({ url: process.env.GATEWAY_URL ?? "http://127.0.0.1:4340", token: process.env.GATEWAY_TOKEN }) : undefined,
  studentRateLimit: { max: 100_000, timeWindow: 60_000 },
});
await app.listen({ host: "127.0.0.1", port });
console.log(`pglite server :${port}`);
