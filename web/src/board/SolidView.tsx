// web/src/board/SolidView.tsx — hình không gian trên bảng giảng: vẽ theo mô hình dựng hình (web/src/geometry3d), dựng thêm bằng chuột.
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { download } from "../diagram/export";
import { addAngle, addDistLine, addDistPlane, addEqual, addLinePlane, addPoint, addRight, addSection, addSegment, nextName, pickablePairs, pickNamed, pickOnSegment } from "../geometry3d/edit";
import { figureScene, printSvg, svgToPngBlob } from "../geometry3d/figure";
import { prettyName } from "../geometry3d/fmt";
import { FigureBuilder } from "../geometry3d/FigureBuilder";
import { defaultMode } from "../geometry3d/presets";
import { clampView, SGK_VIEW } from "../geometry3d/render";
import type { ConstructionSpec, Pair, Triple } from "../geometry3d/spec";
import { sceneSvgBody } from "../geometry3d/svg";
import { Icon } from "../Icon";
import type { Tool, ToBoard } from "./BoardPage";
import type { SolidObj } from "./doc";
import type { BoardApi } from "./useBoard";

type Mode = "rotate" | "point" | "line" | "cut" | "angle" | "perpPlane" | "perpLine" | "linePlane" | "right" | "equal";
const MODES: { m: Mode; label: string; need: number; hint: string }[] = [
  { m: "rotate", label: "Xoay", need: 0, hint: "Kéo để xoay (ngang) và nghiêng (dọc)" },
  { m: "point", label: "Điểm", need: 0, hint: "Bấm lên cạnh để lấy điểm: trung điểm, chia 1/3, 1/4…" },
  { m: "line", label: "Nối", need: 2, hint: "Chọn 2 điểm để nối đoạn" },
  { m: "cut", label: "Thiết diện", need: 3, hint: "Chọn 3 điểm của mặt phẳng cắt" },
  { m: "angle", label: "Góc", need: 3, hint: "Chọn 3 điểm: điểm đầu, đỉnh góc, điểm cuối" },
  { m: "perpPlane", label: "⊥ mặt", need: 4, hint: "Chọn điểm rồi 3 điểm của mặt phẳng: dựng hình chiếu + khoảng cách" },
  { m: "perpLine", label: "⊥ đường", need: 3, hint: "Chọn điểm rồi 2 điểm của đường thẳng: dựng chân đường vuông góc" },
  { m: "linePlane", label: "Góc đường–mặt", need: 5, hint: "Chọn 2 điểm của đường rồi 3 điểm của mặt phẳng" },
  { m: "right", label: "∟", need: 3, hint: "Ký hiệu góc vuông: điểm, đỉnh góc vuông, điểm" },
  { m: "equal", label: "= cạnh", need: 4, hint: "Gạch cạnh bằng nhau: chọn 2 đầu mút đoạn thứ nhất rồi đoạn thứ hai" },
];

type Props = { obj: SolidObj; tool: Tool; selected: boolean; onSelect: () => void; b: BoardApi; toBoard: ToBoard };

