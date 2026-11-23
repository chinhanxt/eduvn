/**
 * Tự kiểm nội dung Hoá học tất định (theo cơ chế huy hiệu "Đã kiểm" của P13 — `server/src/domain/verify.ts`).
 * AI KHÔNG tự chấm nội dung của mình. Hệ thống tự kiểm lại:
 *  1. Mọi phương trình hoá học hiện trên màn/slide/lời giải đều phải cân bằng nguyên tử, điện tích và tối giản.
 *  2. Số liệu bài toán (khối lượng mol, số mol, nồng độ, thể tích khí đkc/đktc, hiệu suất, tính theo phương trình) phải tính lại ra đúng đáp số.
 *  3. Cấu hình electron nêu ra phải khớp với bộ tính tất định theo Z (kể cả ngoại lệ Cr, Cu...).
 *  4. Mọi nội dung phải qua bộ lọc an toàn SGK (không chất nổ, chất độc cấm).
 */
import { z } from "zod";
import type { Verification } from "../../domain/solution";
import { balanceEquation, checkStudentBalance, parseEquation } from "./balancer";
import { matchElectronConfig } from "./electronConfig";
import { checkChemistrySafety } from "./molecules";
import {
  actualFromYield,
  gasVolumeFromMoles,
  massFromMoles,
  massPercent,
  molarMass,
  molarity,
  molarityFromPercent,
  molesFromGasVolume,
  molesFromMass,
  reactionYield,
  solveReactionStoichiometry,
} from "./stoichiometry";

type Detail = Verification["details"][number];

export const HoaCheckSchema = z.discriminatedUnion("type", [
  /** Kiểm một phương trình hoá học cụ thể (phải cân bằng và tối giản). */
  z.object({
    type: z.literal("chemical_equation"),
    equation: z.string().trim().min(3),
    requireMinimal: z.boolean().default(true),
  }),
  /** Kiểm khối lượng mol M của một công thức. */
  z.object({
    type: z.literal("molar_mass"),
    formula: z.string().trim().min(1),
    expected: z.number().finite(),
    mode: z.enum(["sgk", "iupac"]).default("sgk"),
    tol: z.number().min(0).max(1).default(0.1),
  }),
  /** Kiểm bài toán mol / nồng độ / thể tích / hiệu suất. */
  z.object({
    type: z.literal("stoichiometry_calc"),
    op: z.enum(["moles_from_mass", "mass_from_moles", "moles_from_gas", "gas_from_moles", "molarity", "mass_percent", "molarity_from_percent", "yield", "actual_from_yield"]),
    formula: z.string().optional(),
    massG: z.number().optional(),
    moles: z.number().optional(),
    volumeL: z.number().optional(),
    gasCondition: z.enum(["dkc", "dktc"]).default("dkc"),
    soluteMassG: z.number().optional(),
    solutionMassG: z.number().optional(),
    cPercent: z.number().optional(),
    densityGPerMl: z.number().optional(),
    actual: z.number().optional(),
    theoretical: z.number().optional(),
    yieldPercent: z.number().optional(),
    mode: z.enum(["sgk", "iupac"]).default("sgk"),
    expected: z.number().finite(),
    relTol: z.number().min(0).max(0.1).default(0.01),
    absTol: z.number().min(0).max(1).default(0.01),
  }),
  /** Kiểm bài toán tính lượng sản phẩm theo phương trình (chất dư/hết + hiệu suất). */
  z.object({
    type: z.literal("reaction_product"),
    equation: z.string().trim().min(3),
    given: z
      .array(
        z.object({
          formula: z.string().trim().min(1),
          moles: z.number().optional(),
          massG: z.number().optional(),
          gasVolumeL: z.number().optional(),
          gasCondition: z.enum(["dkc", "dktc"]).optional(),
        }),
      )
      .min(1),
    targetProduct: z.string().trim().min(1),
    quantity: z.enum(["moles", "massG", "gasVolumeDkcL"]),
    yieldPercent: z.number().min(0.1).max(100).default(100),
    mode: z.enum(["sgk", "iupac"]).default("sgk"),
    expected: z.number().finite(),
    relTol: z.number().min(0).max(0.1).default(0.01),
    absTol: z.number().min(0).max(1).default(0.01),
  }),
  /** Kiểm cấu hình electron theo số hiệu nguyên tử Z (và điện tích ion nếu có). */
  z.object({
    type: z.literal("electron_config"),
    z: z.number().int().min(1).max(118),
    charge: z.number().int().min(-4).max(7).default(0),
    stated: z.string().trim().min(2),
    requireFull: z.boolean().default(false),
  }),
]);
export type HoaCheck = z.infer<typeof HoaCheckSchema>;

