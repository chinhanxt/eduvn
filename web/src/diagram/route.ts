// web/src/diagram/route.ts — định tuyến đường nối: lưới thưa + A* (đường vuông góc), Bézier cho cạnh cây sơ đồ tư duy.
import type { DEdge, DiagramDoc, DNode, Pt, Rect } from "./types";
import { rectOf } from "./types";

export type Route = { kind: "poly" | "bezier"; pts: Pt[] };

const MARGIN = 12;
const INFLATE = 4;
const TURN = 24;
const CROSS = 60;
const OVERLAP = 40;

type Side = 0 | 1 | 2 | 3; // 0 trên, 1 phải, 2 dưới, 3 trái
const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const port = (r: Rect, s: Side): Pt => (s === 0 ? { x: r.x + r.w / 2, y: r.y } : s === 1 ? { x: r.x + r.w, y: r.y + r.h / 2 } : s === 2 ? { x: r.x + r.w / 2, y: r.y + r.h } : { x: r.x, y: r.y + r.h / 2 });
const out = (p: Pt, s: Side): Pt => ({ x: p.x + DIRS[s]![0] * MARGIN, y: p.y + DIRS[s]![1] * MARGIN });

/** Đoạn thẳng có cắt phần trong của hình chữ nhật không (đoạn nằm trên mép thì không tính). */
export function segHitsRect(a: Pt, b: Pt, r: Rect, pad = 0): boolean {
  const x0 = r.x - pad, y0 = r.y - pad, x1 = r.x + r.w + pad, y1 = r.y + r.h + pad;
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]] as const) {
    if (p === 0) {
      if (q <= 0) return false;
    } else {
      const t = q / p;
      if (p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  if (t1 - t0 <= 1e-9) return false;
  // đoạn trượt dọc đúng mép: coi là không xuyên
  const mx = a.x + dx * ((t0 + t1) / 2), my = a.y + dy * ((t0 + t1) / 2);
  return mx > x0 + 1e-6 && mx < x1 - 1e-6 && my > y0 + 1e-6 && my < y1 - 1e-6;
}

class Heap {
  private a: [number, number][] = [];
  get size() { return this.a.length; }
  push(k: number, v: number) {
    const a = this.a;
    a.push([k, v]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p]![0] <= a[i]![0]) break;
      [a[p], a[i]] = [a[i]!, a[p]!];
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.a;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l]![0] < a[m]![0]) m = l;
        if (r < a.length && a[r]![0] < a[m]![0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i]!, a[m]!];
        i = m;
      }
    }
    return top;
  }
}

const uniq = (v: number[]): number[] => [...new Set(v.map((x) => Math.round(x * 2) / 2))].sort((a, b) => a - b);

