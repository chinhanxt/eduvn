// server/tests/domain/assignment.test.ts
import { describe, expect, it } from "vitest";
import {
  AssignmentInput,
  Answers,
  answeredCount,
  computeDeadline,
  displayOrder,
  gradeAnswers,
  isExpired,
  pickVariant,
  publicItems,
  resolveSettings,
  resultLevel,
  reviewItems,
  saveCutoff,
  studentState,
  toScore10,
} from "../../src/domain/assignment";
import { MATH_RULES } from "../../src/domain/scoring";
import { SECTION_ORDER, makeVariants } from "../../src/domain/variants";
import { essay, mcq, short, stored, tf } from "../helpers/fixtures";

const QS = [
  stored(mcq({ explanation: "Vì 2 + 2 = 4" }), "m1"),
  stored(mcq({ stem: "Câu 2", answer: 2 }), "m2"),
  stored(mcq({ stem: "Câu 3", answer: 1 }), "m3"),
  stored(tf(), "t1"),
  stored(short(), "s1"),
  stored(essay(), "e1"),
];
const [V1, V2] = makeVariants(QS, 2, 7);
const NOW = new Date("2026-11-10T07:00:00Z");
const uuid = "11111111-1111-4111-8111-111111111111";

describe("cài đặt bài giao", () => {
  it("mặc định theo loại bài, thời lượng theo đề", () => {
    const p = AssignmentInput.parse({ title: "KT 15 phút", source: { examId: uuid }, dueAt: "2026-11-10T09:00:00+07:00" });
    const r = resolveSettings(p, new Date("2026-11-09T23:00:00Z"), 45);
    expect(r).toEqual({ ok: true, settings: { kind: "test", opensAt: new Date("2026-11-09T23:00:00Z"), dueAt: new Date("2026-11-10T02:00:00Z"), durationMinutes: 45, attemptsAllowed: 1, showSolution: "after_due", shuffle: false } });
    const q = AssignmentInput.parse({ title: "Luyện", kind: "practice", source: { questionIds: [uuid] }, dueAt: "2026-11-12T00:00:00Z", durationMinutes: null });
    const r2 = resolveSettings(q, NOW, null);
    expect(r2.ok && r2.settings).toMatchObject({ durationMinutes: null, attemptsAllowed: 3, showSolution: "after_submit" });
  });
  it("báo lỗi hạn nộp", () => {
    const p = AssignmentInput.parse({ title: "x", source: { examId: uuid }, opensAt: "2026-11-10T08:00:00Z", dueAt: "2026-11-10T06:00:00Z" });
    expect(resolveSettings(p, NOW, 45)).toEqual({ ok: false, issues: ["Hạn nộp phải sau giờ mở bài", "Hạn nộp phải ở tương lai"] });
    expect(AssignmentInput.safeParse({ title: "x", source: { examId: uuid, questionIds: [uuid] }, dueAt: "2026-11-10T09:00:00Z" }).success).toBe(false);
    expect(AssignmentInput.safeParse({ title: "x", source: { examId: uuid }, dueAt: "10/11/2026" }).success).toBe(false);
  });
});

