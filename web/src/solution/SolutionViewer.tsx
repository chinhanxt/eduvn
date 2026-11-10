// web/src/solution/SolutionViewer.tsx — trình xem lời giải từng bước: hình trái (điện thoại: hình trên, dính), bước phải;
// bấm bước / phím ←→ tô sáng phần tử refs trên hình; huy hiệu kiểm đáp số; "Chưa hiểu bước này"; đọc to; xuất PNG hình.
import { useEffect, useMemo, useRef, useState } from "react";
import { errText } from "../api";
import { svgToPngBlob } from "../geometry3d/figure";
import { Markdown } from "../hoc/Markdown";
import { MathText } from "../math/MathText";
import { stuckMessage } from "./api";
import { type El, type FigureModel, buildFigureModel, elSvg, figureSvg, highlightOf, knownRefs, solidOverlay } from "./figure";
import { StepTutor } from "./StepTutor";
import { STATUS_TEXT, type Solution, type Step, type Verification } from "./types";
import "./solution.css";

export type ViewerProps = {
  solution: Pick<Solution, "problem" | "answer" | "figure" | "steps"> & { verification?: Verification; topic?: string };
  /** đang stream: bước cuối có thể dở */
  streaming?: boolean;
  /** cho phép mở gia sư (cần đăng nhập) */
  tutor?: boolean;
  status?: string;
};

