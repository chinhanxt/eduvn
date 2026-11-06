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

describe("mã hoá ↔ giải mã chữ có dấu \\ không mất chữ", () => {
  const texts = ["a", "a\\", "a\\\\", "a\\\\\\", "a\\b", "a\\\\b", "giá $5", "a\\$", "a\\\\$b", "\\"];
  it.each(texts)("chữ %j đứng trước công thức", (t) => {
    const segs = [{ kind: "text" as const, value: t }, { kind: "math" as const, value: "x^2" }];
    expect(splitMath(joinSegments(segs))).toEqual(segs);
  });
  it.each(texts)("chữ %j đứng một mình", (t) => {
    const segs = [{ kind: "text" as const, value: t }];
    expect(splitMath(joinSegments(segs))).toEqual(segs);
  });
  it("công thức giữa hai đoạn chữ", () => {
    const segs = [{ kind: "text" as const, value: "Tính \\$" }, { kind: "math" as const, value: "\\frac{1}{2}" }, { kind: "text" as const, value: " đồng" }];
    expect(splitMath(joinSegments(segs))).toEqual(segs);
  });
});

