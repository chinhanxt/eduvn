// Dựng SVG trang theo hợp đồng của ppt-master (MIT): chữ dàn dòng sẵn (dy), công thức = marker OMML,
// biểu đồ/bảng = marker gốc JSON-first, QR = path. Hàm thuần, không I/O.
import QRCode from "qrcode";
import { latexToPlain, splitMath } from "../../domain/mathText";

/** Phong cách trang. Mặc định "Giấy học thuật": nền giấy trắng ngà, mực đậm, xanh dương học thuật, bảng màu phân loại đa dạng (không lấy cam làm chủ đạo). */
export type Style = {
  bg: string;
  surface: string;
  line: string;
  ink: string;
  muted: string;
  primary: string;
  good: string;
  /** Màu phân loại cho vật thể/biểu đồ (6–8 màu, AA trên nền trắng). */
  palette: string[];
  head: string;
  body: string;
  mono: string;
  /** Dùng mẫu của trường: không vẽ nền trang (để nền/logo của master hiện ra). */
  transparentBg?: boolean;
};

export const PAPER_STYLE: Style = {
  bg: "#FDFCF9",
  surface: "#F5F2EA",
  line: "#E6DECC",
  ink: "#1F2428",
  muted: "#6D645A",
  primary: "#2F5D8A",
  good: "#2E7D4F",
  palette: ["#2F5D8A", "#0F7C7C", "#3D6B4F", "#6B4FA0", "#B23A48", "#8A6D00", "#A8467E", "#3F7FBF"],
  head: "Cambria",
  body: "Calibri",
  mono: "Consolas",
};

export const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const n = (v: number): string => String(Math.round(v * 100) / 100);

