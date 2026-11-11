import { describe, expect, it } from "vitest";
import { argsPreview, answerOf, initialTurn, isBusy, reduceTurn, seconds, traceSummary } from "../src/ui/agent/state";
import type { AgentEvent } from "../src/ui/agent/types";
import { createSseParser } from "../src/ui/data/stream";

const usage = { steps: 2, toolCalls: 1, tokensIn: 900, tokensOut: 120, ms: 4200, parse: { ok: 2, lenient: 0, failed: 0 }, compactions: 0 };
const run: AgentEvent[] = [
  { seq: 1, type: "turn", turnId: "t1", threadId: "m1", capability: "chat", message: "Hằng đẳng thức?" },
  { seq: 2, type: "status", status: "running" },
  { seq: 3, type: "step", step: 1 },
  { seq: 4, type: "thinking", step: 1, text: "Cần tra " },
  { seq: 5, type: "thinking", step: 1, text: "sách." },
  { seq: 6, type: "tool_call", step: 1, callId: "s1c1", tool: "tra_kho_tri_thuc", title: "Tra kho tri thức", args: { q: "bình phương một tổng" } },
  { seq: 7, type: "tool_progress", callId: "s1c1", message: "Đang tìm" },
  { seq: 8, type: "sources", items: [{ n: 1, title: "toan8.docx", page: 1 }] },
  { seq: 9, type: "tool_result", step: 1, callId: "s1c1", tool: "tra_kho_tri_thuc", ok: true, summary: "3 đoạn", ms: 40 },
  { seq: 10, type: "step", step: 2 },
  { seq: 11, type: "content", text: "Theo [1], " },
  { seq: 12, type: "content", text: "$(a+b)^2$…" },
  { seq: 13, type: "done", status: "done", answer: "Theo [1], $(a+b)^2$…", usage },
];

describe("ui/agent: dựng lượt từ sự kiện", () => {
  it("đủ chuỗi sự kiện → bước, suy nghĩ, công cụ, nguồn, câu trả lời", () => {
    const v = run.reduce(reduceTurn, initialTurn());
    expect(v).toMatchObject({ turnId: "t1", threadId: "m1", message: "Hằng đẳng thức?", status: "done", answer: "Theo [1], $(a+b)^2$…", lastSeq: 13 });
    expect(v.steps).toHaveLength(2);
    expect(v.steps[0]).toMatchObject({ thinking: "Cần tra sách.", tools: [{ callId: "s1c1", status: "ok", summary: "3 đoạn", ms: 40, progress: "Đang tìm" }] });
    expect(v.sources).toEqual([{ n: 1, title: "toan8.docx", page: 1 }]);
    expect(traceSummary(v)).toBe("2 bước · 1 công cụ · 4,2 giây");
    expect(isBusy(v.status)).toBe(false);
  });

  it("nối lại gửi trùng sự kiện → bỏ qua (không nhân đôi chữ)", () => {
    const half = run.slice(0, 11).reduce(reduceTurn, initialTurn());
    const again = run.slice(8).reduce(reduceTurn, half);
    expect(again.content).toBe("Theo [1], $(a+b)^2$…");
    expect(again.steps[0]!.tools).toHaveLength(1);
  });

  it("bước mới xoá chữ tạm của bước trước; status running đến muộn không đè trạng thái cuối", () => {
    let v = reduceTurn(initialTurn(), { seq: 1, type: "step", step: 1 });
    v = reduceTurn(v, { seq: 2, type: "content", text: "nháp" });
    v = reduceTurn(v, { seq: 3, type: "step", step: 2 });
    expect(v.content).toBe("");
    v = reduceTurn(v, { seq: 4, type: "done", status: "cancelled", answer: "", usage });
    v = reduceTurn(v, { type: "status", status: "running" });
    expect(v.status).toBe("cancelled");
  });

  it("ask_user → waiting có câu hỏi; answered → thẻ chỉ đọc, dấu vết đánh dấu xong", () => {
    const q = [{ id: "q1", prompt: "Lớp mấy?", options: [{ label: "8" }, { label: "9" }], multi: false, allowOther: true }];
    let v = initialTurn();
    v = reduceTurn(v, { seq: 1, type: "step", step: 1 });
    v = reduceTurn(v, { seq: 2, type: "tool_call", step: 1, callId: "s1c1", tool: "ask_user", title: "Hỏi lại em", args: {} });
    v = reduceTurn(v, { seq: 3, type: "ask_user", callId: "s1c1", questions: q });
    expect(v.status).toBe("waiting");
    expect(v.ask?.questions[0]!.prompt).toBe("Lớp mấy?");
    v = reduceTurn(v, { seq: 4, type: "status", status: "running" });
    v = reduceTurn(v, { seq: 5, type: "answered", callId: "s1c1", answers: [{ id: "q1", selected: ["9"] }] });
    expect(v.ask).toBeNull();
    expect(v.answered).toEqual({ callId: "s1c1", questions: q, answers: [{ id: "q1", selected: ["9"] }] });
    expect(v.steps[0]!.tools[0]).toMatchObject({ status: "ok", summary: "Em đã trả lời" });
  });

  it("tiện ích: xem trước tham số, thời gian, gói câu trả lời", () => {
    expect(argsPreview({ k: 3, q: "hiệu hai bình phương" })).toBe("hiệu hai bình phương");
    expect(argsPreview(null)).toBe("");
    expect(seconds(400)).toBe("0,4 giây");
    expect(seconds(12_300)).toBe("12,3 giây");
    const q = { id: "q1", prompt: "?", options: [], multi: false, allowOther: true };
    expect(answerOf(q, ["a", "b"], "  khác ")).toEqual({ id: "q1", selected: ["a"], other: "khác" });
    expect(answerOf({ ...q, multi: true }, ["a", "b"], "")).toEqual({ id: "q1", selected: ["a", "b"] });
  });

  it("bộ tách SSE giữ id (seq) để nối lại bằng Last-Event-ID", () => {
    const got: { id?: string; data: unknown }[] = [];
    const p = createSseParser((e) => got.push({ id: e.id, data: e.data }));
    p.push('id: 7\ndata: {"type":"content","text":"a"}\n\n: ping\n\ndata: {"type":"end","status":"done"}\n\n');
    expect(got).toEqual([{ id: "7", data: { type: "content", text: "a" } }, { id: "7", data: { type: "end", status: "done" } }]);
  });
});
