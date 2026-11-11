/** Khung "Giấy học thuật" cho mẫu HyperFrames thế hệ mới: đọc token video dùng chung (services/video-theme/tokens.json),
 * lưới 12 cột 1920×1080, chữ Inter + Source Serif 4 tự host, bảng màu phân loại theo tổ hợp, nhịp beat theo thời lượng lời giảng. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import tokens from "../../../../services/video-theme/tokens.json";
import { esc } from "./hfHtml";

export const VT = tokens;
export const THEMES = ["giay"] as const;
export type ThemeName = (typeof THEMES)[number];
export type Theme = (typeof tokens.themes)["giay"];
export const DEFAULT_THEME: ThemeName = "giay";
const here = path.dirname(fileURLToPath(import.meta.url));
export const FONT_DIR = path.resolve(here, "../../../../services/video-theme/fonts");
export const TOKENS_FILE = path.resolve(here, "../../../../services/video-theme/tokens.json");
export type ComboName = Exclude<keyof typeof tokens.combos, `$${string}`>;
/** Màu vật thể theo tổ hợp: c[0..3] giữ cố định cho từng đại lượng suốt cảnh. */
export const combo = (name: ComboName) => tokens.combos[name].map((k) => tokens.palette[k as keyof typeof tokens.palette] as string);

export const W = tokens.canvas.w;
export const H = tokens.canvas.h;
const G = tokens.grid;
const M = tokens.motion;
const TY = tokens.type;
export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Lưới 12 cột: mép trái cột i (0..11) và bề rộng n cột liền nhau. */
const colW = (W - 2 * G.marginX - (G.cols - 1) * G.gutter) / G.cols;
export const colX = (i: number) => r2(G.marginX + i * (colW + G.gutter));
export const spanW = (n: number) => r2(n * colW + (n - 1) * G.gutter);

/** Ước bề rộng chữ (px) — Inter ~0,56 em/ký tự, serif ~0,5 em; đủ để chọn cỡ chữ không tràn. */
export const textW = (s: string, size: number, k = 0.56) => s.length * size * k;
/** Cỡ chữ lớn nhất ≤ base để chuỗi vừa maxW trên một dòng; không nhỏ hơn cỡ tối thiểu (khi đó cho xuống dòng cân bằng). */
export const fitSize = (s: string, maxW: number, base: number, k = 0.56) => Math.max(TY.min, Math.min(base, Math.floor(maxW / Math.max(1, s.length * k))));

/** Số kiểu Việt: dấu phẩy thập phân, tối đa 3 chữ số lẻ. */
export const vnNum = (v: number) => String(Math.round(v * 1000) / 1000).replace("-", "−").replace(".", ",");
/** Số trong KaTeX: {,} để không có khoảng trắng sau dấu phẩy. */
export const texNum = (v: number) => String(Math.round(v * 1000) / 1000).replace(".", "{,}");

/** Lịch beat: chia đều phần thân (trừ đoạn mở đầu + giữ kết) theo trọng số. */
export function schedule(T: number, weights: number[]) {
  const lead = Math.min(M.lead, T * 0.08);
  const hold = Math.min(M.holdMax, T * 0.1);
  const body = Math.max(T - lead - hold, 0.5);
  const sum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  return weights.map((w) => {
    const start = r2(lead + (body * acc) / sum);
    acc += w;
    const slot = r2((body * w) / sum);
    /** Thời điểm hành động j trong m hành động của beat (rải đều, không để khoảng lặng dài). */
    const at = (j: number, m: number) => r2(start + (slot * j) / Math.max(m, 1));
    /** Thời lượng chuyển động vừa với beat (beat ngắn → nhanh hơn, không dưới 0,35 s). */
    const d = (base: number, m = 1) => r2(Math.max(0.35, Math.min(base, (slot / Math.max(m, 1)) * 0.8)));
    return { start, slot, at, d };
  });
}
export type Beat = ReturnType<typeof schedule>[number];

