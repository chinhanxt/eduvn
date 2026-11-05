import { describe, expect, it } from "vitest";
import { mulberry32, shuffle } from "../../src/domain/rng";

describe("mulberry32", () => {
  it("cùng seed cho cùng dãy số", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("khác seed cho dãy khác", () => {
    expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
  });

  it("giá trị nằm trong [0, 1)", () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("là hoán vị, tái lập theo seed, không sửa mảng gốc", () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = shuffle(src, mulberry32(7));
    const s2 = shuffle(src, mulberry32(7));
    expect(s1).toEqual(s2);
    expect([...s1].sort((x, y) => x - y)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
