import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { lessonPlan } from "../helpers/lesson";

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

describe("HTTP slide", () => {
  it("JSON → lưu → xuất .pptx; từ giáo án; lỗi trả danh sách", async () => {
    const rej = await call("POST", "/api/slides", { title: "X", slides: [{ layout: "bullets", title: "A", bullets: Array.from({ length: 9 }, () => "ý") }] });
    expect(rej.statusCode).toBe(400);
    expect(rej.json().issues[0]).toContain("tối đa 8");

    const created = await call("POST", "/api/slides", { title: "Mệnh đề", slides: [{ layout: "title", title: "Mệnh đề" }, { layout: "bullets", title: "Khái niệm", bullets: ["ý 1"] }] });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ slideCount: 2, sourceLessonPlanId: null });

    const lesson = (await call("POST", "/api/lessons", lessonPlan())).json();
    const fromLesson = await call("POST", "/api/slides", { lessonPlanId: lesson.id });
    expect(fromLesson.statusCode).toBe(201);
    expect(fromLesson.json().sourceLessonPlanId).toBe(lesson.id);
    expect((await call("POST", "/api/slides", { lessonPlanId: "00000000-0000-4000-8000-000000000000" })).statusCode).toBe(404);

    const list = (await call("GET", "/api/slides")).json();
    expect(list).toHaveLength(2);
    const link = (await call("POST", `/api/slides/${fromLesson.json().id}/export`)).json();
    const dl = await t.app.inject({ method: "GET", url: new URL(link.url).pathname });
    expect(dl.statusCode).toBe(200);
    expect(dl.headers["content-disposition"]).toContain("slide-menh-de.pptx");
    const zip = await JSZip.loadAsync(dl.rawPayload);
    expect(Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).length).toBe(fromLesson.json().slideCount);

    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy B" })}` };
    expect((await call("GET", `/api/slides/${created.json().id}`, undefined, other)).statusCode).toBe(404);
    expect((await call("DELETE", `/api/slides/${created.json().id}`)).statusCode).toBe(204);
  });
});
