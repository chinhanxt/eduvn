// Nội dung EDUVN → trang SVG cho ppt-master: bài giảng AI (P5), bộ slide (P3), giáo án → slide.
// Thuần (không I/O): ảnh data: URL được tách ra `images` để lớp dựng ghi thành tệp.
import { latexToPlain } from "../../domain/mathText";
import { type Slide as DeckSlide, type SlideDeck, answerIndex } from "../../domain/slides";
import type { StoredScene } from "../aiLessons/types";
import { estimateMs } from "../aiLessons/types";
import { type ChartIn, type Para, type Style, type TableCell, chartBlock, esc, formulaBlock, hexColor, layoutText, n, parseRich, plainParas, qrPath, scalePath, tableBlock, textOn, textWidth } from "./svg";

export type Canvas = { W: number; H: number };
export const CANVAS_169: Canvas = { W: 1280, H: 720 };

/** Hiệu ứng xuất hiện của 1 nhóm: `at` giây kể từ đầu trang (có lời đọc) hoặc theo thứ tự bấm. */
export type Reveal = { group: string; at: number; effect?: string };
export type Page = {
  stem: string;
  svg: string;
  notes?: string;
  /** Tệp mp3 lời giảng của trang theo thứ tự (lớp dựng ghép thành 1 tệp). */
  audio?: { file?: string; ms: number }[];
  reveals?: Reveal[];
  /** Bố cục nên dùng khi đổ vào mẫu .pptx của trường. */
  layout: "title" | "section" | "content" | "titleOnly" | "blank";
  /** Tên hình chữ sẽ thành placeholder của mẫu. */
  ph?: { title?: string; subtitle?: string; body?: string };
};
export type BuildCtx = { canvas: Canvas; style: Style; images: Map<string, string>; qrUrl?: string; eyebrow?: string; template?: boolean };

const rect = (x: number, y: number, w: number, h: number, fill: string, extra = "") => `<rect x="${n(x)}" y="${n(y)}" width="${n(Math.max(w, 0.5))}" height="${n(Math.max(h, 0.5))}" fill="${esc(fill)}"${extra}/>`;
const g = (id: string, b: [number, number, number, number], body: string) => `<g id="${esc(id)}" data-pptx-bounds="${b.map(n).join(" ")}">${body}</g>`;
const safeId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "-").replace(/^[^A-Za-z]/, "e$&").slice(0, 60);

function page(c: BuildCtx, body: string): string {
  const { W, H } = c.canvas;
  const bg = c.template || c.style.transparentBg ? "" : `<rect id="nen" data-pptx-role="background" x="0" y="0" width="${W}" height="${H}" fill="${c.style.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${n(W)} ${n(H)}" width="${n(W)}" height="${n(H)}" lang="vi-VN" font-family="${esc(c.style.body)}">${bg}${body}</svg>`;
}

/** Ảnh data: URL → tên tệp trong images/ (khử trùng lặp). */
function imageRef(c: BuildCtx, src: string): string | null {
  const m = /^data:image\/(png|jpe?g|gif|svg\+xml|webp);base64,/i.exec(src);
  if (!m) return null;
  const ext = m[1]!.toLowerCase().replace("jpeg", "jpg").replace("svg+xml", "svg");
  if (ext === "webp" || ext === "gif") return null;
  for (const [name, data] of c.images) if (data === src) return name;
  const name = `anh${c.images.size + 1}.${ext}`;
  c.images.set(name, src);
  return name;
}

// ---------------------------------------------------------------- khung trang "Giấy học thuật"

function chrome(c: BuildCtx, index: number, total: number, label?: string): string {
  if (c.template) return "";
  const { W, H } = c.canvas;
  const mx = W * 0.0625;
  const s = c.style;
  const eb = (label ?? c.eyebrow ?? "").toUpperCase();
  return (
    `<text id="chrome-nhan" data-pptx-role="decoration" x="${n(mx)}" y="${n(H * 0.075)}" font-family="${esc(s.body)}" font-size="${n(H * 0.022)}" letter-spacing="2" fill="${s.muted}">${esc(eb.slice(0, 90))}</text>` +
    `<text id="chrome-so-trang" data-pptx-role="decoration" x="${n(W - mx)}" y="${n(H * 0.075)}" font-family="${esc(s.mono)}" font-size="${n(H * 0.022)}" fill="${s.muted}" text-anchor="end">${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}</text>` +
    `<rect id="chrome-ke" data-pptx-role="decoration" x="${n(mx)}" y="${n(H - H * 0.075)}" width="${n(W - 2 * mx)}" height="1" fill="${s.line}"/>` +
    `<text id="chrome-eduvn" data-pptx-role="decoration" x="${n(mx)}" y="${n(H - H * 0.04)}" font-family="${esc(s.body)}" font-size="${n(H * 0.02)}" fill="${s.muted}">EDUVN</text>`
  );
}

