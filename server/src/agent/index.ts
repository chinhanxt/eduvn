// Runtime tác tử EDUVN (gói G6). Gói khác import từ đây: "../agent" (server/src/agent).
export * from "./types";
export { createAgentRuntime, userMessage, StartBody, AnswerBody, type AgentRuntime, type AgentOwner, type StartInput } from "./runtime";
export { runAgentLoop, DEFAULT_LIMITS, emptyUsage, answersText, type LoopDeps, type LoopInput, type LoopOutcome } from "./loop";
export { defineTool, createToolRegistry, askUserTool, normalizeAsk, ASK_USER, type ToolRegistry } from "./tools";
export { createCapabilityRegistry, CHAT_CAPABILITY, AGENT_TASK, type CapabilityRegistry } from "./capabilities";
export { StepParser, parseStep, parseToolJson, protocolPrompt, type ParsedStep, type StepQuality } from "./protocol";
export { compact, estimateTokens, messagesTokens } from "./context";
export { kbSearchTool } from "./tools/traKho";