export function SolidView({ obj, tool, selected, onSelect, b, toBoard }: Props) {
  const [mode, setMode] = useState<Mode>("rotate");
  const [picks, setPicks] = useState<string[]>([]);
  const drag = useRef<{ kind: "rot" | "move"; sx: number; sy: number; a: number; c: number; moved: boolean } | null>(null);
  const fig = useMemo(() => figureScene(obj), [obj]);
  const { spec, solved, view, scene: sc } = fig;
  const body = useMemo(() => sceneSvgBody(sc, obj.print ? "print" : "board"), [sc, obj.print]);
  useEffect(() => {
    if (!selected) setPicks([]);
  }, [selected]);

  /** Mọi thay đổi ghi spec + góc nhìn theo nghĩa mới (nâng cấp hình cũ khi sửa lần đầu). */
  const commit = (next: ConstructionSpec, live = false) => b.updateObj(obj.id, { spec: next, th: view.th, ph: view.ph, mode: view.mode, points: [], section: null, angle: null }, live);
  const apply = (sel: string[]) => {
    const need = MODES.find((x) => x.m === mode)!.need;
    if (sel.length < need) return setPicks(sel);
    setPicks([]);
    const [p0, p1, p2, p3, p4] = sel as [string, string, string, string, string];
    if (mode === "line") commit(addSegment(spec, p0, p1));
    else if (mode === "cut") commit(addSection(spec, [p0, p1, p2]));
    else if (mode === "angle") commit(addAngle(spec, [p0, p1, p2]));
    else if (mode === "right") commit(addRight(spec, [p0, p1, p2]));
    else if (mode === "perpPlane") commit(addDistPlane(spec, p0, [p1, p2, p3]));
    else if (mode === "perpLine") commit(addDistLine(spec, p0, [p1, p2]));
    else if (mode === "linePlane") commit(addLinePlane(spec, [p0, p1], [p2, p3, p4] as Triple));
    else if (mode === "equal") commit(addEqual(spec, [p0, p1] as Pair, [p2, p3] as Pair));
  };

  const down = (e: PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    if ((e.target as Element).closest(".bd-tbw")) return;
    onSelect();
    if (tool !== "pointer" || !selected) return;
    const [x, y] = toBoard(e);
    if (mode === "rotate") {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: "rot", sx: x, sy: y, a: view.th, c: view.ph, moved: false };
      return;
    }
    if (mode === "point") {
      const hit = pickOnSegment(sc, pickablePairs(solved), x, y);
      if (hit) commit(addPoint(spec, nextName(spec, solved), hit.from, hit.to, hit.t));
      return;
    }
    const name = pickNamed(sc, x, y);
    if (name && (mode === "equal" || mode === "linePlane" || !picks.includes(name))) apply([...picks, name]);
  };
  const move = (e: PointerEvent<Element>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toBoard(e);
    if (!d.moved) {
      d.moved = true;
      b.snapshot();
    }
    if (d.kind === "rot") {
      const v = clampView({ mode: view.mode, th: d.a + (x - d.sx) * 0.01, ph: d.c + (y - d.sy) * (view.mode === "sgk" ? 0.003 : 0.006) });
      b.updateObj(obj.id, { spec, th: v.th, ph: v.ph, mode: v.mode, points: [], section: null, angle: null }, true);
    } else b.updateObj(obj.id, { cx: Math.max(40, Math.min(1240, d.a + x - d.sx)), cy: Math.max(40, Math.min(680, d.c + y - d.sy)) }, true);
  };
  const up = () => {
    drag.current = null;
  };
  const startMove = (e: PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toBoard(e);
    drag.current = { kind: "move", sx: x, sy: y, a: obj.cx, c: obj.cy, moved: false };
  };
  const exportAs = async (kind: "svg" | "png") => {
    const { svg, w, h } = printSvg(spec, view);
    const name = (spec.title ?? "hinh-khong-gian").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "hinh";
    download(`${name}.${kind}`, kind === "svg" ? new Blob([svg], { type: "image/svg+xml" }) : await svgToPngBlob(svg, w, h, 3));
  };

  const cur = MODES.find((x) => x.m === mode)!;
  const lines: string[] = [];
  if (selected && mode !== "rotate") lines.push(picks.length ? `${cur.hint} — đã chọn: ${picks.map(prettyName).join(", ")}` : cur.hint);
  lines.push(...sc.info, ...sc.errors);
  const [x0, y0, x1, y1] = sc.bbox;
  const tbY = Math.min(720 - 150, y1 + 14);
  const tbX = Math.max(0, Math.min(1280 - 600, (x0 + x1) / 2 - 300));

  return (
    <g className="bd-obj" data-testid="bd-solid" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up}>
      {obj.print ? <rect x={x0 - 16} y={y0 - 16} width={x1 - x0 + 32} height={y1 - y0 + 32} rx={10} fill="#fff" /> : <rect x={x0 - 10} y={y0 - 10} width={x1 - x0 + 20} height={y1 - y0 + 20} fill="transparent" />}
      <g dangerouslySetInnerHTML={{ __html: body }} />
      {picks.map((n) => {
        const p = sc.points.get(n);
        return p ? <circle key={n} cx={p[0]} cy={p[1]} r={11} fill="rgba(143,162,255,.35)" stroke="#8fa2ff" strokeWidth={1.5} pointerEvents="none" /> : null;
      })}
      {selected && <rect x={x0 - 12} y={y0 - 12} width={x1 - x0 + 24} height={y1 - y0 + 24} rx={12} fill="none" stroke="#8fa2ff" strokeDasharray="6 5" strokeWidth={1.5} pointerEvents="none" />}
      {(selected || lines.length > 0) && (
        <foreignObject x={tbX} y={tbY} width={600} height={150}>
          <div className="bd-tbw">
            {lines.length > 0 && <div className="bd-info" data-testid="bd-info">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>}
            {selected && (
              <div className="bd-tb wrap">
                {MODES.map(({ m, label, hint }) => (
                  <button key={m} className={mode === m ? "on" : ""} title={hint} onPointerDown={(e) => e.stopPropagation()} onClick={() => (setMode(m), setPicks([]))} data-testid={`bd-m-${m}`}>{label}</button>
                ))}
                <span className="bd-tb-sep" />
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => { const v = SGK_VIEW[defaultMode(spec)]; b.updateObj(obj.id, { spec, th: v.th, ph: v.ph, mode: v.mode, points: [], section: null, angle: null }); }} title="Đưa về góc nhìn như hình trong SGK" data-testid="bd-sgk">Về góc SGK</button>
                <button className={obj.print ? "on" : ""} onPointerDown={(e) => e.stopPropagation()} onClick={() => b.updateObj(obj.id, { print: !obj.print })} title="Nét đen trên nền trắng như đề in" data-testid="bd-print">In đề</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => void exportAs("svg")} title="Tải hình đen trắng dạng SVG">SVG</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => void exportAs("png")} title="Tải hình đen trắng dạng PNG" data-testid="bd-solid-png">PNG</button>
                <button onPointerDown={startMove} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={up} title="Kéo để dời hình"><Icon name="move" />Dời</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.updateObj(obj.id, { size: Math.min(600, obj.size * 1.15) })} title="Phóng to">＋</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.updateObj(obj.id, { size: Math.max(60, obj.size / 1.15) })} title="Thu nhỏ">－</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.removeObjs([obj.id])} title="Xoá hình"><Icon name="trash" /></button>
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/** Thư viện hình + AI dựng hình từ đề bài → thêm vào bảng. */
export function SolidPicker({ onPick, onClose }: { onPick: (kind: string, spec: ConstructionSpec, view: { mode: "sgk" | "ortho"; th: number; ph: number }) => void; onClose: () => void }) {
  return (
    <div className="fg-modal" onClick={onClose}>
      <div className="fg-dlg" onClick={(e) => e.stopPropagation()} data-testid="bd-solid-picker">
        <FigureBuilder doneLabel="Đưa lên bảng" onCancel={onClose} onDone={(r) => onPick(r.kind, r.spec, r.view)} />
      </div>
    </div>
  );
}
