import { describe, expect, it } from "vitest";
import { buildGame } from "../../src/domain/games";
import { renderGameHtml } from "../../src/export/game";
import { essay, mcq, short, tf } from "../helpers/fixtures";

describe("buildGame", () => {
  it("cần ≥ 4 câu dùng được (tự luận bị bỏ)", () => {
    const r = buildGame("quiz", [mcq(), mcq(), mcq(), essay()], { source: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toContain("hiện chỉ có 3 (bỏ qua 1 câu tự luận)");
  });
  it("true_false thành 4 mục Đúng/Sai; short_answer thành mục gõ", () => {
    const r = buildGame("quiz", [mcq(), tf(), short(), mcq()], { source: "x", timerSeconds: 20 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.body.items).toHaveLength(1 + 4 + 1 + 1);
    expect(r.body.items[1]).toMatchObject({ kind: "choice", options: ["Đúng", "Sai"], answer: 0 });
    expect(r.body.items[2]).toMatchObject({ answer: 1 });
    expect(r.body.items.find((i) => i.kind === "text")).toMatchObject({ answer: "1,5" });
    expect(r.body.timerSeconds).toBe(20);
  });
});

describe("renderGameHtml", () => {
  it("một file tự chứa, thoát ký tự nguy hiểm, không gọi mạng", () => {
    const evil = '</script><img src=x onerror=alert(1)> "&\u2028';
    const r = buildGame("quiz", [mcq({ stem: evil }), mcq(), mcq(), mcq({ options: [evil, "b", "c", "d"] })], { source: "x" });
    if (!r.ok) throw new Error("fixture");
    const html = renderGameHtml(evil, r.body);
    expect(html).not.toContain("</script><img");
    expect(html).not.toMatch(/<img/);
    expect(html).toContain("&lt;/script&gt;");
    expect(html).toContain("\\u003c/script\\u003e");
    expect(html).not.toMatch(/(src|href)=["']?https?:/);
    expect(html).not.toContain("innerHTML");
    expect(html.match(/<script/g)).toHaveLength(2);
    expect(html).toContain("Chơi lại");
  });
});

describe("công thức trong trò chơi", () => {
  it("đổi $…$ sang chữ thường ở câu hỏi, phương án, đáp án", () => {
    const qs = [mcq({ stem: "Tính $\\frac{1}{2}+\\frac{1}{4}$", options: ["$\\frac34$", "$1$", "$\\frac12$", "$x^2$"] }), mcq(), mcq(), short({ answer: "$\\sqrt2$" })];
    const r = buildGame("quiz", qs, { source: "x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.body.items[0]).toMatchObject({ q: "Tính 1/2+1/4", options: ["3/4", "1", "1/2", "x²"] });
    expect(r.body.items[3]).toMatchObject({ kind: "text", answer: "√2" });
  });
});
