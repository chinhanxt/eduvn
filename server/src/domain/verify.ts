// server/src/domain/verify.ts — tự kiểm đáp số (P13), thuần: đo lại trên hình không gian bằng bộ giải P10b,
// thế nghiệm vào phương trình/bất phương trình, tính lại biểu thức/đạo hàm/tích phân số, kiểm cây xác suất. Không eval.
import { type V3, cross, dot, len, sub } from "../../../web/src/board/geom3";
import { fmtAngle, fmtLen, fmtRatio } from "../../../web/src/geometry3d/fmt";
import { closestPoints, footOnLine, planeOf, solve } from "../../../web/src/geometry3d/solver";
import type { ConstructionSpec as WebSpec } from "../../../web/src/geometry3d/spec";
import { type Ast, evalAst, parseExpr } from "../services/anim/expr";
import type { ConstructionSpec } from "./geometry3d";
import { parseLength } from "./geometry3d";
import type { Check, Figure, Measure3d, Solution, Verification } from "./solution";

export const REL_TOL = 1e-6;
type Detail = Verification["details"][number];

// ——— đọc số / biểu thức ———
const SUP: Record<string, string> = { "²": "^2", "³": "^3", "⁴": "^4", "⁻¹": "^(-1)" };

/** LaTeX/ký hiệu SGK → cú pháp của bộ phân tích an toàn (x, a, pi, e, sin, cos, tan, sqrt, abs, ln, log, exp). */
export function toPlain(raw: string): string {
  let s = raw.normalize("NFC").replace(/\$/g, "").replace(/\\left|\\right|\\displaystyle/g, "");
  for (let i = 0; i < 4 && /\\[dt]?frac\s*\{/.test(s); i++) s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "(($1)/($2))");
  s = s
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)")
    .replace(/\\cdot|\\times|[×·]/g, "*")
    .replace(/\\pi|π/g, "pi")
    .replace(/\\(sin|cos|tan|ln|log|exp)/g, "$1")
    .replace(/\\mathrm\{e\}/g, "e")
    .replace(/[÷]/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/⁻¹|[²³⁴]/g, (m) => SUP[m] ?? m)
    .replace(/\{/g, "(")
    .replace(/\}/g, ")");
  // log cơ số: log_2(x) / log_{2}(x) / log_2 x → ln(x)/ln(2)
  s = s.replace(/log_\(?([\d.]+)\)?\s*\(([^()]*)\)/g, "(ln($2)/ln($1))").replace(/log_\(?([\d.]+)\)?\s*([a-z0-9.]+)/g, "(ln($2)/ln($1))");
  // √(…) / √x / √2
  for (let i = 0; i < 6 && s.includes("√"); i++) s = s.replace(/√\s*(\([^()]*\)|[\d.,]+|[a-z])/g, "sqrt($1)");
  return s;
}

export function parseFx(raw: string): Ast {
  return parseExpr(toPlain(raw));
}

export type Num = { value: number; approx?: number };
/** Đọc một đáp số: "a√2", "2a√5/5", "3/10", "0,25", "45°", "V = a³√3/12", "≈ 0,82". Không có số → null.
 *  `approx`: sai số tuyệt đối cho phép khi đáp số ghi "≈" (nửa đơn vị của chữ số cuối). */
export function parseNum(raw: string): Num | null {
  let s = raw.normalize("NFC").replace(/\$/g, "").trim();
  if (s.includes("=")) s = s.slice(s.lastIndexOf("=") + 1);
  let approx: number | undefined;
  if (/^\s*≈|\\approx/.test(s)) {
    s = s.replace(/≈|\\approx/g, "");
    const m = /[.,](\d+)/.exec(s);
    approx = 0.5 * 10 ** -(m?.[1]?.length ?? 0);
  }
  s = s
    .replace(/\^\s*\\circ|°|\\degree|độ/g, "")
    .replace(/\(?\s*(đvdt|đvtt|đvđd|đơn vị[^)]*|cm|dm|mm|m)\s*[²³]?\s*\)?\s*$/i, "")
    .replace(/[²³]/g, (m) => SUP[m] ?? m)
    .trim();
  if (!s) return null;
  try {
    return { value: parseLength(s), approx };
  } catch {
    try {
      const v = evalAst(parseFx(s.replace(/,/g, ".")), 0, 1);
      return Number.isFinite(v) ? { value: v, approx } : null;
    } catch {
      return null;
    }
  }
}

