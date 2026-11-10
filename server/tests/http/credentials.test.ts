import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, bearerOf, call, classWithStudents, issueAll, loginStudent, teacher } from "../helpers/classroom";

let t: TApp;
let gv: Headers;
let classId: string;
beforeEach(async () => {
  t = await testApp();
  gv = await teacher(t);
  classId = await classWithStudents(t, gv);
});
afterEach(async () => {
  await t.app.close();
});

describe("thẻ lớp (GV)", { timeout: 60_000 }, () => {
  it("cấp mã: số thứ tự theo danh sách, PIN 6 số chỉ trả một lần; cấp lại từng em", async () => {
    expect((await call(t, "GET", `/api/classes/${classId}/credentials`, gv)).json()).toMatchObject({ classCode: null, joinOpen: false });
    const first = await issueAll(t, gv, classId);
    expect(first.classCode).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(first.cards.map((c) => [c.seat, c.fullName])).toEqual([[1, "Nguyễn Văn An"], [2, "Trần Thị Bình"], [3, "Lê Văn Cường"]]);
    expect(first.cards.every((c) => /^\d{6}$/.test(c.pin) && c.qrToken.length > 20)).toBe(true);
    const st = (await call(t, "GET", `/api/classes/${classId}/credentials`, gv)).json();
    expect(st.students.map((s: { seat: number; hasPin: boolean }) => [s.seat, s.hasPin])).toEqual([[1, true], [2, true], [3, true]]);
    expect(JSON.stringify(st)).not.toContain(first.cards[0]!.pin);
    expect((await issueAll(t, gv, classId)).cards).toHaveLength(0);
    const again = await call(t, "POST", `/api/classes/${classId}/credentials`, gv, { studentIds: [first.cards[1]!.studentId] });
    expect(again.json().cards.map((c: { seat: number }) => c.seat)).toEqual([2]);
    await call(t, "POST", `/api/classes/${classId}/students`, gv, { text: "Đỗ Văn Ánh" });
    const late = await issueAll(t, gv, classId);
    expect(late.cards.map((c) => [c.seat, c.fullName])).toEqual([[4, "Đỗ Văn Ánh"]]);
  });

  it("lớp tổ chức khác: 404", async () => {
    const other = await teacher(t, "gv-2", "Thầy Minh");
    expect((await call(t, "POST", `/api/classes/${classId}/credentials`, other, {})).statusCode).toBe(404);
  });
});

