// web/src/geometry3d/render.ts — chiếu song song kiểu SGK, tính nét khuất theo mặt che thật, đặt nhãn, ký hiệu → cảnh 2D. Thuần TS.
import { type V3, add, cross, dot, len, lerp, mul, norm, sub } from "../board/geom3";
import { prettyName } from "./fmt";
import type { Solved, SolvedBody } from "./solver";
import type { ViewMode } from "./spec";

export type P2 = [number, number];
export type View = { mode: ViewMode; th: number; ph: number };
export type LineKind = "edge" | "aux" | "section" | "measure" | "mark";
export type SLine = { pts: P2[]; hidden: boolean; kind: LineKind };
export type SFill = { pts: P2[]; kind: "face" | "section" | "polygon" };
export type SLabel = { name: string; text: string; x: number; y: number; w: number; h: number; kind: "point" | "angle"; vertex?: boolean };
export type Scene = {
  lines: SLine[];
  fills: SFill[];
  dots: { name: string; x: number; y: number }[];
  labels: SLabel[];
  points: Map<string, P2>;
  bbox: [number, number, number, number];
  info: string[];
  errors: string[];
};
export type SceneOpts = { cx: number; cy: number; size: number; font?: number };

/** Góc nhìn mặc định "như SGK": chiếu xiên 45°, hệ số rút gọn 1/2 cho đa diện; chiếu vuông góc nhìn hơi từ trên cho nón/trụ/cầu. */
export const SGK_VIEW: Record<ViewMode, View> = { sgk: { mode: "sgk", th: 0, ph: 0.5 }, ortho: { mode: "ortho", th: 0, ph: 0.3 } };
const ALPHA = Math.PI / 4;
export const clampView = (v: View): View => ({ ...v, ph: v.mode === "sgk" ? Math.max(0.2, Math.min(0.95, v.ph)) : Math.max(0.05, Math.min(1.25, v.ph)) });

/** Hai hàng của phép chiếu (toạ độ màn hình X sang phải, Y lên) và hướng chiếu d (hướng về người xem). */
export function projection(v: View): { r1: V3; r2: V3; d: V3 } {
  const c = Math.cos(v.th), s = Math.sin(v.th);
  let r1: V3, r2: V3;
  if (v.mode === "sgk") {
    const k = clampView(v).ph, kc = k * Math.cos(ALPHA), ks = k * Math.sin(ALPHA);
    r1 = [c + kc * s, -s + kc * c, 0];
    r2 = [ks * s, ks * c, 1];
  } else {
    const e = clampView(v).ph;
    r1 = [c, -s, 0];
    r2 = [Math.sin(e) * s, Math.sin(e) * c, Math.cos(e)];
  }
  return { r1, r2, d: norm(cross(r1, r2)) };
}

// ---------- che khuất: giao tia (p + t·d, t > 0) với khối lồi ----------
type Iv = [number, number] | null;
const BIG = 1e6;
const cap = (a: Iv, lo: number, hi: number): Iv => (a && Math.max(a[0], lo) <= Math.min(a[1], hi) ? [Math.max(a[0], lo), Math.min(a[1], hi)] : null);

