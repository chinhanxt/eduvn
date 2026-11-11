import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { students, tutorReviewState, users } from "../../src/db/schema";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, bearerOf, call, classWithStudents, examFor, inHours, issueAll, loginStudent, publishFromExam, teacher } from "../helpers/classroom";
import { responsesFromKey } from "../helpers/fixtures";
import { lessonPlan } from "../helpers/lesson";

let t: TApp;
afterEach(async () => {
  await t.app.close();
});

// 10:00 thứ Ba 10/11/2026 giờ Việt Nam
const CLOCK = new Date("2026-11-10T03:00:00Z");

async function setup() {
  t = await testApp({ now: () => CLOCK });
  const gv = await teacher(t);
  const classId = await classWithStudents(t, gv);
  const examId = await examFor(t, gv, 1);
  const a = await publishFromExam(t, gv, classId, examId, { title: "KT 15 phút Mệnh đề", dueAt: inHours(7, CLOCK), kind: "test" });
  const { classCode, cards } = await issueAll(t, gv, classId);
  const hs = await Promise.all(cards.map((c) => loginStudent(t, classCode, c)));
  const key = (await call(t, "GET", `/api/exams/${examId}/key`, gv)).json()[0].entries;
  return { gv, classId, a, hs, full: responsesFromKey(key) };
}
const startId = async (hs: Headers, id: string) => (await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {})).json().submission.id as string;

describe("GET /api/gv/hom-nay", { timeout: 60_000 }, () => {
  it("gộp việc chấm + hạn nộp + tiết, chỉ số, bảng lớp trong một lần gọi", async () => {
    const { gv, classId, a, hs, full } = await setup();
    const s0 = await startId(hs[0]!, a.id);
    await call(t, "POST", `/api/student/submissions/${s0}/submit`, hs[0]!, { seq: 1, answers: full });
    await startId(hs[1]!, a.id);
    const base = lessonPlan();
    const plan = { ...base, header: { ...base.header, date: "10/11/2026", title: "Bất phương trình bậc hai" } };
    expect((await call(t, "POST", "/api/lessons", gv, plan)).statusCode).toBe(201);

    const r = await call(t, "GET", "/api/gv/hom-nay", gv);
    expect(r.statusCode).toBe(200);
    expect(r.headers["cache-control"]).toContain("no-store");
    const d = r.json();
    expect(d.date).toEqual({ day: "2026-11-10", weekday: "T3" });
    const grade = d.tasks.find((x: { kind: string }) => x.kind === "grade");
    expect(grade).toMatchObject({ id: "KT-1011-10A1", group: "today", className: "10A1", classId, progress: { done: 0, total: 1 }, dueLabel: "17:00", hot: true, href: `/lop-hoc/${classId}?tab=ket-qua&bai=${a.id}` });
    expect(grade.title).toBe("Chấm · KT 15 phút Mệnh đề");
    expect(grade.detail).toMatchObject({ type: "assignment", rosterSize: 3, submitted: 1, graded: 0, pendingAnswers: 1, open: true });
    expect(grade.detail.missing.map((m: { fullName: string }) => m.fullName).sort()).toEqual(["Lê Văn Cường", "Trần Thị Bình"]);
    expect(grade.detail.hardest.length).toBeGreaterThan(0);
    const lesson = d.tasks.find((x: { kind: string }) => x.kind === "lesson");
    expect(lesson).toMatchObject({ title: "Lên lớp · Bất phương trình bậc hai", group: "today", dueLabel: "Hôm nay", note: "Chưa có bảng giảng" });
    expect(d.kpis).toMatchObject({ pendingGrading: { value: 1, today: 1 }, lessonsToday: { value: 1, first: "Bất phương trình bậc hai" }, dueToday: { value: 1, times: ["17:00"] } });
    expect(d.classes).toEqual([expect.objectContaining({ id: classId, name: "10A1", rosterSize: 3 })]);
  });

  it("chấm xong câu tự luận → việc đổi sang Hạn nộp; có phổ điểm; bảng lớp theo bài giao", async () => {
    const { gv, a, hs, full } = await setup();
    const s0 = await startId(hs[0]!, a.id);
    await call(t, "POST", `/api/student/submissions/${s0}/submit`, hs[0]!, { seq: 1, answers: full });
    const res = (await call(t, "GET", `/api/assignments/${a.id}/results`, gv)).json();
    const essayNo = res.stats.items.find((i: { type: string }) => i.type === "essay").label as number;
    expect((await call(t, "PUT", `/api/assignments/${a.id}/submissions/${s0}/grades`, gv, { points: { [essayNo]: 1 } })).statusCode).toBe(200);
    const d = (await call(t, "GET", "/api/gv/hom-nay", gv)).json();
    expect(d.tasks.map((x: { kind: string }) => x.kind)).toEqual(["due"]);
    expect(d.tasks[0]).toMatchObject({ title: "Hạn nộp · KT 15 phút Mệnh đề", progress: { done: 1, total: 3 } });
    expect(d.tasks[0].detail).toMatchObject({ scored: 1, mean: 10, median: 10 });
    expect(d.tasks[0].detail.histogram[9]).toBe(1);
    expect(d.kpis.pendingGrading.value).toBe(0);
    expect(d.kpis.weekAvg.value).toBe(10);
    expect(d.classes[0]).toMatchObject({ basis: "bai-giao", bands: [1, 0, 0, 0], avg: 10 });
  });

  it("học sinh (phiên mã lớp) không gọi được endpoint GV", async () => {
    const { hs } = await setup();
    expect((await call(t, "GET", "/api/gv/hom-nay", hs[0]!)).statusCode).toBe(401);
  });
});

