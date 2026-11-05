import { describe, expect, it } from "vitest";
import { QuestionFilter, parseQuestion } from "../../src/domain/question";
import { essay, mcq, short, tf } from "../helpers/fixtures";

describe("parseQuestion", () => {
  it("nhận đủ 4 dạng hợp lệ", () => {
    for (const q of [mcq(), tf(), short(), essay()]) {
      expect(parseQuestion(q).type).toBe(q.type);
    }
  });

  it("tags mặc định là []", () => {
    const { tags: _t, ...noTags } = mcq();
    expect(parseQuestion(noTags).tags).toEqual([]);
  });

  it("mcq phải có đúng 4 phương án", () => {
    expect(() => parseQuestion(mcq({ options: ["a", "b", "c"] }))).toThrow();
  });

  it("mcq answer trong 0–3", () => {
    expect(() => parseQuestion(mcq({ answer: 4 }))).toThrow();
  });

  it("true_false phải có 4 ý và 4 đáp án", () => {
    expect(() => parseQuestion(tf({ answer: [true, false, true] }))).toThrow();
    expect(() => parseQuestion(tf({ statements: ["a", "b"] }))).toThrow();
  });

  it("essay cần points dương", () => {
    expect(() => parseQuestion(essay({ points: 0 }))).toThrow();
  });

  it("từ chối dạng lạ, mức độ lạ, lớp ngoài 1–16", () => {
    expect(() => parseQuestion({ ...mcq(), type: "matching" })).toThrow();
    expect(() => parseQuestion(mcq({ level: "XX" as never }))).toThrow();
    expect(() => parseQuestion(mcq({ grade: 17 }))).toThrow();
  });
});

describe("QuestionFilter", () => {
  it("ép kiểu grade/limit từ query string", () => {
    expect(QuestionFilter.parse({ subject: "Toán", grade: "10", limit: "5" })).toEqual({ subject: "Toán", grade: 10, limit: 5 });
  });

  it("bắt buộc subject và grade", () => {
    expect(() => QuestionFilter.parse({ subject: "Toán" })).toThrow();
  });
});
