import { describe, expect, it } from "vitest";
import { viToLatex } from "../src/math/viToLatex";

describe("viToLatex", () => {
  it.each([
    ["y bằng x bình phương trừ ba", "y=x^{2}-3"],
    ["trừ chín phần tư", "-\\frac{9}{4}"],
    ["căn bậc hai của x cộng một", "\\sqrt{x}+1"],
    ["x lớn hơn hoặc bằng hai phẩy năm", "x\\ge 2{,}5"],
    ["sin bình phương x cộng cos bình phương x bằng một", "\\sin^{2} x+\\cos^{2} x=1"],
    ["năm cộng hai căn hai", "5+2\\sqrt{2}"],
    ["x mũ ba trừ ba x cộng một", "x^{3}-3x+1"],
    ["mở ngoặc x cộng một đóng ngoặc bình phương", "\\left(x+1\\right)^{2}"],
  ])("%s", (vi, latex) => expect(viToLatex(vi)).toBe(latex));
});
