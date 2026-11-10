// Dựng HTML tĩnh cho slide OpenMAIC (JSON slide → HTML). Dùng chung: máy chủ (khung hình video) và trình phát web (iframe srcdoc).
// Ý tưởng từ packages/@openmaic/renderer của OpenMAIC (MIT), viết lại gọn. File thuần: không import Node/DOM.
// Mọi độ dài tính bằng cqw (1000px của canvas = 100cqw) nên co giãn theo khung chứa mà không cần script.

export type Canvas = { id?: string; elements: El[]; background?: { type?: string; color?: string; gradient?: { colors?: { pos: number; color: string }[]; rotate?: number } }; theme?: { backgroundColor?: string; fontColor?: string; fontName?: string } };
export type El = { id: string; type: string; left: number; top: number; width: number; height: number; rotate?: number; [k: string]: unknown };
export type HtmlOpts = { latex: (tex: string) => string; focusId?: string; effect?: "spotlight" | "laser"; subtitle?: string; extraHead?: string };

export const FONT_STACK = "'Be Vietnam Pro','Segoe UI',Roboto,'Noto Sans','DejaVu Sans',Arial,sans-serif";
export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cq = (px: number) => `${Math.round((px / 10) * 1000) / 1000}cqw`;
const css = (c: unknown, fb = "#333333") => (typeof c === "string" && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i.test(c.trim()) ? c.trim() : fb);

/** HTML của ProseMirror: bỏ thẻ/thuộc tính nguy hiểm, đổi px → cqw. */
export function safeRich(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|link|meta)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, "")
    .replace(/(-?\d*\.?\d+)px/g, (_m, n: string) => cq(Number(n)));
}

function box(e: El, h = e.height): string {
  return `left:${cq(e.left)};top:${cq(e.top)};width:${cq(e.width)};height:${cq(h)};${e.rotate ? `transform:rotate(${e.rotate}deg);` : ""}`;
}

