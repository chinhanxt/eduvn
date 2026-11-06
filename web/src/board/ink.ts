// web/src/board/ink.ts
import { getStroke } from "perfect-freehand";

/** Nét bút đẹp (perfect-freehand) → đường SVG kín để tô màu. pts = [x0,y0,x1,y1,…]. */
export function strokePath(pts: readonly number[], width: number): string {
  const input: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) input.push([pts[i]!, pts[i + 1]!]);
  if (input.length === 1) input.push([input[0]![0] + 0.1, input[0]![1]]);
  const outline = getStroke(input, { size: width, thinning: 0.45, smoothing: 0.6, streamline: 0.4 });
  if (!outline.length) return "";
  const [first, ...rest] = outline;
  return `M${first![0]!.toFixed(1)} ${first![1]!.toFixed(1)}${rest.map((p) => `L${p[0]!.toFixed(1)} ${p[1]!.toFixed(1)}`).join("")}Z`;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0;
  return Math.hypot(ax + vx * t - px, ay + vy * t - py);
}

export function hitStroke(pts: readonly number[], x: number, y: number, r: number): boolean {
  if (pts.length === 2) return Math.hypot(pts[0]! - x, pts[1]! - y) <= r;
  for (let i = 0; i + 3 < pts.length; i += 2) if (segDist(x, y, pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!) <= r) return true;
  return false;
}
