import { ChartFrame, ChartTable } from "./core";

/** Mỗi hàng một nhãn + một chấm trên thang chung, vạch tham chiếu. Trả lời: "chủ đề nào dưới 50%?" */
export function DotPlot({ rows, max = 100, refValue, refLabel, unit = "%", labelW = 150, rowH = 30, nullLabel = "chưa học" }: { rows: readonly { label: string; v: number | null }[]; max?: number; refValue?: number; refLabel?: string; unit?: string; labelW?: number; rowH?: number; nullLabel?: string }) {
  const mt = refLabel ? 18 : 6;
  const H = mt + rows.length * rowH + 22;
  const table = <ChartTable caption="Mức thành thạo theo chủ đề" head={["Chủ đề", "Mức"]} rows={rows.map((r) => [r.label, r.v === null ? nullLabel : `${r.v}${unit}`])} />;
  return (
    <ChartFrame height={H} table={table}>
      {(W) => {
        const m = { t: mt, r: 44, b: 22, l: Math.min(labelW, W * 0.42) };
        const w = W - m.l - m.r;
        const x = (v: number) => m.l + (v / max) * w;
        return (
          <svg className="chart" width={W} height={H} role="img" aria-label={rows.map((r) => `${r.label} ${r.v ?? nullLabel}${r.v !== null ? unit : ""}`).join(", ")}>
            <g className="grid">
              {[0, max / 2, max].map((tk) => (
                <g key={tk}>
                  <line x1={x(tk)} x2={x(tk)} y1={m.t} y2={H - m.b} />
                  <text x={x(tk)} y={H - 6} textAnchor="middle">
                    {tk}
                    {unit}
                  </text>
                </g>
              ))}
            </g>
            {refValue != null && (
              <g className="ref">
                <line x1={x(refValue)} x2={x(refValue)} y1={m.t - 4} y2={H - m.b} />
                {refLabel && (
                  <text x={x(refValue)} y={m.t - 6} textAnchor="middle" style={{ fontSize: 11 }}>
                    {refLabel}
                  </text>
                )}
              </g>
            )}
            {rows.map((r, i) => {
              const cy = m.t + i * rowH + rowH / 2;
              const low = refValue != null && r.v != null && r.v < refValue;
              const c = low ? "var(--c2)" : "var(--c1)";
              return (
                <g key={i} className="g" tabIndex={0} data-tip={`${r.v ?? "—"}${r.v != null ? unit : ""}|${r.label}`}>
                  <rect className="hit" x={0} y={cy - rowH / 2} width={W} height={rowH} />
                  <text x={m.l - 12} y={cy + 4} textAnchor="end" className={low ? "lbl-strong" : undefined} style={low ? undefined : { fill: "var(--ink-2)" }}>
                    {r.label}
                  </text>
                  <line x1={m.l} x2={W - m.r} y1={cy} y2={cy} stroke="var(--chart-grid)" />
                  {r.v != null ? (
                    <>
                      <line x1={m.l} x2={x(r.v)} y1={cy} y2={cy} stroke={c} strokeWidth={2} />
                      <circle cx={x(r.v)} cy={cy} r={5} fill={c} stroke="var(--bg-raised)" strokeWidth={2} />
                      <text x={x(r.v) + 10} y={cy + 4} className={low ? "lbl-strong" : undefined}>
                        {r.v}
                        {unit}
                      </text>
                    </>
                  ) : (
                    <text x={m.l + 4} y={cy + 4} style={{ fontSize: 11 }}>
                      {nullLabel}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        );
      }}
    </ChartFrame>
  );
}
