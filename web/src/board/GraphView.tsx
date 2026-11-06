// web/src/board/GraphView.tsx
import { type PointerEvent, useRef, useState } from "react";
import { vn } from "../api";
import { Icon } from "../Icon";
import { MathField } from "../math/MathEditor";
import { MathText } from "../math/MathText";
import { VoiceButton } from "../math/VoiceButton";
import type { Tool, ToBoard } from "./BoardPage";
import { CURVE_COLORS, type GraphObj } from "./doc";
import { autoView, compileExpr, mapX, mapY, samplePath, ticks } from "./graph";
import type { BoardApi } from "./useBoard";

type Props = { obj: GraphObj; tool: Tool; selected: boolean; onSelect: () => void; onEdit: () => void; b: BoardApi; toBoard: ToBoard };

export function GraphView({ obj, tool, selected, onSelect, onEdit, b, toBoard }: Props) {
  const slSnap = useRef(false);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const box = { x: obj.x + 20, y: obj.y + 20, w: obj.w - 40, h: obj.h - 40 };
  const v = obj.view;
  const compiled = obj.exprs.map((e) => compileExpr(e.latex));
  const params = [...new Set(compiled.flatMap((c) => (c.ok ? c.params : [])))];
  const clip = `bd-clip-${obj.id}`;

  const down = (e: PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    onSelect();
    if (tool !== "pointer") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [sx, sy] = toBoard(e);
    drag.current = { sx, sy, ox: obj.x, oy: obj.y };
    b.snapshot();
  };
  const move = (e: PointerEvent<SVGRectElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toBoard(e);
    b.updateObj(obj.id, { x: Math.max(80 - obj.w, Math.min(1200, d.ox + x - d.sx)), y: Math.max(0, Math.min(660, d.oy + y - d.sy)) }, true);
  };
  const up = () => {
    drag.current = null;
  };
  const refit = () => {
    const fs = compiled.flatMap((c) => (c.ok ? [(x: number) => c.f(x, obj.params)] : []));
    b.updateObj(obj.id, { view: autoView(fs, v.xMin, v.xMax) });
  };

  return (
    <g className="bd-obj" data-testid="bd-graph">
      <rect x={obj.x} y={obj.y} width={obj.w} height={obj.h} rx={16} className={selected ? "bd-card sel" : "bd-card"} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} />
      <clipPath id={clip}><rect x={box.x} y={box.y} width={box.w} height={box.h} /></clipPath>
      <g pointerEvents="none">
        {ticks(v.xMin, v.xMax).map((t) => <line key={`gx${t}`} x1={mapX(t, v, box)} x2={mapX(t, v, box)} y1={box.y} y2={box.y + box.h} className="bd-grid" />)}
        {ticks(v.yMin, v.yMax, 8).map((t) => <line key={`gy${t}`} x1={box.x} x2={box.x + box.w} y1={mapY(t, v, box)} y2={mapY(t, v, box)} className="bd-grid" />)}
        {v.yMin < 0 && v.yMax > 0 && <line x1={box.x} x2={box.x + box.w} y1={mapY(0, v, box)} y2={mapY(0, v, box)} className="bd-axis" />}
        {v.xMin < 0 && v.xMax > 0 && <line x1={mapX(0, v, box)} x2={mapX(0, v, box)} y1={box.y} y2={box.y + box.h} className="bd-axis" />}
        {ticks(v.xMin, v.xMax).filter((t) => t !== 0).map((t) => (
          <text key={`tx${t}`} x={mapX(t, v, box)} y={Math.min(box.y + box.h - 4, Math.max(box.y + 14, mapY(0, v, box) + 18))} className="bd-tick" textAnchor="middle">{vn(t)}</text>
        ))}
        {ticks(v.yMin, v.yMax, 8).filter((t) => t !== 0).map((t) => (
          <text key={`ty${t}`} x={Math.max(box.x + 22, Math.min(box.x + box.w - 4, mapX(0, v, box) - 8))} y={mapY(t, v, box) + 4} className="bd-tick" textAnchor="end">{vn(t)}</text>
        ))}
        <g clipPath={`url(#${clip})`}>
          {compiled.map((c, i) => (c.ok ? <path key={i} className="bd-curve" d={samplePath((x) => c.f(x, obj.params), v, box)} stroke={obj.exprs[i]!.color} /> : null))}
        </g>
      </g>
      <foreignObject x={obj.x + 24} y={obj.y + 22} width={obj.w - 48} height={40 * obj.exprs.length} pointerEvents="none">
        <div className="bd-legend">
          {obj.exprs.map((e, i) => (
            <div key={i}><span className="bd-cdot" style={{ background: e.color }} /><MathText value={`$${e.latex}$`} /></div>
          ))}
        </div>
      </foreignObject>
      {params.length > 0 && (
        <foreignObject x={obj.x} y={obj.y + obj.h + 8} width={obj.w} height={56}>
          <div className="bd-sliders">
            {params.map((p) => (
              <label key={p} className="bd-sl">
                <i>{p}</i>
                <input type="range" min={-5} max={5} step={0.1} value={obj.params[p] ?? 1} onPointerDown={(e) => { e.stopPropagation(); slSnap.current = true; }} onFocus={() => { slSnap.current = true; }} onPointerUp={() => { slSnap.current = false; }} onBlur={() => { slSnap.current = false; }} onChange={(e) => { if (slSnap.current) { b.snapshot(); slSnap.current = false; } b.updateObj(obj.id, { params: { ...obj.params, [p]: Number(e.target.value) } }, true); }} data-testid={`bd-sl-${p}`} />
                <output>{vn(obj.params[p] ?? 1)}</output>
              </label>
            ))}
          </div>
        </foreignObject>
      )}
      {selected && (
        <foreignObject x={obj.x + obj.w - 156} y={Math.max(0, obj.y - 50)} width={156} height={46}>
          <div className="bd-mini">
            <button onClick={onEdit} title="Sửa hàm" data-testid="bd-graph-edit"><Icon name="pen" /></button>
            <button onClick={refit} title="Căn khung"><Icon name="max" /></button>
            <button onClick={() => b.removeObjs([obj.id])} title="Xoá"><Icon name="trash" /></button>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

type DialogProps = { initial?: GraphObj; onCancel: () => void; onDone: (exprs: string[], xRange: [number, number]) => void };

export function GraphDialog({ initial, onCancel, onDone }: DialogProps) {
  const [rows, setRows] = useState(() => (initial?.exprs.map((e, i) => ({ key: i, latex: e.latex })) ?? [{ key: 0, latex: "" }]));
  const [xMin, setXMin] = useState(initial?.view.xMin ?? -5);
  const [xMax, setXMax] = useState(initial?.view.xMax ?? 5);
  const [errs, setErrs] = useState<Record<number, string>>({});

  const submit = () => {
    const filled = rows.filter((r) => r.latex.trim());
    if (!filled.length) {
      setErrs({ [rows[0]!.key]: "Nhập hàm số, vd y = x^2 − 3" });
      return;
    }
    const e: Record<number, string> = {};
    for (const r of filled) {
      const c = compileExpr(r.latex);
      if (!c.ok) e[r.key] = c.error;
    }
    if (!(xMax > xMin)) e[rows[0]!.key] = "Khoảng x không hợp lệ";
    setErrs(e);
    if (Object.keys(e).length) return;
    onDone(filled.map((r) => r.latex.trim()), [xMin, xMax]);
  };

  return (
    <div className="bd-modal" role="dialog">
      <div className="bd-dlg" data-testid="bd-graph-dlg">
        <div className="bd-dlg-hd"><Icon name="graph" />Đồ thị hàm số</div>
        {rows.map((r, i) => (
          <div className="bd-expr" key={r.key}>
            <span className="bd-cdot" style={{ background: CURVE_COLORS[i % CURVE_COLORS.length] }} />
            <div className="bd-expr-f">
              <MathField value={r.latex} autoFocus={i === rows.length - 1} onChange={(v) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, latex: v } : x)))} onEnter={submit} testId={`bd-expr-${i}`} />
            </div>
            <VoiceButton onLatex={(l) => setRows((rs) => rs.map((x) => (x.key === r.key ? { key: Date.now(), latex: l } : x)))} />
            {rows.length > 1 && <button className="xbtn" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Bỏ hàm"><Icon name="x" size={16} /></button>}
            {errs[r.key] && <div className="bd-dlg-err">{errs[r.key]}</div>}
          </div>
        ))}
        {rows.length < 6 && (
          <button className="bd-link" onClick={() => setRows((rs) => [...rs, { key: Date.now(), latex: "" }])}><Icon name="plus" size={16} />Thêm hàm</button>
        )}
        <div className="bd-range">x từ <input type="number" value={xMin} onChange={(e) => setXMin(Number(e.target.value))} /> đến <input type="number" value={xMax} onChange={(e) => setXMax(Number(e.target.value))} /></div>
        <div className="bd-dlg-ft">
          <button className="bd-btn" onClick={onCancel}>Huỷ</button>
          <button className="bd-btn pri" onClick={submit} data-testid="bd-graph-ok">Vẽ</button>
        </div>
      </div>
    </div>
  );
}
