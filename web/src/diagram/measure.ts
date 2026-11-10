// web/src/diagram/measure.ts — đo nhãn nút bằng chính bản render (chữ + công thức MathLive) để nút vừa khít công thức thật.
import { mathHtml } from "../math/exportMath";
import { setLabelMeasurer } from "./layout";

let box: HTMLDivElement | null = null;
const cache = new Map<string, { w: number; h: number }>();

function host(): HTMLDivElement {
  if (!box) {
    box = document.createElement("div");
    box.className = "dg-measure";
    box.setAttribute("aria-hidden", "true");
    document.body.appendChild(box);
  }
  return box;
}

/** Kích thước vùng chữ (chưa tính lề trong hình). */
export function measureLabel(label: string): { w: number; h: number } {
  const hit = cache.get(label);
  if (hit) return hit;
  const b = host();
  b.innerHTML = label
    .split("\n")
    .map((l) => `<div>${mathHtml(l)}</div>`)
    .join("");
  const r = b.getBoundingClientRect();
  const v = { w: Math.ceil(r.width) + 2, h: Math.ceil(r.height) + 2 };
  if (document.fonts.status === "loaded") cache.set(label, v);
  return v;
}

/** Chờ font công thức (KaTeX của MathLive) nạp xong để số đo đúng. */
export async function mathFontsReady(): Promise<void> {
  measureLabel("$\\dfrac{\\sin^2 x}{\\sqrt{2}}\\pi\\alpha$");
  await document.fonts.ready;
  cache.clear();
}

setLabelMeasurer(typeof document === "undefined" ? null : measureLabel);
