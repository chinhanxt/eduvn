/** Tự kiểm tất định nội dung Sinh học (theo cơ chế huy hiệu "Đã kiểm" P13 của server/src/domain/verify.ts).
 *  Mọi tỉ lệ di truyền, số nhiễm sắc thể/crômatit/tâm động, thông số ADN/gen, chuỗi axit amin,
 *  tháp năng lượng và độ phù hợp cấp lớp (THCS 6–9 vs THPT 10–12) đều được tính lại độc lập. Thuần, không I/O. */
import { z } from "zod";
import type { Verification } from "../../domain/solution";
import { type CellPhaseId, countCellPhase } from "./cellDivision";
import { type DnaInput, solveDna } from "./dnaCalc";
import { expressGeneFromTemplate, translateMrna } from "./geneticCode";
import { type DominanceMode, crossMendel, fmtFrac, gradeProbabilityAnswer, gradeRatioAnswer } from "./mendel";

type Detail = Verification["details"][number];

const DominanceSchema = z.union([z.enum(["complete", "incomplete"]), z.record(z.string(), z.enum(["complete", "incomplete"]))]);

export const SinhCheckSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mendel"),
    p1: z.string().min(2),
    p2: z.string().min(2),
    dominance: DominanceSchema.optional(),
    splitPhenotypeBySex: z.boolean().optional(),
    expectGenotypeRatio: z.string().optional(),
    expectPhenotypeRatio: z.string().optional(),
    expectGenotypeCount: z.number().int().positive().optional(),
    expectPhenotypeCount: z.number().int().positive().optional(),
    expectGenotypeProb: z.object({ genotype: z.string(), prob: z.string() }).optional(),
  }),
  z.object({
    type: z.literal("cell_division"),
    twoN: z.number().int().min(2),
    phase: z.enum([
      "gian_ki_g1", "gian_ki_s_g2", "ki_dau", "ki_giua", "ki_sau", "ki_cuoi",
      "gp_gian_ki_g2", "gp1_ki_dau", "gp1_ki_giua", "gp1_ki_sau", "gp1_ki_cuoi",
      "gp2_ki_dau", "gp2_ki_giua", "gp2_ki_sau", "gp2_ki_cuoi",
    ]),
    expectChromosomes: z.number().int().min(0).optional(),
    expectChromatids: z.number().int().min(0).optional(),
    expectCentromeres: z.number().int().min(0).optional(),
    expectState: z.enum(["don", "kep"]).optional(),
    expectCellCount: z.number().int().min(1).optional(),
  }),
  z.object({
    type: z.literal("dna"),
    input: z.object({
      sequence: z.string().optional(),
      N: z.number().optional(),
      A: z.number().optional(),
      T: z.number().optional(),
      G: z.number().optional(),
      C: z.number().optional(),
      pctA: z.number().optional(),
      pctG: z.number().optional(),
      lengthAngstrom: z.number().optional(),
      lengthNm: z.number().optional(),
      turns: z.number().optional(),
      mass: z.number().optional(),
      hydrogenBonds: z.number().optional(),
      replications: z.number().int().optional(),
    }),
    expect: z.object({
      N: z.number().optional(),
      A: z.number().optional(),
      T: z.number().optional(),
      G: z.number().optional(),
      C: z.number().optional(),
      lengthAngstrom: z.number().optional(),
      lengthNm: z.number().optional(),
      turns: z.number().optional(),
      mass: z.number().optional(),
      hydrogenBonds: z.number().optional(),
      covalentBetween: z.number().optional(),
    }),
  }),
  z.object({
    type: z.literal("translation"),
    templateDna3to5: z.string().optional(),
    mrna5to3: z.string().optional(),
    requireStartCodon: z.boolean().optional(),
    expectMrna: z.string().optional(),
    expectChainCode3: z.string().optional(),
    expectChainCode1: z.string().optional(),
    expectRawAminoAcidCount: z.number().int().min(0).optional(),
    expectMatureAminoAcidCount: z.number().int().min(0).optional(),
    expectPeptideBonds: z.number().int().min(0).optional(),
    expectStopCodon: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("energy_pyramid"),
    /** Năng lượng ở các bậc dinh dưỡng từ bậc 1 (sinh vật sản xuất) trở lên */
    levels: z.array(z.number().positive()).min(2).max(6),
    /** Hiệu suất sinh thái chuẩn giữa 2 bậc kế tiếp (mặc định 0,1 = 10%) */
    efficiency: z.number().positive().max(0.5).default(0.1),
    toleranceRel: z.number().positive().max(0.2).default(0.01),
  }),
  z.object({
    type: z.literal("grade_level"),
    grade: z.number().int().min(1).max(16),
    text: z.string().min(1),
    isUniversity: z.boolean().default(false),
  }),
]);

