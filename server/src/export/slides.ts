import PptxGenJS from "pptxgenjs";
import { type Slide, type SlideDeck, answerIndex } from "../domain/slides";

const NAVY = "1E2340";
const BLUE = "4F6BED";
const INK = "232842";
const MUTED = "6B7190";
const LINE = "E3E6F0";
const SOFT = "F3F5FD";
const FONT = "Be Vietnam Pro"; // máy không có font này sẽ tự dùng Arial/Calibri

const W = 13.333;
const H = 7.5;
const MX = 0.8;

/** Ước lượng cỡ chữ lớn nhất (pt) để các dòng vừa khung w×h (inch). Co dần như mau.py; fit:"shrink" bổ sung khi mở bằng PowerPoint. */
export function fitFont(lines: string[], w: number, h: number, max: number, min: number, gap = 0.45): number {
  for (let f = max; f >= min; f -= 1) {
    const cpl = Math.max(1, Math.floor(((w - 0.5) * 72) / (f * 0.52)));
    const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil([...l].length / cpl)), 0);
    const total = rows * f * 1.25 + lines.length * f * gap;
    if (total / 72 <= h) return f;
  }
  return min;
}

function bulletRuns(items: string[], size: number, color = INK): PptxGenJS.TextProps[] {
  return items.map((t) => ({
    text: t,
    options: { bullet: { code: "25CF", color: BLUE }, breakLine: true, fontSize: size, color, fontFace: FONT, paraSpaceAfter: Math.round(size * 0.45), indent: Math.round(size * 1.1) },
  }));
}

function footer(pptx: PptxGenJS, s: PptxGenJS.Slide, deck: SlideDeck, dark = false): void {
  s.addText(deck.title, { x: MX, y: H - 0.5, w: 8, h: 0.3, fontSize: 10, color: dark ? "AEB4D6" : MUTED, fontFace: FONT, fit: "shrink" });
  s.slideNumber = { x: W - MX - 1, y: H - 0.5, w: 1, h: 0.3, fontSize: 10, color: dark ? "AEB4D6" : MUTED, fontFace: FONT, align: "right" };
  void pptx;
}

function band(pptx: PptxGenJS, s: PptxGenJS.Slide, title: string): void {
  s.background = { color: "FFFFFF" };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: W, h: 1.35, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 1.35, w: W, h: 0.07, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
  const f = fitFont([title], W - 2 * MX, 1.0, 32, 20, 0);
  s.addText(title, { x: MX, y: 0.15, w: W - 2 * MX, h: 1.05, fontSize: f, bold: true, color: "FFFFFF", fontFace: FONT, valign: "middle", fit: "shrink" });
}

function card(pptx: PptxGenJS, s: PptxGenJS.Slide, x: number, y: number, w: number, h: number, fill = "FFFFFF"): void {
  s.addShape(pptx.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: LINE, width: 1 }, shadow: { type: "outer", color: "1E2340", opacity: 0.1, blur: 8, offset: 2, angle: 90 } });
}

