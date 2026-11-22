/**
 * Cấu hình electron nguyên tử và ion đơn nguyên tử (Z = 1..118) — tính tất định theo Aufbau, Pauli, Hund.
 * Kèm đủ 20 ngoại lệ thực nghiệm (Cr, Cu, Nb, Mo, Ru, Rh, Pd, Ag, La, Ce, Gd, Pt, Au, Ac, Th, Pa, U, Np, Cm, Lr)
 * theo NIST Atomic Spectra Database & SGK Hoá học 10 (CTGDPT 2018).
 */

export type OrbitalLetter = "s" | "p" | "d" | "f";
export type OrbitalSpin = "empty" | "up" | "pair";

export interface SubshellInfo {
  n: number;
  l: number;
  letter: OrbitalLetter;
  name: string;
  capacity: number;
  electrons: number;
  /** Trạng thái từng ô orbital theo quy tắc Hund + Pauli: "empty" | "up" (↑) | "pair" (↑↓). */
  orbitals: OrbitalSpin[];
}

export interface FillStep {
  electronIndex: number;
  subshell: string;
  orbitalIndex: number;
  spin: "up" | "down";
  rule: "aufbau" | "hund" | "pauli";
}

export interface ElectronConfigResult {
  z: number;
  charge: number;
  totalElectrons: number;
  /** Thứ tự lớp (viết chuẩn SGK 2018: 1s 2s 2p 3s 3p 3d 4s ...). */
  subshells: SubshellInfo[];
  /** Thứ tự mức năng lượng (Aufbau: 1s 2s 2p 3s 3p 4s 3d ...). */
  energyOrder: SubshellInfo[];
  /** Chuỗi ASCII chuẩn (vd: "1s2 2s2 2p6 3s2 3p6 3d5 4s1"). */
  ascii: string;
  /** Chuỗi Unicode có số mũ (vd: "1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁵ 4s¹"). */
  unicode: string;
  /** Viết gọn theo khí hiếm gần nhất (vd: "[Ar] 3d⁵ 4s¹"). */
  nobleGasUnicode: string;
  /** Viết gọn dạng ASCII (vd: "[Ar] 3d5 4s1"). */
  nobleGasAscii: string;
  /** Số electron trên từng lớp vỏ (K, L, M, N, O, P, Q). */
  shells: number[];
  period: number;
  block: OrbitalLetter;
  outermostElectrons: number;
  unpairedElectrons: number;
  isException: boolean;
  exceptionNote?: string;
  /** Chuỗi bước điền từng electron vào ô orbital (dùng cho hoạt hình & tự kiểm). */
  fillSteps: FillStep[];
}

const LETTERS: readonly OrbitalLetter[] = ["s", "p", "d", "f"];
const CAPACITY: Record<OrbitalLetter, number> = { s: 2, p: 6, d: 10, f: 14 };
const ORBITAL_COUNT: Record<OrbitalLetter, number> = { s: 1, p: 3, d: 5, f: 7 };

/** Thứ tự mức năng lượng Aufbau chuẩn (quy tắc Klechkowski n + l). */
export const AUFBAU_ORDER: readonly { n: number; l: number; letter: OrbitalLetter; name: string; cap: number }[] = [
  { n: 1, l: 0, letter: "s", name: "1s", cap: 2 },
  { n: 2, l: 0, letter: "s", name: "2s", cap: 2 },
  { n: 2, l: 1, letter: "p", name: "2p", cap: 6 },
  { n: 3, l: 0, letter: "s", name: "3s", cap: 2 },
  { n: 3, l: 1, letter: "p", name: "3p", cap: 6 },
  { n: 4, l: 0, letter: "s", name: "4s", cap: 2 },
  { n: 3, l: 2, letter: "d", name: "3d", cap: 10 },
  { n: 4, l: 1, letter: "p", name: "4p", cap: 6 },
  { n: 5, l: 0, letter: "s", name: "5s", cap: 2 },
  { n: 4, l: 2, letter: "d", name: "4d", cap: 10 },
  { n: 5, l: 1, letter: "p", name: "5p", cap: 6 },
  { n: 6, l: 0, letter: "s", name: "6s", cap: 2 },
  { n: 4, l: 3, letter: "f", name: "4f", cap: 14 },
  { n: 5, l: 2, letter: "d", name: "5d", cap: 10 },
  { n: 6, l: 1, letter: "p", name: "6p", cap: 6 },
  { n: 7, l: 0, letter: "s", name: "7s", cap: 2 },
  { n: 5, l: 3, letter: "f", name: "5f", cap: 14 },
  { n: 6, l: 2, letter: "d", name: "6d", cap: 10 },
  { n: 7, l: 1, letter: "p", name: "7p", cap: 6 },
];