export type SinhCheck = z.infer<typeof SinhCheckSchema>;

/** Các thuật ngữ chuyên sâu bậc đại học — không được đưa vào nội dung THCS (lớp 6–9) nếu bài không ghi rõ đại học. */
const UNIVERSITY_ONLY_TERMS: readonly { pattern: RegExp; term: string }[] = [
  { pattern: /operon\s*trp/i, term: "operon trp" },
  { pattern: /epigenetic|di\s*truyền\s*biểu\s*sinh/i, term: "di truyền biểu sinh (epigenetics)" },
  { pattern: /methyl\s*ho[aá]\s*histone|acetyl\s*ho[aá]\s*histone/i, term: "biến đổi histone" },
  { pattern: /phức\s*hợp\s*(i|ii|iii|iv)\b.*chuỗi\s*truyền\s*electron/i, term: "chuỗi phức hợp I–IV hô hấp tế bào" },
  { pattern: /quang\s*hệ\s*(i|ii)\b.*plastoquinon|cytochrome\s*b6f/i, term: "chi tiết quang hệ (plastoquinone/cytochrome b6f)" },
  { pattern: /spliceosome|intron\s*tự\s*cắt/i, term: "cơ chế spliceosome" },
  { pattern: /tín\s*hiệu\s*mapk|con\s*đường\s*wnt|g-protein\s*coupled/i, term: "truyền tin phân tử đại học" },
  { pattern: /hardy\s*[-–]\s*weinberg/i, term: "định luật Hardy-Weinberg (THPT lớp 12 / ĐH)" },
  { pattern: /chu\s*trình\s*(krebs|calvin)/i, term: "chu trình Krebs/Calvin (chỉ dạy từ THPT lớp 10–11)" },
];

const closeNum = (a: number, b: number, rel = 1e-4) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(a), Math.abs(b));

function checkMendel(c: Extract<SinhCheck, { type: "mendel" }>): Detail[] {
  const res = crossMendel(c.p1, c.p2, {
    dominance: c.dominance as DominanceMode | Record<string, DominanceMode> | undefined,
    splitPhenotypeBySex: c.splitPhenotypeBySex,
  });
  const out: Detail[] = [];
  const tag = `Lai ${res.p1.canonical} × ${res.p2.canonical}`;

  if (c.expectGenotypeRatio !== undefined) {
    const ok = gradeRatioAnswer(c.expectGenotypeRatio, res.genotypes.map((x) => x.ratioPart));
    out.push({
      ok,
      label: `${tag}: tỉ lệ kiểu gen`,
      expected: c.expectGenotypeRatio,
      measured: res.genotypeRatioText,
    });
  }
  if (c.expectPhenotypeRatio !== undefined) {
    const ok = gradeRatioAnswer(c.expectPhenotypeRatio, res.phenotypes.map((x) => x.ratioPart));
    out.push({
      ok,
      label: `${tag}: tỉ lệ kiểu hình`,
      expected: c.expectPhenotypeRatio,
      measured: res.phenotypeRatioText,
    });
  }
  if (c.expectGenotypeCount !== undefined) {
    out.push({
      ok: c.expectGenotypeCount === res.genotypeCount,
      label: `${tag}: số loại kiểu gen`,
      expected: String(c.expectGenotypeCount),
      measured: String(res.genotypeCount),
    });
  }
  if (c.expectPhenotypeCount !== undefined) {
    out.push({
      ok: c.expectPhenotypeCount === res.phenotypeCount,
      label: `${tag}: số loại kiểu hình`,
      expected: String(c.expectPhenotypeCount),
      measured: String(res.phenotypeCount),
    });
  }
  if (c.expectGenotypeProb !== undefined) {
    const targetKey = c.expectGenotypeProb.genotype.replace(/\s+/g, "");
    const found = res.genotypes.find((g) => g.label.replace(/\s+/g, "") === targetKey);
    const actualFrac = found?.prob ?? { num: 0, den: 1 };
    const ok = gradeProbabilityAnswer(c.expectGenotypeProb.prob, actualFrac);
    out.push({
      ok,
      label: `${tag}: xác suất kiểu gen ${c.expectGenotypeProb.genotype}`,
      expected: c.expectGenotypeProb.prob,
      measured: fmtFrac(actualFrac),
    });
  }
  if (out.length === 0) {
    // Luôn kiểm bất biến tổng xác suất = 1
    const sumPct = Math.round(res.genotypes.reduce((s, g) => s + g.prob.num / g.prob.den, 0) * 1e6) / 1e6;
    out.push({ ok: closeNum(sumPct, 1), label: `${tag}: tổng xác suất kiểu gen = 1`, expected: "1", measured: String(sumPct) });
  }
  return out;
}

