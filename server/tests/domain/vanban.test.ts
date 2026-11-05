import { describe, expect, it } from "vitest";
import { canCuLines, chucVuLines, formatNgay, noiNhanLines, numberHeadings, soKyHieu, validateVanBan } from "../../src/domain/vanban";
import { renderVanBanDocx } from "../../src/export/vanban";
import { bienBan, congVan, keHoach } from "../helpers/vanban";

const ok = (x: unknown) => {
  const r = validateVanBan(x);
  if (!r.ok) throw new Error(r.issues.join("\n"));
  return r.doc;
};
const issues = (x: unknown) => {
  const r = validateVanBan(x);
  return r.ok ? [] : r.issues;
};

describe("văn bản NĐ30: thể thức", () => {
  it("số ký hiệu, ngày và nơi nhận theo loại", () => {
    const kh = ok(keHoach());
    expect(soKyHieu(kh)).toBe("Số: 45/KH-THPTND");
    expect(formatNgay(kh)).toBe("TP. Hồ Chí Minh, ngày 05 tháng 11 năm 2026");
    expect(noiNhanLines(kh)).toEqual(["- Sở GD&ĐT (để báo cáo);", "- Các tổ chuyên môn;", "- Lưu: VT."]);
    const cv = ok(congVan());
    expect(soKyHieu(cv)).toBe("Số: …/THPTND-VP");
    expect(formatNgay(cv)).toBe("TP. Hồ Chí Minh, ngày … tháng … năm …");
    expect(soKyHieu(ok(keHoach({ loai: "quyet_dinh", so: "7" })))).toBe("Số: 07/QĐ-THPTND");
    expect(soKyHieu(ok(keHoach({ loai: "quyet_dinh", so: "05" })))).toBe("Số: 05/QĐ-THPTND");
    expect(soKyHieu(ok(keHoach({ loai: "quyet_dinh", so: 9 })))).toBe("Số: 09/QĐ-THPTND");
    expect(soKyHieu(ok(keHoach({ loai: "quyet_dinh", so: "123" })))).toBe("Số: 123/QĐ-THPTND");
    expect(formatNgay(ok(keHoach({ ngay: "2026-02-05" })))).toContain("ngày 05 tháng 02 năm 2026");
    expect(formatNgay(ok(keHoach({ ngay: "2026-05-15" })))).toContain("ngày 15 tháng 5 năm 2026");
    expect(soKyHieu(ok(keHoach({ loai: "to_trinh", kinh_gui: ["Sở"] })))).toBe("Số: 45/TTr-THPTND");
    expect(noiNhanLines(ok(keHoach({ noi_nhan: ["A"] })))).toEqual(["- A;", "- Lưu: VT."]);
  });

  it("đánh số mục I./1./a), căn cứ, quyền hạn ký", () => {
    const kh = ok(keHoach());
    expect(numberHeadings(kh.noi_dung).filter(Boolean)).toEqual(["I.", "1.", "2.", "II.", "1.", "a)", "b)", "III."]);
    expect(canCuLines(kh)).toEqual(["Căn cứ Kế hoạch giáo dục nhà trường năm học 2026–2027;", "Căn cứ Công văn số 1234/SGDĐT-GDTrH ngày 01/10/2026 của Sở GD&ĐT."]);
    expect(chucVuLines(ok(keHoach({ chuc_vu_ky: "PHÓ HIỆU TRƯỞNG", quyen_han: "KT.", chuc_vu_cap_tren: "HIỆU TRƯỞNG" })))).toEqual(["KT. HIỆU TRƯỞNG", "PHÓ HIỆU TRƯỞNG"]);
    expect(chucVuLines(ok(keHoach({ quyen_han: "Q." })))).toEqual(["Q. HIỆU TRƯỞNG"]);
  });

  it("công văn bỏ 'V/v' thừa ở trích yếu", () => {
    expect(ok(congVan({ trich_yeu: "V/v Đề nghị cử cán bộ" })).trich_yeu).toBe("Đề nghị cử cán bộ");
  });
});

describe("văn bản NĐ30: kiểm tra", () => {
  it("văn bản đủ thì hợp lệ", () => {
    for (const x of [keHoach(), congVan(), bienBan()]) expect(issues(x)).toEqual([]);
  });

  it("biên bản thiếu thời gian, địa điểm, thành phần", () => {
    const i = issues(bienBan({ thoi_gian: "", dia_diem: undefined, thanh_phan: [] }));
    expect(i).toEqual(expect.arrayContaining(["Biên bản thiếu thời gian (thoi_gian)", "Biên bản thiếu địa điểm (dia_diem)", "Biên bản thiếu thành phần tham dự (thanh_phan)"]));
    expect(issues(bienBan({ thu_ky: "", chu_tri: undefined }))).toEqual(["Biên bản thiếu họ tên thư ký (thu_ky)", "Biên bản thiếu họ tên chủ trì/chủ tọa (chu_tri)"]);
    expect(ok(bienBan()).vai_tro_chu_tri).toBe("CHỦ TRÌ");
    expect(ok(bienBan({ vai_tro_chu_tri: "CHỦ TỌA" })).vai_tro_chu_tri).toBe("CHỦ TỌA");
  });

  it("công văn cần trích yếu và kính gửi; quyết định cần căn cứ", () => {
    const i = issues(congVan({ trich_yeu: "", kinh_gui: [] }));
    expect(i).toContain('Công văn thiếu trích yếu "V/v" (trich_yeu)');
    expect(i).toContain('Công văn thiếu nơi nhận chính "Kính gửi" (kinh_gui)');
    expect(issues(keHoach({ loai: "quyet_dinh", can_cu: [] }))).toContain("Quyết định thiếu các căn cứ ban hành (can_cu)");
  });

  it("thiếu nơi nhận, người ký, chức vụ", () => {
    const i = issues(keHoach({ noi_nhan: [], nguoi_ky: "", chuc_vu_ky: "" }));
    expect(i).toEqual(expect.arrayContaining(["Thiếu nơi nhận (noi_nhan)", "Thiếu họ tên người ký (nguoi_ky)", "Thiếu chức vụ người ký (chuc_vu_ky)"]));
  });

  it("khoá lạ, loại sai, ngày sai, quyền hạn thiếu cấp trên, khối sai", () => {
    expect(issues(keHoach({ foo: 1 }))[0]).toContain("Khoá không hợp lệ: foo");
    expect(issues(keHoach({ loai: "abc" }))[0]).toContain("loại văn bản: không hợp lệ, chỉ nhận thong_bao");
    expect(issues(keHoach({ ngay: "05/11/2026" }))[0]).toContain("ngay phải là ngày ISO");
    expect(issues(keHoach({ quyen_han: "KT." }))[0]).toContain("cần chuc_vu_cap_tren");
    expect(issues(keHoach({ noi_dung: [{ cap: 4, tieu_de: "x" }, { x: 1 }, 5] }))).toHaveLength(3);
    expect(issues(keHoach({ so: "abc" }))[0]).toContain("so phải là số nguyên");
  });
});

describe("văn bản NĐ30: .docx", () => {
  it("dựng được file docx", async () => {
    for (const x of [keHoach(), congVan(), bienBan()]) expect((await renderVanBanDocx(ok(x))).subarray(0, 2).toString()).toBe("PK");
  });
});
