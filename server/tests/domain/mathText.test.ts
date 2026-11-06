// server/tests/domain/mathText.test.ts
import { describe, expect, it } from "vitest";
import { hasBalancedMath, latexToPlain, splitMath, toPlainText } from "../../src/domain/mathText";
import { parseQuestion } from "../../src/domain/question";
import { mcq } from "../helpers/fixtures";

describe("splitMath — dấu \\ trước $", () => {
  it("\\\\$ = dấu \\ thường + mở công thức; \\$ vẫn là đô la thường", () => {
    expect(splitMath("a\\\\$x$")).toEqual([{ kind: "text", value: "a\\" }, { kind: "math", value: "x" }]);
    expect(splitMath("giá \\$5")).toEqual([{ kind: "text", value: "giá $5" }]);
    expect(hasBalancedMath("a\\\\$x$")).toBe(true);
    expect(hasBalancedMath("a\\\\$x")).toBe(false);
    expect(hasBalancedMath("giá \\$5")).toBe(true);
  });
});

describe("splitMath", () => {
  it("tách chữ và công thức", () => {
    expect(splitMath("Cho $f(x)=x^2$. Tính $f(2)$")).toEqual([
      { kind: "text", value: "Cho " },
      { kind: "math", value: "f(x)=x^2" },
      { kind: "text", value: ". Tính " },
      { kind: "math", value: "f(2)" },
    ]);
  });
  it("\\$ ngoài công thức là dấu đô la; trong công thức giữ nguyên \\$", () => {
    expect(splitMath("Giá 5\\$ và $a\\$b$")).toEqual([{ kind: "text", value: "Giá 5$ và " }, { kind: "math", value: "a\\$b" }]);
  });
  it("bỏ cặp $$ rỗng; $ chưa đóng thành chữ", () => {
    expect(splitMath("a $$ b")).toEqual([{ kind: "text", value: "a " }, { kind: "text", value: " b" }]);
    expect(splitMath("x $y")).toEqual([{ kind: "text", value: "x " }, { kind: "text", value: "$y" }]);
  });
  it("không có công thức", () => expect(splitMath("2 + 2 = 4")).toEqual([{ kind: "text", value: "2 + 2 = 4" }]));
});

describe("hasBalancedMath", () => {
  it.each([
    ["a $x$", true],
    ["a $x", false],
    ["5\\$", true],
    ["$a$ và $b$", true],
  ])("%s → %s", (s, ok) => expect(hasBalancedMath(s)).toBe(ok));
});

describe("latexToPlain", () => {
  it.each([
    ["x^2-2x+3", "x²−2x+3"],
    ["\\frac{9}{4}", "9/4"],
    ["-\\frac{9}{4}", "−9/4"],
    ["\\frac{x+1}{x-1}", "(x+1)/(x−1)"],
    ["\\sqrt2", "√2"],
    ["\\sqrt{x+1}", "√(x+1)"],
    ["\\sqrt[3]{x}", "∛x"],
    ["f\\left(\\frac12\\right)", "f(1/2)"],
    ["x\\ge 2{,}5", "x≥2,5"],
    ["\\widehat{ABC}=90^{\\circ}", "∠ABC=90°"],
    ["\\sin^2x+\\cos^2x=1", "sin²x+cos²x=1"],
    ["\\sin x", "sin x"],
    ["\\mathbb{R}\\setminus\\{1\\}", "ℝ∖{1}"],
    ["C_{n}^{k}", "Cₙᵏ"],
    ["\\begin{cases}x+y=1\\\\x-y=3\\end{cases}", "{x+y=1; x−y=3}"],
    ["\\pi", "π"],
    ["x^{n+1}", "xⁿ⁺¹"],
    ["x^{ab}", "x^(ab)"],
    ["\\text{5 cm}", "5 cm"],
    ["x\\leqslant 2", "x≤2"],
    ["x\\geqslant 2", "x≥2"],
    ["\\binom{n}{k}", "C(n, k)"],
    ["\\mathcal{A}", "A"],
    ["\\big(x\\big)", "(x)"],
    ["a\\foo b", "ab"],
    ["\\text{cosmic tangent}", "cosmic tangent"],
    ["\\sinh x", "sinh x"],
    ["\\max x", "max x"],
  ])("%s → %s", (latex, plain) => expect(latexToPlain(latex)).toBe(plain));
});

describe("toPlainText", () => {
  it("thay từng công thức bằng chữ thường", () => {
    expect(toPlainText("Cho $f(x)=x^2-2x+3$. Giá trị $f\\left(\\frac12\\right)$ bằng")).toBe("Cho f(x)=x²−2x+3. Giá trị f(1/2) bằng");
  });
});

describe("câu hỏi có công thức", () => {
  it("nhận công thức ở câu hỏi và phương án", () => {
    const q = parseQuestion(mcq({ stem: "Giá trị $f(\\frac12)$ bằng", options: ["$\\frac94$", "$-\\frac94$", "$\\frac34$", "$\\sqrt2$"] }));
    expect(q.stem).toContain("$f(\\frac12)$");
  });
  it("từ chối $ chưa đóng", () => {
    expect(() => parseQuestion(mcq({ stem: "Cho $x^2" }))).toThrow(/dấu \$/);
    expect(() => parseQuestion(mcq({ options: ["$a", "b", "c", "d"] }))).toThrow(/dấu \$/);
  });
  it("ký hiệu Hy Lạp và logic bổ sung", () => {
    expect(latexToPlain("\\rho+\\tau")).toBe("ρ+τ");
    expect(latexToPlain("p\\therefore q")).toBe("p∴q");
  });
});