/** Tiêu đề trang: chữ serif đậm, gạch nhấn ngắn màu chính. Trả về đáy tiêu đề. */
function heading(c: BuildCtx, title: string, y: number, size: number): { svg: string; bottom: number } {
  const { W } = c.canvas;
  const mx = W * 0.0625;
  const s = c.style;
  const plain = title.includes("$") ? title : title;
  const t = layoutText(plainParas([plain], { size, color: s.ink, bold: true }), { x: mx, y, w: W - 2 * mx, h: size * 2.6 }, { font: s.head, size, color: s.ink, serif: true, lineHeight: 1.12, id: "tieu-de" });
  const bottom = y + t.height;
  const rule = c.template ? "" : `<rect id="gach-tieu-de" data-pptx-role="decoration" x="${n(mx)}" y="${n(bottom + size * 0.35)}" width="${n(size * 1.6)}" height="${n(Math.max(3, size * 0.08))}" fill="${s.primary}"/>`;
  return { svg: t.svg + rule, bottom: bottom + size * 0.6 };
}

// ---------------------------------------------------------------- P3 bộ slide + giáo án

export function deckPages(deck: SlideDeck, c: BuildCtx): Page[] {
  const total = deck.slides.length;
  return deck.slides.map((sl, i) => deckPage(deck, sl, i, total, c));
}

function bulletsGroup(c: BuildCtx, items: string[], box: [number, number, number, number], size: number, idBase: string, reveals: Reveal[], color?: string): string {
  const s = c.style;
  if (c.template) {
    // đổ vào mẫu: 1 khung chữ duy nhất → placeholder nội dung của mẫu (gạch đầu dòng theo mẫu)
    const t = layoutText(plainParas(items, { size, color: color ?? s.ink }), { x: box[0], y: box[1], w: box[2], h: box[3] }, { font: s.body, size, color: color ?? s.ink, paraGap: 0.45, id: idBase });
    return t.svg;
  }
  const paras = plainParas(items, { size, color: color ?? s.ink, bullet: "•" }).map((p) => ({ ...p, runs: p.runs }));
  // co chữ chung cho cả khối rồi chia nhóm từng ý (để hiện lần lượt)
  const probe = layoutText(paras, { x: box[0], y: box[1], w: box[2], h: box[3] }, { font: s.body, size, color: color ?? s.ink, paraGap: 0.55 });
  const k = probe.height > box[3] * 1.02 ? Math.max(0.55, box[3] / probe.height) : 1;
  let y = box[1];
  const out: string[] = [];
  paras.forEach((p, i) => {
    const sz = size * k;
    const t = layoutText([{ ...p, runs: p.runs.map((r) => ({ ...r, size: sz })) }], { x: box[0], y, w: box[2], h: box[3] }, { font: s.body, size: sz, color: color ?? s.ink, minScale: 1 });
    const id = `${idBase}-${i + 1}`;
    out.push(g(id, [box[0], y - sz * 0.12, box[2], Math.max(t.height, sz) + sz * 0.32], t.svg.replace(/<text x="([\d.]+)" y="([\d.]+)" font-family="[^"]*" font-size="([\d.]+)" fill="[^"]*"( font-weight="700")?>•<\/text>/, (_m, x: string, yy: string, fs: string) => `<text x="${x}" y="${yy}" font-family="${esc(s.body)}" font-size="${fs}" fill="${s.primary}">•</text>`)));
    reveals.push({ group: id, at: -1 });
    y += t.height + sz * 0.55;
  });
  return out.join("");
}

