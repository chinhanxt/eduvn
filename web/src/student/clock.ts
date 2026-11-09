/** Đồng hồ theo máy chủ: độ lệch ước từ serverNow trong phản hồi, ưu tiên mẫu có độ trễ nhỏ. */
export class ServerClock {
  private offset = 0;
  private bestRtt = Number.POSITIVE_INFINITY;
  constructor(private readonly local: () => number = () => Date.now()) {}

  /** sentAt/receivedAt: giờ máy lúc gửi/nhận; serverNow: ISO của máy chủ. Mẫu trễ hơn mẫu tốt nhất quá 50 ms thì bỏ. */
  sample(serverNow: string, sentAt: number, receivedAt: number): void {
    const server = Date.parse(serverNow);
    if (Number.isNaN(server)) return;
    const rtt = Math.max(0, receivedAt - sentAt);
    if (rtt > this.bestRtt + 50) return;
    this.bestRtt = Math.min(this.bestRtt, rtt);
    this.offset = server - (sentAt + rtt / 2);
  }

  now(): number {
    return this.local() + this.offset;
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
