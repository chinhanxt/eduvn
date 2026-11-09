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
  MAX_CONVERSATIONS: z.coerce.number().int().min(1).max(100000).default(300),
  // Đo thật (agy, 60 phiên): RSS 164→293 MB sau 20 phiên →318 MB sau 60; fd đã xoá nhưng còn mở ~0,3-0,8/phiên (50 sau 60), mỗi -wal ~1,3 MB giữ đĩa đến khi tiến trình thoát.
  AGY_RECYCLE_SESSIONS: z.coerce.number().int().min(1).default(150),
  CHAT_RESERVED: z.coerce.number().int().min(0).max(31).default(1),
  CHAT_MAX_WAIT_MS: z.coerce.number().int().min(1000).default(30000),
  WORK_DIR: z.string().min(1).default("/var/tmp/eduvn-gateway"),
  TASKS_FILE: z.string().min(1).default("tasks.json"),
  ANTHROPIC_API_KEY: z.string().default(""),
  ANTHROPIC_BASE_URL: z.url().default("https://api.anthropic.com"),
});
export type GatewayConfig = z.infer<typeof Env>;

export function loadConfig(env: Record<string, string | undefined> = process.env): GatewayConfig {
  const c = Env.parse(env);
  return { ...c, WORK_DIR: resolve(c.WORK_DIR), TASKS_FILE: resolve(c.TASKS_FILE) };
}