export function VerifyBadge({ v }: { v?: Verification }) {
  const [open, setOpen] = useState(false);
  if (!v) return null;
  return (
    <span className="sol-badge-wrap">
      <button type="button" className={`sol-badge sol-${v.status}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} title="Xem chi tiết tự kiểm">
        {v.status === "verified" ? "✓ " : v.status === "mismatch" ? "! " : "? "}
        {STATUS_TEXT[v.status]}
      </button>
      {open && (
        <ul className="sol-checks">
          {v.details.length === 0 && <li>Bài này không có đại lượng để đo/tính lại tự động.</li>}
          {v.details.map((d, i) => (
            <li key={i} className={d.ok === true ? "ok" : d.ok === false ? "bad" : ""}>
              {d.label}
              {d.expected && <> · ghi: <MathText value={d.expected} /></>}
              {d.measured && <> · đo/tính lại: <b>{d.measured}</b></>}
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function FigureView({ model, refs, title }: { model: FigureModel; refs: string[]; title: string }) {
  const [x, y, w, h] = model.viewBox;
  const overlay = useMemo(() => (model.solid ? solidOverlay(model.solid.scene, refs) : []), [model, refs]);
  return (
    <svg className="sol-svg" viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={title}>
      {model.solid && <g className={refs.length ? "sol-dim" : ""} dangerouslySetInnerHTML={{ __html: model.solid.body }} />}
      {(model.solid ? overlay : model.els).map((e: El, i) => (
        <g key={i} dangerouslySetInnerHTML={{ __html: elSvg(e, model.solid ? "hl" : highlightOf(e, refs)) }} />
      ))}
    </svg>
  );
}

/** Đáp số dạng công thức (a√6/3, x = 2) bọc $…$; câu chữ giữ nguyên. */
export const answerTex = (a: string) => (a.includes("$") || /[a-zà-ỹ]{3,}/i.test(a.replace(/sqrt|frac|sin|cos|tan|log|ln|pi/g, "")) ? a : `$${a.replace(/√(\d+)/g, "\\sqrt{$1}")}$`);

const speakable = (s: string) => s.replace(/\$([^$]*)\$/g, (_, m: string) => m.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1 trên $2").replace(/\\sqrt\{([^}]*)\}/g, "căn $1").replace(/\^2/g, " bình phương").replace(/\\[a-z]+/g, " ").replace(/[{}^_]/g, " ")).replace(/[*#`>]/g, "");

export function SolutionViewer({ solution, streaming, tutor, status }: ViewerProps) {
  const [cur, setCur] = useState(0);
  const [stuck, setStuck] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const model = useMemo(() => {
    if (!solution.figure) return null;
    try {
      return buildFigureModel(solution.figure);
    } catch {
      return null;
    }
  }, [solution.figure]);
  const steps = solution.steps;
  const step: Step | undefined = steps[Math.min(cur, steps.length - 1)];
  const refs = useMemo(() => (model && step ? knownRefs(model, step.refs ?? []) : []), [model, step]);

  // đang stream: theo bước mới nhất
  useEffect(() => {
    if (streaming) setCur(Math.max(0, steps.length - 1));
  }, [streaming, steps.length]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowRight") setCur((c) => Math.min(steps.length - 1, c + 1));
      else if (e.key === "ArrowLeft") setCur((c) => Math.max(0, c - 1));
      else return;
      e.preventDefault();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [steps.length]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth || !step) return setErr("Trình duyệt này chưa hỗ trợ đọc to");
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(`Bước ${cur + 1}. ${step.title}. ${speakable(step.body)}`);
    u.lang = "vi-VN";
    const vi = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("vi"));
    if (vi) u.voice = vi;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  };

  const exportPng = async () => {
    if (!model) return;
    try {
      const { svg, w, h } = figureSvg(model, refs);
      const blob = await svgToPngBlob(svg, w, h, 2);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hinh-buoc-${cur + 1}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      setErr(errText(e));
    }
  };

  return (
    <div className={`sol-viewer${model ? "" : " sol-nofig"}`} ref={root} tabIndex={0} aria-label="Lời giải từng bước (dùng phím ← → để chuyển bước)">
      <header className="sol-head">
        <div className="sol-problem">
          <Markdown text={solution.problem} />
        </div>
        <div className="sol-meta">
          {solution.topic && <span className="sol-topic">{solution.topic}</span>}
          {streaming ? <span className="sol-badge sol-running">{status ?? "Đang giải…"}</span> : <VerifyBadge v={solution.verification} />}
        </div>
      </header>
      {model && (
        <figure className="sol-fig">
          <FigureView model={model} refs={refs} title={`Hình minh hoạ bước ${cur + 1}`} />
          <figcaption>
            <button type="button" className="ghost" onClick={exportPng}>Xuất PNG hình</button>
          </figcaption>
        </figure>
      )}
      <section className="sol-steps">
        <nav className="sol-nums" aria-label="Các bước">
          {steps.map((s, i) => (
            <button key={i} type="button" className={i === cur ? "on" : ""} onClick={() => setCur(i)} aria-current={i === cur ? "step" : undefined} title={s.title}>
              {i + 1}
            </button>
          ))}
          {streaming && <span className="sol-dots" aria-hidden>…</span>}
        </nav>
        <ol className="sol-list">
          {steps.map((s, i) => (
            <li key={i} className={i === cur ? "on" : ""} onClick={() => setCur(i)}>
              <h3>
                <span className="n">Bước {i + 1}</span> {s.title}
              </h3>
              <div className={`sol-body${streaming && i === steps.length - 1 ? " typing" : ""}`}>
                <Markdown text={s.body ?? ""} />
              </div>
              {i === cur && !streaming && (
                <div className="sol-acts">
                  <button type="button" className="ghost" onClick={speak}>{speaking ? "Dừng đọc" : "Đọc to"}</button>
                  {tutor && (
                    <button type="button" className="ghost" onClick={(e) => (e.stopPropagation(), setStuck(i))}>
                      Chưa hiểu bước này
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>
        {!streaming && solution.answer && (
          <p className="sol-answer">
            Đáp số: <MathText value={answerTex(solution.answer)} />
          </p>
        )}
        {err && <p className="error">{err}</p>}
      </section>
      {stuck !== null && <StepTutor message={stuckMessage(solution, stuck)} title={`Bước ${stuck + 1}: ${steps[stuck]?.title ?? ""}`} onClose={() => setStuck(null)} />}
    </div>
  );
}