function deckPage(deck: SlideDeck, sl: DeckSlide, i: number, total: number, c: BuildCtx): Page {
  const { W, H } = c.canvas;
  const s = c.style;
  const mx = W * 0.0625;
  const stem = `${String(i + 1).padStart(2, "0")}_${sl.layout}`;
  const ai = sl.layout === "quiz" ? answerIndex(sl) : null;
  const notes = [sl.notes ?? "", ai !== null ? `Đáp án: ${String.fromCharCode(65 + ai)}. ${sl.options?.[ai] ?? ""}` : ""].filter(Boolean).join("\n");
  const reveals: Reveal[] = [];
  const bullets = sl.bullets ?? [];
  if (sl.layout === "title") {
    const head = layoutText(plainParas([sl.title || deck.title], { size: H * 0.085, color: s.ink, bold: true }), { x: mx, y: H * 0.3, w: W * 0.66, h: H * 0.3 }, { font: s.head, size: H * 0.085, color: s.ink, serif: true, lineHeight: 1.08, vAlign: "bottom", id: "tieu-de" });
    const sub = bullets.length ? bullets : [deck.subtitle ?? ""].filter(Boolean);
    const subT = sub.length ? layoutText(plainParas(sub, { size: H * 0.036, color: s.muted }), { x: mx, y: H * 0.66, w: W * 0.6, h: H * 0.18 }, { font: s.body, size: H * 0.036, color: s.muted, id: "phu-de" }).svg : "";
    const deco = c.template ? "" : `${rect(mx, H * 0.625, H * 0.11, Math.max(4, H * 0.008), s.primary, ' id="gach-bia" data-pptx-role="decoration"')}<text id="nhan-bia" data-pptx-role="decoration" x="${n(mx)}" y="${n(H * 0.2)}" font-size="${n(H * 0.024)}" letter-spacing="3" fill="${s.primary}">${esc((c.eyebrow ?? [deck.subject, deck.grade ? `Lớp ${deck.grade}` : ""].filter(Boolean).join(" · ") ?? "BÀI GIẢNG").toUpperCase() || "BÀI GIẢNG")}</text>`;
    const qr = c.qrUrl ? g("ma-qr", [W - mx - H * 0.2, H * 0.62, H * 0.2, H * 0.26], `${qrPath(c.qrUrl, W - mx - H * 0.2, H * 0.62, H * 0.2, s.ink)}<text x="${n(W - mx - H * 0.1)}" y="${n(H * 0.86)}" font-size="${n(H * 0.02)}" fill="${s.muted}" text-anchor="middle">Mở bài trên EDUVN</text>`) : "";
    return { stem, layout: "title", ph: { title: "tieu-de", subtitle: sub.length ? "phu-de" : undefined }, notes, svg: page(c, `${deco}${head.svg}${subT}${qr}`) };
  }
  if (sl.layout === "section") {
    const head = layoutText(plainParas([sl.title], { size: H * 0.075, color: s.ink, bold: true }), { x: mx, y: H * 0.28, w: W - 2 * mx, h: H * 0.26 }, { font: s.head, size: H * 0.075, color: s.ink, serif: true, vAlign: "bottom", id: "tieu-de" });
    const sub = bullets[0] ? layoutText(plainParas([bullets[0]], { size: H * 0.038, color: s.muted }), { x: mx, y: H * 0.6, w: W - 2 * mx, h: H * 0.2 }, { font: s.body, size: H * 0.038, color: s.muted, id: "phu-de" }).svg : "";
    const deco = c.template ? "" : `${rect(mx, H * 0.565, H * 0.11, Math.max(4, H * 0.008), s.primary, ' id="gach-muc" data-pptx-role="decoration"')}${chrome(c, i + 1, total, deck.title)}`;
    return { stem, layout: "section", ph: { title: "tieu-de", subtitle: sub ? "phu-de" : undefined }, notes, svg: page(c, `${deco}${head.svg}${sub}`) };
  }
  const h = heading(c, sl.title, H * 0.11, H * 0.058);
  const top = h.bottom + H * 0.02;
  const bh = H * 0.86 - top;
  let body = "";
  if (sl.layout === "bullets") {
    body = bulletsGroup(c, bullets, [mx, top, W - 2 * mx, bh], H * 0.04, "noi-dung", reveals);
  } else if (sl.layout === "two_column") {
    const gap = W * 0.03;
    const cw = (W - 2 * mx - gap) / 2;
    const cols: [string[], number, string][] = [[sl.left ?? [], mx, s.palette[0]!], [sl.right ?? [], mx + cw + gap, s.palette[1] ?? s.primary]];
    for (const [items, x, accent] of cols) {
      const card = c.template ? "" : `${rect(x, top, cw, bh, s.surface, ' rx="10"')}${rect(x, top, 4, bh, accent)}`;
      body += g(`cot-${x === mx ? "trai" : "phai"}`, [x, top, cw, bh], card + bulletsGroup({ ...c, template: false }, items, [x + 24, top + 22, cw - 44, bh - 44], H * 0.034, `cot-${x === mx ? "trai" : "phai"}-y`, []).replace(/<g id="[^"]+" data-pptx-bounds="[^"]+">|<\/g>/g, ""));
      reveals.push({ group: `cot-${x === mx ? "trai" : "phai"}`, at: -1 });
    }
  } else {
    body = quizBody(c, sl.question ?? "", (sl.options ?? []).map((o) => o), ai, top, reveals, "cau-hoi");
  }
  return { stem, layout: sl.layout === "bullets" && c.template ? "content" : "titleOnly", ph: { title: "tieu-de", ...(sl.layout === "bullets" && c.template ? { body: "noi-dung" } : {}) }, notes, reveals, svg: page(c, `${chrome(c, i + 1, total, deck.title)}${h.svg}${body}`) };
}

