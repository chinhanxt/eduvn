/** Phép lai Mendel & di truyền học tất định (CTGDPT 2018, Sinh học 9 & 12). Thuần, không I/O.
 *  Hỗ trợ: 1, 2 và nhiều cặp gen phân li độc lập; trội hoàn toàn & trội không hoàn toàn;
 *  di truyền liên kết với giới tính (gen nằm trên vùng không tương đồng của NST X);
 *  tạo bảng Punnett đầy đủ (≤ 64 ô) và chấm đáp án tỉ lệ/xác suất tất định. */

export type DominanceMode = "complete" | "incomplete";

export type Frac = { num: number; den: number };

export type TraitLabels = {
  dominant: string;
  intermediate?: string;
  recessive: string;
};

export type LocusKind = "autosomal" | "x_linked";

export type ParsedLocus = {
  symbol: string; // chữ cái in hoa, vd "A", "B"
  kind: LocusKind;
  alleles: [string, string]; // với autosomal: [A, a]; với x_linked: [X^A, X^a] hoặc [X^A, Y]
};

export type ParsedParent = {
  raw: string;
  canonical: string;
  loci: ParsedLocus[];
  sex: "female" | "male" | "unknown";
};

export type GameteEntry = {
  gamete: string;
  prob: Frac;
  percent: number;
};

export type PunnettCell = {
  row: number;
  col: number;
  p1Gamete: string;
  p2Gamete: string;
  genotype: string;
  phenotype: string;
  sex: "female" | "male" | "unknown";
  prob: Frac;
};

export type RatioItem = {
  label: string;
  prob: Frac;
  ratioPart: number;
  percent: number;
};

export type CrossOptions = {
  dominance?: DominanceMode | Record<string, DominanceMode>;
  traits?: Record<string, TraitLabels>;
  /** Với phép lai có NST giới tính, có gộp giới tính vào nhãn kiểu hình hay không (mặc định true). */
  splitPhenotypeBySex?: boolean;
};

export type CrossResult = {
  p1: ParsedParent;
  p2: ParsedParent;
  hasSexLinked: boolean;
  gametes1: GameteEntry[];
  gametes2: GameteEntry[];
  punnett: {
    omitted: boolean;
    totalCombinations: number;
    rows: GameteEntry[];
    cols: GameteEntry[];
    cells: PunnettCell[];
  };
  genotypes: RatioItem[];
  phenotypes: RatioItem[];
  phenotypesBySex?: {
    female: RatioItem[];
    male: RatioItem[];
  };
  genotypeRatioText: string;
  phenotypeRatioText: string;
  genotypeCount: number;
  phenotypeCount: number;
};

// ——— Phân số chính xác ———

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.trunc(a / gcd(a, b)) * Math.trunc(b));
}

export function reduceFrac(num: number, den: number): Frac {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) {
    throw new Error("Mẫu số phân số phải khác 0");
  }
  const sign = den < 0 ? -1 : 1;
  const n = Math.round(num) * sign;
  const d = Math.round(Math.abs(den));
  if (n === 0) return { num: 0, den: 1 };
  const g = gcd(n, d);
  return { num: n / g, den: d / g };
}

export function addFrac(a: Frac, b: Frac): Frac {
  return reduceFrac(a.num * b.den + b.num * a.den, a.den * b.den);
}

export function mulFrac(a: Frac, b: Frac): Frac {
  return reduceFrac(a.num * b.num, a.den * b.den);
}

export function fracToPercent(f: Frac): number {
  return Math.round((f.num / f.den) * 10000) / 100;
}

export function fmtFrac(f: Frac): string {
  return f.den === 1 ? String(f.num) : `${f.num}/${f.den}`;
}

// ——— Phân tích kiểu gen ———

const SUPERSCRIPT_MAP: Record<string, string> = {
  "ᴬ": "A", "ᵃ": "a", "ᴮ": "B", "ᵇ": "b", "ᴰ": "D", "ᵈ": "d",
  "ᴱ": "E", "ᵉ": "e", "ᴴ": "H", "ʰ": "h", "ᴹ": "M", "ᵐ": "m",
  "ᴿ": "R", "ʳ": "r", "ᵂ": "W", "ʷ": "w",
};

