// web/src/geometry3d/figure.ts — từ đối tượng hình trên bảng (hoặc spec rời) ra cảnh vẽ / file SVG-PNG đen trắng.
import { defaultMode, legacySpec, PRESET_MAP } from "./presets";
import { buildScene, clampView, SGK_VIEW, type Scene, type View } from "./render";
import { type Solved, solve } from "./solver";
import type { ConstructionSpec, ViewMode } from "./spec";
import { sceneSvg } from "./svg";

export type FigureLike = {
  kind: string;
  cx: number;
  cy: number;
  size: number;
  th: number;
  ph: number;
  points: { name: string; a: number; b: number; t: number }[];
  section: [string, string, string] | null;
  angle: [string, string, string] | null;
  spec?: ConstructionSpec;
  mode?: ViewMode;
};

/** Hình lưu trước P10b (chưa có spec) dựng lại từ loại hình; góc nhìn cũ không còn nghĩa → về góc SGK. */
export function specOf(o: FigureLike): ConstructionSpec {
  return o.spec ?? (PRESET_MAP.has(o.kind) ? PRESET_MAP.get(o.kind)!.spec() : legacySpec(o));
}
export function viewOf(o: FigureLike, spec = specOf(o)): View {
  const mode = o.mode ?? defaultMode(spec);
  return o.spec ? clampView({ mode, th: o.th, ph: o.ph }) : SGK_VIEW[mode];
}

const cache = new WeakMap<ConstructionSpec, Solved>();
export function solvedOf(spec: ConstructionSpec): Solved {
  let s = cache.get(spec);
  if (!s) {
    s = solve(spec);
    cache.set(spec, s);
  }
  return s;
}

export function figureScene(o: FigureLike, font = 18): { spec: ConstructionSpec; solved: Solved; view: View; scene: Scene } {
  const spec = specOf(o);
  const solved = solvedOf(spec);
  const view = viewOf(o, spec);
  return { spec, solved, view, scene: buildScene(solved, view, { cx: o.cx, cy: o.cy, size: o.size, font }) };
}

/** Hình đen trắng để in đề / chèn câu hỏi (cỡ chữ 17, nét SGK). */
export function printSvg(spec: ConstructionSpec, view: View = SGK_VIEW[defaultMode(spec)], size = 150): { svg: string; w: number; h: number } {
  const sc = buildScene(solvedOf(spec), view, { cx: 0, cy: 0, size, font: 17 });
  return sceneSvg(sc, "print", { font: 17 });
}

export async function svgToPngBlob(svg: string, w: number, h: number, scale = 2): Promise<Blob> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.scale(scale, scale);
  g.drawImage(img, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Không xuất được PNG"))), "image/png"));
}

export const blobToDataUrl = (b: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Không đọc được ảnh"));
    r.readAsDataURL(b);
  });
