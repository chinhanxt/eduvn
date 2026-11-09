import type { LeaveEvent } from "./leave";
import type { AnswerValue, Answers } from "./types";

/** Bản nháp trên máy (IndexedDB): seq tăng mỗi lần đổi đáp án; syncedSeq = bản máy chủ đã nhận. events = hàng đợi sự kiện rời tab chưa gửi. */
export type Draft = { submissionId: string; seq: number; syncedSeq: number; answers: Answers; flags: number[]; updatedAt: number; events?: LeaveEvent[] };
export interface DraftStore {
  get(submissionId: string): Promise<Draft | undefined>;
  put(d: Draft): Promise<void>;
  purge?(submissionId: string): Promise<void>;
  purgeAll?(): Promise<void>;
}
export type SendResult = { kind: "ok"; seq: number } | { kind: "closed"; status: string } | { kind: "retry"; afterMs: number } | { kind: "offline" } | { kind: "unauthorized" };
export type Sender = (seq: number, answers: Answers, opts: { keepalive: boolean }) => Promise<SendResult>;
export type SyncStatus = "saved" | "saving" | "offline" | "closed";
/** readonly: tab khác đang giữ bài ("Bài đang mở ở tab khác"); degraded: "Không lưu được trên máy – vẫn gửi lên máy chủ"; unauthorized: phiên hết hạn. */
export type SyncEvent = "readonly" | "degraded" | "unauthorized";
export type SyncOpts = {
  onEvent?: (e: SyncEvent) => void;
  /** Bầu tab ghi (writerLock.acquireWriter). Không truyền = luôn là tab ghi. */
  acquire?: (submissionId: string, onLost: () => void) => Promise<{ held: boolean; release(): void }>;
};

/** Hàng đợi tự lưu: ghi máy ngay mỗi thay đổi, gửi bản MỚI NHẤT khi flush (mỗi 3 giây / khi rời trang). */
export class AnswerSync {
  status: SyncStatus = "saved";
  readonly = false;
  degraded = false;
  private inflight = 0;
  private retryAt = 0;
  private release: () => void = () => {};

  private constructor(
    private draft: Draft,
    private store: DraftStore,
    private readonly send: Sender,
    private readonly onChange: (s: SyncStatus, d: Draft) => void,
    private readonly clock: () => number,
    private readonly onEvent: (e: SyncEvent) => void,
  ) {}

