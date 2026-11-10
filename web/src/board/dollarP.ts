// web/src/board/dollarP.ts
// Bộ nhận dạng $P (Point-Cloud Recognizer) — Vatavu, Anthony & Wobbrock, ICMI 2012; $Q (2018) là bản tối ưu tốc độ
// cùng họ, ở đây port phần lõi của $P (resample → chuẩn hoá → khớp đám điểm tham lam) sang TypeScript.
// Mã gốc BSD-3-Clause, © 2012 Radu-Daniel Vatavu, Lisa Anthony, Jacob O. Wobbrock. Xem THIRD_PARTY_LICENSES.md.
export type Pt = { x: number; y: number };
export type Template = { name: string; points: Pt[] };

const N = 32;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLength = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + dist(p[i - 1]!, q) : 0), 0);

export function resample(points: Pt[], n = N): Pt[] {
  const I = pathLength(points) / (n - 1);
  if (!(I > 0)) return Array.from({ length: n }, () => ({ ...points[0]! }));
  const pts = points.map((p) => ({ ...p }));
  const out: Pt[] = [{ ...pts[0]! }];
  let D = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1]!, pts[i]!);
    if (D + d >= I) {
      const t = (I - D) / d;
      const q = { x: pts[i - 1]!.x + t * (pts[i]!.x - pts[i - 1]!.x), y: pts[i - 1]!.y + t * (pts[i]!.y - pts[i - 1]!.y) };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1]! });
  return out.slice(0, n);
}

function normalize(points: Pt[]): Pt[] {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const s = Math.max(maxX - minX, maxY - minY) || 1;
  const sc = points.map((p) => ({ x: (p.x - minX) / s, y: (p.y - minY) / s }));
  const cx = sc.reduce((a, p) => a + p.x, 0) / sc.length, cy = sc.reduce((a, p) => a + p.y, 0) / sc.length;
  return sc.map((p) => ({ x: p.x - cx, y: p.y - cy }));
}

const prep = (points: Pt[]) => normalize(resample(points));

function cloudDistance(a: Pt[], b: Pt[], start: number): number {
  const n = a.length;
  const matched = new Array<boolean>(n).fill(false);
  let sum = 0, i = start;
  do {
    let min = Infinity, idx = -1;
    for (let j = 0; j < n; j++) {
      if (matched[j]) continue;
      const d = dist(a[i]!, b[j]!);
      if (d < min) (min = d, (idx = j));
    }
    matched[idx] = true;
    sum += (1 - ((i - start + n) % n) / n) * min;
    i = (i + 1) % n;
  } while (i !== start);
  return sum;
}

function greedyCloudMatch(a: Pt[], b: Pt[]): number {
  const n = a.length, step = Math.floor(n ** 0.5);
  let min = Infinity;
  for (let i = 0; i < n; i += step) min = Math.min(min, cloudDistance(a, b, i), cloudDistance(b, a, i));
  return min;
}

export class PRecognizer {
  private readonly templates: Template[];
  constructor(templates: Template[]) {
    this.templates = templates.map((t) => ({ name: t.name, points: prep(t.points) }));
  }
  /** Lớp gần nhất + điểm 0..1 (càng cao càng giống). */
  recognize(points: Pt[]): { name: string; score: number } {
    const c = prep(points);
    let best = Infinity, name = "";
    for (const t of this.templates) {
      const d = greedyCloudMatch(c, t.points);
      if (d < best) (best = d, (name = t.name));
    }
    return { name, score: name ? Math.max(0, (2 - best) / 2) : 0 };
  }
}
