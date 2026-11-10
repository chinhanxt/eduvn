// web/src/board/exportPng.ts — xuất trang bảng ra PNG. Ô chữ/công thức giữ nguyên bản render MathLive (CSS + font KaTeX nhúng);
// hình không gian vẽ bằng thuộc tính nội tuyến nên đi theo file nguyên vẹn. Thanh công cụ (foreignObject khác) bị bỏ.
import { mathExportCss } from "../math/exportMath";

export async function boardPng(svg: SVGSVGElement, w: number, h: number, scale = 1.5): Promise<Blob> {
  const css = await mathExportCss(svg);
  const c = svg.cloneNode(true) as SVGSVGElement;
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  c.setAttribute("width", String(w));
  c.setAttribute("height", String(h));
  for (const fo of Array.from(c.querySelectorAll("foreignObject"))) if (!fo.hasAttribute("data-plain")) fo.remove();
  for (const el of Array.from(c.querySelectorAll("[data-noexport]"))) el.remove();
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `${css}\n.bd-text{line-height:1.5;padding:2px 12px;white-space:nowrap;font-family:'Be Vietnam Pro',Arial,sans-serif}.me-tex{display:inline-block;vertical-align:middle}`;
  c.insertBefore(style, c.firstChild);
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", "#242b35");
  c.insertBefore(bg, style.nextSibling);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(c))}`;
  await img.decode();
  const cv = document.createElement("canvas");
  cv.width = Math.round(w * scale);
  cv.height = Math.round(h * scale);
  const g = cv.getContext("2d")!;
  g.scale(scale, scale);
  g.drawImage(img, 0, 0, w, h);
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("Không xuất được PNG"))), "image/png"));
}