/**
 * 20 ngoại lệ thực nghiệm ở trạng thái cơ bản (NIST Atomic Spectra Database).
 * Mỗi mục chỉ rõ các phân lớp khác với Aufbau thuần.
 */
const EXCEPTIONS: Record<number, { overrides: Record<string, number>; note: string }> = {
  24: { overrides: { "3d": 5, "4s": 1 }, note: "Bán bão hoà phân lớp 3d⁵ bền vững hơn 3d⁴ 4s²" },
  29: { overrides: { "3d": 10, "4s": 1 }, note: "Bão hoà phân lớp 3d¹⁰ bền vững hơn 3d⁹ 4s²" },
  41: { overrides: { "4d": 4, "5s": 1 }, note: "Chuyển 1e từ 5s sang 4d (4d⁴ 5s¹)" },
  42: { overrides: { "4d": 5, "5s": 1 }, note: "Bán bão hoà 4d⁵ 5s¹ bền vững" },
  44: { overrides: { "4d": 7, "5s": 1 }, note: "Thực nghiệm NIST: [Kr] 4d⁷ 5s¹" },
  45: { overrides: { "4d": 8, "5s": 1 }, note: "Thực nghiệm NIST: [Kr] 4d⁸ 5s¹" },
  46: { overrides: { "4d": 10, "5s": 0 }, note: "Bão hoà hoàn toàn phân lớp 4d¹⁰ (5s⁰)" },
  47: { overrides: { "4d": 10, "5s": 1 }, note: "Bão hoà phân lớp 4d¹⁰ 5s¹ bền vững" },
  57: { overrides: { "4f": 0, "5d": 1 }, note: "Thực nghiệm NIST: [Xe] 5d¹ 6s²" },
  58: { overrides: { "4f": 1, "5d": 1 }, note: "Thực nghiệm NIST: [Xe] 4f¹ 5d¹ 6s²" },
  64: { overrides: { "4f": 7, "5d": 1 }, note: "Bán bão hoà 4f⁷: [Xe] 4f⁷ 5d¹ 6s²" },
  78: { overrides: { "5d": 9, "6s": 1 }, note: "Thực nghiệm NIST: [Xe] 4f¹⁴ 5d⁹ 6s¹" },
  79: { overrides: { "5d": 10, "6s": 1 }, note: "Bão hoà phân lớp 5d¹⁰ 6s¹ bền vững" },
  89: { overrides: { "5f": 0, "6d": 1 }, note: "Thực nghiệm NIST: [Rn] 6d¹ 7s²" },
  90: { overrides: { "5f": 0, "6d": 2 }, note: "Thực nghiệm NIST: [Rn] 6d² 7s²" },
  91: { overrides: { "5f": 2, "6d": 1 }, note: "Thực nghiệm NIST: [Rn] 5f² 6d¹ 7s²" },
  92: { overrides: { "5f": 3, "6d": 1 }, note: "Thực nghiệm NIST: [Rn] 5f³ 6d¹ 7s²" },
  93: { overrides: { "5f": 4, "6d": 1 }, note: "Thực nghiệm NIST: [Rn] 5f⁴ 6d¹ 7s²" },
  96: { overrides: { "5f": 7, "6d": 1 }, note: "Bán bão hoà 5f⁷: [Rn] 5f⁷ 6d¹ 7s²" },
  103: { overrides: { "5f": 14, "6d": 0, "7p": 1 }, note: "Hiệu ứng tương đối tính (NIST): [Rn] 5f¹⁴ 7s² 7p¹" },
};

const NOBLE_GASES: readonly { z: number; symbol: string; subshells: readonly string[] }[] = [
  { z: 86, symbol: "Rn", subshells: ["1s", "2s", "2p", "3s", "3p", "3d", "4s", "4p", "4d", "4f", "5s", "5p", "5d", "6s", "6p"] },
  { z: 54, symbol: "Xe", subshells: ["1s", "2s", "2p", "3s", "3p", "3d", "4s", "4p", "4d", "5s", "5p"] },
  { z: 36, symbol: "Kr", subshells: ["1s", "2s", "2p", "3s", "3p", "3d", "4s", "4p"] },
  { z: 18, symbol: "Ar", subshells: ["1s", "2s", "2p", "3s", "3p"] },
  { z: 10, symbol: "Ne", subshells: ["1s", "2s", "2p"] },
  { z: 2, symbol: "He", subshells: ["1s"] },
];

