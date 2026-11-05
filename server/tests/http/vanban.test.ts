import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { bienBan, keHoach } from "../helpers/vanban";

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

describe("HTTP văn bản hành chính", () => {
  it("lưu → liệt kê → sửa → xuất .docx; văn bản thiếu bị từ chối với danh sách lỗi", async () => {
    const rej = await call("POST", "/api/van-ban", bienBan({ thanh_phan: [] }));
    expect(rej.statusCode).toBe(400);
    expect(rej.json().issues).toContain("Biên bản thiếu thành phần tham dự (thanh_phan)");
    expect((await call("GET", "/api/van-ban")).json()).toEqual([]);

    const created = await call("POST", "/api/van-ban", keHoach());
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;
    expect((await call("GET", "/api/van-ban")).json()[0]).toMatchObject({ id, loai: "ke_hoach", soKyHieu: "45/KH-THPTND" });
    expect((await call("GET", `/api/van-ban/${id}`)).json().vanBan.nguoi_ky).toBe("Nguyễn Văn An");

    const upd = await call("PUT", `/api/van-ban/${id}`, keHoach({ so: 46 }));
    expect(upd.json()).toMatchObject({ created: false, soKyHieu: "46/KH-THPTND" });

    const link = (await call("POST", `/api/van-ban/${id}/export`)).json();
    const dl = await t.app.inject({ method: "GET", url: new URL(link.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-disposition"]).toContain("ke-hoach-to-chuc-hoi-thi-olympic");
    expect(dl.rawPayload.subarray(0, 2).toString()).toBe("PK");

    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy B" })}` };
    expect((await call("GET", `/api/van-ban/${id}`, undefined, other)).statusCode).toBe(404);
    expect((await call("DELETE", `/api/van-ban/${id}`)).statusCode).toBe(204);
  });
});