function normalizeSuperscripts(raw: string): string {
  let s = raw.normalize("NFC").trim();
  // Chuyển chữ mũ Unicode thành ^A / ^a sau X
  s = s.replace(/X([ᴬᵃᴮᵇᴰᵈᴱᵉᴴʰᴹᵐᴿʳᵂʷ])/g, (_, ch: string) => `X^${SUPERSCRIPT_MAP[ch] ?? ch}`);
  // Chuyển X^{A} -> X^A
  s = s.replace(/X\^\{([A-Za-z])\}/g, "X^$1");
  return s;
}

function sortAutosomalPair(a: string, b: string): [string, string] {
  const isUpperA = a === a.toUpperCase();
  const isUpperB = b === b.toUpperCase();
  if (isUpperA !== isUpperB) return isUpperA ? [a, b] : [b, a];
  return a <= b ? [a, b] : [b, a];
}

function sortXLinkedPair(a: string, b: string): [string, string] {
  if (a === "Y") return [b, a];
  if (b === "Y") return [a, b];
  // Cả hai đều dạng X^?
  const alA = a.slice(2);
  const alB = b.slice(2);
  const [s1, s2] = sortAutosomalPair(alA, alB);
  return [`X^${s1}`, `X^${s2}`];
}

/** Phân tích chuỗi kiểu gen bố/mẹ: "Aa", "AaBb", "AaBbDd", "X^A X^a", "X^AY", "Aa X^B X^b", "AaX^BY". */
export function parseGenotype(raw: string): ParsedParent {
  const s = normalizeSuperscripts(raw).replace(/\s+/g, "");
  if (!s) throw new Error("Kiểu gen không được để trống");

  const loci: ParsedLocus[] = [];
  const seenSymbols = new Set<string>();
  let sex: "female" | "male" | "unknown" = "unknown";
  let i = 0;

  while (i < s.length) {
    // Liên kết giới tính X: X^A X^a hoặc X^A Y (cũng nhận XAXa / XAY khi chữ cái sau X khác X,Y)
    const xPair = /^X\^?([A-Za-z])X\^?([A-Za-z])/.exec(s.slice(i));
    const xMale = /^X\^?([A-Za-z])Y/.exec(s.slice(i));
    const yMale = /^YX\^?([A-Za-z])/.exec(s.slice(i));

    if (xPair && xPair[1]!.toLowerCase() === xPair[2]!.toLowerCase()) {
      const sym = xPair[1]!.toUpperCase();
      if (seenSymbols.has(sym)) throw new Error(`Locus "${sym}" bị lặp trong kiểu gen "${raw}"`);
      seenSymbols.add(sym);
      loci.push({ symbol: sym, kind: "x_linked", alleles: sortXLinkedPair(`X^${xPair[1]}`, `X^${xPair[2]}`) });
      sex = "female";
      i += xPair[0].length;
      continue;
    }

    if (xMale || yMale) {
      const m = (xMale ?? yMale)!;
      const sym = m[1]!.toUpperCase();
      if (seenSymbols.has(sym)) throw new Error(`Locus "${sym}" bị lặp trong kiểu gen "${raw}"`);
      seenSymbols.add(sym);
      loci.push({ symbol: sym, kind: "x_linked", alleles: [`X^${m[1]}`, "Y"] });
      sex = "male";
      i += m[0].length;
      continue;
    }

    // Gen trên NST thường: 2 chữ cái cùng chữ cái gốc (vd Aa, BB, dd)
    const auto = /^([A-Za-z])([A-Za-z])/.exec(s.slice(i));
    if (!auto) throw new Error(`Không đọc được kiểu gen "${raw}" tại "${s.slice(i)}"`);
    const [, a, b] = auto as unknown as [string, string, string];
    if (a.toLowerCase() !== b.toLowerCase()) {
      throw new Error(`Cặp alen "${a}${b}" trong "${raw}" không cùng một locus gen`);
    }
    const sym = a.toUpperCase();
    if (seenSymbols.has(sym)) throw new Error(`Locus "${sym}" bị lặp trong kiểu gen "${raw}"`);
    seenSymbols.add(sym);
    loci.push({ symbol: sym, kind: "autosomal", alleles: sortAutosomalPair(a, b) });
    i += 2;
  }

  if (loci.length === 0) throw new Error(`Kiểu gen "${raw}" không có locus nào`);

  // Sắp xếp ổn định: NST thường theo alphabet trước, X-linked sau
  loci.sort((u, v) => {
    if (u.kind !== v.kind) return u.kind === "autosomal" ? -1 : 1;
    return u.symbol.localeCompare(v.symbol);
  });

  const canonical = loci.map((l) => l.alleles.join("")).join("");
  return { raw, canonical, loci, sex };
}

