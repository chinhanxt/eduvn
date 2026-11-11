import type { LightMyRequestResponse } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { agentTurns } from "../../src/db/schema";
import { addMember, ensureUser } from "../../src/db/repo";
import { eq } from "drizzle-orm";
import { testApp } from "../helpers/app";
import { type Reply, lastUserText, scriptAi } from "../helpers/agentAi";
import { makeDocx, TOAN8_PAGES } from "../helpers/tutor";

type Ev = Record<string, unknown> & { type: string; seq?: number };
function sse(body: string): Ev[] {
  return body
    .split("\n\n")
    .filter((b) => b.includes("data: "))
    .map((b) => {
      const id = /^id: (\d+)$/m.exec(b)?.[1];
      const data = JSON.parse(/^data: (.*)$/m.exec(b)![1]!) as Ev;
      return id ? { ...data, seq: Number(id) } : data;
    });
}

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
});

async function setup(replies: Reply[]) {
  const fake = scriptAi(replies, { chunk: 7 });
  const t = await testApp({ ai: fake.ai });
  close = () => t.app.close();
  const gv = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
  const orgId = (await t.app.inject({ method: "GET", url: "/api/me", headers: gv })).json().org.id as string;
  const mk = async (sub: string) => {
    const u = await ensureUser(t.db, { sub, name: sub });
    await addMember(t.db, orgId, u.id, "student");
    return { authorization: `Bearer ${await t.sign({ sub, name: sub })}`, "x-org-id": orgId };
  };
  const hs = await mk("hs-1");
  const hs2 = await mk("hs-2");
  const call = (method: "GET" | "POST", url: string, payload?: unknown, headers: Record<string, string> = hs): Promise<LightMyRequestResponse> => t.app.inject({ method, url, headers, payload: payload as object });
  const events = async (turnId: string, last?: number, headers = hs) => {
    const r = await t.app.inject({ method: "GET", url: `/api/tro-ly/luot/${turnId}/su-kien`, headers: { ...headers, ...(last !== undefined && { "last-event-id": String(last) }) } });
    return { res: r, ev: sse(r.body) };
  };
  return { ...t, fake, gv, hs, hs2, orgId, call, events };
}

