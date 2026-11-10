/** Mẫu HyperFrames CỐ ĐỊNH: spec đã kiểm → index.html (GSAP + KaTeX). Mọi chữ của AI đều được escape; không có mã nào của AI đi vào trang. */
import katex from "katex";
import type { AnimSpec } from "./spec";

export const HF_W = 1280;
export const HF_H = 720;
type Spec = Extract<AnimSpec, { template: "dien_giai_tung_buoc" | "so_do_quy_trinh" | "so_sanh_bang" }>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Chữ thường + công thức $…$ → HTML (KaTeX dựng sẵn phía máy chủ). */
export function richText(s: string): string {
  return s
    .split(/(\$[^$]+\$)/)
    .map((p) => {
      if (p.length > 2 && p.startsWith("$") && p.endsWith("$")) {
        try {
          return katex.renderToString(p.slice(1, -1), { throwOnError: false, trust: false, output: "html" });
        } catch {
          return esc(p);
        }
      }
      return esc(p);
    })
    .join("");
}

const CSS = `
@font-face{font-family:"Noto Sans";src:local("Noto Sans"),local("NotoSans-Regular")}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${HF_W}px;height:${HF_H}px;overflow:hidden;background:#10142b}
#root{position:absolute;inset:0;background:#10142b;font-family:"Noto Sans","DejaVu Sans",sans-serif;color:#f3f5ff}
#tt{position:absolute;left:64px;right:64px;top:30px;font-size:38px;font-weight:700;color:#ffd166}
.body{position:absolute;left:64px;right:64px;top:__TOP__px;bottom:48px;display:flex;flex-direction:column;justify-content:center;gap:18px}
.line{font-size:36px;line-height:1.35;padding:12px 22px;border-left:6px solid #4f6bed;border-radius:6px;background:rgba(79,107,237,.12)}
.flow{flex-direction:row;align-items:center;justify-content:center;gap:0}
.box{width:__BW__px;min-height:170px;padding:18px 14px;border-radius:14px;background:#1c2350;border:3px solid #4f6bed;text-align:center;display:flex;flex-direction:column;justify-content:center;gap:10px}
.box b{font-size:30px;color:#ffd166}.box span{font-size:22px;color:#c9d0ff}
.arr{width:__AW__px;height:40px;display:flex;align-items:center;justify-content:center}
.row{display:grid;grid-template-columns:repeat(__COLS__,1fr);gap:0;font-size:30px;border-radius:8px;overflow:hidden}
.row div{padding:14px 18px;border-bottom:1px solid #2c3470}
.hd div{background:#4f6bed;font-weight:700;color:#fff}
.rw div{background:rgba(79,107,237,.10)}
.katex{font-size:1.05em}
`;

const doc = (spec: Spec, css: string, inner: string, script: string) => `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=${HF_W}, height=${HF_H}">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
<link rel="stylesheet" href="assets/katex/katex.min.css">
<style>${css}</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${spec.thoiLuong}" data-width="${HF_W}" data-height="${HF_H}">
${spec.tieuDe ? `<h1 id="tt" class="clip" data-start="0" data-duration="${spec.thoiLuong}" data-track-index="0">${esc(spec.tieuDe)}</h1>` : ""}
${inner}
</div>
<script>
const tl = gsap.timeline({ paused: true });
${script}
window.__timelines["main"] = tl;
tl.seek(0);
</script></body></html>
`;

/** Thời điểm hiện của phần tử thứ i trong n (chừa 0,4 s đầu và 0,5 s cuối). */
const at = (i: number, n: number, total: number) => Math.round((0.4 + (i * Math.max(total - 1.2, 0.5)) / n) * 100) / 100;

