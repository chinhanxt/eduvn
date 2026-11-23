import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/http/app";
import { testDb } from "../../helpers/db";
import {
  ELEMENTS,
  PERIODIC_TABLE_SOURCE,
  SAFE_MOLECULES,
  actualFromYield,
  buildBankQuestion,
  checkChemistrySafety,
  dilution,
  electronConfiguration,
  extractEquationsFromText,
  formatFormulaHtml,
  formatFormulaUnicode,
  gasVolumeFromMoles,
  gradeHoaQuestion,
  massFromMoles,
  massPercent,
  matchElectronConfig,
  molarMass,
  molarity,
  molarityFromPercent,
  molesFromGasVolume,
  molesFromMass,
  parseFormula,
  percentFromMolarity,
  reactionYield,
  searchElements,
  solveReactionStoichiometry,
  titrationCurve,
  titrationPh,
  verifyChemistryContent,
} from "../../../src/subjects/hoa";

describe("Bộ phân tích công thức hoá học (ngoặc, hydrat, ion)", () => {
  it("phân tích ngoặc lồng, tinh thể hydrat, ion đa nguyên tử và khối lượng mol", () => {
    const al2so43 = parseFormula("Al2(SO4)3");
    expect(al2so43.atoms).toEqual({ Al: 2, S: 3, O: 12 });
    expect(al2so43.molarMassSgk).toBe(342);

    const hydrate = parseFormula("CuSO4·5H2O");
    expect(hydrate.atoms).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(hydrate.molarMassSgk).toBe(250);
    expect(formatFormulaUnicode(hydrate)).toBe("CuSO₄·5H₂O");

    const prussian = parseFormula("Fe4[Fe(CN)6]3");
    expect(prussian.atoms).toEqual({ Fe: 7, C: 18, N: 18 });

    const alum = parseFormula("KAl(SO4)2.12H2O");
    expect(alum.atoms).toEqual({ K: 1, Al: 1, S: 2, O: 20, H: 24 });
    expect(alum.molarMassSgk).toBe(474);

    const ion1 = parseFormula("Cr2O7^2-");
    expect(ion1.atoms).toEqual({ Cr: 2, O: 7 });
    expect(ion1.charge).toBe(-2);
    expect(formatFormulaUnicode(ion1)).toBe("Cr₂O₇²⁻");

    const ion2 = parseFormula("Fe³⁺");
    expect(ion2.atoms).toEqual({ Fe: 1 });
    expect(ion2.charge).toBe(3);
    expect(formatFormulaHtml(ion2)).toBe("Fe<sup>3+</sup>");

    const electron = parseFormula("e-");
    expect(electron.isElectron).toBe(true);
    expect(electron.charge).toBe(-1);
  });

  it("từ chối ký hiệu nguyên tố không tồn tại hoặc ngoặc hỏng", () => {
    expect(() => parseFormula("Xx2O3")).toThrow(/Không tồn tại nguyên tố/);
    expect(() => parseFormula("Ca(OH2")).toThrow(/Thiếu dấu đóng/);
    expect(() => parseFormula("Al2()3")).toThrow(/Ngoặc rỗng/);
  });
});

