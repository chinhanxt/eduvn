// Vòng tác tử qua cổng AI (ai.stream), giao thức nhãn văn bản. Mỗi bước = một lần gọi model:
//   bước có TOOL → chạy công cụ (song song, ≤ maxParallel) → OBSERVATION → bước kế; bước ANSWER → kết thúc.
//   ask_user → dừng lượt (status waiting), lưu state; tiếp bằng resume với câu trả lời.
//   Hết bước/thời gian/token → một bước ép trả lời ("Đã khám phá đủ…"). Bước sai giao thức → nhắc sửa (tính vào số bước).
// Theo DeepTutor deeptutor/agents/loop/agent_loop.py (Apache-2.0), viết lại cho giao thức nhãn và cổng AI EDUVN.
import { AiUnavailableError } from "../errors";
import type { Ai, AiMessage } from "../services/ai";
import { OBS_PREFIX, compact, estimateTokens, messagesTokens } from "./context";
import { FORCE_FINISH_TEXT, type ParsedStep, REPAIR_TEXT, StepParser, protocolPrompt } from "./protocol";
import { ASK_USER, AskUserInput, normalizeAsk } from "./tools";
import type { AgentActor, AgentEvent, AgentLimits, AgentLoopState, AgentTool, AgentUsage, AskAnswer, AskQuestion, ToolSource } from "./types";

export const DEFAULT_LIMITS: AgentLimits = { maxSteps: 8, maxMs: 120_000, maxTokens: 60_000, contextTokens: 24_000, maxParallel: 4 };
const OBS_MAX_CHARS = 6000;
const FORCED_GRACE_MS = 45_000;
const MAX_FAILED_IN_ROW = 3;
const LIMIT_TEXT = "Mình chưa kịp trả lời trọn trong giới hạn của lượt này. Em hỏi lại ngắn hơn hoặc chia nhỏ câu hỏi nhé.";

export type LoopDeps = {
  ai: Ai;
  task: string;
  tools: AgentTool[];
  limits?: Partial<AgentLimits>;
  actor: AgentActor;
  turnId: string;
  params?: Record<string, unknown>;
  signal: AbortSignal;
  emit: (e: AgentEvent) => void;
  now?: () => number;
};

export type LoopInput = {
  /** Lời dặn của năng lực (vai trò, phong cách). Phần giao thức + danh sách công cụ do vòng lặp tự thêm. */
  system: string;
  /** Lịch sử các lượt trước (user/assistant xen kẽ). */
  history: AiMessage[];
  /** Tin của lượt này (có thể kèm ảnh). */
  user: AiMessage;
  /** Tiếp lượt đang chờ ask_user. */
  resume?: { state: AgentLoopState; answers: AskAnswer[] };
};

export type LoopOutcome = { status: "done" | "waiting" | "cancelled" | "error" | "limit"; answer: string; state: AgentLoopState; error?: string };

export const emptyUsage = (): AgentUsage => ({ steps: 0, toolCalls: 0, tokensIn: 0, tokensOut: 0, ms: 0, parse: { ok: 0, lenient: 0, failed: 0 }, compactions: 0 });

