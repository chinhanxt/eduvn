import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { lessonPlan } from "../helpers/lesson";

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

describe("HTTP giáo án", () => {
  it("lưu → liệt kê → xem → sửa → xuất .docx; giáo án thiếu bị từ chối", async () => {
    const bad = lessonPlan();
    (bad.activities[2] as { product: string }).product = "";
    const rej = await call("POST", "/api/lessons", bad);
    expect(rej.statusCode).toBe(400);
    expect(rej.json().issues).toContain("Hoạt động 3 thiếu c) Sản phẩm");
    expect((await call("GET", "/api/lessons")).json()).toEqual([]);

    const created = await call("POST", "/api/lessons", lessonPlan());
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    expect((await call("GET", "/api/lessons")).json()[0]).toMatchObject({ id, title: "Mệnh đề", subject: "Toán", grade: 10, periods: 2 });
    expect((await call("GET", `/api/lessons/${id}`)).json().plan.activities).toHaveLength(4);

    const upd = await call("PUT", `/api/lessons/${id}`, lessonPlan({ header: { subject: "Toán", grade: 10, title: "Mệnh đề (sửa)", periods: 3 } }));
    expect(upd.json()).toMatchObject({ created: false, title: "Mệnh đề (sửa)", periods: 3 });
    expect((await call("GET", "/api/lessons")).json()).toHaveLength(1);

    const link = (await call("POST", `/api/lessons/${id}/export`)).json();
    const dl = await t.app.inject({ method: "GET", url: new URL(link.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-disposition"]).toContain("giao-an-menh-de-sua.docx");
    expect(dl.rawPayload.subarray(0, 2).toString()).toBe("PK");

    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy B" })}` };
    expect((await call("GET", `/api/lessons/${id}`, undefined, other)).statusCode).toBe(404);
    expect((await call("DELETE", `/api/lessons/${id}`)).statusCode).toBe(204);
  });
});
