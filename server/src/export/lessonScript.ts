// Kịch bản lời giảng của bài giảng AI → Markdown hoặc Word (OM-809). Công thức $…$ trong Word là phương trình sửa được.
import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { type StoredScene, estimateMs } from "../services/aiLessons/types";
import { mathRuns } from "./mathDocx";

type Q = { type: string; question: string; options?: { value: string; label: string }[]; answer?: string[]; analysis?: string };
const KIND: Record<string, string> = { slide: "Trình chiếu", quiz: "Câu hỏi", interactive: "Tương tác", pbl: "Dự án" };

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}`;
const speeches = (sc: StoredScene) => (sc.actions ?? []).flatMap((a) => (a.type === "speech" ? [{ text: a.text, ms: a.durationMs ?? estimateMs(a.text) }] : []));
const sceneMs = (sc: StoredScene) => speeches(sc).reduce((n, s) => n + s.ms, 0);

export function renderScriptMd(meta: { title: string; subject?: string; grade?: number | null }, scenes: StoredScene[]): string {
  const total = scenes.reduce((n, s) => n + sceneMs(s), 0);
  const out: string[] = [`# ${meta.title}`, "", `_${[meta.subject, meta.grade ? `Lớp ${meta.grade}` : "", `${scenes.length} cảnh`, `khoảng ${mmss(total)}`].filter(Boolean).join(" · ")}_`, ""];
  scenes.forEach((sc, i) => {
    out.push(`## Cảnh ${i + 1}. ${sc.title}`, "", `*${KIND[sc.type] ?? sc.type} · ${mmss(sceneMs(sc))}*`, "");
    speeches(sc).forEach((s, k) => out.push(`${k + 1}. ${s.text}`));
    if (sc.type === "quiz") {
      const qs = ((sc.content as { questions?: Q[] }).questions ?? []);
      out.push("", "**Câu hỏi**", "");
      qs.forEach((q, k) => {
        out.push(`${k + 1}. ${q.question}`);
        for (const o of q.options ?? []) out.push(`   - ${o.value}. ${o.label}`);
        out.push(`   - _Đáp án: ${(q.answer ?? []).join(", ") || "—"}${q.analysis ? ` — ${q.analysis}` : ""}_`);
      });
    }
    out.push("");
  });
  return out.join("\n");
}

const para = (s: string, o: { bold?: boolean; indent?: number; before?: number; italics?: boolean } = {}) =>
  new Paragraph({ spacing: { before: o.before ?? 60 }, indent: o.indent ? { left: o.indent } : undefined, children: o.italics ? [new TextRun({ text: s, italics: true })] : mathRuns(s, { bold: o.bold }) });

export async function renderScriptDocx(meta: { title: string; subject?: string; grade?: number | null }, scenes: StoredScene[]): Promise<Buffer> {
  const total = scenes.reduce((n, s) => n + sceneMs(s), 0);
  const kids: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: meta.title, bold: true })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: [meta.subject, meta.grade ? `Lớp ${meta.grade}` : "", `${scenes.length} cảnh`, `khoảng ${mmss(total)}`].filter(Boolean).join(" · "), italics: true })] }),
  ];
  scenes.forEach((sc, i) => {
    kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun(`Cảnh ${i + 1}. ${sc.title}`)] }));
    kids.push(para(`${KIND[sc.type] ?? sc.type} · ${mmss(sceneMs(sc))}`, { italics: true }));
    speeches(sc).forEach((s, k) => kids.push(para(`${k + 1}. ${s.text}`, { indent: 240 })));
    if (sc.type === "quiz") {
      kids.push(para("Câu hỏi", { bold: true, before: 120 }));
      for (const [k, q] of ((sc.content as { questions?: Q[] }).questions ?? []).entries()) {
        kids.push(para(`${k + 1}. ${q.question}`, { indent: 240 }));
        for (const o of q.options ?? []) kids.push(para(`${o.value}. ${o.label}`, { indent: 600 }));
        kids.push(para(`Đáp án: ${(q.answer ?? []).join(", ") || "—"}${q.analysis ? ` — ${q.analysis}` : ""}`, { indent: 600 }));
      }
    }
  });
  const doc = new Document({ creator: "EDUVN", title: meta.title, styles: { default: { document: { run: { font: "Times New Roman", size: 26 } } } }, sections: [{ children: kids }] });
  return Packer.toBuffer(doc);
}
