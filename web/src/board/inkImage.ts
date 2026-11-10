// web/src/board/inkImage.ts — vùng nét tay → ảnh PNG (nền trắng, mực đen) gửi cho AI đọc công thức.
import { api } from "../api";
import { strokePath } from "./ink";

export type InkStroke = { pts: readonly number[]; width: number };

export function strokesBox(strokes: InkStroke[]): { x1: number; y1: number; x2: number; y2: number } {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const s of strokes) {
    for (let i = 0; i + 1 < s.pts.length; i += 2) {
      x1 = Math.min(x1, s.pts[i]!);
      x2 = Math.max(x2, s.pts[i]!);
      y1 = Math.min(y1, s.pts[i + 1]!);
      y2 = Math.max(y2, s.pts[i + 1]!);
    }
  }
  return { x1, y1, x2, y2 };
}

/** PNG base64 (không tiền tố data:) của các nét. */
export function strokesPng(strokes: InkStroke[]): string {
  const b = strokesBox(strokes);
  const m = 24;
  const w = Math.max(40, b.x2 - b.x1) + 2 * m, h = Math.max(40, b.y2 - b.y1) + 2 * m;
  const k = Math.min(3, 1000 / w, 700 / h);
  const c = document.createElement("canvas");
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.scale(k, k);
  g.translate(m - b.x1, m - b.y1);
  g.fillStyle = "#000";
  for (const s of strokes) g.fill(new Path2D(strokePath(s.pts, Math.max(s.width, 3))));
  return c.toDataURL("image/png").split(",")[1]!;
}

export const inkToLatex = async (strokes: InkStroke[]): Promise<string> =>
  (await api<{ latex: string }>("/api/ink/latex", { method: "POST", body: { imageBase64: strokesPng(strokes) } })).latex;
