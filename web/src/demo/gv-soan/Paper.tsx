/** Slide "Giấy học thuật": nền trắng ngà, mực đậm, trục xanh học thuật #2F5D8A. `build` = tự dựng (vẽ nét, chữ lên dần). */
import type { CSSProperties, ReactNode } from "react";
import type { Slide } from "./data";

const d = (s: number): CSSProperties => ({ ["--d" as string]: `${s}s` });

/** Đường parabol y = a(x−r1)(x−r2) trong khung 400×300, trục hoành ở `axisY`; bỏ phần ra ngoài khung. `only` = chỉ đoạn giữa hai nghiệm (tô miền). */
function parabola(r1: number, r2: number, a: number, axisY = 180, sx = 40, only = false) {
  const pts: string[] = [];
  const mid = (r1 + r2) / 2;
  const [lo, hi] = only ? [r1, r2] : [mid - 4.6, mid + 4.6];
  for (let i = 0; i <= 80; i++) {
    const x = lo + ((hi - lo) * i) / 80;
    const py = axisY - a * (x - r1) * (x - r2) * 26;
    if (py < 12 || py > 296) continue;
    pts.push(`${pts.length ? "L" : "M"}${(200 + (x - mid) * sx).toFixed(1)},${py.toFixed(1)}`);
  }
  return pts.join(" ");
}

function Axes({ y = 180, delay = 0, noY }: { y?: number; delay?: number; noY?: boolean }) {
  return (
    <g className="pp-axis">
      <path className="draw" pathLength={1} d={`M20 ${y} H380`} style={d(delay)} />
      {!noY && <path className="draw" pathLength={1} d="M200 290 V20" style={d(delay + 0.15)} />}
    </g>
  );
}