/** Màu CSS (#rgb, #rrggbb, rgb()) → #RRGGBB; không đọc được → fallback. */
export function hexColor(c: unknown, fallback: string): string {
  if (typeof c !== "string") return fallback;
  const t = c.trim();
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t);
  if (m?.[1]) return `#${(m[1].length === 3 ? [...m[1]].map((x) => x + x).join("") : m[1]).toUpperCase()}`;
  const r = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(t);
  if (r) return `#${[r[1], r[2], r[3]].map((x) => Number(x).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  const named: Record<string, string> = { white: "#FFFFFF", black: "#000000", red: "#C0392B", blue: "#2F5D8A", green: "#2E7D4F", gray: "#808080", grey: "#808080" };
  return named[t.toLowerCase()] ?? fallback;
}

export function luminance(hex: string): number {
  const v = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

/** Chữ đọc được trên nền `bg`. */
export const textOn = (bg: string, ink: string): string => (luminance(bg) < 0.4 ? "#FFFFFF" : ink);

// ---------------------------------------------------------------- chữ giàu định dạng

export type Run = { text: string; size?: number; color?: string; bold?: boolean; italic?: boolean; underline?: boolean; math?: string };
export type Para = { align: "left" | "center" | "right"; bullet?: string; runs: Run[]; indent?: number };

const ENT: Record<string, string> = { "&nbsp;": " ", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&amp;": "&" };
const decode = (s: string) => s.replace(/&(nbsp|lt|gt|quot|#39|amp);/g, (m) => ENT[m] ?? m).replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)));
const styleOf = (tag: string, prop: string): string | undefined => new RegExp(`(?:^|[;"\\s])${prop}\\s*:\\s*([^;"]+)`, "i").exec(tag)?.[1]?.trim();

/** Tách `$…$` trong chữ thành run công thức. */
export function mathRuns(text: string, base: Omit<Run, "text">): Run[] {
  if (!text.includes("$")) return [{ ...base, text }];
  return splitMath(text).flatMap((seg) => (seg.kind === "text" ? (seg.value ? [{ ...base, text: seg.value }] : []) : [{ ...base, text: latexToPlain(seg.value), math: seg.value }]));
}

/** HTML ProseMirror/OpenMAIC (p, li, span style, strong/em/u, br) → đoạn + run. Cỡ chữ px (theo canvas nguồn) nhân `scale`. */
export function parseRich(html: string, scale = 1): Para[] {
  const paras: Para[] = [];
  const stack: Omit<Run, "text">[] = [{}];
  let cur: Para | null = null;
  let list: "ul" | "ol" | null = null;
  let num = 0;
  const top = () => stack.reduce((a, b) => ({ ...a, ...b }), {});
  const open = (align?: string, li = false): Para => {
    const p: Para = { align: align === "center" ? "center" : align === "right" ? "right" : "left", runs: [] };
    if (li) {
      num++;
      p.bullet = list === "ol" ? `${num}.` : "•";
    }
    paras.push(p);
    return p;
  };
  for (const tok of html.replace(/\r?\n/g, " ").split(/(<[^>]+>)/g)) {
    if (!tok) continue;
    if (!tok.startsWith("<")) {
      const t = decode(tok);
      if (!t) continue;
      cur ??= open();
      cur.runs.push(...mathRuns(t, top()));
      continue;
    }
    const m = /^<(\/?)([a-z0-9]+)/i.exec(tok);
    if (!m) continue;
    const close = m[1] === "/";
    const tag = (m[2] ?? "").toLowerCase();
    if (tag === "br") {
      if (cur) cur = open(cur.align);
    } else if (tag === "ul" || tag === "ol") {
      list = close ? null : (tag as "ul" | "ol");
      num = 0;
    } else if (tag === "p" || tag === "li" || /^h[1-6]$/.test(tag) || tag === "div") {
      if (close) {
        if (/^h[1-6]$/.test(tag) && stack.length > 1) stack.pop();
        if (tag !== "p" || !cur?.bullet) cur = null;
        if (tag === "li") cur = null;
      } else {
        const align = styleOf(tok, "text-align");
        if (tag === "p" && cur?.bullet && cur.runs.length === 0) {
          /* <li><p>…</p></li> */
        } else cur = open(align, tag === "li");
        if (/^h[1-6]$/.test(tag)) stack.push({ bold: true });
      }
    } else if (["span", "strong", "b", "em", "i", "u", "font", "sup", "sub", "a"].includes(tag)) {
      if (close) {
        if (stack.length > 1) stack.pop();
      } else {
        const size = styleOf(tok, "font-size");
        const color = styleOf(tok, "color");
        const fw = styleOf(tok, "font-weight") ?? "";
        stack.push({
          ...(tag === "strong" || tag === "b" || /bold|[6-9]00/.test(fw) ? { bold: true } : {}),
          ...(tag === "em" || tag === "i" ? { italic: true } : {}),
          ...(tag === "u" ? { underline: true } : {}),
          ...(color ? { color: hexColor(color, "#1F2428") } : {}),
          ...(size && /px$/.test(size) ? { size: Number.parseFloat(size) * scale } : size && /pt$/.test(size) ? { size: (Number.parseFloat(size) / 0.75) * scale } : {}),
        });
      }
    }
  }
  return paras.filter((p) => p.runs.some((r) => r.text.trim() || r.math));
}

/** Chữ thuần (có thể có $…$) → các đoạn. */
export function plainParas(lines: string[], o: { size: number; color?: string; bold?: boolean; align?: Para["align"]; bullet?: string }): Para[] {
  return lines.map((l) => ({ align: o.align ?? "left", ...(o.bullet ? { bullet: o.bullet } : {}), runs: mathRuns(l, { size: o.size, color: o.color, bold: o.bold }) }));
}

/** Bề rộng ước lượng 1 ký tự (em) — Calibri/Cambria, đủ an toàn để không tràn. */
function charEm(c: string, serif: boolean): number {
  if (c === " ") return 0.24;
  if (/[il.,:;'|!]/.test(c)) return 0.26;
  if (/[mwMW]/.test(c)) return 0.82;
  if (/[A-ZĐ]/.test(c.normalize("NFD")[0] ?? c)) return serif ? 0.64 : 0.6;
  if (/[0-9]/.test(c)) return 0.507;
  return serif ? 0.5 : 0.48;
}

/** Hệ số chiều cao dòng có công thức OMML (phân số, tổng, tích phân… cao hơn dòng chữ). */
export function mathHeight(latex: string): number {
  if (/\\begin\{|\\(d?frac|tfrac|sum|prod|int|oint|lim|binom|overset|underset|cases)\b/.test(latex)) return /\\begin\{/.test(latex) ? 2.4 : 1.7;
  if (/\\(sqrt|overline|vec|hat|widehat|overrightarrow)\b|\^\{?[^}]*\^/.test(latex)) return 1.25;
  return 1;
}

export function textWidth(s: string, size: number, o: { bold?: boolean; serif?: boolean } = {}): number {
  let w = 0;
  for (const c of s) w += charEm(c, !!o.serif);
  return w * size * (o.bold ? 1.06 : 1);
}

type Piece = Run & { w: number; space: boolean };
type Line = { pieces: Piece[]; width: number; size: number; hgt: number };

function splitPieces(runs: Run[], defSize: number, serif: boolean): Piece[] {
  const out: Piece[] = [];
  for (const r of runs) {
    const size = r.size ?? defSize;
    if (r.math) {
      out.push({ ...r, size, w: textWidth(r.text, size, { serif }) * 1.08, space: false });
      continue;
    }
    for (const part of r.text.split(/(\s+)/)) {
      if (!part) continue;
      const space = /^\s+$/.test(part);
      out.push({ ...r, text: space ? " " : part, size, w: textWidth(space ? " " : part, size, { bold: r.bold, serif }), space });
    }
  }
  return out;
}

function wrap(p: Para, width: number, defSize: number, serif: boolean): Line[] {
  const lines: Line[] = [];
  let cur: Line = { pieces: [], width: 0, size: defSize, hgt: defSize };
  const push = () => {
    while (cur.pieces.length && cur.pieces[cur.pieces.length - 1]?.space) cur.width -= cur.pieces.pop()?.w ?? 0;
    if (cur.pieces.length) lines.push(cur);
    cur = { pieces: [], width: 0, size: defSize, hgt: defSize };
  };
  for (const pc of splitPieces(p.runs, defSize, serif)) {
    if (pc.space && cur.pieces.length === 0) continue;
    if (cur.width + pc.w > width && cur.pieces.length > 0 && !pc.space) push();
    // một từ quá dài: cắt cứng theo ký tự
    if (!pc.space && !pc.math && pc.w > width && width > 0) {
      let chunk = "";
      for (const ch of pc.text) {
        if (textWidth(chunk + ch, pc.size ?? defSize, { bold: pc.bold, serif }) > width && chunk) {
          cur.pieces.push({ ...pc, text: chunk, w: textWidth(chunk, pc.size ?? defSize, { bold: pc.bold, serif }) });
          cur.width += cur.pieces[cur.pieces.length - 1]!.w;
          cur.size = Math.max(cur.size, pc.size ?? defSize);
          cur.hgt = Math.max(cur.hgt, cur.size);
          push();
          chunk = "";
        }
        chunk += ch;
      }
      if (chunk) {
        const w = textWidth(chunk, pc.size ?? defSize, { bold: pc.bold, serif });
        cur.pieces.push({ ...pc, text: chunk, w });
        cur.width += w;
      }
      continue;
    }
    cur.pieces.push(pc);
    cur.width += pc.w;
    cur.size = Math.max(cur.size, pc.size ?? defSize);
    cur.hgt = Math.max(cur.hgt, (pc.size ?? defSize) * (pc.math ? mathHeight(pc.math) : 1));
  }
  push();
  if (lines.length === 0) lines.push({ pieces: [], width: 0, size: p.runs[0]?.size ?? defSize, hgt: p.runs[0]?.size ?? defSize });
  return lines;
}

export type TextBox = { x: number; y: number; w: number; h: number };
export type TextOpts = { font: string; size: number; color: string; lineHeight?: number; vAlign?: "top" | "middle" | "bottom"; serif?: boolean; paraGap?: number; minScale?: number; id?: string };

/** Dàn các đoạn vào khung: tự xuống dòng, tự co chữ (tối thiểu minScale) cho vừa chiều cao. Trả về chuỗi <text> và chiều cao dùng. */
export function layoutText(paras: Para[], box: TextBox, o: TextOpts): { svg: string; height: number } {
  const lh = o.lineHeight ?? 1.2;
  const gap = o.paraGap ?? 0.35;
  let k = 1;
  let blocks: { p: Para; lines: Line[]; indent: number }[] = [];
  let total = 0;
  for (let iter = 0; iter < 12; iter++) {
    blocks = paras.map((p) => {
      const bulletW = p.bullet ? textWidth(`${p.bullet} `, (p.runs[0]?.size ?? o.size) * k, { serif: o.serif }) + 4 : 0;
      const scaled: Para = { ...p, runs: p.runs.map((r) => ({ ...r, size: (r.size ?? o.size) * k })) };
      return { p: scaled, lines: wrap(scaled, Math.max(10, box.w - bulletW - (p.indent ?? 0)), o.size * k, !!o.serif), indent: bulletW + (p.indent ?? 0) };
    });
    total = blocks.reduce((s, b, i) => s + b.lines.reduce((a, l) => a + l.hgt * lh, 0) + (i ? b.lines[0]!.size * gap : 0), 0);
    if (total <= box.h * 1.02 || k <= (o.minScale ?? 0.55)) break;
    k *= 0.92;
  }
  let y = box.y + (o.vAlign === "middle" ? Math.max(0, (box.h - total) / 2) : o.vAlign === "bottom" ? Math.max(0, box.h - total) : 0);
  const parts: string[] = [];
  blocks.forEach((b, bi) => {
    if (bi) y += b.lines[0]!.size * gap;
    const anchor = b.p.align === "center" ? "middle" : b.p.align === "right" ? "end" : "start";
    const x = b.p.align === "center" ? box.x + box.w / 2 : b.p.align === "right" ? box.x + box.w : box.x + b.indent;
    const first = b.lines[0]!;
    const base = y + first.size * 0.92 + (first.hgt - first.size) * 0.6;
    const tspans: string[] = [];
    if (b.p.bullet) {
      const bs = b.p.runs[0]?.size ?? o.size * k;
      parts.push(`<text x="${n(box.x + (b.p.indent ?? 0))}" y="${n(base)}" font-family="${esc(o.font)}" font-size="${n(bs)}" fill="${esc(b.p.runs[0]?.color ?? o.color)}"${b.p.runs[0]?.bold ? ' font-weight="700"' : ""}>${esc(b.p.bullet)}</text>`);
    }
    b.lines.forEach((l, li) => {
      const dy = li === 0 ? 0 : (l.size + (l.hgt - l.size) * 0.6 + (b.lines[li - 1]!.hgt - b.lines[li - 1]!.size) * 0.4) * lh;
      tspans.push(`<tspan x="${n(x)}" dy="${n(dy)}">${runsSvg(l.pieces, o)}</tspan>`);
    });
    y += b.lines.reduce((a, l) => a + l.hgt * lh, 0);
    parts.push(`<text${o.id && bi === 0 ? ` id="${esc(o.id)}"` : ""} x="${n(x)}" y="${n(base)}" font-family="${esc(o.font)}" font-size="${n(first.size)}" fill="${esc(o.color)}" text-anchor="${anchor}">${tspans.join("")}</text>`);
  });
  return { svg: parts.join(""), height: total };
}

function runsSvg(pieces: Piece[], o: TextOpts): string {
  // gộp các mảnh liền nhau cùng định dạng
  const merged: Piece[] = [];
  for (const p of pieces) {
    const last = merged[merged.length - 1];
    if (last && !last.math && !p.math && last.size === p.size && last.color === p.color && !!last.bold === !!p.bold && !!last.italic === !!p.italic && !!last.underline === !!p.underline) {
      last.text += p.text;
      last.w += p.w;
    } else merged.push({ ...p });
  }
  return merged
    .map((p) => {
      const attrs = [p.size && p.size !== o.size ? `font-size="${n(p.size)}"` : "", p.color && p.color !== o.color ? `fill="${esc(p.color)}"` : "", p.bold ? 'font-weight="700"' : "", p.italic ? 'font-style="italic"' : "", p.underline ? 'text-decoration="underline"' : ""].filter(Boolean).join(" ");
      if (p.math) return `<tspan data-pptx-inline-formula="${esc(p.math)}"${attrs ? ` ${attrs}` : ""}>${esc(p.text.trim() || "·")}</tspan>`;
      return attrs ? `<tspan ${attrs}>${esc(p.text)}</tspan>` : esc(p.text);
    })
    .join("");
}

// ---------------------------------------------------------------- marker gốc

/** Công thức khối: Office Math gốc (OMML) khi mở bằng PowerPoint; chữ xem trước cho trình khác. */
export function formulaBlock(id: string, latex: string, box: TextBox, o: { size: number; color: string; align?: "left" | "center" | "right"; font: string }): string {
  const align = o.align ?? "center";
  const plain = latexToPlain(latex);
  const size = Math.min(o.size, box.h * 0.6, (box.w / Math.max(4, plain.length)) * 1.7);
  const x = align === "center" ? box.x + box.w / 2 : align === "right" ? box.x + box.w : box.x;
  const meta = JSON.stringify({ latex, display: "block", font_size: Math.round(Math.max(8, size)), color: o.color, align });
  return `<g id="${esc(id)}" data-pptx-replace-with="formula" data-pptx-x="${n(box.x)}" data-pptx-y="${n(box.y)}" data-pptx-width="${n(box.w)}" data-pptx-height="${n(box.h)}" data-pptx-bounds="${n(box.x)} ${n(box.y)} ${n(box.w)} ${n(box.h)}"><metadata type="application/json"><![CDATA[${meta}]]></metadata><text x="${n(x)}" y="${n(box.y + box.h / 2 + size * 0.35)}" font-family="${esc(o.font)}" font-size="${n(size)}" fill="${esc(o.color)}" text-anchor="${align === "center" ? "middle" : align === "right" ? "end" : "start"}">${esc(plain)}</text></g>`;
}

export type ChartIn = { type: "column" | "bar" | "line" | "area" | "pie" | "doughnut" | "radar" | "scatter"; categories: string[]; series: { name: string; values: number[] }[]; colors: string[]; title?: string; text: string; grid: string };

/** Biểu đồ gốc PowerPoint (có bảng dữ liệu nhúng, sửa được). */
export function chartBlock(id: string, c: ChartIn, box: TextBox, s: Style): string {
  const pie = c.type === "pie" || c.type === "doughnut";
  const series = pie ? c.series.slice(0, 1) : c.series;
  const payload: Record<string, unknown> = {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.w),
    height: Math.round(box.h),
    name: id,
    type: c.type === "scatter" ? "line" : c.type,
    categories: c.categories,
    series: series.map((x, i) => ({ name: x.name || `Dãy ${i + 1}`, values: x.values.map((v) => (Number.isFinite(v) ? v : 0)) })),
    style: { colors: c.colors.map((x) => hexColor(x, s.primary)), text_color: c.text, axis_color: c.grid, grid_color: c.grid, chart_area_fill: "none", plot_area_fill: "none", font_family: s.body },
    ...(c.title ? { title: c.title } : {}),
    ...(series.length > 1 || pie ? { show_legend: true } : {}),
  };
  if (pie) (payload.series as { point_colors?: string[] }[])[0]!.point_colors = undefined;
  // xem trước: cột đơn giản (trình không hiểu biểu đồ gốc vẫn thấy hình)
  const max = Math.max(1, ...series.flatMap((x) => x.values));
  const n0 = Math.max(1, c.categories.length);
  const bw = (box.w * 0.8) / n0 / Math.max(1, series.length);
  const prev = series.flatMap((x, si) => x.values.map((v, i) => `<rect x="${n(box.x + box.w * 0.1 + i * (box.w * 0.8 / n0) + si * bw)}" y="${n(box.y + box.h * 0.9 - (v / max) * box.h * 0.75)}" width="${n(bw * 0.85)}" height="${n((Math.max(0, v) / max) * box.h * 0.75)}" fill="${esc(hexColor(c.colors[si % c.colors.length], s.primary))}"/>`)).join("");
  return `<g id="${esc(id)}" data-pptx-replace-with="chart" data-pptx-native-authority="json" data-pptx-bounds="${n(box.x)} ${n(box.y)} ${n(box.w)} ${n(box.h)}"><metadata type="application/json"><![CDATA[${JSON.stringify(payload)}]]></metadata>${prev}</g>`;
}

export type TableCell = { text: string; colspan?: number; rowspan?: number; bold?: boolean; color?: string; fill?: string };

/** Bảng gốc PowerPoint. Hàng đầu là tiêu đề nếu `header`. */
export function tableBlock(id: string, rows: TableCell[][], box: TextBox, s: Style, o: { header: boolean; headerFill: string; colWidths?: number[]; fontSize: number }): string {
  const cols = Math.max(1, ...rows.map((r) => r.reduce((a, c) => a + (c.colspan ?? 1), 0)));
  const toCell = (c: TableCell) => ({
    text: latexToPlainInText(c.text),
    ...(c.colspan && c.colspan > 1 ? { col_span: c.colspan } : {}),
    ...(c.rowspan && c.rowspan > 1 ? { row_span: c.rowspan } : {}),
    ...(c.bold ? { bold: true } : {}),
    ...(c.color ? { color: hexColor(c.color, s.ink) } : {}),
    ...(c.fill ? { fill: hexColor(c.fill, "#FFFFFF") } : {}),
  });
  // trải phẳng thành lưới chữ nhật: ô bị gộp → merge_continuation
  const grid: (Record<string, unknown> | null)[][] = rows.map(() => Array.from({ length: cols }, () => null));
  rows.forEach((r, ri) => {
    let ci = 0;
    for (const c of r) {
      while (ci < cols && grid[ri]![ci] !== null) ci++;
      if (ci >= cols) break;
      grid[ri]![ci] = toCell(c);
      for (let dr = 0; dr < (c.rowspan ?? 1); dr++)
        for (let dc = 0; dc < (c.colspan ?? 1); dc++) {
          if (dr === 0 && dc === 0) continue;
          if (grid[ri + dr] && ci + dc < cols) grid[ri + dr]![ci + dc] = { merge_continuation: true };
        }
      ci += c.colspan ?? 1;
    }
  });
  const filled = grid.map((r) => r.map((c) => c ?? { text: "" }));
  const payload = {
    schema: "ppt-master.semantic-table.v2",
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.w),
    height: Math.round(box.h),
    name: id,
    ...(o.header && filled.length > 1 ? { columns: filled[0], rows: filled.slice(1) } : { rows: filled }),
    ...(o.colWidths && o.colWidths.length === cols ? { column_widths: o.colWidths.map((w) => Math.max(0.01, w)) } : {}),
    style: { font_family: s.body, font_size: Math.round(o.fontSize), header_fill: o.headerFill, header_text: textOn(o.headerFill, s.ink), body_text: s.ink, border_color: s.line, border_width: 1, band_row: false },
  };
  const rh = box.h / Math.max(1, rows.length);
  const prev = rows.map((r, ri) => `<rect x="${n(box.x)}" y="${n(box.y + ri * rh)}" width="${n(box.w)}" height="${n(rh)}" fill="${ri === 0 && o.header ? o.headerFill : "#FFFFFF"}" stroke="${s.line}"/>`).join("");
  return `<g id="${esc(id)}" data-pptx-replace-with="table" data-pptx-native-authority="json" data-pptx-bounds="${n(box.x)} ${n(box.y)} ${n(box.w)} ${n(box.h)}"><metadata type="application/json"><![CDATA[${JSON.stringify(payload)}]]></metadata>${prev}</g>`;
}

