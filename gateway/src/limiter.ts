import { clientClosed } from "./types";

/**
 * Giới hạn số lời gọi AI chạy cùng lúc.
 * - Ưu tiên 0 (chat) luôn được phục vụ trước ưu tiên 1 (theo lô).
 * - `reserved` chỗ chỉ dành cho chat, để việc theo lô dài không làm học sinh phải chờ.
 */
export class PriorityLimiter {
  private running = 0;
  private readonly waiting: [Array<() => void>, Array<() => void>] = [[], []];

  constructor(
    private readonly max: number,
    private readonly reserved = 1,
  ) {}

  get active(): number {
    return this.running;
  }
  get queued(): number {
    return this.waiting[0].length + this.waiting[1].length;
  }

  private cap(priority: 0 | 1): number {
    return priority === 0 ? this.max : Math.max(1, this.max - this.reserved);
  }

  async run<T>(priority: 0 | 1, fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw clientClosed();
    const ahead = priority === 0 ? this.waiting[0].length : this.waiting[0].length + this.waiting[1].length;
    if (ahead === 0 && this.running < this.cap(priority)) this.running++;
    else {
      await new Promise<void>((resolve, reject) => {
        const q = this.waiting[priority];
        const onAbort = () => {
          const i = q.indexOf(go);
          if (i >= 0) q.splice(i, 1);
          reject(clientClosed());
        };
        const go = () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        };
        q.push(go);
        signal?.addEventListener("abort", onAbort, { once: true });
      });
    }
    try {
      return await fn();
    } finally {
      this.running--;
      this.dispatch();
    }
  }

  private dispatch(): void {
    for (const p of [0, 1] as const) {
      while (this.waiting[p].length && this.running < this.cap(p)) {
        this.running++;
        this.waiting[p].shift()!();
      }
    }
  }
}
