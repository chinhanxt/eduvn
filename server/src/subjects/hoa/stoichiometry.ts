/**
 * Tính toán định lượng Hoá học tất định (không để AI tự tính):
 *  - Khối lượng mol M (theo bảng SGK Việt Nam hoặc IUPAC 2021)
 *  - Số mol n từ khối lượng m, thể tích khí V (đkc 25°C, 1 bar: 24,79 L/mol theo CTGDPT 2018; hoặc đktc cũ: 22,4 L/mol), nồng độ mol C_M
 *  - Nồng độ phần trăm C%, nồng độ mol C_M, quy đổi C% ↔ C_M qua khối lượng riêng D, pha loãng
 *  - Hiệu suất phản ứng H%, tìm chất phản ứng hết / chất dư theo phương trình đã cân bằng
 *  - Đường cong chuẩn độ acid–base pH(V) chính xác bằng phương trình bảo toàn điện tích.
 */
import { balanceEquation } from "./balancer";
import { parseFormula } from "./formula";

export type MassMode = "sgk" | "iupac";
export type GasCondition = "dkc" | "dktc";

/** Thể tích mol khí: đkc (25 °C, 1 bar) = 24,79 L/mol theo CTGDPT 2018; đktc (0 °C, 1 atm) = 22,4 L/mol (cũ). */
export const MOLAR_VOLUME_L: Record<GasCondition, number> = {
  dkc: 24.79,
  dktc: 22.4,
};

const roundN = (v: number, digits = 6) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

const assertPositive = (v: number, name: string) => {
  if (!Number.isFinite(v) || v <= 0) throw new Error(`${name} phải là số dương (nhận ${v})`);
};
const assertNonNegative = (v: number, name: string) => {
  if (!Number.isFinite(v) || v < 0) throw new Error(`${name} phải là số không âm (nhận ${v})`);
};

/** Khối lượng mol M (g/mol) của một công thức hoá học. */
export function molarMass(formula: string, mode: MassMode = "sgk"): number {
  const p = parseFormula(formula);
  return mode === "iupac" ? p.molarMassIupac : p.molarMassSgk;
}

/** Số mol n = m / M. */
export function molesFromMass(massG: number, formula: string, mode: MassMode = "sgk"): number {
  assertNonNegative(massG, "Khối lượng m (g)");
  const M = molarMass(formula, mode);
  assertPositive(M, "Khối lượng mol M");
  return roundN(massG / M);
}

/** Khối lượng m = n · M. */
export function massFromMoles(moles: number, formula: string, mode: MassMode = "sgk"): number {
  assertNonNegative(moles, "Số mol n");
  const M = molarMass(formula, mode);
  return roundN(moles * M);
}

/** Số mol khí n = V / V_m (mặc định đkc 24,79 L/mol theo CTGDPT 2018). */
export function molesFromGasVolume(volumeL: number, condition: GasCondition = "dkc"): number {
  assertNonNegative(volumeL, "Thể tích khí V (L)");
  return roundN(volumeL / MOLAR_VOLUME_L[condition]);
}

/** Thể tích khí V = n · V_m (L). */
export function gasVolumeFromMoles(moles: number, condition: GasCondition = "dkc"): number {
  assertNonNegative(moles, "Số mol khí n");
  return roundN(moles * MOLAR_VOLUME_L[condition]);
}

/** Nồng độ mol C_M = n / V (mol/L). */
export function molarity(moles: number, volumeL: number): number {
  assertNonNegative(moles, "Số mol chất tan n");
  assertPositive(volumeL, "Thể tích dung dịch V (L)");
  return roundN(moles / volumeL);
}

/** Số mol từ nồng độ mol và thể tích: n = C_M · V. */
export function molesFromMolarity(cM: number, volumeL: number): number {
  assertNonNegative(cM, "Nồng độ mol C_M");
  assertNonNegative(volumeL, "Thể tích dung dịch V (L)");
  return roundN(cM * volumeL);
}

