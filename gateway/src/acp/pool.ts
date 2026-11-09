import { GatewayError } from "../types";
import type { AcpAgent, ModelInfo } from "./agent";
import { RpcError } from "./rpc";

export type PoolOptions = {
  size: number;
  factory: (slot: number) => AcpAgent;
  idleSessionMs: number;
  restartDelayMs?: number;
  /** Số hội thoại giữ tối đa; vượt thì bỏ hội thoại rảnh lâu nhất (mặc định 300). */
  maxConversations?: number;
  /** Tiến trình mở đủ ngần này phiên thì cho nghỉ và thay bằng tiến trình mới (mặc định 150). */
  recycleAfterSessions?: number;
  onLog?: (msg: string) => void;
};
export type Lease = { agent: AcpAgent; sessionId: string; model: string; fresh: boolean; release: () => void };
type Conversation = { agent: AcpAgent; sessionId: string; model: string; sig: string; lastUsed: number; busy: number };

/** Vài tiến trình `agy acp` chạy sẵn + phiên bám theo hội thoại. */
export class AgentPool {
  private readonly agents: (AcpAgent | null)[];
  private readonly conversations = new Map<string, Conversation>();
  private stopped = false;
  private readonly failures: number[];
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly creating = new Map<string, Promise<Conversation>>();
  private readonly pending = new Map<AcpAgent, number>();
  private readonly opened = new Map<AcpAgent, number>();
  private readonly draining = new Set<AcpAgent>();
  private readonly retired = new Set<AcpAgent>();
  private restartCount = 0;
  private unhealthyCount = 0;
  private recycling = false;
  private readonly lingering = new Set<AcpAgent>(); // đã bị thay nhưng còn lượt dở

  constructor(private readonly opts: PoolOptions) {
    this.agents = new Array<AcpAgent | null>(opts.size).fill(null);
    this.failures = new Array<number>(opts.size).fill(0);
  }

  async start(): Promise<void> {
    const results = await Promise.allSettled(this.agents.map((_, i) => this.spawn(i)));
    if (!this.alive().length) {
      const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      throw failed?.reason ?? new Error("Không khởi động được tiến trình AI");
    }
  }

  private log(msg: string): void {
    (this.opts.onLog ?? console.warn)(msg);
  }

  /** `quiet`: thay thế chủ động (không tự hẹn khởi động lại nếu lỗi). */
  private async spawn(slot: number, quiet = false): Promise<void> {
    if (this.stopped) return;
    const agent = this.opts.factory(slot);
    let lost = false;
    const onLost = (reason?: Error, tail?: string[]) => {
      if (lost) return;
      lost = true;
      if (reason && !this.stopped && !this.retired.has(agent)) {
        this.log(`Tiến trình AI #${slot} đã dừng: ${reason.message}${tail?.length ? ` · stderr cuối: ${tail.slice(-8).join(" | ")}` : ""}`);
      }
      this.draining.delete(agent);
      this.opened.delete(agent);
      if (this.agents[slot] === agent) this.agents[slot] = null;
      for (const [k, c] of this.conversations) if (c.agent === agent) this.conversations.delete(k);
      if (this.stopped || quiet || this.retired.has(agent)) return;
      const delay = Math.min((this.opts.restartDelayMs ?? 1000) * 2 ** this.failures[slot]!, 60000);
      const t = setTimeout(() => {
        this.timers.delete(t);
        this.restartCount++;
        void this.spawn(slot).catch(() => {});
      }, delay);
      t.unref();
      this.timers.add(t);
    };
    agent.once("exit", onLost);
    agent.on("unhealthy", () => {
      if (this.stopped || this.retired.has(agent) || this.draining.has(agent)) return;
      this.unhealthyCount++;
      this.draining.add(agent);
      this.log(`Tiến trình AI #${slot} trả lời trống/lỗi 3 lần liền: cho nghỉ và thay mới`);
      // hội thoại rảnh trên tiến trình này sang tiến trình khác (lịch sử còn trong bản lưu của LlmService)
      for (const [k, c] of this.conversations) if (c.agent === agent && !c.busy) this.forget(k);
      this.recycleIdle();
    });
    try {
      await agent.start();
    } catch (e) {
      this.log(`Tiến trình AI #${slot} không khởi động được: ${e instanceof Error ? e.message : String(e)}${agent.lastStderr().length ? ` · stderr cuối: ${agent.lastStderr().slice(-8).join(" | ")}` : ""}`);
      onLost();
      if (!quiet) this.failures[slot] = Math.min((this.failures[slot] ?? 0) + 1, 20);
      throw e;
    }
    this.failures[slot] = 0;
    if (this.stopped) {
      await agent.stop();
      return;
    }
    if (!this.models().length) {
      try {
        await agent.closeSession(await agent.newSession());
      } catch {
        /* chỉ để lấy danh sách model */
      }
    }
    this.agents[slot] = agent;
  }

