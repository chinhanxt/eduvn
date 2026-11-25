import { useEffect, useRef, useState } from "react";
import { Icon } from "../../ui/Icon";
import { StreamingText } from "../../ui/components/StreamingText";
import { useFakeStream } from "../kit/useFakeStream";
import { Karaoke, Loa } from "./bits";
import { LIGHTS, fmtMin, type ParentView } from "./data";
import type { useSpeak } from "./speak";

type Speak = ReturnType<typeof useSpeak>;

/** Hiện khi cuộn tới (chạy hoạt ảnh đúng lúc người xem nhìn thấy). */
function useSeen<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver(([e]) => {
      // thấy, hoặc đã cuộn vượt qua (nhảy thẳng xuống dưới)
      if (e && (e.isIntersecting || e.boundingClientRect.bottom < 0)) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: [0, 0.25] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

function useCount(to: number, run: boolean, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const t0 = performance.now();
    let raf = 0;
    const f = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [to, run, ms]);
  return n;
}

/* ---------------- Infographic tuần ---------------- */
export function Tuan({ v }: { v: ParentView }) {
  const [ref, seen] = useSeen<HTMLElement>();
  const total = v.week.reduce((a, d) => a + d.min, 0);
  const shown = useCount(total, seen);
  const early = v.week.filter((d) => !d.late).length;
  const max = 6;
  return (
    <section ref={ref} className={seen ? "ph-week seen" : "ph-week"} aria-labelledby="ph-wk">
      <div className="ph-sec-h">
        <Icon name="cal" />
        <h2 id="ph-wk">Tuần này của con</h2>
      </div>
      <div className="ph-kpis">
        <p><b className="num">{fmtMin(shown)}</b><span>tự học</span></p>
        <p className={early < 5 ? "low" : undefined}><b className="num">{early}/7</b><span>tối ngủ trước 23 giờ</span></p>
      </div>
      <div className="ph-days" role="img" aria-label={v.week.map((d) => `${d.d}: học ${d.min} phút, ngủ ${d.bed}`).join("; ")}>
        {v.week.map((d, i) => {
          const blocks = Math.round(d.min / 10);
          return (
            <div key={d.d} className={d.late ? "day late" : "day"} style={{ ["--i" as string]: i }} title={`${d.d}: học ${d.min} phút · ngủ lúc ${d.bed}`}>
              <div className="stack">
                {Array.from({ length: max }, (_, k) => (
                  <i key={k} className={k < blocks ? "on" : undefined} style={{ ["--k" as string]: k }} />
                ))}
              </div>
              <b>{d.d}</b>
              <span className="bed">
                <Icon name="moon" />
                <span className="num">{d.bed}</span>
              </span>
            </div>
          );
        })}
      </div>
      <p className="ph-legend">
        <i aria-hidden="true" /> 10 phút học
        <span className="late-key"><Icon name="moon" /> ngủ muộn</span>
      </p>
      <ul className="ph-trends">
        {v.trends.map((t) => (
          <li key={t.subject} className={`d-${t.dir}`}>
            <Icon name={t.dir === "len" ? "trend" : t.dir === "xuong" ? "trenddn" : "arrowr"} />
            <span>{t.subject}</span>
            <b className="num">{t.score.toLocaleString("vi-VN")}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Hỏi cô bằng giọng (mô phỏng nhận giọng nói) ---------------- */
type AskState = "idle" | "nghe" | "gui";
export function HoiCo({ v, sp }: { v: ParentView; sp: Speak }) {
  const [st, setSt] = useState<AskState>("idle");
  const [heard, setHeard] = useState(0);
  const [round, setRound] = useState(0);
  const qWords = v.ask.q.split(" ");
  const ans = useFakeStream(v.ask.a, { run: st === "gui", delayMs: 900, cps: 60, key: round });
  useEffect(() => {
    setSt("idle");
    setHeard(0);
  }, [v.slug]);
  useEffect(() => {
    if (st !== "nghe") return;
    setHeard(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      setHeard(i);
      if (i >= qWords.length) {
        clearInterval(t);
        setTimeout(() => setSt("gui"), 650);
      }
    }, 210);
    return () => clearInterval(t);
  }, [st, qWords.length]);
  const press = () => {
    if (st === "nghe") return;
    sp.stop();
    setRound((r) => r + 1);
    setSt("nghe");
  };
  const reading = sp.id === "ask";
  return (
    <section className="ph-ask" aria-labelledby="ph-ask-h">
      <div className="ph-sec-h">
        <Icon name="chat" />
        <h2 id="ph-ask-h">Hỏi cô</h2>
      </div>
      {st === "idle" ? (
        <div className="ph-mic-wrap">
          <button type="button" className="ph-mic" onClick={press} aria-label="Bấm để nói câu hỏi cho cô">
            <Icon name="mic" />
          </button>
          <p className="ph-mic-hint">Bấm rồi nói, như gọi điện</p>
        </div>
      ) : (
        <div className="ph-chat">
          <div className={st === "nghe" ? "bub me live" : "bub me"}>
            {st === "nghe" && (
              <span className="lvl" aria-hidden="true">
                <i /><i /><i /><i /><i />
              </span>
            )}
            <p>
              {qWords.slice(0, Math.max(1, heard)).join(" ")}
              {st === "nghe" && <span className="ph-caret" />}
            </p>
          </div>
          {st === "gui" && (
            <div className="bub co">
              <p className="who">{v.ask.from}</p>
              {reading ? (
                <Karaoke text={v.ask.a} at={sp.word} className="ans" />
              ) : (
                <StreamingText text={ans.text} state={ans.state} className="ans" />
              )}
              {ans.state === "done" && (
                <div className="row">
                  <button type="button" className={reading ? "ph-pill on" : "ph-pill"} onClick={() => sp.toggle("ask", v.ask.a)}>
                    <Loa on={reading} />
                    <span>{reading ? "Dừng" : "Nghe"}</span>
                  </button>
                  <button type="button" className="ph-pill ghost" onClick={press}>
                    <Icon name="mic" />
                    <span>Hỏi tiếp</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------- Xem trước tin Zalo ---------------- */
export function Zalo({ v }: { v: ParentView }) {
  const [ref, seen] = useSeen<HTMLElement>();
  const [phase, setPhase] = useState<"cho" | "go" | "den">("cho");
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    setPhase("go");
    const t = setTimeout(() => setPhase("den"), 1400);
    return () => clearTimeout(t);
  }, [seen, n]);
  const light = LIGHTS.find((l) => l.id === v.light)!;
  return (
    <section ref={ref} className="ph-zalo-sec" aria-labelledby="ph-zl">
      <div className="ph-sec-h">
        <Icon name="send" />
        <h2 id="ph-zl">Tin Zalo</h2>
        <span className="grow" />
        <button type="button" className="ph-pill ghost sm" onClick={() => setN((x) => x + 1)}>
          <Icon name="refresh" />
          <span>Gửi thử</span>
        </button>
      </div>
      <div className="ph-zalo" aria-label="Xem trước tin nhắn Zalo">
        <div className="zbar">
          <Icon name="chevl" />
          <span className="zav" aria-hidden="true">BM</span>
          <span className="zname">
            <b>Trường Bình Minh</b>
            <small>Tài khoản chính thức</small>
          </span>
        </div>
        <div className="zbody">
          <span className="ztime">19:30</span>
          {phase === "go" && (
            <div className="ztyping" aria-label="Đang gửi">
              <i /><i /><i />
            </div>
          )}
          {phase === "den" && (
            <div className="zmsg" key={n}>
              <div className={`zhead is-${v.light}`}>
                <span className="zdot"><Icon name={light.icon} /></span>
                <b>{v.child.short} · {light.label}</b>
              </div>
              <p>{v.zalo}</p>
              <span className="zbtn">Mở xem và nghe</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Kèm con ngay: 10 phút theo từng bước ---------------- */
export function KemNgay({ v, sp, onClose }: { v: ParentView; sp: Speak; onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = v.steps[i];
  const [left, setLeft] = useState(step ? step.min * 60 : 0);
  const total = v.steps.reduce((a, s) => a + s.min, 0);
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    box.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  useEffect(() => {
    if (!step) {
      sp.stop();
      return;
    }
    setLeft(step.min * 60);
    sp.speak(`run-${i}`, `Bước ${i + 1}. ${step.text} ${step.hint ?? ""}`);
    const t = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000);
    return () => clearInterval(t);
    // sp ổn định (useCallback): chỉ chạy lại khi đổi bước
  }, [i]);
  const R = 92;
  const C = 2 * Math.PI * R;
  const frac = step ? left / (step.min * 60) : 0;
  const mm = String(Math.floor(left / 60));
  const ss = String(left % 60).padStart(2, "0");
  const reading = sp.id === `run-${i}`;
  return (
    <div className="ph-run" role="dialog" aria-modal="true" aria-label="Kèm con 10 phút" ref={box} tabIndex={-1}>
      <div className="ph-run-top">
        <div className="dots" aria-hidden="true">
          {v.steps.map((_, k) => (
            <i key={k} className={k < i ? "done" : k === i ? "now" : undefined} />
          ))}
        </div>
        <button type="button" className="ph-tool" onClick={onClose} aria-label="Đóng">
          <Icon name="x" />
        </button>
      </div>
      {step ? (
        <div className="ph-run-body" key={i}>
          <div className="ring">
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <circle cx="100" cy="100" r={R} className="trk" />
              <circle cx="100" cy="100" r={R} className="val" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
            </svg>
            <span className="t num">{mm}:{ss}</span>
            <small>Bước {i + 1} / {v.steps.length}</small>
          </div>
          {reading ? <Karaoke text={step.text} at={sp.word} className="say" /> : <p className="say">{step.text}</p>}
          {step.hint && <p className="hint">{step.hint}</p>}
          <div className="acts">
            <button type="button" className="ph-pill big" onClick={() => sp.toggle(`run-${i}`, `${step.text} ${step.hint ?? ""}`)}>
              <Loa on={reading} />
              <span>{reading ? "Dừng" : "Nghe lại"}</span>
            </button>
            <button type="button" className="ph-pill big primary" onClick={() => setI((x) => x + 1)}>
              <Icon name="check" />
              <span>Xong</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="ph-run-body end">
          <span className="big-ok" aria-hidden="true">
            <svg viewBox="0 0 52 52"><path d="M14 27l8 8 16-17" /></svg>
          </span>
          <p className="say">Xong {total} phút với {v.child.short}</p>
          <p className="hint">Cô Hà sẽ biết tối nay con đã được kèm.</p>
          <button type="button" className="ph-pill big primary" onClick={onClose}>
            <span>Về trang chính</span>
          </button>
        </div>
      )}
    </div>
  );
}
