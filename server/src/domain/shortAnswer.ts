// server/src/domain/shortAnswer.ts
/** Trả lời ngắn: so khớp theo tinh thần luật TextInput/NumericInput của Oppia
 *  (https://github.com/oppia/oppia, Apache-2.0; viết lại bằng TS, không chép mã):
 *  - Unicode NFC, không phân biệt hoa thường, bỏ mọi khoảng trắng;
 *  - dấu phẩy thập phân = dấu chấm; bỏ $…$ và lệnh LaTeX trình bày ({,}, \left, \right, \, …);
 *  - \frac{a}{b}, \dfrac, \frac32, \sqrt{x}, \sqrt2 đổi về dạng chữ (a)/(b), sqrt(x);
 *  - nếu cả hai là số (thập phân hoặc phân số a/b) thì so với sai số tương đối 1e-9 (tối thiểu 1e-9 quanh 0);
 *  - đáp án chuẩn có thể có nhiều cách viết, tách bằng "|". */
export const REL_TOL = 1e-9;

const LATEX_WORDS: [RegExp, string][] = [
  [/\\left|\\right/g, ""],
  [/\\[,;:! ]/g, ""],
  [/\\leq?(?![a-zA-Z])/g, "<="],
  [/\\geq?(?![a-zA-Z])/g, ">="],
  [/\\neq?(?![a-zA-Z])/g, "≠"],
  [/\\infty/g, "∞"],
  [/\\pi/g, "π"],
  [/\\%/g, "%"],
  [/\\cdot|\\times/g, "*"],
  [/\\[dt]frac/g, "\\frac"],
];

function unwrap(s: string): string {
  let prev = "";
  let cur = s;
  while (prev !== cur) {
    prev = cur;
    cur = cur
      .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\\sqrt(\d)/g, "sqrt($1)")
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\frac(\d)(\d)/g, "($1)/($2)");
  }
  return cur;
}

export function normalizeAnswer(raw: string): string {
  let s = raw.normalize("NFC").replace(/\$/g, "").replace(/\{,\}/g, ",");
  for (const [re, to] of LATEX_WORDS) s = s.replace(re, to);
  s = unwrap(s);
  s = s
    .replace(/[−–‐‑]/g, "-")
    .replace(/√\(([^()]*)\)/g, "sqrt($1)")
    .replace(/√(\d+(?:[.,]\d+)?|[a-zA-Z])/g, "sqrt($1)")
    .replace(/√\(/g, "sqrt(")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[{}]/g, "");
  // Quy ước Việt Nam: dấu phẩy là thập phân; dấu chấm là phân cách hàng nghìn CHỈ khi cả số dạng 1.250.000 / 1.250,5.
  if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "");
  return s.replace(/,/g, ".");
}

/** Bỏ ngoặc bọc thừa (không phải ngoặc hàm, không chứa phép/dấu tách) để "sqrt(3)/2" == "(sqrt(3))/(2)". */
function canon(s: string): string {
  let prev = "";
  let cur = s;
  while (prev !== cur) {
    prev = cur;
    cur = cur.replace(/(^|[^a-z])\(((?:[^()+\-*/,;<>=]|[a-z]+\([^()]*\))*)\)/g, "$1$2");
  }
  return cur;
}

const NUM = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)`;
const PLAIN = new RegExp(`^${NUM}$`);
const FRACTION = new RegExp(`^([+-]?)\\(?(${NUM})\\)?/\\(?(${NUM})\\)?$`);

/** Chuỗi đã chuẩn hoá → số (thập phân hoặc phân số), không phải số → null. */
export function parseNumber(s: string): number | null {
  if (s.split("(").length !== s.split(")").length) return null;
  if (PLAIN.test(s)) return Number(s);
  const m = FRACTION.exec(s);
  if (!m) return null;
  const d = Number(m[3]);
  if (d === 0) return null;
  const v = Number(m[2]) / d;
  return m[1] === "-" ? -v : v;
}

/** Tách bằng "|"; "\\|" là dấu | nguyên văn. */
export const acceptedAnswers = (key: string): string[] =>
  key
    .replace(/\\\|/g, "\u0000")
    .split("|")
    .map((k) => k.replaceAll("\u0000", "|").trim())
    .filter(Boolean);

function equalsOne(response: string, accepted: string): boolean {
  const x = normalizeAnswer(response);
  const y = normalizeAnswer(accepted);
  if (x === "" || y === "") return false;
  if (x === y || canon(x) === canon(y)) return true;
  const a = parseNumber(canon(x));
  const b = parseNumber(canon(y));
  return a !== null && b !== null && Math.abs(a - b) <= REL_TOL * Math.max(1, Math.abs(a), Math.abs(b));
}

export function matchShortAnswer(response: string, key: string): boolean {
  return acceptedAnswers(key).some((k) => equalsOne(response, k));
}
