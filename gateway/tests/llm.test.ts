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
    expect(call).toMatchObject({ conversation: "gia_su_chat:hs-1", priority: 0, model: "claude-sonnet-5-5-low" });
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
    expect(deltas).toEqual(['{"cau":[1]}']); // JSON chỉ gửi một lần, đã kiểm
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
  it("hội thoại có khoá: backend dự phòng nhận đủ lịch sử", async () => {
    const acp = new StubBackend("acp", ["lượt một", new Error("503 hỏng")]);
    const api = new StubBackend("anthropic", ["lượt hai"]);
    const svc = new LlmService({ tasks, backends: { acp, anthropic: api }, limiter: new PriorityLimiter(2), fallback: "anthropic" });
    await svc.complete({ model: "default", messages: [user("một")], conversation: "c" });
    const r = await svc.complete({ model: "default", messages: [user("hai")], conversation: "c" });
    expect(r.backend).toBe("anthropic");
    expect(api.calls[0]!.messages).toEqual([user("một"), { role: "assistant", content: "lượt một" }, user("hai")]);
  });
  it("máy khách gửi cả lịch sử thì dùng nguyên và thay bản lưu", async () => {
    const acp = new StubBackend("acp", ["a", "b"]);
    const svc = mk(acp);
    await svc.complete({ model: "default", messages: [user("x")], conversation: "c" });
    const hist = [user("p"), { role: "assistant" as const, content: "q" }, user("r")];
    await svc.complete({ model: "default", messages: hist, conversation: "c" });
    expect(acp.calls[1]!.messages).toEqual(hist);
  });
  it("sweep xoá lịch sử hội thoại nhàn rỗi", async () => {
    const svc = mk(new StubBackend("acp", ["a"]));
    await svc.complete({ model: "default", messages: [user("x")], conversation: "c" });
    expect(svc.conversations()).toBe(1);
    svc.sweep(Date.now() + 1000, 900000);
    expect(svc.conversations()).toBe(1);
    svc.sweep(Date.now() + 1000000, 900000);
    expect(svc.conversations()).toBe(0);
  });
  it("đã stream chữ rồi mới lỗi thì không chuyển dự phòng", async () => {
    class Half extends StubBackend {
      async complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
        this.calls.push(input);
        onDelta?.("nửa");
        throw new Error("đứt");
      }
    }
    const acp = new Half("acp", []);
    const api = new StubBackend("anthropic", ["x"]);
    const deltas: string[] = [];
    await expect(
      new LlmService({ tasks, backends: { acp, anthropic: api }, limiter: new PriorityLimiter(2), fallback: "anthropic" }).complete({ model: "default", messages: [user("x")], onDelta: (t) => deltas.push(t) }),
    ).rejects.toMatchObject({ status: 502, code: "upstream_error" });
    expect(api.calls).toHaveLength(0);
    expect(deltas).toEqual(["nửa"]);
  });
  it("extractJson bỏ qua {…} không phải JSON", () => {
    expect(extractJson('Dùng {x} như sau: {"a":1}')).toEqual({ a: 1 });
  });
  it("hai lượt đồng thời cùng khoá chạy lần lượt, lượt sau thấy lượt trước", async () => {
    class Slow extends StubBackend {
      async complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
        if (this.calls.length === 0) await new Promise((r) => setTimeout(r, 60));
        return super.complete(input, onDelta);
      }
    }
    const acp = new Slow("acp", ["đáp một", "đáp hai"]);
    const svc = mk(acp);
    await Promise.all([
      svc.complete({ model: "default", messages: [user("một")], conversation: "c" }),
      svc.complete({ model: "default", messages: [user("hai")], conversation: "c" }),
    ]);
    expect(acp.calls[1]!.messages).toEqual([user("một"), { role: "assistant", content: "đáp một" }, user("hai")]);
  });
  it("lịch sử lưu không giữ ảnh", async () => {
    const acp = new StubBackend("acp", ["a", "b"]);
    const svc = mk(acp);
    await svc.complete({ model: "default", messages: [{ role: "user", content: [{ type: "text", text: "xem" }, { type: "image", mimeType: "image/png", data: "AA==" }] }], conversation: "c" });
    await svc.complete({ model: "default", messages: [user("tiếp")], conversation: "c" });
    expect(acp.calls[1]!.messages[0]).toEqual({ role: "user", content: [{ type: "text", text: "xem" }, { type: "text", text: "[ảnh]" }] });
  });
});

class ToolStub extends StubBackend {
  forgotten: string[] = [];
  constructor(name: string, answers: Array<string | Error>, private readonly tools: number[]) {
    super(name, answers);
  }
  async complete(input: BackendInput, onDelta?: (t: string) => void): Promise<BackendOutput> {
    const o = await super.complete(input, onDelta);
    return { ...o, toolsRan: this.tools.shift() ?? 0 };
  }
  forget(key: string) {
    this.forgotten.push(key);
  }
}

