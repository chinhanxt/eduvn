/**
 * Cân bằng phương trình hoá học bằng đại số tuyến tính chính xác trên trường hữu tỉ ℚ (BigInt, không sai số dấu phẩy động).
 * Hỗ trợ: phương trình phân tử, hydrat, phản ứng oxi hoá – khử phức tạp, phương trình ion thu gọn, bán phản ứng có electron e⁻.
 * Trả kết quả hệ số nguyên dương tối giản (gcd = 1), kèm bộ kiểm tra từng nguyên tố cho trang tương tác HS.
 */
import { type ParsedFormula, formatFormulaUnicode, parseFormula } from "./formula";

// ——— Số hữu tỉ chính xác BigInt ———
type Rat = readonly [bigint, bigint]; // [num, den], den > 0, gcd(|num|, den) = 1

const absBi = (x: bigint) => (x < 0n ? -x : x);
function gcdBi(a: bigint, b: bigint): bigint {
  let x = absBi(a);
  let y = absBi(b);
  while (y !== 0n) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x === 0n ? 1n : x;
}
const lcmBi = (a: bigint, b: bigint): bigint => (a === 0n || b === 0n ? 0n : absBi((a / gcdBi(a, b)) * b));

function rat(n: bigint, d: bigint = 1n): Rat {
  if (d === 0n) throw new Error("Chia cho 0 trong ma trận tỉ lượng");
  if (n === 0n) return [0n, 1n];
  const sign = d < 0n ? -1n : 1n;
  const nn = n * sign;
  const dd = d * sign;
  const g = gcdBi(nn, dd);
  return [nn / g, dd / g];
}

