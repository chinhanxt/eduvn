// Kiểu sự kiện của runtime tác tử (khớp server/src/agent/types.ts). Gói khác dùng qua "web/src/ui/agent".
export type TurnStatus = "running" | "waiting" | "done" | "cancelled" | "error" | "limit" | "interrupted";
export type AskOption = { label: string; description?: string };
export type AskQuestion = { id: string; prompt: string; header?: string; options: AskOption[]; multi: boolean; allowOther: boolean; placeholder?: string };
export type AskAnswer = { id: string; selected: string[]; other?: string };
export type AgentSource = { n?: number; title: string; page?: number; url?: string; snippet?: string };
export type AgentUsage = { steps: number; toolCalls: number; tokensIn: number; tokensOut: number; ms: number; parse: { ok: number; lenient: number; failed: number }; compactions: number };

export type AgentEvent = { seq?: number } & (
  | { type: "turn"; turnId: string; threadId: string; capability: string; message: string }
  | { type: "status"; status: TurnStatus }
  | { type: "step"; step: number; forced?: boolean }
  | { type: "thinking"; step: number; text: string }
  | { type: "content"; text: string }
  | { type: "tool_call"; step: number; callId: string; tool: string; title: string; args: unknown }
  | { type: "tool_progress"; callId: string; message: string }
  | { type: "tool_result"; step: number; callId: string; tool: string; ok: boolean; summary: string; ms: number; data?: unknown }
  | { type: "ask_user"; callId: string; intro?: string; questions: AskQuestion[] }
  | { type: "answered"; callId: string; answers: AskAnswer[] }
  | { type: "sources"; items: AgentSource[] }
  | { type: "notice"; level: "info" | "warn"; message: string }
  | { type: "error"; message: string }
  | { type: "done"; status: TurnStatus; answer: string; usage: AgentUsage }
  | { type: "end"; status: TurnStatus }
);

export type Capability = { id: string; title: string; description: string; icon: string };
export type Attachment = { kind: "image"; name: string; dataUrl: string } | { kind: "text"; name: string; text: string };
export type SendInput = { message: string; capability: string; attachments: Attachment[] };
