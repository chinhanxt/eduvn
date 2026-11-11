import { afterEach, describe, expect, it } from "vitest";
import { classes } from "../../src/db/schema";
import { testApp } from "../helpers/app";
import { type TApp, call, teacher } from "../helpers/classroom";

let t: TApp;
afterEach(async () => {
  await t.app.close();
});
const body = { name: "10A1", schoolYear: "2026-2027", subject: "Toán" };

describe("Idempotency-Key", () => {
  it("gửi lại cùng khoá → trả đúng phản hồi cũ, chỉ tạo 1 lớp", async () => {
    t = await testApp();
    const gv = await teacher(t);
    const h = { ...gv, "idempotency-key": "k-0000000001" };
    const a = await call(t, "POST", "/api/classes", h, body);
    const b = await call(t, "POST", "/api/classes", h, body);
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect(b.headers["idempotent-replayed"]).toBe("true");
    expect(b.json().id).toBe(a.json().id);
    expect(await t.db.select().from(classes)).toHaveLength(1);
  });

  it("5 yêu cầu đồng thời cùng khoá → 1 thao tác, cùng kết quả", async () => {
    t = await testApp();
    const gv = await teacher(t);
    const h = { ...gv, "idempotency-key": "k-0000000002" };
    const rs = await Promise.all(Array.from({ length: 5 }, () => call(t, "POST", "/api/classes", h, body)));
    expect(new Set(rs.map((r) => r.json().id)).size).toBe(1);
    expect(rs.every((r) => r.statusCode === 201)).toBe(true);
    expect(await t.db.select().from(classes)).toHaveLength(1);
  });

  it("khác khoá → 2 thao tác; cùng khoá khác thân → 422; khoá thuộc từng người", async () => {
    t = await testApp();
    const gv = await teacher(t);
    await call(t, "POST", "/api/classes", { ...gv, "idempotency-key": "k-000000000a" }, body);
    await call(t, "POST", "/api/classes", { ...gv, "idempotency-key": "k-000000000b" }, body);
    expect(await t.db.select().from(classes)).toHaveLength(2);
    const bad = await call(t, "POST", "/api/classes", { ...gv, "idempotency-key": "k-000000000a" }, { ...body, name: "10A2" });
    expect(bad.statusCode).toBe(422);
    const other = await teacher(t, "gv-2", "Thầy Minh");
    const r = await call(t, "POST", "/api/classes", { ...other, "idempotency-key": "k-000000000a" }, body);
    expect(r.statusCode).toBe(201);
    expect(r.headers["idempotent-replayed"]).toBeUndefined();
  });

  it("lỗi dữ liệu (4xx) được lưu, khoá quá ngắn bị từ chối, không có khoá thì như cũ", async () => {
    t = await testApp();
    const gv = await teacher(t);
    const h = { ...gv, "idempotency-key": "k-0000000003" };
    const a = await call(t, "POST", "/api/classes", h, { name: "" });
    const b = await call(t, "POST", "/api/classes", h, { name: "" });
    expect([a.statusCode, b.statusCode, b.headers["idempotent-replayed"]]).toEqual([400, 400, "true"]);
    expect((await call(t, "POST", "/api/classes", { ...gv, "idempotency-key": "x" }, body)).statusCode).toBe(400);
    await call(t, "POST", "/api/classes", gv, body);
    await call(t, "POST", "/api/classes", gv, body);
    expect(await t.db.select().from(classes)).toHaveLength(2);
  });
});