const ratAdd = (a: Rat, b: Rat): Rat => rat(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const ratSub = (a: Rat, b: Rat): Rat => rat(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const ratMul = (a: Rat, b: Rat): Rat => rat(a[0] * b[0], a[1] * b[1]);
const ratDiv = (a: Rat, b: Rat): Rat => rat(a[0] * b[1], a[1] * b[0]);
const ratNeg = (a: Rat): Rat => [-a[0], a[1]];

/** Tính cơ sở không gian hạt nhân (nullspace) của ma trận hữu tỉ A (m × n) bằng khử Gauss-Jordan. */
function nullspaceBasis(matrix: Rat[][]): Rat[][] {
  const m = matrix.length;
  const n = matrix[0]?.length ?? 0;
  const A = matrix.map((row) => row.slice());
  const pivotCols: number[] = [];

  let row = 0;
  for (let col = 0; col < n && row < m; col++) {
    let pivot = -1;
    for (let r = row; r < m; r++) {
      if (A[r]![col]![0] !== 0n) {
        pivot = r;
        break;
      }
    }
    if (pivot === -1) continue;
    if (pivot !== row) {
      const tmp = A[row]!;
      A[row] = A[pivot]!;
      A[pivot] = tmp;
    }
    const pv = A[row]![col]!;
    for (let c = col; c < n; c++) A[row]![c] = ratDiv(A[row]![c]!, pv);
    for (let r = 0; r < m; r++) {
      if (r === row) continue;
      const factor = A[r]![col]!;
      if (factor[0] === 0n) continue;
      for (let c = col; c < n; c++) {
        A[r]![c] = ratSub(A[r]![c]!, ratMul(factor, A[row]![c]!));
      }
    }
    pivotCols.push(col);
    row++;
  }

  const pivotSet = new Set(pivotCols);
  const freeCols: number[] = [];
  for (let c = 0; c < n; c++) if (!pivotSet.has(c)) freeCols.push(c);

  return freeCols.map((fc) => {
    const vec: Rat[] = Array.from({ length: n }, () => [0n, 1n]);
    vec[fc] = [1n, 1n];
    for (let r = 0; r < pivotCols.length; r++) {
      const pc = pivotCols[r]!;
      vec[pc] = ratNeg(A[r]![fc]!);
    }
    return vec;
  });
}

function toMinimalPositiveIntegers(vec: Rat[]): number[] | null {
  let denLcm = 1n;
  for (const [, d] of vec) denLcm = lcmBi(denLcm, d);
  let ints = vec.map(([n, d]) => (n * denLcm) / d);
  if (ints[0]! < 0n) ints = ints.map((x) => -x);
  if (ints.some((x) => x <= 0n)) return null;
  let g = ints[0]!;
  for (let i = 1; i < ints.length; i++) g = gcdBi(g, ints[i]!);
  const reduced = ints.map((x) => Number(x / g));
  if (reduced.some((x) => !Number.isSafeInteger(x) || x <= 0)) return null;
  return reduced;
}

export interface EquationSpecies {
  formula: ParsedFormula;
  /** Hệ số ghi sẵn trong chuỗi đầu vào (nếu có), mặc định null nếu chưa ghi. */
  givenCoeff: number | null;
}

export interface ParsedEquation {
  raw: string;
  arrow: "→" | "⇌";
  condition?: string;
  reactants: EquationSpecies[];
  products: EquationSpecies[];
}

/** Tách một vế phương trình thành các chất (xử lý cẩn thận dấu '+' của điện tích ion như Fe2+ + MnO4- + H+). */
function splitSide(side: string): EquationSpecies[] {
  const s = side.trim();
  if (!s) throw new Error("Một vế của phương trình đang bị trống");

  // Tách dấu '+' đóng vai trò phép cộng giữa các chất:
  // Quy tắc: dấu '+' là phép cộng khi đứng giữa khoảng trắng ` + ` HOẶC ngay sau ký hiệu điện tích (`+` / `-`) theo sau là chữ hoa/số/ngoặc/e,
  // HOẶC đứng sau một công thức hoàn chỉnh không có dấu `^` đứng ngay trước.
  // Chiến lược chính xác: tách theo khoảng trắng + dấu '+' tách rời trước; nếu viết dính (vd H2+O2), tách '+' không đứng cuối token và không đi sau '^'.
  const tokens: string[] = [];
  let cur = "";
  let depth = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      cur += ch;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth = Math.max(0, depth - 1);
      cur += ch;
      continue;
    }
    if (ch === "+" && depth === 0) {
      const prev = cur.trimEnd();
      const prevChar = prev.slice(-1);
      const nextRest = s.slice(i + 1);
      const nextTrim = nextRest.trimStart();
      // Khi nào '+' là DẤU ĐIỆN TÍCH (không phải phép cộng)?
      // 1) Ngay trước nó là '^' (vd Fe^+ hoặc Fe^2+)
      // 2) Kết thúc cả vế (nextTrim === "")
      // 3) Đi sau số/chữ cái dính liền (không có khoảng trắng trước '+') VÀ phía sau là khoảng trắng rồi '+' khác (vd: "H+ + OH-" hoặc "Fe2+ + MnO4-")
      const spaceBefore = cur.length > 0 && /\s$/.test(cur);
      const isChargePlus =
        prevChar === "^" ||
        nextTrim === "" ||
        (!spaceBefore && (nextTrim.startsWith("+") || /^\s+\+/.test(nextRest) || /^\((s|l|g|aq)\)/.test(nextRest)));

      if (!isChargePlus && prev.length > 0) {
        tokens.push(prev);
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) tokens.push(cur.trim());

  return tokens.map((tok) => {
    // Tách hệ số đứng đầu (vd: "2 H2O", "2H2O", "3 Fe2+", "5 e-")
    // Cẩn thận không ăn nhầm ký hiệu không có số đầu.
    const m = /^(\d+)\s*(.+)$/.exec(tok);
    if (m) {
      const c = Number(m[1]);
      if (!Number.isInteger(c) || c <= 0) throw new Error(`Hệ số "${m[1]}" phải là số nguyên dương`);
      return { givenCoeff: c, formula: parseFormula(m[2]!) };
    }
    return { givenCoeff: null, formula: parseFormula(tok) };
  });
}

/** Phân tích chuỗi phương trình hoá học (hỗ trợ ->, -->, →, ⇌, <=>, = và điều kiện trong ngoặc `--t°-->`). */
export function parseEquation(raw: string): ParsedEquation {
  const s = raw.normalize("NFC").trim();
  if (!s) throw new Error("Phương trình hoá học rỗng");

  // Tìm mũi tên phản ứng (ưu tiên mũi tên thuận nghịch, rồi mũi tên kèm điều kiện, rồi ->, →, =)
  const arrowPatterns: { re: RegExp; arrow: "→" | "⇌" }[] = [
    { re: /\s*(?:⇌|<=>|<->|⇄)\s*/, arrow: "⇌" },
    { re: /\s*-+\s*\(([^)]{1,30})\)\s*->\s*/, arrow: "→" },
    { re: /\s*--?>\s*/, arrow: "→" },
    { re: /\s*→\s*/, arrow: "→" },
    { re: /\s*=\s*/, arrow: "→" },
  ];

  for (const pat of arrowPatterns) {
    const m = pat.re.exec(s);
    if (m) {
      const lhs = s.slice(0, m.index);
      const rhs = s.slice(m.index + m[0].length);
      if (pat.re.test(rhs)) throw new Error("Phương trình chỉ được có đúng một mũi tên phản ứng");
      return {
        raw,
        arrow: pat.arrow,
        ...(m[1] ? { condition: m[1].trim() } : {}),
        reactants: splitSide(lhs),
        products: splitSide(rhs),
      };
    }
  }
  throw new Error('Không tìm thấy mũi tên phản ứng (dùng "→", "->", "⇌" hoặc "=")');
}

export interface AtomBalanceItem {
  element: string;
  left: number;
  right: number;
  diff: number;
  balanced: boolean;
}

export interface ChargeBalanceCheck {
  left: number;
  right: number;
  diff: number;
  balanced: boolean;
}

export interface BalanceResultOk {
  ok: true;
  parsed: ParsedEquation;
  leftCoeffs: number[];
  rightCoeffs: number[];
  coefficients: number[];
  isIonic: boolean;
  balancedAscii: string;
  balancedUnicode: string;
  atoms: AtomBalanceItem[];
  charge: ChargeBalanceCheck;
}

export interface BalanceResultErr {
  ok: false;
  code: "parse_error" | "missing_element" | "no_positive_solution" | "ambiguous";
  error: string;
  missingLeft?: string[];
  missingRight?: string[];
}

export type BalanceResult = BalanceResultOk | BalanceResultErr;

/** Kiểm tra bảng đếm nguyên tử và điện tích hai vế với một bộ hệ số bất kỳ. */
export function evaluateBalance(parsed: ParsedEquation, leftCoeffs: number[], rightCoeffs: number[]): {
  atoms: AtomBalanceItem[];
  charge: ChargeBalanceCheck;
  allBalanced: boolean;
  isMinimal: boolean;
  gcd: number;
} {
  if (leftCoeffs.length !== parsed.reactants.length || rightCoeffs.length !== parsed.products.length) {
    throw new Error("Số lượng hệ số không khớp với số chất trong phương trình");
  }
  const elements = new Set<string>();
  for (const sp of [...parsed.reactants, ...parsed.products]) {
    for (const el of Object.keys(sp.formula.atoms)) elements.add(el);
  }
  const sortedEls = [...elements].sort();

  let leftCharge = 0;
  let rightCharge = 0;
  const atoms: AtomBalanceItem[] = sortedEls.map((el) => {
    let left = 0;
    let right = 0;
    parsed.reactants.forEach((sp, i) => {
      left += (sp.formula.atoms[el] ?? 0) * leftCoeffs[i]!;
    });
    parsed.products.forEach((sp, i) => {
      right += (sp.formula.atoms[el] ?? 0) * rightCoeffs[i]!;
    });
    return { element: el, left, right, diff: left - right, balanced: left === right };
  });

  parsed.reactants.forEach((sp, i) => {
    leftCharge += sp.formula.charge * leftCoeffs[i]!;
  });
  parsed.products.forEach((sp, i) => {
    rightCharge += sp.formula.charge * rightCoeffs[i]!;
  });

  const charge: ChargeBalanceCheck = {
    left: leftCharge,
    right: rightCharge,
    diff: leftCharge - rightCharge,
    balanced: leftCharge === rightCharge,
  };

  const allCoeffs = [...leftCoeffs, ...rightCoeffs];
  const allPosInt = allCoeffs.every((c) => Number.isInteger(c) && c > 0);
  let g = 0n;
  if (allPosInt) {
    g = BigInt(allCoeffs[0]!);
    for (let i = 1; i < allCoeffs.length; i++) g = gcdBi(g, BigInt(allCoeffs[i]!));
  }
  const allBalanced = allPosInt && atoms.every((a) => a.balanced) && charge.balanced;

  return {
    atoms,
    charge,
    allBalanced,
    isMinimal: allBalanced && g === 1n,
    gcd: Number(g),
  };
}

function formatBalancedStrings(parsed: ParsedEquation, leftCoeffs: number[], rightCoeffs: number[]) {
  const fmtSideAscii = (list: EquationSpecies[], coeffs: number[]) =>
    list.map((sp, i) => `${coeffs[i]! > 1 ? coeffs[i] : ""}${sp.formula.canonical}${sp.formula.state ? `(${sp.formula.state})` : ""}`).join(" + ");
  const fmtSideUni = (list: EquationSpecies[], coeffs: number[]) =>
    list.map((sp, i) => `${coeffs[i]! > 1 ? coeffs[i] : ""}${formatFormulaUnicode(sp.formula)}`).join(" + ");
  return {
    balancedAscii: `${fmtSideAscii(parsed.reactants, leftCoeffs)} ${parsed.arrow === "⇌" ? "⇌" : "->"} ${fmtSideAscii(parsed.products, rightCoeffs)}`,
    balancedUnicode: `${fmtSideUni(parsed.reactants, leftCoeffs)} ${parsed.arrow} ${fmtSideUni(parsed.products, rightCoeffs)}`,
  };
}

/**
 * Cân bằng phương trình hoá học tất định bằng đại số tuyến tính (Gauss-Jordan trên ℚ).
 */
export function balanceEquation(rawOrParsed: string | ParsedEquation): BalanceResult {
  let parsed: ParsedEquation;
  try {
    parsed = typeof rawOrParsed === "string" ? parseEquation(rawOrParsed) : rawOrParsed;
  } catch (e) {
    return { ok: false, code: "parse_error", error: (e as Error).message };
  }

  const leftEls = new Set<string>();
  const rightEls = new Set<string>();
  for (const r of parsed.reactants) for (const el of Object.keys(r.formula.atoms)) leftEls.add(el);
  for (const p of parsed.products) for (const el of Object.keys(p.formula.atoms)) rightEls.add(el);

  const missingRight = [...leftEls].filter((e) => !rightEls.has(e)).sort();
  const missingLeft = [...rightEls].filter((e) => !leftEls.has(e)).sort();
  if (missingLeft.length > 0 || missingRight.length > 0) {
    const parts: string[] = [];
    if (missingRight.length) parts.push(`vế phải thiếu nguyên tố: ${missingRight.join(", ")}`);
    if (missingLeft.length) parts.push(`vế trái thiếu nguyên tố: ${missingLeft.join(", ")}`);
    return {
      ok: false,
      code: "missing_element",
      error: `Không thể cân bằng vì ${parts.join("; ")}.`,
      missingLeft,
      missingRight,
    };
  }

  const allEls = [...leftEls].sort();
  const nLeft = parsed.reactants.length;
  const nRight = parsed.products.length;
  const totalSpecies = nLeft + nRight;
  const isIonic = [...parsed.reactants, ...parsed.products].some((s) => s.formula.charge !== 0);

  // Dựng ma trận bảo toàn nguyên tố (+ 1 hàng bảo toàn điện tích nếu có ion/electron)
  const matrix: Rat[][] = allEls.map((el) => {
    const row: Rat[] = [];
    for (const r of parsed.reactants) row.push([BigInt(r.formula.atoms[el] ?? 0), 1n]);
    for (const p of parsed.products) row.push([-BigInt(p.formula.atoms[el] ?? 0), 1n]);
    return row;
  });

  if (isIonic) {
    const chargeRow: Rat[] = [];
    for (const r of parsed.reactants) chargeRow.push([BigInt(r.formula.charge), 1n]);
    for (const p of parsed.products) chargeRow.push([-BigInt(p.formula.charge), 1n]);
    matrix.push(chargeRow);
  }

  const basis = nullspaceBasis(matrix);
  if (basis.length === 0) {
    return {
      ok: false,
      code: "no_positive_solution",
      error: "Hệ phương trình bảo toàn nguyên tố/điện tích chỉ có nghiệm tầm thường (không thể cân bằng).",
    };
  }
  if (basis.length > 1) {
    return {
      ok: false,
      code: "ambiguous",
      error: `Phương trình có vô số tỉ lệ cân bằng độc lập (bậc tự do = ${basis.length}), không có bộ hệ số tối giản duy nhất.`,
    };
  }

  const coeffs = toMinimalPositiveIntegers(basis[0]!);
  if (!coeffs || coeffs.length !== totalSpecies) {
    return {
      ok: false,
      code: "no_positive_solution",
      error: "Không tồn tại bộ hệ số nguyên dương để cân bằng phương trình này (kiểm tra lại công thức hoặc điện tích các chất).",
    };
  }

  const leftCoeffs = coeffs.slice(0, nLeft);
  const rightCoeffs = coeffs.slice(nLeft);
  const check = evaluateBalance(parsed, leftCoeffs, rightCoeffs);
  if (!check.allBalanced) {
    return { ok: false, code: "no_positive_solution", error: "Tự kiểm sau khi giải không đạt bảo toàn nguyên tử/điện tích." };
  }

  const { balancedAscii, balancedUnicode } = formatBalancedStrings(parsed, leftCoeffs, rightCoeffs);
  return {
    ok: true,
    parsed,
    leftCoeffs,
    rightCoeffs,
    coefficients: coeffs,
    isIonic,
    balancedAscii,
    balancedUnicode,
    atoms: check.atoms,
    charge: check.charge,
  };
}

export interface StudentBalanceFeedback {
  ok: boolean;
  balanced: boolean;
  minimal: boolean;
  gcd: number;
  isIonic: boolean;
  atoms: AtomBalanceItem[];
  imbalancedElements: AtomBalanceItem[];
  charge: ChargeBalanceCheck;
  message: string;
  hint?: string;
}

/**
 * Kiểm tra bộ hệ số học sinh nhập trong phòng thí nghiệm tương tác hoặc câu hỏi cân bằng.
 * Báo rõ lệch nguyên tố nào (vế trái vs vế phải), lệch điện tích hay chưa tối giản.
 */
export function checkStudentBalance(rawOrParsed: string | ParsedEquation, userCoeffs: number[]): StudentBalanceFeedback {
  const parsed = typeof rawOrParsed === "string" ? parseEquation(rawOrParsed) : rawOrParsed;
  const nLeft = parsed.reactants.length;
  const total = nLeft + parsed.products.length;
  if (userCoeffs.length !== total) {
    throw new Error(`Cần đúng ${total} hệ số (nhận ${userCoeffs.length})`);
  }
  if (userCoeffs.some((c) => !Number.isInteger(c) || c <= 0)) {
    throw new Error("Mọi hệ số cân bằng phải là số nguyên dương (≥ 1)");
  }

  const leftCoeffs = userCoeffs.slice(0, nLeft);
  const rightCoeffs = userCoeffs.slice(nLeft);
  const isIonic = [...parsed.reactants, ...parsed.products].some((s) => s.formula.charge !== 0);
  const ev = evaluateBalance(parsed, leftCoeffs, rightCoeffs);
  const imbalancedElements = ev.atoms.filter((a) => !a.balanced);

  if (ev.isMinimal) {
    return {
      ok: true,
      balanced: true,
      minimal: true,
      gcd: 1,
      isIonic,
      atoms: ev.atoms,
      imbalancedElements: [],
      charge: ev.charge,
      message: "Chính xác! Phương trình đã cân bằng và các hệ số đã tối giản.",
    };
  }

  if (ev.allBalanced && !ev.isMinimal) {
    return {
      ok: false,
      balanced: true,
      minimal: false,
      gcd: ev.gcd,
      isIonic,
      atoms: ev.atoms,
      imbalancedElements: [],
      charge: ev.charge,
      message: `Số nguyên tử${isIonic ? " và điện tích" : ""} hai vế đã bằng nhau, nhưng hệ số chưa tối giản (cùng chia hết cho ${ev.gcd}).`,
      hint: `Chia tất cả các hệ số cho ${ev.gcd} để thu được bộ hệ số nguyên dương tối giản.`,
    };
  }

  const msgs: string[] = [];
  if (imbalancedElements.length > 0) {
    msgs.push(
      `Chưa cân bằng ở nguyên tố: ${imbalancedElements.map((a) => `${a.element} (trái ${a.left}, phải ${a.right})`).join("; ")}.`,
    );
  }
  if (isIonic && !ev.charge.balanced) {
    const fmtQ = (q: number) => (q > 0 ? `+${q}` : String(q));
    msgs.push(`Điện tích hai vế chưa bằng nhau (trái ${fmtQ(ev.charge.left)}, phải ${fmtQ(ev.charge.right)}).`);
  }

  const first = imbalancedElements[0];
  const hint = first
    ? first.left < first.right
      ? `Thử tăng hệ số của chất chứa ${first.element} ở vế trái (hiện thiếu ${first.right - first.left} nguyên tử ${first.element}).`
      : `Thử tăng hệ số của chất chứa ${first.element} ở vế phải (hiện thiếu ${first.left - first.right} nguyên tử ${first.element}).`
    : "Kiểm tra lại tổng điện tích ion ở hai vế.";

  return {
    ok: false,
    balanced: false,
    minimal: false,
    gcd: ev.gcd,
    isIonic,
    atoms: ev.atoms,
    imbalancedElements,
    charge: ev.charge,
    message: msgs.join(" "),
    hint,
  };
}
