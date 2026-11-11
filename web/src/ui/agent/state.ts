// Trạng thái hiển thị một lượt tác tử, dựng từ chuỗi sự kiện (thuần, test được; phát lại sau F5 cho cùng kết quả).
import type { AgentEvent, AgentSource, AgentUsage, AskAnswer, AskQuestion, TurnStatus } from "./types";

export type ToolItem = { callId: string; step: number; tool: string; title: string; args: unknown; status: "running" | "ok" | "error"; summary?: string; ms?: number; progress?: string };
export type StepView = { step: number; forced?: boolean; thinking: string; tools: ToolItem[] };
export type TurnView = {
  turnId: string | null;
  threadId: string | null;
  message: string;
  status: TurnStatus | "starting";
  steps: StepView[];
  /** Chữ trả lời đang stream (của bước hiện tại). */
  content: string;
  /** Câu trả lời cuối (sau done). */
  answer: string | null;
  ask: { callId: string; intro?: string; questions: AskQuestion[] } | null;
  answered: { callId: string; questions: AskQuestion[]; answers: AskAnswer[] } | null;
  sources: AgentSource[];
  notices: string[];
  error: string | null;
  usage: AgentUsage | null;
  lastSeq: number;
};

export const initialTurn = (message = ""): TurnView => ({ turnId: null, threadId: null, message, status: "starting", steps: [], content: "", answer: null, ask: null, answered: null, sources: [], notices: [], error: null, usage: null, lastSeq: 0 });

const stepOf = (s: TurnView, n: number): [StepView[], StepView] => {
  const steps = s.steps.slice();
  let i = steps.findIndex((x) => x.step === n);
  if (i < 0) {
    steps.push({ step: n, thinking: "", tools: [] });
    i = steps.length - 1;
  }
  const st = { ...steps[i]!, tools: steps[i]!.tools.slice() };
  steps[i] = st;
  return [steps, st];
};

export function reduceTurn(s: TurnView, e: AgentEvent): TurnView {
  if (e.seq !== undefined && e.seq > 0 && e.seq <= s.lastSeq) return s; // trùng khi nối lại
  const n: TurnView = { ...s, lastSeq: e.seq && e.seq > 0 ? e.seq : s.lastSeq };
  switch (e.type) {
    case "turn":
      return { ...n, turnId: e.turnId, threadId: e.threadId, message: e.message || s.message };
    case "status":
    case "end":
      return FINAL.has(n.status as TurnStatus) && e.status === "running" ? n : { ...n, status: e.status };
    case "step": {
      const [steps, st] = stepOf(n, e.step);
      st.forced = e.forced;
      return { ...n, steps, content: "" };
    }
    case "thinking": {
      const [steps, st] = stepOf(n, e.step);
      st.thinking += e.text;
      return { ...n, steps };
    }
    case "content":
      return { ...n, content: n.content + e.text };
    case "tool_call": {
      const [steps, st] = stepOf(n, e.step);
      if (!st.tools.some((t) => t.callId === e.callId)) st.tools.push({ callId: e.callId, step: e.step, tool: e.tool, title: e.title, args: e.args, status: "running" });
      return { ...n, steps };
    }
    case "tool_progress":
    case "tool_result": {
      const steps = n.steps.map((st) => (st.tools.some((t) => t.callId === e.callId) ? { ...st, tools: st.tools.map((t) => (t.callId !== e.callId ? t : e.type === "tool_progress" ? { ...t, progress: e.message } : { ...t, status: e.ok ? ("ok" as const) : ("error" as const), summary: e.summary, ms: e.ms })) } : st));
      return { ...n, steps };
    }
    case "ask_user":
      return { ...n, ask: { callId: e.callId, intro: e.intro, questions: e.questions }, status: "waiting" };
    case "answered": {
      const q = n.ask?.callId === e.callId ? n.ask.questions : (n.answered?.questions ?? []);
      const steps = n.steps.map((st) => ({ ...st, tools: st.tools.map((t) => (t.callId === e.callId ? { ...t, status: "ok" as const, summary: "Em đã trả lời" } : t)) }));
      return { ...n, steps, ask: null, answered: { callId: e.callId, questions: q, answers: e.answers } };
    }
    case "sources":
      return { ...n, sources: [...n.sources, ...e.items.filter((x) => !n.sources.some((y) => y.n === x.n))] };
    case "notice":
      return { ...n, notices: [...n.notices, e.message] };
    case "error":
      return { ...n, error: e.message };
    case "done":
      return { ...n, status: e.status, answer: e.answer || n.content || null, usage: e.usage, ask: e.status === "waiting" ? n.ask : null };
  }
}

const FINAL = new Set<TurnStatus>(["done", "cancelled", "error", "limit", "interrupted"]);
export const isFinal = (s: TurnView["status"]) => FINAL.has(s as TurnStatus);
export const isBusy = (s: TurnView["status"]) => s === "starting" || s === "running";

/** Một dòng tóm tắt quá trình: "3 bước · 2 công cụ · 4,2 giây". */
export function traceSummary(v: TurnView): string {
  const tools = v.steps.reduce((k, s) => k + s.tools.filter((t) => t.tool !== "ask_user").length, 0);
  const parts = [`${v.steps.length} bước`];
  if (tools) parts.push(`${tools} công cụ`);
  if (v.usage) parts.push(seconds(v.usage.ms));
  return parts.join(" · ");
}
export const seconds = (ms: number) => `${(ms / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: ms < 10_000 ? 1 : 0 })} giây`;

/** Xem trước tham số công cụ: giá trị chuỗi đầu tiên (vd từ khoá tra cứu). */
export function argsPreview(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  for (const v of Object.values(args as Record<string, unknown>)) if (typeof v === "string" && v.trim()) return v.length > 80 ? `${v.slice(0, 80)}…` : v;
  return "";
}

/** Câu trả lời ask_user đã đủ để gửi chưa: mọi câu có lựa chọn hoặc chữ "Khác" (bỏ qua thì gửi rỗng — cho phép). */
export const answerOf = (q: AskQuestion, picked: string[], other: string): AskAnswer => ({ id: q.id, selected: q.multi ? picked : picked.slice(0, 1), ...(other.trim() && { other: other.trim() }) });
