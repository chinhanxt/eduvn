import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PUBLIC_URL, testApp } from "../helpers/app";
import { mcq } from "../helpers/fixtures";
import { lessonPlan } from "../helpers/lesson";

let t: Awaited<ReturnType<typeof testApp>>;
let client: Client;
beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: { authorization: `Bearer ${await t.sign({ sub: "gv-sg", name: "Thầy Minh" })}` } } }));
});
afterEach(async () => {
  await client.close();
  await t.app.close();
});
type R = { content: { text: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as R;
const data = (r: R) => JSON.parse(r.content[0]?.text ?? "null");

describe("MCP slide + trò chơi", () => {
  it("tao_slide: lỗi → sửa → link .pptx; từ lessonPlanId; danh_sach_slide", async () => {
    const tool = (await client.listTools()).tools.find((x) => x.name === "tao_slide");
    expect(tool?.description).toContain("two_column");
    const rej = await call("tao_slide", { deck: { title: "X", slides: [{ layout: "bullets", title: "" }] } });
    expect(rej.isError).toBe(true);
    expect(rej.content[0]?.text).toContain("thiếu tiêu đề");
    const both = await call("tao_slide", {});
    expect(both.isError).toBe(true);

    const ok = data(await call("tao_slide", { deck: { title: "Mệnh đề", slides: [{ layout: "title", title: "Mệnh đề" }] } }));
    expect(ok).toMatchObject({ created: true, slideCount: 1 });
    expect(ok.url.startsWith(`${PUBLIC_URL}/dl/`)).toBe(true);
    const dl = await t.app.inject({ method: "GET", url: new URL(ok.url).pathname });
    expect(dl.rawPayload.subarray(0, 2).toString()).toBe("PK");

    const lp = data(await call("luu_giao_an", { plan: lessonPlan() }));
    const fromLp = data(await call("tao_slide", { lessonPlanId: lp.id }));
    expect(fromLp.sourceLessonPlanId).toBe(lp.id);
    expect(data(await call("danh_sach_slide", {}))).toHaveLength(2);
    expect(data(await call("danh_sach_slide", { id: ok.id })).deck.slides).toHaveLength(1);
  });

  it("tao_tro_choi: thiếu câu → lỗi; đủ → link .html; danh_sach_tro_choi", async () => {
    const filter = { subject: "Toán", grade: 10 };
    const rej = await call("tao_tro_choi", { title: "Ôn", kind: "quiz", source: filter });
    expect(rej.isError).toBe(true);
    expect(rej.content[0]?.text).toContain("Cần ít nhất 4 câu");
    await call("them_cau_hoi", { questions: [mcq(), mcq(), mcq(), mcq()] });
    const g = data(await call("tao_tro_choi", { title: "Ôn", kind: "flashcards", source: filter }));
    expect(g).toMatchObject({ kind: "flashcards", questionCount: 4 });
    const dl = await t.app.inject({ method: "GET", url: new URL(g.url).pathname });
    expect(dl.headers["content-type"]).toContain("text/html");
    expect(data(await call("danh_sach_tro_choi", {}))).toHaveLength(1);
  });
});
