// server/tests/http/solutions.test.ts — P13 qua HTTP: giải từng bước (SSE), tự sửa khi lệch, ngân hàng, chia sẻ công khai + trang OG,
// kết quả bài làm HS (theo show_solution) và "Chưa hiểu bước này" bằng phiên HS.
import { afterEach, describe, expect, it } from "vitest";
import { addMember, ensureUser } from "../../src/db/repo";
import type { Ai, AiMessage } from "../../src/services/ai";
import { SOLUTION_SYSTEM } from "../../src/services/solutions";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, issueAll, loginStudent, publishFromExam, teacher } from "../helpers/classroom";
import { parseSse } from "../helpers/tutor";
import { fakeTutorAi } from "../helpers/tutorAi";

const TREE = {
  kind: "tree",
  spec: {
    nodes: [
      { id: "g", label: "Chọn máy" },
      { id: "A", label: "Máy A", parent: "g", p: "0,6" },
      { id: "B", label: "Máy B", parent: "g", p: "0,4" },
      { id: "AL", label: "Lỗi", parent: "A", p: "0,02" },
      { id: "AT", label: "Tốt", parent: "A", p: "0,98" },
      { id: "BL", label: "Lỗi", parent: "B", p: "0,05" },
      { id: "BT", label: "Tốt", parent: "B", p: "0,95" },
    ],
  },
};
const solutionJson = (answer: string) =>
  JSON.stringify({
    problem: "chép đề",
    subject: "Toán",
    topic: "Xác suất có điều kiện",
    answer,
    figure: TREE,
    steps: [
      { title: "Vẽ cây", body: "Gọi $A$ là biến cố chọn máy A.", refs: ["g", "A", "B"] },
      { title: "Xác suất lỗi", body: "$P(L) = 0{,}6 \\cdot 0{,}02 + 0{,}4 \\cdot 0{,}05 = 0{,}032$", refs: ["AL", "BL"] },
      { title: "Kết luận", body: `Đáp số ${answer}.`, refs: ["AL"] },
    ],
    checks: [{ type: "probability", leaves: ["AL", "AT"], given: ["AL", "BL"] }],
  });

/** AI giả: task giai_bai_tung_buoc trả lời giải (stream theo mẩu 7 ký tự); các task gia sư dùng AI giả của P6. */
function fakeAi(opts: { first?: string } = {}) {
  const tutor = fakeTutorAi({ streamText: "Bước này dùng công thức xác suất toàn phần. Em thử xem có mấy đường dẫn tới lá Lỗi?" });
  const calls: { task: string; messages: AiMessage[] }[] = [];
  const isSol = (m: AiMessage[]) => typeof m[0]?.content === "string" && m[0].content === SOLUTION_SYSTEM;
  const ai: Ai = {
    async chat(task, messages, o) {
      if (!isSol(messages)) return tutor.ai.chat(task, messages, o);
      calls.push({ task, messages });
      return solutionJson("3/8");
    },
    async *stream(task, messages, o) {
      if (!isSol(messages)) {
        yield* tutor.ai.stream(task, messages, o);
        return;
      }
      calls.push({ task, messages });
      const text = opts.first ?? solutionJson("3/8");
      for (let i = 0; i < text.length; i += 7) yield text.slice(i, i + 7);
    },
  };
  return { ai, calls };
}

let t: TApp;
afterEach(async () => {
  await t?.app.close();
});

async function setup(opts: { first?: string } = {}) {
  const fake = fakeAi(opts);
  t = await testApp({ ai: fake.ai });
  const gv = await teacher(t);
  const me = (await call(t, "GET", "/api/me", gv)).json();
  return { fake, gv, orgId: me.org.id as string };
}
const solve = (h: Headers, body: unknown) => call(t, "POST", "/api/solutions/solve", h, body);
const PROBLEM = "Hai máy A, B sản xuất 60% và 40% sản phẩm; tỉ lệ lỗi 2% và 5%. Lấy ngẫu nhiên một sản phẩm thấy lỗi. Tính xác suất nó do máy A sản xuất.";

