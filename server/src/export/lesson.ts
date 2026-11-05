import { AlignmentType, Document, Packer, Paragraph, TextRun } from "docx";
import { ACTIVITY_TITLES, type ActivityBody, type LessonPlan, STEP_NAMES } from "../domain/lesson";

const FONT = "Times New Roman";
const SIZE = 26; // 13pt

const p = (runs: TextRun[], opts: { center?: boolean; before?: number; indent?: number } = {}) =>
  new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : undefined, spacing: { before: opts.before ?? 60 }, indent: opts.indent ? { left: opts.indent } : undefined, children: runs });
const b = (text: string, before = 160) => p([new TextRun({ text, bold: true })], { before });
const t = (text: string, indent = 0) => p([new TextRun(text)], { indent });
/** Nội dung nhiều dòng → mỗi dòng một đoạn. */
const lines = (text: string, indent = 360) => text.split(/\r?\n/).filter((l) => l.trim() !== "").map((l) => t(l.trim(), indent));

function activityParagraphs(a: ActivityBody): Paragraph[] {
  const s = a.steps;
  const steps = [s.assign, s.perform, s.report, s.conclude];
  return [
    p([new TextRun({ text: "a) Mục tiêu: ", bold: true }), new TextRun(a.goal)], { indent: 180 }),
    p([new TextRun({ text: "b) Nội dung: ", bold: true }), new TextRun(a.content)], { indent: 180 }),
    p([new TextRun({ text: "c) Sản phẩm: ", bold: true }), new TextRun(a.product)], { indent: 180 }),
    p([new TextRun({ text: "d) Tổ chức thực hiện:", bold: true })], { indent: 180 }),
    ...steps.flatMap((txt, i) => [p([new TextRun({ text: `Bước ${i + 1}. ${STEP_NAMES[i]}: `, bold: true, italics: true }), new TextRun(txt.split(/\r?\n/)[0] ?? "")], { indent: 360 }), ...lines(txt.split(/\r?\n/).slice(1).join("\n"), 540)]),
  ];
}

export async function renderLessonDocx(plan: LessonPlan): Promise<Buffer> {
  const h = plan.header;
  const grade = h.grade !== undefined && h.grade <= 12 ? `Lớp ${h.grade}` : `Năm ${(h.grade ?? 13) - 12}`;
  const kids: Paragraph[] = [];
  if (h.school || h.department) kids.push(p([new TextRun({ text: [h.school, h.department].filter(Boolean).join(" – "), bold: true })]));
  if (h.teacher) kids.push(t(`Giáo viên: ${h.teacher}`));
  kids.push(p([new TextRun({ text: "KẾ HOẠCH BÀI DẠY", bold: true, size: 30 })], { center: true, before: 200 }));
  kids.push(p([new TextRun({ text: h.title.toUpperCase(), bold: true })], { center: true }));
  kids.push(p([new TextRun(`Môn: ${h.subject} – ${grade} – Thời lượng: ${h.periods} tiết${h.date ? ` – Ngày soạn: ${h.date}` : ""}`)], { center: true }));

  kids.push(b("I. MỤC TIÊU", 240));
  kids.push(b("1. Kiến thức", 80), ...plan.objectives.knowledge.map((x) => t(`- ${x}`, 360)));
  kids.push(b("2. Năng lực", 80));
  kids.push(p([new TextRun({ text: "Năng lực chung:", italics: true })], { indent: 180 }), ...plan.objectives.competencies.general.map((x) => t(`- ${x}`, 360)));
  kids.push(p([new TextRun({ text: "Năng lực đặc thù:", italics: true })], { indent: 180 }), ...plan.objectives.competencies.specific.map((x) => t(`- ${x}`, 360)));
  kids.push(b("3. Phẩm chất", 80), ...plan.objectives.qualities.map((x) => t(`- ${x}`, 360)));

  kids.push(b("II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU", 240), ...plan.materials.map((x) => t(`- ${x}`, 360)));

  kids.push(b("III. TIẾN TRÌNH DẠY HỌC", 240));
  plan.activities.forEach((a, i) => {
    kids.push(b(`${i + 1}. Hoạt động ${i + 1}: ${ACTIVITY_TITLES[i]}${a.name ? ` – ${a.name}` : ""}`, 200));
    if (a.subs.length > 0) {
      a.subs.forEach((s, j) => {
        kids.push(p([new TextRun({ text: `Hoạt động 2.${j + 1}${s.name ? `: ${s.name}` : ""}`, bold: true, italics: true })], { before: 120, indent: 180 }));
        kids.push(...activityParagraphs(s));
      });
    } else kids.push(...activityParagraphs(a));
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: SIZE } } } },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1701, right: 1134 } } }, children: kids }],
  });
  return Packer.toBuffer(doc);
}
