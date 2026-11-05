import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, MATH_RULES, maxPoints, normalizeShort, round2, rulesForSubject, scoreItem } from "../../src/domain/scoring";
import { essay, mcq, short, tf } from "../helpers/fixtures";

describe("scoreItem", () => {
  it("mcq: đúng 0,25, sai 0", () => {
    expect(scoreItem(mcq({ answer: 2 }), 2)).toBe(0.25);
    expect(scoreItem(mcq({ answer: 2 }), 1)).toBe(0);
    expect(scoreItem(mcq(), undefined)).toBe(0);
  });

  it("đúng/sai: bậc thang theo số ý đúng 0→0, 1→0,1, 2→0,25, 3→0,5, 4→1", () => {
    const q = tf({ answer: [true, false, false, true] });
    expect(scoreItem(q, [false, true, true, false])).toBe(0);
    expect(scoreItem(q, [true, true, true, false])).toBe(0.1);
    expect(scoreItem(q, [true, false, true, false])).toBe(0.25);
    expect(scoreItem(q, [true, false, false, false])).toBe(0.5);
    expect(scoreItem(q, [true, false, false, true])).toBe(1);
  });

  it("đúng/sai: bài làm thiếu ý → 0", () => {
    expect(scoreItem(tf(), [true, false])).toBe(0);
    expect(scoreItem(tf(), null)).toBe(0);
  });

  it("trả lời ngắn: chuẩn hoá dấu phẩy, khoảng trắng, hoa thường", () => {
    const q = short({ answer: "1,5" });
    expect(scoreItem(q, " 1.5 ")).toBe(0.25);
    expect(scoreItem(q, "1,6")).toBe(0);
    expect(scoreItem(q, "1.5", MATH_RULES)).toBe(0.5);
  });

  it("tự luận: không chấm tự động", () => {
    expect(scoreItem(essay(), "bài làm")).toBeNull();
  });
});

describe("helpers", () => {
  it("normalizeShort", () => {
    expect(normalizeShort(" -1, 5 ")).toBe("-1.5");
    expect(normalizeShort("ABC")).toBe("abc");
  });

  it("round2", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(0.25 * 3 + 0.1)).toBe(0.85);
  });

  it("maxPoints", () => {
    expect(maxPoints(mcq(), DEFAULT_RULES)).toBe(0.25);
    expect(maxPoints(tf(), DEFAULT_RULES)).toBe(1);
    expect(maxPoints(short(), MATH_RULES)).toBe(0.5);
    expect(maxPoints(essay({ points: 2 }), DEFAULT_RULES)).toBe(2);
  });

  it("rulesForSubject: môn Toán (mọi kiểu viết) dùng 0,5đ trả lời ngắn", () => {
    expect(rulesForSubject("Toán")).toBe(MATH_RULES);
    expect(rulesForSubject("TOÁN HỌC")).toBe(MATH_RULES);
    expect(rulesForSubject("toan")).toBe(MATH_RULES);
    expect(rulesForSubject("Ngữ văn")).toBe(DEFAULT_RULES);
  });
});

describe("normalizeShort unicode", () => {
  it("NFC và NFD của cùng chuỗi được chấm đúng", () => {
    const q = short({ answer: "Hà Nội".normalize("NFC") });
    expect(scoreItem(q, "Hà Nội".normalize("NFD"))).toBe(DEFAULT_RULES.shortAnswer);
  });
});
