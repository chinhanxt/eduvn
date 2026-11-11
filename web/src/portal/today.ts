// Kiểu dữ liệu của 2 endpoint gộp "Hôm nay" (khớp server/src/services/today.ts) + hàm thuần để vẽ màn (có test).

export type GvAssignmentDetail = {
  type: "assignment";
  assignmentId: string;
  classId: string;
  kind: "practice" | "test";
  rosterSize: number;
  submitted: number;
  missing: { id: string; fullName: string }[];
  graded: number;
  pendingAnswers: number;
  estMinutes: number;
  dueAt: string;
  open: boolean;
  histogram: number[];
  scored: number;
  mean: number | null;
  median: number | null;
  hardest: { label: string; p: number; topic: string }[];
};
export type GvLessonDetail = { type: "lesson"; lessonId: string; subject: string; grade: number; periods: number | null; date: string; boardId: string | null };
export type GvTask = {
  id: string;
  kind: "grade" | "due" | "lesson";
  group: "today" | "week";
  title: string;
  className: string;
  classId: string | null;
  progress: { done: number; total: number } | null;
  note: string | null;
  dueAt: string | null;
  dueLabel: string;
  hot: boolean;
  href: string;
  detail: GvAssignmentDetail | GvLessonDetail;
};
export type GvClassRow = { id: string; name: string; subject: string | null; rosterSize: number; bands: [number, number, number, number]; basis: "so-diem" | "bai-giao" | null; avg: number | null; deltaMonth: number | null; onTime: number | null };
export type GvAttention = { studentId: string; fullName: string; classId: string; className: string; reasons: string[]; last: number | null };
export type GvToday = {
  now: string;
  date: { day: string; weekday: string };
  kpis: {
    pendingGrading: { value: number; today: number };
    onTime: { value: number | null; delta: number | null };
    weekAvg: { value: number | null; delta: number | null };
    attention: { value: number; classes: number };
    lessonsToday: { value: number; first: string | null };
    dueToday: { value: number; times: string[] };
  };
  tasks: GvTask[];
  classes: GvClassRow[];
  attention: GvAttention[];
};

export type MasteryRow = { topic: string; pct: number | null; n: number };
export type HocUpcoming = { assignmentId: string; title: string; subject: string; kind: "practice" | "test"; dueAt: string; day: string; dayNum: string; hot: boolean; answered: number; total: number; attemptsAllowed: number; state: string; canStart: boolean };
export type HocToday = {
  now: string;
  date: { day: string; weekday: string };
  student: { name: string; className: string | null; classId: string | null };
  next: (HocUpcoming & { teacher: string | null; className: string; minutes: number }) | null;
  upcoming: HocUpcoming[];
  subjects: { subject: string; metric: { kind: "mastery" | "score" | "cards" | "none"; value: number | null }; next: { title: string; when: string } | null }[];
  mastery: { subject: string; rows: MasteryRow[]; weakest: { topic: string; pct: number } | null } | null;
  review: { due: number; minutes: number } | null;
  days: { date: string; weekday: string; count: number }[];
  streak: { current: number; longest: number; goal: number };
  canTutor: boolean;
};

// ---------- GV ----------
export type GvView = "tat-ca" | "can-lam" | "cho-cham" | "hoc-sinh";
export const GV_VIEWS: readonly GvView[] = ["tat-ca", "can-lam", "cho-cham", "hoc-sinh"];
/** Tab lọc: Cần làm = hạn nộp + tiết dạy; Chờ chấm = bài còn câu chờ chấm; Học sinh = HS cần quan tâm. */
export function filterTasks(tasks: readonly GvTask[], view: GvView): GvTask[] {
  if (view === "can-lam") return tasks.filter((t) => t.kind !== "grade");
  if (view === "cho-cham") return tasks.filter((t) => t.kind === "grade");
  if (view === "hoc-sinh") return [];
  return [...tasks];
}
export function viewCounts(d: Pick<GvToday, "tasks" | "attention">): Record<GvView, number> {
  return { "tat-ca": d.tasks.length, "can-lam": filterTasks(d.tasks, "can-lam").length, "cho-cham": filterTasks(d.tasks, "cho-cham").length, "hoc-sinh": d.attention.length };
}
/** Trạng thái ô tròn đầu hàng: tiết dạy = "live", đang làm dở = "half" (kèm %), chưa bắt đầu = "todo". */
export function taskStatus(t: GvTask): { cls: "live" | "half" | "todo"; pct: number; label: string } {
  if (t.kind === "lesson") return { cls: "live", pct: 0, label: "Tiết dạy" };
  const p = t.progress && t.progress.total > 0 ? Math.round((100 * t.progress.done) / t.progress.total) : 0;
  if (p <= 0) return { cls: "todo", pct: 0, label: "Chưa bắt đầu" };
  return { cls: "half", pct: p, label: `${t.kind === "grade" ? "Đã chấm" : "Đã nộp"} ${p}%` };
}
/** Phím tắt của hàng: C chấm, R xem hạn nộp, O mở tiết. */
export const taskKey = (t: GvTask): string => (t.kind === "grade" ? "C" : t.kind === "lesson" ? "O" : "R");

// ---------- Định dạng số kiểu Việt ----------
export const vn1 = (x: number): string => x.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** Chênh lệch có dấu: +0,4 / −0,4 / 0 (dấu trừ thật U+2212). */
export function signed(x: number | null | undefined, digits = 1, suffix = ""): string {
  if (x == null || !Number.isFinite(x)) return "";
  const r = Number(x.toFixed(digits));
  if (r === 0) return `0${suffix}`;
  const abs = Math.abs(r).toLocaleString("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${r > 0 ? "+" : "−"}${abs}${suffix}`;
}
/** Phần trăm 0–100 (server trả số nguyên). */
export const pct = (x: number | null | undefined): string => (x == null ? "—" : `${Math.round(x)}%`);

/** "Hôm nay 17:00 · còn 6 giờ" / "Thứ Sáu 14/11" / "Đã quá hạn 2 giờ". */
export function dueText(dueAt: string, nowIso: string): string {
  const due = new Date(dueAt);
  const now = new Date(nowIso);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ...o });
  const day = (d: Date) => fmt(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  const time = fmt(due, { hour: "2-digit", minute: "2-digit", hour12: false });
  const diff = due.getTime() - now.getTime();
  const h = Math.round(Math.abs(diff) / 3_600_000);
  if (diff < 0) return `Đã quá hạn ${h >= 24 ? `${Math.round(h / 24)} ngày` : `${Math.max(1, h)} giờ`}`;
  if (day(due) === day(now)) return `Hôm nay ${time} · còn ${h >= 1 ? `${h} giờ` : `${Math.max(1, Math.round(diff / 60_000))} phút`}`;
  const dd = fmt(due, { day: "2-digit" }).padStart(2, "0");
  const mm = fmt(due, { month: "2-digit" }).padStart(2, "0");
  return `${fmt(due, { weekday: "long" }).replace(/^./, (c) => c.toUpperCase())} ${dd}/${mm} · ${time}`;
}

