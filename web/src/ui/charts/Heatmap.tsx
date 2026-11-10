import { ChartTable } from "./core";

const STEPS = ["var(--chart-grid)", "var(--seq-250)", "var(--seq-400)", "var(--seq-650)"] as const;
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"] as const;
/** Lịch nhiệt: cột = tuần, hàng = thứ; 4 bậc có chú giải số. startDow = thứ của ngày đầu (0 = T2). */
export function Heatmap({ vals, labels, endLabel = "Hôm nay", bins = [0, 1, 10, 20], unit = "câu", startDow = 0 }: { vals: readonly number[]; labels?: readonly string[]; endLabel?: string; bins?: readonly [number, number, number, number]; unit?: string; startDow?: number }) {
  const lvl = (v: number) => (v >= bins[3] ? 3 : v >= bins[2] ? 2 : v >= bins[1] ? 1 : 0);
  const cells: (number | null)[] = [...Array<null>(startDow).fill(null), ...vals];
  const weeks = Math.ceil(cells.length / 7);
  const dayName = (i: number) => labels?.[i] ?? (i === vals.length - 1 ? endLabel : `${vals.length - 1 - i} ngày trước`);
  return (
    <div>
      <div
        style={{ display: "grid", gridTemplateColumns: `22px repeat(${weeks},minmax(10px,16px))`, gridTemplateRows: "repeat(7,minmax(10px,16px))", gridAutoFlow: "column", gap: 3, fontSize: 10, color: "var(--ink-3)" }}
        role="img"
        aria-label={`${vals.length} ngày, ${vals.filter((v) => v >= bins[2]).length} ngày từ ${bins[2]} ${unit}`}
      >
        {DAYS.map((d, i) => (
          <span key={d} style={{ gridColumn: 1, gridRow: i + 1, alignSelf: "center" }}>
            {i % 2 ? "" : d}
          </span>
        ))}
        {cells.map((v, i) =>
          v == null ? (
            <span key={i} />
          ) : (
            <span key={i} tabIndex={0} data-tip={`${v} ${unit}|${dayName(i - startDow)}`} style={{ borderRadius: 3, background: STEPS[lvl(v)], ...(i === cells.length - 1 ? { outline: "2px solid var(--ink)", outlineOffset: 1 } : {}) }} />
          ),
        )}
      </div>
      <div className="legend" style={{ fontSize: 11, gap: 10, marginTop: 8 }}>
        <span><i style={{ ["--c" as string]: STEPS[0] }} />0</span>
        <span><i style={{ ["--c" as string]: STEPS[1] }} />{bins[1]}–{bins[2] - 1}</span>
        <span><i style={{ ["--c" as string]: STEPS[2] }} />{bins[2]}–{bins[3] - 1}</span>
        <span><i style={{ ["--c" as string]: STEPS[3] }} />{bins[3]}+ {unit}</span>
      </div>
      <ChartTable caption="Số câu mỗi ngày" head={["Ngày", `Số ${unit}`]} rows={vals.map((v, i) => [dayName(i), v])} />
    </div>
  );
}

/** Chuỗi ngày dạng vòng tròn (cổng Học): ≥ mục tiêu tô đặc, có làm tô nhạt, nghỉ xám; hôm nay có viền. */
export function StreakDays({ days, goal }: { days: readonly { weekday: string; count: number; date: string }[]; goal: number }) {
  const last = days.length - 1;
  return (
    <div>
      <div className="days" role="img" aria-label={`${days.length} ngày qua: ${days.filter((d) => d.count >= goal).length} ngày đạt mục tiêu ${goal} câu`}>
        {days.map((d, i) => (
          <div key={d.date} tabIndex={0} data-tip={`${d.count} câu|${d.weekday}${i === last ? " · hôm nay" : ""}`}>
            <i className={[d.count >= goal ? "met" : d.count ? "some" : "none", i === last && "today"].filter(Boolean).join(" ")}>{d.count}</i>
            <span>{d.weekday}</span>
          </div>
        ))}
      </div>
      <div className="legend" style={{ fontSize: 11, marginTop: 10, gap: 10 }}>
        <span><i style={{ ["--c" as string]: "var(--accent)", borderRadius: "50%" }} />≥ {goal}</span>
        <span><i style={{ ["--c" as string]: "var(--accent-bg)", borderRadius: "50%", boxShadow: "inset 0 0 0 1.5px var(--accent-line)" }} />1–{goal - 1}</span>
        <span><i style={{ ["--c" as string]: "var(--bg-sunken)", borderRadius: "50%" }} />nghỉ</span>
        <span className="muted">số = câu đã làm</span>
      </div>
      <ChartTable caption="Số câu đã làm mỗi ngày" head={["Ngày", "Số câu"]} rows={days.map((d, i) => [`${d.weekday} ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}${i === last ? " (hôm nay)" : ""}`, d.count])} />
    </div>
  );
}
