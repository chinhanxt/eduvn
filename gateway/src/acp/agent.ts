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
export type PromptResult = { text: string; stopReason: string; usage?: Usage; deniedTools: number; toolsRan: number; agyBlocked: number };
export type ModelInfo = { id: string; name: string };
type Collector = {
  text: string;
  denied: number;
  tools: Map<string, string>;
  onDelta?: (t: string) => void;
  hold: string; // dòng dở dang chưa chắc có phải chữ cảnh báo của agy
  mid: boolean; // dòng đang chạy đã phát một phần ra ngoài
  blanks: string; // dòng trống đang chờ (bỏ nếu đầu/cuối câu)
  blocked: number; // số dòng cảnh báo của agy đã loại
};

/** agy đôi khi trả chữ cảnh báo của bộ lọc an toàn thay cho câu trả lời; những dòng này không bao giờ được tới người dùng. */
const BLOCK_LINE = [/^\s*(?:…\s*)?⚠/, /^\s*Please provide a response that complies with content policies/, /^\s*Retries remaining: \d+/];
const BLOCK_START = ["Please provide a response that complies with content policies", "Retries remaining: "];
const isBlockLine = (s: string): boolean => BLOCK_LINE.some((re) => re.test(s));
/** Dòng dở dang còn có thể thành dòng cảnh báo thì giữ lại chờ thêm chữ. */
const couldBeBlock = (partial: string): boolean => {
  const t = partial.trimStart();
  return t === "" || t === "…" || isBlockLine(partial) || BLOCK_START.some((p) => p.startsWith(t));
};
function emit(c: Collector, x: string): void {
  if (!x) return;
  const d = (c.text ? c.blanks : "") + x;
  c.blanks = "";
  c.text += d;
  c.onDelta?.(d);
}
function feed(c: Collector, chunk: string, final = false): void {
  let s = c.hold + chunk;
  c.hold = "";
  if (c.mid) {
    const i = s.indexOf("\n");
    if (i < 0) return emit(c, s);
    emit(c, s.slice(0, i + 1));
    s = s.slice(i + 1);
    c.mid = false;
  }
  for (let i = s.indexOf("\n"); i >= 0; i = s.indexOf("\n")) {
    const line = s.slice(0, i + 1);
    s = s.slice(i + 1);
    if (isBlockLine(line)) c.blocked++;
    else if (!line.trim()) c.blanks += line;
    else emit(c, line);
  }
  if (!s) return;
  if (final) {
    if (isBlockLine(s)) c.blocked++;
    else if (s.trim()) emit(c, s);
  } else if (couldBeBlock(s)) c.hold = s;
  else {
    emit(c, s);
    c.mid = true;
  }
}

/** Chỉ những biến môi trường này được chuyển cho `agy`; khoá API, token cổng… không bao giờ lọt sang. */
const ENV_ALLOW = ["PATH", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LANGUAGE", "LC_ALL", "LC_CTYPE", "TZ", "TMPDIR", "XDG_RUNTIME_DIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS", "DBUS_SESSION_BUS_ADDRESS"];
export function childEnv(extra: NodeJS.ProcessEnv = {}, base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const k of ENV_ALLOW) if (base[k] !== undefined) env[k] = base[k];
  return { ...env, ...extra };
}
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
  private badStreak = 0;
  private stderrTail: string[] = [];
  private stderrPart = "";
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

  /** 20 dòng stderr cuối của tiến trình (để chẩn đoán khi nó chết). */
  lastStderr(): string[] {
    return this.stderrPart ? [...this.stderrTail, this.stderrPart] : [...this.stderrTail];
  }

  async start(): Promise<void> {
    const p = spawn(this.opts.command, this.opts.args, {
      cwd: this.opts.cwd,
      env: childEnv(this.opts.env),
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = p;
    p.stderr.on("data", (d: Buffer) => {
      const lines = (this.stderrPart + d.toString("utf8")).split("\n");
      this.stderrPart = (lines.pop() ?? "").slice(-2000);
      for (const l of lines) this.stderrTail.push(l.slice(0, 2000));
      if (this.stderrTail.length > 20) this.stderrTail.splice(0, this.stderrTail.length - 20);
    });
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
      this.emit("exit", reason, this.lastStderr());
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
    const c: Collector = { text: "", denied: 0, tools: new Map(), onDelta, hold: "", mid: false, blanks: "", blocked: 0 };
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
              reject(new RpcError(-32010, "AI trả lời quá thời gian"));
            });
          }, timeoutMs);
        }),
      ]);
      feed(c, "", true);
      // Theo dõi sức khoẻ: câu trả lời trống (kể cả bị bộ lọc chặn) hoặc dừng bất thường liên tiếp → báo để thay tiến trình.
      if (res.stopReason !== "cancelled") {
        const bad = !c.text.trim() || res.stopReason !== "end_turn";
        this.badStreak = bad ? this.badStreak + 1 : 0;
        if (this.badStreak === 3) this.emit("unhealthy", this.badStreak);
      }
      const u = res.usage;
      return {
        text: c.text,
        stopReason: res.stopReason,
        deniedTools: c.denied,
        agyBlocked: c.blocked,
        toolsRan: [...c.tools.values()].filter((s) => s === "completed").length,
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
    const paths = [
      ...["", "-wal", "-shm", "-journal"].map((x) => join(d, "conversations", `${sessionId}.db${x}`)), // SQLite: file phụ -wal nặng ~1,5 MB/phiên
      join(d, "brain", sessionId),
      join(d, "annotations", `${sessionId}.pbtxt`),
    ];
    const rm = () => {
      for (const p of paths) rmSync(p, { recursive: true, force: true });
    };
    rm();
    setTimeout(rm, 3000).unref(); // agy có thể ghi nốt khi đóng phiên: xoá lần hai
  }


  private need(): JsonRpcPeer {
    if (!this.peer || !this.up) throw new RpcError(-32001, "Tiến trình AI chưa sẵn sàng");
    return this.peer;
  }

  private onNotification(
    method: string,
    params: { sessionId?: string; update?: { sessionUpdate?: string; toolCallId?: string; status?: string; content?: { type?: string; text?: string } } },
  ): void {
    if (method !== "session/update" || !params?.sessionId) return;
    const c = this.collectors.get(params.sessionId);
    const u = params.update;
    if (c && u?.toolCallId && (u.sessionUpdate === "tool_call" || u.sessionUpdate === "tool_call_update")) {
      c.tools.set(u.toolCallId, u.status ?? c.tools.get(u.toolCallId) ?? "pending");
      return;
    }
    if (!c || u?.sessionUpdate !== "agent_message_chunk" || u.content?.type !== "text" || !u.content.text) return;
    feed(c, u.content.text);
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
