import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, PinGuard, assignSeats, isCode, isPin, makeCode, makePin, normalizeCode } from "../../src/domain/studentAuth";

const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length] as number;
};

describe("mã lớp, PIN, số thứ tự", () => {
  it("mã 6 ký tự từ bảng chữ không nhầm lẫn", () => {
    expect(CODE_ALPHABET).not.toMatch(/[ILO01]/);
    expect(makeCode(seq(0, 1, 2, 3, 30, 29))).toBe("ABCD98");
    expect(isCode("ABCD98")).toBe(true);
    expect(isCode("ABCD9O")).toBe(false);
    expect(isCode("ABC")).toBe(false);
    expect(normalizeCode(" abc-d98 ")).toBe("ABCD98");
  });
  it("PIN 6 số", () => {
    expect(makePin(seq(0, 4, 2, 9, 1, 7))).toBe("042917");
    expect(isPin("042917")).toBe(true);
    expect(isPin("42917")).toBe(false);
    expect(isPin("04291a")).toBe(false);
  });
  it("cấp số thứ tự tiếp sau số lớn nhất, theo thứ tự danh sách", () => {
    expect([...assignSeats([{ id: "a", seat: null }, { id: "b", seat: 2 }, { id: "c", seat: null }])]).toEqual([["a", 3], ["c", 4]]);
    expect(assignSeats([{ id: "a", seat: 1 }]).size).toBe(0);
  });
});

describe("PinGuard", () => {
  it("sai 5 lần / 10 phút thì khoá số thứ tự đó 10 phút", () => {
    const g = new PinGuard();
    for (let i = 0; i < 4; i++) g.fail("ABCDEF:7", "ip:1", i * 1000);
    expect(g.lockedFor(["ABCDEF:7", "ip:1"], 5000)).toBe(0);
    g.fail("ABCDEF:7", "ip:1", 5000);
    expect(g.lockedFor(["ABCDEF:7", "ip:1"], 5000)).toBe(600);
    expect(g.lockedFor(["ABCDEF:8", "ip:1"], 5000)).toBe(0);
    expect(g.lockedFor(["ABCDEF:7"], 5000 + 600_000)).toBe(0);
  });
  it("lần sai cũ quá 10 phút không tính; đúng thì xoá đếm", () => {
    const g = new PinGuard();
    for (let i = 0; i < 4; i++) g.fail("k", "ip", 0);
    g.fail("k", "ip", 600_001);
    expect(g.lockedFor(["k"], 600_001)).toBe(0);
    for (let i = 0; i < 3; i++) g.fail("k2", "ip2", 1);
    g.success("k2");
    g.fail("k2", "ip2", 2);
    expect(g.lockedFor(["k2"], 2)).toBe(0);
  });
  it("khoá theo IP sau 30 lần sai ở nhiều số thứ tự", () => {
    const g = new PinGuard();
    for (let i = 0; i < 30; i++) g.fail(`C:${i}`, "ip:9", i);
    expect(g.lockedFor(["C:99", "ip:9"], 31)).toBe(600);
    g.prune(10_000_000);
    expect(g.lockedFor(["ip:9"], 10_000_000)).toBe(0);
  });
});
