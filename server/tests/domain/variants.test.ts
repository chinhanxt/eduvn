import { describe, expect, it } from "vitest";
import { answerKey, gradeVariant, makeVariants } from "../../src/domain/variants";
import { essay, mcq, responsesFromKey, short, stored, tf } from "../helpers/fixtures";

const pool = [
  stored(mcq({ stem: "M1", options: ["a1", "b1", "c1", "d1"], answer: 0 }), "m1"),
  stored(mcq({ stem: "M2", options: ["a2", "b2", "c2", "d2"], answer: 1 }), "m2"),
  stored(mcq({ stem: "M3", options: ["a3", "b3", "c3", "d3"], answer: 3 }), "m3"),
  stored(tf(), "t1"),
  stored(short(), "s1"),
  stored(essay(), "e1"),
];
const byId = new Map(pool.map((q) => [q.id, q]));

describe("makeVariants", () => {
  it("tạo mã 101.. và mỗi mã chứa đủ câu", () => {
    const vs = makeVariants(pool, 3, 42);
    expect(vs.map((v) => v.code)).toEqual(["101", "102", "103"]);
    for (const v of vs) expect(v.items.map((i) => i.questionId).sort()).toEqual(pool.map((q) => q.id).sort());
  });

  it("giữ thứ tự phần I→IV, đánh số lại trong từng phần", () => {
    const [v] = makeVariants(pool, 1, 1);
    expect(v!.items.map((i) => i.section)).toEqual(["mcq", "mcq", "mcq", "true_false", "short_answer", "essay"]);
    expect(v!.items.map((i) => i.sectionNo)).toEqual([1, 2, 3, 1, 1, 1]);
    expect(v!.items.map((i) => i.no)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("trộn phương án nhưng đáp án vẫn trỏ đúng nội dung", () => {
    for (const v of makeVariants(pool, 5, 7)) {
      for (const it of v.items) {
        if (it.question.type !== "mcq") continue;
        const orig = byId.get(it.questionId);
        if (orig?.type !== "mcq") throw new Error("fixture");
        expect(it.question.options[it.question.answer]).toBe(orig.options[orig.answer]);
        expect([...it.question.options].sort()).toEqual([...orig.options].sort());
      }
    }
  });

  it("tái lập theo seed", () => {
    expect(makeVariants(pool, 2, 42)).toEqual(makeVariants(pool, 2, 42));
  });

  it("count phải ≥ 1", () => {
    expect(() => makeVariants(pool, 0, 1)).toThrow();
  });
});

describe("answerKey", () => {
  it("định dạng đáp án theo dạng câu", () => {
    const [v] = makeVariants(pool, 1, 3);
    const key = answerKey(v!);
    const bySection = (s: string) => key.filter((k) => k.section === s).map((k) => k.answer);
    for (const a of bySection("mcq")) expect(["A", "B", "C", "D"]).toContain(a);
    expect(bySection("true_false")).toEqual(["ĐSSĐ"]);
    expect(bySection("short_answer")).toEqual(["1,5"]);
    expect(bySection("essay")).toEqual(["Tự luận"]);
  });
});

describe("gradeVariant", () => {
  it("làm đúng hết = điểm tối đa phần tự động; tự luận chờ chấm", () => {
    const [v] = makeVariants(pool, 1, 5);
    const r = gradeVariant(v!, responsesFromKey(answerKey(v!)));
    expect(r.autoMax).toBe(2); // 3×0,25 + 1 + 0,25
    expect(r.total).toBe(2);
    expect(r.pendingEssay).toEqual([6]);
  });

  it("bỏ trống = 0 điểm", () => {
    const [v] = makeVariants(pool, 1, 5);
    expect(gradeVariant(v!, {}).total).toBe(0);
  });
});
