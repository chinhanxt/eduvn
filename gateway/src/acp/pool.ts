import { GatewayError } from "../types";
import type { AcpAgent, ModelInfo } from "./agent";

export type PoolOptions = {
  size: number;
  factory: (slot: number) => AcpAgent;
  idleSessionMs: number;
  restartDelayMs?: number;
};
export type Lease = { agent: AcpAgent; sessionId: string; fresh: boolean; release: () => void };
type Conversation = { agent: AcpAgent; sessionId: string; model: string; lastUsed: number };

/** Vài tiến trình `agy acp` chạy sẵn + phiên bám theo hội thoại. */
export class AgentPool {
  private readonly agents: (AcpAgent | null)[];
  private readonly conversations = new Map<string, Conversation>();
  private stopped = false;

  constructor(private readonly opts: PoolOptions) {
    this.agents = new Array<AcpAgent | null>(opts.size).fill(null);
  }

  async start(): Promise<void> {
    const results = await Promise.allSettled(this.agents.map((_, i) => this.spawn(i)));
    if (!this.alive().length) {
      const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
      throw failed?.reason ?? new Error("Không khởi động được tiến trình AI");
    }
  }

  private async spawn(slot: number): Promise<void> {
    const agent = this.opts.factory(slot);
    let lost = false;
    const onLost = () => {
      if (lost) return;
      lost = true;
      if (this.agents[slot] === agent) this.agents[slot] = null;
      for (const [k, c] of this.conversations) if (c.agent === agent) this.conversations.delete(k);
      if (!this.stopped) setTimeout(() => void this.spawn(slot).catch(() => {}), this.opts.restartDelayMs ?? 1000).unref();
    };
    agent.once("exit", onLost);
    try {
      await agent.start();
    } catch (e) {
      onLost();
      throw e;
    }
    if (this.stopped) {
      await agent.stop();
      return;
    }
    this.agents[slot] = agent;
  }

  alive(): AcpAgent[] {
    return this.agents.filter((a): a is AcpAgent => !!a && a.alive);
  }

  pick(): AcpAgent {
    const live = this.alive();
    if (!live.length) throw new GatewayError(503, "ai_unavailable", "Chưa có tiến trình AI nào sẵn sàng");
    const load = (a: AcpAgent) => a.activePrompts + a.sessionCount / 1000;
    return live.reduce((best, a) => (load(a) < load(best) ? a : best));
  }

  /** Lấy phiên: có `key` thì dùng lại phiên của hội thoại; không thì mở phiên tạm, trả lại là đóng. */
  async lease(key: string | undefined, model: string): Promise<Lease> {
    if (key) {
      const c = this.conversations.get(key);
      if (c && c.model === model && c.agent.alive) {
        c.lastUsed = Date.now();
        return { agent: c.agent, sessionId: c.sessionId, fresh: false, release: () => void (c.lastUsed = Date.now()) };
      }
      if (c) this.forget(key);
      const agent = this.pick();
      const sessionId = await agent.newSession(model);
      const entry: Conversation = { agent, sessionId, model, lastUsed: Date.now() };
      this.conversations.set(key, entry);
      return { agent, sessionId, fresh: true, release: () => void (entry.lastUsed = Date.now()) };
    }
    const agent = this.pick();
    const sessionId = await agent.newSession(model);
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
    for (const [k, c] of this.conversations) if (now - c.lastUsed > this.opts.idleSessionMs) this.forget(k);
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
    const live = this.alive();
    this.conversations.clear();
    this.agents.fill(null);
    await Promise.all(live.map((a) => a.stop()));
  }
}
