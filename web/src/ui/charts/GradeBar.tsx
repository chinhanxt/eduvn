/** Cơ cấu học lực: Giỏi/Khá/TB/Yếu, số HS in trong từng khối (khối tối thiểu 22 px để luôn in được số). */
export const GRADE: readonly (readonly [string, string, string])[] = [
  ["Giỏi", "var(--div-pos-2)", "#fff"],
  ["Khá", "var(--div-pos-1)", "#0b0b0b"],
  ["TB", "var(--grade-mid)", "#0b0b0b"],
  ["Yếu", "var(--div-neg-2)", "#fff"],
];

export function GradeBar({ counts, height = 20 }: { counts: readonly number[]; height?: number }) {
  const tot = counts.reduce((a, b) => a + b, 0);
  if (!tot) return <span className="caption">Chưa có điểm</span>;
  return (
    <div className="gbar" role="img" aria-label={`${GRADE.map((g, i) => `${g[0]} ${counts[i] ?? 0}`).join(", ")} trên ${tot}`} style={{ display: "flex", gap: 2, height }}>
      {counts.map((c, i) =>
        c ? (
          <span
            key={i}
            tabIndex={0}
            data-tip={`${c} HS|${GRADE[i]![0]} · ${Math.round((c / tot) * 100)}%`}
            style={{ flex: `${c} 1 0`, minWidth: 22, justifyContent: "center", background: GRADE[i]![1], color: GRADE[i]![2], borderRadius: 4, display: "flex", alignItems: "center", padding: "0 4px", font: "600 11px/1 var(--font-ui)", fontVariantNumeric: "tabular-nums", overflow: "hidden" }}
          >
            {c}
          </span>
        ) : null,
      )}
    </div>
  );
}

export function GradeLegend() {
  return (
    <div className="legend" style={{ fontSize: 12, gap: 12 }}>
      {GRADE.map((g) => (
        <span key={g[0]}>
          <i style={{ ["--c" as string]: g[1] }} />
          {g[0]}
        </span>
      ))}
    </div>
  );
}
