import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { AnthropicBackend, apiModel } from "../src/backends/anthropic";

let server: Server | null = null;
let seen: { headers: IncomingMessage["headers"]; body: Record<string, unknown> } | null = null;
async function mock(handler: (res: import("node:http").ServerResponse) => void): Promise<string> {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen = { headers: req.headers, body: JSON.parse(raw) };
      handler(res);
    });
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}
afterEach(async () => {
  await new Promise<void>((r) => (server ? server.close(() => r()) : r()));
  server = null;
  seen = null;
});
const ev = (o: unknown) => `event: x\r\ndata: ${JSON.stringify(o)}\r\n\r\n`;
const input = { model: "claude-sonnet-5-5-low", system: "SYS", messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "chào" }, { type: "image" as const, mimeType: "image/png", data: "AA==" }] }], timeoutMs: 3000, priority: 0 as const };

describe("AnthropicBackend", () => {
  it("bỏ hậu tố effort; model Gemini chạy dự phòng thì dùng Claude Sonnet 5.5", () => {
    expect(apiModel("claude-sonnet-5-5-low")).toBe("claude-sonnet-5-5");
    expect(apiModel("claude-opus-5-5")).toBe("claude-opus-5-5");
    expect(apiModel("gemini-3.8-flash-low")).toBe("claude-sonnet-5-5");
  });
  it("stream chữ, đọc usage, gửi đúng định dạng", async () => {
    const url = await mock((res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(ev({ type: "message_start", message: { usage: { input_tokens: 12, cache_read_input_tokens: 3 } } }));
      res.write(ev({ type: "content_block_delta", delta: { type: "text_delta", text: "Xin " } }));
      res.write(ev({ type: "content_block_delta", delta: { type: "text_delta", text: "chào" } }));
      res.end(ev({ type: "message_delta", usage: { output_tokens: 2 } }));
    });
    const deltas: string[] = [];
    const r = await new AnthropicBackend({ apiKey: "k-test", baseUrl: url }).complete(input, (t) => deltas.push(t));
    expect(r).toEqual({ text: "Xin chào", usage: { inputTokens: 12, cachedReadTokens: 3, outputTokens: 2 }, deniedTools: 0 });
    expect(deltas).toEqual(["Xin ", "chào"]);
    expect(seen!.headers["x-api-key"]).toBe("k-test");
    expect(seen!.headers["anthropic-version"]).toBe("2023-06-01");
    expect(seen!.body).toMatchObject({ model: "claude-sonnet-5-5", system: "SYS", stream: true });
    expect(seen!.body.messages).toEqual([{ role: "user", content: [{ type: "text", text: "chào" }, { type: "image", source: { type: "base64", media_type: "image/png", data: "AA==" } }] }]);
  });
  it("lỗi HTTP thành GatewayError 502", async () => {
    const url = await mock((res) => res.writeHead(401).end('{"error":"bad key"}'));
    await expect(new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).rejects.toMatchObject({ status: 502, code: "upstream_error" });
  });
  it("sự kiện error giữa stream thành 502", async () => {
    const url = await mock((res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(ev({ type: "error", error: { message: "overloaded" } }));
    });
    await expect(new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).rejects.toThrow("overloaded");
  });
  it("quá thời gian thì 504", async () => {
    const url = await mock(() => {});
    await expect(new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete({ ...input, timeoutMs: 100 })).rejects.toMatchObject({ status: 504 });
  });
  it("không có khoá thì không sẵn sàng", () => {
    expect(new AnthropicBackend({ apiKey: "", baseUrl: "http://x" }).available()).toBe(false);
  });
  const okEvents = (res: import("node:http").ServerResponse) => res.writeHead(200, { "content-type": "text/event-stream" });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  it("sự kiện bị cắt giữa JSON và giữa CRLF vẫn đọc được", async () => {
    const url = await mock(async (res) => {
      okEvents(res);
      const a = ev({ type: "content_block_delta", delta: { type: "text_delta", text: "A" } });
      const b = ev({ type: "content_block_delta", delta: { type: "text_delta", text: "B" } });
      const cut = a.indexOf('"delta"');
      res.write(a.slice(0, cut));
      await sleep(20);
      res.write(a.slice(cut, -3)); // dừng trước "\r\n\r\n" cuối: còn "\r"
      await sleep(20);
      res.write(a.slice(-3)); // "\n\r\n"
      await sleep(20);
      res.write(b.slice(0, -2));
      await sleep(20);
      res.end(b.slice(-2));
    });
    expect((await new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).text).toBe("AB");
  });
  it("ký tự nhiều byte bị cắt giữa hai lần ghi", async () => {
    const url = await mock(async (res) => {
      okEvents(res);
      const buf = Buffer.from(ev({ type: "content_block_delta", delta: { type: "text_delta", text: "ộ" } }));
      const k = buf.indexOf(Buffer.from("ộ")) + 1;
      res.write(buf.subarray(0, k));
      await sleep(20);
      res.end(buf.subarray(k));
    });
    expect((await new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).text).toBe("ộ");
  });
  it("sự kiện cuối không có dòng trống vẫn đọc", async () => {
    const url = await mock((res) => {
      okEvents(res);
      res.end(`data: ${JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "end" } })}`);
    });
    expect((await new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).text).toBe("end");
  });
  it("socket đứt giữa stream thành 502", async () => {
    const url = await mock(async (res) => {
      okEvents(res);
      res.write(ev({ type: "content_block_delta", delta: { type: "text_delta", text: "x" } }));
      await sleep(20);
      res.socket?.destroy();
    });
    await expect(new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).rejects.toMatchObject({ status: 502, code: "upstream_error" });
  });
  it("429 thành 503 upstream_busy", async () => {
    const url = await mock((res) => res.writeHead(429).end("{}"));
    await expect(new AnthropicBackend({ apiKey: "x", baseUrl: url }).complete(input)).rejects.toMatchObject({ status: 503, code: "upstream_busy" });
  });
});
