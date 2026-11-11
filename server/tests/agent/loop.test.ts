import { describe, expect, it } from "vitest";
import { z } from "zod";
import { compact, messagesTokens } from "../../src/agent/context";
import { runAgentLoop, type LoopDeps } from "../../src/agent/loop";
import { askUserTool, createToolRegistry, defineTool } from "../../src/agent/tools";
import type { AgentEvent, AgentTool } from "../../src/agent/types";
import type { AiMessage } from "../../src/services/ai";
import { type Reply, lastUserText, scriptAi } from "../helpers/agentAi";

const actor = { orgId: "o1", userId: "u1", role: "student" as const };
const echo = defineTool({
  name: "tra_cuu",
  title: "Tra cứu",
  description: "tra cứu",
  input: z.object({ q: z.string() }),
  run: async ({ q }) => ({ content: `[#1] Sách A trang 3: nội dung về ${q}\n[#2] Sách B trang 1: thêm`, summary: "2 đoạn", sources: [{ title: "Sách A", page: 3 }, { title: "Sách B", page: 1 }] }),
});

function setup(replies: Reply[], tools: AgentTool[] = [echo, askUserTool], limits: LoopDeps["limits"] = {}, ac = new AbortController()) {
  const fake = scriptAi(replies, { chunk: 6 });
  const events: AgentEvent[] = [];
  const deps: LoopDeps = { ai: fake.ai, task: "tro_ly_tac_tu", tools, limits, actor, turnId: "t1", signal: ac.signal, emit: (e) => events.push(e) };
  const input = { system: "Bạn là gia sư.", history: [] as AiMessage[], user: { role: "user" as const, content: "Hằng đẳng thức là gì?" } };
  return { fake, events, deps, input, ac, types: () => events.map((e) => e.type).filter((x, i, a) => x !== a[i - 1]) };
}

