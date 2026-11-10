import { describe, expect, it } from "vitest";
import { recognizeStroke } from "../src/board/recognize";

// Bộ nét mẫu có nhiễu, sinh có hạt giống để lặp lại được.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}
type P = [number, number];
const flat = (pts: P[]) => pts.flatMap(([x, y]) => [x, y]);
function along(v: P[], closed: boolean, r: () => number, jit: number, step = 6): P[] {
  const out: P[] = [];
  const n = closed ? v.length : v.length - 1;
  for (let i = 0; i < n; i++) {
    const a = v[i]!, b = v[(i + 1) % v.length]!;
    const k = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k + (r() - 0.5) * jit, a[1] + ((b[1] - a[1]) * j) / k + (r() - 0.5) * jit]);
  }
  const last = v[closed ? 0 : v.length - 1]!;
  out.push([last[0] + (r() - 0.5) * jit * (closed ? 8 : 1), last[1] + (r() - 0.5) * jit * (closed ? 8 : 1)]); // đóng nét lệch
  return out;
}
const gen = {
  line: (r: () => number) => along([[100 + r() * 50, 100 + r() * 50], [400 + r() * 50, 180 + r() * 200]], false, r, 5),
  hline: (r: () => number) => along([[100, 200], [420, 200 + (r() - 0.5) * 10]], false, r, 4),
  arrow: (r: () => number) => {
    const s: P[] = [150, 300].map((v) => v) as P, t: P = [450, 250 + r() * 20];
    return along([s, t, [t[0] - 40, t[1] - 22], t, [t[0] - 40, t[1] + 24]], false, r, 3);
  },
  rect: (r: () => number) => along([[100, 100], [100 + 220 + r() * 40, 100 + (r() - 0.5) * 8], [320 + r() * 40, 260], [100 + (r() - 0.5) * 8, 260 + r() * 8]], true, r, 5),
  triangle: (r: () => number) => along([[250, 100], [380 + r() * 20, 280], [120 - r() * 20, 280 + r() * 10]], true, r, 5),
  circle: (r: () => number) => {
    const rx = 90 + r() * 30, ry = 80 + r() * 30;
    const pts: P[] = Array.from({ length: 50 }, (_, i) => {
      const a = (i / 48) * 2 * Math.PI + r() * 0.1;
      return [300 + rx * Math.cos(a) + (r() - 0.5) * 9, 250 + ry * Math.sin(a) + (r() - 0.5) * 9] as P;
    });
    return pts;
  },
  polygon: (r: () => number) => along([[300, 80], [420, 150], [400, 280], [250, 300], [190, 170]], true, r, 4),
};
const EXPECT = { line: "line", hline: "line", arrow: "arrow", rect: "rect", triangle: "triangle", circle: "circle", polygon: "polygon" } as const;

describe("nhận dạng nét tay → hình", () => {
  it("độ chính xác ≥ 90% trên bộ nét mẫu có nhiễu", () => {
    let ok = 0, total = 0;
    const wrong: string[] = [];
    for (const [name, f] of Object.entries(gen)) {
      for (let seed = 1; seed <= 20; seed++) {
        const res = recognizeStroke(flat(f(rng(seed * 7919))));
        total++;
        if (res?.kind === EXPECT[name as keyof typeof EXPECT]) ok++;
        else wrong.push(`${name}#${seed}→${res?.kind ?? "null"}`);
      }
    }
    console.log(`P12 độ chính xác nhận dạng: ${ok}/${total} = ${((100 * ok) / total).toFixed(1)}%  sai: ${wrong.join(" ")}`);
    expect(ok / total).toBeGreaterThanOrEqual(0.9);
  });

  it("đường ngang được nắn ngang; chữ viết nguệch ngoạc không bị biến thành hình", () => {
    const h = recognizeStroke(flat(gen.hline(rng(3))))!;
    expect(h.kind).toBe("line");
    expect(h.pts[1]).toBe(h.pts[3]);
    const r = rng(5);
    const scribble: P[] = Array.from({ length: 80 }, (_, i) => [100 + i * 4 + (r() - 0.5) * 60, 200 + Math.sin(i / 3) * 50 + (r() - 0.5) * 40]);
    expect(recognizeStroke(flat(scribble))).toBeNull();
  });

  it("chấm/nét quá ngắn → null", () => {
    expect(recognizeStroke([10, 10, 10.5, 10])).toBeNull();
  });
});
