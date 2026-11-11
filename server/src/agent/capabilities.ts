// Registry năng lực (DeepTutor DT-101): mỗi năng lực = tác vụ cổng AI + lời dặn + bộ công cụ + giới hạn. Đợt 1 có "chat"; đợt sau thêm ask_questions, deep_solve, visualize…
import { CHAT_SYSTEM } from "./prompts";
import type { AgentActor, Capability } from "./types";

/** Tác vụ cổng AI của trợ lý tác tử (gateway/tasks.d/g6.json). Cổng chưa nạp tasks.d → AI_TASK_OVERRIDES='{"tro_ly_tac_tu":"gia_su_chat"}'. */
export const AGENT_TASK = "tro_ly_tac_tu";

export const CHAT_CAPABILITY: Capability = {
  id: "chat",
  title: "Hỏi đáp",
  description: "Gia sư trả lời, tự tra tài liệu và hỏi lại khi cần",
  icon: "chat",
  task: AGENT_TASK,
  system: CHAT_SYSTEM,
  tools: "all",
};

export type CapabilityRegistry = ReturnType<typeof createCapabilityRegistry>;

export function createCapabilityRegistry(initial: Capability[] = [CHAT_CAPABILITY]) {
  const caps = new Map<string, Capability>();
  const reg = {
    register(...cs: Capability[]) {
      for (const c of cs) {
        if (caps.has(c.id)) throw new Error(`Năng lực "${c.id}" đã đăng ký`);
        caps.set(c.id, c);
      }
      return reg;
    },
    get: (id: string) => caps.get(id),
    /** Năng lực người gọi được dùng (cho bộ chọn trong khung soạn). */
    list: (actor: AgentActor) => [...caps.values()].filter((c) => !c.roles || c.roles.includes(actor.role)),
  };
  reg.register(...initial);
  return reg;
}
