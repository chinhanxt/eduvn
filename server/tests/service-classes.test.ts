import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client";
import { addMember, createOrg, ensureUser } from "../src/db/repo";
import { ForbiddenError } from "../src/domain/authz";
import { NotFoundError, ValidationError } from "../src/errors";
import { renderClassListXlsx, renderGradebookXlsx } from "../src/export/xlsx";
import type { Actor } from "../src/service";
import { createClassService } from "../src/services/classes";
import { testDb } from "./helpers/db";
import ExcelJS from "exceljs";

let db: Db;
let svc: ReturnType<typeof createClassService>;
let teacher: Actor;
let assistant: Actor;
let student: Actor;
let other: Actor;

beforeEach(async () => {
  db = await testDb();
  svc = createClassService(db);
  const t = await ensureUser(db, { sub: "t1" });
  const a = await ensureUser(db, { sub: "a1" });
  const s = await ensureUser(db, { sub: "s1" });
  const o = await ensureUser(db, { sub: "o1" });
  const org = await createOrg(db, "Trường A", t.id);
  const org2 = await createOrg(db, "Trường B", o.id);
  await addMember(db, org.id, a.id, "assistant");
  await addMember(db, org.id, s.id, "student");
  teacher = { userId: t.id, orgId: org.id, role: "teacher" };
  assistant = { userId: a.id, orgId: org.id, role: "assistant" };
  student = { userId: s.id, orgId: org.id, role: "student" };
  other = { userId: o.id, orgId: org2.id, role: "owner" };
});

async function seed(scale: "TT22" | "TT27" = "TT22") {
  const c = await svc.createClass(teacher, { name: "10A1", schoolYear: "2026-2027", subject: "Toán", scale });
  const r = await svc.addStudents(teacher, c.id, { text: "Nguyễn Văn An;05/03/2010;Nam\nTrần Thị Bình;;Nữ" });
  return { c, ids: r.ids };
}

describe("lớp & học viên", () => {
  it("tạo lớp, thêm HS, trùng tên cảnh báo, bỏ qua trùng mã", async () => {
    const { c } = await seed();
    const again = await svc.addStudents(teacher, "10A1", { students: ["nguyễn văn an", { fullName: "Lê C", code: "X1" }, { name: "Lê D", code: "x1" }] });
    expect(again.added).toBe(2);
    expect(again.warnings.some((w) => w.includes("Trùng tên"))).toBe(true);
    expect(again.warnings.some((w) => w.includes("mã x1"))).toBe(true);
    const detail = await svc.getClass(teacher, c.id);
    expect(detail.students).toHaveLength(4);
    expect((await svc.listClasses(teacher))[0]).toMatchObject({ name: "10A1", studentCount: 4 });
  });
  it("lỗi nhập liệu trả danh sách, không thêm gì", async () => {
    await seed();
    await expect(svc.addStudents(teacher, "10A1", { text: "A;99/99/2010\nB;;abc" })).rejects.toThrow(ValidationError);
    expect((await svc.getClass(teacher, "10A1")).students).toHaveLength(2);
    await expect(svc.createClass(teacher, { name: "X", schoolYear: "2026" })).rejects.toThrow();
  });
  it("phân quyền + cách ly tổ chức", async () => {
    const { c } = await seed();
    await expect(svc.createClass(assistant, { name: "X", schoolYear: "2026-2027" })).rejects.toThrow(ForbiddenError);
    await expect(svc.listClasses(student)).rejects.toThrow(ForbiddenError);
    expect(await svc.listClasses(assistant)).toHaveLength(1);
    await expect(svc.getClass(other, c.id)).rejects.toThrow(NotFoundError);
    await expect(svc.addStudents(assistant, c.id, { text: "A" })).rejects.toThrow(ForbiddenError);
  });
  it("nhập từ xlsx (sheet đầu, tiêu đề Họ và tên)", async () => {
    const { c } = await seed();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("DS");
    ws.addRow(["Danh sách lớp"]);
    ws.addRow(["STT", "Họ và tên", "Ngày sinh", "Giới tính"]);
    ws.addRow([1, "Phạm Văn D", new Date(Date.UTC(2010, 6, 1)), "Nam"]);
    ws.addRow([2, "Hoàng Thị E", "15/08/2010", "Nữ"]);
    const r = await svc.addStudentsFromXlsx(teacher, c.id, Buffer.from(await wb.xlsx.writeBuffer()));
    expect(r.added).toBe(2);
    const st = (await svc.getClass(teacher, c.id)).students.find((s) => s.fullName === "Phạm Văn D");
    expect(st?.dob).toBe("2010-07-01");
    await expect(svc.addStudentsFromXlsx(teacher, c.id, Buffer.from("không phải xlsx"))).rejects.toThrow(ValidationError);
  });
});

