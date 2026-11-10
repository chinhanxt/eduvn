import { afterEach, describe, expect, it } from "vitest";
import { createSubmissionService } from "../../src/services/submissions";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, inHours, issueAll, loginStudent, publishFromExam, teacher } from "../helpers/classroom";
import { responsesFromKey } from "../helpers/fixtures";

let t: TApp;
let clock: Date;
const tick = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};
afterEach(async () => {
  await t.app.close();
});

async function setup(extra: Record<string, unknown> = {}, opts: { studentRateLimit?: { max: number; timeWindow: number } } = {}) {
  clock = new Date();
  t = await testApp({ now: () => clock, ...opts });
  const gv = await teacher(t);
  const classId = await classWithStudents(t, gv);
  const examId = await examFor(t, gv);
  const a = await publishFromExam(t, gv, classId, examId, extra);
  const { classCode, cards } = await issueAll(t, gv, classId);
  const hs = await Promise.all(cards.map((c) => loginStudent(t, classCode, c)));
  return { gv, classId, examId, a, hs };
}
const start = async (hs: Headers, id: string) => {
  const r = await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {});
  if (r.statusCode !== 200) throw new Error(`start ${r.statusCode} ${r.body}`);
  return r.json();
};
const save = (hs: Headers, sid: string, seq: number, answers: Record<string, unknown>) => call(t, "PUT", `/api/student/submissions/${sid}/answers`, hs, { seq, answers });

