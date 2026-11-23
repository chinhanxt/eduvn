import { describe, expect, it } from "vitest";
import { balanceEquation, checkStudentBalance, evaluateBalance } from "../../../src/subjects/hoa/balancer";

/** ≥ 36 phương trình kiểm thử: cơ bản, ngoặc phức, hydrat, oxi hoá – khử khó, phương trình ion thu gọn, bán phản ứng e⁻. */
const EQUATION_CASES: readonly [string, string, number[]][] = [
  // 1–8: Cơ bản THCS & THPT
  ["H2 + O2 -> H2O", "tổng hợp nước", [2, 1, 2]],
  ["Fe + O2 -> Fe3O4", "sắt cháy trong oxygen", [3, 2, 1]],
  ["Fe + Cl2 -> FeCl3", "sắt tác dụng chlorine", [2, 3, 2]],
  ["Al + HCl -> AlCl3 + H2", "nhôm tác dụng HCl", [2, 6, 2, 3]],
  ["KClO3 -> KCl + O2", "nhiệt phân KClO3", [2, 2, 3]],
  ["N2 + H2 ⇌ NH3", "tổng hợp ammonia thuận nghịch", [1, 3, 2]],
  ["C3H8 + O2 -> CO2 + H2O", "đốt cháy propane", [1, 5, 3, 4]],
  ["C4H10 + O2 -> CO2 + H2O", "đốt cháy butane", [2, 13, 8, 10]],
  // 9–14: Ngoặc lồng & kết tủa / hydrat
  ["Al2(SO4)3 + Ba(OH)2 -> Al(OH)3 + BaSO4", "trao đổi ngoặc đôi", [1, 3, 2, 3]],
  ["Ca3(PO4)2 + H2SO4 -> CaSO4 + H3PO4", "điều chế H3PO4", [1, 3, 3, 2]],
  ["Fe2(SO4)3 + NaOH -> Fe(OH)3 + Na2SO4", "kết tủa Fe(OH)3", [1, 6, 2, 3]],
  ["CuSO4.5H2O -> CuSO4 + H2O", "tách nước tinh thể ngậm nước", [1, 1, 5]],
  ["Na2CO3·10H2O + HCl -> NaCl + CO2 + H2O", "hydrat tác dụng acid", [1, 2, 2, 1, 11]],
  ["FeCl3 + K4[Fe(CN)6] -> Fe4[Fe(CN)6]3 + KCl", "phức chất ngoặc vuông lồng ngoặc tròn", [4, 3, 1, 12]],
  // 15–26: Phản ứng oxi hoá – khử THPT
  ["Cu + HNO3 -> Cu(NO3)2 + NO + H2O", "Cu + HNO3 loãng", [3, 8, 3, 2, 4]],
  ["Cu + HNO3 -> Cu(NO3)2 + NO2 + H2O", "Cu + HNO3 đặc", [1, 4, 1, 2, 2]],
  ["Fe3O4 + HNO3 -> Fe(NO3)3 + NO + H2O", "Fe3O4 + HNO3 loãng", [3, 28, 9, 1, 14]],
  ["Al + HNO3 -> Al(NO3)3 + NH4NO3 + H2O", "Al + HNO3 ra NH4NO3", [8, 30, 8, 3, 9]],
  ["Mg + HNO3 -> Mg(NO3)2 + N2O + H2O", "Mg + HNO3 ra N2O", [4, 10, 4, 1, 5]],
  ["Zn + H2SO4 -> ZnSO4 + H2S + H2O", "Zn + H2SO4 đặc ra H2S", [4, 5, 4, 1, 4]],
  ["KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O", "điều chế Cl2 trong PTN", [2, 16, 2, 2, 5, 8]],
  ["K2Cr2O7 + HCl -> KCl + CrCl3 + Cl2 + H2O", "dichromate + HCl", [1, 14, 2, 2, 3, 7]],
  ["KMnO4 + FeSO4 + H2SO4 -> K2SO4 + MnSO4 + Fe2(SO4)3 + H2O", "chuẩn độ Fe(II) bằng KMnO4", [2, 10, 8, 1, 2, 5, 8]],
  ["FeS2 + O2 -> Fe2O3 + SO2", "đốt quặng pyrite", [4, 11, 2, 8]],
  ["Cl2 + KOH -> KCl + KClO3 + H2O", "tự oxi hoá – khử Cl2 trong kiềm nóng", [3, 6, 5, 1, 3]],
  ["KMnO4 + K2SO3 + H2SO4 -> MnSO4 + K2SO4 + H2O", "KMnO4 + sulfite", [2, 5, 3, 2, 6, 3]],
  ["P + HNO3 + H2O -> H3PO4 + NO", "phosphorus + HNO3 loãng", [3, 5, 2, 3, 5]],
  ["As2S3 + HNO3 + H2O -> H3AsO4 + H2SO4 + NO", "oxi hoá – khử 3 nguyên tố thay đổi số oxi hoá", [3, 28, 4, 6, 9, 28]],
  ["K2Cr2O7 + FeSO4 + H2SO4 -> Cr2(SO4)3 + Fe2(SO4)3 + K2SO4 + H2O", "dichromate + FeSO4", [1, 6, 7, 1, 3, 1, 7]],
  ["C6H12O6 + [Ag(NH3)2]OH -> C6H11O7NH4 + Ag + NH3 + H2O", "phản ứng tráng bạc glucose với thuốc thử Tollens (CTGDPT 2018)", [1, 2, 1, 2, 3, 1]],
  // 31–38: Phương trình ion thu gọn & bán phản ứng
  ["MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O", "ion: permanganate + Fe2+ môi trường acid", [1, 5, 8, 1, 5, 4]],
  ["Cr2O7^2- + Fe2+ + H+ -> Cr3+ + Fe3+ + H2O", "ion: dichromate + Fe2+", [1, 6, 14, 2, 6, 7]],
  ["Cr2O7^2- + I- + H+ -> Cr3+ + I2 + H2O", "ion: dichromate + iodide", [1, 6, 14, 2, 3, 7]],
  ["MnO4- + C2O4^2- + H+ -> Mn2+ + CO2 + H2O", "ion: permanganate + oxalate", [2, 5, 16, 2, 10, 8]],
  ["Cu + H+ + NO3- -> Cu2+ + NO + H2O", "ion: đồng tan trong H+/NO3-", [3, 8, 2, 3, 2, 4]],
  ["MnO4- + H+ + e- -> Mn2+ + H2O", "bán phản ứng khử MnO4-", [1, 8, 5, 1, 4]],
  ["Cr2O7^2- + H+ + e- -> Cr3+ + H2O", "bán phản ứng khử Cr2O7^2-", [1, 14, 6, 2, 7]],
  ["Zn + NO3- + OH- + H2O -> [Zn(OH)4]^2- + NH3", "ion phức trong môi trường kiềm", [4, 1, 7, 6, 4, 1]],
];

