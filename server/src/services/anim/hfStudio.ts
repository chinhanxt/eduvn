/** Mẫu HyperFrames phong cách "Giấy học thuật" (Đợt Thẩm mỹ): so_do_venn, cay_xac_suat, dien_giai_tung_buoc + cảnh slide bài giảng.
 * Mỗi mẫu là một cảnh kể chuyện 4–7 beat chia theo thời lượng lời giảng: xuất hiện → nhấn → biến đổi → kết bằng công thức/ý chính.
 * Bố cục lưới 12 cột 1920×1080 (2 cột: chữ trái, hình phải; hoặc rộng); nhãn nằm trong vùng của nó hoặc có đường dẫn; chữ ≥ 36 px.
 * Motion: vẽ nét, morph hình (khung Ω → vòng B), số đếm lên, chữ hiện theo từng từ, tô sáng phần đang giảng + làm mờ phần khác.
 * Chữ của AI luôn escape; công thức do mẫu tự sinh từ số đã kiểm. */
import katex from "katex";
import { esc } from "./hfHtml";
import type { AnimSpec } from "./spec";
import { type Beat, type Caption, type Frac, type ThemeName, H, SPLIT, Tl, VT, W, addF, colX, combo, fitSize, fracChars, fracTex, mulF, r2, rgba, schedule, spanW, studioDoc, texNum, textW, toFrac, vnNum, wordSpans } from "./studio";

type S<T extends string> = Extract<AnimSpec, { template: T }>;
export const STUDIO_TEMPLATES = ["so_do_venn", "cay_xac_suat", "dien_giai_tung_buoc"] as const;
export type StudioSpec = S<(typeof STUDIO_TEMPLATES)[number]>;
export type StudioOpts = { captions?: Caption[] };

