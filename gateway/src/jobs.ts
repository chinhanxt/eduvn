import { randomUUID } from "node:crypto";
import type { LlmService } from "./llm";
import type { ChatMessage } from "./types";

export type BatchItem = { id?: string; messages: ChatMessage[]; json?: boolean };
export type ItemResult = { id: string; ok: true; text: string; json?: unknown; ms: number } | { id: string; ok: false; error: string };
export type Job = {
  id: string;
  status: "running" | "done";
  total: number;
  done: number;
  failed: number;
  createdAt: number;
  finishedAt?: number;
  results: (ItemResult | null)[];
};

/** Việc theo lô (vd sinh nội dung từng slide, chấm từng bài): chạy song song có giới hạn, giữ trong bộ nhớ 1 giờ. */
export class JobStore {
  private readonly jobs = new Map<string, Job>();
  private readonly finished = new Map<string, Promise<void>>();

  constructor(private readonly ttlMs = 3600_000) {}

  get(id: string): Job | null {
    return this.jobs.get(id) ?? null;
  }

  wait(id: string): Promise<void> {
    return this.finished.get(id) ?? Promise.resolve();
  }

  /** Số việc đang chạy. */
  running(): number {
    let n = 0;
    for (const j of this.jobs.values()) if (j.status === "running") n++;
    return n;
  }

  startBatch(llm: LlmService, req: { model: string; items: BatchItem[]; concurrency: number }): Job {
    this.sweep();
    const job: Job = { id: randomUUID(), status: "running", total: req.items.length, done: 0, failed: 0, createdAt: Date.now(), results: req.items.map(() => null) };
    this.jobs.set(job.id, job);
    let next = 0;
    const worker = async () => {
      while (next < req.items.length) {
        const i = next++;
        const item = req.items[i]!;
        const id = item.id ?? String(i);
        try {
          const r = await llm.complete({ model: req.model, messages: item.messages, json: item.json });
          job.results[i] = { id, ok: true, text: r.text, json: r.json, ms: r.ms };
        } catch (e) {
          job.failed++;
          job.results[i] = { id, ok: false, error: (e as Error).message };
        }
        job.done++;
      }
    };
    const all: Promise<void> = Promise.all(Array.from({ length: Math.max(1, Math.min(req.concurrency, req.items.length)) }, worker)).then(() => {}).finally(() => {
      job.status = "done";
      job.finishedAt = Date.now();
    }).catch(() => {});
    this.finished.set(job.id, all);
    return job;
  }

  sweep(now = Date.now()): void {
    for (const [id, j] of this.jobs) {
      if (j.finishedAt && now - j.finishedAt > this.ttlMs) {
        this.jobs.delete(id);
        this.finished.delete(id);
      }
    }
  }
}
