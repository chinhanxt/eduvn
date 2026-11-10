// web/src/diagram/shapes.ts — đường viền các hình nút (dùng chung cho màn hình và xuất file).
import type { Shape } from "./types";

/** Trộn màu với trắng: t = 0 giữ nguyên, 1 = trắng. */
export function tint(hex: string, t: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function shapeSvg(shape: Shape, w: number, h: number, fill: string, stroke: string): string {
  const a = `fill="${fill}" stroke="${stroke}" stroke-width="1.8"`;
  switch (shape) {
    case "rect": return `<rect width="${w}" height="${h}" rx="4" ${a}/>`;
    case "round": return `<rect width="${w}" height="${h}" rx="14" ${a}/>`;
    case "pill": return `<rect width="${w}" height="${h}" rx="${h / 2}" ${a}/>`;
    case "ellipse": return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" ${a}/>`;
    case "diamond": return `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" ${a}/>`;
    case "parallelogram": return `<polygon points="14,0 ${w},0 ${w - 14},${h} 0,${h}" ${a}/>`;
    case "cloud": return `<path d="M25 55 C8 55 2 38 14 31 C6 18 22 6 35 13 C40 2 62 2 68 13 C80 6 98 18 90 31 C102 40 94 55 78 55 Z" transform="scale(${w / 104} ${h / 60})" vector-effect="non-scaling-stroke" ${a}/>`;
  }
}
