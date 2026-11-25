/** /gv/bai-giang-ai/tao — Tạo bài giảng AI (mô phỏng): yêu cầu → đọc nguồn web → dàn ý stream (sửa, kéo thả) → slide tự dựng + ảnh AI → nhân bản giọng. */
import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "../../ui/components/Button";
import { Icon } from "../../ui/Icon";
import { useFakeStream, useFakeProgress } from "../kit";
import { Head, Rail, Wave, useCount, usePhases } from "./common";
import { LESSON, NUMBERS, OUTLINE_TEXT, type OutlineSec, SLIDES, SOURCES, VOICES, type VoiceId, parseOutline } from "./data";
import { PaperSlide } from "./Paper";

const STEPS = [
  { label: "Yêu cầu", icon: "pen" },
  { label: "Nguồn", icon: "search" },
  { label: "Dàn ý", icon: "list" },
  { label: "Slide", icon: "slide" },
  { label: "Giọng", icon: "mic" },
];
const MIN = [5, 10, 15, 5, 10];

export function TaoBaiGiang() {
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const restart = () => {
    setStep(0);
    setRun((r) => r + 1);
  };
  return (
    <>
      <Head title="Tạo bài giảng">{step > 0 && <Button size="sm" variant="ghost" icon="refresh" onClick={restart}>Làm lại</Button>}</Head>
      <div className="gs-wiz" key={run}>
        <Rail steps={STEPS} at={Math.min(step, 5)} onPick={(i) => i >= 2 && setStep(i)} />
        <div className="gs-stage">
          {step === 0 && <Ask onGo={() => setStep(1)} />}
          {step === 1 && <Research onDone={() => setStep(2)} />}
          {step === 2 && <Outline onOk={() => setStep(3)} />}
          {step === 3 && <Build onOk={() => setStep(4)} />}
          {step === 4 && <Voice onOk={() => setStep(5)} />}
          {step === 5 && <Done />}
        </div>
      </div>
    </>
  );
}

function Ask({ onGo }: { onGo: () => void }) {
  const [text, setText] = useState(LESSON.prompt);
  const [web, setWeb] = useState(true);
  const [img, setImg] = useState(true);
  return (
    <section className="gs-ask enter">
      <textarea className="gs-ask-in" value={text} onChange={(e) => setText(e.target.value)} rows={2} aria-label="Bài muốn soạn" />
      <div className="gs-ctx">
        <span><Icon name="users" size="sm" />10A1 · 42 em</span>
        <span><Icon name="target" size="sm" />{NUMBERS.needHelp.length} em cần giúp</span>
        <button type="button" aria-pressed={web} onClick={() => setWeb(!web)}><Icon name="search" size="sm" />Tìm web</button>
        <button type="button" aria-pressed={img} onClick={() => setImg(!img)}><Icon name="image" size="sm" />Ảnh AI</button>
      </div>
      <Button variant="primary" size="lg" icon="spark" onClick={onGo} data-testid="tao-go">Soạn bài</Button>
      <div className="gs-ghost" aria-hidden="true">
        {SLIDES.slice(0, 4).map((s) => <PaperSlide key={s.id} slide={s} />)}
      </div>
    </section>
  );
}

