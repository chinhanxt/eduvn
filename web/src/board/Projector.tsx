// web/src/board/Projector.tsx
import { useState } from "react";
import type { BankQuestion } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";

export function Projector({ q, onClose }: { q: BankQuestion; onClose: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="bd-proj" data-testid="bd-proj">
      <div className="bd-proj-card">
        <div className="bd-proj-hd">
          <span className="bd-live"><i />Đang chiếu</span>
          <span className="bd-grow" />
          <button className="xbtn" onClick={onClose} aria-label="Đóng"><Icon name="x" /></button>
        </div>
        <div className="bd-proj-q"><MathText value={q.stem} /></div>
        {q.type === "mcq" && (
          <div className="bd-proj-opts">
            {q.options?.map((o, i) => (
              <div key={i} className={show && q.answer === i ? "bd-po right" : "bd-po"}><b>{"ABCD"[i]}</b><MathText value={o} /></div>
            ))}
          </div>
        )}
        {q.type === "true_false" && (
          <div className="bd-proj-opts one">
            {q.statements?.map((s, i) => (
              <div key={i} className="bd-po"><b>{"abcd"[i]}</b><MathText value={s} />{show && <em className={(q.answer as boolean[])[i] ? "ok" : "no"}>{(q.answer as boolean[])[i] ? "Đúng" : "Sai"}</em>}</div>
            ))}
          </div>
        )}
        {q.type === "short_answer" && show && <div className="bd-po right">Đáp án: <MathText value={String(q.answer)} /></div>}
        {q.type === "essay" && show && <div className="bd-po">{q.rubric}</div>}
        <button className="bd-btn pri" onClick={() => setShow((s) => !s)} data-testid="bd-reveal">{show ? "Ẩn đáp án" : "Hiện đáp án"}</button>
      </div>
    </div>
  );
}