describe("Bảng tuần hoàn 118 nguyên tố & Cấu hình electron", () => {
  it("đủ 118 nguyên tố liên tục, có nguồn trích dẫn và tra cứu được cả tên IUPAC 2018 lẫn tên cũ", () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(PERIODIC_TABLE_SOURCE).toContain("IUPAC");
    expect(new Set(ELEMENTS.map((e) => e.z)).size).toBe(118);
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    expect(searchElements("Natri")[0]?.symbol).toBe("Na");
    expect(searchElements("Sodium")[0]?.symbol).toBe("Na");
    expect(searchElements("Lưu huỳnh")[0]?.symbol).toBe("S");
    expect(searchElements("26")[0]?.symbol).toBe("Fe");
  });

  it("tính cấu hình electron đúng cho mọi Z = 1..118, kể cả ngoại lệ Cr/Cu/Pd/Ag/Au và ion Fe2+/Fe3+", () => {
    for (let z = 1; z <= 118; z++) {
      const cfg = electronConfiguration(z);
      const sumSub = cfg.subshells.reduce((s, x) => s + x.electrons, 0);
      const sumShell = cfg.shells.reduce((s, x) => s + x, 0);
      expect(sumSub).toBe(z);
      expect(sumShell).toBe(z);
      expect(cfg.fillSteps).toHaveLength(z);
    }

    expect(electronConfiguration(8).unicode).toBe("1s² 2s² 2p⁴");
    expect(electronConfiguration(8).unpairedElectrons).toBe(2);
    expect(electronConfiguration(24).nobleGasAscii).toBe("[Ar] 3d5 4s1");
    expect(electronConfiguration(24).isException).toBe(true);
    expect(electronConfiguration(29).nobleGasAscii).toBe("[Ar] 3d10 4s1");
    expect(electronConfiguration(29).isException).toBe(true);
    expect(electronConfiguration(46).nobleGasAscii).toBe("[Kr] 4d10");
    // Ion kim loại chuyển tiếp tách e ở 4s trước 3d!
    expect(electronConfiguration(26, 2).nobleGasAscii).toBe("[Ar] 3d6");
    expect(electronConfiguration(26, 3).nobleGasAscii).toBe("[Ar] 3d5");
    expect(electronConfiguration(17, -1).unicode).toBe("1s² 2s² 2p⁶ 3s² 3p⁶");

    expect(matchElectronConfig("[Ar] 3d⁵ 4s¹", 24).ok).toBe(true);
    expect(matchElectronConfig("1s2 2s2 2p6 3s2 3p6 3d5 4s1", 24).ok).toBe(true);
    expect(matchElectronConfig("[Ar] 3d4 4s2", 24).ok).toBe(false);
    expect(matchElectronConfig("[Ar] 3d5 4s1", 24, { requireFull: true }).ok).toBe(false);
  });
});

describe("Tính toán khối lượng mol, số mol, nồng độ, hiệu suất & chuẩn độ pH", () => {
  it("tính đúng mol, khí ở đkc (24,79 L/mol) và đktc (22,4 L/mol), C_M, C%, pha loãng, hiệu suất", () => {
    expect(molarMass("H2SO4", "sgk")).toBe(98);
    expect(molesFromMass(9.8, "H2SO4")).toBeCloseTo(0.1, 6);
    expect(massFromMoles(0.25, "CaCO3")).toBeCloseTo(25, 6);
    expect(molesFromGasVolume(2.479, "dkc")).toBeCloseTo(0.1, 6);
    expect(gasVolumeFromMoles(0.5, "dktc")).toBeCloseTo(11.2, 6);
    expect(molarity(0.5, 0.25)).toBeCloseTo(2, 6);
    expect(massPercent(20, 200)).toBeCloseTo(10, 6);
    expect(molarityFromPercent(36.5, 1.18, "HCl")).toBeCloseTo(11.8, 3);
    expect(percentFromMolarity(11.8, 1.18, "HCl")).toBeCloseTo(36.5, 3);
    expect(dilution({ c1: 2, v1: 0.1, c2: 0.5, v2: null }).v2).toBeCloseTo(0.4, 6);
    expect(reactionYield(40, 50)).toBeCloseTo(80, 6);
    expect(actualFromYield(50, 80)).toBeCloseTo(40, 6);
  });

  it("giải bài toán chất dư/hết + hiệu suất theo phương trình", () => {
    // N2 + 3H2 ⇌ 2NH3: 1 mol N2 + 2,4 mol H2 (H2 hết, extent = 0,8 mol), hiệu suất H = 25% → n(NH3) = 0,4 mol
    const r = solveReactionStoichiometry({
      equation: "N2 + H2 ⇌ NH3",
      given: [
        { formula: "N2", moles: 1 },
        { formula: "H2", moles: 2.4 },
      ],
      yieldPercent: 25,
    });
    expect(r.limitingReagent).toBe("H2");
    expect(r.products[0]?.theoreticalMoles).toBeCloseTo(1.6, 6);
    expect(r.products[0]?.actualMoles).toBeCloseTo(0.4, 6);
    expect(r.products[0]?.actualMassG).toBeCloseTo(6.8, 6);
  });

  it("tính đường cong chuẩn độ acid mạnh – base mạnh và acid yếu – base mạnh chính xác", () => {
    // 25 mL HCl 0,1 M + NaOH 0,1 M → V_td = 25 mL, pH_td = 7,000
    const strong = titrationCurve({ ca: 0.1, vaMl: 25, cb: 0.1 });
    expect(strong.vEqMl).toBe(25);
    expect(strong.phEq).toBeCloseTo(7.0, 2);
    expect(titrationPh({ ca: 0.1, vaMl: 25, cb: 0.1, vbMl: 0 })).toBeCloseTo(1.0, 2);

    // 25 mL CH3COOH 0,1 M (Ka = 1,8e-5) + NaOH 0,1 M → tại nửa điểm tương đương pH = pKa ≈ 4,745; tại điểm tương đương pH > 7 (~8,72)
    const halfPh = titrationPh({ ca: 0.1, vaMl: 25, cb: 0.1, vbMl: 12.5, ka: 1.8e-5 });
    expect(halfPh).toBeCloseTo(-Math.log10(1.8e-5), 1);
    const eqWeak = titrationPh({ ca: 0.1, vaMl: 25, cb: 0.1, vbMl: 25, ka: 1.8e-5 });
    expect(eqWeak).toBeGreaterThan(8.5);
    expect(eqWeak).toBeLessThan(9.0);
  });
});

