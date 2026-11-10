import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuestionInput } from "../../src/domain/question";
import { type T, makeKb, tutorApp } from "../helpers/tutor";

let t: T;
beforeEach(async () => {
  t = await tutorApp();
});
afterEach(async () => {
  await t.app.close();
});

const mcq = (stem: string, answer = 1) => ({ type: "mcq", subject: "Toán", grade: 8, topic: "Hằng đẳng thức", level: "NB", stem, options: ["$a^2+b^2$", "$a^2+2ab+b^2$", "$a^2-b^2$", "$2ab$"], answer, explanation: "HĐT 1" });

describe("luyện tập + ôn giãn cách", () => {
  const next = async () => (await t.call("GET", `/api/tutor/practice/next?subject=${encodeURIComponent("Toán")}&grade=8`, undefined, t.hs)).json();

  it("câu mới (không lộ đáp án) → chấm → lịch ôn SM-2 → đến hạn thì ôn lại → tự đánh giá", async () => {
    const q = (await t.call("POST", "/api/questions", mcq("Khai triển $(a+b)^2$"))).json();
    const n1 = await next();
    expect(n1).toMatchObject({ mode: "new", counts: { new: 1, due: 0 } });
    expect(n1.question).toMatchObject({ id: q.id, type: "mcq" });
    expect(JSON.stringify(n1.question)).not.toContain("explanation");
    expect(n1.question.answer).toBeUndefined();

    const wrong = (await t.call("POST", "/api/tutor/practice/answer", { questionId: q.id, response: 0 }, t.hs)).json();
    expect(wrong).toMatchObject({ correct: false, rating: "again", answer: 1, explanation: "HĐT 1" });
    expect(new Date(wrong.nextDueAt).getTime() - Date.now()).toBeLessThan(15 * 60_000);

    // Hết mới, câu sai chưa đến hạn → xong; ép đến hạn để ôn lại.
    expect((await next()).mode).toBe("done");
    await t.db.execute(`update tutor_review_state set due_at = now() - interval '1 minute'` as never);
    const n2 = await next();
    expect(n2).toMatchObject({ mode: "review", question: { id: q.id } });

    const right = (await t.call("POST", "/api/tutor/practice/answer", { questionId: q.id, response: 1 }, t.hs)).json();
    expect(right).toMatchObject({ correct: true, rating: "good", score: 0.25, max: 0.25 });
    expect(right.intervalDays).toBeGreaterThanOrEqual(1);

    const easy = (await t.call("POST", "/api/tutor/practice/rate", { questionId: q.id, rating: "easy" }, t.hs)).json();
    expect(easy.intervalDays).toBeGreaterThan(right.intervalDays);

    const st = (await t.call("GET", "/api/tutor/practice/stats?days=7", undefined, t.hs)).json();
    expect(st).toMatchObject({ learned: 1, due: 0, mistakes: 0, answered: 2, accuracy: 50 });
    expect(st.daily).toHaveLength(7);
    expect(st.topics[0]).toMatchObject({ topic: "Hằng đẳng thức", learned: 1 });
  });

  it("đúng/sai chấm từng ý; trả lời ngắn sai chữ nhưng đúng nghĩa được AI chấp nhận; tự luận chấm rubric", async () => {
    const tf = (await t.call("POST", "/api/questions", { type: "true_false", subject: "Toán", grade: 8, topic: "T", level: "TH", stem: "Xét", statements: ["a", "b", "c", "d"], answer: [true, false, true, false] })).json();
    const r1 = (await t.call("POST", "/api/tutor/practice/answer", { questionId: tf.id, response: [true, false, false, false] }, t.hs)).json();
    expect(r1).toMatchObject({ correct: false, partial: true, rating: "hard", score: 0.5 });

    const sa = (await t.call("POST", "/api/questions", { type: "short_answer", subject: "Toán", grade: 8, topic: "T", level: "TH", stem: "Tính $3^2$", answer: "9" })).json();
    expect((await t.call("POST", "/api/tutor/practice/answer", { questionId: sa.id, response: "9" }, t.hs)).json()).toMatchObject({ correct: true, graded: "auto" });
    // Fake AI chỉ chấp nhận khi chuỗi giống hệt → "chín" vẫn sai, nhưng đi qua nhánh AI.
    expect((await t.call("POST", "/api/tutor/practice/answer", { questionId: sa.id, response: "chín" }, t.hs)).json()).toMatchObject({ correct: false, graded: "ai", feedback: "Chưa đúng" });

    const es = (await t.call("POST", "/api/questions", { type: "essay", subject: "Toán", grade: 8, topic: "T", level: "VD", stem: "Chứng minh", rubric: "Ý 1; Ý 2", points: 2 })).json();
    const r3 = (await t.call("POST", "/api/tutor/practice/answer", { questionId: es.id, response: "Bài làm của em" }, t.hs)).json();
    expect(r3).toMatchObject({ graded: "ai", score: 1.5, max: 2, feedback: "Thiếu ý cuối", correct: false });
    expect((await t.call("POST", "/api/tutor/practice/answer", { questionId: es.id, response: "" }, t.hs)).statusCode).toBe(400);
    expect((await t.call("POST", "/api/tutor/practice/answer", { questionId: "00000000-0000-4000-8000-000000000000", response: 1 }, t.hs)).statusCode).toBe(404);
  });

  it("trạng thái ôn riêng từng người học; hỏi tiếp về một câu", async () => {
    const q = (await t.call("POST", "/api/questions", mcq("Khai triển $(a+b)^2$"))).json();
    await t.call("POST", "/api/tutor/practice/answer", { questionId: q.id, response: 0 }, t.hs);
    const gv = (await t.call("GET", `/api/tutor/practice/stats`, undefined, t.gv)).json();
    expect(gv.learned).toBe(0);
    const f = (await t.call("POST", "/api/tutor/questions/followup", { questionId: q.id, message: "Vì sao em sai?", userAnswer: 0 }, t.hs)).json();
    expect(f.reply).toContain("2ab");
  });
});