  alive(): AcpAgent[] {
    return this.agents.filter((a): a is AcpAgent => !!a && a.alive);
  }

  pick(): AcpAgent {
    const live = this.alive();
    if (!live.length) throw new GatewayError(503, "ai_unavailable", "Chưa có tiến trình AI nào sẵn sàng");
    const fresh = live.filter((a) => !this.draining.has(a));
    const pool = fresh.length ? fresh : live; // tiến trình sắp nghỉ chỉ dùng khi không còn cái nào khác
    const load = (a: AcpAgent) => a.activePrompts + (this.pending.get(a) ?? 0) + a.sessionCount / 1000;
    return pool.reduce((best, a) => (load(a) < load(best) ? a : best));
  }

  /** Thứ tự thử: model có trong kho hiện tại của agent trước (theo ưu tiên), rồi phần còn lại (kho có thể đã cũ). */
  private order(agent: AcpAgent, models: string[]): string[] {
    const have = new Set(agent.models.map((m) => m.id));
    if (!have.size) return models;
    return [...models.filter((m) => have.has(m)), ...models.filter((m) => !have.has(m))];
  }

  private async open(models: string[]): Promise<{ agent: AcpAgent; sessionId: string; model: string }> {
    const agent = this.pick();
    this.pending.set(agent, (this.pending.get(agent) ?? 0) + 1);
    try {
      let sessionId = "";
      let model = "";
      let lastErr: unknown;
      for (const m of this.order(agent, models)) {
        try {
          sessionId = await agent.newSession(m);
          model = m;
          break;
        } catch (e) {
          if (!(e instanceof RpcError) || e.code !== -32602) throw e; // chỉ "Unknown model ID" thì thử model kế
          lastErr = e;
        }
      }
      if (!sessionId) throw lastErr ?? new RpcError(-32602, `Không có model nào dùng được: ${models.join(", ")}`);
      const n = (this.opened.get(agent) ?? 0) + 1;
      this.opened.set(agent, n);
      if (n >= (this.opts.recycleAfterSessions ?? 150)) this.draining.add(agent);
      return { agent, sessionId, model };
    } finally {
      this.pending.set(agent, (this.pending.get(agent) ?? 1) - 1);
    }
  }

  private use(c: Conversation, fresh: boolean): Lease {
    c.busy++;
    c.lastUsed = Date.now();
    let done = false;
    return {
      agent: c.agent,
      sessionId: c.sessionId,
      model: c.model,
      fresh,
      release: () => {
        if (done) return;
        done = true;
        c.busy--;
        c.lastUsed = Date.now();
        this.recycleIdle();
      },
    };
  }

  /** Lấy phiên: có `key` thì dùng lại phiên của hội thoại; không thì mở phiên tạm, trả lại là đóng. */
  async lease(key: string | undefined, want: string | string[], sig?: string): Promise<Lease> {
    const models = Array.isArray(want) ? want : [want];
    sig ??= models.join(",");
    if (key) {
      const inflight = this.creating.get(key);
      if (inflight) await inflight.catch(() => {});
      const c = this.conversations.get(key);
      if (c && models.includes(c.model) && c.sig === sig && c.agent.alive) return this.use(c, false);
      if (c) this.forget(key);
      else this.evictOverflow();
      const p = this.open(models).then(({ agent, sessionId, model }) => {
        const entry: Conversation = { agent, sessionId, model, sig: sig!, lastUsed: Date.now(), busy: 0 };
        this.conversations.set(key, entry);
        return entry;
      });
      this.creating.set(key, p);
      try {
        return this.use(await p, true);
      } finally {
        if (this.creating.get(key) === p) this.creating.delete(key);
      }
    }
    const { agent, sessionId, model } = await this.open(models);
    return { agent, sessionId, model, fresh: true, release: () => void agent.closeSession(sessionId).finally(() => this.recycleIdle()) };
  }

