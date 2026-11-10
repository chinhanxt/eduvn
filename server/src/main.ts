import { createVerifier } from "./auth/verify";
import { loadConfig } from "./config";
import { connectDb } from "./db/client";
import { buildApp } from "./http/app";
import { createAi } from "./services/ai";

const cfg = loadConfig();
const db = await connectDb(cfg.DATABASE_URL);
const app = buildApp({
  db,
  verify: createVerifier({ issuer: cfg.OIDC_ISSUER, audience: cfg.OIDC_AUDIENCE, jwksUrl: cfg.OIDC_JWKS_URL }),
  issuer: cfg.OIDC_ISSUER,
  publicUrl: cfg.PUBLIC_URL,
  downloadSecret: cfg.DOWNLOAD_SECRET,
  ai: createAi({ url: cfg.GATEWAY_URL, token: cfg.GATEWAY_TOKEN }),
});
await app.listen({ host: cfg.HOST, port: cfg.PORT });
console.log(`eduvn server: ${cfg.PUBLIC_URL} · MCP: ${cfg.PUBLIC_URL}/mcp`);