describe("4 dạng câu hỏi Hoá học, tự kiểm 'Đã kiểm' & an toàn SGK", () => {
  it("chấm tất định cả 4 dạng câu hỏi và tương thích schema QuestionInput", () => {
    const q1 = buildBankQuestion({
      grade: 10,
      topic: "Phản ứng oxi hoá – khử",
      level: "TH",
      stem: "Cân bằng phương trình: Fe + O2 -> Fe3O4",
      meta: { kind: "can_bang", equation: "Fe + O2 -> Fe3O4" },
    });
    expect(q1.type).toBe("short_answer");
    expect(gradeHoaQuestion({ kind: "can_bang", equation: "Fe + O2 -> Fe3O4" }, "3, 2, 1").correct).toBe(true);
    expect(gradeHoaQuestion({ kind: "can_bang", equation: "Fe + O2 -> Fe3O4" }, "2O2 + 3Fe -> Fe3O4").correct).toBe(true);
    expect(gradeHoaQuestion({ kind: "can_bang", equation: "Fe + O2 -> Fe3O4" }, "6, 4, 2").correct).toBe(false);

    expect(
      gradeHoaQuestion({ kind: "mol_nong_do", expectedValue: 2.48, unit: "L", relTol: 0.01, absTol: 0.01 }, "2,479 L").correct,
    ).toBe(true);
    expect(
      gradeHoaQuestion({ kind: "mol_nong_do", expectedValue: 2.48, unit: "L", relTol: 0.01, absTol: 0.01 }, "3,1 L").correct,
    ).toBe(false);

    const q3 = buildBankQuestion({
      grade: 9,
      topic: "Nhận biết dung dịch",
      level: "NB",
      stem: "Thuốc thử nào dùng để phân biệt ba dung dịch HCl, NaOH và NaCl?",
      meta: { kind: "nhan_biet", substances: ["HCl", "NaOH", "NaCl"], reagent: "Quỳ tím" },
      type: "mcq",
      options: ["Quỳ tím", "Dung dịch NaCl", "Nước cất", "Dung dịch KNO₃"],
      answer: 0,
    });
    expect(gradeHoaQuestion({ kind: "nhan_biet", substances: ["HCl", "NaOH", "NaCl"], reagent: "Quỳ tím" }, 0, q3).correct).toBe(true);

    expect(gradeHoaQuestion({ kind: "cau_hinh_e", z: 29, charge: 0, requireFull: false, requireShellOrder: false }, "[Ar] 3d¹⁰ 4s¹").correct).toBe(true);
    expect(gradeHoaQuestion({ kind: "cau_hinh_e", z: 29, charge: 0, requireFull: false, requireShellOrder: false }, "[Ar] 3d9 4s2").correct).toBe(false);
  });

  it("tự kiểm phát hiện phương trình lệch, sai đáp số bài toán, sai cấu hình e và nội dung mất an toàn", () => {
    expect(extractEquationsFromText("Phương trình: 2H2 + O2 -> 2H2O và Fe + Cl2 -> FeCl3")).toHaveLength(2);

    const okRes = verifyChemistryContent({
      text: "Đốt cháy hoàn toàn 5,6 g sắt theo phản ứng: 3Fe + 2O2 -> Fe3O4",
      checks: [
        { type: "stoichiometry_calc", op: "moles_from_mass", formula: "Fe", massG: 5.6, gasCondition: "dkc", mode: "sgk", expected: 0.1, relTol: 0.01, absTol: 0.005 },
        { type: "electron_config", z: 26, charge: 0, stated: "[Ar] 3d6 4s2", requireFull: false },
      ],
    });
    expect(okRes.status).toBe("verified");

    const badEq = verifyChemistryContent({
      text: "Phản ứng chưa cân bằng: Fe + O2 -> Fe3O4",
    });
    expect(badEq.status).toBe("mismatch");

    const badCalc = verifyChemistryContent({
      checks: [
        { type: "reaction_product", equation: "Zn + HCl -> ZnCl2 + H2", given: [{ formula: "Zn", massG: 6.5 }], targetProduct: "H2", quantity: "gasVolumeDkcL", yieldPercent: 100, mode: "sgk", expected: 5.0, relTol: 0.01, absTol: 0.01 },
      ],
    });
    expect(badCalc.status).toBe("mismatch");

    expect(checkChemistrySafety("Hướng dẫn điều chế thuốc nổ TNT tại nhà").safe).toBe(false);
    expect(SAFE_MOLECULES.every((m) => checkChemistrySafety(`${m.nameIupacVi} ${m.description} ${m.safetyNote}`).safe)).toBe(true);
  });
});

