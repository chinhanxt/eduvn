import { describe, expect, it } from "vitest";
import { isAnswered, isPartial, unanswered } from "../src/student/answers";
import { AnswerSync, type SendResult, memoryStore } from "../src/student/syncQueue";

function harness(results: SendResult[] = []) {
  const sent: { seq: number; answers: Record<string, unknown>; keepalive: boolean }[] = [];
  const statuses: string[] = [];
  let t = 0;
  const store = memoryStore();
  const send = async (seq: number, answers: Record<string, unknown>, o: { keepalive: boolean }) => {
    sent.push({ seq, answers, keepalive: o.keepalive });
    return results.shift() ?? ({ kind: "ok", seq } as SendResult);
  };
  const open = (server = { seq: 0, answers: {} }) => AnswerSync.open(store, "sub-1", server, send, (s) => statuses.push(s), () => t);
  return { sent, statuses, store, open, advance: (ms: number) => (t += ms) };
}

describe("AnswerSync", () => {
  it("ghi máy ngay, gửi bản mới nhất, chỉ gửi khi có thay đổi", async () => {
    const h = harness();
    const s = await h.open();
    expect(s.status).toBe("saved");
    await s.set(1, 2);
    await s.set(2, "\\frac{3}{2}");
    expect((await h.store.get("sub-1"))?.seq).toBe(2);
    expect(s.status).toBe("saving");
    await s.flush();
    expect(h.sent).toEqual([{ seq: 2, answers: { "1": 2, "2": "\\frac{3}{2}" }, keepalive: false }]);
    expect(s.status).toBe("saved");
    await s.flush();
    expect(h.sent).toHaveLength(1);
  });

  it("mất mạng: vẫn ghi máy, báo offline; có mạng lại gửi bản cuối", async () => {
    const h = harness([{ kind: "offline" }]);
    const s = await h.open();
    await s.set(1, 0);
    await s.flush();
    expect(s.status).toBe("offline");
    await s.set(1, 3);
    expect(s.status).toBe("offline");
    await s.flush(true);
    expect(h.sent.map((x) => [x.seq, x.answers["1"], x.keepalive])).toEqual([[1, 0, false], [2, 3, true]]);
    expect(s.status).toBe("saved");
  });

  it("máy chủ bận: chờ đúng thời gian rồi mới gửi lại", async () => {
    const h = harness([{ kind: "retry", afterMs: 2000 }]);
    const s = await h.open();
    await s.set(1, 1);
    await s.flush();
    await s.flush();
    expect(h.sent).toHaveLength(1);
    h.advance(2000);
    await s.flush();
    expect(h.sent).toHaveLength(2);
  });

  it("bài đã nộp/hết giờ: đóng, không nhận thêm", async () => {
    const h = harness([{ kind: "closed", status: "auto_submitted" }]);
    const s = await h.open();
    await s.set(1, 1);
    await s.flush();
    expect(s.status).toBe("closed");
    await s.set(1, 2);
    expect(s.answers["1"]).toBe(1);
  });

  it("mở lại: lấy bản máy nếu mới hơn máy chủ; ngược lại lấy máy chủ, giữ đánh dấu", async () => {
    const h = harness();
    const s = await h.open();
    await s.set(1, 1);
    await s.toggleFlag(3);
    const again = await h.open({ seq: 0, answers: {} });
    expect([again.seq, again.answers, again.flags, again.status]).toEqual([1, { "1": 1 }, [3], "saving"]);
    const fromServer = await h.open({ seq: 5, answers: { "1": 2 } });
    expect([fromServer.seq, fromServer.answers, fromServer.flags, fromServer.dirty]).toEqual([5, { "1": 2 }, [3], false]);
    const sub = await fromServer.forSubmit();
    expect(sub.seq).toBe(6);
  });

  it("chỉ một lần gửi tại một thời điểm", async () => {
    let release: () => void = () => {};
    const sent: number[] = [];
    const s = await AnswerSync.open(memoryStore(), "x", { seq: 0, answers: {} }, (seq) => {
      sent.push(seq);
      return new Promise<SendResult>((r) => (release = () => r({ kind: "ok", seq })));
    });
    await s.set(1, 1);
    const a = s.flush();
    await Promise.resolve();
    await s.flush();
    release();
    await a;
    expect(sent).toEqual([1]);
  });
});

describe("đáp án đã làm", () => {
  it("đúng/sai đủ 4 ý mới tính đã làm", () => {
    expect([isAnswered(0), isAnswered(null), isAnswered(" "), isAnswered("x"), isAnswered([true, false, true, false]), isAnswered([true, null, true, false])]).toEqual([true, false, false, true, true, false]);
    expect(isPartial([true, null, null, null])).toBe(true);
    expect(isPartial([null, null, null, null])).toBe(false);
    expect(unanswered({ "1": 0, "3": "" }, [1, 2, 3])).toEqual([2, 3]);
  });
});
