// web/src/diagram/route.ts — định tuyến đường nối: lưới thưa + A* (đường vuông góc), Bézier cho cạnh cây sơ đồ tư duy.
import type { DEdge, DiagramDoc, DNode, Pt, Rect } from "./types";
import { rectOf } from "./types";

export type Route = { kind: "poly" | "bezier"; pts: Pt[] };

const MARGIN = 12;
const INFLATE = 4;
const TURN = 24;
const CROSS = 120;
const OVERLAP = 700;

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

function segCross(ax: number, ay: number, bx: number, by: number, p: Pt, q: Pt): boolean {
  const d = (ux: number, uy: number, vx: number, vy: number) => ux * vy - uy * vx;
  const d1 = d(bx - ax, by - ay, p.x - ax, p.y - ay), d2 = d(bx - ax, by - ay, q.x - ax, q.y - ay);
  const d3 = d(q.x - p.x, q.y - p.y, ax - p.x, ay - p.y), d4 = d(q.x - p.x, q.y - p.y, bx - p.x, by - p.y);
  return d1 * d2 < 0 && d3 * d4 < 0;
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
  blocked!: Uint8Array; // 0 chưa tính, 1 trống, 2 bị chặn
  steps!: Uint8Array;
  usedPt!: Uint8Array; // điểm lưới đã có đường khác đi qua → bit 1 ngang, bit 2 dọc
  gArr!: Float64Array;
  prevArr!: Int32Array;
  curves: { pts: Pt[]; box: [number, number, number, number] }[] = [];
  curveCache = new Map<number, number>();
  constructor(rects: Rect[], extraX: number[] = [], extraY: number[] = []) {
    const xs: number[] = [...extraX], ys: number[] = [...extraY];
    for (const r of rects) {
      xs.push(r.x - MARGIN, r.x + r.w + MARGIN, r.x + r.w / 2);
      ys.push(r.y - MARGIN, r.y + r.h + MARGIN, r.y + r.h / 2);
    }
    this.xs = uniq(xs);
    this.ys = uniq(ys);
    const cells = this.xs.length * this.ys.length;
    this.blocked = new Uint8Array(cells);
    this.steps = new Uint8Array(cells * 2);
    this.usedPt = new Uint8Array(cells);
    this.gArr = new Float64Array(cells * 4).fill(Infinity);
    this.prevArr = new Int32Array(cells * 4);
    this.inflated = rects.map((r) => ({ x: r.x - INFLATE, y: r.y - INFLATE, w: r.w + 2 * INFLATE, h: r.h + 2 * INFLATE }));
  }
  idx(i: number, j: number) { return i * this.ys.length + j; }
  isBlocked(i: number, j: number): boolean {
    const k = this.idx(i, j);
    let b = this.blocked[k]!;
    if (!b) {
      const x = this.xs[i]!, y = this.ys[j]!;
      b = this.inflated.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) ? 2 : 1;
      this.blocked[k] = b;
    }
    return b === 2;
  }
  stepBlocked(i: number, j: number, i2: number, j2: number): boolean {
    const horiz = j === j2;
    const key = horiz ? (Math.min(i, i2) * this.ys.length + j) * 2 : (i * this.ys.length + Math.min(j, j2)) * 2 + 1;
    let b = this.steps[key]!;
    if (!b) {
      let hit: boolean;
      if (horiz) {
        const y = this.ys[j]!, x1 = Math.min(this.xs[i]!, this.xs[i2]!), x2 = Math.max(this.xs[i]!, this.xs[i2]!);
        hit = this.inflated.some((r) => y > r.y && y < r.y + r.h && x1 < r.x + r.w && x2 > r.x);
      } else {
        const x = this.xs[i]!, y1 = Math.min(this.ys[j]!, this.ys[j2]!), y2 = Math.max(this.ys[j]!, this.ys[j2]!);
        hit = this.inflated.some((r) => x > r.x && x < r.x + r.w && y1 < r.y + r.h && y2 > r.y);
      }
      b = hit ? 2 : 1;
      this.steps[key] = b;
    }
    return b === 2;
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
  addCurve(pts: Pt[]) {
    this.curves.push({ pts, box: [Math.min(...pts.map((p) => p.x)), Math.min(...pts.map((p) => p.y)), Math.max(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y))] });
  }
  /** Số lần bước lưới (i,j)→(i2,j2) cắt các đường cong đã vẽ. */
  curveCross(i: number, j: number, i2: number, j2: number): number {
    const key = (Math.min(i, i2) * this.ys.length + Math.min(j, j2)) * 2 + (j === j2 ? 0 : 1);
    let c = this.curveCache.get(key);
    if (c === undefined) {
      c = 0;
      const ax = this.xs[i]!, ay = this.ys[j]!, bx = this.xs[i2]!, by = this.ys[j2]!;
      for (const cv of this.curves) {
        if (Math.max(ax, bx) < cv.box[0] || Math.min(ax, bx) > cv.box[2] || Math.max(ay, by) < cv.box[1] || Math.min(ay, by) > cv.box[3]) continue;
        for (let k = 0; k + 1 < cv.pts.length; k++) if (segCross(ax, ay, bx, by, cv.pts[k]!, cv.pts[k + 1]!)) c++;
      }
      this.curveCache.set(key, c);
    }
    return c;
  }
  mark(pts: Pt[]) {
    for (let s = 0; s + 1 < pts.length; s++) {
      const a = pts[s]!, b = pts[s + 1]!;
      const horiz = a.y === b.y;
      const bit = horiz ? 1 : 2;
      const i0 = this.nearest(Math.min(a.x, b.x), this.xs), i1 = this.nearest(Math.max(a.x, b.x), this.xs);
      const j0 = this.nearest(Math.min(a.y, b.y), this.ys), j1 = this.nearest(Math.max(a.y, b.y), this.ys);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) this.usedPt[this.idx(i, j)]! |= bit;
    }
  }
  /** A* từ điểm lưới (si,sj) tới (ti,tj), có phạt rẽ và phạt cắt/đè đường khác. */
  astar(si: number, sj: number, ti: number, tj: number, startDir: number, cap = 40000, penalise = true): Pt[] | null {
    const NY = this.ys.length;
    const key = (i: number, j: number, d: number) => (i * NY + j) * 4 + d;
    const g = this.gArr;
    const prev = this.prevArr;
    const touched: number[] = [];
    const heap = new Heap();
    const tx = this.xs[ti]!, ty = this.ys[tj]!;
    const h = (i: number, j: number) => Math.abs(this.xs[i]! - tx) + Math.abs(this.ys[j]! - ty);
    const s0 = key(si, sj, startDir);
    g[s0] = 0;
    touched.push(s0);
    heap.push(2 * h(si, sj), s0);
    let steps = 0;
    while (heap.size && steps++ < cap) {
      const [, cur] = heap.pop();
      const d = cur & 3;
      const cell = cur >> 2;
      const i = Math.floor(cell / NY), j = cell % NY;
      const gc = g[cur]!;
      if (i === ti && j === tj) {
        const pts: Pt[] = [];
        let k = cur;
        for (;;) {
          const c = k >> 2;
          pts.push({ x: this.xs[Math.floor(c / NY)]!, y: this.ys[c % NY]! });
          if (k === s0) break;
          k = prev[k]!;
        }
        for (const t of touched) g[t] = Infinity;
        return pts.reverse();
      }
      for (let nd = 0; nd < 4; nd++) {
        if (nd === ((d + 2) & 3)) continue;
        const ni = i + DIRS[nd]![0], nj = j + DIRS[nd]![1];
        if (ni < 0 || nj < 0 || ni >= this.xs.length || nj >= NY) continue;
        if (this.isBlocked(ni, nj) || this.stepBlocked(i, j, ni, nj)) continue;
        let cost = Math.abs(this.xs[ni]! - this.xs[i]!) + Math.abs(this.ys[nj]! - this.ys[j]!);
        if (nd !== d) cost += TURN;
        if (penalise && this.curves.length) cost += CROSS * this.curveCross(i, j, ni, nj);
        const used = penalise ? this.usedPt[this.idx(ni, nj)]! : 0;
        if (used) cost += used & (nd % 2 === 0 ? 2 : 1) ? OVERLAP : CROSS;
        const nk = key(ni, nj, nd);
        const ng = gc + cost;
        if (ng < g[nk]!) {
          if (g[nk] === Infinity) touched.push(nk);
          g[nk] = ng;
          prev[nk] = cur;
          heap.push(ng + 2 * h(ni, nj), nk);
        }
      }
    }
    for (const t of touched) g[t] = Infinity;
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

type PortPt = { p: Pt; o: Pt; s: Side };

/** Điểm cổng trên mép hình (lệch `off` dọc theo cạnh) và điểm ra cách mép MARGIN. */
function portPt(n: DNode, s: Side, off: number): PortPt {
  const cx = n.x + n.w / 2, cy = n.y + n.h / 2;
  const hz = s === 0 || s === 2;
  let depth = 0; // độ lùi vào trong của mép thật so với khung bao tại vị trí lệch
  if (n.shape === "diamond") depth = hz ? (Math.abs(off) * n.h) / n.w : (Math.abs(off) * n.w) / n.h;
  else if (n.shape === "ellipse") {
    const r = hz ? n.w / 2 : n.h / 2, k = hz ? n.h / 2 : n.w / 2;
    depth = k * (1 - Math.sqrt(Math.max(0, 1 - (off / r) ** 2)));
  }
  const px = s === 0 || s === 2 ? cx + off : s === 1 ? n.x + n.w - depth : n.x + depth;
  const py = s === 1 || s === 3 ? cy + off : s === 0 ? n.y + depth : n.y + n.h - depth;
  const p = { x: Math.round(px * 2) / 2, y: Math.round(py * 2) / 2 };
  const o = s === 0 ? { x: p.x, y: n.y - MARGIN } : s === 2 ? { x: p.x, y: n.y + n.h + MARGIN } : s === 1 ? { x: n.x + n.w + MARGIN, y: p.y } : { x: n.x - MARGIN, y: p.y };
  return { p, o, s };
}

/** Chia cổng: nhiều đường vào/ra cùng một cạnh hình thì mỗi đường một vị trí riêng (xếp theo toạ độ đầu kia). */
function spreadPorts(byId: Map<string, DNode>, edges: DEdge[]): Map<string, { a: PortPt; b: PortPt }> {
  const sides = new Map<string, [Side, Side]>();
  const groups = new Map<string, { key: string; end: number; at: number }[]>();
  for (const e of edges) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || a === b) continue;
    const pr = sidePairs(rectOf(a), rectOf(b))[0]!;
    sides.set(e.id, pr);
    const add = (n: DNode, s: Side, end: number, other: DNode) => {
      const k = `${n.id}|${s}`;
      const g = groups.get(k) ?? [];
      g.push({ key: e.id, end, at: s % 2 === 0 ? other.x + other.w / 2 : other.y + other.h / 2 });
      groups.set(k, g);
    };
    add(a, pr[0], 0, b);
    add(b, pr[1], 1, a);
  }
  const off = new Map<string, number>();
  for (const [k, g] of groups) {
    const [nid, sd] = k.split("|") as [string, string];
    const n = byId.get(nid)!, s = Number(sd);
    g.sort((x, y) => x.at - y.at || x.key.localeCompare(y.key));
    const len = s % 2 === 0 ? n.w : n.h;
    const usable = n.shape === "diamond" || n.shape === "ellipse" || n.shape === "cloud" ? 0.55 : 0.85;
    const gap = Math.min(26, (len * usable) / Math.max(1, g.length));
    g.forEach((it, i) => off.set(`${it.key}:${it.end}`, g.length === 1 ? 0 : Math.round((i - (g.length - 1) / 2) * gap)));
  }
  const out = new Map<string, { a: PortPt; b: PortPt }>();
  for (const e of edges) {
    const pr = sides.get(e.id);
    if (!pr) continue;
    out.set(e.id, { a: portPt(byId.get(e.from)!, pr[0], off.get(`${e.id}:0`) ?? 0), b: portPt(byId.get(e.to)!, pr[1], off.get(`${e.id}:1`) ?? 0) });
  }
  return out;
}

