import { timingSafeEqual } from "node:crypto";

export type ContentPart = { type: "text"; text: string } | { type: "image"; mimeType: string; data: string };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };
export type Usage = { inputTokens?: number; outputTokens?: number; cachedReadTokens?: number };

/** Một lần gọi AI đã định tuyến xong. */
export type BackendInput = {
  model: string; // id model cụ thể, vd "claude-sonnet-5-5-low"
  system: string; // lời dặn hệ thống đã gộp (chốt an toàn + tác vụ + system của người gọi)
  messages: ChatMessage[]; // không chứa role "system"; phần tử cuối là tin của người dùng
  conversation?: string; // khoá hội thoại: giữ phiên để tận dụng ngữ cảnh + cache
  timeoutMs: number;
  priority: 0 | 1; // 0 = tương tác (chat), 1 = theo lô
};
export type BackendOutput = { text: string; usage?: Usage; deniedTools: number };

export interface Backend {
  readonly name: string;
  available(): boolean;
  complete(input: BackendInput, onDelta?: (text: string) => void): Promise<BackendOutput>;
}

export class GatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export const textOf = (c: ChatMessage["content"]): string =>
  typeof c === "string" ? c : c.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n");

/** So sánh token không lộ thời gian. */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
