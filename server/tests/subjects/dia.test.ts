import { statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createVerifier } from "../../src/auth/verify";
import { scoreItem } from "../../src/domain/scoring";
import { buildApp } from "../../src/http/app";
import {
  buildDeterministicCommentary,
  calcBienDoNhiet,
  calcCanCanXnk,
  calcGiaTangTuNhien,
  calcLuongMuaNam,
  calcMatDoDanSo,
  calcNangSuatTaHa,
  calcTiTrong,
  calcTocDoTangTruong,
  gradeDiaCalculation,
  suggestChartType,
} from "../../src/subjects/dia/calc";
import { DIA_PRESET_TABLES, GEO_DATA_DIR, GEO_LAYERS, loadGeoLayer } from "../../src/subjects/dia/geoData";
import {
  buildCalcQuestion,
  buildChartChoiceQuestion,
  sampleDiaQuestions,
  verifyGeneratedDiaQuestion,
} from "../../src/subjects/dia/questions";
import {
  extractNumbersFromText,
  verifyDiaChart,
  verifyGeoSovereignty,
  verifyNumbersFromSource,
  verifyStructure100,
  verifyYearAxisSpacing,
} from "../../src/subjects/dia/verify";
import { testDb } from "../helpers/db";
import { AUDIENCE, ISSUER, makeIssuer } from "../helpers/tokens";

describe("Gói Địa lí — Lớp nền bản đồ TopoJSON & Chủ quyền lãnh thổ", () => {
  it("tổng dung lượng toàn bộ thư mục geo ≤ 3 MB và có đủ 5 tệp bắt buộc", () => {
    let total = 0;
    for (const file of Object.values(GEO_LAYERS)) {
      const st = statSync(path.join(GEO_DATA_DIR, file));
      expect(st.size, file).toBeGreaterThan(1000);
      total += st.size;
    }
    expect(total).toBeLessThanOrEqual(3 * 1024 * 1024);
  });

  it("vn34.topo.json có đúng 34 tỉnh/thành sau 01/07/2025 kèm Hoàng Sa (Đà Nẵng) và Trường Sa (Khánh Hòa)", () => {
    const vn34 = loadGeoLayer("vn34") as {
      objects: {
        provinces: { geometries: Array<{ id: string; properties: Record<string, unknown> }> };
        islands: { geometries: Array<{ id: string; properties: Record<string, unknown> }> };
      };
    };
    expect(vn34.objects.provinces.geometries).toHaveLength(34);
    expect(verifyGeoSovereignty(vn34).ok).toBe(true);
    const dn = vn34.objects.provinces.geometries.find((g) => g.id === "da-nang");
    const kh = vn34.objects.provinces.geometries.find((g) => g.id === "khanh-hoa");
    expect(String(dn?.properties.quanDao)).toContain("Hoàng Sa");
    expect(String(kh?.properties.quanDao)).toContain("Trường Sa");
  });

  it("vn63.topo.json có đúng 63 tỉnh/thành Atlat cũ và khẳng định Hoàng Sa, Trường Sa", () => {
    const vn63 = loadGeoLayer("vn63") as { objects: { provinces: { geometries: unknown[] } } };
    expect(vn63.objects.provinces.geometries).toHaveLength(63);
    expect(verifyGeoSovereignty(vn63).ok).toBe(true);
  });

  it("ne_vnm_admin0.topo.json có Việt Nam kèm Hoàng Sa, Trường Sa", () => {
    const ne = loadGeoLayer("ne_vnm_admin0") as { objects: { countries: { geometries: Array<{ id: string }> } } };
    expect(ne.objects.countries.geometries.some((g) => g.id === "VNM")).toBe(true);
    expect(verifyGeoSovereignty(ne).ok).toBe(true);
  });

  it("dia-danh.json có đủ thành phố, núi, đèo, cửa khẩu, đảo (Hoàng Sa, Trường Sa) và 100% mục có nguồn", () => {
    const dd = loadGeoLayer("dia-danh") as { diaDanh: Array<{ id: string; loai: string; nguon?: string }> };
    const kinds = new Set(dd.diaDanh.map((p) => p.loai));
    for (const req of ["thanh-pho", "nui", "deo", "cua-khau", "dao"]) expect(kinds.has(req), req).toBe(true);
    expect(dd.diaDanh.some((p) => p.id === "hoang-sa")).toBe(true);
    expect(dd.diaDanh.some((p) => p.id === "truong-sa")).toBe(true);
    for (const p of dd.diaDanh) {
      expect(typeof p.nguon === "string" && p.nguon.trim().length > 5, p.id).toBe(true);
    }
  });
});

