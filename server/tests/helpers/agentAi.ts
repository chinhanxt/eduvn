import type { Ai, AiMessage } from "../../src/services/ai";

export type Reply = string | ((messages: AiMessage[]) => string) | { hang: true } | { error: Error };

/** AI giả theo kịch bản: mỗi lần gọi stream lấy một câu trả lời, cắt thành mẩu nhỏ (thử bộ tách stream). Hết kịch bản → lặp câu cuối. */
export function scriptAi(replies: Reply[], opts: { chunk?: number; delayMs?: number } = {}) {
  const calls: { task: string; messages: AiMessage[] }[] = [];
  let i = 0;
  const abortErr = () => Object.assign(new Error("aborted"), { name: "AbortError" });
  const sleep = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((res, rej) => {
      if (signal?.aborted) return rej(abortErr());
      const t = setTimeout(res, ms);
      signal?.addEventListener("abort", () => (clearTimeout(t), rej(abortErr())), { once: true });
    });
  const next = (messages: AiMessage[]) => {
    const r = replies[Math.min(i++, replies.length - 1)]!;
    return typeof r === "function" ? r(messages) : r;
  };
  const ai: Ai = {
    async chat(task, messages) {
      calls.push({ task, messages: structuredClone(messages) });
      const r = next(messages);
      if (typeof r !== "string") throw new Error("không hỗ trợ");
      return r;
    },
    async *stream(task, messages, o = {}) {
      calls.push({ task, messages: structuredClone(messages) });
      const r = next(messages);
      if (typeof r === "object" && "hang" in r) {
        await sleep(60_000, o.signal);
        return;
      }
      if (typeof r === "object" && "error" in r) throw r.error;
      const n = opts.chunk ?? 5;
      for (let k = 0; k < r.length; k += n) {
        if (opts.delayMs) await sleep(opts.delayMs, o.signal);
        else if (o.signal?.aborted) throw abortErr();
        yield r.slice(k, k + n);
      }
    },
  };
  return { ai, calls, get count() { return i; } };
}

export const lastUserText = (ms: AiMessage[]) => {
  const m = [...ms].reverse().find((x) => x.role === "user")!;
  return typeof m.content === "string" ? m.content : m.content.map((p) => (p.type === "text" ? p.text : "")).join("");
};
