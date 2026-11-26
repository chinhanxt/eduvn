/** Hình thu nhỏ SỐNG cho bản đồ công cụ: mỗi chức năng là một cảnh giấy học thuật 160×100, màu vật thể theo nhóm (--k).
 *  Nét chính tự vẽ khi hiện (.d), chuyển động lặp chỉ chạy khi rê/tiêu điểm vào ô (.a + kiểu). */
export type ArtKind =
  | "today" | "class" | "grade" | "sheet" | "paper" | "chat" | "letter"
  | "lesson" | "plan" | "exam" | "bank" | "slides" | "anim" | "compose" | "info" | "mind" | "export" | "outline"
  | "stage" | "board" | "lanes" | "podium" | "kit" | "shield" | "cards" | "bench"
  | "team" | "wheel" | "duo" | "book" | "library" | "server" | "plug"
  | "profile" | "loop" | "notebook" | "search" | "video" | "calendar" | "path" | "compass" | "result";

const r = (n: number) => Array.from({ length: n }, (_, i) => i);
/** Nét tự vẽ (pathLength = 1 để CSS chỉ cần dasharray 1). */
const D = ({ d, c = "ink", w }: { d: string; c?: "ink" | "k" | "soft"; w?: number }) => <path d={d} pathLength={1} className={`d ${c}`} strokeWidth={w} />;