function renderSlide(pptx: PptxGenJS, deck: SlideDeck, sl: Slide, index: number): void {
  const s = pptx.addSlide();
  const ai = sl.layout === "quiz" ? answerIndex(sl) : null;
  const notes = [ai !== null ? `Đáp án: ${String.fromCharCode(65 + ai)}. ${sl.options?.[ai] ?? ""}` : "", sl.notes ?? ""].filter(Boolean).join("\n");
  if (notes) s.addNotes(notes);
  const bullets = sl.bullets ?? [];

  if (sl.layout === "title") {
    s.background = { color: NAVY };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: H, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
    s.addText("EDUVN", { x: 1.1, y: 0.7, w: 4, h: 0.4, fontSize: 14, bold: true, color: "AEB4D6", fontFace: FONT, charSpacing: 4 });
    const f = fitFont([sl.title], W - 2.6, 2.6, 48, 26, 0);
    s.addText(sl.title, { x: 1.1, y: 2.0, w: W - 2.2, h: 2.6, fontSize: f, bold: true, color: "FFFFFF", fontFace: FONT, valign: "middle", fit: "shrink" });
    s.addShape(pptx.ShapeType.rect, { x: 1.1, y: 4.8, w: 1.6, h: 0.08, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
    const sub = bullets.length ? bullets : [deck.subtitle ?? ""].filter(Boolean);
    if (sub.length) {
      const fs = fitFont(sub, W - 2.6, 1.5, 22, 14, 0.2);
      s.addText(sub.map((t) => ({ text: t, options: { breakLine: true, fontSize: fs, color: "D5D9F0", fontFace: FONT } })), { x: 1.1, y: 5.05, w: W - 2.2, h: 1.6, valign: "top", fit: "shrink" });
    }
    return;
  }

  if (sl.layout === "section") {
    s.background = { color: BLUE };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.35, h: H, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    const f = fitFont([sl.title], W - 2.6, 2.4, 54, 28, 0);
    s.addText(sl.title, { x: 1.1, y: 2.2, w: W - 2.2, h: 1.9, fontSize: f, bold: true, color: "FFFFFF", fontFace: FONT, valign: "bottom", fit: "shrink" });
    s.addShape(pptx.ShapeType.rect, { x: 1.1, y: 4.3, w: 1.6, h: 0.08, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 0 } });
    if (bullets[0]) {
      const fs = fitFont([bullets[0]], W - 2.6, 1.6, 28, 16, 0);
      s.addText(bullets[0], { x: 1.1, y: 4.55, w: W - 2.2, h: 1.7, fontSize: fs, color: "FFFFFF", fontFace: FONT, valign: "top", fit: "shrink" });
    }
    footer(pptx, s, deck, true);
    return;
  }

  band(pptx, s, sl.title);
  const top = 1.8;
  const bh = H - top - 0.75;

  if (sl.layout === "bullets") {
    const f = fitFont(bullets, W - 2 * MX, bh, 28, 16);
    s.addText(bulletRuns(bullets, f), { x: MX, y: top, w: W - 2 * MX, h: bh, valign: "top", fit: "shrink" });
  } else if (sl.layout === "two_column") {
    const cw = (W - 2 * MX - 0.4) / 2;
    const cols: [string[], number][] = [[sl.left ?? [], MX], [sl.right ?? [], MX + cw + 0.4]];
    const f = Math.min(...cols.map(([c]) => fitFont(c, cw - 0.4, bh - 0.4, 24, 14)));
    for (const [items, x] of cols) {
      card(pptx, s, x, top, cw, bh, SOFT);
      s.addText(bulletRuns(items, f), { x: x + 0.2, y: top + 0.2, w: cw - 0.4, h: bh - 0.4, valign: "top", fit: "shrink" });
    }
  } else {
    const opts = sl.options ?? [];
    const q = sl.question ?? "";
    const fq = fitFont([q], W - 2 * MX, 1.5, 28, 18, 0);
    s.addText(q, { x: MX, y: top - 0.1, w: W - 2 * MX, h: 1.5, fontSize: fq, bold: true, color: INK, fontFace: FONT, valign: "middle", fit: "shrink" });
    const cols = opts.length <= 3 ? 1 : 2;
    const rows = Math.ceil(opts.length / cols);
    const gap = 0.25;
    const ow = (W - 2 * MX - gap * (cols - 1)) / cols;
    const oy = top + 1.55;
    const oh = Math.min(1.0, (H - oy - 0.75 - gap * (rows - 1)) / rows);
    const fo = Math.min(...opts.map((o) => fitFont([o], ow - 1.1, oh - 0.1, 22, 13, 0)));
    opts.forEach((o, i) => {
      const x = MX + (i % cols) * (ow + gap);
      const y = oy + Math.floor(i / cols) * (oh + gap);
      card(pptx, s, x, y, ow, oh);
      s.addShape(pptx.ShapeType.ellipse, { x: x + 0.2, y: y + (oh - 0.55) / 2, w: 0.55, h: 0.55, fill: { color: BLUE }, line: { color: BLUE, width: 0 } });
      s.addText(String.fromCharCode(65 + i), { x: x + 0.2, y: y + (oh - 0.55) / 2, w: 0.55, h: 0.55, align: "center", valign: "middle", fontSize: 18, bold: true, color: "FFFFFF", fontFace: FONT });
      s.addText(o, { x: x + 0.95, y, w: ow - 1.1, h: oh, fontSize: fo, color: INK, fontFace: FONT, valign: "middle", fit: "shrink" });
    });
  }
  footer(pptx, s, deck);
  void index;
}

export async function renderSlidesPptx(deck: SlideDeck): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in (16:9)
  pptx.title = deck.title;
  pptx.subject = deck.subject ?? "";
  pptx.company = "EDUVN";
  pptx.theme = { headFontFace: FONT, bodyFontFace: FONT };
  deck.slides.forEach((sl, i) => renderSlide(pptx, deck, sl, i));
  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}
