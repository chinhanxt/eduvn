import { resolve } from "node:path";
import { z } from "zod";

const bool = z
  .enum(["0", "1", "true", "false"])
  .default("1")
  .transform((v) => v === "1" || v === "true");

const Env = z.object({
  GATEWAY_TOKEN: z.string().min(24),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4340),
  AGY_BIN: z.string().min(1).default("agy"),
  AGY_SWITCH_BIN: z.string().min(1).default("agy-switch"),
  AGY_PROXY_PORT: z.coerce.number().int().min(1).max(65535).default(8900),
  AGY_MANAGE_PROXY: bool,
  AGY_PROCESSES: z.coerce.number().int().min(1).max(8).default(2),
  MAX_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(6),
  SESSION_IDLE_MS: z.coerce.number().int().min(10000).default(900000),
  WORK_DIR: z.string().min(1).default(".work"),
  TASKS_FILE: z.string().min(1).default("tasks.json"),
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_BASE_URL: z.url().default("https://api.anthropic.com"),
});
export type GatewayConfig = z.infer<typeof Env>;

export function loadConfig(env: Record<string, string | undefined> = process.env): GatewayConfig {
  const c = Env.parse(env);
  return { ...c, WORK_DIR: resolve(c.WORK_DIR), TASKS_FILE: resolve(c.TASKS_FILE) };
}
