// web/src/geometry3d/solver.ts — bộ giải dựng hình: từ ràng buộc (spec) ra toạ độ 3D, khối, thiết diện, số đo. Thuần TS.
import { type V3, add, cross, dot, len, lerp, mul, norm, sub } from "../board/geom3";
import { fmtAngle, fmtLen, prettyName } from "./fmt";
import { type Body, type ConstructionSpec, type Mark, type Measure, type Pair, type PointDef, type Triple, definedIds, refsOf } from "./spec";

export type Plane = { n: V3; c: number };
export type PolyBody = { type: "poly"; names: string[]; faces: string[][]; edges: Pair[]; planes: Plane[] };
export type SolvedBody =
  | PolyBody
  | { type: "cone"; C: V3; S: V3; r: number; center: string; apex: string }
  | { type: "cylinder"; C: V3; T: V3; r: number; center: string; top: string }
  | { type: "sphere"; C: V3; r: number; center: string };

export type SegKind = "edge" | "aux" | "section" | "measure";
export type SolvedSeg = { a: string; b: string; kind: SegKind };
export type SolvedPoly = { names: string[]; kind: "section" | "polygon"; shape: string };
export type SolvedMark =
  | { type: "right"; at: string; a: string; b: string }
  | { type: "equal"; segments: Pair[]; group: number }
  | { type: "angle"; at: string; a: string; b: string; text: string };
export type Solved = {
  pts: Map<string, V3>;
  /** điểm có tên hiện trên hình (đã bỏ `hide`) */
  shown: string[];
  /** đỉnh của khối (không chấm tròn kiểu SGK) */
  vertices: Set<string>;
  bodies: SolvedBody[];
  segs: SolvedSeg[];
  polys: SolvedPoly[];
  marks: SolvedMark[];
  info: string[];
  errors: string[];
};

const EPS = 1e-7;
const deg = (r: number) => (r * 180) / Math.PI;
const near = (a: V3, b: V3, e = 1e-6) => len(sub(a, b)) < e;

export function planeOf(a: V3, b: V3, c: V3): Plane | null {
  const n = cross(sub(b, a), sub(c, a));
  const l = len(n);
  if (l < 1e-10) return null;
  const u = mul(n, 1 / l);
  return { n: u, c: dot(u, a) };
}
export const footOnPlane = (p: V3, pl: Plane): V3 => sub(p, mul(pl.n, dot(pl.n, p) - pl.c));
export function footOnLine(p: V3, a: V3, b: V3): V3 {
  const u = sub(b, a);
  const L2 = dot(u, u) || 1;
  return add(a, mul(u, dot(sub(p, a), u) / L2));
}
export function linePlane(a: V3, b: V3, pl: Plane): V3 | null {
  const u = sub(b, a);
  const den = dot(pl.n, u);
  if (Math.abs(den) < 1e-10) return null;
  return add(a, mul(u, (pl.c - dot(pl.n, a)) / den));
}
/** Hai điểm gần nhau nhất của hai đường thẳng (null nếu song song). */
export function closestPoints(a: V3, b: V3, c: V3, d: V3): [V3, V3] | null {
  const u = sub(b, a), v = sub(d, c), w = sub(a, c);
  const A = dot(u, u), B = dot(u, v), C = dot(v, v), D = dot(u, w), E = dot(v, w);
  const den = A * C - B * B;
  if (Math.abs(den) < 1e-12 * A * C) return null;
  const s = (B * E - C * D) / den, t = (A * E - B * D) / den;
  return [add(a, mul(u, s)), add(c, mul(v, t))];
}
export function angleAt(a: V3, o: V3, b: V3): number {
  const u = sub(a, o), v = sub(b, o);
  const c = dot(u, v) / ((len(u) || 1) * (len(v) || 1));
  return deg(Math.acos(Math.max(-1, Math.min(1, c))));
}

