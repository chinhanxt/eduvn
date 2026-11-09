import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

export type RpcMessage = {
  jsonrpc: "2.0";
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer?: NodeJS.Timeout };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any;

/** JSON-RPC 2.0, mỗi dòng một thông điệp (cách `agy acp` nói chuyện qua stdio). */
export class JsonRpcPeer {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private closed: Error | null = null;
  private notificationHandler: (method: string, params: Params) => void = () => {};
  private requestHandler: (method: string, params: Params) => unknown = (method) => {
    throw new RpcError(-32601, `Không hỗ trợ ${method}`);
  };

  constructor(
    input: Readable,
    private readonly output: Writable,
  ) {
    output.on("error", (e) => this.close(new Error(`Kết nối AI lỗi: ${e.message}`)));
    createInterface({ input })
      .on("line", (line) => this.onLine(line))
      .on("close", () => this.close(new Error("Kết nối AI đã đóng")));
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  onNotification(handler: (method: string, params: Params) => void): void {
    this.notificationHandler = handler;
  }

  onRequest(handler: (method: string, params: Params) => unknown): void {
    this.requestHandler = handler;
  }

  request<T = unknown>(method: string, params: unknown, timeoutMs = 0): Promise<T> {
    if (this.closed) return Promise.reject(this.closed);
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const p: Pending = { resolve: resolve as (v: unknown) => void, reject };
      if (timeoutMs > 0) {
        p.timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new RpcError(-32010, `Hết thời gian chờ ${method}`));
        }, timeoutMs);
      }
      this.pending.set(id, p);
      try {
        this.write({ jsonrpc: "2.0", id, method, params });
      } catch (e) {
        this.pending.delete(id);
        clearTimeout(p.timer);
        reject(e as Error);
      }
    });
  }

  notify(method: string, params: unknown): void {
    if (!this.closed) this.write({ jsonrpc: "2.0", method, params });
  }

  close(reason: Error): void {
    if (this.closed) return;
    this.closed = reason;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(reason);
    }
    this.pending.clear();
  }

  private write(m: RpcMessage): void {
    if (this.closed) return;
    this.output.write(JSON.stringify(m) + "\n");
  }

  private safeWrite(m: RpcMessage): void {
    try {
      this.write(m);
    } catch {
      // đầu ra hỏng: sự kiện 'error' sẽ đóng kết nối
    }
  }

  private onLine(line: string): void {
    const s = line.trim();
    if (!s.startsWith("{")) return;
    let m: RpcMessage;
    try {
      m = JSON.parse(s) as RpcMessage;
    } catch {
      return;
    }
    if (m.method === undefined && typeof m.id === "number") {
      const p = this.pending.get(m.id);
      if (!p) return;
      this.pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.error) p.reject(new RpcError(m.error.code, m.error.message, m.error.data));
      else p.resolve(m.result);
      return;
    }
    if (m.method === undefined) return;
    if (m.id === undefined) {
      try {
        this.notificationHandler(m.method, m.params);
      } catch {
        // bỏ qua lỗi của bộ xử lý thông báo
      }
      return;
    }
    if (typeof m.id === "number" || (typeof m.id === "string" && m.id !== "")) {
      void this.answer(m.id, m.method, m.params);
    }
  }

  private async answer(id: number | string, method: string, params: unknown): Promise<void> {
    try {
      const result = await this.requestHandler(method, params);
      this.safeWrite({ jsonrpc: "2.0", id, result: result ?? null });
    } catch (e) {
      const err = e instanceof RpcError ? e : new RpcError(-32603, (e as Error).message);
      this.safeWrite({ jsonrpc: "2.0", id, error: { code: err.code, message: err.message } });
    }
  }
}
