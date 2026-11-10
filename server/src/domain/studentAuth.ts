/** Danh tính HS (thẻ lớp): mã lớp, PIN, số thứ tự, chống dò PIN. Thuần, không I/O. */
/** Bảng chữ không nhầm lẫn: bỏ I, L, O, 0, 1. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function makeCode(randInt: (n: number) => number): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randInt(CODE_ALPHABET.length)];
  return s;
}
export const normalizeCode = (s: string): string => s.normalize("NFC").toUpperCase().replace(/[\s-]/g, "");
export const isCode = (s: string): boolean => s.length === CODE_LENGTH && [...s].every((c) => CODE_ALPHABET.includes(c));

export function makePin(randInt: (n: number) => number): string {
  return Array.from({ length: 6 }, () => String(randInt(10))).join("");
}
export const isPin = (s: string): boolean => /^\d{6}$/.test(s);

/** Cấp số thứ tự cho HS chưa có: tiếp sau số lớn nhất, theo thứ tự danh sách lớp truyền vào. */
export function assignSeats(roster: readonly { id: string; seat: number | null }[]): Map<string, number> {
  let next = roster.reduce((m, r) => Math.max(m, r.seat ?? 0), 0);
  const out = new Map<string, number>();
  for (const r of roster) if (r.seat === null) out.set(r.id, ++next);
  return out;
}

export type GuardOptions = {
  maxFails: number;
  maxIpFails: number;
  windowMs: number;
  lockMs: number;
  /** Tổng số lần thử PIN của cả lớp trong classWindowMs; vượt thì khoá đăng nhập PIN của lớp (thẻ QR không ảnh hưởng). */
  maxClassFails: number;
  classWindowMs: number;
  /** Trần số khoá theo dõi (đếm + khoá) để bộ nhớ không phình khi bị quét. */
  maxKeys: number;
};
/** Theo (lớp, số thứ tự): 5 lần sai / 10 phút. Theo IP: 30 lần (cả lớp thường chung một IP qua NAT của trường). Cả lớp: 200 lần / 60 phút. */
export const DEFAULT_GUARD: GuardOptions = { maxFails: 5, maxIpFails: 30, windowMs: 600_000, lockMs: 600_000, maxClassFails: 200, classWindowMs: 3_600_000, maxKeys: 100_000 };

export type AttemptToken = { readonly keys: readonly string[]; readonly at: number };
export type AttemptResult = { ok: true; token: AttemptToken } | { ok: false; retryAfterMs: number };

type Entry = { hits: number[]; until: number; windowMs: number };

/**
 * Chống dò PIN trong bộ nhớ tiến trình. `attempt` kiểm khoá VÀ ghi sẵn một lần sai trong cùng một lệnh đồng bộ,
 * nên hàng loạt yêu cầu song song (băm PIN là bất đồng bộ) không lách được ngưỡng. Đúng PIN thì `success` rút lần ghi đó lại.
 */
export class PinGuard {
  /** Thứ tự chèn = cũ nhất trước; chạm vào khoá thì xoá rồi chèn lại. */
  private entries = new Map<string, Entry>();
  constructor(private readonly o: GuardOptions = DEFAULT_GUARD) {}

  /** Một lượt thử PIN: bị khoá thì trả retryAfterMs (không ghi gì thêm); không thì ghi một lần sai chờ xác nhận. */
  attempt(seatKey: string, ipKey: string, classKey: string, now: number): AttemptResult {
    const keys = [`s:${seatKey}`, `i:${ipKey}`, `c:${classKey}`];
    let ms = 0;
    for (const k of keys) {
      const e = this.entries.get(k);
      if (e && e.until > now) ms = Math.max(ms, e.until - now);
    }
    if (ms > 0) return { ok: false, retryAfterMs: ms };
    this.bump(keys[0]!, this.o.maxFails, this.o.windowMs, now);
    this.bump(keys[1]!, this.o.maxIpFails, this.o.windowMs, now);
    this.bump(keys[2]!, this.o.maxClassFails, this.o.classWindowMs, now);
    this.evict(now);
    return { ok: true, token: { keys, at: now } };
  }

  /** Đúng PIN: rút lần ghi của lượt này khỏi cả ba bộ đếm (không tiêu hạn mức IP chung của trường). Khoá đã đặt thì giữ. */
  success(token: AttemptToken): void {
    for (const k of token.keys) {
      const e = this.entries.get(k);
      const i = e ? e.hits.indexOf(token.at) : -1;
      if (e && i >= 0) e.hits.splice(i, 1);
    }
  }

  /** Sai PIN: giữ lần ghi (khoá đã được đặt lúc `attempt` khi chạm ngưỡng). */
  fail(_token: AttemptToken): void {}

  /** Số giây còn bị khoá (0 = không khoá), chỉ để đọc. */
  lockedFor(keys: readonly string[], now: number): number {
    let ms = 0;
    for (const k of keys) {
      for (const p of ["s:", "i:", "c:"]) {
        const e = this.entries.get(p + k);
        if (e && e.until > now) ms = Math.max(ms, e.until - now);
      }
    }
    return Math.ceil(ms / 1000);
  }

  get size(): number {
    return this.entries.size;
  }

  prune(now: number): void {
    for (const [k, e] of this.entries) if (e.until <= now && !e.hits.some((t) => t > now - e.windowMs)) this.entries.delete(k);
  }

  private evict(now: number): void {
    if (this.entries.size > this.o.maxKeys / 2) this.prune(now);
    while (this.entries.size > this.o.maxKeys) this.entries.delete(this.entries.keys().next().value as string);
  }

  private bump(key: string, max: number, windowMs: number, now: number): void {
    const old = this.entries.get(key);
    this.entries.delete(key);
    const hits = (old?.hits ?? []).filter((t) => t > now - windowMs);
    hits.push(now);
    const e: Entry = { hits, until: old && old.until > now ? old.until : 0, windowMs };
    if (hits.length >= max) {
      e.until = now + this.o.lockMs;
      e.hits = [];
    }
    this.entries.set(key, e);
  }
}
