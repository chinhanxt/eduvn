import { describe, expect, it } from "vitest";
import { cleanName, gradebookScore, isCorrect, liveItems, newPin, rankPlayers, scoreAnswer, streakBonus } from "../../src/domain/live";
import { mcq, short, tf } from "../helpers/fixtures";

describe("điểm trò chơi trực tiếp", () => {
  it("đúng nhanh ~1000, đúng cuối giờ ~500, sai 0, chuỗi có thưởng", () => {
    expect(scoreAnswer(true, 0, 20000, 1)).toBe(1000);
    expect(scoreAnswer(true, 20000, 20000, 1)).toBe(500);
    expect(scoreAnswer(true, 10000, 20000, 1)).toBe(750);
    expect(scoreAnswer(false, 0, 20000, 3)).toBe(0);
    expect(streakBonus(1)).toBe(0);
    expect(streakBonus(3)).toBe(100);
    expect(streakBonus(99)).toBe(250);
    expect(scoreAnswer(true, 0, 20000, 3)).toBe(1100);
  });
  it("chấm đáp án, tên, PIN, xếp hạng, thang 10", () => {
    const [c, , t] = liveItems([mcq(), tf(), short()]).slice(0, 3);
    expect(isCorrect({ kind: "choice", q: "", options: ["a", "b"], answer: 1, explain: "" }, { choice: 1 })).toBe(true);
    expect(isCorrect(c!, { choice: 3 })).toBe(false);
    expect(isCorrect({ kind: "text", q: "", answer: "1,5", explain: "" }, { text: " 1.5 " })).toBe(true);
    expect(t).toBeDefined();
    expect(liveItems([mcq(), tf(), short()])).toHaveLength(6);
    expect(cleanName("  An   <b>Bình ")).toBe("An bBình");
    expect(cleanName("")).toBeNull();
    expect(cleanName("x".repeat(30))).toBeNull();
    const pin = newPin(new Set(), () => 0);
    expect(pin).toBe("100000");
    expect(newPin(new Set(["100000"]), (() => { let n = 0; return () => (n++ === 0 ? 0 : 0.5); })())).toBe("550000");
    expect(rankPlayers([{ name: "B", score: 5, correct: 1 }, { name: "A", score: 9, correct: 1 }, { name: "C", score: 5, correct: 2 }]).map((p) => p.name)).toEqual(["A", "C", "B"]);
    expect(gradebookScore(7, 10)).toBe(7);
    expect(gradebookScore(2, 3)).toBe(6.7);
  });
});
