import type { ReactNode } from "react";
import { vn } from "../api";
import { MathField } from "../math/MathEditor";
import { MathText } from "../math/MathText";
import { Button } from "../ui/components/Button";
import type { AnswerValue, PublicItem } from "./types";

const LETTERS = "ABCD";
type Props = { q: PublicItem; index: number; part: string; value: AnswerValue | undefined; flagged: boolean; onAnswer: (v: AnswerValue) => void; onFlag: () => void; foot?: ReactNode };

/** Một câu trong phòng làm bài (mỗi lần một câu, như mockup hoc/lam-bai). */
export function QuestionCard({ q, index, part, value, flagged, onAnswer, onFlag, foot }: Props) {
  return (
    <article className="card qc" data-testid={`hs-q-${q.no}`} aria-label={`Câu ${index + 1}`}>
      <div className="row">
        <span className="part">{part.toUpperCase()}</span>
        <span className="pt">{vn(q.maxPoints)} điểm</span>
        <span className="grow" />
        <Button variant="ghost" size="sm" icon="flag" pressed={flagged} className={flagged ? "flag-on" : undefined} onClick={onFlag} data-testid={`hs-flag-${q.no}`}>
          {flagged ? "Đã đánh dấu" : "Xem lại sau"}
        </Button>
      </div>
      <div className="stem"><b>Câu {index + 1}.</b> <MathText value={q.stem} /></div>
      {q.type === "mcq" && (
        <div className="opts" role="radiogroup" aria-label={`Phương án câu ${index + 1}`}>
          {q.options.map((o, k) => (
            <button type="button" role="radio" aria-checked={value === k} key={k} className="opt" onClick={() => onAnswer(k)} data-testid={`hs-opt-${q.no}-${k}`}>
              <span className="k">{LETTERS[k]}</span>
              <span className="tx"><MathText value={o} /></span>
            </button>
          ))}
        </div>
      )}
      {q.type === "true_false" && (
        <>
          <div className="ds" role="group" aria-label={`Các ý câu ${index + 1}`}>
            {q.statements.map((s, k) => {
              const cur = Array.isArray(value) ? value : [null, null, null, null];
              const pick = (b: boolean) => onAnswer(cur.map((x, i) => (i === k ? b : x)));
              return (
                <div key={k} className="r">
                  <span className="l">{"abcd"[k]}</span>
                  <span className="tx"><MathText value={s} /></span>
                  <span className="tf" role="group" aria-label={`Ý ${"abcd"[k]}`}>
                    <button type="button" aria-pressed={cur[k] === true} onClick={() => pick(true)} data-testid={`hs-tf-${q.no}-${k}-d`}>Đúng</button>
                    <button type="button" aria-pressed={cur[k] === false} onClick={() => pick(false)} data-testid={`hs-tf-${q.no}-${k}-s`}>Sai</button>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="caption" style={{ marginTop: 12 }}>Đúng 1 ý: 0,1 · 2 ý: 0,25 · 3 ý: 0,5 · 4 ý: 1 điểm</p>
        </>
      )}
      {q.type === "short_answer" && (
        <div className="sa">
          <MathField key={q.no} value={typeof value === "string" ? value : ""} onChange={(v) => onAnswer(v)} testId={`hs-sa-${q.no}`} />
          <small className="caption">Ô công thức · gõ như trên bàn phím, bàn phím toán hiện bên dưới</small>
        </div>
      )}
      {q.type === "essay" && (
        <textarea className="textarea essay" maxLength={5000} value={typeof value === "string" ? value : ""} onChange={(e) => onAnswer(e.target.value)} placeholder="Em trình bày bài làm ở đây" aria-label={`Bài làm câu ${index + 1}`} data-testid={`hs-essay-${q.no}`} />
      )}
      {foot}
    </article>
  );
}
