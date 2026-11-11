import { ChartFrame, ChartTable, colPath } from "./core";

/** Cột theo ngày: trục y có vạch số, vạch mục tiêu, nhãn ở cột cuối (hôm nay). */
export function Columns({ vals, labels, height = 140, unit = "câu", target, highlightLast = true }: { vals: readonly number[]; labels: readonly string[]; height?: number; unit?: string; target?: number; highlightLast?: boolean }) {
  const table = <ChartTable caption={`Số ${unit} mỗi ngày`} head={["Ngày", `Số ${unit}`]} rows={vals.map((v, i) => [labels[i] ?? String(i + 1), v])} />;
  return (
    <ChartFrame height={height} table={table}>
      {(W) => {
        const m = { t: 18, r: 4, b: 22, l: 28 };
        const w = W - m.l - m.r;
        const h = height - m.t - m.b;
        const n = vals.length;
        const band = w / Math.max(1, n);
        const bw = Math.min(16, band - 4);
        const max0 = Math.max(...vals, target ?? 0, 1);
        const step = Math.max(5, Math.ceil(max0 / 3 / 5) * 5);
        const top = step * 3;
        const y = (v: number) => m.t + h - (v / top) * h;
        return (
          <svg className="chart" width={W} height={height} role="img" aria-label={`Số ${unit} mỗi ngày, ${n} ngày`}>
            <g className="grid">
              {[0, 1, 2, 3].map((k) => (
                <g key={k}>
                  <line x1={m.l} x2={W - m.r} y1={y(k * step)} y2={y(k * step)} />
                  <text x={m.l - 6} y={y(k * step) + 4} textAnchor="end">
                    {k * step}
                  </text>
                </g>
              ))}
            </g>
            {vals.map((v, i) => {
              const bx = m.l + i * band + (band - bw) / 2;
              const by = y(v);
              const bh = m.t + h - by;
              const last = i === n - 1 && highlightLast;
              const miss = target !== undefined && v < target;
              const lab = i === 0 || i === n - 1 || i === Math.floor(n / 2);
              return (
                <g key={i}>
                  <g className="g" tabIndex={0} data-tip={`${v} ${unit}|${labels[i] ?? ""}${target !== undefined ? (miss ? " · dưới mục tiêu" : " · đạt mục tiêu") : ""}`}>
                    <rect className="hit" x={m.l + i * band} y={m.t} width={band} height={h} />
                    {v > 0 && <path className="mark" d={colPath(bx, by, bw, bh, 3)} fill={last ? "var(--c1)" : "var(--seq-dim)"} />}
                    {last && (
                      <text className="lbl-strong" x={bx + bw / 2} y={by - 6} textAnchor="middle">
                        {v}
                      </text>
                    )}
                  </g>
                  {lab && (
                    <text x={i === 0 ? bx : i === n - 1 ? bx + bw : bx + bw / 2} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
                      {labels[i]}
                    </text>
                  )}
                </g>
              );
            })}
            {target !== undefined && (
              <g className="ref">
                <line x1={m.l} x2={W - m.r} y1={y(target)} y2={y(target)} />
                <text x={m.l + 4} y={y(target) - 5} style={{ fontSize: 11, paintOrder: "stroke", stroke: "var(--bg-raised)", strokeWidth: 3 }}>
                  Mục tiêu {target}
                </text>
              </g>
            )}
            <g className="axis">
              <line x1={m.l} x2={W - m.r} y1={m.t + h} y2={m.t + h} />
            </g>
          </svg>
        );
      }}
    </ChartFrame>
  );
}

/** Thanh phân đoạn mỏng (thứ bậc NB/TH/VD/VDC): 8 px, bo tròn, khe 2 px. */
export function SegBar({ parts }: { parts: readonly { l: string; v: number; c: string }[] }) {
  const tot = parts.reduce((a, p) => a + p.v, 0);
  return (
    <div style={{ display: "flex", gap: 2, height: 8 }} role="img" aria-label={parts.map((p) => `${p.l} ${p.v}`).join(", ")}>
      {parts
        .filter((p) => p.v)
        .map((p) => (
          <span key={p.l} tabIndex={0} data-tip={`${p.v}|${p.l}`} style={{ flex: p.v / (tot || 1), background: p.c, borderRadius: 999 }} />
        ))}
    </div>
  );
}
