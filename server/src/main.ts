import { createVerifier } from "./auth/verify";
import { loadConfig } from "./config";
import { connectDb } from "./db/client";
import { buildApp } from "./http/app";
import { createAi } from "./services/ai";
import { createAnimService } from "./services/anim";
import { createVieneuTts, disabledTts } from "./services/aiLessons/tts";
import { createProviders } from "./providers";

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
  providers: createProviders({ ai: createAi({ url: cfg.GATEWAY_URL, token: cfg.GATEWAY_TOKEN }) }),
  aiLessons: {
    dataDir: cfg.DATA_DIR,
    anim: createAnimService({ dataDir: cfg.DATA_DIR, wrap: cfg.HEAVY_BIN ? [cfg.HEAVY_BIN, "run", "eduvn-anim", "--"] : undefined, manimHome: cfg.MANIM_HOME, tinytexBin: cfg.TINYTEX_BIN }),
    tts: cfg.TTS_PROVIDER === "vieneu" ? createVieneuTts({ cmd: cfg.VIENEU_CMD, ref: cfg.VIENEU_VOICE ? undefined : cfg.VIENEU_REF, voice: cfg.VIENEU_VOICE, wrap: cfg.HEAVY_BIN ? [cfg.HEAVY_BIN, "run", "eduvn-tts", "--"] : undefined }) : disabledTts,
    taskOverrides: cfg.AI_TASK_OVERRIDES ? (JSON.parse(cfg.AI_TASK_OVERRIDES) as Record<string, string>) : undefined,
    chromePath: cfg.CHROME_PATH,
    markStaleOnStart: true,
  },
});
await app.listen({ host: cfg.HOST, port: cfg.PORT });
console.log(`eduvn server: ${cfg.PUBLIC_URL} · MCP: ${cfg.PUBLIC_URL}/mcp`);
