// /hoc/tro-ly — Trợ lý AI dạng tác tử (gói G6 đợt 1): gia sư tự tra kho tri thức, hỏi lại bằng thẻ, stream trả lời; F5 thì khôi phục theo ?mach=.
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/components/Button";
import { EmptyState } from "../ui/components/States";
import { useToast } from "../ui/components/Toast";
import { useUrlState } from "../ui/data/urlState";
import { AgentTurn, Composer, agentApi, useAgentThread, type Capability } from "../ui/agent";
import { PageHead } from "../ui/shell/PageHead";
import "./troLy.css";

const STARTERS = ["Giải thích hằng đẳng thức $(a+b)^2$ bằng ví dụ", "Em chưa hiểu cách tìm m để phương trình có nghiệm", "Tóm tắt giúp em bài học hôm nay"];

export function TroLy() {
  const toast = useToast();
  const [mach, setMach] = useUrlState<string>("mach", "", { mode: "replace" });
  const [caps, setCaps] = useState<Capability[]>([]);
  const [cap, setCap] = useState("chat");
  const [restoring, setRestoring] = useState(!!mach);
  const t = useAgentThread({ onError: (m) => toast({ title: m, kind: "err" }) });
  const end = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useEffect(() => {
    agentApi.capabilities().then(setCaps, () => setCaps([{ id: "chat", title: "Hỏi đáp", description: "", icon: "chat" }]));
  }, []);
  useEffect(() => {
    if (restored.current || !mach) return;
    restored.current = true;
    t.restore(mach)
      .catch(() => (toast({ title: "Không mở được cuộc trò chuyện cũ", kind: "err" }), setMach("")))
      .finally(() => setRestoring(false));
  }, [mach, t, toast, setMach]);
  useEffect(() => {
    if (t.threadId && t.threadId !== mach) setMach(t.threadId);
  }, [t.threadId, mach, setMach]);
  const last = t.turns.at(-1);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [t.turns.length, last?.ask, last?.status]);

  const waiting = last?.status === "waiting";
  return (
    <div className="page tro-ly">
      <PageHead title="Trợ lý AI" primary={t.turns.length ? { label: "Cuộc mới", icon: "plus", onClick: () => (t.reset(), setMach("")) } : undefined} />
      <div className="tro-ly-main">
        {restoring ? (
          <div className="ag-thread" aria-busy>
            <div className="skel" style={{ alignSelf: "flex-end", width: 280, height: 44, borderRadius: 20 }} />
            <div className="skel" style={{ width: "min(100%, 560px)", height: 120, borderRadius: 20, marginLeft: 48 }} />
          </div>
        ) : t.turns.length ? (
          <div className="ag-thread" aria-live="polite">
            {t.turns.map((v) => (
              <AgentTurn key={v.turnId ?? v.message} view={v} onAnswer={t.answer} onStop={() => void t.stop()} />
            ))}
            {t.reconnecting && <p className="caption">Đang nối lại…</p>}
          </div>
        ) : (
          <EmptyState
            icon="bot"
            title="Em muốn hỏi gì hôm nay?"
            text="Trợ lý tự tra tài liệu của lớp, hỏi lại khi đề chưa rõ và giải thích từng bước."
            action={
              <div className="tro-ly-starters">
                {STARTERS.map((s) => (
                  <Button key={s} size="sm" onClick={() => t.send({ message: s, capability: cap, attachments: [] }).catch((e: Error) => toast({ title: e.message, kind: "err" }))}>
                    {s.replace(/\$/g, "")}
                  </Button>
                ))}
              </div>
            }
          />
        )}
        <div ref={end} />
      </div>
      <div className="tro-ly-composer">
        <Composer
          onSend={t.send}
          onStop={t.stop}
          busy={t.busy}
          disabled={waiting}
          placeholder={waiting ? "Em trả lời thẻ phía trên để trợ lý làm tiếp…" : undefined}
          capabilities={caps}
          capability={cap}
          onCapability={setCap}
          onError={(m) => toast({ title: m, kind: "err" })}
          autoFocus
        />
      </div>
    </div>
  );
}
