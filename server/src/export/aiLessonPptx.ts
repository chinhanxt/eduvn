// Port ý tưởng từ OpenMAIC lib/export/use-export-pptx.ts (MIT), viết lại thành hàm thuần chạy server, đã sửa:
// dùng pptxgenjs sẵn có, công thức xuất dạng chữ Unicode (không dùng mathml2omml LGPL), lời giảng vào speaker notes.
import PptxGenJS from "pptxgenjs";
import { toPlainText } from "../domain/mathText";
import type { StoredScene } from "../services/aiLessons/types";

const PX = 1 / 100; // canvas 1000px = 10 inch
const PT = 0.72; // px → pt
const FONT = "Be Vietnam Pro";

type El = { id: string; type: string; left: number; top: number; width: number; height: number; rotate?: number; [k: string]: unknown };

const hex = (c: unknown, fallback = "333333"): string => {
  if (typeof c !== "string") return fallback;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})/i.exec(c.trim());
  if (m?.[1]) return m[1].length === 3 ? [...m[1]].map((x) => x + x).join("").toUpperCase() : m[1].toUpperCase();
  const rgb = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(String(c));
  if (rgb) return [rgb[1], rgb[2], rgb[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("").toUpperCase();
  return fallback;
};

const entities = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

const styleOf = (tag: string, prop: string): string | undefined => new RegExp(`${prop}\\s*:\\s*([^;"]+)`, "i").exec(tag)?.[1]?.trim();

/** HTML của ProseMirror (p, span, strong, em, u, ul/ol/li, br) → các đoạn chữ pptxgenjs. */
export function htmlToRuns(html: string, defColor: string, defSize = 18): PptxGenJS.TextProps[] {
  const runs: PptxGenJS.TextProps[] = [];
  const stack: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string; size?: number; align?: string }[] = [{}];
  let bullet: false | "bullet" | "number" = false;
  let pendingAlign: string | undefined;
  const tokens = html.replace(/\n/g, " ").split(/(<[^>]+>)/g);
  const push = (text: string) => {
    const t = entities(text);
    if (!t) return;
    const s = stack.reduce((a, b) => ({ ...a, ...b }), {});
    const plain = t.includes("$") ? toPlainText(t) : t;
    runs.push({ text: plain, options: { bold: s.bold, italic: s.italic, underline: s.underline ? { style: "sng" } : undefined, color: s.color ?? defColor, fontSize: Math.max(8, Math.round((s.size ?? defSize / PT) * PT)), fontFace: FONT, align: (s.align as "left") ?? pendingAlign, bullet: bullet ? (bullet === "number" ? { type: "number" } : true) : undefined } });
  };
  const brk = () => {
    const last = runs[runs.length - 1];
    if (last) last.options = { ...last.options, breakLine: true };
  };
  for (const tok of tokens) {
    if (!tok) continue;
    if (!tok.startsWith("<")) {
      push(tok);
      continue;
    }
    const m = /^<(\/?)([a-z0-9]+)/i.exec(tok);
    if (!m) continue;
    const close = m[1] === "/";
    const tag = (m[2] ?? "").toLowerCase();
    if (tag === "br") brk();
    else if (tag === "ul" || tag === "ol") bullet = close ? false : tag === "ol" ? "number" : "bullet";
    else if (tag === "p" || tag === "li" || /^h[1-6]$/.test(tag)) {
      if (close) brk();
      else {
        pendingAlign = styleOf(tok, "text-align");
        if (/^h[1-6]$/.test(tag)) stack.push({ bold: true });
      }
      if (close && /^h[1-6]$/.test(tag)) stack.pop();
    } else if (close) {
      if (["span", "strong", "b", "em", "i", "u", "font"].includes(tag) && stack.length > 1) stack.pop();
    } else if (["span", "strong", "b", "em", "i", "u", "font"].includes(tag)) {
      const size = styleOf(tok, "font-size");
      const color = styleOf(tok, "color");
      stack.push({
        bold: tag === "strong" || tag === "b" || /bold|[6-9]00/.test(styleOf(tok, "font-weight") ?? "") || undefined,
        italic: tag === "em" || tag === "i" || undefined,
        underline: tag === "u" || undefined,
        color: color ? hex(color, defColor) : undefined,
        size: size ? Number.parseFloat(size) : undefined,
      });
    }
  }
  const last = runs[runs.length - 1];
  if (last?.options) last.options = { ...last.options, breakLine: false };
  return runs.length > 0 ? runs : [{ text: "", options: {} }];
}

const plainOf = (html: string) => entities(html.replace(/<\/p>|<br\s*\/?>|<\/li>/g, "\n").replace(/<[^>]+>/g, "")).trim();

function box(e: El) {
  return { x: e.left * PX, y: e.top * PX, w: e.width * PX, h: Math.max(e.height, 1) * PX, rotate: e.rotate || undefined };
}

type Slide = ReturnType<PptxGenJS["addSlide"]>;