const G = VT.grid;
const MO = VT.motion;
const TH = VT.themes.giay;
const tex = (s: string, display = false) => katex.renderToString(s, { throwOnError: false, trust: false, output: "html", displayMode: display });
const hasP = (s: string) => /P\s*\(/.test(s);
/** Chữ + $công thức$: công thức có phân số ở cỡ hiển thị; phần chữ tách từng từ để hiện stagger. */
function richWords(s: string, mark = false): string {
  return s
    .split(/(\$[^$]+\$)/)
    .map((part) => {
      if (!(part.length > 2 && part.startsWith("$") && part.endsWith("$"))) return wordSpans(esc(part.replace(/"([^"]*)"/g, "“$1”")));
      const src = part.slice(1, -1);
      const big = /\\d?frac|\\sum|\\int|\\sqrt/.test(src) ? `\\displaystyle ${src}` : src;
      const html = katex.renderToString(big, { throwOnError: false, trust: false, output: "html" });
      return `<span class="w${mark ? " mk" : ""}">${html}</span>`;
    })
    .join("");
}

export function studioHtml(spec: StudioSpec, theme: ThemeName, opts: StudioOpts = {}): string {
  if (spec.template === "so_do_venn") return venn(spec, theme, opts);
  if (spec.template === "cay_xac_suat") return tree(spec, theme, opts);
  return steps(spec, theme, opts);
}

/* ----------------------------------------------------------------- Venn */
function venn(spec: S<"so_do_venn">, theme: ThemeName, opts: StudioOpts): string {
  const p = spec.params;
  const T = spec.thoiLuong;
  const xs = p.xacSuat;
  const symbolic = !xs && [p.tenA, p.tenB, p.tenGiao ?? "", ...p.chuaA, ...p.chuaB, ...p.chuaGiao].some(hasP);
  const [cA, cB, cG] = combo("coDien") as [string, string, string];
  const tl = new Tl();
  const css = `
#vs{position:absolute;left:0;top:0;z-index:1}#vo{position:absolute;left:0;top:0;z-index:3}
.vn{position:absolute;font-weight:600;line-height:1.15;white-space:nowrap;z-index:4}
.vn .lt{font-family:var(--read);font-style:italic;font-weight:600;margin-right:14px}
.vn small{display:inline-block;font-size:36px;font-weight:600;margin-top:8px;letter-spacing:.01em;color:${cB};padding-bottom:4px;background-image:linear-gradient(${cB},${cB});background-repeat:no-repeat;background-position:0 100%;background-size:0% 3px}
.vi{position:absolute;z-index:2;text-align:center;font-size:36px;line-height:1.25;font-weight:500;color:var(--ink);text-wrap:balance}
.vnum{position:absolute;z-index:2;font-size:48px;font-weight:700;text-align:center;width:200px;font-variant-numeric:tabular-nums}
.vg{position:absolute;z-index:4;font-weight:600;color:${cG};text-align:center;text-wrap:balance;line-height:1.2}
.om{position:absolute;z-index:2;font-size:40px;color:var(--ink3);font-weight:600;font-variant-numeric:tabular-nums}
.dr{display:flex;align-items:center;gap:18px;height:58px;font-size:40px;color:var(--ink)}
.dr i{flex:none;width:14px;height:14px;border-radius:50%}
.dr .katex{font-size:1em}
.fx{display:flex;align-items:center;flex-wrap:wrap;column-gap:14px;row-gap:6px;font-size:48px;margin:8px 0 10px}
.fx .katex{font-size:1em}
#f3{display:inline-block;padding-bottom:6px;background-image:linear-gradient(${cG},${cG});background-repeat:no-repeat;background-position:0 100%;background-size:0% 3px}
`;
  const inner = ({ top }: { top: number }) => {
    const x0 = SPLIT.figX;
    const w0 = SPLIT.figW;
    const oy = G.stageTop;
    const ob = G.stageBottom;
    const cx = r2(x0 + w0 / 2);
    const R = 220;
    const d = Math.round(R * 1.2);
    const cy = oy + 395;
    const cxA = cx - d / 2;
    const cxB = cx + d / 2;
    const h = r2(Math.sqrt(R * R - (d / 2) ** 2));
    const els: string[] = [];
    const lens = `M${cx},${r2(cy - h)} A${R},${R} 0 0 1 ${cx},${r2(cy + h)} A${R},${R} 0 0 1 ${cx},${r2(cy - h)} Z`;
    const fa = TH.fillAlpha;
    const ring = R + 12;
    els.push(`<svg id="vs" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect id="om" x="${x0}" y="${oy}" width="${w0}" height="${ob - oy}" rx="14" fill="${TH.surface}" stroke="${TH.line}" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
<circle id="caf" cx="${cxA}" cy="${cy}" r="${R}" fill="${cA}" fill-opacity="${fa}"/>
<circle id="cbf" cx="${cxB}" cy="${cy}" r="${R}" fill="${cB}" fill-opacity="${fa}"/>
<path id="lf" d="${lens}" fill="${cG}" fill-opacity="0.2"/>
<circle id="ca" cx="${cxA}" cy="${cy}" r="${R}" fill="none" stroke="${cA}" stroke-width="5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 ${cxA} ${cy})"/>
<circle id="cb" cx="${cxB}" cy="${cy}" r="${R}" fill="none" stroke="${cB}" stroke-width="5" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" transform="rotate(-90 ${cxB} ${cy})"/>
<path id="ls" d="${lens}" fill="none" stroke="${cG}" stroke-width="5" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
<line id="gl" x1="${cx}" y1="${r2(cy + h + 10)}" x2="${cx}" y2="${cy + R + 48}" stroke="${cG}" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
</svg>`);
    // lớp làm mờ phần ngoài B + khung Ω biến hình thành vòng quanh B ("không gian mẫu mới")
    els.push(`<svg id="vo" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<path id="dim" fill-rule="evenodd" fill="${TH.surface}" fill-opacity="0.8" d="M${x0 + 2},${oy + 2} h${w0 - 4} v${ob - oy - 4} h${-(w0 - 4)} Z M${cxB - R},${cy} a${R},${R} 0 1 0 ${2 * R},0 a${R},${R} 0 1 0 ${-2 * R},0 Z"/>
<rect id="mo" x="${x0}" y="${oy}" width="${w0}" height="${ob - oy}" rx="14" ry="14" fill="none" stroke="${cB}" stroke-width="6"/>
</svg>`);
    const nameOf = (letter: string, name: string) => (new RegExp(`(^|\\s)${letter}($|\\s|:)`).test(name) ? esc(name) : `<span class="lt">${letter}</span><span style="color:var(--ink)">${esc(name)}</span>`);
    const bandTop = oy + 30;
    const nameW = w0 / 2 - 48;
    const sA = fitSize(p.tenA, nameW - 50, 44);
    const sB = fitSize(p.tenB, nameW - 50, 44);
    els.push(`<div id="na" class="vn" style="right:${W - (cx - 24)}px;top:${bandTop}px;font-size:${sA}px;color:${cA};text-align:right;max-width:${nameW}px">${nameOf("A", p.tenA)}</div>`);
    els.push(`<div id="nb" class="vn" style="left:${cx + 24}px;top:${bandTop}px;font-size:${sB}px;color:${cB};max-width:${nameW}px">${nameOf("B", p.tenB)}<small id="nbs">${xs || symbolic ? "→ không gian mẫu mới" : ""}</small></div>`);
    // phần tử trong từng vùng (vừa thì nằm trong; không vừa thì đưa sang thẻ bên trái)
    const regionW = { A: d - 40, G: 2 * R - d - 24, B: d - 40 };
    const fits = (items: string[], w: number) => items.every((s) => textW(s, 36, 0.52) <= w * 2 - 20 && s.split(/\s+/).every((wd) => textW(wd, 36, 0.56) <= w));
    const inside = { A: fits(p.chuaA, regionW.A), B: fits(p.chuaB, regionW.B), G: fits(p.chuaGiao, regionW.G) };
    const itemEls = (items: string[], x: number, w: number, id: string) => {
      const n = items.length;
      const lh = 52;
      return items.map((s, i) => {
        const two = textW(s, 36, 0.52) > w;
        const y = cy - ((n - 1) * lh) / 2 + i * lh - (two ? 46 : 23);
        els.push(`<div id="${id}${i}" class="vi" style="left:${r2(x - w / 2)}px;width:${w}px;top:${r2(y)}px">${esc(s)}</div>`);
        return `#${id}${i}`;
      });
    };
    const itA = inside.A ? itemEls(p.chuaA, cx - R, regionW.A, "ia") : [];
    const itB = inside.B ? itemEls(p.chuaB, cx + R, regionW.B, "ib") : [];
    const itG = inside.G ? itemEls(p.chuaGiao, cx, regionW.G, "ig") : [];
    const gName = p.tenGiao ?? "A ∩ B";
    els.push(`<div id="ng" class="vg" style="left:${cx - 260}px;width:520px;top:${cy + R + 54}px;font-size:${fitSize(gName, 500, 40)}px">${esc(gName)}</div>`);
    const nums: { sel: string; v: number }[] = [];
    if (xs) {
      const a = xs.A ?? xs.giao;
      const out = Math.max(1 - (a + xs.B - xs.giao), 0);
      const put = (id: string, x: number, v: number, color: string) => {
        els.push(`<div id="${id}" class="vnum" style="left:${r2(x - 100)}px;top:${r2(cy - 30)}px;color:${color}">0</div>`);
        nums.push({ sel: `#${id}`, v });
      };
      put("pa", cx - R, Math.max(a - xs.giao, 0), cA);
      put("pg", cx, xs.giao, cG);
      put("pb", cx + R, Math.max(xs.B - xs.giao, 0), cB);
      els.push(`<div id="po" class="om" style="left:${x0 + 30}px;top:${ob - 66}px">0</div>`);
      nums.push({ sel: "#po", v: out });
    }
    els.push(`<div id="omg" class="om" style="left:${x0 + 30}px;top:${oy + 22}px;font-size:46px">${tex("\\Omega")}</div>`);

    // cột trái: thẻ dữ kiện + thẻ kết luận (thẻ 2 trượt vào sau)
    const lx = SPLIT.leftX;
    const lw = SPLIT.leftW;
    const dot = (c: string) => `<i style="background:${c}"></i>`;
    const rows: string[] = [];
    let k2Title: string;
    let k2Body: string;
    if (xs) {
      const a = xs.A ?? xs.giao;
      if (xs.A !== undefined) rows.push(`${dot(cA)}${tex(`P(\\textcolor{${cA}}{A}) = ${texNum(a)}`)}`);
      rows.push(`${dot(cB)}${tex(`P(\\textcolor{${cB}}{B}) = ${texNum(xs.B)}`)}`);
      rows.push(`${dot(cG)}${tex(`P(\\textcolor{${cA}}{A}\\cap \\textcolor{${cB}}{B}) = ${texNum(xs.giao)}`)}`);
      const res = xs.giao / xs.B;
      k2Title = `Biết ${tex(`\\textcolor{${cB}}{B}`)} đã xảy ra`;
      k2Body = `<div class="fx"><span id="f1">${tex(`P(A\\mid B)=\\dfrac{\\textcolor{${cG}}{P(A\\cap B)}}{\\textcolor{${cB}}{P(B)}}`, false).replace('class="katex"', 'class="katex" style="font-size:1em"')}</span><span id="f2">${tex(`=\\dfrac{${texNum(xs.giao)}}{${texNum(xs.B)}}=\\mathbf{${texNum(res)}}`)}</span></div><div id="f3" class="p">Trong ${tex("B")}, phần thuộc ${tex("A")} chiếm <b style="color:var(--ink)">${vnNum(Math.round(res * 1000) / 10)}%</b></div>`;
    } else {
      const list = (items: string[], ins: boolean) => (items.length && !ins ? `: ${items.map((s) => esc(s)).join(", ")}` : "");
      rows.push(`${dot(cA)}<span>Chỉ ${tex("A")}${list(p.chuaA, inside.A)}</span>`);
      rows.push(`${dot(cB)}<span>Chỉ ${tex("B")}${list(p.chuaB, inside.B)}</span>`);
      rows.push(`${dot(cG)}<span>Cả hai${list(p.chuaGiao, inside.G)}</span>`);
      if (symbolic) {
        k2Title = `Biết ${tex("B")} đã xảy ra`;
        k2Body = `<div class="fx"><span id="f1">${tex(`P(A\\mid B)=\\dfrac{\\textcolor{${cG}}{P(A\\cap B)}}{\\textcolor{${cB}}{P(B)}}`)}</span></div><div id="f3" class="p">Chỉ xét các kết quả nằm trong ${tex("B")}</div>`;
      } else {
        const g = p.chuaGiao.length ? `{ ${p.chuaGiao.map((s) => esc(s)).join(", ")} }` : esc(p.tenGiao ?? "phần chung");
        k2Title = "Ý chính";
        k2Body = `<div class="fx"><span id="f1">${tex("A\\cap B")} <span style="font-weight:600;color:${cG}">= ${g}</span></span></div><div id="f3" class="p">Phần chung thuộc cả ${tex("A")} và ${tex("B")}</div>`;
      }
    }
    const k1Top = top + 30;
    const k1H = 50 + rows.length * 58 + 52;
    let k2Top = k1Top + k1H + 24;
    // thẻ kết: tiêu đề + công thức (phân số đứng, có thể 2 dòng) + câu ý chính
    const k2H = 50 + (xs ? 240 : 120) + 60 + 52;
    const stackOk = k2Top + k2H <= G.stageBottom;
    if (!stackOk) k2Top = k1Top;
    els.push(`<div id="k1" class="card" style="left:${lx}px;top:${k1Top}px;width:${lw}px"><h3>${xs ? "Dữ kiện" : "Các vùng"}</h3>${rows.map((r, i) => `<div id="r${i}" class="dr">${r}</div>`).join("")}</div>`);
    els.push(`<div id="k2" class="card" style="left:${lx}px;top:${k2Top}px;width:${lw}px;border-left-color:${xs || symbolic ? cB : cG}"><h3>${k2Title}</h3>${k2Body}</div>`);

    // ---- dòng thời gian ----
    const wts = xs || symbolic ? [1, 1.1, 1.1, 1.3, 1.4, 1.2, 1.3] : [1, 1.3, 1.3, 1.4, 1.4];
    const B = schedule(T, wts);
    const rowOn = (i: number, t: number) => {
      tl.enter(`#r${i}`, t, 0.6, 14);
      if (i > 0) tl.to(`#r${i - 1}`, { opacity: 0.5, duration: 0.5 }, t);
    };
    let k = 0;
    const b0 = B[k++] as Beat;
    tl.draw("#om", b0.at(0, 3), b0.d(1.4));
    tl.fade("#omg", b0.at(1, 3), 0.6);
    tl.enter("#k1", b0.at(2, 3), 0.7, 18);
    tl.from("#mo", { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0);
    tl.from("#dim", { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0);
    tl.from("#nbs", { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0);
    const b1 = B[k++] as Beat;
    tl.draw("#ca", b1.at(0, 3), b1.d(1.3, 2));
    tl.from("#caf", { opacity: 0 }, { opacity: 1, duration: b1.d(1, 2) }, b1.at(1, 3) - 0.3);
    tl.words("#na", b1.at(1, 3), 0.5);
    tl.from("#na", { opacity: 0 }, { opacity: 1, duration: 0.3 }, b1.at(1, 3));
    rowOn(0, b1.at(2, 3));
    itA.forEach((s, i) => tl.enter(s, b1.at(2, 3) + i * 0.15, 0.5, 10));
    const b2 = B[k++] as Beat;
    tl.draw("#cb", b2.at(0, 3), b2.d(1.3, 2));
    tl.from("#cbf", { opacity: 0 }, { opacity: 1, duration: b2.d(1, 2) }, b2.at(1, 3) - 0.3);
    tl.from("#nb", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: MO.ease.enter }, b2.at(1, 3));
    rowOn(1, b2.at(2, 3));
    itB.forEach((s, i) => tl.enter(s, b2.at(2, 3) + i * 0.15, 0.5, 10));
    // phần giao: tô, viền, đường dẫn tới nhãn, số từng vùng đếm lên
    const b3 = B[k++] as Beat;
    tl.from("#lf", { opacity: 0 }, { opacity: 1, duration: 0.6 }, b3.at(0, 4));
    tl.draw("#ls", b3.at(0, 4), b3.d(1, 4));
    tl.draw("#gl", b3.at(1, 4), 0.5);
    tl.enter("#ng", b3.at(1, 4) + 0.25, 0.6, 10);
    rowOn(2, b3.at(2, 4));
    itG.forEach((s, i) => tl.enter(s, b3.at(2, 4) + i * 0.15, 0.5, 10));
    nums.forEach((nm, i) => {
      const t = r2(b3.at(2, 4) + i * 0.2);
      tl.pop(nm.sel, t, 0.5);
      tl.count(nm.sel, 0, nm.v, t, 0.9, 3);
    });
    if (xs || symbolic) {
      // biết B → khung Ω biến hình thành vòng ôm B, ngoài B mờ đi
      const b4 = B[k++] as Beat;
      const t4 = b4.at(0, 3);
      tl.to("#mo", { opacity: 1, duration: 0.3 }, t4);
      tl.to("#mo", { attr: { x: cxB - ring, y: cy - ring, width: 2 * ring, height: 2 * ring, rx: ring, ry: ring }, duration: b4.d(1.6, 2), ease: MO.ease.move }, r2(t4 + 0.1));
      tl.to("#dim", { opacity: 1, duration: b4.d(1.2, 2), ease: "power1.inOut" }, r2(t4 + 0.4));
      tl.to("#na", { opacity: MO.dim, duration: 0.8 }, r2(t4 + 0.4));
      tl.to("#omg", { opacity: MO.dim, duration: 0.8 }, r2(t4 + 0.4));
      tl.to("#nbs", { opacity: 1, duration: 0.6 }, b4.at(1, 3));
      // nhấn khái niệm mới: gạch chân quét dưới "không gian mẫu mới"
      tl.from("#nbs", { backgroundSize: "0% 3px" }, { backgroundSize: "100% 3px", duration: 0.9, ease: MO.ease.move }, b4.at(2, 3));
      tl.from("#nbs", { x: -12 }, { x: 0, duration: 0.6, ease: MO.ease.enter }, b4.at(1, 3));
      if (!stackOk) tl.to("#k1", { opacity: 0, y: -16, duration: 0.5, ease: MO.ease.exit }, b4.at(1, 3));
      else tl.to("#k1", { opacity: 0.55, duration: 0.6 }, b4.at(2, 3));
      // thẻ 2 vào ngay khi thẻ 1 rời (không để cột trái trống)
      tl.from("#k2", { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.8, ease: MO.ease.enter }, stackOk ? b4.at(2, 3) : r2(b4.at(1, 3) + 0.4));
      tl.from("#f1", { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0);
      if (xs) tl.from("#f2", { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0);
      tl.from("#f3", { opacity: 0 }, { opacity: 0, duration: 0.01 }, 0);
      // công thức: tử số = phần giao (tô tím), mẫu số = B
      const b5 = B[k++] as Beat;
      tl.to("#f1", { opacity: 1, duration: 0.7 }, b5.at(0, 3));
      tl.from("#f1", { y: 14 }, { y: 0, duration: 0.7, ease: MO.ease.enter }, b5.at(0, 3));
      tl.from("#ls", { strokeWidth: 5 }, { strokeWidth: 9, duration: 0.6 }, b5.at(1, 3));
      tl.from("#lf", { fillOpacity: 0.2 }, { fillOpacity: 0.34, duration: 0.6 }, b5.at(1, 3));
      tl.from("#mo", { strokeWidth: 6 }, { strokeWidth: 9, duration: 0.6 }, b5.at(2, 3));
      const b6 = B[k++] as Beat;
      if (xs) {
        tl.to("#f2", { opacity: 1, duration: 0.7 }, b6.at(0, 3));
        tl.from("#f2", { x: -20 }, { x: 0, duration: 0.7, ease: MO.ease.enter }, b6.at(0, 3));
      }
      tl.to("#f3", { opacity: 1, duration: 0.6 }, b6.at(1, 3));
      tl.from("#f3", { y: 10 }, { y: 0, duration: 0.6, ease: MO.ease.enter }, b6.at(1, 3));
      // chốt ý: gạch chân quét dưới câu kết
      tl.from("#f3", { backgroundSize: "0% 3px" }, { backgroundSize: "100% 3px", duration: 0.9, ease: MO.ease.move }, b6.at(2, 3));
    } else {
      const b4 = B[k++] as Beat;
      tl.from("#ls", { strokeWidth: 5 }, { strokeWidth: 9, duration: 0.6 }, b4.at(0, 3));
      tl.from("#lf", { fillOpacity: 0.2 }, { fillOpacity: 0.34, duration: 0.6 }, b4.at(0, 3));
      if (!stackOk) tl.to("#k1", { opacity: 0, y: -16, duration: 0.5, ease: MO.ease.exit }, b4.at(1, 3));
      tl.from("#k2", { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.8, ease: MO.ease.enter }, b4.at(1, 3));
      tl.from("#f3", { opacity: 0 }, { opacity: 1, duration: 0.6 }, b4.at(2, 3));
    }
    return els.join("\n");
  };
  return studioDoc({ T, theme, layout: "split", meta: "Sơ đồ Venn", eyebrow: xs || symbolic ? "Xác suất có điều kiện" : "Phần chung · phần riêng", title: spec.tieuDe, inner, css, tl, captions: opts.captions });
}

/* ------------------------------------------------------- Cây xác suất */
/** Màu theo tên nút: tên là màu thật (đỏ, xanh, vàng…) dùng đúng màu đó; còn lại lấy lần lượt theo tổ hợp. Cùng tên → cùng màu ở mọi tầng. */
function nameColors(names: string[]): Map<string, string> {
  const P = VT.palette;
  const real: [RegExp, string][] = [
    [/xanh\s*l[áa]|l[ụu]c/i, P.xanhLa],
    [/đỏ|do\b/i, P.doSon],
    [/v[àa]ng/i, P.vangDam],
    [/t[íi]m/i, P.tim],
    [/h[ồo]ng/i, P.hong],
    [/xanh/i, P.lam],
  ];
  const pool = combo("bienLam");
  const map = new Map<string, string>();
  let i = 0;
  for (const n of names) {
    if (map.has(n)) continue;
    const hit = real.find(([re]) => re.test(n));
    map.set(n, hit ? hit[1] : (pool[i++ % pool.length] as string));
  }
  return map;
}

function tree(spec: S<"cay_xac_suat">, theme: ThemeName, opts: StudioOpts): string {
  const p = spec.params;
  const T = spec.thoiLuong;
  const tl = new Tl();
  const branches = p.cacNhanh;
  type Leaf = { b: number; name: string; edge?: number; ef?: Frac; pf: Frac; prob: number; y: number };
  const leaves: Leaf[] = [];
  const bf = branches.map((b) => toFrac(b.xs));
  branches.forEach((b, bi) => {
    if (b.con?.length)
      for (const c of b.con) {
        const ef = toFrac(c.xs);
        const pf = mulF(bf[bi] as Frac, ef);
        leaves.push({ b: bi, name: c.ten, edge: c.xs, ef, pf, prob: pf.v, y: 0 });
      }
    else leaves.push({ b: bi, name: b.ten, pf: bf[bi] as Frac, prob: b.xs, y: 0 });
  });
  const anyFrac = [...bf, ...leaves.map((l) => l.ef ?? l.pf)].some((f) => f.d && f.d > 1);
  const colors = nameColors([...branches.map((b) => b.ten), ...leaves.map((l) => l.name)]);
  const n = leaves.length;
  const fs = n <= 4 ? 44 : n <= 6 ? 40 : 36;
  const hl = TH.ink;
  const focusC = combo("hoaTim")[1] as string;
  const css = `
#tv{position:absolute;left:0;top:0}
.nd{position:absolute;display:flex;align-items:center;justify-content:center;gap:14px;height:${fs + 34}px;padding:0 26px;border-radius:999px;font-size:${fs}px;font-weight:600;white-space:nowrap;background:var(--surface);border:3px solid var(--line);color:var(--ink);box-shadow:${TH.shadow}}
.nd i{display:block;width:16px;height:16px;border-radius:50%}
.nd.root{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.lf{position:absolute;display:flex;align-items:center;gap:18px;font-size:${fs}px;font-weight:600;white-space:nowrap;height:${fs + 10}px}
.lf i{display:block;width:18px;height:18px;border-radius:50%}
.ppw{position:absolute;width:0;height:0;display:flex;align-items:center;justify-content:center;overflow:visible;z-index:2}
.pp{flex:none;display:flex;align-items:center;justify-content:center;min-height:50px;min-width:70px;padding:4px 12px;border-radius:10px;font-size:38px;font-weight:700;background:var(--bg);color:var(--ink2);border:2px solid var(--line);font-variant-numeric:tabular-nums}
.pp .katex,.rs .katex,.card .katex{font-size:1em}
.rs{position:absolute;text-align:right;font-size:${fs}px;white-space:nowrap;color:var(--ink3);font-variant-numeric:tabular-nums;height:${fs + 10}px;display:flex;align-items:center;justify-content:flex-end;gap:12px}
.rs b{color:var(--ink);font-weight:700}
.rh{position:absolute;font-size:30px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);text-align:right}
.card .fr{font-size:44px;font-weight:600;white-space:nowrap;display:flex;align-items:center;gap:14px}
.card .fr b{color:${focusC}}
`;
  const names = [...new Set(leaves.filter((l) => l.edge !== undefined).map((l) => l.name))];
  const common = names.find((nm) => branches.every((_b, bi) => leaves.some((l) => l.b === bi && l.name === nm)));
  const best = leaves.reduce((a, l) => (l.prob > a.prob ? l : a), leaves[0] as Leaf);
  const inner = ({ top }: { top: number }) => {
    const els: string[] = [];
    const cardH = anyFrac ? 140 : 116;
    const treeTop = top + 40;
    const treeBot = G.stageBottom - cardH - 36;
    const stacked = anyFrac && (treeBot - treeTop) / n >= 100;
    const spacing = Math.min(150, (treeBot - treeTop) / n);
    const y0 = (treeTop + treeBot) / 2 - (spacing * (n - 1)) / 2;
    leaves.forEach((l, i) => (l.y = r2(y0 + i * spacing)));
    const bY = branches.map((_b, bi) => {
      const ls = leaves.filter((l) => l.b === bi);
      return r2(ls.reduce((a, l) => a + l.y, 0) / ls.length);
    });
    const rootY = r2(bY.reduce((a, b) => a + b, 0) / bY.length);
    const ph = (f: Frac) => (stacked || !(f.d && f.d > 1) ? tex(fracTex(f)) : `${f.n}/${f.d}`);
    const plainF = (f: Frac) => (f.d && f.d > 1 ? (stacked ? fracChars(f) : `${f.n}/${f.d}`.length) : vnNum(f.v).length);
    const nodeW = (s: string, dot: boolean) => Math.ceil(textW(s, fs, 0.6) + 60 + (dot ? 30 : 0));
    const goc = p.goc ?? "Bắt đầu";
    const rootW = nodeW(goc, false);
    const l1W = Math.max(...branches.map((b) => nodeW(b.ten, true)));
    const hasKids = leaves.some((l) => l.edge !== undefined);
    const leafW = hasKids ? Math.max(...leaves.filter((l) => l.edge !== undefined).map((l) => Math.ceil(textW(l.name, fs, 0.6)) + 24 + 60)) : 0;
    const resTxt = leaves.map((l) => (l.ef ? `<span>${ph(bf[l.b] as Frac)}</span><span>×</span><span>${ph(l.ef)}</span><span>=</span>` : "<span>=</span>"));
    const resChars = leaves.map((l) => (l.ef ? plainF(bf[l.b] as Frac) + plainF(l.ef) + 5 : 1.5) + plainF(l.pf) + 1);
    const resW = Math.max(...resChars) * fs * 0.6 + 24;
    const left = colX(0);
    const right = W - G.marginX;
    const free = right - left - rootW - l1W - leafW - resW - 40;
    const e1 = Math.max(160, hasKids ? free * 0.5 : free * 0.55);
    const e2 = hasKids ? Math.max(160, free - e1) : 0;
    const xRootR = left + rootW;
    const xL1 = xRootR + e1;
    const xL1R = xL1 + l1W;
    const xLeaf = xL1R + e2;
    const xRes = right;
    const curve = (x1: number, y1: number, x2: number, y2: number) => {
      const m = (x2 - x1) * 0.5;
      return `M${r2(x1)},${r2(y1)} C${r2(x1 + m)},${r2(y1)} ${r2(x2 - m)},${r2(y2)} ${r2(x2)},${r2(y2)}`;
    };
    const bez = (x1: number, y1: number, x2: number, y2: number, t: number) => {
      const m = (x2 - x1) * 0.5;
      const P = [
        [x1, y1],
        [x1 + m, y1],
        [x2 - m, y2],
        [x2, y2],
      ] as const;
      const u = 1 - t;
      const c = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
      return [P.reduce((a, q, i) => a + q[0] * (c[i] as number), 0), P.reduce((a, q, i) => a + q[1] * (c[i] as number), 0)] as const;
    };
    const paths: string[] = [];
    const hls: string[] = [];
    branches.forEach((_b, bi) => {
      const dd = curve(xRootR, rootY, xL1, bY[bi] as number);
      paths.push(`<path id="e${bi}" d="${dd}" fill="none" stroke="${TH.ink3}" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`);
      hls.push(`<path id="he${bi}" d="${dd}" fill="none" stroke="${hl}" stroke-width="8" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`);
    });
    leaves.forEach((l, i) => {
      if (l.edge === undefined) {
        paths.push(`<path id="f${i}" d="M${r2(xL1R + 14)},${l.y} H${r2(xRes - resW - 10)}" fill="none" stroke="${TH.line}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round" opacity="0"/>`);
        return;
      }
      const dd = curve(xL1R, bY[l.b] as number, xLeaf, l.y);
      paths.push(`<path id="f${i}" d="${dd}" fill="none" stroke="${TH.ink3}" stroke-width="3" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`);
      hls.push(`<path id="hf${i}" d="${dd}" fill="none" stroke="${hl}" stroke-width="8" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`);
    });
    els.push(`<svg id="tv" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${paths.join("")}${hls.join("")}</svg>`);
    const ndH = fs + 34;
    els.push(`<div id="n0" class="nd root" style="left:${left}px;top:${r2(rootY - ndH / 2)}px;width:${rootW}px">${esc(goc)}</div>`);
    branches.forEach((b, bi) => {
      els.push(`<div id="nb${bi}" class="nd" style="left:${r2(xL1)}px;top:${r2((bY[bi] as number) - ndH / 2)}px;width:${l1W}px"><i style="background:${colors.get(b.ten)}"></i>${esc(b.ten)}</div>`);
      const [mx, my] = bez(xRootR, rootY, xL1, bY[bi] as number, 0.55);
      els.push(`<div class="ppw" style="left:${r2(mx)}px;top:${r2(my)}px"><div id="p${bi}" class="pp">${ph(bf[bi] as Frac)}</div></div>`);
    });
    leaves.forEach((l, i) => {
      if (l.edge !== undefined) {
        const c = colors.get(l.name);
        els.push(`<div id="lf${i}" class="lf" style="left:${r2(xLeaf - 9)}px;top:${r2(l.y - (fs + 10) / 2)}px;color:${c}"><i id="ld${i}" style="background:${c}"></i><span>${esc(l.name)}</span></div>`);
        const [mx, my] = bez(xL1R, bY[l.b] as number, xLeaf, l.y, spacing < 110 ? 0.8 : 0.7);
        els.push(`<div class="ppw" style="left:${r2(mx)}px;top:${r2(my)}px"><div id="q${i}" class="pp">${ph(l.ef as Frac)}</div></div>`);
      }
      els.push(`<div id="rs${i}" class="rs" style="right:${W - xRes}px;top:${r2(l.y - (fs + 10) / 2)}px;width:${r2(resW)}px">${resTxt[i]}<b id="rv${i}">${ph(l.pf)}</b></div>`);
    });
    els.push(`<div id="rh" class="rh" style="right:${W - xRes}px;top:${top}px;width:${r2(resW + 160)}px">Xác suất nhánh</div>`);
    // thẻ kết luận
    let f: string;
    let kk: string;
    const focus = common ? leaves.filter((l) => l.name === common) : [best];
    if (common) {
      f = `<span>P(<span style="color:${colors.get(common)}">${esc(common)}</span>)</span><span>=</span>${focus.map((l) => `<span>${ph(l.pf)}</span>`).join("<span>+</span>")}<span>=</span><b>${ph(addF(focus.map((l) => l.pf)))}</b>`;
      kk = "Cộng xác suất các nhánh cùng dẫn tới một kết quả";
    } else {
      const l = best;
      f = `${l.ef ? `<span>${ph(bf[l.b] as Frac)}</span><span>×</span><span>${ph(l.ef)}</span><span>=</span>` : ""}<b>${ph(l.pf)}</b>`;
      kk = "Nhân xác suất dọc theo một nhánh";
    }
    els.push(`<div id="bx" class="card" style="left:${left}px;top:${G.stageBottom - cardH}px;height:${cardH}px;display:flex;align-items:center;gap:40px"><div class="fr">${f}</div><div class="p" id="bk">${kk}</div></div>`);

    // ---- dòng thời gian: dựng cây trong ~45% đầu, rồi từng nhánh, rồi kết ----
    const kidsOf = (bi: number) => leaves.map((l, i) => ({ l, i })).filter((x) => x.l.b === bi && x.l.edge !== undefined);
    const wts = [0.8, 1.1, ...branches.filter((_b, bi) => kidsOf(bi).length).map(() => 1.1), ...leaves.map(() => 0.8), 1.5];
    const B = schedule(T, wts);
    let k = 0;
    const b0 = B[k++] as Beat;
    tl.pop("#n0", b0.at(0, 2), 0.6);
    tl.fade("#rh", b0.at(1, 2), 0.6);
    const b1 = B[k++] as Beat;
    branches.forEach((_b, bi) => {
      const t = b1.at(bi, branches.length);
      tl.draw(`#e${bi}`, t, b1.d(0.9, branches.length));
      tl.pop(`#p${bi}`, t + 0.3, 0.5);
      tl.from(`#nb${bi}`, { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.6, ease: MO.ease.enter }, t + 0.45);
    });
    branches.forEach((_b, bi) => {
      const ks = kidsOf(bi);
      if (!ks.length) return;
      const b = B[k++] as Beat;
      tl.from(`#nb${bi}`, { borderColor: TH.line }, { borderColor: colors.get(branches[bi]?.ten ?? "") ?? hl, duration: 0.4 }, b.at(0, ks.length + 1));
      ks.forEach(({ i }, j) => {
        const t = b.at(j, ks.length + 1);
        tl.draw(`#f${i}`, t, b.d(0.8, ks.length + 1));
        tl.pop(`#q${i}`, t + 0.3, 0.5);
        tl.from(`#lf${i}`, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.55, ease: MO.ease.enter }, t + 0.45);
      });
      tl.to(`#nb${bi}`, { borderColor: TH.line, duration: 0.4 }, b.at(ks.length, ks.length + 1));
    });
    branches.forEach((_b, bi) => {
      if (!kidsOf(bi).length) {
        const i = leaves.findIndex((l) => l.b === bi);
        tl.from(`#f${i}`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, b1.at(branches.length - 1, branches.length) + 0.6);
      }
    });
    // từng nhánh: tô đường đi (các phần khác lùi) + phép nhân hiện theo từng số
    leaves.forEach((l, i) => {
      const b = B[k++] as Beat;
      const t = b.at(0, 2);
      const d = b.d(0.7, 2);
      tl.draw(`#he${l.b}`, t, d);
      if (l.edge !== undefined) tl.draw(`#hf${i}`, t + d * 0.6, d);
      tl.from(`#rs${i} > *`, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: MO.ease.enter, stagger: 0.12 }, b.at(1, 2));
      const next = leaves[i + 1];
      const tEnd = r2(b.start + b.slot - 0.05);
      if (next) {
        if (next.b !== l.b) tl.to(`#he${l.b}`, { strokeDashoffset: 1, duration: 0.4, ease: MO.ease.exit }, tEnd);
        if (l.edge !== undefined) tl.to(`#hf${i}`, { strokeDashoffset: 1, duration: 0.4, ease: MO.ease.exit }, tEnd);
      }
    });
    // kết: tô các lá thuộc ý chính, làm mờ phần còn lại, thẻ công thức trượt vào
    const bz = B[k++] as Beat;
    const lastI = n - 1;
    const last = leaves[lastI] as Leaf;
    const focusIdx = new Set(focus.map((l) => leaves.indexOf(l)));
    if (!focusIdx.has(lastI)) {
      tl.to(`#he${last.b}`, { strokeDashoffset: 1, duration: 0.4 }, bz.at(0, 3));
      if (last.edge !== undefined) tl.to(`#hf${lastI}`, { strokeDashoffset: 1, duration: 0.4 }, bz.at(0, 3));
    }
    leaves.forEach((l, i) => {
      if (focusIdx.has(i)) {
        if (i !== lastI) {
          tl.to(`#he${l.b}`, { strokeDashoffset: 0, duration: 0.6 }, bz.at(0, 3));
          if (l.edge !== undefined) tl.to(`#hf${i}`, { strokeDashoffset: 0, duration: 0.6 }, bz.at(0, 3) + 0.3);
        }
        tl.from(`#rv${i}`, { color: TH.ink }, { color: focusC, duration: 0.4 }, bz.at(0, 3) + 0.4);
      } else {
        tl.to(`#rs${i}`, { opacity: MO.dim + 0.1, duration: 0.6 }, bz.at(0, 3));
        if (l.edge !== undefined) tl.to(`#lf${i}`, { opacity: MO.dim + 0.1, duration: 0.6 }, bz.at(0, 3));
      }
    });
    tl.from("#bx", { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: 0.8, ease: MO.ease.enter }, bz.at(1, 3));
    tl.from("#bx .fr > *", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: MO.ease.enter, stagger: 0.1 }, bz.at(1, 3) + 0.2);
    tl.fade("#bk", bz.at(2, 3), 0.6);
    return els.join("\n");
  };
  return studioDoc({ T, theme, layout: "wide", meta: "Cây xác suất", eyebrow: common ? "Xác suất toàn phần" : "Quy tắc nhân", title: spec.tieuDe, inner, css, tl, captions: opts.captions });
}

/* --------------------------------------------------- Diễn giải từng bước */
function steps(spec: S<"dien_giai_tung_buoc">, theme: ThemeName, opts: StudioOpts): string {
  const lines = spec.params.cacDong;
  const n = lines.length;
  const T = spec.thoiLuong;
  const tl = new Tl();
  const conclude = n >= 2;
  const NOTE = /^\s*(lưu ý|chú ý|ghi nhớ|nhận xét)\s*:\s*/i;
  const lastCap = NOTE.test(lines[n - 1] ?? "") ? "Ghi nhớ" : "Kết luận";
  const endColor = combo("hoaTim")[1] as string;
  let css = "";
  const inner = ({ top }: { top: number }) => {
    const t0 = top + 20;
    const avail = G.stageBottom - t0;
    const textMax = spanW(12) - 96;
    // cỡ chữ lớn nhất mà tổng chiều cao vừa vùng sân khấu
    const plain = (s: string) => s.replace(/\$[^$]*\$/g, (m) => "x".repeat(Math.max(2, Math.round((m.length - 2) * 0.55))));
    const fracs = (s: string) => (/\\d?frac/.test(s) ? 1 : 0);
    const gapOf = (f: number) => Math.round(f * 0.45);
    const heightAt = (f: number) =>
      lines.reduce((a, s, i) => {
        const end = conclude && i === n - 1;
        const rows = Math.max(1, Math.ceil(textW(plain(s), f, 0.41) / (textMax - (end ? 70 : 0))));
        return a + rows * f * 1.42 + fracs(s) * f * 0.55 + gapOf(f) + (end ? 36 + 51 : 0);
      }, 0);
    let fs = n <= 3 ? 52 : n <= 5 ? 48 : 44;
    while (fs > 36 && heightAt(fs) > avail) fs -= 2;
    const gap = gapOf(fs);
    const lh = Math.round(fs * 1.42);
    css = `
#lst{position:absolute;left:${colX(0)}px;top:${t0}px;width:${spanW(12)}px;display:flex;flex-direction:column;gap:${gap}px}
.st{position:relative;display:flex;gap:40px;align-items:flex-start;font-family:var(--read);font-size:${fs}px;line-height:1.42;color:var(--ink)}
.st .bd{flex:none;position:relative;z-index:2;display:grid;place-items:center;width:56px;height:56px;margin-top:${Math.round((lh - 56) / 2)}px;border-radius:50%;font-family:var(--ui);font-size:28px;font-weight:700;border:3px solid var(--line);background:var(--bg);color:var(--ink3)}
.st .tx{flex:1;text-wrap:pretty}
.st .katex{font-size:1.02em}
.cn,.cf{position:absolute;left:27px;top:${Math.round(lh / 2)}px;width:3px;height:calc(100% + ${gap}px);border-radius:2px;z-index:1}
.cn{background:var(--line)}.cf{background:var(--accent);transform-origin:50% 0}
.mk{background-image:linear-gradient(${rgba(TH.mark, TH.markAlpha)},${rgba(TH.mark, TH.markAlpha)});background-repeat:no-repeat;background-size:0% 100%;background-position:0 0;border-radius:6px;padding:0 6px;margin:0 -2px}
.st.end .tx{border:2px solid var(--line);border-left:6px solid ${endColor};border-radius:4px 12px 12px 4px;padding:14px 30px 18px;background:var(--surface);box-shadow:${TH.shadow}}
.st.end .ecap{display:block;font-family:var(--ui);font-size:36px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${endColor};margin-bottom:4px;line-height:1.3}
.st.end .bd{margin-top:${Math.round(14 + 51 + (lh - 56) / 2)}px}
`;
    const els = lines.map((s, i) => {
      const end = conclude && i === n - 1;
      const ext = conclude && i === n - 2 ? ` style="height:calc(100% + ${gap + 14 + 51}px)"` : "";
      const conn = i < n - 1 ? `<i class="cn"${ext}></i><i id="c${i}" class="cf"${ext}></i>` : "";
      return `<div id="s${i}" class="st${end ? " end" : ""}">${conn}<div id="d${i}" class="bd">${i + 1}</div><div class="tx" id="x${i}">${end ? `<span class="ecap">${lastCap}</span>` : ""}<span id="t${i}">${richWords(end && lastCap === "Ghi nhớ" ? s.replace(NOTE, "") : s, true)}</span></div></div>`;
    });
    const B = schedule(
      T,
      lines.map((_s, i) => (conclude && i === n - 1 ? 1.4 : 1)),
    );
    B.forEach((b, i) => {
      const end = conclude && i === n - 1;
      const ta = b.at(0, 3);
      tl.from(`#s${i}`, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ta);
      tl.pop(`#d${i}`, ta, 0.5);
      tl.from(`#d${i}`, { backgroundColor: TH.bg, color: TH.ink3, borderColor: TH.line }, { backgroundColor: TH.accent, color: TH.accentInk, borderColor: TH.accent, duration: 0.4 }, ta);
      if (end) tl.from(`#x${i}`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.7, ease: MO.ease.enter }, ta);
      // chữ hiện theo nhịp lời: cả dòng hiện trong ~55% beat (beat dài → chậm như đang đọc)
      const nw = Math.max(1, (lines[i] ?? "").split(/\s+/).length);
      const stg = Math.min(0.3, Math.max(0.03, (b.slot * 0.55) / nw));
      tl.words(`#t${i}`, ta + 0.15, 0.5, r2(stg));
      const tMark = Math.max(b.at(1, 3), r2(ta + 0.15 + nw * stg * 0.85));
      if (i > 0) {
        tl.to(`#d${i - 1}`, { backgroundColor: TH.bg, color: TH.ink3, borderColor: TH.line, duration: 0.4 }, ta);
        tl.from(`#t${i - 1}`, { color: TH.ink }, { color: TH.ink3, duration: 0.5 }, ta);
        tl.to(`#s${i - 1} .mk`, { backgroundSize: "0% 100%", duration: 0.5, ease: MO.ease.exit }, ta);
      }
      // tô phần công thức của dòng đang giảng: dải màu quét trái → phải
      tl.from(`#s${i} .mk`, { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: b.d(0.8, 3), ease: MO.ease.move, stagger: 0.25 }, Math.min(tMark, b.start + b.slot - 0.9));
      // đoạn nối tới bước sau lớn dần suốt beat (chuyển động chậm, liên tục)
      if (i < n - 1) tl.from(`#c${i}`, { scaleY: 0 }, { scaleY: 1, duration: b.slot, ease: "none" }, b.start);
    });
    return `<div id="lst">${els.join("\n")}</div>`;
  };
  // css được điền trong inner (phụ thuộc cỡ chữ) → dựng HTML rồi chèn css vào chỗ giữ
  const html = studioDoc({ T, theme, layout: "wide", meta: "Diễn giải từng bước", eyebrow: "Lời giải", title: spec.tieuDe, inner, css: "/*STEPS*/", tl, captions: opts.captions });
  return html.replace("/*STEPS*/", css);
}

/* ------------------------------------------- Cảnh slide bài giảng (cùng hệ) */
export type SlideScene = { thoiLuong: number; meta: string; eyebrow?: string; tieuDe: string; yChinh: string[]; ghiChu?: { tieuDe: string; noiDung: string }; congThuc?: string; captions?: Caption[] };
/** Slide bài giảng phong cách Giấy học thuật: trái tiêu đề + các ý (hiện theo từng từ, ý đang nói sáng, ý trước lùi); phải công thức lớn + thẻ ghi chú. */
export function slideSceneHtml(s: SlideScene): string {
  const T = s.thoiLuong;
  const tl = new Tl();
  const cs = combo("hoaTim");
  const css = `
.yi{position:relative;display:flex;gap:24px;align-items:baseline;font-size:46px;line-height:1.45;color:var(--ink);text-wrap:pretty}
.yi b{flex:none;font-family:var(--read);font-size:44px;font-weight:600;color:var(--accent);min-width:40px}
.yi .katex{font-size:1em}
#fm{position:absolute;display:flex;align-items:center;justify-content:center;background:var(--sunken);border-radius:14px}
#fm .katex{font-size:76px}
`;
  const inner = ({ top }: { top: number }) => {
    const els: string[] = [];
    const lx = SPLIT.leftX;
    const lw = SPLIT.leftW;
    els.push(`<div id="yl" style="position:absolute;left:${lx}px;top:${top + 36}px;width:${lw}px;display:flex;flex-direction:column;gap:30px">`);
    s.yChinh.forEach((t, i) => els.push(`<div id="y${i}" class="yi"><b>${String(i + 1).padStart(2, "0")}</b><span id="yt${i}">${richWords(t)}</span></div>`));
    els.push("</div>");
    const fx = SPLIT.figX;
    const fw = SPLIT.figW;
    if (s.congThuc) els.push(`<div id="fm" style="left:${fx}px;top:${G.stageTop + 10}px;width:${fw}px;height:330px">${tex(s.congThuc, false)}</div>`);
    if (s.ghiChu) els.push(`<div id="gc" class="card" style="left:${fx}px;top:${G.stageTop + 380}px;width:${fw}px;border-left-color:${cs[1]}"><h3>${esc(s.ghiChu.tieuDe)}</h3><p id="gcp">${richWords(s.ghiChu.noiDung)}</p></div>`);
    const B = schedule(T, [...s.yChinh.map(() => 1), ...(s.congThuc ? [1] : []), ...(s.ghiChu ? [1.2] : [])]);
    let k = 0;
    s.yChinh.forEach((_t, i) => {
      const b = B[k++] as Beat;
      tl.from(`#y${i}`, { opacity: 0 }, { opacity: 1, duration: 0.2 }, b.at(0, 2));
      tl.pop(`#y${i} b`, b.at(0, 2), 0.5);
      tl.words(`#yt${i}`, b.at(0, 2) + 0.1, 0.5, 0.04);
      if (i > 0) tl.from(`#yt${i - 1}`, { color: TH.ink }, { color: TH.ink3, duration: 0.5 }, b.at(0, 2));
    });
    if (s.congThuc) {
      const b = B[k++] as Beat;
      tl.from("#fm", { opacity: 0, clipPath: "inset(0 100% 0 0)" }, { opacity: 1, clipPath: "inset(0 0% 0 0)", duration: b.d(1.1), ease: MO.ease.move }, b.at(0, 2));
    }
    if (s.ghiChu) {
      const b = B[k++] as Beat;
      tl.from("#gc", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.8, ease: MO.ease.enter }, b.at(0, 2));
      tl.words("#gcp", b.at(1, 2), 0.45, 0.03);
    }
    return els.join("\n");
  };
  return studioDoc({ T, layout: "split", meta: s.meta, eyebrow: s.eyebrow, title: s.tieuDe, inner, css, tl, captions: s.captions });
}
