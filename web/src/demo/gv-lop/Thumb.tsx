import type { ThumbKind } from "./khoData";

/** Hình thu nhỏ SỐNG của công cụ: mỗi loại là một cảnh SVG nhỏ tự chuyển động (CSS), nền giấy, màu theo môn. */
export function Thumb({ kind, color, className }: { kind: ThumbKind; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={["gl-th", `k-${kind}`, className].filter(Boolean).join(" ")} style={{ ["--k" as string]: color }} aria-hidden="true">
      <Scene kind={kind} />
    </svg>
  );
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function Scene({ kind }: { kind: ThumbKind }) {
  switch (kind) {
    case "pendulum":
      return (
        <>
          <path d="M50 14h60" className="th-ink" />
          <g className="th-swing">
            <path d="M80 14v52" className="th-ink thin" />
            <circle cx="80" cy="70" r="9" className="th-fill" />
          </g>
          <path d="M56 78 q24 12 48 0" className="th-ghost" />
        </>
      );
    case "curves":
      return (
        <>
          <path d="M28 84V12M28 84h112" className="th-axis" />
          <path d="M34 20 L132 80" className="th-line" />
          <g className="th-shift">
            <path d="M34 84 L132 22" className="th-line k2" />
          </g>
          <circle cx="82" cy="50" r="4.5" className="th-fill th-pulse" />
        </>
      );
    case "parabola":
      return (
        <>
          <path d="M20 80h124M80 10v86" className="th-axis" />
          <path d="M36 16 Q80 132 124 16" className="th-line" />
          <circle r="5" className="th-fill th-ride" style={{ offsetPath: "path('M36 16 Q80 132 124 16')" }} />
        </>
      );
    case "molecule":
      return (
        <g className="th-spin" style={{ transformOrigin: "80px 50px" }}>
          <path d="M80 50L52 34M80 50l28-16M80 50v32" className="th-ink" />
          <circle cx="80" cy="50" r="12" className="th-fill" />
          <circle cx="52" cy="34" r="8" className="th-soft" />
          <circle cx="108" cy="34" r="8" className="th-soft" />
          <circle cx="80" cy="82" r="8" className="th-soft" />
        </g>
      );
    case "cell":
      return (
        <>
          <ellipse cx="80" cy="50" rx="46" ry="32" className="th-soft th-breathe" />
          <g className="th-split-a"><circle cx="80" cy="50" r="9" className="th-fill" /></g>
          <g className="th-split-b"><circle cx="80" cy="50" r="9" className="th-fill" /></g>
        </>
      );
    case "map":
      return (
        <>
          <path d="M30 20c18-8 34 4 52-2s30-6 44 6c-4 16 4 30-6 44s-30 18-48 14-34-4-40-22 0-28-2-40z" className="th-land" />
          <path d="M44 70 C60 56 70 66 84 48 S110 30 118 30" className="th-route" />
          <circle cx="118" cy="30" r="5" className="th-fill th-pulse" />
          <circle cx="44" cy="70" r="3.5" className="th-ink-f" />
        </>
      );
    case "timeline":
      return (
        <>
          <path d="M16 56h128" className="th-axis" />
          {range(5).map((i) => (
            <g key={i}>
              <circle cx={28 + i * 26} cy="56" r="6" className="th-fill th-seq" style={{ animationDelay: `${i * 0.45}s` }} />
              <rect x={20 + i * 26} y={i % 2 ? 66 : 30} width="16" height="5" rx="2" className="th-soft th-seq" style={{ animationDelay: `${i * 0.45}s` }} />
            </g>
          ))}
        </>
      );
    case "text":
      return (
        <>
          {range(5).map((i) => (
            <rect key={i} x="22" y={18 + i * 14} width={i === 4 ? 70 : 116} height="5" rx="2.5" className="th-line-t" />
          ))}
          <rect x="52" y="30" width="54" height="9" rx="2" className="th-hl" />
          <rect x="22" y="58" width="40" height="9" rx="2" className="th-hl" style={{ animationDelay: "1.2s" }} />
        </>
      );
    case "code":
      return (
        <>
          <rect x="14" y="12" width="132" height="76" rx="6" className="th-dark" />
          {[[24, 26, 40], [34, 40, 58], [34, 54, 44], [24, 68, 30]].map(([x, y, w], i) => (
            <rect key={i} x={x} y={y} width={w} height="5" rx="2" className="th-type" style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
          <rect x="60" y="66" width="3" height="9" className="th-caret" />
        </>
      );
    case "blocks":
      return (
        <>
          <path d="M30 22h50v8h-6v4h-8v-4H30z" className="th-fill" />
          <g className="th-snap">
            <path d="M30 36h44v8h-6v4h-8v-4H30z" className="th-soft s2" />
          </g>
          <path d="M30 60h60v14H30z" className="th-soft s3" />
          <path d="M40 74h50" className="th-ghost" />
        </>
      );
    case "notes":
      return (
        <>
          {range(5).map((i) => (
            <path key={i} d={`M14 ${26 + i * 10}h132`} className="th-staff" />
          ))}
          {[[40, 61], [66, 51], [92, 41], [118, 56]].map(([x, y], i) => (
            <g key={i} className="th-bob" style={{ animationDelay: `${i * 0.22}s` }}>
              <ellipse cx={x} cy={y} rx="6" ry="4.4" className="th-fill" transform={`rotate(-20 ${x} ${y})`} />
              <path d={`M${x! + 5.5} ${y}v-24`} className="th-ink thin" />
            </g>
          ))}
        </>
      );
    case "palette":
      return (
        <g className="th-spin slow" style={{ transformOrigin: "80px 50px" }}>
          {range(8).map((i) => (
            <path key={i} d="M80 50 L80 12 A38 38 0 0 1 106.9 23.1 Z" transform={`rotate(${i * 45} 80 50)`} style={{ fill: `hsl(${i * 45} 62% 62%)` }} />
          ))}
          <circle cx="80" cy="50" r="12" className="th-paper" />
        </g>
      );
    case "runner":
      return (
        <>
          <path d="M10 60h30l8-22 10 44 10-34 6 12h76" className="th-ecg" />
          <circle cx="132" cy="30" r="12" className="th-soft" />
          <path d="M132 30v-8M132 30l6 4" className="th-ink thin th-tick" style={{ transformOrigin: "132px 30px" }} />
        </>
      );
    case "gear":
      return (
        <>
          <g className="th-spin" style={{ transformOrigin: "62px 52px" }}><Gear cx={62} cy={52} r={24} n={10} cls="th-fill" /></g>
          <g className="th-spin rev" style={{ transformOrigin: "104px 40px" }}><Gear cx={104} cy={40} r={17} n={7} cls="th-soft" /></g>
        </>
      );
    case "wave":
      return (
        <g className="th-flow">
          <path d="M-60 50 q20-30 40 0t40 0 40 0 40 0 40 0 40 0 40 0" className="th-line" />
          <path d="M-60 50 q20 30 40 0t40 0 40 0 40 0 40 0 40 0 40 0" className="th-line k2" />
        </g>
      );
    case "cards":
      return (
        <>
          <rect x="34" y="22" width="64" height="48" rx="6" className="th-soft" transform="rotate(-8 66 46)" />
          <g className="th-flip" style={{ transformOrigin: "88px 52px" }}>
            <rect x="56" y="28" width="64" height="48" rx="6" className="th-fill" />
            <rect x="68" y="48" width="40" height="6" rx="3" className="th-paper" />
          </g>
        </>
      );
    case "circuit":
      return (
        <>
          <path d="M30 26h100v48H30z" className="th-ink" />
          <path d="M30 26h100v48H30z" className="th-current" />
          <path d="M66 20v12M74 22v8" className="th-ink" />
          <circle cx="104" cy="74" r="8" className="th-paper th-glow" />
        </>
      );
    case "bars":
      return (
        <>
          <path d="M18 86h128" className="th-axis" />
          {[30, 44, 60, 52, 70, 48, 36, 24].map((h, i) => (
            <rect key={i} x={24 + i * 15} y={86 - h} width="10" height={h} rx="2" className="th-fill th-grow" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
          <path d="M22 60 C50 30 90 20 140 50" className="th-line k2 thin" />
        </>
      );
    case "bell":
      return (
        <>
          <path d="M14 84h132" className="th-axis" />
          <path d="M14 84 C50 84 58 16 80 16 S110 84 146 84" className="th-soft-a" />
          <path d="M14 84 C50 84 58 16 80 16 S110 84 146 84" className="th-line" />
          <path d="M80 16v68" className="th-ink thin th-scan" />
        </>
      );
    case "orbit":
      return (
        <>
          <ellipse cx="80" cy="50" rx="56" ry="26" className="th-ghost" />
          <circle cx="80" cy="50" r="11" className="th-sun" />
          <circle r="6" className="th-fill th-ride slow" style={{ offsetPath: "path('M24 50 A56 26 0 1 0 136 50 A56 26 0 1 0 24 50')" }} />
          {[[20, 16], [140, 20], [126, 86], [34, 88], [100, 12]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="1.6" className="th-ink-f th-twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
        </>
      );
    case "mindmap":
      return (
        <>
          {[[36, 24], [124, 22], [130, 74], [34, 78], [80, 88]].map(([x, y], i) => (
            <g key={i}>
              <path d={`M80 48L${x} ${y}`} className="th-ink thin th-seq" style={{ animationDelay: `${i * 0.35}s` }} />
              <circle cx={x} cy={y} r="7" className="th-soft th-seq" style={{ animationDelay: `${i * 0.35}s` }} />
            </g>
          ))}
          <circle cx="80" cy="48" r="12" className="th-fill" />
        </>
      );
    case "scale":
      return (
        <>
          <path d="M80 18v62M58 86h44" className="th-ink" />
          <g className="th-tilt" style={{ transformOrigin: "80px 26px" }}>
            <path d="M36 26h88" className="th-ink" />
            <path d="M36 26l-10 22h20zM124 26l-10 22h20z" className="th-ink thin" />
            <circle cx="36" cy="44" r="5" className="th-fill" />
            <circle cx="120" cy="44" r="4" className="th-soft" />
            <circle cx="128" cy="44" r="4" className="th-soft" />
          </g>
        </>
      );
    case "punnett":
      return (
        <>
          {range(4).map((i) => (
            <rect key={i} x={48 + (i % 2) * 34} y={18 + Math.floor(i / 2) * 34} width="30" height="30" rx="4" className="th-soft th-seq" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
          {range(3).map((i) => (
            <circle key={i} cx={[63, 97, 63][i]} cy={[33, 33, 67][i]} r="6" className="th-fill th-seq" style={{ animationDelay: `${0.2 + i * 0.4}s` }} />
          ))}
        </>
      );
    case "perspective":
      return (
        <>
          <path d="M8 56h144" className="th-axis" />
          {[[10, 14], [10, 98], [150, 12], [150, 96], [60, 98], [100, 98]].map(([x, y], i) => (
            <path key={i} d={`M${x} ${y}L80 56`} className="th-ghost th-draw" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
          <path d="M46 34h24v40H46z" className="th-soft" />
          <path d="M46 34l12 12v16l-12 12" className="th-ink thin" />
          <circle cx="80" cy="56" r="3.5" className="th-fill th-pulse" />
        </>
      );
  }
}

function Gear({ cx, cy, r, n, cls }: { cx: number; cy: number; r: number; n: number; cls: string }) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n;
    const rr = i % 2 ? r : r + 5;
    const a1 = a - Math.PI / n / 2.4;
    const a2 = a + Math.PI / n / 2.4;
    pts.push(`${cx + rr * Math.cos(a1)},${cy + rr * Math.sin(a1)}`, `${cx + rr * Math.cos(a2)},${cy + rr * Math.sin(a2)}`);
  }
  return (
    <g>
      <polygon points={pts.join(" ")} className={cls} />
      <circle cx={cx} cy={cy} r={r * 0.3} className="th-paper" />
    </g>
  );
}
