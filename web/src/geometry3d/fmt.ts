// web/src/geometry3d/fmt.ts — định dạng số đo kiểu lời giải SGK: a√6/3, 45°, tan φ = √2.

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/** x² ≈ p/q với q nhỏ → [m, n, q] sao cho x = m√n / q (n không chính phương). */
export function surd(x: number, maxQ = 60): [number, number, number] | null {
  if (!Number.isFinite(x) || x < 0) return null;
  const x2 = x * x;
  for (let q = 1; q <= maxQ; q++) {
    const p = Math.round(x2 * q);
    if (p === 0 && x > 1e-9) continue;
    if (Math.abs(p / q - x2) > 1e-9 * Math.max(1, x2)) continue;
    // x = √(p/q) = √(p·q) / q
    let n = p * q;
    let m = 1;
    for (let k = 2; k * k <= n; k++) while (n % (k * k) === 0) {
      n /= k * k;
      m *= k;
    }
    const g = gcd(m, q);
    return [m / g, n, q / g];
  }
  return null;
}

const dec = (x: number, d = 2): string => (Math.round(x * 10 ** d) / 10 ** d).toString().replace(".", ",");

/** Độ dài theo đơn vị a: 1 → "a", 0,5 → "a/2", √6/3 → "a√6/3"; không nhận ra căn → "≈ 0,82a". */
export function fmtLen(x: number, unit = "a"): string {
  if (Math.abs(x) < 1e-9) return "0";
  const s = surd(x);
  if (!s) return `≈ ${dec(x)}${unit}`;
  const [m, n, q] = s;
  const coef = m === 1 ? "" : String(m);
  const body = n === 1 ? `${coef || ""}${unit}` : `${coef}${unit}√${n}`;
  return q === 1 ? body : `${body}/${q}`;
}

/** Số thuần (tỉ số lượng giác…): √2/2, 1/3, ≈ 0,47. */
export function fmtRatio(x: number): string {
  if (Math.abs(x) < 1e-9) return "0";
  const s = surd(Math.abs(x));
  const sign = x < 0 ? "−" : "";
  if (!s) return `≈ ${sign}${dec(Math.abs(x))}`;
  const [m, n, q] = s;
  const body = n === 1 ? String(m) : `${m === 1 ? "" : m}√${n}`;
  return sign + (q === 1 ? body : `${body}/${q}`);
}

/** Góc tròn số độ (sai số do toạ độ AI làm tròn tới ~0,01°) ghi gọn "60°". */
const ROUND_DEG = 0.01;
export const fmtDeg = (deg: number): string => {
  const r = Math.round(deg);
  return Math.abs(deg - r) < ROUND_DEG ? `${r}°` : `≈ ${dec(deg, 1)}°`;
};

/** Góc kèm tan khi không tròn số độ (đáp án SGK hay cho tan). */
export function fmtAngle(deg: number): string {
  const r = Math.round(deg);
  if (Math.abs(deg - r) < ROUND_DEG) return `${r}°`;
  return `${fmtDeg(deg)} (tan = ${fmtRatio(Math.tan((deg * Math.PI) / 180))})`;
}

/** A' → A′ (dấu phẩy trên kiểu sách). */
export const prettyName = (n: string): string => n.replace(/'/g, "′");
