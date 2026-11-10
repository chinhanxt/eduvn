import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, DEFAULT_GUARD, PinGuard, assignSeats, isCode, isPin, makeCode, makePin, normalizeCode } from "../../src/domain/studentAuth";

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
  const at = (g: PinGuard, seat: string, ip: string, now: number, cls = "ABCDEF") => g.attempt(`${cls}:${seat}`, ip, cls, now);
  const retry = (r: ReturnType<PinGuard["attempt"]>) => (r.ok ? 0 : r.retryAfterMs);

  it("10 lượt đồng bộ liên tiếp cho một số thứ tự: lượt thứ 6 bị chặn", () => {
    const g = new PinGuard();
    const rs = Array.from({ length: 10 }, () => at(g, "7", "ip:1", 1000));
    expect(rs.map((r) => r.ok)).toEqual([true, true, true, true, true, false, false, false, false, false]);
    expect(retry(rs[5]!)).toBe(600_000);
    expect(at(g, "8", "ip:1", 1000).ok).toBe(true);
  });
  it("hết 10 phút thì mở khoá; lần sai cũ quá cửa sổ không tính", () => {
    const g = new PinGuard();
    for (let i = 0; i < 5; i++) at(g, "7", "ip:1", 0);
    expect(at(g, "7", "ip:1", 599_999).ok).toBe(false);
    expect(at(g, "7", "ip:1", 600_000).ok).toBe(true);
    const h = new PinGuard();
    for (let i = 0; i < 4; i++) at(h, "k", "ip", 0);
    expect(at(h, "k", "ip", 600_001).ok).toBe(true);
    expect(at(h, "k", "ip", 600_001).ok).toBe(true);
  });
  it("đúng PIN rút lần ghi: không tiêu hạn mức IP, xoá đếm số thứ tự", () => {
    const g = new PinGuard();
    for (let i = 0; i < 29; i++) {
      const r = at(g, String(i), "ip:9", i);
      if (r.ok) g.success(r.token);
    }
    // 29 đăng nhập đúng không chạm hạn mức IP 30: lượt sai kế tiếp vẫn được thử
    for (let i = 0; i < 29; i++) expect(at(g, "x" + i, "ip:9", 100 + i).ok).toBe(true);
    const h = new PinGuard();
    for (let i = 0; i < 4; i++) at(h, "7", "ip:2", 0);
    const r = at(h, "7", "ip:2", 1);
    expect(r.ok).toBe(true);
    if (r.ok) h.success(r.token);
    expect(at(h, "7", "ip:2", 2).ok).toBe(true);
    expect(h.lockedFor(["ABCDEF:7"], 3)).toBe(0);
  });
  it("khoá theo IP sau 30 lần thử ở nhiều số thứ tự", () => {
    const g = new PinGuard();
    for (let i = 0; i < 30; i++) at(g, String(i), "ip:9", i, `C${i}`);
    const r = at(g, "99", "ip:9", 31, "Z");
    expect(r.ok).toBe(false);
    expect(retry(r)).toBeGreaterThan(0);
    g.prune(10_000_000);
    expect(at(g, "99", "ip:9", 10_000_000, "Z").ok).toBe(true);
  });
  it("tổng hợp theo lớp: 200 lượt / 60 phút khoá PIN cả lớp 10 phút", () => {
    const g = new PinGuard();
    for (let i = 0; i < 200; i++) at(g, String(i), `ip:${i}`, i * 1000);
    const r = at(g, "500", "ip:new", 200_000);
    expect(r.ok).toBe(false);
    expect(retry(r)).toBeGreaterThan(590_000);
    expect(at(g, "500", "ip:new", 200_000, "OTHER1").ok).toBe(true);
    expect(at(g, "500", "ip:new", 199_000 + 600_001).ok).toBe(true);
  });
  it("đúng PIN trong lúc đang khoá vẫn bị từ chối (không có token để success)", () => {
    const g = new PinGuard();
    for (let i = 0; i < 5; i++) at(g, "7", "ip:1", 0);
    const r = at(g, "7", "ip:1", 1000); // người dùng gõ đúng PIN nhưng chưa tới bước kiểm
    expect(r.ok).toBe(false);
    expect(g.lockedFor(["ABCDEF:7"], 1000)).toBe(600 - 1);
  });
  it("trần bộ nhớ: vượt maxKeys thì bỏ khoá cũ nhất", () => {
    const g = new PinGuard({ ...DEFAULT_GUARD, maxKeys: 30 });
    for (let i = 0; i < 100; i++) at(g, String(i), `ip:${i}`, i, `C${i}`);
    expect(g.size).toBeLessThanOrEqual(30);
    // khoá của khoá mới nhất còn nguyên
    for (let i = 0; i < 5; i++) at(g, "z", "ip:z", 200, "Cz");
    expect(at(g, "z", "ip:z", 201, "Cz").ok).toBe(false);
  });
});
