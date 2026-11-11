// web/src/solution/Rich.tsx — Markdown tối giản + công thức $…$ dựng bằng KaTeX (nhẹ hơn MathLive, chữ toán sắc nét khi in/phóng to).
// Dùng cho thân lời giải, đề bài và lời gia sư trong trình xem lời giải (cả trang công khai không đăng nhập).
import katex from "katex";
import "katex/dist/katex.min.css";
import { memo } from "react";
import { parseBlocks, parseInline } from "../hoc/text";
import { isSafeLatex, splitMath } from "../math/segments";
import { fixEscapes } from "./context";

const cache = new Map<string, string>();
/** LaTeX → HTML KaTeX (có cache); lệnh nguy hiểm hoặc lỗi cú pháp → chữ thường. */
export function tex(src: string, display = false): string {
  const key = `${display ? "D" : "i"}${src}`;
  let h = cache.get(key);
  if (h === undefined) {
    h = isSafeLatex(src)
      ? katex.renderToString(src, { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "html" })
      : src.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);
    if (cache.size > 2000) cache.clear();
    cache.set(key, h);
  }
  return h;
}

/** Chuỗi có $…$ (không Markdown). */
export function TexText({ value }: { value: string }) {
  return (
    <>
      {splitMath(value).map((s, i) => (s.kind === "text" ? <span key={i}>{s.value}</span> : <span key={i} className="sol-k" dangerouslySetInnerHTML={{ __html: tex(s.value) }} />))}
    </>
  );
}

function Inline({ src }: { src: string }) {
  // tách $…$ trước để dấu * trong công thức không bị hiểu là chữ nghiêng
  return (
    <>
      {splitMath(src).map((seg, i) =>
        seg.kind === "math" ? (
          <span key={i} className="sol-k" dangerouslySetInnerHTML={{ __html: tex(seg.value) }} />
        ) : (
          parseInline(seg.value, []).map((p, j) => {
            const k = `${i}.${j}`;
            if (p.kind === "bold") return <strong key={k}>{p.text}</strong>;
            if (p.kind === "em") return <em key={k}>{p.text}</em>;
            if (p.kind === "code") return <code key={k}>{p.text}</code>;
            return <span key={k}>{p.text}</span>;
          })
        ),
      )}
    </>
  );
}

/** Markdown (đoạn, danh sách, bảng, $$…$$) + KaTeX. */
export const Rich = memo(function Rich({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className ?? "sol-rich"}>
      {parseBlocks(fixEscapes(text)).map((b, i) => {
        switch (b.kind) {
          case "h":
            return <p key={i} className="sol-rich-h"><Inline src={b.text} /></p>;
          case "ul":
            return <ul key={i}>{b.items.map((t, j) => <li key={j}><Inline src={t} /></li>)}</ul>;
          case "ol":
            return <ol key={i}>{b.items.map((t, j) => <li key={j}><Inline src={t} /></li>)}</ol>;
          case "code":
            return <pre key={i}><code>{b.code}</code></pre>;
          case "hr":
            return <hr key={i} />;
          case "quote":
            return <blockquote key={i}><Inline src={b.text} /></blockquote>;
          case "table":
            return (
              <table key={i}>
                <thead><tr>{b.head.map((c, j) => <th key={j}><Inline src={c} /></th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Inline src={c} /></td>)}</tr>)}</tbody>
              </table>
            );
          case "math":
            return <div key={i} className="sol-display" dangerouslySetInnerHTML={{ __html: tex(b.tex, true) }} />;
          default:
            return <p key={i}><Inline src={b.text} /></p>;
        }
      })}
    </div>
  );
});