describe("/api/tro-ly: lượt + SSE", () => {
  it("bắt đầu lượt → SSE đủ sự kiện có id tăng dần → lượt done, lưu câu trả lời", async () => {
    const t = await setup(["THINK: Câu cơ bản.\nANSWER: Hằng đẳng thức là đẳng thức đúng với mọi giá trị của biến."]);
    const s = await t.call("POST", "/api/tro-ly/luot", { message: "Hằng đẳng thức là gì?" });
    expect(s.statusCode).toBe(201);
    const { turnId, threadId } = s.json();
    const { res, ev } = await t.events(turnId);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(ev.map((e) => e.type)).toEqual(["turn", "status", "step", "thinking", "content", "done", "end"]);
    const seqs = ev.filter((e) => e.seq).map((e) => e.seq);
    expect(seqs).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ev.find((e) => e.type === "done")).toMatchObject({ status: "done", answer: "Hằng đẳng thức là đẳng thức đúng với mọi giá trị của biến.", usage: { steps: 1, parse: { ok: 1 } } });
    expect(ev.at(-1)).toEqual({ type: "end", status: "done" });
    const g = (await t.call("GET", `/api/tro-ly/luot/${turnId}`)).json();
    expect(g).toMatchObject({ status: "done", threadId, answer: expect.stringContaining("Hằng đẳng thức"), ask: null });
    // Nối lại từ Last-Event-ID: chỉ phần sau.
    const again = await t.events(turnId, 4);
    expect(again.ev.map((e) => e.type)).toEqual(["content", "done", "end"]);
    // Phát lại đầy đủ kèm sự kiện
    expect((await t.call("GET", `/api/tro-ly/luot/${turnId}?su_kien=1`)).json().events).toHaveLength(6);
  });

  it("lượt sau cùng mạch mang lịch sử; mạch liệt kê các lượt", async () => {
    const t = await setup(["ANSWER: Một", "ANSWER: Hai"]);
    const a = (await t.call("POST", "/api/tro-ly/luot", { message: "Câu 1" })).json();
    await t.events(a.turnId);
    const b = (await t.call("POST", "/api/tro-ly/luot", { message: "Câu 2", threadId: a.threadId })).json();
    await t.events(b.turnId);
    const msgs = t.fake.calls[1]!.messages;
    expect(msgs.slice(1).map((m) => [m.role, m.content])).toEqual([
      ["user", "Câu 1"],
      ["assistant", "ANSWER: Một"],
      ["user", "Câu 2"],
    ]);
    const th = (await t.call("GET", `/api/tro-ly/mach/${a.threadId}`)).json();
    expect(th.turns.map((x: { message: string; answer: string }) => [x.message, x.answer])).toEqual([["Câu 1", "Một"], ["Câu 2", "Hai"]]);
  });

  it("công cụ mẫu tra kho tri thức BM25 thật → nguồn [n] đúng tài liệu + trang", async () => {
    const t = await setup(['THINK: Tra sách.\nTOOL: {"name": "tra_kho_tri_thuc", "args": {"q": "bình phương của một tổng"}}', (ms) => (lastUserText(ms).includes("toan8-bai3.docx, trang 1") ? "ANSWER: Theo [1]: $(a+b)^2=a^2+2ab+b^2$." : "ANSWER: không thấy")]);
    const kb = (await t.call("POST", "/api/tutor/kbs", { name: "Toán 8", subject: "Toán", grade: 8 }, t.gv)).json();
    expect((await t.call("POST", `/api/tutor/kbs/${kb.id}/docs`, { name: "toan8-bai3.docx", contentBase64: await makeDocx(TOAN8_PAGES) }, t.gv)).statusCode).toBe(201);
    const { turnId } = (await t.call("POST", "/api/tro-ly/luot", { message: "Bình phương của một tổng là gì?", params: { kbIds: [kb.id] } })).json();
    const { ev } = await t.events(turnId);
    expect(ev.find((e) => e.type === "tool_call")).toMatchObject({ tool: "tra_kho_tri_thuc", title: "Tra kho tri thức", args: { q: "bình phương của một tổng" } });
    expect(ev.find((e) => e.type === "tool_result")).toMatchObject({ ok: true, summary: expect.stringContaining("toan8-bai3.docx") });
    const src = ev.find((e) => e.type === "sources") as { items: { n: number; title: string; page: number }[] };
    expect(src.items[0]).toMatchObject({ n: 1, title: "toan8-bai3.docx", page: 1 });
    expect(ev.find((e) => e.type === "done")).toMatchObject({ answer: "Theo [1]: $(a+b)^2=a^2+2ab+b^2$." });
  });

  it("ask_user: SSE dừng ở waiting → trả lời → nối lại SSE thấy đoạn tiếp; gửi lặp bị 409", async () => {
    const t = await setup(['TOOL: {"name":"ask_user","args":{"questions":[{"prompt":"Em học lớp mấy?","options":[{"label":"Lớp 8"},{"label":"Lớp 9"}]}]}}', (ms) => `ANSWER: Em chọn: ${lastUserText(ms).includes("→ Lớp 9") ? "lớp 9" : "?"}`]);
    const { turnId } = (await t.call("POST", "/api/tro-ly/luot", { message: "Giải giúp em bài này" })).json();
    const first = await t.events(turnId);
    expect(first.ev.map((e) => e.type)).toEqual(["turn", "status", "step", "tool_call", "ask_user", "status", "end"]);
    expect(first.ev.at(-1)).toEqual({ type: "end", status: "waiting" });
    const view = (await t.call("GET", `/api/tro-ly/luot/${turnId}`)).json();
    expect(view.status).toBe("waiting");
    expect(view.ask.questions[0]).toMatchObject({ id: "q1", prompt: "Em học lớp mấy?" });
    // Lượt mới cùng mạch bị chặn khi đang chờ.
    expect((await t.call("POST", "/api/tro-ly/luot", { message: "khác", threadId: view.threadId })).statusCode).toBe(409);
    const ans = await t.call("POST", `/api/tro-ly/luot/${turnId}/tra-loi`, { answers: [{ id: "q1", selected: ["Lớp 9"] }] });
    expect(ans.statusCode).toBe(200);
    expect((await t.call("POST", `/api/tro-ly/luot/${turnId}/tra-loi`, { answers: [] })).statusCode).toBe(409);
    const last = first.ev.filter((e) => e.seq).at(-1)!.seq!;
    const rest = await t.events(turnId, last);
    expect(rest.ev.map((e) => e.type)).toEqual(["status", "answered", "step", "content", "done", "end"]);
    expect(rest.ev.find((e) => e.type === "done")).toMatchObject({ status: "done", answer: "Em chọn: lớp 9", usage: { steps: 2 } });
  });

  it("huỷ lượt đang chạy → cancelled (đã nhả); lượt mới cùng mạch bị 409 khi đang chạy", async () => {
    const t = await setup([{ hang: true }]);
    const { turnId, threadId } = (await t.call("POST", "/api/tro-ly/luot", { message: "Câu dài" })).json();
    const busy = await t.call("POST", "/api/tro-ly/luot", { message: "Câu nữa", threadId });
    expect(busy.statusCode).toBe(409);
    expect(busy.json().turnId).toBe(turnId);
    const c = await t.call("POST", `/api/tro-ly/luot/${turnId}/huy`);
    expect(c.json()).toEqual({ status: "cancelled" });
    const { ev } = await t.events(turnId);
    expect(ev.find((e) => e.type === "done")).toMatchObject({ status: "cancelled" });
    expect(ev.at(-1)).toEqual({ type: "end", status: "cancelled" });
    // Huỷ lặp vô hại.
    expect((await t.call("POST", `/api/tro-ly/luot/${turnId}/huy`)).json()).toEqual({ status: "cancelled" });
  });

  it("huỷ lượt đang chờ ask_user", async () => {
    const t = await setup(['TOOL: {"name":"ask_user","args":{"questions":["Lớp mấy?"]}}']);
    const { turnId } = (await t.call("POST", "/api/tro-ly/luot", { message: "?" })).json();
    await t.events(turnId);
    expect((await t.call("POST", `/api/tro-ly/luot/${turnId}/huy`)).json()).toEqual({ status: "cancelled" });
    expect((await t.events(turnId)).ev.at(-2)).toMatchObject({ type: "done", status: "cancelled" });
  });

  it("người khác không thấy lượt; dữ liệu sai → 400; lượt mồ côi → interrupted", async () => {
    const t = await setup(["ANSWER: ok"]);
    const { turnId } = (await t.call("POST", "/api/tro-ly/luot", { message: "Câu" })).json();
    await t.events(turnId);
    expect((await t.call("GET", `/api/tro-ly/luot/${turnId}`, undefined, t.hs2)).statusCode).toBe(404);
    expect((await t.events(turnId, undefined, t.hs2)).res.statusCode).toBe(404);
    expect((await t.call("POST", `/api/tro-ly/luot/${turnId}/huy`, undefined, t.hs2)).statusCode).toBe(404);
    expect((await t.call("GET", "/api/tro-ly/luot/khong-phai-uuid")).statusCode).toBe(404);
    expect((await t.call("POST", "/api/tro-ly/luot", { message: "  " })).statusCode).toBe(400);
    const img = { kind: "image", name: "a.png", dataUrl: "data:image/png;base64,AAAA" };
    expect((await t.call("POST", "/api/tro-ly/luot", { message: "x", attachments: [img, img, img, img] })).statusCode).toBe(400);
    expect((await t.call("POST", "/api/tro-ly/luot", { message: "x", capability: "khong_co" })).statusCode).toBe(404);
    expect((await t.call("POST", "/api/tro-ly/luot", { message: "x" }, {})).statusCode).toBe(401);
    // Lượt "running" không còn ai chạy, lâu không cập nhật → interrupted khi có người xem.
    await t.db.update(agentTurns).set({ status: "running", updatedAt: new Date(Date.now() - 10 * 60_000) }).where(eq(agentTurns.id, turnId));
    const { ev } = await t.events(turnId, 3);
    expect(ev.filter((e) => e.type !== "end").map((e) => e.type)).toEqual(["content", "done", "error", "done"]);
    expect(ev.at(-1)).toEqual({ type: "end", status: "interrupted" });
  });

  it("ảnh + tệp chữ đính kèm đi vào tin của model; năng lực và công cụ theo vai", async () => {
    const t = await setup(["ANSWER: ok"]);
    const { turnId } = (await t.call("POST", "/api/tro-ly/luot", { message: "Xem giúp", attachments: [{ kind: "image", name: "bai.png", dataUrl: "data:image/png;base64,AAAA" }, { kind: "text", name: "de.txt", text: "Câu 1: 2+2=?" }] })).json();
    await t.events(turnId);
    const user = t.fake.calls[0]!.messages.at(-1)!;
    expect(user.content).toEqual([
      { type: "text", text: "Xem giúp\n\n[Tệp đính kèm: de.txt]\n```\nCâu 1: 2+2=?\n```" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
    ]);
    expect((await t.call("GET", `/api/tro-ly/luot/${turnId}`)).json().attachments).toEqual([{ kind: "image", name: "bai.png" }, { kind: "text", name: "de.txt" }]);
    expect((await t.call("GET", "/api/tro-ly/nang-luc")).json()).toEqual([{ id: "chat", title: "Hỏi đáp", description: expect.any(String), icon: "chat" }]);
    expect((await t.call("GET", "/api/tro-ly/cong-cu")).json().map((x: { name: string }) => x.name)).toEqual(["ask_user", "tra_kho_tri_thuc"]);
  });
});