function dominanceFor(symbol: string, opt?: CrossOptions["dominance"]): DominanceMode {
  if (!opt) return "complete";
  if (typeof opt === "string") return opt;
  return opt[symbol] ?? "complete";
}

/** Tạo danh sách giao tử kèm xác suất chính xác của một cơ thể. */
export function generateGametes(parent: ParsedParent): GameteEntry[] {
  let acc: { gamete: string; prob: Frac }[] = [{ gamete: "", prob: { num: 1, den: 1 } }];

  for (const locus of parent.loci) {
    const [a1, a2] = locus.alleles;
    const perLocus: { allele: string; prob: Frac }[] =
      a1 === a2
        ? [{ allele: a1, prob: { num: 1, den: 1 } }]
        : [
            { allele: a1, prob: { num: 1, den: 2 } },
            { allele: a2, prob: { num: 1, den: 2 } },
          ];
    const next: { gamete: string; prob: Frac }[] = [];
    for (const cur of acc) {
      for (const piece of perLocus) {
        next.push({ gamete: cur.gamete + piece.allele, prob: mulFrac(cur.prob, piece.prob) });
      }
    }
    acc = next;
  }

  return acc.map((g) => ({ ...g, percent: fracToPercent(g.prob) }));
}

function locusPhenotype(
  locus: ParsedLocus,
  mode: DominanceMode,
  traits?: Record<string, TraitLabels>,
): string {
  const sym = locus.symbol;
  const low = sym.toLowerCase();
  const t = traits?.[sym];
  if (locus.kind === "autosomal") {
    const [a1, a2] = locus.alleles;
    const domCount = (a1 === sym ? 1 : 0) + (a2 === sym ? 1 : 0);
    if (mode === "complete") {
      if (domCount >= 1) return t ? t.dominant : `Trội ${sym}_`;
      return t ? t.recessive : `Lặn ${low}${low}`;
    }
    // Trội không hoàn toàn
    if (domCount === 2) return t ? t.dominant : `Trội ${sym}${sym}`;
    if (domCount === 1) return t?.intermediate ?? `Trung gian ${sym}${low}`;
    return t ? t.recessive : `Lặn ${low}${low}`;
  }

  // Liên kết giới tính X
  const [x1, x2] = locus.alleles;
  const isMale = x2 === "Y";
  if (isMale) {
    const isDom = x1 === `X^${sym}`;
    if (isDom) return t ? t.dominant : `Trội ${sym}`;
    return t ? t.recessive : `Lặn ${low}`;
  }
  const domCount = (x1 === `X^${sym}` ? 1 : 0) + (x2 === `X^${sym}` ? 1 : 0);
  if (mode === "complete") {
    if (domCount >= 1) return t ? t.dominant : `Trội ${sym}`;
    return t ? t.recessive : `Lặn ${low}`;
  }
  if (domCount === 2) return t ? t.dominant : `Trội ${sym}${sym}`;
  if (domCount === 1) return t?.intermediate ?? `Trung gian ${sym}${low}`;
  return t ? t.recessive : `Lặn ${low}${low}`;
}