function Fig({ kind, illus }: { kind: Slide["kind"]; illus?: "gen" | "done" }) {
  switch (kind) {
    case "cover":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          <g className="pp-grid">{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${20 + i * 45} 20 V290`} />)}</g>
          <Axes y={200} delay={0.4} />
          <path className="draw pp-c1" pathLength={1} d={parabola(-1.5, 1.5, 0.75, 200, 40)} style={d(0.8)} />
          <circle className="pop pp-dot" cx={140} cy={200} r={6} style={d(1.8)} />
          <circle className="pop pp-dot" cx={260} cy={200} r={6} style={d(1.95)} />
        </svg>
      );
    case "story":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          {/* Quầy nước chanh của lớp: mái che sọc, quầy, cốc chanh; parabol lãi P(x) = −x² + 6x − 5 (nghiệm 1 và 5). */}
          <g className={`pp-illus ${illus ?? "done"}`}>
            <rect x={96} y={24} width={208} height={22} rx={4} className="pp-screen" />
            <path className="draw pp-c2" pathLength={1} d={`M96 46${Array.from({ length: 8 }, (_, i) => ` a13 13 0 0 0 26 0`).join("")}`} style={d(0.5)} />
            <path className="pp-seat" d="M106 52V112M294 52V112" />
            {[0, 1, 2].map((i) => (
              <path key={i} className="pp-seat" d={`M${122 + i * 52} 24V46`} />
            ))}
            <circle className="draw pp-c3" pathLength={1} cx={282} cy={97} r={14} style={d(0.8)} />
            <path className="draw pp-c3" pathLength={1} d="M282 84V110M269 97H295M273 88l18 18M291 88l-18 18" style={d(1)} />
            <rect x={90} y={112} width={220} height={40} rx={4} className="pp-screen" />
            <g className="rise" style={d(1.1)}>
              {[0, 1, 2, 3].map((i) => (
                <path key={i} className="pp-seat" d={`M${118 + i * 36} 112l-4-24h22l-4 24Z`} />
              ))}
            </g>
          </g>
          <Axes y={280} delay={1.2} noY />
          <path className="pp-area fade" d={`${parabola(1, 5, -0.9, 280, 40, true)} Z`} style={d(2.4)} />
          <path className="draw pp-c1" pathLength={1} d={parabola(1, 5, -0.9, 280, 40)} style={d(1.6)} />
        </svg>
      );
    case "sign":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          <g className="pp-table">
            <path className="draw" pathLength={1} d="M20 60 H380 M20 110 H380 M90 20 V150" style={d(0.3)} />
            <text x={55} y={47} className="rise" style={d(0.5)}>x</text>
            <text x={55} y={95} className="rise" style={d(0.6)}>f(x)</text>
            {["−∞", "x₁", "x₂", "+∞"].map((t, i) => <text key={t} x={115 + i * 80} y={47} className="rise" style={d(0.7 + i * 0.08)}>{t}</text>)}
            {[["+", 150, "pos"], ["0", 195, ""], ["−", 235, "neg"], ["0", 275, ""], ["+", 320, "pos"]].map(([t, x, c], i) => (
              <text key={i} x={x as number} y={95} className={`pop pp-sg ${c}`} style={d(1.1 + i * 0.16)}>{t}</text>
            ))}
          </g>
          <Axes y={240} delay={0.4} />
          <path className="draw pp-c1" pathLength={1} d={parabola(-1.2, 1.2, 0.55, 240, 44)} style={d(1.4)} />
        </svg>
      );
    case "steps":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          <path className="draw pp-c3" pathLength={1} d="M80 230 C 140 230, 140 150, 200 150 S 260 70, 320 70" style={d(0.4)} />
          {[[80, 230], [200, 150], [320, 70]].map(([x, y], i) => (
            <g key={i} className="pop" style={d(0.6 + i * 0.35)}>
              <circle cx={x} cy={y} r={26} className="pp-step" />
              <text x={x} y={(y as number) + 9} className="pp-stepn">{i + 1}</text>
            </g>
          ))}
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          <path className="draw pp-axisl" pathLength={1} d="M20 160 H380" style={d(0.3)} />
          <path className="draw pp-seg" pathLength={1} d="M150 160 H250" style={d(1.2)} />
          {[150, 250].map((x, i) => (
            <g key={x} className="pop" style={d(0.8 + i * 0.15)}>
              <circle cx={x} cy={160} r={9} className="pp-open" />
              <text x={x} y={200} className="pp-lbl">{i ? 3 : 2}</text>
            </g>
          ))}
          <path className="draw pp-c1" pathLength={1} d="M120 120 Q 200 40 280 120" style={d(1.6)} />
          <text x={200} y={66} className="pp-lbl rise" style={d(2)}>−</text>
        </svg>
      );
    case "flip":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          <text x={200} y={190} className="pp-big flipme">&gt;</text>
          <path className="draw pp-c4" pathLength={1} d="M110 220 C 110 270, 290 270, 290 220" style={d(0.9)} />
          <text x={200} y={290} className="pp-lbl rise" style={d(1.3)}>× (−1)</text>
          <circle cx={200} cy={150} r={86} className="draw pp-ring" pathLength={1} style={d(0.4)} />
        </svg>
      );
    case "quiz":
      return (
        <svg viewBox="0 0 400 300" className="pp-fig">
          {[0, 1, 2].map((i) => (
            <g key={i} className="rise" style={d(0.5 + i * 0.2)}>
              <rect x={70} y={50 + i * 75} width={44} height={44} rx={8} className="pp-box" />
              <path className={`draw ${i === 2 ? "pp-c4" : "pp-c3"}`} pathLength={1} d={i === 2 ? `M80 ${62 + i * 75} l24 20 M104 ${62 + i * 75} l-24 20` : `M80 ${72 + i * 75} l10 10 l18 -20`} style={d(1.2 + i * 0.3)} />
              <path className="draw pp-ghost" pathLength={1} d={`M140 ${72 + i * 75} H${300 - i * 30}`} style={d(0.7 + i * 0.2)} />
            </g>
          ))}
        </svg>
      );
  }
}

/** Slide tỉ lệ 16:9 tự co theo khung (container query). `n` = số trang. */
export function PaperSlide({ slide, n, build, illus, hot, className, children }: { slide: Slide; n?: number; build?: boolean; illus?: "gen" | "done"; hot?: number; className?: string; children?: ReactNode }) {
  const cover = slide.kind === "cover";
  return (
    <div className={["pp", build && "build", cover && "cover", className].filter(Boolean).join(" ")} data-kind={slide.kind}>
      <div className="pp-in">
        <div className="pp-txt">
          <div className="pp-eye rise" style={d(0.05)}>{slide.eyebrow}</div>
          <h3 className="pp-title rise" style={d(0.15)}>{slide.title}</h3>
          <span className="pp-rule draw-x" style={d(0.35)} />
          <ul className="pp-pts">
            {slide.points.map((p, i) => (
              <li key={p} className={["rise", hot === i && "hot"].filter(Boolean).join(" ")} style={d(0.55 + i * 0.18)}>{p}</li>
            ))}
          </ul>
        </div>
        <Fig kind={slide.kind} illus={illus} />
      </div>
      <div className="pp-foot">
        <span>Toán 10 · 10A1</span>
        {n !== undefined && <span className="num">{n}</span>}
      </div>
      {children}
    </div>
  );
}
