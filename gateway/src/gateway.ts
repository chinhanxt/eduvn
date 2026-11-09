import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { AcpAgent, type AgentOptions } from "./acp/agent";
import { AgentPool } from "./acp/pool";
import { AcpBackend } from "./backends/acp";
import { AnthropicBackend } from "./backends/anthropic";
import { cleanWorkDir } from "./cleanup";
import type { GatewayConfig } from "./config";
import { buildApp } from "./http/app";
import { JobStore } from "./jobs";
import { PriorityLimiter } from "./limiter";
import { LlmService } from "./llm";
import { ensureProxy } from "./proxy";
import { loadTasks } from "./routes";
import type { Backend } from "./types";

/** `agy acp` an toàn: không bỏ qua quyền, qua proxy riêng của cổng, dữ liệu phiên ở thư mục riêng từng tiến trình. */
export function agyArgs(cfg: GatewayConfig, slot: number): AgentOptions {
  const gemini = join(cfg.WORK_DIR, `gemini-${slot}`);
  return {
    command: cfg.AGY_BIN,
    args: ["acp", "--include-default-customizations=false", "--disable-telemetry", "--sandbox", "--gemini_dir", gemini],
    cwd: join(cfg.WORK_DIR, "cwd"),
    env: { CLOUD_CODE_URL: `http://127.0.0.1:${cfg.AGY_PROXY_PORT}` },
    startTimeoutMs: 60000,
    dataDir: join(gemini, "antigravity-cli"),
  };
}

export type Gateway = { app: FastifyInstance; pool: AgentPool; llm: LlmService; jobs: JobStore; close: () => Promise<void> };

export async function buildGateway(cfg: GatewayConfig, over: { agentOptions?: (slot: number) => AgentOptions } = {}): Promise<Gateway> {
  mkdirSync(join(cfg.WORK_DIR, "cwd"), { recursive: true });
  cleanWorkDir(cfg.WORK_DIR, 6 * 3600_000);
  if (cfg.AGY_MANAGE_PROXY) {
    await ensureProxy({ port: cfg.AGY_PROXY_PORT, pidFile: join(cfg.WORK_DIR, "proxy.pid"), bin: cfg.AGY_SWITCH_BIN });
  }
  const tasks = loadTasks(cfg.TASKS_FILE); // đọc trước khi bật tiến trình agy: lỗi cấu hình không để sót tiến trình
  const pool = new AgentPool({
    size: cfg.AGY_PROCESSES,
    idleSessionMs: cfg.SESSION_IDLE_MS,
    factory: (slot) => new AcpAgent(over.agentOptions ? over.agentOptions(slot) : agyArgs(cfg, slot)),
  });
  const backends: Record<string, Backend> = { acp: new AcpBackend(pool) };
  if (cfg.ANTHROPIC_API_KEY) backends.anthropic = new AnthropicBackend({ apiKey: cfg.ANTHROPIC_API_KEY, baseUrl: cfg.ANTHROPIC_BASE_URL });
  try {
    await pool.start();
  } catch (e) {
    if (!backends.anthropic) {
      await pool.stop(); // huỷ hẹn giờ khởi động lại
      throw e;
    }
    console.warn(`Cổng AI: không bật được agy (${(e as Error).message}); chạy bằng khoá API Anthropic.`);
  }
  const limiter = new PriorityLimiter(cfg.MAX_CONCURRENCY, 1);
  const llm = new LlmService({
    tasks,
    backends,
    limiter,
    fallback: backends.anthropic ? "anthropic" : undefined,
  });
  const jobs = new JobStore();
  const started = Date.now();
  const app = buildApp({
    llm,
    jobs,
    token: cfg.GATEWAY_TOKEN,
    models: () => pool.models(),
    health: () => ({ uptimeS: Math.round((Date.now() - started) / 1000), pool: pool.stats(), conversations: llm.conversations(), limiter: { active: limiter.active, queued: limiter.queued }, backends: Object.keys(backends) }),
  });
  const timers = [
    setInterval(() => {
      pool.sweep();
      llm.sweep(Date.now(), cfg.SESSION_IDLE_MS);
      jobs.sweep();
    }, 60_000),
    setInterval(() => cleanWorkDir(cfg.WORK_DIR, 6 * 3600_000), 3600_000),
  ];
  timers.forEach((t) => t.unref());
  return {
    app,
    pool,
    llm,
    jobs,
    close: async () => {
      timers.forEach(clearInterval);
      await app.close();
      await pool.stop();
    },
  };
}
