// Port từ DeepTutor deeptutor/services/practice/scheduler.py (SM-2 khởi đầu, Apache-2.0) và
// deeptutor/learning/scheduler.py (khoảng cách ôn theo loại tri thức), đã sửa: viết lại bằng
// TypeScript, thời gian theo mili-giây, bỏ mô hình quên mũ/replay; thêm cập nhật mức thành thạo.
// Thuần, không I/O.

export const DAY_MS = 86_400_000;
export type Rating = "again" | "hard" | "good" | "easy";
export const RATINGS: readonly Rating[] = ["again", "hard", "good", "easy"];

export type ReviewState = {
  intervalDays: number;
  ease: number;
  streak: number;
  lapses: number;
  /** Mili-giây epoch: tới hạn ôn. */
  dueAt: number;
  lastReviewAt: number;
  reviewCount: number;
  version: number;
};

export const INITIAL_STATE: Omit<ReviewState, "dueAt" | "lastReviewAt"> = { intervalDays: 1, ease: 2.5, streak: 0, lapses: 0, reviewCount: 0, version: 0 };

/** SM-2: again/hard/good/easy. Khớp scheduler.py của DeepTutor (again = 10 phút, tối đa 365 ngày). */
export function schedule(state: Partial<ReviewState>, rating: Rating, now: number): ReviewState {
  let interval = state.intervalDays ?? 1;
  let ease = state.ease ?? 2.5;
  let streak = state.streak ?? 0;
  let lapses = state.lapses ?? 0;
  const count = state.reviewCount ?? 0;
  if (rating === "again") {
    interval = 10 / 1440;
    streak = 0;
    lapses += 1;
    ease = Math.max(1.3, ease - 0.2);
  } else if (rating === "hard") {
    interval = Math.max(1, interval * 1.2);
    ease = Math.max(1.3, ease - 0.15);
    streak = 0;
  } else if (rating === "good" || rating === "easy") {
    interval = interval <= 1 || !count ? 3 : interval * ease;
    if (rating === "easy") {
      interval *= 1.3;
      ease = Math.min(3, ease + 0.15);
    }
    streak += 1;
  } else {
    throw new Error("Mức đánh giá không hợp lệ");
  }
  interval = Math.min(365, Math.round(interval * 1000) / 1000);
  return { intervalDays: interval, ease, streak, lapses, dueAt: now + interval * DAY_MS, lastReviewAt: now, reviewCount: count + 1, version: (state.version ?? 0) + 1 };
}

/** Gợi ý mức đánh giá khi HS không tự chọn: sai → again; đúng → good. */
export function autoRating(correct: boolean): Rating {
  return correct ? "good" : "again";
}

// ---- Lộ trình thành thạo --------------------------------------------------

export const KNOWLEDGE_TYPES = ["memory", "concept", "procedure", "design"] as const;
export type KnowledgeType = (typeof KNOWLEDGE_TYPES)[number];

/** Khoảng cách (ngày) giữa các lần ôn, theo loại tri thức (learning/scheduler.py INTERVAL_SEQUENCES). */
export const INTERVAL_SEQUENCES: Record<KnowledgeType, readonly number[]> = {
  memory: [0, 1, 3, 7, 14, 30, 60],
  concept: [3, 7, 14, 30],
  procedure: [3, 7, 14],
  design: [14, 28],
};

export const MASTERY_THRESHOLD = 0.8;

export type PointStatus = "new" | "learning" | "mastered";
export type Point = {
  id: string;
  name: string;
  type: KnowledgeType;
  mastery: number;
  attempts: number;
  status: PointStatus;
  explained: boolean;
  reviewRound: number;
  nextReviewAt: number | null;
};

export function newPoint(id: string, name: string, type: KnowledgeType): Point {
  return { id, name, type, mastery: 0, attempts: 0, status: "new", explained: false, reviewRound: 0, nextReviewAt: null };
}

/** Cập nhật mức thành thạo theo một bằng chứng (score 0..1). Đạt ngưỡng thì xếp lịch ôn theo loại tri thức. */
export function applyEvidence(p: Point, score: number, now: number): Point {
  const s = Math.min(1, Math.max(0, score));
  const mastery = Math.round((p.attempts === 0 ? s * 0.7 : p.mastery + (s - p.mastery) * 0.45) * 1000) / 1000;
  const attempts = p.attempts + 1;
  const seq = INTERVAL_SEQUENCES[p.type];
  if (p.status === "mastered" && p.nextReviewAt !== null) {
    // Đang ôn lại một chủ đề đã thành thạo.
    if (s >= 0.6) {
      const reviewRound = Math.min(p.reviewRound + 1, seq.length - 1);
      return { ...p, mastery: Math.max(mastery, MASTERY_THRESHOLD), attempts, reviewRound, nextReviewAt: now + Math.max(0.25, seq[reviewRound]!) * DAY_MS };
    }
    return { ...p, mastery: Math.min(mastery, 0.6), attempts, status: "learning", reviewRound: 0, nextReviewAt: null };
  }
  if (mastery >= MASTERY_THRESHOLD && attempts >= 2) {
    return { ...p, mastery, attempts, status: "mastered", reviewRound: 0, nextReviewAt: now + Math.max(0.25, seq[0]!) * DAY_MS };
  }
  return { ...p, mastery, attempts, status: "learning" };
}

export function dueForReview(points: Point[], now: number): Point[] {
  return points.filter((p) => p.status === "mastered" && p.nextReviewAt !== null && p.nextReviewAt <= now).sort((a, b) => a.nextReviewAt! - b.nextReviewAt!);
}

/** Chủ đề nên học tiếp: chưa thành thạo, thấp nhất trước (giữ thứ tự lộ trình khi bằng nhau). */
export function nextPoint(points: Point[]): Point | null {
  const open = points.filter((p) => p.status !== "mastered");
  if (!open.length) return null;
  return open.reduce((best, p) => (p.mastery < best.mastery - 1e-9 ? p : best), open[0]!);
}

export function progressOf(points: Point[]): { total: number; mastered: number; percent: number } {
  const mastered = points.filter((p) => p.status === "mastered").length;
  return { total: points.length, mastered, percent: points.length ? Math.round((100 * points.reduce((a, p) => a + p.mastery, 0)) / points.length) : 0 };
}
