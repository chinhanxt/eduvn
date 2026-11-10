// web/src/board/recognize.ts — nét vẽ tay → hình sạch: nhận dạng hình học trực tiếp, $P làm phương án dự phòng.
import { PRecognizer, type Pt, type Template, resample } from "./dollarP";
import type { ShapeKind } from "./doc";

export type Recognized = { kind: ShapeKind; pts: number[] };

const toPts = (flat: readonly number[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push({ x: flat[i]!, y: flat[i + 1]! });
  return out;
};
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const len = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + dist(p[i - 1]!, q) : 0), 0);
const bbox = (p: Pt[]) => {
  const xs = p.map((q) => q.x), ys = p.map((q) => q.y);
  const x1 = Math.min(...xs), y1 = Math.min(...ys), x2 = Math.max(...xs), y2 = Math.max(...ys);
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1, diag: Math.hypot(x2 - x1, y2 - y1) };
};
const r1 = (v: number) => Math.round(v * 10) / 10;

function segDist(p: Pt, a: Pt, b: Pt): number {
  const vx = b.x - a.x, vy = b.y - a.y, L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2)) : 0;
  return Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y);
}

/** Ramer–Douglas–Peucker. */
function rdp(p: Pt[], eps: number): Pt[] {
  if (p.length < 3) return p;
  let dmax = 0, idx = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = segDist(p[i]!, p[0]!, p[p.length - 1]!);
    if (d > dmax) (dmax = d, (idx = i));
  }
  if (dmax <= eps) return [p[0]!, p[p.length - 1]!];
  return [...rdp(p.slice(0, idx + 1), eps).slice(0, -1), ...rdp(p.slice(idx), eps)];
}

