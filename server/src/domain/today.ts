// Màn "Hôm nay" (UI v2): các phép tính thuần cho endpoint gộp GV và Học. Không I/O.
// Ngày tính theo giờ Việt Nam (UTC+7, không đổi giờ mùa hè).

const VN_OFFSET_MS = 7 * 3600_000;
export const DAY_MS = 86_400_000;
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"] as const;

/** "YYYY-MM-DD" theo giờ Việt Nam. */
export const vnDay = (d: Date): string => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
/** 0h giờ Việt Nam của ngày chứa d. */
export function startOfVnDay(d: Date): Date {
  const t = d.getTime() + VN_OFFSET_MS;
  return new Date(t - (((t % DAY_MS) + DAY_MS) % DAY_MS) - VN_OFFSET_MS);
}
/** Thứ trong tuần kiểu Việt: CN, T2 … T7. */
export const vnWeekday = (d: Date): (typeof WEEKDAYS)[number] => WEEKDAYS[new Date(d.getTime() + VN_OFFSET_MS).getUTCDay()]!;
/** "07:30" theo giờ Việt Nam. */
export const vnTime = (d: Date): string => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(11, 16);
/** "dd/mm" theo giờ Việt Nam. */
export const vnDayMonth = (d: Date): string => {
  const s = vnDay(d);
  return `${s.slice(8, 10)}/${s.slice(5, 7)}`;
};
/** Hết Chủ nhật (giờ VN) của tuần chứa d — tuần bắt đầu thứ Hai. */
export function endOfVnWeek(d: Date): Date {
  const start = startOfVnDay(d);
  const dow = new Date(start.getTime() + VN_OFFSET_MS).getUTCDay(); // 0 = CN
  const daysToSunday = dow === 0 ? 0 : 7 - dow;
  return new Date(start.getTime() + (daysToSunday + 1) * DAY_MS);
}
/** "dd/mm/yyyy" (ngày ghi trên giáo án) → "YYYY-MM-DD"; sai định dạng → null. */
export function parseViDate(s: string | null | undefined): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s ?? "");
  if (!m) return null;
  const [dd, mm, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export type DueGroup = "today" | "week" | "later";
/** Nhóm theo hạn: trong hôm nay (kể cả đã qua giờ), trong tuần này, sau tuần này. */
export function dueGroup(due: Date, now: Date): DueGroup {
  if (due.getTime() < startOfVnDay(now).getTime() + DAY_MS) return "today";
  if (due.getTime() < endOfVnWeek(now).getTime()) return "week";
  return "later";
}
/** Nhãn hạn ngắn cho hàng việc: hôm nay → "17:00", trong 6 ngày tới → "T6", xa hơn/đã qua → "12/11". */
export function dueLabel(due: Date, now: Date): string {
  const today = startOfVnDay(now).getTime();
  const t = due.getTime();
  if (t >= today && t < today + DAY_MS) return vnTime(due);
  if (t >= today + DAY_MS && t < today + 7 * DAY_MS) return vnWeekday(due);
  return vnDayMonth(due);
}
/** Hạn gấp: còn ≤ 24 giờ và chưa qua. */
export const isHot = (due: Date, now: Date): boolean => due.getTime() > now.getTime() && due.getTime() - now.getTime() <= DAY_MS;

/** Học kỳ theo lịch năm học Việt Nam: tháng 8 → tháng 1 là HK1, tháng 2 → tháng 7 là HK2. */
export function currentTerm(now: Date): "HK1" | "HK2" {
  const m = Number(vnDay(now).slice(5, 7));
  return m >= 8 || m === 1 ? "HK1" : "HK2";
}

export const GRADE_BANDS = ["Giỏi", "Khá", "TB", "Yếu"] as const;
/** Giỏi ≥ 8 · Khá ≥ 6,5 · TB ≥ 5 · Yếu < 5 (thang 10). */
export const gradeBand = (v: number): 0 | 1 | 2 | 3 => (v >= 8 ? 0 : v >= 6.5 ? 1 : v >= 5 ? 2 : 3);
export function bandCounts(values: readonly number[]): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (const v of values) out[gradeBand(v)] += 1;
  return out;
}