/** Nồng độ phần trăm C% = (m_ct / m_dd) × 100%. */
export function massPercent(soluteMassG: number, solutionMassG: number): number {
  assertNonNegative(soluteMassG, "Khối lượng chất tan (g)");
  assertPositive(solutionMassG, "Khối lượng dung dịch (g)");
  if (soluteMassG > solutionMassG + 1e-9) throw new Error("Khối lượng chất tan không thể lớn hơn khối lượng dung dịch");
  return roundN((soluteMassG / solutionMassG) * 100);
}

/** Khối lượng chất tan từ C% và m_dd: m_ct = m_dd · C% / 100. */
export function soluteMassFromPercent(cPercent: number, solutionMassG: number): number {
  if (!Number.isFinite(cPercent) || cPercent < 0 || cPercent > 100) throw new Error("Nồng độ phần trăm C% phải nằm trong [0, 100]");
  assertNonNegative(solutionMassG, "Khối lượng dung dịch (g)");
  return roundN((solutionMassG * cPercent) / 100);
}

/** Quy đổi nồng độ phần trăm sang nồng độ mol: C_M = (10 · D · C%) / M (D tính bằng g/mL). */
export function molarityFromPercent(cPercent: number, densityGPerMl: number, formula: string, mode: MassMode = "sgk"): number {
  if (!Number.isFinite(cPercent) || cPercent < 0 || cPercent > 100) throw new Error("C% phải nằm trong [0, 100]");
  assertPositive(densityGPerMl, "Khối lượng riêng D (g/mL)");
  const M = molarMass(formula, mode);
  assertPositive(M, "Khối lượng mol M");
  return roundN((10 * densityGPerMl * cPercent) / M);
}

/** Quy đổi C_M sang C%: C% = (C_M · M) / (10 · D). */
export function percentFromMolarity(cM: number, densityGPerMl: number, formula: string, mode: MassMode = "sgk"): number {
  assertNonNegative(cM, "C_M");
  assertPositive(densityGPerMl, "Khối lượng riêng D (g/mL)");
  const M = molarMass(formula, mode);
  return roundN((cM * M) / (10 * densityGPerMl));
}

/** Pha loãng dung dịch: C1·V1 = C2·V2 → tính đại lượng còn thiếu (nhập null cho đại lượng cần tìm). */
export function dilution(p: { c1: number | null; v1: number | null; c2: number | null; v2: number | null }): {
  c1: number;
  v1: number;
  c2: number;
  v2: number;
  solved: "c1" | "v1" | "c2" | "v2";
} {
  const nulls = (["c1", "v1", "c2", "v2"] as const).filter((k) => p[k] === null);
  if (nulls.length !== 1) throw new Error("Cần cung cấp đúng 3 đại lượng và để null đúng 1 đại lượng cần tính");
  const missing = nulls[0]!;
  if (missing === "c1") {
    assertPositive(p.v1!, "V1");
    return { c1: roundN((p.c2! * p.v2!) / p.v1!), v1: p.v1!, c2: p.c2!, v2: p.v2!, solved: "c1" };
  }
  if (missing === "v1") {
    assertPositive(p.c1!, "C1");
    return { c1: p.c1!, v1: roundN((p.c2! * p.v2!) / p.c1!), c2: p.c2!, v2: p.v2!, solved: "v1" };
  }
  if (missing === "c2") {
    assertPositive(p.v2!, "V2");
    return { c1: p.c1!, v1: p.v1!, c2: roundN((p.c1! * p.v1!) / p.v2!), v2: p.v2!, solved: "c2" };
  }
  assertPositive(p.c2!, "C2");
  return { c1: p.c1!, v1: p.v1!, c2: p.c2!, v2: roundN((p.c1! * p.v1!) / p.c2!), solved: "v2" };
}

/** Hiệu suất phản ứng H% = (lượng thực tế / lượng lý thuyết) × 100%. */
export function reactionYield(actual: number, theoretical: number): number {
  assertNonNegative(actual, "Lượng thực tế");
  assertPositive(theoretical, "Lượng lý thuyết");
  return roundN((actual / theoretical) * 100);
}

