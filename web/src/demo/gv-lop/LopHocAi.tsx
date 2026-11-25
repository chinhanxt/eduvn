import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useFakeStream } from "../kit";
import { Button } from "../../ui";
import { Icon } from "../../ui/Icon";
import { CAST, type CastId, Portrait } from "./Cast";
import { Head, reduced, useCountUp, useTween } from "./parts";

/** Lớp học AI đang diễn ra: GV AI · trợ giảng · bạn học AI nói lần lượt, AI vẽ bảng và điều khiển mô phỏng,
 *  HS ngắt lời bằng giọng, chuyển bàn tròn tranh luận, quiz chấm AI, thẻ kết khoá. Kịch bản: Vật lí 10 · Rơi tự do. */

type Phase = "mo" | "mp" | "bang" | "ban" | "quiz" | "ket";
type Beat = { who: CastId; text: string; phase: Phase; kind?: "voice" | "answer" | "grade"; cut?: number; hold?: number; stance?: "dong" | "phan" };

const PHASES: { id: Phase; label: string }[] = [
  { id: "mo", label: "Mở đầu" },
  { id: "mp", label: "Mô phỏng" },
  { id: "bang", label: "Bảng" },
  { id: "ban", label: "Bàn tròn" },
  { id: "quiz", label: "Quiz" },
  { id: "ket", label: "Kết khoá" },
];

const BEATS: Beat[] = [
  { phase: "mo", who: "lam", text: "Chào cả lớp. Câu hỏi của Galileo: thả cùng lúc một cái búa và một chiếc lông chim, cái nào chạm đất trước?" },
  { phase: "mo", who: "su", text: "Búa ạ! Nặng hơn thì phải rơi nhanh hơn chứ." },
  { phase: "mo", who: "tun", text: "Chưa chắc đâu. Thả thử thì biết." },
  { phase: "mp", who: "lam", text: "Cô thả trong không khí trước nhé.", hold: 2600 },
  { phase: "mp", who: "lam", text: "Giờ cô hút hết không khí ra khỏi ống.", hold: 2400 },
  { phase: "bang", who: "bon", text: "Không còn lực cản, mọi vật rơi cùng một gia tốc g ≈ 9,8 m/s². Quãng đường rơi: s = ½·g·t²." },
  { phase: "bang", who: "lam", text: "Vậy sau 2 giây, vật rơi được ½ · 9,8 · 2² = 19,6 mét. Các em để ý, quãng đường tăng theo bình phương thời gian, nghĩa là giây thứ hai", cut: 0.86 },
  { phase: "bang", who: "minhAnh", kind: "voice", text: "Cô ơi, thế sao tờ giấy vo tròn lại rơi nhanh hơn tờ giấy phẳng ạ?" },
  { phase: "bang", who: "lam", text: "Câu hay! Cùng khối lượng, nhưng vo tròn thì mặt đón gió nhỏ lại, lực cản yếu đi nên rơi nhanh hơn." },
  { phase: "ban", who: "tun", stance: "phan", text: "Lên Mặt Trăng thì trọng lực yếu, chắc lông chim lơ lửng mãi." },
  { phase: "ban", who: "su", stance: "dong", text: "Nhưng Mặt Trăng không có không khí! Không có lực cản thì phải chạm đất cùng lúc." },
  { phase: "ban", who: "minhAnh", stance: "dong", kind: "voice", text: "Em nghĩ cả hai rơi chậm hơn ở Trái Đất, nhưng vẫn cùng lúc." },
  { phase: "ban", who: "lam", stance: "dong", text: "Chính xác. Năm 1971, phi hành gia David Scott đã thả thử trên Mặt Trăng: búa và lông chim chạm đất cùng lúc.", hold: 2200 },
  { phase: "quiz", who: "lam", text: "Câu cuối: vì sao trong chân không, vật nặng và vật nhẹ rơi như nhau?" },
  { phase: "quiz", who: "minhAnh", kind: "answer", text: "Vì không có lực cản, mọi vật chỉ chịu trọng lực nên rơi với cùng gia tốc g." },
  { phase: "quiz", who: "bon", kind: "grade", text: "Đúng ý chính. Thêm một ý để trọn điểm: gia tốc rơi không phụ thuộc khối lượng.", hold: 2400 },
];
const END = BEATS.length; // chỉ số "thẻ kết khoá"
const ROLL: CastId[] = ["lam", "bon", "su", "tun", "minhAnh"];
const firstOf = (p: Phase) => (p === "ket" ? END : BEATS.findIndex((b) => b.phase === p));

