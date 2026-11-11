import { Markdown } from "../../hoc/Markdown";
import type { Citation } from "../../hoc/client";
import { type StreamState, StreamingText } from "../components/StreamingText";
import { Icon } from "../Icon";
import { AgentProcess } from "./AgentProcess";
import { AskUserCard } from "./AskUserCard";
import { isBusy, type TurnView } from "./state";
import type { AgentSource, AskAnswer } from "./types";

const STREAM: Record<string, StreamState> = { starting: "streaming", running: "streaming", waiting: "done", done: "done", limit: "done", cancelled: "stopped", error: "error", interrupted: "error" };
export const toCitations = (s: AgentSource[]): Citation[] => s.filter((x) => x.n).map((x) => ({ n: x.n!, docId: "", doc: x.title, page: x.page ?? 0, snippet: x.snippet ?? "" }));

/**
 * Một lượt hoàn chỉnh: câu hỏi → quá trình (suy nghĩ + công cụ) → thẻ ask_user → câu trả lời stream (Markdown + công thức, trích dẫn [n]) → nguồn.
 * Dùng chung cho trợ lý /hoc, workbench (G4), lớp học (G3)…
 */
export function AgentTurn({ view, onAnswer, onStop, onCite, hideUser }: { view: TurnView; onAnswer?: (turnId: string, a: AskAnswer[]) => Promise<unknown>; onStop?: () => void; onCite?: (c: Citation) => void; hideUser?: boolean }) {
  const text = view.answer ?? view.content;
  const cites = toCitations(view.sources);
  const busy = isBusy(view.status);
  return (
    <article className="ag-turn" aria-busy={busy || undefined}>
      {!hideUser && <div className="ag-me">{view.message}</div>}
      <div className="ag-ai">
        <span className="ag-av" aria-hidden>
          <Icon name="bot" />
        </span>
        <div className="ag-ai-body">
          <AgentProcess view={view} />
          {view.ask && view.turnId && <AskUserCard intro={view.ask.intro} questions={view.ask.questions} onSubmit={(a) => onAnswer?.(view.turnId!, a)} />}
          {view.answered && <AskUserCard questions={view.answered.questions} answered={view.answered.answers} />}
          {(text || (busy && view.steps.length > 0 && !view.steps.at(-1)?.tools.length)) && (
            <div className="ag-answer">
              <StreamingText text={text} state={STREAM[view.status] ?? "done"} onStop={onStop} className="read" render={(t) => <Markdown text={t} cites={cites} onCite={onCite} />} />
            </div>
          )}
          {view.error && (
            <p className="ag-err" role="alert">
              <Icon name="alert" size="sm" /> {view.error}
            </p>
          )}
          {view.status === "cancelled" && !text && <p className="ag-note">Đã dừng.</p>}
          {!!cites.length && !busy && (
            <ol className="ag-srcs" aria-label="Nguồn">
              {cites.map((c) => (
                <li key={c.n}>
                  <button type="button" onClick={() => onCite?.(c)} title={c.snippet}>
                    <span className="ag-src-n num">{c.n}</span>
                    <span className="ag-src-t">{c.doc}</span>
                    {c.page > 0 && <span className="caption">tr. {c.page}</span>}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </article>
  );
}
