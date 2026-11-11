import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";

let t: Awaited<ReturnType<typeof testApp>>;
let client: Client;
beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${await t.sign({ sub: "gv-mcp", name: "Thầy Minh" })}` } } }));
});
afterEach(async () => {
  await client.close();
  await t.app.close();
});

describe("MCP skill sư phạm", () => {
  it("lay_skill liệt kê và trả toàn văn; prompt cùng tên skill", async () => {
    const list = (await client.callTool({ name: "lay_skill", arguments: {} })) as { content: { text: string }[] };
    expect(JSON.parse(list.content[0]?.text ?? "[]")).toHaveLength(6);
    const one = (await client.callTool({ name: "lay_skill", arguments: { name: "giao-an-5512" } })) as { content: { text: string }[] };
    expect(one.content[0]?.text).toContain("CV 5512");
    expect(one.content[0]?.text).toContain("Tài liệu tham chiếu");
    const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
    expect(prompts).toContain("nhan-xet-tt22-tt27");
    const p = await client.getPrompt({ name: "rubric-tu-luan", arguments: { yeu_cau: "Câu 3 điểm" } });
    expect(JSON.stringify(p.messages)).toContain("Câu 3 điểm");
  });
});
