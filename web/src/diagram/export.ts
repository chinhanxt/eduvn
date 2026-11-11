// web/src/diagram/export.ts — xuất SVG / PNG. Có `rich` (trình duyệt): công thức giữ nguyên bản render MathLive
// trong foreignObject kèm font KaTeX nhúng; không có (môi trường test): chữ thường gần đúng.
import type { Rect } from "./types";
import { pathD, type Route } from "./route";
import type { DEdge, DiagramDoc, DNode, Shape } from "./types";
import { shapeSvg, tint } from "./shapes";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const SYM: Record<string, string> = { Delta: "Δ", neq: "≠", pm: "±", cdot: "·", times: "×", le: "≤", leq: "≤", ge: "≥", geq: "≥", infty: "∞", pi: "π", alpha: "α", beta: "β", gamma: "γ", Delta_: "Δ", varphi: "φ", theta: "θ", in: "∈", Rightarrow: "⇒", to: "→" };
/** Chữ thường gần đúng của công thức (chỉ dùng khi không nhúng được công thức). */
export const plain = (s: string) =>
  s
    .replace(/\$/g, "")
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^{}]*)\}/g, "√($1)")
    .replace(/\^\{?2\}?/g, "²")
    .replace(/\^\{?3\}?/g, "³")
    .replace(/\\(sin|cos|tan|cot|log|ln|lim|max|min)\b\s?/g, "$1 ")
    .replace(/\\([a-zA-Z]+)\s?/g, (_, k: string) => SYM[k] ?? "")
    .replace(/[{}]/g, "");
export type RichText = { html: (value: string) => string | null; css: string };

function text(lines: string[], cx: number, cy: number, fill: string, size = 14): string {
  const lh = size * 1.3;
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  return `<text text-anchor="middle" font-family="Be Vietnam Pro, sans-serif" font-size="${size}" fill="${fill}">${lines.map((l, i) => `<tspan x="${cx}" y="${y0 + i * lh + size * 0.35}">${esc(plain(l))}</tspan>`).join("")}</text>`;
}

/** Nhãn có công thức: foreignObject chứa đúng HTML render (XHTML), căn giữa như trên màn hình. */
function richBox(rich: RichText, label: string, x: number, y: number, w: number, h: number, color: string, size: number): string | null {
  const lines = label.split("\n").map((l) => rich.html(l));
  if (lines.every((l) => l === null)) return null;
  const inner = label.split("\n").map((l, i) => `<div>${lines[i] ?? esc(l)}</div>`).join("");
  return `<foreignObject x="${x}" y="${y}" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${w}px;height:${h}px;box-sizing:border-box;padding:2px 10px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;white-space:nowrap;font:${size}px/1.3 'Be Vietnam Pro',Arial,sans-serif;color:${color}">${inner}</div></foreignObject>`;
}

export function diagramSvg(doc: DiagramDoc, routes: Map<string, Route>, labels: Map<string, Rect>, isRoot: (n: DNode) => boolean, rich?: RichText): { svg: string; w: number; h: number } {
  const pad = 30;
  const xs = doc.nodes.flatMap((n) => [n.x, n.x + n.w]);
  const ys = doc.nodes.flatMap((n) => [n.y, n.y + n.h]);
  const x0 = Math.min(0, ...xs) - pad, y0 = Math.min(0, ...ys) - pad;
  const w = Math.max(100, Math.max(...xs, 0) + pad - x0), h = Math.max(100, Math.max(...ys, 0) + pad - y0);
  const edge = (e: DEdge) => {
    const r = routes.get(e.id);
    if (!r) return "";
    const tree = e.kind === "tree";
    const col = tree ? doc.nodes.find((n) => n.id === e.to)?.color ?? "#7a8199" : "#7a8199";
    const lb = labels.get(e.id);
    return `<path d="${pathD(r)}" fill="none" stroke="${col}" stroke-width="${tree ? 2.2 : 1.6}"${e.dashed ? ' stroke-dasharray="6 4"' : ""}${tree ? "" : ' marker-end="url(#ah)"'}/>` +
      (lb && e.label ? `<rect x="${lb.x}" y="${lb.y}" width="${lb.w}" height="${lb.h}" rx="4" fill="#fff" fill-opacity=".9"/>${(rich && richBox(rich, e.label, lb.x, lb.y, lb.w, lb.h, "#4a5068", 12)) || text([e.label], lb.x + lb.w / 2, lb.y + lb.h / 2, "#4a5068", 12)}` : "");
  };
  const node = (n: DNode) => {
    const root = isRoot(n);
    if (n.image) return `<image href="${n.image}" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}"/>`;
    const color = root ? "#fff" : "#1b2033";
    const label = (rich && richBox(rich, n.label, n.x, n.y, n.w, n.h, color, 14)) || text(n.label.split("\n"), n.x + n.w / 2, n.y + n.h / 2, color);
    return `<g transform="translate(${n.x} ${n.y})">${shapeSvg(n.shape as Shape, n.w, n.h, root ? n.color : tint(n.color, 0.88), n.color)}</g>${label}`;
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${x0} ${y0} ${w} ${h}"><defs>${rich?.css ? `<style>${rich.css.replace(/<\/style/gi, "")}\n.me-tex{display:inline-block;vertical-align:middle;font-size:1.12em}</style>` : ""}<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7a8199"/></marker></defs><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#fff"/>${doc.edges.map(edge).join("")}${doc.nodes.map(node).join("")}</svg>`;
  return { svg, w, h };
}

export function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function svgToPng(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  g.drawImage(img, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Không xuất được PNG"))), "image/png"));
}
