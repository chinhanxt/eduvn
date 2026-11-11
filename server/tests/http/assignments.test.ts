import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, inHours, publishFromExam, teacher } from "../helpers/classroom";

let t: TApp;
let gv: Headers;
let classId: string;
let examId: string;
beforeEach(async () => {
  t = await testApp();
  gv = await teacher(t);
  classId = await classWithStudents(t, gv);
  examId = await examFor(t, gv);
});
afterEach(async () => {
  await t.app.close();
});

describe("giao bài (GV)", { timeout: 60_000 }, () => {
  it("từ đề: chụp mã đề, mặc định theo loại bài, thời lượng theo đề", async () => {
    const a = await publishFromExam(t, gv, classId, examId);
    expect(a).toMatchObject({ kind: "test", status: "published", source: "exam", subject: "Toán", questionCount: 5, variantCodes: ["101", "102"], maxScore: 3, durationMinutes: 15, attemptsAllowed: 1, showSolution: "after_due", shuffle: false });
    const list = (await call(t, "GET", `/api/classes/${classId}/assignments`, gv)).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, rosterSize: 3, submitted: 0, inProgress: 0 });
    expect((await call(t, "GET", `/api/assignments/${a.id}`, gv)).json().title).toBe("KT 15 phút");
  });

  it("từ nhóm câu ngân hàng: 1 mã đề; luyện tập 3 lượt, lời giải sau khi nộp; nháp", async () => {
    const qs = (await call(t, "GET", "/api/questions?subject=Toán&grade=10&type=mcq", gv)).json() as { id: string }[];
    const r = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "Luyện tập mệnh đề", kind: "practice", source: { questionIds: qs.map((q) => q.id) }, dueAt: inHours(24), durationMinutes: null });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ status: "draft", source: "bank", questionCount: 2, variantCodes: ["101"], attemptsAllowed: 3, showSolution: "after_submit", durationMinutes: null, maxScore: 0.5 });
  });

  it("báo lỗi: hạn đã qua, đề không có, câu không có", async () => {
    const past = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "x", source: { examId }, dueAt: inHours(-1) });
    expect(past.statusCode).toBe(400);
    expect(past.json().issues).toContain("Hạn nộp phải ở tương lai");
    const noExam = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "x", source: { examId: "11111111-1111-4111-8111-111111111111" }, dueAt: inHours(1) });
    expect(noExam.statusCode).toBe(404);
    const noQ = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "x", source: { questionIds: ["11111111-1111-4111-8111-111111111111"] }, dueAt: inHours(1) });
    expect(noQ.statusCode).toBe(400);
    expect((await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "", source: { examId }, dueAt: inHours(1) })).statusCode).toBe(400);
  });

  it("sửa, đóng, xoá; tổ chức khác không thấy", async () => {
    const a = await publishFromExam(t, gv, classId, examId);
    const due = inHours(5);
    const up = await call(t, "PATCH", `/api/assignments/${a.id}`, gv, { title: "KT sửa", dueAt: due, status: "closed" });
    expect(up.json()).toMatchObject({ title: "KT sửa", status: "closed", dueAt: new Date(due).toISOString() });
    expect((await call(t, "PATCH", `/api/assignments/${a.id}`, gv, { status: "draft" })).json().status).toBe("draft");
    const other = await teacher(t, "gv-2", "Thầy Minh");
    expect((await call(t, "GET", `/api/assignments/${a.id}`, other)).statusCode).toBe(404);
    expect((await call(t, "GET", `/api/classes/${classId}/assignments`, other)).statusCode).toBe(404);
    expect((await call(t, "DELETE", `/api/assignments/${a.id}`, gv)).statusCode).toBe(204);
    expect((await call(t, "GET", `/api/assignments/${a.id}`, gv)).statusCode).toBe(404);
    expect((await call(t, "GET", `/api/assignments/not-a-uuid`, gv)).statusCode).toBe(404);
  });
});
