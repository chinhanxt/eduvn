import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icon";
import type { ParentView } from "./data";
import { NgheBtn, type Speak } from "./HomNay";

type St = "cho" | "nghe" | "doi" | "xong";

/** Hỏi cô: một nút micro thật lớn (mô phỏng nhận giọng nói), câu trả lời chữ to + nút Nghe. */
export default function HoiCo({ v, sp }: { v: ParentView; sp: Speak }) {
  const [st, setSt] = useState<St>("cho");
  const [n, setN] = useState(0);
  const qw = v.ask.q.split(" ");
  useEffect(() => {
    if (st === "nghe") {
      setN(0);
      let i = 0;
      const t = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= qw.length) {
          clearInterval(t);
          setTimeout(() => setSt("doi"), 900);
        }
      }, 320);
      return () => clearInterval(t);
    }
    if (st === "doi") {
      const t = setTimeout(() => setSt("xong"), 1600);
      return () => clearTimeout(t);
    }
  }, [st, qw.length]);

  if (st === "cho" || st === "nghe")
    return (
      <div className="ph-page ph-ask">
        <h1 className="ph-h1">Hỏi cô</h1>
        <button type="button" className={st === "nghe" ? "ph-mic on" : "ph-mic"} onClick={() => st === "cho" && (sp.stop(), setSt("nghe"))} aria-label="Bấm rồi nói câu hỏi">
          <span className="ring r1" aria-hidden="true" />
          <span className="ring r2" aria-hidden="true" />
          <Icon name="mic" />
        </button>
        {st === "cho" ? (
          <p className="ph-mic-say">Bấm rồi nói</p>
        ) : (
          <p className="ph-heard" aria-live="polite">{qw.slice(0, Math.max(1, n)).join(" ")}</p>
        )}
      </div>
    );

  return (
    <div className="ph-page ph-ask">
      <h1 className="ph-h1">Hỏi cô</h1>
      <p className="ph-q">“{v.ask.q}”</p>
      {st === "doi" ? (
        <p className="ph-wait-a" aria-live="polite">
          <span aria-hidden="true"><i /><i /><i /></span>
          {v.ask.from} đang trả lời
        </p>
      ) : (
        <div className="ph-a" aria-live="polite">
          <p className="from">{v.ask.from} trả lời</p>
          <p className="txt">{v.ask.a}</p>
        </div>
      )}
      {st === "xong" && (
        <div className="ph-pair">
          <NgheBtn id="ask" text={`${v.ask.from} trả lời. ${v.ask.a}`} sp={sp} />
          <button type="button" className="ph-big soft" onClick={() => (sp.stop(), setSt("cho"))}>
            <Icon name="mic" />
            <span>Hỏi tiếp</span>
          </button>
        </div>
      )}
    </div>
  );
}