/** {t : A t² + 2B t + C ≤ 0} ∩ [lo, hi], biết trước kết quả là một khoảng (khối lồi). */
function quadIv(A: number, B: number, C: number, lo: number, hi: number): Iv {
  const f = (t: number) => (A * t + 2 * B) * t + C;
  const cand = [lo, hi];
  if (Math.abs(A) < 1e-12) {
    if (Math.abs(B) > 1e-12) cand.push(-C / (2 * B));
  } else {
    const disc = B * B - A * C;
    if (disc >= 0) {
      const r = Math.sqrt(disc);
      cand.push((-B - r) / A, (-B + r) / A);
    }
  }
  const ts = cand.filter((t) => t >= lo && t <= hi).sort((a, b) => a - b);
  let a = Infinity, b = -Infinity;
  for (let i = 0; i < ts.length; i++) {
    if (f(ts[i]!) <= 1e-9) (a = Math.min(a, ts[i]!), b = Math.max(b, ts[i]!));
    if (i + 1 < ts.length && f((ts[i]! + ts[i + 1]!) / 2) <= 0) (a = Math.min(a, ts[i]!), b = Math.max(b, ts[i + 1]!));
  }
  return a <= b ? [a, b] : null;
}
function slab(p: V3, d: V3, o: V3, u: V3, h: number): Iv {
  const s0 = dot(sub(p, o), u), du = dot(d, u);
  if (Math.abs(du) < 1e-12) return s0 >= -1e-9 && s0 <= h + 1e-9 ? [-BIG, BIG] : null;
  const t1 = -s0 / du, t2 = (h - s0) / du;
  return [Math.min(t1, t2), Math.max(t1, t2)];
}
function rayInterval(b: SolvedBody, pts: Map<string, V3>, p: V3, d: V3): Iv {
  if (b.type === "poly") {
    let lo = -BIG, hi = BIG;
    for (const pl of b.planes) {
      const dist = dot(pl.n, p) - pl.c, nd = dot(pl.n, d);
      if (Math.abs(nd) < 1e-12) {
        if (dist > 1e-9) return null;
        continue;
      }
      const t = -dist / nd;
      if (nd > 0) hi = Math.min(hi, t);
      else lo = Math.max(lo, t);
      if (lo > hi) return null;
    }
    return [lo, hi];
  }
  if (b.type === "sphere") {
    const w = sub(p, b.C);
    return quadIv(1, dot(w, d), dot(w, w) - b.r * b.r, -BIG, BIG);
  }
  const top = b.type === "cone" ? b.S : b.T;
  const H = len(sub(top, b.C));
  const u = norm(sub(top, b.C));
  const sl = slab(p, d, b.C, u, H);
  if (!sl) return null;
  const w = sub(p, b.C);
  const s0 = dot(w, u), du = dot(d, u);
  const q = sub(w, mul(u, s0)), e = sub(d, mul(u, du));
  if (b.type === "cylinder") return quadIv(dot(e, e), dot(q, e), dot(q, q) - b.r * b.r, sl[0], sl[1]);
  const k = b.r / H;
  return quadIv(dot(e, e) - k * k * du * du, dot(q, e) + k * k * (H - s0) * du, dot(q, q) - k * k * (H - s0) ** 2, sl[0], sl[1]);
}

export function makeHidden(s: Solved, d: V3): (p: V3) => boolean {
  const scale = Math.max(1, ...[...s.pts.values()].map((v) => len(v)));
  const eps = 1e-6 * scale;
  return (p) =>
    s.bodies.some((b) => {
      const iv = rayInterval(b, s.pts, p, d);
      return !!iv && iv[1] > eps && iv[1] - Math.max(iv[0], 0) > eps;
    });
}

/** Chia đường cong tham số t ∈ [0,1] thành các đoạn thấy/khuất (lấy mẫu + chia đôi tìm chỗ đổi). */
export function visRuns(f: (t: number) => V3, hid: (p: V3) => boolean, n = 72): { t0: number; t1: number; hidden: boolean }[] {
  const st = Array.from({ length: n }, (_, i) => hid(f((i + 0.5) / n)));
  const out: { t0: number; t1: number; hidden: boolean }[] = [];
  let t0 = 0;
  for (let i = 0; i < n; i++) {
    if (i + 1 < n && st[i + 1] === st[i]) continue;
    let t1 = 1;
    if (i + 1 < n) {
      let a = (i + 0.5) / n, b = (i + 1.5) / n;
      for (let k = 0; k < 30; k++) {
        const m = (a + b) / 2;
        if (hid(f(m)) === st[i]) a = m;
        else b = m;
      }
      t1 = (a + b) / 2;
    }
    out.push({ t0, t1, hidden: st[i]! });
    t0 = t1;
  }
  return out;
}

