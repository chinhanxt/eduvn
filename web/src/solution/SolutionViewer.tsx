// web/src/solution/SolutionViewer.tsx — trình xem lời giải từng bước: hình trái (dính khi cuộn; điện thoại: hình trên, dính), bước phải.
// Bước đang xem (bấm, phím ← →, hoặc cuộn tới) tô sáng phần tử refs trên hình: đổi màu nhấn + dày nét, phần khác mờ, chuyển mượt bằng CSS.
// Đang stream: skeleton đúng hình hình vẽ/bước, chữ bước đang viết hiện dần. Huy hiệu tự kiểm đáp số, "Chưa hiểu bước này", đọc to, xuất PNG.
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errText } from "../api";
import { svgToPngBlob } from "../geometry3d/figure";
import type { HintAsk } from "./api";
import { stuckMessage } from "./context";
import { type El, type FigureModel, buildFigureModel, figureSvg, highlightOf, knownRefs, solidOverlay } from "./figure";
import { ensureFonts } from "./fonts";
import { Rich, TexText } from "./Rich";
import { StepTutor } from "./StepTutor";
import { type Figure, STATUS_TEXT, type Step, type Verification } from "./types";
import "./solution.css";

export type ViewerSolution = { problem: string; answer?: string; figure?: Figure | null; steps: Step[]; verification?: Verification; topic?: string };
export type ViewerProps = {
  solution: ViewerSolution;
  /** đang stream: bước cuối có thể dở; figure === undefined → skeleton hình */
  streaming?: boolean;
  status?: string;
  onStop?: () => void;
  /** gia sư cho "Chưa hiểu bước này"; null = ẩn nút */
  ask?: HintAsk | null;
  /** nút "Chưa hiểu" khi chưa đăng nhập (vd trang công khai → mời đăng nhập) */
  onAskUnavailable?: () => void;
  corrected?: boolean;
  /** ẩn đề (nơi gắn đã hiện đề, vd kết quả bài làm) */
  hideProblem?: boolean;
  /** nút thêm ở đầu (chia sẻ, giải lại…) */
  actions?: ReactNode;
  /** tiêu đề phụ trên đề */
  eyebrow?: string;
};

const ICON = {
  check: "M20 6 9 17l-5-5",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  help: "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z",
  volume: "M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14",
  stop: "M6 6h12v12H6z",
  chat: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  left: "m15 18-6-6 6-6",
  right: "m9 18 6-6-6-6",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
};
export const SolIcon = ({ d }: { d: keyof typeof ICON }) => (
  <svg className="sol-i" viewBox="0 0 24 24" aria-hidden="true">
    <path d={ICON[d]} />
  </svg>
);