/** Định tuyến mọi cạnh (hoặc chỉ `only`; các cạnh còn lại lấy từ `existing` để tính phạt cắt). */
export function routeAll(doc: DiagramDoc, opts: RouteOpts = {}): Map<string, Route> {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const isTree = (e: DEdge) => e.kind === "tree" && doc.kind === "mind";
  const ports = spreadPorts(byId, doc.edges.filter((e) => !isTree(e)));
  const exX: number[] = [], exY: number[] = [];
  for (const pp of ports.values()) for (const q of [pp.a, pp.b]) (exX.push(q.o.x), exY.push(q.o.y));
  const grid = new Grid(doc.nodes.map(rectOf), exX, exY);
  const result = new Map<string, Route>();
  const todo: DEdge[] = [];
  for (const e of doc.edges) {
    const keep = opts.only && !opts.only.has(e.id) ? opts.existing?.get(e.id) : undefined;
    if (keep) {
      result.set(e.id, keep);
      if (keep.kind === "poly") grid.mark(keep.pts);
      else grid.addCurve(polyline(keep));
    } else todo.push(e);
  }
  // cạnh cây (Bézier) trước, rồi cạnh ngắn, đường vòng dài sau
  const len = (e: DEdge) => {
    const pp = ports.get(e.id);
    return pp ? Math.abs(pp.a.o.x - pp.b.o.x) + Math.abs(pp.a.o.y - pp.b.o.y) : 0;
  };
  todo.sort((a, b) => Number(!isTree(a)) - Number(!isTree(b)) || len(a) - len(b));
  for (const e of todo) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b || a === b) continue;
    const r = routeOne(grid, doc.nodes, a, b, isTree(e), ports.get(e.id));
    result.set(e.id, r);
    if (r.kind === "poly") grid.mark(r.pts);
    else grid.addCurve(polyline(r));
  }
  return result;
}

