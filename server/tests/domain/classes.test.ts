import { describe, expect, it } from "vitest";
import { validateComment } from "../../src/domain/comments";
import { DEFAULT_COLUMNS, averageScore, parseAttendance, parseScore, validateColumns } from "../../src/domain/gradebook";
import { parseDob, parseRosterLines, parseRosterSheet, splitDuplicates } from "../../src/domain/roster";

describe("roster", () => {
  it("parse dòng dán TAB và ;", () => {
    const r = parseRosterLines("Họ và tên;Ngày sinh\n1. Nguyễn Văn An;05/03/2010;Nam\nTrần Thị Bình\t2010-12-31\tnữ\tkhá\n\n");
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([
      { fullName: "Nguyễn Văn An", code: null, dob: "2010-03-05", gender: "Nam", note: "" },
      { fullName: "Trần Thị Bình", code: null, dob: "2010-12-31", gender: "Nữ", note: "khá" },
    ]);
  });
  it("báo lỗi tiếng Việt theo dòng", () => {
    const r = parseRosterLines("An;31/02/2010\nBình;;abc");
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toContain("Dòng 1");
    expect(parseDob("1/2/2010")).toBe("2010-02-01");
  });
  it("sheet: tìm dòng tiêu đề + map cột", () => {
    const r = parseRosterSheet([["DANH SÁCH"], [], ["STT", "Mã HS", "Họ và tên", "Ngày sinh", "Giới tính"], ["1", "HS01", "Lê Văn C", "01/01/2010", "Nam"], ["", "", "", "", ""]]);
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual([{ fullName: "Lê Văn C", code: "HS01", dob: "2010-01-01", gender: "Nam", note: "" }]);
    expect(parseRosterSheet([["a", "b"]]).errors[0]).toContain("Họ và tên");
  });
  it("trùng: mã/ngày sinh bỏ qua, trùng tên cảnh báo", () => {
    const ex = [{ fullName: "Nguyễn  An", code: "A1", dob: "2010-01-01" }];
    const mk = (fullName: string, code: string | null, dob: string | null) => ({ fullName, code, dob, gender: null, note: "" });
    const r = splitDuplicates(ex, [mk("nguyễn an", null, null), mk("Nguyễn An", null, "2010-01-01"), mk("Khác", "a1", null), mk("Mới", null, null)]);
    expect(r.accept.map((s) => s.fullName)).toEqual(["nguyễn an", "Mới"]);
    expect(r.warnings).toHaveLength(3);
  });
});

describe("gradebook", () => {
  it("parseScore", () => {
    expect(parseScore("8,5")).toEqual({ ok: true, value: 8.5 });
    expect(parseScore(10)).toEqual({ ok: true, value: 10 });
    expect(parseScore("")).toEqual({ ok: true, value: null });
    for (const bad of [11, -1, "7.25", "abc"]) expect(parseScore(bad).ok).toBe(false);
  });
  it("ĐTB theo hệ số, chỉ khi đủ cột", () => {
    const s = { TX1: 8, TX2: 9, TX3: 7, GK: 8, CK: 9 };
    expect(averageScore(DEFAULT_COLUMNS, s)).toBe(8.4); // (8+9+7+16+27)/8 = 8.375
  });
  it("làm tròn nửa lên", () => {
    expect(averageScore([{ name: "A", weight: 1 }, { name: "B", weight: 2 }], { A: 8, B: 8.5 })).toBe(8.3); // 25/3 = 8.333
    expect(averageScore([{ name: "A", weight: 1 }, { name: "B", weight: 1 }], { A: 8, B: 8.5 })).toBe(8.3); // 8.25 → 8.3
    expect(averageScore(DEFAULT_COLUMNS, { TX1: 8 })).toBeNull();
  });
  it("cột + điểm danh", () => {
    expect(validateColumns([{ name: "TX1", weight: 1 }, { name: "tx1", weight: 1 }])).toHaveLength(1);
    expect(parseAttendance("vắng có phép")).toBe("excused");
    expect(parseAttendance("xyz")).toBeNull();
  });
});

describe("comments", () => {
  const ok = "Em chăm chỉ, tiếp thu nhanh, cần phát huy hơn nữa.";
  it("hợp lệ / lỗi", () => {
    expect(validateComment("TT22", ok, "Tốt")).toEqual([]);
    expect(validateComment("TT27", ok, "Hoàn thành tốt")).toEqual([]);
    expect(validateComment("TT22", "", "Tốt")[0]).toContain("trống");
    expect(validateComment("TT22", "ngắn", "Tốt")[0]).toContain("ngắn");
    expect(validateComment("TT22", "x".repeat(401), "Tốt")[0]).toContain("dài");
    expect(validateComment("TT22", ok, "Hoàn thành")[0]).toContain("Chưa đạt");
  });
});
