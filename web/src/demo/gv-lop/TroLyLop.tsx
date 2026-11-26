import { type ReactNode, useMemo, useState } from "react";
import { KHANH_DUY, MINH_ANH, NUMBERS, useFakeStream, usePhases } from "../kit";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import { type CastId, Portrait } from "./Cast";
import { Head } from "./parts";

/** Trợ lý lớp (AI của GV): sáng nay 3 em cần giúp — các em "tách" khỏi chòm sao lớp 10A1, mỗi em kèm lý do có bằng chứng;
 *  bấm một em thì AI gợi ý cách giảng lại vừa đúng chỗ hổng. */
type Kid = { id: CastId; name: string; why: string; proof: ReactNode; plan: string; board: "flip" | "short" | "steps" };
const KIDS: Kid[] = [
  {
    id: "minhAnh",
    name: MINH_ANH.short,
    why: "Quên đổi chiều khi nhân số âm",
    proof: <Marks marks={[0, 1, 0, 0, 1, 0]} label="sai 4/6 câu cùng một lỗi" />,
    plan: "7 phút đầu tiết 3: giảng lại bằng trục số. Cho em tự lật dấu bằng tay trên bảng, rồi làm 2 câu có số âm ở hệ số a. Em thích ví dụ đời thực: dùng quầy nước chanh.",
    board: "flip",
  },
  {
    id: "khanhDuy",
    name: KHANH_DUY.short,
    why: "2 tuần thức khuya, điểm tụt",
    proof: <Spark pts={[6.8, 6.6, 6.5, 6.1, 5.9, 5.6]} label="Toán 6,8 → 5,6" />,
    plan: "Đừng giao thêm bài dài. Gửi em video 60 giây về dấu tam thức, rồi 3 câu ngắn trước 21h. Nhắn ông nội: tối nay hỏi Duy một câu, không cần giảng.",
    board: "short",
  },
  {
    id: "ducThinh",
    name: "Đức Thịnh",
    why: "Bỏ dở 3 bài liền ở bước tìm nghiệm",
    proof: <Skips done={[1, 1, 0, 0, 0, 1]} label="dừng ở bước 2 cả 3 lần" />,
    plan: "Em kẹt ở tìm nghiệm. Ngồi cạnh em 5 phút giờ tự học, cho bảng 3 bước có ô trống: tính Δ, tìm nghiệm, xét dấu. Làm xong bước nào tích bước đó.",
    board: "steps",
  },
];

