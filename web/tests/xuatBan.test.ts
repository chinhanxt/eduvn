import { describe, expect, it } from "vitest";
import { etaText, sizeText } from "../src/xuat-ban/pure";

describe("Xuất bản — hàm thuần", () => {
  it("dung lượng tệp dễ đọc", () => {
    expect(sizeText(undefined)).toBe("");
    expect(sizeText(300)).toBe("1 KB");
    expect(sizeText(48_000)).toBe("48 KB");
    expect(sizeText(2_450_000)).toBe("2,5 MB");
  });
  it("thời gian còn lại", () => {
    expect(etaText(undefined)).toBe("");
    expect(etaText(0)).toBe("còn khoảng 1 giây");
    expect(etaText(42)).toBe("còn khoảng 42 giây");
    expect(etaText(190)).toBe("còn khoảng 3 phút");
  });
});