const latexToPlainInText = (s: string) => (s.includes("$") ? splitMath(s).map((x) => (x.kind === "text" ? x.value : latexToPlain(x.value))).join("") : s);

/** Mã QR → path (vector, sửa/phóng to không vỡ). */
export function qrPath(text: string, x: number, y: number, size: number, color: string): string {
  const q = QRCode.create(text, { errorCorrectionLevel: "M" });
  const m = q.modules.size;
  const quiet = 2;
  const cell = size / (m + quiet * 2);
  let d = "";
  for (let r = 0; r < m; r++) {
    let c = 0;
    while (c < m) {
      if (!q.modules.get(r, c)) {
        c++;
        continue;
      }
      let e = c;
      while (e < m && q.modules.get(r, e)) e++;
      const x0 = x + (c + quiet) * cell;
      const y0 = y + (r + quiet) * cell;
      d += `M${n(x0)} ${n(y0)}h${n((e - c) * cell)}v${n(cell)}h${n(-(e - c) * cell)}z`;
      c = e;
    }
  }
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(size)}" height="${n(size)}" fill="#FFFFFF"/><path d="${d}" fill="${esc(color)}"/>`;
}

// ---------------------------------------------------------------- path

/** Co giãn path SVG (lệnh tuyệt đối/tương đối M L H V C S Q T A Z) theo sx, sy rồi dời (dx, dy). */
export function scalePath(d: string, sx: number, sy: number, dx: number, dy: number): string {
  const toks = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const out: string[] = [];
  let i = 0;
  let cmd = "";
  const num = () => Number(toks[i++]);
  const isNum = (t: string | undefined) => t !== undefined && !/^[a-zA-Z]$/.test(t);
  while (i < toks.length) {
    if (!isNum(toks[i])) cmd = toks[i++]!;
    const up = cmd.toUpperCase();
    const rel = cmd !== up;
    const X = (v: number) => (rel ? v * sx : v * sx + dx);
    const Y = (v: number) => (rel ? v * sy : v * sy + dy);
    switch (up) {
      case "M":
      case "L":
      case "T":
        out.push(cmd, n(X(num())), n(Y(num())));
        if (up === "M") cmd = rel ? "l" : "L";
        break;
      case "H":
        out.push(cmd, n(X(num())));
        break;
      case "V":
        out.push(cmd, n(Y(num())));
        break;
      case "C":
        out.push(cmd, n(X(num())), n(Y(num())), n(X(num())), n(Y(num())), n(X(num())), n(Y(num())));
        break;
      case "S":
      case "Q":
        out.push(cmd, n(X(num())), n(Y(num())), n(X(num())), n(Y(num())));
        break;
      case "A": {
        const rx = num() * Math.abs(sx);
        const ry = num() * Math.abs(sy);
        const rot = num();
        const la = num();
        const sw = num();
        out.push(cmd, n(rx), n(ry), n(rot), String(la), String(sw), n(X(num())), n(Y(num())));
        break;
      }
      case "Z":
        out.push(cmd);
        while (i < toks.length && isNum(toks[i])) i++;
        break;
      default:
        i++;
    }
  }
  return out.join(" ");
}