function combineLocusAlleles(
  l1: ParsedLocus,
  a1: string,
  a2: string,
): { locus: ParsedLocus; sex: "female" | "male" | "unknown" } {
  if (l1.kind === "autosomal") {
    return {
      locus: { symbol: l1.symbol, kind: "autosomal", alleles: sortAutosomalPair(a1, a2) },
      sex: "unknown",
    };
  }
  if (a1 === "Y" && a2 === "Y") {
    throw new Error("Không thể lai hai cá thể đều mang cặp XY (đực × đực)");
  }
  const sorted = sortXLinkedPair(a1, a2);
  return {
    locus: { symbol: l1.symbol, kind: "x_linked", alleles: sorted },
    sex: sorted[1] === "Y" ? "male" : "female",
  };
}

function buildRatioItems(map: Map<string, Frac>): RatioItem[] {
  const entries = [...map.entries()];
  const commonDen = entries.reduce((acc, [, f]) => lcm(acc, f.den), 1);
  const rawParts = entries.map(([label, prob]) => ({
    label,
    prob,
    part: Math.round((prob.num * commonDen) / prob.den),
  }));
  const g = rawParts.reduce((acc, item) => gcd(acc, item.part), 0) || 1;
  return rawParts
    .map((x) => ({
      label: x.label,
      prob: x.prob,
      ratioPart: x.part / g,
      percent: fracToPercent(x.prob),
    }))
    .sort((a, b) => b.ratioPart - a.ratioPart || a.label.localeCompare(b.label, "vi"));
}