describe("phòng làm bài", { timeout: 60_000 }, () => {
  it("vào bài → câu hỏi không lộ đáp án → tự lưu theo seq → nộp idempotent → kết quả theo show_solution", async () => {
    const { gv, examId, a, hs } = await setup();
    const list = (await call(t, "GET", "/api/student/assignments", hs[0]!)).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, state: "chua_lam", canStart: true, questionCount: 5, attemptsUsed: 0 });

    const room = await start(hs[0]!, a.id);
    expect(room.submission).toMatchObject({ attempt: 1, seq: 0, answers: {}, status: "in_progress", variantCode: "101" });
    expect(new Date(room.submission.deadlineAt).getTime() - clock.getTime()).toBe(15 * 60_000);
    expect(room.questions).toHaveLength(5);
    expect(JSON.stringify(room.questions)).not.toMatch(/"answer"|"explanation"|"rubric"|"questionId"/);
    expect(room.serverNow).toBe(clock.toISOString());
    const sid = room.submission.id as string;

    expect((await save(hs[0]!, sid, 1, { "1": 0 })).json()).toMatchObject({ ok: true, seq: 1, deadlineAt: room.submission.deadlineAt });
    expect((await save(hs[0]!, sid, 3, { "1": 1, "2": 2 })).json().seq).toBe(3);
    expect((await save(hs[0]!, sid, 2, { "1": 3 })).json()).toMatchObject({ ok: true, seq: 3 });
    const again = await start(hs[0]!, a.id);
    expect([again.submission.id, again.submission.seq, again.submission.answers]).toEqual([sid, 3, { "1": 1, "2": 2 }]);
    expect((await save(hs[0]!, sid, 4, { "1": 9 })).statusCode).toBe(400);
    expect((await call(t, "GET", "/api/student/assignments", hs[0]!)).json()[0]).toMatchObject({ state: "dang_lam", answered: 2, currentSubmissionId: sid });

    const key = ((await call(t, "GET", `/api/exams/${examId}/key`, gv)).json() as { code: string; entries: never[] }[]).find((k) => k.code === "101")!;
    const answers = { ...responsesFromKey(key.entries), [String(key.entries.find((e: { section: string }) => e.section === "short_answer")!["no"])]: "\\frac{3}{2}" };
    const sub = await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs[0]!, { seq: 4, answers });
    expect(sub.statusCode).toBe(200);
    const res = sub.json();
    expect(res).toMatchObject({ status: "submitted", score: 2, maxScore: 3, score10: 6.67, pending: 1, correctCount: 4, level: "marks", attemptsUsed: 1, canRetry: false });
    expect(JSON.stringify(res.items)).not.toMatch(/"key"|"explanation"/);
    const twice = await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs[0]!, { seq: 9, answers: {} });
    expect(twice.json()).toMatchObject({ status: "submitted", score: 2 });
    expect((await save(hs[0]!, sid, 10, {})).json()).toMatchObject({ status: "submitted" });
    expect((await save(hs[0]!, sid, 10, {})).statusCode).toBe(409);
    const more = await call(t, "POST", `/api/student/assignments/${a.id}/start`, hs[0]!, {});
    expect([more.statusCode, more.json().error]).toEqual([409, "Em đã dùng hết lượt làm bài này"]);
    expect((await call(t, "GET", "/api/student/assignments", hs[0]!)).json()[0]).toMatchObject({ state: "da_nop", canStart: false, score10: 6.67, lastSubmissionId: sid });

    tick(3 * 3600_000);
    const after = (await call(t, "GET", `/api/student/submissions/${sid}`, hs[0]!)).json();
    expect(after.level).toBe("full");
    expect(after.items.find((i: { type: string }) => i.type === "mcq").key).toMatch(/^[ABCD]$/);
  });

  it("hết giờ: còn lưu trong 30 giây ân hạn, sau đó 409 và bài tự nộp bằng bản đã lưu", async () => {
    const { a, hs } = await setup({ durationMinutes: 10 });
    const sid = (await start(hs[0]!, a.id)).submission.id;
    await save(hs[0]!, sid, 1, { "1": 0 });
    tick(10 * 60_000 + 20_000);
    expect((await save(hs[0]!, sid, 2, { "1": 0, "2": 1 })).statusCode).toBe(200);
    tick(11_000);
    const late = await save(hs[0]!, sid, 3, { "1": 3 });
    expect([late.statusCode, late.json().status]).toEqual([409, "auto_submitted"]);
    const r = (await call(t, "GET", `/api/student/submissions/${sid}`, hs[0]!)).json();
    expect(r.status).toBe("auto_submitted");
    expect(r.items.filter((i: { response: unknown }) => i.response !== null)).toHaveLength(2);
    const lateSubmit = await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs[0]!, { seq: 5, answers: { "1": 3 } });
    expect(lateSubmit.json().status).toBe("auto_submitted");
  });

  it("nộp muộn quá ân hạn: bỏ bản gửi kèm; quét định kỳ chốt bài bỏ dở", async () => {
    const { a, hs } = await setup({ durationMinutes: 10 });
    const s0 = (await start(hs[0]!, a.id)).submission.id;
    const s1 = (await start(hs[1]!, a.id)).submission.id;
    await save(hs[0]!, s0, 1, { "1": 0 });
    tick(11 * 60_000);
    const r = await call(t, "POST", `/api/student/submissions/${s0}/submit`, hs[0]!, { seq: 2, answers: { "1": 0, "2": 1 } });
    expect(r.json()).toMatchObject({ status: "auto_submitted" });
    expect(r.json().items.filter((i: { response: unknown }) => i.response !== null)).toHaveLength(1);
    const sweeper = createSubmissionService(t.db, { now: () => clock });
    expect(await sweeper.finalizeExpired()).toBe(1);
    expect(await sweeper.finalizeExpired()).toBe(0);
    expect((await call(t, "GET", `/api/student/submissions/${s1}`, hs[1]!)).json()).toMatchObject({ status: "auto_submitted", score: 0 });
  });

  it("mã đề theo số thứ tự; đảo câu giữ thứ tự phần", async () => {
    const { a, hs } = await setup({ shuffle: true });
    const r1 = await start(hs[0]!, a.id);
    const r2 = await start(hs[1]!, a.id);
    expect([r1.submission.variantCode, r2.submission.variantCode]).toEqual(["101", "102"]);
    const order = ["mcq", "true_false", "short_answer", "essay"];
    const types = (r1.questions as { type: string }[]).map((q) => order.indexOf(q.type));
    expect(types).toEqual([...types].sort());
  });

  it("rời tab cộng leave_count; GV gia hạn thì bài đang làm được nới hạn", async () => {
    const { gv, a, hs } = await setup({ durationMinutes: null });
    const room = await start(hs[0]!, a.id);
    const ev = await call(t, "POST", `/api/student/submissions/${room.submission.id}/events`, hs[0]!, { events: [{ kind: "leave" }, { kind: "return" }, { kind: "leave" }] });
    expect(ev.json()).toEqual({ ok: true, leaveCount: 2 });
    const due = inHours(6, clock);
    await call(t, "PATCH", `/api/assignments/${a.id}`, gv, { dueAt: due });
    expect((await start(hs[0]!, a.id)).submission.deadlineAt).toBe(new Date(due).toISOString());
  });

  it("luyện tập nhiều lượt: nộp xong làm lại được, lượt mới", async () => {
    const { a, hs } = await setup({ kind: "practice" });
    const s1 = (await start(hs[0]!, a.id)).submission.id;
    const res = (await call(t, "POST", `/api/student/submissions/${s1}/submit`, hs[0]!, { seq: 1, answers: {} })).json();
    expect(res).toMatchObject({ level: "full", canRetry: true, attemptsAllowed: 3 });
    const r2 = await start(hs[0]!, a.id);
    expect(r2.submission.attempt).toBe(2);
    expect(r2.submission.id).not.toBe(s1);
  });

  it("cô lập: bài người khác 404, token GV 401, bài nháp ẩn, quá giới hạn tần suất 429", async () => {
    const { gv, classId, examId, a, hs } = await setup({}, { studentRateLimit: { max: 3, timeWindow: 60_000 } });
    const sid = (await start(hs[0]!, a.id)).submission.id;
    expect((await save(hs[1]!, sid, 1, {})).statusCode).toBe(404);
    expect((await call(t, "GET", `/api/student/submissions/${sid}`, hs[1]!)).statusCode).toBe(404);
    expect((await call(t, "GET", "/api/student/assignments", gv)).statusCode).toBe(401);
    expect((await save(hs[0]!, "x", 1, {})).statusCode).toBe(404);
    await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "Nháp", source: { examId }, dueAt: inHours(3, clock) });
    expect((await call(t, "GET", "/api/student/assignments", hs[0]!)).json()).toHaveLength(1);
    for (let i = 1; i <= 2; i++) expect((await save(hs[0]!, sid, i, {})).statusCode).toBe(200);
    const limited = await save(hs[0]!, sid, 4, {});
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});
