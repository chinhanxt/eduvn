import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { mcq, short, tf } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});
const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, headers = auth) => t.app.inject({ method, url, headers, payload: payload as object });

describe("HTTP trò chơi", () => {
  it("< 4 câu bị từ chối; lọc ngân hàng / id / đề → .html", async () => {
    const filter = { subject: "Toán", grade: 10 };
    const rej = await call("POST", "/api/games", { title: "Ôn", kind: "quiz", source: filter });
    expect(rej.statusCode).toBe(400);
    expect(rej.json().issues[0]).toContain("Cần ít nhất 4 câu");

    const ids: string[] = [];
    for (const q of [mcq(), mcq({ stem: "Câu 2 <b>in đậm</b>" }), tf(), short()]) ids.push((await call("POST", "/api/questions", q)).json().id);

    const g = await call("POST", "/api/games", { title: "Ôn mệnh đề", kind: "quiz", source: filter, timerSeconds: 15 });
    expect(g.statusCode).toBe(201);
    expect(g.json()).toMatchObject({ kind: "quiz", questionCount: 7, timerSeconds: 15 });
    const byIds = await call("POST", "/api/games", { title: "Thẻ", kind: "flashcards", source: { questionIds: ids } });
    expect(byIds.json()).toMatchObject({ kind: "flashcards", questionCount: 7, timerSeconds: 0 });

    const link = (await call("POST", `/api/games/${g.json().id}/export`)).json();
    const dl = await t.app.inject({ method: "GET", url: new URL(link.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-type"]).toContain("text/html");
    expect(dl.headers["content-disposition"]).toContain("do-vui-on-menh-de.html");
    expect(dl.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(dl.body).toContain("\\u003cb\\u003ein đậm");
    expect(dl.body).not.toContain("<b>in đậm");
    const inline = await t.app.inject({ method: "GET", url: `${new URL(link.url).pathname}?mo=1` });
    expect(inline.headers["content-disposition"]).toContain("inline");

    expect((await call("GET", "/api/games")).json()).toHaveLength(2);
    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy B" })}` };
    expect((await call("POST", `/api/games/${g.json().id}/export`, undefined, other)).statusCode).toBe(404);
    expect((await call("DELETE", `/api/games/${g.json().id}`)).statusCode).toBe(204);
  });

  it("nguồn là đề + mã đề", async () => {
    for (let i = 0; i < 4; i++) await call("POST", "/api/questions", mcq({ stem: `Câu ${i}` }));
    const exam = await call("POST", "/api/exams", { title: "Đề 1", matrix: { subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "mcq", count: 4 }] }, variants: 2, seed: 1 });
    const examId = exam.json().examId as string;
    const g = await call("POST", "/api/games", { title: "Từ đề", kind: "quiz", source: { examId, code: "102" } });
    expect(g.statusCode).toBe(201);
    expect(g.json().source).toContain("mã 102");
    expect((await call("POST", "/api/games", { title: "x", kind: "quiz", source: { examId, code: "999" } })).statusCode).toBe(404);
  });
});