function Research({ onDone }: { onDone: () => void }) {
  const read = useCount(SOURCES.length, 3600);
  useEffect(() => {
    if (read < SOURCES.length) return;
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [read, onDone]);
  return (
    <section className="gs-research">
      <div className="gs-big num">
        {read}<small>/{SOURCES.length} nguồn</small>
      </div>
      <ul className="gs-src">
        {SOURCES.map((s, i) => (
          <li key={s.host} data-st={i < read ? "done" : i === read ? "now" : "todo"} style={{ ["--hue" as string]: s.hue }}>
            <span className="gs-fav">{s.name[0]}</span>
            <span className="gs-src-t">
              <b>{s.name}</b>
              <q>{s.quote}</q>
            </span>
            <span className="gs-src-s">{i < read ? <Icon name="check" size="sm" /> : i === read ? <i className="gs-scan" /> : null}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Outline({ onOk }: { onOk: () => void }) {
  const s = useFakeStream(OUTLINE_TEXT, { cps: 120, delayMs: 300 });
  const [secs, setSecs] = useState<OutlineSec[] | null>(null);
  const [edit, setEdit] = useState<number | null>(null);
  const drag = useRef<number | null>(null);
  useEffect(() => {
    if (s.state === "done" && !secs) setSecs(parseOutline(OUTLINE_TEXT));
  }, [s.state, secs]);
  const list = secs ?? parseOutline(s.text);
  const done = !!secs;
  const over = (e: DragEvent, i: number) => {
    e.preventDefault();
    const from = drag.current;
    if (from === null || from === i || !secs) return;
    const next = [...secs];
    const [m] = next.splice(from, 1);
    next.splice(i, 0, m!);
    drag.current = i;
    setSecs(next);
  };
  return (
    <section className="gs-outline">
      <div className="gs-time" aria-label="Phân bổ 45 phút">
        {list.map((sec, i) => (
          <i key={sec.title + i} style={{ flexGrow: MIN[i] ?? 5, ["--c" as string]: `var(--gs-c${(i % 5) + 1})` }} title={sec.title}>
            <span className="num">{MIN[i] ?? 5}′</span>
          </i>
        ))}
      </div>
      <ol className={done ? "gs-tree ready" : "gs-tree"}>
        {list.map((sec, i) => (
          <li
            key={sec.title.slice(0, 12) + i}
            className="gs-sec"
            draggable={done}
            onDragStart={() => (drag.current = i)}
            onDragOver={(e) => over(e, i)}
            onDragEnd={() => (drag.current = null)}
          >
            <span className="gs-sec-n num" style={{ ["--c" as string]: `var(--gs-c${(i % 5) + 1})` }}>{i + 1}</span>
            <div className="gs-sec-b">
              {edit === i && secs ? (
                <input
                  autoFocus
                  className="gs-sec-in"
                  defaultValue={sec.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    setSecs(secs.map((x, k) => (k === i && v ? { ...x, title: v } : x)));
                    setEdit(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <h3 onClick={() => done && setEdit(i)}>{sec.title}</h3>
              )}
              <ul>
                {sec.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </div>
            {done && (
              <span className="gs-sec-acts">
                <span className="gs-grip" title="Kéo để đổi chỗ"><Icon name="grip" size="sm" /></span>
                <button type="button" aria-label="Bỏ mục" onClick={() => setSecs(secs!.filter((_, k) => k !== i))}><Icon name="x" size="sm" /></button>
              </span>
            )}
          </li>
        ))}
        {!done && <li className="gs-sec typing"><span className="gs-sec-n" /><span className="caret" /></li>}
      </ol>
      <div className="gs-acts">
        <Button variant="primary" icon="check" disabled={!done} onClick={onOk} data-testid="tao-duyet">Duyệt dàn ý</Button>
      </div>
    </section>
  );
}

function Build({ onOk }: { onOk: () => void }) {
  const per = 1900;
  const built = useCount(SLIDES.length, SLIDES.length * per);
  const done = built >= SLIDES.length;
  const [pick, setPick] = useState<number | null>(null);
  const cur = done ? (pick ?? 0) : Math.min(built, SLIDES.length - 1);
  const ill = usePhases([1500], cur === 1 && !done, cur);
  const illus = cur === 1 && !done && ill === 0 ? "gen" : "done";
  return (
    <section className="gs-build">
      <div className="gs-main-slide">
        <PaperSlide key={cur + (done ? "d" : "b")} slide={SLIDES[cur]!} n={cur + 1} build illus={illus} />
        {cur === 1 && <span className={illus === "gen" ? "gs-ai-tag gen" : "gs-ai-tag"}><Icon name="spark" size="sm" />{illus === "gen" ? "Đang vẽ ảnh" : "Ảnh AI"}</span>}
      </div>
      <div className="gs-strip" role="listbox" aria-label="Các slide">
        {SLIDES.map((s, i) => (
          <button key={s.id} type="button" role="option" aria-selected={i === cur} data-st={i < built ? "done" : i === built ? "now" : "todo"} onClick={() => done && setPick(i)}>
            {i <= built ? <PaperSlide slide={s} build={i === built} /> : <span className="gs-skel" />}
          </button>
        ))}
      </div>
      <div className="gs-acts">
        <span className="gs-meta num">{Math.min(built + (done ? 0 : 1), SLIDES.length)}/{SLIDES.length}</span>
        <Button variant="primary" iconEnd="arrowr" disabled={!done} onClick={onOk} data-testid="tao-giong">Giọng đọc</Button>
      </div>
    </section>
  );
}

function Voice({ onOk }: { onOk: () => void }) {
  const [voice, setVoice] = useState<VoiceId>("bac-nu");
  const [rec, setRec] = useState(false);
  const ph = usePhases([3600, 2400], rec);
  const learn = useFakeProgress(2400, rec && ph === 1);
  const cloned = rec && ph >= 2;
  useEffect(() => {
    if (cloned) setVoice("ha");
  }, [cloned]);
  const [play, setPlay] = useState(0);
  const say = SLIDES[0]!.say.join(" ");
  const words = useMemo(() => say.split(" "), [say]);
  const spoken = useCount(words.length, words.length * 260, play > 0, play);
  const secs = useCount(12, 3600, rec && ph === 0);
  return (
    <section className="gs-voice">
      <div className="gs-clone">
        <p className="gs-sample">“Chào các em, hôm nay cô cùng các em tìm hiểu bất phương trình bậc hai.”</p>
        <Wave n={56} live={rec && ph === 0} progress={cloned ? 1 : rec ? (ph === 0 ? secs / 12 : 1) : 0} />
        <div className="gs-clone-st">
          {!rec && <Button icon="mic" onClick={() => setRec(true)} data-testid="tao-thu">Thu 12 giây</Button>}
          {rec && ph === 0 && <span className="gs-rec num"><i />00:{String(secs).padStart(2, "0")}</span>}
          {rec && ph === 1 && <span className="gs-learn"><span className="meter thin"><i style={{ ["--v" as string]: `${learn * 100}%` }} /></span>Đang học giọng</span>}
          {cloned && <span className="gs-okline"><Icon name="checkc" size="sm" />Giọng cô Hà</span>}
        </div>
      </div>
      <ul className="gs-voices" role="radiogroup" aria-label="Giọng đọc">
        {VOICES.filter((v) => !("clone" in v) || cloned).map((v) => (
          <li key={v.id}>
            <button type="button" role="radio" aria-checked={voice === v.id} onClick={() => setVoice(v.id)} className={"clone" in v ? "is-new" : undefined}>
              <span className="gs-radio" />
              <b>{v.name}</b>
              <small>{v.note}</small>
            </button>
          </li>
        ))}
      </ul>
      <div className="gs-listen">
        <PaperSlide slide={SLIDES[0]!} n={1} />
        <p className="gs-karaoke">
          {words.map((w, i) => <span key={i} className={play && i < spoken ? "on" : undefined}>{w} </span>)}
        </p>
        <Button size="sm" icon="play" onClick={() => setPlay((p) => p + 1)}>Nghe thử</Button>
      </div>
      <div className="gs-acts">
        <Button variant="primary" icon="check" onClick={onOk} data-testid="tao-xong">Hoàn tất</Button>
      </div>
    </section>
  );
}

function Done() {
  return (
    <section className="gs-done enter">
      <div className="gs-fan" aria-hidden="true">
        {SLIDES.slice(0, 5).map((s, i) => (
          <div key={s.id} style={{ ["--i" as string]: i, ["--p" as string]: [0, -2, -1, 1, 2][i], ["--z" as string]: 5 - Math.abs([0, -2, -1, 1, 2][i]!) }}>
            <PaperSlide slide={s} />
          </div>
        ))}
      </div>
      <h2>{LESSON.title}</h2>
      <p className="gs-meta">{SLIDES.length} slide · 45 phút · giọng cô Hà</p>
      <div className="row">
        <Link className="btn primary" to="/bai-giang-ai/sua"><Icon name="pen" size="sm" /><span>Mở trình sửa</span></Link>
        <Link className="btn" to="/xuat-ban"><Icon name="upload" size="sm" /><span>Xuất bản</span></Link>
      </div>
    </section>
  );
}
