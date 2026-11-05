import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";

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

describe("MCP lớp học", () => {
  it("luồng AI: tạo lớp → thêm HS → điểm → điểm danh → xem hồ sơ → nhận xét → xuất", async () => {
    const lop = data(await call("tao_lop", { name: "6A", schoolYear: "2026-2027", scale: "TT27" }));
    expect(lop.scale).toBe("TT27");
    const add = data(await call("them_hoc_vien", { class: "6A", students: ["Nguyễn Văn An;05/03/2015;Nam", { fullName: "Trần Thị Bình", dob: "01/01/2015" }] }));
    expect(add.added).toBe(2);
    expect(data(await call("danh_sach_lop", {}))[0]).toMatchObject({ name: "6A", studentCount: 2 });
    expect(data(await call("danh_sach_lop", { class: "6A" })).students).toHaveLength(2);

    expect(data(await call("nhap_diem", { class: "6A", column: "TX1", scores: { "Nguyễn Văn An": "8,5" } })).updated).toBe(1);
    const badScore = await call("nhap_diem", { class: "6A", column: "TX1", scores: { "Nguyễn Văn An": 11 } });
    expect(badScore.isError).toBe(true);
    expect(badScore.content[0]?.text).toContain("ngoài thang");
    expect(data(await call("diem_danh", { class: "6A", date: "2026-09-05", records: { "Trần Thị Bình": "excused" }, defaultStatus: "present" })).updated).toBe(2);

    const hs = data(await call("xem_ho_so_hs", { class: "6A", student: "Nguyễn Văn An" }));
    expect(hs.students[0].scores.TX1).toBe(8.5);
    expect(hs.levels).toContain("Hoàn thành tốt");

    const bad = await call("luu_nhan_xet", { class: "6A", term: "HK1", items: [{ student: "Nguyễn Văn An", text: "ngắn", level: "Tốt" }] });
    expect(bad.isError).toBe(true);
    expect(bad.content[0]?.text).toContain("quá ngắn");
    const okText = "Em ngoan, học tập tích cực, cần rèn thêm chữ viết cho đẹp.";
    expect(data(await call("luu_nhan_xet", { class: "6A", term: "HK1", items: [{ student: "Nguyễn Văn An", text: okText, level: "Hoàn thành tốt" }] })).saved).toBe(1);

    const link = data(await call("xuat_so_diem", { class: "6A" }));
    expect(link.url.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    const dl = await t.app.inject({ method: "GET", url: new URL(link.url).pathname });
    expect(dl.statusCode).toBe(200);
  });
});
