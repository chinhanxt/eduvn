import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { rmSync } from "node:fs";
import { join } from "node:path";
import type { ContentPart, Usage } from "../types";
import { JsonRpcPeer, RpcError } from "./rpc";

export type AgentOptions = {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  startTimeoutMs?: number;
  /** Thư mục `<gemini_dir>/antigravity-cli`: xoá dữ liệu phiên ở đây khi đóng phiên. */
  dataDir?: string;
};
export type PromptResult = { text: string; stopReason: string; usage?: Usage; deniedTools: number };
export type ModelInfo = { id: string; name: string };
type Collector = { text: string; denied: number; onDelta?: (t: string) => void };
type SessionNew = { sessionId: string; models?: { availableModels?: { modelId: string; name: string }[] } };
type PromptReply = { stopReason: string; usage?: { inputTokens?: number; outputTokens?: number; cachedReadTokens?: number } };

/** Một tiến trình `agy acp` chạy sẵn; một tiến trình phục vụ nhiều phiên song song. */
export class AcpAgent extends EventEmitter {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private peer: JsonRpcPeer | null = null;
  private readonly collectors = new Map<string, Collector>();
  private readonly sessions = new Set<string>();
  private endFn: ((reason: Error) => void) | null = null;
  private active = 0;
  private up = false;
  models: ModelInfo[] = [];

  constructor(private readonly opts: AgentOptions) {
    super();
  }

  get alive(): boolean {
    return this.up;
  }
  get activePrompts(): number {
    return this.active;
  }
  get sessionCount(): number {
    return this.sessions.size;
  }

