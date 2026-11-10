import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().min(1),
  OIDC_ISSUER: z.url(),
  OIDC_JWKS_URL: z.url(),
  OIDC_AUDIENCE: z.string().min(1).default("eduvn-api"),
  PUBLIC_URL: z.url(),
  DOWNLOAD_SECRET: z.string().min(32),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4310),
  // Cổng AI (gateway/). Thiếu token = tắt tính năng AI phía lõi (trả 503).
  GATEWAY_URL: z.url().default("http://127.0.0.1:4340"),
  GATEWAY_TOKEN: z.string().min(24).optional(),
  // Bài giảng AI (P5): thư mục media (âm thanh lời giảng, video xuất), giọng đọc, Chrome để dựng MP4.
  DATA_DIR: z.string().min(1).default("./data"),
  TTS_PROVIDER: z.enum(["edge", "off"]).default("edge"),
  TTS_VOICE: z.string().min(1).default("vi-VN-HoaiMyNeural"),
  CHROME_PATH: z.string().min(1).default("/usr/bin/google-chrome"),
  /** JSON {"tên_task":"tên_task_khác"} — ánh xạ tạm khi cổng AI chưa có task mới. */
  AI_TASK_OVERRIDES: z.string().optional(),
});
export type Config = z.infer<typeof Env>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const cfg = Env.parse(env);
  return { ...cfg, OIDC_ISSUER: cfg.OIDC_ISSUER.replace(/\/+$/, ""), PUBLIC_URL: cfg.PUBLIC_URL.replace(/\/+$/, "") };
}
