// Hook một mạch hội thoại tác tử: gửi lượt, theo dõi stream, huỷ, trả lời ask_user, khôi phục sau F5.
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthMode } from "../data/http";
import { agentApi, followTurn } from "./client";
import { initialTurn, isBusy, reduceTurn, type TurnView } from "./state";
import type { AgentEvent, AskAnswer, SendInput } from "./types";

export type AgentThread = {
  threadId: string | null;
  turns: TurnView[];
  busy: boolean;
  reconnecting: boolean;
  send: (input: SendInput) => Promise<void>;
  stop: () => Promise<void>;
  answer: (turnId: string, answers: AskAnswer[]) => Promise<void>;
  restore: (threadId: string) => Promise<void>;
  reset: () => void;
};

export function useAgentThread(opts: { auth?: AuthMode; params?: Record<string, unknown>; onError?: (message: string) => void } = {}): AgentThread {
  const [turns, setTurns] = useState<TurnView[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const ctl = useRef<AbortController | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  useEffect(() => () => ctl.current?.abort(), []);

  const apply = useCallback((turnId: string, e: AgentEvent) => setTurns((ts) => ts.map((t) => (t.turnId === turnId ? reduceTurn(t, e) : t))), []);

  const follow = useCallback(
    async (turnId: string, lastSeq: number) => {
      ctl.current?.abort();
      const c = new AbortController();
      ctl.current = c;
      try {
        await followTurn(turnId, (e) => {
          setReconnecting(false);
          apply(turnId, e);
        }, { signal: c.signal, lastSeq, auth: optsRef.current.auth, onReconnect: () => setReconnecting(true) });
      } catch (e) {
        optsRef.current.onError?.((e as Error).message || "Mất kết nối với trợ lý");
        apply(turnId, { type: "error", message: "Mất kết nối với trợ lý. Tải lại trang để xem tiếp." });
      } finally {
        setReconnecting(false);
      }
    },
    [apply],
  );

  const send = useCallback(
    async (input: SendInput) => {
      const draft = initialTurn(input.message);
      const tmp = `tam-${Date.now()}`;
      setTurns((ts) => [...ts, { ...draft, turnId: tmp }]);
      try {
        const r = await agentApi.start({ message: input.message, capability: input.capability, attachments: input.attachments, threadId: threadId ?? undefined, params: optsRef.current.params }, optsRef.current.auth);
        setThreadId(r.threadId);
        setTurns((ts) => ts.map((t) => (t.turnId === tmp ? { ...t, turnId: r.turnId, threadId: r.threadId, status: "running" } : t)));
        void follow(r.turnId, 0);
      } catch (e) {
        setTurns((ts) => ts.filter((t) => t.turnId !== tmp));
        throw e;
      }
    },
    [threadId, follow],
  );

  const stop = useCallback(async () => {
    const cur = turns.findLast((t) => isBusy(t.status) || t.status === "waiting");
    if (!cur?.turnId || cur.turnId.startsWith("tam-")) return;
    await agentApi.cancel(cur.turnId, optsRef.current.auth);
  }, [turns]);

  const answer = useCallback(
    async (turnId: string, answers: AskAnswer[]) => {
      await agentApi.answer(turnId, answers, optsRef.current.auth);
      const t = turns.find((x) => x.turnId === turnId);
      void follow(turnId, t?.lastSeq ?? 0);
    },
    [turns, follow],
  );

  const restore = useCallback(
    async (id: string) => {
      const th = await agentApi.thread(id, optsRef.current.auth);
      const views = await Promise.all(
        th.turns.map(async (row) => {
          const full = await agentApi.turn(row.id, optsRef.current.auth);
          return full.events.reduce(reduceTurn, { ...initialTurn(row.message), turnId: row.id, threadId: row.threadId, status: row.status });
        }),
      );
      setThreadId(id);
      setTurns(views);
      const live = views.find((v) => v.status === "running");
      if (live?.turnId) void follow(live.turnId, live.lastSeq);
    },
    [follow],
  );

  const reset = useCallback(() => {
    ctl.current?.abort();
    setTurns([]);
    setThreadId(null);
  }, []);

  const busy = turns.some((t) => isBusy(t.status));
  return { threadId, turns, busy, reconnecting, send, stop, answer, restore, reset };
}