/** Đỉnh đa giác đáy trong mặt phẳng z = 0 (chưa dời tâm). Quy ước SGK: tứ giác A trước-trái, B trước-phải; tam giác AC là cạnh sau, B ở trước. */
function basePolygon(p: Extract<PointDef, { type: "polygon" }>): [number, number][] | string {
  const n = p.ids.length;
  const a = p.a ?? 1;
  const rad = ((p.angle ?? 60) * Math.PI) / 180;
  const tri = (ab: number, bc: number, ca: number): [number, number][] | string => {
    if (ab + bc <= ca + 1e-9 || bc + ca <= ab + 1e-9 || ca + ab <= bc + 1e-9) return "Ba cạnh không tạo thành tam giác";
    const xb = (ab * ab - bc * bc + ca * ca) / (2 * ca);
    return [[0, 0], [xb, -Math.sqrt(Math.max(0, ab * ab - xb * xb))], [ca, 0]];
  };
  switch (p.shape) {
    case "triangle":
    case "equilateral":
    case "isosceles":
    case "right": {
      if (n !== 3) return "Đáy tam giác cần đúng 3 đỉnh";
      if (p.shape === "triangle") {
        const s = p.sides ?? [a, a, a];
        return tri(s[0], s[1], s[2]);
      }
      if (p.shape === "equilateral") return tri(a, a, a);
      const at = Math.max(0, p.at ? p.ids.indexOf(p.at) : p.shape === "right" ? 1 : 0);
      const others = [0, 1, 2].filter((i) => i !== at) as [number, number];
      const L = [0, 0, 0];
      if (p.shape === "right") {
        const b = p.b ?? a;
        L[others[0]] = a;
        L[others[1]] = b;
        // khoảng cách giữa hai đỉnh còn lại
        const hyp = Math.hypot(a, b);
        const d = (i: number, j: number) => (i === at ? L[j]! : j === at ? L[i]! : hyp);
        return tri(d(0, 1), d(1, 2), d(2, 0));
      }
      const leg = a;
      const base = p.b ?? (p.angle !== undefined ? 2 * leg * Math.sin(rad / 2) : leg * 1.2);
      const d = (i: number, j: number) => (i === at || j === at ? leg : base);
      return tri(d(0, 1), d(1, 2), d(2, 0));
    }
    case "square":
    case "rectangle":
    case "rhombus":
    case "parallelogram":
    case "trapezoid": {
      if (n !== 4) return "Đáy tứ giác cần đúng 4 đỉnh";
      const b = p.b ?? a;
      if (p.shape === "square") return [[0, 0], [a, 0], [a, a], [0, a]];
      if (p.shape === "rectangle") return [[0, 0], [a, 0], [a, b], [0, b]];
      if (p.shape === "rhombus" || p.shape === "parallelogram") {
        const ad = p.shape === "rhombus" ? a : b;
        const D: [number, number] = [ad * Math.cos(rad), ad * Math.sin(rad)];
        return [[0, 0], [a, 0], [a + D[0], D[1]], D];
      }
      // hình thang: đáy AD = a ở trước, BC = b ở sau, chiều cao h
      const h = p.h ?? (p.rightAngle ? b : a / 2);
      if (p.rightAngle) return [[0, 0], [0, h], [b, h], [a, 0]];
      return [[0, 0], [(a - b) / 2, h], [(a + b) / 2, h], [a, 0]];
    }
    case "regular": {
      if (n < 3) return "Đa giác đều cần ít nhất 3 đỉnh";
      const R = a / (2 * Math.sin(Math.PI / n));
      return Array.from({ length: n }, (_, i) => {
        const t = -Math.PI / 2 - Math.PI / n + (2 * Math.PI * i) / n;
        return [R * Math.cos(t), R * Math.sin(t)] as [number, number];
      });
    }
  }
}

function circumcenter(a: V3, b: V3, c: V3): V3 | null {
  const ab = sub(b, a), ac = sub(c, a);
  const n = cross(ab, ac);
  const n2 = dot(n, n);
  if (n2 < 1e-14) return null;
  const t = add(mul(cross(n, ab), dot(ac, ac)), mul(cross(ac, n), dot(ab, ab)));
  return add(a, mul(t, 1 / (2 * n2)));
}

