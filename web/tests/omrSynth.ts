// Bộ sinh ảnh phiếu tổng hợp: vẽ template → xoay/phối cảnh/bóng/mờ/nhiễu → ảnh RGBA như chụp bằng điện thoại.
import { qrModules } from "../src/omr/sheetSvg";
import { type Cv, type Img } from "../src/omr/decode";
import { type Template, qrPayload } from "../src/omr/template";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** marks: id nhóm → các chỉ số ô được tô; `faint` = tô nhạt (mờ). */
export function renderSheet(t: Template, page: number, examId: string, code: string, marks: Record<string, number[]>, rand: () => number, ppm = 5, faint = new Set<string>()) {
  const w = Math.round(t.w * ppm);
  const h = Math.round(t.h * ppm);
  const g = new Uint8Array(w * h).fill(255);
  const rect = (x0: number, y0: number, x1: number, y1: number, v: number) => {
    for (let y = Math.max(0, Math.floor(y0 * ppm)); y < Math.min(h, Math.ceil(y1 * ppm)); y++) for (let x = Math.max(0, Math.floor(x0 * ppm)); x < Math.min(w, Math.ceil(x1 * ppm)); x++) g[y * w + x] = v;
  };
  const disc = (cx: number, cy: number, r0: number, r1: number, f: (x: number, y: number) => number | null) => {
    for (let y = Math.floor((cy - r1) * ppm); y <= Math.ceil((cy + r1) * ppm); y++) {
      for (let x = Math.floor((cx - r1) * ppm); x <= Math.ceil((cx + r1) * ppm); x++) {
        const d = Math.hypot((x + 0.5) / ppm - cx, (y + 0.5) / ppm - cy);
        if (d >= r0 && d <= r1 && x >= 0 && y >= 0 && x < w && y < h) {
          const v = f(x, y);
          if (v !== null) g[y * w + x] = v;
        }
      }
    }
  };
  const s = t.markerSize / 2;
  for (const m of t.markers) rect(m.x - s, m.y - s, m.x + s, m.y + s, 0);
  const mods = qrModules(qrPayload(examId, code, page));
  const cell = t.qr.size / (mods.length + 4);
  mods.forEach((row, r) => row.forEach((on, c) => on && rect(t.qr.x + (c + 2) * cell, t.qr.y + (r + 2) * cell, t.qr.x + (c + 3) * cell, t.qr.y + (r + 3) * cell, 0)));
  for (const gr of t.groups.filter((x) => x.page === page)) {
    gr.pts.forEach((p, i) => {
      disc(p.x, p.y, t.r - 0.15, t.r + 0.15, () => 40);
      if (!marks[gr.id]?.includes(i)) {
        disc(p.x, p.y, 0, 0.5, () => 190); // chữ in nhạt trong ô
        return;
      }
      const f = faint.has(gr.id);
      const dark = 45 + rand() * 60;
      disc(p.x, p.y, 0, t.r * 0.92, () => (f ? (rand() < 0.45 ? dark : null) : rand() < 0.93 ? dark + (rand() - 0.5) * 30 : null));
    });
  }
  return { gray: g, w, h };
}

export function photograph(cv: Cv, sheet: { gray: Uint8Array; w: number; h: number }, rand: () => number, opts: { angle?: number; noise?: number } = {}): Img {
  const OW = 1700;
  const OH = 2300;
  const ang = ((opts.angle ?? (rand() * 16 - 8)) * Math.PI) / 180;
  const sc = Math.min(OW / sheet.w, OH / sheet.h) * (0.78 + rand() * 0.1);
  const cx = OW / 2 + (rand() - 0.5) * 60;
  const cy = OH / 2 + (rand() - 0.5) * 60;
  const jit = () => (rand() - 0.5) * 0.05 * sheet.w;
  const corners = [[0, 0], [sheet.w, 0], [sheet.w, sheet.h], [0, sheet.h]].map(([x, y]) => {
    const dx = (x! - sheet.w / 2 + (x! ? jit() : -jit())) * sc;
    const dy = (y! - sheet.h / 2 + (y! ? jit() : -jit())) * sc;
    return [cx + dx * Math.cos(ang) - dy * Math.sin(ang), cy + dx * Math.sin(ang) + dy * Math.cos(ang)];
  });
  const src = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, sheet.w, 0, sheet.w, sheet.h, 0, sheet.h]);
  const dst = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flat());
  const M = cv.getPerspectiveTransform(src, dst);
  const page = cv.matFromArray(sheet.h, sheet.w, cv.CV_8UC1, Array.from(sheet.gray));
  const out = new cv.Mat();
  cv.warpPerspective(page, out, M, new cv.Size(OW, OH), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(115));
  cv.GaussianBlur(out, out, new cv.Size(3, 3), 0.6 + rand() * 0.5);
  const px = out.data as Uint8Array;
  const rgba = new Uint8ClampedArray(OW * OH * 4);
  const shadow = 0.68 + rand() * 0.2;
  const noise = opts.noise ?? 7;
  for (let y = 0; y < OH; y++) {
    for (let x = 0; x < OW; x++) {
      const light = shadow + (1 - shadow) * (x / OW) * (0.6 + 0.4 * (y / OH));
      const v = px[y * OW + x]! * light + (rand() + rand() + rand() - 1.5) * noise * 1.6;
      const o = (y * OW + x) * 4;
      rgba[o] = v;
      rgba[o + 1] = v * 0.97;
      rgba[o + 2] = v * 0.93;
      rgba[o + 3] = 255;
    }
  }
  for (const m of [src, dst, M, page, out]) m.delete();
  return { data: rgba, width: OW, height: OH };
}