function Scene({ kind }: { kind: ArtKind }) {
  switch (kind) {
    case "today":
      return (
        <>
          {r(4).map((i) => (
            <g key={i} className="a slide" style={{ ["--i" as string]: i }}>
              <rect x="30" y={18 + i * 18} width="10" height="10" rx="3" className={i < 2 ? "kf" : "ln"} />
              <rect x="48" y={21 + i * 18} width={70 - i * 9} height="4" rx="2" className="inkf" opacity={i < 2 ? 0.25 : 0.55} />
            </g>
          ))}
          <D d="M32.5 23l2.5 2.5 4-5M32.5 41l2.5 2.5 4-5" c="soft" w={2} />
          <circle cx="128" cy="30" r="9" className="kf a pulse" />
        </>
      );
    case "class":
      return (
        <>
          {r(18).map((i) => (
            <circle key={i} cx={34 + (i % 6) * 18} cy={28 + Math.floor(i / 6) * 22} r="6.5" className={i === 4 || i === 13 ? "kf a pulse" : "ln"} style={{ ["--i" as string]: i % 3 }} />
          ))}
        </>
      );
    case "grade":
      return (
        <>
          <rect x="44" y="12" width="64" height="80" rx="3" className="sheet" />
          {r(5).map((i) => <rect key={i} x="54" y={24 + i * 13} width="30" height="3.5" rx="1.75" className="inkf" opacity=".35" />)}
          {r(5).map((i) => <D key={`c${i}`} d={`M90 ${24 + i * 13}l3 3 6-7`} c={i === 3 ? "ink" : "k"} w={2.4} />)}
          <circle cx="116" cy="74" r="13" className="kf a pulse" />
          <text x="116" y="78.5" className="num on-k">9</text>
        </>
      );
    case "sheet":
    case "result":
      return (
        <>
          <path d="M26 84h110" className="axis" />
          {[0.45, 0.62, 0.55, 0.78, 0.7, 0.86].map((v, i) => (
            <rect key={i} x={32 + i * 17} y={84 - v * 62} width="10" height={v * 62} rx="2" className={i === 5 ? "kf a grow" : "soft-f a grow"} style={{ ["--i" as string]: i }} />
          ))}
          <D d="M30 34h108" c="soft" w={1.2} />
        </>
      );
    case "paper":
      return (
        <>
          <rect x="34" y="14" width="56" height="74" rx="3" className="sheet" />
          {r(6).map((i) => <rect key={i} x="42" y={24 + i * 9} width={i % 3 === 2 ? 26 : 40} height="3" rx="1.5" className="inkf" opacity=".35" />)}
          <g className="a slide">
            <rect x="98" y="38" width="34" height="22" rx="4" className="kf" />
            <D d="M106 49l5 5 10-10" c="soft" w={2.6} />
          </g>
          <D d="M90 49h8" c="k" w={2} />
        </>
      );
    case "chat":
    case "duo":
      return (
        <>
          <rect x="22" y="18" width="70" height="22" rx="11" className="ln-f" />
          <rect x="68" y="48" width="70" height="22" rx="11" className="kf" />
          {kind === "duo" ? (
            <rect x="22" y="76" width="50" height="14" rx="7" className="ln-f" />
          ) : (
            <g className="a blink">
              <circle cx="96" cy="59" r="2.6" className="paperf" />
              <circle cx="104" cy="59" r="2.6" className="paperf" />
              <circle cx="112" cy="59" r="2.6" className="paperf" />
            </g>
          )}
          <rect x="32" y="27" width="40" height="4" rx="2" className="inkf" opacity=".45" />
        </>
      );
    case "letter":
      return (
        <>
          <rect x="40" y="12" width="80" height="78" rx="3" className="sheet" />
          <rect x="64" y="20" width="32" height="4" rx="2" className="inkf" opacity=".6" />
          {r(5).map((i) => <rect key={i} x="50" y={34 + i * 8} width={i === 4 ? 36 : 60} height="3" rx="1.5" className="inkf" opacity=".3" />)}
          <circle cx="102" cy="78" r="8" className="ring-k a pulse" />
        </>
      );
    case "lesson":
    case "compose":
      return (
        <>
          <rect x="22" y="16" width="84" height="56" rx="4" className="sheet" />
          <D d="M32 58 Q52 24 70 44 T98 30" c="k" w={2.6} />
          <g className="a bob">
            <circle cx="126" cy="38" r="12" className="kf" />
            <path d="M122 32v12l10-6z" className="paperf" />
          </g>
          {r(14).map((i) => <rect key={i} x={24 + i * 6} y={84 - (3 + ((i * 7) % 9))} width="3" height={3 + ((i * 7) % 9)} rx="1.5" className={kind === "compose" ? "kf a grow" : "inkf"} opacity={kind === "compose" ? 1 : 0.35} style={{ ["--i" as string]: i % 5 }} />)}
        </>
      );
    case "plan":
      return (
        <>
          <rect x="30" y="12" width="100" height="78" rx="3" className="sheet" />
          {r(4).map((i) => (
            <g key={i}>
              <rect x="38" y={22 + i * 17} width="20" height="11" rx="2" className={i === 1 ? "kf" : "ln-f"} />
              <rect x="64" y={24 + i * 17} width={56 - i * 8} height="3" rx="1.5" className="inkf" opacity=".35" />
              <rect x="64" y={30 + i * 17} width={40 - i * 4} height="3" rx="1.5" className="inkf" opacity=".2" />
            </g>
          ))}
        </>
      );
    case "exam":
      return (
        <>
          <rect x="22" y="14" width="56" height="74" rx="3" className="sheet" />
          {r(5).map((i) => <rect key={i} x="30" y={24 + i * 12} width="40" height="3" rx="1.5" className="inkf" opacity=".33" />)}
          {r(12).map((i) => (
            <rect key={`m${i}`} x={90 + (i % 4) * 12} y={26 + Math.floor(i / 4) * 14} width="9" height="9" rx="2" className={[1, 4, 6, 11].includes(i) ? "kf a pulse" : "ln-f"} style={{ ["--i" as string]: i % 4 }} />
          ))}
        </>
      );
    case "bank":
      return (
        <>
          {r(4).map((i) => (
            <g key={i} className="a fan" style={{ ["--i" as string]: i }}>
              <rect x={40 + i * 6} y={22 + i * 8} width="72" height="44" rx="4" className={i === 3 ? "card-k" : "sheet"} />
            </g>
          ))}
          <rect x="66" y="64" width="36" height="4" rx="2" className="inkf" opacity=".45" />
          <rect x="66" y="72" width="24" height="4" rx="2" className="kf" />
        </>
      );
    case "slides":
      return (
        <>
          {[0, 1, 2].map((i) => <rect key={i} x={18 + i * 18} y={30 + i * 4} width="58" height="38" rx="3" className="sheet" opacity={0.5 + i * 0.25} />)}
          <rect x="76" y="20" width="66" height="44" rx="3" className="sheet" />
          {[0.5, 0.8, 0.65].map((v, i) => <rect key={`b${i}`} x={88 + i * 14} y={56 - v * 26} width="9" height={v * 26} rx="1.5" className="kf a grow" style={{ ["--i" as string]: i }} />)}
          <rect x="80" y="74" width="58" height="4" rx="2" className="inkf" opacity=".2" />
        </>
      );
    case "anim":
      return (
        <>
          <D d="M20 80 C 50 80, 60 26, 92 26 S 130 70, 142 70" c="soft" w={1.4} />
          <g className="a roll">
            <circle cx="40" cy="70" r="10" className="kf" />
          </g>
          {r(4).map((i) => <rect key={i} x={24 + i * 32} y="86" width="26" height="6" rx="2" className={i === 1 ? "kf" : "ln-f"} />)}
        </>
      );
    case "info":
      return (
        <>
          <circle cx="54" cy="50" r="24" className="ln" strokeWidth="10" />
          <circle cx="54" cy="50" r="24" pathLength={1} className="d k-arc" strokeWidth="10" />
          {r(3).map((i) => (
            <g key={i}>
              <rect x="94" y={30 + i * 16} width="8" height="8" rx="2" className={i === 0 ? "kf" : "ln-f"} />
              <rect x="108" y={32 + i * 16} width={30 - i * 6} height="4" rx="2" className="inkf" opacity=".4" />
            </g>
          ))}
        </>
      );
    case "mind":
      return (
        <>
          {[[40, 28], [124, 26], [36, 76], [126, 76]].map(([x, y], i) => (
            <g key={i}>
              <D d={`M80 50 L${x} ${y}`} c="soft" w={1.6} />
              <rect x={x! - 15} y={y! - 7} width="30" height="14" rx="7" className="ln-f a pulse" style={{ ["--i" as string]: i }} />
            </g>
          ))}
          <rect x="60" y="40" width="40" height="20" rx="10" className="kf" />
        </>
      );
    case "export":
      return (
        <>
          <rect x="30" y="22" width="52" height="58" rx="4" className="sheet" />
          <rect x="38" y="32" width="36" height="22" rx="2" className="kf" opacity=".85" />
          <rect x="38" y="60" width="28" height="3.5" rx="1.75" className="inkf" opacity=".35" />
          <g className="a slide">
            <D d="M92 51h28M112 43l8 8-8 8" c="k" w={2.6} />
          </g>
          {["PPT", "MP4", "QR"].map((t, i) => (
            <text key={t} x="136" y={34 + i * 16} className="tag">{t}</text>
          ))}
        </>
      );
    case "outline":
      return (
        <>
          {r(5).map((i) => (
            <g key={i}>
              <circle cx={i % 2 ? 50 : 36} cy={22 + i * 14} r="3" className={i === 2 ? "kf" : "inkf"} opacity={i === 2 ? 1 : 0.5} />
              <rect x={(i % 2 ? 50 : 36) + 8} y={20 + i * 14} width={i % 2 ? 54 : 80} height="4" rx="2" className="inkf" opacity=".3" />
            </g>
          ))}
        </>
      );
    case "stage":
      return (
        <>
          <rect x="44" y="12" width="72" height="44" rx="3" className="sheet" />
          <D d="M52 46 Q72 18 92 36 T110 24" c="k" w={2.4} />
          {[40, 66, 94, 120].map((x, i) => (
            <g key={x} className={i === 1 ? "a bob" : undefined}>
              <circle cx={x} cy="72" r="8" className={i === 0 ? "kf" : "ln-f"} />
              <rect x={x - 11} y="83" width="22" height="9" rx="4.5" className={i === 0 ? "kf" : "ln-f"} />
            </g>
          ))}
        </>
      );
    case "board":
      return (
        <>
          <path d="M26 84V18M26 84h112" className="axis" />
          <D d="M30 30 Q80 120 134 30" c="k" w={2.8} />
          <circle cx="82" cy="75" r="4" className="kf a pulse" />
          <g className="a bob">
            <path d="M118 40l12-12 6 6-12 12-8 2z" className="inkf" opacity=".7" />
          </g>
        </>
      );
    case "lanes":
      return (
        <>
          {r(3).map((i) => (
            <g key={i}>
              <rect x="28" y={22 + i * 22} width="108" height="12" rx="6" className="ln-f" />
              <rect x="28" y={22 + i * 22} width={[84, 58, 34][i]} height="12" rx="6" className="kf a grow-x" opacity={[1, 0.7, 0.45][i]} style={{ ["--i" as string]: i }} />
            </g>
          ))}
        </>
      );
    case "podium":
      return (
        <>
          {[[44, 52, 2], [70, 36, 1], [96, 62, 3]].map(([x, y, n]) => (
            <g key={n}>
              <rect x={x} y={y} width="24" height={88 - y!} rx="2" className={n === 1 ? "kf" : "ln-f"} />
              <text x={x! + 12} y={y! + 14} className={n === 1 ? "num on-k" : "num"}>{n}</text>
            </g>
          ))}
          <circle cx="82" cy="24" r="6" className="kf a bob" />
        </>
      );
    case "kit":
      return (
        <>
          {r(6).map((i) => (
            <rect key={i} x={30 + (i % 3) * 36} y={20 + Math.floor(i / 3) * 34} width="28" height="26" rx="5" className={i === 4 ? "kf a pulse" : "ln-f"} />
          ))}
          <D d="M44 33 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0" c="soft" w={1.6} />
          <D d="M108 27v12M102 33h12" c="soft" w={1.6} />
        </>
      );
    case "shield":
      return (
        <>
          <path d="M80 14l30 10v22c0 20-14 32-30 40-16-8-30-20-30-40V24z" className="kf" opacity=".14" />
          <D d="M80 14l30 10v22c0 20-14 32-30 40-16-8-30-20-30-40V24z" c="k" w={2.4} />
          <D d="M68 50l8 8 16-16" c="k" w={3} />
          <rect x="120" y="30" width="20" height="4" rx="2" className="inkf a blink" opacity=".35" />
          <rect x="20" y="62" width="20" height="4" rx="2" className="inkf a blink" opacity=".35" />
        </>
      );
    case "cards":
      return (
        <>
          <rect x="32" y="22" width="44" height="58" rx="5" className="sheet" />
          <g className="a flip">
            <rect x="86" y="22" width="44" height="58" rx="5" className="kf" />
          </g>
          <text x="54" y="56" className="num">?</text>
          <text x="108" y="56" className="num on-k">✓</text>
        </>
      );
    case "bench":
      return (
        <>
          <rect x="18" y="18" width="58" height="66" rx="3" className="sheet" />
          {r(5).map((i) => <rect key={i} x="26" y={28 + i * 10} width={i % 2 ? 30 : 42} height="3" rx="1.5" className="inkf" opacity=".33" />)}
          <rect x="84" y="18" width="58" height="66" rx="3" className="ln-f" />
          <D d="M92 70 L104 50 L116 58 L134 30" c="k" w={2.4} />
          <circle cx="134" cy="30" r="3.5" className="kf a pulse" />
        </>
      );
    case "team":
      return (
        <>
          {[[56, 40], [104, 40], [80, 66]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="12" className={i === 2 ? "kf" : "ln-f"} />
            </g>
          ))}
          <D d="M68 44 L92 44 M62 50 L74 60 M98 50 L86 60" c="soft" w={1.4} />
          <rect x="112" y="64" width="26" height="18" rx="3" className="sheet a slide" />
        </>
      );
    case "wheel":
      return (
        <>
          {r(8).map((i) => {
            const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2 - 0.08, R = 34, cx = 80, cy = 50;
            const p = `M${cx} ${cy} L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}Z`;
            return <path key={i} d={p} className={i < 3 ? "kf a pulse" : "ln-f"} opacity={i < 3 ? 1 - i * 0.22 : 1} style={{ ["--i" as string]: i }} />;
          })}
          <circle cx="80" cy="50" r="10" className="paperf" />
        </>
      );
    case "book":
    case "notebook":
      return (
        <>
          <path d="M80 26 C 66 18, 44 18, 30 22 V82 C 44 78, 66 78, 80 86Z" className="sheet" />
          <path d="M80 26 C 94 18, 116 18, 130 22 V82 C 116 78, 94 78, 80 86Z" className="sheet" />
          {r(4).map((i) => <rect key={i} x="40" y={34 + i * 10} width="30" height="3" rx="1.5" className="inkf" opacity=".3" />)}
          {kind === "notebook"
            ? r(9).map((i) => <rect key={`w${i}`} x={90 + i * 4.4} y={56 - ((i * 5) % 14)} width="2.6" height={4 + ((i * 5) % 14) * 1.4} rx="1.3" className="kf a grow" style={{ ["--i" as string]: i % 4 }} />)
            : <D d="M92 40 Q104 28 116 44 T122 60" c="k" w={2.4} />}
        </>
      );
    case "library":
      return (
        <>
          {r(7).map((i) => (
            <rect key={i} x={28 + i * 15} y={24 + (i % 3) * 5} width="11" height={60 - (i % 3) * 5} rx="2" className={i === 4 ? "kf a bob" : "ln-f"} />
          ))}
          <path d="M22 86h116" className="axis" />
        </>
      );
    case "server":
      return (
        <>
          {r(3).map((i) => (
            <g key={i}>
              <rect x="34" y={18 + i * 22} width="56" height="16" rx="3" className="ln-f" />
              <circle cx="44" cy={26 + i * 22} r="2.6" className="kf a blink" style={{ ["--i" as string]: i }} />
            </g>
          ))}
          <D d="M90 50 H120" c="k" w={2} />
          <circle cx="128" cy="50" r="9" className="kf a pulse" />
          <circle cx="104" cy="50" r="3" className="kf a travel" />
        </>
      );
    case "plug":
      return (
        <>
          <rect x="22" y="34" width="44" height="32" rx="8" className="ln-f" />
          <rect x="96" y="34" width="44" height="32" rx="8" className="kf" />
          <g className="a slide">
            <D d="M66 50 H96" c="k" w={2.6} />
          </g>
          <text x="44" y="54" className="tag">AI</text>
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="48" cy="40" r="14" className="kf" />
          <rect x="30" y="60" width="36" height="20" rx="10" className="kf" opacity=".5" />
          {r(4).map((i) => (
            <g key={i}>
              <rect x="82" y={26 + i * 14} width="54" height="6" rx="3" className="ln-f" />
              <rect x="82" y={26 + i * 14} width={[42, 24, 48, 33][i]} height="6" rx="3" className="kf a grow-x" style={{ ["--i" as string]: i }} />
            </g>
          ))}
        </>
      );
    case "loop":
      return (
        <>
          <circle cx="80" cy="50" r="28" className="ln" strokeWidth="2" />
          <D d="M80 22 A28 28 0 1 1 52 50" c="k" w={3} />
          {[[80, 22], [108, 50], [80, 78], [52, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" className={i < 3 ? "kf" : "ln-f"} />)}
          <g className="a spin" style={{ transformOrigin: "80px 50px" }}>
            <circle cx="80" cy="22" r="3" className="paperf" />
          </g>
        </>
      );
    case "search":
      return (
        <>
          {r(3).map((i) => <rect key={i} x={24 + i * 10} y={20 + i * 8} width="52" height="60" rx="3" className="sheet" />)}
          <g className="a bob">
            <circle cx="108" cy="46" r="16" className="ring-k" strokeWidth="4" />
            <path d="M120 58l14 14" className="k-stroke" strokeWidth="5" />
          </g>
        </>
      );
    case "video":
      return (
        <>
          <rect x="24" y="16" width="112" height="62" rx="5" className="sheet" />
          <circle cx="80" cy="47" r="14" className="kf a pulse" />
          <path d="M76 40v14l11-7z" className="paperf" />
          <rect x="24" y="86" width="112" height="4" rx="2" className="ln-f" />
          <rect x="24" y="86" width="58" height="4" rx="2" className="kf a grow-x" />
        </>
      );
    case "calendar":
      return (
        <>
          <rect x="30" y="16" width="100" height="72" rx="4" className="sheet" />
          <rect x="30" y="16" width="100" height="12" rx="4" className="kf" opacity=".85" />
          {r(15).map((i) => (
            <rect key={i} x={38 + (i % 5) * 18} y={36 + Math.floor(i / 5) * 16} width="12" height="10" rx="2" className={i === 7 ? "kf a pulse" : i % 4 === 1 ? "soft-f" : "ln-f"} />
          ))}
        </>
      );
    case "path":
      return (
        <>
          <D d="M24 80 C 50 80, 50 40, 80 46 S 116 20, 136 22" c="soft" w={1.6} />
          {[[24, 80], [62, 52], [98, 38], [136, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 3 ? 8 : 5.5} className={i < 2 ? "kf" : i === 3 ? "ring-k a pulse" : "ln-f"} />)}
        </>
      );
    case "compass":
      return (
        <>
          {[34, 24, 14].map((R, i) => <circle key={R} cx="80" cy="50" r={R} className={i === 2 ? "kf" : "ln"} strokeWidth="2" opacity={i === 2 ? 0.9 : 1} />)}
          <g className="a bob">
            <D d="M128 16 L84 47" c="ink" w={2.4} />
            <path d="M84 47l9-1-4-6z" className="inkf" opacity=".7" />
          </g>
        </>
      );
  }
}

export function ToolArt({ kind }: { kind: ArtKind }) {
  return (
    <svg viewBox="0 0 160 100" className="tm-art" aria-hidden="true" focusable="false">
      <Scene kind={kind} />
    </svg>
  );
}
