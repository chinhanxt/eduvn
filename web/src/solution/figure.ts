// web/src/solution/figure.ts — dựng hình của lời giải thành danh sách phần tử SVG có id (để tô sáng theo refs của bước). Thuần TS.
// Hình không gian: bộ giải + phép chiếu SGK + đặt nhãn của P10b; sơ đồ: bố cục + định tuyến + đặt nhãn của P10.
import { estimateSize } from "../diagram/layout";
import { placeLabels } from "../diagram/labels";
import { buildDoc } from "../diagram/ops";
import { pathD, routeAll } from "../diagram/route";
import { defaultMode } from "../geometry3d/presets";
import { buildScene, SGK_VIEW, textWidth, type Scene } from "../geometry3d/render";
import { solve } from "../geometry3d/solver";
import { sceneSvgBody } from "../geometry3d/svg";
import { compilePlain, plainNumber } from "./expr";
import type { Figure, TreeNode } from "./types";

export type Box = { x: number; y: number; w: number; h: number };
export type El =
  | { t: "line"; ids: string[]; x1: number; y1: number; x2: number; y2: number; dash?: boolean; role?: "axis" | "edge" }
  | { t: "path"; ids: string[]; d: string; role?: "curve" | "edge" }
  | { t: "poly"; ids: string[]; pts: [number, number][] }
  | { t: "circle"; ids: string[]; cx: number; cy: number; r: number; fill?: boolean }
  | { t: "rect"; ids: string[]; x: number; y: number; w: number; h: number; rx: number }
  | { t: "text"; ids: string[]; x: number; y: number; text: string; size: number; anchor?: "start" | "middle" | "end"; role?: "label" | "node" | "axis" };

export type FigureModel = {
  viewBox: [number, number, number, number];
  els: El[];
  /** khung các nhãn chữ (kiểm không đè) */
  labels: Box[];
  /** hình không gian: phần thân SVG tĩnh (nét SGK) + cảnh để dựng lớp tô sáng */
  solid?: { body: string; scene: Scene };
  ids: Set<string>;
};