function routeOne(grid: Grid, nodes: DNode[], a: DNode, b: DNode, tree: boolean, pp?: { a: PortPt; b: PortPt }): Route {
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
  const tries: [PortPt, PortPt][] = [];
  if (pp) tries.push([pp.a, pp.b]);
  for (const [s, t] of sidePairs(ra, rb).slice(0, 5)) tries.push([{ p: port(ra, s), o: out(port(ra, s), s), s }, { p: port(rb, t), o: out(port(rb, t), t), s: t }]);
  for (const [A, B] of tries) {
    const i0 = grid.nearest(A.o.x, grid.xs), j0 = grid.nearest(A.o.y, grid.ys);
    const i3 = grid.nearest(B.o.x, grid.xs), j3 = grid.nearest(B.o.y, grid.ys);
    if (Math.abs(grid.xs[i0]! - A.o.x) > 1 || Math.abs(grid.ys[j0]! - A.o.y) > 1 || Math.abs(grid.xs[i3]! - B.o.x) > 1 || Math.abs(grid.ys[j3]! - B.o.y) > 1) continue;
    if (grid.isBlocked(i0, j0) || grid.isBlocked(i3, j3)) continue;
    const mid = grid.astar(i0, j0, i3, j3, A.s, 1500) ?? grid.astar(i0, j0, i3, j3, A.s, 40000, false);
    if (mid) return { kind: "poly", pts: simplify([A.p, ...mid, B.p]) };
  }
  return { kind: "poly", pts: simplify([tries[0]![0].p, tries[0]![1].p]) };
}
