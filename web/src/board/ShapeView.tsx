// web/src/board/ShapeView.tsx — hình phẳng và ô chữ/công thức trên bảng
import { type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import type { Tool, ToBoard } from "./BoardPage";
import { arrowHead, moveObj, type ShapeObj, shapeD, type TextObj, textBox } from "./doc";
import type { BoardApi } from "./useBoard";

type Props<T> = { obj: T; tool: Tool; selected: boolean; onSelect: () => void; b: BoardApi; toBoard: ToBoard };

function useDrag(obj: ShapeObj | TextObj, tool: Tool, onSelect: () => void, b: BoardApi, toBoard: ToBoard) {
  const d = useRef<{ sx: number; sy: number; snap: ShapeObj | TextObj; moved: boolean } | null>(null);
  return {
    onPointerDown: (e: PointerEvent<SVGElement>) => {
      e.stopPropagation();
      onSelect();
      if (tool !== "pointer") return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const [sx, sy] = toBoard(e);
      d.current = { sx, sy, snap: obj, moved: false };
    },
    onPointerMove: (e: PointerEvent<SVGElement>) => {
      const s = d.current;
      if (!s) return;
      const [x, y] = toBoard(e);
      if (!s.moved) {
        if (Math.hypot(x - s.sx, y - s.sy) < 3) return;
        s.moved = true;
        b.snapshot();
      }
      b.updateObj(obj.id, moveObj(s.snap, x - s.sx, y - s.sy), true);
    },
    onPointerUp: () => {
      d.current = null;
    },
  };
}

export function ShapeView({ obj, tool, selected, onSelect, b, toBoard }: Props<ShapeObj>) {
  const h = useDrag(obj, tool, onSelect, b, toBoard);
  const d = shapeD(obj);
  const line = obj.kind === "line" || obj.kind === "arrow";
  return (
    <g className="bd-obj" data-testid={`bd-shape-${obj.kind}`} {...h} onLostPointerCapture={h.onPointerUp}>
      <path d={d} fill="none" stroke="transparent" strokeWidth={Math.max(18, obj.width + 12)} pointerEvents="stroke" />
      <path d={d} fill={obj.fill && !line ? obj.color : "none"} fillOpacity={0.22} stroke={obj.color} strokeWidth={obj.width} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
      {obj.kind === "arrow" && <path d={arrowHead(obj)} fill="none" stroke={obj.color} strokeWidth={obj.width} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
      {selected && <path d={d} fill="none" stroke="#8fa2ff" strokeWidth={1.5} strokeDasharray="6 4" transform="translate(0 0)" pointerEvents="none" className="bd-selpath" />}
    </g>
  );
}

export function TextView({ obj, tool, selected, onSelect, onEdit, b, toBoard }: Props<TextObj> & { onEdit: () => void }) {
  const h = useDrag(obj, tool, onSelect, b, toBoard);
  const { w, h: bh } = textBox(obj);
  const inner = useRef<HTMLDivElement>(null);
  // Đo kích thước thật của ô sau khi MathLive dựng xong (đơn vị bảng = px CSS bên trong foreignObject) rồi lưu vào đối tượng.
  const bRef = useRef(b);
  bRef.current = b;
  const measure = () => {
    const el = inner.current;
    if (!el) return;
    const w2 = Math.ceil(el.scrollWidth) + 2, h2 = Math.ceil(el.scrollHeight) + 2;
    if (w2 > 1 && h2 > 1 && (Math.abs(w2 - (obj.w ?? 0)) >= 1 || Math.abs(h2 - (obj.h ?? 0)) >= 1)) bRef.current.updateObj(obj.id, { w: w2, h: h2 }, true);
  };
  useLayoutEffect(measure, [obj.text, obj.size, obj.w, obj.h]);
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [obj.text, obj.size]);
  return (
    <g className="bd-obj" data-testid="bd-text" {...h} onLostPointerCapture={h.onPointerUp} onDoubleClick={onEdit}>
      <rect x={obj.x} y={obj.y} width={w} height={bh} fill="transparent" stroke={selected ? "#8fa2ff" : "none"} strokeDasharray="6 4" rx={6} />
      <foreignObject x={obj.x} y={obj.y} width={w} height={bh} style={{ overflow: "visible" }} pointerEvents="none" data-plain={obj.text} data-color={obj.color} data-size={obj.size}>
        <div ref={inner} className="bd-text" data-testid="bd-text-inner" style={{ color: obj.color, fontSize: obj.size, width: "max-content" }}>
          {obj.text.split("\n").map((l, i) => (
            <div key={i}><MathText value={l} /></div>
          ))}
        </div>
      </foreignObject>
    </g>
  );
}

export function TextDialog({ initial, onCancel, onDone }: { initial?: string; onCancel: () => void; onDone: (text: string) => void }) {
  const [v, setV] = useState(initial ?? "");
  const ok = v.trim().length > 0 && v.length <= 500;
  return (
    <div className="bd-modal" role="dialog">
      <div className="bd-dlg" data-testid="bd-text-dlg">
        <div className="bd-dlg-hd"><Icon name="pen" />Ô chữ / công thức</div>
        <textarea className="inp" rows={3} autoFocus value={v} placeholder="Gõ chữ; công thức đặt trong $…$, ví dụ $x^2+1=0$" onChange={(e) => setV(e.target.value)} data-testid="bd-text-input" />
        <div className="bd-text-prev">{v.split("\n").map((l, i) => <div key={i}><MathText value={l} /></div>)}</div>
        <div className="bd-dlg-ft">
          <button className="bd-btn" onClick={onCancel}>Huỷ</button>
          <button className="bd-btn pri" disabled={!ok} onClick={() => onDone(v.trim())} data-testid="bd-text-ok">Xong</button>
        </div>
      </div>
    </div>
  );
}
