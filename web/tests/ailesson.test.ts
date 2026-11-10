import { describe, expect, it } from "vitest";
import { cqwToPx, gradeQuestion, splitCues } from "../src/ailesson/pure";
import { elementHtml, quizHtml, slideHtml } from "../../server/src/export/slideHtml";

const latex = (t: string) => `<i>${t}</i>`;

describe("bài giảng AI — module thuần", () => {
  it("chấm quiz: single, multiple, tự luận không chấm", () => {
    const q = { type: "single", question: "?", options: [{ value: "A", label: "a" }, { value: "B", label: "b" }], answer: ["B"] };
    expect(gradeQuestion(q, ["B"])).toBe("dung");
    expect(gradeQuestion(q, ["A"])).toBe("sai");
    expect(gradeQuestion({ ...q, type: "multiple", answer: ["A", "B"] }, ["B", "A"])).toBe("dung");
    expect(gradeQuestion({ type: "short_answer", question: "?", answer: ["x"] }, ["x"])).toBe("khong-cham");
  });
  it("tách phụ đề theo câu, tổng thời lượng giữ nguyên", () => {
    const c = splitCues("Chào các em, hôm nay học bài mới rất thú vị. Hãy chú ý lắng nghe nhé!", 9000);
    expect(c.reduce((n, x) => n + x.durationMs, 0)).toBe(9000);
    expect(c[0]?.startMs).toBe(0);
  });
  it("cqw → px khi lưu chữ sửa trực tiếp", () => {
    expect(cqwToPx('<span style="font-size:3.6cqw">A</span>')).toBe('<span style="font-size:36px">A</span>');
  });
  it("HTML slide: cqw, spotlight, quiz hiện đáp án, loại script", () => {
    const html = slideHtml({ elements: [{ id: "t", type: "text", left: 100, top: 50, width: 500, height: 80, content: "<p>Xin chào<script>x()</script></p>", defaultColor: "#000" }] }, { latex, focusId: "t", effect: "spotlight" });
    expect(html).toContain("left:10cqw");
    expect(html).toContain("spot");
    expect(html).not.toContain("<script>x()");
    expect(elementHtml({ id: "m", type: "latex", left: 0, top: 0, width: 100, height: 50, latex: "x^2" }, { latex })).toContain("<i>x^2</i>");
    const q = quizHtml("Quiz", [{ type: "single", question: "1+1?", options: [{ value: "A", label: "2" }], answer: ["A"], analysis: "Phép cộng" }], { latex, reveal: true });
    expect(q).toContain("Phép cộng");
  });
});
