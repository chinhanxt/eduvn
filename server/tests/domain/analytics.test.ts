// server/tests/domain/analytics.test.ts
import { describe, expect, it } from "vitest";
import { type ItemRow, type RosterRow, type SubRow, analyze, bestByStudent, buildMonitor, resultRows } from "../../src/domain/analytics";

const T0 = new Date("2026-11-10T07:00:00Z");
const sub = (p: Partial<SubRow> & { id: string; studentId: string }): SubRow => ({
  attempt: 1, status: "submitted", score: 0, maxScore: 10, pending: 0, leaveCount: 0, answered: 0, startedAt: T0, submittedAt: T0, updatedAt: T0, ...p,
});
const item = (submissionId: string, questionId: string, topic: string, ok: boolean, choice: string | null): ItemRow => ({
  submissionId, questionId, topic, level: "NB", type: "mcq", points: ok ? 0.25 : 0, maxPoints: 0.25, correct: ok, choice,
});

// 12 bài: HS i có điểm i × 0,8 (thang 10). Nhóm cao = s11, s10, s9; nhóm thấp = s0, s1, s2.
const N = 12;
const roster: RosterRow[] = [...Array.from({ length: N }, (_, i) => ({ id: `s${i}`, seat: i + 1, fullName: `HS ${i}` })), { id: "s12", seat: 13, fullName: "HS 12" }];
const subs: SubRow[] = Array.from({ length: N }, (_, i) => sub({ id: `b${i}`, studentId: `s${i}`, score: i * 0.8, leaveCount: i === 3 ? 4 : 0 }));
const items: ItemRow[] = Array.from({ length: N }, (_, i) => [
  item(`b${i}`, "q1", "A", i >= 6, i >= 6 ? "X" : "Y"),
  item(`b${i}`, "q2", "A", true, "Z"),
  item(`b${i}`, "q3", "B", i % 2 === 0, "W"),
  item(`b${i}`, "q4", "B", false, i < 8 ? "B" : "C"),
]).flat();
const questions = ["q1", "q2", "q3", "q4"].map((q, i) => ({ questionId: q, label: i + 1, stem: `Câu ${q}` }));
const past = { dueAt: new Date("2026-11-10T06:00:00Z"), now: T0 };

describe("analyze", () => {
  const s = analyze({ roster, subs, items, questions, ...past });
  it("tỉ lệ nộp, trung bình, trung vị, phân bố", () => {
    expect(s).toMatchObject({ rosterSize: 13, started: 12, submitted: 12, submitRate: 0.92, mean: 4.4, median: 4.4 });
    expect(s.distribution).toEqual([2, 1, 1, 1, 2, 1, 1, 1, 2, 0]);
    expect(s.best).toEqual({ studentId: "s11", fullName: "HS 11", score10: 8.8 });
    expect(s.worst).toEqual({ studentId: "s0", fullName: "HS 0", score10: 0 });
  });
  it("độ khó p, độ phân biệt D, cờ, đáp án nhiễu", () => {
    expect(s.items.map((i) => [i.label, i.p, i.d, i.flag])).toEqual([
      [1, 0.5, 1, null],
      [2, 1, 0, "Dễ"],
      [3, 0.5, -0.33, "Xem lại"],
      [4, 0, 0, "Khó"],
    ]);
    expect(s.items[3]!.choices).toEqual([
      { choice: "B", count: 8, correct: false },
      { choice: "C", count: 4, correct: false },
    ]);
    expect(s.items[0]!.choices[0]).toEqual({ choice: "X", count: 6, correct: true });
    expect(s.items[0]).toMatchObject({ n: 12, stem: "Câu q1", topic: "A" });
  });
  it("chủ đề yếu xếp tăng dần theo tỉ lệ đúng", () => {
    expect(s.topics).toEqual([
      { topic: "B", n: 24, rate: 0.25 },
      { topic: "A", n: 24, rate: 0.75 },
    ]);
  });
  it("HS cần quan tâm: chưa vào bài, dưới 5, rời bài nhiều", () => {
    expect(s.atRisk.map((a) => a.studentId)).toEqual(["s3", "s12", "s0", "s1", "s2", "s4", "s5", "s6"]);
    expect(s.atRisk[0]!.reasons).toEqual(["Dưới 5 điểm", "Rời bài 4 lần"]);
    expect(s.atRisk[1]!.reasons).toEqual(["Chưa vào bài"]);
  });
  it("dưới 10 bài thì không tính D; chưa tới hạn thì chưa báo chưa nộp", () => {
    const few = analyze({ roster, subs: subs.slice(0, 5), items, questions, dueAt: new Date("2026-11-11T00:00:00Z"), now: T0 });
    expect(few.items.every((i) => i.d === null)).toBe(true);
    expect(few.atRisk.some((a) => a.reasons.includes("Chưa vào bài"))).toBe(false);
    expect(few.items[0]!.n).toBe(5);
  });
  it("lớp trống", () => {
    expect(analyze({ roster: [], subs: [], items: [], questions: [], ...past })).toMatchObject({ submitRate: 0, mean: null, median: null, best: null, items: [], topics: [] });
  });
});

describe("theo dõi + bảng điểm", () => {
  const r3: RosterRow[] = [{ id: "a", seat: 1, fullName: "An" }, { id: "b", seat: 2, fullName: "Bình" }, { id: "c", seat: 3, fullName: "Cường" }];
  const s3: SubRow[] = [
    sub({ id: "x1", studentId: "b", status: "in_progress", score: null, maxScore: null, answered: 2, leaveCount: 1 }),
    sub({ id: "x2", studentId: "c", attempt: 1, score: 2, maxScore: 4 }),
    sub({ id: "x3", studentId: "c", attempt: 2, status: "auto_submitted", score: 3, maxScore: 4, leaveCount: 2 }),
  ];
  it("buildMonitor lấy lượt mới nhất", () => {
    const m = buildMonitor(r3, s3, 6);
    expect(m.counts).toEqual({ chua_vao: 1, dang_lam: 1, da_nop: 0, tu_nop: 1 });
    expect(m.rows.map((r) => [r.studentId, r.state, r.answered, r.score10, r.submissionId])).toEqual([
      ["a", "chua_vao", 0, null, null],
      ["b", "dang_lam", 2, null, "x1"],
      ["c", "tu_nop", 0, 7.5, "x3"],
    ]);
    expect(m.rows[1]).toMatchObject({ total: 6, leaveCount: 1, updatedAt: T0.toISOString() });
  });
  it("resultRows lấy lượt tốt nhất", () => {
    const rows = resultRows(r3, s3);
    expect(rows.map((r) => [r.studentId, r.status, r.attempts, r.score, r.score10, r.leaveCount])).toEqual([
      ["a", null, 0, null, null, 0],
      ["b", "in_progress", 1, null, null, 1],
      ["c", "auto_submitted", 2, 3, 7.5, 2],
    ]);
    expect(bestByStudent(s3).get("c")!.id).toBe("x3");
  });
});
