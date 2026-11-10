import { describe, expect, it } from "vitest";
import { AiUnavailableError } from "../../src/errors";
import { createAi, parseAiJson } from "../../src/services/ai";

const TOKEN = "t".repeat(24);
function fakeFetch(handler: (url: string, body: Record<string, unknown>) => Response) {
  const calls: { url: string; body: Record<string, unknown>; auth: string | null }[] = [];
  const f = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    calls.push({ url, body, auth: new Headers(init.headers).get("authorization") });
    return handler(url, body);
  }) as unknown as typeof fetch;
  return { f, calls };
}
const sse = (chunks: string[]) =>
  new Response(chunks.map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`).join("") + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });

describe("createAi", () => {
  it("chat gửi task:<tên>, Bearer, json_object và trả nội dung", async () => {
    const { f, calls } = fakeFetch(() => Response.json({ choices: [{ message: { content: '{"a":1}' } }] }));
    const ai = createAi({ url: "http://gw/", token: TOKEN }, f);
    expect(await ai.chat("so_do_tu_duy", [{ role: "user", content: "x" }], { json: true, conversation: "c1" })).toBe('{"a":1}');
    expect(calls[0]).toMatchObject({ url: "http://gw/v1/chat/completions", auth: `Bearer ${TOKEN}`, body: { model: "task:so_do_tu_duy", stream: false, response_format: { type: "json_object" }, conversation: "c1" } });
  });

  it("stream ghép các mẩu SSE", async () => {
    const { f } = fakeFetch(() => sse(["Xin ", "chào"]));
    const out: string[] = [];
    for await (const t of createAi({ url: "http://gw", token: TOKEN }, f).stream("gia_su_chat", [{ role: "user", content: "hi" }])) out.push(t);
    expect(out.join("")).toBe("Xin chào");
  });

  it("thiếu cấu hình, 5xx, mất kết nối → AiUnavailableError", async () => {
    await expect(createAi({ url: "http://gw" }).chat("x", [])).rejects.toBeInstanceOf(AiUnavailableError);
    const busy = fakeFetch(() => Response.json({ error: { message: "bận" } }, { status: 503 }));
    await expect(createAi({ url: "http://gw", token: TOKEN }, busy.f).chat("x", [])).rejects.toThrow("bận");
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    await expect(createAi({ url: "http://gw", token: TOKEN }, down).chat("x", [])).rejects.toBeInstanceOf(AiUnavailableError);
  });
});

describe("parseAiJson", () => {
  it("đọc JSON trần, trong ```json```, hoặc lẫn chữ", () => {
    expect(parseAiJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseAiJson('```json\n{"a":2}\n```')).toEqual({ a: 2 });
    expect(parseAiJson('Đây: [1,2] nhé')).toEqual([1, 2]);
  });
});