/** Thực hiện phép lai Mendel 1/2/nhiều cặp gen (kể cả trội không hoàn toàn và liên kết giới tính X). */
export function crossMendel(parent1Raw: string, parent2Raw: string, opts: CrossOptions = {}): CrossResult {
  const p1 = parseGenotype(parent1Raw);
  const p2 = parseGenotype(parent2Raw);

  if (p1.loci.length !== p2.loci.length) {
    throw new Error(`Số cặp gen bố mẹ không khớp (${p1.loci.length} vs ${p2.loci.length})`);
  }
  for (let i = 0; i < p1.loci.length; i++) {
    const a = p1.loci[i]!;
    const b = p2.loci[i]!;
    if (a.symbol !== b.symbol || a.kind !== b.kind) {
      throw new Error(`Locus "${a.symbol}" (${a.kind}) không khớp với "${b.symbol}" (${b.kind})`);
    }
  }

  const hasSexLinked = p1.loci.some((l) => l.kind === "x_linked");
  if (hasSexLinked) {
    if (p1.sex === "male" && p2.sex === "male") throw new Error("Phép lai liên kết giới tính không thể có cả hai bên là đực (XY × XY)");
    if (p1.sex === "female" && p2.sex === "female") throw new Error("Phép lai liên kết giới tính không thể có cả hai bên là cái (XX × XX)");
  }

  const splitSex = opts.splitPhenotypeBySex ?? true;

  // Tính phân bố độc lập theo từng locus (chính xác và nhanh với mọi số cặp gen)
  const perLocusDist = p1.loci.map((l1, idx) => {
    const l2 = p2.loci[idx]!;
    const mode = dominanceFor(l1.symbol, opts.dominance);
    const out = new Map<string, { locus: ParsedLocus; pheno: string; sex: "female" | "male" | "unknown"; prob: Frac }>();
    const g1 = l1.alleles[0] === l1.alleles[1] ? [{ a: l1.alleles[0], p: { num: 1, den: 1 } }] : [{ a: l1.alleles[0], p: { num: 1, den: 2 } }, { a: l1.alleles[1], p: { num: 1, den: 2 } }];
    const g2 = l2.alleles[0] === l2.alleles[1] ? [{ a: l2.alleles[0], p: { num: 1, den: 1 } }] : [{ a: l2.alleles[0], p: { num: 1, den: 2 } }, { a: l2.alleles[1], p: { num: 1, den: 2 } }];

    for (const u of g1) {
      for (const v of g2) {
        const comb = combineLocusAlleles(l1, u.a, v.a);
        const key = comb.locus.alleles.join("");
        const p = mulFrac(u.p, v.p);
        const existing = out.get(key);
        if (existing) existing.prob = addFrac(existing.prob, p);
        else out.set(key, { locus: comb.locus, pheno: locusPhenotype(comb.locus, mode, opts.traits), sex: comb.sex, prob: p });
      }
    }
    return [...out.values()];
  });

  // Nhân phân bố các locus độc lập
  type CombinedState = { geno: string; phenoParts: string[]; sex: "female" | "male" | "unknown"; prob: Frac };
  let states: CombinedState[] = [{ geno: "", phenoParts: [], sex: "unknown", prob: { num: 1, den: 1 } }];
  for (const dist of perLocusDist) {
    const next: CombinedState[] = [];
    for (const st of states) {
      for (const item of dist) {
        next.push({
          geno: st.geno + item.locus.alleles.join(""),
          phenoParts: [...st.phenoParts, item.pheno],
          sex: item.sex !== "unknown" ? item.sex : st.sex,
          prob: mulFrac(st.prob, item.prob),
        });
      }
    }
    states = next;
  }

  const genoMap = new Map<string, Frac>();
  const phenoMap = new Map<string, Frac>();
  const femalePhenoMap = new Map<string, Frac>();
  const malePhenoMap = new Map<string, Frac>();

  for (const st of states) {
    const prevG = genoMap.get(st.geno);
    genoMap.set(st.geno, prevG ? addFrac(prevG, st.prob) : st.prob);

    const basePheno = st.phenoParts.join(", ");
    const sexPrefix = st.sex === "female" ? "♀ " : st.sex === "male" ? "♂ " : "";
    const fullPheno = hasSexLinked && splitSex ? `${sexPrefix}${basePheno}` : basePheno;
    const prevP = phenoMap.get(fullPheno);
    phenoMap.set(fullPheno, prevP ? addFrac(prevP, st.prob) : st.prob);

    if (hasSexLinked) {
      const targetMap = st.sex === "female" ? femalePhenoMap : malePhenoMap;
      const prevS = targetMap.get(basePheno);
      targetMap.set(basePheno, prevS ? addFrac(prevS, st.prob) : st.prob);
    }
  }

  const genotypes = buildRatioItems(genoMap);
  const phenotypes = buildRatioItems(phenoMap);

  const gametes1 = generateGametes(p1);
  const gametes2 = generateGametes(p2);
  const totalCombinations = gametes1.length * gametes2.length;
  const omitted = totalCombinations > 64;
  const cells: PunnettCell[] = [];

  if (!omitted) {
    // Tách token giao tử theo từng locus để ghép ô Punnett chính xác
    const splitGameteTokens = (parent: ParsedParent): string[][] => {
      let acc: string[][] = [[]];
      for (const locus of parent.loci) {
        const choices = locus.alleles[0] === locus.alleles[1] ? [locus.alleles[0]] : [locus.alleles[0], locus.alleles[1]];
        const next: string[][] = [];
        for (const cur of acc) for (const c of choices) next.push([...cur, c]);
        acc = next;
      }
      return acc;
    };
    const tok1 = splitGameteTokens(p1);
    const tok2 = splitGameteTokens(p2);

    for (let r = 0; r < gametes1.length; r++) {
      for (let c = 0; c < gametes2.length; c++) {
        const g1 = gametes1[r]!;
        const g2 = gametes2[c]!;
        let cellSex: "female" | "male" | "unknown" = "unknown";
        const gParts: string[] = [];
        const pParts: string[] = [];
        for (let k = 0; k < p1.loci.length; k++) {
          const locus = p1.loci[k]!;
          const comb = combineLocusAlleles(locus, tok1[r]![k]!, tok2[c]![k]!);
          if (comb.sex !== "unknown") cellSex = comb.sex;
          gParts.push(comb.locus.alleles.join(""));
          pParts.push(locusPhenotype(comb.locus, dominanceFor(locus.symbol, opts.dominance), opts.traits));
        }
        const basePheno = pParts.join(", ");
        const sexPrefix = cellSex === "female" ? "♀ " : cellSex === "male" ? "♂ " : "";
        cells.push({
          row: r,
          col: c,
          p1Gamete: g1.gamete,
          p2Gamete: g2.gamete,
          genotype: gParts.join(""),
          phenotype: hasSexLinked && splitSex ? `${sexPrefix}${basePheno}` : basePheno,
          sex: cellSex,
          prob: mulFrac(g1.prob, g2.prob),
        });
      }
    }
  }

  return {
    p1,
    p2,
    hasSexLinked,
    gametes1,
    gametes2,
    punnett: { omitted, totalCombinations, rows: gametes1, cols: gametes2, cells },
    genotypes,
    phenotypes,
    ...(hasSexLinked && {
      phenotypesBySex: {
        female: buildRatioItems(femalePhenoMap),
        male: buildRatioItems(malePhenoMap),
      },
    }),
    genotypeRatioText: genotypes.map((x) => x.ratioPart).join(" : "),
    phenotypeRatioText: phenotypes.map((x) => x.ratioPart).join(" : "),
    genotypeCount: genotypes.length,
    phenotypeCount: phenotypes.length,
  };
}

