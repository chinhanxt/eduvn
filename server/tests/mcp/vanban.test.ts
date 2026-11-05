import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";
import { congVan } from "../helpers/vanban";

let t: Awaited<ReturnType<typeof testApp>>;
let client: Client;
beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${await t.sign({ sub: "gv-vb", name: "Thầy Minh" })}` } } }));
});
afterEach(async () => {
  await client.close();
  await t.app.close();
});
type R = { content: { text: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as R;
const data = (r: R) => JSON.parse(r.content[0]?.text ?? "null");

describe("MCP văn bản hành chính", () => {
  it("mô tả nêu khoá JSON; lỗi → sửa → tạo + link .docx → danh sách → xem", async () => {
    const tool = (await client.listTools()).tools.find((x) => x.name === "tao_van_ban");
    expect(tool?.description).toContain("co_quan_chu_quan");
    expect(tool?.description).toContain("chuc_vu_cap_tren");
    expect(tool?.description).toContain("thanh_phan");

    const rej = await call("tao_van_ban", { van_ban: congVan({ kinh_gui: [], noi_nhan: [] }) });
    expect(rej.isError).toBe(true);
    expect(rej.content[0]?.text).toContain("Thiếu nơi nhận (noi_nhan)");

    const saved = data(await call("tao_van_ban", { van_ban: congVan() }));
    expect(saved).toMatchObject({ created: true, loai: "cong_van", soKyHieu: "…/THPTND-VP" });
    expect(saved.url.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    const dl = await t.app.inject({ method: "GET", url: new URL(saved.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.rawPayload.subarray(0, 2).toString()).toBe("PK");

    expect(data(await call("danh_sach_van_ban", {}))).toHaveLength(1);
    expect(data(await call("danh_sach_van_ban", { id: saved.id })).vanBan.kinh_gui).toEqual(["Phòng Giáo dục và Đào tạo Quận 1"]);
    const upd = data(await call("tao_van_ban", { id: saved.id, van_ban: congVan({ so: 12 }) }));
    expect(upd).toMatchObject({ created: false, soKyHieu: "12/THPTND-VP" });
  });
});
