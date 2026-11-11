import { describe, expect, it } from "vitest";
import { matchSeat, seatLabel } from "../src/omr/seat";

const ro = [{ id: "a", fullName: "Nguyễn An", seat: 3 }, { id: "b", fullName: "Lê Bình", seat: null }];
describe("ghép SBD trên phiếu", () => {
  it("khớp số thứ tự, báo rõ khi không khớp", () => {
    expect(matchSeat(ro, "000003")).toMatchObject({ status: "ok", student: { id: "a" } });
    expect(seatLabel(matchSeat(ro, "000003"))).toBe("3 · Nguyễn An");
    expect(matchSeat(ro, "")).toEqual({ status: "blank" });
    expect(matchSeat(ro, "00?003").status).toBe("unreadable");
    expect(seatLabel(matchSeat(ro, "000009"))).toBe("Lớp không có số 9");
  });
});
