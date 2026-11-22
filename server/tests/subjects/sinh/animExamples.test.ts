import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { verifySinhClaims } from "../../../src/subjects/sinh/verify";

const here = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(here, "../../../../anim-skills/sinh");

function readExample(skill: string) {
  const base = path.join(SKILLS_DIR, skill, "examples/vi-du-1");
  return {
    scene: JSON.parse(readFileSync(path.join(base, "scene.json"), "utf8")),
    plan: JSON.parse(readFileSync(path.join(base, "plan.json"), "utf8")),
    html: readFileSync(path.join(base, "index.html"), "utf8"),
  };
}

describe("anim-skills/sinh — tự kiểm tất định số liệu trên các ví dụ vàng", () => {
  it("phan-bao (2n = 4): mọi số NST, crômatit, tâm động qua 4 kì đều khớp cellDivision", () => {
    const { plan, html } = readExample("phan-bao");
    const [b0, b1, b2, b3] = plan.beats;
    const v = verifySinhClaims([
      { type: "cell_division", twoN: 4, phase: "ki_dau", expectChromosomes: b0.duLieu.chromosomes, expectChromatids: b0.duLieu.chromatids, expectCentromeres: b0.duLieu.centromeres },
      { type: "cell_division", twoN: 4, phase: "ki_giua", expectChromosomes: b1.duLieu.chromosomes, expectChromatids: b1.duLieu.chromatids, expectCentromeres: b1.duLieu.centromeres },
      { type: "cell_division", twoN: 4, phase: "ki_sau", expectChromosomes: b2.duLieu.chromosomes, expectChromatids: b2.duLieu.chromatids, expectCentromeres: b2.duLieu.centromeres },
      { type: "cell_division", twoN: 4, phase: "ki_cuoi", expectChromosomes: b3.duLieu.chromosomes, expectChromatids: b3.duLieu.chromatids, expectCentromeres: b3.duLieu.centromeres, expectCellCount: b3.duLieu.cells },
    ]);
    expect(v.status).toBe("verified");
    expect(html).toContain("EK.morph(");
    expect(html).toContain("2n = 4");
  });

  it("di-truyen-punnett (Aa × Aa): tỉ lệ kiểu gen 1:2:1 và kiểu hình 3:1 khớp crossMendel", () => {
    const { scene, html } = readExample("di-truyen-punnett");
    const v = verifySinhClaims([
      { type: "mendel", p1: "Aa", p2: "Aa", dominance: "complete", expectGenotypeRatio: "1:2:1", expectPhenotypeRatio: "3:1", expectGenotypeProb: { genotype: "Aa", prob: "50%" } },
      { type: "grade_level", grade: scene.grade, text: scene.slideText, isUniversity: false },
    ]);
    expect(v.status).toBe("verified");
    expect(html).toContain("75");
    expect(html).toContain("25");
    expect(html).toContain("50");
  });

  it("phien-ma-dich-ma (TAC AAA GGG ATT): mARN AUG UUU CCC UAA và chuỗi Met-Phe-Pro khớp bảng mã chuẩn", () => {
    const { plan, html } = readExample("phien-ma-dich-ma");
    const v = verifySinhClaims([
      {
        type: "translation",
        templateDna3to5: plan.beats[0].duLieu.dna,
        expectMrna: plan.beats[1].duLieu.mrna,
        expectChainCode3: "Met-Phe-Pro",
        expectRawAminoAcidCount: plan.beats[2].duLieu.aminoAcids,
        expectPeptideBonds: plan.beats[2].duLieu.peptideBonds,
        expectStopCodon: plan.beats[3].duLieu.stop,
      },
    ]);
    expect(v.status).toBe("verified");
    expect(html).toContain("Met");
    expect(html).toContain("Phe");
    expect(html).toContain("Pro");
    expect(html).toContain("UAA");
  });

  it("luoi-thuc-an: tháp năng lượng 10.000 → 1.000 → 100 → 10 kcal khớp hiệu suất 10%", () => {
    const { plan } = readExample("luoi-thuc-an");
    const levels = [plan.beats[0].duLieu.b1, plan.beats[1].duLieu.b2, plan.beats[2].duLieu.b3, plan.beats[2].duLieu.b4];
    const v = verifySinhClaims([{ type: "energy_pyramid", levels, efficiency: 0.1, toleranceRel: 0.01 }]);
    expect(v.status).toBe("verified");
  });

  it("các ví dụ THCS (cau-tao-te-bao lớp 6, quang-hop-ho-hap lớp 7, he-co-quan lớp 8) không lẫn kiến thức đại học", () => {
    for (const skill of ["cau-tao-te-bao", "quang-hop-ho-hap", "he-co-quan"]) {
      const { scene } = readExample(skill);
      const text = `${scene.title} ${scene.slideText} ${scene.speech.map((s: { text: string }) => s.text).join(" ")}`;
      const v = verifySinhClaims([{ type: "grade_level", grade: scene.grade, text, isUniversity: false }]);
      expect(v.status).toBe("verified");
    }
  });
});
