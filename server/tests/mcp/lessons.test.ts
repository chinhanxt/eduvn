import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";
import { lessonPlan } from "../helpers/lesson";
import { mcq, tf, short } from "../helpers/fixtures";

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
type R = { content: { text: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as R;
const data = (r: R) => JSON.parse(r.content[0]?.text ?? "null");

describe("MCP giáo án", () => {
  it("mô tả luu_giao_an nêu cấu trúc JSON; lỗi → sửa → lưu → xem → xuất", async () => {
    const tool = (await client.listTools()).tools.find((x) => x.name === "luu_giao_an");
    expect(tool?.description).toContain("steps");
    expect(tool?.description).toContain("subs");

    const bad = lessonPlan();
    bad.objectives.qualities = [];
    const rej = await call("luu_giao_an", { plan: bad });
    expect(rej.isError).toBe(true);
    expect(rej.content[0]?.text).toContain("Thiếu 3. Phẩm chất");

    const saved = data(await call("luu_giao_an", { plan: lessonPlan() }));
    expect(saved.created).toBe(true);
    expect(data(await call("danh_sach_giao_an", {}))).toHaveLength(1);
    expect(data(await call("danh_sach_giao_an", { id: saved.id })).plan.header.title).toBe("Mệnh đề");
    const link = data(await call("xuat_giao_an", { id: saved.id }));
    expect(link.url.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    expect((await t.app.inject({ method: "GET", url: new URL(link.url).pathname })).statusCode).toBe(200);
  });
});

describe("MCP ma trận", () => {
  it("tao_de với yccd → xuat_ma_tran trả link .docx + cảnh báo tổng điểm", async () => {
    await call("them_cau_hoi", { questions: [mcq({ stem: "C1" }), mcq({ stem: "C2" }), tf(), short()] });
    const cells = [
      { topic: "Mệnh đề", level: "NB", type: "mcq", count: 2, yccd: "Nhận biết mệnh đề" },
      { topic: "Mệnh đề", level: "NB", type: "true_false", count: 1 },
      { topic: "Mệnh đề", level: "NB", type: "short_answer", count: 1 },
    ];
    const exam = data(await call("tao_de", { title: "KT", subject: "Toán", grade: 10, cells, variants: 1, seed: 1 }));
    const m = data(await call("xuat_ma_tran", { examId: exam.examId }));
    expect(m.url.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    expect(m.totalCount).toBe(4);
    expect(m.totalPoints).toBe(2);
    expect(m.warnings[0]).toContain("chưa đạt 10");
    const dl = await t.app.inject({ method: "GET", url: new URL(m.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-disposition"]).toContain("ma-tran-");
    expect(dl.rawPayload.subarray(0, 2).toString()).toBe("PK");
    const links = data(await call("xuat_word", { examId: exam.examId }));
    expect(links.matrix.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
  });
});