class Grid {
  xs: number[];
  ys: number[];
  inflated: Rect[];
  blocked = new Map<number, boolean>();
  steps = new Map<number, boolean>();
  usedPt = new Map<number, number>(); // điểm lưới đã có đường khác đi qua → bit 1 ngang, bit 2 dọc
  constructor(rects: Rect[]) {
    const xs: number[] = [], ys: number[] = [];
    for (const r of rects) {
      xs.push(r.x - MARGIN, r.x + r.w + MARGIN, r.x + r.w / 2);
      ys.push(r.y - MARGIN, r.y + r.h + MARGIN, r.y + r.h / 2);
    }
    this.xs = uniq(xs);
    this.ys = uniq(ys);
    this.inflated = rects.map((r) => ({ x: r.x - INFLATE, y: r.y - INFLATE, w: r.w + 2 * INFLATE, h: r.h + 2 * INFLATE }));
  }
  idx(i: number, j: number) { return i * this.ys.length + j; }
  isBlocked(i: number, j: number): boolean {
    const k = this.idx(i, j);
    let b = this.blocked.get(k);
    if (b === undefined) {
      const x = this.xs[i]!, y = this.ys[j]!;
      b = this.inflated.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h);
      this.blocked.set(k, b);
    }
    return b;
  }
  stepBlocked(i: number, j: number, i2: number, j2: number): boolean {
    const horiz = j === j2;
    const key = horiz ? (Math.min(i, i2) * this.ys.length + j) * 2 : (i * this.ys.length + Math.min(j, j2)) * 2 + 1;
    let b = this.steps.get(key);
    if (b === undefined) {
      if (horiz) {
        const y = this.ys[j]!, x1 = Math.min(this.xs[i]!, this.xs[i2]!), x2 = Math.max(this.xs[i]!, this.xs[i2]!);
        b = this.inflated.some((r) => y > r.y && y < r.y + r.h && x1 < r.x + r.w && x2 > r.x);
      } else {
        const x = this.xs[i]!, y1 = Math.min(this.ys[j]!, this.ys[j2]!), y2 = Math.max(this.ys[j]!, this.ys[j2]!);
        b = this.inflated.some((r) => x > r.x && x < r.x + r.w && y1 < r.y + r.h && y2 > r.y);
      }
      this.steps.set(key, b);
    }
    return b;
  }
  nearest(v: number, arr: number[]): number {
    let lo = 0, hi = arr.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (arr[m]! < v) lo = m + 1; else hi = m;
    }
    if (lo > 0 && Math.abs(arr[lo - 1]! - v) < Math.abs(arr[lo]! - v)) lo--;
    return lo;
  }
  mark(pts: Pt[]) {
    for (let s = 0; s + 1 < pts.length; s++) {
      const a = pts[s]!, b = pts[s + 1]!;
      const horiz = a.y === b.y;
      const bit = horiz ? 1 : 2;
      const i0 = this.nearest(Math.min(a.x, b.x), this.xs), i1 = this.nearest(Math.max(a.x, b.x), this.xs);
      const j0 = this.nearest(Math.min(a.y, b.y), this.ys), j1 = this.nearest(Math.max(a.y, b.y), this.ys);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) this.usedPt.set(this.idx(i, j), (this.usedPt.get(this.idx(i, j)) ?? 0) | bit);
    }
  }
  /** A* từ điểm lưới (si,sj) tới (ti,tj), có phạt rẽ và phạt cắt/đè đường khác. */
  astar(si: number, sj: number, ti: number, tj: number, startDir: number): Pt[] | null {
    const NY = this.ys.length;
    const key = (i: number, j: number, d: number) => (i * NY + j) * 4 + d;
    const g = new Map<number, number>();
    const prev = new Map<number, number>();
    const heap = new Heap();
    const tx = this.xs[ti]!, ty = this.ys[tj]!;
    const h = (i: number, j: number) => Math.abs(this.xs[i]! - tx) + Math.abs(this.ys[j]! - ty);
    const s0 = key(si, sj, startDir);
    g.set(s0, 0);
    heap.push(1.3 * h(si, sj), s0);
    let steps = 0;
    while (heap.size && steps++ < 40000) {
      const [, cur] = heap.pop();
      const d = cur & 3;
      const cell = cur >> 2;
      const i = Math.floor(cell / NY), j = cell % NY;
      const gc = g.get(cur)!;
      if (i === ti && j === tj) {
        const pts: Pt[] = [];
        let k: number | undefined = cur;
        while (k !== undefined) {
          const c = k >> 2;
          pts.push({ x: this.xs[Math.floor(c / NY)]!, y: this.ys[c % NY]! });
          k = prev.get(k);
        }
        return pts.reverse();
      }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((d + 2) & 3)) continue;
        const ni = i + DIRS[nd]![0], nj = j + DIRS[nd]![1];
        if (ni < 0 || nj < 0 || ni >= this.xs.length || nj >= NY) continue;
        if (this.isBlocked(ni, nj) || this.stepBlocked(i, j, ni, nj)) continue;
        let cost = Math.abs(this.xs[ni]! - this.xs[i]!) + Math.abs(this.ys[nj]! - this.ys[j]!);
        if (nd !== d) cost += TURN;
        const used = this.usedPt.get(this.idx(ni, nj));
        if (used) cost += used & (nd % 2 === 0 ? 2 : 1) ? OVERLAP : CROSS;
        const nk = key(ni, nj, nd);
        const ng = gc + cost;
        if (ng < (g.get(nk) ?? Infinity)) {
          g.set(nk, ng);
          prev.set(nk, cur);
          heap.push(ng + 1.3 * h(ni, nj), nk);
        }
      }
    }
    return null;
  }
}

function simplify(pts: Pt[]): Pt[] {
  const o: Pt[] = [];
  for (const p of pts) {
    const l = o[o.length - 1];
    if (l && l.x === p.x && l.y === p.y) continue;
    const a = o[o.length - 2];
    if (a && l && ((a.x === l.x && l.x === p.x) || (a.y === l.y && l.y === p.y))) o[o.length - 1] = p;
    else o.push(p);
  }
  return o;
}

function sidePairs(a: Rect, b: Rect): [Side, Side][] {
  const ca = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, cb = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const v = { x: cb.x - ca.x, y: cb.y - ca.y };
  const all: { s: [Side, Side]; c: number }[] = [];
  for (const s of [0, 1, 2, 3] as Side[])
    for (const t of [0, 1, 2, 3] as Side[]) {
      const p = port(a, s), q = port(b, t);
      let c = Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
      if (DIRS[s]![0] * v.x + DIRS[s]![1] * v.y < 0) c += 400; // cổng quay lưng về đích
      if (DIRS[t]![0] * -v.x + DIRS[t]![1] * -v.y < 0) c += 400;
      all.push({ s: [s, t], c });
    }
  return all.sort((x, y) => x.c - y.c).map((x) => x.s);
}

