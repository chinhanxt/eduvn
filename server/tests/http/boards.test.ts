// server/tests/http/boards.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { sampleDoc } from "../helpers/board";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});
const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, headers = auth) => t.app.inject({ method, url, headers, payload: payload as object });
const meta = { title: "Ôn tập hình không gian", subject: "Toán", grade: 11, topic: "Thiết diện" };

describe("HTTP bảng giảng", () => {
  it("tạo → lưu → mở lại → xoá", async () => {
    const created = await call("POST", "/api/boards", meta);
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ ...meta, pageCount: 1 });
    const id = created.json().id;

    const saved = await call("PUT", `/api/boards/${id}`, { ...meta, doc: sampleDoc() });
    expect(saved.statusCode).toBe(200);
    const got = (await call("GET", `/api/boards/${id}`)).json();
    expect(got.doc.pages[0].objects.map((o: { type: string }) => o.type)).toEqual(["stroke", "graph", "solid"]);
    expect((await call("GET", "/api/boards")).json()).toHaveLength(1);

    const bad = await call("PUT", `/api/boards/${id}`, { ...meta, doc: { version: 1, pages: [] } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().issues[0]).toContain("Cần ít nhất 1 trang");

    expect((await call("DELETE", `/api/boards/${id}`)).statusCode).toBe(204);
    expect((await call("GET", `/api/boards/${id}`)).statusCode).toBe(404);
  });

  it("tổ chức khác không thấy", async () => {
    const id = (await call("POST", "/api/boards", meta)).json().id;
    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy Minh" })}` };
    expect((await call("GET", `/api/boards/${id}`, undefined, other)).statusCode).toBe(404);
    expect((await call("GET", "/api/boards", undefined, other)).json()).toHaveLength(0);
  });

  it("nhận tài liệu > 1 MB (đến 4 MB)", async () => {
    const id = (await call("POST", "/api/boards", meta)).json().id;
    const pts = Array.from({ length: 4000 }, (_, i) => 100 + (i % 500) + 0.123456789);
    const strokes = Array.from({ length: 60 }, (_, i) => ({ type: "stroke", id: `s${i}`, color: "#f3f0e6", width: 4, pts }));
    const res = await call("PUT", `/api/boards/${id}`, { ...meta, doc: { version: 1, pages: [{ id: "p1", objects: strokes }] } });
    expect(res.statusCode).toBe(200);
  });
});
