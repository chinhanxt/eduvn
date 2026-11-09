import type { AnswerValue, Answers } from "./types";

/** Bản nháp trên máy (IndexedDB): seq tăng mỗi lần đổi đáp án; syncedSeq = bản máy chủ đã nhận. */
export type Draft = { submissionId: string; seq: number; syncedSeq: number; answers: Answers; flags: number[]; updatedAt: number };
export interface DraftStore {
  get(submissionId: string): Promise<Draft | undefined>;
  put(d: Draft): Promise<void>;
}
export type SendResult = { kind: "ok"; seq: number } | { kind: "closed"; status: string } | { kind: "retry"; afterMs: number } | { kind: "offline" };
export type Sender = (seq: number, answers: Answers, opts: { keepalive: boolean }) => Promise<SendResult>;
export type SyncStatus = "saved" | "saving" | "offline" | "closed";

/** Hàng đợi tự lưu: ghi máy ngay mỗi thay đổi, gửi bản MỚI NHẤT khi flush (mỗi 3 giây / khi rời trang). */
export class AnswerSync {
  status: SyncStatus = "saved";
  private inflight = false;
  private retryAt = 0;

  private constructor(
    private draft: Draft,
    private readonly store: DraftStore,
    private readonly send: Sender,
    private readonly onChange: (s: SyncStatus, d: Draft) => void,
    private readonly clock: () => number,
  ) {}

  /** Lấy bản mới hơn giữa máy và máy chủ (máy mới hơn khi mất mạng rồi tải lại trang). */
  static async open(store: DraftStore, submissionId: string, server: { seq: number; answers: Answers }, send: Sender, onChange: (s: SyncStatus, d: Draft) => void = () => {}, clock: () => number = () => Date.now()): Promise<AnswerSync> {
    const local = await store.get(submissionId);
    const draft: Draft =
      local && local.seq > server.seq
        ? { ...local, syncedSeq: Math.max(local.syncedSeq, server.seq) }
        : { submissionId, seq: server.seq, syncedSeq: server.seq, answers: server.answers, flags: local?.flags ?? [], updatedAt: clock() };
    await store.put(draft);
    const s = new AnswerSync(draft, store, send, onChange, clock);
    s.status = s.dirty ? "saving" : "saved";
    return s;
  }

  get answers(): Answers {
    return this.draft.answers;
  }
  get flags(): number[] {
    return this.draft.flags;
  }
  get seq(): number {
    return this.draft.seq;
  }
  get dirty(): boolean {
    return this.draft.seq > this.draft.syncedSeq;
  }

  async set(no: number, value: AnswerValue): Promise<void> {
    if (this.status === "closed") return;
    this.draft = { ...this.draft, seq: this.draft.seq + 1, answers: { ...this.draft.answers, [String(no)]: value }, updatedAt: this.clock() };
    await this.store.put(this.draft);
    this.emit(this.status === "offline" ? "offline" : "saving");
  }

  async toggleFlag(no: number): Promise<void> {
    const flags = this.draft.flags.includes(no) ? this.draft.flags.filter((x) => x !== no) : [...this.draft.flags, no];
    this.draft = { ...this.draft, flags };
    await this.store.put(this.draft);
    this.emit(this.status);
  }

  async flush(keepalive = false): Promise<void> {
    if (this.inflight || this.status === "closed" || !this.dirty || this.clock() < this.retryAt) return;
    this.inflight = true;
    const seq = this.draft.seq;
    try {
      const r = await this.send(seq, this.draft.answers, { keepalive });
      if (r.kind === "ok") {
        this.draft = { ...this.draft, syncedSeq: Math.max(this.draft.syncedSeq, seq) };
        await this.store.put(this.draft);
        this.emit(this.dirty ? "saving" : "saved");
      } else if (r.kind === "closed") this.emit("closed");
      else if (r.kind === "retry") {
        this.retryAt = this.clock() + r.afterMs;
        this.emit("saving");
      } else this.emit("offline");
    } catch {
      this.emit("offline");
    } finally {
      this.inflight = false;
    }
  }

  /** Bản để nộp: seq mới, luôn lớn hơn mọi bản đã gửi. */
  async forSubmit(): Promise<{ seq: number; answers: Answers }> {
    this.draft = { ...this.draft, seq: this.draft.seq + 1 };
    await this.store.put(this.draft);
    return { seq: this.draft.seq, answers: this.draft.answers };
  }

  markClosed(): void {
    this.emit("closed");
  }

  private emit(s: SyncStatus): void {
    this.status = s;
    this.onChange(s, this.draft);
  }
}

export function memoryStore(): DraftStore {
  const m = new Map<string, Draft>();
  return { get: async (id) => m.get(id), put: async (d) => void m.set(d.submissionId, d) };
}
