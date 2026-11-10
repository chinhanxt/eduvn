// web/src/board/exportPng.ts — xuất trang bảng ra PNG. Chữ công thức (foreignObject) thay bằng chữ thường vì canvas không mang được font MathLive.
const plain = (s: string) => s.replace(/\$/g, "").replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)").replace(/\\Delta/g, "Δ").replace(/\\neq/g, "≠").replace(/\\pm/g, "±").replace(/\\sqrt\{([^}]*)\}/g, "√($1)").replace(/\\[a-zA-Z]+\s?/g, "").replace(/[{}]/g, "");

export async function boardPng(svg: SVGSVGElement, w: number, h: number, scale = 1.5): Promise<Blob> {
  const c = svg.cloneNode(true) as SVGSVGElement;
  c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  c.setAttribute("width", String(w));
  c.setAttribute("height", String(h));
  for (const fo of Array.from(c.querySelectorAll("foreignObject"))) {
    const src = fo.getAttribute("data-plain");
    if (src) {
      const size = Number(fo.getAttribute("data-size") ?? 24);
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("fill", fo.getAttribute("data-color") ?? "#f3f0e6");
      t.setAttribute("font-family", "Be Vietnam Pro, sans-serif");
      t.setAttribute("font-size", String(size));
      src.split("\n").forEach((l, i) => {
        const s = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        s.setAttribute("x", String(Number(fo.getAttribute("x")) + 12));
        s.setAttribute("y", String(Number(fo.getAttribute("y")) + 4 + size * (1.1 + i * 1.4)));
        s.textContent = plain(l);
        t.appendChild(s);
      });
      fo.replaceWith(t);
    } else fo.remove();
  }
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", "#242b35");
  c.insertBefore(bg, c.firstChild);
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
