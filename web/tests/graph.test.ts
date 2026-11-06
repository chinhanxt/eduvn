// web/tests/graph.test.ts
import { describe, expect, it } from "vitest";
import { autoView, compileExpr, samplePath, ticks } from "../src/board/graph";
import { hitStroke, strokePath } from "../src/board/ink";

describe("compileExpr", () => {
  it("y = … và f(x) = … ; nhận tham số", () => {
    const a = compileExpr("y=x^2-3");
    expect(a.ok && a.f(2, {})).toBe(1);
    const b = compileExpr("A\\sin x+B");
    expect(b.ok && b.params).toEqual(["A", "B"]);
    expect(b.ok && b.f(Math.PI / 2, { A: 2, B: 1 })).toBeCloseTo(3);
    const c = compileExpr("f(x)=\\frac{x^2-3}{x+1}");
    expect(c.ok && c.f(2, {})).toBeCloseTo(1 / 3);
  });
  it("công thức hỏng hoặc không phải hàm y = … → báo lỗi tiếng Việt", () => {
    expect(compileExpr("\\frac{").ok).toBe(false);
    const r = compileExpr("x^2+y^2=4");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("y =");
  });
});

describe("samplePath", () => {
  const v = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  const b = { x: 0, y: 0, w: 500, h: 500 };
  it("1/x tách thành 2 nhánh ở tiệm cận", () => {
    expect((samplePath((x) => 1 / x, v, b).match(/M/g) ?? []).length).toBe(2);
  });
  it("√x chỉ vẽ phần xác định", () => {
    const d = samplePath((x) => Math.sqrt(x), v, b);
    expect(d.startsWith("M250.0")).toBe(true);
  });
});

it("ticks đẹp", () => expect(ticks(-4, 5)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5]));
it("autoView bao đỉnh parabol và trục hoành", () => {
  const v = autoView([(x) => x * x - 3], -5, 5);
  expect(v.yMin).toBeLessThan(-3);
  expect(v.yMax).toBeGreaterThan(5);
  expect(v.yMax).toBeLessThanOrEqual(30);
});

describe("ink", () => {
  it("strokePath ra đường kín", () => {
    const d = strokePath([10, 10, 50, 40, 90, 20], 4);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });
  it("hitStroke theo đoạn thẳng, không chỉ theo điểm", () => {
    expect(hitStroke([0, 0, 100, 0], 50, 5, 8)).toBe(true);
    expect(hitStroke([0, 0, 100, 0], 50, 20, 8)).toBe(false);
  });
});