describe("sổ điểm", () => {
  it("nhập điểm theo tên/id, ĐTB chỉ khi đủ cột", async () => {
    const { c, ids } = await seed();
    await svc.enterScores(assistant, c.id, "TX1", { "Nguyễn Văn An": "8,5", [ids[1] as string]: 7 });
    for (const [col, v] of [["TX2", 9], ["TX3", 7], ["GK", 8], ["CK", 9]] as const) await svc.enterScores(teacher, "10A1", col, { "Nguyễn Văn An": v });
    const gb = await svc.gradebook(teacher, "10A1");
    const an = gb.students.find((s) => s.fullName === "Nguyễn Văn An");
    expect(an?.scores.TX1).toBe(8.5);
    expect(an?.dtb).toBe(8.4); // (8.5+9+7+16+27)/8 = 8.4375
    expect(gb.students.find((s) => s.id === ids[1])?.dtb).toBeNull();
    await svc.enterScores(teacher, c.id, "TX1", { "Nguyễn Văn An": null });
    expect((await svc.gradebook(teacher, c.id, "Nguyễn Văn An")).students[0]?.dtb).toBeNull();
  });
  it("lỗi: không lưu gì khi có điểm sai/tên lạ/cột lạ", async () => {
    const { c } = await seed();
    await expect(svc.enterScores(teacher, c.id, "TX1", { "Nguyễn Văn An": 9, "Người lạ": 5, "Trần Thị Bình": "11" })).rejects.toThrow(/Người lạ[\s\S]*ngoài thang/);
    expect((await svc.gradebook(teacher, c.id)).students.every((s) => s.scores.TX1 === undefined)).toBe(true);
    await expect(svc.enterScores(teacher, c.id, "XX", { "Nguyễn Văn An": 9 })).rejects.toThrow(/Các cột/);
    await expect(svc.enterScores(student, c.id, "TX1", { "Nguyễn Văn An": 9 })).rejects.toThrow(ForbiddenError);
  });
  it("cột tuỳ chỉnh", async () => {
    const { c } = await seed();
    await svc.updateClass(teacher, c.id, { columns: [{ name: "KT", weight: 1 }, { name: "CK", weight: 2 }] });
    await svc.enterScores(teacher, c.id, "KT", { "Nguyễn Văn An": 6 });
    await svc.enterScores(teacher, c.id, "CK", { "Nguyễn Văn An": 9 });
    expect((await svc.gradebook(teacher, c.id, "Nguyễn Văn An")).students[0]?.dtb).toBe(8);
    await expect(svc.updateClass(teacher, c.id, { columns: [{ name: "A", weight: 1 }, { name: "a", weight: 1 }] })).rejects.toThrow(ValidationError);
  });
  it("điểm danh theo ngày + mặc định", async () => {
    const { c, ids } = await seed();
    await svc.markAttendance(assistant, c.id, "2026-09-05", { "Trần Thị Bình": "excused" }, "present");
    await svc.markAttendance(assistant, c.id, "2026-09-06", { [ids[0] as string]: "vắng không phép" });
    expect(await svc.attendanceOn(teacher, c.id, "2026-09-05")).toEqual({ [ids[0] as string]: "present", [ids[1] as string]: "excused" });
    const gb = await svc.gradebook(teacher, c.id);
    expect(gb.dates).toEqual(["2026-09-05", "2026-09-06"]);
    expect(gb.students[0]?.attendance).toEqual({ present: 1, excused: 0, unexcused: 1 });
    await expect(svc.markAttendance(teacher, c.id, "05/09/2026", {})).rejects.toThrow(ValidationError);
    await expect(svc.markAttendance(teacher, c.id, "2026-09-07", { "Trần Thị Bình": "ốm" })).rejects.toThrow(/sai/);
  });
});

describe("nhận xét", () => {
  const text = "Em học chăm chỉ, tích cực phát biểu, cần cẩn thận hơn khi trình bày.";
  it("lưu theo thang TT22 và hiện trong sổ + xuất", async () => {
    const { c } = await seed();
    await svc.saveComments(teacher, c.id, "HK1", [{ student: "Nguyễn Văn An", text, level: "Tốt" }, { student: "Trần Thị Bình", text, level: "Khá" }]);
    await svc.saveComments(teacher, c.id, "HK1", [{ student: "Nguyễn Văn An", text: text + " Cố lên!", level: "Đạt" }]);
    const gb = await svc.gradebook(teacher, c.id);
    expect(gb.students[0]?.comments.HK1).toMatchObject({ level: "Đạt" });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load((await renderGradebookXlsx(gb)) as unknown as ExcelJS.Buffer);
    const row = wb.getWorksheet("Sổ điểm")?.getRow(5);
    expect(row?.getCell(3).value).toBe("Nguyễn Văn An");
    expect(JSON.stringify(row?.values)).toContain("Đạt");
    const list = new ExcelJS.Workbook();
    await list.xlsx.load((await renderClassListXlsx(gb)) as unknown as ExcelJS.Buffer);
    expect(list.worksheets[0]?.getRow(5).getCell(4).value).toBe("05/03/2010");
  });
  it("kiểm: trống, ngắn, dài, sai mức theo thang lớp", async () => {
    const a = await seed("TT27");
    await expect(
      svc.saveComments(teacher, a.c.id, "HK2", [
        { student: "Nguyễn Văn An", text: "", level: "Hoàn thành" },
        { student: "Trần Thị Bình", text, level: "Tốt" },
      ]),
    ).rejects.toThrow(/trống[\s\S]*Hoàn thành tốt/);
    await expect(svc.saveComments(teacher, a.c.id, "HK3", [{ student: "Nguyễn Văn An", text, level: "Hoàn thành" }])).rejects.toThrow(/HK1/);
    await expect(svc.saveComments(assistant, a.c.id, "HK1", [{ student: "Nguyễn Văn An", text, level: "Hoàn thành" }])).rejects.toThrow(ForbiddenError);
    await svc.saveComments(teacher, a.c.id, "HK2", [{ student: "Nguyễn Văn An", text, level: "Hoàn thành tốt" }]);
  });
});