describe("HTTP routes /api/hoa/*", () => {
  it("phục vụ đủ endpoint phòng thí nghiệm Hoá và kiểm tra nội dung", async () => {
    const db = await testDb();
    const app = buildApp({
      db,
      verify: async () => ({ sub: "u1", email: "gv@eduvn.local", name: "GV Hoá" }),
      issuer: "http://localhost:8080",
      publicUrl: "http://localhost:4364",
      downloadSecret: "secret-download-key-32-chars-minimum!",
      studentSecret: "secret-student-key-32-chars-minimum!!",
    });

    const r1 = await app.inject({ method: "GET", url: "/api/hoa/bang-tuan-hoan" });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().count).toBe(118);

    const r2 = await app.inject({ method: "POST", url: "/api/hoa/can-bang", payload: { equation: "KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O" } });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().coefficients).toEqual([2, 16, 2, 2, 5, 8]);

    const r3 = await app.inject({ method: "POST", url: "/api/hoa/kiem-tra-can-bang", payload: { equation: "Fe + O2 -> Fe3O4", coefficients: [2, 2, 1] } });
    expect(r3.statusCode).toBe(200);
    expect(r3.json().ok).toBe(false);
    expect(r3.json().imbalancedElements[0].element).toBe("Fe");

    const r4 = await app.inject({ method: "GET", url: "/api/hoa/cau-hinh-electron?z=24" });
    expect(r4.statusCode).toBe(200);
    expect(r4.json().nobleGasAscii).toBe("[Ar] 3d5 4s1");

    const r5 = await app.inject({ method: "GET", url: "/api/hoa/phan-tu" });
    expect(r5.statusCode).toBe(200);
    expect(r5.json().count).toBeGreaterThanOrEqual(20);

    const r6 = await app.inject({ method: "POST", url: "/api/hoa/kiem-tra-noi-dung", payload: { text: "2H2 + O2 -> 2H2O" } });
    expect(r6.statusCode).toBe(200);
    expect(r6.json().status).toBe("verified");

    await app.close();
  });
});