export const close = (a: number, b: number, tol = REL_TOL) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));
const matches = (measured: number, e: Num) => (e.approx !== undefined ? Math.abs(measured - e.value) <= e.approx + 1e-12 : close(measured, e.value));

/** Đáp số góc: "45°" so theo độ; "tan φ = √6", "cos = 1/3", "sin α = …" so theo tỉ số lượng giác. */
function matchAngle(deg: number, expect: string): { ok: boolean | null; read: string } {
  const trig = /\b(tan|cos|sin|cot)\b/.exec(expect);
  const n = parseNum(expect);
  if (!n) return { ok: null, read: expect };
  if (trig) {
    const r = (deg * Math.PI) / 180;
    const f = trig[1] === "tan" ? Math.tan(r) : trig[1] === "cos" ? Math.cos(r) : trig[1] === "sin" ? Math.sin(r) : 1 / Math.tan(r);
    return { ok: matches(f, n), read: expect };
  }
  return { ok: matches(deg, n), read: expect };
}

// ——— hình không gian ———
type Geo = { pts: Map<string, V3>; spec: ConstructionSpec; errors: string[] };

export function solveFigure(spec: ConstructionSpec): Geo {
  const s = solve(spec as unknown as WebSpec);
  return { pts: s.pts, spec, errors: s.errors };
}

const deg = (r: number) => (r * 180) / Math.PI;
function polyArea(v: V3[]): number {
  let s: V3 = [0, 0, 0];
  for (let i = 0; i < v.length; i++) {
    const c = cross(v[i]!, v[(i + 1) % v.length]!);
    s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]];
  }
  return len(s) / 2;
}

/** Số đo thật trên hình; kind quyết định cách so đáp số và cách ghi. */
export function measure3d(g: Geo, m: Measure3d): { kind: "length" | "angle" | "area" | "volume"; value: number } {
  const P = (n: string): V3 => {
    const v = g.pts.get(n.replace(/′/g, "'"));
    if (!v) throw new Error(`Hình không có điểm ${n}`);
    return v;
  };
  const plane = (t: readonly string[]) => {
    const pl = planeOf(P(t[0]!), P(t[1]!), P(t[2]!));
    if (!pl) throw new Error(`Ba điểm ${t.join("")} thẳng hàng`);
    return pl;
  };
  const dir = (l: readonly string[]) => sub(P(l[1]!), P(l[0]!));
  switch (m.type) {
    case "length":
      return { kind: "length", value: len(sub(P(m.of[0]), P(m.of[1]))) };
    case "distance": {
      const p = P(m.from);
      if (m.to) return { kind: "length", value: len(sub(p, P(m.to))) };
      if (m.line) return { kind: "length", value: len(sub(p, footOnLine(p, P(m.line[0]), P(m.line[1])))) };
      if (m.plane) {
        const pl = plane(m.plane);
        return { kind: "length", value: Math.abs(dot(pl.n, p) - pl.c) };
      }
      throw new Error("Khoảng cách thiếu đích");
    }
    case "distance_lines": {
      const [l1, l2] = m.lines;
      const cp = closestPoints(P(l1[0]), P(l1[1]), P(l2[0]), P(l2[1]));
      if (!cp) return { kind: "length", value: len(sub(P(l1[0]), footOnLine(P(l1[0]), P(l2[0]), P(l2[1])))) };
      return { kind: "length", value: len(sub(cp[0], cp[1])) };
    }
    case "angle_lines": {
      const u = dir(m.lines[0]), v = dir(m.lines[1]);
      return { kind: "angle", value: deg(Math.acos(Math.min(1, Math.abs(dot(u, v)) / (len(u) * len(v))))) };
    }
    case "angle_line_plane": {
      const u = dir(m.line), pl = plane(m.plane);
      return { kind: "angle", value: deg(Math.asin(Math.min(1, Math.abs(dot(pl.n, u)) / len(u)))) };
    }
    case "angle_planes": {
      const a = plane(m.planes[0]), b = plane(m.planes[1]);
      return { kind: "angle", value: deg(Math.acos(Math.min(1, Math.abs(dot(a.n, b.n))))) };
    }
    case "area":
      return { kind: "area", value: polyArea(m.polygon.map(P)) };
    case "volume": {
      const b = g.spec.bodies[m.body];
      if (!b) throw new Error(`Hình không có khối thứ ${m.body + 1}`);
      if (b.type === "pyramid" || b.type === "prism") {
        const base = b.base.map(P);
        const pl = planeOf(base[0]!, base[1]!, base[2]!);
        if (!pl) throw new Error("Đáy suy biến");
        const top = P(b.type === "pyramid" ? b.apex : b.top[0]!);
        const h = Math.abs(dot(pl.n, top) - pl.c);
        return { kind: "volume", value: (polyArea(base) * h) / (b.type === "pyramid" ? 3 : 1) };
      }
      if (b.type === "sphere") return { kind: "volume", value: (4 / 3) * Math.PI * b.radius ** 3 };
      const h = len(sub(P(b.type === "cone" ? b.apex : b.top), P(b.center)));
      return { kind: "volume", value: (Math.PI * b.radius ** 2 * h) / (b.type === "cone" ? 3 : 1) };
    }
  }
}

