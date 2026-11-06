// server/tests/export/mathDocx.test.ts
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { makeVariants } from "../../src/domain/variants";
import { renderExamDocx } from "../../src/export/docx";
import { mathRuns, prepareLatex } from "../../src/export/mathDocx";
import { mcq, stored } from "../helpers/fixtures";

async function xmlOf(children: Paragraph[]): Promise<string> {
  const buf = await Packer.toBuffer(new Document({ sections: [{ children }] }));
  return (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
}

describe("mathRuns", () => {
  it("chữ → w:t, công thức → m:oMath", async () => {
    const xml = await xmlOf([new Paragraph({ children: mathRuns("Cho $\\frac{9}{4}$ và $\\sqrt2$") })]);
    expect(xml).toContain("Cho ");
    expect((xml.match(/<m:oMath>/g) ?? []).length).toBe(2);
    expect(xml).toContain("<m:f>");
    expect(xml).toContain("<m:rad>");
  });
  it("LaTeX hỏng → chữ thường, không ném lỗi", async () => {
    const xml = await xmlOf([new Paragraph({ children: mathRuns("Lỗi $\\frac{1$ đây") })]);
    expect(xml).not.toContain("<m:oMath>");
    expect(xml).toContain("Lỗi ");
  });
  it("\\mathbb{R} đổi trước thành ℝ", () => {
    expect(prepareLatex("x\\in\\mathbb{R}\\setminus\\{1\\}")).toBe("x\\inℝ\\setminus\\{1\\}");
  });
});

describe("đề có công thức", () => {
  it("câu hỏi và phương án ra phương trình Word", async () => {
    const pool = [stored(mcq({ stem: "Giá trị $f\\left(\\frac{1}{2}\\right)$ bằng", options: ["$\\frac{9}{4}$", "$-\\frac{9}{4}$", "$\\frac{3}{4}$", "$\\sqrt{2}$"] }), "m1")];
    const [v] = makeVariants(pool, 1, 1);
    const buf = await renderExamDocx({ title: "KT", subject: "Toán", grade: 10, durationMinutes: 15 }, v!);
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect((xml.match(/<m:oMath>/g) ?? []).length).toBe(5);
    expect(xml).not.toContain("$");
  });
});