const fmtNum = (n: number) => String(Math.round(n * 10000) / 10000).replace(".", ",");

/**
 * Quét tự động các phương trình hoá học xuất hiện trong văn bản / slide / lời giải.
 * Hỗ trợ dạng một dòng hoặc ngăn cách bởi dấu chấm phẩy/xuống dòng có chứa mũi tên `→`, `->`, `⇌`.
 */
export function extractEquationsFromText(text: string): string[] {
  const found: string[] = [];
  const norm = text.normalize("NFC");
  // Quét từng dòng hoặc từng đoạn ngăn cách bằng ; hoặc :
  const candidates = norm.split(/[\r\n;]+/);
  // Mẫu nhận diện phương trình hoá học: chuỗi công thức (bắt đầu chữ hoa hoặc số+chữ hoa, có thể chứa +, ngoặc, chỉ số, điện tích) + mũi tên + vế phải
  const eqRe = /((?:\d*\s*[A-Z][A-Za-z0-9₀-₉⁰-⁹()[\]·.+\-^⁺⁻]*(?:\((?:s|l|g|aq)\))?[↓↑]?\s*(?:\+\s*)?)+)\s*(?:⇌|→|-->|->|<=>)\s*((?:\d*\s*[A-Z][A-Za-z0-9₀-₉⁰-⁹()[\]·.+\-^⁺⁻]*(?:\((?:s|l|g|aq)\))?[↓↑]?\s*(?:\+\s*)?)+)/g;

  for (const line of candidates) {
    for (const m of line.matchAll(eqRe)) {
      const full = m[0].trim();
      // Bỏ qua các mũi tên diễn đạt tiếng Việt không phải phương trình (vd "Bước 1 -> Bước 2")
      try {
        const parsed = parseEquation(full);
        const allValid = [...parsed.reactants, ...parsed.products].every((s) => Object.keys(s.formula.atoms).length > 0 || s.formula.isElectron);
        if (allValid && parsed.reactants.length >= 1 && parsed.products.length >= 1) {
          found.push(full);
        }
      } catch {
        // Không phải phương trình hoá học hợp lệ → bỏ qua (tránh bắt nhầm câu văn có dấu ->)
      }
    }
  }
  return [...new Set(found)];
}

/** Kiểm một phương trình cụ thể đã cân bằng chưa. */
export function verifyEquationBalanced(rawEq: string, requireMinimal = true): Detail {
  try {
    const parsed = parseEquation(rawEq);
    const coeffs = [...parsed.reactants, ...parsed.products].map((s) => s.givenCoeff ?? 1);
    const fb = checkStudentBalance(parsed, coeffs);
    const bal = balanceEquation(parsed);
    const expected = bal.ok ? bal.balancedUnicode : undefined;

    if (fb.ok || (!requireMinimal && fb.balanced)) {
      return {
        ok: true,
        label: `Phương trình cân bằng: ${rawEq}`,
        measured: expected ?? rawEq,
      };
    }
    return {
      ok: false,
      label: `Phương trình chưa cân bằng (${rawEq}): ${fb.message}`,
      ...(expected ? { expected } : {}),
      measured: rawEq,
    };
  } catch (e) {
    return {
      ok: false,
      label: `Phương trình lỗi cú pháp (${rawEq}): ${(e as Error).message}`,
    };
  }
}

function compareWithTol(label: string, measured: number, expected: number, relTol: number, absTol: number): Detail {
  const tol = Math.max(absTol, Math.abs(expected) * relTol);
  const ok = Number.isFinite(measured) && Math.abs(measured - expected) <= tol + 1e-12;
  return {
    ok,
    label: ok ? label : `${label}: tính lại ra ${fmtNum(measured)}, lệch đáp số ghi ${fmtNum(expected)}`,
    expected: fmtNum(expected),
    measured: fmtNum(measured),
  };
}

