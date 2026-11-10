import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { mcq } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});
const call = (method: "GET" | "POST", url: string, payload?: unknown, headers: Record<string, string> = auth) => t.app.inject({ method, url, headers, payload: payload as object });
const pause = () => new Promise((r) => setTimeout(r, 70));

async function questionIds(n: number) {
  const ids: string[] = [];
  for (let i = 0; i < n; i++) ids.push((await call("POST", "/api/questions", mcq({ stem: `Câu $x_${i}$` }))).json().id);
  return ids;
}
const answer = (token: string, q: number, choice: number) => call("POST", "/api/live/answer", { t: token, q, choice }, {});

describe("trò chơi trực tiếp", () => {
  it("chơi trọn trận: vào phòng, trả lời, điểm, hạng, lưu kết quả", async () => {
    const ids = await questionIds(2);
    const room = (await call("POST", "/api/live", { source: { questionIds: ids }, timerSeconds: 30 })).json() as { pin: string; total: number };
    expect(room.pin).toMatch(/^\d{6}$/);
    expect(room.total).toBe(2);

    const wrongPin = await call("GET", "/api/live/pin/000000", undefined, {});
    expect(wrongPin.statusCode).toBe(404);
    expect(wrongPin.json().error).toBe("Không tìm thấy phòng chơi. Kiểm tra lại mã PIN.");
    expect((await call("GET", `/api/live/pin/${room.pin}`, undefined, {})).json()).toMatchObject({ phase: "lobby", roster: null });

    const join = (name: string) => call("POST", `/api/live/pin/${room.pin}/join`, { name }, {});
    const an = (await join("An")).json().token as string;
    const binh = (await join("Bình")).json().token as string;
    expect((await join("an")).statusCode).toBe(409);
    expect((await call("POST", `/api/live/pin/${room.pin}/join`, { token: an }, {})).json().name).toBe("An");

    expect((await call("POST", `/api/live/room/${room.pin}/control`, { action: "start" })).json()).toMatchObject({ phase: "question", qi: 0, playerCount: 2 });
    expect((await answer("bad.token", 0, 0)).statusCode).toBe(401);
    expect((await answer(an, 1, 0)).statusCode).toBe(409); // sai số câu
    await pause();
    expect((await answer(an, 0, 0)).statusCode).toBe(200);
    await pause();
    expect((await answer(an, 0, 1)).statusCode).toBe(409); // gửi lần 2
    expect((await call("GET", `/api/live/room/${room.pin}`)).json().state.answered).toBe(1);
    expect((await answer(binh, 0, 2)).statusCode).toBe(200);
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "skip" }); // GV chốt câu (không có luồng SSE nên không tự chốt)

    let host = (await call("GET", `/api/live/room/${room.pin}`)).json().state;
    expect(host.phase).toBe("reveal");
    expect(host.reveal).toMatchObject({ correctIndex: 0, counts: [1, 0, 1, 0], correct: 1 });
    expect(host.reveal.top[0].name).toBe("An");
    expect(host.reveal.top[0].score).toBeGreaterThan(900);

    await call("POST", `/api/live/room/${room.pin}/control`, { action: "next" });
    await pause();
    await answer(an, 1, 0);
    await pause();
    await answer(binh, 1, 0);
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "skip" });
    host = (await call("POST", `/api/live/room/${room.pin}/control`, { action: "next" })).json();
    expect(host.phase).toBe("ended");
    expect(host.podium.map((p: { name: string }) => p.name)).toEqual(["An", "Bình"]);

    await new Promise((r) => setTimeout(r, 200));
    host = (await call("GET", `/api/live/room/${room.pin}`)).json().state;
    expect(host.sessionId).toBeTruthy();
    const s = (await call("GET", `/api/live/sessions/${host.sessionId}`)).json();
    expect(s.results.map((r: { name: string; correct: number }) => [r.name, r.correct])).toEqual([["An", 2], ["Bình", 1]]);
    expect(s.hardest[0].wrongPct).toBe(50);
    expect((await call("POST", `/api/live/sessions/${host.sessionId}/gradebook`, { column: "TX1" })).statusCode).toBe(400); // không gắn lớp
    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy B" })}` };
    expect((await call("POST", `/api/live/room/${room.pin}/control`, { action: "end" }, other)).statusCode).toBe(404);
  });

  it("gắn lớp: chọn tên trong danh sách, ghi vào sổ điểm thang 10", async () => {
    const ids = await questionIds(2);
    const cls = (await call("POST", "/api/classes", { name: "10A1", schoolYear: "2026-2027" })).json();
    await call("POST", `/api/classes/${cls.id}/students`, { text: "Nguyễn Văn An\nTrần Thị Bình" });
    const students = (await call("GET", `/api/classes/${cls.id}`)).json().students as { id: string; fullName: string }[];
    const room = (await call("POST", "/api/live", { source: { questionIds: ids }, classId: cls.id })).json() as { pin: string };
    const info = (await call("GET", `/api/live/pin/${room.pin}`, undefined, {})).json();
    expect(info.roster).toHaveLength(2);
    const join = (studentId?: string) => call("POST", `/api/live/pin/${room.pin}/join`, { studentId }, {});
    expect((await join()).statusCode).toBe(400);
    const an = students.find((s) => s.fullName.includes("An"))!;
    const tok = (await join(an.id)).json().token as string;
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "start" });
    await answer(tok, 0, 0);
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "skip" }); // chốt câu 1
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "next" });
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "end" });
    await new Promise((r) => setTimeout(r, 200));
    const sid = (await call("GET", `/api/live/room/${room.pin}`)).json().state.sessionId as string;
    const w = await call("POST", `/api/live/sessions/${sid}/gradebook`, { column: "GK", term: "HK1" });
    expect(w.statusCode).toBe(200);
    expect(w.json().updated).toBe(1);
    const gb = (await call("GET", `/api/classes/${cls.id}/gradebook`)).json();
    expect(JSON.stringify(gb)).toContain("5"); // 1/2 câu đúng = 5,0
  });

  it("SSE: người chơi nhận trạng thái ngay khi nối và khi GV đổi pha", async () => {
    const ids = await questionIds(2);
    const room = (await call("POST", "/api/live", { source: { questionIds: ids } })).json() as { pin: string };
    const tok = (await call("POST", `/api/live/pin/${room.pin}/join`, { name: "An" }, {})).json().token as string;
    await t.app.listen({ port: 0, host: "127.0.0.1" });
    const base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
    const ac = new AbortController();
    const res = await fetch(`${base}/api/live/stream?t=${tok}`, { signal: ac.signal });
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let buf = "";
    const until = async (needle: string) => {
      while (!buf.includes(needle)) buf += dec.decode((await reader.read()).value);
    };
    await until('"phase":"lobby"');
    await call("POST", `/api/live/room/${room.pin}/control`, { action: "start" });
    await until('"phase":"question"');
    expect(buf).toContain("Câu $x_");
    expect(buf).not.toContain('"answer"'); // không lộ đáp án khi đang chơi
    ac.abort();
  });
});
