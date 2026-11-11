// Ước lượng token và nén ngữ cảnh cho vòng tác tử (theo ý DeepTutor agents/loop/context_budget.py: tới 90% cửa sổ thì cắt kết quả công cụ cũ).
import type { AiMessage } from "../services/ai";

/** Ước lượng thô: ~3 ký tự/token cho tiếng Việt có dấu, ảnh ~800 token. Cổng AI không trả usage khi stream nên chỉ dùng số ước lượng. */
export function estimateTokens(content: AiMessage["content"] | string): number {
  if (typeof content === "string") return Math.ceil(content.length / 3);
  return content.reduce((n, p) => n + (p.type === "text" ? Math.ceil(p.text.length / 3) : 800), 0);
}
export const messagesTokens = (ms: AiMessage[]) => ms.reduce((n, m) => n + 4 + estimateTokens(m.content), 0);

export const OBS_PREFIX = "OBSERVATION";
const KEEP_OBS_CHARS = 600;
const textOf = (c: AiMessage["content"]) => (typeof c === "string" ? c : c.map((p) => (p.type === "text" ? p.text : "")).join(""));
const isObs = (m: AiMessage) => m.role === "user" && textOf(m.content).startsWith(OBS_PREFIX);
const shorten = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n)}\n…[đã rút gọn ${s.length - n} ký tự để vừa ngữ cảnh]`);

/**
 * Nén khi vượt 90% `budget`:
 *  1) rút gọn các OBSERVATION cũ (giữ nguyên cái cuối);
 *  2) bỏ dần tin lịch sử cũ nhất (trước `turnStart`), chèn một dòng ghi chú;
 *  3) vẫn quá → rút gọn cả OBSERVATION cuối.
 * messages[0] là system, messages[turnStart] là câu hỏi của lượt này — không bao giờ bỏ.
 */
export function compact(messages: AiMessage[], budget: number, turnStart: number): { messages: AiMessage[]; compacted: boolean } {
  const limit = Math.floor(budget * 0.9);
  if (messagesTokens(messages) <= limit) return { messages, compacted: false };
  let ms = messages.map((m) => ({ ...m }));
  const obsIdx = ms.map((m, i) => (isObs(m) ? i : -1)).filter((i) => i >= 0);
  for (const i of obsIdx.slice(0, -1)) ms[i] = { ...ms[i]!, content: shorten(textOf(ms[i]!.content), KEEP_OBS_CHARS) };
  let start = turnStart;
  let dropped = 0;
  while (messagesTokens(ms) > limit && start > 1) {
    ms.splice(1, 1);
    start--;
    dropped++;
  }
  if (dropped) {
    ms.splice(1, 0, { role: "user", content: `[Đã lược bớt ${dropped} tin cũ của cuộc trò chuyện để vừa ngữ cảnh.]` }, { role: "assistant", content: "ANSWER: Đã hiểu." });
  }
  const lastObs = ms.map((m, i) => (isObs(m) ? i : -1)).filter((i) => i >= 0).pop();
  if (messagesTokens(ms) > limit && lastObs !== undefined) {
    const over = messagesTokens(ms) - limit;
    const t = textOf(ms[lastObs]!.content);
    ms[lastObs] = { ...ms[lastObs]!, content: shorten(t, Math.max(KEEP_OBS_CHARS, t.length - over * 3)) };
  }
  ms = ms.filter(Boolean);
  return { messages: ms, compacted: true };
}
