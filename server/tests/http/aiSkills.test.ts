import { afterEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { fakeSkillsAi } from "../helpers/skillsAi";

let t: Awaited<ReturnType<typeof testApp>>;
afterEach(async () => {
  await t.app.close();
});
async function setup(over: Parameters<typeof fakeSkillsAi>[0] = {}) {
  const f = fakeSkillsAi(over);
  t = await testApp({ ai: f.ai });
  const auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
  const call = (url: string, payload?: unknown, method: "GET" | "POST" = "POST") => t.app.inject({ method, url, headers: auth, payload: payload as object });
  return { ...f, call, auth };
}

describe("nút AI dùng skill", () => {
  it("liệt kê 6 skill từ thư mục skills/", async () => {
    const { call } = await setup();
    const r = (await call("/api/ai-skills", undefined, "GET")).json() as { name: string; description: string }[];
    expect(r.map((x) => x.name)).toHaveLength(6);
    expect(r.every((x) => x.description.length > 20)).toBe(true);
  });

  it("giáo án: sinh từng mục (khung + 4 hoạt động) → lưu thành giáo án hợp lệ", async () => {
    const { call, calls } = await setup();
    const r = await call("/api/ai-skills/giao-an", { subject: "Toán", grade: 10, title: "Mệnh đề", periods: 2 });
    expect(r.statusCode).toBe(201);
    const id = r.json().id as string;
    expect(calls).toHaveLength(5);
    expect(calls[0]?.task).toBe("soan_giao_an");
    expect(calls[0]?.system).toContain("Giáo án theo CV 5512");
    expect(calls[0]?.system).toContain("Tài liệu tham chiếu");
    const got = (await call(`/api/lessons/${id}`, undefined, "GET")).json();
    expect(got.plan.activities).toHaveLength(4);
    expect(got.plan.activities[1].subs).toHaveLength(2);
    expect(got.plan.activities[0].name).toBe("x");
    expect(got.plan.activities[1].name).toBe("Khái niệm");
  });

  it("giáo án: AI trả thiếu mục thì gửi lại lỗi một lần, vẫn thiếu thì 400", async () => {
    const { call, calls } = await setup({ "giao-an": (u) => (u.includes("hoat_dong 3") ? JSON.stringify({ goal: "x" }) : u.includes("khung") ? JSON.stringify({ objectives: { knowledge: ["a"], competencies: { general: ["b"], specific: ["c"] }, qualities: ["d"] }, materials: ["m"], outline: [1, 2, 3, 4].map((n) => ({ name: `h${n}`, gist: "g" })) }) : JSON.stringify({ name: "n", goal: "g", content: "c", product: "p", steps: { assign: "a", perform: "b", report: "c", conclude: "d" } })) });
    const r = await call("/api/ai-skills/giao-an", { subject: "Toán", grade: 10, title: "Bài", periods: 1 });
    expect(r.statusCode).toBe(400);
    expect(calls.filter((c) => c.user.includes("hoat_dong 3"))).toHaveLength(2);
    expect((await call("/api/lessons", undefined, "GET")).json()).toEqual([]);
  });

  it("ma trận: VDC → VD, kèm báo cáo; tổng điểm lệch 10 thì gửi lại một lần rồi trả kèm cảnh báo", async () => {
    const { call, calls } = await setup();
    const r = (await call("/api/ai-skills/ma-tran", { description: "Đề giữa kì Toán 10, 45 phút" })).json();
    expect(r.matrix.cells[1].level).toBe("VD");
    expect(r.report.totalPoints).toBe(7);
    expect(r.report.warnings[0]).toContain("chưa đạt 10");
    expect(r.durationMinutes).toBe(45);
    expect(calls).toHaveLength(2);
  });

  it("câu hỏi: giữ câu hợp lệ, loại câu trùng phương án / thiếu phương án", async () => {
    const { call } = await setup();
    const r = (await call("/api/ai-skills/cau-hoi", { subject: "Toán", grade: 10, topic: "Mệnh đề", level: "TH", type: "mix", count: 4 })).json();
    expect(r.questions).toHaveLength(2);
    expect(r.questions[0]).toMatchObject({ type: "mcq", level: "TH", topic: "Mệnh đề", grade: 10 });
    expect(r.questions[1]).toMatchObject({ type: "short_answer", answer: "2" });
    expect(r.rejected.map((x: { index: number }) => x.index)).toEqual([2, 3]);
  });

  it("nhận xét: không gửi tên học sinh cho AI, trả theo id, kiểm 20–400 ký tự và lộ tên", async () => {
    const f = await setup();
    const cls = (await f.call("/api/classes", { name: "10A1", schoolYear: "2026-2027", subject: "Toán" })).json();
    await f.call(`/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An;05/03/2010;Nam\nTrần Thị Bình" });
    await t.app.inject({ method: "PUT", url: `/api/classes/${cls.id}/scores`, headers: f.auth, payload: { column: "GK", scores: { "Nguyễn Văn An": "9", "Trần Thị Bình": "4" } } });
    const r = (await f.call("/api/ai-skills/nhan-xet", { classId: cls.id, term: "HK1" })).json();
    expect(r.items).toHaveLength(2);
    expect(r.items.every((i: { issues: string[]; level: string }) => i.issues.length === 0 && i.level === "Khá")).toBe(true);
    const sent = f.calls.map((c) => c.user).join("\n");
    expect(sent).not.toContain("Nguyễn Văn An");
    expect(sent).toContain("\"GK\":9");
  });

  it("nhận xét: bản lộ tên bị gắn issues sau khi thử lại", async () => {
    const f = await setup({ "nhan-xet": (u) => JSON.stringify({ items: (JSON.parse(u) as { students: { id: string }[] }).students.map((s) => ({ id: s.id, level: "Khá", text: "Em Nguyễn Văn An học tốt, cần rèn thêm trình bày, tuần tới làm thêm bài." })) }) });
    const cls = (await f.call("/api/classes", { name: "10A2", schoolYear: "2026-2027" })).json();
    await f.call(`/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An" });
    const r = (await f.call("/api/ai-skills/nhan-xet", { classId: cls.id, term: "HK1" })).json();
    expect(r.items[0].issues).toContain("nhận xét lộ tên học sinh");
    expect(f.calls).toHaveLength(2);
  });

  it("đề cương: hai pha, trọng số 100, xuất .docx", async () => {
    const { call, calls } = await setup();
    const s = (await call("/api/ai-skills/de-cuong", { name: "Cấu trúc dữ liệu", credits: 3 })).json();
    expect(calls.map((c) => c.user.split("\n")[0])).toEqual(["PHA: khung", "PHA: ke_hoach"]);
    expect(s.assessment.reduce((a: number, x: { weight: number }) => a + x.weight, 0)).toBe(100);
    expect(s.schedule).toHaveLength(4);
    const dl = await call("/api/ai-skills/de-cuong/docx", s);
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-disposition"]).toContain("de-cuong-hoc-phan.docx");
    expect(dl.rawPayload.subarray(0, 2).toString()).toBe("PK");
  });

  it("đề cương: khung sai cấu trúc → gửi lại một lần rồi 400", async () => {
    const { call, calls } = await setup({ "de-cuong": () => JSON.stringify({ name: "x" }) });
    const r = await call("/api/ai-skills/de-cuong", { name: "X", credits: 2 });
    expect(r.statusCode).toBe(400);
    expect(calls).toHaveLength(2);
  });

  it("rubric: tổng điểm khớp điểm câu; lệch thì gửi lại", async () => {
    const { call } = await setup();
    const ok = await call("/api/ai-skills/rubric", { stem: "Tính ...", points: 3 });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().criteria).toHaveLength(2);
    const bad = await call("/api/ai-skills/rubric", { stem: "Tính ...", points: 5 });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().issues[0]).toContain("phải bằng 5");
  });

  it("chưa bật cổng AI → 503", async () => {
    t = await testApp();
    const auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
    const r = await t.app.inject({ method: "POST", url: "/api/ai-skills/rubric", headers: auth, payload: { stem: "x", points: 1 } });
    expect(r.statusCode).toBe(503);
  });
});
