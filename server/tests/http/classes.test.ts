import ExcelJS from "exceljs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});
const call = (method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, payload?: unknown, headers = auth) => t.app.inject({ method, url, headers, payload: payload as object });

describe("HTTP lớp học", () => {
  it("luồng: tạo lớp → thêm HS → điểm → điểm danh → nhận xét → xuất sổ điểm .xlsx", async () => {
    const created = await call("POST", "/api/classes", { name: "10A1", schoolYear: "2026-2027" });
    expect(created.statusCode).toBe(201);
    const id = created.json().id as string;

    const add = await call("POST", `/api/classes/${id}/students`, { text: "Nguyễn Văn An;05/03/2010;Nam\nTrần Thị Bình" });
    expect(add.statusCode).toBe(201);
    expect(add.json().added).toBe(2);
    const bad = await call("POST", `/api/classes/${id}/students`, { text: "X;99/99/2010" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().issues[0]).toContain("Dòng 1");

    expect((await call("PUT", `/api/classes/${id}/scores`, { column: "GK", scores: { "Nguyễn Văn An": "9,5" } })).statusCode).toBe(200);
    expect((await call("PUT", `/api/classes/${id}/scores`, { column: "GK", scores: { "Nguyễn Văn An": "12" } })).statusCode).toBe(400);
    expect((await call("PUT", `/api/classes/${id}/attendance`, { date: "2026-09-05", records: {}, defaultStatus: "present" })).json().updated).toBe(2);
    const text = "Em chăm chỉ, hợp tác tốt với bạn bè, cần tự tin hơn khi phát biểu.";
    expect((await call("PUT", `/api/classes/${id}/comments`, { term: "HK1", items: [{ student: "Trần Thị Bình", text, level: "Khá" }] })).statusCode).toBe(200);

    const gb = (await call("GET", `/api/classes/${id}/gradebook`)).json();
    expect(gb.students[0].scores.GK).toBe(9.5);
    expect(gb.students[1].comments.HK1.level).toBe("Khá");

    const link = (await call("POST", `/api/classes/${id}/export`, { kind: "gradebook" })).json();
    const dl = await t.app.inject({ method: "GET", url: new URL(link.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-type"]).toContain("spreadsheetml");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(dl.rawPayload as unknown as ExcelJS.Buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Sổ điểm", "Điểm danh"]);

    const list = (await call("POST", `/api/classes/${id}/export`, { kind: "class_list" })).json();
    expect((await t.app.inject({ method: "GET", url: new URL(list.url).pathname })).statusCode).toBe(200);
  });

  it("nhập xlsx qua base64; 401 khi thiếu token; 404 lớp tổ chức khác", async () => {
    const id = (await call("POST", "/api/classes", { name: "11B", schoolYear: "2026-2027" })).json().id as string;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("S");
    ws.addRow(["Họ tên", "Ngày sinh"]);
    ws.addRow(["Võ Thị F", "02/02/2011"]);
    const b64 = Buffer.from(await wb.xlsx.writeBuffer()).toString("base64");
    const r = await call("POST", `/api/classes/${id}/students/xlsx`, { contentBase64: b64 });
    expect(r.json().added).toBe(1);
    expect((await call("GET", "/api/classes", undefined, {})).statusCode).toBe(401);
    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2" })}` };
    expect((await call("GET", `/api/classes/${id}`, undefined, other)).statusCode).toBe(404);
  });
});
