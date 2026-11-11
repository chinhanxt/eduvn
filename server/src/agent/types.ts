// Kiểu chung của runtime tác tử EDUVN (gói G6). Các gói khác (G3 lớp học, G4 workbench, G7 học liệu) chỉ import từ "../agent".
// Thiết kế theo vòng tác tử DeepTutor (deeptutor/agents/loop, Apache-2.0) nhưng dùng giao thức nhãn văn bản thay cho tool-calling gốc.
import type { z } from "zod";
import type { Role } from "../domain/authz";
import type { AiMessage } from "../services/ai";

/** Người gọi lượt. `userId` là id người dùng (Keycloak) hoặc khoá do gói gọi tự đặt. */
export type AgentActor = { orgId: string; userId: string; role: Role };

export type TurnStatus = "running" | "waiting" | "done" | "cancelled" | "error" | "limit" | "interrupted";
export const FINAL_STATUSES: readonly TurnStatus[] = ["done", "cancelled", "error", "limit", "interrupted"];

export type TurnAttachment = { kind: "image"; name: string; dataUrl: string } | { kind: "text"; name: string; text: string };

// ---------------- ask_user ----------------
export type AskOption = { label: string; description?: string };
export type AskQuestion = { id: string; prompt: string; header?: string; options: AskOption[]; multi: boolean; allowOther: boolean; placeholder?: string };
/** Trả lời của người dùng cho một câu: các nhãn đã chọn + chữ "Khác". */
export type AskAnswer = { id: string; selected: string[]; other?: string };

// ---------------- công cụ ----------------
export type ToolContext = {
  actor: AgentActor;
  turnId: string;
  /** Tham số của lượt (vd kbIds do khung soạn chọn). */
  params: Record<string, unknown>;
  signal: AbortSignal;
  /** Báo tiến độ trong lúc công cụ chạy (hiện ở dấu vết). */
  progress: (message: string) => void;
};

export type ToolSource = { n?: number; title: string; page?: number; url?: string; snippet?: string };
export type ToolResult = {
  /** Nội dung đưa lại cho model (OBSERVATION). */
  content: string;
  /** Một dòng ngắn cho dấu vết công cụ trên giao diện. */
  summary?: string;
  /** Nguồn hiện ở cột "Nguồn" (trích dẫn). */
  sources?: ToolSource[];
  /** Dữ liệu có cấu trúc cho giao diện (thẻ, tệp…). Không đưa cho model. */
  data?: unknown;
  ok?: boolean;
};

export type AgentTool<I = unknown> = {
  /** Tên tiếng Việt không dấu snake_case, duy nhất. */
  name: string;
  /** Nhãn hiện trên dấu vết, vd "Tra kho tri thức". */
  title: string;
  /** Một dòng mô tả cho model: khi nào dùng. */
  description: string;
  input: z.ZodType<I>;
  /** Vai được dùng; bỏ trống = mọi vai. */
  roles?: readonly Role[];
  /** Kiểm quyền thêm theo ngữ cảnh (vd lượt có kho mới bật tra kho). */
  enabled?: (ctx: { actor: AgentActor; params: Record<string, unknown> }) => boolean;
  run(input: I, ctx: ToolContext): Promise<ToolResult>;
};

// ---------------- năng lực ----------------
export type AgentLimits = {
  /** Số bước tối đa (mỗi bước = một lần gọi model). Hết thì ép trả lời. */
  maxSteps: number;
  /** Thời gian chạy tối đa (ms, không tính lúc chờ ask_user). Hết thì ép trả lời. */
  maxMs: number;
  /** Ngân sách token ước lượng (vào + ra, cộng mọi bước). Hết thì ép trả lời. */
  maxTokens: number;
  /** Cửa sổ ngữ cảnh ước lượng cho một lần gọi; vượt 90% thì nén. */
  contextTokens: number;
  /** Số công cụ tối đa trong một bước (chạy song song). */
  maxParallel: number;
};

export type Capability = {
  id: string;
  title: string;
  description: string;
  /** Tên icon của bộ icon v2 (web/src/ui/iconNames.ts). */
  icon: string;
  /** Tác vụ cổng AI. */
  task: string;
  /** Lời dặn riêng của năng lực (đặt trước phần giao thức). */
  system: string;
  /** Công cụ được bật: danh sách tên, hoặc "all" = mọi công cụ người gọi có quyền. ask_user luôn có trừ khi `askUser: false`. */
  tools: readonly string[] | "all";
  askUser?: boolean;
  limits?: Partial<AgentLimits>;
  roles?: readonly Role[];
};

// ---------------- sự kiện ----------------
export type AgentUsage = {
  steps: number;
  toolCalls: number;
  tokensIn: number;
  tokensOut: number;
  ms: number;
  /** Chất lượng giao thức nhãn: ok = đúng chuẩn, lenient = sửa được, failed = phải hỏi lại. */
  parse: { ok: number; lenient: number; failed: number };
  compactions: number;
};

export type AgentEvent =
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
  | { type: "sources"; items: ToolSource[] }
  | { type: "notice"; level: "info" | "warn"; message: string }
  | { type: "error"; message: string }
  | { type: "done"; status: TurnStatus; answer: string; usage: AgentUsage };

export type SeqEvent = AgentEvent & { seq: number };

/** Trạng thái vòng lặp lưu lại khi dừng chờ ask_user (tiếp được sau khởi động lại). */
export type AgentLoopState = {
  messages: AiMessage[];
  step: number;
  usage: AgentUsage;
  /** Bước đang chờ: các kết quả công cụ khác trong cùng bước + câu hỏi đang chờ. */
  pending: { callId: string; questions: AskQuestion[]; observations: string[] } | null;
  sources: ToolSource[];
};
