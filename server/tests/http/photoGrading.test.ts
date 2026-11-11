import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { students } from "../../src/db/schema";
import { normalizeEssay } from "../../src/domain/essay";
import type { Ai, AiMessage } from "../../src/services/ai";
import { testApp } from "../helpers/app";
import { essay, mcq, short, tf } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
let calls: { task: string; messages: AiMessage[]; json?: boolean }[] = [];
let reply = "";
const fakeAi: Ai = {
  chat: async (task, messages, opts) => {
    calls.push({ task, messages, json: opts?.json });
    return reply;
  },
  stream: async function* () {},
};
const JPG = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

beforeEach(async () => {
  calls = [];
  t = await testApp({ ai: fakeAi });
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", email: "gv1@example.test", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});
const call = (method: "GET" | "POST" | "DELETE", url: string, payload?: unknown) => t.app.inject({ method, url, headers: auth, payload: payload as object });

async function makeExam() {
  for (const q of [mcq(), tf(), short(), essay({ explanation: "Đáp án mẫu: phản chứng." })]) expect((await call("POST", "/api/questions", q)).statusCode).toBe(201);
  const m = { subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 1 }, { topic: "Mệnh đề", level: "NB", type: "true_false", count: 1 }, { topic: "Mệnh đề", level: "NB", type: "short_answer", count: 1 }, { topic: "Mệnh đề", level: "NB", type: "essay", count: 1 }] };
  const res = await call("POST", "/api/exams", { title: "Đề thử", matrix: m, variants: 1 });
  expect(res.statusCode).toBe(201);
  return res.json() as { examId: string; codes: string[] };
}

describe("essay domain", () => {
  it("ép thang điểm và kẹp điểm tiêu chí", () => {
    const r = normalizeEssay({ criteria: [{ name: "Ý 1", max: 2, points: 3 }, { name: "Ý 2", max: 2, points: 1 }] }, 2);
    expect(r.criteria.map((c) => [c.max, c.points])).toEqual([[1, 1], [1, 0.5]]);
    expect(r).toMatchObject({ total: 1.5, max: 2 });
  });
});