/** Lượng thực tế thu được khi biết hiệu suất H%: actual = theoretical · H / 100. */
export function actualFromYield(theoretical: number, yieldPercent: number): number {
  assertNonNegative(theoretical, "Lượng lý thuyết");
  if (!Number.isFinite(yieldPercent) || yieldPercent < 0 || yieldPercent > 100) {
    throw new Error("Hiệu suất H% phải nằm trong [0, 100]");
  }
  return roundN((theoretical * yieldPercent) / 100);
}

export interface ReactantInput {
  /** Công thức trùng với một chất tham gia trong phương trình. */
  formula: string;
  moles?: number;
  massG?: number;
  gasVolumeL?: number;
  gasCondition?: GasCondition;
}

export interface StoichiometrySpeciesResult {
  formula: string;
  coeff: number;
  molarMass: number;
  initialMoles?: number;
  reactedMoles?: number;
  excessMoles?: number;
  theoreticalMoles?: number;
  actualMoles?: number;
  actualMassG?: number;
  actualGasVolumeDkcL?: number;
}

export interface StoichiometryResult {
  balancedUnicode: string;
  balancedAscii: string;
  limitingReagent: string;
  reactionExtentMol: number;
  yieldPercent: number;
  reactants: StoichiometrySpeciesResult[];
  products: StoichiometrySpeciesResult[];
}

/**
 * Giải bài toán tính theo phương trình hoá học (tìm chất phản ứng hết / chất dư, lượng sản phẩm lý thuyết & thực tế theo hiệu suất H%).
 */
export function solveReactionStoichiometry(opts: {
  equation: string;
  given: ReactantInput[];
  yieldPercent?: number;
  mode?: MassMode;
}): StoichiometryResult {
  const mode = opts.mode ?? "sgk";
  const H = opts.yieldPercent ?? 100;
  if (!Number.isFinite(H) || H <= 0 || H > 100) throw new Error("Hiệu suất H% phải nằm trong (0, 100]");

  const bal = balanceEquation(opts.equation);
  if (!bal.ok) throw new Error(`Không cân bằng được phương trình: ${bal.error}`);

  // Ánh xạ số mol ban đầu của từng chất tham gia được cho
  const givenMap = new Map<string, number>();
  for (const g of opts.given) {
    const pf = parseFormula(g.formula);
    let n: number;
    if (g.moles !== undefined) {
      assertNonNegative(g.moles, `Số mol ${g.formula}`);
      n = g.moles;
    } else if (g.massG !== undefined) {
      n = molesFromMass(g.massG, pf.canonical, mode);
    } else if (g.gasVolumeL !== undefined) {
      n = molesFromGasVolume(g.gasVolumeL, g.gasCondition ?? "dkc");
    } else {
      throw new Error(`Thiếu dữ kiện số mol/khối lượng/thể tích cho ${g.formula}`);
    }
    givenMap.set(pf.canonical, n);
  }

  let minExtent = Infinity;
  let limiting = "";
  bal.parsed.reactants.forEach((r, i) => {
    const n0 = givenMap.get(r.formula.canonical);
    if (n0 === undefined) return;
    const ext = n0 / bal.leftCoeffs[i]!;
    if (ext < minExtent) {
      minExtent = ext;
      limiting = r.formula.canonical;
    }
  });
  if (!Number.isFinite(minExtent)) {
    throw new Error("Không có chất tham gia nào khớp với dữ kiện đầu vào");
  }

  const effectiveExtent = (minExtent * H) / 100;

  const reactants: StoichiometrySpeciesResult[] = bal.parsed.reactants.map((r, i) => {
    const coeff = bal.leftCoeffs[i]!;
    const M = mode === "iupac" ? r.formula.molarMassIupac : r.formula.molarMassSgk;
    const n0 = givenMap.get(r.formula.canonical);
    const reacted = roundN(coeff * effectiveExtent);
    return {
      formula: r.formula.canonical,
      coeff,
      molarMass: M,
      ...(n0 !== undefined ? { initialMoles: roundN(n0), excessMoles: roundN(Math.max(0, n0 - reacted)) } : {}),
      reactedMoles: reacted,
    };
  });

  const products: StoichiometrySpeciesResult[] = bal.parsed.products.map((p, i) => {
    const coeff = bal.rightCoeffs[i]!;
    const M = mode === "iupac" ? p.formula.molarMassIupac : p.formula.molarMassSgk;
    const theo = roundN(coeff * minExtent);
    const act = roundN(coeff * effectiveExtent);
    return {
      formula: p.formula.canonical,
      coeff,
      molarMass: M,
      theoreticalMoles: theo,
      actualMoles: act,
      actualMassG: roundN(act * M),
      actualGasVolumeDkcL: roundN(act * MOLAR_VOLUME_L.dkc),
    };
  });

  return {
    balancedUnicode: bal.balancedUnicode,
    balancedAscii: bal.balancedAscii,
    limitingReagent: limiting,
    reactionExtentMol: roundN(minExtent),
    yieldPercent: H,
    reactants,
    products,
  };
}

