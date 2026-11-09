import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { AcpAgent, type AgentOptions } from "./acp/agent";
import { AgentPool } from "./acp/pool";
import { AcpBackend } from "./backends/acp";
import { AnthropicBackend } from "./backends/anthropic";
import { cleanWorkDir } from "./cleanup";
import type { GatewayConfig } from "./config";
import { buildApp, type GatewayApp } from "./http/app";
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

export type Gateway = { app: GatewayApp; pool: AgentPool; llm: LlmService; jobs: JobStore; close: () => Promise<void> };

export async function buildGateway(cfg: GatewayConfig, over: { agentOptions?: (slot: number) => AgentOptions; logger?: boolean | object } = {}): Promise<Gateway> {
  mkdirSync(join(cfg.WORK_DIR, "cwd"), { recursive: true });
  cleanWorkDir(cfg.WORK_DIR, 6 * 3600_000);
  const pidFile = join(cfg.WORK_DIR, "proxy.pid");
  let proxyStarted = false;
  // Chỉ tắt proxy nếu chính cổng đã bật nó (proxy có sẵn của người dùng thì để yên).
  const stopProxy = () =>
    proxyStarted
      ? new Promise<void>((resolve) => {
          proxyStarted = false;
          execFile(cfg.AGY_SWITCH_BIN, ["proxy", "stop", "--port", String(cfg.AGY_PROXY_PORT), "--pid-file", pidFile], { timeout: 10000 }, () => resolve());
        })
      : Promise.resolve();
  if (cfg.AGY_MANAGE_PROXY) {
    proxyStarted = (await ensureProxy({ port: cfg.AGY_PROXY_PORT, pidFile, bin: cfg.AGY_SWITCH_BIN })) === "started";
  }
  let logWarn = (m: string) => console.warn(m);
  let tasks: ReturnType<typeof loadTasks>;
  try {
    tasks = loadTasks(cfg.TASKS_FILE); // đọc trước khi bật tiến trình agy: lỗi cấu hình không để sót tiến trình
  } catch (e) {
    await stopProxy();
    throw e;
  }
  const pool = new AgentPool({
    size: cfg.AGY_PROCESSES,
    idleSessionMs: cfg.SESSION_IDLE_MS,
    maxConversations: cfg.MAX_CONVERSATIONS,
    recycleAfterSessions: cfg.AGY_RECYCLE_SESSIONS,
    onLog: (m) => logWarn(m),
    factory: (slot) => new AcpAgent(over.agentOptions ? over.agentOptions(slot) : agyArgs(cfg, slot)),
  });
  const backends: Record<string, Backend> = { acp: new AcpBackend(pool) };
  if (cfg.ANTHROPIC_API_KEY) backends.anthropic = new AnthropicBackend({ apiKey: cfg.ANTHROPIC_API_KEY, baseUrl: cfg.ANTHROPIC_BASE_URL });
  try {
    await pool.start();
  } catch (e) {
    if (!backends.anthropic) {
      await pool.stop(); // huỷ hẹn giờ khởi động lại
      await stopProxy();
      throw e;
    }
    console.warn(`Cổng AI: không bật được agy (${(e as Error).message}); chạy bằng khoá API Anthropic.`);
  }
  const limiter = new PriorityLimiter(cfg.MAX_CONCURRENCY, cfg.CHAT_RESERVED, cfg.CHAT_MAX_WAIT_MS);
  const llm = new LlmService({
    tasks,
    backends,
    limiter,
    fallback: backends.anthropic ? "anthropic" : undefined,
    log: (m) => logWarn(m),
    maxConversations: cfg.MAX_CONVERSATIONS,
  });
  const jobs = new JobStore();
  const started = Date.now();
  const app = buildApp({
    llm,
    jobs,
    token: cfg.GATEWAY_TOKEN,
    models: () => pool.models(),
    logger: over.logger ?? { level: process.env.LOG_LEVEL ?? "info", redact: ["req.headers.authorization"] },
    health: () => {
      const ps = pool.stats();
      return {
        ok: ps.alive > 0 || !!backends.anthropic,
        uptimeS: Math.round((Date.now() - started) / 1000),
        pool: ps,
        conversations: llm.conversations(),
        limiter: { active: limiter.active, queued: limiter.queued },
        backends: Object.keys(backends),
        metrics: { ...llm.metrics(), restarts: ps.restarts, unhealthyRecycles: ps.unhealthyRecycles },
      };
    },
  });
  logWarn = (m) => app.log.warn(m);
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
      app.abortAll(); // cắt các stream đang chạy để đóng nhanh
      await app.close();
      await pool.stop();
      await stopProxy();
    },
  };
}
