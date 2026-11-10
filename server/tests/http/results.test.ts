import { afterEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, issueAll, loginStudent, publishFromExam, teacher } from "../helpers/classroom";
import { responsesFromKey } from "../helpers/fixtures";

let t: TApp;
let clock: Date;
afterEach(async () => {
  await t.app.close();
});

async function setup() {
  clock = new Date();
  t = await testApp({ now: () => clock });
  const gv = await teacher(t);
  const classId = await classWithStudents(t, gv);
  const examId = await examFor(t, gv, 1);
  const a = await publishFromExam(t, gv, classId, examId, { showSolution: "after_submit" });
  const { classCode, cards } = await issueAll(t, gv, classId);
  const hs = await Promise.all(cards.map((c) => loginStudent(t, classCode, c)));
  const key = (await call(t, "GET", `/api/exams/${examId}/key`, gv)).json()[0].entries;
  return { gv, a, hs, full: responsesFromKey(key) };
}
const startId = async (hs: Headers, id: string) => (await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {})).json().submission.id as string;

describe("theo dõi + kết quả (GV)", { timeout: 60_000 }, () => {
  it("theo dõi trực tiếp: trạng thái, số câu đã làm, rời tab; cache 2 giây", async () => {
    const { gv, a, hs, full } = await setup();
    const s0 = await startId(hs[0]!, a.id);
    await call(t, "PUT", `/api/student/submissions/${s0}/answers`, hs[0]!, { seq: 1, answers: { "1": 0, "2": 1 } });
    await call(t, "POST", `/api/student/submissions/${s0}/events`, hs[0]!, { events: [{ kind: "leave" }] });
    const s1 = await startId(hs[1]!, a.id);
    await call(t, "POST", `/api/student/submissions/${s1}/submit`, hs[1]!, { seq: 1, answers: full });
    const m = (await call(t, "GET", `/api/assignments/${a.id}/monitor`, gv)).json();
    expect(m.counts).toEqual({ chua_vao: 1, dang_lam: 1, da_nop: 1, tu_nop: 0 });
    expect(m.rows.map((r: { seat: number; state: string; answered: number; leaveCount: number }) => [r.seat, r.state, r.answered, r.leaveCount])).toEqual([
      [1, "dang_lam", 2, 1],
      [2, "da_nop", 5, 0],
      [3, "chua_vao", 0, 0],
    ]);
    await call(t, "PUT", `/api/student/submissions/${s0}/answers`, hs[0]!, { seq: 2, answers: { "1": 0, "2": 1, "3": [true, true, true, true] } });
    const cached = (await call(t, "GET", `/api/assignments/${a.id}/monitor`, gv)).json();
    expect([cached.serverNow, cached.rows[0].answered]).toEqual([m.serverNow, 2]);
    clock = new Date(clock.getTime() + 2500);
    expect((await call(t, "GET", `/api/assignments/${a.id}/monitor`, gv)).json().rows[0].answered).toBe(3);
  });

  it("bảng điểm + thống kê; GV chấm tự luận thì điểm HS cập nhật; xem bài làm có hướng dẫn chấm", async () => {
    const { gv, a, hs, full } = await setup();
    const ids = await Promise.all(hs.map((h) => startId(h, a.id)));
    await call(t, "POST", `/api/student/submissions/${ids[0]}/submit`, hs[0]!, { seq: 1, answers: full });
    await call(t, "POST", `/api/student/submissions/${ids[1]}/submit`, hs[1]!, { seq: 1, answers: { "1": full["1"] } });
    const r = (await call(t, "GET", `/api/assignments/${a.id}/results`, gv)).json();
    expect(r.rows.map((x: { seat: number; status: string | null; score: number | null; pending: number }) => [x.seat, x.status, x.score, x.pending])).toEqual([
      [1, "submitted", 2, 1],
      [2, "submitted", 0.25, 1],
      [3, "in_progress", null, 0],
    ]);
    expect(r.stats).toMatchObject({ rosterSize: 3, started: 3, submitted: 2, submitRate: 0.67, mean: 3.75 });
    expect(r.stats.items).toHaveLength(5);
    expect(r.stats.items[0]).toMatchObject({ label: 1, n: 2, p: 1, d: null });
    expect(r.stats.topics[0].topic).toBe("Mệnh đề");

    const essayNo = r.stats.items.find((i: { type: string }) => i.type === "essay").label as number;
    const bad = await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[0]}/grades`, gv, { points: { [essayNo]: 5 } });
    expect([bad.statusCode, bad.json().issues]).toEqual([400, [`Câu ${essayNo}: tối đa 1 điểm`]]);
    expect((await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[0]}/grades`, gv, { points: { "1": 0.25 } })).statusCode).toBe(400);
    const ok = await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[0]}/grades`, gv, { points: { [essayNo]: 0.75 } });
    expect(ok.json()).toEqual({ score: 2.75, maxScore: 3, pending: 0 });
    expect((await call(t, "GET", `/api/student/submissions/${ids[0]}`, hs[0]!)).json()).toMatchObject({ score: 2.75, pending: 0, score10: 9.17 });
    expect((await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[2]}/grades`, gv, { points: { [essayNo]: 1 } })).statusCode).toBe(409);

    const d = (await call(t, "GET", `/api/assignments/${a.id}/submissions/${ids[0]}`, gv)).json();
    expect(d.student).toMatchObject({ fullName: "Nguyễn Văn An", seat: 1 });
    expect(d.items.find((i: { type: string }) => i.type === "essay")).toMatchObject({ points: 0.75, rubric: expect.stringContaining("phản chứng") });
    expect(d.items.find((i: { type: string }) => i.type === "mcq").key).toMatch(/^[ABCD]$/);
  });

  it("hết hạn: GV đọc kết quả thì bài bỏ dở được chốt; HS chưa vào bị báo", async () => {
    const { gv, a, hs } = await setup();
    await startId(hs[0]!, a.id);
    clock = new Date(clock.getTime() + 3 * 3600_000);
    const r = (await call(t, "GET", `/api/assignments/${a.id}/results`, gv)).json();
    expect(r.rows[0].status).toBe("auto_submitted");
    expect(r.stats.atRisk.map((x: { fullName: string; reasons: string[] }) => [x.fullName, x.reasons])).toEqual([
      ["Trần Thị Bình", ["Chưa vào bài"]],
      ["Lê Văn Cường", ["Chưa vào bài"]],
      ["Nguyễn Văn An", ["Dưới 5 điểm"]],
    ]);
    const other = await teacher(t, "gv-2", "Thầy Minh");
    expect((await call(t, "GET", `/api/assignments/${a.id}/results`, other)).statusCode).toBe(404);
  });
});