  async start(): Promise<void> {
    const p = spawn(this.opts.command, this.opts.args, {
      cwd: this.opts.cwd,
      env: { ...process.env, ...this.opts.env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = p;
    p.stderr.on("data", () => {}); // agy ghi log ra stderr; không cần
    const peer = new JsonRpcPeer(p.stdout, p.stdin);
    this.peer = peer;
    peer.onNotification((method, params) => this.onNotification(method, params));
    peer.onRequest((method, params) => this.onRequest(method, params));
    let ended = false;
    const end = (reason: Error) => {
      if (ended) return;
      ended = true;
      this.up = false;
      peer.close(reason);
      for (const sid of this.sessions) this.removeSessionData(sid);
      this.sessions.clear();
      this.collectors.clear();
      try {
        p.kill("SIGKILL");
      } catch {
        // đã chết
      }
      this.emit("exit", reason);
    };
    this.endFn = end;
    p.on("exit", (code, signal) => end(new Error(`Tiến trình AI đã dừng (${code ?? signal})`)));
    p.on("error", (e) => end(new Error(`Tiến trình AI đã dừng: ${e.message}`)));
    p.stdout.on("close", () => end(new Error("Tiến trình AI đã dừng (mất kết nối)")));
    p.stdin.on("error", () => end(new Error("Tiến trình AI đã dừng (mất kết nối)")));
    try {
      await peer.request(
        "initialize",
        { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false } },
        this.opts.startTimeoutMs ?? 30000,
      );
    } catch (e) {
      try {
        p.kill("SIGKILL");
      } catch {
        // đã chết
      }
      throw e;
    }
    this.up = true;
  }

  async newSession(model?: string): Promise<string> {
    const peer = this.need();
    const r = await peer.request<SessionNew>("session/new", { cwd: this.opts.cwd, mcpServers: [] }, 30000);
    const list = r.models?.availableModels;
    if (list?.length) this.models = list.map((m) => ({ id: m.modelId, name: m.name }));
    this.sessions.add(r.sessionId);
    if (model) {
      try {
        await peer.request("session/set_model", { sessionId: r.sessionId, modelId: model }, 15000);
      } catch (e) {
        await this.closeSession(r.sessionId);
        throw e;
      }
    }
    return r.sessionId;
  }

  async prompt(sessionId: string, blocks: ContentPart[], onDelta?: (t: string) => void, timeoutMs = 120000): Promise<PromptResult> {
    const peer = this.need();
    if (this.collectors.has(sessionId)) throw new RpcError(-32002, "Phiên đang bận");
    const c: Collector = { text: "", denied: 0, onDelta };
    this.collectors.set(sessionId, c);
    this.active++;
    let timer: NodeJS.Timeout | undefined;
    let timedOut = false;
    const never = new Promise<never>(() => {});
    try {
      const req = peer.request<PromptReply>("session/prompt", { sessionId, prompt: blocks });
      const settled = req.then(
        () => {},
        () => {},
      );
      const guarded = req.then(
        (v) => (timedOut ? never : v),
        (e) => (timedOut ? never : Promise.reject(e)),
      );
      const res = await Promise.race([
        guarded,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            timedOut = true;
            try {
              peer.notify("session/cancel", { sessionId });
            } catch {
              // kết nối đã đóng
            }
            // chờ lượt bị huỷ kết thúc để chữ đến muộn không lọt sang lượt sau
            let t2: NodeJS.Timeout;
            const cap = new Promise<void>((r) => {
              t2 = setTimeout(r, 3000);
              t2.unref();
            });
            void Promise.race([settled, cap]).then(() => {
              clearTimeout(t2);
              reject(new RpcError(-32000, "AI trả lời quá thời gian"));
            });
          }, timeoutMs);
        }),
      ]);
      const u = res.usage;
      return {
        text: c.text,
        stopReason: res.stopReason,
        deniedTools: c.denied,
        usage: u ? { inputTokens: u.inputTokens, outputTokens: u.outputTokens, cachedReadTokens: u.cachedReadTokens } : undefined,
      };
    } catch (e) {
      // Mất kết nối (stdout đóng) có thể đến trước sự kiện 'exit': gộp về một thông báo.
      const msg = (e as Error).message ?? "";
      if (e instanceof RpcError || !/đã đóng|đã dừng|lỗi/.test(msg) || msg.startsWith("Tiến trình AI đã dừng")) throw e;
      const err = new Error(`Tiến trình AI đã dừng: ${msg}`);
      this.endFn?.(err);
      throw err;
    } finally {
      clearTimeout(timer);
      this.active--;
      if (this.collectors.get(sessionId) === c) this.collectors.delete(sessionId);
    }
  }

  cancel(sessionId: string): void {
    this.peer?.notify("session/cancel", { sessionId });
  }

  async closeSession(sessionId: string): Promise<void> {
    if (!this.sessions.delete(sessionId)) return;
    try {
      await this.peer?.request("session/close", { sessionId }, 5000);
    } catch {
      // bản agy không có session/close: bỏ qua, vẫn xoá dữ liệu
    }
    this.removeSessionData(sessionId);
  }

  async stop(): Promise<void> {
    const p = this.proc;
    if (!p || p.exitCode !== null || p.signalCode !== null) return;
    await new Promise<void>((resolve) => {
      p.once("exit", () => resolve());
      p.kill("SIGTERM");
      setTimeout(() => p.kill("SIGKILL"), 3000).unref();
    });
  }

  private removeSessionData(sessionId: string): void {
    const d = this.opts.dataDir;
    if (!d || !/^[\w-]+$/.test(sessionId)) return;
    for (const p of [join(d, "conversations", `${sessionId}.db`), join(d, "brain", sessionId), join(d, "annotations", `${sessionId}.pbtxt`)]) {
      rmSync(p, { recursive: true, force: true });
    }
  }

  private need(): JsonRpcPeer {
    if (!this.peer || !this.up) throw new RpcError(-32001, "Tiến trình AI chưa sẵn sàng");
    return this.peer;
  }

  private onNotification(method: string, params: { sessionId?: string; update?: { sessionUpdate?: string; content?: { type?: string; text?: string } } }): void {
    if (method !== "session/update" || !params?.sessionId) return;
    const c = this.collectors.get(params.sessionId);
    const u = params.update;
    if (!c || u?.sessionUpdate !== "agent_message_chunk" || u.content?.type !== "text" || !u.content.text) return;
    c.text += u.content.text;
    c.onDelta?.(u.content.text);
  }

  private onRequest(method: string, params: { sessionId?: string }): unknown {
    if (method === "session/request_permission") {
      const c = params?.sessionId ? this.collectors.get(params.sessionId) : undefined;
      if (c) c.denied++;
      return { outcome: { outcome: "cancelled" } };
    }
    throw new RpcError(-32601, `Cổng AI không cho phép ${method}`);
  }
}
