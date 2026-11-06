// web/src/board/solids.ts
import { type V3, add, cross, dot, len, lerp, mul, norm, sub } from "./geom3";

export type SolidKind = "cube" | "cuboid" | "pyramid4" | "pyramid3" | "prism3";
export type SolidDef = { kind: SolidKind; title: string; label: string; names: string[]; verts: V3[]; edges: [number, number][]; faces: number[][] };
export type PointRef = { name: string; a: number; b: number; t: number };
export type SolidState = { kind: SolidKind; cx: number; cy: number; size: number; th: number; ph: number; points: PointRef[]; section: [string, string, string] | null; angle: [string, string, string] | null };

const H3 = Math.sqrt(3) / 2;
const BOX_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const BOX_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
const PRIME = ["A", "B", "C", "D", "A'", "B'", "C'", "D'"];
const box = (x: number, y: number, z: number): V3[] => [[0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0], [0, 0, z], [x, 0, z], [x, y, z], [0, y, z]];

/** Toạ độ toán học (z hướng lên). Quy ước tên đỉnh theo SGK: đáy ABCD, A' nằm trên A. */
export const SOLIDS: Record<SolidKind, SolidDef> = {
  cube: { kind: "cube", title: "hình lập phương", label: "ABCD.A'B'C'D'", names: PRIME, verts: box(1, 1, 1), edges: BOX_EDGES, faces: BOX_FACES },
  cuboid: { kind: "cuboid", title: "hình hộp chữ nhật", label: "ABCD.A'B'C'D'", names: PRIME, verts: box(1.4, 1, 0.8), edges: BOX_EDGES, faces: BOX_FACES },
  pyramid4: {
    kind: "pyramid4", title: "hình chóp tứ giác đều", label: "S.ABCD", names: ["A", "B", "C", "D", "S"],
    verts: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0.5, 0.5, 1.1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3]],
    faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
  },
  pyramid3: {
    kind: "pyramid3", title: "hình chóp tam giác đều", label: "S.ABC", names: ["A", "B", "C", "S"],
    verts: [[0, 0, 0], [1, 0, 0], [0.5, H3, 0], [0.5, H3 / 3, 0.95]],
    edges: [[0, 1], [1, 2], [2, 0], [3, 0], [3, 1], [3, 2]],
    faces: [[0, 1, 2], [0, 1, 3], [1, 2, 3], [2, 0, 3]],
  },
  prism3: {
    kind: "prism3", title: "hình lăng trụ tam giác đều", label: "ABC.A'B'C'", names: ["A", "B", "C", "A'", "B'", "C'"],
    verts: [[0, 0, 0], [1, 0, 0], [0.5, H3, 0], [0, 0, 1], [1, 0, 1], [0.5, H3, 1]],
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]],
    faces: [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]],
  },
};
export const SOLID_ORDER: SolidKind[] = ["cube", "cuboid", "pyramid4", "pyramid3", "prism3"];

