import { describe, expect, it } from "vitest";
import { coerceField, cqwToPx, gradeQuestion, splitCues } from "../src/ailesson/pure";
import { interactiveDoc } from "../../server/src/export/interactiveHtml";
import { elementHtml, listifyHtml, mathInline, quizHtml, richInline, slideHtml } from "../../server/src/export/slideHtml";

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

describe("form thư viện hoạt hình", () => {
  it("ép giá trị theo kiểu của ví dụ", () => {
    expect(coerceField(2, "3.5")).toBe(3.5);
    expect(coerceField("a", "xin chào")).toBe("xin chào");
    expect(coerceField(true, false)).toBe(false);
    expect(coerceField([], "[[1,2],[3,4]]")).toEqual([[1, 2], [3, 4]]);
    expect(() => coerceField({}, "{sai")).toThrow();
  });
});

describe("sửa demo 11/11 — chữ quiz/slide", () => {
  it("'0,10 (hay 1/10)' là chữ, không bị KaTeX bắt; công thức rõ vẫn dựng", () => {
    expect(mathInline("0,10 (hay 1/10)", latex)).toBe("0,10 (hay 1/10)");
    expect(mathInline("Xác suất 5/8 và 3/8", latex)).toBe("Xác suất 5/8 và 3/8");
    expect(mathInline("Giải x + 1 = 0 nhé", latex)).toBe("Giải <i>x + 1 = 0</i> nhé");
    expect(mathInline("(2x - 3y)^2", latex)).toBe("<i>(2x - 3y)^2</i>");
  });
  it("gạch đầu dòng viết liền thành danh sách thật; dấu trừ trong công thức không bị tách", () => {
    const q = "Kết quả khảo sát: - Nam: 18 bạn thích, 6 bạn không thích. - Nữ: 4 bạn thích, 12 bạn không thích. Chọn ngẫu nhiên một bạn. Biết bạn đó là nữ, tính xác suất?";
    const h = richInline(q, latex);
    expect(h).toContain('<ul class="bl"><li>Nam: 18 bạn thích, 6 bạn không thích.</li><li>Nữ: 4 bạn thích, 12 bạn không thích.</li></ul>');
    expect(h).toContain('<span class="lead">Kết quả khảo sát:</span>');
    expect(h).toContain('<span class="tail">Chọn ngẫu nhiên một bạn. Biết bạn đó là nữ, tính xác suất?</span>');
    expect(richInline("Tính $a - B$ và x - Y", latex)).not.toContain("<ul");
    expect(richInline("Dòng đầu\n- Một\n- Hai", latex)).toContain("<li>Một</li><li>Hai</li>");
  });
  it("slide: đoạn <p> có gạch đầu dòng viết liền / chuỗi <p>- …</p> thành <ul>", () => {
    expect(listifyHtml("<p>Ví dụ: - Nam: 18 - Nữ: 4</p>")).toBe("<p>Ví dụ:</p><ul><li>Nam: 18</li><li>Nữ: 4</li></ul>");
    expect(listifyHtml("<p>- Một ý</p><p>- Hai ý</p><p>Kết</p>")).toBe("<ul><li>Một ý</li><li>Hai ý</li></ul><p>Kết</p>");
    expect(listifyHtml('<p><span style="x">Có: - Nam: 1 - Nữ: 2</span></p>')).toBe('<p><span style="x">Có: - Nam: 1 - Nữ: 2</span></p>');
    const html = slideHtml({ elements: [{ id: "t", type: "text", left: 0, top: 0, width: 500, height: 80, content: "<p>Lớp: - Nam: 18 - Nữ: 4</p>" }] }, { latex });
    expect(html).toContain("<ul><li>Nam: 18</li><li>Nữ: 4</li></ul>");
  });
  it("cảnh tương tác: shim bộ nhớ chèn đầu <head>, trước mọi script của AI", () => {
    const d = interactiveDoc("<!DOCTYPE html><html><head><script>localStorage.setItem('a','1')</script></head><body></body></html>");
    expect(d.indexOf("data-eduvn-shim")).toBeLessThan(d.indexOf("localStorage.setItem"));
    expect(interactiveDoc(d)).toBe(d);
    expect(interactiveDoc("<div>x</div>").startsWith("<script data-eduvn-shim>")).toBe(true);
  });
});