function fitLine(p: Pt[]): Recognized | null {
  const a = p[0]!, b = p[p.length - 1]!, L = dist(a, b);
  if (L < 20) return null;
  const maxDev = Math.max(...p.map((q) => segDist(q, a, b)));
  if (maxDev > Math.max(5, L * 0.08)) return null;
  let [x1, y1, x2, y2] = [a.x, a.y, b.x, b.y];
  const ang = Math.abs((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
  if (ang < 6 || ang > 174) y2 = y1 = (y1 + y2) / 2;
  else if (Math.abs(ang - 90) < 6) x2 = x1 = (x1 + x2) / 2;
  return { kind: "line", pts: [x1, y1, x2, y2].map(r1) };
}

/** Một nét: thân thẳng tới mũi nhọn rồi quay lại vẽ cánh mũi tên. */
function fitArrow(p: Pt[]): Recognized | null {
  const s = p[0]!;
  let dm = 0;
  for (const q of p) dm = Math.max(dm, dist(s, q));
  // mũi nhọn = lần đầu nét tới gần điểm xa nhất rồi leo tới đỉnh cục bộ (không lấy lần quay lại)
  let ti = p.findIndex((q) => dist(s, q) >= dm * 0.93);
  while (ti + 1 < p.length && dist(s, p[ti + 1]!) > dist(s, p[ti]!)) ti++;
  dm = dist(s, p[ti]!);
  if (dm < 40 || ti > p.length - 4) return null;
  const shaft = p.slice(0, ti + 1), tip = p[ti]!, tail = p.slice(ti);
  if (Math.max(...shaft.map((q) => segDist(q, s, tip))) > dm * 0.1) return null;
  const tl = len(tail);
  if (tl < dm * 0.2 || tl > dm * 1.1) return null;
  if (Math.max(...tail.map((q) => dist(q, tip))) > dm * 0.42) return null;
  return { kind: "arrow", pts: [s.x, s.y, tip.x, tip.y].map(r1) };
}

function fitEllipse(p: Pt[]): Recognized | null {
  const b = bbox(p);
  if (b.w < 16 || b.h < 16) return null;
  const cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
  const dev = p.map((q) => Math.abs(Math.hypot((q.x - cx) / (b.w / 2), (q.y - cy) / (b.h / 2)) - 1));
  if (dev.reduce((a, c) => a + c, 0) / dev.length > 0.065 || Math.max(...dev) > 0.22) return null;
  let { x1, y1, x2, y2 } = b;
  if (Math.abs(b.w - b.h) < 0.15 * Math.max(b.w, b.h)) {
    const d = (b.w + b.h) / 2;
    [x1, x2, y1, y2] = [cx - d / 2, cx + d / 2, cy - d / 2, cy + d / 2];
  }
  return { kind: "circle", pts: [x1, y1, x2, y2].map(r1) };
}

function closedPolygon(p: Pt[]): Recognized | null {
  const b = bbox(p);
  let v = rdp([...p, p[0]!], Math.max(4, b.diag * 0.045));
  v = v.slice(0, -1);
  // gộp đỉnh sát nhau (điểm đóng nét)
  const m: Pt[] = [];
  for (const q of v) if (!m.length || dist(q, m[m.length - 1]!) > b.diag * 0.08) m.push(q);
  if (m.length > 1 && dist(m[0]!, m[m.length - 1]!) <= b.diag * 0.08) m.pop();
  // bỏ đỉnh gần thẳng hàng (điểm bắt đầu nằm giữa cạnh, đuôi nét thừa)
  for (let again = true; again && m.length > 3; ) {
    again = false;
    for (let i = 0; i < m.length; i++) {
      const a = m[(i + m.length - 1) % m.length]!, c = m[i]!, d = m[(i + 1) % m.length]!;
      const turn = Math.abs(Math.atan2(c.x - a.x, c.y - a.y) - Math.atan2(d.x - c.x, d.y - c.y));
      const deg = (Math.min(turn, 2 * Math.PI - turn) * 180) / Math.PI;
      if (deg < 28) (m.splice(i, 1), (again = true));
      if (again) break;
    }
  }
  if (m.length < 3 || m.length > 12) return null;
  const tol = Math.max(8, b.diag * 0.12);
  const near = (q: Pt, x: number, y: number) => Math.hypot(q.x - x, q.y - y) <= tol;
  if (m.length === 4) {
    const corners: [number, number][] = [[b.x1, b.y1], [b.x2, b.y1], [b.x2, b.y2], [b.x1, b.y2]];
    if (corners.every(([x, y]) => m.some((q) => near(q, x, y)))) return { kind: "rect", pts: [b.x1, b.y1, b.x2, b.y2].map(r1) };
  }
  if (m.length === 3) {
    const apex: [number, number] = [(b.x1 + b.x2) / 2, b.y1];
    const ok = [apex, [b.x2, b.y2], [b.x1, b.y2]].every(([x, y]) => m.some((q) => near(q!, x!, y!)));
    if (ok) return { kind: "triangle", pts: [b.x1, b.y1, b.x2, b.y2].map(r1) };
  }
  return { kind: "polygon", pts: m.flatMap((q) => [r1(q.x), r1(q.y)]) };
}

// Mẫu cho $P (phương án dự phòng khi nét méo, hình học không khớp): vẽ ngược chiều/khác điểm bắt đầu vẫn nhận được.
const loop = (f: (t: number) => Pt, n = 48): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const poly = (v: Pt[]): Pt[] => {
  const pts: Pt[] = [];
  v.forEach((a, i) => {
    const b = v[(i + 1) % v.length]!;
    for (let k = 0; k < 12; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / 12, y: a.y + ((b.y - a.y) * k) / 12 });
  });
  return [...pts, pts[0]!];
};
const TEMPLATES: Template[] = [
  { name: "circle", points: loop((t) => ({ x: Math.cos(t * 2 * Math.PI), y: Math.sin(t * 2 * Math.PI) })) },
  { name: "rect", points: poly([{ x: 0, y: 0 }, { x: 1.4, y: 0 }, { x: 1.4, y: 1 }, { x: 0, y: 1 }]) },
  { name: "rect", points: poly([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]) },
  { name: "triangle", points: poly([{ x: 0.5, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]) },
];
const REC = new PRecognizer(TEMPLATES);

function bboxShape(kind: "circle" | "rect" | "triangle", p: Pt[]): Recognized {
  const b = bbox(p);
  return { kind, pts: [b.x1, b.y1, b.x2, b.y2].map(r1) };
}

/** Nét [x0,y0,x1,y1,…] → hình sạch, hoặc null nếu không nhận ra (giữ nguyên nét tay). */
export function recognizeStroke(flat: readonly number[]): Recognized | null {
  const raw = toPts(flat);
  if (raw.length < 6) return null;
  const p = resample(raw, 64);
  const b = bbox(p);
  const L = len(p);
  if (b.diag < 24 || L < 30) return null;
  const closed = dist(p[0]!, p[p.length - 1]!) < Math.max(b.diag * 0.22, 14);
  if (!closed) return fitLine(p) ?? fitArrow(p);
  if (b.w < 14 || b.h < 14) return fitLine([p[0]!, p[Math.floor(p.length / 2)]!]);
  const e = fitEllipse(p);
  if (e) return e;
  const g = closedPolygon(p);
  if (g && (g.kind !== "polygon" || bboxAspectOk(b))) return g;
  const h = REC.recognize(p);
  return h.score >= 0.8 ? bboxShape(h.name as "circle" | "rect" | "triangle", p) : g;
}
const bboxAspectOk = (b: { w: number; h: number }) => Math.min(b.w, b.h) > 20;
