import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { disabledAi } from "../../src/services/ai";
import { testApp } from "../helpers/app";
import { type T, TOAN8_PAGES, makeDocx, makeKb, parseSse, tutorApp } from "../helpers/tutor";
import { lessonPlan } from "../helpers/lesson";

let t: T;
beforeEach(async () => {
  t = await tutorApp();
});
afterEach(async () => {
  await t.app.close();
});

describe("kho tri thức", () => {
  it("GV tải DOCX → tách theo trang → tra cứu BM25 đúng trang; HS chỉ đọc", async () => {
    const { kb, doc } = await makeKb(t);
    expect(doc.statusCode).toBe(201);
    expect(doc.json()).toMatchObject({ pages: 3, name: "toan8-bai3.docx" });

    const hit = (await t.call("GET", `/api/tutor/kbs/${kb.id}/search?q=${encodeURIComponent("hiệu hai bình phương")}`, undefined, t.hs)).json().hits[0];
    expect(hit).toMatchObject({ doc: "toan8-bai3.docx", page: 2 });
    const p3 = (await t.call("GET", `/api/tutor/kbs/${kb.id}/search?q=${encodeURIComponent("lập phương của một tổng")}`, undefined, t.hs)).json().hits[0];
    expect(p3.page).toBe(3);

    expect((await t.call("POST", "/api/tutor/kbs", { name: "x", subject: "Toán", grade: 8 }, t.hs)).statusCode).toBe(403);
    expect((await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "a.txt", text: "x".repeat(40) }, t.hs)).statusCode).toBe(403);
    const list = (await t.call("GET", "/api/tutor/kbs", undefined, t.hs)).json();
    expect(list[0]).toMatchObject({ name: "Toán 8 - Hằng đẳng thức", docCount: 1 });
  });

  it("nhận TXT, giáo án EDUVN; từ chối định dạng lạ và file rỗng", async () => {
    const { kb } = await makeKb(t);
    const txt = await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "ghi-chu", text: "Phương trình bậc hai ax^2+bx+c=0 có biệt thức delta = b^2 - 4ac." });
    expect(txt.statusCode).toBe(201);
    const lesson = (await t.call("POST", "/api/lessons", lessonPlan())).json();
    const lp = await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { lessonPlanId: lesson.id });
    expect(lp.statusCode).toBe(201);
    expect(lp.json().name).toContain("Giáo án");
    expect((await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "a.exe", contentBase64: Buffer.from("MZ").toString("base64") })).statusCode).toBe(400);
    expect((await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "a.docx", contentBase64: await makeDocx(["  "]) })).statusCode).toBe(400);
    const docs = (await t.call("GET", `/api/tutor/kbs/${kb.id}`)).json().docs;
    expect(docs).toHaveLength(3);
    expect((await t.call("DELETE", `/api/tutor/kbs/${kb.id}/docs/${docs[0].id}`)).statusCode).toBe(204);
    expect((await t.call("GET", `/api/tutor/kbs/${kb.id}`)).json().docs).toHaveLength(2);
  });
});

