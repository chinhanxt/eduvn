// web/src/math/InkPad.tsx — bảng vẽ nhỏ "Viết tay": viết công thức bằng chuột/bút, AI đổi thành LaTeX.
import { type PointerEvent, useRef, useState } from "react";
import { errText } from "../api";
import { strokePath } from "../board/ink";
import { type InkStroke, inkToLatex } from "../board/inkImage";
import { MathText } from "./MathText";

export function InkPad({ onLatex, onClose }: { onLatex: (latex: string) => void; onClose: () => void }) {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [cur, setCur] = useState<number[] | null>(null);
  const [latex, setLatex] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pos = (e: PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * 560 * 10) / 10, Math.round(((e.clientY - r.top) / r.height) * 200 * 10) / 10];
  };
  // Đợi 0,8 s sau nét cuối rồi mới gọi AI; bỏ kết quả của lần gọi đã cũ.
  const read = (all: InkStroke[]) => {
    clearTimeout(timer.current);
    const mine = ++seq.current;
    if (!all.length) return setLatex("");
    setBusy(true);
    setErr(null);
    timer.current = setTimeout(() => {
      inkToLatex(all)
        .then((l) => mine === seq.current && setLatex(l))
        .catch((e: unknown) => mine === seq.current && setErr(errText(e)))
        .finally(() => mine === seq.current && setBusy(false));
    }, 800);
  };
  return (
    <div className="me-ink" data-testid="ink-pad">
      <svg ref={svg} viewBox="0 0 560 200" className="me-ink-svg"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setCur(pos(e)); }}
        onPointerMove={(e) => { if (cur) { const [x, y] = pos(e); setCur([...cur, x, y]); } }}
        onPointerUp={() => { if (cur) { const next = [...strokes, { pts: cur.length >= 4 ? cur : [cur[0]!, cur[1]!, cur[0]! + 0.5, cur[1]!], width: 4 }]; setStrokes(next); setCur(null); read(next); } }}>
        {strokes.map((s, i) => <path key={i} d={strokePath(s.pts, s.width)} fill="#111" />)}
        {cur && <path d={strokePath(cur, 4)} fill="#111" />}
      </svg>
      <div className="me-ink-bar">
        <span className="me-ink-out">{busy ? "Đang đọc…" : err ? <span className="err">{err}</span> : latex ? <MathText value={`$${latex}$`} /> : "Viết công thức vào khung, AI sẽ đọc."}</span>
        <button type="button" className="btn ghost sm" onClick={() => { setStrokes([]); setLatex(""); setErr(null); }}>Xoá</button>
        <button type="button" className="btn ghost sm" onClick={() => { const n = strokes.slice(0, -1); setStrokes(n); read(n); }} disabled={!strokes.length || busy}>Bỏ nét cuối</button>
        <button type="button" className="btn sm" disabled={!latex || busy} data-testid="ink-ok" onClick={() => { onLatex(latex); onClose(); }}>Chèn vào ô</button>
        <button type="button" className="btn ghost sm" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
