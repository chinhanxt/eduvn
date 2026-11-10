import { createVerifier } from "./auth/verify";
import { loadConfig } from "./config";
import { connectDb } from "./db/client";
import { buildApp } from "./http/app";
import { createAi } from "./services/ai";
import { createEdgeTts, disabledTts } from "./services/aiLessons/tts";

const cfg = loadConfig();
const db = await connectDb(cfg.DATABASE_URL);
const app = buildApp({
  db,
  verify: createVerifier({ issuer: cfg.OIDC_ISSUER, audience: cfg.OIDC_AUDIENCE, jwksUrl: cfg.OIDC_JWKS_URL }),
  issuer: cfg.OIDC_ISSUER,
  publicUrl: cfg.PUBLIC_URL,
  downloadSecret: cfg.DOWNLOAD_SECRET,
  studentSecret: cfg.STUDENT_SECRET,
  pressure: { maxEventLoopDelay: 1000 },
  sweepMs: 60_000,
  ai: createAi({ url: cfg.GATEWAY_URL, token: cfg.GATEWAY_TOKEN }),
  aiLessons: {
    dataDir: cfg.DATA_DIR,
    tts: cfg.TTS_PROVIDER === "edge" ? createEdgeTts(cfg.TTS_VOICE) : disabledTts,
    taskOverrides: cfg.AI_TASK_OVERRIDES ? (JSON.parse(cfg.AI_TASK_OVERRIDES) as Record<string, string>) : undefined,
    chromePath: cfg.CHROME_PATH,
    markStaleOnStart: true,
  },
});
await app.listen({ host: cfg.HOST, port: cfg.PORT });
console.log(`eduvn server: ${cfg.PUBLIC_URL} · MCP: ${cfg.PUBLIC_URL}/mcp`);
