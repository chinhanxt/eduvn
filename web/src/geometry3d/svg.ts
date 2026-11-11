// web/src/geometry3d/svg.ts — vẽ cảnh 2D ra SVG (thuộc tính nội tuyến để xuất file / chèn đề giữ nguyên nét).
import type { Scene, SLine } from "./render";

export type Theme = "board" | "print";
type Style = { stroke: Record<SLine["kind"], string>; width: Record<SLine["kind"], number>; hidW: number; dash: string; fill: Record<"face" | "section" | "polygon", string>; label: string; point: string; angle: string; font: string; dot: string };

const STYLES: Record<Theme, Style> = {
  board: {
    stroke: { edge: "#ffffff", aux: "#ffffff", section: "#ffc56b", measure: "#7fd4ff", mark: "#ffffff" },
    width: { edge: 2.4, aux: 2, section: 2.4, measure: 2, mark: 1.6 },
    hidW: 1.5,
    dash: "7 6",
    fill: { face: "rgba(140,165,255,0.06)", section: "rgba(255,181,71,0.24)", polygon: "rgba(127,212,255,0.16)" },
    label: "rgba(255,255,255,0.92)",
    point: "#ffd27a",
    angle: "#7fd4ff",
    font: "'Be Vietnam Pro', system-ui, sans-serif",
    dot: "#ffd27a",
  },
  print: {
    stroke: { edge: "#000000", aux: "#000000", section: "#000000", measure: "#000000", mark: "#000000" },
    width: { edge: 1.5, aux: 1.3, section: 1.5, measure: 1.3, mark: 1.1 },
    hidW: 1.1,
    dash: "5 4",
    fill: { face: "none", section: "rgba(0,0,0,0.10)", polygon: "rgba(0,0,0,0.06)" },
    label: "#000000",
    point: "#000000",
    angle: "#000000",
    font: "'Times New Roman', Times, serif",
    dot: "#000000",
  },
};

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pts = (p: [number, number][]) => p.map((q) => `${f1(q[0])},${f1(q[1])}`).join(" ");

/** Phần thân SVG (không có thẻ <svg>), dùng chung cho bảng giảng và file xuất. */
export function sceneSvgBody(sc: Scene, theme: Theme, font = 18): string {
  const st = STYLES[theme];
  const out: string[] = [];
  for (const f of sc.fills) {
    const fill = st.fill[f.kind];
    if (fill !== "none") out.push(`<polygon points="${pts(f.pts)}" fill="${fill}" stroke="none"/>`);
  }
  // nét khuất vẽ trước, nét thấy đè lên
  for (const hidden of [true, false])
    for (const l of sc.lines) {
      if (l.hidden !== hidden) continue;
      const w = hidden ? st.hidW : st.width[l.kind];
      const color = l.kind === "edge" && hidden && theme === "board" ? "rgba(255,255,255,0.62)" : st.stroke[l.kind];
      const tag = l.pts.length === 2 ? `<line x1="${f1(l.pts[0]![0])}" y1="${f1(l.pts[0]![1])}" x2="${f1(l.pts[1]![0])}" y2="${f1(l.pts[1]![1])}"` : `<polyline points="${pts(l.pts)}" fill="none"`;
      out.push(`${tag} stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${hidden ? ` stroke-dasharray="${st.dash}"` : ""}/>`);
    }
  for (const d of sc.dots) out.push(`<circle cx="${f1(d.x)}" cy="${f1(d.y)}" r="${theme === "print" ? 1.9 : 3.2}" fill="${st.dot}"/>`);
  for (const l of sc.labels) {
    const size = l.kind === "angle" ? font * 0.78 : font;
    const color = l.kind === "angle" ? st.angle : l.vertex ? st.label : st.point;
    out.push(`<text x="${f1(l.x)}" y="${f1(l.y + size * 0.34)}" text-anchor="middle" font-family="${st.font}" font-size="${size}"${l.kind === "angle" && theme === "print" ? ' font-style="italic"' : ""} fill="${color}">${esc(l.text)}</text>`);
  }
  return out.join("");
}

/** File SVG độc lập (nền trắng khi in đề), cắt sát hình + lề. */
export function sceneSvg(sc: Scene, theme: Theme, opts: { pad?: number; font?: number; background?: string } = {}): { svg: string; w: number; h: number } {
  const pad = opts.pad ?? 14;
  const [x0, y0, x1, y1] = sc.bbox;
  const w = Math.ceil(x1 - x0 + 2 * pad), h = Math.ceil(y1 - y0 + 2 * pad);
  const bg = opts.background ?? (theme === "print" ? "#ffffff" : "#242b35");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${f1(x0 - pad)} ${f1(y0 - pad)} ${w} ${h}"><rect x="${f1(x0 - pad)}" y="${f1(y0 - pad)}" width="${w}" height="${h}" fill="${bg}"/>${sceneSvgBody(sc, theme, opts.font)}</svg>`;
  return { svg, w, h };
}