function addElement(pptx: PptxGenJS, s: Slide, e: El, fontColor: string): void {
  const b = box(e);
  switch (e.type) {
    case "text": {
      const valign = e.vAlign === "middle" ? "middle" : e.vAlign === "bottom" ? "bottom" : "top";
      s.addText(htmlToRuns(String(e.content ?? ""), hex(e.defaultColor, fontColor)), {
        ...b,
        valign,
        margin: 0.05,
        fit: "shrink",
        fill: typeof e.fill === "string" && e.fill ? { color: hex(e.fill, "FFFFFF") } : undefined,
        lineSpacingMultiple: typeof e.lineHeight === "number" ? e.lineHeight : undefined,
        vert: e.vertical ? "eaVert" : undefined,
      });
      break;
    }
    case "shape": {
      const fill = hex(e.fill, "FFFFFF");
      const path = String(e.path ?? "");
      const formula = String(e.pathFormula ?? "");
      const kind: PptxGenJS.ShapeType = formula === "roundRect" ? pptx.ShapeType.roundRect : formula === "triangle" ? pptx.ShapeType.triangle : /A\s*[\d.]/.test(path) && !/L/.test(path) ? pptx.ShapeType.ellipse : pptx.ShapeType.rect;
      const o = e.outline as { color?: string; width?: number } | undefined;
      const text = e.text as { content?: string; defaultColor?: string; align?: string } | undefined;
      const common = { ...b, fill: { color: fill, transparency: typeof e.opacity === "number" ? Math.round((1 - e.opacity) * 100) : 0 }, line: o?.width ? { color: hex(o.color, "333333"), width: o.width * PT } : { type: "none" as const }, flipH: e.flipH === true, flipV: e.flipV === true };
      if (text?.content && plainOf(text.content)) {
        s.addText(htmlToRuns(text.content, hex(text.defaultColor, fontColor)), { ...common, shape: kind, align: "center", valign: text.align === "top" ? "top" : text.align === "bottom" ? "bottom" : "middle", fit: "shrink" });
      } else s.addShape(kind, common);
      break;
    }
    case "line": {
      const start = e.start as [number, number];
      const end = e.end as [number, number];
      const x1 = (e.left + start[0]) * PX;
      const y1 = (e.top + start[1]) * PX;
      const x2 = (e.left + end[0]) * PX;
      const y2 = (e.top + end[1]) * PX;
      const pts = (e.points as string[] | undefined) ?? ["", ""];
      s.addShape(pptx.ShapeType.line, {
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        w: Math.abs(x2 - x1),
        h: Math.abs(y2 - y1),
        flipH: x2 < x1,
        flipV: y2 < y1,
        line: { color: hex(e.color, "333333"), width: 2, dashType: e.style === "dashed" ? "dash" : e.style === "dotted" ? "sysDot" : "solid", beginArrowType: pts[0] === "arrow" ? "triangle" : undefined, endArrowType: pts[1] === "arrow" ? "triangle" : undefined },
      });
      break;
    }
    case "image": {
      const src = String(e.src ?? "");
      if (/^data:image\//.test(src)) s.addImage({ data: src, ...b, rounding: undefined });
      else if (/^https?:\/\//.test(src)) s.addImage({ path: src, ...b });
      break;
    }
    case "latex": {
      const text = toPlainText(`$${String(e.latex ?? "")}$`);
      s.addText(text, { ...b, fontFace: "Cambria Math", fontSize: Math.max(12, Math.min(40, Math.round(e.height * PT * 0.6))), color: hex(e.color, fontColor), align: (e.align as "center") ?? "center", valign: "middle", fit: "shrink" });
      break;
    }
    case "table": {
      const data = (e.data as { text: string; colspan?: number; rowspan?: number; style?: { bold?: boolean; color?: string; backcolor?: string } }[][]) ?? [];
      const theme = e.theme as { color?: string; rowHeader?: boolean } | undefined;
      const rows = data.map((r, ri) =>
        r.map((c) => ({
          text: c.text.includes("$") ? toPlainText(c.text) : c.text,
          options: { colspan: c.colspan, rowspan: c.rowspan, bold: c.style?.bold || (theme?.rowHeader && ri === 0) || undefined, color: c.style?.color ? hex(c.style.color) : theme?.rowHeader && ri === 0 ? "FFFFFF" : c.style?.backcolor ? textOnHex(hex(c.style.backcolor, "FFFFFF")) : fontColor, fill: c.style?.backcolor ? { color: hex(c.style.backcolor, "FFFFFF") } : theme?.rowHeader && ri === 0 ? { color: hex(theme.color, "4472C4") } : undefined, fontFace: FONT, fontSize: 12, border: { type: "solid" as const, color: "BBBBBB", pt: 1 } },
        })),
      );
      if (rows.length > 0) s.addTable(rows, { x: b.x, y: b.y, w: b.w, colW: (e.colWidths as number[] | undefined)?.map((w) => w * b.w) });
      break;
    }
    case "chart": {
      const d = e.data as { labels: string[]; legends: string[]; series: number[][] };
      const type = String(e.chartType);
      const T = pptx.ChartType;
      const map: Record<string, PptxGenJS.CHART_NAME> = { bar: T.bar, column: T.bar, line: T.line, pie: T.pie, ring: T.doughnut, area: T.area, radar: T.radar, scatter: T.scatter };
      const ct = map[type] ?? T.bar;
      if (ct === T.scatter) {
        const xs = d.labels.map((_l, i) => Number(d.labels[i]) || i + 1);
        s.addChart(ct, [{ name: "X", values: xs }, ...d.series.map((v, i) => ({ name: d.legends[i] ?? `Dãy ${i + 1}`, values: v }))] as never, { ...b, showLegend: d.series.length > 1 });
      } else {
        s.addChart(ct, d.series.map((v, i) => ({ name: d.legends[i] ?? `Dãy ${i + 1}`, labels: d.labels, values: v })), { ...b, barDir: type === "bar" ? "bar" : "col", showLegend: d.series.length > 1 || ct === T.pie || ct === T.doughnut, chartColors: (e.themeColors as string[] | undefined)?.map((c) => hex(c)) });
      }
      break;
    }
    case "code": {
      const lines = ((e.lines as { content: string }[]) ?? []).map((l) => l.content).join("\n");
      s.addText(lines, { ...b, fontFace: "Consolas", fontSize: 12, color: "D4D4D4", fill: { color: "1E1E1E" }, valign: "top", fit: "shrink", margin: 0.1 });
      break;
    }
    default:
      break;
  }
}

type Canvas = { elements: El[]; background?: { type?: string; color?: string; gradient?: { colors?: { color: string }[] } }; theme?: { backgroundColor?: string; fontColor?: string } };

function bgOf(canvas: Canvas): string {
  const bg = canvas.background;
  if (bg?.type === "gradient") return hex(bg.gradient?.colors?.[0]?.color, "FFFFFF");
  return hex(bg?.color ?? canvas.theme?.backgroundColor, "FFFFFF");
}

function notesOf(sc: StoredScene): string {
  return (sc.actions ?? []).flatMap((a) => (a.type === "speech" ? [a.text] : [])).join("\n\n");
}

function textSlide(pptx: PptxGenJS, title: string, lines: string[], notes: string, tag?: string): void {
  const s = pptx.addSlide();
  s.background = { color: "FFFFFF" };
  if (tag) s.addText(tag, { x: 0.6, y: 0.35, w: 3, h: 0.35, fontSize: 12, bold: true, color: "FFFFFF", fill: { color: "4F6BED" }, align: "center", fontFace: FONT });
  s.addText(title, { x: 0.6, y: 0.8, w: 8.8, h: 0.9, fontSize: 28, bold: true, color: "1E2340", fontFace: FONT, fit: "shrink" });
  s.addText(
    lines.map((t) => ({ text: t, options: { breakLine: true, bullet: !t.startsWith("   ") && lines.length > 1, fontSize: 16, color: "232842", fontFace: FONT, paraSpaceAfter: 6 } })),
    { x: 0.6, y: 1.9, w: 8.8, h: 3.4, valign: "top", fit: "shrink" },
  );
  if (notes) s.addNotes(notes);
}

/** Xuất cả bài giảng AI ra .pptx (Buffer). */
export async function renderAiLessonPptx(title: string, scenes: StoredScene[]): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "EDUVN_16x9", width: 10, height: 5.625 });
  pptx.layout = "EDUVN_16x9";
  pptx.title = title;
  pptx.company = "EDUVN";
  for (const sc of scenes) {
    const notes = notesOf(sc);
    if (sc.type === "slide") {
      const canvas = (sc.content as unknown as { canvas: Canvas }).canvas;
      const s = pptx.addSlide();
      s.background = { color: bgOf(canvas) };
      for (const e of canvas.elements) addElement(pptx, s, e, hex(canvas.theme?.fontColor, "333333"));
      if (notes) s.addNotes(notes);
    } else if (sc.type === "quiz") {
      const qs = (sc.content as { questions: { question: string; options?: { value: string; label: string }[]; answer?: string[]; analysis?: string }[] }).questions;
      const lines = qs.flatMap((q, i) => [`Câu ${i + 1}. ${toPlainText(q.question)}`, ...(q.options ?? []).map((o) => `   ${o.value}. ${toPlainText(o.label)}`)]);
      const key = qs.map((q, i) => `Câu ${i + 1}: ${(q.answer ?? []).join(", ") || "—"}${q.analysis ? ` — ${toPlainText(q.analysis)}` : ""}`).join("\n");
      textSlide(pptx, sc.title, lines, [notes, key && `Đáp án:\n${key}`].filter(Boolean).join("\n\n"), "CÂU HỎI");
    } else {
      const c = sc.content as { widgetType?: string };
      textSlide(pptx, sc.title, [`Hoạt động tương tác (${c.widgetType ?? "mô phỏng"}) — mở trong trình phát bài giảng EDUVN để thao tác.`], notes, "TƯƠNG TÁC");
    }
  }
  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}

/** Chữ trắng trên nền tối, mực đậm trên nền sáng (hex "RRGGBB"). */
function textOnHex(bg: string): string {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(bg.slice(i, i + 2), 16) || 255) as [number, number, number];
  return 0.299 * r + 0.587 * g + 0.114 * b < 150 ? "FFFFFF" : "232842";
}
