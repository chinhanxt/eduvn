// Gọi /api/tro-ly/* và theo dõi lượt bằng SSE có nối lại (Last-Event-ID, lùi dần khi rớt mạng).
import { ApiError } from "../../apiCore";
import { type AuthMode, buildHeaders, isAbort, request } from "../data/http";
import { reportFetchFailure, reportFetchSuccess } from "../data/online";
import { createSseParser } from "../data/stream";
import type { AgentEvent, AgentUsage, AskAnswer, AskQuestion, Attachment, Capability, TurnStatus } from "./types";

export type TurnRow = { id: string; threadId: string; capability: string; message: string; attachments: { kind: string; name: string }[]; status: TurnStatus; answer: string; usage: AgentUsage | null; ask: { callId: string; questions: AskQuestion[] } | null; lastSeq: number; createdAt: string; finishedAt: string | null };

const BASE = "/api/tro-ly";
export const agentApi = {
  capabilities: (auth?: AuthMode) => request<Capability[]>(`${BASE}/nang-luc`, { auth }),
  start: (body: { message: string; capability?: string; threadId?: string; attachments?: Attachment[]; params?: Record<string, unknown> }, auth?: AuthMode) => request<{ turnId: string; threadId: string; capability: string }>(`${BASE}/luot`, { body, auth }),
  cancel: (turnId: string, auth?: AuthMode) => request<{ status: TurnStatus }>(`${BASE}/luot/${turnId}/huy`, { method: "POST", body: {}, auth }),
  answer: (turnId: string, answers: AskAnswer[], auth?: AuthMode) => request<{ status: TurnStatus }>(`${BASE}/luot/${turnId}/tra-loi`, { body: { answers }, auth }),
  turn: (turnId: string, auth?: AuthMode) => request<TurnRow & { events: AgentEvent[] }>(`${BASE}/luot/${turnId}?su_kien=1`, { auth }),
  thread: (threadId: string, auth?: AuthMode) => request<{ threadId: string; turns: TurnRow[] }>(`${BASE}/mach/${threadId}`, { auth }),
};

const BACKOFF = [400, 1000, 2000, 4000, 8000];

/**
 * Theo dõi lượt tới khi xong hoặc chờ ask_user. Rớt mạng/đứt stream → tự nối lại từ seq cuối (không lặp sự kiện).
 * Trả trạng thái cuối; huỷ theo dõi bằng signal (lượt vẫn chạy trên máy chủ — muốn dừng lượt thì gọi agentApi.cancel).
 */
export async function followTurn(turnId: string, onEvent: (e: AgentEvent) => void, opts: { signal?: AbortSignal; lastSeq?: number; auth?: AuthMode; onReconnect?: (attempt: number) => void } = {}): Promise<TurnStatus | "stopped"> {
  let last = opts.lastSeq ?? 0;
  let failures = 0;
  for (;;) {
    if (opts.signal?.aborted) return "stopped";
    let ended: TurnStatus | null = null;
    try {
      const headers = await buildHeaders({ auth: opts.auth, accept: "text/event-stream" });
      if (last) headers["last-event-id"] = String(last);
      const res = await fetch(`${BASE}/luot/${turnId}/su-kien`, { headers, signal: opts.signal });
      reportFetchSuccess();
      if (!res.ok || !res.body) throw new ApiError(res.status, await res.json().catch(() => null));
      const parser = createSseParser((e) => {
        const d = e.data as AgentEvent;
        if (!d || typeof d !== "object") return;
        if (d.type === "end") {
          ended = d.status;
          return;
        }
        const seq = e.id ? Number(e.id) : undefined;
        if (seq !== undefined) {
          if (seq <= last) return;
          last = seq;
          failures = 0;
        }
        onEvent({ ...d, seq });
      });
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (!ended) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.push(value);
      }
      parser.end();
      if (ended) {
        await reader.cancel().catch(() => undefined);
        // "running" ở cuối = lượt vừa được tiếp (ask_user) nhưng chưa lên bus: nối lại ngay.
        if (ended !== "running") return ended;
      }
    } catch (e) {
      if (isAbort(e) || opts.signal?.aborted) return "stopped";
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) throw e;
      if (e instanceof TypeError) reportFetchFailure();
    }
    if (failures >= BACKOFF.length) throw new ApiError(503, { error: "Mất kết nối với trợ lý" });
    opts.onReconnect?.(failures + 1);
    const wait = BACKOFF[failures++]!;
    await new Promise<void>((r) => {
      const t = setTimeout(r, wait);
      opts.signal?.addEventListener("abort", () => (clearTimeout(t), r()), { once: true });
    });
  }
}