describe("Cân bằng phương trình hoá học tất định (đại số tuyến tính ℚ)", () => {
  it(`cân bằng chính xác và tối giản cả ${EQUATION_CASES.length} phương trình (≥ 30, gồm oxi hoá – khử & ion)`, () => {
    expect(EQUATION_CASES.length).toBeGreaterThanOrEqual(30);
    for (const [eq, note, expected] of EQUATION_CASES) {
      const res = balanceEquation(eq);
      expect(res.ok, `Thất bại ở "${eq}" (${note}): ${res.ok ? "" : res.error}`).toBe(true);
      if (!res.ok) continue;
      expect(res.coefficients, `Hệ số sai ở "${eq}" (${note})`).toEqual(expected);
      // Tự kiểm lại bằng hàm evaluateBalance độc lập
      const check = evaluateBalance(res.parsed, res.leftCoeffs, res.rightCoeffs);
      expect(check.allBalanced, `Bảo toàn nguyên tử/điện tích sai ở "${eq}"`).toBe(true);
      expect(check.isMinimal, `Hệ số chưa tối giản ở "${eq}"`).toBe(true);
    }
  });

  it("hỗ trợ ký hiệu trạng thái (s)/(l)/(g)/(aq), chỉ số Unicode và mũi tên → / ⇌", () => {
    const res = balanceEquation("CaCO₃(s) + HCl(aq) → CaCl₂(aq) + CO₂(g)↑ + H₂O(l)");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.coefficients).toEqual([1, 2, 1, 1, 1]);
      expect(res.balancedUnicode).toContain("CaCO₃(s)");
      expect(res.balancedUnicode).toContain("2HCl(aq)");
    }
  });

  it("báo lỗi rõ ràng khi thiếu nguyên tố, phương trình bất khả thi hoặc vô số nghiệm độc lập", () => {
    const missing = balanceEquation("Fe + O2 -> CuO");
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.code).toBe("missing_element");
      expect(missing.missingRight).toContain("Fe");
      expect(missing.missingLeft).toContain("Cu");
    }

    const badCharge = balanceEquation("Fe2+ -> Fe3+");
    expect(badCharge.ok).toBe(false);

    // Hai phản ứng độc lập (phân huỷ H2O2 + khử KMnO4) → bậc tự do > 1
    const ambig = balanceEquation("KMnO4 + H2O2 + H2SO4 -> K2SO4 + MnSO4 + O2 + H2O");
    expect(ambig.ok).toBe(false);
    if (!ambig.ok) expect(ambig.code).toBe("ambiguous");
  });

  it("checkStudentBalance báo chính xác nguyên tố bị lệch, điện tích lệch và hệ số chưa tối giản", () => {
    const wrong = checkStudentBalance("Fe + O2 -> Fe3O4", [1, 2, 1]);
    expect(wrong.ok).toBe(false);
    expect(wrong.imbalancedElements.map((e) => e.element)).toEqual(["Fe"]);
    expect(wrong.imbalancedElements[0]).toMatchObject({ element: "Fe", left: 1, right: 3, diff: -2 });
    expect(wrong.hint).toContain("Fe");

    const notMin = checkStudentBalance("H2 + O2 -> H2O", [4, 2, 4]);
    expect(notMin.ok).toBe(false);
    expect(notMin.balanced).toBe(true);
    expect(notMin.minimal).toBe(false);
    expect(notMin.gcd).toBe(2);

    const ionicWrong = checkStudentBalance("MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O", [1, 1, 8, 1, 1, 4]);
    expect(ionicWrong.ok).toBe(false);
    expect(ionicWrong.charge.balanced).toBe(false);
    expect(ionicWrong.charge.left).toBe(9);
    expect(ionicWrong.charge.right).toBe(5);

    const ionicRight = checkStudentBalance("MnO4- + Fe2+ + H+ -> Mn2+ + Fe3+ + H2O", [1, 5, 8, 1, 5, 4]);
    expect(ionicRight.ok).toBe(true);
    expect(ionicRight.charge.left).toBe(17);
    expect(ionicRight.charge.right).toBe(17);
  });
});
