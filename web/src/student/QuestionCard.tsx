import { vn } from "../api";
import { Icon } from "../Icon";
import { MathField } from "../math/MathEditor";
import { MathText } from "../math/MathText";
import type { AnswerValue, PublicItem } from "./types";

const LETTERS = "ABCD";
const TYPE_VI = { mcq: "Trắc nghiệm", true_false: "Đúng / Sai", short_answer: "Trả lời ngắn", essay: "Tự luận" } as const;

type Props = { q: PublicItem; index: number; value: AnswerValue | undefined; flagged: boolean; current: boolean; onAnswer: (v: AnswerValue) => void; onFlag: () => void; onFocus: () => void };

/** Một câu trong phòng làm bài. Trên điện thoại chỉ câu `current` hiện (CSS). */
export function QuestionCard({ q, index, value, flagged, current, onAnswer, onFlag, onFocus }: Props) {
  return (
    <div id={`hs-q-${index}`} className={`hs-card hs-q${current ? " cur" : ""}`} onFocusCapture={onFocus} data-testid={`hs-q-${q.no}`}>
      <div className="qh">
        <span className="qn">{index + 1}</span>
        <span className="hs-chip c-blue">{TYPE_VI[q.type]}</span>
        <span className="pt">{vn(q.maxPoints)} điểm</span>
        <button className={`flagbtn${flagged ? " on" : ""}`} onClick={onFlag} data-testid={`hs-flag-${q.no}`}><Icon name="flag" />{flagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}</button>
      </div>
      <div className="qt"><MathText value={q.stem} /></div>
      {q.type === "mcq" && (
        <div className="hs-opts">
          {q.options.map((o, k) => (
            <button key={k} className={`hs-opt${value === k ? " on" : ""}`} onClick={() => onAnswer(k)} data-testid={`hs-opt-${q.no}-${k}`}>
              <span className="l">{LETTERS[k]}</span><span><MathText value={o} /></span>
            </button>
          ))}
        </div>
      )}
      {q.type === "true_false" && (
        <div className="hs-tf">
          {q.statements.map((s, k) => {
            const cur = Array.isArray(value) ? value : [null, null, null, null];
            const pick = (b: boolean) => onAnswer(cur.map((x, i) => (i === k ? b : x)));
            return (
              <div key={k} className="r">
                <span className="l">{"abcd"[k]}</span>
                <span className="s"><MathText value={s} /></span>
                <div className="tog" role="group" aria-label={`Ý ${"abcd"[k]}`}>
                  <button className={`t${cur[k] === true ? " on" : ""}`} onClick={() => pick(true)} data-testid={`hs-tf-${q.no}-${k}-d`}>Đúng</button>
                  <button className={`f${cur[k] === false ? " on" : ""}`} onClick={() => pick(false)} data-testid={`hs-tf-${q.no}-${k}-s`}>Sai</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {q.type === "short_answer" && (
        <div className="hs-sa">
          <MathField key={q.no} value={typeof value === "string" ? value : ""} onChange={(v) => onAnswer(v)} testId={`hs-sa-${q.no}`} />
          <small className="hs-muted">Ô công thức · gõ như trên bàn phím, bàn phím toán hiện bên dưới</small>
        </div>
      )}
      {q.type === "essay" && (
        <textarea className="hs-essay" maxLength={5000} value={typeof value === "string" ? value : ""} onChange={(e) => onAnswer(e.target.value)} placeholder="Em trình bày bài làm ở đây" data-testid={`hs-essay-${q.no}`} />
      )}
    </div>
  );
}
