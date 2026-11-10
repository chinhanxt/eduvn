import { ChartFrame, ChartTable, barPath } from "./core";

/** Độ khó từng câu: thanh ngang % làm đúng, câu < ngưỡng gắn cờ (icon + chữ đậm). Trả lời: "câu nào cả lớp sai nhiều?" */
export function Difficulty({ rows, flag = 40, rowH = 26 }: { rows: readonly { label: string; p: number; topic: string }[]; flag?: number; rowH?: number }) {
  const m = { t: 8, r: 48, b: 28, l: 56 };
  const H = m.t + rows.length * rowH + m.b;
  const table = <ChartTable caption="Tỉ lệ làm đúng từng câu" head={["Câu", "Chủ đề", "% làm đúng"]} rows={rows.map((r) => [r.label, r.topic, `${r.p}%`])} />;
  return (
    <ChartFrame height={H} table={table}>
      {(W) => {
        const w = W - m.l - m.r;
        const x = (p: number) => m.l + (p / 100) * w;
        return (
          <svg className="chart" width={W} height={H} role="img" aria-label={`Tỉ lệ làm đúng: ${rows.map((r) => `${r.label} ${r.p}%`).join(", ")}`}>
            <rect x={m.l} y={m.t} width={x(flag) - m.l} height={H - m.t - m.b} fill="var(--bg-sunken)" />
            <g className="grid">
              {[0, 25, 50, 75, 100].map((p) => (
                <g key={p}>
                  <line x1={x(p)} x2={x(p)} y1={m.t} y2={H - m.b} />
                  <text x={x(p)} y={H - m.b + 18} textAnchor="middle">
                    {p}%
                  </text>
                </g>
              ))}
            </g>
            {rows.map((r, i) => {
              const yy = m.t + i * rowH;
              const bh = Math.min(16, rowH - 8);
              const by = yy + (rowH - bh) / 2;
              const low = r.p < flag;
              return (
                <g key={i} className="g" tabIndex={0} data-tip={`${r.p}% làm đúng|${r.label} · ${r.topic}`}>
                  <rect className="hit" x={0} y={yy} width={W} height={rowH} />
                  <text x={m.l - 10} y={by + bh / 2 + 4} textAnchor="end" className={low ? "lbl-strong" : undefined}>
                    {r.label}
                  </text>
                  <path className="mark" d={barPath(m.l, by, Math.max(2, x(r.p) - m.l), bh)} fill={low ? "var(--c2)" : "var(--c1)"} />
                  <text x={x(r.p) + 6} y={by + bh / 2 + 4} className={low ? "lbl-strong" : undefined}>
                    {r.p}%{low ? " ⚑" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