/**
 * Tính pH chính xác tại thể tích bazơ Vb (mL) khi chuẩn độ acid đơn chức (Ca, Va mL) bằng bazơ mạnh đơn chức (Cb)
 * tại 25 °C (Kw = 10^-14). Nếu `ka` được cung cấp → acid yếu (giải phương trình bậc 3 bảo toàn điện tích bằng chia đôi trên pH ∈ [0, 14]);
 * nếu `ka` bỏ trống → acid mạnh (HCl + NaOH).
 */
export function titrationPh(opts: { ca: number; vaMl: number; cb: number; vbMl: number; ka?: number }): number {
  const { ca, vaMl, cb, vbMl, ka } = opts;
  assertPositive(ca, "Nồng độ acid Ca");
  assertPositive(vaMl, "Thể tích acid Va");
  assertPositive(cb, "Nồng độ base Cb");
  assertNonNegative(vbMl, "Thể tích base Vb");

  const Kw = 1e-14;
  const vTot = vaMl + vbMl;
  const cA = (ca * vaMl) / vTot;
  const cB = (cb * vbMl) / vTot;

  // Bảo toàn điện tích: [H+] + [Na+] = [OH-] + [A-]
  // Với acid mạnh: [A-] = cA. Với acid yếu: [A-] = cA * Ka / ([H+] + Ka).
  // f(pH) = [H+] + cB - Kw/[H+] - [A-] giảm đơn điệu theo pH từ +∞ → -∞.
  const f = (ph: number): number => {
    const h = 10 ** -ph;
    const oh = Kw / h;
    const aMinus = ka === undefined ? cA : (cA * ka) / (h + ka);
    return h + cB - oh - aMinus;
  };

  let lo = 0;
  let hi = 14;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return roundN((lo + hi) / 2, 3);
}

/** Sinh dãy điểm đường cong chuẩn độ pH(Vb) + điểm tương đương chính xác. */
export function titrationCurve(opts: { ca: number; vaMl: number; cb: number; vMaxMl?: number; ka?: number; steps?: number }) {
  const vEq = roundN((opts.ca * opts.vaMl) / opts.cb, 3);
  const vMax = opts.vMaxMl ?? roundN(vEq * 2, 2);
  const steps = Math.max(10, Math.min(200, opts.steps ?? 60));
  const vs = new Set<number>([0, vEq, vMax]);
  for (let i = 0; i <= steps; i++) vs.add(roundN((vMax * i) / steps, 3));
  // Lấy mẫu dày quanh điểm tương đương (±2 mL) để bước nhảy pH sắc nét
  for (const d of [-2, -1, -0.5, -0.2, -0.1, -0.05, 0.05, 0.1, 0.2, 0.5, 1, 2]) {
    const v = roundN(vEq + d, 3);
    if (v > 0 && v < vMax) vs.add(v);
  }
  const sorted = [...vs].sort((a, b) => a - b);
  const points = sorted.map((vbMl) => ({
    vbMl,
    ph: titrationPh({ ca: opts.ca, vaMl: opts.vaMl, cb: opts.cb, vbMl, ka: opts.ka }),
  }));
  const phEq = titrationPh({ ca: opts.ca, vaMl: opts.vaMl, cb: opts.cb, vbMl: vEq, ka: opts.ka });
  return { vEqMl: vEq, phEq, points };
}