describe("HTTP chấm từ ảnh", () => {
  it("lưu phiếu quét: chấm lại ở server, có ý đúng/sai thiếu (null) vẫn chấm được", async () => {
    const { examId, codes } = await makeExam();
    const keys = (await call("GET", `/api/exams/${examId}/key`)).json() as { code: string; entries: { no: number; section: string; answer: string }[] }[];
    const e = keys[0]!.entries;
    const responses: Record<string, unknown> = {};
    for (const x of e) {
      if (x.section === "mcq") responses[x.no] = "ABCD".indexOf(x.answer);
      if (x.section === "true_false") responses[x.no] = [...x.answer].map((c, i) => (i === 3 ? null : c === "Đ"));
      if (x.section === "short_answer") responses[x.no] = x.answer;
    }
    const res = await call("POST", "/api/photo/omr", { examId, code: codes[0], student: "123456", responses, doubts: 2, edited: 1 });
    expect(res.statusCode).toBe(201);
    expect(res.json().total).toBe(1.25); // mcq 0,25 + đúng/sai 3 ý đúng 0,5 + trả lời ngắn (Toán) 0,5
    const list = (await call("GET", "/api/photo/results?kind=omr")).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ kind: "omr", student: "123456", body: { doubts: 2, edited: 1 } });
    expect((await call("DELETE", `/api/photo/results/${list[0].id}`)).statusCode).toBe(204);
    expect((await call("GET", "/api/photo/results")).json()).toHaveLength(0);
  });

  it("ghi điểm phiếu quét vào sổ điểm (quy thang 10)", async () => {
    const { examId, codes } = await makeExam();
    const e = ((await call("GET", `/api/exams/${examId}/key`)).json() as { entries: { no: number; section: string; answer: string }[] }[])[0]!.entries;
    const responses = Object.fromEntries(e.filter((x) => x.section === "mcq").map((x) => [x.no, "ABCD".indexOf(x.answer)]));
    const saved = (await call("POST", "/api/photo/omr", { examId, code: codes[0], student: "1", responses })).json(); // 0,25 / 1,75
    const cls = (await call("POST", "/api/classes", { name: "10A1", schoolYear: "2026-2027" })).json();
    await call("POST", `/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An" });
    const sid = (await call("GET", `/api/classes/${cls.id}`)).json().students[0].id;
    const res = await call("POST", `/api/photo/results/${saved.id}/gradebook`, { classId: cls.id, studentId: sid, column: "GK", term: "HK1" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ score: 1.4, column: "GK" });
    const gb = (await call("GET", `/api/classes/${cls.id}/gradebook`)).json();
    expect(gb.students[0].scores.GK).toBe(1.4);
    expect((await call("POST", `/api/photo/results/${saved.id}/gradebook`, { classId: cls.id, studentId: sid, column: "XX" })).statusCode).toBe(400);
  });

  it("ghép phiếu với HS theo SBD = số thứ tự; không khớp → để GV chọn tay; ghi sổ điểm không cần chọn lại", async () => {
    const { examId, codes } = await makeExam();
    const cls = (await call("POST", "/api/classes", { name: "10A2", schoolYear: "2026-2027" })).json();
    await call("POST", `/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An\nTrần Thị Bình" });
    const ids = ((await call("GET", `/api/classes/${cls.id}`)).json().students as { id: string }[]).map((s) => s.id);
    await t.db.update(students).set({ seat: 1 }).where(eq(students.id, ids[0]!));
    await t.db.update(students).set({ seat: 12 }).where(eq(students.id, ids[1]!));
    const other = (await call("POST", "/api/classes", { name: "11B", schoolYear: "2026-2027" })).json();
    await call("POST", `/api/classes/${other.id}/students`, { text: "Người Lớp Khác" });
    const otherId = (await call("GET", `/api/classes/${other.id}`)).json().students[0].id;

    const ro = (await call("GET", `/api/photo/classes/${cls.id}/roster`)).json();
    expect(ro.students.map((s: { seat: number | null }) => s.seat)).toEqual([1, 12]);

    const ok = (await call("POST", "/api/photo/omr", { examId, code: codes[0], classId: cls.id, student: "000012", responses: {} })).json();
    expect(ok).toMatchObject({ match: "ok", student: { id: ids[1], fullName: "Trần Thị Bình", seat: 12 } });
    const none = (await call("POST", "/api/photo/omr", { examId, code: codes[0], classId: cls.id, student: "000007", responses: {} })).json();
    expect(none).toMatchObject({ match: "none", student: null });
    const bad = (await call("POST", "/api/photo/omr", { examId, code: codes[0], classId: cls.id, student: "0?0001", responses: {} })).json();
    expect(bad.match).toBe("unreadable");
    const manual = (await call("POST", "/api/photo/omr", { examId, code: codes[0], classId: cls.id, studentId: ids[0], student: "000007", responses: {} })).json();
    expect(manual).toMatchObject({ match: "ok", student: { id: ids[0] } });
    expect((await call("POST", "/api/photo/omr", { examId, code: codes[0], classId: cls.id, studentId: otherId, responses: {} })).statusCode).toBe(400);

    const list = (await call("GET", "/api/photo/results?kind=omr")).json();
    expect(list.find((r: { id: string }) => r.id === ok.id)).toMatchObject({ student: "12 · Trần Thị Bình", body: { sbd: "000012", studentId: ids[1], classId: cls.id } });
    const gb = await call("POST", `/api/photo/results/${ok.id}/gradebook`, { column: "GK" });
    expect(gb.statusCode).toBe(200);
    expect((await call("POST", `/api/photo/results/${none.id}/gradebook`, { column: "GK" })).statusCode).toBe(400);
    const book = (await call("GET", `/api/classes/${cls.id}/gradebook`)).json();
    expect(book.students.find((s: { id: string }) => s.id === ids[1]).scores.GK).toBe(0);
  });

  it("bài viết tay: phiên âm → chấm → GV sửa → lưu", async () => {
    const { examId } = await makeExam();
    const ess = (await call("GET", `/api/photo/exams/${examId}/essays`)).json();
    expect(ess).toHaveLength(1);
    expect(ess[0]).toMatchObject({ points: 1, reference: "Đáp án mẫu: phản chứng." });

    reply = "Giả sử $\\sqrt{2}=a/b$.\n---\nVô lí.";
    const tr = await call("POST", "/api/photo/essay/transcribe", { images: [JPG, JPG], hint: "Toán 10" });
    expect(tr.statusCode).toBe(200);
    expect(tr.json().text).toContain("\\sqrt{2}");
    expect(calls[0]!.task).toBe("doc_anh_bai_lam");
    const parts = calls[0]!.messages[1]!.content as { type: string }[];
    expect(parts.filter((p) => p.type === "image_url")).toHaveLength(2);

    reply = JSON.stringify({ criteria: [{ name: "Phản chứng", max: 0.5, points: 0.5, comment: "Đúng" }, { name: "Mâu thuẫn", max: 0.5, points: 0.25, comment: "Thiếu kết luận" }], comment: "Khá" });
    const gr = await call("POST", "/api/photo/essay/grade", { question: ess[0].stem, reference: ess[0].reference, rubric: ess[0].rubric, maxPoints: 1, transcript: tr.json().text });
    expect(gr.statusCode).toBe(200);
    expect(calls[1]).toMatchObject({ task: "cham_tu_luan", json: true });
    expect(gr.json()).toMatchObject({ total: 0.75, max: 1 });
    expect(JSON.stringify(calls[1]!.messages)).toContain("Đáp án mẫu: phản chứng.");

    const edited = { ...gr.json(), criteria: gr.json().criteria.map((c: { points: number }, i: number) => (i === 1 ? { ...c, points: 0.5 } : c)) };
    const saved = await call("POST", "/api/photo/essay", { examId, student: "Nguyễn An", title: "Câu 4", maxPoints: 1, transcript: "bài", grading: { criteria: edited.criteria, comment: "Tốt" } });
    expect(saved.statusCode).toBe(201);
    expect(saved.json().total).toBe(1);
    expect((await call("GET", "/api/photo/results?kind=essay")).json()[0]).toMatchObject({ student: "Nguyễn An", total: 1 });
    const cls = (await call("POST", "/api/classes", { name: "10A3", schoolYear: "2026-2027" })).json();
    await call("POST", `/api/classes/${cls.id}/students`, { text: "Phạm Hà" });
    const sid = (await call("GET", `/api/classes/${cls.id}`)).json().students[0].id;
    await t.db.update(students).set({ seat: 5 }).where(eq(students.id, sid));
    const linked = (await call("POST", "/api/photo/essay", { examId, classId: cls.id, studentId: sid, title: "Câu 4", maxPoints: 1, transcript: "bài", grading: { criteria: edited.criteria } })).json();
    expect((await call("GET", "/api/photo/results?kind=essay")).json().find((r: { id: string }) => r.id === linked.id)).toMatchObject({ student: "5 · Phạm Hà", body: { studentId: sid } });
    expect((await call("POST", `/api/photo/results/${linked.id}/gradebook`, { column: "GK" })).json()).toMatchObject({ score: 10 });
  });

  it("AI trả sai định dạng → 503; ảnh sai → 400; chưa đăng nhập → 401", async () => {
    reply = "không phải JSON";
    const bad = await call("POST", "/api/photo/essay/grade", { question: "Q", rubric: "R", maxPoints: 1, transcript: "x" });
    expect(bad.statusCode).toBe(503);
    expect((await call("POST", "/api/photo/essay/transcribe", { images: ["http://x/y.jpg"] })).statusCode).toBe(400);
    expect((await t.app.inject({ method: "GET", url: "/api/photo/results" })).statusCode).toBe(401);
  });
});