describe("gia sư chat (SSE)", () => {
  const chat = (payload: object, headers = t.hs) => t.app.inject({ method: "POST", url: "/api/tutor/chat", headers, payload });

  it("stream: meta (trích dẫn) → delta → done (chỉ các [n] đã dùng) → title; lưu phiên", async () => {
    const { kb } = await makeKb(t);
    const res = await chat({ kbId: kb.id, message: "Bình phương của một tổng là gì?" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    const ev = parseSse(res.body);
    expect(ev[0]).toMatchObject({ type: "meta" });
    const meta = ev[0] as unknown as { sessionId: string; citations: { n: number; doc: string; page: number }[] };
    expect(meta.citations[0]).toMatchObject({ n: 1, doc: "toan8-bai3.docx", page: 1 });
    expect(ev.filter((e) => e.type === "delta").map((e) => e.text).join("")).toBe(t.fake.answer);
    const done = ev.find((e) => e.type === "done") as unknown as { citations: { n: number }[] };
    expect(done.citations.map((c) => c.n)).toEqual([1]);
    expect(ev.find((e) => e.type === "title")).toMatchObject({ title: "Bình phương một tổng" });
    expect(ev[ev.length - 1]).toEqual({ type: "end" });

    // Câu hỏi đầu: không viết lại truy vấn; tài liệu đã đưa vào prompt.
    const chatCall = t.fake.calls.find((c) => c.task === "gia_su_chat")!;
    expect(JSON.stringify(chatCall.messages)).toContain("toan8-bai3.docx, trang 1");
    expect(t.fake.calls.some((c) => c.task === "gia_su_phu" && JSON.stringify(c.messages).includes("truy vấn tìm kiếm"))).toBe(false);

    const s = (await t.call("GET", `/api/tutor/sessions/${meta.sessionId}`, undefined, t.hs)).json();
    expect(s.title).toBe("Bình phương một tổng");
    expect(s.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
    expect(s.messages[1].citations[0].page).toBe(1);
    // GV (người khác) không đọc được phiên của HS.
    expect((await t.call("GET", `/api/tutor/sessions/${meta.sessionId}`)).statusCode).toBe(404);
    expect((await t.call("GET", "/api/tutor/sessions", undefined, t.hs)).json()).toHaveLength(1);
  });

  it("câu nối tiếp mặc định ghép từ khoá câu trước (không gọi AI thêm); bật ngân sách thì AI viết lại", async () => {
    const { kb } = await makeKb(t);
    const first = parseSse((await chat({ kbId: kb.id, message: "Bình phương của một tổng là gì?" })).body);
    const sessionId = (first[0] as { sessionId: string }).sessionId;
    t.fake.calls.length = 0;
    const plain = parseSse((await chat({ sessionId, message: "Còn nếu là hiệu thì sao?" })).body);
    expect((plain[0] as { query: string }).query).toBe("Bình phương của một tổng là gì? Còn nếu là hiệu thì sao?");
    expect(t.fake.calls.some((c) => c.task === "gia_su_phu")).toBe(false);
    process.env.TUTOR_REWRITE_BUDGET_MS = "2000";
    t.fake.calls.length = 0;
    const res = parseSse((await chat({ sessionId, message: "Còn nếu là hiệu thì sao?" })).body);
    delete process.env.TUTOR_REWRITE_BUDGET_MS;
    expect((res[0] as { query: string }).query).toBe("hằng đẳng thức bình phương của một tổng");
    const call = t.fake.calls.find((c) => c.task === "gia_su_chat")!;
    const roles = call.messages.map((m) => m.role);
    expect(roles.slice(-3)).toEqual(["user", "assistant", "user"]);
    expect(roles.filter((r) => r === "user").length).toBeGreaterThanOrEqual(3);
  });

  it("chế độ gợi ý Socratic dùng prompt riêng và mức gợi ý", async () => {
    await chat({ message: "Giải giúp em bài này", mode: "hint", hintLevel: 2 });
    const sys = JSON.stringify(t.fake.calls.find((c) => c.task === "gia_su_chat")!.messages[0]);
    expect(sys).toContain("Socratic");
    expect(sys).toContain("Mức gợi ý hiện tại: 2/3");
  });

  it("ảnh bài tập gửi dạng image_url, không lưu ảnh", async () => {
    const png = `data:image/png;base64,${Buffer.from("x").toString("base64")}`;
    const ev = parseSse((await chat({ message: "Bài này làm sao?", images: [png] })).body);
    const last = t.fake.calls.find((c) => c.task === "gia_su_chat")!.messages.at(-1)!;
    expect(Array.isArray(last.content) && last.content.some((p) => p.type === "image_url")).toBe(true);
    const s = (await t.call("GET", `/api/tutor/sessions/${(ev[0] as { sessionId: string }).sessionId}`, undefined, t.hs)).json();
    expect(JSON.stringify(s)).not.toContain("base64");
    expect(s.messages[0].content).toContain("đính kèm 1 ảnh");
    expect((await chat({ message: "x", images: ["http://evil/x.png"] })).statusCode).toBe(400);
  });

  it("hội thoại dài được tóm tắt nền", async () => {
    const long = "Em muốn hiểu kĩ về hằng đẳng thức. ".repeat(40);
    let sessionId: string | undefined;
    for (let i = 0; i < 6; i++) {
      const ev = parseSse((await chat({ sessionId, message: `${i}. ${long}` })).body);
      sessionId = (ev[0] as { sessionId: string }).sessionId;
    }
    let summary = "";
    for (let i = 0; i < 40 && !summary; i++) {
      summary = (await t.call("GET", `/api/tutor/sessions/${sessionId}`, undefined, t.hs)).json().summary;
      if (!summary) await new Promise((r) => setTimeout(r, 50));
    }
    expect(summary).toContain("hằng đẳng thức");
  });

  it("gợi ý câu hỏi tiếp theo và câu gợi mở", async () => {
    const { kb } = await makeKb(t);
    const ev = parseSse((await chat({ kbId: kb.id, message: "Bình phương của một tổng là gì?" })).body);
    const hint = (await t.call("POST", `/api/tutor/sessions/${(ev[0] as { sessionId: string }).sessionId}/ask-hint`, undefined, t.hs)).json();
    expect(hint.hint).toMatch(/\?$/);
    const st = (await t.call("GET", `/api/tutor/starters?kbId=${kb.id}`, undefined, t.hs)).json();
    expect(st.starters).toHaveLength(4);
  });

  it("lỗi hợp lệ trả mã HTTP trước khi stream; cổng AI tắt → sự kiện error", async () => {
    expect((await chat({ message: "" })).statusCode).toBe(400);
    expect((await chat({ sessionId: "00000000-0000-4000-8000-000000000000", message: "hi" })).statusCode).toBe(404);
    const off = await testApp({ ai: disabledAi });
    const h = { authorization: `Bearer ${await off.sign({ sub: "u" })}` };
    const ev = parseSse((await off.app.inject({ method: "POST", url: "/api/tutor/chat", headers: h, payload: { message: "Xin chào" } })).body);
    expect(ev.at(-1)).toMatchObject({ type: "error" });
    await off.app.close();
  });

  it("ngữ cảnh trang giáo trình được đưa vào prompt", async () => {
    const { kb } = await makeKb(t);
    const book = (await t.call("POST", "/api/tutor/books", { kbId: kb.id, intent: "Giáo trình hằng đẳng thức" })).json();
    const page = (await t.call("POST", `/api/tutor/books/${book.id}/pages/0/compile`)).json();
    await chat({ message: "Đoạn này em chưa hiểu", context: { bookPageId: page.id } });
    expect(JSON.stringify(t.fake.calls.find((c) => c.task === "gia_su_chat")!.messages)).toContain("Em đang đọc trang giáo trình");
  });
});

void TOAN8_PAGES;