export function VerifyBadge({ v, corrected }: { v?: Verification; corrected?: boolean }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => wrap.current && !wrap.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);
  if (!v) return null;
  const icon = v.status === "verified" ? "check" : v.status === "mismatch" ? "alert" : "help";
  return (
    <span className="sol-badge-wrap" ref={wrap}>
      <button type="button" className={`sol-badge sol-${v.status}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="sol-verify">
        <SolIcon d={icon} />
        {STATUS_TEXT[v.status]}
      </button>
      {open && (
        <div className="sol-pop" role="dialog" aria-label="Chi tiết tự kiểm đáp số">
          <p className="sol-pop-lead">
            {v.status === "verified"
              ? "Phần mềm đã tự đo lại trên hình / thế lại vào đề và khớp với đáp số."
              : v.status === "mismatch"
                ? "Số đo thật lệch với đáp số — cần thầy cô xem lại."
                : "Bài này không có đại lượng để đo hoặc tính lại tự động."}
            {corrected && " AI đã tự sửa lời giải một lần theo số đo thật."}
          </p>
          {v.details.length > 0 && (
            <ul>
              {v.details.map((d, i) => (
                <li key={i} className={d.ok === true ? "ok" : d.ok === false ? "bad" : ""}>
                  <span className="lbl">{d.label}</span>
                  {d.expected && <span>ghi <TexText value={asTex(d.expected)} /></span>}
                  {d.measured && <span>đo lại <b><TexText value={asTex(d.measured)} /></b></span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}

/** Đáp số dạng công thức (a√6/3, x = 2, 3/8) bọc $…$; câu chữ giữ nguyên. */
export const asTex = (a: string) => {
  if (a.includes("$")) return a;
  if (/[a-zà-ỹ]{3,}/i.test(a.replace(/sqrt|frac|sin|cos|tan|log|ln|pi|tan φ/g, ""))) return a;
  const t = a
    .replace(/√\(([^)]*)\)/g, "\\sqrt{$1}")
    .replace(/√(\d+|[a-z])/g, "\\sqrt{$1}")
    .replace(/(\d)\s*\/\s*(\d+)/g, "\\tfrac{$1}{$2}")
    .replace(/³/g, "^3")
    .replace(/²/g, "^2")
    .replace(/φ/g, "\\varphi ")
    .replace(/°/g, "^\\circ");
  return `$${t}$`;
};

function ElNode({ e, h }: { e: El; h: "hl" | "dim" | null }) {
  const cls = `sol-el ${e.t} ${"role" in e && e.role ? e.role : ""} ${h ?? ""}`;
  switch (e.t) {
    case "line":
      return <line className={cls} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} strokeDasharray={e.dash ? "4 4" : undefined} />;
    case "path":
      return <path className={cls} d={e.d} />;
    case "poly":
      return <polygon className={cls} points={e.pts.map((p) => p.join(",")).join(" ")} />;
    case "circle":
      return <circle className={`${cls}${e.fill ? " fill" : ""}`} cx={e.cx} cy={e.cy} r={e.r} />;
    case "rect":
      return <rect className={cls} x={e.x} y={e.y} width={e.w} height={e.h} rx={e.rx} />;
    case "text":
      return (
        <text className={cls} x={e.x} y={e.y} fontSize={e.size} textAnchor={e.anchor ?? "middle"}>
          {e.text}
        </text>
      );
  }
}

export function FigureView({ model, refs, title }: { model: FigureModel; refs: string[]; title: string }) {
  const [x, y, w, h] = model.viewBox;
  const overlay = useMemo(() => (model.solid ? solidOverlay(model.solid.scene, refs) : []), [model, refs]);
  return (
    <svg className="sol-svg" viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={title} data-testid="sol-figure">
      {model.solid && <g className={`sol-solid${refs.length ? " is-dim" : ""}`} dangerouslySetInnerHTML={{ __html: model.solid.body }} />}
      {model.solid
        ? overlay.map((e, i) => <ElNode key={`${refs.join("|")}-${i}`} e={e} h="hl" />)
        : model.els.map((e, i) => <ElNode key={i} e={e} h={highlightOf(e, refs)} />)}
    </svg>
  );
}

const speakable = (s: string) =>
  s
    .replace(/\$([^$]*)\$/g, (_, m: string) =>
      m
        .replace(/\\[dt]?frac\{([^}]*)\}\{([^}]*)\}/g, "$1 trên $2")
        .replace(/\\sqrt\{([^}]*)\}/g, "căn $1")
        .replace(/\^\{?2\}?/g, " bình phương")
        .replace(/\^\{?3\}?/g, " lập phương")
        .replace(/\\cdot|\\times/g, " nhân ")
        .replace(/=/g, " bằng ")
        .replace(/\\[a-zA-Z]+/g, " ")
        .replace(/[{}^_]/g, " "),
    )
    .replace(/[*#`>]/g, "");

