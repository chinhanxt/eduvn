import { type ReactNode, useEffect, useState } from "react";
import { KHANH_DUY, type Learner, MINH_ANH, useFakeStream } from "../kit";
import { Button, StreamingText } from "../../ui";
import { Icon } from "../../ui/Icon";
import { DemoHead, Face, useClock, useSteps } from "./parts";

/** Cùng một câu hỏi, hai em, hai cách giảng: gia sư tác tử đọc hồ sơ từng em rồi chọn cách giảng (ví dụ đời thực ↔ video ngắn). */
const QUESTION = "−x² + 6x − 5 > 0";

const STEPS = ["Đọc hồ sơ", "Chọn cách giảng", "Tự kiểm lời giải", "Hẹn ôn"];

const MA_TEXT = `Hình dung một quầy nước chanh: bán x chục cốc thì lãi −x² + 6x − 5 (trăm nghìn). Hỏi bán bao nhiêu thì có lãi?

Bước 1. Nhân hai vế với −1 cho hệ số x² dương. ==Chỗ em hay quên: nhân số âm phải đổi chiều.==
  x² − 6x + 5 < 0

Bước 2. Hai nghiệm là 1 và 5.

Bước 3. Tam thức âm giữa hai nghiệm, nên 1 < x < 5. Bán từ 1 đến 5 chục cốc là có lãi.`;

const KD_TEXT = `Mẹo một dòng: hệ số a âm thì parabol úp xuống, dương ở giữa hai nghiệm.

Đáp số: 1 < x < 5.

Làm thử một câu giống thế (2 phút) rồi nghỉ nhé?`;

/** Hiện chữ AI có định dạng nhẹ: dòng thụt lề = công thức, "Bước n." in đậm. */
const rich = (s: string): ReactNode =>
  s.split("\n").map((ln, i) => {
    if (ln.startsWith("  ")) {
      const [a, b] = ln.trim().split("<");
      return <div key={i} className="gs-math">{a}{b !== undefined && <><span className="gs-flip">&lt;</span>{b}</>}</div>;
    }
    const m = /^(Bước \d\.)(.*)$/.exec(ln);
    const body = (t: string) => t.split("==").map((x, j) => (j % 2 ? <mark key={j}>{x}</mark> : x));
    if (m) return <p key={i}><b>{m[1]}</b>{body(m[2] ?? "")}</p>;
    return ln ? <p key={i}>{body(ln)}</p> : <div key={i} className="gs-gap" />;
  });

export function GiaSuHieuMinh() {
  const [run, setRun] = useState(1);
  return (
    <div className="dm gs">
      <DemoHead title="Gia sư hiểu mình" eyebrow={<span>Một câu hỏi · hai cách giảng</span>}>
        <Button variant="primary" icon="refresh" onClick={() => setRun((r) => r + 1)}>Hỏi lại</Button>
      </DemoHead>
      <div className="gs-q" key={run}>
        <span className="dm-eyebrow">Cả hai em cùng hỏi</span>
        <div className="gs-q-t">
          Giải bất phương trình <span className="gs-q-m">{QUESTION}</span>
        </div>
      </div>
      <div className="gs-split">
        <Side key={`a${run}`} who={MINH_ANH} memory="21/11 em đã “à ra thế” chuyện đổi chiều" tags={["Ví dụ đời thực", "Hay quên đổi chiều"]} text={MA_TEXT} visual={(done) => <NumberLine show={done} />} />
        <div className="gs-div" aria-hidden="true" />
        <Side key={`b${run}`} who={KHANH_DUY} memory="Em hiểu nhanh qua video, hay nản sau 15 phút" tags={["Thích video", "Nản sau 15 phút"]} text={KD_TEXT} videoFirst visual={(done) => <Rest show={done} />} />
      </div>
    </div>
  );
}

