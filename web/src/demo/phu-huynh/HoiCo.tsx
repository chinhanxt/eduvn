import { useEffect, useState } from "react";
import { Icon } from "../../ui/Icon";
import { Face } from "../kit/Face";
import type { ParentView } from "./data";
import { NgheBtn, type Speak } from "./HomNay";

type St = "cho" | "nghe" | "doi" | "xong";

/** Hỏi cô: nút micro tròn lớn kiểu Siri (mô phỏng nhận giọng nói), câu trả lời trong nhóm thẻ + Nghe. */
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

  const listening = st === "cho" || st === "nghe";
  return (
    <div className="ph-page">
      <div className="ph-title">
        <h1>Hỏi cô</h1>
      </div>
      {listening ? (
        <div className="ph-siri">
          <div className={st === "nghe" ? "ph-orb on" : "ph-orb"}>
            <span className="glow" aria-hidden="true" />
            <button type="button" className="ph-mic" onClick={() => st === "cho" && (sp.stop(), setSt("nghe"))} aria-label="Bấm rồi nói câu hỏi">
              <Icon name="mic" />
            </button>
          </div>
          {st === "cho" ? (
            <p className="hint">Bấm rồi nói</p>
          ) : (
            <p className="heard" aria-live="polite">{qw.slice(0, Math.max(1, n)).join(" ")}</p>
          )}
        </div>
      ) : (
        <>
          <p className="ph-q">{v.ask.q}</p>
          <section className="ph-card ph-answer" aria-live="polite">
            <div className="who">
              <Face name="Lê Thu Hà" hue={340} size={40} />
              <span>
                <b>{v.ask.from}</b>
                <small>Chủ nhiệm lớp {v.child.className}</small>
              </span>
            </div>
            {st === "doi" ? (
              <p className="typing" aria-label="Cô đang trả lời"><i /><i /><i /></p>
            ) : (
              <p className="txt">{v.ask.a}</p>
            )}
          </section>
          {st === "xong" && (
            <div className="ph-pair">
              <NgheBtn id="ask" text={`${v.ask.from} trả lời. ${v.ask.a}`} sp={sp} />
              <button type="button" className="ph-btn tint" onClick={() => (sp.stop(), setSt("cho"))}>
                <Icon name="mic" />
                <span>Hỏi tiếp</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
