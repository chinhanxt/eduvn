// Hàm thuần màn Hôm nay cổng Học (tách khỏi today.ts để cổng GV không tải phần này).
import type { HocToday } from "./today";
import { vn1 } from "./today";

const WD: Record<string, string> = { CN: "Chủ nhật", T2: "Thứ Hai", T3: "Thứ Ba", T4: "Thứ Tư", T5: "Thứ Năm", T6: "Thứ Sáu", T7: "Thứ Bảy" };
/** "T2" + "2026-11-10" → "Thứ Hai · 10/11". */
export const longDay = (weekday: string, day: string): string => `${WD[weekday] ?? weekday} · ${day.slice(8, 10)}/${day.slice(5, 7)}`;

// ---------- Học ----------
/** Màu nhận diện môn: cố định theo tên môn (Toán lam, Văn cam, Anh lục lam…), môn lạ lấy theo thứ tự. */
const SUBJ: [RegExp, number][] = [
  [/^to[aá]n|gi[aả]i t[ií]ch|đ[aạ]i s[oố]|h[iì]nh h[oọ]c/i, 1],
  [/v[aă]n/i, 2],
  [/anh|english/i, 3],
  [/l[yý]|v[aậ]t l/i, 4],
  [/h[oó]a/i, 5],
  [/sinh/i, 6],
  [/s[uử]|đ[iị]a/i, 7],
  [/tin|cntt/i, 8],
];
export function subjectColor(subject: string, index = 0): string {
  const hit = SUBJ.find(([re]) => re.test(subject));
  return `var(--c${hit ? hit[1] : (index % 8) + 1})`;
}
export const subjectIcon = (subject: string): string => (/to[aá]n|t[ií]ch|s[oố]/i.test(subject) ? "sigma" : /v[aă]n/i.test(subject) ? "pen" : /anh|english/i.test(subject) ? "chat" : "book");

/** Tiêu đề lớn của thẻ "việc tiếp theo". */
export function heroTitle(next: HocToday["next"]): string {
  if (!next) return "Hôm nay em đã xong bài!";
  const left = Math.max(0, next.total - next.answered);
  if (next.answered > 0 && left > 0) return `Còn ${left} câu là xong!`;
  if (next.kind === "test") return "Sắp đến giờ kiểm tra";
  return `Bài mới: ${next.total} câu`;
}
/** Nhãn nút chính: "Làm tiếp câu 7" / "Bắt đầu làm" / "Xem bài". */
export function heroAction(next: NonNullable<HocToday["next"]>): string {
  if (!next.canStart) return "Xem bài";
  if (next.answered > 0 && next.answered < next.total) return `Làm tiếp câu ${next.answered + 1}`;
  return "Bắt đầu làm";
}
export function metricText(m: HocToday["subjects"][number]["metric"]): { big: string; small: string } {
  if (m.kind === "mastery" && m.value != null) return { big: `${Math.round(m.value)}%`, small: "thành thạo" };
  if (m.kind === "score" && m.value != null) return { big: vn1(m.value), small: "điểm gần nhất" };
  if (m.kind === "cards" && m.value != null) return { big: String(m.value), small: "thẻ đến hạn" };
  return { big: "—", small: "chưa có dữ liệu" };
}