describe("sinh câu hỏi", () => {
  it("đúng schema ngân hàng; GV duyệt → vào ngân hàng; từ chối; HS luyện ngay (không lộ đáp án)", async () => {
    const { kb } = await makeKb(t);
    const gen = await t.call("POST", "/api/tutor/questions/generate", { kbId: kb.id, subject: "Toán", grade: 8, topic: "Hằng đẳng thức", count: 3 });
    expect(gen.statusCode).toBe(201);
    const { questions, created, status } = gen.json();
    expect(created).toBe(3);
    expect(status).toBe("pending");
    for (const d of questions) expect(QuestionInput.safeParse(d.body).success).toBe(true);
    expect(questions.map((d: { body: { type: string } }) => d.body.type).sort()).toEqual(["mcq", "short_answer", "true_false"]);
    expect(questions.find((d: { body: { type: string } }) => d.body.type === "mcq").body.options[1]).toBe("$a^2+2ab+b^2$"); // đã bỏ nhãn "B."
    // Truy hồi tư liệu vào prompt sinh câu hỏi.
    expect(JSON.stringify(t.fake.calls.filter((c) => c.task === "sinh_cau_hoi").at(-1)!.messages)).toContain("trang");

    expect((await t.call("GET", "/api/tutor/drafts")).json()).toHaveLength(3);
    expect((await t.call("GET", "/api/tutor/drafts", undefined, t.hs)).statusCode).toBe(403);
    const ok = await t.call("POST", `/api/tutor/drafts/${questions[0].id}/approve`);
    expect(ok.statusCode).toBe(200);
    const bank = (await t.call("GET", `/api/questions?subject=${encodeURIComponent("Toán")}&grade=8`)).json();
    expect(bank).toHaveLength(1);
    expect((await t.call("POST", `/api/tutor/drafts/${questions[1].id}/reject`)).statusCode).toBe(204);
    expect((await t.call("GET", "/api/tutor/drafts")).json()).toHaveLength(1);

    expect((await t.call("POST", "/api/tutor/questions/generate", { subject: "Toán", grade: 8, topic: "x" }, t.hs)).statusCode).toBe(403);
    const mine = (await t.call("POST", "/api/tutor/questions/generate", { kbId: kb.id, subject: "Toán", grade: 8, topic: "Hằng đẳng thức", count: 2, mode: "practice" }, t.hs)).json();
    expect(mine.status).toBe("practice");
    expect(JSON.stringify(mine.questions)).not.toContain("explanation");
    const a = (await t.call("POST", "/api/tutor/practice/answer", { questionId: mine.questions[0].id, response: 1 }, t.hs)).json();
    expect(a).toMatchObject({ correct: true });
    // Câu luyện riêng của HS không dùng được bởi người khác.
    expect((await t.call("POST", "/api/tutor/practice/answer", { questionId: mine.questions[0].id, response: 1 }, t.gv)).statusCode).toBe(404);
  });

  it("AI trả sai schema → thử lại một lần rồi bỏ câu đó", async () => {
    const bad = await tutorApp();
    const orig = bad.fake.ai.chat;
    let n = 0;
    bad.fake.ai.chat = async (task, msgs, o) => {
      if (task === "sinh_cau_hoi" && JSON.stringify(msgs[0]).includes("biên soạn câu hỏi")) {
        n++;
        return JSON.stringify({ type: "mcq", stem: "thiếu phương án" });
      }
      return orig(task, msgs, o);
    };
    const r = await bad.call("POST", "/api/tutor/questions/generate", { subject: "Toán", grade: 8, topic: "x", count: 2 });
    expect(r.statusCode).toBe(400);
    expect(n).toBe(4); // 2 câu x 2 lần
    await bad.app.close();
  });
});

