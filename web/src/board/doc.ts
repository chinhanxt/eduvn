// web/src/board/doc.ts
import { autoView, compileExpr, type View2 } from "./graph";
import { PRESET_MAP } from "../geometry3d/presets";
import type { ConstructionSpec, ViewMode } from "../geometry3d/spec";

/** Phải khớp server/src/domain/board.ts (BoardDocSchema). */
export type Stroke = { type: "stroke"; id: string; color: string; width: number; pts: number[] };
export type GraphObj = { type: "graph"; id: string; x: number; y: number; w: number; h: number; exprs: { latex: string; color: string }[]; params: Record<string, number>; view: View2 };
export type PointRef = { name: string; a: number; b: number; t: number };
/** Hình không gian. Từ P10b: `spec` (mô hình dựng hình) là nguồn chính, th/ph là góc xoay/độ nghiêng của phép chiếu SGK.
 *  Hình lưu trước đó (không có spec) dựng lại từ kind + points/section/angle. `kind`: mã hình mẫu, "ai" hoặc loại cũ. */
export type SolidObj = { type: "solid"; id: string; kind: string; cx: number; cy: number; size: number; th: number; ph: number; points: PointRef[]; section: [string, string, string] | null; angle: [string, string, string] | null; spec?: ConstructionSpec; mode?: ViewMode; print?: boolean };
export const SHAPE_KINDS = ["line", "arrow", "rect", "triangle", "circle", "polygon"] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];
/** line/arrow/rect/triangle/circle: pts = [x1,y1,x2,y2] (khung bao / hai đầu); polygon: danh sách đỉnh. */
export type ShapeObj = { type: "shape"; id: string; kind: ShapeKind; color: string; width: number; fill: boolean; pts: number[] };
export type TextObj = { type: "text"; id: string; x: number; y: number; size: number; color: string; text: string; w?: number; h?: number };
export type BoardObj = Stroke | GraphObj | SolidObj | ShapeObj | TextObj;
export type BoardPageDoc = { id: string; objects: BoardObj[] };
export type BoardDoc = { version: 1; pages: BoardPageDoc[] };

export const newId = (): string => Math.random().toString(36).slice(2, 10);
export const emptyPage = (): BoardPageDoc => ({ id: newId(), objects: [] });
export const PALETTE = ["#f3f0e6", "#ff7a6b", "#5cc8ff", "#ffb547"];
export const CURVE_COLORS = ["#ff7a6b", "#5cc8ff", "#7ee2a8", "#ffb547", "#c39bff", "#f3f0e6"];

export function graphFromExprs(exprs: string[], xRange: [number, number], old?: GraphObj): GraphObj {
  const compiled = exprs.map(compileExpr);
  const names = [...new Set(compiled.flatMap((c) => (c.ok ? c.params : [])))];
  const params = Object.fromEntries(names.map((n) => [n, old?.params[n] ?? 1]));
  const fs = compiled.flatMap((c) => (c.ok ? [(x: number) => c.f(x, params)] : []));
  return {
    type: "graph",
    id: old?.id ?? newId(),
    x: old?.x ?? 560,
    y: old?.y ?? 50,
    w: old?.w ?? 660,
    h: old?.h ?? 420,
    exprs: exprs.map((latex, i) => ({ latex, color: CURVE_COLORS[i % CURVE_COLORS.length]! })),
    params,
    view: autoView(fs, xRange[0], xRange[1]),
  };
}

export function newSolid(kind: string, spec: ConstructionSpec, view: { mode: ViewMode; th: number; ph: number }): SolidObj {
  return { type: "solid", id: newId(), kind, cx: 400, cy: 330, size: 170, th: view.th, ph: view.ph, mode: view.mode, points: [], section: null, angle: null, spec };
}
const LEGACY_TITLE: Record<string, string> = { cube: "hình lập phương", cuboid: "hình hộp chữ nhật", pyramid4: "hình chóp tứ giác đều", pyramid3: "hình chóp tam giác đều", prism3: "hình lăng trụ tam giác đều" };