const circle = (C: V3, u: V3, r: number) => {
  const a = Math.abs(u[2]) < 0.9 ? norm(cross(u, [0, 0, 1])) : norm(cross(u, [1, 0, 0]));
  const b = cross(u, a);
  return { a, b, at: (th: number): V3 => add(C, add(mul(a, r * Math.cos(th)), mul(b, r * Math.sin(th)))) };
};

// ---------- hình học 2D cho nhãn ----------
type Box = { x0: number; y0: number; x1: number; y1: number };
function segHitsBox(a: P2, b: P2, r: Box): boolean {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const ps = [-dx, dx, -dy, dy], qs = [a[0] - r.x0, r.x1 - a[0], a[1] - r.y0, r.y1 - a[1]];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(ps[i]!) < 1e-12) {
      if (qs[i]! < 0) return false;
      continue;
    }
    const t = qs[i]! / ps[i]!;
    if (ps[i]! < 0) t0 = Math.max(t0, t);
    else t1 = Math.min(t1, t);
    if (t0 > t1) return false;
  }
  return true;
}
function distSeg(p: P2, a: P2, b: P2): number {
  const vx = b[0] - a[0], vy = b[1] - a[1], L = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L));
  return Math.hypot(a[0] + vx * t - p[0], a[1] + vy * t - p[1]);
}
const boxesHit = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
function inHull(p: P2, hull: P2[]): boolean {
  if (hull.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i]!, b = hull[(i + 1) % hull.length]!;
    const c = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(c) < 1e-9) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}
