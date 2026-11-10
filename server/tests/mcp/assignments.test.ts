import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type TApp, bearerOf, classWithStudents, examFor, inHours } from "../helpers/classroom";

let t: TApp;
let client: Client;
let gv: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  gv = bearerOf(await t.sign({ sub: "gv-mcp", name: "Thầy Minh" }));
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: gv } }));
});
afterEach(async () => {
  await client.close();
  await t.app.close();
});
type R = { content: { text: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as R;
const data = (r: R) => JSON.parse(r.content[0]?.text ?? "null");

describe("MCP bài giao", { timeout: 60_000 }, () => {
  it("giao_bai theo tên lớp → ket_qua_bai theo lớp", async () => {
    await classWithStudents(t, gv);
    const examId = await examFor(t, gv);
    const a = data(await call("giao_bai", { class: "10A1", examId, dueAt: inHours(2) }));
    expect(a).toMatchObject({ title: "Kiểm tra 15 phút", status: "published", kind: "test", variantCodes: ["101", "102"], note: expect.stringContaining("/hs") });
    const r = data(await call("ket_qua_bai", { class: "10A1" }));
    expect(r).toMatchObject({ assignment: { id: a.id }, submitted: 0, rosterSize: 3, mean: null, pendingEssays: 0 });
    expect(data(await call("ket_qua_bai", { assignmentId: a.id })).assignment.title).toBe("Kiểm tra 15 phút");
    const bad = await call("giao_bai", { class: "10A1", examId, dueAt: "ngày mai" });
    expect(bad.isError).toBe(true);
    expect((await call("ket_qua_bai", {})).isError).toBe(true);
  });
});
