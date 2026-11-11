// web/src/omr/seat.ts — hiển thị ghép SBD ↔ số thứ tự HS (cùng luật server/src/domain/seatMatch.ts; server quyết định khi lưu).
export type RosterStudent = { id: string; fullName: string; seat: number | null };
export type Roster = { id: string; name: string; columns: { name: string }[]; students: RosterStudent[] };
export type SeatState = { status: "ok"; student: RosterStudent } | { status: "blank" | "unreadable" } | { status: "none"; seat: number };

export function matchSeat(students: readonly RosterStudent[], sbd: string): SeatState {
  const s = sbd.trim();
  if (!s) return { status: "blank" };
  if (!/^\d+$/.test(s) || Number.parseInt(s, 10) <= 0) return { status: "unreadable" };
  const n = Number.parseInt(s, 10);
  const st = students.find((x) => x.seat === n);
  return st ? { status: "ok", student: st } : { status: "none", seat: n };
}

export function seatLabel(m: SeatState): string {
  if (m.status === "ok") return `${m.student.seat} · ${m.student.fullName}`;
  if (m.status === "none") return `Lớp không có số ${m.seat}`;
  return m.status === "blank" ? "Chưa tô SBD" : "SBD tô lỗi";
}
