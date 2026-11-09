import { type Backend, type BackendInput, type BackendOutput, type ChatMessage, GatewayError, type Usage } from "../types";

export type AnthropicOptions = { apiKey: string; baseUrl: string; maxTokens?: number };
type Event = {
  type?: string;
  delta?: { type?: string; text?: string };
  message?: { usage?: { input_tokens?: number; cache_read_input_tokens?: number } };
  usage?: { output_tokens?: number };
  error?: { message?: string };
};

/** Tên model agy → tên model API: bỏ hậu tố effort; tác vụ dùng Gemini khi chạy dự phòng qua khoá Anthropic thì dùng Claude Sonnet 5.5. */
export const apiModel = (id: string): string => (id.startsWith("claude-") ? id.replace(/-(low|medium|high)$/, "") : "claude-sonnet-5-5");

function toAnthropic(m: ChatMessage) {
  return {
    role: m.role === "assistant" ? "assistant" : "user",
    content:
      typeof m.content === "string"
        ? m.content
        : m.content.map((p) => (p.type === "text" ? { type: "text", text: p.text } : { type: "image", source: { type: "base64", media_type: p.mimeType, data: p.data } })),
  };
}

export async function* sseEvents(body: AsyncIterable<Uint8Array>): AsyncGenerator<Event> {
  const dec = new TextDecoder();
  let buf = "";
  for await (const chunk of body) {
    buf += dec.decode(chunk, { stream: true }).replace(/\r\n/g, "\n");
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim())
        .join("\n");
      if (!data || data === "[DONE]") continue;
      try {
        yield JSON.parse(data) as Event;
      } catch {
        // bỏ dòng hỏng
      }
    }
  }
}

/** Backend dự phòng bằng khoá API chính thức (khi tài khoản agy bị khoá hoặc cần tốc độ ổn định). */
export class AnthropicBackend implements Backend {
  readonly name = "anthropic";

  constructor(private readonly o: AnthropicOptions) {}

  available(): boolean {
    return !!this.o.apiKey;
  }

  async complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), input.timeoutMs);
    try {
      const res = await fetch(`${this.o.baseUrl.replace(/\/+$/, "")}/v1/messages`, {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json", "x-api-key": this.o.apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: apiModel(input.model),
          max_tokens: this.o.maxTokens ?? 8192,
          system: input.system,
          stream: true,
          messages: input.messages.map(toAnthropic),
        }),
      });
      if (!res.ok || !res.body) throw new GatewayError(502, "upstream_error", `Anthropic trả ${res.status}: ${(await res.text()).slice(0, 200)}`);
      let text = "";
      const usage: Usage = {};
      for await (const ev of sseEvents(res.body as unknown as AsyncIterable<Uint8Array>)) {
        if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
          text += ev.delta.text;
          onDelta?.(ev.delta.text);
        } else if (ev.type === "message_start") {
          usage.inputTokens = ev.message?.usage?.input_tokens;
          usage.cachedReadTokens = ev.message?.usage?.cache_read_input_tokens;
        } else if (ev.type === "message_delta") {
          usage.outputTokens = ev.usage?.output_tokens;
        } else if (ev.type === "error") {
          throw new GatewayError(502, "upstream_error", ev.error?.message ?? "Anthropic lỗi");
        }
      }
      return { text, usage, deniedTools: 0 };
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new GatewayError(504, "timeout", "AI trả lời quá thời gian");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
