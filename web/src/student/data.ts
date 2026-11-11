// Truy vấn khu bài tập cổng Học (phiên mã lớp/PIN) qua lớp dữ liệu v2 + hàm thuần cho danh sách và kết quả (có test).
import { request } from "../ui/data/http";
import { HOC_PATH } from "./paths";
import type { MyAssignment, ReviewItem, StudentResult } from "./types";

export const ASG_KEY = "hoc/bai-tap";
export const fetchAssignments = (signal: AbortSignal) => request<MyAssignment[]>("/api/student/assignments", { signal, auth: "hs" });
export const resultKey = (sid: string) => `hoc/ket-qua/${sid}`;
export const fetchResult = (sid: string) => (signal: AbortSignal) => request<StudentResult>(`/api/student/submissions/${encodeURIComponent(sid)}`, { signal, auth: "hs" });

// ---------- Danh sách bài ----------
export type AsgView = "can-lam" | "da-nop" | "tat-ca";
export const ASG_VIEWS: readonly AsgView[] = ["can-lam", "da-nop", "tat-ca"];
const todo = (a: MyAssignment) => a.state === "chua_lam" || a.state === "dang_lam" || a.state === "chua_mo";
export function filterAsg(rows: readonly MyAssignment[], view: AsgView, subject = ""): MyAssignment[] {
  const bySubj = subject ? rows.filter((a) => a.subject === subject) : [...rows];
  const shown = view === "tat-ca" ? bySubj : bySubj.filter((a) => (view === "can-lam" ? todo(a) : a.state === "da_nop"));
  // Cần làm: hạn gần nhất lên đầu (bài chưa mở xuống cuối); Đã nộp + Tất cả: mới nhất lên đầu.
  if (view === "can-lam") return shown.sort((a, b) => Number(a.state === "chua_mo") - Number(b.state === "chua_mo") || Date.parse(a.dueAt) - Date.parse(b.dueAt));
  return shown.sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt));
}
export function asgCounts(rows: readonly MyAssignment[], subject = ""): Record<AsgView, number> {
  return { "can-lam": filterAsg(rows, "can-lam", subject).length, "da-nop": filterAsg(rows, "da-nop", subject).length, "tat-ca": filterAsg(rows, "tat-ca", subject).length };
}
export const subjectsOf = (rows: readonly MyAssignment[]): string[] => [...new Set(rows.map((a) => a.subject).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));

/** Nút chính của thẻ bài: nhãn + đích (null = khoá). */
export function asgAction(a: MyAssignment): { label: string; icon: string; to: string | null; primary: boolean } {
  if (a.state === "chua_mo") return { label: "Chưa mở", icon: "lock", to: null, primary: false };
  if (a.state === "qua_han") return { label: "Đã quá hạn", icon: "lock", to: null, primary: false };
  if (a.state === "dang_lam") return { label: a.answered > 0 ? `Làm tiếp câu ${Math.min(a.questionCount, a.answered + 1)}` : "Làm tiếp", icon: "arrowr", to: HOC_PATH.lamBai(a.id), primary: true };
  if (a.state === "da_nop") {
    if (a.canStart) return { label: "Làm lại", icon: "repeat", to: HOC_PATH.lamBai(a.id), primary: true };
    return a.lastSubmissionId ? { label: "Xem kết quả", icon: "eye", to: HOC_PATH.ketQua(a.lastSubmissionId), primary: false } : { label: "Đã nộp", icon: "check", to: null, primary: false };
  }
  return { label: "Làm bài", icon: "arrowr", to: HOC_PATH.lamBai(a.id), primary: true };
}
/** Mức gấp của hạn nộp: hot ≤ 6 giờ. */
export const dueTone = (a: MyAssignment, now: number): "" | "hot" | "late" | "ok" =>
  a.state === "da_nop" ? "ok" : a.state === "qua_han" ? "late" : a.state !== "chua_mo" && Date.parse(a.dueAt) - now < 6 * 3600_000 ? "hot" : "";