describe("mã đề, thứ tự câu, câu gửi HS", () => {
  it("chia mã đề theo số thứ tự; chưa có số thì theo id (ổn định)", () => {
    expect([1, 2, 3, 4].map((s) => pickVariant([V1!, V2!], s, "x").code)).toEqual(["101", "102", "101", "102"]);
    expect(pickVariant([V1!, V2!], null, "abc").code).toBe(pickVariant([V1!, V2!], null, "abc").code);
  });
  it("đảo câu giữ thứ tự phần, tái lập theo seed", () => {
    expect(displayOrder(V1!, false, 1)).toEqual([1, 2, 3, 4, 5, 6]);
    const o = displayOrder(V1!, true, 99);
    expect(o).toEqual(displayOrder(V1!, true, 99));
    expect([...o].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    const sec = o.map((no) => SECTION_ORDER.indexOf(V1!.items.find((i) => i.no === no)!.section));
    expect(sec).toEqual([...sec].sort());
    const seeds = Array.from({ length: 20 }, (_, i) => displayOrder(V1!, true, i).slice(0, 3).join());
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
  it("câu gửi HS không lộ đáp án, lời giải, hướng dẫn chấm", () => {
    const items = publicItems(V1!, displayOrder(V1!, false, 0), MATH_RULES);
    const json = JSON.stringify(items);
    for (const k of ['"answer"', '"explanation"', '"rubric"', '"questionId"', '"points":1,']) expect(json).not.toContain(k);
    expect(items.map((i) => i.type)).toEqual(["mcq", "mcq", "mcq", "true_false", "short_answer", "essay"]);
    expect(items[0]).toMatchObject({ no: 1, maxPoints: 0.25 });
    expect(items[0]!.type === "mcq" && items[0]!.options).toHaveLength(4);
    expect(items[5]).toMatchObject({ type: "essay", maxPoints: 1 });
  });
});

describe("thời gian", () => {
  it("hạn = min(bắt đầu + thời lượng, hạn nộp); ân hạn 30 giây", () => {
    const due = new Date("2026-11-10T08:00:00Z");
    expect(computeDeadline(NOW, 45, due)).toEqual(new Date("2026-11-10T07:45:00Z"));
    expect(computeDeadline(NOW, 90, due)).toEqual(due);
    expect(computeDeadline(NOW, null, due)).toEqual(due);
    const dl = new Date("2026-11-10T07:45:00Z");
    expect(isExpired(dl, new Date("2026-11-10T07:45:30Z"))).toBe(false);
    expect(isExpired(dl, new Date("2026-11-10T07:45:31Z"))).toBe(true);
    expect(saveCutoff(new Date("2026-11-10T07:45:30Z"))).toEqual(dl);
  });
});

describe("chấm bài nộp", () => {
  const key = (no: number) => V1!.items.find((i) => i.no === no)!.question;
  it("chấm đủ dạng, tự luận chờ chấm, ghi lựa chọn", () => {
    const m1 = key(1);
    const answers = Answers.parse({
      "1": m1.type === "mcq" ? m1.answer : 0,
      "2": 3,
      "4": [true, false, null, true],
      "5": "\\frac{3}{2}",
      "6": "Giả sử √2 = p/q…",
    });
    const g = gradeAnswers(V1!, answers, MATH_RULES);
    expect(g.pending).toBe(1);
    expect(g.maxScore).toBe(3.25);
    const byNo = new Map(g.items.map((i) => [i.no, i]));
    expect(byNo.get(1)).toMatchObject({ points: 0.25, correct: true, questionId: expect.any(String), topic: "Mệnh đề", level: "NB", type: "mcq" });
    expect(byNo.get(3)).toMatchObject({ points: 0, correct: false, choice: null });
    expect(byNo.get(4)).toMatchObject({ points: 0.5, correct: false, choice: "ĐS_Đ" });
    expect(byNo.get(5)).toMatchObject({ points: 0.5, correct: true, choice: "\\frac{3}{2}" });
    expect(byNo.get(6)).toMatchObject({ points: null, correct: null, choice: null });
    const m2 = key(2);
    expect(byNo.get(2)!.choice).toBe(m2.type === "mcq" ? m2.options[3] : "");
    expect(g.score).toBe(g.items.reduce((s, i) => s + (i.points ?? 0), 0));
    expect(answeredCount({ ...answers, "99": 1 }, V1!)).toBe(4);
    expect(toScore10(g.score, g.maxScore)).toBe(Math.round((g.score / 3.25) * 1000) / 100);
    expect(toScore10(1, 0)).toBeNull();
  });
  it("từ chối đáp án sai kiểu", () => {
    expect(Answers.safeParse({ "1": 4 }).success).toBe(false);
    expect(Answers.safeParse({ a: 1 }).success).toBe(false);
    expect(Answers.safeParse({ "4": [true, false] }).success).toBe(false);
    expect(Answers.safeParse({ "5": "x".repeat(5001) }).success).toBe(false);
  });
});

describe("phần HS được xem", () => {
  const due = new Date("2026-11-10T08:00:00Z");
  it("mức xem theo show_solution", () => {
    expect(resultLevel("after_submit", due, NOW)).toBe("full");
    expect(resultLevel("after_due", due, NOW)).toBe("marks");
    expect(resultLevel("after_due", due, due)).toBe("marks");
    expect(resultLevel("after_due", due, new Date(due.getTime() + 30_000))).toBe("marks");
    expect(resultLevel("after_due", due, new Date(due.getTime() + 30_001))).toBe("full");
    expect(resultLevel("never", due, due)).toBe("score");
  });
  it("reviewItems: full có đáp án + lời giải; marks không; rubric chỉ cho GV", () => {
    const answers = { "1": 1 };
    const g = gradeAnswers(V1!, answers, MATH_RULES);
    const graded = new Map(g.items.map((i) => [i.no, i]));
    const order = displayOrder(V1!, false, 0);
    const full = reviewItems(V1!, order, MATH_RULES, answers, graded, "full");
    const m1 = full.find((i) => i.no === 1)!;
    expect(m1.key).toMatch(/^[ABCD]$/);
    expect(m1.response).toBe(1);
    expect(full.find((i) => i.no === 6)!.rubric).toBeUndefined();
    expect(reviewItems(V1!, order, MATH_RULES, answers, graded, "full", true).find((i) => i.no === 6)!.rubric).toContain("phản chứng");
    const marks = reviewItems(V1!, order, MATH_RULES, answers, graded, "marks");
    expect(JSON.stringify(marks)).not.toMatch(/"key"|"explanation"|"rubric"/);
    expect(marks.find((i) => i.no === 4)!.points).toBe(0);
    const score = reviewItems(V1!, order, MATH_RULES, answers, graded, "score");
    expect(score.every((i) => i.points === null && i.correct === null)).toBe(true);
  });
});

describe("trạng thái bài của HS", () => {
  const a = { opensAt: new Date("2026-11-10T06:00:00Z"), dueAt: new Date("2026-11-10T08:00:00Z"), status: "published" as const, attemptsAllowed: 2 };
  it.each([
    ["chưa mở", { ...a, opensAt: new Date("2026-11-10T07:30:00Z") }, [], { state: "chua_mo", canStart: false }],
    ["chưa làm", a, [], { state: "chua_lam", canStart: true }],
    ["đang làm", a, [{ status: "in_progress" }], { state: "dang_lam", canStart: true }],
    ["đã nộp, còn lượt", a, [{ status: "submitted" }], { state: "da_nop", canStart: true }],
    ["đã nộp, hết lượt", a, [{ status: "submitted" }, { status: "auto_submitted" }], { state: "da_nop", canStart: false }],
    ["quá hạn", { ...a, dueAt: new Date("2026-11-10T06:30:00Z") }, [], { state: "qua_han", canStart: false }],
    ["đã đóng", { ...a, status: "closed" as const }, [], { state: "qua_han", canStart: false }],
    ["đang làm nhưng bài đã đóng", { ...a, status: "closed" as const }, [{ status: "in_progress" }], { state: "qua_han", canStart: false }],
    ["đang làm nhưng bài nháp", { ...a, status: "draft" as const }, [{ status: "in_progress" }], { state: "qua_han", canStart: false }],
    ["đang làm, quá hạn lượt + ân hạn", a, [{ status: "in_progress", deadlineAt: new Date("2026-11-10T06:59:29Z") }], { state: "qua_han", canStart: false }],
    ["đang làm, trong ân hạn", a, [{ status: "in_progress", deadlineAt: new Date("2026-11-10T06:59:31Z") }], { state: "dang_lam", canStart: true }],
  ] as const)("%s", (_n, asg, subs, out) => expect(studentState(asg, subs, NOW)).toEqual(out));
});
