// server/src/services/ai.ts
/** Gọi cổng AI EDUVN (gateway/, API kiểu OpenAI). Mọi tính năng AI phía lõi đi qua đây.
 *  `task` là tên tác vụ trong gateway/tasks.json (vd "so_do_tu_duy"); cổng tự chọn model + effort. */
import { AiUnavailableError } from "../errors";

export type AiPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type AiMessage = { role: "system" | "user" | "assistant"; content: string | AiPart[] };
export type AiOptions = { json?: boolean; conversation?: string; signal?: AbortSignal };

export type Ai = {
  /** Một lượt, trả nguyên văn bản (json=true → cổng kiểm là JSON hợp lệ). */
  chat(task: string, messages: AiMessage[], opts?: AiOptions): Promise<string>;
  /** Một lượt dạng stream: lần lượt trả từng mẩu chữ. */
  stream(task: string, messages: AiMessage[], opts?: AiOptions): AsyncGenerator<string, void, void>;
};

type Fetch = typeof fetch;

/** Không cấu hình cổng → mọi lệnh gọi ném AiUnavailableError (503). */
export const disabledAi: Ai = {
  chat: async () => {
    throw new AiUnavailableError("Chưa bật cổng AI (đặt GATEWAY_URL và GATEWAY_TOKEN)");
  },
  // eslint-disable-next-line require-yield
  stream: async function* () {
    throw new AiUnavailableError("Chưa bật cổng AI (đặt GATEWAY_URL và GATEWAY_TOKEN)");
  },
};

export function createAi(cfg: { url?: string; token?: string }, fetchImpl: Fetch = fetch): Ai {
  if (!cfg.url || !cfg.token) return disabledAi;
  const base = cfg.url.replace(/\/+$/, "");

  async function post(task: string, messages: AiMessage[], opts: AiOptions, stream: boolean): Promise<Response> {
    let res: Response;
    try {
      res = await fetchImpl(`${base}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${cfg.token}` },
        body: JSON.stringify({
          model: `task:${task}`,
          messages,
          stream,
          ...(opts.json && { response_format: { type: "json_object" } }),
          ...(opts.conversation && { conversation: opts.conversation }),
        }),
        signal: opts.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      throw new AiUnavailableError("Không kết nối được cổng AI");
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      const msg = body?.error?.message ?? `Cổng AI lỗi ${res.status}`;
      if (res.status === 429 || res.status >= 500) throw new AiUnavailableError(msg);
      throw new Error(`Cổng AI từ chối (${res.status}): ${msg}`);
    }
    return res;
  }

  return {
    async chat(task, messages, opts = {}) {
      const res = await post(task, messages, opts, false);
      const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[] };
      return body.choices?.[0]?.message?.content ?? "";
    },
    async *stream(task, messages, opts = {}) {
      const res = await post(task, messages, opts, true);
      if (!res.body) return;
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") return;
          const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string | null } }[]; error?: { message?: string } };
          if (chunk.error) throw new AiUnavailableError(chunk.error.message ?? "Cổng AI lỗi khi đang trả lời");
          const t = chunk.choices?.[0]?.delta?.content;
          if (t) yield t;
        }
      }
    },
  };
}

/** Bóc JSON từ câu trả lời (chịu được ```json … ``` hoặc chữ thừa quanh khối). */
export function parseAiJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const s = (fenced?.[1] ?? text).trim();
  try {
    return JSON.parse(s);
  } catch {
    const a = s.search(/[[{]/);
    const close = s[a] === "[" ? "]" : "}";
    const b = s.lastIndexOf(close);
    if (a < 0 || b <= a) throw new Error("AI không trả JSON");
    return JSON.parse(s.slice(a, b + 1));
  }
}
