// server/tests/http/diagrams.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/http/app";
import { createVerifier } from "../../src/auth/verify";
import type { Ai } from "../../src/services/ai";
import { testDb } from "../helpers/db";
import { AUDIENCE, ISSUER, makeIssuer } from "../helpers/tokens";

const meta = { title: "Hàm số bậc hai", subject: "Toán", grade: 10, topic: "" };
const doc = {
  version: 1 as const,
  kind: "mind" as const,
  nodes: [
    { id: "a", x: 0, y: 0, w: 120, h: 40, shape: "round", label: "Gốc $x^2$", color: "#4f6bed", parent: null },
    { id: "b", x: 200, y: 0, w: 100, h: 40, shape: "rect", label: "Nhánh", color: "#16a34a", parent: "a" },
  ],
  edges: [{ id: "e1", from: "a", to: "b", kind: "tree" }],
};

let app: ReturnType<typeof buildApp>;
let auth: Record<string, string>;
let aiReply = "";
const fakeAi: Ai = { chat: async () => aiReply, stream: async function* () {} };

async function boot(ai?: Ai) {
  const kc = await makeIssuer();
  app = buildApp({ db: await testDb(), verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }), issuer: ISSUER, publicUrl: "http://eduvn.test", downloadSecret: "test-secret-test-secret-test-secret!", ai });
  auth = { authorization: `Bearer ${await kc.sign({ sub: "gv-1", name: "Cô Lan" })}` };
}
afterEach(async () => {
  await app.close();
});
const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown) => app.inject({ method, url, headers: auth, payload: payload as object });

describe("HTTP sơ đồ", () => {
  beforeEach(() => boot(fakeAi));

  it("tạo → lưu → mở lại → liệt kê → xoá", async () => {
    const created = await call("POST", "/api/diagrams", meta);
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ ...meta, kind: "mind", nodeCount: 0 });
    const id = created.json().id;
    expect((await call("PUT", `/api/diagrams/${id}`, { ...meta, doc })).statusCode).toBe(200);
    expect((await call("GET", `/api/diagrams/${id}`)).json().doc.nodes).toHaveLength(2);
    expect((await call("GET", "/api/diagrams")).json()[0]).toMatchObject({ id, kind: "mind", nodeCount: 2 });
    expect((await call("DELETE", `/api/diagrams/${id}`)).statusCode).toBe(204);
    expect((await call("GET", `/api/diagrams/${id}`)).statusCode).toBe(404);
  });

  it("sai schema bị chặn", async () => {
    const id = (await call("POST", "/api/diagrams", meta)).json().id;
    const badEdge = { ...doc, edges: [{ id: "e1", from: "a", to: "zzz", kind: "link" }] };
    expect((await call("PUT", `/api/diagrams/${id}`, { ...meta, doc: badEdge })).statusCode).toBe(400);
    const badShape = { ...doc, nodes: [{ ...doc.nodes[0], shape: "star" }] };
    expect((await call("PUT", `/api/diagrams/${id}`, { ...meta, doc: badShape })).statusCode).toBe(400);
    const bigImg = { ...doc, nodes: [{ ...doc.nodes[0], image: `data:image/png;base64,${"A".repeat(420_000)}` }] };
    const r = await call("PUT", `/api/diagrams/${id}`, { ...meta, doc: bigImg });
    expect(r.statusCode).toBe(400);
    expect(r.json().issues.join()).toContain("300 KB");
  });

  it("AI vẽ sơ đồ: nhận {nodes,links}, bỏ liên kết hỏng", async () => {
    aiReply = '```json\n{"nodes":[{"id":"n1","label":"Gốc","parent":null},{"id":"n2","label":"Con","parent":"n1"}],"links":[{"from":"n2","to":"n1","label":"x"},{"from":"n2","to":"q"}]}\n```';
    const r = await call("POST", "/api/diagrams/ai", { topic: "Hàm số", kind: "mind", subject: "Toán", grade: 10 });
    expect(r.statusCode).toBe(200);
    expect(r.json().nodes).toHaveLength(2);
    expect(r.json().links).toEqual([{ from: "n2", to: "n1", label: "x" }]);
  });

  it("AI trả dạng cây mặc định {root} cũng được", async () => {
    aiReply = JSON.stringify({ root: { text: "Gốc", children: [{ text: "A", children: [] }, { text: "B", children: [] }] } });
    const r = await call("POST", "/api/diagrams/ai", { topic: "x" });
    expect(r.json().nodes.map((n: { parent: string | null }) => n.parent)).toEqual([null, "a1", "a1"]);
  });

  it("AI trả rác → 503", async () => {
    aiReply = "không phải json";
    expect((await call("POST", "/api/diagrams/ai", { topic: "x" })).statusCode).toBe(503);
  });
});

describe("HTTP sơ đồ — chưa bật cổng AI", () => {
  beforeEach(() => boot(undefined));
  it("AI → 503 Chưa bật cổng AI", async () => {
    const r = await call("POST", "/api/diagrams/ai", { topic: "x" });
    expect(r.statusCode).toBe(503);
    expect(r.json().error).toContain("Chưa bật cổng AI");
  });
});

describe("HTTP sơ đồ — AI lưu đồ", () => {
  beforeEach(() => boot(fakeAi));
  it("cây mặc định → mũi tên nối; id số và label null vẫn nhận", async () => {
    aiReply = JSON.stringify({ root: { text: "Bắt đầu", children: [{ text: "Bước 1", children: [{ text: "Kết thúc", children: [] }] }] } });
    const r = await call("POST", "/api/diagrams/ai", { topic: "x", kind: "flow" });
    expect(r.json().links).toEqual([{ from: "a1", to: "a2" }, { from: "a2", to: "a3" }]);
    aiReply = JSON.stringify({ nodes: [{ id: 1, label: "A", parent: null }, { id: 2, label: "B" }], links: [{ from: 1, to: 2, label: null }] });
    const r2 = await call("POST", "/api/diagrams/ai", { topic: "x", kind: "flow" });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().links).toHaveLength(1);
  });
});
