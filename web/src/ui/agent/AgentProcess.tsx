import { useEffect, useState } from "react";
import { Icon } from "../Icon";
import { isBusy, traceSummary, type TurnView } from "./state";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolTrace } from "./ToolTrace";

/** Quá trình của một lượt: các bước (suy nghĩ + công cụ) gom trong một khối thu gọn được; đang chạy thì mở và hiện việc đang làm. */
export function AgentProcess({ view }: { view: TurnView }) {
  const busy = isBusy(view.status);
  const [open, setOpen] = useState(true);
  const [touched, setTouched] = useState(false);
  const hasContent = !!view.content || !!view.answer;
  useEffect(() => {
    if (!touched) setOpen(busy && !hasContent);
  }, [busy, hasContent, touched]);
  const steps = view.steps.filter((s) => s.thinking.trim() || s.tools.length);
  if (!steps.length && !busy) return null;
  const running = view.steps.flatMap((s) => s.tools).find((t) => t.status === "running");
  const head = busy ? (running ? `Đang ${running.title.toLowerCase()}…` : hasContent ? "Đang viết câu trả lời…" : "Đang suy nghĩ…") : `Quá trình · ${traceSummary(view)}`;
  const lastStep = view.steps.at(-1)?.step;
  return (
    <section className={`ag-proc${busy ? " is-busy" : ""}`} aria-label="Quá trình suy nghĩ">
      <button type="button" className="ag-proc-hd" aria-expanded={open} onClick={() => (setTouched(true), setOpen((o) => !o))} disabled={!steps.length}>
        <span className="ag-proc-ic">{busy ? <span className="ag-pulse" aria-hidden /> : <Icon name="list" size="sm" />}</span>
        <span className={busy ? "ag-shimmer" : undefined}>{head}</span>
        {!!steps.length && <Icon name="chev" size="sm" className="ag-chev" />}
      </button>
      {open && !!steps.length && (
        <ol className="ag-steps">
          {steps.map((s) => (
            <li key={s.step} className="ag-step">
              {s.forced && <div className="ag-note">Đã khám phá đủ — trả lời bằng những gì đã có.</div>}
              <ThinkingBlock text={s.thinking} active={busy && s.step === lastStep && !s.tools.length && !hasContent} label={s.thinking.trim() ? undefined : "Đang suy nghĩ…"} />
              <ToolTrace items={s.tools.filter((t) => t.tool !== "ask_user")} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
