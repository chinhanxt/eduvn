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
        if (p.kind === "code") return <code key={i}>{p.text}</code>;
        if (p.kind === "cite") {
          const c = cites.find((x) => x.n === p.n)!;
          return (
            <button key={i} className="cite" title={`${c.doc}, trang ${c.page}`} onClick={() => onCite?.(c)} type="button">
              {p.n}
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
          case "math":
            return <div key={i} className="md-math" dangerouslySetInnerHTML={{ __html: texMarkup(b.tex) }} />;
          default:
            return <p key={i}><Inline src={b.text} cites={cites} onCite={onCite} /></p>;
        }
      })}
    </div>
  );
}
