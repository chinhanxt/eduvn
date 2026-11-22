import { describe, expect, it } from "vitest";
import {
  calculateGametogenesis,
  calculateMitosisRounds,
  countCellPhase,
  listDivisionTimeline,
  matchPhasesByCounts,
} from "../../../src/subjects/sinh/cellDivision";

describe("cellDivision — đếm NST, crômatit, tâm động qua các kì phân bào", () => {
  it("nguyên phân ở ruồi giấm (2n = 8): đúng đủ 6 kì từ G1 đến Kì cuối", () => {
    const tl = listDivisionTimeline(8, "nguyen_phan");
    expect(tl).toHaveLength(6);
    const byPhase = Object.fromEntries(tl.map((p) => [p.phase, p]));
    expect(byPhase.gian_ki_g1).toMatchObject({ chromosomes: 8, state: "don", chromatids: 0, centromeres: 8, dnaRelativeC: 2, cellCount: 1 });
    expect(byPhase.gian_ki_s_g2).toMatchObject({ chromosomes: 8, state: "kep", chromatids: 16, centromeres: 8, dnaRelativeC: 4, cellCount: 1 });
    expect(byPhase.ki_dau).toMatchObject({ chromosomes: 8, state: "kep", chromatids: 16, centromeres: 8 });
    expect(byPhase.ki_giua).toMatchObject({ chromosomes: 8, state: "kep", chromatids: 16, centromeres: 8 });
    expect(byPhase.ki_sau).toMatchObject({ chromosomes: 16, state: "don", chromatids: 0, centromeres: 16, dnaRelativeC: 4, cellCount: 1 });
    expect(byPhase.ki_cuoi).toMatchObject({ chromosomes: 8, state: "don", chromatids: 0, centromeres: 8, dnaRelativeC: 2, cellCount: 2 });
  });

  it("nguyên phân ở tế bào người (2n = 46): kì giữa có 46 NST kép / 92 crômatit; kì sau có 92 NST đơn / 0 crômatit", () => {
    expect(countCellPhase(46, "ki_giua")).toMatchObject({ chromosomes: 46, chromatids: 92, centromeres: 46, state: "kep" });
    expect(countCellPhase(46, "ki_sau")).toMatchObject({ chromosomes: 92, chromatids: 0, centromeres: 92, state: "don" });
    expect(countCellPhase(46, "ki_cuoi")).toMatchObject({ chromosomes: 46, chromatids: 0, centromeres: 46, cellCount: 2 });
  });

  it("giảm phân ở tế bào người (2n = 46): đầy đủ 9 kì GP I và GP II", () => {
    const tl = listDivisionTimeline(46, "giam_phan");
    expect(tl).toHaveLength(9);
    const byPhase = Object.fromEntries(tl.map((p) => [p.phase, p]));
    expect(byPhase.gp1_ki_dau).toMatchObject({ chromosomes: 46, chromatids: 92, centromeres: 46, state: "kep" });
    expect(byPhase.gp1_ki_giua).toMatchObject({ chromosomes: 46, chromatids: 92, centromeres: 46, state: "kep" });
    expect(byPhase.gp1_ki_sau).toMatchObject({ chromosomes: 46, chromatids: 92, centromeres: 46, state: "kep" });
    expect(byPhase.gp1_ki_cuoi).toMatchObject({ chromosomes: 23, chromatids: 46, centromeres: 23, state: "kep", cellCount: 2, dnaRelativeC: 2 });
    expect(byPhase.gp2_ki_giua).toMatchObject({ chromosomes: 23, chromatids: 46, centromeres: 23, state: "kep" });
    expect(byPhase.gp2_ki_sau).toMatchObject({ chromosomes: 46, chromatids: 0, centromeres: 46, state: "don" });
    expect(byPhase.gp2_ki_cuoi).toMatchObject({ chromosomes: 23, chromatids: 0, centromeres: 23, state: "don", cellCount: 4, dnaRelativeC: 1 });
  });

  it("tính số tế bào con và NST môi trường cung cấp sau k lần nguyên phân liên tiếp", () => {
    const r = calculateMitosisRounds(8, 3, 4);
    expect(r.daughterCells).toBe(48);
    expect(r.totalChromosomesInDaughters).toBe(384);
    expect(r.chromosomesSuppliedByEnv).toBe(360);
    expect(r.completelyNewChromosomes).toBe(336);
  });

  it("tính số giao tử đực (tinh trùng) và cái (trứng + thể cực) khi giảm phân", () => {
    expect(calculateGametogenesis(24, 5, "duc")).toMatchObject({ gametes: 20, polarBodies: 0, chromosomesInGametes: 240 });
    expect(calculateGametogenesis(24, 5, "cai")).toMatchObject({ gametes: 5, polarBodies: 15, chromosomesInGametes: 60 });
  });

  it("xác định kì phân bào dựa trên bộ số đo (NST, crômatit, tâm động)", () => {
    const m1 = matchPhasesByCounts(8, "nguyen_phan", { chromosomes: 16, chromatids: 0, centromeres: 16 });
    expect(m1.map((x) => x.phase)).toEqual(["ki_sau"]);

    const m2 = matchPhasesByCounts(8, "giam_phan", { chromosomes: 4, chromatids: 0, centromeres: 4 });
    expect(m2.map((x) => x.phase)).toEqual(["gp2_ki_cuoi"]);
  });

  it("từ chối bộ NST 2n lẻ hoặc < 2", () => {
    expect(() => countCellPhase(7, "ki_giua")).toThrow(/chẵn/);
    expect(() => countCellPhase(0, "ki_dau")).toThrow(/chẵn/);
  });
});