// ——— Chấm tất định câu trả lời tỉ lệ / xác suất di truyền ———

function parseRatioToken(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!s) return null;
  if (s.endsWith("%")) {
    const v = Number(s.slice(0, -1));
    return Number.isFinite(v) && v >= 0 ? v / 100 : null;
  }
  const frac = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s);
  if (frac) {
    const d = Number(frac[2]);
    if (!d) return null;
    return Number(frac[1]) / d;
  }
  const v = Number(s);
  return Number.isFinite(v) && v >= 0 ? v : null;
}

/** Chuẩn hoá chuỗi tỉ lệ ("9 : 3 : 3 : 1", "75% : 25%", "1/4 : 2/4 : 1/4") về dãy số dương rút gọn tỉ lệ. */
export function parseRatioSequence(raw: string): number[] | null {
  const cleaned = raw.normalize("NFC").trim().replace(/[–—]/g, ":").replace(/\s+/g, "");
  if (!cleaned) return null;
  const parts = cleaned.split(":");
  if (parts.length < 2) return null;
  const vals = parts.map(parseRatioToken);
  if (vals.some((v) => v === null || v <= 0)) return null;
  const nums = vals as number[];
  // Chuyển về tỉ lệ tương đối so với tổng = 1
  const sum = nums.reduce((a, b) => a + b, 0);
  return nums.map((x) => x / sum);
}

/** Chấm tất định đáp án tỉ lệ di truyền (vd HS nhập "3:1", "75% : 25%", "3/4 : 1/4" hay "1:2:1"). */
export function gradeRatioAnswer(
  studentAnswer: string,
  expectedParts: number[],
  opts: { orderMatters?: boolean; tol?: number } = {},
): boolean {
  const tol = opts.tol ?? 1e-4;
  const parsed = parseRatioSequence(studentAnswer);
  if (!parsed || parsed.length !== expectedParts.length) return false;
  const expSum = expectedParts.reduce((a, b) => a + b, 0);
  if (expSum <= 0) return false;
  const expNorm = expectedParts.map((x) => x / expSum);

  const a = opts.orderMatters ? parsed : [...parsed].sort((x, y) => y - x);
  const b = opts.orderMatters ? expNorm : [...expNorm].sort((x, y) => y - x);
  return a.every((v, i) => Math.abs(v - b[i]!) <= tol);
}

/** Chấm tất định đáp án xác suất đơn (vd "3/16", "18,75%", "0,1875"). */
export function gradeProbabilityAnswer(studentAnswer: string, expected: Frac, tol = 1e-4): boolean {
  const v = parseRatioToken(studentAnswer);
  if (v === null) return false;
  return Math.abs(v - expected.num / expected.den) <= tol;
}
