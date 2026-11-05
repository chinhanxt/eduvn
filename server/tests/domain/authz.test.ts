import { describe, expect, it } from "vitest";
import { ACTIONS, ForbiddenError, assertCan, can } from "../../src/domain/authz";

describe("authz", () => {
  it("owner và admin làm được mọi thứ", () => {
    for (const a of ACTIONS) {
      expect(can("owner", a)).toBe(true);
      expect(can("admin", a)).toBe(true);
    }
  });

  it("teacher: dạy học được, không quản lý thành viên/tổ chức", () => {
    expect(can("teacher", "question:write")).toBe(true);
    expect(can("teacher", "exam:create")).toBe(true);
    expect(can("teacher", "member:manage")).toBe(false);
    expect(can("teacher", "org:manage")).toBe(false);
  });

  it("assistant: xem, chấm; không soạn, không ra đề", () => {
    expect(can("assistant", "exam:grade")).toBe(true);
    expect(can("assistant", "exam:read_key")).toBe(true);
    expect(can("assistant", "question:write")).toBe(false);
    expect(can("assistant", "exam:create")).toBe(false);
  });

  it("student: không có quyền nào ở P1", () => {
    for (const a of ACTIONS) expect(can("student", a)).toBe(false);
  });

  it("assertCan ném ForbiddenError có tên vai trò", () => {
    expect(() => assertCan("student", "exam:read_key")).toThrow(ForbiddenError);
    expect(() => assertCan("student", "exam:read_key")).toThrow(/student/);
    expect(() => assertCan("teacher", "exam:create")).not.toThrow();
  });
});
