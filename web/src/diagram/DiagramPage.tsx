// web/src/diagram/DiagramPage.tsx — trình soạn sơ đồ tư duy / lưu đồ (toàn màn).
import { memo, type PointerEvent as RPE, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { api, type AiDiagramResult, errText, gradeLabel } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import "./diagram.css";
import { hasMath, mathCssFor, mathHtml, xhtml } from "../math/exportMath";
import { diagramSvg, download, svgToPng } from "./export";
import { mathFontsReady } from "./measure";
import { placeLabels } from "./labels";
import { addChild, addLink, addSibling, arrange, BRANCH, buildDoc, makeNode, removeNodes, resizeAll, sampleDoc, setLabel, setShape } from "./ops";
import { pathD, type Route, routeAll } from "./route";
import { shapeSvg, tint } from "./shapes";
import { type DEdge, type DNode, type Rect, SHAPES, type Shape } from "./types";
import { newId } from "./types";
import { useDiagram } from "./useDiagram";

const SHAPE_NAME: Record<Shape, string> = { rect: "Chữ nhật", round: "Bo tròn", ellipse: "Elip", diamond: "Thoi", parallelogram: "Bình hành", cloud: "Đám mây", pill: "Viên thuốc" };
type Sel = { kind: "node" | "edge"; id: string } | null;
type View = { tx: number; ty: number; k: number };
type Geo = { routes: Map<string, Route>; labels: Map<string, Rect> };

const Lines = ({ text }: { text: string }) => (
  <>
    {text.split("\n").map((l, i) => (
      <div key={i}>
        <MathText value={l} />
      </div>
    ))}
  </>
);

const NodeView = memo(function NodeView({ n, root, selected, linkSrc, editing, onCommit }: { n: DNode; root: boolean; selected: boolean; linkSrc: boolean; editing: boolean; onCommit: (id: string, v: string | null) => void }) {
  const fill = root ? n.color : tint(n.color, 0.88);
  return (
    <g data-nid={n.id} transform={`translate(${n.x} ${n.y})`} className={`dg-node${selected ? " sel" : ""}${linkSrc ? " src" : ""}`}>
      {n.image ? <image href={n.image} width={n.w} height={n.h} preserveAspectRatio="none" /> : <g dangerouslySetInnerHTML={{ __html: shapeSvg(n.shape, n.w, n.h, fill, n.color) }} />}
      {(selected || linkSrc) && <rect x={-5} y={-5} width={n.w + 10} height={n.h + 10} rx={10} className="dg-selbox" />}
      {!n.image && (
        <foreignObject x={0} y={0} width={n.w} height={n.h}>
          <div className="dg-lbl" style={{ color: root ? "#fff" : "#1b2033" }}>
            {editing ? (
              <textarea
                className="dg-edit"
                autoFocus
                defaultValue={n.label}
                onFocus={(e) => e.currentTarget.select()}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter" && !e.shiftKey) (e.preventDefault(), onCommit(n.id, e.currentTarget.value));
                  else if (e.key === "Escape") onCommit(n.id, null);
                }}
                onBlur={(e) => onCommit(n.id, e.currentTarget.value)}
              />
            ) : (
              <Lines text={n.label} />
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
});

const EdgeView = memo(function EdgeView({ e, route, label, color, selected }: { e: DEdge; route: Route | undefined; label: Rect | undefined; color: string; selected: boolean }) {
  if (!route) return null;
  const tree = e.kind === "tree";
  return (
    <g data-eid={e.id} className={selected ? "dg-edge sel" : "dg-edge"}>
      <path d={pathD(route)} className="dg-hit" />
      <path d={pathD(route)} fill="none" stroke={selected ? "#4f6bed" : tree ? color : "#7a8199"} strokeWidth={tree ? 2.2 : selected ? 2.4 : 1.6} strokeDasharray={e.dashed ? "6 4" : undefined} markerEnd={tree ? undefined : "url(#dg-arrow)"} />
      {label && e.label && (
        <g transform={`translate(${label.x} ${label.y})`}>
          <rect width={label.w} height={label.h} rx={4} className="dg-elbl-bg" />
          <foreignObject width={label.w} height={label.h} style={{ overflow: "visible" }}>
            <div className="dg-elbl">
              <MathText value={e.label} />
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
});

const typing = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "MATH-FIELD" || (a as HTMLElement).isContentEditable);
};

async function shrinkImage(file: File): Promise<{ url: string; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  let scale = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  for (let attempt = 0; attempt < 8; attempt++) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * scale));
    c.height = Math.max(1, Math.round(bmp.height * scale));
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", Math.max(0.4, 0.85 - attempt * 0.07));
    if ((url.length * 3) / 4 <= 290 * 1024) return { url, w: c.width, h: c.height };
    scale *= 0.8;
  }
  throw new Error("Ảnh quá nặng, chọn ảnh nhỏ hơn");
}

export function DiagramPage() {
  const { id = "" } = useParams();
  const [search, setSearch] = useSearchParams();
  const b = useDiagram(id);
  const d = b.doc;
  const [sel, setSel] = useState<Sel>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [view, setView] = useState<View>({ tx: 0, ty: 0, k: 1 });
  const [geo, setGeo] = useState<Geo>({ routes: new Map(), labels: new Map() });
  const [tick, setTick] = useState(0);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<null | { type: "node"; ids: Set<string>; sx: number; sy: number; orig: Map<string, { x: number; y: number }>; moved: boolean; raf: number; dx: number; dy: number } | { type: "pan"; sx: number; sy: number; tx: number; ty: number }>(null);
  const geoRef = useRef(geo);
  geoRef.current = geo;
  const viewRef = useRef(view);
  viewRef.current = view;
  const dRef = useRef(d);
  dRef.current = d;
  const didFit = useRef(false);

  // định tuyến + đặt nhãn đầy đủ (trừ lúc đang kéo)
  useEffect(() => {
    if (!d || drag.current?.type === "node") return;
    const routes = routeAll(d);
    setGeo({ routes, labels: placeLabels(d, routes) });
  }, [d, tick]);

  const fit = useCallback(() => {
    const doc = dRef.current;
    const el = svgRef.current;
    if (!doc || !el || !doc.nodes.length) return setView({ tx: el ? el.clientWidth / 2 : 400, ty: el ? el.clientHeight / 2 : 300, k: 1 });
    const x0 = Math.min(...doc.nodes.map((n) => n.x)), x1 = Math.max(...doc.nodes.map((n) => n.x + n.w));
    const y0 = Math.min(...doc.nodes.map((n) => n.y)), y1 = Math.max(...doc.nodes.map((n) => n.y + n.h));
    const k = Math.max(0.2, Math.min(1.2, (el.clientWidth - 80) / (x1 - x0), (el.clientHeight - 80) / (y1 - y0)));
    setView({ k, tx: el.clientWidth / 2 - ((x0 + x1) / 2) * k, ty: el.clientHeight / 2 - ((y0 + y1) / 2) * k });
  }, []);
  useEffect(() => {
    if (d && !didFit.current) {
      didFit.current = true;
      fit();
    }
  }, [d, fit]);

  const world = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return [(e.clientX - r.left - v.tx) / v.k, (e.clientY - r.top - v.ty) / v.k];
  };
  const zoomAt = useCallback((f: number, cx?: number, cy?: number) => {
    const el = svgRef.current;
    if (!el) return;
    setView((v) => {
      const k = Math.max(0.15, Math.min(3, v.k * f));
      const px = cx ?? el.clientWidth / 2, py = cy ?? el.clientHeight / 2;
      return { k, tx: px - ((px - v.tx) / v.k) * k, ty: py - ((py - v.ty) / v.k) * k };
    });
  }, []);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
      else setView((v) => ({ ...v, tx: v.tx - e.deltaX, ty: v.ty - e.deltaY }));
    };
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, [zoomAt, d === null]);

  const rootOf = useMemo(() => (d && d.kind === "mind" ? d.nodes.find((n) => !n.parent)?.id : undefined), [d]);
  const colorOf = useMemo(() => new Map((d?.nodes ?? []).map((n) => [n.id, n.color])), [d]);

  // --- thao tác ---
  const pick = (r: { doc: NonNullable<typeof d>; id: string }) => {
    b.change(() => r.doc);
    setSel({ kind: "node", id: r.id });
    setEditing(r.id);
  };
  const onCommit = useCallback(
    (nid: string, v: string | null) => {
      setEditing(null);
      const cur = dRef.current?.nodes.find((n) => n.id === nid);
      if (v === null || !cur || v === cur.label) return;
      b.change((doc) => setLabel(doc, nid, v.trim() ? v : cur.label));
    },
    [b.change],
  );
  const removeSel = () => {
    if (!sel || !d) return;
    if (sel.kind === "node") b.change((doc) => removeNodes(doc, [sel.id]));
    else b.change((doc) => ({ ...doc, edges: doc.edges.filter((e) => e.id !== sel.id) }));
    setSel(null);
  };
  const doLink = (from: string, to: string) => {
    const r = addLink(dRef.current!, from, to);
    if (r.id) {
      b.change(() => r.doc);
      setSel({ kind: "edge", id: r.id });
    }
    setLinkFrom(null);
    setLinkMode(false);
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (typing() || !dRef.current) return;
      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === "z") (e.preventDefault(), e.shiftKey ? b.redo() : b.undo());
      else if ((e.ctrlKey || e.metaKey) && key === "y") (e.preventDefault(), b.redo());
      else if ((e.ctrlKey || e.metaKey) && key === "s") (e.preventDefault(), void b.save());
      else if (e.ctrlKey || e.metaKey || e.altKey) return;
      else if (e.key === "Tab") {
        e.preventDefault();
        pick(addChild(dRef.current, sel?.kind === "node" ? sel.id : null));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (sel?.kind === "node") pick(addSibling(dRef.current, sel.id));
      } else if (e.key === "Delete" || e.key === "Backspace") removeSel();
      else if (e.key === "F2" && sel?.kind === "node") setEditing(sel.id);
      else if (key === "l") {
        setLinkMode(true);
        setLinkFrom(sel?.kind === "node" ? sel.id : null);
      } else if (key === "v" || e.key === "Escape") {
        setLinkMode(false);
        setLinkFrom(null);
        if (e.key === "Escape") setSel(null);
      }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  // --- chuột ---
  const flush = () => {
    const dr = drag.current;
    if (!dr || dr.type !== "node") return;
    dr.raf = 0;
    const doc = dRef.current!;
    const next = { ...doc, nodes: doc.nodes.map((n) => (dr.ids.has(n.id) ? { ...n, x: Math.round(dr.orig.get(n.id)!.x + dr.dx), y: Math.round(dr.orig.get(n.id)!.y + dr.dy) } : n)) };
    b.change(() => next, true);
    const only = new Set(next.edges.filter((e) => dr.ids.has(e.from) || dr.ids.has(e.to)).map((e) => e.id));
    const routes = routeAll(next, { only, existing: geoRef.current.routes });
    setGeo({ routes, labels: placeLabels(next, routes, only, geoRef.current.labels) });
  };
  const onDown = (e: RPE<SVGSVGElement>) => {
    if (e.button !== 0 || !d) return;
    const t = e.target as Element;
    const nEl = t.closest("[data-nid]");
    const eEl = t.closest("[data-eid]");
    const [wx, wy] = world(e);
    if (nEl) {
      const nid = nEl.getAttribute("data-nid")!;
      if (linkMode) {
        if (linkFrom && linkFrom !== nid) doLink(linkFrom, nid);
        else setLinkFrom(nid);
        return;
      }
      setSel({ kind: "node", id: nid });
      if (editing === nid) return;
      const ids = new Set<string>([nid]);
      if (d.kind === "mind")
        for (let grow = true; grow; ) {
          grow = false;
          for (const n of d.nodes) if (n.parent && ids.has(n.parent) && !ids.has(n.id)) (ids.add(n.id), (grow = true));
        }
      drag.current = { type: "node", ids, sx: wx, sy: wy, orig: new Map(d.nodes.filter((n) => ids.has(n.id)).map((n) => [n.id, { x: n.x, y: n.y }])), moved: false, raf: 0, dx: 0, dy: 0 };
      svgRef.current?.setPointerCapture(e.pointerId);
    } else if (eEl) {
      setSel({ kind: "edge", id: eEl.getAttribute("data-eid")! });
    } else {
      setSel(null);
      setEditing(null);
      drag.current = { type: "pan", sx: e.clientX, sy: e.clientY, tx: view.tx, ty: view.ty };
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  };
  const onMove = (e: RPE<SVGSVGElement>) => {
    const dr = drag.current;
    if (!dr) return;
    if (dr.type === "pan") return setView((v) => ({ ...v, tx: dr.tx + e.clientX - dr.sx, ty: dr.ty + e.clientY - dr.sy }));
    const [wx, wy] = world(e);
    if (!dr.moved && Math.hypot(wx - dr.sx, wy - dr.sy) < 3) return;
    if (!dr.moved) {
      dr.moved = true;
      b.snapshot();
    }
    dr.dx = wx - dr.sx;
    dr.dy = wy - dr.sy;
    if (!dr.raf) dr.raf = requestAnimationFrame(flush);
  };
  const onUp = () => {
    const dr = drag.current;
    drag.current = null;
    if (dr?.type === "node") {
      if (dr.raf) cancelAnimationFrame(dr.raf);
      if (dr.moved) {
        flushFinal(dr);
        setTick((t) => t + 1);
      }
    }
  };
  const flushFinal = (dr: { ids: Set<string>; orig: Map<string, { x: number; y: number }>; dx: number; dy: number }) => {
    const doc = dRef.current!;
    b.change(() => ({ ...doc, nodes: doc.nodes.map((n) => (dr.ids.has(n.id) ? { ...n, x: Math.round(dr.orig.get(n.id)!.x + dr.dx), y: Math.round(dr.orig.get(n.id)!.y + dr.dy) } : n)) }), true);
  };
  const onDbl = (e: RPE<SVGSVGElement> | React.MouseEvent<SVGSVGElement>) => {
    const nEl = (e.target as Element).closest("[data-nid]");
    if (nEl && !linkMode) setEditing(nEl.getAttribute("data-nid"));
    else if (!nEl && d && !(e.target as Element).closest("[data-eid]")) {
      const [wx, wy] = world(e);
      const n = makeNode(d.kind, "Ý mới", { x: Math.round(wx - 50), y: Math.round(wy - 20), color: BRANCH[d.nodes.length % BRANCH.length] });
      pick({ doc: { ...d, nodes: [...d.nodes, n] }, id: n.id });
    }
  };

  // --- bảng bên phải ---
  const selNode = d && sel?.kind === "node" ? d.nodes.find((n) => n.id === sel.id) : undefined;
  const selEdge = d && sel?.kind === "edge" ? d.edges.find((x) => x.id === sel.id) : undefined;
  const patchNode = (patch: Partial<DNode>) => selNode && b.change((doc) => ({ ...doc, nodes: doc.nodes.map((n) => (n.id === selNode.id ? { ...n, ...patch } : n)) }));
  const patchEdge = (patch: Partial<DEdge>) => selEdge && b.change((doc) => ({ ...doc, edges: doc.edges.map((x) => (x.id === selEdge.id ? { ...x, ...patch } : x)) }));

  const insertImage = async (file: File) => {
    if (!d) return;
    try {
      const im = await shrinkImage(file);
      const w = Math.min(220, im.w);
      const h = Math.round((w * im.h) / im.w);
      const near = selNode;
      const mind = d.kind === "mind" && near;
      const node: DNode = { id: newId(), x: near ? near.x + near.w + 50 : 0, y: near ? near.y : 0, w, h, shape: "rect", label: "", color: near?.color ?? "#4f6bed", parent: mind ? near.id : null, image: im.url };
      const edges: DEdge[] = near ? [...d.edges, { id: newId(), from: near.id, to: node.id, kind: mind ? "tree" : "link" }] : d.edges;
      b.change((doc) => ({ ...doc, nodes: [...doc.nodes, node], edges: near ? edges : doc.edges }));
      setSel({ kind: "node", id: node.id });
    } catch (e) {
      b.setError(errText(e));
    }
  };
  const applyDoc = (nd: NonNullable<typeof d>) => {
    b.change(() => nd);
    setSel(null);
    setTimeout(fit, 30);
  };
  const askAi = async (formulas = false, topicIn = topic) => {
    if (!d || !b.meta || !topicIn.trim()) return;
    setBusy(true);
    b.setError(null);
    try {
      const [r] = await Promise.all([
        api<AiDiagramResult>("/api/diagrams/ai", { method: "POST", body: { topic: topicIn.trim(), kind: formulas ? "mind" : d.kind, formulas, subject: b.meta.subject, grade: b.meta.grade } }),
        mathFontsReady(),
      ]);
      applyDoc(buildDoc(formulas ? "mind" : d.kind, r.nodes, r.links));
    } catch (e) {
      b.setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  // mở từ nút "Sơ đồ công thức" ở danh sách: AI vẽ ngay một lần
  const autoTopic = search.get("cong-thuc");
  const autoRan = useRef(false);
  useEffect(() => {
    if (!autoTopic || autoRan.current || !d || !b.meta) return;
    autoRan.current = true;
    setTopic(autoTopic);
    setSearch({}, { replace: true });
    if (d.nodes.length <= 1) void askAi(true, autoTopic);
  });
  const exportAs = async (fmt: "svg" | "png") => {
    if (!d || !b.meta) return;
    const name = b.meta.title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "so-do";
    try {
      const css = await mathCssFor([...d.nodes.map((n) => n.label), ...d.edges.map((e) => e.label ?? "")].flatMap((l) => l.split("\n")));
      const { svg, w, h } = diagramSvg(d, geo.routes, geo.labels, (n) => n.id === rootOf, { css, html: (v) => (hasMath(v) ? xhtml(mathHtml(v)) : null) });
      if (fmt === "svg") download(`${name}.svg`, new Blob([svg], { type: "image/svg+xml" }));
      else download(`${name}.png`, await svgToPng(svg, w, h));
    } catch (e) {
      b.setError(errText(e));
    }
  };

  if (!b.meta || !d) return <div className="center">{b.error ?? "…"}</div>;
  const hint = linkMode ? (linkFrom ? "Bấm hình đích để nối mũi tên" : "Bấm hình nguồn, rồi bấm hình đích") : "Tab: nhánh con · Enter: ngang hàng · L: nối · V: chọn · bấm đúp: sửa chữ";

  return (
    <div className="dg">
      <aside className="dg-rail">
        <Link to="/so-do" className="dg-mark" title="Danh sách sơ đồ"><Icon name="cap" /></Link>
        <button className={!linkMode ? "dg-rb on" : "dg-rb"} onClick={() => (setLinkMode(false), setLinkFrom(null))} title="Chọn / kéo (V)" data-testid="dg-select"><Icon name="pointer" /><span>Chọn</span></button>
        <button className="dg-rb" onClick={() => pick(addChild(d, sel?.kind === "node" ? sel.id : null))} title="Thêm nhánh con (Tab)" data-testid="dg-child"><Icon name="plus" /><span>Con</span></button>
        <button className="dg-rb" disabled={!selNode} onClick={() => selNode && pick(addSibling(d, selNode.id))} title="Thêm ngang hàng (Enter)" data-testid="dg-sibling"><Icon name="plus" /><span>Cùng cấp</span></button>
        <button className={linkMode ? "dg-rb on" : "dg-rb"} onClick={() => (setLinkMode(true), setLinkFrom(selNode?.id ?? null))} title="Nối mũi tên (L)" data-testid="dg-link"><Icon name="move" /><span>Nối</span></button>
        <button className="dg-rb" disabled={!sel} onClick={removeSel} title="Xoá (Delete)" data-testid="dg-delete"><Icon name="trash" /><span>Xoá</span></button>
      </aside>
      <section className="dg-main">
        <header className="dg-top">
          <span className="dg-title">{b.meta.title}</span>
          <span className="dg-chip">{d.kind === "mind" ? "Sơ đồ tư duy" : "Lưu đồ"} · {b.meta.subject} · {gradeLabel(b.meta.grade)}</span>
          <span className="dg-grow" />
          {b.error && <span className="dg-err" onClick={() => b.setError(null)}>{b.error}</span>}
          <span className={b.dirty ? "dg-state" : "dg-state ok"} data-testid="dg-state">{b.saving ? "Đang lưu…" : b.dirty ? "Chưa lưu" : "Đã lưu"}</span>
          <button className="dg-btn" onClick={b.undo} disabled={!b.canUndo()} title="Hoàn tác (Ctrl+Z)"><Icon name="undo" /></button>
          <button className="dg-btn flip" onClick={b.redo} disabled={!b.canRedo()} title="Làm lại (Ctrl+Y)"><Icon name="undo" /></button>
          <button className="dg-btn" onClick={() => zoomAt(1 / 1.2)} title="Thu nhỏ">−</button>
          <span className="dg-zoom" data-testid="dg-zoom">{Math.round(view.k * 100)}%</span>
          <button className="dg-btn" onClick={() => zoomAt(1.2)} title="Phóng to">+</button>
          <button className="dg-btn" onClick={fit} title="Vừa khung" data-testid="dg-fit"><Icon name="max" /></button>
          <button className="dg-btn pri" onClick={() => void b.save()} data-testid="dg-save"><Icon name="save" />Lưu</button>
        </header>
        <div className="dg-canvas">
          <svg ref={svgRef} className={`dg-svg${linkMode ? " linking" : ""}`} data-testid="dg-svg" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDbl}>
            <defs>
              <marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#7a8199" /></marker>
            </defs>
            <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
              {d.edges.map((e) => (
                <EdgeView key={e.id} e={e} route={geo.routes.get(e.id)} label={geo.labels.get(e.id)} color={colorOf.get(e.to) ?? "#7a8199"} selected={sel?.kind === "edge" && sel.id === e.id} />
              ))}
              {d.nodes.map((n) => (
                <NodeView key={n.id} n={n} root={n.id === rootOf} selected={sel?.kind === "node" && sel.id === n.id} linkSrc={linkFrom === n.id} editing={editing === n.id} onCommit={onCommit} />
              ))}
            </g>
          </svg>
          <div className="dg-hint">{hint}</div>
        </div>
      </section>
      <aside className="dg-panel">
        {selNode && !selNode.image && (
          <section>
            <h3>Hình</h3>
            <div className="dg-shapes">
              {SHAPES.map((s) => (
                <button key={s} className={selNode.shape === s ? "on" : ""} title={SHAPE_NAME[s]} onClick={() => b.change((doc) => setShape(doc, selNode.id, s))} data-testid={`dg-shape-${s}`}>
                  <svg viewBox="0 0 48 32" width="42" height="28" dangerouslySetInnerHTML={{ __html: shapeSvg(s, 44, 28, "#eaeefe", "#4f6bed").replace(/^/, "<g transform='translate(2 2)'>") + "</g>" }} />
                </button>
              ))}
            </div>
          </section>
        )}
        {selNode && (
          <section>
            <h3>Màu</h3>
            <div className="dg-colors">
              {BRANCH.map((c) => (
                <button key={c} className={selNode.color === c ? "on" : ""} style={{ background: c }} aria-label={`Màu ${c}`} onClick={() => patchNode({ color: c })} />
              ))}
            </div>
          </section>
        )}
        {selEdge && (
          <section>
            <h3>Đường nối</h3>
            <label className="dg-f">Chữ trên mũi tên<input className="inp" value={selEdge.label ?? ""} onChange={(e) => patchEdge({ label: e.target.value || undefined })} data-testid="dg-edge-label" /></label>
            <label className="dg-chk"><input type="checkbox" checked={!!selEdge.dashed} onChange={(e) => patchEdge({ dashed: e.target.checked })} />Nét đứt</label>
          </section>
        )}
        <section>
          <h3>Chèn</h3>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void insertImage(f); }} />
          <button className="dg-wide" onClick={() => fileRef.current?.click()} data-testid="dg-image"><Icon name="upload" />Chèn ảnh</button>
        </section>
        <section>
          <h3>Bố cục</h3>
          <button className="dg-wide" onClick={() => b.change((doc) => arrange(resizeAll(doc)))} data-testid="dg-arrange"><Icon name="rotate" />Sắp xếp lại</button>
          <div className="dg-row">
            <button className="dg-wide" onClick={() => (!d.nodes.length || confirm("Thay sơ đồ hiện tại bằng mẫu sơ đồ tư duy?")) && applyDoc(sampleDoc("mind"))} data-testid="dg-tpl-mind">Mẫu tư duy</button>
            <button className="dg-wide" onClick={() => (!d.nodes.length || confirm("Thay sơ đồ hiện tại bằng mẫu lưu đồ?")) && applyDoc(sampleDoc("flow"))} data-testid="dg-tpl-flow">Mẫu lưu đồ</button>
          </div>
        </section>
        <section>
          <h3>AI vẽ giúp</h3>
          <input className="inp" placeholder="Nhập chủ đề, ví dụ: Quang hợp" value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void askAi()} data-testid="dg-ai-topic" />
          <button className="dg-wide pri" disabled={busy || !topic.trim()} onClick={() => void askAi()} data-testid="dg-ai"><Icon name="spark" />{busy ? "Đang vẽ…" : "Vẽ bằng AI"}</button>
          <button className="dg-wide" disabled={busy || !topic.trim()} onClick={() => void askAi(true)} title="Mỗi nhánh là một nhóm công thức, mỗi nút là một công thức LaTeX" data-testid="dg-ai-formula"><Icon name="graph" />Sơ đồ công thức</button>
        </section>
        <section>
          <h3>Xuất file</h3>
          <div className="dg-row">
            <button className="dg-wide" onClick={() => void exportAs("svg")} data-testid="dg-svg-dl">SVG</button>
            <button className="dg-wide" onClick={() => void exportAs("png")} data-testid="dg-png-dl">PNG</button>
          </div>
        </section>
      </aside>
    </div>
  );
}
