import { describe, expect, it } from "vitest";
import { colPath, vnShort } from "../src/ui/charts/core";
import { initials } from "../src/ui/components/Avatar";
import { fold } from "../src/ui/components/focus";
import { nextSort, pageItems, parseSort } from "../src/ui/components/Table";
import { ICON_NAMES } from "../src/ui/iconNames";

describe("ui: bảng", () => {
  it("sắp xếp xoay vòng tăng → giảm → bỏ, đúng cú pháp ?sap=", () => {
    expect(nextSort(null, "ten")).toBe("ten");
    expect(nextSort("ten", "ten")).toBe("-ten");
    expect(nextSort("-ten", "ten")).toBeNull();
    expect(nextSort("-ten", "diem")).toBe("diem");
    expect(parseSort("-ti-le")).toEqual({ key: "ti-le", dir: "descending" });
  });
  it("dải trang có …", () => {
    expect(pageItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageItems(5, 12)).toEqual([1, "…", 4, 5, 6, "…", 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, "…", 12]);
    expect(pageItems(12, 12)).toEqual([1, "…", 11, 12]);
  });
});

describe("ui: chữ", () => {
  it("viết tắt tên Việt", () => {
    expect(initials("Nguyễn Minh Anh")).toBe("MA");
    expect(initials("Cô Lan Anh")).toBe("LA");
    expect(initials("Đức")).toBe("Đ");
    expect(initials("")).toBe("?");
  });
  it("tìm không dấu", () => {
    expect(fold("Lớp 10A1 · Đề thi")).toBe("lop 10a1 · de thi");
  });
  it("số Việt gọn", () => {
    expect(vnShort(6.5)).toBe("6,5");
    expect(vnShort(7)).toBe("7");
    expect(vnShort(0)).toBe("0");
  });
});

describe("ui: biểu đồ + icon", () => {
  it("cột bo đầu, đáy vuông; cột thấp hơn bán kính không vỡ hình", () => {
    expect(colPath(0, 10, 20, 30)).toBe("M0,40V14Q0,10 4,10H16Q20,10 20,14V40Z");
    expect(colPath(0, 10, 20, 2)).toBe("M0,12V12Q0,10 2,10H18Q20,10 20,12V12Z");
  });
  it("sprite có đủ icon thành phần dùng", () => {
    for (const n of ["check", "x", "alert", "offline", "refresh", "search", "stop", "ok", "err", "info", "left", "right", "sort", "up", "dn", "inbox", "arrowl", "chevl"]) expect(ICON_NAMES).toContain(n);
  });
});