const EXPR_HINTS: [RegExp, string][] = [
  [/\\(sin|cos|tan|cot)/, "lượng giác"],
  [/x\^\{?2(?!\d)/, "bậc hai parabol"],
  [/x\^\{?3(?!\d)/, "bậc ba"],
  [/\\frac/, "phân thức"],
  [/\\sqrt/, "căn thức"],
  [/\\(ln|log)/, "logarit"],
  [/\^\{?x/, "hàm số mũ"],
];

/** Từ khoá mô tả trang bảng — gửi cho gợi ý bài liên quan. */
export function boardKeywords(page: BoardPageDoc): string {
  const out = new Set<string>();
  for (const o of page.objects) {
    if (o.type === "solid") {
      out.add(o.spec?.title ?? PRESET_MAP.get(o.kind)?.title.toLowerCase() ?? LEGACY_TITLE[o.kind] ?? "hình không gian");
      if (o.section || o.spec?.sections?.length) out.add("thiết diện mặt phẳng cắt");
      if (o.angle || o.spec?.marks?.some((m) => m.type === "angle")) out.add("góc");
      for (const m of o.spec?.measures ?? []) out.add(m.type.startsWith("angle") ? "góc" : "khoảng cách");
    }
    if (o.type === "graph") {
      out.add("đồ thị hàm số");
      for (const e of o.exprs) for (const [re, w] of EXPR_HINTS) if (re.test(e.latex)) out.add(w);
    }
  }
  return [...out].join(" ");
}

/** Đường viền SVG của hình phẳng (đoạn thẳng/mũi tên vẽ riêng). */
export function shapeD(o: ShapeObj): string {
  const [x1, y1, x2, y2] = o.pts as [number, number, number, number];
  switch (o.kind) {
    case "line":
    case "arrow":
      return `M${x1} ${y1}L${x2} ${y2}`;
    case "rect":
      return `M${x1} ${y1}H${x2}V${y2}H${x1}Z`;
    case "triangle":
      return `M${(x1 + x2) / 2} ${y1}L${x2} ${y2}L${x1} ${y2}Z`;
    case "circle": {
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, rx = Math.abs(x2 - x1) / 2, ry = Math.abs(y2 - y1) / 2;
      return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
    }
    case "polygon": {
      let d = "";
      for (let i = 0; i + 1 < o.pts.length; i += 2) d += `${i ? "L" : "M"}${o.pts[i]} ${o.pts[i + 1]}`;
      return `${d}Z`;
    }
  }
}
/** Đầu mũi tên (hai đoạn ngắn) tại điểm cuối. */
export function arrowHead(o: ShapeObj): string {
  const [x1, y1, x2, y2] = o.pts as [number, number, number, number];
  const a = Math.atan2(y2 - y1, x2 - x1), L = 10 + o.width * 2;
  const p = (da: number) => `${x2 - L * Math.cos(a + da)} ${y2 - L * Math.sin(a + da)}`;
  return `M${p(0.45)}L${x2} ${y2}L${p(-0.45)}`;
}
export const textBox = (o: TextObj): { w: number; h: number } => {
  if (o.w && o.h) return { w: o.w, h: o.h }; // kích thước đo thật (TextView đo sau khi hiển thị)
  const lines = o.text.split("\n");
  const w = Math.max(...lines.map((l) => l.replace(/\\[a-zA-Z]+/g, "x").replace(/[${}\\^_]/g, "").length)) * o.size * 0.6 + 24;
  const h = lines.reduce((a, l) => a + (/\\d?frac|\\sqrt/.test(l) ? o.size * 2.2 : o.size * 1.5), 0) + 8;
  return { w: Math.max(60, Math.round(w)), h: Math.round(h) };
};
/** Chuyển dịch cả hình phẳng/ô chữ. */
export const moveObj = (o: ShapeObj | TextObj, dx: number, dy: number): Partial<ShapeObj> | Partial<TextObj> =>
  o.type === "text" ? { x: o.x + dx, y: o.y + dy } : { pts: o.pts.map((v, i) => v + (i % 2 ? dy : dx)) };