// ---------- Kết quả một bài ----------
export const SECTION_VI: Record<ReviewItem["type"], string> = { mcq: "Nhiều lựa chọn", true_false: "Đúng/Sai", short_answer: "Trả lời ngắn", essay: "Tự luận" };
const ROMAN = ["I", "II", "III", "IV"];
/** Điểm theo phần (thứ tự xuất hiện trong đề), chỉ tính câu đã có điểm. */
export function sectionScores(items: readonly ReviewItem[]): { label: string; got: number; max: number; pending: number }[] {
  const order: ReviewItem["type"][] = [];
  const acc = new Map<ReviewItem["type"], { got: number; max: number; pending: number }>();
  for (const it of items) {
    if (!acc.has(it.type)) {
      order.push(it.type);
      acc.set(it.type, { got: 0, max: 0, pending: 0 });
    }
    const s = acc.get(it.type)!;
    s.max += it.maxPoints;
    if (it.points === null) s.pending += 1;
    else s.got += it.points;
  }
  return order.map((t, i) => ({ label: `${ROMAN[i] ?? i + 1} · ${SECTION_VI[t]}`, ...acc.get(t)! }));
}
export type Verdict = "ok" | "part" | "bad" | "wait" | "none";
export function verdictOf(i: ReviewItem): Verdict {
  if (i.correct === null) return i.type === "essay" && i.points === null ? "wait" : "none";
  if (i.correct) return "ok";
  return (i.points ?? 0) > 0 ? "part" : "bad";
}
/** Lọc "Chưa đúng": sai + đúng một phần. */
export const notRight = (items: readonly ReviewItem[]): ReviewItem[] => items.filter((i) => ["bad", "part"].includes(verdictOf(i)));

/** "12′40″" từ hai mốc ISO. */
export function spent(a: string, b: string | null): string {
  if (!b) return "—";
  const s = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m}′${String(s % 60).padStart(2, "0")}″` : `${s}″`;
}
/** Xếp loại thang 10 kiểu học bạ. */
export const band = (s: number): string => (s >= 9 ? "Xuất sắc" : s >= 8 ? "Giỏi" : s >= 6.5 ? "Khá" : s >= 5 ? "Đạt" : "Cần cố gắng");

// ---------- Trang Kết quả tổng hợp ----------
export type Scored = MyAssignment & { score10: number; lastSubmissionId: string };
/** Bài đã có điểm, cũ → mới (theo hạn nộp). */
export const scoredOf = (rows: readonly MyAssignment[], subject = ""): Scored[] =>
  rows.filter((a): a is Scored => a.score10 !== null && !!a.lastSubmissionId && (!subject || a.subject === subject)).sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt));
export function summary(rows: readonly Scored[]): { n: number; avg: number | null; best: number | null; last: number | null; delta: number | null; below: number } {
  const v = rows.map((r) => r.score10);
  if (!v.length) return { n: 0, avg: null, best: null, last: null, delta: null, below: 0 };
  const avg = Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100;
  const last = v[v.length - 1]!;
  const prev = v.length > 1 ? v[v.length - 2]! : null;
  return { n: v.length, avg, best: Math.max(...v), last, delta: prev === null ? null : Math.round((last - prev) * 100) / 100, below: v.filter((x) => x < 5).length };
}
/** Điểm trung bình theo môn (môn có nhiều bài lên trước). */
export function bySubject(rows: readonly Scored[]): { subject: string; n: number; avg: number; last: number }[] {
  const m = new Map<string, number[]>();
  for (const r of rows) m.set(r.subject, [...(m.get(r.subject) ?? []), r.score10]);
  return [...m].map(([subject, v]) => ({ subject, n: v.length, avg: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10, last: v[v.length - 1]! })).sort((a, b) => b.n - a.n || a.subject.localeCompare(b.subject, "vi"));
}
/** "07/11" theo giờ Việt Nam. */
export function ddmm(iso: string): string {
  const d = new Date(Date.parse(iso) + 7 * 3600_000);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Nhãn phần theo thứ tự xuất hiện của loại câu trong đề: "Phần I · Nhiều lựa chọn"… (một nhãn mỗi câu). */
export function sectionLabels(qs: readonly Pick<ReviewItem, "type">[]): string[] {
  const order: ReviewItem["type"][] = [];
  return qs.map((q) => {
    if (!order.includes(q.type)) order.push(q.type);
    return `Phần ${ROMAN[order.indexOf(q.type)] ?? order.indexOf(q.type) + 1} · ${SECTION_VI[q.type]}`;
  });
}
