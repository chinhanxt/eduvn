// web/src/board/graph.ts
import { ComputeEngine, compile } from "@cortex-js/compute-engine";

export type View2 = { xMin: number; xMax: number; yMin: number; yMax: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Compiled = { ok: true; params: string[]; f: (x: number, p: Readonly<Record<string, number>>) => number } | { ok: false; error: string };

const ce = new ComputeEngine();
const cache = new Map<string, Compiled>();
const BAD = "Công thức chưa đúng — kiểm lại ngoặc, phân số";

/** "y = …", "f(x) = …" hoặc chỉ vế phải; mọi chữ khác x là tham số (thanh trượt). */
export function compileExpr(latex: string): Compiled {
  const hit = cache.get(latex);
  if (hit) return hit;
  let out: Compiled;
  try {
    const e = ce.parse(latex);
    if (!e.isValid) out = { ok: false, error: BAD };
    else {
      let rhs = e;
      if (e.operator === "Equal") {
        const eq = e as unknown as { op1: typeof e; op2: typeof e };
        const lhs = eq.op1 as unknown as { symbol?: string; operator?: string; nops: number; op1: { symbol?: string } };
        const isFn = lhs.symbol === "y" || (/^[a-zA-Z]$/.test(lhs.operator ?? "") && lhs.nops === 1 && lhs.op1.symbol === "x");
        rhs = eq.op2;
        if (!isFn) {
          out = { ok: false, error: "Chỉ vẽ hàm dạng y = … hoặc f(x) = …" };
          cache.set(latex, out);
          return out;
        }
      }
      const c = compile(rhs);
      if (!c.success) out = { ok: false, error: "Chưa vẽ được công thức này" };
      else {
        const params = [...rhs.unknowns].filter((u) => u !== "x").sort();
        const badName = params.find((n) => !/^[A-Za-z]\w{0,11}$/.test(n));
        if (badName !== undefined) {
          out = { ok: false, error: `Tên tham số không hợp lệ: ${badName}` };
          cache.set(latex, out);
          return out;
        }
        out = {
          ok: true,
          params,
          f: (x, p) => {
            const v = c.run({ ...p, x });
            return typeof v === "number" ? v : Number.NaN;
          },
        };
      }
    }
  } catch {
    out = { ok: false, error: BAD };
  }
  cache.set(latex, out);
  return out;
}

export const mapX = (x: number, v: View2, b: Box): number => b.x + ((x - v.xMin) / (v.xMax - v.xMin)) * b.w;
export const mapY = (y: number, v: View2, b: Box): number => b.y + b.h - ((y - v.yMin) / (v.yMax - v.yMin)) * b.h;

/** Đường SVG; ngắt nét ở chỗ không xác định hoặc nhảy quá một khung (tiệm cận). */
export function samplePath(f: (x: number) => number, v: View2, b: Box, n = 480): string {
  const span = v.yMax - v.yMin;
  let d = "";
  let on = false;
  let prev = 0;
  for (let i = 0; i <= n; i++) {
    const x = v.xMin + ((v.xMax - v.xMin) * i) / n;
    const y = f(x);
    const bad = !Number.isFinite(y) || y < v.yMin - span || y > v.yMax + span;
    if (bad) {
      on = false;
      continue;
    }
    if (on && Math.abs(y - prev) > span) on = false;
    d += `${on ? "L" : "M"}${mapX(x, v, b).toFixed(1)} ${mapY(y, v, b).toFixed(1)}`;
    on = true;
    prev = y;
  }
  return d;
}

export function ticks(min: number, max: number, target = 10): number[] {
  if (!(max > min)) return [];
  const raw = (max - min) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  if (!Number.isFinite(step) || !(step > 0)) return [];
  const start = Math.ceil(min / step - 1e-9);
  const out: number[] = [];
  for (let k = start; k <= 1000 + start && k * step <= max + 1e-9; k++) out.push(Number((k * step).toFixed(12)) + 0);
  return out;
}

/** Khung y tự căn: phân vị 5–95% các giá trị, luôn chứa trục hoành, cao ít nhất 4, tối đa ±50. */
export function autoView(fs: ((x: number) => number)[], xMin: number, xMax: number): View2 {
  const ys: number[] = [];
  for (const f of fs) for (let i = 0; i <= 200; i++) {
    const y = f(xMin + ((xMax - xMin) * i) / 200);
    if (Number.isFinite(y)) ys.push(y);
  }
  ys.sort((a, b) => a - b);
  let lo = ys.length ? ys[Math.floor(ys.length * 0.05)]! : -5;
  let hi = ys.length ? ys[Math.floor(ys.length * 0.95)]! : 5;
  lo = Math.max(-50, Math.min(lo, 0));
  hi = Math.min(50, Math.max(hi, 0));
  if (hi - lo < 4) {
    const mid = (hi + lo) / 2;
    lo = mid - 2;
    hi = mid + 2;
  }
  const pad = (hi - lo) * 0.12;
  return { xMin, xMax, yMin: Math.floor(lo - pad), yMax: Math.ceil(hi + pad) };
}
