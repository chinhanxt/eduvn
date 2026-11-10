import { AlignmentType, Document, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { mathRuns } from "./mathDocx";
import type { QuestionType } from "../domain/question";
import type { KeyEntry, Variant, VariantItem } from "../domain/variants";

export type ExamMeta = { title: string; subject: string; grade: number; durationMinutes: number; school?: string };

export const SECTION_TITLES: Record<QuestionType, string> = {
  mcq: "PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn",
  true_false: "PHẦN II. Câu trắc nghiệm đúng sai",
  short_answer: "PHẦN III. Câu trắc nghiệm trả lời ngắn",
  essay: "PHẦN IV. Tự luận",
};

const SECTION_ROMAN: Record<QuestionType, string> = { mcq: "I", true_false: "II", short_answer: "III", essay: "IV" };
const OPTION_LABELS = ["A", "B", "C", "D"];
const STATEMENT_LABELS = ["a", "b", "c", "d"];

function gradeLabel(grade: number): string {
  return grade <= 12 ? `Lớp ${grade}` : `Năm ${grade - 12}`;
}

function centered(text: string, bold = false): Paragraph {
  return new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold })] });
}

function indented(text: string): Paragraph {
  return new Paragraph({ indent: { left: 360 }, children: mathRuns(text) });
}

function bold(text: string, before = 240): Paragraph {
  return new Paragraph({ spacing: { before }, children: [new TextRun({ text, bold: true })] });
}

function header(meta: ExamMeta): Paragraph[] {
  return [
    ...(meta.school ? [centered(meta.school, true)] : []),
    centered(meta.title.toUpperCase(), true),
    centered(`Môn: ${meta.subject} – ${gradeLabel(meta.grade)} – Thời gian làm bài: ${meta.durationMinutes} phút`),
  ];
}

/** Kích thước PNG từ khối IHDR (byte 16–23). */
export function pngSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Hình vẽ kèm câu hỏi: căn giữa, rộng tối đa 260 px, cao tối đa 240 px (96 dpi). */
function figureParagraph(dataUrl: string): Paragraph | null {
  const data = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  const size = pngSize(data);
  if (!size) return null;
  const k = Math.min(260 / size.w, 240 / size.h, 1);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: [new ImageRun({ type: "png", data, transformation: { width: Math.round(size.w * k), height: Math.round(size.h * k) }, altText: { name: "Hình vẽ", description: "Hình vẽ kèm câu hỏi", title: "Hình vẽ" } })] });
}

function itemParagraphs(it: VariantItem): Paragraph[] {
  const q = it.question;
  const fig = q.figure ? figureParagraph(q.figure) : null;
  const head = [
    new Paragraph({
      spacing: { before: 120 },
      children: [new TextRun({ text: `Câu ${it.sectionNo}. `, bold: true }), ...mathRuns(q.stem)],
    }),
    ...(fig ? [fig] : []),
  ];
  switch (q.type) {
    case "mcq":
      return [...head, ...q.options.map((o, i) => indented(`${OPTION_LABELS[i]}. ${o}`))];
    case "true_false":
      return [...head, ...q.statements.map((s, i) => indented(`${STATEMENT_LABELS[i]}) ${s}`))];
    case "short_answer":
      return head;
    case "essay":
      return [...head, indented(`(${q.points} điểm)`)];
  }
}

export async function renderExamDocx(meta: ExamMeta, variant: Variant): Promise<Buffer> {
  const children: Paragraph[] = [
    ...header(meta),
    centered(`Mã đề: ${variant.code}`, true),
    new Paragraph({ spacing: { before: 200 }, text: "Họ và tên: ........................................................  Số báo danh: ...................." }),
  ];
  let current: QuestionType | null = null;
  for (const it of variant.items) {
    if (it.section !== current) {
      current = it.section;
      children.push(bold(SECTION_TITLES[it.section]));
    }
    children.push(...itemParagraphs(it));
  }
  children.push(new Paragraph({ spacing: { before: 240 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "------ HẾT ------", bold: true })] }));
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

function cell(text: string, isBold = false): TableCell {
  return new TableCell({ children: [new Paragraph({ children: mathRuns(text, { bold: isBold }) })] });
}

export async function renderAnswerKeyDocx(meta: ExamMeta, keys: { code: string; entries: KeyEntry[] }[]): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [...header(meta), centered("ĐÁP ÁN", true)];
  for (const k of keys) {
    children.push(bold(`Mã đề ${k.code}`));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [cell("Phần", true), cell("Câu", true), cell("Đáp án", true)] }),
          ...k.entries.map((e) => new TableRow({ children: [cell(SECTION_ROMAN[e.section]), cell(String(e.sectionNo)), cell(e.answer)] })),
        ],
      }),
    );
  }
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}