describe("giải từng bước (SSE)", { timeout: 60_000 }, () => {
  it("hình đến trước các bước, từng bước stream, đã kiểm, lưu; tô sáng giữ refs", async () => {
    const { gv } = await setup();
    const r = await solve(gv, { problem: PROBLEM });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-type"]).toContain("text/event-stream");
    const ev = parseSse(r.body);
    const types = ev.map((e) => e.type);
    expect(types.indexOf("figure")).toBeLessThan(types.indexOf("step"));
    expect(ev.filter((e) => e.type === "step").map((e) => e.index)).toEqual([0, 1, 2]);
    expect(types).toContain("partial");
    expect(types.slice(-3)).toEqual(["verified", "done", "end"]);
    const done = ev.find((e) => e.type === "done") as { id: string; solution: { problem: string; verification: { status: string }; steps: { refs: string[] }[] } };
    expect(done.solution.problem).toBe(PROBLEM);
    expect(done.solution.verification.status).toBe("verified");
    expect(done.solution.steps[1]!.refs).toEqual(["AL", "BL"]);
    const got = await call(t, "GET", `/api/solutions/${done.id}`, gv);
    expect(got.json().solution.answer).toBe("3/8");
  });

  it("lệch → AI tự sửa đúng 1 lần với số đo thật rồi kiểm lại", async () => {
    const { gv, fake } = await setup({ first: solutionJson("1/2") });
    const ev = parseSse((await solve(gv, { problem: PROBLEM })).body);
    expect(ev.find((e) => e.type === "status")!.message).toContain("tự sửa");
    expect(ev.find((e) => e.type === "verified")).toMatchObject({ corrected: true, verification: { status: "verified" } });
    expect(fake.calls).toHaveLength(2);
    const fix = fake.calls[1]!.messages.at(-1)!.content as string;
    expect(fix).toContain("LỆCH");
    expect(fix).toContain("3/8");
  });

  it("sai dữ liệu → 400 trước khi mở stream; HS (vai student) giải được nhưng không ghi vào kho", async () => {
    const { gv, orgId } = await setup();
    expect((await solve(gv, { problem: "x" })).statusCode).toBe(400);
    const u = await ensureUser(t.db, { sub: "hs-1", name: "Minh" });
    await addMember(t.db, orgId, u.id, "student");
    const hs = { authorization: `Bearer ${await t.sign({ sub: "hs-1", name: "Minh" })}`, "x-org-id": orgId };
    const ev = parseSse((await solve(hs, { problem: PROBLEM, save: true })).body);
    expect(ev.find((e) => e.type === "done")).toMatchObject({ id: null });
  });
});

describe("ngân hàng + thư viện công khai", { timeout: 60_000 }, () => {
  it("lời giải gắn câu; chia sẻ → /loi-giai lọc, tìm, đếm lượt xem; trang OG; tắt chia sẻ → 404", async () => {
    const { gv } = await setup();
    const q = await call(t, "POST", "/api/questions", gv, { type: "short_answer", subject: "Toán", grade: 12, topic: "Xác suất có điều kiện", level: "VD", stem: PROBLEM, answer: "0,375" });
    expect(q.statusCode).toBe(201);
    const qid = q.json().id as string;
    const ev = parseSse((await solve(gv, { questionId: qid })).body);
    const id = (ev.find((e) => e.type === "done") as { id: string }).id;
    expect((await call(t, "GET", `/api/questions/${qid}/solution`, gv)).json().solution).toMatchObject({ id, questionId: qid, slug: null });
    expect((await call(t, "POST", "/api/solutions/status", gv, { ids: [qid] })).json()).toEqual({ [qid]: "verified" });
    // giải lại cùng câu → ghi đè, vẫn một lời giải
    const id2 = (parseSse((await solve(gv, { questionId: qid })).body).find((e) => e.type === "done") as { id: string }).id;
    expect(id2).toBe(id);

    expect((await call(t, "GET", "/api/public/solutions", {})).json().items).toEqual([]);
    const pub = (await call(t, "POST", `/api/solutions/${id}/publish`, gv, { public: true })).json();
    expect(pub.slug).toMatch(/^hai-may-a-b-san-xuat-60-va-40-san-[a-z0-9]{6}$/);
    const list = (await call(t, "GET", `/api/public/solutions?topic=${encodeURIComponent("Xác suất có điều kiện")}`, {})).json();
    expect(list.items).toHaveLength(1);
    expect(list.topics).toEqual([{ topic: "Xác suất có điều kiện", n: 1 }]);
    expect(JSON.stringify(list)).not.toMatch(/Cô Lan|orgId|ownerId/);
    expect((await call(t, "GET", `/api/public/solutions?q=${encodeURIComponent("máy A")}`, {})).json().items).toHaveLength(1);
    expect((await call(t, "GET", "/api/public/solutions?q=hinh-chop", {})).json().items).toHaveLength(0);
    expect((await call(t, "GET", `/api/public/solutions/${pub.slug}`, {})).json()).toMatchObject({ views: 1, topic: "Xác suất có điều kiện" });
    expect((await call(t, "GET", `/api/public/solutions/${pub.slug}`, {})).json().views).toBe(2);

    const og = await call(t, "GET", `/chia-se/loi-giai/${pub.slug}`, {});
    expect(og.headers["content-type"]).toContain("text/html");
    expect(og.body).toContain('property="og:title" content="Lời giải: Hai máy A, B');
    expect(og.body).toContain(`/loi-giai/${pub.slug}`);
    expect(og.body).toContain("đã kiểm đáp số");
    expect(og.body).toContain('"@type":"QAPage"');

    const off = (await call(t, "POST", `/api/solutions/${id}/publish`, gv, { public: false })).json();
    expect(off.slug).toBe(pub.slug);
    expect((await call(t, "GET", `/api/public/solutions/${pub.slug}`, {})).statusCode).toBe(404);
    // tổ chức khác không thấy lời giải
    const other = await teacher(t, "gv-2", "Thầy Hùng");
    expect((await call(t, "GET", `/api/solutions/${id}`, other)).statusCode).toBe(404);
  });
});