const AUTO = ["H", "K", "I", "E", "F", "J", "L", "P", "Q", "R", "T", "U", "V", "X", "Y", "Z", "G", "M", "N"];
/** Đỉnh mới của thiết diện: đặt tên kiểu lời giải (P, Q, R…). */
const AUTO_SECTION = ["P", "Q", "R", "K", "E", "F", "I", "J", "T", "U", "V", "H", "L", "X", "Y", "Z"];
/** "= 45°" hoặc "≈ 67,8° (tan = √6)" — không viết "= ≈". */
const eqv = (t: string) => (t.startsWith("≈") ? t : `= ${t}`);
/** Chữ cạnh cung góc trên hình: gọn, không "≈", không tan. */
const arcText = (v: number) => fmtAngle(v).replace(/ \(.*$/, "").replace(/^≈ /, "");

/** Sắp lại định nghĩa theo phụ thuộc (AI đôi khi khai báo trước khi dùng). */
function ordered(points: PointDef[]): PointDef[] {
  const out: PointDef[] = [];
  const known = new Set<string>();
  let rest = [...points];
  while (rest.length) {
    const next = rest.filter((p) => refsOf(p).every((r) => known.has(r)));
    if (!next.length) return [...out, ...rest];
    for (const p of next) for (const id of definedIds(p)) known.add(id);
    out.push(...next);
    rest = rest.filter((p) => !next.includes(p));
  }
  return out;
}

/** Mặt phẳng chứa đa giác lồi (pháp tuyến hướng ra ngoài khối có trọng tâm g). */
function outward(face: V3[], g: V3): Plane | null {
  for (let i = 1; i + 1 < face.length; i++) {
    const pl = planeOf(face[0]!, face[i]!, face[i + 1]!);
    if (pl) return dot(pl.n, g) - pl.c > 0 ? { n: mul(pl.n, -1), c: -pl.c } : pl;
  }
  return null;
}

/** Thiết diện của khối đa diện lồi với mặt phẳng: đa giác (đã sắp theo vòng). */
export function sectionPolygon(pts: Map<string, V3>, body: PolyBody, pl: Plane): V3[] {
  const out: V3[] = [];
  const push = (p: V3) => {
    if (!out.some((q) => near(p, q, 1e-7))) out.push(p);
  };
  for (const [i, j] of body.edges) {
    const A = pts.get(i)!, B = pts.get(j)!;
    const fa = dot(pl.n, A) - pl.c, fb = dot(pl.n, B) - pl.c;
    if (Math.abs(fa) < EPS) push(A);
    if (Math.abs(fb) < EPS) push(B);
    if ((fa < -EPS && fb > EPS) || (fa > EPS && fb < -EPS)) push(lerp(A, B, fa / (fa - fb)));
  }
  if (out.length < 3) return [];
  const c = mul(out.reduce<V3>((s, p) => add(s, p), [0, 0, 0]), 1 / out.length);
  const u = norm(sub(out[0]!, c)), w = cross(pl.n, u);
  return out.sort((a, b) => Math.atan2(dot(sub(a, c), w), dot(sub(a, c), u)) - Math.atan2(dot(sub(b, c), w), dot(sub(b, c), u)));
}

const NGON = ["", "", "", "tam giác", "tứ giác", "ngũ giác", "lục giác"];
/** Gọi tên đa giác phẳng như lời giải SGK. */
export function shapeName(poly: V3[]): string {
  const n = poly.length;
  const sides = poly.map((p, i) => len(sub(poly[(i + 1) % n]!, p)));
  const angs = poly.map((p, i) => angleAt(poly[(i + n - 1) % n]!, p, poly[(i + 1) % n]!));
  const eq = (x: number, y: number) => Math.abs(x - y) < 1e-6 * Math.max(1, x);
  const allS = sides.every((s) => eq(s, sides[0]!));
  const allA = angs.every((a) => Math.abs(a - angs[0]!) < 1e-4);
  if (n === 3) {
    if (allS) return "tam giác đều";
    const right = angs.findIndex((a) => Math.abs(a - 90) < 1e-4);
    const iso = eq(sides[0]!, sides[1]!) || eq(sides[1]!, sides[2]!) || eq(sides[2]!, sides[0]!);
    if (right >= 0) return iso ? "tam giác vuông cân" : "tam giác vuông";
    return iso ? "tam giác cân" : "tam giác";
  }
  if (n === 4) {
    const par = (i: number) => {
      const u = norm(sub(poly[(i + 1) % 4]!, poly[i]!)), v = norm(sub(poly[(i + 3) % 4]!, poly[(i + 2) % 4]!));
      return len(cross(u, v)) < 1e-6;
    };
    const p0 = par(0), p1 = par(1);
    if (p0 && p1) {
      if (allS && allA) return "hình vuông";
      if (allA) return "hình chữ nhật";
      if (allS) return "hình thoi";
      return "hình bình hành";
    }
    if (p0 || p1) {
      const k = p0 ? 1 : 0;
      if (angs.some((a) => Math.abs(a - 90) < 1e-4)) return "hình thang vuông";
      if (eq(sides[k]!, sides[k + 2]!)) return "hình thang cân";
      return "hình thang";
    }
    return "tứ giác";
  }
  if (allS && allA) return `${NGON[n] ?? `đa giác ${n} cạnh`} đều`;
  return NGON[n] ?? `đa giác ${n} cạnh`;
}

export function solve(spec: ConstructionSpec): Solved {
  const pts = new Map<string, V3>();
  const errors: string[] = [];
  const order: string[] = [];
  const set = (id: string, v: V3) => {
    if (!pts.has(id)) order.push(id);
    pts.set(id, v);
  };
  const get = (id: string): V3 | null => {
    const v = pts.get(id);
    if (!v) errors.push(`Chưa có điểm ${prettyName(id)}`);
    return v ?? null;
  };
  const gets = (ids: readonly string[]): V3[] | null => {
    const out: V3[] = [];
    for (const id of ids) {
      const v = get(id);
      if (!v) return null;
      out.push(v);
    }
    return out;
  };
  const planeNamed = (t: Triple): Plane | null => {
    const v = gets(t);
    if (!v) return null;
    const pl = planeOf(v[0]!, v[1]!, v[2]!);
    if (!pl) errors.push(`Ba điểm ${t.map(prettyName).join(", ")} thẳng hàng, không xác định mặt phẳng`);
    return pl;
  };

  for (const p of ordered(spec.points)) {
    switch (p.type) {
      case "coord":
        set(p.id, p.at);
        break;
      case "polygon": {
        const poly = basePolygon(p);
        if (typeof poly === "string") {
          errors.push(`${p.ids.map(prettyName).join("")}: ${poly}`);
          break;
        }
        const r = ((p.rotate ?? 0) * Math.PI) / 180;
        const g = poly.reduce((s, q) => [s[0] + q[0] / poly.length, s[1] + q[1] / poly.length], [0, 0]);
        poly.forEach((q, i) => {
          const x = q[0] - g[0]!, y = q[1] - g[1]!;
          set(p.ids[i]!, [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r), 0]);
        });
        break;
      }
      case "above": {
        const o = get(p.of);
        if (o) set(p.id, add(o, [0, 0, p.height]));
        break;
      }
      case "center": {
        const v = gets(p.of);
        if (v?.length) set(p.id, mul(v.reduce<V3>((s, q) => add(s, q), [0, 0, 0]), 1 / v.length));
        break;
      }
      case "circumcenter": {
        const v = gets(p.of);
        const c = v && circumcenter(v[0]!, v[1]!, v[2]!);
        if (c) set(p.id, c);
        else if (v) errors.push(`Không có tâm đường tròn ngoại tiếp ${p.of.map(prettyName).join("")}`);
        break;
      }
      case "midpoint": {
        const v = gets(p.of);
        if (v) set(p.id, lerp(v[0]!, v[1]!, 0.5));
        break;
      }
      case "ratio": {
        const v = gets([p.from, p.to]);
        if (v) set(p.id, lerp(v[0]!, v[1]!, p.t));
        break;
      }
      case "intersect": {
        const l = gets(p.line);
        if (!l) break;
        if (p.plane) {
          const pl = planeNamed(p.plane);
          const x = pl && linePlane(l[0]!, l[1]!, pl);
          if (x) set(p.id, x);
          else if (pl) errors.push(`Đường ${p.line.map(prettyName).join("")} song song mặt phẳng (${p.plane.map(prettyName).join("")})`);
        } else if (p.line2) {
          const m = gets(p.line2);
          if (!m) break;
          const cp = closestPoints(l[0]!, l[1]!, m[0]!, m[1]!);
          if (!cp) errors.push(`${p.line.map(prettyName).join("")} song song ${p.line2.map(prettyName).join("")}`);
          else if (len(sub(cp[0], cp[1])) > 1e-6) errors.push(`${p.line.map(prettyName).join("")} và ${p.line2.map(prettyName).join("")} chéo nhau, không cắt nhau`);
          else set(p.id, cp[0]);
        }
        break;
      }
      case "foot": {
        const o = get(p.from);
        if (!o) break;
        if (p.plane) {
          const pl = planeNamed(p.plane);
          if (pl) set(p.id, footOnPlane(o, pl));
        } else if (p.line) {
          const l = gets(p.line);
          if (l) set(p.id, footOnLine(o, l[0]!, l[1]!));
        }
        break;
      }
      case "translate": {
        const v = gets(p.of);
        if (v) v.forEach((q, i) => p.ids[i] && set(p.ids[i], add(q, p.vector)));
        break;
      }
      case "scale": {
        const v = gets(p.of);
        const c = get(p.center);
        if (v && c) v.forEach((q, i) => p.ids[i] && set(p.ids[i], add(c, mul(sub(q, c), p.k))));
        break;
      }
    }
  }

  const vertices = new Set<string>();
  const bodies: SolvedBody[] = [];
  for (const b of spec.bodies) {
    const r = solveBody(b, pts, errors);
    if (!r) continue;
    bodies.push(r);
    if (r.type === "poly") r.names.forEach((n) => vertices.add(n));
  }

  const segs: SolvedSeg[] = [];
  const polys: SolvedPoly[] = [];
  const marks: SolvedMark[] = [];
  const info: string[] = [];
  const hidden = new Set(spec.hide ?? []);

  const used = () => new Set(pts.keys());
  const nameFor = (v: V3, wish?: string, pool = AUTO): string => {
    for (const [k, q] of pts) if (near(q, v)) return k;
    const u = used();
    const n = wish && !u.has(wish) ? wish : (pool.find((x) => !u.has(x)) ?? `P${pts.size}`);
    set(n, v);
    return n;
  };
  const addSeg = (a: string, b: string, kind: SegKind) => {
    if (a === b) return;
    if (!segs.some((s) => (s.a === a && s.b === b) || (s.a === b && s.b === a))) segs.push({ a, b, kind });
  };

  for (const [a, b] of spec.segments ?? []) if (gets([a, b])) addSeg(a, b, "aux");
  for (const poly of spec.polygons ?? []) {
    const v = gets(poly);
    if (!v || v.length < 3) continue;
    polys.push({ names: poly, kind: "polygon", shape: shapeName(v) });
    poly.forEach((n, i) => addSeg(n, poly[(i + 1) % poly.length]!, "aux"));
  }
  const firstPoly = bodies.find((b): b is PolyBody => b.type === "poly");
  for (const s of spec.sections ?? []) {
    const pl = planeNamed(s.through);
    if (!pl) continue;
    if (!firstPoly) {
      errors.push("Thiết diện chỉ dựng được với khối đa diện");
      continue;
    }
    const poly = sectionPolygon(pts, firstPoly, pl);
    if (poly.length < 3) {
      errors.push(`Mặt phẳng (${s.through.map(prettyName).join("")}) không cắt khối`);
      continue;
    }
    const names = poly.map((v) => nameFor(v, undefined, AUTO_SECTION));
    polys.push({ names, kind: "section", shape: shapeName(poly) });
    names.forEach((n, i) => addSeg(n, names[(i + 1) % names.length]!, "section"));
    info.push(`Thiết diện ${names.map(prettyName).join("")}: ${shapeName(poly)}`);
  }
  for (const m of spec.marks ?? []) {
    const r = solveMark(m, pts, errors);
    if (r) marks.push(r);
  }
  for (const m of spec.measures ?? []) solveMeasure(m, { pts, get, gets, planeNamed, nameFor, addSeg, marks, info, errors });

  const shown = order.filter((n) => !hidden.has(n));
  return { pts, shown, vertices, bodies, segs, polys, marks, info, errors: [...new Set(errors)] };
}