const FONT = 15;
const strip = (s: string) => s.replace(/\$([^$]*)\$/g, "$1").replace(/\\[a-zA-Z]+/g, "").replace(/[{}]/g, "").trim();
const textW = (s: string, size = FONT) => Math.round([...s].length * size * 0.56 + 6);
export const boxesHit = (a: Box, b: Box, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

function fit(boxes: Box[], pad = 16): [number, number, number, number] {
  if (!boxes.length) return [0, 0, 100, 100];
  const x0 = Math.min(...boxes.map((b) => b.x)) - pad, y0 = Math.min(...boxes.map((b) => b.y)) - pad;
  const x1 = Math.max(...boxes.map((b) => b.x + b.w)) + pad, y1 = Math.max(...boxes.map((b) => b.y + b.h)) + pad;
  return [x0, y0, x1 - x0, y1 - y0];
}

// ——— hình không gian ———
function solidModel(f: Extract<Figure, { kind: "solid3d" }>): FigureModel {
  const solved = solve(f.spec);
  const scene = buildScene(solved, SGK_VIEW[f.spec.view ?? defaultMode(f.spec)], { cx: 0, cy: 0, size: 150, font: 17 });
  const [x0, y0, x1, y1] = scene.bbox;
  const ids = new Set<string>(scene.points.keys());
  const labels = scene.labels.map((l) => ({ x: l.x - l.w / 2, y: l.y - l.h / 2, w: l.w, h: l.h }));
  return { viewBox: [x0 - 16, y0 - 16, x1 - x0 + 32, y1 - y0 + 32], els: [], labels, solid: { body: sceneSvgBody(scene, "print", 17), scene }, ids };
}

/** Lớp tô sáng hình không gian: điểm "S", đoạn "S-A", mặt "S-B-C" (tên theo spec). Phần tử không có trên hình bị bỏ qua. */
export function solidOverlay(scene: Scene, refs: string[]): El[] {
  const out: El[] = [];
  const P = (n: string) => scene.points.get(n) ?? scene.points.get(n.replace(/′/g, "'"));
  for (const ref of refs) {
    const names = ref.split("-").filter(Boolean);
    const pts = names.map(P);
    if (!names.length || pts.some((p) => !p)) continue;
    const q = pts as [number, number][];
    if (q.length >= 3) out.push({ t: "poly", ids: [ref], pts: q });
    else if (q.length === 2) out.push({ t: "line", ids: [ref], x1: q[0]![0], y1: q[0]![1], x2: q[1]![0], y2: q[1]![1] });
    for (const n of names) {
      const p = P(n)!;
      out.push({ t: "circle", ids: [ref], cx: p[0], cy: p[1], r: 3.6, fill: true });
      const l = scene.labels.find((x) => x.kind === "point" && x.name === n);
      if (l) out.push({ t: "text", ids: [ref], x: l.x, y: l.y + 17 * 0.34, text: l.text, size: 17, anchor: "middle", role: "label" });
    }
  }
  return out;
}

// ——— đồ thị ———
function graphModel(f: Extract<Figure, { kind: "graph" }>): FigureModel {
  const fn = compilePlain(f.spec.expr);
  const pts = f.spec.points.map((p) => {
    const x = plainNumber(p.x);
    const y = p.y !== undefined ? plainNumber(p.y) : fn(x);
    return { ...p, x, y };
  });
  let [a, b] = f.spec.xRange ?? [-5, 5];
  if (!f.spec.xRange && pts.length) {
    a = Math.min(a, ...pts.map((p) => p.x - 1));
    b = Math.max(b, ...pts.map((p) => p.x + 1));
  }
  const N = 240;
  const samples: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const x = a + ((b - a) * i) / N;
    samples.push([x, fn(x)]);
  }
  const ys = samples.map((s) => s[1]).filter(Number.isFinite).sort((p, q) => p - q);
  // bỏ phần nổ (tiệm cận): lấy khoảng 5%–95% rồi nới
  let lo = ys[Math.floor(ys.length * 0.05)] ?? -5, hi = ys[Math.ceil(ys.length * 0.95) - 1] ?? 5;
  for (const p of pts) (lo = Math.min(lo, p.y)), (hi = Math.max(hi, p.y));
  lo = Math.min(lo, 0);
  hi = Math.max(hi, 0);
  const padY = (hi - lo || 2) * 0.15;
  lo -= padY;
  hi += padY;
  const W = 420, H = 300;
  const X = (x: number) => ((x - a) / (b - a)) * W;
  const Y = (y: number) => H - ((y - lo) / (hi - lo)) * H;
  const els: El[] = [];
  els.push({ t: "line", ids: [], x1: 0, y1: Y(0), x2: W, y2: Y(0), role: "axis" }, { t: "line", ids: [], x1: X(0), y1: 0, x2: X(0), y2: H, role: "axis" });
  const labels: Box[] = [];
  const ax = [{ x: W - 12, y: Y(0) + 18, text: "x" }, { x: X(0) + 12, y: 12, text: "y" }, { x: X(0) - 10, y: Y(0) + 16, text: "O" }];
  for (const t of ax) {
    els.push({ t: "text", ids: [], x: t.x, y: t.y, text: t.text, size: 14, anchor: "middle", role: "axis" });
    labels.push({ x: t.x - 6, y: t.y - 12, w: 12, h: 14 });
  }
  let d = "";
  let pen = false;
  for (const [x, y] of samples) {
    if (!Number.isFinite(y) || y < lo - (hi - lo) || y > hi + (hi - lo)) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`;
    pen = true;
  }
  els.push({ t: "path", ids: ["f"], d, role: "curve" });
  const curve = samples.filter(([, y]) => Number.isFinite(y)).map(([x, y]) => [X(x), Y(y)] as const);
  for (const p of pts) {
    const cx = X(p.x), cy = Y(p.y);
    els.push({ t: "line", ids: [p.id], x1: cx, y1: cy, x2: cx, y2: Y(0), dash: true }, { t: "circle", ids: [p.id], cx, cy, r: 4, fill: true });
    const text = `${p.label ? `${strip(p.label)} ` : ""}(${fmt(p.x)}; ${fmt(p.y)})`;
    const w = textW(text, 13), h = 16;
    let best: Box | null = null, bestS = Infinity;
    for (const [dx, dy] of [[8, -22], [8, 6], [-8 - w, -22], [-8 - w, 6], [-w / 2, -30], [-w / 2, 12]] as const) {
      const box = { x: cx + dx, y: cy + dy, w, h };
      let s = Math.abs(dx) / 50;
      for (const l of labels) if (boxesHit(box, l, 2)) s += 100;
      for (const [qx, qy] of curve) if (qx > box.x && qx < box.x + w && qy > box.y && qy < box.y + h) s += 3;
      if (box.x < 0 || box.x + w > W || box.y < 0 || box.y + h > H) s += 20;
      if (s < bestS) (bestS = s), (best = box);
    }
    labels.push(best!);
    els.push({ t: "text", ids: [p.id], x: best!.x, y: best!.y + 12, text, size: 13, anchor: "start", role: "label" });
  }
  return { viewBox: fit([{ x: 0, y: 0, w: W, h: H }, ...labels], 10), els, labels, ids: new Set(["f", ...pts.map((p) => p.id)]) };
}
const fmt = (v: number) => (Number.isInteger(Math.round(v * 1000) / 1000) ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString().replace(".", ",")).replace("-", "−");

// ——— cây xác suất ———
export function treeModel(f: Extract<Figure, { kind: "tree" }>): FigureModel {
  const nodes = f.spec.nodes;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const kids = (id: string) => nodes.filter((n) => n.parent === id);
  const roots = nodes.filter((n) => !n.parent || !byId.has(n.parent));
  const depth = new Map<string, number>();
  const setDepth = (n: TreeNode, d: number) => {
    if (depth.has(n.id)) return;
    depth.set(n.id, d);
    for (const k of kids(n.id)) setDepth(k, d + 1);
  };
  roots.forEach((r) => setDepth(r, 0));
  const ROW = 46, BOX_H = 28, GAP = 84;
  const colW: number[] = [];
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    colW[d] = Math.max(colW[d] ?? 0, textW(strip(n.label)) + 16);
  }
  const colX: number[] = [];
  colW.forEach((w, i) => (colX[i] = i ? colX[i - 1]! + colW[i - 1]! + GAP : 0));
  const y = new Map<string, number>();
  let row = 0;
  const place = (n: TreeNode): number => {
    const ks = kids(n.id);
    const v = ks.length ? ks.map(place).reduce((s, q) => s + q, 0) / ks.length : row++ * ROW;
    y.set(n.id, v);
    return v;
  };
  roots.forEach(place);
  const els: El[] = [];
  const labels: Box[] = [];
  const box = (n: TreeNode) => {
    const d = depth.get(n.id) ?? 0;
    const w = textW(strip(n.label)) + 16;
    return { x: colX[d]!, y: y.get(n.id)! - BOX_H / 2, w, h: BOX_H };
  };
  for (const n of nodes) {
    if (!n.parent || !byId.has(n.parent)) continue;
    const a = box(byId.get(n.parent)!), b = box(n);
    const x1 = a.x + a.w, y1 = a.y + BOX_H / 2, x2 = b.x, y2 = b.y + BOX_H / 2;
    els.push({ t: "line", ids: [n.id], x1, y1, x2, y2, role: "edge" });
    if (n.p) {
      const text = strip(n.p);
      const w = textW(text, 13), h = 16;
      // nhãn xác suất ở giữa nhánh, phía trên (nhánh đi lên) hoặc dưới (nhánh đi xuống) để không đè nhánh anh em
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const lb = { x: mx - w / 2, y: y2 < y1 ? my - h - 2 : y2 > y1 ? my + 2 : my - h - 2, w, h };
      labels.push(lb);
      els.push({ t: "text", ids: [n.id], x: mx, y: lb.y + 12, text, size: 13, anchor: "middle", role: "label" });
    }
  }
  for (const n of nodes) {
    const b = box(n);
    labels.push(b);
    els.push({ t: "rect", ids: [n.id], ...b, rx: 8 }, { t: "text", ids: [n.id], x: b.x + b.w / 2, y: b.y + BOX_H / 2 + 5, text: strip(n.label), size: FONT, anchor: "middle", role: "node" });
  }
  return { viewBox: fit(labels), els, labels, ids: new Set(nodes.map((n) => n.id)) };
}

// ——— sơ đồ (bố cục + định tuyến P10) ———
function diagramModel(f: Extract<Figure, { kind: "diagram" }>): FigureModel {
  const kind = f.spec.nodes.some((n) => n.parent) ? "mind" : "flow";
  const doc = buildDoc(kind, f.spec.nodes, f.spec.links);
  const back = new Map(doc.nodes.map((n, i) => [n.id, f.spec.nodes[i]!.id]));
  const routes = routeAll(doc);
  const lbl = placeLabels(doc, routes);
  const els: El[] = [];
  const labels: Box[] = [];
  for (const e of doc.edges) {
    const r = routes.get(e.id);
    if (!r) continue;
    const ids = [back.get(e.to)!, back.get(e.from)!];
    els.push({ t: "path", ids, d: pathD(r), role: "edge" });
    const lb = lbl.get(e.id);
    if (lb && e.label) {
      labels.push(lb);
      els.push({ t: "text", ids, x: lb.x + lb.w / 2, y: lb.y + lb.h / 2 + 4, text: strip(e.label), size: 12, anchor: "middle", role: "label" });
    }
  }
  for (const n of doc.nodes) {
    const id = back.get(n.id)!;
    const b = { x: n.x, y: n.y, w: n.w, h: n.h };
    labels.push(b);
    els.push({ t: "rect", ids: [id], ...b, rx: 12 });
    const lines = strip(n.label).split("\n");
    lines.forEach((ln, i) => els.push({ t: "text", ids: [id], x: n.x + n.w / 2, y: n.y + n.h / 2 + 5 + (i - (lines.length - 1) / 2) * 17, text: ln, size: 14, anchor: "middle", role: "node" }));
  }
  void estimateSize;
  return { viewBox: fit(labels), els, labels, ids: new Set(f.spec.nodes.map((n) => n.id)) };
}

// ——— hình phẳng toạ độ ———
function planeModel(f: Extract<Figure, { kind: "plane" }>): FigureModel {
  const ps = f.spec.points;
  const xs = ps.map((p) => p.x), ys = ps.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), ...f.spec.circles.map((c) => 2 * c.r), 1);
  const k = 300 / span;
  const P = new Map(ps.map((p) => [p.id, [p.x * k, -p.y * k] as [number, number]]));
  const els: El[] = [];
  for (const c of f.spec.circles) {
    const o = P.get(c.center);
    if (o) els.push({ t: "circle", ids: [c.center], cx: o[0], cy: o[1], r: c.r * k });
  }
  for (const [a, b] of f.spec.segments) {
    const p = P.get(a), q = P.get(b);
    if (p && q) els.push({ t: "line", ids: [`${a}-${b}`, `${b}-${a}`], x1: p[0], y1: p[1], x2: q[0], y2: q[1], role: "edge" });
  }
  const g = [...P.values()].reduce((s, p) => [s[0] + p[0] / P.size, s[1] + p[1] / P.size], [0, 0]);
  const labels: Box[] = [];
  const segs = f.spec.segments.map(([a, b]) => [P.get(a), P.get(b)]).filter((s): s is [[number, number], [number, number]] => !!s[0] && !!s[1]);
  for (const p of ps) {
    const [x, y] = P.get(p.id)!;
    const w = textWidth(p.id, 17), h = 15;
    let best: Box | null = null, bestS = Infinity;
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * 2 * Math.PI, r = 14;
      const box = { x: x + Math.cos(ang) * r - w / 2, y: y + Math.sin(ang) * r - h / 2, w, h };
      let s = -((Math.cos(ang) * (x - g[0]) + Math.sin(ang) * (y - g[1])) / (Math.hypot(x - g[0], y - g[1]) || 1));
      for (const l of labels) if (boxesHit(box, l, 2)) s += 100;
      for (const [a, b] of segs) if (segBox(a, b, box)) s += 30;
      if (s < bestS) (bestS = s), (best = box);
    }
    labels.push(best!);
    els.push({ t: "circle", ids: [p.id], cx: x, cy: y, r: 3.2, fill: true }, { t: "text", ids: [p.id], x: best!.x + w / 2, y: best!.y + h - 2, text: p.id, size: 17, anchor: "middle", role: "label" });
  }
  const pts = [...P.values()].map(([x, y]) => ({ x, y, w: 0, h: 0 }));
  const circ = f.spec.circles.flatMap((c) => {
    const o = P.get(c.center);
    return o ? [{ x: o[0] - c.r * k, y: o[1] - c.r * k, w: 2 * c.r * k, h: 2 * c.r * k }] : [];
  });
  const ids = new Set<string>(ps.map((p) => p.id));
  for (const [a, b] of f.spec.segments) ids.add(`${a}-${b}`).add(`${b}-${a}`);
  return { viewBox: fit([...pts, ...circ, ...labels]), els, labels, ids };
}
function segBox(a: [number, number], b: [number, number], r: Box): boolean {
  for (let i = 0; i <= 10; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / 10, y = a[1] + ((b[1] - a[1]) * i) / 10;
    if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h) return true;
  }
  return false;
}

export function buildFigureModel(f: Figure): FigureModel {
  switch (f.kind) {
    case "solid3d":
      return solidModel(f);
    case "graph":
      return graphModel(f);
    case "tree":
      return treeModel(f);
    case "diagram":
      return diagramModel(f);
    case "plane":
      return planeModel(f);
  }
}

/** Phần tử có được tô sáng ở bước có refs này không: null = không bước nào chọn (hiện bình thường). */
export function highlightOf(el: El, refs: string[]): "hl" | "dim" | null {
  if (!refs.length) return null;
  return el.ids.some((id) => refs.includes(id)) ? "hl" : "dim";
}

/** Tên refs của bước có thật trên hình (bỏ refs AI bịa). */
export function knownRefs(m: FigureModel, refs: string[]): string[] {
  if (!m.solid) return refs.filter((r) => m.ids.has(r));
  return refs.filter((r) => r.split("-").every((n) => m.solid!.scene.points.has(n)));
}

/** SVG độc lập (để xuất PNG) có tô sáng bước đang xem. */
export function figureSvg(m: FigureModel, refs: string[]): { svg: string; w: number; h: number } {
  const [x, y, w, h] = m.viewBox;
  const els = m.solid ? solidOverlay(m.solid.scene, refs) : m.els;
  const body = (m.solid ? `<g opacity="${refs.length ? 0.4 : 1}">${m.solid.body}</g>` : "") + els.map((e) => elSvg(e, m.solid ? "hl" : highlightOf(e, refs))).join("");
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(w)}" height="${Math.ceil(h)}" viewBox="${x} ${y} ${w} ${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>${body}</svg>`, w: Math.ceil(w), h: Math.ceil(h) };
}

