import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().min(1),
  OIDC_ISSUER: z.url(),
  OIDC_JWKS_URL: z.url(),
  OIDC_AUDIENCE: z.string().min(1).default("eduvn-api"),
  PUBLIC_URL: z.url(),
  DOWNLOAD_SECRET: z.string().min(32),
  STUDENT_SECRET: z.string().min(32),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4310),
});
export type Config = z.infer<typeof Env>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const cfg = Env.parse(env);
  return { ...cfg, OIDC_ISSUER: cfg.OIDC_ISSUER.replace(/\/+$/, ""), PUBLIC_URL: cfg.PUBLIC_URL.replace(/\/+$/, "") };
}