export function LopHocAi() {
  const [sp] = useSearchParams();
  const start = Math.max(0, Math.min(END, Number(sp.get("b") ?? 0) || 0));
  const [beat, setBeat] = useState(start);
  const [playing, setPlaying] = useState(true);
  const [run, setRun] = useState(0);
  const cur = BEATS[beat];
  const phase: Phase = cur?.phase ?? "ket";
  const go = (b: number) => {
    setBeat(b);
    setPlaying(true);
    setRun((r) => r + 1);
  };

  return (
    <div className="page gl gl-class">
      <Head title="Lớp học AI" primary={{ label: "Học lại", icon: "refresh", onClick: () => go(0) }}>
        <span className="gl-lesson">
          <b>Rơi tự do</b> · Vật lí 10 · Minh Anh
        </span>
      </Head>

      <div className={`gl-stage ph-${phase}`}>
        {phase === "ban" ? (
          <RoundTable beat={beat} />
        ) : phase === "ket" ? (
          <EndCard onAgain={() => go(0)} />
        ) : (
          <>
            {phase === "quiz" ? <QuizCard beat={beat} /> : <Board beat={beat} />}
            <Seats speaking={cur?.who} listening={cur?.kind === "voice"} />
          </>
        )}
        {cur && <Line key={`${beat}-${run}`} beat={beat} playing={playing} onDone={(skipTo) => go(skipTo ?? beat + 1)} round={phase === "ban"} />}
      </div>

      <Dock
        phase={phase}
        beat={beat}
        playing={playing}
        onPlay={() => (playing ? setPlaying(false) : beat >= END ? go(0) : go(beat))}
        onPhase={(p) => go(firstOf(p))}
        onMic={() => go(firstOf("bang") + 2)}
      />
    </div>
  );
}

/** Lời thoại đang nói: hiện dần, xong thì chờ rồi sang lượt sau; `cut` = bị HS ngắt lời giữa câu. */
function Line({ beat, playing, onDone, round }: { beat: number; playing: boolean; onDone: (skipTo?: number) => void; round: boolean }) {
  const b = BEATS[beat]!;
  const listen = b.kind === "voice";
  const s = useFakeStream(b.text, { cps: b.kind === "answer" ? 34 : 48, delayMs: listen ? 1700 : 450 });
  const cutAt = b.cut ? Math.round(b.text.length * b.cut) : 0;
  const cut = !!cutAt && s.text.length >= cutAt;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (cut) {
      s.stop();
      const t = setTimeout(() => done.current(beat + 1), 380);
      return () => clearTimeout(t);
    }
    if (s.state !== "done" || !playing) return;
    const t = setTimeout(() => done.current(), b.hold ?? 1300);
    return () => clearTimeout(t);
  }, [s.state, cut, playing]); // eslint-disable-line react-hooks/exhaustive-deps
  if (b.kind === "answer" || b.kind === "grade") return null; // quiz tự hiện trong thẻ
  const m = CAST[b.who];
  const shown = cut ? `${s.text.slice(0, cutAt)}—` : s.text;
  return (
    <div className={round ? "gl-line round" : "gl-line"} aria-live="polite">
      <div className="gl-line-who">
        <b style={{ color: `hsl(${m.hue} 55% 38%)` }}>{m.name}</b>
        <span>{m.role}</span>
        {listen && (
          <span className="gl-voice">
            <Icon name="mic" size="sm" /> {s.text ? "Giọng nói" : "Đang nghe…"}
          </span>
        )}
      </div>
      <p className={s.state === "streaming" && !cut ? "gl-line-t caret" : "gl-line-t"}>
        {listen && !s.text ? <Wave /> : shown}
        {cut && <em className="gl-cut">bị ngắt lời</em>}
      </p>
    </div>
  );
}

function Wave({ n = 22 }: { n?: number }) {
  return (
    <span className="gl-wave" aria-label="Đang nghe giọng nói">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ animationDelay: `${(i * 67) % 600}ms`, height: `${30 + ((i * 37) % 70)}%` }} />
      ))}
    </span>
  );
}

