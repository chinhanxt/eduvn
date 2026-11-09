import { timingSafeEqual } from "node:crypto";

export type ContentPart = { type: "text"; text: string } | { type: "image"; mimeType: string; data: string };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };
export type Usage = { inputTokens?: number; outputTokens?: number; cachedReadTokens?: number };

/** Một lần gọi AI đã định tuyến xong. */
export type BackendInput = {
  model: string; // id model ưu tiên đầu tiên, vd "claude-sonnet-5-5-low"
  models?: string[]; // danh sách ưu tiên đầy đủ (mặc định chỉ `model`)
  system: string; // lời dặn hệ thống đã gộp (chốt an toàn + tác vụ + system của người gọi)
  messages: ChatMessage[]; // không chứa role "system"; phần tử cuối là tin của người dùng
  conversation?: string; // khoá hội thoại đầy đủ (`tác-vụ:khách`): giữ phiên để tận dụng ngữ cảnh + cache
  sig?: string; // chữ ký phiên (model + băm lời dặn): đổi thì mở phiên mới
  timeoutMs: number;
  priority: 0 | 1; // 0 = tương tác (chat), 1 = theo lô
  signal?: AbortSignal; // huỷ khi người dùng ngắt kết nối
};
export type BackendOutput = { text: string; usage?: Usage; deniedTools: number; toolsRan?: number; agyBlocked?: number; model?: string };

export interface Backend {
  readonly name: string;
  available(): boolean;
  complete(input: BackendInput, onDelta?: (text: string) => void): Promise<BackendOutput>;
  /** Bỏ phiên đang giữ của hội thoại (lịch sử máy khách đã đổi, hoặc phiên nghi ngờ). */
  forget?(key: string): void;
}

export const clientClosed = (): GatewayError => new GatewayError(499, "client_closed", "Người dùng đã huỷ");

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
