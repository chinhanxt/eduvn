import type { ReactNode } from "react";

/** Thanh tiến độ mảnh. value 0–100. */
export function Meter({ value, thin, label }: { value: number; thin?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className={thin ? "meter thin" : "meter"} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-label={label} style={{ display: "block" }}>
      <i style={{ ["--v" as string]: `${v}%` }} />
    </span>
  );
}

/** Vòng tiến độ SVG (bài đã làm, thẻ đã ôn…). */
export function Ring({ value, max, size = 64, stroke = 6, label, children, track = "var(--accent-bg)", color = "var(--accent)" }: { value: number; max: number; size?: number; stroke?: number; label: string; children?: ReactNode; track?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span role="img" aria-label={label} style={{ position: "relative", display: "inline-grid", placeItems: "center", width: size, height: size, flex: "none" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset var(--dur-3) var(--ease-out)" }} />
      </svg>
      <span style={{ position: "relative", textAlign: "center", lineHeight: 1.1 }}>{children}</span>
    </span>
  );
}

/** Vòng tiến độ lớn kiểu mockup Học (conic, trên mảng màu). */
export function RingBig({ value, max, label, children, className }: { value: number; max: number; label: string; children?: ReactNode; className?: string }) {
  const p = max > 0 ? Math.round((100 * Math.max(0, Math.min(max, value))) / max) : 0;
  return (
    <div className={["ringbig", className].filter(Boolean).join(" ")} style={{ ["--p" as string]: `${p}%` }} role="img" aria-label={label}>
      <div>{children}</div>
    </div>
  );
}