function checkCellDivision(c: Extract<SinhCheck, { type: "cell_division" }>): Detail[] {
  const snap = countCellPhase(c.twoN, c.phase as CellPhaseId);
  const out: Detail[] = [];
  const tag = `${snap.labelVi} (2n = ${c.twoN})`;

  if (c.expectChromosomes !== undefined) {
    out.push({ ok: c.expectChromosomes === snap.chromosomes, label: `${tag}: số NST`, expected: String(c.expectChromosomes), measured: String(snap.chromosomes) });
  }
  if (c.expectChromatids !== undefined) {
    out.push({ ok: c.expectChromatids === snap.chromatids, label: `${tag}: số crômatit`, expected: String(c.expectChromatids), measured: String(snap.chromatids) });
  }
  if (c.expectCentromeres !== undefined) {
    out.push({ ok: c.expectCentromeres === snap.centromeres, label: `${tag}: số tâm động`, expected: String(c.expectCentromeres), measured: String(snap.centromeres) });
  }
  if (c.expectState !== undefined) {
    out.push({ ok: c.expectState === snap.state, label: `${tag}: trạng thái NST`, expected: c.expectState, measured: snap.state });
  }
  if (c.expectCellCount !== undefined) {
    out.push({ ok: c.expectCellCount === snap.cellCount, label: `${tag}: số tế bào`, expected: String(c.expectCellCount), measured: String(snap.cellCount) });
  }
  return out;
}

function checkDna(c: Extract<SinhCheck, { type: "dna" }>): Detail[] {
  const res = solveDna(c.input as DnaInput);
  const out: Detail[] = [];
  const pairs: readonly [keyof typeof c.expect, string, number][] = [
    ["N", "Tổng số nuclêôtit N", res.N],
    ["A", "Số nu A", res.A],
    ["T", "Số nu T", res.T],
    ["G", "Số nu G", res.G],
    ["C", "Số nu C/X", res.C],
    ["lengthAngstrom", "Chiều dài L (Å)", res.lengthAngstrom],
    ["lengthNm", "Chiều dài L (nm)", res.lengthNm],
    ["turns", "Số chu kì xoắn", res.turns],
    ["mass", "Khối lượng M (đvC)", res.mass],
    ["hydrogenBonds", "Số liên kết hiđrô H", res.hydrogenBonds],
    ["covalentBetween", "Liên kết hoá trị giữa các nu", res.covalentBetween],
  ];
  for (const [k, label, actual] of pairs) {
    const exp = c.expect[k];
    if (exp === undefined) continue;
    out.push({ ok: closeNum(exp, actual), label: `ADN: ${label}`, expected: String(exp), measured: String(actual) });
  }
  return out;
}

function checkTranslation(c: Extract<SinhCheck, { type: "translation" }>): Detail[] {
  if (!c.templateDna3to5 && !c.mrna5to3) {
    return [{ ok: false, label: "Dịch mã: thiếu cả templateDna3to5 và mrna5to3" }];
  }
  const out: Detail[] = [];
  let mrnaActual: string;
  let tr: ReturnType<typeof translateMrna>;

  if (c.templateDna3to5) {
    const exp = expressGeneFromTemplate(c.templateDna3to5, { requireStartCodon: c.requireStartCodon });
    mrnaActual = exp.transcription.mrna5to3;
    tr = exp.translation;
  } else {
    tr = translateMrna(c.mrna5to3!, { requireStartCodon: c.requireStartCodon });
    mrnaActual = tr.mrna5to3;
  }

  if (c.expectMrna !== undefined) {
    const normExp = c.expectMrna.replace(/3'|5'|[\s\-–]/g, "").toUpperCase().replace(/X/g, "C");
    out.push({ ok: normExp === mrnaActual, label: "Phiên mã: trình tự mARN 5'→3'", expected: normExp, measured: mrnaActual });
  }
  if (c.expectChainCode3 !== undefined) {
    const normExp = c.expectChainCode3.replace(/\s+/g, "").replace(/[–—]/g, "-").toLowerCase();
    out.push({ ok: normExp === tr.chainCode3.toLowerCase(), label: "Dịch mã: chuỗi axit amin (3 chữ)", expected: c.expectChainCode3, measured: tr.chainCode3 });
  }
  if (c.expectChainCode1 !== undefined) {
    const normExp = c.expectChainCode1.replace(/[\s\-–]/g, "").toUpperCase();
    out.push({ ok: normExp === tr.chainCode1, label: "Dịch mã: chuỗi axit amin (1 chữ)", expected: normExp, measured: tr.chainCode1 });
  }
  if (c.expectRawAminoAcidCount !== undefined) {
    out.push({ ok: c.expectRawAminoAcidCount === tr.rawAminoAcidCount, label: "Dịch mã: số axit amin chuỗi sơ khai", expected: String(c.expectRawAminoAcidCount), measured: String(tr.rawAminoAcidCount) });
  }
  if (c.expectMatureAminoAcidCount !== undefined) {
    out.push({ ok: c.expectMatureAminoAcidCount === tr.matureAminoAcidCount, label: "Dịch mã: số axit amin chuỗi hoàn chỉnh", expected: String(c.expectMatureAminoAcidCount), measured: String(tr.matureAminoAcidCount) });
  }
  if (c.expectPeptideBonds !== undefined) {
    out.push({ ok: c.expectPeptideBonds === tr.peptideBonds, label: "Dịch mã: số liên kết peptit", expected: String(c.expectPeptideBonds), measured: String(tr.peptideBonds) });
  }
  if (c.expectStopCodon !== undefined) {
    const expStop = c.expectStopCodon ? c.expectStopCodon.trim().toUpperCase().replace(/X/g, "C") : null;
    out.push({ ok: expStop === tr.stopCodon, label: "Dịch mã: bộ ba kết thúc", expected: expStop ?? "không có", measured: tr.stopCodon ?? "không có" });
  }
  return out;
}