export function TroLyLop() {
  const p = usePhases([500, 1300, 900], true);
  const [sel, setSel] = useState(0);
  const hi = useFakeStream("Chào cô Hà. Sáng nay 10A1 có 3 em cần giúp.", { cps: 60, delayMs: 200 });
  const kid = KIDS[sel]!;
  const plan = useFakeStream(kid.plan, { run: p >= 3, key: sel, cps: 80, delayMs: 300 });
  const stars = useMemo(() => {
    let x = 11;
    const r = () => ((x = (x * 1103515245 + 12345) & 0x7fffffff), x / 0x7fffffff);
    return Array.from({ length: 39 }, () => {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      return { x: 20 + Math.cos(a) * d * 15, y: 50 + Math.sin(a) * d * 40, m: r() };
    });
  }, []);
  const out = p >= 2;

  return (
    <div className="page gl gl-tl">
      <Head title="Trợ lý lớp" />
      <h2 className={hi.state === "streaming" ? "gl-tl-hi caret" : "gl-tl-hi"}>{hi.text}</h2>

      <div className="gl-tl-stage">
        <div className="gl-tl-sky" aria-label={`10A1 · 42 em · điểm trung bình ${String(NUMBERS.class10A1Avg).replace(".", ",")}`}>
          {stars.map((s, i) => (
            <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: out ? 0.35 + s.m * 0.3 : 0.5 + s.m * 0.5, animationDelay: `${(i % 9) * 0.3}s` }} />
          ))}
          {KIDS.map((k, i) => {
            const from = [{ x: 22, y: 38 }, { x: 15, y: 61 }, { x: 27, y: 70 }][i]!;
            return <b key={k.id} className={out ? "gl-tl-star out" : p >= 1 ? "gl-tl-star hot" : "gl-tl-star"} style={{ left: out ? "41%" : `${from.x}%`, top: out ? `${17 + i * 33}%` : `${from.y}%`, transitionDelay: `${i * 140}ms` }} />;
          })}
          <span className="gl-tl-cls">
            <b>10A1</b> 42 em
          </span>
        </div>
        <ol className="gl-tl-kids">
          {KIDS.map((k, i) => (
            <li key={k.id} className={[out && "in", sel === i && "sel"].filter(Boolean).join(" ")} style={{ top: `${17 + i * 33}%`, transitionDelay: `${700 + i * 140}ms` }}>
              <button type="button" onClick={() => setSel(i)} aria-pressed={sel === i}>
                <Portrait id={k.id} size={52} />
                <span className="gl-tl-who">
                  <b>{k.name}</b>
                  <span>{k.why}</span>
                </span>
                <span className="gl-tl-proof">{k.proof}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <section className={p >= 3 ? "gl-tl-plan in" : "gl-tl-plan"} aria-live="polite">
        <div className="gl-tl-plan-t">
          <span className="gl-eyebrow">Gợi ý giảng lại cho {kid.name}</span>
          <p className={plan.state === "streaming" ? "caret" : undefined}>{plan.text}</p>
          <div className="gl-tl-acts">
            <Button size="sm" variant="primary" icon="plus">Thêm vào giáo án</Button>
            <Button size="sm" variant="ghost" icon="send">Giao bài bù</Button>
            <Button size="sm" variant="ghost" icon="mail">Nhắn phụ huynh</Button>
          </div>
        </div>
        <MiniBoard key={sel} kind={kid.board} />
      </section>
    </div>
  );
}

function Marks({ marks, label }: { marks: number[]; label: string }) {
  return (
    <span className="gl-marks" title={label}>
      <span className="r">
        {marks.map((m, i) => (
          <i key={i} className={m ? "ok" : "no"} />
        ))}
      </span>
      <small>{label}</small>
    </span>
  );
}
function Spark({ pts, label }: { pts: number[]; label: string }) {
  const d = pts.map((v, i) => `${i ? "L" : "M"}${i * 16} ${(7 - v) * 14}`).join(" ");
  return (
    <span className="gl-spark" title={label}>
      <svg viewBox="-2 -2 84 26" aria-hidden="true">
        <path d={d} />
        <circle cx={80} cy={(7 - pts[pts.length - 1]!) * 14} r="2.6" />
      </svg>
      <small>{label}</small>
    </span>
  );
}
function Skips({ done, label }: { done: number[]; label: string }) {
  return (
    <span className="gl-skips" title={label}>
      <span className="r">
        {done.map((d, i) => (
          <i key={i} className={d ? "ok" : "half"} />
        ))}
      </span>
      <small>{label}</small>
    </span>
  );
}

/** Bảng nhỏ minh hoạ cách giảng lại (vẽ dần). */
function MiniBoard({ kind }: { kind: Kid["board"] }) {
  return (
    <svg className="gl-tl-board" viewBox="0 0 320 180" aria-hidden="true">
      {kind === "flip" && (
        <>
          <text x="24" y="44" className="gl-hand sm gl-draw-t">−x² + 6x − 5 &gt; 0</text>
          <text x="24" y="84" className="gl-hand sm gl-flip gl-draw-t" style={{ animationDelay: ".8s" }}>x² − 6x + 5 &lt; 0</text>
          <text x="300" y="64" className="gl-cap gl-in" textAnchor="end" style={{ animationDelay: ".5s" }}>×(−1), đổi chiều</text>
          <path d="M20 132H300" className="gl-axis gl-draw" pathLength={1} />
          <circle cx="110" cy="132" r="6" className="gl-open" />
          <circle cx="230" cy="132" r="6" className="gl-open" />
          <text x="110" y="160" className="gl-cap" textAnchor="middle">1</text>
          <text x="230" y="160" className="gl-cap" textAnchor="middle">5</text>
          <path d="M116 132H224" className="gl-seg gl-draw" pathLength={1} style={{ animationDelay: "1.4s" }} />
        </>
      )}
      {kind === "short" && (
        <>
          <rect x="60" y="24" width="200" height="112" rx="10" className="gl-tl-vid" />
          <path d="M150 64v32l28-16z" className="gl-tl-play" />
          <text x="160" y="160" className="gl-cap" textAnchor="middle">Video 60 giây · rồi 3 câu ngắn</text>
          <path d="M70 126H250" className="gl-tl-prog gl-draw" pathLength={1} />
        </>
      )}
      {kind === "steps" && (
        <>
          {["Tính Δ", "Tìm nghiệm", "Xét dấu"].map((t, i) => (
            <g key={t} className="gl-in" style={{ animationDelay: `${i * 0.35}s` }}>
              <rect x={20 + i * 100} y="56" width="84" height="56" rx="8" className="gl-tl-step" />
              <text x={62 + i * 100} y="90" className="gl-cap" textAnchor="middle">{t}</text>
              <circle cx={62 + i * 100} cy="134" r="9" className={i === 0 ? "gl-tl-tick on" : "gl-tl-tick"} />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}