export const ACCENT = "#d9480f";
const INK = "#1b2130";
const xesc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function elSvg(e: El, h: "hl" | "dim" | null): string {
  const stroke = h === "hl" ? ACCENT : INK;
  const op = h === "dim" ? ' opacity="0.3"' : "";
  const sw = (base: number) => (h === "hl" ? base + 1.6 : base);
  switch (e.t) {
    case "line":
      return `<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${e.role === "axis" ? "#9ca3af" : stroke}" stroke-width="${sw(e.role === "axis" ? 1 : 1.8)}"${e.dash ? ' stroke-dasharray="4 4"' : ""}${op}/>`;
    case "path":
      return `<path d="${e.d}" fill="none" stroke="${e.role === "curve" && h !== "hl" ? "#2a78d6" : stroke}" stroke-width="${sw(e.role === "curve" ? 2.4 : 1.8)}"${op}/>`;
    case "poly":
      return `<polygon points="${e.pts.map((p) => p.join(",")).join(" ")}" fill="${ACCENT}" fill-opacity="0.16" stroke="${ACCENT}" stroke-width="2.6"/>`;
    case "circle":
      return `<circle cx="${e.cx}" cy="${e.cy}" r="${e.r}" fill="${e.fill ? stroke : "none"}" stroke="${stroke}" stroke-width="${sw(1.6)}"${op}/>`;
    case "rect":
      return `<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="${e.rx}" fill="${h === "hl" ? "#fff1e8" : "#ffffff"}" stroke="${stroke}" stroke-width="${sw(1.4)}"${op}/>`;
    case "text":
      return `<text x="${e.x}" y="${e.y}" font-size="${e.size}" text-anchor="${e.anchor ?? "middle"}" font-family="${e.role === "label" || e.role === "axis" ? "'Source Serif 4', Georgia, serif" : "Inter, system-ui, sans-serif"}"${e.role === "label" || e.role === "axis" ? ' font-style="italic"' : ""} fill="${h === "hl" ? ACCENT : e.role === "axis" ? "#646c80" : INK}"${h === "hl" ? ' font-weight="700"' : ""}${op}>${xesc(e.text)}</text>`;
  }
}
export { elSvg };