const fmtMeasured = (kind: string, v: number) => (kind === "angle" ? fmtAngle(v) : kind === "length" ? fmtLen(v) : kind === "area" ? fmtLen(v, "a²") : kind === "volume" ? fmtLen(v, "a³") : fmtNum(v));
/** Số đo/tính lại: phân số mẫu ≤ 1000 khi đúng là số hữu tỉ (xác suất 3/8, 0,032 → 4/125), không thì dạng căn/thập phân. */
function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return "không xác định";
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-9 * Math.max(1, Math.abs(v))) return String(r).replace("-", "−");
  for (let q = 2; q <= 1000; q++) {
    const p = Math.round(v * q);
    if (Math.abs(p / q - v) < 1e-10 * Math.max(1, Math.abs(v))) return `${p < 0 ? "−" : ""}${Math.abs(p)}/${q}`;
  }
  return fmtRatio(v);
}

// ——— đại số / giải tích ———
const at = (f: Ast, x: number) => evalAst(f, x, 1);
const BOUND = (t: string) => (/^[+]?(inf|∞|\+∞|\\infty)$/i.test(t.replace(/\s/g, "")) ? Infinity : /^-(inf|∞|\\infty)$/i.test(t.replace(/\s/g, "")) ? -Infinity : NaN);
function readBound(t: string): number {
  const b = BOUND(t);
  if (!Number.isNaN(b)) return b;
  const n = parseNum(t);
  if (!n) throw new Error(`Không đọc được "${t}"`);
  return n.value;
}

/** Nghiệm thực của g trên [lo, hi] tìm bằng đổi dấu + chia đôi (bỏ điểm gián đoạn: |g| phải tiến về 0). */
export function scanRoots(g: (x: number) => number, lo = -20, hi = 20, step = 0.01): number[] {
  const out: number[] = [];
  let x0 = lo, y0 = g(lo);
  for (let k = 1; x0 < hi; k++) {
    const x1 = lo + k * step, y1 = g(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1) && (y0 === 0 || y0 * y1 < 0)) {
      let a = x0, b = x1, ya = y0;
      for (let i = 0; i < 80 && ya !== 0; i++) {
        const m = (a + b) / 2, ym = g(m);
        if (!Number.isFinite(ym)) break;
        if (ya * ym <= 0) b = m;
        else (a = m), (ya = ym);
      }
      const r = ya === 0 ? a : (a + b) / 2;
      if (Math.abs(g(r)) < 1e-6 && !out.some((q) => Math.abs(q - r) < 1e-6)) out.push(r);
    }
    x0 = x1;
    y0 = y1;
  }
  return out;
}

