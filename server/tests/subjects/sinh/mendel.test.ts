import { describe, expect, it } from "vitest";
import {
  crossMendel,
  fmtFrac,
  gradeProbabilityAnswer,
  gradeRatioAnswer,
  parseGenotype,
} from "../../../src/subjects/sinh/mendel";

describe("mendel — phép lai Mendel & di truyền tất định", () => {
  it("lai 1 cặp gen đồng hợp AA × aa cho 100% Aa trội hoàn toàn", () => {
    const r = crossMendel("AA", "aa", { traits: { A: { dominant: "Hạt vàng", recessive: "Hạt xanh" } } });
    expect(r.genotypeRatioText).toBe("1");
    expect(r.phenotypeRatioText).toBe("1");
    expect(r.genotypes[0]).toMatchObject({ label: "Aa", percent: 100 });
    expect(r.phenotypes[0]).toMatchObject({ label: "Hạt vàng", percent: 100 });
  });

  it("lai 1 cặp gen dị hợp Aa × Aa cho 1:2:1 kiểu gen và 3:1 kiểu hình", () => {
    const r = crossMendel("Aa", "Aa", { traits: { A: { dominant: "Hạt vàng", recessive: "Hạt xanh" } } });
    expect(r.genotypeCount).toBe(3);
    expect(r.phenotypeCount).toBe(2);
    expect(r.punnett.cells).toHaveLength(4);
    expect(r.genotypeRatioText).toBe("2 : 1 : 1");
    expect(r.phenotypeRatioText).toBe("3 : 1");
    expect(r.genotypes.find((g) => g.label === "AA")?.percent).toBe(25);
    expect(r.genotypes.find((g) => g.label === "Aa")?.percent).toBe(50);
    expect(r.genotypes.find((g) => g.label === "aa")?.percent).toBe(25);
  });

  it("lai phân tích Aa × aa cho 1:1 kiểu gen và 1:1 kiểu hình", () => {
    const r = crossMendel("Aa", "aa");
    expect(r.genotypeRatioText).toBe("1 : 1");
    expect(r.phenotypeRatioText).toBe("1 : 1");
    expect(r.punnett.cells).toHaveLength(2);
  });

  it("lai 2 cặp gen AaBb × AaBb cho 9:3:3:1 kiểu hình và 9 kiểu gen", () => {
    const r = crossMendel("AaBb", "AaBb", {
      traits: {
        A: { dominant: "Vàng", recessive: "Xanh" },
        B: { dominant: "Trơn", recessive: "Nhăn" },
      },
    });
    expect(r.punnett.totalCombinations).toBe(16);
    expect(r.punnett.omitted).toBe(false);
    expect(r.genotypeCount).toBe(9);
    expect(r.phenotypeCount).toBe(4);
    expect(r.phenotypeRatioText).toBe("9 : 3 : 3 : 1");
    expect(fmtFrac(r.genotypes.find((g) => g.label === "AaBb")!.prob)).toBe("1/4");
    expect(fmtFrac(r.genotypes.find((g) => g.label === "aabb")!.prob)).toBe("1/16");
    expect(fmtFrac(r.phenotypes.find((p) => p.label === "Vàng, Trơn")!.prob)).toBe("9/16");
  });

  it("lai phân tích 2 cặp gen AaBb × aabb cho 1:1:1:1", () => {
    const r = crossMendel("AaBb", "aabb");
    expect(r.phenotypeRatioText).toBe("1 : 1 : 1 : 1");
    expect(r.genotypeRatioText).toBe("1 : 1 : 1 : 1");
  });

  it("lai 3 cặp gen AaBbDd × AaBbDd cho 27 kiểu gen, 8 kiểu hình, 64 ô Punnett", () => {
    const r = crossMendel("AaBbDd", "AaBbDd");
    expect(r.genotypeCount).toBe(27);
    expect(r.phenotypeCount).toBe(8);
    expect(r.punnett.totalCombinations).toBe(64);
    expect(r.punnett.omitted).toBe(false);
    expect(r.phenotypeRatioText).toBe("27 : 9 : 9 : 9 : 3 : 3 : 3 : 1");
    expect(fmtFrac(r.genotypes.find((g) => g.label === "aabbdd")!.prob)).toBe("1/64");
  });

  it("lai 4 cặp gen AaBbDdEe × AaBbDdEe tính chính xác không tràn bộ nhớ (bỏ qua lưới > 64 ô)", () => {
    const r = crossMendel("AaBbDdEe", "AaBbDdEe");
    expect(r.genotypeCount).toBe(81);
    expect(r.phenotypeCount).toBe(16);
    expect(r.punnett.omitted).toBe(true);
    expect(r.punnett.totalCombinations).toBe(256);
    expect(fmtFrac(r.genotypes.find((g) => g.label === "aabbddee")!.prob)).toBe("1/256");
  });

  it("trội không hoàn toàn Aa × Aa (hoa phấn) cho 1 đỏ : 2 hồng : 1 trắng", () => {
    const r = crossMendel("Aa", "Aa", {
      dominance: "incomplete",
      traits: { A: { dominant: "Hoa đỏ", intermediate: "Hoa hồng", recessive: "Hoa trắng" } },
    });
    expect(r.phenotypeCount).toBe(3);
    expect(r.phenotypes.find((p) => p.label === "Hoa đỏ")?.percent).toBe(25);
    expect(r.phenotypes.find((p) => p.label === "Hoa hồng")?.percent).toBe(50);
    expect(r.phenotypes.find((p) => p.label === "Hoa trắng")?.percent).toBe(25);
    expect(gradeRatioAnswer("1:2:1", r.phenotypes.map((p) => p.ratioPart))).toBe(true);
  });

  it("lai 2 cặp gen hỗn hợp: locus A trội không hoàn toàn, locus B trội hoàn toàn cho 6 kiểu hình (6:3:3:2:1:1)", () => {
    const r = crossMendel("AaBb", "AaBb", { dominance: { A: "incomplete", B: "complete" } });
    expect(r.phenotypeCount).toBe(6);
    expect(r.phenotypeRatioText).toBe("6 : 3 : 3 : 2 : 1 : 1");
  });

  it("liên kết giới tính X: X^A X^a × X^A Y cho 2 ♀ trội : 1 ♂ trội : 1 ♂ lặn", () => {
    const r = crossMendel("X^A X^a", "X^A Y", {
      traits: { A: { dominant: "Mắt đỏ", recessive: "Mắt trắng" } },
    });
    expect(r.hasSexLinked).toBe(true);
    expect(r.genotypeCount).toBe(4);
    expect(r.phenotypeRatioText).toBe("2 : 1 : 1");
    expect(r.phenotypes.find((p) => p.label === "♀ Mắt đỏ")?.percent).toBe(50);
    expect(r.phenotypes.find((p) => p.label === "♂ Mắt đỏ")?.percent).toBe(25);
    expect(r.phenotypes.find((p) => p.label === "♂ Mắt trắng")?.percent).toBe(25);
    expect(r.phenotypesBySex?.female[0]).toMatchObject({ label: "Mắt đỏ", percent: 50 });
  });

  it("di truyền chéo liên kết giới tính: X^a X^a × X^A Y (mẹ lặn × bố trội)", () => {
    const r = crossMendel("XᵃXᵃ", "XᴬY", {
      traits: { A: { dominant: "Mắt đỏ", recessive: "Mắt trắng" } },
    });
    expect(r.phenotypes.find((p) => p.label === "♀ Mắt đỏ")?.percent).toBe(50);
    expect(r.phenotypes.find((p) => p.label === "♂ Mắt trắng")?.percent).toBe(50);
    expect(r.phenotypeRatioText).toBe("1 : 1");
  });

  it("kết hợp gen trên NST thường và liên kết X: Aa X^B X^b × Aa X^B Y", () => {
    const r = crossMendel("Aa X^B X^b", "Aa X^B Y");
    expect(r.hasSexLinked).toBe(true);
    expect(r.genotypeCount).toBe(12);
    expect(fmtFrac(r.genotypes.find((g) => g.label === "aaX^bY")!.prob)).toBe("1/16");
  });

  it("chuẩn hoá thứ tự alen aA -> Aa và báo lỗi kiểu gen không hợp lệ", () => {
    expect(parseGenotype("bBaA").canonical).toBe("AaBb");
    expect(() => crossMendel("X^A Y", "X^a Y")).toThrow(/đực/);
    expect(() => crossMendel("X^A X^a", "X^A X^A")).toThrow(/cái/);
    expect(() => crossMendel("Aa", "Bb")).toThrow(/không khớp/);
    expect(() => parseGenotype("Ab")).toThrow(/không cùng một locus/);
  });

  it("chấm tất định đáp án tỉ lệ và xác suất ở nhiều định dạng tiếng Việt", () => {
    expect(gradeRatioAnswer("3 : 1", [3, 1])).toBe(true);
    expect(gradeRatioAnswer("75% : 25%", [3, 1])).toBe(true);
    expect(gradeRatioAnswer("3/4 : 1/4", [3, 1])).toBe(true);
    expect(gradeRatioAnswer("1:2:1", [2, 1, 1])).toBe(true);
    expect(gradeRatioAnswer("1:2:1", [2, 1, 1], { orderMatters: true })).toBe(false);
    expect(gradeRatioAnswer("9:3:3:1", [9, 3, 3, 1])).toBe(true);
    expect(gradeRatioAnswer("2:1", [3, 1])).toBe(false);
    expect(gradeProbabilityAnswer("3/16", { num: 3, den: 16 })).toBe(true);
    expect(gradeProbabilityAnswer("18,75%", { num: 3, den: 16 })).toBe(true);
    expect(gradeProbabilityAnswer("0,1875", { num: 3, den: 16 })).toBe(true);
    expect(gradeProbabilityAnswer("1/4", { num: 3, den: 16 })).toBe(false);
  });
});
