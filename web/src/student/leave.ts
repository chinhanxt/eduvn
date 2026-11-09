export type LeaveKind = "leave" | "return";
export type LeaveEvent = { kind: LeaveKind; at?: number };

export type LeaveOpts = {
  /** Chờ bao lâu sau blur (còn hiện) mới tính là rời. */
  blurDelayMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
  /** Kiểm lại khi hết hạn chờ: true = tài liệu (hoặc iframe/bàn phím công thức trong nó) đang có focus. */
  hasFocus?: () => boolean;
  /** Giờ máy chủ (ServerClock.now) gắn vào mỗi sự kiện. */
  now?: () => number;
};

/** Gộp blur + visibilitychange thành MỘT lần rời bài / quay lại. Ẩn tab = rời ngay; chỉ blur = rời sau 400 ms nếu focus không về. */
export class LeaveTracker {
  private away = false;
  private timer: unknown = null;
  private blurAt = 0;
  constructor(
    private readonly onEvent: (k: LeaveKind, at?: number) => void,
    private readonly o: LeaveOpts = {},
  ) {}

  update(visible: boolean, focused: boolean): void {
    if (!visible) {
      this.cancel();
      this.set(true, this.o.now?.());
      return;
    }
    if (focused) {
      this.cancel();
      this.set(false, this.o.now?.());
      return;
    }
    if (this.away || this.timer !== null) return;
    this.blurAt = this.o.now?.() as number;
    this.timer = (this.o.setTimer ?? setTimeout)(() => {
      this.timer = null;
      if (this.o.hasFocus?.()) return;
      this.set(true, this.blurAt);
    }, this.o.blurDelayMs ?? 400);
  }

  private cancel(): void {
    if (this.timer === null) return;
    (this.o.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
    this.timer = null;
  }

  private set(away: boolean, at?: number): void {
    if (away === this.away) return;
    this.away = away;
    if (at === undefined) this.onEvent(away ? "leave" : "return");
    else this.onEvent(away ? "leave" : "return", at);
  }
}

export function watchLeave(t: LeaveTracker, doc: Document = document, win: Window = window): () => void {
  // Focus đang ở phần tử trong tài liệu (iframe của bàn phím công thức...) thì không coi là rời.
  const focused = () => doc.hasFocus() || doc.activeElement?.tagName === "IFRAME";
  const check = () => t.update(doc.visibilityState === "visible", focused());
  doc.addEventListener("visibilitychange", check);
  win.addEventListener("blur", check);
  win.addEventListener("focus", check);
  return () => {
    doc.removeEventListener("visibilitychange", check);
    win.removeEventListener("blur", check);
    win.removeEventListener("focus", check);
  };
}

/** Hộp thư sự kiện: gửi theo lô, gửi hỏng thì giữ lại; `persist` ghi hàng đợi vào kho máy để không mất khi treo/tắt trình duyệt. */
export class EventOutbox {
  private q: LeaveEvent[];
  private busy = false;
  constructor(
    private readonly persist?: (events: LeaveEvent[]) => Promise<void> | void,
    initial: LeaveEvent[] = [],
  ) {
    this.q = [...initial];
  }
  push(k: LeaveKind, at?: number): void {
    this.q.push(at === undefined ? { kind: k } : { kind: k, at });
    this.save();
  }
  get size(): number {
    return this.q.length;
  }
  async flush(send: (events: LeaveEvent[]) => Promise<boolean>): Promise<void> {
    if (this.busy || !this.q.length) return;
    this.busy = true;
    const batch = this.q.splice(0, 50);
    try {
      if (!(await send(batch.map((e) => ({ ...e }))))) this.q.unshift(...batch);
    } catch {
      this.q.unshift(...batch);
    } finally {
      this.busy = false;
      this.save();
    }
  }
  private save(): void {
    try {
      void Promise.resolve(this.persist?.([...this.q])).catch(() => {});
    } catch {
      /* kho máy hỏng: vẫn giữ trong bộ nhớ */
    }
  }
}
