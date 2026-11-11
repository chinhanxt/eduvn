import { describe, expect, it } from "vitest";
import { matchSeat, seatFromSbd } from "../../src/domain/seatMatch";

const roster = [
  { id: "a", fullName: "Nguyễn Văn An", seat: 1 },
  { id: "b", fullName: "Trần Thị Bình", seat: 12 },
  { id: "c", fullName: "Lê Chi", seat: null },
];

describe("ghép SBD ↔ số thứ tự HS", () => {
  it("đọc số SBD", () => {
    expect(seatFromSbd("000012")).toBe(12);
    expect(seatFromSbd("")).toBeNull();
    expect(seatFromSbd("00?012")).toBeNaN();
    expect(seatFromSbd("000000")).toBeNaN();
  });
  it("khớp / trống / lỗi tô / không có trong lớp", () => {
    expect(matchSeat(roster, "000012")).toEqual({ status: "ok", student: roster[1] });
    expect(matchSeat(roster, "1")).toMatchObject({ status: "ok", student: { id: "a" } });
    expect(matchSeat(roster, "")).toEqual({ status: "blank" });
    expect(matchSeat(roster, "0?0001")).toEqual({ status: "unreadable" });
    expect(matchSeat(roster, "000007")).toEqual({ status: "none", seat: 7 });
  });
});
