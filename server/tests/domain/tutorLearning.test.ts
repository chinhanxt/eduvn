import { describe, expect, it } from "vitest";
import { DAY_MS, INITIAL_STATE, MASTERY_THRESHOLD, applyEvidence, dueForReview, newPoint, nextPoint, progressOf, schedule } from "../../src/domain/tutorLearning";

const NOW = 1_800_000_000_000;

describe("SM-2 (khớp scheduler.py của DeepTutor)", () => {
  it("bảng mẫu từ trạng thái khởi đầu", () => {
    const again = schedule(INITIAL_STATE, "again", NOW);
    expect(again).toMatchObject({ intervalDays: 0.007, ease: 2.3, streak: 0, lapses: 1, reviewCount: 1, version: 1 });
    expect(again.dueAt).toBe(NOW + 0.007 * DAY_MS);
    expect(schedule(INITIAL_STATE, "hard", NOW)).toMatchObject({ intervalDays: 1.2, ease: 2.35, streak: 0 });
    expect(schedule(INITIAL_STATE, "good", NOW)).toMatchObject({ intervalDays: 3, ease: 2.5, streak: 1 });
    expect(schedule(INITIAL_STATE, "easy", NOW)).toMatchObject({ intervalDays: 3.9, ease: 2.65, streak: 1 });
  });

  it("lần ôn sau nhân hệ số dễ; easy nhân 1,3; trần 365 ngày; ease không dưới 1,3", () => {
    const s1 = schedule(INITIAL_STATE, "good", NOW);
    expect(schedule(s1, "good", NOW).intervalDays).toBe(7.5);
    expect(schedule(s1, "easy", NOW)).toMatchObject({ intervalDays: 9.75, ease: 2.65, streak: 2 });
    expect(schedule({ ...s1, intervalDays: 300 }, "good", NOW).intervalDays).toBe(365);
    let s = s1;
    for (let i = 0; i < 12; i++) s = schedule(s, "again", NOW);
    expect(s.ease).toBe(1.3);
    expect(s.lapses).toBe(12);
  });

  it("mức đánh giá lạ bị từ chối", () => {
    expect(() => schedule(INITIAL_STATE, "perfect" as never, NOW)).toThrow();
  });
});

describe("mức thành thạo", () => {
  it("cần ≥ 2 bằng chứng tốt mới đạt; đạt thì xếp lịch ôn theo loại tri thức", () => {
    let p = newPoint("p1", "Bình phương một tổng", "procedure");
    p = applyEvidence(p, 1, NOW);
    expect(p.status).toBe("learning");
    p = applyEvidence(p, 1, NOW);
    expect(p.mastery).toBeGreaterThanOrEqual(MASTERY_THRESHOLD);
    expect(p.status).toBe("mastered");
    expect(p.nextReviewAt).toBe(NOW + 3 * DAY_MS); // procedure: [3, 7, 14]
    expect(dueForReview([p], NOW)).toHaveLength(0);
    expect(dueForReview([p], NOW + 4 * DAY_MS)).toHaveLength(1);
  });

  it("ôn lại đúng → khoảng cách tăng theo dãy; ôn sai → quay về đang học", () => {
    let p = newPoint("p1", "x", "procedure");
    p = applyEvidence(applyEvidence(p, 1, NOW), 1, NOW);
    p = applyEvidence(p, 0.9, NOW + 4 * DAY_MS);
    expect(p).toMatchObject({ status: "mastered", reviewRound: 1 });
    expect(p.nextReviewAt).toBe(NOW + 4 * DAY_MS + 7 * DAY_MS);
    p = applyEvidence(p, 0, NOW + 20 * DAY_MS);
    expect(p).toMatchObject({ status: "learning", reviewRound: 0, nextReviewAt: null });
    expect(p.mastery).toBeLessThanOrEqual(0.6);
  });

  it("nextPoint chọn mục yếu nhất chưa đạt; progressOf", () => {
    const a = applyEvidence(applyEvidence(newPoint("a", "a", "concept"), 1, NOW), 1, NOW);
    const b = applyEvidence(newPoint("b", "b", "concept"), 0.5, NOW);
    const c = newPoint("c", "c", "memory");
    expect(nextPoint([a, b, c])?.id).toBe("c");
    expect(progressOf([a, b, c])).toMatchObject({ total: 3, mastered: 1 });
    expect(nextPoint([a])).toBeNull();
  });
});