function solveBody(b: Body, pts: Map<string, V3>, errors: string[]): SolvedBody | null {
  const miss = (ids: string[]) => {
    const m = ids.filter((i) => !pts.has(i));
    if (m.length) errors.push(`Khối thiếu điểm ${m.map(prettyName).join(", ")}`);
    return m.length > 0;
  };
  if (b.type === "pyramid" || b.type === "prism") {
    const names = b.type === "pyramid" ? [...b.base, b.apex] : [...b.base, ...b.top];
    if (miss(names)) return null;
    const n = b.base.length;
    const faces: string[][] = [b.base];
    const edges: Pair[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      edges.push([b.base[i]!, b.base[j]!]);
      if (b.type === "pyramid") {
        faces.push([b.base[i]!, b.base[j]!, b.apex]);
        edges.push([b.base[i]!, b.apex]);
      } else {
        faces.push([b.base[i]!, b.base[j]!, b.top[j]!, b.top[i]!]);
        edges.push([b.top[i]!, b.top[j]!], [b.base[i]!, b.top[i]!]);
      }
    }
    if (b.type === "prism") faces.push(b.top);
    const g = mul(names.reduce<V3>((s, k) => add(s, pts.get(k)!), [0, 0, 0]), 1 / names.length);
    const planes: Plane[] = [];
    for (const f of faces) {
      const pl = outward(f.map((k) => pts.get(k)!), g);
      if (pl) planes.push(pl);
    }
    if (planes.length < 4) {
      errors.push("Khối suy biến (các đỉnh đồng phẳng)");
      return null;
    }
    return { type: "poly", names, faces, edges, planes };
  }
  if (b.type === "sphere") {
    if (miss([b.center])) return null;
    return { type: "sphere", C: pts.get(b.center)!, r: b.radius, center: b.center };
  }
  if (b.type === "cone") {
    if (miss([b.center, b.apex])) return null;
    return { type: "cone", C: pts.get(b.center)!, S: pts.get(b.apex)!, r: b.radius, center: b.center, apex: b.apex };
  }
  if (miss([b.center, b.top])) return null;
  return { type: "cylinder", C: pts.get(b.center)!, T: pts.get(b.top)!, r: b.radius, center: b.center, top: b.top };
}