/** Chạy một phép kiểm Hoá học tất định. */
export function runHoaCheck(c: HoaCheck): Detail {
  try {
    switch (c.type) {
      case "chemical_equation":
        return verifyEquationBalanced(c.equation, c.requireMinimal);

      case "molar_mass": {
        const M = molarMass(c.formula, c.mode);
        return compareWithTol(`Khối lượng mol M(${c.formula})`, M, c.expected, 0, c.tol);
      }

      case "stoichiometry_calc": {
        let measured: number;
        switch (c.op) {
          case "moles_from_mass":
            measured = molesFromMass(c.massG!, c.formula!, c.mode);
            break;
          case "mass_from_moles":
            measured = massFromMoles(c.moles!, c.formula!, c.mode);
            break;
          case "moles_from_gas":
            measured = molesFromGasVolume(c.volumeL!, c.gasCondition);
            break;
          case "gas_from_moles":
            measured = gasVolumeFromMoles(c.moles!, c.gasCondition);
            break;
          case "molarity":
            measured = molarity(c.moles!, c.volumeL!);
            break;
          case "mass_percent":
            measured = massPercent(c.soluteMassG!, c.solutionMassG!);
            break;
          case "molarity_from_percent":
            measured = molarityFromPercent(c.cPercent!, c.densityGPerMl!, c.formula!, c.mode);
            break;
          case "yield":
            measured = reactionYield(c.actual!, c.theoretical!);
            break;
          case "actual_from_yield":
            measured = actualFromYield(c.theoretical!, c.yieldPercent!);
            break;
        }
        return compareWithTol(`Tính lại (${c.op}${c.formula ? ` ${c.formula}` : ""})`, measured, c.expected, c.relTol, c.absTol);
      }

      case "reaction_product": {
        const res = solveReactionStoichiometry({
          equation: c.equation,
          given: c.given,
          yieldPercent: c.yieldPercent,
          mode: c.mode,
        });
        const target = res.products.find((p) => p.formula === c.targetProduct);
        if (!target) return { ok: false, label: `Sản phẩm ${c.targetProduct} không có trong phương trình ${res.balancedUnicode}` };
        const val =
          c.quantity === "moles" ? target.actualMoles! : c.quantity === "massG" ? target.actualMassG! : target.actualGasVolumeDkcL!;
        return compareWithTol(`Tính ${c.quantity} của ${c.targetProduct} theo ${res.balancedUnicode}`, val, c.expected, c.relTol, c.absTol);
      }

      case "electron_config": {
        const m = matchElectronConfig(c.stated, c.z, { charge: c.charge, requireFull: c.requireFull });
        return {
          ok: m.ok,
          label: m.ok
            ? `Cấu hình electron Z = ${c.z}${c.charge ? ` (${c.charge > 0 ? `+${c.charge}` : c.charge})` : ""} khớp chuẩn`
            : `Cấu hình electron Z = ${c.z} sai: ${m.reason ?? "không khớp"}`,
          expected: m.expectedUnicode,
          measured: c.stated,
        };
      }
    }
  } catch (e) {
    return { ok: false, label: `Lỗi kiểm tất định: ${(e as Error).message}` };
  }
}

/**
 * Tự kiểm toàn bộ nội dung Hoá học (văn bản/slide/bài giải + danh sách phép kiểm) → trả về `Verification` tương thích huy hiệu "Đã kiểm" P13.
 */
export function verifyChemistryContent(input: {
  text?: string;
  equations?: string[];
  checks?: HoaCheck[];
}): Verification {
  const details: Detail[] = [];

  // 1. Kiểm an toàn SGK trước tiên
  if (input.text) {
    const safety = checkChemistrySafety(input.text);
    if (!safety.safe) {
      for (const v of safety.violations) {
        details.push({ ok: false, label: `Vi phạm an toàn SGK: ${v}` });
      }
    }
  }

  // 2. Quét mọi phương trình hiện trên văn bản/màn hình và kiểm cân bằng
  const eqSet = new Set<string>(input.equations ?? []);
  if (input.text) {
    for (const eq of extractEquationsFromText(input.text)) eqSet.add(eq);
  }
  for (const eq of eqSet) {
    details.push(verifyEquationBalanced(eq, true));
  }

  // 3. Chạy các phép kiểm tính toán / cấu hình electron tường minh
  for (const c of input.checks ?? []) {
    details.push(runHoaCheck(c));
  }

  const status: Verification["status"] = details.some((d) => d.ok === false)
    ? "mismatch"
    : details.some((d) => d.ok === true)
      ? "verified"
      : "unchecked";

  return {
    status,
    details: details.slice(0, 40).map((d) => ({
      ...d,
      label: d.label.slice(0, 200),
      ...(d.expected ? { expected: d.expected.slice(0, 120) } : {}),
      ...(d.measured ? { measured: d.measured.slice(0, 120) } : {}),
    })),
  };
}