describe("Gói Địa lí — Tự kiểm tất định (P13 Verified)", () => {
  const gdpTable = DIA_PRESET_TABLES.find((t) => t.id === "co-cau-gdp-vn")!.bang;
  const hanoiClimate = DIA_PRESET_TABLES.find((t) => t.id === "nhiet-am-ha-noi")!.bang;

  it("tổng cơ cấu = 100 %: chấp nhận bảng chuẩn và bắt lỗi bảng lệch tổng", () => {
    expect(verifyStructure100(gdpTable).every((d) => d.ok === true)).toBe(true);
    const broken = structuredClone(gdpTable);
    broken.chuoi[0]!.giaTri[1] = 19.0; // làm tổng năm 2015 = 104,5%
    expect(verifyStructure100(broken).some((d) => d.ok === false)).toBe(true);
  });

  it("khoảng cách năm trên trục phải giãn đúng tỉ lệ thật (bắt lỗi chia đều 2010–2015–2018–2023)", () => {
    const years = [2010, 2015, 2018, 2023];
    // Đúng tỉ lệ: (0, 5/13, 8/13, 13/13) trên trục dài 650 px -> [100, 350, 500, 750]
    expect(verifyYearAxisSpacing(years, [100, 350, 500, 750]).ok).toBe(true);
    // Sai: chia đều [100, 316.7, 533.3, 750]
    const bad = verifyYearAxisSpacing(years, [100, 316.7, 533.3, 750]);
    expect(bad.ok).toBe(false);
    expect(bad.label).toContain("2015");
  });

  it("biểu đồ đúng tỉ lệ dữ liệu: bắt lỗi trục cột không bắt đầu từ 0 và cột vẽ sai tỉ lệ", () => {
    const okRes = verifyDiaChart({
      loaiBieuDo: "nhiet-am",
      bang: hanoiClimate,
      trucY: { min: 0, max: 350 },
      trucYPhai: { min: 0, max: 35 },
      tiLeHinh: [
        { chuoiIdx: 0, diemIdx: 0, giaTriDuLieu: 18.6, kichThuocVe: 37.2 },
        { chuoiIdx: 0, diemIdx: 7, giaTriDuLieu: 318.0, kichThuocVe: 636.0 },
      ],
    });
    expect(okRes.status).toBe("verified");

    const badZero = verifyDiaChart({
      loaiBieuDo: "cot",
      bang: gdpTable,
      trucY: { min: 10, max: 60 },
    });
    expect(badZero.status).toBe("mismatch");

    const badScale = verifyDiaChart({
      loaiBieuDo: "cot",
      bang: gdpTable,
      trucY: { min: 0, max: 60 },
      tiLeHinh: [
        { chuoiIdx: 0, diemIdx: 0, giaTriDuLieu: 15.4, kichThuocVe: 250 }, // phóng sai tỉ lệ!
        { chuoiIdx: 0, diemIdx: 3, giaTriDuLieu: 12.0, kichThuocVe: 120 },
      ],
    });
    expect(badScale.status).toBe("mismatch");
  });

  it("số liệu trên màn hình phải có trong nguồn hoặc tính ra được (chặn AI bịa số)", () => {
    const notes = buildDeterministicCommentary(hanoiClimate).join(" ");
    const nums = extractNumbersFromText(notes);
    expect(nums.length).toBeGreaterThan(5);
    expect(verifyNumbersFromSource(hanoiClimate, nums).ok).toBe(true);

    // Chèn một con số bịa đặt không có trong bảng và không tính ra được
    const hallucinated = verifyNumbersFromSource(hanoiClimate, [16.4, 28.9, 987.6]);
    expect(hallucinated.ok).toBe(false);
    expect(hallucinated.measured).toContain("987,6");
  });
});