/** Bộ ghi dòng thời gian GSAP: tween đầu tiên của mỗi thuộc tính dùng fromTo, các lần sau dùng to (tránh immediateRender đè trạng thái đầu). */
export class Tl {
  js = "";
  from(sel: string, from: Record<string, unknown>, to: Record<string, unknown>, t: number) {
    this.js += `tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify(to)}, ${r2(t)});\n`;
    return this;
  }
  to(sel: string, to: Record<string, unknown>, t: number) {
    this.js += `tl.to(${JSON.stringify(sel)}, ${JSON.stringify(to)}, ${r2(t)});\n`;
    return this;
  }
  /** Hiện: mờ → rõ + trượt lên, dừng mềm (expo). */
  enter(sel: string, t: number, d: number = M.enter, rise: number = M.rise) {
    return this.from(sel, { opacity: 0, y: rise }, { opacity: 1, y: 0, duration: d, ease: M.ease.enter }, t);
  }
  /** Hiện kiểu lò xo nhẹ (nút, nhãn số). */
  pop(sel: string, t: number, d = 0.55) {
    return this.from(sel, { opacity: 0, scale: 0.82 }, { opacity: 1, scale: 1, duration: d, ease: M.ease.spring }, t);
  }
  fade(sel: string, t: number, d: number = M.enter) {
    return this.from(sel, { opacity: 0 }, { opacity: 1, duration: d, ease: "power1.out" }, t);
  }
  /** Chữ hiện theo từng từ (stagger theo nhịp lời). */
  words(sel: string, t: number, d = 0.55, stagger: number = M.stagger) {
    return this.from(`${sel} .w`, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: d, ease: M.ease.enter, stagger }, t);
  }
  /** Vẽ nét SVG (pathLength=1). */
  draw(sel: string, t: number, d: number = M.draw) {
    return this.from(sel, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d, ease: M.ease.draw }, t);
  }
  /** Số đếm lên: phần tử chứa số được ghi lại theo thời gian dòng thời gian (không hẹn giờ). */
  count(sel: string, from: number, to: number, t: number, d = 0.9, decimals = 2) {
    const k = 10 ** decimals;
    this.js += `(function(){const el=document.querySelector(${JSON.stringify(sel)});const o={v:${from}};tl.to(o,{v:${to},duration:${r2(d)},ease:"power2.out",onUpdate:function(){el.textContent=String(Math.round(o.v*${k})/${k}).replace("-","−").replace(".",",");}},${r2(t)});})();\n`;
    return this;
  }
}

/** Biến CSS từ theme + bảng màu. */
export function cssVars(th: Theme): string {
  const c = Object.entries(th)
    .filter(([, v]) => typeof v === "string" && String(v).startsWith("#"))
    .map(([k, v]) => `--${k}:${v};`)
    .join("");
  const p = Object.entries(tokens.palette)
    .filter(([k]) => !k.startsWith("$"))
    .map(([k, v]) => `--p-${k}:${v};`)
    .join("");
  return `:root{${c}${p}--ui:"${tokens.fonts.ui}",sans-serif;--read:"${tokens.fonts.read}",serif}`;
}

