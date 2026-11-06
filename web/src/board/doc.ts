// web/src/board/doc.ts
import { autoView, compileExpr, type View2 } from "./graph";
import { type PointRef, SOLIDS, type SolidKind } from "./solids";

/** Phải khớp server/src/domain/board.ts (BoardDocSchema). */
export type Stroke = { type: "stroke"; id: string; color: string; width: number; pts: number[] };
export type GraphObj = { type: "graph"; id: string; x: number; y: number; w: number; h: number; exprs: { latex: string; color: string }[]; params: Record<string, number>; view: View2 };
export type SolidObj = { type: "solid"; id: string; kind: SolidKind; cx: number; cy: number; size: number; th: number; ph: number; points: PointRef[]; section: [string, string, string] | null; angle: [string, string, string] | null };
export type BoardObj = Stroke | GraphObj | SolidObj;
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

export const newSolid = (kind: SolidKind): SolidObj => ({ type: "solid", id: newId(), kind, cx: 380, cy: 330, size: 200, th: 0.62, ph: 0.42, points: [], section: null, angle: null });

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
      out.add(SOLIDS[o.kind].title);
      if (o.section) out.add("thiết diện mặt phẳng cắt");
      if (o.angle) out.add("góc");
    }
    if (o.type === "graph") {
      out.add("đồ thị hàm số");
      for (const e of o.exprs) for (const [re, w] of EXPR_HINTS) if (re.test(e.latex)) out.add(w);
    }
  }
  return [...out].join(" ");
}