function solveMark(m: Mark, pts: Map<string, V3>, errors: string[]): SolvedMark | null {
  const need = m.type === "equal" ? m.segments.flat() : [m.at, m.a, m.b];
  const miss = need.filter((n) => !pts.has(n));
  if (miss.length) {
    errors.push(`Ký hiệu dùng điểm chưa có: ${miss.map(prettyName).join(", ")}`);
    return null;
  }
  if (m.type === "equal") return { type: "equal", segments: m.segments, group: Math.max(1, Math.min(3, m.group ?? 1)) };
  if (m.type === "right") return m;
  const v = angleAt(pts.get(m.a)!, pts.get(m.at)!, pts.get(m.b)!);
  return { type: "angle", at: m.at, a: m.a, b: m.b, text: m.label ?? (m.value === false ? "" : arcText(v)) };
}

type Ctx = {
  pts: Map<string, V3>;
  get: (id: string) => V3 | null;
  gets: (ids: readonly string[]) => V3[] | null;
  planeNamed: (t: Triple) => Plane | null;
  nameFor: (v: V3, wish?: string) => string;
  addSeg: (a: string, b: string, kind: SegKind) => void;
  marks: SolvedMark[];
  info: string[];
  errors: string[];
};

const P = prettyName;
const pl3 = (t: Triple) => `(${t.map(P).join("")})`;

