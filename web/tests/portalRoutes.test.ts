import { describe, expect, it } from "vitest";
import { entryFor, GV_LEGACY, legacyRedirect, portalForRole } from "../src/portal/entries";

describe("bản đồ chuyển hướng đường cũ → cổng mới", () => {
  it.each([
    ["/ngan-hang", "/gv/ngan-hang"],
    ["/de-thi", "/gv/de-thi"],
    ["/cham-bai", "/gv/cham-bai"],
    ["/cham-anh", "/gv/cham-anh"],
    ["/lop-hoc", "/gv/lop-hoc"],
    ["/lop-hoc/abc-123", "/gv/lop-hoc/abc-123"],
    ["/so-diem", "/gv/so-diem"],
    ["/giao-an/42", "/gv/giao-an/42"],
    ["/bang-giang/b1", "/gv/bang-giang/b1"],
    ["/so-do/d9", "/gv/so-do/d9"],
    ["/dau-truong", "/gv/dau-truong"],
    ["/dau-truong/123456", "/gv/dau-truong/123456"],
    ["/dau-truong/phien/s1", "/gv/dau-truong/phien/s1"],
    ["/bai-giang-ai/x", "/gv/bai-giang-ai/x"],
    ["/kho-tri-thuc", "/gv/kho-tri-thuc"],
    ["/ket-noi/", "/gv/ket-noi"],
    ["/hs", "/hoc/hs"],
    ["/hs/qr", "/hoc/hs/qr"],
    ["/hs/bai/e1", "/hoc/hs/bai/e1"],
    ["/hs/ket-qua/s1", "/hoc/hs/ket-qua/s1"],
    ["/gia-su", "/hoc/gia-su"],
    ["/giao-trinh", "/hoc/giao-trinh"],
    ["/gv/hoc/gia-su", "/hoc/gia-su"],
    ["/gv/hs/bai/1", "/hoc/hs/bai/1"],
  ])("%s → %s", (from, to) => expect(legacyRedirect(from)).toBe(to));

  it("mọi trang GV cũ đều có đường mới /gv/…", () => {
    for (const p of GV_LEGACY) expect(legacyRedirect(`/${p}`)).toBe(`/gv/${p}`);
  });

  it("đường mới, /choi, / và đường gần giống không bị chuyển", () => {
    for (const p of ["/", "/choi", "/loi-giai", "/loi-giai/tam-thuc-bac-hai", "/callback", "/gv", "/gv/ngan-hang", "/hoc", "/hoc/gia-su", "/hoc/hs/bai/1", "/ngan-hang-x", "/hsx", "/gvx"]) expect(legacyRedirect(p)).toBeNull();
  });

  it("đường mới đều thuộc đúng entry", () => {
    expect(entryFor(legacyRedirect("/ngan-hang") ?? "")).toBe("gv.html");
    expect(entryFor(legacyRedirect("/hs/bai/1") ?? "")).toBe("hoc.html");
  });
});

describe("entry theo đường dẫn (fallback dev/prod)", () => {
  it.each([
    ["/gv", "gv.html"],
    ["/gv/", "gv.html"],
    ["/gv/bang-giang/1", "gv.html"],
    ["/hoc", "hoc.html"],
    ["/hoc/hs/bai/1", "hoc.html"],
    ["/", "index.html"],
    ["/choi", "index.html"],
    ["/callback", "index.html"],
    ["/gvx", "index.html"],
    ["/hocmai", "index.html"],
  ])("%s → %s", (p, e) => expect(entryFor(p)).toBe(e));
});

describe("chuyển theo vai trò", () => {
  it("owner/admin/teacher/assistant → /gv, còn lại → /hoc", () => {
    for (const r of ["owner", "admin", "teacher", "assistant"]) expect(portalForRole(r)).toBe("/gv");
    for (const r of ["student", "", null, undefined]) expect(portalForRole(r)).toBe("/hoc");
  });
});