describe("đăng nhập HS", { timeout: 60_000 }, () => {
  it("mã lớp + số thứ tự + PIN; phiên HS chỉ dùng cho /api/student", async () => {
    const { classCode, cards } = await issueAll(t, gv, classId);
    const ok = await call(t, "POST", "/api/student/session", {}, { classCode: classCode.toLowerCase(), seat: "1", pin: cards[0]!.pin });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ expiresInSeconds: 43200, student: { fullName: "Nguyễn Văn An", seat: 1 }, class: { name: "10A1", subject: "Toán" } });
    const hs = bearerOf(ok.json().token);
    expect((await call(t, "GET", "/api/student/me", hs)).json().student.seat).toBe(1);
    expect((await call(t, "GET", "/api/classes", hs)).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/me", gv)).statusCode).toBe(401);
    const bad = await call(t, "POST", "/api/student/session", {}, { classCode, seat: 1, pin: cards[1]!.pin });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error).toBe("Mã lớp, số thứ tự hoặc PIN chưa đúng");
    for (const body of [{ classCode: "ZZZZZZ", seat: 1, pin: cards[0]!.pin }, { classCode, seat: 9, pin: "123456" }, { classCode, seat: 1 }]) {
      const r = await call(t, "POST", "/api/student/session", {}, body);
      expect([r.statusCode, r.json().error]).toEqual([401, "Mã lớp, số thứ tự hoặc PIN chưa đúng"]);
    }
  });

  it("sai 5 lần thì khoá số thứ tự đó (429 + Retry-After), số khác vẫn vào được", async () => {
    const { classCode, cards } = await issueAll(t, gv, classId);
    const wrong = cards[0]!.pin === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await call(t, "POST", "/api/student/session", {}, { classCode, seat: 1, pin: wrong })).statusCode).toBe(401);
    const locked = await call(t, "POST", "/api/student/session", {}, { classCode, seat: 1, pin: cards[0]!.pin });
    expect(locked.statusCode).toBe(429);
    expect(Number(locked.headers["retry-after"])).toBeGreaterThan(500);
    expect((await call(t, "POST", "/api/student/session", {}, { classCode, seat: 2, pin: cards[1]!.pin })).statusCode).toBe(200);
  });

  it("thẻ QR; cấp lại thì QR và phiên cũ hết dùng", async () => {
    const { classCode, cards } = await issueAll(t, gv, classId);
    const qr = await call(t, "POST", "/api/student/session/qr", {}, { token: cards[2]!.qrToken });
    expect(qr.json().student.fullName).toBe("Lê Văn Cường");
    const hs = await loginStudent(t, classCode, cards[2]!);
    await call(t, "POST", `/api/classes/${classId}/credentials`, gv, { studentIds: [cards[2]!.studentId] });
    expect((await call(t, "POST", "/api/student/session/qr", {}, { token: cards[2]!.qrToken })).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/me", hs)).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/me", bearerOf(qr.json().token))).statusCode).toBe(401);
    expect((await call(t, "POST", "/api/student/session/qr", {}, { token: "abc.def.ghi" })).statusCode).toBe(401);
  });

  it("tài khoản Keycloak + mã tham gia: tắt thì 403; tự vào lớp; trùng họ tên + ngày sinh chờ GV xác nhận", async () => {
    const st0 = (await call(t, "PUT", `/api/classes/${classId}/join`, gv, { open: false })).json();
    const sv = bearerOf(await t.sign({ sub: "sv-1", name: "Phạm Thị Dung" }));
    expect((await call(t, "POST", "/api/student/session/oidc", sv, { joinCode: st0.joinCode })).statusCode).toBe(403);
    expect((await call(t, "POST", "/api/student/session/oidc", sv, { joinCode: "ZZZZZZ" })).statusCode).toBe(404);
    expect((await call(t, "POST", "/api/student/session/oidc", {}, { joinCode: st0.joinCode })).statusCode).toBe(401);
    const { joinCode } = (await call(t, "PUT", `/api/classes/${classId}/join`, gv, { open: true })).json();
    const r = await call(t, "POST", "/api/student/session/oidc", sv, { joinCode });
    expect(r.statusCode).toBe(200);
    expect(r.json().student).toMatchObject({ fullName: "Phạm Thị Dung", seat: 4 });
    expect((await call(t, "POST", "/api/student/session/oidc", sv, { joinCode })).json().student.id).toBe(r.json().student.id);

    const an = bearerOf(await t.sign({ sub: "sv-2", name: "An" }));
    const p = await call(t, "POST", "/api/student/session/oidc", an, { joinCode, fullName: "nguyễn văn an", dob: "05/03/2010" });
    expect(p.statusCode).toBe(202);
    expect(p.json().pending).toBe(true);
    const st = (await call(t, "GET", `/api/classes/${classId}/credentials`, gv)).json();
    const row = st.students.find((s: { linkPending: boolean }) => s.linkPending);
    expect(row.fullName).toBe("Nguyễn Văn An");
    expect((await call(t, "POST", "/api/student/session/oidc", an, { joinCode })).statusCode).toBe(202);
    expect((await call(t, "POST", `/api/classes/${classId}/students/${row.id}/link`, gv, { approve: true })).json()).toEqual({ approved: true });
    const ok = await call(t, "POST", "/api/student/session/oidc", an, { joinCode });
    expect([ok.statusCode, ok.json().student.id]).toEqual([200, row.id]);
    expect((await call(t, "POST", `/api/classes/${classId}/students/${row.id}/link`, gv, { approve: true })).statusCode).toBe(404);
  });
});
