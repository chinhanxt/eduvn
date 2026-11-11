// web/src/geometry3d/FigureBuilder.tsx — chọn hình mẫu hoặc dán đề để AI dựng hình; xem trước kiểu SGK, xoay được.
import { type PointerEvent, useMemo, useRef, useState } from "react";
import { api, errText } from "../api";
import { Icon } from "../Icon";
import "./figure.css";
import { printSvg, solvedOf } from "./figure";
import { defaultMode, PRESETS } from "./presets";
import { buildScene, clampView, SGK_VIEW, type View } from "./render";
import type { ConstructionSpec } from "./spec";
import { sceneSvg } from "./svg";

export type FigureResult = { kind: string; spec: ConstructionSpec; view: View };
type Props = { initialProblem?: string; startWithAi?: boolean; doneLabel: string; busyLabel?: string; onDone: (r: FigureResult) => void | Promise<void>; onCancel: () => void };

const thumbs = new Map<string, string>();
function thumb(id: string, spec: ConstructionSpec): string {
  let t = thumbs.get(id);
  if (!t) {
    t = printSvg(spec, SGK_VIEW[defaultMode(spec)], 90, 15).svg;
    thumbs.set(id, t);
  }
  return t;
}

export function FigureBuilder({ initialProblem = "", startWithAi = false, doneLabel, onDone, onCancel }: Props) {
  const [tab, setTab] = useState<"lib" | "ai">(startWithAi ? "ai" : "lib");
  const [cur, setCur] = useState<FigureResult | null>(() => {
    if (startWithAi) return null;
    const p = PRESETS.find((x) => x.id === "chop_vuong_sa")!;
    const spec = p.spec();
    return { kind: p.id, spec, view: SGK_VIEW[defaultMode(spec)] };
  });
  const [problem, setProblem] = useState(initialProblem);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const drag = useRef<{ x: number; y: number; v: View } | null>(null);

  const preview = useMemo(() => {
    if (!cur) return null;
    const solved = solvedOf(cur.spec);
    const sc = buildScene(solved, cur.view, { cx: 0, cy: 0, size: 150, font: 17 });
    return { ...sceneSvg(sc, "print", { font: 17 }), info: sc.info, errors: sc.errors };
  }, [cur]);

  const pick = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    const spec = p.spec();
    setCur({ kind: id, spec, view: SGK_VIEW[defaultMode(spec)] });
  };
  const askAi = async () => {
    if (!problem.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ spec: ConstructionSpec }>("/api/geometry/ai", { method: "POST", body: { problem } });
      setCur({ kind: "ai", spec: r.spec, view: SGK_VIEW[defaultMode(r.spec)] });
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (!cur) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, v: cur.view };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !cur) return;
    setCur({ ...cur, view: clampView({ mode: d.v.mode, th: d.v.th + (e.clientX - d.x) * 0.01, ph: d.v.ph + (e.clientY - d.y) * (d.v.mode === "sgk" ? 0.003 : 0.006) }) });
  };

  return (
    <div className="fg" data-testid="fig-builder">
      <div className="fg-left">
        <div className="fg-tabs">
          <button type="button" className={tab === "lib" ? "on" : ""} onClick={() => setTab("lib")} data-testid="fig-tab-lib"><Icon name="box" />Thư viện hình</button>
          <button type="button" className={tab === "ai" ? "on" : ""} onClick={() => setTab("ai")} data-testid="fig-tab-ai"><Icon name="spark" />AI dựng từ đề bài</button>
        </div>
        {tab === "lib" ? (
          <div className="fg-lib">
            {(["Chóp", "Lăng trụ", "Tròn xoay"] as const).map((g) => (
              <section key={g}>
                <h4>{g === "Chóp" ? "Tứ diện, hình chóp" : g === "Lăng trụ" ? "Lăng trụ, hình hộp" : "Nón, trụ, cầu"}</h4>
                <div className="fg-grid">
                  {PRESETS.filter((p) => p.group === g).map((p) => (
                    <button type="button" key={p.id} className={cur?.kind === p.id ? "on" : ""} onClick={() => pick(p.id)} title={p.title} data-testid={`fig-lib-${p.id}`}>
                      <span className="fg-th" dangerouslySetInnerHTML={{ __html: thumb(p.id, p.spec()) }} />
                      <small>{p.title}</small>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="fg-ai">
            <label className="fg-lbl">Dán đề bài hình học không gian</label>
            <textarea className="inp" rows={8} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder="Ví dụ: Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a√2. Gọi M là trung điểm SC. Tính góc giữa SC và (ABCD)." data-testid="fig-problem" />
            <button type="button" className="btn" disabled={busy || !problem.trim()} onClick={() => void askAi()} data-testid="fig-ai"><Icon name="spark" size={18} />{busy ? "AI đang dựng hình…" : "Dựng hình"}</button>
            <p className="fg-note">AI đọc đề → lập các ràng buộc (đáy, đỉnh, trung điểm, hình chiếu…) → bộ giải tính toạ độ và vẽ theo quy ước SGK. Số đo (góc, khoảng cách) tính đúng từ hình.</p>
            {err && <div className="fg-err" data-testid="fig-err">{err}</div>}
          </div>
        )}
      </div>
      <div className="fg-right">
        <div className="fg-prev" onPointerDown={down} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)} data-testid="fig-preview">
          {preview ? <div className="fg-svg" dangerouslySetInnerHTML={{ __html: preview.svg }} /> : <span className="fg-empty">{busy ? "AI đang dựng hình…" : "Chọn hình mẫu hoặc dán đề để AI dựng"}</span>}
        </div>
        {preview && (preview.info.length > 0 || preview.errors.length > 0) && (
          <ul className="fg-info" data-testid="fig-info">
            {preview.info.map((t, i) => <li key={i}>{t}</li>)}
            {preview.errors.map((t, i) => <li key={`e${i}`} className="bad">{t}</li>)}
          </ul>
        )}
        <div className="fg-ft">
          <button type="button" className="fg-link" disabled={!cur} onClick={() => cur && setCur({ ...cur, view: SGK_VIEW[defaultMode(cur.spec)] })} title="Kéo trên hình để xoay; bấm để về góc nhìn như SGK"><Icon name="rotate" />Về góc SGK</button>
          <span className="fg-grow" />
          <button type="button" className="btn ghost" onClick={onCancel}>Huỷ</button>
          <button type="button" className="btn" disabled={!cur || busy} onClick={() => cur && void onDone(cur)} data-testid="fig-done"><Icon name="check" size={18} />{doneLabel}</button>
        </div>
      </div>
    </div>
  );
}
