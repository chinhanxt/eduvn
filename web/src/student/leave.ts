export type LeaveKind = "leave" | "return";

/** Gộp blur + visibilitychange thành MỘT lần rời bài / quay lại. */
export class LeaveTracker {
  private away = false;
  constructor(private readonly onEvent: (k: LeaveKind) => void) {}
  update(visible: boolean, focused: boolean): void {
    const away = !visible || !focused;
    if (away === this.away) return;
    this.away = away;
    this.onEvent(away ? "leave" : "return");
  }
}

export function watchLeave(t: LeaveTracker, doc: Document = document, win: Window = window): () => void {
  const check = () => t.update(doc.visibilityState === "visible", doc.hasFocus());
  doc.addEventListener("visibilitychange", check);
  win.addEventListener("blur", check);
  win.addEventListener("focus", check);
  return () => {
    doc.removeEventListener("visibilitychange", check);
    win.removeEventListener("blur", check);
    win.removeEventListener("focus", check);
  };
}

/** Hộp thư sự kiện: gửi theo lô, gửi hỏng thì giữ lại lần sau. */
export class EventOutbox {
  private q: LeaveKind[] = [];
  private busy = false;
  push(k: LeaveKind): void {
    this.q.push(k);
  }
  get size(): number {
    return this.q.length;
  }
  async flush(send: (events: { kind: LeaveKind }[]) => Promise<boolean>): Promise<void> {
    if (this.busy || !this.q.length) return;
    this.busy = true;
    const batch = this.q.splice(0, 50);
    try {
      if (!(await send(batch.map((kind) => ({ kind }))))) this.q.unshift(...batch);
    } catch {
      this.q.unshift(...batch);
    } finally {
      this.busy = false;
    }
  }
}
