import { describe, expect, it } from "vitest";
import { ExamMatrix } from "../../src/domain/matrix";
import { buildMatrixReport } from "../../src/domain/matrixReport";
import { DEFAULT_RULES, MATH_RULES } from "../../src/domain/scoring";

const matrix = (cells: object[]) => ExamMatrix.parse({ subject: "Toán", grade: 10, cells });

describe("ma trận + đặc tả CV 7991", () => {
  it("đếm câu, điểm theo luật Toán, tỉ lệ mức độ, YCCĐ", () => {
    const r = buildMatrixReport(
      matrix([
        { topic: "Mệnh đề", level: "NB", type: "mcq", count: 12, yccd: "Nhận biết mệnh đề" },
        { topic: "Mệnh đề", level: "TH", type: "true_false", count: 2 },
        { topic: "Tập hợp", level: "VD", type: "short_answer", count: 6, yccd: "Tính số phần tử" },
      ]),
      MATH_RULES,
    );
    expect(r.totalCount).toBe(20);
    expect(r.columns.mcq.NB).toEqual({ count: 12, points: 3 });
    expect(r.columns.true_false.TH.points).toBe(2);
    expect(r.columns.short_answer.VD.points).toBe(3);
    expect(r.totalPoints).toBe(8);
    expect(r.warnings[0]).toContain("8");
    expect(r.levelRatio.NB.percent).toBe(37.5);
    expect(r.topics[0]).toMatchObject({ topic: "Mệnh đề", count: 14, points: 5, percent: 62.5 });
    expect(r.spec.find((s) => s.topic === "Mệnh đề" && s.level === "NB")?.yccd).toBe("Nhận biết mệnh đề");
    expect(r.spec).toHaveLength(3);
  });

  it("tổng 10 điểm thì không cảnh báo (18 mcq + 4 tf + 8 short Toán = 4,5+4+... )", () => {
    const r = buildMatrixReport(matrix([
      { topic: "A", level: "NB", type: "mcq", count: 12 },
      { topic: "A", level: "TH", type: "true_false", count: 4 },
      { topic: "A", level: "VD", type: "short_answer", count: 6 },
    ]), MATH_RULES);
    expect(r.totalPoints).toBe(10);
    expect(r.warnings).toEqual([]);
  });

  it("môn khác: trả lời ngắn 0,25", () => {
    const r = buildMatrixReport(matrix([{ topic: "A", level: "NB", type: "short_answer", count: 4 }]), DEFAULT_RULES);
    expect(r.totalPoints).toBe(1);
  });
});
