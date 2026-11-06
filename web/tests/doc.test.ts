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
