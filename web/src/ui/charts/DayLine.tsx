import { ChartFrame, ChartTable } from "./core";

export type DayEvent = { t: string; l: string; s?: string; c?: string };
/** Dải giờ trong ngày: trục giờ có nhãn, mỗi việc một mốc. Trả lời: "việc nào lúc nào, bây giờ ở đâu?" */
export function DayLine({ from = 7, to = 22, now, events, height = 64, ink = "var(--ink)", sub = "var(--ink-3)", line = "var(--chart-axis)" }: { from?: number; to?: number; now?: number | null; events: readonly DayEvent[]; height?: number; ink?: string; sub?: string; line?: string }) {
  const table = <ChartTable caption="Lịch hôm nay" head={["Giờ", "Việc"]} rows={events.map((e) => [e.t, e.s ? `${e.l} · ${e.s}` : e.l])} />;
  return (
    <ChartFrame height={height} table={table}>
      {(W) => {
        const p = 12;
        const x = (h: number) => p + ((h - from) / (to - from)) * (W - 2 * p);
        const y = 24;
        const hours: number[] = [];
        for (let h = from; h <= to; h += 3) hours.push(h);
        return (
          <svg className="chart" width={W} height={height} role="img" aria-label={`Lịch hôm nay: ${events.map((e) => `${e.t} ${e.l}`).join(", ")}`}>
            <line x1={p} x2={W - p} y1={y} y2={y} stroke={line} strokeWidth={2} strokeLinecap="round" />
            {hours.map((h) => (
              <g key={h}>
                <line x1={x(h)} x2={x(h)} y1={y - 4} y2={y + 4} stroke={line} />
                <text x={x(h)} y={y + 18} textAnchor="middle" style={{ fill: sub, fontSize: 11 }}>
                  {h}h
                </text>
              </g>
            ))}
            {now != null && (
              <>
                <line x1={p} x2={x(Math.min(to, Math.max(from, now)))} y1={y} y2={y} stroke={ink} strokeWidth={2} strokeLinecap="round" />
                <circle cx={x(Math.min(to, Math.max(from, now)))} cy={y} r={4} fill={ink} />
              </>
            )}
            {events.map((e, i) => {
              const [hh = 0, mm = 0] = e.t.split(":").map(Number);
              const cx = x(Math.min(to, Math.max(from, hh + mm / 60)));
              return (
                <g key={i} className="g" tabIndex={0} data-tip={`${e.t}|${e.l}`}>
                  <circle cx={cx} cy={y} r={12} className="hit" />
                  <rect x={cx - 6} y={y - 6} width={12} height={12} rx={3} transform={`rotate(45 ${cx} ${y})`} fill={e.c ?? ink} stroke="var(--_dl-bg, var(--bg-raised))" strokeWidth={2} />
                  <text x={cx < 60 ? cx - 6 : cx} y={y - 12} textAnchor={cx < 60 ? "start" : "middle"} style={{ fill: ink, fontSize: 11, fontWeight: 600 }}>
                    {e.t}
                    {W > 600 && e.s ? ` · ${e.s}` : ""}
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
