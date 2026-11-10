// web/src/diagram/labels.ts — đặt chữ trên đường nối ở chỗ ít va chạm nhất.
import { polyline, segHitsRect, type Route } from "./route";
import type { DiagramDoc, Pt, Rect } from "./types";
import { rectOf } from "./types";

export const labelSize = (text: string): { w: number; h: number } => ({ w: Math.round(text.replace(/\\[a-zA-Z]+/g, "x").replace(/[${}\\]/g, "").length * 7.2 + 10), h: 18 });

const hitRR = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function at(pts: Pt[], t: number): { p: Pt; nx: number; ny: number } {
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const l = Math.hypot(pts[i + 1]!.x - pts[i]!.x, pts[i + 1]!.y - pts[i]!.y);
    lens.push(l);
    total += l;
  }
  let d = total * t;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]! || i === lens.length - 1) {
      const a = pts[i]!, b = pts[i + 1]!;
      const k = lens[i]! ? Math.min(1, d / lens[i]!) : 0;
      const dx = (b.x - a.x) / (lens[i]! || 1), dy = (b.y - a.y) / (lens[i]! || 1);
      return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, nx: -dy, ny: dx };
    }
    d -= lens[i]!;
  }
  return { p: pts[0]!, nx: 0, ny: 1 };
}

const T = [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.15, 0.85];

/** Trả về khung chữ (x,y,w,h) cho mỗi cạnh có nhãn. */
export function placeLabels(doc: DiagramDoc, routes: Map<string, Route>, only?: Set<string>, existing?: Map<string, Rect>): Map<string, Rect> {
  const nodes = doc.nodes.map(rectOf);
  const lines = new Map<string, Pt[]>();
  for (const [id, r] of routes) lines.set(id, polyline(r));
  const boxes = new Map<string, [number, number, number, number]>();
  for (const [id, l] of lines) boxes.set(id, [Math.min(...l.map((p) => p.x)), Math.min(...l.map((p) => p.y)), Math.max(...l.map((p) => p.x)), Math.max(...l.map((p) => p.y))]);
  const placed = new Map<string, Rect>();
  const todo = doc.edges.filter((e) => e.label && routes.has(e.id));
  for (const e of todo) if (only && !only.has(e.id) && existing?.has(e.id)) placed.set(e.id, existing.get(e.id)!);
  for (const e of todo) {
    if (placed.has(e.id)) continue;
    const pts = lines.get(e.id)!;
    const { w, h } = labelSize(e.label!);
    let best: Rect | null = null;
    let bestScore = Infinity;
    for (const off of [0, 1, -1]) {
      for (let ti = 0; ti < T.length; ti++) {
        const { p, nx, ny } = at(pts, T[ti]!);
        const o = off * (Math.abs(nx) * (w / 2 + 4) + Math.abs(ny) * (h / 2 + 4));
        const rect = { x: p.x + nx * o - w / 2, y: p.y + ny * o - h / 2, w, h };
        let s = ti * 2 + Math.abs(off) * 6;
        for (const n of nodes) if (hitRR(rect, n)) s += 1000;
        for (const l of placed.values()) if (hitRR(rect, l)) s += 1000;
        for (const [id, other] of lines) {
          if (id === e.id) continue;
          const bb = boxes.get(id)!;
          if (rect.x > bb[2] || rect.x + rect.w < bb[0] || rect.y > bb[3] || rect.y + rect.h < bb[1]) continue;
          for (let i = 0; i + 1 < other.length; i++) {
            const a = other[i]!, b = other[i + 1]!;
            if (Math.max(a.x, b.x) < rect.x || Math.min(a.x, b.x) > rect.x + rect.w || Math.max(a.y, b.y) < rect.y || Math.min(a.y, b.y) > rect.y + rect.h) continue;
            if (segHitsRect(a, b, rect)) { s += 120; break; }
          }
        }
        if (s < bestScore) {
          bestScore = s;
          best = rect;
        }
      }
      if (bestScore < 40) break;
    }
    placed.set(e.id, best!);
  }
  return placed;
}