function Seats({ speaking, listening }: { speaking?: CastId; listening?: boolean }) {
  return (
    <div className="gl-seats" role="list" aria-label="Người trong lớp">
      {ROLL.map((id) => {
        const m = CAST[id];
        const on = speaking === id;
        return (
          <div key={id} role="listitem" className={on ? "gl-seat on" : "gl-seat"} style={{ ["--h" as string]: m.hue }}>
            <Portrait id={id} size={52} talk={on && !listening} />
            <span className="gl-seat-n">{m.name}</span>
            <span className="gl-seat-r">{m.role}</span>
            {on && listening && <span className="gl-seat-mic"><Icon name="mic" size="sm" /></span>}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Bảng trắng ----------------------------- */
/** Bảng giấy: AI vẽ dần theo lượt thoại; ống thả bên trái là mô phỏng AI tự bấm. */
function Board({ beat }: { beat: number }) {
  // lượt 4: con trỏ AI bay tới công tắc, bấm tắt không khí rồi mới thả
  const [clicked, setClicked] = useState(beat > 4);
  useEffect(() => {
    setClicked(beat > 4);
    if (beat !== 4) return;
    const t = setTimeout(() => setClicked(true), reduced() ? 0 : 1250);
    return () => clearTimeout(t);
  }, [beat]);
  const air = beat < 4 || (beat === 4 && !clicked);
  const dropKey = beat === 3 ? 3 : beat === 4 && clicked ? 4 : 0;
  const fallen = beat > 4 ? " gl-landed" : "";
  const seen = (b: number) => beat >= b;
  return (
    <div className="gl-board">
      <svg viewBox="0 0 800 450" className="gl-board-svg" role="img" aria-label="Bảng trắng: rơi tự do">
        <text x="40" y="58" className="gl-hand gl-draw-t">Rơi tự do</text>
        <path d="M40 70 q90 6 186 -2" className="gl-ink gl-draw" pathLength={1} />

        {/* ống thả */}
        <g className="gl-tube">
          <rect x="70" y="96" width="250" height="300" rx="16" className="gl-tube-glass" />
          {air &&
            Array.from({ length: 24 }, (_, i) => (
              <circle key={i} cx={86 + ((i * 53) % 220)} cy={112 + ((i * 89) % 268)} r={2.2} className="gl-air" style={{ animationDelay: `${(i * 130) % 2400}ms` }} />
            ))}
          <g key={`h${dropKey}`} className={(dropKey ? "gl-fall fast" : "") + fallen} style={{ ["--dy" as string]: "210px" }}>
            <Hammer x={130} y={118} />
          </g>
          <g key={`f${dropKey}`} className={(dropKey ? (air ? "gl-fall drift" : "gl-fall fast") : "") + fallen} style={{ ["--dy" as string]: "214px" }}>
            <Feather x={238} y={116} />
          </g>
          <path d="M80 386h230" className="gl-ink" />
        </g>

        {/* AI tự bấm công tắc không khí */}
        <g className="gl-sw">
          <rect x="70" y="410" width="52" height="26" rx="13" className={air ? "gl-sw-on" : "gl-sw-off"} />
          <circle cx={air ? 109 : 83} cy="423" r="9.5" className="gl-sw-k" />
          <text x="134" y="428" className="gl-cap">{air ? "Có không khí" : "Chân không"}</text>
        </g>
        {beat === 4 && (
          <g className="gl-cursor">
            <path d="M0 0l0 22 6-6 5 11 4-2-5-11 8 0z" className="gl-cursor-p" />
          </g>
        )}

        {/* sổ kết quả thí nghiệm (trước khi có công thức) */}
        {beat < 5 && (
          <g className="gl-in">
            <text x="430" y="132" className="gl-hand gl-draw-t">Cái nào chạm đất trước?</text>
            {seen(1) && <text x="440" y="190" className="gl-hand sm gl-draw-t">Su: “búa” · Tũn: “thử đã”</text>}
            {seen(3) && (
              <g>
                <path d="M432 232 H760" className="gl-axis" opacity=".2" />
                <text x="440" y="276" className="gl-cap gl-in" style={{ animationDelay: "2.6s" }}>Có không khí</text>
                <text x="600" y="278" className="gl-hand sm gl-draw-t" style={{ animationDelay: "2.8s" }}>búa trước</text>
              </g>
            )}
            {beat === 4 && clicked && (
              <g>
                <text x="440" y="330" className="gl-cap gl-in" style={{ animationDelay: "1.2s" }}>Chân không</text>
                <text x="600" y="334" className="gl-hand sm gl-draw-t hot" style={{ animationDelay: "1.3s" }}>cùng lúc!</text>
                <path d="M596 344 q60 8 118 -2" className="gl-curve gl-draw" pathLength={1} style={{ animationDelay: "2s" }} />
              </g>
            )}
          </g>
        )}

        {/* công thức + đồ thị s(t) */}
        {seen(5) && (
          <g className="gl-in">
            <text x="430" y="132" className="gl-hand big gl-draw-t">s = ½·g·t²</text>
            <text x="430" y="166" className="gl-hand sm gl-draw-t" style={{ animationDelay: ".6s" }}>g ≈ 9,8 m/s²</text>
            <path d="M440 330 V190 M440 330 H760" className="gl-axis gl-draw" pathLength={1} style={{ animationDelay: ".8s" }} />
            <text x="766" y="335" className="gl-cap">t</text>
            <text x="450" y="200" className="gl-cap">s</text>
            <path d="M440 330 Q600 326 720 200" className="gl-curve gl-draw" pathLength={1} style={{ animationDelay: "1.3s" }} />
          </g>
        )}
        {seen(6) && (
          <g className="gl-in" style={{ animationDelay: ".4s" }}>
            <path d="M650 252 V330 M650 252 H440" className="gl-guide gl-draw" pathLength={1} style={{ animationDelay: "1s" }} />
            <circle cx="650" cy="252" r="6" className="gl-pt" />
            <text x="636" y="240" className="gl-hand sm" textAnchor="end">19,6 m</text>
            <text x="650" y="350" className="gl-cap" textAnchor="middle">2 s</text>
          </g>
        )}
        {seen(8) && (
          <g className="gl-in" transform="translate(452 380)">
            <path d="M0 22 h70" className="gl-paper" />
            {[8, 22, 36, 50, 64].map((x) => (
              <path key={x} d={`M${x} 56 v-24`} className="gl-wind" />
            ))}
            <circle cx="270" cy="22" r="13" className="gl-ball" />
            <path d="M265 58 v-18 M275 58 v-18" className="gl-wind" />
            <text x="35" y="12" className="gl-cap" textAnchor="middle">cản nhiều</text>
            <text x="270" y="0" className="gl-cap" textAnchor="middle">cản ít</text>
          </g>
        )}
      </svg>
      {beat === 3 || beat === 4 ? <span className="gl-ai-act"><Icon name="pointer" size="sm" /> AI đang điều khiển mô phỏng</span> : null}
    </div>
  );
}

function Hammer({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-24" y="0" width="48" height="18" rx="3" className="gl-ham-h" />
      <rect x="-4" y="18" width="8" height="40" rx="2" className="gl-ham-s" />
    </g>
  );
}
function Feather({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} className="gl-feather">
      <path d="M0 56 C-14 34 -10 10 6 0 C16 18 14 40 0 56z" className="gl-fea" />
      <path d="M0 56 C2 36 4 18 6 0" className="gl-fea-q" />
    </g>
  );
}

/* ----------------------------- Bàn tròn ----------------------------- */
const SEAT_POS: Record<CastId, [number, number]> = { lam: [50, 6], tun: [88, 34], su: [76, 82], minhAnh: [24, 82], bon: [12, 34], khanhDuy: [0, 0], bacTu: [0, 0], nhu: [0, 0], ducThinh: [0, 0] };

function RoundTable({ beat }: { beat: number }) {
  const cur = BEATS[beat];
  const spoken = BEATS.slice(firstOf("ban"), beat + 1).filter((b) => b.phase === "ban");
  const stance = new Map(spoken.map((b) => [b.who, b.stance] as const));
  const agree = [...stance.values()].filter((s) => s === "dong").length;
  const lean = useTween(stance.size ? agree / stance.size : 0.5, 900);
  return (
    <div className="gl-round">
      <svg className="gl-round-table" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <ellipse cx="50" cy="30" rx="34" ry="20" />
      </svg>
      <div className="gl-round-topic">
        <span className="gl-eyebrow">Tranh luận</span>
        <b>Trên Mặt Trăng, búa và lông chim chạm đất cùng lúc?</b>
        <div className="gl-lean" aria-label={`Đồng ý ${Math.round(lean * 100)}%`}>
          <span>Phản biện</span>
          <i><em style={{ left: `${lean * 100}%` }} /></i>
          <span>Đồng ý</span>
        </div>
      </div>
      {ROLL.map((id) => {
        const [x, y] = SEAT_POS[id];
        const on = cur?.who === id;
        const st = stance.get(id);
        return (
          <div key={id} className={on ? "gl-rseat on" : "gl-rseat"} style={{ left: `${x}%`, top: `${y}%`, ["--h" as string]: CAST[id].hue }}>
            <Portrait id={id} size={64} talk={on && cur?.kind !== "voice"} />
            <span className="gl-seat-n">{CAST[id].name}</span>
            {st && <span className={`gl-stance ${st}`}>{st === "dong" ? "Đồng ý" : "Phản biện"}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------------------- Quiz chấm AI ----------------------------- */
function QuizCard({ beat }: { beat: number }) {
  const q0 = firstOf("quiz");
  const ans = BEATS[q0 + 1]!.text;
  const grade = BEATS[q0 + 2]!.text;
  const a = useFakeStream(ans, { run: beat >= q0 + 1, cps: 34, delayMs: 450 });
  const g = useFakeStream(grade, { run: beat >= q0 + 2, cps: 48, delayMs: 900 });
  const score = useTween(beat >= q0 + 2 ? 9 : 0, 1100);
  const marked = a.state === "done" && beat >= q0 + 2;
  return (
    <div className="gl-quiz">
      <span className="gl-eyebrow">Quiz · tự luận ngắn</span>
      <h2 className="gl-quiz-q">Vì sao trong chân không, vật nặng và vật nhẹ rơi như nhau?</h2>
      <div className="gl-quiz-a">
        <Portrait id="minhAnh" size={36} />
        <p className={a.state === "streaming" && beat >= q0 + 1 ? "caret" : undefined}>
          {marked ? (
            <>
              Vì <mark className="ok">không có lực cản</mark>, mọi vật <mark className="ok">chỉ chịu trọng lực</mark> nên rơi với <mark className="ok">cùng gia tốc g</mark>.
            </>
          ) : beat >= q0 + 1 ? (
            a.text
          ) : (
            <span className="gl-muted">Minh Anh đang trả lời…</span>
          )}
        </p>
      </div>
      {beat >= q0 + 2 && (
        <div className="gl-quiz-g">
          <div className="gl-score num">
            {score.toFixed(0)}
            <small>/10</small>
          </div>
          <p className={g.state === "streaming" ? "caret" : undefined}>{g.text}</p>
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Thẻ kết khoá ----------------------------- */
function EndCard({ onAgain }: { onAgain: () => void }) {
  const pct = useCountUp(86, 1400);
  const ideas = ["Không lực cản, mọi vật rơi cùng gia tốc g", "s = ½·g·t²: quãng đường tăng theo bình phương", "Lực cản phụ thuộc hình dạng, không phải khối lượng"];
  return (
    <div className="gl-end">
      <div className="gl-end-card">
        <div className="gl-end-top">
          <span className="gl-eyebrow">Kết khoá · Vật lí 10</span>
          <div className="gl-end-cast" aria-hidden="true">
            {ROLL.map((id) => (
              <Portrait key={id} id={id} size={30} />
            ))}
          </div>
        </div>
        <h2>Rơi tự do</h2>
        <ol className="gl-end-ideas">
          {ideas.map((t, i) => (
            <li key={t} style={{ animationDelay: `${300 + i * 160}ms` }}>
              {t}
            </li>
          ))}
        </ol>
        <div className="gl-end-stats">
          <div>
            <b className="num">{Math.round(pct)}%</b>
            <span>thành thạo</span>
          </div>
          <div>
            <b className="num">9/10</b>
            <span>quiz</span>
          </div>
          <div>
            <b className="num">2</b>
            <span>câu hỏi bằng giọng</span>
          </div>
          <div>
            <b className="num">18′</b>
            <span>thời lượng</span>
          </div>
        </div>
        <div className="gl-end-foot">
          <span>
            <Icon name="cal" size="sm" /> Hẹn ôn 27/11 · 20:30
          </span>
          <div className="gl-end-acts">
            <Button size="sm" icon="refresh" variant="ghost" onClick={onAgain}>
              Học lại
            </Button>
            <Button size="sm" icon="bookmark" variant="primary">
              Lưu hồ sơ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Thanh điều khiển ----------------------------- */
function Dock({ phase, beat, playing, onPlay, onPhase, onMic }: { phase: Phase; beat: number; playing: boolean; onPlay: () => void; onPhase: (p: Phase) => void; onMic: () => void }) {
  const idx = PHASES.findIndex((p) => p.id === phase);
  const invite = beat === firstOf("bang") + 1; // đang giảng → mời HS ngắt lời
  const prog = useMemo(() => Math.min(1, beat / END), [beat]);
  const pr = useTween(prog, reduced() ? 1 : 600);
  return (
    <div className="gl-dock">
      <button type="button" className="gl-play" onClick={onPlay} aria-label={playing ? "Tạm dừng" : "Tiếp tục"}>
        <Icon name={playing && beat < END ? "pause" : "play"} />
      </button>
      <ol className="gl-rail" style={{ ["--p" as string]: pr }}>
        {PHASES.map((p, i) => (
          <li key={p.id}>
            <button type="button" className={i < idx ? "done" : i === idx ? "on" : undefined} onClick={() => onPhase(p.id)}>
              <i />
              <span>{p.label}</span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={invite ? "gl-mic invite" : "gl-mic"} onClick={onMic} aria-label="Ngắt lời bằng giọng">
        <Icon name="mic" />
        <span>Ngắt lời</span>
      </button>
    </div>
  );
}
