import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { LEVEL_ORDER, LEVEL_VI, type MatrixReport, TYPE_ORDER, TYPE_VI } from "../domain/matrixReport";

const FONT = "Times New Roman";
const vn = (n: number) => String(n).replace(".", ",");
const num = (n: number) => (n === 0 ? "" : vn(n));

type CellOpts = { bold?: boolean; span?: number; rowSpan?: number; center?: boolean; shade?: boolean };
const c = (text: string, o: CellOpts = {}) =>
  new TableCell({
    columnSpan: o.span,
    rowSpan: o.rowSpan,
    shading: o.shade ? { type: ShadingType.CLEAR, fill: "E8EAF0", color: "auto" } : undefined,
    children: text.split("\n").map((line) => new Paragraph({ alignment: o.center ? AlignmentType.CENTER : undefined, children: [new TextRun({ text: line, bold: o.bold, size: 20 })] })),
  });
const head = (text: string, span?: number, rowSpan?: number) => c(text, { bold: true, center: true, shade: true, span, rowSpan });
const para = (text: string, bold = false, before = 120) => new Paragraph({ spacing: { before }, children: [new TextRun({ text, bold })] });

export async function renderMatrixDocx(title: string, r: MatrixReport): Promise<Buffer> {
  const gradeLabel = r.grade <= 12 ? `Lớp ${r.grade}` : `Năm ${r.grade - 12}`;

  const matrixRows: TableRow[] = [
    new TableRow({ tableHeader: true, children: [head("Chủ đề", undefined, 2), ...TYPE_ORDER.map((t) => head(TYPE_VI[t], 3)), head("Tổng số câu", undefined, 2), head("Số điểm", undefined, 2), head("Tỉ lệ %", undefined, 2)] }),
    new TableRow({ tableHeader: true, children: TYPE_ORDER.flatMap(() => LEVEL_ORDER.map((l) => head(l))) }),
  ];
  for (const t of r.topics)
    matrixRows.push(new TableRow({ children: [c(t.topic), ...TYPE_ORDER.flatMap((ty) => LEVEL_ORDER.map((l) => c(num(t.cells[ty][l].count), { center: true }))), c(String(t.count), { center: true }), c(vn(t.points), { center: true }), c(`${vn(t.percent)}%`, { center: true })] }));
  matrixRows.push(
    new TableRow({ children: [c("Tổng số câu", { bold: true, shade: true }), ...TYPE_ORDER.flatMap((ty) => LEVEL_ORDER.map((l) => c(num(r.columns[ty][l].count), { center: true, bold: true, shade: true }))), c(String(r.totalCount), { center: true, bold: true, shade: true }), c("", { shade: true }), c("", { shade: true })] }),
    new TableRow({ children: [c("Số điểm", { bold: true, shade: true }), ...TYPE_ORDER.flatMap((ty) => LEVEL_ORDER.map((l) => c(num(r.columns[ty][l].points), { center: true, bold: true, shade: true }))), c("", { shade: true }), c(vn(r.totalPoints), { center: true, bold: true, shade: true }), c("", { shade: true })] }),
    new TableRow({
      children: [
        c("Tỉ lệ %", { bold: true, shade: true }),
        ...TYPE_ORDER.flatMap((ty) => LEVEL_ORDER.map((l) => c(r.columns[ty][l].points > 0 && r.totalPoints > 0 ? vn(Math.round((r.columns[ty][l].points / r.totalPoints) * 1000) / 10) : "", { center: true, bold: true, shade: true }))),
        c("", { shade: true }),
        c("", { shade: true }),
        c(r.totalPoints > 0 ? "100%" : "", { center: true, bold: true, shade: true }),
      ],
    }),
  );

  const specRows: TableRow[] = [
    new TableRow({ tableHeader: true, children: [head("Chủ đề"), head("Mức độ"), head("Yêu cầu cần đạt"), ...TYPE_ORDER.map((t) => head(`${TYPE_VI[t]} (số câu)`))] }),
  ];
  for (const s of r.spec)
    specRows.push(new TableRow({ children: [c(s.topic), c(LEVEL_VI[s.level], { center: true }), c(s.yccd || "—"), ...TYPE_ORDER.map((t) => c(num(s.counts[t]), { center: true }))] }));

  const ratio = LEVEL_ORDER.map((l) => `${LEVEL_VI[l]} ${vn(r.levelRatio[l].percent)}% (${r.levelRatio[l].count} câu, ${vn(r.levelRatio[l].points)} điểm)`).join(" – ");

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 26 } } } },
    sections: [
      {
        properties: { page: { size: { orientation: "landscape", width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 850, right: 850 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MA TRẬN ĐỀ KIỂM TRA", bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`${title} – Môn: ${r.subject} – ${gradeLabel}`)] }),
          new Paragraph({ spacing: { before: 160 }, children: [] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: matrixRows }),
          para(`Tỉ lệ mức độ: ${ratio}`, false, 160),
          para(`Tổng: ${r.totalCount} câu, ${vn(r.totalPoints)} điểm.`),
          ...r.warnings.map((w) => para(`Lưu ý: ${w}`, true)),
          new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "BẢN ĐẶC TẢ ĐỀ KIỂM TRA", bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(`${title} – Môn: ${r.subject} – ${gradeLabel}`)] }),
          new Paragraph({ spacing: { before: 160 }, children: [] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: specRows }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