function Side({ who, memory, tags, text, visual, videoFirst }: { who: Learner; memory: string; tags: string[]; text: string; visual: (done: boolean) => ReactNode; videoFirst?: boolean }) {
  const [step] = useSteps(STEPS.length + 1, 520, true);
  const ready = step >= STEPS.length;
  const s = useFakeStream(text, { run: ready, cps: videoFirst ? 40 : 75, delayMs: videoFirst ? 900 : 200 });
  return (
    <section className="gs-side" aria-label={`Gia sư giảng cho ${who.short}`}>
      <header className="gs-who">
        <Face name={who.name} hue={who.avatarHue} size={44} />
        <div>
          <b>{who.short}</b>
          <div className="gs-tags">
            {tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
      </header>
      <div className="gs-mem">
        <Icon name="bookmark" size="sm" />
        <span>Gia sư nhớ: {memory}</span>
      </div>
      <ol className="gs-steps" aria-label="Gia sư đang làm">
        {STEPS.map((t, i) => (
          <li key={t} className={i < step ? "ok" : i === step ? "now" : undefined}>
            <i>{i < step ? <Icon name="check" size="sm" /> : null}</i>
            {t}
          </li>
        ))}
      </ol>
      <div className="gs-body">
        {videoFirst && ready && <MiniVideo />}
        {ready && <StreamingText text={s.text} state={s.state} className="gs-text" render={rich} />}
        {visual(s.state === "done")}
      </div>
    </section>
  );
}

/** Trục số: khoảng (2; 3) tô dần. */
function NumberLine({ show }: { show: boolean }) {
  const x = (v: number) => 20 + v * 50;
  return (
    <figure className={show ? "gs-nl in" : "gs-nl"} aria-label="Nghiệm: 1 < x < 5">
      <svg viewBox="0 0 340 64">
        <line x1={10} x2={330} y1={30} y2={30} className="ax" />
        {[0, 1, 2, 3, 4, 5, 6].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={25} y2={35} className="tk" />
            <text x={x(v)} y={56} textAnchor="middle">{v}</text>
          </g>
        ))}
        <line x1={x(1)} x2={x(5)} y1={30} y2={30} className="seg" pathLength={1} />
        <circle cx={x(1)} cy={30} r={6} className="open" />
        <circle cx={x(5)} cy={30} r={6} className="open" />
      </svg>
    </figure>
  );
}

/** "Video 60 giây" do AI dựng cho em thích xem: parabol úp vẽ dần, phụ đề theo mốc. */
function MiniVideo() {
  const [play, setPlay] = useState(true);
  const [t, setT] = useClock(play, 1);
  const LEN = 7;
  const k = Math.min(1, t / LEN);
  useEffect(() => {
    if (k >= 1 && play) setPlay(false);
  }, [k, play]);
  const W = 360, H = 200;
  const X = (v: number) => 30 + v * 50;
  const Y = (v: number) => 112 - v * 19;
  const curve = (a: number, b: number) => {
    const out: string[] = [];
    for (let v = a; v <= b + 1e-6; v += 0.05) out.push(`${X(v).toFixed(1)},${Y(-v * v + 6 * v - 5).toFixed(1)}`);
    return out;
  };
  const pb = `M${curve(0.25, 5.75).join(" L")}`;
  const area = `M${X(1)},${Y(0)} L${curve(1, 5).join(" L")} L${X(5)},${Y(0)} Z`;
  const cap = k < 0.3 ? "Đây là đồ thị y = −x² + 6x − 5" : k < 0.62 ? "Parabol cắt trục hoành tại 1 và 5" : "Phần nằm trên trục: 1 < x < 5";
  const sec = Math.round(k * 60);
  return (
    <figure className="gs-video">
      <div className="gs-video-sc">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Đồ thị parabol úp, dương giữa 1 và 5">
          <line x1={20} x2={W - 20} y1={Y(0)} y2={Y(0)} className="ax" />
          <line x1={X(0)} x2={X(0)} y1={14} y2={H - 14} className="ax" />
          {[1, 2, 3, 4, 5, 6].map((v) => (
            <text key={v} x={X(v)} y={Y(0) + 16} textAnchor="middle" className="lb">{v}</text>
          ))}
          <path d={area} className={k > 0.62 ? "area in" : "area"} />
          <path d={pb} className="pb" pathLength={1} style={{ strokeDashoffset: 1 - Math.min(1, k / 0.3) }} />
          <circle cx={X(1)} cy={Y(0)} r={k > 0.3 ? 5 : 0} className="root" />
          <circle cx={X(5)} cy={Y(0)} r={k > 0.42 ? 5 : 0} className="root" />
        </svg>
        <div className="gs-cap" key={cap}>{cap}</div>
      </div>
      <div className="gs-ctl">
        <button type="button" aria-label={play ? "Dừng" : "Phát"} onClick={() => (k >= 1 ? (setT(0), setPlay(true)) : setPlay(!play))}>
          <Icon name={play ? "pause" : "play"} size="sm" />
        </button>
        <div className="bar"><i style={{ width: `${k * 100}%` }} /></div>
        <span className="num">0:{String(sec).padStart(2, "0")} / 1:00</span>
      </div>
    </figure>
  );
}

/** Nhịp nghỉ cho em hay nản: làm thử 1 câu rồi nghỉ. */
function Rest({ show }: { show: boolean }) {
  return (
    <div className={show ? "gs-rest in" : "gs-rest"}>
      <Button size="sm" icon="play">Làm thử 1 câu</Button>
      <span><Icon name="timer" size="sm" />Nghỉ 5 phút sau đó</span>
    </div>
  );
}