/** Câu hỏi + 2–6 phương án dạng thẻ, đáp án hiện sau cùng (tô xanh + nhãn). */
function quizBody(c: BuildCtx, question: string, options: string[], answer: number | null, top: number, reveals: Reveal[], idBase: string): string {
  const { W, H } = c.canvas;
  const s = c.style;
  const mx = W * 0.0625;
  const qh = H * 0.16;
  const q = layoutText(plainParas([question], { size: H * 0.042, color: s.ink, bold: true }), { x: mx, y: top, w: W - 2 * mx, h: qh }, { font: s.body, size: H * 0.042, color: s.ink, vAlign: "middle" });
  let out = g(`${idBase}-de`, [mx, top, W - 2 * mx, qh], q.svg);
  const cols = options.length <= 3 ? 1 : 2;
  const rows = Math.ceil(options.length / cols);
  const gap = H * 0.028;
  const ow = (W - 2 * mx - gap * (cols - 1)) / cols;
  const oy = top + qh + H * 0.03;
  const oh = Math.min(H * 0.13, (H * (answer !== null ? 0.78 : 0.88) - oy - gap * (rows - 1)) / Math.max(1, rows));
  options.forEach((o, i) => {
    const x = mx + (i % cols) * (ow + gap);
    const y = oy + Math.floor(i / cols) * (oh + gap);
    const color = s.palette[i % s.palette.length] ?? s.primary;
    const r = Math.min(oh * 0.32, H * 0.035);
    const label = String.fromCharCode(65 + i);
    const txt = layoutText(plainParas([o], { size: H * 0.034, color: s.ink }), { x: x + r * 2 + 34, y: y + 6, w: ow - r * 2 - 50, h: oh - 12 }, { font: s.body, size: H * 0.034, color: s.ink, vAlign: "middle" });
    out += g(`${idBase}-pa-${label}`, [x, y, ow, oh], `${rect(x, y, ow, oh, "#FFFFFF", ` rx="10" stroke="${s.line}" stroke-width="1.5"`)}<circle cx="${n(x + 18 + r)}" cy="${n(y + oh / 2)}" r="${n(r)}" fill="${color}"/><text x="${n(x + 18 + r)}" y="${n(y + oh / 2 + r * 0.38)}" font-size="${n(r * 1.05)}" font-weight="700" fill="${textOn(color, s.ink)}" text-anchor="middle">${label}</text>${txt.svg}`);
  });
  if (answer !== null && answer >= 0 && answer < options.length) {
    // đáp án hiện sau cùng ở dải riêng dưới các phương án (không đè lên thẻ)
    const y = oy + rows * (oh + gap) - gap + H * 0.025;
    const ah = H * 0.075;
    const id = `${idBase}-dap-an`;
    const label = String.fromCharCode(65 + answer);
    const t = layoutText(plainParas([`Đáp án đúng: ${label}. ${options[answer]}`], { size: H * 0.032, color: s.good, bold: true }), { x: mx + 56, y, w: W - 2 * mx - 72, h: ah }, { font: s.body, size: H * 0.032, color: s.good, vAlign: "middle" });
    out += g(id, [mx, y, W - 2 * mx, ah], `${rect(mx, y, W - 2 * mx, ah, "#EAF4EE", ` rx="10" stroke="${s.good}" stroke-width="1.5"`)}<circle cx="${n(mx + 30)}" cy="${n(y + ah / 2)}" r="${n(ah * 0.28)}" fill="${s.good}"/><path d="M${n(mx + 30 - ah * 0.13)} ${n(y + ah / 2)} l${n(ah * 0.09)} ${n(ah * 0.1)} l${n(ah * 0.17)} ${n(-ah * 0.2)}" fill="none" stroke="#FFFFFF" stroke-width="3"/>${t.svg}`);
    reveals.push({ group: id, at: -1, effect: "entrance_wipe" });
  }
  return out;
}

// ---------------------------------------------------------------- P5 bài giảng AI