function bezierPts(p0: Pt, p3: Pt, horizontal: boolean): Pt[] {
  return horizontal
    ? [p0, { x: (p0.x + p3.x) / 2, y: p0.y }, { x: (p0.x + p3.x) / 2, y: p3.y }, p3]
    : [p0, { x: p0.x, y: (p0.y + p3.y) / 2 }, { x: p3.x, y: (p0.y + p3.y) / 2 }, p3];
}
export const bezierAt = (c: Pt[], t: number): Pt => {
  const u = 1 - t;
  const [a, b, d, e] = c as [Pt, Pt, Pt, Pt];
  return { x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * d.x + t * t * t * e.x, y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * d.y + t * t * t * e.y };
};
/** Đa tuyến xấp xỉ của một đường (để đặt nhãn và kiểm giao). */
export function polyline(r: Route): Pt[] {
  if (r.kind === "poly") return r.pts;
  return Array.from({ length: 25 }, (_, i) => bezierAt(r.pts, i / 24));
}
export function pathD(r: Route): string {
  if (r.kind === "poly") return r.pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const [a, b, c, d] = r.pts as [Pt, Pt, Pt, Pt];
  return `M${a.x} ${a.y} C${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y}`;
}

export type RouteOpts = { only?: Set<string>; existing?: Map<string, Route> };

/** Định tuyến mọi cạnh (hoặc chỉ `only`; các cạnh còn lại lấy từ `existing` để tính phạt cắt). */
export function routeAll(doc: DiagramDoc, opts: RouteOpts = {}): Map<string, Route> {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const grid = new Grid(doc.nodes.map(rectOf));
  const result = new Map<string, Route>();
  const todo: DEdge[] = [];
  for (const e of doc.edges) {
    const keep = opts.only && !opts.only.has(e.id) ? opts.existing?.get(e.id) : undefined;
    if (keep) {
      result.set(e.id, keep);
      grid.mark(keep.kind === "poly" ? keep.pts : []);
    } else todo.push(e);
  }
  // cạnh cây (Bézier) và cạnh ngắn trước, đường vòng dài sau
  const order = (e: DEdge) => (e.kind === "tree" ? 0 : 1);
  todo.sort((a, b) => order(a) - order(b));
  for (const e of todo) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || a === b) continue;
    const r = routeOne(grid, doc.nodes, a, b, e.kind === "tree" && doc.kind === "mind");
    result.set(e.id, r);
    if (r.kind === "poly") grid.mark(r.pts);
  }
  return result;
}

function routeOne(grid: Grid, nodes: DNode[], a: DNode, b: DNode, tree: boolean): Route {
  const ra = rectOf(a), rb = rectOf(b);
  if (tree) {
    const right = rb.x >= ra.x + ra.w, left = rb.x + rb.w <= ra.x;
    if (right || left) {
      const p0 = port(ra, right ? 1 : 3), p3 = port(rb, right ? 3 : 1);
      const c = bezierPts(p0, p3, true);
      const samp = Array.from({ length: 25 }, (_, i) => bezierAt(c, i / 24));
      const others = nodes.filter((n) => n !== a && n !== b).map(rectOf);
      let hit = false;
      for (let i = 0; i + 1 < samp.length && !hit; i++) hit = others.some((r) => segHitsRect(samp[i]!, samp[i + 1]!, r));
      if (!hit) return { kind: "bezier", pts: c };
    }
  }
  const pairs = sidePairs(ra, rb).slice(0, 5);
  for (const [s, t] of pairs) {
    const p0 = port(ra, s), p3 = port(rb, t);
    const o0 = out(p0, s), o3 = out(p3, t);
    const i0 = grid.nearest(o0.x, grid.xs), j0 = grid.nearest(o0.y, grid.ys);
    const i3 = grid.nearest(o3.x, grid.xs), j3 = grid.nearest(o3.y, grid.ys);
    if (Math.abs(grid.xs[i0]! - o0.x) > 1 || Math.abs(grid.ys[j0]! - o0.y) > 1 || Math.abs(grid.xs[i3]! - o3.x) > 1 || Math.abs(grid.ys[j3]! - o3.y) > 1) continue;
    if (grid.isBlocked(i0, j0) || grid.isBlocked(i3, j3)) continue;
    const mid = grid.astar(i0, j0, i3, j3, s);
    if (mid) return { kind: "poly", pts: simplify([p0, ...mid, p3]) };
  }
  const p0 = port(ra, pairs[0]![0]), p3 = port(rb, pairs[0]![1]);
  return { kind: "poly", pts: simplify([p0, p3]) };
}