const centroid = (pts: readonly V3[]): V3 => mul(pts.reduce<V3>((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length);

/** Xoay quanh trục đứng (th) rồi nghiêng (ph); trục màn hình: X phải, Y lên, Z hướng về người xem. */
function rotate(v: V3, th: number, ph: number): V3 {
  const X = v[0], Y = v[2], Z = v[1];
  const c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
  const X1 = X * c + Z * s, Z1 = -X * s + Z * c;
  return [X1, Y * cp - Z1 * sp, Y * sp + Z1 * cp];
}

export function project(st: SolidState, p: V3): [number, number] {
  const r = rotate(sub(p, centroid(SOLIDS[st.kind].verts)), st.th, st.ph);
  return [st.cx + r[0] * st.size, st.cy - r[1] * st.size];
}

function faceNormals(def: SolidDef): V3[] {
  const c = centroid(def.verts);
  return def.faces.map((f) => {
    const [a, b, d] = [def.verts[f[0]!]!, def.verts[f[1]!]!, def.verts[f[2]!]!];
    const n = norm(cross(sub(b, a), sub(d, a)));
    return dot(n, sub(centroid(f.map((i) => def.verts[i]!)), c)) < 0 ? mul(n, -1) : n;
  });
}

export function hiddenEdges(st: SolidState): boolean[] {
  const def = SOLIDS[st.kind];
  const vis = faceNormals(def).map((n) => rotate(n, st.th, st.ph)[2] > 1e-9);
  return def.edges.map(([i, j]) => {
    const owners = def.faces.map((f, k) => ({ f, k })).filter(({ f }) => f.some((v, x) => (v === i && f[(x + 1) % f.length] === j) || (v === j && f[(x + 1) % f.length] === i)));
    return owners.every(({ k }) => !vis[k]);
  });
}

export function resolvePoint(st: SolidState, name: string): V3 | null {
  const def = SOLIDS[st.kind];
  const vi = def.names.indexOf(name);
  if (vi >= 0) return def.verts[vi]!;
  const p = st.points.find((x) => x.name === name);
  if (!p) return null;
  const a = def.verts[p.a], b = def.verts[p.b];
  return a && b ? lerp(a, b, p.t) : null;
}

export function sectionPolygon(def: SolidDef, p1: V3, p2: V3, p3: V3): V3[] | null {
  const n = cross(sub(p2, p1), sub(p3, p1));
  const nl = len(n);
  if (nl < 1e-9) return null;
  const d = dot(n, p1);
  const eps = 1e-9 * nl;
  const pts: V3[] = [];
  const push = (p: V3) => {
    if (!pts.some((q) => len(sub(p, q)) < 1e-7)) pts.push(p);
  };
  for (const [i, j] of def.edges) {
    const A = def.verts[i]!, B = def.verts[j]!;
    const fa = dot(n, A) - d, fb = dot(n, B) - d;
    if (Math.abs(fa) < eps) push(A);
    if (Math.abs(fb) < eps) push(B);
    if ((fa < -eps && fb > eps) || (fa > eps && fb < -eps)) push(lerp(A, B, fa / (fa - fb)));
  }
  if (pts.length < 3) return null;
  const c = centroid(pts);
  const u = norm(sub(pts[0]!, c)), w = cross(norm(n), u);
  const ang = (p: V3) => Math.atan2(dot(sub(p, c), w), dot(sub(p, c), u));
  return pts.sort((a, b) => ang(a) - ang(b));
}

export function angleDeg(a: V3, b: V3, c: V3): number {
  const u = sub(a, b), v = sub(c, b);
  const cos = dot(u, v) / ((len(u) || 1) * (len(v) || 1));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

const NGON = ["", "", "", "tam giác", "tứ giác", "ngũ giác", "lục giác"];
export function shapeName(poly: V3[]): string {
  const n = poly.length;
  const base = NGON[n] ?? `đa giác ${n} cạnh`;
  const sides = poly.map((p, i) => len(sub(poly[(i + 1) % n]!, p)));
  const angs = poly.map((p, i) => angleDeg(poly[(i + n - 1) % n]!, p, poly[(i + 1) % n]!));
  const eqS = sides.every((s) => Math.abs(s - sides[0]!) < 1e-6 * Math.max(1, sides[0]!));
  const eqA = angs.every((a) => Math.abs(a - angs[0]!) < 1e-4);
  if (eqS && eqA) return n === 4 ? "hình vuông" : `${base} đều`;
  if (n === 4 && eqA) return "hình chữ nhật";
  return base;
}

export const fmtDeg = (deg: number): string => `${(Math.round(deg * 10) / 10).toString().replace(".", ",")}°`;

export type Scene = {
  faces: [number, number][][];
  edges: { a: [number, number]; b: [number, number]; hidden: boolean }[];
  labels: { name: string; vertex: boolean; px: number; py: number; x: number; y: number }[];
  section: { pts: [number, number][]; name: string } | null;
  angle: { arc: [number, number][]; value: number; x: number; y: number } | null;
};

export function solidScene(st: SolidState): Scene {
  const def = SOLIDS[st.kind];
  const P = (p: V3) => project(st, p);
  const vis = faceNormals(def).map((n) => rotate(n, st.th, st.ph)[2] > 1e-9);
  const hid = hiddenEdges(st);
  const [ccx, ccy] = P(centroid(def.verts));
  const label = (name: string, p: V3, vertex: boolean) => {
    const [px, py] = P(p);
    const dx = px - ccx, dy = py - ccy, L = Math.hypot(dx, dy) || 1;
    return { name, vertex, px, py, x: px + (dx / L) * 20, y: py + (dy / L) * 18 };
  };
  const labels = [
    ...def.names.map((n, i) => label(n, def.verts[i]!, true)),
    ...st.points.map((p) => label(p.name, resolvePoint(st, p.name)!, false)),
  ];
  let section: Scene["section"] = null;
  if (st.section) {
    const [a, b, c] = st.section.map((n) => resolvePoint(st, n));
    const poly = a && b && c ? sectionPolygon(def, a, b, c) : null;
    if (poly) section = { pts: poly.map(P), name: shapeName(poly) };
  }
  let angle: Scene["angle"] = null;
  if (st.angle) {
    const [a, b, c] = st.angle.map((n) => resolvePoint(st, n));
    if (a && b && c && len(sub(a, b)) > 1e-9 && len(sub(c, b)) > 1e-9) {
      const u1 = norm(sub(a, b)), u2 = norm(sub(c, b));
      const arc: [number, number][] = [];
      for (let k = 0; k <= 16; k++) arc.push(P(add(b, mul(norm(add(mul(u1, 1 - k / 16), mul(u2, k / 16))), 0.13))));
      const [x, y] = P(add(b, mul(norm(add(u1, u2)), 0.27)));
      angle = { arc, value: angleDeg(a, b, c), x, y };
    }
  }
  return {
    faces: def.faces.filter((_, k) => vis[k]).map((f) => f.map((i) => P(def.verts[i]!))),
    edges: def.edges.map(([i, j], k) => ({ a: P(def.verts[i]!), b: P(def.verts[j]!), hidden: hid[k]! })),
    labels,
    section,
    angle,
  };
}

export function pickPoint(st: SolidState, x: number, y: number, max = 20): string | null {
  let best: string | null = null;
  let bd = max;
  for (const l of solidScene(st).labels) {
    const d = Math.hypot(l.px - x, l.py - y);
    if (d <= bd) {
      bd = d;
      best = l.name;
    }
  }
  return best;
}

const SNAPS = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
export function pickEdgePoint(st: SolidState, x: number, y: number, max = 18): { a: number; b: number; t: number } | null {
  const def = SOLIDS[st.kind];
  let best: { a: number; b: number; t: number; d: number } | null = null;
  for (const [i, j] of def.edges) {
    const [ax, ay] = project(st, def.verts[i]!);
    const [bx, by] = project(st, def.verts[j]!);
    const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2));
    const d = Math.hypot(ax + vx * t - x, ay + vy * t - y);
    if (d <= max && (!best || d < best.d)) {
      const snapped = SNAPS.reduce((p, s) => (Math.abs(s - t) < Math.abs(p - t) ? s : p), 0);
      best = { a: i, b: j, t: snapped, d };
    }
  }
  if (!best || best.t === 0 || best.t === 1) return null;
  return { a: best.a, b: best.b, t: best.t };
}

const POINT_NAMES = ["M", "N", "P", "Q", "K", "H", "I", "J", "E", "F", "G", "L"];
export function nextPointName(st: SolidState): string {
  const used = new Set([...SOLIDS[st.kind].names, ...st.points.map((p) => p.name)]);
  return POINT_NAMES.find((n) => !used.has(n)) ?? `M${st.points.length}`;
}