describe("vòng tác tử (AI giả)", () => {
  it("trả lời thẳng không công cụ: stream thinking + content, parse ok", async () => {
    const t = setup(["THINK: Câu dễ.\nANSWER: Là các đẳng thức đáng nhớ."]);
    const o = await runAgentLoop(t.deps, t.input);
    expect(o).toMatchObject({ status: "done", answer: "Là các đẳng thức đáng nhớ." });
    expect(t.events.filter((e) => e.type === "content").map((e) => (e as { text: string }).text).join("")).toBe("Là các đẳng thức đáng nhớ.");
    expect(o.state.usage).toMatchObject({ steps: 1, toolCalls: 0, parse: { ok: 1, lenient: 0, failed: 0 } });
    expect(t.fake.calls[0]!.task).toBe("tro_ly_tac_tu");
    const sys = t.fake.calls[0]!.messages[0]!.content as string;
    expect(sys.startsWith("Bạn là gia sư.")).toBe(true);
    expect(sys).toContain("- tra_cuu: tra cứu");
  });

  it("TOOL → OBSERVATION (đánh số nguồn chung) → ANSWER", async () => {
    const t = setup(['THINK: tra đã\nTOOL: {"name":"tra_cuu","args":{"q":"tổng"}}', "ANSWER: Theo [1] thì…"]);
    const o = await runAgentLoop(t.deps, t.input);
    expect(o.status).toBe("done");
    expect(t.types()).toEqual(["step", "thinking", "tool_call", "sources", "tool_result", "step", "content"]);
    const obs = lastUserText(t.fake.calls[1]!.messages);
    expect(obs).toContain("OBSERVATION (bước 1)");
    expect(obs).toContain("[1] Sách A trang 3: nội dung về tổng");
    expect(obs).toContain("[2] Sách B trang 1");
    expect(o.state.sources.map((s) => s.n)).toEqual([1, 2]);
    // assistant của bước 1 được chuẩn hoá lại trong hội thoại
    expect(t.fake.calls[1]!.messages.at(-2)).toEqual({ role: "assistant", content: 'THINK: tra đã\nTOOL: {"name":"tra_cuu","args":{"q":"tổng"}}' });
    expect(t.events.find((e) => e.type === "tool_result")).toMatchObject({ ok: true, summary: "2 đoạn", tool: "tra_cuu" });
  });

  it("nguồn trùng ở bước sau giữ số cũ; tham số sai / công cụ lạ báo lỗi cho model", async () => {
    const t = setup(['TOOL: {"name":"tra_cuu","args":{"q":"a"}}', 'TOOL: {"name":"tra_cuu","args":{"q":"b"}}\nTOOL: {"name":"tra_cuu","args":{"x":1}}\nTOOL: {"name":"khong_co","args":{}}', "ANSWER: xong"]);
    const o = await runAgentLoop(t.deps, t.input);
    expect(o.state.sources).toHaveLength(2);
    const obs = lastUserText(t.fake.calls[2]!.messages);
    expect(obs).toContain("[1] Sách A trang 3: nội dung về b");
    expect(obs).toContain("[tra_cuu] lỗi tham số: q:");
    expect(obs).toContain("[khong_co] lỗi: không có công cụ này");
    expect(o.state.usage.toolCalls).toBe(3);
  });

  it("bước sai giao thức → nhắc sửa rồi tiếp; đếm failed", async () => {
    const t = setup(["THINK: chỉ nghĩ", 'TOOL: {"name": "tra_cuu", "args": {"q": }', "ANSWER: được rồi"]);
    const o = await runAgentLoop(t.deps, t.input);
    expect(o).toMatchObject({ status: "done", answer: "được rồi" });
    expect(o.state.usage.parse).toEqual({ ok: 1, lenient: 0, failed: 2 });
    expect(lastUserText(t.fake.calls[1]!.messages)).toContain("chưa đúng giao thức");
  });

  it("hết số bước → ép trả lời (thông báo + không còn công cụ trong prompt)", async () => {
    const t = setup(['TOOL: {"name":"tra_cuu","args":{"q":"a"}}', 'TOOL: {"name":"tra_cuu","args":{"q":"b"}}', "ANSWER: tóm lại"], undefined, { maxSteps: 2 });
    const o = await runAgentLoop(t.deps, t.input);
    expect(o).toMatchObject({ status: "done", answer: "tóm lại" });
    expect(t.events.find((e) => e.type === "notice")).toMatchObject({ message: expect.stringContaining("hết ngân sách bước") });
    expect(t.events.filter((e) => e.type === "step").at(-1)).toMatchObject({ step: 3, forced: true });
    const last = t.fake.calls[2]!.messages;
    expect(last[0]!.content).toContain("Lượt này không có công cụ");
    expect(lastUserText(last)).toContain("Đã khám phá đủ");
  });

  it("ép trả lời mà model vẫn gọi công cụ hai lần → dừng 'limit'", async () => {
    const t = setup(['TOOL: {"name":"tra_cuu","args":{"q":"a"}}'], undefined, { maxSteps: 1 });
    const o = await runAgentLoop(t.deps, t.input);
    expect(o.status).toBe("limit");
    expect(t.fake.count).toBe(3);
  });

  it("hết ngân sách token → ép trả lời", async () => {
    const t = setup(['TOOL: {"name":"tra_cuu","args":{"q":"a"}}', "ANSWER: ok"], undefined, { maxTokens: 10 });
    const o = await runAgentLoop(t.deps, t.input);
    expect(o.status).toBe("done");
    expect(t.events.find((e) => e.type === "notice")).toMatchObject({ message: expect.stringContaining("token") });
  });

  it("hết thời gian (đồng hồ giả) → ép trả lời", async () => {
    let clock = 0;
    const t = setup([() => ((clock += 200_000), 'TOOL: {"name":"tra_cuu","args":{"q":"a"}}'), "ANSWER: kịp"]);
    t.deps.now = () => clock;
    const o = await runAgentLoop(t.deps, t.input);
    expect(o.answer).toBe("kịp");
    expect(t.events.find((e) => e.type === "notice")).toMatchObject({ message: expect.stringContaining("thời gian") });
  });

  it("ask_user: dừng chờ (waiting) với câu hỏi chuẩn hoá → tiếp bằng câu trả lời", async () => {
    const t = setup(['THINK: thiếu dữ kiện\nTOOL: {"name":"ask_user","args":{"questions":[{"question":"Em học lớp mấy?","options":["Lớp 8",{"label":"Lớp 9","description":"ôn thi vào 10"},"Khác"],"multi_select":false}, "Em muốn ví dụ không?"]}}', "ANSWER: Với lớp 9 thì…"]);
    const o = await runAgentLoop(t.deps, t.input);
    expect(o.status).toBe("waiting");
    const ask = t.events.find((e) => e.type === "ask_user") as Extract<AgentEvent, { type: "ask_user" }>;
    expect(ask.questions).toEqual([
      { id: "q1", prompt: "Em học lớp mấy?", options: [{ label: "Lớp 8" }, { label: "Lớp 9", description: "ôn thi vào 10" }], multi: false, allowOther: true, header: undefined, placeholder: undefined },
      { id: "q2", prompt: "Em muốn ví dụ không?", options: [], multi: false, allowOther: true },
    ]);
    expect(o.state.pending?.callId).toBe(ask.callId);
    // Tiếp lượt (state qua JSON như khi lưu DB).
    const t2 = setup(["ANSWER: Với lớp 9 thì…"]);
    const o2 = await runAgentLoop(t2.deps, { ...t.input, resume: { state: JSON.parse(JSON.stringify(o.state)), answers: [{ id: "q1", selected: ["Lớp 9"] }, { id: "q2", selected: [], other: "Có ạ" }] } });
    expect(o2).toMatchObject({ status: "done", answer: "Với lớp 9 thì…" });
    expect(t2.events[0]).toMatchObject({ type: "answered", callId: ask.callId });
    const obs = lastUserText(t2.fake.calls[0]!.messages);
    expect(obs).toContain("- Em học lớp mấy? → Lớp 9");
    expect(obs).toContain("- Em muốn ví dụ không? → Có ạ");
    expect(o2.state.usage.steps).toBe(2);
  });

  it("huỷ giữa lúc model đang viết → cancelled, giữ phần đã có", async () => {
    const ac = new AbortController();
    const t = setup([{ hang: true }], undefined, {}, ac);
    const p = runAgentLoop(t.deps, t.input);
    setTimeout(() => ac.abort(), 30);
    expect((await p).status).toBe("cancelled");
  });

  it("cổng AI lỗi → error có thông báo", async () => {
    const { AiUnavailableError } = await import("../../src/errors");
    const t = setup([{ error: new AiUnavailableError("Cổng AI quá tải") }]);
    expect(await runAgentLoop(t.deps, t.input)).toMatchObject({ status: "error", error: "Cổng AI quá tải" });
  });

  it("lịch sử + ảnh đính kèm đi đúng thứ tự: system, lịch sử, câu hỏi, các bước", async () => {
    const t = setup(["ANSWER: ok"]);
    const user: AiMessage = { role: "user", content: [{ type: "text", text: "ảnh này" }, { type: "image_url", image_url: { url: "data:image/png;base64,AAA" } }] };
    await runAgentLoop(t.deps, { ...t.input, user, history: [{ role: "user", content: "trước" }, { role: "assistant", content: "ANSWER: đáp" }] });
    expect(t.fake.calls[0]!.messages.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
    expect(t.fake.calls[0]!.messages[3]).toEqual(user);
  });
});

describe("registry công cụ: quyền theo vai, bật theo ngữ cảnh", () => {
  it("lọc theo vai và enabled; trùng tên bị từ chối", () => {
    const gvOnly = defineTool({ name: "chi_gv", title: "GV", description: "", roles: ["teacher", "owner"], input: z.object({}), run: async () => ({ content: "" }) });
    const needKb = defineTool({ name: "can_kho", title: "Kho", description: "", enabled: ({ params }) => Array.isArray(params.kbIds), input: z.object({}), run: async () => ({ content: "" }) });
    const r = createToolRegistry([echo, gvOnly, needKb]);
    expect(r.available(actor, {}).map((t) => t.name)).toEqual(["tra_cuu"]);
    expect(r.available({ ...actor, role: "teacher" }, { kbIds: [] }).map((t) => t.name)).toEqual(["tra_cuu", "chi_gv", "can_kho"]);
    expect(r.available({ ...actor, role: "teacher" }, {}, ["chi_gv", "khong_co"]).map((t) => t.name)).toEqual(["chi_gv"]);
    expect(() => r.register(echo)).toThrow(/đã đăng ký/);
  });
});

describe("nén ngữ cảnh", () => {
  const big = "x".repeat(9000);
  it("dưới 90% ngân sách thì giữ nguyên", () => {
    const ms: AiMessage[] = [{ role: "system", content: "s" }, { role: "user", content: "q" }];
    expect(compact(ms, 1000, 1)).toEqual({ messages: ms, compacted: false });
  });
  it("rút gọn OBSERVATION cũ, giữ cái cuối; bỏ lịch sử cũ nhất, giữ câu hỏi lượt này", () => {
    const ms: AiMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: `cũ ${big}` },
      { role: "assistant", content: "ANSWER: cũ" },
      { role: "user", content: "câu hỏi lượt này" },
      { role: "assistant", content: "TOOL: {}" },
      { role: "user", content: `OBSERVATION (bước 1)\n${big}` },
      { role: "assistant", content: "TOOL: {}" },
      { role: "user", content: `OBSERVATION (bước 2)\n${"y".repeat(3000)}` },
    ];
    const c = compact(ms, 2000, 3);
    expect(c.compacted).toBe(true);
    expect(messagesTokens(c.messages)).toBeLessThanOrEqual(1800);
    const texts = c.messages.map((m) => m.content as string);
    expect(texts).toContain("câu hỏi lượt này");
    expect(texts.some((x) => x.startsWith("cũ "))).toBe(false);
    expect(texts.some((x) => x.includes("Đã lược bớt"))).toBe(true);
    expect(texts.find((x) => x.startsWith("OBSERVATION (bước 1)"))!.length).toBeLessThan(800);
    expect(texts.find((x) => x.startsWith("OBSERVATION (bước 2)"))).toContain("y".repeat(500));
  });
});
