import { AlignmentType, Document, Packer, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { Syllabus } from "../services/aiSkills";

const FONT = "Times New Roman";
const vn = (n: number) => String(n).replace(".", ",");
const cell = (text: string, o: { bold?: boolean; shade?: boolean; center?: boolean } = {}) =>
  new TableCell({
    shading: o.shade ? { type: ShadingType.CLEAR, fill: "E8EAF0", color: "auto" } : undefined,
    children: text.split("\n").map((l) => new Paragraph({ alignment: o.center ? AlignmentType.CENTER : undefined, children: [new TextRun({ text: l, bold: o.bold, size: 22 })] })),
  });
const table = (head: string[], rows: string[][]) =>
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: head.map((h) => cell(h, { bold: true, shade: true, center: true })) }), ...rows.map((r) => new TableRow({ children: r.map((t) => cell(t)) }))] });
const h = (text: string) => new Paragraph({ spacing: { before: 240, after: 80 }, children: [new TextRun({ text, bold: true })] });
const p = (text: string) => new Paragraph({ spacing: { before: 60 }, children: [new TextRun(text)] });

/** Đề cương chi tiết học phần (.docx) từ bản nháp AI đã được giảng viên duyệt. */
export async function renderSyllabusDocx(s: Syllabus): Promise<Buffer> {
  const totalW = s.assessment.reduce((a, x) => a + x.weight, 0);
  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 26 } } } },
    sections: [
      {
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ĐỀ CƯƠNG CHI TIẾT HỌC PHẦN", bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s.name.toUpperCase(), bold: true })] }),
          h("1. Thông tin chung"),
          p(`Tên học phần: ${s.name}${s.code ? ` – Mã: ${s.code}` : ""}`),
          p(`Số tín chỉ: ${s.credits}${s.level ? ` – ${s.level}` : ""}`),
          p(`Giờ tín chỉ: lí thuyết ${s.hours.lecture}; thực hành/thảo luận ${s.hours.practice}; tự học ${s.hours.selfStudy}`),
          p(`Học phần tiên quyết: ${s.prerequisites.length ? s.prerequisites.join("; ") : "Không"}`),
          h("2. Mô tả học phần"),
          p(s.description),
          h("3. Chuẩn đầu ra học phần (CLO)"),
          table(["Mã", "Chuẩn đầu ra", "Mức nhận thức"], s.clos.map((c) => [c.code, c.text, c.bloom])),
          h("4. Ma trận CLO – PLO"),
          table(["CLO", ...s.plos.map((x) => x.code)], s.clos.map((c) => [c.code, ...s.plos.map((x) => s.cloPlo.find((m) => m.clo === c.code)?.plo.find((y) => y.code === x.code)?.level ?? "")])),
          ...s.plos.map((x) => p(`${x.code}: ${x.text}`)),
          p("Mức đóng góp: I – giới thiệu; R – củng cố; M – thành thạo."),
          h("5. Đánh giá học phần"),
          table(["Thành phần", "Trọng số (%)", "Hình thức", "CLO", "Tiêu chí"], s.assessment.map((a) => [a.component, vn(a.weight), a.method, a.clos.join(", "), a.criteria])),
          p(`Tổng trọng số: ${vn(totalW)}%`),
          h("6. Kế hoạch giảng dạy"),
          table(["Tuần", "Nội dung", "CLO", "Hoạt động dạy – học", "Tự học"], s.schedule.map((w) => [String(w.week), w.topic, w.clos.join(", "), w.activities, w.selfStudy])),
          h("7. Học liệu"),
          p("Giáo trình chính:"),
          ...(s.materials.main.length ? s.materials.main : ["GV bổ sung"]).map((m) => p(`– ${m}`)),
          p("Tài liệu tham khảo:"),
          ...(s.materials.reference.length ? s.materials.reference : ["GV bổ sung"]).map((m) => p(`– ${m}`)),
          ...(s.ghiChu ? [h("Ghi chú"), p(s.ghiChu)] : []),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
