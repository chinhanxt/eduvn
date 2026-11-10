/**
 * Đồng hồ theo máy chủ, neo vào bộ đếm đơn điệu (performance.now) nên đổi giờ hệ thống không làm nhảy now()/remainingMs.
 * sentAt/receivedAt và nguồn `mono` cùng đơn vị (ms của performance.now()). now() trả về ms epoch theo máy chủ.
 */
const RESYNC_AFTER_MS = 60_000;
const JUMP_MS = 2_000;
export class ServerClock {
  private offset = 0; // serverEpoch - mono
  private bestRtt = Number.POSITIVE_INFINITY;
  private bestAt = Number.NEGATIVE_INFINITY;
  private outlier: number | null = null;
  constructor(private readonly mono: () => number = () => performance.now()) {}

  /** Mẫu nhận khi: trễ ≤ tốt nhất + 50 ms; hoặc mẫu tốt nhất đã cũ quá 60 s; hoặc lệch > 2 s được hai mẫu liên tiếp xác nhận. */
  sample(serverNow: string, sentAt: number, receivedAt: number): void {
    const server = Date.parse(serverNow);
    if (Number.isNaN(server)) return;
    const rtt = Math.max(0, receivedAt - sentAt);
    const offset = server - (sentAt + rtt / 2);
    const t = this.mono();
    const fresh = rtt <= this.bestRtt + 50;
    const aged = t - this.bestAt > RESYNC_AFTER_MS;
    let jump = false;
    if (!fresh && !aged && Math.abs(offset - this.offset) > JUMP_MS) {
      jump = this.outlier !== null && Math.abs(offset - this.outlier) <= 500;
      this.outlier = offset;
    } else this.outlier = null;
    if (!fresh && !aged && !jump) return;
    this.outlier = null;
    this.bestRtt = fresh && !aged ? Math.min(this.bestRtt, rtt) : rtt;
    this.bestAt = t;
    this.offset = offset;
  }

  now(): number {
    return this.mono() + this.offset;
  }

  remainingMs(deadlineIso: string): number {
    return Math.max(0, Date.parse(deadlineIso) - this.now());
  }
}

const p2 = (n: number) => String(n).padStart(2, "0");
/** 754000 → "12:34"; 3 723 000 → "1:02:03". */
export function formatClock(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${p2(m)}:${p2(s % 60)}` : `${p2(m)}:${p2(s % 60)}`;
}
export const timerTone = (ms: number): "" | "warn" | "crit" => (ms <= 60_000 ? "crit" : ms <= 300_000 ? "warn" : "");

/** Hạn nộp ở danh sách bài (như mockup lop-hoc.html). */
export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s <= 0) return "Đã hết hạn";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `Còn ${d} ngày ${h} giờ`;
  if (h) return `Còn ${h} giờ ${m} phút`;
  return `Còn ${m} phút ${p2(s % 60)} giây`;
}
