import { describe, expect, it } from "vitest";
import { ExamMatrix, selectQuestions } from "../../src/domain/matrix";
import { mulberry32 } from "../../src/domain/rng";
import { mcq, stored } from "../helpers/fixtures";

const pool = [
  stored(mcq({ stem: "M1" }), "md-nb-1"),
  stored(mcq({ stem: "M2" }), "md-nb-2"),
  stored(mcq({ stem: "M3" }), "md-nb-3"),
  stored(mcq({ stem: "M4", level: "TH" }), "md-th-1"),
  stored(mcq({ stem: "T1", topic: "Tập hợp" }), "th-ok"),
  stored(mcq({ stem: "T2", topic: "Tập hợp", grade: 11 }), "th-g11"),
  stored(mcq({ stem: "T3", topic: "Tập hợp", subject: "Vật lí" }), "th-ly"),
];
const m = (cells: ExamMatrix["cells"]): ExamMatrix => ({ subject: "Toán", grade: 10, cells });

describe("selectQuestions", () => {
  it("chọn đúng số câu mỗi ô", () => {
    const { selected, shortages } = selectQuestions(
      pool,
      m([
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
        { topic: "Mệnh đề", level: "TH", type: "mcq", count: 1 },
      ]),
      mulberry32(1),
    );
    expect(shortages).toEqual([]);
    expect(selected).toHaveLength(3);
    expect(selected.filter((q) => q.level === "NB")).toHaveLength(2);
    expect(selected.map((q) => q.id)).toContain("md-th-1");
  });

  it("hai ô cùng tiêu chí không lấy trùng câu", () => {
    const { selected, shortages } = selectQuestions(
      pool,
      m([
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 1 },
      ]),
      mulberry32(3),
    );
    expect(shortages).toEqual([]);
    expect(new Set(selected.map((q) => q.id)).size).toBe(3);
  });

  it("báo thiếu: ô nào, cần bao nhiêu, có bao nhiêu", () => {
    const cell = { topic: "Mệnh đề", level: "NB" as const, type: "mcq" as const, count: 4 };
    const { shortages } = selectQuestions(pool, m([cell]), mulberry32(1));
    expect(shortages).toEqual([{ cell, need: 4, have: 3 }]);
  });

  it("chỉ lấy đúng môn và lớp của ma trận", () => {
    const { selected, shortages } = selectQuestions(pool, m([{ topic: "Tập hợp", level: "NB", type: "mcq", count: 3 }]), mulberry32(1));
    expect(selected.map((q) => q.id)).toEqual(["th-ok"]);
    expect(shortages[0]?.have).toBe(1);
  });

  it("cùng seed → cùng lựa chọn", () => {
    const matrix = m([{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 }]);
    const a = selectQuestions(pool, matrix, mulberry32(9)).selected.map((q) => q.id);
    const b = selectQuestions(pool, matrix, mulberry32(9)).selected.map((q) => q.id);
    expect(a).toEqual(b);
  });
});

describe("ExamMatrix", () => {
  it("từ chối ô có count 0 và ma trận rỗng", () => {
    expect(() => ExamMatrix.parse(m([{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 0 }]))).toThrow();
    expect(() => ExamMatrix.parse(m([]))).toThrow();
  });
});
