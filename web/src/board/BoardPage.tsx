// web/src/board/BoardPage.tsx
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { type BankQuestion, errText, gradeLabel } from "../api";
import { Icon } from "../Icon";
import "./board.css";
import { download } from "../diagram/export";
import { type BoardObj, type GraphObj, graphFromExprs, newId, newSolid, PALETTE, SHAPE_KINDS, type ShapeKind, type ShapeObj, type Stroke, type TextObj } from "./doc";
import { boardPng } from "./exportPng";
import { ShapeView, TextDialog, TextView } from "./ShapeView";
import { GraphDialog, GraphView } from "./GraphView";
import { hitStroke, strokePath } from "./ink";
import { inkToLatex, strokesBox } from "./inkImage";
import { recognizeStroke } from "./recognize";
import { Projector } from "./Projector";
import { SolidPicker, SolidView } from "./SolidView";
import { SuggestPanel } from "./SuggestPanel";
import { useBoard } from "./useBoard";

export type Tool = "pointer" | "pen" | "eraser" | ShapeKind | "text" | "formula";
const isShapeTool = (t: Tool): t is ShapeKind => (SHAPE_KINDS as readonly string[]).includes(t);
const SHAPE_TITLE: Record<ShapeKind, string> = { line: "Đoạn thẳng (L)", arrow: "Mũi tên (A)", rect: "Hình chữ nhật (R)", triangle: "Tam giác", circle: "Đường tròn (O)", polygon: "Đa giác (bấm từng đỉnh, Enter để đóng)" };
const SHAPE_ICON: Record<ShapeKind, string> = { line: "M5 19L19 5", arrow: "M5 19L19 5M10 5H19V14", rect: "M4 6H20V18H4Z", triangle: "M12 5L20 19H4Z", circle: "M12 4A8 8 0 1 0 12.01 4Z", polygon: "M6 7L17 5L20 14L11 19L4 13Z" };
export const W = 1280;
export const H = 720;
export type ToBoard = (e: { clientX: number; clientY: number }) => [number, number];

const typing = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "MATH-FIELD" || (a as HTMLElement).isContentEditable);
};

