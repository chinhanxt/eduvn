// web/src/math/MathText.tsx
import "./setup";
import { convertLatexToMarkup } from "mathlive";
import { isSafeLatex, splitMath } from "./segments";

const cache = new Map<string, string>();
export function texMarkup(latex: string): string {
  let m = cache.get(latex);
  if (m === undefined) {
    m = isSafeLatex(latex) ? convertLatexToMarkup(latex) : "";
    cache.set(latex, m);
  }
  return m;
}

/** Hiển thị chuỗi có công thức $…$. LaTeX có lệnh nguy hiểm (\href, \html…) hiện dạng chữ. */
export function MathText({ value }: { value: string }) {
  return (
    <span className="me-text">
      {splitMath(value).map((s, i) =>
        s.kind === "text" || !isSafeLatex(s.value) ? (
          <span key={i}>{s.kind === "text" ? s.value : s.value}</span>
        ) : (
          <span key={i} className="me-tex" dangerouslySetInnerHTML={{ __html: texMarkup(s.value) }} />
        ),
      )}
    </span>
  );
}