export function hyperframesHtml(spec: Spec): string {
  const T = spec.thoiLuong;
  const top = spec.tieuDe ? 100 : 40;
  const css = (extra: Record<string, string>) => Object.entries({ __TOP__: String(top), __BW__: "180", __AW__: "50", __COLS__: "2", ...extra }).reduce((c, [k, v]) => c.replaceAll(k, v), CSS);

  if (spec.template === "dien_giai_tung_buoc") {
    const n = spec.params.cacDong.length;
    const lines = spec.params.cacDong.map((l, i) => `<div id="l${i}" class="line clip" data-start="${at(i, n, T)}" data-duration="${Math.round((T - at(i, n, T)) * 100) / 100}" data-track-index="${i + 1}">${richText(l)}</div>`).join("\n");
    const js = spec.params.cacDong
      .map((_l, i) => {
        const t0 = at(i, n, T);
        const t1 = i + 1 < n ? at(i + 1, n, T) : T - 0.3;
        return `tl.fromTo("#l${i}", { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, ${t0});
tl.fromTo("#l${i}", { backgroundColor: "rgba(255,209,102,0.28)", borderLeftColor: "#ffd166" }, { backgroundColor: "rgba(79,107,237,0.12)", borderLeftColor: "#4f6bed", duration: 0.4 }, ${t1});
tl.to("#l${i}", { opacity: 0.55, duration: 0.3 }, ${t1});`;
      })
      .join("\n");
    return doc(spec, css({}), `<div class="body">\n${lines}\n</div>`, js);
  }

  if (spec.template === "so_do_quy_trinh") {
    const steps = spec.params.cacBuoc;
    const n = steps.length;
    const bw = Math.min(200, Math.floor((HF_W - 128 - (n - 1) * 56) / n));
    const parts: string[] = [];
    let js = "";
    steps.forEach((s, i) => {
      const t = at(i, n, T);
      const d = Math.round((T - t) * 100) / 100;
      parts.push(`<div id="b${i}" class="box clip" data-start="${t}" data-duration="${d}" data-track-index="${i * 2 + 1}"><b>${richText(s.nhan)}</b>${s.moTa ? `<span>${richText(s.moTa)}</span>` : ""}</div>`);
      js += `tl.fromTo("#b${i}", { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, ${t});\n`;
      if (i + 1 < n) {
        const ta = Math.round((t + (at(i + 1, n, T) - t) * 0.55) * 100) / 100;
        const da = Math.round((T - ta) * 100) / 100;
        parts.push(`<div id="a${i}" class="arr clip" data-start="${ta}" data-duration="${da}" data-track-index="${i * 2 + 2}"><svg width="44" height="30" viewBox="0 0 44 30"><path d="M2 15 H34 M26 5 L38 15 L26 25" fill="none" stroke="#ffd166" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`);
        js += `tl.fromTo("#a${i}", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, ${ta});\n`;
      }
    });
    return doc(spec, css({ __BW__: String(bw) }), `<div class="body flow">\n${parts.join("\n")}\n</div>`, js);
  }

  const cols = spec.params.cotTieuDe.length;
  const rows = spec.params.cacHang;
  const n = rows.length + 1;
  const cell = (c: string) => `<div>${richText(c)}</div>`;
  const parts = [`<div id="r0" class="row hd clip" data-start="${at(0, n, T)}" data-duration="${Math.round((T - at(0, n, T)) * 100) / 100}" data-track-index="1">${spec.params.cotTieuDe.map(cell).join("")}</div>`];
  let js = `tl.fromTo("#r0", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, ${at(0, n, T)});\n`;
  rows.forEach((r, i) => {
    const t = at(i + 1, n, T);
    parts.push(`<div id="r${i + 1}" class="row rw clip" data-start="${t}" data-duration="${Math.round((T - t) * 100) / 100}" data-track-index="${i + 2}">${r.map(cell).join("")}</div>`);
    js += `tl.fromTo("#r${i + 1}", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, ${t});\n`;
  });
  return doc(spec, css({ __COLS__: String(cols) }), `<div class="body" style="justify-content:flex-start;gap:0">\n${parts.join("\n")}\n</div>`, js);
}
