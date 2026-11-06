// server/src/export/mathDocx.ts
import { Math as OMath, type ParagraphChild, TextRun } from "docx";
import { latexToMath } from "docx/math";
import { latexToPlain, splitMath } from "../domain/mathText";

const BB: Record<string, string> = { R: "ℝ", N: "ℕ", Z: "ℤ", Q: "ℚ", C: "ℂ" };

/** Sửa trước các lệnh mà latexToMath của docx chưa hiểu đúng (đã thử 2026-11-06). */
export function prepareLatex(latex: string): string {
  return latex.replace(/\\mathbb\s*\{?([A-Z])\}?/g, (_m, c: string) => BB[c] ?? c);
}

/** Chuỗi có công thức $…$ → các run cho Paragraph: chữ là TextRun, công thức là phương trình Word sửa được. */
export function mathRuns(s: string, style: { bold?: boolean } = {}): ParagraphChild[] {
  return splitMath(s).map((seg) => {
    if (seg.kind === "text") return new TextRun({ text: seg.value, bold: style.bold });
    try {
      return new OMath({ children: [...latexToMath(prepareLatex(seg.value))] });
    } catch {
      return new TextRun({ text: latexToPlain(seg.value), bold: style.bold });
    }
  });
}
