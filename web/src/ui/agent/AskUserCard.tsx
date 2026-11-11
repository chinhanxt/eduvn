import { useId, useState } from "react";
import { Button } from "../components/Button";
import { Icon } from "../Icon";
import { answerOf } from "./state";
import type { AskAnswer, AskQuestion } from "./types";

/**
 * Thẻ ask_user (DeepTutor DT-120): 1–4 câu, phương án có mô tả, chọn một/nhiều, dòng "Khác" ghi tự do.
 * Nhiều câu thì chia thẻ con (1/3, 2/3…). Gửi một lần cho cả thẻ; đã trả lời thì hiện bản chỉ đọc.
 */
export function AskUserCard({ intro, questions, onSubmit, answered }: { intro?: string; questions: AskQuestion[]; onSubmit?: (answers: AskAnswer[]) => Promise<unknown> | void; answered?: AskAnswer[] }) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [other, setOther] = useState<Record<string, string>>({});
  const [otherOn, setOtherOn] = useState<Record<string, boolean>>({});
  const base = useId();

  if (answered) {
    return (
      <div className="ag-ask is-answered" aria-label="Em đã trả lời">
        {questions.map((q) => {
          const a = answered.find((x) => x.id === q.id);
          const parts = [...(a?.selected ?? []), ...(a?.other ? [a.other] : [])];
          return (
            <div key={q.id} className="ag-ask-done">
              <span className="ag-ask-q">{q.prompt}</span>
              <span className="ag-ask-a">
                <Icon name="check" size="sm" /> {parts.length ? parts.join(" · ") : "Bỏ qua"}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const q = questions[Math.min(idx, questions.length - 1)]!;
  const sel = picked[q.id] ?? [];
  const many = questions.length > 1;
  const last = idx >= questions.length - 1;
  const toggle = (label: string) => {
    setPicked((p) => {
      const cur = p[q.id] ?? [];
      const next = q.multi ? (cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label]) : cur[0] === label ? [] : [label];
      return { ...p, [q.id]: next };
    });
    if (!q.multi) setOtherOn((o) => ({ ...o, [q.id]: false }));
    if (!q.multi && many && !last) setTimeout(() => setIdx((i) => Math.min(i + 1, questions.length - 1)), 160);
  };
  const freeOnly = !q.options.length;
  const showOther = freeOnly || otherOn[q.id];
  const submit = () => onSubmit?.(questions.map((x) => answerOf(x, picked[x.id] ?? [], otherOn[x.id] || !x.options.length ? (other[x.id] ?? "") : "")));
  const answeredCount = questions.filter((x) => (picked[x.id]?.length ?? 0) > 0 || (other[x.id] ?? "").trim()).length;

  return (
    <div className="ag-ask" role="group" aria-labelledby={`${base}-q`}>
      {intro && <p className="ag-ask-intro">{intro}</p>}
      {many && (
        <div className="ag-ask-tabs" role="tablist" aria-label="Các câu hỏi">
          {questions.map((x, i) => {
            const done = (picked[x.id]?.length ?? 0) > 0 || !!(other[x.id] ?? "").trim();
            return (
              <button key={x.id} type="button" role="tab" aria-selected={i === idx} className={done ? "is-done" : undefined} onClick={() => setIdx(i)}>
                {done && <Icon name="check" size="sm" />}
                {x.header || `Câu ${i + 1}`}
              </button>
            );
          })}
        </div>
      )}
      <div key={q.id} className="ag-ask-body">
        <p id={`${base}-q`} className="ag-ask-q">
          {q.prompt}
          {q.multi && <span className="ag-ask-hint"> · chọn được nhiều</span>}
        </p>
        {!!q.options.length && (
          <div className="ag-ask-opts" role={q.multi ? "group" : "radiogroup"} aria-labelledby={`${base}-q`}>
            {q.options.map((o, i) => {
              const on = sel.includes(o.label);
              return (
                <button key={o.label} type="button" role={q.multi ? "checkbox" : "radio"} aria-checked={on} className="ag-opt" style={{ ["--i" as string]: i }} onClick={() => toggle(o.label)}>
                  <span className={`ag-opt-mark${q.multi ? " sq" : ""}`} aria-hidden>
                    {on && <Icon name="check" size="sm" />}
                  </span>
                  <span className="ag-opt-txt">
                    <b>{o.label}</b>
                    {o.description && <small>{o.description}</small>}
                  </span>
                </button>
              );
            })}
            {q.allowOther && (
              <button type="button" role={q.multi ? "checkbox" : "radio"} aria-checked={!!otherOn[q.id]} className="ag-opt" style={{ ["--i" as string]: q.options.length }} onClick={() => (setOtherOn((o) => ({ ...o, [q.id]: !o[q.id] })), !q.multi && setPicked((p) => ({ ...p, [q.id]: [] })))}>
                <span className={`ag-opt-mark${q.multi ? " sq" : ""}`} aria-hidden>
                  {otherOn[q.id] && <Icon name="check" size="sm" />}
                </span>
                <span className="ag-opt-txt">
                  <b>Khác</b>
                  <small>Em tự ghi câu trả lời</small>
                </span>
              </button>
            )}
          </div>
        )}
        {showOther && (
          <textarea
            className="textarea ag-ask-other"
            rows={2}
            autoFocus={!freeOnly}
            placeholder={q.placeholder ?? "Em ghi câu trả lời…"}
            aria-label={`Trả lời: ${q.prompt}`}
            value={other[q.id] ?? ""}
            onChange={(e) => setOther((o) => ({ ...o, [q.id]: e.target.value }))}
          />
        )}
      </div>
      <div className="ag-ask-foot">
        {many && <span className="caption num">{answeredCount}/{questions.length} câu</span>}
        <span className="grow" />
        {many && !last ? (
          <Button size="sm" iconEnd="right" onClick={() => setIdx((i) => i + 1)}>
            Câu tiếp
          </Button>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => onSubmit?.(questions.map((x) => ({ id: x.id, selected: [] })))}>
              Bỏ qua
            </Button>
            <Button size="sm" variant="primary" icon="send" onClick={submit} disabled={!answeredCount}>
              Gửi câu trả lời
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
