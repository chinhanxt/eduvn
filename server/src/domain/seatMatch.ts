// server/src/domain/seatMatch.ts
/** Ghép phiếu trắc nghiệm với học sinh theo SBD tô trên phiếu = `students.seat` (số thứ tự trên thẻ lớp). Thuần. */

export type SeatStudent = { id: string; fullName: string; seat: number | null };
export type SeatMatch =
  | { status: "ok"; student: SeatStudent }
  /** Không tô SBD, hoặc có cột không đọc được (?). */
  | { status: "blank" | "unreadable" }
  /** Đọc được số nhưng lớp không có HS mang số đó. */
  | { status: "none"; seat: number };

/** "000012" → 12; "" → null; có "?" (cột tô lỗi) → NaN. */
export function seatFromSbd(sbd: string): number | null {
  const s = sbd.trim();
  if (!s) return null;
  if (!/^\d+$/.test(s)) return Number.NaN;
  const n = Number.parseInt(s, 10);
  return n > 0 ? n : Number.NaN;
}

export function matchSeat(roster: readonly SeatStudent[], sbd: string): SeatMatch {
  const n = seatFromSbd(sbd);
  if (n === null) return { status: "blank" };
  if (Number.isNaN(n)) return { status: "unreadable" };
  const st = roster.find((s) => s.seat === n);
  return st ? { status: "ok", student: st } : { status: "none", seat: n };
}
