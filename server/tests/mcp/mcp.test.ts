import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";
import { mcq, responsesFromKey, tf } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let base: string;
let token: string;

beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  token = await t.sign({ sub: "gv-mcp", name: "Thầy Minh" });
});
afterEach(async () => {
  await t.app.close();
});

async function connect(tok = token): Promise<Client> {
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${tok}` } } }));
  return client;
}

type ToolResult = { content: { type: string; text: string }[]; isError?: boolean };
const text = (r: unknown) => (r as ToolResult).content[0]?.text ?? "";
const data = (r: unknown) => JSON.parse(text(r));

const cells = [
  { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2 },
  { topic: "Mệnh đề", level: "NB", type: "true_false", count: 1 },
];

describe("MCP /mcp", () => {
  it("liệt kê đủ tool", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((x) => x.name).sort()).toEqual(["cham_bai", "danh_sach_giao_an", "danh_sach_lop", "danh_sach_van_ban", "diem_danh", "lay_dap_an", "luu_giao_an", "luu_nhan_xet", "nhap_diem", "tao_de", "tao_lop", "tao_van_ban", "them_cau_hoi", "them_hoc_vien", "tim_cau_hoi", "xem_ho_so_hs", "xuat_giao_an", "xuat_ma_tran", "xuat_so_diem", "xuat_word"]);
    await client.close();
  });

  it("luồng đầy đủ: thêm câu → tìm → tạo đề → đáp án → chấm → xuất Word", async () => {
    const client = await connect();
    expect(data(await client.callTool({ name: "them_cau_hoi", arguments: { questions: [mcq({ stem: "C1" }), mcq({ stem: "C2" }), tf()] } })).added).toBe(3);
    expect(data(await client.callTool({ name: "tim_cau_hoi", arguments: { subject: "Toán", grade: 10 } }))).toHaveLength(3);

    const exam = data(await client.callTool({ name: "tao_de", arguments: { title: "KT 15 phút", subject: "Toán", grade: 10, cells, variants: 2, seed: 3 } }));
    expect(exam).toMatchObject({ ok: true, codes: ["101", "102"], questionCount: 3 });

    const keys = data(await client.callTool({ name: "lay_dap_an", arguments: { examId: exam.examId } }));
    const graded = data(await client.callTool({ name: "cham_bai", arguments: { examId: exam.examId, code: "101", responses: responsesFromKey(keys[0].entries) } }));
    expect(graded).toMatchObject({ total: 1.5, autoMax: 1.5 });

    const links = data(await client.callTool({ name: "xuat_word", arguments: { examId: exam.examId } }));
    expect(links.exams).toHaveLength(2);
    expect(links.answerKey.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    await client.close();
  });

  it("tao_de báo thiếu câu bằng isError tiếng Việt", async () => {
    const client = await connect();
    const r = await client.callTool({ name: "tao_de", arguments: { title: "KT", subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 5 }] } });
    expect((r as ToolResult).isError).toBe(true);
    expect(text(r)).toContain("cần 5, có 0");
    await client.close();
  });

  it("lỗi quyền/không tìm thấy trả về isError", async () => {
    const client = await connect();
    const r = await client.callTool({ name: "lay_dap_an", arguments: { examId: "00000000-0000-4000-8000-000000000000" } });
    expect((r as ToolResult).isError).toBe(true);
    await client.close();
  });

  it("người dùng khác (tổ chức khác) không lấy được đáp án", async () => {
    const a = await connect();
    await a.callTool({ name: "them_cau_hoi", arguments: { questions: [mcq({ stem: "C1" }), mcq({ stem: "C2" }), tf()] } });
    const exam = data(await a.callTool({ name: "tao_de", arguments: { title: "KT", subject: "Toán", grade: 10, cells, variants: 1, seed: 3 } }));
    const b = await connect(await t.sign({ sub: "gv-other" }));
    const r = await b.callTool({ name: "lay_dap_an", arguments: { examId: exam.examId } });
    expect((r as ToolResult).isError).toBe(true);
    await a.close();
    await b.close();
  });

  it("401 + resource_metadata khi không có token; 405 với GET", async () => {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
  });
});