const SUP_DIGITS: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
export const toSuperscript = (n: number): string => String(n).replace(/\d/g, (d) => SUP_DIGITS[d] ?? d);

function buildOrbitals(letter: OrbitalLetter, electrons: number): OrbitalSpin[] {
  const count = ORBITAL_COUNT[letter];
  const boxes: OrbitalSpin[] = Array.from({ length: count }, () => "empty");
  for (let i = 0; i < Math.min(electrons, count); i++) boxes[i] = "up";
  for (let i = count; i < electrons; i++) boxes[i - count] = "pair";
  return boxes;
}

function buildNeutralMap(z: number): { counts: Map<string, number>; isException: boolean; exceptionNote?: string } {
  const counts = new Map<string, number>();
  let rem = z;
  for (const s of AUFBAU_ORDER) {
    if (rem <= 0) break;
    const take = Math.min(rem, s.cap);
    counts.set(s.name, take);
    rem -= take;
  }
  const ex = EXCEPTIONS[z];
  if (ex) {
    for (const [k, v] of Object.entries(ex.overrides)) {
      if (v === 0) counts.delete(k);
      else counts.set(k, v);
    }
    return { counts, isException: true, exceptionNote: ex.note };
  }
  return { counts, isException: false };
}

/**
 * Tính cấu hình electron tất định cho nguyên tử trung hoà (charge = 0)
 * hoặc ion đơn nguyên tử (charge > 0 là cation nhường e từ lớp ngoài cùng n lớn nhất trước,
 * charge < 0 là anion nhận thêm e theo thứ tự Aufbau).
 */
