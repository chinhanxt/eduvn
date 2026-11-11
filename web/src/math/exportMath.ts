// web/src/math/exportMath.ts — đưa công thức (MathLive) vào file SVG/PNG xuất ra: HTML công thức trong foreignObject
// + CSS của MathLive + @font-face KaTeX nhúng dạng data URL (chỉ các font thật sự dùng). Ảnh SVG/PNG giữ đúng công thức như trên màn hình.
import { texMarkup } from "./MathText";
import { isSafeLatex, splitMath } from "./segments";

const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** HTML giống <MathText> (chữ + công thức $…$). */
export function mathHtml(value: string): string {
  const parts = splitMath(value).map((s) => (s.kind === "math" && isSafeLatex(s.value) ? `<span class="me-tex">${texMarkup(s.value)}</span>` : `<span>${escHtml(s.kind === "text" ? s.value : s.value)}</span>`));
  return `<span class="me-text">${parts.join("")}</span>`;
}
export const hasMath = (s: string): boolean => splitMath(s).some((x) => x.kind === "math");

/** Chuỗi HTML → XHTML hợp lệ để đặt trong foreignObject (thực thể &nbsp;, thẻ đơn… được chuẩn hoá). */
export function xhtml(html: string): string {
  const d = document.createElement("span");
  d.innerHTML = html;
  return new XMLSerializer().serializeToString(d);
}

const fontCache = new Map<string, Promise<string>>();
function dataUrl(url: string): Promise<string> {
  let p = fontCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Không tải được font ${url}`);
        return r.blob();
      })
      .then(
        (b) =>
          new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(String(fr.result));
            fr.onerror = () => rej(new Error("Không đọc được font"));
            fr.readAsDataURL(b);
          }),
      );
    fontCache.set(url, p);
  }
  return p;
}

const firstFamily = (ff: string) => ff.split(",")[0]!.trim().replace(/^["']|["']$/g, "");

/** CSS cần cho các công thức đang nằm trong `root` (phải đang gắn vào document để đọc kiểu tính toán). */
export async function mathExportCss(root: Element): Promise<string> {
  const used = new Set<string>();
  for (const el of [root, ...Array.from(root.querySelectorAll("*"))]) used.add(firstFamily(getComputedStyle(el).fontFamily));
  const rules: string[] = [];
  const faces: Promise<string>[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue; // stylesheet khác nguồn (Google Fonts) — bỏ qua
    }
    for (const r of Array.from(list)) {
      if (r instanceof CSSStyleRule && /ML__|me-te/.test(r.selectorText)) rules.push(r.cssText);
      else if (r instanceof CSSFontFaceRule) {
        const fam = firstFamily(r.style.getPropertyValue("font-family"));
        if (!used.has(fam)) continue;
        const m = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(r.style.getPropertyValue("src"));
        if (!m) continue;
        const abs = new URL(m[1]!, sheet.href ?? location.href).href;
        const weight = r.style.getPropertyValue("font-weight") || "normal";
        const style = r.style.getPropertyValue("font-style") || "normal";
        faces.push(dataUrl(abs).then((u) => `@font-face{font-family:"${fam}";font-weight:${weight};font-style:${style};src:url(${u}) format("woff2")}`));
      }
    }
  }
  return [...(await Promise.all(faces)), ...rules].join("\n");
}

/** Dựng tạm các nhãn trong DOM ẩn để biết font nào được dùng, rồi lấy CSS nhúng. */
export async function mathCssFor(values: string[]): Promise<string> {
  const math = values.filter(hasMath);
  if (!math.length) return "";
  const box = document.createElement("div");
  box.style.cssText = "position:absolute;left:-10000px;top:0;visibility:hidden;white-space:nowrap";
  box.innerHTML = math.map((v) => `<div>${mathHtml(v)}</div>`).join("");
  document.body.appendChild(box);
  try {
    await document.fonts.ready;
    return await mathExportCss(box);
  } finally {
    box.remove();
  }
}