type El = { id: string; type: string; left: number; top: number; width: number; height: number; rotate?: number; [k: string]: unknown };
type AiCanvas = { elements: El[]; background?: { type?: string; color?: string; gradient?: { colors?: { pos: number; color: string }[] } }; theme?: { backgroundColor?: string; fontColor?: string } };

/** Toạ độ canvas OpenMAIC (1000 × 562,5) → trang. */
function mapper(c: BuildCtx) {
  const { W, H } = c.canvas;
  const k = Math.min(W / 1000, H / 562.5);
  const ox = (W - 1000 * k) / 2;
  const oy = (H - 562.5 * k) / 2;
  return { k, X: (x: number) => ox + x * k, Y: (y: number) => oy + y * k };
}

function elementSvg(e: El, c: BuildCtx, defColor: string): string {
  const s = c.style;
  const { k, X, Y } = mapper(c);
  const x = X(e.left);
  const y = Y(e.top);
  const w = Math.max(1, e.width * k);
  const h = Math.max(1, (e.height || 1) * k);
  const rot = e.rotate ? ` transform="rotate(${n(e.rotate)} ${n(x + w / 2)} ${n(y + h / 2)})"` : "";
  switch (e.type) {
    case "text": {
      const paras = parseRich(String(e.content ?? ""), k);
      const col = hexColor(e.defaultColor, defColor);
      const fill = typeof e.fill === "string" && e.fill && e.fill !== "transparent" ? rect(x, y, w, h, hexColor(e.fill, "#FFFFFF")) : "";
      const t = layoutText(paras, { x: x + 4, y: y + 2, w: w - 8, h: h - 4 }, { font: s.body, size: 16 * k, color: col, lineHeight: typeof e.lineHeight === "number" ? Math.min(1.6, Math.max(1, e.lineHeight)) : 1.25, vAlign: e.vAlign === "middle" ? "middle" : e.vAlign === "bottom" ? "bottom" : "top" });
      return `${fill}${rot ? `<g${rot}>${t.svg}</g>` : t.svg}`;
    }
    case "shape": {
      const vb = (e.viewBox as [number, number] | undefined) ?? [200, 200];
      const d = scalePath(String(e.path ?? `M0 0 L${vb[0]} 0 L${vb[0]} ${vb[1]} L0 ${vb[1]} Z`), w / (vb[0] || 1), h / (vb[1] || 1), x, y);
      const grad = e.gradient as { colors?: { pos: number; color: string }[]; rotate?: number } | undefined;
      const gid = `gr-${safeId(e.id)}`;
      const defs = grad?.colors?.length ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">${grad.colors.map((cc) => `<stop offset="${n(cc.pos)}%" stop-color="${hexColor(cc.color, s.primary)}"/>`).join("")}</linearGradient></defs>` : "";
      const fillRaw = typeof e.fill === "string" ? e.fill : "";
      const fill = grad?.colors?.length ? `url(#${gid})` : !fillRaw || fillRaw === "transparent" || fillRaw === "none" ? "none" : hexColor(fillRaw, "#FFFFFF");
      const out = e.outline as { color?: string; width?: number; style?: string } | undefined;
      const stroke = out?.width ? ` stroke="${hexColor(out.color, s.ink)}" stroke-width="${n(out.width * k)}"${out.style === "dashed" ? ' stroke-dasharray="6 4"' : ""}` : "";
      const op = typeof e.opacity === "number" && e.opacity < 1 ? ` fill-opacity="${n(e.opacity)}"` : "";
      const flip = e.flipH || e.flipV ? ` transform="translate(${n(e.flipH ? 2 * x + w : 0)} ${n(e.flipV ? 2 * y + h : 0)}) scale(${e.flipH ? -1 : 1} ${e.flipV ? -1 : 1})"` : "";
      const shape = `${defs}<path d="${d}" fill="${fill}"${op}${stroke}${flip}/>`;
      const txt = e.text as { content?: string; defaultColor?: string; align?: string } | undefined;
      let inner = "";
      if (txt?.content) {
        const paras = parseRich(txt.content, k).map((p) => ({ ...p, align: p.align === "left" ? ("center" as const) : p.align }));
        const bg = fill.startsWith("#") ? fill : "#FFFFFF";
        inner = layoutText(paras, { x: x + 8, y: y + 4, w: w - 16, h: h - 8 }, { font: s.body, size: 16 * k, color: hexColor(txt.defaultColor, textOn(bg, defColor)), vAlign: txt.align === "top" ? "top" : txt.align === "bottom" ? "bottom" : "middle" }).svg;
      }
      return rot ? `<g${rot}>${shape}${inner}</g>` : shape + inner;
    }
    case "line": {
      const st = e.start as [number, number];
      const en = e.end as [number, number];
      const pts = (e.points as string[] | undefined) ?? ["", ""];
      const col = hexColor(e.color, s.ink);
      const mid = `ar-${safeId(e.id)}`;
      const defs = pts[0] === "arrow" || pts[1] === "arrow" ? `<defs><marker id="${mid}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker></defs>` : "";
      const dash = e.style === "dashed" ? ' stroke-dasharray="8 6"' : e.style === "dotted" ? ' stroke-dasharray="2 5"' : "";
      return `${defs}<line x1="${n(x + st[0] * k)}" y1="${n(y + st[1] * k)}" x2="${n(x + en[0] * k)}" y2="${n(y + en[1] * k)}" stroke="${col}" stroke-width="${n(Math.max(1.5, Number(e.width ?? 2) * k))}"${dash}${pts[0] === "arrow" ? ` marker-start="url(#${mid})"` : ""}${pts[1] === "arrow" ? ` marker-end="url(#${mid})"` : ""}/>`;
    }
    case "image": {
      const ref = imageRef(c, String(e.src ?? ""));
      if (!ref) return rect(x, y, w, h, s.surface, ` stroke="${s.line}" stroke-dasharray="6 4"`);
      return `<image href="../images/${ref}" x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" preserveAspectRatio="none"${rot}/>`;
    }
    case "latex":
      return formulaBlock(`ct-${safeId(e.id)}`, String(e.latex ?? ""), { x, y, w, h }, { size: Math.min(h * 0.6, 44 * k), color: hexColor(e.color, defColor), align: e.align === "left" ? "left" : e.align === "right" ? "right" : "center", font: s.body });
    case "table": {
      const data = (e.data as { text: string; colspan?: number; rowspan?: number; style?: { bold?: boolean; color?: string; backcolor?: string } }[][] | undefined) ?? [];
      const th = (e.theme as { color?: string; rowHeader?: boolean } | undefined) ?? {};
      const rows: TableCell[][] = data.map((r) => r.map((cc) => ({ text: cc.text ?? "", colspan: cc.colspan, rowspan: cc.rowspan, bold: cc.style?.bold, color: cc.style?.color, fill: cc.style?.backcolor })));
      if (rows.length === 0) return "";
      return tableBlock(`bang-${safeId(e.id)}`, rows, { x, y, w, h }, s, { header: !!th.rowHeader, headerFill: th.color ? hexColor(th.color, s.primary) : s.primary, colWidths: e.colWidths as number[] | undefined, fontSize: Math.max(10, Math.min(20, (h / Math.max(1, rows.length)) * 0.42)) });
    }
    case "chart": {
      const d = e.data as { labels: string[]; legends: string[]; series: number[][] } | undefined;
      if (!d?.series?.length) return "";
      const map: Record<string, ChartIn["type"]> = { bar: "bar", column: "column", line: "line", area: "area", pie: "pie", ring: "doughnut", radar: "radar", scatter: "scatter" };
      const type = map[String(e.chartType)] ?? "column";
      const ch: ChartIn = { type, categories: d.labels.map(String), series: d.series.map((v, i) => ({ name: d.legends?.[i] ?? `Dãy ${i + 1}`, values: v.map(Number) })), colors: (e.themeColors as string[] | undefined)?.length ? (e.themeColors as string[]) : s.palette, text: hexColor(e.textColor, s.ink), grid: s.line };
      return chartBlock(`bd-${safeId(e.id)}`, ch, { x, y, w, h }, s);
    }
    case "code": {
      const lines = ((e.lines as { content: string }[] | undefined) ?? []).map((l) => l.content);
      const fs = Math.min(Number(e.fontSize ?? 14) * k, (h - 20) / Math.max(1, lines.length) / 1.4);
      return `${rect(x, y, w, h, "#1E1E1E", ' rx="6"')}<text x="${n(x + 12)}" y="${n(y + 12 + fs)}" font-family="${esc(s.mono)}" font-size="${n(fs)}" fill="#D4D4D4">${lines.map((l, i) => `<tspan x="${n(x + 12)}" dy="${i ? n(fs * 1.4) : 0}">${esc(l || " ")}</tspan>`).join("")}</text>`;
    }
    default:
      return "";
  }
}

