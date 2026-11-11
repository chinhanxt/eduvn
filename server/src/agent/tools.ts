// Registry công cụ của runtime tác tử: schema zod, quyền theo vai, bật theo ngữ cảnh lượt.
// ask_user là công cụ dựng sẵn (thẻ hỏi lại 1–4 câu, theo DeepTutor deeptutor/tools/ask_user.py, Apache-2.0, đã sửa).
import { z } from "zod";
import type { AgentActor, AgentTool, AskQuestion } from "./types";

export const ASK_USER = "ask_user";
export const MAX_QUESTIONS = 4;
export const MAX_OPTIONS = 8;

/** Khai báo công cụ có suy luận kiểu tham số từ schema. */
export function defineTool<S extends z.ZodType>(t: Omit<AgentTool<z.infer<S>>, "input"> & { input: S }): AgentTool {
  if (!/^[a-z][a-z0-9_]*$/.test(t.name)) throw new Error(`Tên công cụ "${t.name}" phải là snake_case không dấu`);
  return t as unknown as AgentTool;
}

const Option = z.union([z.string().trim().min(1).max(120), z.object({ label: z.string().trim().min(1).max(120), description: z.string().trim().max(200).optional() })]);
const Question = z.union([
  z.string().trim().min(1).max(800),
  z.object({
    prompt: z.string().trim().min(1).max(800).optional(),
    question: z.string().trim().min(1).max(800).optional(),
    header: z.string().trim().max(16).optional(),
    options: z.array(Option).max(MAX_OPTIONS).default([]),
    multi: z.boolean().optional(),
    multi_select: z.boolean().optional(),
    allow_other: z.boolean().optional(),
    placeholder: z.string().trim().max(120).optional(),
  }),
]);
export const AskUserInput = z.object({
  intro: z.string().trim().max(400).optional().describe("Một câu dẫn ngắn (không bắt buộc)"),
  questions: z.array(Question).min(1).max(MAX_QUESTIONS).describe("1–4 câu hỏi; mỗi câu có prompt và tối đa 8 phương án {label, description}"),
});

const OTHER = new Set(["khác", "other", "khác (ghi rõ)"]);

/** Chuẩn hoá tham số ask_user (model hay viết lệch: chuỗi trơn, `question` thay `prompt`, `multi_select`) → câu hỏi cho thẻ. */
export function normalizeAsk(input: z.infer<typeof AskUserInput>): { intro?: string; questions: AskQuestion[] } {
  const questions = input.questions.map((q, i): AskQuestion => {
    if (typeof q === "string") return { id: `q${i + 1}`, prompt: q, options: [], multi: false, allowOther: true };
    const options = q.options.map((o) => (typeof o === "string" ? { label: o } : o)).filter((o) => !OTHER.has(o.label.toLowerCase()));
    return { id: `q${i + 1}`, prompt: q.prompt ?? q.question ?? "", header: q.header, options, multi: q.multi ?? q.multi_select ?? false, allowOther: q.allow_other ?? true, placeholder: q.placeholder };
  });
  return { intro: input.intro, questions: questions.filter((q) => q.prompt) };
}

/** ask_user không chạy như công cụ thường: runtime dừng lượt chờ người dùng trả lời rồi tiếp đúng lượt. */
export const askUserTool: AgentTool = defineTool({
  name: ASK_USER,
  title: "Hỏi lại em",
  description: "Hỏi lại người học khi đề bài thiếu dữ kiện hoặc có nhiều cách hiểu (1–4 câu, có phương án để bấm chọn). Chỉ hỏi khi thật cần; lượt dừng đến khi người học trả lời.",
  input: AskUserInput,
  run: async () => ({ content: "" }),
});

export type ToolRegistry = ReturnType<typeof createToolRegistry>;

export function createToolRegistry(initial: AgentTool[] = []) {
  const tools = new Map<string, AgentTool>();
  const reg = {
    /** Đăng ký công cụ (trùng tên → lỗi, tránh hai gói ghi đè nhau). */
    register(...ts: AgentTool[]) {
      for (const t of ts) {
        if (tools.has(t.name)) throw new Error(`Công cụ "${t.name}" đã đăng ký`);
        tools.set(t.name, t);
      }
      return reg;
    },
    get: (name: string) => tools.get(name),
    names: () => [...tools.keys()],
    /** Công cụ người gọi được dùng trong lượt này. `wanted` = danh sách tên của năng lực ("all" = mọi công cụ có quyền). */
    available(actor: AgentActor, params: Record<string, unknown>, wanted: readonly string[] | "all" = "all"): AgentTool[] {
      const pick = wanted === "all" ? [...tools.values()] : wanted.map((n) => tools.get(n)).filter((t): t is AgentTool => !!t);
      return pick.filter((t) => allowed(t, actor, params));
    },
  };
  reg.register(...initial);
  return reg;
}

export function allowed(t: AgentTool, actor: AgentActor, params: Record<string, unknown>): boolean {
  if (t.roles && !t.roles.includes(actor.role)) return false;
  return t.enabled ? t.enabled({ actor, params }) : true;
}
