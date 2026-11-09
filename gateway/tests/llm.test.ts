import { describe, expect, it } from "vitest";
import { PriorityLimiter } from "../src/limiter";
import { extractJson, GUARD, LlmService, RETRY_JSON, RETRY_TEXT } from "../src/llm";
import { parseTasks } from "../src/routes";
import { type Backend, type BackendInput, type BackendOutput, GatewayError } from "../src/types";

class StubBackend implements Backend {
  calls: BackendInput[] = [];
  constructor(
    readonly name: string,
    private readonly answers: Array<string | Error>,
    private up = true,
  ) {}
  available() {
    return this.up;
  }
  async complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
    this.calls.push(input);
    const a = this.answers.shift() ?? "";
    if (a instanceof Error) throw a;
    if (a) onDelta?.(a);
    return { text: a, deniedTools: a ? 0 : 1, usage: { inputTokens: 1, outputTokens: a.length } };
  }
}
const tasks = parseTasks({
  defaults: { model: "claude-sonnet-5-5-low", timeoutMs: 1000, backend: "acp" },
  tasks: {
    gia_su_chat: { model: "claude-sonnet-5-5-low", priority: "interactive", system: "Bạn là gia sư." },
    sinh_cau_hoi: { model: "gemini-3.8-flash-medium", json: true },
  },
});
const mk = (acp: StubBackend, extra: Partial<ConstructorParameters<typeof LlmService>[0]> = {}) =>
  new LlmService({ tasks, backends: { acp }, limiter: new PriorityLimiter(4), ...extra });
const user = (text: string) => ({ role: "user" as const, content: text });

describe("extractJson", () => {
  it("đọc JSON trần, trong khối mã, hoặc lẫn chữ", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('Kết quả:\n```json\n{"a":[1,2]}\n```')).toEqual({ a: [1, 2] });
    expect(extractJson('Đây: {"a":1} xong')).toEqual({ a: 1 });
    expect(() => extractJson("không có gì")).toThrow(expect.objectContaining({ code: "bad_json" }));
  });
});

describe("LlmService", () => {
  it("gộp chốt an toàn + system của tác vụ + system người gọi, bỏ role system khỏi tin nhắn", async () => {
    const acp = new StubBackend("acp", ["chào em"]);
    const r = await mk(acp).complete({ model: "gia_su_chat", messages: [{ role: "system", content: "Lớp 10." }, user("chào")], conversation: "hs-1" });
    expect(r).toMatchObject({ text: "chào em", task: "gia_su_chat", model: "claude-sonnet-5-5-low", backend: "acp", retried: false });
    const call = acp.calls[0]!;
    expect(call.system).toBe(`${GUARD}\n\nBạn là gia sư.\n\nLớp 10.`);
    expect(call.messages).toEqual([user("chào")]);
    expect(call).toMatchObject({ conversation: "hs-1", priority: 0, model: "claude-sonnet-5-5-low" });
  });
  it("trả lời trống (bị chặn công cụ) thì hỏi lại một lần với lời nhắc", async () => {
    const acp = new StubBackend("acp", ["", "trả lời bằng chữ"]);
    const r = await mk(acp).complete({ model: "default", messages: [user("chạy lệnh ls")] });
    expect(r.text).toBe("trả lời bằng chữ");
    expect(r.retried).toBe(true);
    expect(acp.calls[1]!.messages.at(-1)).toEqual(user(RETRY_TEXT));
  });
  it("hai lần trống thì báo 502", async () => {
    const acp = new StubBackend("acp", ["", ""]);
    await expect(mk(acp).complete({ model: "default", messages: [user("x")] })).rejects.toMatchObject({ status: 502, code: "empty_answer" });
  });
  it("tác vụ JSON: tách JSON, hỏng thì hỏi lại", async () => {
    const acp = new StubBackend("acp", ["không phải JSON", '```json\n{"cau":[1]}\n```']);
    const deltas: string[] = [];
    const r = await mk(acp).complete({ model: "sinh_cau_hoi", messages: [user("sinh 1 câu")], onDelta: (t) => deltas.push(t) });
    expect(r.json).toEqual({ cau: [1] });
    expect(r.retried).toBe(true);
    expect(acp.calls[1]!.messages.at(-1)).toEqual(user(RETRY_JSON));
    expect(deltas).toEqual(['```json\n{"cau":[1]}\n```']); // JSON chỉ gửi một lần khi đã hợp lệ
  });
  it("thiếu tin người dùng thì 400", async () => {
    const acp = new StubBackend("acp", ["x"]);
    await expect(mk(acp).complete({ model: "default", messages: [{ role: "system", content: "s" }] })).rejects.toMatchObject({ status: 400 });
  });
  it("backend chính không sẵn sàng thì dùng backend dự phòng", async () => {
    const acp = new StubBackend("acp", [], false);
    const api = new StubBackend("anthropic", ["từ API"]);
    const r = await new LlmService({ tasks, backends: { acp, anthropic: api }, limiter: new PriorityLimiter(2), fallback: "anthropic" }).complete({ model: "default", messages: [user("x")] });
    expect(r).toMatchObject({ text: "từ API", backend: "anthropic" });
  });
  it("backend chính lỗi giữa chừng (vd tài khoản bị khoá) thì gọi lại qua dự phòng", async () => {
    const acp = new StubBackend("acp", [new Error("403 tài khoản bị khoá")]);
    const api = new StubBackend("anthropic", ["vẫn trả lời được"]);
    const r = await new LlmService({ tasks, backends: { acp, anthropic: api }, limiter: new PriorityLimiter(2), fallback: "anthropic" }).complete({ model: "default", messages: [user("x")] });
    expect(r).toMatchObject({ text: "vẫn trả lời được", backend: "anthropic" });
    expect(api.calls).toHaveLength(1);
  });
  it("lỗi do người gọi (4xx) thì không chuyển dự phòng", async () => {
    const acp = new StubBackend("acp", [new GatewayError(400, "bad", "sai")]);
    const api = new StubBackend("anthropic", ["không được gọi"]);
    await expect(new LlmService({ tasks, backends: { acp, anthropic: api }, limiter: new PriorityLimiter(2), fallback: "anthropic" }).complete({ model: "default", messages: [user("x")] })).rejects.toMatchObject({ status: 400 });
    expect(api.calls).toHaveLength(0);
  });
  it("không backend nào sẵn sàng thì 503", async () => {
    const acp = new StubBackend("acp", [], false);
    await expect(mk(acp).complete({ model: "default", messages: [user("x")] })).rejects.toMatchObject({ status: 503, code: "ai_unavailable" });
  });
  it("liệt kê tên tác vụ", () => {
    expect(mk(new StubBackend("acp", [])).taskNames()).toEqual(["gia_su_chat", "sinh_cau_hoi"]);
  });
});