function checkEnergyPyramid(c: Extract<SinhCheck, { type: "energy_pyramid" }>): Detail[] {
  const out: Detail[] = [];
  for (let i = 1; i < c.levels.length; i++) {
    const prev = c.levels[i - 1]!;
    const cur = c.levels[i]!;
    const expected = prev * c.efficiency;
    const ok = Math.abs(cur - expected) <= c.toleranceRel * Math.max(1, expected);
    out.push({
      ok,
      label: `Tháp năng lượng: bậc ${i} → bậc ${i + 1} (hiệu suất ${Math.round(c.efficiency * 100)}%)`,
      expected: String(cur),
      measured: String(Math.round(expected * 1000) / 1000),
    });
  }
  return out;
}

function checkGradeLevel(c: Extract<SinhCheck, { type: "grade_level" }>): Detail[] {
  if (c.isUniversity || c.grade >= 10) {
    return [{ ok: true, label: `Kiểm mức lớp (lớp ${c.grade}): phù hợp phạm vi THPT/ĐH` }];
  }
  const violations = UNIVERSITY_ONLY_TERMS.filter((t) => t.pattern.test(c.text)).map((t) => t.term);
  if (violations.length > 0) {
    return [
      {
        ok: false,
        label: `Nội dung vượt mức THCS (lớp ${c.grade}): phát hiện ${violations.join(", ")}`,
        expected: `Kiến thức KHTN lớp ${c.grade}`,
        measured: violations.join(", "),
      },
    ];
  }
  return [{ ok: true, label: `Kiểm mức lớp (KHTN lớp ${c.grade}): không lẫn kiến thức vượt cấp` }];
}

/** Chạy toàn bộ phép kiểm tất định Sinh học → trả về Verification tương thích huy hiệu "Đã kiểm" P13. */
export function verifySinhClaims(checks: SinhCheck[]): Verification {
  const details: Detail[] = [];
  for (const c of checks) {
    try {
      switch (c.type) {
        case "mendel":
          details.push(...checkMendel(c));
          break;
        case "cell_division":
          details.push(...checkCellDivision(c));
          break;
        case "dna":
          details.push(...checkDna(c));
          break;
        case "translation":
          details.push(...checkTranslation(c));
          break;
        case "energy_pyramid":
          details.push(...checkEnergyPyramid(c));
          break;
        case "grade_level":
          details.push(...checkGradeLevel(c));
          break;
      }
    } catch (e) {
      details.push({ ok: false, label: `Lỗi kiểm chứng (${c.type}): ${(e as Error).message}` });
    }
  }
  const status = details.some((d) => d.ok === false)
    ? "mismatch"
    : details.some((d) => d.ok === true)
      ? "verified"
      : "unchecked";
  return {
    status,
    details: details.slice(0, 40).map((d) => ({
      ...d,
      label: d.label.slice(0, 200),
      expected: d.expected?.slice(0, 120),
      measured: d.measured?.slice(0, 120),
    })),
  };
}

/** Ghi chú sai lệch gửi lại AI khi tự kiểm phát hiện mâu thuẫn. */
export function mismatchNoteSinh(v: Verification): string {
  return v.details
    .filter((d) => d.ok === false)
    .map((d) => `- ${d.label}${d.expected ? ` | ghi: ${d.expected}` : ""}${d.measured ? ` | tính lại: ${d.measured}` : ""}`)
    .join("\n");
}