  /** Lấy bản mới hơn giữa máy và máy chủ (máy mới hơn khi mất mạng rồi tải lại trang). */
  static async open(
    store: DraftStore,
    submissionId: string,
    server: { seq: number; answers: Answers },
    send: Sender,
    onChange: (s: SyncStatus, d: Draft) => void = () => {},
    clock: () => number = () => Date.now(),
    opts: SyncOpts = {},
  ): Promise<AnswerSync> {
    let degraded = false;
    let local: Draft | undefined;
    try {
      local = await store.get(submissionId);
    } catch {
      degraded = true;
      store = memoryStore();
    }
    const draft: Draft =
      local && local.seq > server.seq
        ? { ...local, syncedSeq: Math.max(local.syncedSeq, server.seq) }
        : { submissionId, seq: server.seq, syncedSeq: server.seq, answers: server.answers, flags: local?.flags ?? [], updatedAt: clock(), ...(local?.events ? { events: local.events } : {}) };
    const s = new AnswerSync(draft, store, send, onChange, clock, opts.onEvent ?? (() => {}));
    if (opts.acquire) {
      const w = await opts.acquire(submissionId, () => s.setReadonly());
      s.release = () => w.release();
      if (!w.held) s.readonly = true;
    }
    if (degraded) {
      s.degraded = true;
      s.onEvent("degraded");
    }
    if (s.readonly) s.onEvent("readonly");
    else await s.safePut();
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
  get events(): LeaveEvent[] {
    return this.draft.events ?? [];
  }

  /** Tab khác giữ bài: ngừng ghi/gửi, UI hiện "Bài đang mở ở tab khác". */
  setReadonly(): void {
    if (this.readonly) return;
    this.readonly = true;
    this.onEvent("readonly");
  }

  async set(no: number, value: AnswerValue): Promise<void> {
    if (this.status === "closed" || this.readonly) return;
    const base = await this.persistedSeq();
    this.draft = { ...this.draft, seq: base + 1, answers: { ...this.draft.answers, [String(no)]: value }, updatedAt: this.clock() };
    await this.safePut();
    this.emit(this.status === "offline" ? "offline" : "saving");
  }

  async toggleFlag(no: number): Promise<void> {
    if (this.readonly) return;
    const flags = this.draft.flags.includes(no) ? this.draft.flags.filter((x) => x !== no) : [...this.draft.flags, no];
    this.draft = { ...this.draft, flags };
    await this.safePut();
    this.emit(this.status);
  }

  /** Ghi hàng đợi sự kiện rời tab vào bản nháp (không đổi seq). */
  async saveEvents(events: LeaveEvent[]): Promise<void> {
    if (this.readonly) return;
    this.draft = { ...this.draft, events: [...events] };
    await this.safePut();
  }

  /** keepalive (pagehide / ẩn tab) bỏ qua giờ chờ gửi lại và lần gửi đang chạy: máy chủ lọc trùng theo seq. */
  async flush(keepalive = false): Promise<void> {
    if (this.readonly || this.status === "closed" || !this.dirty) return;
    if (!keepalive && (this.inflight > 0 || this.clock() < this.retryAt)) return;
    this.inflight++;
    const seq = this.draft.seq;
    try {
      const r = await this.send(seq, this.draft.answers, { keepalive });
      if (r.kind === "ok") {
        this.draft = { ...this.draft, syncedSeq: Math.max(this.draft.syncedSeq, seq) };
        await this.safePut();
        this.emit(this.dirty ? "saving" : "saved");
      } else if (r.kind === "closed") this.emit("closed");
      else if (r.kind === "retry") {
        this.retryAt = this.clock() + r.afterMs;
        this.emit("saving");
      } else if (r.kind === "unauthorized") {
        this.onEvent("unauthorized");
        this.emit("offline");
      } else this.emit("offline");
    } catch {
      this.emit("offline");
    } finally {
      this.inflight--;
    }
  }

  /** Bản để nộp: seq mới, luôn lớn hơn mọi bản đã gửi hoặc đã ghi máy (kể cả từ tab khác). */
  async forSubmit(): Promise<{ seq: number; answers: Answers }> {
    const base = await this.persistedSeq();
    this.draft = { ...this.draft, seq: base + 1 };
    await this.safePut();
    return { seq: this.draft.seq, answers: this.draft.answers };
  }

  markClosed(): void {
    this.emit("closed");
  }

  /** Xoá bản nháp trên máy sau khi nộp thành công. */
  async purge(): Promise<void> {
    try {
      await this.store.purge?.(this.draft.submissionId);
    } catch {
      /* bỏ qua */
    }
  }

  dispose(): void {
    this.release();
  }

  private async persistedSeq(): Promise<number> {
    try {
      return Math.max(this.draft.seq, (await this.store.get(this.draft.submissionId))?.seq ?? 0);
    } catch {
      return this.draft.seq;
    }
  }

  /** Ghi máy; hỏng thì chuyển sang bộ nhớ, giữ bản nháp, báo degraded và vẫn đẩy lên máy chủ. */
  private async safePut(): Promise<void> {
    try {
      await this.store.put(this.draft);
    } catch {
      if (!this.degraded) {
        this.degraded = true;
        this.store = memoryStore();
        this.onEvent("degraded");
      }
      try {
        await this.store.put(this.draft);
      } catch {
        /* bộ nhớ luôn ghi được */
      }
      queueMicrotask(() => void this.flush());
    }
  }

  private emit(s: SyncStatus): void {
    this.status = s;
    this.onChange(s, this.draft);
  }
}

/** Gửi ngay khi trang sắp đóng / tab bị ẩn. Trả về hàm huỷ. */
export function watchFlushOnHide(flush: (keepalive: boolean) => void, doc: Document = document, win: Window = window): () => void {
  const onHide = () => flush(true);
  const onVis = () => {
    if (doc.visibilityState === "hidden") flush(true);
  };
  win.addEventListener("pagehide", onHide);
  doc.addEventListener("visibilitychange", onVis);
  return () => {
    win.removeEventListener("pagehide", onHide);
    doc.removeEventListener("visibilitychange", onVis);
  };
}

export function memoryStore(): DraftStore {
  const m = new Map<string, Draft>();
  return {
    get: async (id) => m.get(id),
    put: async (d) => void m.set(d.submissionId, d),
    purge: async (id) => void m.delete(id),
    purgeAll: async () => m.clear(),
  };
}