function chartSvg(e: El): string {
  const d = e.data as { labels: string[]; legends: string[]; series: number[][] };
  const colors = (e.themeColors as string[] | undefined) ?? ["#5b9bd5", "#ed7d31", "#a5a5a5", "#ffc000", "#4472c4"];
  const W = 400;
  const H = 240;
  const t = String(e.chartType);
  const txt = css(e.textColor, "#444");
  const all = d.series.flat();
  const max = Math.max(1, ...all);
  let body = "";
  if (t === "pie" || t === "ring") {
    const vals = d.series[0] ?? [];
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    let a0 = -Math.PI / 2;
    vals.forEach((v, i) => {
      const a1 = a0 + (v / sum) * Math.PI * 2;
      const r = 100;
      const [x0, y0, x1, y1] = [200 + r * Math.cos(a0), 120 + r * Math.sin(a0), 200 + r * Math.cos(a1), 120 + r * Math.sin(a1)];
      body += `<path d="M200 120 L${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1} Z" fill="${css(colors[i % colors.length], "#5b9bd5")}"/>`;
      a0 = a1;
    });
    if (t === "ring") body += `<circle cx="200" cy="120" r="52" fill="#fff"/>`;
  } else if (t === "line" || t === "area" || t === "radar" || t === "scatter") {
    const n = Math.max(1, (d.labels.length || 2) - 1);
    d.series.forEach((s, si) => {
      const pts = s.map((v, i) => `${30 + (i / n) * 340},${200 - (v / max) * 170}`).join(" ");
      body += `<polyline points="${pts}" fill="none" stroke="${css(colors[si % colors.length], "#5b9bd5")}" stroke-width="3"/>`;
    });
    d.labels.forEach((l, i) => (body += `<text x="${30 + (i / n) * 340}" y="222" font-size="12" text-anchor="middle" fill="${txt}">${esc(l)}</text>`));
  } else {
    const n = d.labels.length || 1;
    const sn = d.series.length || 1;
    const bw = 300 / n / (sn + 0.5);
    d.series.forEach((s, si) =>
      s.forEach((v, i) => {
        const h = (v / max) * 170;
        body += `<rect x="${40 + i * (300 / n) + si * bw}" y="${200 - h}" width="${bw * 0.9}" height="${h}" fill="${css(colors[si % colors.length], "#5b9bd5")}"/>`;
      }),
    );
    d.labels.forEach((l, i) => (body += `<text x="${40 + i * (300 / n) + (bw * sn) / 2}" y="222" font-size="12" text-anchor="middle" fill="${txt}">${esc(l)}</text>`));
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
}

export function elementHtml(e: El, o: Pick<HtmlOpts, "latex">): string {
  const base = `position:absolute;${box(e)}`;
  const id = `data-el="${esc(e.id)}"`;
  switch (e.type) {
    case "text": {
      const va = e.vAlign === "middle" ? "center" : e.vAlign === "bottom" ? "flex-end" : "flex-start";
      const op = typeof e.opacity === "number" ? `opacity:${e.opacity};` : "";
      return `<div ${id} class="el" style="${base}display:flex;flex-direction:column;justify-content:${va};overflow:hidden;color:${css(e.defaultColor)};line-height:${typeof e.lineHeight === "number" ? e.lineHeight : 1.4};font-size:${cq(16)};${e.fill ? `background:${css(e.fill, "transparent")};` : ""}${op}${e.vertical ? "writing-mode:vertical-rl;" : ""}">${safeRich(String(e.content ?? ""))}</div>`;
    }
    case "shape": {
      const vb = (e.viewBox as [number, number]) ?? [200, 200];
      const out = e.outline as { color?: string; width?: number } | undefined;
      const flip = `${e.flipH ? "scaleX(-1) " : ""}${e.flipV ? "scaleY(-1)" : ""}`;
      const text = e.text as { content?: string; defaultColor?: string; align?: string } | undefined;
      const rich = text?.content ? `<div class="shape-text" style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:${text.align === "top" ? "flex-start" : text.align === "bottom" ? "flex-end" : "center"};text-align:center;overflow:hidden;color:${css(text.defaultColor)};font-size:${cq(16)}">${safeRich(text.content)}</div>` : "";
      const grad = e.gradient as { colors?: { pos: number; color: string }[] } | undefined;
      const gid = `g${esc(e.id)}`;
      const defs = grad?.colors?.length ? `<defs><linearGradient id="${gid}">${grad.colors.map((c) => `<stop offset="${c.pos}%" stop-color="${css(c.color)}"/>`).join("")}</linearGradient></defs>` : "";
      const fill = grad?.colors?.length ? `url(#${gid})` : css(e.fill, "#ffffff");
      return `<div ${id} class="el" style="${base}${typeof e.opacity === "number" ? `opacity:${e.opacity};` : ""}"><svg viewBox="0 0 ${vb[0]} ${vb[1]}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;${flip ? `transform:${flip};` : ""}">${defs}<path d="${esc(e.path)}" fill="${fill}" stroke="${out?.width ? css(out.color) : "none"}" stroke-width="${out?.width ?? 0}" vector-effect="non-scaling-stroke"/></svg>${rich}</div>`;
    }
    case "line": {
      const s = e.start as [number, number];
      const t = e.end as [number, number];
      const w = Math.max(s[0], t[0], 1);
      const h = Math.max(s[1], t[1], 1);
      const pts = (e.points as string[] | undefined) ?? ["", ""];
      const col = css(e.color);
      const dash = e.style === "dashed" ? "8 6" : e.style === "dotted" ? "2 5" : "";
      const mk = `<defs><marker id="a${esc(e.id)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col}"/></marker></defs>`;
      return `<svg ${id} class="el" viewBox="0 0 ${w} ${h}" style="position:absolute;left:${cq(e.left)};top:${cq(e.top)};width:${cq(w)};height:${cq(h)};overflow:visible">${mk}<line x1="${s[0]}" y1="${s[1]}" x2="${t[0]}" y2="${t[1]}" stroke="${col}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ""} ${pts[0] === "arrow" ? `marker-start="url(#a${esc(e.id)})"` : ""} ${pts[1] === "arrow" ? `marker-end="url(#a${esc(e.id)})"` : ""}/></svg>`;
    }
    case "image": {
      const src = String(e.src ?? "");
      return /^(data:image\/|https?:\/\/)/.test(src)
        ? `<img ${id} class="el" src="${esc(src)}" alt="" style="${base}object-fit:fill;${e.radius ? `border-radius:${cq(Number(e.radius))};` : ""}"/>`
        : `<div ${id} class="el" style="${base}background:#eef0f7;border:1px dashed #b9bfd8"></div>`;
    }
    case "latex":
      return `<div ${id} class="el" style="${base}display:flex;align-items:center;justify-content:${e.align === "left" ? "flex-start" : e.align === "right" ? "flex-end" : "center"};color:${css(e.color)};font-size:${cq(Math.min(e.height * 0.55, 60, e.width / (Math.max(String(e.latex ?? "").length, 4) * 0.62)))};white-space:nowrap;overflow:hidden">${o.latex(String(e.latex ?? ""))}</div>`;
    case "table": {
      const data = (e.data as { text: string; colspan?: number; rowspan?: number; style?: { bold?: boolean; color?: string; backcolor?: string } }[][]) ?? [];
      const th = (e.theme as { color?: string; rowHeader?: boolean } | undefined) ?? {};
      const rows = data
        .map((r, ri) => `<tr>${r.map((c) => `<td colspan="${c.colspan ?? 1}" rowspan="${c.rowspan ?? 1}" style="border:1px solid #bbb;padding:${cq(4)};${c.style?.bold || (th.rowHeader && ri === 0) ? "font-weight:700;" : ""}${th.rowHeader && ri === 0 ? `background:${css(th.color, "#4472c4")};color:#fff;` : c.style?.backcolor ? `background:${css(c.style.backcolor)};` : ""}">${esc(c.text).replace(/\$([^$]+)\$/g, (_m, t: string) => o.latex(t))}</td>`).join("")}</tr>`)
        .join("");
      return `<div ${id} class="el" style="${base}overflow:hidden;font-size:${cq(14)}"><table style="width:100%;border-collapse:collapse;color:#232842">${rows}</table></div>`;
    }
    case "chart":
      return `<div ${id} class="el" style="${base}">${chartSvg(e)}</div>`;
    case "code": {
      const lines = ((e.lines as { content: string }[]) ?? []).map((l) => esc(l.content)).join("\n");
      return `<pre ${id} class="el" style="${base}margin:0;overflow:hidden;background:#1e1e1e;color:#d4d4d4;padding:${cq(10)};font:${cq(Number(e.fontSize ?? 14))}/1.5 Consolas,'DejaVu Sans Mono',monospace;box-sizing:border-box">${lines}</pre>`;
    }
    default:
      return `<div ${id} class="el" style="${base}background:#eef0f7"></div>`;
  }
}

function bgCss(c: Canvas): string {
  const bg = c.background;
  if (bg?.type === "gradient" && bg.gradient?.colors?.length) return `linear-gradient(${bg.gradient.rotate ?? 180}deg,${bg.gradient.colors.map((x) => `${css(x.color)} ${x.pos}%`).join(",")})`;
  return css(bg?.color ?? c.theme?.backgroundColor, "#ffffff");
}

export const BASE_CSS = `*{box-sizing:border-box}html,body{margin:0;height:100%;background:#fff}body{font-family:${FONT_STACK}}p{margin:0}ul,ol{margin:0;padding-left:1.4em}.stage{container-type:inline-size;position:relative;width:100%;aspect-ratio:1000/562.5;overflow:hidden}.sub{position:absolute;left:50%;transform:translateX(-50%);width:max-content;max-width:90cqw;bottom:2.2cqw;text-align:center;color:#fff;background:rgba(0,0,0,.62);padding:.6cqw 1.6cqw;border-radius:.8cqw;font-size:2.6cqw;line-height:1.35;z-index:20}.spot{position:absolute;border-radius:.8cqw;box-shadow:0 0 0 200cqw rgba(0,0,0,.55);outline:.3cqw solid #ffd24d;z-index:10;pointer-events:none}.laser{position:absolute;width:3cqw;height:3cqw;margin:-1.5cqw 0 0 -1.5cqw;border-radius:50%;background:radial-gradient(circle,#ff2a2a 0 35%,rgba(255,42,42,.35) 36% 100%);z-index:10;pointer-events:none}`;

export function overlayHtml(canvas: Canvas, opts: Pick<HtmlOpts, "focusId" | "effect">): string {
  const f = opts.focusId ? canvas.elements.find((x) => x.id === opts.focusId) : undefined;
  if (!f || !opts.effect) return "";
  const h = f.type === "line" ? Math.max(Number((f.end as number[])?.[1] ?? 0), Number((f.start as number[])?.[1] ?? 0), 8) : f.height;
  const w = f.type === "line" ? Math.max(Number((f.end as number[])?.[0] ?? 0), Number((f.start as number[])?.[0] ?? 0), 8) : f.width;
  if (opts.effect === "laser") return `<div class="laser" style="left:${cq(f.left + w / 2)};top:${cq(f.top + h / 2)}"></div>`;
  return `<div class="spot" style="left:${cq(f.left - 6)};top:${cq(f.top - 6)};width:${cq(w + 12)};height:${cq(h + 12)}"></div>`;
}

/** Phần thân (div.stage) — dùng khi cần nhúng; slideHtml bọc thành tài liệu đầy đủ. */
export function slideBody(canvas: Canvas, o: HtmlOpts): string {
  const els = canvas.elements.map((e) => elementHtml(e, o)).join("");
  return `<div class="stage" style="background:${bgCss(canvas)};font-family:${FONT_STACK}">${els}${overlayHtml(canvas, o)}${o.subtitle ? `<div class="sub">${esc(o.subtitle)}</div>` : ""}</div>`;
}

export function slideHtml(canvas: Canvas, o: HtmlOpts): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${BASE_CSS}</style>${o.extraHead ?? ""}</head><body>${slideBody(canvas, o)}</body></html>`;
}

export type QuizQ = { id?: string; type: string; question: string; options?: { value: string; label: string }[]; answer?: string[]; analysis?: string };

/** Khung cho cảnh quiz: danh sách câu hỏi (có thể kèm đáp án). */
export function quizHtml(title: string, questions: QuizQ[], o: { latex: (t: string) => string; reveal?: boolean; subtitle?: string; extraHead?: string }): string {
  const m = (s: string) => esc(s).replace(/\$([^$]+)\$/g, (_x, t: string) => o.latex(t));
  const qs = questions
    .map((q, i) => `<div style="margin:0 0 ${cq(14)}"><div style="font-weight:600">Câu ${i + 1}. ${m(q.question)}</div>${(q.options ?? []).map((op) => `<div style="margin-left:${cq(20)};${o.reveal && q.answer?.includes(op.value) ? "color:#0a8a4a;font-weight:700" : ""}">${esc(op.value)}. ${m(op.label)}</div>`).join("")}${o.reveal && q.analysis ? `<div style="margin-left:${cq(20)};color:#5b6290;font-size:${cq(15)}">${m(q.analysis)}</div>` : ""}</div>`)
    .join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>${BASE_CSS}</style>${o.extraHead ?? ""}</head><body><div class="stage" style="background:#fff;color:#232842;padding:${cq(40)};font-size:${cq(21)}"><div style="display:inline-block;background:#4f6bed;color:#fff;font-size:${cq(14)};font-weight:700;padding:${cq(4)} ${cq(14)};border-radius:${cq(20)}">CÂU HỎI</div><h1 style="font-size:${cq(34)};margin:${cq(10)} 0 ${cq(18)};color:#1e2340">${esc(title)}</h1>${qs}${o.subtitle ? `<div class="sub" style="color:#fff">${esc(o.subtitle)}</div>` : ""}</div></body></html>`;
}
