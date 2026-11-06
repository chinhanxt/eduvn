// web/src/board/BoardPage.tsx
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { type BankQuestion, gradeLabel } from "../api";
import { Icon } from "../Icon";
import "./board.css";
import { type BoardObj, type GraphObj, graphFromExprs, newId, newSolid, PALETTE, type Stroke } from "./doc";
import { GraphDialog, GraphView } from "./GraphView";
import { hitStroke, strokePath } from "./ink";
import { Projector } from "./Projector";
import { SolidPicker, SolidView } from "./SolidView";
import { SuggestPanel } from "./SuggestPanel";
import { useBoard } from "./useBoard";

export type Tool = "pointer" | "pen" | "eraser";
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
  const [suggest, setSuggest] = useState(false);
  const [projected, setProjected] = useState<BankQuestion | null>(null);
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
      else if (e.key === "v") setTool("pointer");
      else if (e.key === "p") setTool("pen");
      else if (e.key === "e") setTool("eraser");
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  useEffect(() => setSelected(null), [b.page]);

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
    } else setSelected(null);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = toBoard(e);
    if (draft) {
      const lx = draft[draft.length - 2]!, ly = draft[draft.length - 1]!;
      if (draft.length < 4000 && Math.hypot(x - lx, y - ly) > 1.5) setDraft([...draft, Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    } else if (erasing.current) erase(x, y);
  };
  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    if (!e.isPrimary) return;
    if (draft) {
      const pts = draft.length >= 4 ? draft : [draft[0]!, draft[1]!, draft[0]! + 0.5, draft[1]!];
      b.addObj({ type: "stroke", id: newId(), color, width: 4.5, pts });
      setDraft(null);
    }
    erasing.current = null;
  };

  const rail = (icon: string, title: string, on: boolean, onClick: () => void, testId?: string) => (
    <button className={on ? "bd-rb on" : "bd-rb"} title={title} onClick={onClick} data-testid={testId}><Icon name={icon} /></button>
  );
  const n = b.doc.pages.length;

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
          <button className="bd-btn" onClick={b.undo} title="Hoàn tác (Ctrl+Z)"><Icon name="undo" /></button>
          <button className="bd-btn pri" onClick={() => void b.save()} data-testid="bd-save"><Icon name="save" />Lưu</button>
          <button className="bd-btn" onClick={() => void rootRef.current?.requestFullscreen().catch(() => {})} title="Toàn màn hình"><Icon name="max" /></button>
        </header>
        <div className="bd-wrap">
          <div className="bd-stage" data-testid="bd-stage">
            <svg ref={svgRef} className={`bd-svg bd-tool-${tool}`} viewBox={`0 0 ${W} ${H}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <defs>
                <pattern id="bd-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,.07)" /></pattern>
              </defs>
              <rect width={W} height={H} fill="url(#bd-dots)" />
              {objs.map((o) => renderObject(o))}
              {objs.map((o) => (o.type === "stroke" ? <path key={o.id} className="bd-ink" d={strokePath(o.pts, o.width)} fill={o.color} /> : null))}
              {draft && <path d={strokePath(draft, 4.5)} fill={color} />}
            </svg>
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
      {picker && (
        <SolidPicker
          onClose={() => setPicker(false)}
          onPick={(k) => {
            const s = newSolid(k);
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
    return null;
  }
}
