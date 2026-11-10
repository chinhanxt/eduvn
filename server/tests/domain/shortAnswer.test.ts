// server/tests/domain/shortAnswer.test.ts
import { describe, expect, it } from "vitest";
import { MATH_RULES, scoreItem } from "../../src/domain/scoring";
import { acceptedAnswers, matchShortAnswer, normalizeAnswer, parseNumber } from "../../src/domain/shortAnswer";
import { short } from "../helpers/fixtures";

describe("normalizeAnswer", () => {
  it.each([
    [" 1 , 5 ", "1.5"],
    ["1{,}5", "1.5"],
    ["$\\frac{3}{2}$", "(3)/(2)"],
    ["\\dfrac32", "(3)/(2)"],
    ["-\\frac{\\sqrt{3}}{2}", "-(sqrt(3))/(2)"],
    ["\\sqrt2", "sqrt(2)"],
    ["x^{2}", "x^2"],
    ["\\left(1;2\\right)", "(1;2)"],
    ["x \\le 3", "x<=3"],
    ["2\\pi", "2π"],
    ["−4", "-4"],
    ["ABC", "abc"],
  ])("%s → %s", (raw, out) => expect(normalizeAnswer(raw)).toBe(out));
});

describe("parseNumber", () => {
  it.each([
    ["1.5", 1.5],
    ["-2", -2],
    [".5", 0.5],
    ["(3)/(2)", 1.5],
    ["-(9)/(4)", -2.25],
    ["(-3)/2", -1.5],
    ["3/0", null],
    ["x=3", null],
    ["sqrt(2)", null],
  ])("%s → %s", (s, n) => expect(parseNumber(s)).toBe(n));
});

describe("matchShortAnswer", () => {
  it("số: dấu phẩy, phân số, sai số tương đối 1e-9", () => {
    expect(matchShortAnswer("1.5", "1,5")).toBe(true);
    expect(matchShortAnswer("\\frac{3}{2}", "1,5")).toBe(true);
    expect(matchShortAnswer("1{,}5", "$\\frac32$")).toBe(true);
    expect(matchShortAnswer("-\\frac{9}{4}", "-2,25")).toBe(true);
    expect(matchShortAnswer("0,30000000000000004", "0,3")).toBe(true);
    expect(matchShortAnswer("1000000,5", "1000000,4")).toBe(false);
    expect(matchShortAnswer("1,6", "1,5")).toBe(false);
  });
  it("chữ: NFC, hoa thường, khoảng trắng; dấu tiếng Việt vẫn phải đúng", () => {
    expect(matchShortAnswer("Hà Nội".normalize("NFD"), "hà nội")).toBe(true);
    expect(matchShortAnswer("ha noi", "Hà Nội")).toBe(false);
    expect(matchShortAnswer("\\sqrt{3}", "$\\sqrt3$")).toBe(true);
  });
  it("nhiều đáp án tách bằng |; rỗng không bao giờ đúng", () => {
    expect(acceptedAnswers("x=3 | 3 ||")).toEqual(["x=3", "3"]);
    expect(matchShortAnswer("3", "x=3|3")).toBe(true);
    expect(matchShortAnswer("x = 3", "x=3|3")).toBe(true);
    expect(matchShortAnswer("", "x=3|3")).toBe(false);
    expect(matchShortAnswer("   ", "")).toBe(false);
  });
  it("quy ước số Việt Nam: chấm = hàng nghìn khi đúng nhóm 3", () => {
    expect(matchShortAnswer("2.000", "2000")).toBe(true);
    expect(matchShortAnswer("2.000", "2")).toBe(false);
    expect(matchShortAnswer("1.250.000", "1250000")).toBe(true);
    expect(matchShortAnswer("1 000", "1000")).toBe(true);
    expect(matchShortAnswer("2,5", "2.5")).toBe(true);
    expect(matchShortAnswer("1.250,5", "1250.5")).toBe(true);
    expect(matchShortAnswer("0.25", "0,25")).toBe(true);
    expect(matchShortAnswer("0.250", "0.25")).toBe(true);
    expect(matchShortAnswer("0.250", "250")).toBe(false);
    expect(matchShortAnswer("-1.000", "-1000")).toBe(true);
  });
  it("căn: √3/2, sqrt(3)/2, \\frac{\\sqrt3}{2} như nhau; ngoặc lệch không là số; \\| là dấu |", () => {
    expect(matchShortAnswer("√3/2", "\\frac{\\sqrt3}{2}")).toBe(true);
    expect(matchShortAnswer("sqrt(3)/2", "\\frac{\\sqrt{3}}{2}")).toBe(true);
    expect(matchShortAnswer("√(3)/2", "sqrt(3)/2")).toBe(true);
    expect(matchShortAnswer("‐4", "-4")).toBe(true);
    expect(parseNumber("(3/2")).toBeNull();
    expect(acceptedAnswers("\\|x\\|=2|x=±2")).toEqual(["|x|=2", "x=±2"]);
    expect(matchShortAnswer("|x|=2", "\\|x\\|=2|x=±2")).toBe(true);
  });
  it("scoreItem dùng luật mới", () => {
    expect(scoreItem(short({ answer: "$\\frac{3}{2}$|1,5" }), "\\frac{3}{2}", MATH_RULES)).toBe(0.5);
    expect(scoreItem(short({ answer: "1,5" }), "3/2", MATH_RULES)).toBe(0.5);
    expect(scoreItem(short({ answer: "1,5" }), "2", MATH_RULES)).toBe(0);
  });
});