  /** Quá `maxConversations`: bỏ hội thoại rảnh lâu nhất để chỗ cho hội thoại mới. */
  private evictOverflow(): void {
    const max = this.opts.maxConversations ?? 300;
    while (this.conversations.size >= max) {
      let oldest: [string, Conversation] | undefined;
      for (const e of this.conversations) if (!e[1].busy && (!oldest || e[1].lastUsed < oldest[1].lastUsed)) oldest = e;
      if (!oldest) return;
      this.forget(oldest[0]);
    }
  }

  private isIdle(a: AcpAgent): boolean {
    return a.alive && a.activePrompts === 0 && a.sessionCount === 0 && !(this.pending.get(a) ?? 0) && ![...this.conversations.values()].some((c) => c.agent === a);
  }

  /**
   * Thay tiến trình đã mở đủ phiên khi nó không còn hội thoại/lượt nào: mở cái mới vào chỗ cũ rồi dừng cái cũ.
   * Nếu trong lúc cái mới khởi động lại có lượt đến cái cũ, cái cũ ở lại (lingering) và dừng ở lần rảnh kế tiếp.
   */
  private recycleIdle(): void {
    if (this.stopped) return;
    for (const a of [...this.lingering]) {
      if (!a.alive) this.lingering.delete(a);
      else if (this.isIdle(a)) {
        this.lingering.delete(a);
        void a.stop();
      }
    }
    if (this.recycling) return;
    const old = this.agents.find((a): a is AcpAgent => !!a && this.draining.has(a) && this.isIdle(a));
    if (!old) return;
    const slot = this.agents.indexOf(old);
    this.recycling = true;
    void (async () => {
      try {
        await this.spawn(slot, true); // cái mới thế chỗ trong agents[slot]
        if (this.agents[slot] === old) return; // spawn không thay được (đang tắt)
        this.retired.add(old);
        this.draining.delete(old);
        this.opened.delete(old);
        if (this.isIdle(old)) {
          await old.stop();
          this.log(`Tiến trình AI #${slot} đã mở đủ phiên nên được thay mới.`);
        } else this.lingering.add(old); // có lượt đến trong lúc thay: để nó chạy nốt
      } catch (e) {
        this.log(`Không thay mới được tiến trình AI #${slot}: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        this.recycling = false;
        this.recycleIdle();
      }
    })();
  }

  /** Bỏ phiên của hội thoại (vd sau lỗi giữa chừng): lần sau mở phiên mới với toàn bộ lịch sử. */
  forget(key: string): void {
    const c = this.conversations.get(key);
    if (!c) return;
    this.conversations.delete(key);
    void c.agent.closeSession(c.sessionId).finally(() => this.recycleIdle());
  }

  sweep(now = Date.now()): void {
    for (const [k, c] of this.conversations) if (!c.busy && now - c.lastUsed > this.opts.idleSessionMs) this.forget(k);
    this.recycleIdle();
  }

  stats(): { size: number; alive: number; sessions: number; conversations: number; active: number; restarts: number; draining: number; unhealthyRecycles: number } {
    const live = this.alive();
    return {
      size: this.agents.length,
      alive: live.length,
      sessions: live.reduce((s, a) => s + a.sessionCount, 0),
      conversations: this.conversations.size,
      active: live.reduce((s, a) => s + a.activePrompts, 0),
      restarts: this.restartCount,
      unhealthyRecycles: this.unhealthyCount,
      draining: live.filter((a) => this.draining.has(a)).length,
    };
  }

  /** Hợp kho model của mọi tiến trình đang sống (mỗi tiến trình có thể đang ở một tài khoản proxy khác). */
  models(): ModelInfo[] {
    const seen = new Map<string, ModelInfo>();
    for (const a of this.alive()) for (const m of a.models) if (!seen.has(m.id)) seen.set(m.id, m);
    return [...seen.values()];
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    const live = [...this.alive(), ...this.lingering];
    this.lingering.clear();
    this.conversations.clear();
    this.agents.fill(null);
    await Promise.all(live.map((a) => a.stop()));
  }
}
