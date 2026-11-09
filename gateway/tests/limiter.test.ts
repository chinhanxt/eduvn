import { describe, expect, it } from "vitest";
import { PriorityLimiter } from "../src/limiter";

function gate() {
  let open!: () => void;
  const p = new Promise<void>((r) => (open = r));
  return { p, open };
}
const tick = () => new Promise((r) => setTimeout(r, 5));

describe("PriorityLimiter", () => {
  it("không vượt quá số việc cho phép", async () => {
    const l = new PriorityLimiter(2, 0);
    const gs = [gate(), gate(), gate(), gate()];
    const runs = gs.map((g) => l.run(1, () => g.p));
    await tick();
    expect(l.active).toBe(2);
    expect(l.queued).toBe(2);
    gs[0]!.open();
    await tick();
    expect(l.active).toBe(2);
    expect(l.queued).toBe(1);
    gs.forEach((g) => g.open());
    await Promise.all(runs);
    expect(l.active).toBe(0);
  });
  it("việc tương tác chen trước việc theo lô đang xếp hàng", async () => {
    const l = new PriorityLimiter(1, 0);
    const first = gate();
    const order: string[] = [];
    const a = l.run(1, () => first.p);
    const b = l.run(1, async () => void order.push("lô"));
    const c = l.run(0, async () => void order.push("chat"));
    first.open();
    await Promise.all([a, b, c]);
    expect(order).toEqual(["chat", "lô"]);
  });
  it("giữ chỗ cho chat: việc theo lô không chiếm hết", async () => {
    const l = new PriorityLimiter(2, 1);
    const g1 = gate();
    const g2 = gate();
    const b1 = l.run(1, () => g1.p);
    const b2 = l.run(1, () => g2.p);
    await tick();
    expect(l.active).toBe(1); // lô chỉ được 1 chỗ
    let chatDone = false;
    const c = l.run(0, async () => void (chatDone = true));
    await c;
    expect(chatDone).toBe(true);
    g1.open();
    g2.open();
    await Promise.all([b1, b2]);
  });
  it("lỗi trong việc vẫn trả chỗ", async () => {
    const l = new PriorityLimiter(1, 0);
    await expect(l.run(0, async () => Promise.reject(new Error("hỏng")))).rejects.toThrow("hỏng");
    await expect(l.run(0, async () => 7)).resolves.toBe(7);
    expect(l.active).toBe(0);
  });
  it("người chờ bị huỷ thì rời hàng và báo lỗi, người khác vẫn chạy", async () => {
    const l = new PriorityLimiter(1, 0);
    const g = gate();
    const first = l.run(0, () => g.p);
    const ac = new AbortController();
    let ran = false;
    const second = l.run(0, async () => { ran = true; }, ac.signal);
    const third = l.run(0, async () => "ba");
    const rej = expect(second).rejects.toMatchObject({ status: 499, code: "client_closed" });
    await tick();
    expect(l.queued).toBe(2);
    ac.abort();
    await rej;
    expect(l.queued).toBe(1);
    g.open();
    await first;
    expect(await third).toBe("ba");
    expect(ran).toBe(false);
    await expect(l.run(0, async () => 1, ac.signal)).rejects.toMatchObject({ status: 499 });
  });
});

describe("PriorityLimiter chờ quá lâu", () => {
  it("chat chờ quá maxWaitMs thì 503 busy, rời hàng", async () => {
    const l = new PriorityLimiter(1, 0, 60);
    const g = gate();
    const a = l.run(0, () => g.p);
    await tick();
    await expect(l.run(0, async () => "x")).rejects.toMatchObject({ status: 503, code: "busy" });
    expect(l.queued).toBe(0);
    g.open();
    await a;
  });
});