export const fontFaces = () => tokens.fonts.files.map((f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:normal;src:url("assets/fonts/${f.file}") format("truetype")}`).join("\n");

export const rgba = (h: string, a: number) => {
  const n = Number.parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Tách chữ đã escape thành từng từ (span.w) để hiện stagger. */
export const wordSpans = (escaped: string) =>
  escaped
    .split(/(\s+)/)
    .map((w) => (!w || /^\s+$/.test(w) ? w : `<span class="w">${w}</span>`))
    .join("");

/** Tiêu đề: tô màu nhấn cho cụm khái niệm chính (trước dấu ":" / "qua" / "của"…; không có thì 2 từ cuối). */
export function titleHtml(title: string, brAt?: number): string {
  const m = title.match(/^(.+?)(\s*:\s*|\s+(?:qua|của|trong|với|bằng|là)\s+)(.+)$/);
  if (m) {
    // tiêu đề dài: xuống dòng đúng ranh giới cụm từ khoá (không cắt giữa khái niệm)
    const br = brAt !== undefined && title.length > brAt && (m[1] as string).length <= brAt && ((m[2] as string) + (m[3] as string)).trim().length <= brAt;
    const rest = (m[2] as string) + (m[3] as string);
    if (!br) return `<span class="kw">${wordSpans(esc(m[1] as string))}</span>${wordSpans(esc(rest))}`;
    const colon = (m[2] as string).trim() === ":";
    return `<span class="kw">${wordSpans(esc(m[1] as string))}</span>${colon ? '<span class="w">:</span>' : ""}<br>${wordSpans(esc(colon ? (m[3] as string) : rest.trim()))}`;
  }
  const ws = title.split(/\s+/);
  if (ws.length >= 4) return `${wordSpans(esc(ws.slice(0, -2).join(" ")))} <span class="kw">${wordSpans(esc(ws.slice(-2).join(" ")))}</span>`;
  return wordSpans(esc(title));
}

export type Layout = "split" | "wide";
export type Caption = { t: number; text: string };
/** Bố cục 2 cột: trái (cột 1–5) tiêu đề + thẻ ghi chú; phải (cột 7–12) hình. */
export const SPLIT = { leftX: colX(0), leftW: spanW(5), figX: colX(6), figW: spanW(6) };

/** Đầu cảnh: dòng phân loại (xám, in hoa), nhãn nhấn, tiêu đề serif có từ khoá tô màu. Trả đáy đầu cảnh để thân cảnh bắt đầu đúng lưới. */
export function header(o: { meta: string; eyebrow?: string; title?: string; layout: Layout }, tl: Tl) {
  const maxW = o.layout === "split" ? SPLIT.leftW : spanW(12);
  let html = `<div id="hm" class="meta" style="left:${G.marginX}px;top:${G.metaTop}px">${esc(o.meta)}</div>`;
  tl.fade("#hm", 0.05, 0.6);
  let y = G.metaTop + 46;
  const dup = o.eyebrow && o.title && o.title.toLowerCase().includes(o.eyebrow.toLowerCase());
  if (o.eyebrow && !dup) {
    html += `<div id="he" class="eb" style="left:${G.marginX}px;top:${G.eyebrowTop}px">${esc(o.eyebrow)}</div>`;
    tl.enter("#he", 0.15, 0.6, 10);
    y = G.eyebrowTop + 50;
  }
  if (o.title) {
    const size = TY.title.size;
    const perLine = Math.floor(maxW / (size * 0.47));
    const lines = Math.min(3, Math.ceil(o.title.length / perLine));
    html += `<h1 id="tt" style="left:${G.marginX}px;top:${y}px;width:${maxW}px;font-size:${size}px">${titleHtml(o.title, perLine)}</h1>`;
    tl.words("#tt", 0.3, 0.7, 0.06);
    y += Math.round(lines * size * TY.title.line) + 8;
  }
  return { html, bottom: y };
}

/** Tài liệu HTML hoàn chỉnh (một composition, một dòng thời gian GSAP dừng). */
export function studioDoc(o: { T: number; theme?: ThemeName; layout: Layout; meta: string; eyebrow?: string; title?: string; inner: (ctx: { top: number }) => string; css: string; tl: Tl; captions?: Caption[] }): string {
  const th = tokens.themes[o.theme ?? DEFAULT_THEME];
  const head = new Tl();
  const h = header({ meta: o.meta, eyebrow: o.eyebrow, title: o.title, layout: o.layout }, head);
  const inner = o.inner({ top: h.bottom });
  // dòng lời giảng dưới cùng: đường kẻ mảnh + một câu (không hộp đen); câu trước mờ đi khi câu sau vào
  const caps = (o.captions ?? []).filter((c) => c.text.trim());
  let capHtml = `<div id="rule" style="left:${G.marginX}px;top:${G.ruleY}px;width:${spanW(12)}px"></div>`;
  const ct = new Tl();
  ct.from("#rule", { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: M.ease.move }, 0.2);
  caps.forEach((c, i) => {
    capHtml += `<div id="cp${i}" class="cap" style="left:${G.marginX}px;top:${G.captionTop}px;width:${spanW(12)}px">${wordSpans(esc(c.text))}</div>`;
    ct.words(`#cp${i}`, c.t, 0.45, 0.035);
    const next = caps[i + 1];
    if (next) ct.from(`#cp${i}`, { opacity: 1 }, { opacity: 0, duration: 0.3, ease: M.ease.exit }, r2(next.t - 0.3));
  });
  const css = `${fontFaces()}
${cssVars(th)}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--bg)}
#root{position:absolute;inset:0;overflow:hidden;background:var(--bg);font-family:var(--ui);color:var(--ink);font-feature-settings:"cv11" 1;-webkit-font-smoothing:antialiased}
#fig{position:absolute;inset:0}
.meta{position:absolute;font-size:${TY.meta.size}px;font-weight:600;letter-spacing:${TY.meta.tracking}em;text-transform:uppercase;color:var(--ink3);line-height:1}
.eb{position:absolute;font-size:${TY.eyebrow.size}px;font-weight:700;letter-spacing:${TY.eyebrow.tracking}em;text-transform:uppercase;color:var(--accent);line-height:1}
h1{position:absolute;font-family:var(--read);font-weight:600;line-height:${TY.title.line};color:var(--ink);text-wrap:balance;letter-spacing:-0.01em}
h1 .kw{color:var(--accent)}
.w{display:inline-block;white-space:pre}
#rule{position:absolute;height:2px;background:var(--line);transform-origin:0 50%}
.cap{position:absolute;font-size:${TY.caption.size}px;font-weight:500;line-height:1.3;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card{position:absolute;background:var(--surface);border:2px solid var(--line);border-left:${tokens.stroke.cardBar}px solid var(--accent);border-radius:4px ${tokens.stroke.radius}px ${tokens.stroke.radius}px 4px;padding:22px 30px 24px;box-shadow:${th.shadow}}
.card h3{font-size:40px;font-weight:600;color:var(--ink);line-height:1.25;margin-bottom:8px}
.card p,.card .p{font-size:${TY.note.size}px;line-height:${TY.note.line};color:var(--ink2)}
.katex{font-size:1.06em}
${o.css}`;
  return `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=${W}, height=${H}">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link rel="stylesheet" href="assets/katex/katex.min.css">
<style>${css}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${o.T}" data-width="${W}" data-height="${H}">
${h.html}
<div id="fig">
${inner}
</div>
${capHtml}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${head.js}${o.tl.js}${ct.js}
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>
`;
}