export function convexHull(ps: P2[]): P2[] {
  const p = [...ps].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: P2[] = [], up: P2[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of [...p].reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}
export const textWidth = (t: string, font: number) => [...t].reduce((w, ch) => w + (ch === "′" ? 0.3 : /[0-9]/.test(ch) ? 0.5 : /[°,]/.test(ch) ? 0.35 : 0.68), 0) * font;

// ---------- dựng cảnh ----------
export function buildScene(s: Solved, view: View, o: SceneOpts): Scene {
  const { r1, r2, d } = projection(view);
  const font = o.font ?? 18;
  const pr = (v: V3): P2 => [dot(r1, v), dot(r2, v)];
  // khung hình theo mọi điểm + đường tròn
  const all: V3[] = [...s.pts.values()];
  for (const b of s.bodies) {
    if (b.type === "poly") continue;
    const ring = (C: V3, u: V3) => {
      const c = circle(C, u, b.r);
      for (let i = 0; i < 24; i++) all.push(c.at((i / 24) * 2 * Math.PI));
    };
    if (b.type === "sphere") ring(b.C, d);
    else {
      const top = b.type === "cone" ? b.S : b.T;
      const u = norm(sub(top, b.C));
      ring(b.C, u);
      if (b.type === "cylinder") ring(b.T, u);
    }
  }
  const pp = all.map(pr);
  const mx0 = Math.min(...pp.map((p) => p[0])), mx1 = Math.max(...pp.map((p) => p[0]));
  const my0 = Math.min(...pp.map((p) => p[1])), my1 = Math.max(...pp.map((p) => p[1]));
  const k = (o.size * 1.5) / Math.max(mx1 - mx0, my1 - my0, 1e-6);
  const mcx = (mx0 + mx1) / 2, mcy = (my0 + my1) / 2;
  const P = (v: V3): P2 => {
    const q = pr(v);
    return [o.cx + (q[0] - mcx) * k, o.cy - (q[1] - mcy) * k];
  };
  const hid = makeHidden(s, d);
  const lines: SLine[] = [];
  const fills: SFill[] = [];
  const minRun = 1.5 / k;

  const addCurve = (f: (t: number) => V3, kind: LineKind, n: number, steps: number) => {
    for (const r of visRuns(f, hid, n)) {
      const a = f(r.t0), b = f(r.t1);
      if (steps <= 1 && len(sub(a, b)) < minRun) continue;
      const m = Math.max(1, Math.ceil((steps * (r.t1 - r.t0)) / 1));
      const pts = Array.from({ length: m + 1 }, (_, i) => P(f(r.t0 + ((r.t1 - r.t0) * i) / m)));
      lines.push({ pts, hidden: r.hidden, kind });
    }
  };
  const addSeg = (a: V3, b: V3, kind: LineKind) => addCurve((t) => lerp(a, b, t), kind, 72, 1);
  const pt = (n: string) => s.pts.get(n)!;

  const edgeSegs: [V3, V3][] = [];
  for (const b of s.bodies) {
    if (b.type === "poly") {
      for (const [i, j] of b.edges) {
        edgeSegs.push([pt(i), pt(j)]);
        addSeg(pt(i), pt(j), "edge");
      }
      b.faces.forEach((f, fi) => {
        const pl = b.planes[fi];
        if (pl && dot(pl.n, d) > 1e-9) fills.push({ pts: f.map((n) => P(pt(n))), kind: "face" });
      });
      continue;
    }
    if (b.type === "sphere") {
      const out = circle(b.C, d, b.r);
      // viền cầu: đường bao thấy được
      lines.push({ pts: Array.from({ length: 145 }, (_, i) => P(out.at((i / 144) * 2 * Math.PI))), hidden: false, kind: "edge" });
      fills.push({ pts: Array.from({ length: 72 }, (_, i) => P(out.at((i / 72) * 2 * Math.PI))), kind: "face" });
      const eq = circle(b.C, [0, 0, 1], b.r);
      addCurve((t) => eq.at(t * 2 * Math.PI), "edge", 144, 144);
      continue;
    }
    const top = b.type === "cone" ? b.S : b.T;
    const u = norm(sub(top, b.C));
    const H = len(sub(top, b.C));
    const base = circle(b.C, u, b.r);
    addCurve((t) => base.at(t * 2 * Math.PI), "edge", 144, 144);
    const A = dot(base.a, d), B = dot(base.b, d);
    const R = Math.hypot(A, B), phi = Math.atan2(B, A);
    if (b.type === "cylinder") {
      const tc = circle(b.T, u, b.r);
      addCurve((t) => tc.at(t * 2 * Math.PI), "edge", 144, 144);
      if (R > 1e-9) for (const th of [phi + Math.PI / 2, phi - Math.PI / 2]) addSeg(base.at(th), tc.at(th), "edge");
      fills.push({ pts: [...Array.from({ length: 37 }, (_, i) => P(base.at(phi + Math.PI / 2 + (i / 36) * Math.PI))), ...Array.from({ length: 37 }, (_, i) => P(tc.at(phi - Math.PI / 2 + (i / 36) * Math.PI)))], kind: "face" });
    } else {
      const rhs = R > 1e-9 ? (-b.r * dot(u, d)) / (H * R) : 2;
      if (Math.abs(rhs) <= 1) {
        const ac = Math.acos(rhs);
        for (const th of [phi + ac, phi - ac]) addSeg(base.at(th), b.S, "edge");
        fills.push({ pts: [P(b.S), ...Array.from({ length: 49 }, (_, i) => P(base.at(phi + ac + (i / 48) * (2 * Math.PI - 2 * ac))))], kind: "face" });
      }
    }
  }
  const covered = (a: V3, b: V3) =>
    edgeSegs.some(([p, q]) => {
      const L = len(sub(q, p));
      const on = (x: V3) => len(cross(sub(x, p), sub(q, p))) / (L || 1) < 1e-7 && dot(sub(x, p), sub(q, p)) >= -1e-9 && dot(sub(x, q), sub(p, q)) >= -1e-9;
      return on(a) && on(b);
    });
  for (const poly of s.polys) fills.push({ pts: poly.names.map((n) => P(pt(n))), kind: poly.kind === "section" ? "section" : "polygon" });
  for (const sg of s.segs) {
    const a = pt(sg.a), b = pt(sg.b);
    if (sg.kind !== "measure" && covered(a, b)) continue;
    addSeg(a, b, sg.kind === "edge" ? "edge" : sg.kind);
  }

  // ký hiệu
  const labels: SLabel[] = [];
  const arcLabels: { name: string; text: string; v: P2; dir: number; r: number }[] = [];
  const pxLen = (u: V3) => Math.hypot(dot(r1, u), dot(r2, u)) * k || 1;
  let arcN = 0;
  for (const m of s.marks) {
    if (m.type === "equal") {
      for (const [a, b] of m.segments) {
        const A = P(pt(a)), B = P(pt(b));
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
        const tx = (B[0] - A[0]) / L, ty = (B[1] - A[1]) / L;
        const mxp = (A[0] + B[0]) / 2, myp = (A[1] + B[1]) / 2;
        for (let i = 0; i < m.group; i++) {
          const off = (i - (m.group - 1) / 2) * 4;
          const cx = mxp + tx * off, cy = myp + ty * off;
          // gạch nghiêng nhẹ như viết tay trong sách
          const nx = -ty * 0.94 + tx * 0.34, ny = tx * 0.94 + ty * 0.34;
          lines.push({ pts: [[cx - nx * 5, cy - ny * 5], [cx + nx * 5, cy + ny * 5]], hidden: false, kind: "mark" });
        }
      }
      continue;
    }
    const V = pt(m.at), A = pt(m.a), B = pt(m.b);
    const ua = norm(sub(A, V)), ubRaw = sub(B, V);
    if (len(sub(A, V)) < 1e-9 || len(ubRaw) < 1e-9) continue;
    if (m.type === "right") {
      const ub = norm(sub(ubRaw, mul(ua, dot(ubRaw, ua))));
      const sz = Math.min(11 / ((pxLen(ua) + pxLen(ub)) / 2), 0.3 * Math.min(len(sub(A, V)), len(ubRaw)));
      lines.push({ pts: [P(add(V, mul(ua, sz))), P(add(V, add(mul(ua, sz), mul(ub, sz)))), P(add(V, mul(ub, sz)))], hidden: false, kind: "mark" });
      continue;
    }
    const ub0 = norm(ubRaw);
    const ang = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub0))));
    const w = norm(sub(ub0, mul(ua, dot(ub0, ua))));
    const rad = Math.min((17 + 4 * arcN++) / ((pxLen(ua) + pxLen(ub0)) / 2), 0.45 * Math.min(len(sub(A, V)), len(ubRaw)));
    const at = (t: number, r = rad) => add(V, add(mul(ua, r * Math.cos(t * ang)), mul(w, r * Math.sin(t * ang))));
    lines.push({ pts: Array.from({ length: 25 }, (_, i) => P(at(i / 24))), hidden: false, kind: "mark" });
    if (m.text) {
      const c = P(at(0.5)), v = P(V);
      arcLabels.push({ name: `∠${m.at}${arcN}`, text: m.text, v, dir: Math.atan2(c[1] - v[1], c[0] - v[0]), r: Math.hypot(c[0] - v[0], c[1] - v[1]) });
    }
  }

  // điểm & nhãn
  const points = new Map<string, P2>();
  for (const [n, v] of s.pts) points.set(n, P(v));
  const roundCenters = new Set(s.bodies.flatMap((b) => (b.type === "poly" ? [] : [b.center])));
  const dots = s.shown.filter((n) => !s.vertices.has(n) || roundCenters.has(n)).map((n) => ({ name: n, x: points.get(n)![0], y: points.get(n)![1] }));
  const segs2: [P2, P2][] = lines.flatMap((l) => l.pts.slice(1).map((q, i) => [l.pts[i]!, q] as [P2, P2]));
  const bodyPts = s.bodies.flatMap((b) => (b.type === "poly" ? b.names.map((n) => points.get(n)!) : []));
  const hull = convexHull(bodyPts.length >= 3 ? bodyPts : [...points.values()]);
  const gc: P2 = hull.length ? [hull.reduce((a, p) => a + p[0], 0) / hull.length, hull.reduce((a, p) => a + p[1], 0) / hull.length] : [o.cx, o.cy];
  const placed: Box[] = [];
  const dotBoxes = dots.map((dt) => ({ x0: dt.x - 3, y0: dt.y - 3, x1: dt.x + 3, y1: dt.y + 3, n: dt.name }));
  /** Điểm phạt của ô chữ tâm (x, y): cắt nét, sát nét, đè chữ khác, đè chấm điểm. */
  const clash = (x: number, y: number, w: number, h: number, self?: string) => {
    const bx: Box = { x0: x - w / 2 - 1.5, y0: y - h / 2 - 1.5, x1: x + w / 2 + 1.5, y1: y + h / 2 + 1.5 };
    let sc = 0;
    for (const [a2, b2] of segs2) {
      if (segHitsBox(a2, b2, bx)) sc += 60;
      else {
        const dd = distSeg([x, y], a2, b2) - Math.max(w, h) / 2;
        if (dd < 3) sc += (3 - dd) * 2;
      }
    }
    for (const q of placed) if (boxesHit(q, bx)) sc += 200;
    for (const q of dotBoxes) if (q.n !== self && boxesHit(q, bx)) sc += 80;
    return sc;
  };
  // chữ số đo góc: quanh tia phân giác, ngoài cung, tránh nét
  for (const a of arcLabels) {
    const w = textWidth(a.text, font * 0.78), h = font * 0.78;
    let best: { x: number; y: number; sc: number } | null = null;
    for (const extra of [3, 10, 18])
      for (let k = -4; k <= 4; k++) {
        const t = a.dir + k * 0.18, dx = Math.cos(t), dy = Math.sin(t);
        const reach = a.r + extra + Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2);
        const x = a.v[0] + dx * reach, y = a.v[1] + dy * reach;
        const sc = clash(x, y, w, h) + Math.abs(k) * 2 + extra / 3;
        if (!best || sc < best.sc) best = { x, y, sc };
      }
    labels.push({ name: a.name, text: a.text, x: best!.x, y: best!.y, w, h, kind: "angle" });
    placed.push({ x0: best!.x - w / 2, y0: best!.y - h / 2, x1: best!.x + w / 2, y1: best!.y + h / 2 });
  }
  const order = [...s.shown].sort((a, b) => Number(s.vertices.has(b)) - Number(s.vertices.has(a)));
  for (const n of order) {
    const p = points.get(n)!;
    const text = prettyName(n);
    const w = textWidth(text, font), h = font * 0.82;
    let best: { x: number; y: number; sc: number } | null = null;
    const out = [p[0] - gc[0], p[1] - gc[1]];
    const ol = Math.hypot(out[0]!, out[1]!) || 1;
    for (const r of [font * 0.42, font * 0.85]) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * 2 * Math.PI;
        const dx = Math.cos(a), dy = Math.sin(a);
        const reach = r + Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2);
        const x = p[0] + dx * reach, y = p[1] + dy * reach;
        let sc = (r > font * 0.5 ? 3 : 0) + clash(x, y, w, h, n);
        if (s.vertices.has(n)) {
          sc += 6 * (1 - (dx * out[0]! + dy * out[1]!) / ol);
          if (inHull([x, y], hull)) sc += 10;
        }
        if (!best || sc < best.sc) best = { x, y, sc };
      }
    }
    labels.push({ name: n, text, x: best!.x, y: best!.y, w, h, kind: "point", vertex: s.vertices.has(n) });
    placed.push({ x0: best!.x - w / 2, y0: best!.y - h / 2, x1: best!.x + w / 2, y1: best!.y + h / 2 });
  }

  const xs = [...lines.flatMap((l) => l.pts.map((q) => q[0])), ...labels.flatMap((l) => [l.x - l.w / 2, l.x + l.w / 2])];
  const ys = [...lines.flatMap((l) => l.pts.map((q) => q[1])), ...labels.flatMap((l) => [l.y - l.h / 2, l.y + l.h / 2])];
  const bbox: Scene["bbox"] = xs.length ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] : [o.cx, o.cy, o.cx, o.cy];
  return { lines, fills, dots, labels, points, bbox, info: s.info, errors: s.errors };
}