function speechOf(sc: StoredScene): { text: string; file?: string; ms: number }[] {
  return (sc.actions ?? []).flatMap((a) => (a.type === "speech" ? [{ text: a.text, file: a.audioFile, ms: a.durationMs ?? estimateMs(a.text) }] : []));
}

/** Thời điểm (giây) mỗi phần tử được nhắc tới lần đầu (spotlight/laser) theo dòng lời giảng. */
export function revealTimes(sc: StoredScene): Map<string, number> {
  const at = new Map<string, number>();
  let t = 0;
  for (const a of sc.actions ?? []) {
    if (a.type === "speech") t += (a.durationMs ?? estimateMs(a.text)) / 1000;
    else if ("elementId" in a && typeof (a as { elementId?: unknown }).elementId === "string") {
      const id = (a as { elementId: string }).elementId;
      if (!at.has(id)) at.set(id, t);
    }
  }
  return at;
}

export type AiLessonMeta = { title: string; subject?: string; grade?: number | null };

export function aiLessonPages(meta: AiLessonMeta, scenes: StoredScene[], c: BuildCtx): Page[] {
  const { W, H } = c.canvas;
  const s = c.style;
  const mx = W * 0.0625;
  const pages: Page[] = [];
  const eyebrow = ["Bài giảng", meta.subject, meta.grade ? `Lớp ${meta.grade}` : ""].filter(Boolean).join(" · ");
  const ctx = { ...c, eyebrow };
  // bìa
  pages.push(
    deckPage({ title: meta.title, subject: meta.subject, grade: meta.grade ?? undefined, slides: [] }, { layout: "title", title: meta.title, bullets: [[meta.subject, meta.grade ? `Lớp ${meta.grade}` : ""].filter(Boolean).join(" · "), `${scenes.length} cảnh · soạn trên EDUVN`].filter(Boolean) }, 0, scenes.length + 1, ctx),
  );
  const total = scenes.length + 1;
  scenes.forEach((sc, si) => {
    const idx = si + 2;
    const stemBase = `${String(idx).padStart(2, "0")}`;
    const speech = speechOf(sc);
    const notes = speech.map((x) => x.text).join("\n\n");
    if (sc.type === "slide") {
      const canvas = (sc.content as unknown as { canvas: AiCanvas }).canvas;
      const bgHex = canvas.background?.type === "gradient" ? hexColor(canvas.background.gradient?.colors?.[0]?.color, "#FFFFFF") : hexColor(canvas.background?.color ?? canvas.theme?.backgroundColor, "#FFFFFF");
      // nền trắng của AI → giấy trắng ngà của hệ; nền màu khác giữ nguyên
      const useBg = luminanceIsWhite(bgHex) ? s.bg : bgHex;
      const defColor = hexColor(canvas.theme?.fontColor, s.ink);
      const times = revealTimes(sc);
      const reveals: Reveal[] = [];
      const { k, Y } = mapper(c);
      let titleId: string | undefined;
      const body = canvas.elements
        .map((e) => {
          const svg = elementSvg(e, ctx, defColor);
          if (!svg) return "";
          const id = `e-${safeId(e.id)}`;
          const { X } = mapper(c);
          const bx = X(e.left);
          const by = Y(e.top);
          const at = times.get(e.id);
          if (at !== undefined && at > 0.3) reveals.push({ group: id, at });
          if (!titleId && e.type === "text" && e.top < 120 && e.height < 140 && (e.width ?? 0) > 300) titleId = id;
          return g(id, [bx, by, Math.max(1, e.width * k), Math.max(1, (e.height || 1) * k)], svg);
        })
        .join("");
      const bg = c.template || s.transparentBg ? "" : `<rect id="nen" data-pptx-role="background" x="0" y="0" width="${W}" height="${H}" fill="${useBg}"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(W)} ${n(H)}" width="${n(W)}" height="${n(H)}" lang="vi-VN" font-family="${esc(s.body)}">${bg}${body}</svg>`;
      void titleId;
      pages.push({ stem: `${stemBase}_canh`, svg, notes, audio: speech.map((x) => ({ file: x.file, ms: x.ms })), reveals, layout: "blank" });
    } else if (sc.type === "quiz") {
      const qs = (sc.content as { questions?: { type: string; question: string; options?: { value: string; label: string }[]; answer?: string[]; analysis?: string }[] }).questions ?? [];
      qs.slice(0, 8).forEach((q, qi) => {
        const reveals: Reveal[] = [];
        const h = heading(ctx, sc.title, H * 0.11, H * 0.05);
        const opts = (q.options ?? []).map((o) => o.label);
        const ans = q.answer?.[0] !== undefined ? (q.options ?? []).findIndex((o) => o.value === q.answer?.[0]) : -1;
        let body = "";
        if (opts.length) body = quizBody(ctx, `Câu ${qi + 1}. ${q.question}`, opts, ans >= 0 && q.type !== "multiple" ? ans : null, h.bottom, reveals, `cau-${qi + 1}`);
        else {
          const t = layoutText(plainParas([`Câu ${qi + 1}. ${q.question}`], { size: H * 0.042, color: s.ink, bold: true }), { x: mx, y: h.bottom, w: W - 2 * mx, h: H * 0.3 }, { font: s.body, size: H * 0.042, color: s.ink });
          const a = layoutText(plainParas([`Đáp án: ${(q.answer ?? []).join(", ") || "—"}`, ...(q.analysis ? [q.analysis] : [])], { size: H * 0.034, color: s.good }), { x: mx + 20, y: h.bottom + H * 0.34, w: W - 2 * mx - 40, h: H * 0.3 }, { font: s.body, size: H * 0.034, color: s.good });
          body = g(`cau-${qi + 1}-de`, [mx, h.bottom, W - 2 * mx, H * 0.3], t.svg) + g(`cau-${qi + 1}-dap-an`, [mx, h.bottom + H * 0.32, W - 2 * mx, H * 0.34], `${rect(mx, h.bottom + H * 0.32, W - 2 * mx, H * 0.32, "#EEF6F0", ' rx="10"')}${a.svg}`);
          reveals.push({ group: `cau-${qi + 1}-dap-an`, at: -1 });
        }
        const key = [`Câu ${qi + 1}: ${(q.answer ?? []).join(", ") || "—"}`, q.analysis ? latexToPlain(q.analysis) : ""].filter(Boolean).join(" — ");
        pages.push({
          stem: `${stemBase}_cau${qi + 1}`,
          svg: page(ctx, `${chrome(ctx, idx, total, `Câu hỏi · ${eyebrow}`)}${h.svg}${body}`),
          notes: [qi === 0 ? notes : "", `Đáp án — ${key}`].filter(Boolean).join("\n\n"),
          audio: qi === 0 ? speech.map((x) => ({ file: x.file, ms: x.ms })) : [],
          reveals,
          layout: "titleOnly",
          ph: { title: "tieu-de" },
        });
      });
    } else {
      const h = heading(ctx, sc.title, H * 0.11, H * 0.058);
      const c2 = sc.content as { widgetType?: string };
      const kind = c2.widgetType === "simulation" ? "mô phỏng" : c2.widgetType === "game" ? "trò chơi" : c2.widgetType === "diagram" ? "sơ đồ" : "hoạt động tương tác";
      const cardW = W - 2 * mx - H * 0.36;
      const msg = layoutText(plainParas([`Cảnh này là ${kind} chạy trong trình phát bài giảng EDUVN.`, "Quét mã QR (hoặc mở bài trên EDUVN) để học sinh thao tác trực tiếp; bản HTML ngoại tuyến cũng chạy được không cần mạng."], { size: H * 0.036, color: s.ink }), { x: mx + 30, y: h.bottom + 30, w: cardW - 60, h: H * 0.42 }, { font: s.body, size: H * 0.036, color: s.ink, paraGap: 0.6 });
      const card = g("tuong-tac", [mx, h.bottom, cardW, H * 0.5], `${rect(mx, h.bottom, cardW, H * 0.5, s.surface, ' rx="12"')}${rect(mx, h.bottom, 5, H * 0.5, s.palette[1] ?? s.primary)}${msg.svg}`);
      const qr = c.qrUrl ? g("ma-qr", [W - mx - H * 0.3, h.bottom, H * 0.3, H * 0.36], `${qrPath(c.qrUrl, W - mx - H * 0.3, h.bottom, H * 0.3, s.ink)}<text x="${n(W - mx - H * 0.15)}" y="${n(h.bottom + H * 0.34)}" font-size="${n(H * 0.022)}" fill="${s.muted}" text-anchor="middle">Mở trên EDUVN</text>`) : "";
      pages.push({ stem: `${stemBase}_tuong-tac`, svg: page(ctx, `${chrome(ctx, idx, total, eyebrow)}${h.svg}${card}${qr}`), notes, audio: speech.map((x) => ({ file: x.file, ms: x.ms })), layout: "titleOnly", ph: { title: "tieu-de" } });
    }
  });
  return pages;
}

const luminanceIsWhite = (hex: string) => /^#F[A-F0-9]F[A-F0-9]F[A-F0-9]$/i.test(hex);

export type { Para };
