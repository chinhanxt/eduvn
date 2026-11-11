import { MathText } from "../math/MathText";
import { texMarkup } from "../math/MathText";
import type { Citation } from "./client";
import { parseBlocks, parseInline } from "./text";

function Inline({ src, cites, onCite }: { src: string; cites: Citation[]; onCite?: (c: Citation) => void }) {
  const valid = cites.map((c) => c.n);
  return (
    <>
      {parseInline(src, valid).map((p, i) => {
        if (p.kind === "bold") return <strong key={i}><MathText value={p.text} /></strong>;
        if (p.kind === "em") return <em key={i}><MathText value={p.text} /></em>;
        if (p.kind === "code") return <code key={i}>{p.text}</code>;
        if (p.kind === "cite") {
          const c = cites.find((x) => x.n === p.n)!;
          return (
            <button key={i} className="cite" title={`${c.doc}, trang ${c.page}`} aria-label={`Nguồn ${p.n}: ${c.doc}, trang ${c.page}`} onClick={() => onCite?.(c)} type="button">
              [{p.n}]
            </button>
          );
        }
        return <MathText key={i} value={p.text} />;
      })}
    </>
  );
}

/** Markdown + công thức LaTeX + trích dẫn [n] bấm được. */
export function Markdown({ text, cites = [], onCite }: { text: string; cites?: Citation[]; onCite?: (c: Citation) => void }) {
  return (
    <div className="md">
      {parseBlocks(text).map((b, i) => {
        switch (b.kind) {
          case "h":
            return <h4 key={i} className={`h${b.level}`}><Inline src={b.text} cites={cites} onCite={onCite} /></h4>;
          case "ul":
            return <ul key={i}>{b.items.map((t, j) => <li key={j}><Inline src={t} cites={cites} onCite={onCite} /></li>)}</ul>;
          case "ol":
            return <ol key={i}>{b.items.map((t, j) => <li key={j}><Inline src={t} cites={cites} onCite={onCite} /></li>)}</ol>;
          case "code":
            return <pre key={i}><code>{b.code}</code></pre>;
          case "hr":
            return <hr key={i} />;
          case "quote":
            return <blockquote key={i}><Inline src={b.text} cites={cites} onCite={onCite} /></blockquote>;
          case "table":
            return (
              <table key={i} className="md-table">
                <thead><tr>{b.head.map((c, j) => <th key={j}><Inline src={c} cites={cites} onCite={onCite} /></th>)}</tr></thead>
                <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}><Inline src={c} cites={cites} onCite={onCite} /></td>)}</tr>)}</tbody>
              </table>
            );
          case "math":
            return b.after ? (
              <div key={i} className="md-math">
                <span dangerouslySetInnerHTML={{ __html: texMarkup(b.tex) }} />
                <span className="md-math-cite"><Inline src={b.after} cites={cites} onCite={onCite} /></span>
              </div>
            ) : (
              <div key={i} className="md-math" dangerouslySetInnerHTML={{ __html: texMarkup(b.tex) }} />
            );
          default:
            return <p key={i}><Inline src={b.text} cites={cites} onCite={onCite} /></p>;
        }
      })}
    </div>
  );
}
