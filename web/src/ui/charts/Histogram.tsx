import { ChartFrame, ChartTable, colPath, vn } from "./core";

export type Bin = { x0: number; x1: number; n: number };
/** Phổ điểm: cột theo khoảng 1 điểm (0–10), vạch ngưỡng đạt, đánh dấu trung vị. Trả lời: "bao nhiêu em dưới ngưỡng, dồn ở đâu?" */
export function Histogram({ bins, threshold = 5, median, height = 220, unit = "HS", label = "Phổ điểm" }: { bins: readonly Bin[]; threshold?: number; median?: number | null; height?: number; unit?: string; label?: string }) {
  const table = <ChartTable caption={label} head={["Khoảng điểm", `Số ${unit}`]} rows={bins.map((b, i) => [`${b.x0}–${b.x1}${i === bins.length - 1 ? "" : ` (chưa gồm ${b.x1})`}`, b.n])} />;
  return (
    <ChartFrame height={height} table={table}>
      {(W) => {
        const m = { t: 34, r: 8, b: 36, l: 32 };
        const w = W - m.l - m.r;
        const h = height - m.t - m.b;
        const max = Math.max(0, ...bins.map((b) => b.n));
        const step = Math.max(1, Math.ceil((max + 1) / 4));
        const top = step * 4;
        const firstMax = bins.findIndex((b) => b.n === max);
        const n = bins.length;
        const band = w / Math.max(1, n);
        const bw = Math.min(24, band - 2);
        const y = (v: number) => m.t + h - (v / top) * h;
        const x = (v: number) => m.l + (v / 10) * w;
        const ticks = Array.from({ length: 5 }, (_, i) => i * step);
        return (
          <svg className="chart" width={W} height={height} role="img" aria-label={`${label}: ${bins.map((b) => `${b.x0}–${b.x1}: ${b.n}`).join(", ")}`}>
            <g className="grid">
              {ticks.map((v) => (
                <g key={v}>
                  <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} />
                  <text x={m.l - 8} y={y(v) + 4} textAnchor="end">
                    {v}
                  </text>
                </g>
              ))}
              <text x={m.l - 8} y={m.t - 20} textAnchor="end">
                {unit}
              </text>
            </g>
            {bins.map((b, i) => {
              const bx = m.l + i * band + (band - bw) / 2;
              const by = y(b.n);
              const bh = m.t + h - by;
              const below = b.x1 <= threshold;
              return (
                <g key={i} className="g" tabIndex={0} data-tip={`${b.n} ${unit}|Điểm ${b.x0}–${b.x1}${i === n - 1 ? "" : ` (chưa gồm ${b.x1})`}`}>
                  <rect className="hit" x={m.l + i * band} y={m.t} width={band} height={h} />
                  {b.n > 0 && <path className="mark" d={colPath(bx, by, bw, bh)} fill={below ? "var(--seq-dim)" : "var(--c1)"} />}
                  {i === firstMax && max > 0 && (
                    <text className="lbl-strong" x={bx + bw / 2} y={by - 6} textAnchor="middle">
                      {b.n}
                    </text>
                  )}
                </g>
              );
            })}
            <g className="axis">
              <line x1={m.l} x2={W - m.r} y1={m.t + h} y2={m.t + h} />
            </g>
            {Array.from({ length: 11 }, (_, v) => (
              <text key={v} x={x(v)} y={m.t + h + 18} textAnchor="middle">
                {v}
              </text>
            ))}
            <g className="ref">
              <line x1={x(threshold)} x2={x(threshold)} y1={m.t - 18} y2={m.t + h} />
              <text x={x(threshold) + 6} y={m.t - 20}>
                Ngưỡng đạt {vn(threshold)}
              </text>
            </g>
            {median != null && (
              <g>
                <path d={`M${x(median) - 5},${m.t + h + 26} L${x(median) + 5},${m.t + h + 26} L${x(median)},${m.t + h + 21}Z`} fill="var(--ink)" />
                <text x={x(median) + 9} y={m.t + h + 30} className="lbl-strong" style={{ fontSize: 11 }}>
                  Trung vị {vn(median, 1)}
                </text>
              </g>
            )}
          </svg>
        );
      }}
    </ChartFrame>
  );
}

/** 10 ô [0,1)…[9,10] → bins. */
export const binsOf = (counts: readonly number[]): Bin[] => counts.map((n, i) => ({ x0: i, x1: i + 1, n }));