describe("lộ trình thành thạo", () => {
  const step = async (id: string, body: object) => t.call("POST", `/api/tutor/paths/${id}/step`, body, t.hs);

  it("dựng lộ trình → chẩn đoán → giải thích → luyện → chấm + chẩn lỗi → thành thạo → ôn", async () => {
    const { kb } = await makeKb(t);
    const created = await t.call("POST", "/api/tutor/paths", { name: "Hằng đẳng thức", goal: "Giỏi hằng đẳng thức để thi học kì", subject: "Toán", grade: 8, kbId: kb.id }, t.hs);
    expect(created.statusCode).toBe(201);
    const path = created.json();
    expect(path.modules).toHaveLength(2);
    expect(path.progress).toMatchObject({ total: 3, mastered: 0 });
    expect(path.next.name).toBe("Bình phương một tổng");
    // Tư liệu kho được đưa vào prompt dựng lộ trình.
    expect(JSON.stringify(t.fake.calls.find((c) => c.task === "gia_su_luyen")!.messages)).toContain("toan8-bai3.docx");

    const diag = (await step(path.id, { action: "diagnostic" })).json();
    expect(diag.questions).toHaveLength(2);
    expect(JSON.stringify(diag)).not.toContain("a^2+2ab+b^2"); // không lộ đáp án
    const g1 = (await step(path.id, { action: "grade", answers: ["a^2+2ab+b^2", "sai"] })).json();
    expect(g1.results.map((r: { correct: boolean }) => r.correct)).toEqual([true, false]);
    expect(g1.diagnoses[0]).toMatchObject({ errorType: "deviation" });
    expect(g1.path.diagnosed).toBe(true);
    expect(g1.path.errors).toHaveLength(1);

    const ex = (await step(path.id, { action: "explain", pointId: "p1" })).json();
    expect(ex.markdown).toContain("Bình phương");
    expect(ex.citations[0].page).toBe(1);

    const pt = (id: string, r: { modules: { points: { id: string; mastery: number; status: string; nextReviewAt: number | null }[] }[] }) => r.modules.flatMap((m) => m.points).find((p) => p.id === id)!;
    for (let i = 0; i < 2; i++) {
      await step(path.id, { action: "quiz", pointId: "p1", count: 2 });
      await step(path.id, { action: "grade", answers: ["x^2+4x+4", "4x^2+4x+1"] });
    }
    const after = (await t.call("GET", `/api/tutor/paths/${path.id}`, undefined, t.hs)).json();
    expect(pt("p1", after)).toMatchObject({ status: "mastered" });
    expect(pt("p1", after).nextReviewAt).toBeGreaterThan(Date.now());
    expect(after.progress.mastered).toBe(1);

    const fey = (await step(path.id, { action: "feynman", pointId: "p3", explanation: "Hiệu hai bình phương bằng tích tổng và hiệu." })).json();
    expect(fey).toMatchObject({ passed: true });
    expect((await step(path.id, { action: "grade", answers: ["x"] })).statusCode).toBe(400); // không có bài chờ chấm
    expect((await step(path.id, { action: "review" })).json().due).toEqual([]);
    expect((await t.call("GET", `/api/tutor/paths/${path.id}`)).statusCode).toBe(404); // GV không thấy lộ trình của HS
    expect((await t.call("GET", "/api/tutor/paths", undefined, t.hs)).json()).toHaveLength(1);
    expect((await t.call("DELETE", `/api/tutor/paths/${path.id}`, undefined, t.hs)).statusCode).toBe(204);
  });
});

