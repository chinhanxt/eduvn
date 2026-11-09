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

export type GuardOptions = { maxFails: number; maxIpFails: number; windowMs: number; lockMs: number };
/** Theo (lớp, số thứ tự): 5 lần sai / 10 phút. Theo IP: 30 lần (cả lớp thường chung một IP qua NAT của trường). */
export const DEFAULT_GUARD: GuardOptions = { maxFails: 5, maxIpFails: 30, windowMs: 600_000, lockMs: 600_000 };

/** Chống dò PIN trong bộ nhớ tiến trình: sai đủ số lần trong cửa sổ thì khoá khoá đó lockMs. */
export class PinGuard {
  private fails = new Map<string, number[]>();
  private locks = new Map<string, number>();
  constructor(private readonly o: GuardOptions = DEFAULT_GUARD) {}

  /** Số giây còn bị khoá (0 = không khoá). */
  lockedFor(keys: readonly string[], now: number): number {
    let ms = 0;
    for (const k of keys) {
      const until = this.locks.get(k);
      if (until === undefined) continue;
      if (until > now) ms = Math.max(ms, until - now);
      else this.locks.delete(k);
    }
    return Math.ceil(ms / 1000);
  }

  fail(seatKey: string, ipKey: string, now: number): void {
    this.bump(seatKey, this.o.maxFails, now);
    this.bump(ipKey, this.o.maxIpFails, now);
    if (this.fails.size > 50_000) this.prune(now);
  }

  success(seatKey: string): void {
    this.fails.delete(seatKey);
  }

  prune(now: number): void {
    for (const [k, list] of this.fails) if (!list.some((t) => t > now - this.o.windowMs)) this.fails.delete(k);
    for (const [k, until] of this.locks) if (until <= now) this.locks.delete(k);
  }

  private bump(key: string, max: number, now: number): void {
    const list = (this.fails.get(key) ?? []).filter((t) => t > now - this.o.windowMs);
    list.push(now);
    if (list.length >= max) {
      this.locks.set(key, now + this.o.lockMs);
      this.fails.delete(key);
    } else this.fails.set(key, list);
  }
}