describe("Gói Địa lí — Tính toán, chấm tất định, chọn dạng biểu đồ và câu hỏi", () => {
  it("tính đúng các công thức chuẩn Địa lí THPT", () => {
    expect(calcTiTrong(355.5, 683.0, 1)).toBe(52.0);
    expect(calcTocDoTangTruong(355.5, 162.0, 1)).toBe(219.4);
    expect(calcMatDoDanSo(8807.523, "nghin_nguoi", 3359.84, "km2", 0)).toBe(2621);
    expect(calcNangSuatTaHa(43500, "nghin_tan", 7119.3, "nghin_ha", 1)).toBe(61.1);
    expect(calcGiaTangTuNhien(14.2, 6.1, 2)).toBe(0.81);
    expect(calcCanCanXnk(355.5, 327.5, 1)).toEqual({ canCan: 28, tongKimNgach: 683, trangThai: "xuất siêu" });

    const hanoi = DIA_PRESET_TABLES.find((t) => t.id === "nhiet-am-ha-noi")!.bang;
    const tStat = calcBienDoNhiet(hanoi.chuoi[1]!.giaTri);
    expect(tStat.max).toBe(28.9);
    expect(tStat.min).toBe(16.4);
    expect(tStat.bienDo).toBe(12.5);
    const rStat = calcLuongMuaNam(hanoi.chuoi[0]!.giaTri);
    expect(rStat.tong).toBeCloseTo(1676.2, 1);
    expect(rStat.thangMua).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it("chấm tất định câu trả lời ngắn của HS (dấu phẩy Việt, có/không đơn vị, bắt lỗi đổi đơn vị)", () => {
    const prob = {
      phepTinh: "mat_do_dan_so" as const,
      danSo: 8807.523,
      donViDanSo: "nghin_nguoi" as const,
      dienTich: 3359.84,
      donViDienTich: "km2" as const,
      lamTron: 0,
    };
    expect(gradeDiaCalculation(prob, "2.621 người/km²").correct).toBe(true);
    expect(gradeDiaCalculation(prob, "2621").correct).toBe(true);
    const forgotUnit = gradeDiaCalculation(prob, "2,62");
    expect(forgotUnit.correct).toBe(false);
    expect(forgotUnit.feedback).toContain("đổi đơn vị");
  });

  it("gợi ý đúng dạng biểu đồ theo quy ước đề thi TN THPT", () => {
    const gdp = DIA_PRESET_TABLES.find((t) => t.id === "co-cau-gdp-vn")!.bang;
    expect(suggestChartType(gdp, "chuyen_dich_co_cau").dangTotNhat).toBe("mien");
    expect(suggestChartType({ ...gdp, nhan: ["2010", "2023"], nam: [2010, 2023], chuoi: gdp.chuoi.map((s) => ({ ...s, giaTri: [s.giaTri[0]!, s.giaTri[3]!] })) }, "co_cau").dangTotNhat).toBe("tron");
    const lua = DIA_PRESET_TABLES.find((t) => t.id === "lua-dien-tich-san-luong")!.bang;
    expect(suggestChartType(lua, "auto").dangTotNhat).toBe("ket-hop");
    const hanoi = DIA_PRESET_TABLES.find((t) => t.id === "nhiet-am-ha-noi")!.bang;
    expect(suggestChartType(hanoi, "auto").dangTotNhat).toBe("nhiet-am");
    const xnk = DIA_PRESET_TABLES.find((t) => t.id === "xnk-viet-nam")!.bang;
    expect(suggestChartType(xnk, "toc_do_tang_truong").dangTotNhat).toBe("duong");
  });

  it("ngân hàng câu hỏi Địa lí tương thích 100% QuestionInput và chấm điểm chuẩn scoring.ts", () => {
    const qs = sampleDiaQuestions();
    expect(qs.length).toBeGreaterThanOrEqual(6);
    const calcQ = buildCalcQuestion({
      grade: 12,
      topic: "Tỉ trọng",
      level: "TH",
      stem: "Tính tỉ trọng 25 trên 100.",
      problem: { phepTinh: "ti_trong", giaTriThanhPhan: 25, tongGiaTri: 100, lamTron: 1 },
    });
    expect(scoreItem(calcQ, "25")).toBeGreaterThan(0);
    expect(scoreItem(calcQ, "25,0")).toBeGreaterThan(0);
    expect(scoreItem(calcQ, "30")).toBe(0);

    const chartQ = buildChartChoiceQuestion({
      grade: 12,
      topic: "Biểu đồ",
      level: "TH",
      bang: DIA_PRESET_TABLES[2]!.bang,
      intent: "chuyen_dich_co_cau",
      yeuCauDeBai: "thể hiện chuyển dịch cơ cấu GDP",
    });
    expect(chartQ.type === "mcq" && chartQ.options[chartQ.answer]).toBe("Biểu đồ miền");

    // Kiểm ghi đè đáp số nếu AI tính sai trong verifyGeneratedDiaQuestion
    const aiWrong = {
      type: "short_answer",
      subject: "Địa lí",
      grade: 12,
      topic: "Tốc độ tăng trưởng",
      level: "VD",
      stem: "Tính tốc độ tăng trưởng từ 200 lên 350.",
      answer: "999", // AI tính sai!
      problem: { phepTinh: "toc_do_tang_truong", giaTriNamSau: 350, giaTriNamGoc: 200, lamTron: 1 },
    };
    const verified = verifyGeneratedDiaQuestion(aiWrong);
    expect(verified.ok).toBe(true);
    expect(verified.question?.type === "short_answer" && verified.question.answer).toBe("175,0");
  });
});

describe("Gói Địa lí — HTTP API /api/dia/*", () => {
  it("trả đúng lớp bản đồ, presets, gợi ý biểu đồ, tự kiểm và chấm tính toán", async () => {
    const db = await testDb();
    const kc = await makeIssuer();
    const app = buildApp({
      db,
      verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
      issuer: ISSUER,
      publicUrl: "http://127.0.0.1:4363",
      downloadSecret: "test-secret-test-secret-test-secret!!",
      studentSecret: "test-student-secret-test-student-secret",
    });

    const rGeo = await app.inject({ method: "GET", url: "/api/dia/geo/vn34" });
    expect(rGeo.statusCode).toBe(200);
    expect(rGeo.json().objects.provinces.geometries).toHaveLength(34);

    const rPresets = await app.inject({ method: "GET", url: "/api/dia/presets" });
    expect(rPresets.statusCode).toBe(200);
    expect(rPresets.json().tables.length).toBeGreaterThanOrEqual(5);

    const rSuggest = await app.inject({
      method: "POST",
      url: "/api/dia/suggest-chart",
      payload: { bang: DIA_PRESET_TABLES[0]!.bang, intent: "auto" },
    });
    expect(rSuggest.statusCode).toBe(200);
    expect(rSuggest.json().suggestion.dangTotNhat).toBe("nhiet-am");
    expect(rSuggest.json().verification.status).toBe("verified");

    const rSov = await app.inject({
      method: "POST",
      url: "/api/dia/verify",
      payload: { checkSovereigntyLayer: "vn34" },
    });
    expect(rSov.statusCode).toBe(200);
    expect(rSov.json().status).toBe("verified");

    const rGrade = await app.inject({
      method: "POST",
      url: "/api/dia/grade-calc",
      payload: {
        problem: { phepTinh: "ti_trong", giaTriThanhPhan: 355.5, tongGiaTri: 683.0, lamTron: 1 },
        response: "52,0 %",
      },
    });
    expect(rGrade.statusCode).toBe(200);
    expect(rGrade.json().correct).toBe(true);

    await app.close();
  });
});
