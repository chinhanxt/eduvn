// Bộ giao diện tác tử (gói G6) dùng chung cho /hoc (trợ lý), workbench GV (G4), lớp học AI (G3), học liệu (G7).
// CSS: import "../ui/agent/agent.css" ở trang dùng (hoặc nhờ AgentTurn/Composer tự kéo theo khi lazy-load trang).
import "./agent.css";
export { Composer, readAttachment, MAX_IMAGES } from "./Composer";
export { AskUserCard } from "./AskUserCard";
export { ToolTrace } from "./ToolTrace";
export { ThinkingBlock } from "./ThinkingBlock";
export { AgentProcess } from "./AgentProcess";
export { AgentTurn, toCitations } from "./AgentTurn";
export { useAgentThread, type AgentThread } from "./useAgentThread";
export { agentApi, followTurn, type TurnRow } from "./client";
export { reduceTurn, initialTurn, isBusy, isFinal, traceSummary, type TurnView, type StepView, type ToolItem } from "./state";
export type * from "./types";