/** Xác suất dạng phân số khi khớp mẫu số nhỏ (≤ 24): 0,625 → 5/8; 0,571 → 4/7. */
export type Frac = { v: number; n?: number; d?: number };
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
export function toFrac(v: number): Frac {
  if (v === 0 || v === 1) return { v, n: v, d: 1 };
  for (let d = 2; d <= 24; d++) {
    const n = Math.round(v * d);
    if (n > 0 && Math.abs(v - n / d) < 6e-4 && gcd(n, d) === 1) return { v, n, d };
  }
  return { v };
}
const red = (n: number, d: number): Frac => {
  const g = gcd(n, d);
  return { v: n / d, n: n / g, d: d / g };
};
export const mulF = (a: Frac, b: Frac): Frac => (a.d && b.d && a.n !== undefined && b.n !== undefined ? red(a.n * b.n, a.d * b.d) : { v: a.v * b.v });
export const addF = (xs: Frac[]): Frac => {
  if (xs.every((x) => x.d && x.n !== undefined)) {
    const d = xs.reduce((a, x) => (a * (x.d as number)) / gcd(a, x.d as number), 1);
    return red(xs.reduce((a, x) => a + ((x.n as number) * d) / (x.d as number), 0), d);
  }
  return { v: xs.reduce((a, x) => a + x.v, 0) };
};
/** LaTeX của xác suất: phân số đứng (\dfrac) hoặc số thập phân phẩy. */
export const fracTex = (f: Frac) => (f.d && f.d > 1 && f.n !== undefined ? `\\dfrac{${f.n}}{${f.d}}` : texNum(f.v));
/** Bề rộng ước (theo ký tự) khi hiển thị. */
export const fracChars = (f: Frac) => (f.d && f.d > 1 ? Math.max(String(f.n).length, String(f.d).length) + 0.6 : vnNum(f.v).length);