function simpson(f: (x: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

const holds = (op: string, l: number, r: number) => {
  const d = l - r, e = 1e-9 * Math.max(1, Math.abs(l), Math.abs(r));
  return op === "<" ? d < -e : op === ">" ? d > e : op === "<=" || op === "≤" ? d <= e : d >= -e;
};

// ——— cây xác suất ———
type TreeSpec = Extract<Figure, { kind: "tree" }>["spec"];
export function treeProbabilities(t: TreeSpec): { path: Map<string, number>; issues: string[] } {
  const byId = new Map(t.nodes.map((n) => [n.id, n]));
  const issues: string[] = [];
  const pOf = (id: string): number => {
    const n = byId.get(id);
    if (!n?.p) return 1;
    const v = parseNum(n.p);
    if (!v || v.value < -1e-12 || v.value > 1 + 1e-12) {
      issues.push(`Nhánh "${n.label}" có xác suất "${n.p}" không hợp lệ`);
      return NaN;
    }
    return v.value;
  };
  const path = new Map<string, number>();
  const prob = (id: string, seen = new Set<string>()): number => {
    if (path.has(id)) return path.get(id)!;
    if (seen.has(id)) return NaN;
    seen.add(id);
    const n = byId.get(id)!;
    const v = (n.parent && byId.has(n.parent) ? prob(n.parent, seen) : 1) * pOf(id);
    path.set(id, v);
    return v;
  };
  for (const n of t.nodes) prob(n.id);
  // mỗi nút trong: tổng xác suất các nhánh con = 1
  for (const n of t.nodes) {
    const kids = t.nodes.filter((k) => k.parent === n.id);
    if (!kids.length || kids.some((k) => !k.p)) continue;
    const sum = kids.reduce((s, k) => s + pOf(k.id), 0);
    if (!close(sum, 1, 1e-9)) issues.push(`Các nhánh sau "${n.label}" cộng lại ${fmtNum(sum)} ≠ 1`);
  }
  return { path, issues };
}

// ——— chạy một phép kiểm ———
export type Ctx = { figure?: Figure; geo?: Geo; answer: string };

export function runCheck(c: Check, ctx: Ctx, useAnswer: boolean): Detail {
  const expectText = ("expect" in c ? c.expect : undefined) ?? (useAnswer ? ctx.answer : undefined);
  const compare = (label: string, value: number, kind: string): Detail => {
    const measured = fmtMeasured(kind, value);
    if (!Number.isFinite(value)) return { ok: false, label, measured: "không xác định" };
    if (expectText === undefined) return { ok: null, label: `${label}: tính được ${measured}`, measured };
    if (kind === "angle") {
      const r = matchAngle(value, expectText);
      return { ok: r.ok, label: r.ok === null ? `${label}: không đọc được đáp số "${expectText}"` : label, expected: expectText, measured };
    }
    const e = parseNum(expectText);
    if (!e) return { ok: null, label: `${label}: không đọc được đáp số "${expectText}"`, expected: expectText, measured };
    return { ok: matches(value, e), label, expected: expectText, measured };
  };
  try {
    switch (c.type) {
      case "measure3d": {
        if (!ctx.geo) return { ok: null, label: "Đo trên hình: lời giải không có hình không gian" };
        const m = measure3d(ctx.geo, c.measure);
        return compare(`Đo lại trên hình (${MEASURE_NAME[c.measure.type]})`, m.value, m.kind);
      }
      case "value": {
        const x = c.at !== undefined ? readBound(c.at) : 0;
        return compare(`Tính lại ${c.expr}${c.at !== undefined ? ` tại x = ${c.at}` : ""}`, at(parseFx(c.expr), x), "number");
      }
      case "derivative": {
        const f = parseFx(c.f), x = readBound(c.at), h = 1e-4 * Math.max(1, Math.abs(x));
        // Richardson: sai số O(h⁴)
        const d1 = (at(f, x + h) - at(f, x - h)) / (2 * h), d2 = (at(f, x + h / 2) - at(f, x - h / 2)) / h;
        return compare(`Đạo hàm của ${c.f} tại x = ${c.at}`, (4 * d2 - d1) / 3, "number");
      }
      case "integral": {
        const f = parseFx(c.f), a = readBound(c.from), b = readBound(c.to);
        if (!Number.isFinite(a) || !Number.isFinite(b)) return { ok: null, label: "Tích phân suy rộng: chưa kiểm được" };
        return compare(`Tích phân ${c.f} từ ${c.from} đến ${c.to}`, simpson((x) => at(f, x), a, b), "number");
      }
      case "equation": {
        const l = parseFx(c.lhs), r = parseFx(c.rhs);
        const g = (x: number) => at(l, x) - at(r, x);
        const roots = c.roots.map(readBound);
        const bad = roots.filter((x) => {
          const L = at(l, x), R = at(r, x);
          return !Number.isFinite(L) || !Number.isFinite(R) || !close(L, R);
        });
        const label = `Thế nghiệm vào ${c.lhs} = ${c.rhs}`;
        if (bad.length) return { ok: false, label: `${label}: x = ${bad.map(fmtNum).join("; ")} không thoả`, expected: c.roots.join("; ") };
        const found = scanRoots(g);
        const missing = found.filter((x) => !roots.some((q) => Math.abs(q - x) < 1e-5));
        if (missing.length) return { ok: false, label: `${label}: còn nghiệm x ≈ ${missing.map(fmtNum).join("; ")} chưa nêu`, expected: c.roots.join("; "), measured: found.map(fmtNum).join("; ") };
        return { ok: true, label, expected: c.roots.join("; "), measured: roots.map(fmtNum).join("; ") };
      }
      case "inequality": {
        const l = parseFx(c.lhs), r = parseFx(c.rhs);
        const ivs = c.solution.map(([a, b]) => [readBound(a), readBound(b)] as const);
        const sat = (x: number) => holds(c.op, at(l, x), at(r, x));
        const inside = (x: number) => ivs.some(([a, b]) => x > a && x < b);
        const nearEnd = (x: number) => ivs.some(([a, b]) => Math.abs(x - a) < 1e-3 || Math.abs(x - b) < 1e-3);
        const label = `Thử nghiệm ${c.lhs} ${c.op} ${c.rhs}`;
        for (let k = 0; k <= 4000; k++) {
          const x = -20 + k * 0.01 + 0.00037; // lệch khỏi lưới số đẹp để tránh trúng đầu mút
          if (nearEnd(x)) continue;
          if (inside(x) !== sat(x)) return { ok: false, label: `${label}: tại x ≈ ${fmtNum(Math.round(x * 100) / 100)} ${sat(x) ? "thoả nhưng nằm ngoài tập nghiệm" : "không thoả nhưng nằm trong tập nghiệm"}` };
        }
        return { ok: true, label };
      }
      case "probability": {
        if (ctx.figure?.kind !== "tree") return { ok: null, label: "Xác suất: lời giải không có cây" };
        const { path } = treeProbabilities(ctx.figure.spec);
        const sum = (ids: string[]) => ids.reduce((s, id) => s + (path.get(id) ?? NaN), 0);
        const missing = [...c.leaves, ...(c.given ?? [])].filter((id) => !path.has(id));
        if (missing.length) return { ok: false, label: `Cây không có nút ${missing.join(", ")}` };
        const v = c.given?.length ? sum(c.leaves.filter((id) => c.given!.includes(id))) / sum(c.given) : sum(c.leaves);
        return compare(c.given?.length ? "Xác suất có điều kiện theo cây" : "Xác suất theo cây", v, "number");
      }
    }
  } catch (e) {
    return { ok: null, label: `Chưa kiểm được: ${(e as Error).message}` };
  }
}

const MEASURE_NAME: Record<Measure3d["type"], string> = {
  length: "độ dài",
  distance: "khoảng cách",
  distance_lines: "khoảng cách hai đường",
  angle_line_plane: "góc đường – mặt",
  angle_planes: "góc hai mặt",
  angle_lines: "góc hai đường",
  volume: "thể tích",
  area: "diện tích",
};

/** Kiểm toàn bộ lời giải: phép kiểm theo bước, phép kiểm đáp số, tính hợp lệ của hình (cây xác suất, dựng hình). */
export function verifySolution(s: Pick<Solution, "answer" | "steps" | "figure" | "checks">): Verification {
  const details: Detail[] = [];
  let geo: Geo | undefined;
  if (s.figure?.kind === "solid3d") {
    geo = solveFigure(s.figure.spec);
    if (geo.errors.length) details.push({ ok: false, label: `Hình dựng lỗi: ${geo.errors.slice(0, 3).join("; ")}` });
  }
  if (s.figure?.kind === "tree") for (const msg of treeProbabilities(s.figure.spec).issues) details.push({ ok: false, label: msg });
  const ctx: Ctx = { figure: s.figure, geo, answer: s.answer };
  s.steps.forEach((st, i) => {
    if (!st.check) return;
    const d = runCheck(st.check, ctx, false);
    details.push({ ...d, label: `Bước ${i + 1}: ${d.label}` });
  });
  for (const c of s.checks) details.push(runCheck(c, ctx, true));
  const status = details.some((d) => d.ok === false) ? "mismatch" : details.some((d) => d.ok === true) ? "verified" : "unchecked";
  return { status, details: details.slice(0, 40).map((d) => ({ ...d, label: d.label.slice(0, 200), expected: d.expected?.slice(0, 120), measured: d.measured?.slice(0, 120) })) };
}

/** Ghi chú số đo thật gửi lại AI khi lệch (để AI tự sửa một lần). */
export function mismatchNote(v: Verification): string {
  return v.details
    .filter((d) => d.ok === false)
    .map((d) => `- ${d.label}${d.expected ? ` | đáp số ghi: ${d.expected}` : ""}${d.measured ? ` | đo/tính thật: ${d.measured}` : ""}`)
    .join("\n");
}
