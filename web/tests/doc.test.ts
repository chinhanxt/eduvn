// web/tests/doc.test.ts
import { describe, expect, it } from "vitest";
import { boardKeywords, graphFromExprs, newSolid } from "../src/board/doc";

describe("graphFromExprs", () => {
  it("tham số mặc định 1, giữ giá trị cũ; khung tự căn", () => {
    const g = graphFromExprs(["y=A\\sin x+B"], [-5, 5]);
    expect(g.params).toEqual({ A: 1, B: 1 });
    const g2 = graphFromExprs(["y=A\\sin x+B", "y=x^2-3"], [-4, 4], { ...g, params: { A: 2, B: 0 } });
    expect(g2.params).toEqual({ A: 2, B: 0 });
    expect(g2.exprs.map((e) => e.color)).toEqual(["#ff7a6b", "#5cc8ff"]);
    expect(g2.view.xMin).toBe(-4);
    expect(g2.id).toBe(g.id);
  });
});

describe("boardKeywords", () => {
  it("rút từ khoá từ khối, thiết diện, loại hàm", () => {
    const solid = { ...newSolid("cube"), section: ["A", "C", "C'"] as [string, string, string] };
    const kw = boardKeywords({ id: "p", objects: [solid, graphFromExprs(["y=x^2-3", "A\\sin x+B"], [-5, 5])] });
    for (const w of ["hình lập phương", "thiết diện", "đồ thị hàm số", "bậc hai", "lượng giác"]) expect(kw).toContain(w);
  });
});

import { arrowHead, moveObj, shapeD, textBox, type ShapeObj, type TextObj } from "../src/board/doc";

describe("hình phẳng và ô chữ", () => {
  const sh = (kind: ShapeObj["kind"], pts: number[]): ShapeObj => ({ type: "shape", id: "s", kind, color: "#ff7a6b", width: 3, fill: false, pts });
  it("đường viền theo loại hình", () => {
    expect(shapeD(sh("line", [0, 0, 10, 20]))).toBe("M0 0L10 20");
    expect(shapeD(sh("rect", [0, 0, 10, 20]))).toBe("M0 0H10V20H0Z");
    expect(shapeD(sh("triangle", [0, 0, 10, 20]))).toBe("M5 0L10 20L0 20Z");
    expect(shapeD(sh("polygon", [0, 0, 10, 0, 5, 8]))).toBe("M0 0L10 0L5 8Z");
    expect(shapeD(sh("circle", [0, 0, 20, 20]))).toContain("A10 10");
    expect(arrowHead(sh("arrow", [0, 0, 100, 0]))).toMatch(/^M/);
  });
  it("dời hình/ô chữ; kích thước ô chữ tăng khi có phân số", () => {
    expect(moveObj(sh("line", [0, 0, 10, 20]), 5, 7)).toEqual({ pts: [5, 7, 15, 27] });
    const t: TextObj = { type: "text", id: "t", x: 10, y: 10, size: 30, color: "#f3f0e6", text: "x+1" };
    expect(moveObj(t, 3, 4)).toEqual({ x: 13, y: 14 });
    expect(textBox({ ...t, text: "$\\frac{a}{b}$" }).h).toBeGreaterThan(textBox(t).h);
  });
});