export function electronConfiguration(z: number, charge = 0): ElectronConfigResult {
  if (!Number.isInteger(z) || z < 1 || z > 118) {
    throw new Error(`Số hiệu nguyên tử Z phải là số nguyên từ 1 đến 118 (nhận ${z})`);
  }
  if (!Number.isInteger(charge) || z - charge < 0 || z - charge > 118) {
    throw new Error(`Điện tích ion ${charge} không hợp lệ với Z = ${z}`);
  }

  const { counts, isException, exceptionNote } = buildNeutralMap(z);

  if (charge > 0) {
    // Cation: tách electron từ lớp ngoài cùng trước (n giảm dần, cùng n thì l giảm dần: p → s → d → f)
    let toRemove = charge;
    const removalOrder = [...AUFBAU_ORDER].sort((a, b) => b.n - a.n || b.l - a.l);
    for (const s of removalOrder) {
      if (toRemove <= 0) break;
      const cur = counts.get(s.name) ?? 0;
      if (cur <= 0) continue;
      const drop = Math.min(cur, toRemove);
      if (cur - drop === 0) counts.delete(s.name);
      else counts.set(s.name, cur - drop);
      toRemove -= drop;
    }
  } else if (charge < 0) {
    // Anion: nhận thêm electron theo thứ tự Aufbau
    let toAdd = -charge;
    for (const s of AUFBAU_ORDER) {
      if (toAdd <= 0) break;
      const cur = counts.get(s.name) ?? 0;
      const space = s.cap - cur;
      if (space <= 0) continue;
      const add = Math.min(space, toAdd);
      counts.set(s.name, cur + add);
      toAdd -= add;
    }
  }

  const makeInfo = (s: (typeof AUFBAU_ORDER)[number]): SubshellInfo | null => {
    const e = counts.get(s.name) ?? 0;
    if (e <= 0) return null;
    return {
      n: s.n,
      l: s.l,
      letter: s.letter,
      name: s.name,
      capacity: s.cap,
      electrons: e,
      orbitals: buildOrbitals(s.letter, e),
    };
  };

  const energyOrder = AUFBAU_ORDER.map(makeInfo).filter((x): x is SubshellInfo => x !== null);
  const subshells = [...energyOrder].sort((a, b) => a.n - b.n || a.l - b.l);

  // Các bước điền từng electron theo Aufbau → Hund → Pauli
  const fillSteps: FillStep[] = [];
  let idx = 0;
  for (const sub of energyOrder) {
    const boxCount = ORBITAL_COUNT[sub.letter];
    for (let i = 0; i < Math.min(sub.electrons, boxCount); i++) {
      idx += 1;
      fillSteps.push({
        electronIndex: idx,
        subshell: sub.name,
        orbitalIndex: i,
        spin: "up",
        rule: i === 0 ? "aufbau" : "hund",
      });
    }
    for (let i = boxCount; i < sub.electrons; i++) {
      idx += 1;
      fillSteps.push({
        electronIndex: idx,
        subshell: sub.name,
        orbitalIndex: i - boxCount,
        spin: "down",
        rule: "pauli",
      });
    }
  }

  const totalElectrons = z - charge;
  const maxN = subshells.reduce((m, s) => Math.max(m, s.n), 0);
  const shells = Array.from({ length: maxN }, (_, i) =>
    subshells.filter((s) => s.n === i + 1).reduce((sum, s) => sum + s.electrons, 0),
  );

  // Khối nguyên tố xác định theo phân lớp năng lượng cao nhất của nguyên tử trung hoà
  const neutralLast = (() => {
    const nm = buildNeutralMap(z).counts;
    let last: OrbitalLetter = "s";
    for (const s of AUFBAU_ORDER) {
      if ((nm.get(s.name) ?? 0) > 0) last = s.letter;
    }
    return last;
  })();

  const ascii = subshells.map((s) => `${s.name}${s.electrons}`).join(" ");
  const unicode = subshells.map((s) => `${s.name}${toSuperscript(s.electrons)}`).join(" ");

  // Viết gọn theo khí hiếm gần nhất nhỏ hơn tổng số e (với nguyên tử có đủ lõi khí hiếm)
  let nobleGasAscii = ascii;
  let nobleGasUnicode = unicode;
  for (const ng of NOBLE_GASES) {
    if (totalElectrons <= ng.z) continue;
    const coreComplete = ng.subshells.every((name) => {
      const def = AUFBAU_ORDER.find((a) => a.name === name)!;
      return (counts.get(name) ?? 0) === def.cap;
    });
    if (coreComplete) {
      const coreSet = new Set(ng.subshells);
      const rest = subshells.filter((s) => !coreSet.has(s.name));
      nobleGasAscii = `[${ng.symbol}] ${rest.map((s) => `${s.name}${s.electrons}`).join(" ")}`.trim();
      nobleGasUnicode = `[${ng.symbol}] ${rest.map((s) => `${s.name}${toSuperscript(s.electrons)}`).join(" ")}`.trim();
      break;
    }
  }

  const unpairedElectrons = subshells.reduce((sum, s) => sum + s.orbitals.filter((o) => o === "up").length, 0);
  const outermostElectrons = shells.length > 0 ? shells[shells.length - 1]! : 0;

  return {
    z,
    charge,
    totalElectrons,
    subshells,
    energyOrder,
    ascii,
    unicode,
    nobleGasAscii,
    nobleGasUnicode,
    shells,
    period: maxN || 1,
    block: neutralLast,
    outermostElectrons,
    unpairedElectrons,
    isException: charge === 0 && isException,
    ...(charge === 0 && exceptionNote ? { exceptionNote } : {}),
    fillSteps,
  };
}

const SUP_TO_ASCII: Record<string, string> = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9" };
const NOBLE_CORE_Z: Record<string, number> = { He: 2, Ne: 10, Ar: 18, Kr: 36, Xe: 54, Rn: 86 };

/**
 * Phân tích chuỗi cấu hình electron học sinh nhập (hỗ trợ cả viết đầy đủ, viết gọn khí hiếm `[Ar]`,
 * số mũ Unicode `3d⁵ 4s¹`, LaTeX `3d^{5}4s^{1}`, hoặc ASCII `3d5 4s1`).
 * Trả map phân lớp → số electron, hoặc null nếu cú pháp sai / vượt sức chứa Pauli.
 */