describe("LlmService phạm vi hội thoại, JSON, công cụ, số đo", () => {
  it("cùng khách, hai tác vụ: tác vụ sau mở phiên mới với system riêng", async () => {
    const acp = new StubBackend("acp", ["a", "b"]);
    const svc = mk(acp);
    await svc.complete({ model: "gia_su_chat", messages: [user("một")], conversation: "hs" });
    await svc.complete({ model: "sinh_cau_hoi", messages: [user("hai")], conversation: "hs", json: false });
    expect(acp.calls[0]!.conversation).toBe("gia_su_chat:hs");
    expect(acp.calls[1]!.conversation).toBe("sinh_cau_hoi:hs");
    expect(acp.calls[1]!.messages).toEqual([user("hai")]);
    expect(acp.calls[1]!.system).not.toContain("Bạn là gia sư.");
  });
  it("system đổi trên cùng khoá thì chữ ký đổi (phiên mới), model đổi cũng vậy", async () => {
    const acp = new StubBackend("acp", ["a", "b", "c"]);
    const svc = mk(acp);
    const ask = (sys: string) => svc.complete({ model: "gia_su_chat", messages: [{ role: "system", content: sys }, user("x")], conversation: "hs" });
    await ask("ngữ cảnh 1");
    await ask("ngữ cảnh 1");
    await ask("ngữ cảnh 2");
    expect(acp.calls[0]!.sig).toBe(acp.calls[1]!.sig);
    expect(acp.calls[2]!.sig).not.toBe(acp.calls[1]!.sig);
    expect(acp.calls[0]!.sig).toMatch(/^claude-sonnet-5-5-low\|[0-9a-f]{40}$/);
  });
  it("lịch sử máy khách bị sửa thì backend phải bỏ phiên; nối tiếp đúng thì giữ", async () => {
    const acp = new ToolStub("acp", ["q", "r", "s"], []);
    const svc = mk(acp);
    await svc.complete({ model: "default", messages: [user("p")], conversation: "c" });
    const ok = [user("p"), { role: "assistant" as const, content: "q" }, user("p2")];
    await svc.complete({ model: "default", messages: ok, conversation: "c" });
    expect(acp.forgotten).toEqual([]);
    const edited = [user("p đã sửa"), { role: "assistant" as const, content: "q" }, user("p3")];
    await svc.complete({ model: "default", messages: edited, conversation: "c" });
    expect(acp.forgotten).toEqual(["claude-sonnet-5-5-low:c"]);
  });
  it("chế độ JSON trả đúng JSON đã kiểm, kể cả khi stream", async () => {
    const acp = new StubBackend("acp", ['Kết quả:\n```json\n{"a":1}\n```', 'Đây {"b":2} xong']);
    const svc = mk(acp);
    const r = await svc.complete({ model: "sinh_cau_hoi", messages: [user("x")] });
    expect(JSON.parse(r.text)).toEqual({ a: 1 });
    const deltas: string[] = [];
    const r2 = await svc.complete({ model: "default", json: true, messages: [user("y")], onDelta: (t) => deltas.push(t) });
    expect(deltas).toEqual(['{"b":2}']);
    expect(r2.text).toBe('{"b":2}');
  });
  it("AI chạy công cụ: bỏ câu trả lời, hỏi lại một lần (phiên tạm), rồi trả", async () => {
    const acp = new ToolStub("acp", ["ĐÃ ĐỌC FILE", "trả lời chữ"], [1, 0]);
    const logs: string[] = [];
    const svc = mk(acp, { log: (m) => logs.push(m) });
    const r = await svc.complete({ model: "default", messages: [user("x")], conversation: "c" });
    expect(r.text).toBe("trả lời chữ");
    expect(acp.forgotten).toEqual(["claude-sonnet-5-5-low:c"]);
    expect(acp.calls[1]!.conversation).toBeUndefined();
    expect(acp.calls[1]!.messages.at(-1)).toEqual(user(RETRY_TEXT));
    expect(logs.join()).toContain("công cụ");
    expect(svc.metrics()).toMatchObject({ requests: 1, retries: 1, toolBlocked: 0 });
  });
  it("công cụ lần hai thì 502 tool_used", async () => {
    const acp = new ToolStub("acp", ["x", "y"], [2, 1]);
    const svc = mk(acp, { log: () => {} });
    await expect(svc.complete({ model: "default", messages: [user("x")] })).rejects.toMatchObject({ status: 502, code: "tool_used" });
    expect(svc.metrics()).toMatchObject({ errors: 1, toolBlocked: 1 });
  });
  it("chuyển dự phòng được đếm và ghi cảnh báo", async () => {
    const acp = new StubBackend("acp", [new GatewayError(502, "upstream_error", "khoá")]);
    const api = new StubBackend("anthropic", ["ok"]);
    const logs: string[] = [];
    const svc = new LlmService({ tasks, backends: { acp, anthropic: api }, limiter: new PriorityLimiter(2), fallback: "anthropic", log: (m) => logs.push(m) });
    await svc.complete({ model: "default", messages: [user("x")] });
    expect(svc.metrics().fallbacks).toBe(1);
    expect(logs[0]).toContain("anthropic");
  });
  it("lịch sử lưu bỏ tin rỗng và không mở đầu bằng trợ lý", async () => {
    const acp = new StubBackend("acp", ["a", "b"]);
    const svc = mk(acp);
    await svc.complete({ model: "default", messages: [{ role: "assistant", content: "mở đầu" }, user(""), user("x")], conversation: "c" });
    await svc.complete({ model: "default", messages: [user("tiếp")], conversation: "c" });
    expect(acp.calls[1]!.messages).toEqual([user("x"), { role: "assistant", content: "a" }, user("tiếp")]);
  });
});