function solveMeasure(m: Measure, x: Ctx): void {
  switch (m.type) {
    case "length": {
      const v = x.gets(m.of);
      if (v) x.info.push(`${m.of.map(P).join("")} ${eqv(fmtLen(len(sub(v[0]!, v[1]!))))}`);
      return;
    }
    case "distance": {
      const p = x.get(m.from);
      if (!p) return;
      if (m.to) {
        const q = x.get(m.to);
        if (!q) return;
        x.addSeg(m.from, m.to, "measure");
        x.info.push(`${P(m.from)}${P(m.to)} ${eqv(fmtLen(len(sub(p, q))))}`);
        return;
      }
      let h: V3 | null = null;
      let other: string | undefined;
      let what = "";
      if (m.plane) {
        const pl = x.planeNamed(m.plane);
        if (!pl) return;
        h = footOnPlane(p, pl);
        other = m.plane.find((n) => !near(x.pts.get(n)!, h!));
        what = pl3(m.plane);
      } else if (m.line) {
        const l = x.gets(m.line);
        if (!l) return;
        h = footOnLine(p, l[0]!, l[1]!);
        other = m.line.find((n) => !near(x.pts.get(n)!, h!));
        what = m.line.map(P).join("");
      }
      if (!h) return;
      const d = len(sub(p, h));
      if (d < 1e-9) {
        x.info.push(`d(${P(m.from)}, ${what}) = 0`);
        return;
      }
      const hn = x.nameFor(h, m.foot);
      x.addSeg(m.from, hn, "measure");
      if (other) x.marks.push({ type: "right", at: hn, a: m.from, b: other });
      x.info.push(`d(${P(m.from)}, ${what}) = ${P(m.from)}${P(hn)} ${eqv(fmtLen(d))}`);
      return;
    }
    case "distance_lines": {
      const a = x.gets(m.lines[0]), b = x.gets(m.lines[1]);
      if (!a || !b) return;
      const cp = closestPoints(a[0]!, a[1]!, b[0]!, b[1]!);
      const name = `${m.lines[0].map(P).join("")}, ${m.lines[1].map(P).join("")}`;
      if (!cp) {
        const h = footOnLine(a[0]!, b[0]!, b[1]!);
        x.info.push(`${name} song song, d ${eqv(fmtLen(len(sub(a[0]!, h))))}`);
        return;
      }
      const d = len(sub(cp[0], cp[1]));
      if (d < 1e-9) {
        x.info.push(`${name} cắt nhau, d = 0`);
        return;
      }
      const e = x.nameFor(cp[0], m.feet?.[0]);
      const f = x.nameFor(cp[1], m.feet?.[1]);
      x.addSeg(e, f, "measure");
      const oa = m.lines[0].find((n) => n !== e) ?? m.lines[0][0];
      const ob = m.lines[1].find((n) => n !== f) ?? m.lines[1][0];
      x.marks.push({ type: "right", at: e, a: f, b: oa }, { type: "right", at: f, a: e, b: ob });
      x.info.push(`d(${name}) = ${P(e)}${P(f)} ${eqv(fmtLen(d))}`);
      return;
    }
    case "angle_lines": {
      const a = x.gets(m.lines[0]), b = x.gets(m.lines[1]);
      if (!a || !b) return;
      const u = sub(a[1]!, a[0]!), v = sub(b[1]!, b[0]!);
      const c = Math.abs(dot(u, v)) / ((len(u) || 1) * (len(v) || 1));
      x.info.push(`(${m.lines[0].map(P).join("")}, ${m.lines[1].map(P).join("")}) ${eqv(fmtAngle(deg(Math.acos(Math.min(1, c)))))}`);
      return;
    }
    case "angle_line_plane": {
      const l = x.gets(m.line);
      const pl = x.planeNamed(m.plane);
      if (!l || !pl) return;
      const name = `(${m.line.map(P).join("")}, ${pl3(m.plane)})`;
      const da = Math.abs(dot(pl.n, l[0]!) - pl.c), db = Math.abs(dot(pl.n, l[1]!) - pl.c);
      if (da < 1e-9 && db < 1e-9) {
        x.info.push(`${name} = 0° (đường nằm trong mặt phẳng)`);
        return;
      }
      const pi = da >= db ? 0 : 1;
      const pName = m.line[pi]!;
      const p = l[pi]!;
      const o = linePlane(l[0]!, l[1]!, pl);
      if (!o) {
        x.info.push(`${name} = 0° (song song)`);
        return;
      }
      const h = footOnPlane(p, pl);
      const on = x.nameFor(o);
      if (near(h, o)) {
        x.info.push(`${name} = 90°`);
        return;
      }
      const hn = x.nameFor(h, m.foot);
      x.addSeg(pName, hn, "measure");
      x.addSeg(on, hn, "measure");
      x.addSeg(pName, on, "measure");
      const v = angleAt(p, o, h);
      x.marks.push({ type: "right", at: hn, a: pName, b: on }, { type: "angle", at: on, a: pName, b: hn, text: arcText(v) });
      x.info.push(`${name} = ∠${P(pName)}${P(on)}${P(hn)} ${eqv(fmtAngle(v))}`);
      return;
    }
    case "angle_planes": {
      const [t1, t2] = m.planes;
      const p1 = x.planeNamed(t1), p2 = x.planeNamed(t2);
      if (!p1 || !p2) return;
      const name = `(${pl3(t1)}, ${pl3(t2)})`;
      const u = cross(p1.n, p2.n);
      if (len(u) < 1e-9) {
        x.info.push(`${name} = 0° (song song hoặc trùng)`);
        return;
      }
      // điểm của mặt 1 xa mặt 2 nhất
      const cand = t1.map((n) => ({ n, v: x.pts.get(n)!, d: Math.abs(dot(p2.n, x.pts.get(n)!) - p2.c) })).sort((a, b) => b.d - a.d)[0]!;
      const h = footOnPlane(cand.v, p2);
      // một điểm trên giao tuyến: giao của đường (cand → hướng trong mặt 1 vuông góc u) với mặt 2
      const inPlane1 = cross(u, p1.n);
      const k0 = linePlane(cand.v, add(cand.v, inPlane1), p2);
      if (!k0) return;
      const k = footOnLine(cand.v, k0, add(k0, u));
      const v = angleAt(cand.v, k, h);
      if (near(h, k)) {
        x.info.push(`${name} = 90°`);
        return;
      }
      const kn = x.nameFor(k, m.feet?.[1]);
      const hn = x.nameFor(h, m.feet?.[0]);
      x.addSeg(cand.n, hn, "measure");
      x.addSeg(kn, hn, "measure");
      x.addSeg(cand.n, kn, "measure");
      x.marks.push({ type: "right", at: hn, a: cand.n, b: kn }, { type: "angle", at: kn, a: cand.n, b: hn, text: arcText(v) });
      x.info.push(`${name} = ∠${P(cand.n)}${P(kn)}${P(hn)} ${eqv(fmtAngle(v))}`);
      return;
    }
  }
}
