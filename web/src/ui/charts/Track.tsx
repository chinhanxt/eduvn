import { ChartFrame, ChartTable, vnShort } from "./core";

/** Điểm các bài gần nhất trên thang 0–10, vùng dưới ngưỡng tô hồng, vạch 5,0; bài mới nhất đậm + có số. */
export function Track({ vals, labels = [], threshold = 5, height = 34, showAxis = false, table = true }: { vals: readonly number[]; labels?: readonly string[]; threshold?: number; height?: number; showAxis?: boolean; table?: boolean }) {
  const H = height + (showAxis ? 14 : 0);
  const t = table ? <ChartTable caption="Điểm các bài gần nhất" head={["Bài", "Điểm"]} rows={vals.map((v, i) => [labels[i] ?? `Bài ${i + 1}`, vnShort(v)])} /> : undefined;
  return (
    <ChartFrame height={H} table={t}>
      {(W) => {
        const p = 10;
        const x = (v: number) => p + (v / 10) * (W - 2 * p);
        const cy = showAxis ? 14 : height / 2 + 4;
        const n = vals.length;
        const lv = vals[n - 1];
        return (
          <svg className="chart" width={W} height={H} role="img" aria-label={`Điểm ${n} bài gần nhất: ${vals.map(vnShort).join(", ")}`}>
            <rect x={p} y={cy - 3} width={x(threshold) - p} height={6} rx={3} fill="var(--danger-bg)" />
            <rect x={x(threshold)} y={cy - 3} width={W - p - x(threshold)} height={6} rx={3} fill="var(--bg-sunken)" />
            <line x1={x(threshold)} x2={x(threshold)} y1={cy - 8} y2={cy + 8} stroke="var(--ink-3)" strokeWidth={1} />
            {vals.map((v, i) => {
              const last = i === n - 1;
              return (
                <g key={i} className="g" tabIndex={0} data-tip={`${vnShort(v)}|${labels[i] ?? `Bài ${i + 1}`}`}>
                  <circle cx={x(v)} cy={cy} r={12} className="hit" />
                  <circle cx={x(v)} cy={cy} r={last ? 5 : 3.5} fill={last ? (v < threshold ? "var(--danger)" : "var(--ink)") : "var(--chart-axis)"} stroke="var(--bg-raised)" strokeWidth={2} />
                </g>
              );
            })}
            {lv !== undefined && (
              <text x={x(lv)} y={cy - 9} textAnchor="middle" className="lbl-strong" style={{ fontSize: 11 }}>
                {vnShort(lv)}
              </text>
            )}
            {showAxis &&
              [0, 5, 10].map((v) => (
                <text key={v} x={x(v)} y={cy + 22} textAnchor="middle" style={{ fontSize: 11 }}>
                  {v}
                </text>
              ))}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
