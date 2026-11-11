import { describe, expect, it } from "vitest";
import { bandCounts, currentTerm, dailyCounts, dueGroup, dueLabel, endOfVnWeek, isHot, masteryBySubject, onTimeRate, parseViDate, partialAverage, startOfVnDay, streakOf, taskCode, vnDay, vnWeekday } from "../../src/domain/today";

const at = (s: string) => new Date(s);

describe("ngày giờ Việt Nam", () => {
  it("ngày/thứ/đầu ngày theo UTC+7", () => {
    expect(vnDay(at("2026-11-09T18:30:00Z"))).toBe("2026-11-10"); // 01:30 sáng 10/11 giờ VN
    expect(vnWeekday(at("2026-11-10T03:00:00Z"))).toBe("T3");
    expect(startOfVnDay(at("2026-11-10T03:00:00Z")).toISOString()).toBe("2026-11-09T17:00:00.000Z");
    expect(endOfVnWeek(at("2026-11-10T03:00:00Z")).toISOString()).toBe("2026-11-15T17:00:00.000Z"); // hết CN 15/11
    expect(endOfVnWeek(at("2026-11-15T10:00:00Z")).toISOString()).toBe("2026-11-15T17:00:00.000Z");
  });
  it("nhóm + nhãn hạn + hạn gấp", () => {
    const now = at("2026-11-10T03:00:00Z"); // 10:00 T3
    expect(dueGroup(at("2026-11-10T10:00:00Z"), now)).toBe("today");
    expect(dueGroup(at("2026-11-13T10:00:00Z"), now)).toBe("week");
    expect(dueGroup(at("2026-11-17T10:00:00Z"), now)).toBe("later");
    expect(dueLabel(at("2026-11-10T10:00:00Z"), now)).toBe("17:00");
    expect(dueLabel(at("2026-11-13T10:00:00Z"), now)).toBe("T6");
    expect(dueLabel(at("2026-11-20T10:00:00Z"), now)).toBe("20/11");
    expect(isHot(at("2026-11-10T10:00:00Z"), now)).toBe(true);
    expect(isHot(at("2026-11-12T10:00:00Z"), now)).toBe(false);
    expect(isHot(at("2026-11-10T01:00:00Z"), now)).toBe(false);
  });
  it("ngày giáo án dd/mm/yyyy, học kỳ", () => {
    expect(parseViDate("7/11/2026")).toBe("2026-11-07");
    expect(parseViDate("31/13/2026")).toBeNull();
    expect(parseViDate("")).toBeNull();
    expect(currentTerm(at("2026-11-10T03:00:00Z"))).toBe("HK1");
    expect(currentTerm(at("2027-03-10T03:00:00Z"))).toBe("HK2");
  });
  it("mã việc không dấu", () => {
    expect(taskCode("KT", at("2026-11-07T10:00:00Z"), "10A3")).toBe("KT-0711-10A3");
    expect(taskCode("LT", at("2026-11-10T10:00:00Z"), "K68 Đại số")).toBe("LT-1011-K68DAISO");
  });
});

describe("số liệu", () => {
  it("học lực Giỏi/Khá/TB/Yếu + ĐTB tạm tính", () => {
    expect(bandCounts([9, 8, 7.9, 6.5, 6.4, 5, 4.9])).toEqual([2, 2, 2, 1]);
    const cols = [{ name: "TX1", weight: 1 }, { name: "GK", weight: 2 }, { name: "CK", weight: 3 }];
    expect(partialAverage(cols, { TX1: 6, GK: 9 })).toBe(8);
    expect(partialAverage(cols, {})).toBeNull();
  });
  it("tỉ lệ nộp đúng hạn tính trên sĩ số × bài, có ân hạn", () => {
    const due = at("2026-11-05T10:00:00Z");
    const items = [{ dueAt: due, rosterIds: ["a", "b", "c", "d"], submittedAt: new Map([["a", at("2026-11-05T09:00:00Z")], ["b", at("2026-11-05T10:00:20Z")], ["c", at("2026-11-05T11:00:00Z")]]) }];
    expect(onTimeRate(items, at("2026-11-01T00:00:00Z"), at("2026-11-10T00:00:00Z"))).toBe(50);
    expect(onTimeRate(items, at("2026-11-06T00:00:00Z"), at("2026-11-10T00:00:00Z"))).toBeNull();
  });
  it("chuỗi ngày: hôm nay chưa học vẫn giữ chuỗi đến hôm qua", () => {
    expect(streakOf([1, 0, 3, 4, 5])).toEqual({ current: 3, longest: 3 });
    expect(streakOf([2, 2, 2, 0, 1, 1, 0])).toEqual({ current: 2, longest: 3 });
    expect(streakOf([0, 0])).toEqual({ current: 0, longest: 0 });
  });
  it("đếm theo ngày VN", () => {
    const now = at("2026-11-10T03:00:00Z");
    const d = dailyCounts([{ at: at("2026-11-09T18:00:00Z") }, { at: at("2026-11-09T16:00:00Z"), n: 3 }, { at: at("2026-10-01T00:00:00Z") }], now, 3);
    expect(d).toEqual([
      { date: "2026-11-08", weekday: "CN", count: 0 },
      { date: "2026-11-09", weekday: "T2", count: 3 },
      { date: "2026-11-10", weekday: "T3", count: 1 },
    ]);
  });
  it("thành thạo theo chủ đề: ít bằng chứng → null, sắp cao → thấp", () => {
    const ev = [
      ...Array.from({ length: 4 }, (_, i) => ({ subject: "Toán", topic: "Hàm số", value: i < 3 ? 1 : 0 })),
      ...Array.from({ length: 5 }, () => ({ subject: "Toán", topic: "Dấu tam thức", value: 0.4 })),
      { subject: "Toán", topic: "Hệ thức lượng", value: 1 },
      { subject: "Văn", topic: "Nghị luận", value: 1 },
    ];
    const m = masteryBySubject(ev);
    expect(m.get("Toán")).toEqual([
      { topic: "Hàm số", n: 4, pct: 75 },
      { topic: "Dấu tam thức", n: 5, pct: 40 },
      { topic: "Hệ thức lượng", n: 1, pct: null },
    ]);
    expect(m.get("Văn")).toEqual([{ topic: "Nghị luận", n: 1, pct: null }]);
  });
});