export function SolutionViewer({ solution, streaming, status, onStop, ask = null, onAskUnavailable, corrected, hideProblem, actions, eyebrow }: ViewerProps) {
  const [cur, setCur] = useState(0);
  const [stuck, setStuck] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLLIElement | null)[]>([]);
  const picked = useRef(0); // thời điểm người dùng tự chọn bước (bỏ qua đồng bộ cuộn ngay sau đó)
  useEffect(ensureFonts, []);

  const model = useMemo(() => {
    if (!solution.figure) return null;
    try {
      return buildFigureModel(solution.figure);
    } catch {
      return null;
    }
  }, [solution.figure]);
  const steps = solution.steps;
  const idx = Math.max(0, Math.min(cur, steps.length - 1));
  const step: Step | undefined = steps[idx];
  const refs = useMemo(() => (model && step ? knownRefs(model, step.refs ?? []) : []), [model, step]);
  const figLoading = streaming && solution.figure === undefined;
  const hasFig = !!model || figLoading;

  // đang stream: theo bước mới nhất
  useEffect(() => {
    if (streaming) setCur(Math.max(0, steps.length - 1));
  }, [streaming, steps.length]);

  const go = useCallback(
    (i: number, scroll = true) => {
      const n = Math.max(0, Math.min(steps.length - 1, i));
      picked.current = performance.now();
      setCur(n);
      if (scroll) items.current[n]?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
    [steps.length],
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]") || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(idx + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(idx - 1);
      else return;
      e.preventDefault();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [go, idx]);

  // cuộn tới bước nào thì hình theo bước đó (kiểu bài viết Distill); tắt khi đang stream
  useEffect(() => {
    if (streaming || !model || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (es) => {
        if (performance.now() - picked.current < 900) return;
        const vis = es.filter((e) => e.isIntersecting).map((e) => Number((e.target as HTMLElement).dataset.i));
        if (vis.length) setCur(Math.min(...vis));
      },
      { rootMargin: "-38% 0px -52% 0px" },
    );
    for (const li of items.current) if (li) io.observe(li);
    return () => io.disconnect();
  }, [streaming, model, steps.length]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [idx]);

  const speak = () => {
    const synth = window.speechSynthesis;
    if (!synth || !step) return setErr("Trình duyệt này chưa hỗ trợ đọc to");
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(`Bước ${idx + 1}. ${step.title}. ${speakable(step.body)}`);
    u.lang = "vi-VN";
    u.rate = 0.95;
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
      const blob = await svgToPngBlob(svg, w, h, 3);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hinh-buoc-${idx + 1}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      setErr(errText(e));
    }
  };

  const skeletons = streaming ? (steps.length === 0 ? 3 : steps.length < 3 ? 2 : 1) : 0;
  const canAsk = !streaming && (ask || onAskUnavailable);

  return (
    <div className={`sol-viewer${hasFig ? "" : " sol-nofig"}`} ref={root} tabIndex={0} aria-label="Lời giải từng bước — phím ← → để chuyển bước" data-testid="sol-viewer">
      {!hideProblem && (
        <header className="sol-head">
          <div className="sol-eyebrow">
            {eyebrow ?? "Lời giải từng bước"}
            {solution.topic && <> · {solution.topic}</>}
          </div>
          <Rich text={solution.problem} className="sol-problem" />
        </header>
      )}
      <div className="sol-meta">
        {streaming ? (
          <span className="sol-badge sol-running" role="status" aria-live="polite">
            <span className="sol-spin" aria-hidden="true" />
            {status ?? "Đang giải…"}
          </span>
        ) : (
          <VerifyBadge v={solution.verification} corrected={corrected} />
        )}
        {streaming && onStop && (
          <button type="button" className="sol-btn sm" onClick={onStop}>
            Dừng
          </button>
        )}
        <span className="sol-sp" />
        {actions}
      </div>

      <div className="sol-grid">
        {hasFig && (
          <figure className="sol-fig" aria-busy={figLoading}>
            <div className="sol-fig-box">
              {model ? (
                <FigureView model={model} refs={refs} title={`Hình minh hoạ bước ${idx + 1}`} />
              ) : (
                <div className="sol-fig-skel" aria-label="Đang dựng hình">
                  <svg viewBox="0 0 200 150" aria-hidden="true">
                    <path d="M100 18 40 112h120zM100 18l18 76M40 112l78-18 42 18" />
                  </svg>
                </div>
              )}
            </div>
            {model && (
              <figcaption>
                <span>
                  <b>Hình.</b> {step ? <>Bước {idx + 1} — {step.title || "…"}</> : "Hình của bài"}
                  {refs.length > 0 && <span className="sol-refs">{refs.map((r) => r.replace(/-/g, "")).join(", ")}</span>}
                </span>
                <button type="button" className="sol-btn sm ghost" onClick={exportPng} data-testid="sol-png">
                  <SolIcon d="download" />
                  PNG
                </button>
              </figcaption>
            )}
          </figure>
        )}

        <section className="sol-steps">
          {steps.length > 1 && (
            <nav className="sol-nums" aria-label="Các bước">
              <button type="button" className="sol-icon-btn" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label="Bước trước">
                <SolIcon d="left" />
              </button>
              <ol>
                {steps.map((s, i) => (
                  <li key={i}>
                    <button type="button" className={i === idx ? "on" : i < idx ? "past" : ""} onClick={() => go(i)} aria-current={i === idx ? "step" : undefined} title={s.title} data-testid={`sol-num-${i + 1}`}>
                      {i + 1}
                    </button>
                  </li>
                ))}
              </ol>
              <button type="button" className="sol-icon-btn" onClick={() => go(idx + 1)} disabled={idx >= steps.length - 1} aria-label="Bước sau">
                <SolIcon d="right" />
              </button>
              <span className="sol-kbd" aria-hidden="true">← →</span>
            </nav>
          )}
          <ol className="sol-list">
            {steps.map((s, i) => (
              <li key={i} ref={(el) => void (items.current[i] = el)} data-i={i} className={`sol-step${i === idx ? " on" : ""}`} onClick={() => i !== idx && go(i, false)} data-testid="sol-step">
                <div className="sol-step-n" aria-hidden="true">{i + 1}</div>
                <div className="sol-step-c">
                  <h3>
                    <span className="sr-only">Bước {i + 1}: </span>
                    {s.title || <span className="sol-skel-line w40" />}
                  </h3>
                  <div className={`sol-body${streaming && i === steps.length - 1 ? " sol-typing" : ""}`}>
                    <Rich text={s.body ?? ""} />
                  </div>
                  {i === idx && !streaming && (
                    <div className="sol-acts">
                      <button type="button" className="sol-btn sm ghost" onClick={(e) => (e.stopPropagation(), speak())} aria-pressed={speaking}>
                        <SolIcon d={speaking ? "stop" : "volume"} />
                        {speaking ? "Dừng đọc" : "Đọc to"}
                      </button>
                      {canAsk && (
                        <button type="button" className="sol-btn sm" onClick={(e) => (e.stopPropagation(), ask ? setStuck(i) : onAskUnavailable?.())} data-testid="sol-stuck">
                          <SolIcon d="chat" />
                          Chưa hiểu bước này
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
            {Array.from({ length: skeletons }, (_, k) => (
              <li key={`sk${k}`} className="sol-step sol-skel" aria-hidden="true">
                <div className="sol-step-n">{steps.length + k + 1}</div>
                <div className="sol-step-c">
                  <span className="sol-skel-line w40" />
                  <span className="sol-skel-line" />
                  <span className="sol-skel-line w80" />
                </div>
              </li>
            ))}
          </ol>
          {!streaming && solution.answer && (
            <div className="sol-answer" data-testid="sol-answer">
              <span className="sol-eyebrow">Đáp số</span>
              <div className="sol-answer-v">
                <TexText value={asTex(solution.answer)} />
              </div>
            </div>
          )}
          {err && <p className="sol-err" role="alert">{err}</p>}
        </section>
      </div>
      {stuck !== null && ask && <StepTutor ask={ask} message={stuckMessage({ problem: solution.problem, steps }, stuck)} title={`Bước ${stuck + 1}: ${steps[stuck]?.title ?? ""}`} onClose={() => setStuck(null)} />}
    </div>
  );
}
