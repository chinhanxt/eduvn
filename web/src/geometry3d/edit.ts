// web/src/geometry3d/edit.ts — thao tác dựng thêm trên spec (thuần, dùng cho bảng giảng và hộp thoại chèn hình).
import type { P2, Scene } from "./render";
import type { Solved } from "./solver";
import type { ConstructionSpec, Pair, PointDef, Triple } from "./spec";
import { definedIds } from "./spec";

const NAMES = ["M", "N", "P", "Q", "K", "H", "I", "J", "E", "F", "G", "L", "R", "T", "U", "V"];

export function usedNames(spec: ConstructionSpec, solved?: Solved): Set<string> {
  return new Set([...spec.points.flatMap(definedIds), ...(solved ? [...solved.pts.keys()] : [])]);
}
export function nextName(spec: ConstructionSpec, solved?: Solved): string {
  const u = usedNames(spec, solved);
  return NAMES.find((n) => !u.has(n)) ?? `M${[...u].length}`;
}

const SNAPS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4];

/** Đoạn có thể đặt điểm lên: cạnh khối, đoạn dựng thêm, cạnh thiết diện. */
export function pickablePairs(s: Solved): Pair[] {
  const out: Pair[] = [];
  const add = (a: string, b: string) => {
    if (a !== b && !out.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) out.push([a, b]);
  };
  for (const b of s.bodies) if (b.type === "poly") for (const [i, j] of b.edges) add(i, j);
  for (const sg of s.segs) add(sg.a, sg.b);
  return out;
}

/** Bấm gần một đoạn → điểm chia theo tỉ lệ gần nhất (1/4, 1/3, 1/2…), tính từ đầu mút gần chỗ bấm hơn. */
export function pickOnSegment(sc: Scene, pairs: Pair[], x: number, y: number, max = 16): { from: string; to: string; t: number } | null {
  let best: { from: string; to: string; t: number; d: number } | null = null;
  for (const [a, b] of pairs) {
    const A = sc.points.get(a), B = sc.points.get(b);
    if (!A || !B) continue;
    const vx = B[0] - A[0], vy = B[1] - A[1], L2 = vx * vx + vy * vy;
    if (L2 < 400) continue;
    const t = Math.max(0, Math.min(1, ((x - A[0]) * vx + (y - A[1]) * vy) / L2));
    const d = Math.hypot(A[0] + vx * t - x, A[1] + vy * t - y);
    if (d > max || (best && d >= best.d)) continue;
    const snapped = SNAPS.reduce((p, q) => (Math.abs(q - t) < Math.abs(p - t) ? q : p), 0.5);
    best = snapped > 0.5 ? { from: b, to: a, t: 1 - snapped, d } : { from: a, to: b, t: snapped, d };
  }
  return best && { from: best.from, to: best.to, t: best.t };
}

export function pickNamed(sc: Scene, x: number, y: number, max = 18): string | null {
  let best: string | null = null;
  let bd = max;
  for (const l of sc.labels) {
    if (l.kind !== "point") continue;
    const p = sc.points.get(l.name) as P2;
    const d = Math.min(Math.hypot(p[0] - x, p[1] - y), Math.hypot(l.x - x, l.y - y));
    if (d <= bd) {
      bd = d;
      best = l.name;
    }
  }
  return best;
}

const withArr = <K extends "segments" | "sections" | "marks" | "measures">(spec: ConstructionSpec, k: K, v: NonNullable<ConstructionSpec[K]>[number]): ConstructionSpec => ({ ...spec, [k]: [...((spec[k] as unknown[]) ?? []), v] });

export const addPoint = (spec: ConstructionSpec, id: string, from: string, to: string, t: number): ConstructionSpec => {
  const pt: PointDef = Math.abs(t - 0.5) < 1e-9 ? { type: "midpoint", id, of: [from, to] } : { type: "ratio", id, from, to, t };
  const marks = Math.abs(t - 0.5) < 1e-9 ? [...(spec.marks ?? []), { type: "equal" as const, segments: [[from, id], [id, to]] as Pair[], group: nextEqualGroup(spec) }] : spec.marks;
  return { ...spec, points: [...spec.points, pt], marks };
};
export const addSegment = (spec: ConstructionSpec, a: string, b: string) => withArr(spec, "segments", [a, b] as Pair);
export const addSection = (spec: ConstructionSpec, t: Triple) => withArr(spec, "sections", { through: t });
export const addAngle = (spec: ConstructionSpec, [a, at, b]: Triple) => withArr(spec, "marks", { type: "angle", at, a, b });
export const addRight = (spec: ConstructionSpec, [a, at, b]: Triple) => withArr(spec, "marks", { type: "right", at, a, b });
export function nextEqualGroup(spec: ConstructionSpec): number {
  const g = (spec.marks ?? []).filter((m) => m.type === "equal").length;
  return (g % 3) + 1;
}
export const addEqual = (spec: ConstructionSpec, s1: Pair, s2: Pair) => withArr(spec, "marks", { type: "equal", segments: [s1, s2], group: nextEqualGroup(spec) });
export const addDistPlane = (spec: ConstructionSpec, from: string, plane: Triple) => withArr(spec, "measures", { type: "distance", from, plane });
export const addDistLine = (spec: ConstructionSpec, from: string, line: Pair) => withArr(spec, "measures", { type: "distance", from, line });
export const addLinePlane = (spec: ConstructionSpec, line: Pair, plane: Triple) => withArr(spec, "measures", { type: "angle_line_plane", line, plane });
