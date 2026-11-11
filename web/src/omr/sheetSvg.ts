// web/src/omr/sheetSvg.ts
import QRCode from "qrcode";
import { type Template, qrPayload } from "./template";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Ma trận module QR (true = ô đen). */
export function qrModules(text: string): boolean[][] {
  const q = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = q.modules.size;
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.modules.get(r, c) === 1));
}

/** SVG A4 của một trang phiếu (in từ trình duyệt → PDF). */
export function sheetSvg(t: Template, page: number, examId: string, code: string): string {
  const o: string[] = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t.w} ${t.h}" width="${t.w}mm" height="${t.h}mm" font-family="Arial, Helvetica, sans-serif">`, `<rect width="${t.w}" height="${t.h}" fill="#fff"/>`];
  for (const m of t.markers) o.push(`<rect x="${m.x - t.markerSize / 2}" y="${m.y - t.markerSize / 2}" width="${t.markerSize}" height="${t.markerSize}" fill="#000"/>`);
  const mods = qrModules(qrPayload(examId, code, page));
  const quiet = 2;
  const cell = t.qr.size / (mods.length + quiet * 2);
  o.push(`<rect x="${t.qr.x}" y="${t.qr.y}" width="${t.qr.size}" height="${t.qr.size}" fill="#fff"/>`);
  mods.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      let e = c;
      while (e + 1 < row.length && row[e + 1]) e++;
      o.push(`<rect x="${(t.qr.x + (c + quiet) * cell).toFixed(3)}" y="${(t.qr.y + (r + quiet) * cell).toFixed(3)}" width="${((e - c + 1) * cell + 0.01).toFixed(3)}" height="${(cell + 0.01).toFixed(3)}" fill="#000"/>`);
      c = e;
    }
  });
  for (const x of t.texts.filter((x) => x.page === page)) {
    o.push(`<text x="${x.x}" y="${x.y}" font-size="${x.size}"${x.bold ? ' font-weight="700"' : ""} text-anchor="${x.anchor ?? "start"}" fill="#111">${esc(x.s)}</text>`);
  }
  for (const g of t.groups.filter((g) => g.page === page)) {
    g.pts.forEach((p, i) => {
      o.push(`<circle cx="${p.x}" cy="${p.y}" r="${t.r}" fill="none" stroke="#333" stroke-width="0.3"/>`);
      o.push(`<text x="${p.x}" y="${p.y + 0.85}" font-size="2.4" text-anchor="middle" fill="#bbb">${esc(g.labels[i] ?? "")}</text>`);
    });
  }
  o.push("</svg>");
  return o.join("");
}
