import { GatewayError } from "../types";
import type { AcpAgent, ModelInfo } from "./agent";

export type PoolOptions = {
  size: number;
  factory: (slot: number) => AcpAgent;
  idleSessionMs: number;
  restartDelayMs?: number;
  onLog?: (msg: string) => void;
};
export type Lease = { agent: AcpAgent; sessionId: string; fresh: boolean; release: () => void };
type Conversation = { agent: AcpAgent; sessionId: string; model: string; lastUsed: number; busy: number };

/** Vài tiến trình `agy acp` chạy sẵn + phiên bám theo hội thoại. */
export class AgentPool {
  private readonly agents: (AcpAgent | null)[];
  private readonly conversations = new Map<string, Conversation>();
  private stopped = false;
  private readonly failures: number[];
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly creating = new Map<string, Promise<Conversation>>();
  private readonly pending = new Map<AcpAgent, number>();

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

  private async spawn(slot: number): Promise<void> {
    if (this.stopped) return;
    const agent = this.opts.factory(slot);
    let lost = false;
    const onLost = () => {
      if (lost) return;
      lost = true;
      if (this.agents[slot] === agent) this.agents[slot] = null;
      for (const [k, c] of this.conversations) if (c.agent === agent) this.conversations.delete(k);
      if (this.stopped) return;
      const delay = Math.min((this.opts.restartDelayMs ?? 1000) * 2 ** this.failures[slot]!, 60000);
      const t = setTimeout(() => {
        this.timers.delete(t);
        void this.spawn(slot).catch(() => {});
      }, delay);
      t.unref();
      this.timers.add(t);
    };
    agent.once("exit", onLost);
    try {
      await agent.start();
    } catch (e) {
      (this.opts.onLog ?? console.warn)(`Tiến trình AI #${slot} không khởi động được: ${e instanceof Error ? e.message : String(e)}`);
      onLost();
      this.failures[slot] = Math.min((this.failures[slot] ?? 0) + 1, 20);
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
    const load = (a: AcpAgent) => a.activePrompts + (this.pending.get(a) ?? 0) + a.sessionCount / 1000;
    return live.reduce((best, a) => (load(a) < load(best) ? a : best));
  }

  private async open(model: string): Promise<{ agent: AcpAgent; sessionId: string }> {
    const agent = this.pick();
    this.pending.set(agent, (this.pending.get(agent) ?? 0) + 1);
    try {
      return { agent, sessionId: await agent.newSession(model) };
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
      fresh,
      release: () => {
        if (done) return;
        done = true;
        c.busy--;
        c.lastUsed = Date.now();
      },
    };
  }

  /** Lấy phiên: có `key` thì dùng lại phiên của hội thoại; không thì mở phiên tạm, trả lại là đóng. */
  async lease(key: string | undefined, model: string): Promise<Lease> {
    if (key) {
      const inflight = this.creating.get(key);
      if (inflight) await inflight.catch(() => {});
      const c = this.conversations.get(key);
      if (c && c.model === model && c.agent.alive) return this.use(c, false);
      if (c) this.forget(key);
      const p = this.open(model).then(({ agent, sessionId }) => {
        const entry: Conversation = { agent, sessionId, model, lastUsed: Date.now(), busy: 0 };
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
    const { agent, sessionId } = await this.open(model);
    return { agent, sessionId, fresh: true, release: () => void agent.closeSession(sessionId) };
  }

  /** Bỏ phiên của hội thoại (vd sau lỗi giữa chừng): lần sau mở phiên mới với toàn bộ lịch sử. */
  forget(key: string): void {
    const c = this.conversations.get(key);
    if (!c) return;
    this.conversations.delete(key);
    void c.agent.closeSession(c.sessionId);
  }

  sweep(now = Date.now()): void {
    for (const [k, c] of this.conversations) if (!c.busy && now - c.lastUsed > this.opts.idleSessionMs) this.forget(k);
  }

  stats(): { size: number; alive: number; sessions: number; conversations: number; active: number } {
    const live = this.alive();
    return {
      size: this.agents.length,
      alive: live.length,
      sessions: live.reduce((s, a) => s + a.sessionCount, 0),
      conversations: this.conversations.size,
      active: live.reduce((s, a) => s + a.activePrompts, 0),
    };
  }

  models(): ModelInfo[] {
    return this.alive().find((a) => a.models.length)?.models ?? [];
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    const live = this.alive();
    this.conversations.clear();
    this.agents.fill(null);
    await Promise.all(live.map((a) => a.stop()));
  }
}
