import { describe, expect, it } from "vitest";
import { ServerClock, formatClock, formatCountdown, timerTone } from "../src/student/clock";

describe("ServerClock", () => {
  it("lệch giờ ước từ serverNow, giữ mẫu có độ trễ nhỏ", () => {
    let local = 1_000_000;
    const c = new ServerClock(() => local);
    c.sample(new Date(1_005_050).toISOString(), 1_000_000, 1_000_100); // rtt 100 → lệch +5000
    expect(c.now()).toBe(1_005_000);
    c.sample(new Date(2_000_000).toISOString(), 1_000_000, 1_001_000); // rtt 1000 → bỏ
    expect(c.now()).toBe(1_005_000);
    c.sample(new Date(1_003_040).toISOString(), 1_000_000, 1_000_080); // rtt 80 → lệch +3000
    expect(c.now()).toBe(1_003_000);
    c.sample("không phải giờ", 0, 0);
    local += 1000;
    expect(c.remainingMs(new Date(1_010_000).toISOString())).toBe(6000);
    expect(c.remainingMs(new Date(0).toISOString())).toBe(0);
  });
});

describe("định dạng giờ", () => {
  it.each([
    [754_000, "12:34"],
    [3_723_000, "1:02:03"],
    [500, "00:01"],
    [0, "00:00"],
  ])("%s ms → %s", (ms, s) => expect(formatClock(ms)).toBe(s));
  it("màu đồng hồ", () => {
    expect([timerTone(400_000), timerTone(300_000), timerTone(60_000)]).toEqual(["", "warn", "crit"]);
  });
  it("đếm ngược hạn nộp", () => {
    expect(formatCountdown(26 * 3600_000 + 14 * 60_000)).toBe("Còn 1 ngày 2 giờ");
    expect(formatCountdown(3 * 3600_000 + 5 * 60_000)).toBe("Còn 3 giờ 5 phút");
    expect(formatCountdown(65_000)).toBe("Còn 1 phút 05 giây");
    expect(formatCountdown(-1)).toBe("Đã hết hạn");
  });
});