export function parseElectronConfig(raw: string): { subshells: Map<string, number>; usedNobleGas: string | null; orderNames: string[] } | null {
  let s = raw
    .normalize("NFC")
    .replace(/\$/g, "")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (c) => SUP_TO_ASCII[c] ?? c)
    .replace(/\^\{(\d{1,2})\}/g, "$1")
    .replace(/\^(\d{1,2})/g, "$1")
    .trim();
  if (!s) return null;

  const subshells = new Map<string, number>();
  const orderNames: string[] = [];
  let usedNobleGas: string | null = null;

  const ngMatch = /^\[(He|Ne|Ar|Kr|Xe|Rn)\]\s*/.exec(s);
  if (ngMatch) {
    usedNobleGas = ngMatch[1]!;
    const coreZ = NOBLE_CORE_Z[usedNobleGas]!;
    const core = electronConfiguration(coreZ);
    for (const sub of core.subshells) {
      subshells.set(sub.name, sub.electrons);
      orderNames.push(sub.name);
    }
    s = s.slice(ngMatch[0].length).trim();
  }

  // Cho phép chuỗi rỗng sau [Ar] nếu là khí hiếm nguyên chất
  if (s.length > 0) {
    const tokenRe = /([1-7])([spdf])(\d{1,2})/g;
    let cursor = 0;
    for (const m of s.matchAll(tokenRe)) {
      const gap = s.slice(cursor, m.index).trim();
      if (gap.length > 0) return null;
      cursor = (m.index ?? 0) + m[0].length;
      const n = Number(m[1]);
      const letter = m[2] as OrbitalLetter;
      const l = LETTERS.indexOf(letter);
      const count = Number(m[3]);
      if (l >= n) return null; // vd 1p, 2d không tồn tại
      if (count < 1 || count > CAPACITY[letter]) return null; // vi phạm Pauli
      const name = `${n}${letter}`;
      if (subshells.has(name)) return null; // lặp phân lớp
      subshells.set(name, count);
      orderNames.push(name);
    }
    if (s.slice(cursor).trim().length > 0) return null;
  }

  if (subshells.size === 0) return null;
  return { subshells, usedNobleGas, orderNames };
}

export interface ElectronConfigMatch {
  ok: boolean;
  reason?: string;
  expectedUnicode: string;
  expectedNobleUnicode: string;
  usedFillingOrderOnly?: boolean;
}

/**
 * Chấm tất định cấu hình electron của học sinh so với Z (và điện tích ion nếu có).
 * Mặc định chấp nhận cả dạng đầy đủ và viết gọn khí hiếm; có thể ép `requireFull` hoặc `requireShellOrder`.
 */
export function matchElectronConfig(
  studentInput: string,
  z: number,
  opts: { charge?: number; requireFull?: boolean; requireShellOrder?: boolean } = {},
): ElectronConfigMatch {
  const expected = electronConfiguration(z, opts.charge ?? 0);
  const parsed = parseElectronConfig(studentInput);
  if (!parsed) {
    return {
      ok: false,
      reason: "Cú pháp cấu hình electron chưa hợp lệ (vd: 1s2 2s2 2p6 hoặc [Ne] 3s1).",
      expectedUnicode: expected.unicode,
      expectedNobleUnicode: expected.nobleGasUnicode,
    };
  }
  if (opts.requireFull && parsed.usedNobleGas) {
    return {
      ok: false,
      reason: "Đề yêu cầu viết cấu hình electron đầy đủ (không viết gọn khí hiếm).",
      expectedUnicode: expected.unicode,
      expectedNobleUnicode: expected.nobleGasUnicode,
    };
  }
  if (parsed.subshells.size !== expected.subshells.length) {
    return {
      ok: false,
      reason: `Số phân lớp hoặc tổng số electron chưa khớp với Z = ${z}${opts.charge ? ` (điện tích ${opts.charge > 0 ? `+${opts.charge}` : opts.charge})` : ""}.`,
      expectedUnicode: expected.unicode,
      expectedNobleUnicode: expected.nobleGasUnicode,
    };
  }
  for (const sub of expected.subshells) {
    if (parsed.subshells.get(sub.name) !== sub.electrons) {
      return {
        ok: false,
        reason: `Phân lớp ${sub.name} cần có ${sub.electrons} electron (bài làm ghi ${parsed.subshells.get(sub.name) ?? 0}).`,
        expectedUnicode: expected.unicode,
        expectedNobleUnicode: expected.nobleGasUnicode,
      };
    }
  }
  const expectedShellNames = expected.subshells.map((s) => s.name);
  const isShellOrdered = expectedShellNames.every((name, i) => parsed.orderNames[i] === name);
  if (opts.requireShellOrder && !isShellOrdered) {
    return {
      ok: false,
      reason: `Đúng số electron từng phân lớp nhưng cần sắp theo thứ tự lớp vỏ (${expected.unicode}).`,
      expectedUnicode: expected.unicode,
      expectedNobleUnicode: expected.nobleGasUnicode,
      usedFillingOrderOnly: true,
    };
  }
  return {
    ok: true,
    expectedUnicode: expected.unicode,
    expectedNobleUnicode: expected.nobleGasUnicode,
    ...(!isShellOrdered ? { usedFillingOrderOnly: true } : {}),
  };
}
