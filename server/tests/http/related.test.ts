import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { mcq } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});

describe("GET /api/questions/related", () => {
  it("trả câu đầy đủ (có đáp án), xếp theo chủ đề + từ khoá", async () => {
    for (const q of [
      mcq({ topic: "Thiết diện", stem: "Thiết diện của hình lập phương cắt bởi $(MNP)$", answer: 3 }),
      mcq({ topic: "Mệnh đề", stem: "Câu nào là mệnh đề?" }),
    ]) {
      expect((await t.app.inject({ method: "POST", url: "/api/questions", headers: auth, payload: q })).statusCode).toBe(201);
    }
    const q = new URLSearchParams({ subject: "Toán", grade: "10", topic: "Thiết diện", text: "hình lập phương" });
    const res = await t.app.inject({ method: "GET", url: `/api/questions/related?${q}`, headers: auth });
    expect(res.statusCode).toBe(200);
    const rows = res.json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ topic: "Thiết diện", type: "mcq", answer: 3 });
    expect(rows[0].options).toHaveLength(4);
  });
  it("thiếu lớp → 400", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/questions/related?subject=Toán", headers: auth })).statusCode).toBe(400);
  });
});