describe("GET /api/hoc/hom-nay", { timeout: 60_000 }, () => {
  it("phiên mã lớp: việc tiếp theo, sắp tới, chuỗi ngày, thành thạo từ bài làm", async () => {
    const { a, hs, full } = await setup();
    const s1 = await startId(hs[1]!, a.id);
    await call(t, "PUT", `/api/student/submissions/${s1}/answers`, hs[1]!, { seq: 1, answers: { "1": full["1"] } });
    const d = (await call(t, "GET", "/api/hoc/hom-nay", hs[1]!)).json();
    expect(d.student).toMatchObject({ name: "Trần Thị Bình", className: "10A1" });
    expect(d.next).toMatchObject({ assignmentId: a.id, state: "dang_lam", answered: 1, total: 5, teacher: "Cô Lan", className: "10A1", day: "Nay", dayNum: "17h", hot: true });
    expect(d.upcoming).toHaveLength(1);
    expect(d.canTutor).toBe(false);
    expect(d.review).toBeNull();
    expect(d.days).toHaveLength(14);

    const s0 = await startId(hs[0]!, a.id);
    await call(t, "POST", `/api/student/submissions/${s0}/submit`, hs[0]!, { seq: 1, answers: full });
    const done = (await call(t, "GET", "/api/hoc/hom-nay", hs[0]!)).json();
    expect(done.next).toBeNull();
    expect(done.upcoming).toEqual([]);
    expect(done.days.at(-1)).toEqual({ date: "2026-11-10", weekday: "T3", count: 5 });
    expect(done.streak).toEqual({ current: 1, longest: 1, goal: 15 });
    expect(done.mastery).toMatchObject({ subject: "Toán", rows: [{ topic: "Mệnh đề", n: 4, pct: 100 }] });
    expect(done.subjects).toEqual([{ subject: "Toán", metric: { kind: "none", value: null }, next: null }]);
  });

  it("tài khoản Keycloak: lớp đã liên kết + thẻ ôn đến hạn của gia sư", async () => {
    const { a } = await setup();
    const kc = bearerOf(await t.sign({ sub: "hs-kc", name: "Lê Văn Cường" }));
    await call(t, "GET", "/api/me", kc);
    const [u] = await t.db.select().from(users).where(eq(users.sub, "hs-kc"));
    const [cuong] = await t.db.select().from(students).where(eq(students.fullName, "Lê Văn Cường"));
    await t.db.update(students).set({ userId: u!.id }).where(eq(students.id, cuong!.id));
    const me = (await call(t, "GET", "/api/me", kc)).json();
    const row = { orgId: me.org.id, learnerKey: u!.id, subject: "Toán", grade: 10, topic: "Hàm số", intervalDays: 1, ease: 2.5, streak: 1, lapses: 0, reviewCount: 1, version: 1, lastReviewAt: CLOCK };
    await t.db.insert(tutorReviewState).values([
      { ...row, questionId: "00000000-0000-4000-8000-000000000001", dueAt: new Date(CLOCK.getTime() - 3600_000) },
      { ...row, questionId: "00000000-0000-4000-8000-000000000002", dueAt: new Date(CLOCK.getTime() - 60_000) },
      { ...row, questionId: "00000000-0000-4000-8000-000000000003", dueAt: new Date(CLOCK.getTime() + 86_400_000) },
    ]);
    const d = (await call(t, "GET", "/api/hoc/hom-nay", kc)).json();
    expect(d.canTutor).toBe(true);
    expect(d.review).toEqual({ due: 2, minutes: 1 });
    expect(d.next).toMatchObject({ assignmentId: a.id, state: "chua_lam" });
    expect(d.student.name).toBe("Lê Văn Cường");
  });

  it("không có token → 401", async () => {
    await setup();
    expect((await call(t, "GET", "/api/hoc/hom-nay", {})).statusCode).toBe(401);
  });
});