/** Câu trả lời ask_user → chữ cho model. */
export function answersText(questions: AskQuestion[], answers: AskAnswer[]): string {
  const lines = questions.map((q) => {
    const a = answers.find((x) => x.id === q.id);
    const parts = [...(a?.selected ?? []), ...(a?.other?.trim() ? [a.other.trim()] : [])];
    return `- ${q.prompt} → ${parts.length ? parts.join("; ") : "(bỏ qua)"}`;
  });
  return `[ask_user] Người học đã trả lời:\n${lines.join("\n")}`;
}

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n)}\n…[cắt bớt ${s.length - n} ký tự]`);

export async function runAgentLoop(deps: LoopDeps, input: LoopInput): Promise<LoopOutcome> {
  const limits: AgentLimits = { ...DEFAULT_LIMITS, ...deps.limits };
  const now = deps.now ?? Date.now;
  const params = deps.params ?? {};
  const toolMap = new Map(deps.tools.map((t) => [t.name, t]));
  const state: AgentLoopState = input.resume
    ? structuredClone(input.resume.state)
    : { messages: [], step: 0, usage: emptyUsage(), pending: null, sources: [] };
  const usage = state.usage;
  const startedAt = now();
  const baseMs = usage.ms;
  const elapsed = () => baseMs + (now() - startedAt);
  const sync = () => (usage.ms = elapsed());

  const systemFull = (forced: boolean) => [input.system.trim(), protocolPrompt(forced ? [] : deps.tools, { maxParallel: limits.maxParallel })].filter(Boolean).join("\n\n");
  const out = (status: LoopOutcome["status"], answer: string, error?: string): LoopOutcome => {
    sync();
    return { status, answer, state, error };
  };

  if (input.resume) {
    const p = state.pending;
    if (p) {
      deps.emit({ type: "answered", callId: p.callId, answers: input.resume.answers });
      state.messages.push({ role: "user", content: `${OBS_PREFIX} (bước ${state.step})\n${[...p.observations, answersText(p.questions, input.resume.answers)].join("\n\n")}\n\nViết bước tiếp theo đúng giao thức.` });
      state.pending = null;
    }
  }

  /** Thêm tin của hệ thống (người dùng): gộp vào tin trước nếu cũng là user, giữ xen kẽ user/assistant. */
  const pushUser = (text: string) => {
    const last = state.messages[state.messages.length - 1];
    if (last?.role === "user" && typeof last.content === "string") last.content += `\n\n${text}`;
    else state.messages.push({ role: "user", content: text });
  };
  let forced = false;
  let forcedTries = 0;
  let failedInRow = 0;
  let lastText = "";

  for (;;) {
    if (deps.signal.aborted) return out("cancelled", lastText);
    const over = state.step >= limits.maxSteps ? "bước" : elapsed() >= limits.maxMs ? "thời gian" : usage.tokensIn + usage.tokensOut >= limits.maxTokens ? "token" : null;
    if (over && !forced) {
      forced = true;
      deps.emit({ type: "notice", level: "info", message: `Đã khám phá đủ (hết ngân sách ${over}), trả lời bằng những gì đã có.` });
      pushUser(FORCE_FINISH_TEXT);
    }

    state.step++;
    usage.steps = state.step;
    deps.emit({ type: "step", step: state.step, ...(forced && { forced: true }) });

    const turnStart = 1 + input.history.length;
    const full: AiMessage[] = [{ role: "system", content: systemFull(forced) }, ...input.history, input.user, ...state.messages];
    const c = compact(full, limits.contextTokens, turnStart);
    if (c.compacted) {
      usage.compactions++;
      deps.emit({ type: "notice", level: "info", message: "Ngữ cảnh gần đầy — đã rút gọn kết quả cũ." });
    }
    usage.tokensIn += messagesTokens(c.messages);

    // Gọi model: dừng khi lượt bị huỷ, khi model viết tiếp sau TOOL (bịa kết quả), hoặc quá giờ.
    const stepCtl = new AbortController();
    const remain = Math.max(1000, limits.maxMs - elapsed()) + (forced ? FORCED_GRACE_MS : 0);
    const timeout = AbortSignal.timeout(remain);
    const signal = AbortSignal.any([deps.signal, stepCtl.signal, timeout]);
    const step = state.step;
    let raw = "";
    const parser = new StepParser(
      (e) => (e.kind === "thinking" ? deps.emit({ type: "thinking", step, text: e.text }) : deps.emit({ type: "content", text: e.text })),
      () => stepCtl.abort(),
    );
    try {
      for await (const chunk of deps.ai.stream(deps.task, c.messages, { signal })) {
        raw += chunk;
        parser.feed(chunk);
        if (parser.stopped) break;
      }
    } catch (e) {
      if (deps.signal.aborted) return out("cancelled", lastText);
      if (!parser.stopped && !stepCtl.signal.aborted) {
        if (timeout.aborted) {
          const partial = parser.end();
          return out("limit", partial.answer ?? (lastText || LIMIT_TEXT));
        }
        return out("error", lastText, e instanceof AiUnavailableError ? e.message : `Lỗi khi gọi AI: ${(e as Error).message}`);
      }
    }
    if (deps.signal.aborted) return out("cancelled", lastText);
    usage.tokensOut += estimateTokens(raw);
    const parsed: ParsedStep = parser.end();
    usage.parse[parsed.quality]++;
    if (parsed.answer) lastText = parsed.answer;

    // Bước cuối: có ANSWER, không gọi công cụ.
    if (parsed.answer !== null && !parsed.calls.length) {
      state.messages.push({ role: "assistant", content: parsed.normalized });
      return out("done", parsed.answer);
    }

    const usable = parsed.calls.filter((x) => !("error" in x));
    if (forced) {
      // Bước ép trả lời mà model vẫn gọi công cụ / không có ANSWER: nhắc một lần nữa rồi dừng.
      state.messages.push({ role: "assistant", content: parsed.normalized || clip(raw, 2000) || "(trống)" });
      if (++forcedTries >= 2) return out("limit", lastText || LIMIT_TEXT);
      pushUser(FORCE_FINISH_TEXT);
      continue;
    }
    if (!usable.length) {
      // Bước hỏng hoàn toàn (thiếu nhãn hành động, JSON sai…): nhắc sửa, tính vào số bước.
      state.messages.push({ role: "assistant", content: parsed.normalized || clip(raw, 2000) || "(trống)" });
      if (++failedInRow >= MAX_FAILED_IN_ROW) return lastText ? out("limit", lastText) : out("error", "", "AI trả lời sai định dạng nhiều lần");
      pushUser(REPAIR_TEXT(parsed.issues));
      continue;
    }
    failedInRow = 0;

    state.messages.push({ role: "assistant", content: parsed.normalized });

    // Chạy công cụ.
    const observations: string[] = [];
    let ask: { callId: string; intro?: string; questions: AskQuestion[] } | null = null;
    const jobs: Promise<void>[] = [];
    parsed.calls.forEach((call, i) => {
      const callId = `s${step}c${i + 1}`;
      if ("error" in call) {
        observations[i] = `[${call.name ?? "?"}] lỗi: ${call.error}`;
        return;
      }
      const tool = toolMap.get(call.name);
      if (!tool) {
        observations[i] = `[${call.name}] lỗi: không có công cụ này. Công cụ có: ${[...toolMap.keys()].join(", ") || "(không có)"}`;
        return;
      }
      if (i >= limits.maxParallel) {
        observations[i] = `[${call.name}] lỗi: quá ${limits.maxParallel} công cụ trong một bước, gọi lại ở bước sau`;
        return;
      }
      usage.toolCalls++;
      if (tool.name === ASK_USER) {
        const p = AskUserInput.safeParse(call.args);
        const n = p.success ? normalizeAsk(p.data) : null;
        if (!n || !n.questions.length) {
          observations[i] = `[ask_user] lỗi: tham số sai — cần {"questions": [{"prompt": "…", "options": [{"label": "…"}]}]}`;
          return;
        }
        if (ask) {
          observations[i] = "[ask_user] lỗi: mỗi bước chỉ một thẻ ask_user (gộp các câu vào một lần gọi)";
          return;
        }
        ask = { callId, ...n };
        deps.emit({ type: "tool_call", step, callId, tool: tool.name, title: tool.title, args: call.args });
        return;
      }
      const parsedArgs = tool.input.safeParse(call.args);
      deps.emit({ type: "tool_call", step, callId, tool: tool.name, title: tool.title, args: call.args });
      if (!parsedArgs.success) {
        const msg = parsedArgs.error.issues.map((x) => `${x.path.join(".") || "args"}: ${x.message}`).join("; ");
        deps.emit({ type: "tool_result", step, callId, tool: tool.name, ok: false, summary: `Tham số sai: ${msg}`, ms: 0 });
        observations[i] = `[${tool.name}] lỗi tham số: ${msg}`;
        return;
      }
      const t0 = now();
      jobs.push(
        (async () => {
          let text: string;
          try {
            const r = await tool.run(parsedArgs.data, { actor: deps.actor, turnId: deps.turnId, params, signal: deps.signal, progress: (message) => deps.emit({ type: "tool_progress", callId, message }) });
            const ok = r.ok ?? true;
            let content = r.content;
            if (r.sources?.length) {
              const added: ToolSource[] = [];
              const map = r.sources.map((s) => {
                const hit = state.sources.find((x) => x.title === s.title && x.page === s.page && x.url === s.url);
                if (hit) return hit.n!;
                const src = { ...s, n: state.sources.length + 1 };
                state.sources.push(src);
                added.push(src);
                return src.n;
              });
              // Công cụ đánh số nguồn cục bộ [#1], [#2]… → đổi sang số chung của lượt [n].
              content = content.replace(/\[#(\d+)\]/g, (m, k: string) => (map[Number(k) - 1] ? `[${map[Number(k) - 1]}]` : m));
              if (added.length) deps.emit({ type: "sources", items: added });
            }
            deps.emit({ type: "tool_result", step, callId, tool: tool.name, ok, summary: r.summary ?? (ok ? "Xong" : "Không thành công"), ms: now() - t0, ...(r.data !== undefined && { data: r.data }) });
            text = `[${tool.name}] ${ok ? "ok" : "không thành công"}\n${clip(content, OBS_MAX_CHARS)}`;
          } catch (e) {
            if (deps.signal.aborted) throw e;
            const msg = (e as Error).message || "lỗi không rõ";
            deps.emit({ type: "tool_result", step, callId, tool: tool.name, ok: false, summary: `Lỗi: ${msg}`, ms: now() - t0 });
            text = `[${tool.name}] lỗi: ${msg}`;
          }
          observations[i] = text;
        })(),
      );
    });
    try {
      await Promise.all(jobs);
    } catch {
      if (deps.signal.aborted) return out("cancelled", lastText);
    }
    if (deps.signal.aborted) return out("cancelled", lastText);
    const obs = observations.filter(Boolean);

    const pendingAsk = ask as { callId: string; intro?: string; questions: AskQuestion[] } | null;
    if (pendingAsk) {
      state.pending = { callId: pendingAsk.callId, questions: pendingAsk.questions, observations: obs };
      deps.emit({ type: "ask_user", callId: pendingAsk.callId, ...(pendingAsk.intro && { intro: pendingAsk.intro }), questions: pendingAsk.questions });
      return out("waiting", "");
    }
    state.messages.push({ role: "user", content: `${OBS_PREFIX} (bước ${step})\n${obs.join("\n\n") || "(không có kết quả)"}\n\nViết bước tiếp theo đúng giao thức.` });
  }
}