export const round1 = (x: number): number => Math.round(x * 10) / 10;
export const mean = (xs: readonly number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Chênh lệch làm tròn 1 chữ số; thiếu một bên → null. */
export const delta = (cur: number | null, prev: number | null): number | null => (cur === null || prev === null ? null : round1(cur - prev));

/** Tỉ lệ nộp đúng hạn (0–100, số nguyên) của các bài có hạn trong [from, to): mỗi bài × sĩ số lớp là một lượt cần nộp. */
export function onTimeRate(
  items: readonly { dueAt: Date; rosterIds: readonly string[]; submittedAt: ReadonlyMap<string, Date> }[],
  from: Date,
  to: Date,
  graceMs = 30_000,
): number | null {
  let need = 0;
  let ok = 0;
  for (const it of items) {
    if (it.dueAt.getTime() < from.getTime() || it.dueAt.getTime() >= to.getTime()) continue;
    for (const id of it.rosterIds) {
      need++;
      const at = it.submittedAt.get(id);
      if (at && at.getTime() <= it.dueAt.getTime() + graceMs) ok++;
    }
  }
  return need ? Math.round((100 * ok) / need) : null;
}

/** Mã việc kiểu "KT-0711-10A3": loại + ngày/tháng hạn + lớp (bỏ khoảng trắng, chữ hoa). */
export function taskCode(prefix: string, due: Date, className: string): string {
  const d = vnDay(due);
  const cls = className.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "D").replace(/[^\w]+/g, "").toUpperCase().slice(0, 10);
  return `${prefix}-${d.slice(8, 10)}${d.slice(5, 7)}${cls ? `-${cls}` : ""}`;
}

/** Chuỗi ngày học: hiện tại (kết thúc hôm nay; hôm nay chưa học thì tính đến hôm qua) và dài nhất trong dữ liệu. */
export function streakOf(counts: readonly number[]): { current: number; longest: number } {
  let longest = 0;
  let run = 0;
  for (const c of counts) {
    run = c > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  let i = counts.length - 1;
  if (i >= 0 && (counts[i] ?? 0) === 0) i--;
  for (; i >= 0 && (counts[i] ?? 0) > 0; i--) current++;
  return { current, longest };
}

/** Đếm theo ngày (giờ VN) cho `days` ngày kết thúc hôm nay. */
export function dailyCounts(times: readonly { at: Date; n?: number }[], now: Date, days: number): { date: string; weekday: string; count: number }[] {
  const start = startOfVnDay(now).getTime() - (days - 1) * DAY_MS;
  const out = Array.from({ length: days }, (_, i) => {
    const d = new Date(start + i * DAY_MS);
    return { date: vnDay(d), weekday: vnWeekday(d), count: 0 };
  });
  for (const t of times) {
    const i = Math.floor((t.at.getTime() - start) / DAY_MS);
    if (i >= 0 && i < days) out[i]!.count += t.n ?? 1;
  }
  return out;
}

export type Evidence = { subject: string; topic: string; value: number };
export type MasteryRow = { topic: string; pct: number | null; n: number };
export const MASTERY_MIN = 3;
/** Thành thạo theo chủ đề (0–100) từ bằng chứng 0–1 (câu đã chấm, thẻ ôn). Chủ đề < MASTERY_MIN bằng chứng → pct null. */
export function masteryBySubject(ev: readonly Evidence[]): Map<string, MasteryRow[]> {
  const by = new Map<string, Map<string, { sum: number; n: number }>>();
  for (const e of ev) {
    const s = by.get(e.subject) ?? by.set(e.subject, new Map()).get(e.subject)!;
    const t = s.get(e.topic) ?? { sum: 0, n: 0 };
    t.sum += Math.min(1, Math.max(0, e.value));
    t.n += 1;
    s.set(e.topic, t);
  }
  const out = new Map<string, MasteryRow[]>();
  for (const [subject, topics] of by) {
    const rows = [...topics.entries()].map(([topic, t]) => ({ topic, n: t.n, pct: t.n >= MASTERY_MIN ? Math.round((100 * t.sum) / t.n) : null }));
    rows.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.n - a.n || a.topic.localeCompare(b.topic, "vi"));
    out.set(subject, rows);
  }
  return out;
}

/** ĐTB tạm tính giữa kỳ: trung bình có trọng số của các cột đã có điểm (sổ điểm chưa đủ cột vẫn ước được học lực). */
export function partialAverage(cols: readonly { name: string; weight: number }[], scores: Readonly<Record<string, number | undefined>>): number | null {
  let sum = 0;
  let w = 0;
  for (const c of cols) {
    const s = scores[c.name];
    if (s === undefined || c.weight <= 0) continue;
    sum += s * c.weight;
    w += c.weight;
  }
  return w ? round1(sum / w) : null;
}
