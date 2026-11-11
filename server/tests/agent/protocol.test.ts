import { describe, expect, it } from "vitest";
import { z } from "zod";
import { StepParser, argsSchema, parseStep, parseToolJson, protocolPrompt } from "../../src/agent/protocol";
import { defineTool } from "../../src/agent/tools";

/** Cho chuỗi chạy qua bộ tách theo từng mẩu `n` ký tự, gom sự kiện. */
function streamed(text: string, n: number) {
  const ev = { thinking: "", content: "" };
  let stops = 0;
  const p = new StepParser((e) => (ev[e.kind] += e.text), () => stops++);
  for (let i = 0; i < text.length && !p.stopped; i += n) p.feed(text.slice(i, i + n));
  return { ev, stops, step: p.end() };
}

describe("giao thức nhãn: phân tích bước", () => {
  it("THINK + TOOL đúng chuẩn → ok, chuẩn hoá lại", () => {
    const s = parseStep('THINK: Cần tra tài liệu.\nTOOL: {"name": "tra_kho_tri_thuc", "args": {"q": "hằng đẳng thức"}}');
    expect(s.quality).toBe("ok");
    expect(s.thinking).toBe("Cần tra tài liệu.");
    expect(s.calls).toEqual([{ name: "tra_kho_tri_thuc", args: { q: "hằng đẳng thức" }, raw: expect.any(String), repaired: false }]);
    expect(s.answer).toBeNull();
    expect(s.normalized).toBe('THINK: Cần tra tài liệu.\nTOOL: {"name":"tra_kho_tri_thuc","args":{"q":"hằng đẳng thức"}}');
  });

  it("ANSWER nhiều dòng, FINISH là bí danh, nhãn in đậm/ngoặc vẫn nhận", () => {
    expect(parseStep("ANSWER: Dòng 1\n\n- ý a\n- ý b").answer).toBe("Dòng 1\n\n- ý a\n- ý b");
    expect(parseStep("FINISH: Xong").answer).toBe("Xong");
    const b = parseStep("**THINK:** nghĩ\n**ANSWER:** Kết quả $x^2$");
    expect(b).toMatchObject({ quality: "ok", thinking: "nghĩ", answer: "Kết quả $x^2$" });
    expect(parseStep("[ANSWER]\nChào em").answer).toBe("Chào em");
    expect(parseStep("`TOOL`: {\"name\":\"a\",\"args\":{}}").calls[0]).toMatchObject({ name: "a" });
  });

  it("thiếu nhãn → coi là ANSWER (lenient); rỗng/chỉ THINK → failed", () => {
    expect(parseStep("Chào em, đây là câu trả lời.")).toMatchObject({ quality: "lenient", answer: "Chào em, đây là câu trả lời." });
    expect(parseStep("   ").quality).toBe("failed");
    expect(parseStep("THINK: chỉ nghĩ thôi")).toMatchObject({ quality: "failed", answer: null });
  });

  it("nhiều TOOL liên tiếp = song song; JSON trong rào ```json, khoá tool/arguments → lenient", () => {
    const s = parseStep('TOOL: {"name":"a","args":{"x":1}}\nTOOL: {"name":"b","args":{}}');
    expect(s.calls.map((c) => c.name)).toEqual(["a", "b"]);
    const f = parseStep('TOOL:\n```json\n{"tool": "a", "arguments": {"x": 1}}\n```');
    expect(f.quality).toBe("lenient");
    expect(f.calls[0]).toMatchObject({ name: "a", args: { x: 1 } });
  });

  it("JSON hỏng → failed; tên trước dấu { và dấu phẩy thừa vẫn sửa được", () => {
    expect(parseStep('TOOL: {"name": "a", "args": {"x": }').quality).toBe("failed");
    expect(parseToolJson('tra_kho {"q": "abc"}')).toMatchObject({ name: "tra_kho", args: { q: "abc" }, repaired: true });
    expect(parseToolJson('{"name":"a","args":{"x":1,},}')).toMatchObject({ name: "a", args: { x: 1 } });
    expect(parseToolJson('{"name":"a","args":"{\\"x\\":2}"}')).toMatchObject({ args: { x: 2 } });
    expect(parseToolJson('{"args":{}}')).toMatchObject({ error: expect.stringContaining("name") });
  });

  it("viết tiếp sau TOOL (bịa OBSERVATION/ANSWER) → báo dừng, bỏ phần sau", () => {
    const r = streamed('TOOL: {"name":"a","args":{}}\nOBSERVATION: bịa\nANSWER: bịa luôn', 4);
    expect(r.stops).toBe(1);
    expect(r.ev.content).toBe("");
    expect(r.step.calls).toHaveLength(1);
    expect(r.step.answer).toBeNull();
  });

  it("chữ giữa câu như 'Think:' viết thường trong ANSWER không bị tách nhãn", () => {
    const s = parseStep("ANSWER: Bài tiếng Anh:\nThink: suy nghĩ\nTool: công cụ");
    expect(s.answer).toBe("Bài tiếng Anh:\nThink: suy nghĩ\nTool: công cụ");
  });

  it.each([1, 2, 3, 7, 50])("stream mẩu %i ký tự: phát đúng chữ suy nghĩ/trả lời, không lộ nhãn", (n) => {
    const text = "THINK: Em hỏi về hằng đẳng thức.\nANSWER: Ta có $(a+b)^2 = a^2 + 2ab + b^2$.\nTiếp theo, Thay a = x.";
    const r = streamed(text, n);
    expect(r.ev.thinking).toBe("Em hỏi về hằng đẳng thức.\n");
    expect(r.ev.content).toBe("Ta có $(a+b)^2 = a^2 + 2ab + b^2$.\nTiếp theo, Thay a = x.");
    expect(r.step.answer).toBe("Ta có $(a+b)^2 = a^2 + 2ab + b^2$.\nTiếp theo, Thay a = x.");
  });

  it("chữ trước nhãn đầu tiên thành suy nghĩ", () => {
    const r = streamed('Mình cần tra đã.\nTOOL: {"name":"a","args":{}}', 3);
    expect(r.ev.thinking).toBe("Mình cần tra đã.\n");
    expect(r.step.quality).toBe("lenient");
  });

  it("prompt liệt kê công cụ kèm JSON Schema của tham số", () => {
    const t = defineTool({ name: "tra_kho", title: "Tra", description: "tra tài liệu", input: z.object({ q: z.string().describe("từ khoá"), k: z.number().int().optional() }), run: async () => ({ content: "" }) });
    expect(JSON.parse(argsSchema(t))).toMatchObject({ type: "object", properties: { q: { type: "string", description: "từ khoá" } }, required: ["q"] });
    const p = protocolPrompt([t], { maxParallel: 4 });
    expect(p).toContain("- tra_kho: tra tài liệu");
    expect(p).toContain("THINK:");
    expect(p).toContain("Tối đa 4 khối TOOL");
    expect(() => defineTool({ name: "Tra Kho", title: "", description: "", input: z.object({}), run: async () => ({ content: "" }) })).toThrow();
  });
});
