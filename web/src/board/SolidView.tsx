// web/src/board/SolidView.tsx
import { type PointerEvent, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { Tool, ToBoard } from "./BoardPage";
import type { SolidObj } from "./doc";
import { fmtDeg, nextPointName, pickEdgePoint, pickPoint, SOLID_ORDER, SOLIDS, type SolidKind, solidScene } from "./solids";
import type { BoardApi } from "./useBoard";

type Mode = "rotate" | "point" | "cut" | "angle";
const MODES: { m: Mode; icon: string; label: string }[] = [
  { m: "rotate", icon: "rotate", label: "Xoay" },
  { m: "point", icon: "target", label: "Điểm" },
  { m: "cut", icon: "cut", label: "Cắt" },
  { m: "angle", icon: "angle", label: "Đo góc" },
];
type Tri = [string, string, string];
const pts = (a: [number, number][]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

type Props = { obj: SolidObj; tool: Tool; selected: boolean; onSelect: () => void; b: BoardApi; toBoard: ToBoard };

export function SolidView({ obj, tool, selected, onSelect, b, toBoard }: Props) {
  const [mode, setMode] = useState<Mode>("rotate");
  const [picks, setPicks] = useState<string[]>([]);
  const drag = useRef<{ kind: "rot" | "move"; sx: number; sy: number; a: number; c: number } | null>(null);
  const sc = solidScene(obj);

  const down = (e: PointerEvent<SVGGElement>) => {
    if ((e.target as Element).closest(".bd-tbw")) return;
    e.stopPropagation();
    onSelect();
    if (tool !== "pointer") return;
    const [x, y] = toBoard(e);
    if (mode === "rotate") {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: "rot", sx: x, sy: y, a: obj.th, c: obj.ph };
      b.snapshot();
      return;
    }
    if (mode === "point") {
      const ep = pickEdgePoint(obj, x, y);
      if (ep) b.updateObj(obj.id, { points: [...obj.points, { name: nextPointName(obj), ...ep }] });
      return;
    }
    const name = pickPoint(obj, x, y);
    if (!name) return;
    const next = picks.includes(name) ? picks : [...picks, name];
    if (next.length === 3) {
      b.updateObj(obj.id, mode === "cut" ? { section: next as Tri } : { angle: next as Tri });
      setPicks([]);
    } else setPicks(next);
  };
  const move = (e: PointerEvent<Element>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toBoard(e);
    if (d.kind === "rot") b.updateObj(obj.id, { th: d.a + (x - d.sx) * 0.01, ph: Math.max(-0.2, Math.min(1.3, d.c + (y - d.sy) * 0.006)) }, true);
    else b.updateObj(obj.id, { cx: Math.max(40, Math.min(1240, d.a + x - d.sx)), cy: Math.max(40, Math.min(680, d.c + y - d.sy)) }, true);
  };
  const up = () => {
    drag.current = null;
  };
  const startMove = (e: PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toBoard(e);
    drag.current = { kind: "move", sx: x, sy: y, a: obj.cx, c: obj.cy };
    b.snapshot();
  };

  let info = "";
  if ((mode === "cut" || mode === "angle") && selected) info = `Chọn điểm ${picks.length + 1}/3${picks.length ? `: ${picks.join(", ")}` : ""}`;
  else if (mode === "point" && selected) info = "Bấm lên cạnh để lấy điểm (chia 1/4, 1/3, 1/2…)";
  else if (sc.section && obj.angle && sc.angle) info = `Thiết diện: ${sc.section.name} · Góc ${obj.angle.join("")}: ${fmtDeg(sc.angle.value)}`;
  else if (sc.section) info = `Thiết diện: ${sc.section.name}`;
  else if (obj.angle && sc.angle) info = `Góc ${obj.angle.join("")} = ${fmtDeg(sc.angle.value)}`;
  else if (obj.section) info = "3 điểm thẳng hàng — chọn lại";

  return (
    <g className="bd-obj" data-testid="bd-solid" onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      {sc.faces.map((f, i) => <polygon key={`f${i}`} points={pts(f)} className="bd-face" />)}
      {sc.section && <polygon points={pts(sc.section.pts)} className="bd-sec" />}
      {sc.edges.map((e, i) => <line key={`e${i}`} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} className={e.hidden ? "bd-edge hid" : "bd-edge"} />)}
      {sc.angle && (
        <>
          <polyline points={pts(sc.angle.arc)} className="bd-arc" />
          <text x={sc.angle.x} y={sc.angle.y} className="bd-alabel" textAnchor="middle" dominantBaseline="middle">{fmtDeg(sc.angle.value)}</text>
        </>
      )}
      {sc.labels.map((l) => (
        <g key={l.name} data-pt={l.name}>
          <circle cx={l.px} cy={l.py} r={16} className={picks.includes(l.name) ? "bd-hit on" : "bd-hit"} />
          <circle cx={l.px} cy={l.py} r={l.vertex ? 3.5 : 6} className={l.vertex ? "bd-v" : "bd-p"} />
          <text x={l.x} y={l.y} className={l.vertex ? "bd-vl" : "bd-pl"} textAnchor="middle" dominantBaseline="middle">{l.name}</text>
        </g>
      ))}
      {(selected || info) && (
        <foreignObject x={obj.cx - 230} y={obj.cy + obj.size * 0.9} width={460} height={110}>
          <div className="bd-tbw">
            {info && <div className="bd-info" data-testid="bd-info">{info}</div>}
            {selected && (
              <div className="bd-tb">
                {MODES.map(({ m, icon, label }) => (
                  <button key={m} className={mode === m ? "on" : ""} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setMode(m); setPicks([]); }} data-testid={`bd-m-${m}`}>
                    <Icon name={icon} />{label}
                  </button>
                ))}
                <button onPointerDown={startMove} onPointerMove={move} onPointerUp={up} title="Kéo để dời hình"><Icon name="move" />Dời</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.updateObj(obj.id, { points: [], section: null, angle: null })} title="Xoá điểm, thiết diện, góc"><Icon name="eraser" />Xoá dựng</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.removeObjs([obj.id])} title="Xoá hình"><Icon name="trash" /></button>
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/** Thư viện hình không gian (kiểu thư viện hình của draw.io). */
export function SolidPicker({ onPick, onClose }: { onPick: (k: SolidKind) => void; onClose: () => void }) {
  return (
    <div className="bd-modal" onClick={onClose}>
      <div className="bd-dlg" onClick={(e) => e.stopPropagation()} data-testid="bd-solid-picker">
        <div className="bd-dlg-hd"><Icon name="box" />Thư viện hình</div>
        <div className="bd-lib">
          {SOLID_ORDER.map((k) => {
            const sc = solidScene({ kind: k, cx: 60, cy: 58, size: 52, th: 0.62, ph: 0.42, points: [], section: null, angle: null });
            return (
              <button key={k} className="bd-lib-item" onClick={() => onPick(k)} data-testid={`bd-lib-${k}`}>
                <svg viewBox="0 0 120 116" width={120} height={116}>
                  {sc.edges.map((e, i) => <line key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke={e.hidden ? "#b4b9c9" : "#1b2033"} strokeDasharray={e.hidden ? "4 4" : undefined} strokeWidth={1.6} />)}
                </svg>
                <b>{SOLIDS[k].label}</b>
                <small>{SOLIDS[k].title}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