export function BoardPage() {
  const { id = "" } = useParams();
  const b = useBoard(id);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PALETTE[0]!);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<number[] | null>(null);
  const [graphDlg, setGraphDlg] = useState<{ edit?: GraphObj } | null>(null);
  const [picker, setPicker] = useState(false);
  const [shapeDraft, setShapeDraft] = useState<ShapeObj | null>(null);
  const [poly, setPoly] = useState<number[] | null>(null);
  const [hover, setHover] = useState<[number, number] | null>(null);
  const [fill, setFill] = useState(false);
  const [textDlg, setTextDlg] = useState<{ edit?: TextObj; x: number; y: number } | null>(null);
  const [suggest, setSuggest] = useState(false);
  const [projected, setProjected] = useState<BankQuestion | null>(null);
  const [beautify, setBeautify] = useState(() => localStorage.getItem("bd-beautify") === "1");
  const [frame, setFrame] = useState<[number, number, number, number] | null>(null);
  const [reading, setReading] = useState(false);
  const erasing = useRef<{ snapped: boolean } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const toBoard: ToBoard = (e) => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void b.save();
      } else if (typing()) return;
      else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        b.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        b.removeObjs([selected]);
        setSelected(null);
      } else if (mod || e.altKey) return;
      else if (e.key === "Enter" && poly) finishPoly();
      else if (e.key === "Escape" && (poly || shapeDraft)) (setPoly(null), setShapeDraft(null));
      else if (e.key === "l") setTool("line");
      else if (e.key === "a") setTool("arrow");
      else if (e.key === "r") setTool("rect");
      else if (e.key === "o") setTool("circle");
      else if (e.key === "t") setTool("text");
      else if (e.key === "v") setTool("pointer");
      else if (e.key === "p") setTool("pen");
      else if (e.key === "e") setTool("eraser");
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  useEffect(() => setSelected(null), [b.page]);
  useEffect(() => {
    if (tool !== "polygon") setPoly(null);
  }, [tool]);

  if (!b.board || !b.doc || !b.current) return <div className="center">{b.error ?? "…"}</div>;
  const objs = b.current.objects;

  const erase = (x: number, y: number) => {
    const hits = objs.filter((o): o is Stroke => o.type === "stroke" && hitStroke(o.pts, x, y, 14)).map((o) => o.id);
    if (!hits.length) return;
    if (erasing.current && !erasing.current.snapped) {
      b.snapshot();
      erasing.current.snapped = true;
    }
    b.removeObjs(hits, true);
  };
  const mkShape = (kind: ShapeKind, pts: number[]): ShapeObj => ({ type: "shape", id: newId(), kind, color, width: 3.5, fill, pts: pts.map((v) => Math.round(v * 10) / 10) });
  function finishPoly() {
    if (poly && poly.length >= 6) {
      const o = mkShape("polygon", poly);
      b.addObj(o);
      setSelected(o.id);
    }
    setPoly(null);
    setHover(null);
  }
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || !e.isPrimary) return;
    const [x, y] = toBoard(e);
    if (tool === "pen") {
      svgRef.current?.setPointerCapture(e.pointerId);
      setDraft([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    } else if (tool === "eraser") {
      svgRef.current?.setPointerCapture(e.pointerId);
      erasing.current = { snapped: false };
      erase(x, y);
    } else if (tool === "polygon") {
      const p: [number, number] = [Math.round(x), Math.round(y)];
      if (poly && poly.length >= 6 && Math.hypot(p[0] - poly[0]!, p[1] - poly[1]!) < 14) return finishPoly();
      const lx = poly?.[poly.length - 2], ly = poly?.[poly.length - 1];
      if (lx !== undefined && Math.hypot(p[0] - lx, p[1] - ly!) < 4) return;
      if ((poly?.length ?? 0) < 48) setPoly([...(poly ?? []), ...p]);
    } else if (isShapeTool(tool)) {
      svgRef.current?.setPointerCapture(e.pointerId);
      setShapeDraft(mkShape(tool, [x, y, x, y]));
    } else if (tool === "formula") {
      svgRef.current?.setPointerCapture(e.pointerId);
      setFrame([x, y, x, y]);
    } else if (tool === "text") setTextDlg({ x: Math.round(x), y: Math.round(y) });
    else setSelected(null);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = toBoard(e);
    if (draft) {
      const lx = draft[draft.length - 2]!, ly = draft[draft.length - 1]!;
      if (draft.length < 4000 && Math.hypot(x - lx, y - ly) > 1.5) setDraft([...draft, Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    } else if (erasing.current) erase(x, y);
    else if (frame) setFrame([frame[0], frame[1], x, y]);
    else if (shapeDraft) setShapeDraft({ ...shapeDraft, pts: [shapeDraft.pts[0]!, shapeDraft.pts[1]!, x, y] });
    else if (poly) setHover([x, y]);
  };
  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    if (!e.isPrimary) return;
    if (draft) {
      const pts = draft.length >= 4 ? draft : [draft[0]!, draft[1]!, draft[0]! + 0.5, draft[1]!];
      const raw: Stroke = { type: "stroke", id: newId(), color, width: 4.5, pts };
      const rec = beautify ? recognizeStroke(pts) : null;
      if (rec) {
        const shape: ShapeObj = { type: "shape", id: newId(), kind: rec.kind, color, width: 3.5, fill: false, pts: rec.pts };
        b.addWithRaw(raw, shape);
        setSelected(shape.id);
      } else b.addObj(raw);
      setDraft(null);
    }
    if (frame) {
      const f = frame;
      setFrame(null);
      void readFormula(f);
    }
    if (shapeDraft) {
      const [x1, y1, x2, y2] = shapeDraft.pts as [number, number, number, number];
      if (Math.hypot(x2 - x1, y2 - y1) >= 8) {
        const o = mkShape(shapeDraft.kind, shapeDraft.pts);
        b.addObj(o);
        setSelected(o.id);
      }
      setShapeDraft(null);
    }
    erasing.current = null;
  };

  async function readFormula(f: [number, number, number, number]) {
    const [x1, x2] = [Math.min(f[0], f[2]), Math.max(f[0], f[2])];
    const [y1, y2] = [Math.min(f[1], f[3]), Math.max(f[1], f[3])];
    const picked = objs.filter((o): o is Stroke => {
      if (o.type !== "stroke") return false;
      const bx = strokesBox([o]);
      const cx = (bx.x1 + bx.x2) / 2, cy = (bx.y1 + bx.y2) / 2;
      return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
    });
    if (!picked.length) return b.setError("Khung chưa bao nét viết tay nào. Kéo khung quanh phần công thức đã viết.");
    setReading(true);
    try {
      const latex = await inkToLatex(picked);
      if (!latex) return b.setError("AI chưa đọc được công thức này, thầy cô viết rõ hơn hoặc chọn lại vùng.");
      const bx = strokesBox(picked);
      const o: TextObj = { type: "text", id: newId(), x: Math.round(bx.x1), y: Math.round(bx.y1), size: Math.max(28, Math.min(56, Math.round((bx.y2 - bx.y1) * 0.7))), color: picked[0]!.color, text: `$${latex}$` };
      b.replaceObjs(picked.map((p) => p.id), o);
      setSelected(o.id);
    } catch (e) {
      b.setError(errText(e));
    } finally {
      setReading(false);
    }
  }

  const rail = (icon: string, title: string, on: boolean, onClick: () => void, testId?: string) => (
    <button className={on ? "bd-rb on" : "bd-rb"} title={title} onClick={onClick} data-testid={testId}><Icon name={icon} /></button>
  );
  const n = b.doc.pages.length;
  const exportPng = async () => {
    if (!svgRef.current) return;
    try {
      const name = b.board!.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "bang-giang";
      download(`${name}-trang-${b.page + 1}.png`, await boardPng(svgRef.current, W, H));
    } catch (e) {
      b.setError(e instanceof Error ? e.message : "Không xuất được PNG");
    }
  };

  return (
    <div className="bd" ref={rootRef}>
      <aside className="bd-rail">
        <Link to="/bang-giang" className="bd-mark" title="Danh sách bài giảng"><Icon name="cap" /></Link>
        {rail("pointer", "Chọn (V)", tool === "pointer", () => setTool("pointer"), "t-pointer")}
        {rail("pen", "Bút (P)", tool === "pen", () => setTool("pen"), "t-pen")}
        {rail("eraser", "Tẩy (E)", tool === "eraser", () => setTool("eraser"), "t-eraser")}
        <div className="bd-sep" />
        {rail("graph", "Đồ thị hàm số", false, () => setGraphDlg({}), "t-graph")}
        {rail("box", "Hình không gian", picker, () => setPicker((p) => !p), "t-solid")}
        <div className="bd-sep" />
        {SHAPE_KINDS.map((k) => (
          <button key={k} className={tool === k ? "bd-rb sh on" : "bd-rb sh"} title={SHAPE_TITLE[k]} onClick={() => setTool(k)} data-testid={`t-${k}`}>
            <svg viewBox="0 0 24 24"><path d={SHAPE_ICON[k]} /></svg>
          </button>
        ))}
        <button className={fill ? "bd-rb sh on" : "bd-rb sh"} title="Tô nền hình" onClick={() => setFill((f) => !f)} data-testid="t-fill"><svg viewBox="0 0 24 24"><path d="M4 6H20V18H4Z" fill="currentColor" fillOpacity=".35" /></svg></button>
        <button className={beautify ? "bd-rb tx on" : "bd-rb tx"} title="Làm đẹp nét: tự đổi nét tay thành hình sạch (đường thẳng, mũi tên, tam giác, chữ nhật, tròn, đa giác)" onClick={() => setBeautify((v) => { localStorage.setItem("bd-beautify", v ? "0" : "1"); return !v; })} data-testid="t-beautify">✨</button>
        <button className={tool === "formula" ? "bd-rb tx on" : "bd-rb tx"} title="Viết tay → công thức: kéo khung quanh phần đã viết, AI đổi thành công thức" onClick={() => setTool("formula")} data-testid="t-formula">∑</button>
        <button className={tool === "text" ? "bd-rb tx on" : "bd-rb tx"} title="Ô chữ / công thức (T)" onClick={() => setTool("text")} data-testid="t-text">Aa</button>
        <div className="bd-sep" />
        {rail("spark", "Gợi ý bài liên quan", suggest, () => setSuggest((s) => !s), "t-suggest")}
        <div className="bd-swatches">
          {PALETTE.map((c) => (
            <button key={c} className={c === color && tool === "pen" ? "bd-sw on" : "bd-sw"} style={{ background: c }} aria-label="Màu bút" onClick={() => { setColor(c); setTool("pen"); }} />
          ))}
        </div>
      </aside>
      <section className="bd-main">
        <header className="bd-top">
          <span className="bd-title">{b.board.title}</span>
          <span className="bd-chip">{b.board.subject} · {gradeLabel(b.board.grade)}{b.board.topic ? ` · ${b.board.topic}` : ""}</span>
          <span className="bd-grow" />
          {b.error && <span className="bd-err" onClick={() => b.setError(null)}>{b.error}</span>}
          <span className={b.dirty ? "bd-state" : "bd-state ok"} data-testid="bd-state">{b.saving ? "Đang lưu…" : b.dirty ? "Chưa lưu" : "Đã lưu"}</span>
          <button className="bd-btn" onClick={() => void exportPng()} title="Xuất trang này ra PNG" data-testid="bd-png"><Icon name="down" />PNG</button>
          <button className="bd-btn" onClick={b.undo} title="Hoàn tác (Ctrl+Z)"><Icon name="undo" /></button>
          <button className="bd-btn pri" onClick={() => void b.save()} data-testid="bd-save"><Icon name="save" />Lưu</button>
          <button className="bd-btn" onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})} title="Toàn màn hình"><Icon name="max" /></button>
        </header>
        <div className="bd-wrap">
          <div className="bd-stage" data-testid="bd-stage">
            <svg ref={svgRef} className={`bd-svg bd-tool-${tool}`} viewBox={`0 0 ${W} ${H}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => poly && finishPoly()}>
              <defs>
                <pattern id="bd-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,.07)" /></pattern>
              </defs>
              <rect width={W} height={H} fill="url(#bd-dots)" />
              {objs.map((o) => renderObject(o))}
              {objs.map((o) => (o.type === "stroke" ? <path key={o.id} className="bd-ink" d={strokePath(o.pts, o.width)} fill={o.color} /> : null))}
              {draft && <path d={strokePath(draft, 4.5)} fill={color} />}
              {frame && <rect x={Math.min(frame[0], frame[2])} y={Math.min(frame[1], frame[3])} width={Math.abs(frame[2] - frame[0])} height={Math.abs(frame[3] - frame[1])} fill="rgba(143,162,255,.12)" stroke="#8fa2ff" strokeWidth={2} strokeDasharray="8 5" pointerEvents="none" />}
              {shapeDraft && <ShapeView obj={shapeDraft} tool="pen" selected={false} onSelect={() => {}} b={b} toBoard={toBoard} />}
              {poly && (
                <g pointerEvents="none">
                  <path d={`${poly.reduce((d, v, i) => (i % 2 ? `${d}${v} ` : `${d}${i ? "L" : "M"}${v} `), "")}${hover ? `L${hover[0]} ${hover[1]}` : ""}`} fill="none" stroke={color} strokeWidth={3.5} strokeDasharray="8 5" />
                  {poly.length >= 6 && <circle cx={poly[0]} cy={poly[1]} r={9} fill="none" stroke="#8fa2ff" strokeWidth={2} />}
                </g>
              )}
            </svg>
            {reading && <div className="bd-err" style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)" }} data-testid="bd-reading">AI đang đọc công thức viết tay…</div>}
            {projected && <Projector key={projected.id} q={projected} onClose={() => setProjected(null)} />}
          </div>
        </div>
        <footer className="bd-pages">
          <button className="bd-btn" disabled={b.page === 0} onClick={() => b.setPage(b.page - 1)} title="Trang trước"><Icon name="left" /></button>
          <span data-testid="bd-page">Trang {b.page + 1}/{n}</span>
          <button className="bd-btn" disabled={b.page >= n - 1} onClick={() => b.setPage(b.page + 1)} title="Trang sau"><Icon name="right" /></button>
          <button className="bd-btn" onClick={b.addPage} disabled={n >= 30} title="Thêm trang" data-testid="bd-add-page"><Icon name="plus" /></button>
          <button className="bd-btn" onClick={() => confirm("Xoá trang này?") && b.deletePage()} disabled={n <= 1} title="Xoá trang"><Icon name="trash" /></button>
        </footer>
      </section>
      {suggest && <SuggestPanel board={b.board} page={b.current} onProject={setProjected} onClose={() => setSuggest(false)} />}
      {graphDlg && (
        <GraphDialog
          initial={graphDlg.edit}
          onCancel={() => setGraphDlg(null)}
          onDone={(exprs, xr) => {
            if (graphDlg.edit) b.updateObj(graphDlg.edit.id, graphFromExprs(exprs, xr, graphDlg.edit));
            else {
              const g = graphFromExprs(exprs, xr);
              b.addObj(g);
              setSelected(g.id);
            }
            setTool("pointer");
            setGraphDlg(null);
          }}
        />
      )}
      {textDlg && (
        <TextDialog
          initial={textDlg.edit?.text}
          onCancel={() => setTextDlg(null)}
          onDone={(text) => {
            if (textDlg.edit) b.updateObj(textDlg.edit.id, { text });
            else {
              const o: TextObj = { type: "text", id: newId(), x: textDlg.x, y: textDlg.y, size: 32, color, text };
              b.addObj(o);
              setSelected(o.id);
              setTool("pointer");
            }
            setTextDlg(null);
          }}
        />
      )}
      {picker && (
        <SolidPicker
          onClose={() => setPicker(false)}
          onPick={(k, spec, view) => {
            const s = newSolid(k, spec, view);
            b.addObj(s);
            setSelected(s.id);
            setTool("pointer");
            setPicker(false);
          }}
        />
      )}
    </div>
  );

  function renderObject(o: BoardObj) {
    if (o.type === "graph")
      return <GraphView key={o.id} obj={o} tool={tool} selected={selected === o.id} onSelect={() => setSelected(o.id)} onEdit={() => setGraphDlg({ edit: o })} b={b} toBoard={toBoard} />;
    if (o.type === "solid") return <SolidView key={o.id} obj={o} tool={tool} selected={selected === o.id} onSelect={() => setSelected(o.id)} b={b} toBoard={toBoard} />;
    if (o.type === "shape") return <ShapeView key={o.id} obj={o} tool={tool} selected={selected === o.id} onSelect={() => setSelected(o.id)} b={b} toBoard={toBoard} />;
    if (o.type === "text") return <TextView key={o.id} obj={o} tool={tool} selected={selected === o.id} onSelect={() => setSelected(o.id)} onEdit={() => setTextDlg({ edit: o, x: o.x, y: o.y })} b={b} toBoard={toBoard} />;
    return null;
  }
}
