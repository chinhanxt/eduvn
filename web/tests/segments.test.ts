import { describe, expect, it } from "vitest";
import { isSafeLatex, joinSegments, splitMath } from "../src/math/segments";

describe("segments — dấu \\ trước $", () => {
  it("\\\\$ = dấu \\ thường + mở công thức; \\$ vẫn là đô la thường", () => {
    expect(splitMath("a\\\\$x$")).toEqual([{ kind: "text", value: "a\\" }, { kind: "math", value: "x" }]);
    expect(splitMath("giá \\$5")).toEqual([{ kind: "text", value: "giá $5" }]);
  });
});

describe("segments", () => {
  it("tách như server", () => {
    expect(splitMath("Cho $f(x)$, giá 5\\$")).toEqual([
      { kind: "text", value: "Cho " },
      { kind: "math", value: "f(x)" },
      { kind: "text", value: ", giá 5$" },
    ]);
  });
  it("ghép lại giữ nguyên", () => {
    const s = "Cho $f(x)=x^2$, giá 5\\$";
    expect(joinSegments(splitMath(s))).toBe(s);
  });
  it("chặn lệnh LaTeX có thể chèn liên kết/HTML", () => {
    expect(isSafeLatex("\\frac{1}{2}")).toBe(true);
    expect(isSafeLatex("\\href{javascript:alert(1)}{x}")).toBe(false);
    expect(isSafeLatex("\\htmlData{a=b}{x}")).toBe(false);
  });
});
