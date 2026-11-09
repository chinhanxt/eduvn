import { describe, expect, it } from "vitest";
import { EventOutbox, LeaveTracker } from "../src/student/leave";
import { isSessionValid, retryAfterMs } from "../src/student/studentApi";

describe("LeaveTracker", () => {
  it("blur + hidden chỉ tính một lần rời; quay lại khi vừa hiện vừa có focus", () => {
    const ev: string[] = [];
    const t = new LeaveTracker((k) => ev.push(k));
    t.update(true, true);
    t.update(true, false);
    t.update(false, false);
    t.update(true, false);
    t.update(true, true);
    t.update(true, true);
    expect(ev).toEqual(["leave", "return"]);
  });
});

describe("EventOutbox", () => {
  it("gửi theo lô; gửi hỏng thì giữ lại", async () => {
    const o = new EventOutbox();
    o.push("leave");
    o.push("return");
    await o.flush(async () => false);
    expect(o.size).toBe(2);
    const got: unknown[] = [];
    await o.flush(async (e) => {
      got.push(...e);
      return true;
    });
    expect(got).toEqual([{ kind: "leave" }, { kind: "return" }]);
    expect(o.size).toBe(0);
    o.push("leave");
    await o.flush(async () => {
      throw new TypeError("offline");
    });
    expect(o.size).toBe(1);
  });
});

describe("gửi lại + phiên", () => {
  it("Retry-After hoặc lùi dần, cộng nhiễu", () => {
    expect(retryAfterMs("3", 0, () => 0)).toBe(3000);
    expect(retryAfterMs(null, 0, () => 0)).toBe(500);
    expect(retryAfterMs(null, 3, () => 0.5)).toBe(4200);
    expect(retryAfterMs("x", 10, () => 1)).toBe(8400);
  });
  it("phiên hết hạn trước 1 phút thì coi như hết", () => {
    const s = { token: "t", expiresInSeconds: 1, expiresAt: 100_000, student: { id: "s", fullName: "An", seat: 1 }, class: { id: "c", name: "10A1", subject: null } };
    expect(isSessionValid(s, 30_000)).toBe(true);
    expect(isSessionValid(s, 50_000)).toBe(false);
    expect(isSessionValid(null)).toBe(false);
  });
});