describe("HS cổng /hs", { timeout: 90_000 }, () => {
  async function room(showSolution: string) {
    const { gv } = await setup();
    const classId = await classWithStudents(t, gv);
    const examId = await examFor(t, gv);
    const qs = (await call(t, "GET", `/api/questions?subject=${encodeURIComponent("Toán")}&grade=10`, gv)).json() as { id: string; type: string }[];
    const mcq = qs.find((q) => q.type === "mcq")!;
    parseSse((await solve(gv, { questionId: mcq.id })).body);
    const a = await publishFromExam(t, gv, classId, examId, { showSolution });
    const { classCode, cards } = await issueAll(t, gv, classId);
    const hs = await loginStudent(t, classCode, cards[0]!);
    const sid = (await call(t, "POST", `/api/student/assignments/${a.id}/start`, hs, {})).json().submission.id as string;
    await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs, { seq: 1, answers: {} });
    return { hs, sid };
  }

  it("show_solution cho phép → lời giải theo số câu; không cho phép → rỗng; người khác/không phiên → lỗi", async () => {
    const { hs, sid } = await room("after_submit");
    const r = (await call(t, "GET", `/api/student/submissions/${sid}/solutions`, hs)).json().solutions as Record<string, { answer: string }>;
    expect(Object.values(r)).toHaveLength(1);
    expect(Object.values(r)[0]!.answer).toBe("3/8");
    expect((await call(t, "GET", `/api/student/submissions/${sid}/solutions`, {})).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/submissions/00000000-0000-4000-8000-000000000000/solutions", hs)).statusCode).toBe(404);
  });

  it("show_solution = never → không lộ lời giải", async () => {
    const { hs, sid } = await room("never");
    expect((await call(t, "GET", `/api/student/submissions/${sid}/solutions`, hs)).json()).toEqual({ solutions: {} });
  });

  it("“Chưa hiểu bước này”: gia sư P6 chế độ gợi ý, chữ stream, nối tiếp cùng phiên", async () => {
    const { hs } = await room("after_submit");
    const r = await call(t, "POST", "/api/student/tutor/step", hs, { message: "Em chưa hiểu bước 2", hintLevel: 1 });
    expect(r.statusCode).toBe(200);
    const ev = parseSse(r.body);
    const sessionId = (ev[0] as { sessionId: string }).sessionId;
    expect(ev.filter((e) => e.type === "delta").map((e) => e.text).join("")).toContain("xác suất toàn phần");
    const again = parseSse((await call(t, "POST", "/api/student/tutor/step", hs, { sessionId, message: "Gợi ý thêm", hintLevel: 2 })).body);
    expect((again[0] as { sessionId: string }).sessionId).toBe(sessionId);
    expect((await call(t, "POST", "/api/student/tutor/step", {}, { message: "x" })).statusCode).toBe(401);
  });
});