describe("giáo trình sống", () => {
  it("ý tưởng → dàn chương → biên soạn trang (khối, trích dẫn); HS đọc, không biên soạn", async () => {
    const { kb } = await makeKb(t);
    const created = await t.call("POST", "/api/tutor/books", { kbId: kb.id, intent: "Giáo trình hằng đẳng thức cho lớp 8" });
    expect(created.statusCode).toBe(201);
    const book = created.json();
    expect(book.title).toBe("Hằng đẳng thức đáng nhớ");
    expect(book.pages.map((p: { title: string; status: string }) => [p.title, p.status])).toEqual([["Bình phương một tổng", "planned"], ["Hiệu hai bình phương", "planned"]]);

    const page = await t.call("POST", `/api/tutor/books/${book.id}/pages/0/compile`);
    expect(page.statusCode).toBe(200);
    const types = page.json().blocks.map((b: { type: string }) => b.type);
    expect(types).toEqual(["section", "callout", "figure", "flash_cards"]); // khối lạ "hologram" bị bỏ
    const section = page.json().blocks[0];
    expect(section.markdown).toContain("###");
    expect(section.citations[0]).toMatchObject({ n: 1, doc: "toan8-bai3.docx" });
    expect([1, 2, 3]).toContain(section.citations[0].page);
    expect(page.json().blocks[2].data.mermaid).toContain("flowchart");

    expect((await t.call("POST", `/api/tutor/books/${book.id}/pages/1/compile`, undefined, t.hs)).statusCode).toBe(403);
    const read = await t.call("GET", `/api/tutor/books/${book.id}/pages/0`, undefined, t.hs);
    expect(read.json()).toMatchObject({ status: "ready", bookTitle: "Hằng đẳng thức đáng nhớ" });
    expect((await t.call("GET", `/api/tutor/books/${book.id}`, undefined, t.hs)).json().pages[0].status).toBe("ready");
    expect((await t.call("GET", `/api/tutor/books/${book.id}/pages/9`, undefined, t.hs)).statusCode).toBe(404);
    expect((await t.call("DELETE", `/api/tutor/books/${book.id}`)).statusCode).toBe(204);
  });

  it("kho rỗng không dựng được giáo trình", async () => {
    const kb = (await t.call("POST", "/api/tutor/kbs", { name: "Rỗng", subject: "Toán", grade: 8 })).json();
    expect((await t.call("POST", "/api/tutor/books", { kbId: kb.id, intent: "Giáo trình gì đó" })).statusCode).toBe(400);
  });
});
