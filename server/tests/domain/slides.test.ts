import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { validateLessonPlan } from "../../src/domain/lesson";
import { slidesFromLessonPlan, validateDeck } from "../../src/domain/slides";
import { renderSlidesPptx } from "../../src/export/slides";
import { lessonPlan } from "../helpers/lesson";

const deck = (over: Record<string, unknown> = {}) => ({
  title: "Mệnh đề",
  slides: [
    { layout: "title", title: "Mệnh đề" },
    { layout: "bullets", title: "Khái niệm", bullets: ["Mệnh đề là câu khẳng định đúng hoặc sai"], notes: "Nhấn mạnh ví dụ" },
    { layout: "two_column", title: "So sánh", left: ["Đúng"], right: ["Sai"] },
    { layout: "section", title: "Luyện tập" },
    { layout: "quiz", title: "Câu 1", question: "Câu nào là mệnh đề?", options: ["2+2=4", "Mấy giờ rồi?", "Đóng cửa lại!", "x>1"], answer: "A" },
  ],
  ...over,
});

describe("validateDeck", () => {
  it("chấp nhận bộ slide hợp lệ", () => {
    expect(validateDeck(deck()).ok).toBe(true);
  });
  it("báo lỗi tiếng Việt: thiếu tiêu đề, quá nhiều dòng, dòng quá dài, quiz thiếu đáp án", () => {
    const r = validateDeck(
      deck({
        slides: [
          { layout: "bullets", title: "", bullets: ["a"] },
          { layout: "bullets", title: "Dài", bullets: Array.from({ length: 9 }, (_, i) => `ý ${i}`) },
          { layout: "bullets", title: "Dòng dài", bullets: ["x".repeat(141)] },
          { layout: "quiz", title: "Q", question: "?", options: ["a", "b"], answer: 5 },
          { layout: "two_column", title: "T", left: ["a"] },
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues).toContain("Slide 1 thiếu tiêu đề (title)");
    expect(r.issues.join("\n")).toContain('Slide 2 "Dài" (bullets): có 9 dòng, tối đa 8');
    expect(r.issues.join("\n")).toContain("dài 141 ký tự, tối đa 140");
    expect(r.issues.join("\n")).toContain("thiếu hoặc sai đáp án");
    expect(r.issues.join("\n")).toContain("thiếu cột phải");
  });
  it("giới hạn 1–60 slide và cần tên bộ", () => {
    expect(validateDeck({ title: "", slides: [] })).toEqual({ ok: false, issues: ["Thiếu tên bộ slide (title)", "Cần ít nhất 1 slide"] });
    const many = validateDeck({ title: "X", slides: Array.from({ length: 61 }, () => ({ layout: "section", title: "s" })) });
    expect(many.ok === false && many.issues[0]).toBe("Có 61 slide, tối đa 60");
  });
});

describe("slidesFromLessonPlan", () => {
  it("bìa, Mục tiêu, mỗi hoạt động section + nội dung, kết thúc; hợp lệ", () => {
    const v = validateLessonPlan(lessonPlan());
    if (!v.ok) throw new Error("fixture");
    const d = slidesFromLessonPlan(v.plan);
    expect(d.slides[0]).toMatchObject({ layout: "title", title: "Mệnh đề" });
    expect(d.slides[1]?.title).toBe("Mục tiêu bài học");
    expect(d.slides.filter((s) => s.layout === "section")).toHaveLength(5); // 4 hoạt động + kết thúc
    const content = d.slides.find((s) => s.title.startsWith("1."));
    expect(content?.bullets?.[0]).toMatch(/^Mục tiêu:/);
    expect(content?.notes).toContain("Chuyển giao nhiệm vụ");
    expect(d.slides.some((s) => s.title.startsWith("2.1."))).toBe(true);
    expect(validateDeck(d).ok).toBe(true);
  });
});

describe("renderSlidesPptx", () => {
  it("tạo .pptx 16:9 đủ số slide, có ghi chú và đáp án quiz", async () => {
    const v = validateDeck(deck());
    if (!v.ok) throw new Error("fixture");
    const zip = await JSZip.loadAsync(await renderSlidesPptx(v.deck));
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slides).toHaveLength(5);
    expect(await zip.file("ppt/presentation.xml")?.async("string")).toContain('cx="12192000"');
    const notes = await Promise.all(Object.keys(zip.files).filter((f) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(f)).map((f) => zip.file(f)?.async("string")));
    expect(notes.join("")).toContain("Nhấn mạnh ví dụ");
    expect(notes.join("")).toContain("Đáp án: A. 2+2=4");
  });
});

import { plainDeck } from "../../src/export/slides";

describe("plainDeck", () => {
  it("đổi công thức trong mọi chuỗi của slide", () => {
    const d = plainDeck({ title: "Hàm $y=x^2$", slides: [{ layout: "quiz", title: "Câu 1", question: "Đỉnh của $y=x^2-3$?", options: ["$(0;-3)$", "$(0;3)$"], answer: 0, bullets: ["$\\sqrt2$"] }] });
    expect(d.title).toBe("Hàm y=x²");
    expect(d.slides[0]).toMatchObject({ question: "Đỉnh của y=x²−3?", options: ["(0;−3)", "(0;3)"], bullets: ["√2"], answer: 0 });
  });
});
