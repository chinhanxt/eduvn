const NUMW: Record<string, string> = { "không": "0", "một": "1", "mốt": "1", "hai": "2", "ba": "3", "bốn": "4", "tư": "4", "năm": "5", "lăm": "5", "sáu": "6", "bảy": "7", "tám": "8", "chín": "9", "mười": "10" };
const PHRASES: [string, string][] = [
  ["lớn hơn hoặc bằng", "≥"], ["nhỏ hơn hoặc bằng", "≤"], ["bé hơn hoặc bằng", "≤"], ["lớn hơn", ">"], ["nhỏ hơn", "<"], ["bé hơn", "<"],
  ["khác", "≠"], ["bằng", "="], ["cộng", "+"], ["trừ", "-"], ["âm", "-"], ["nhân", "×"], ["chia", ":"],
  ["bình phương", "^ 2"], ["lập phương", "^ 3"], ["mũ", "^"],
  ["căn bậc ba của", "cbrt"], ["căn bậc ba", "cbrt"], ["căn bậc hai của", "sqrt"], ["căn bậc hai", "sqrt"], ["căn của", "sqrt"], ["căn", "sqrt"],
  ["phần", "/"], ["phẩy", ","], ["mở ngoặc", "("], ["đóng ngoặc", ")"], ["pi", "π"], ["pai", "π"],
  ["ích", "x"], ["ít", "x"], ["i dài", "y"], ["y dài", "y"],
];
const OPX: Record<string, string> = { "+": "+", "-": "-", "=": "=", "<": "<", ">": ">", "≤": "\\le ", "≥": "\\ge ", "≠": "\\ne ", "×": "\\cdot ", ":": ":" };
const FUNCS = ["sin", "cos", "tan", "cot", "ln", "log"];

/** Câu đọc công thức tiếng Việt (như GV đọc cho HS chép) → LaTeX. Quy tắc, không cần AI. */
export function viToLatex(s: string): string {
  let t = ` ${s.toLowerCase().normalize("NFC").replace(/[.!?]/g, " ").replace(/\s+/g, " ")} `;
  for (const [p, r] of PHRASES) t = t.replace(new RegExp(`(?<=\\s)${p}(?=\\s)`, "g"), ` ${r} `);
  const merged: string[] = [];
  for (const w0 of t.trim().split(/\s+/).filter(Boolean)) {
    const w = NUMW[w0] ?? w0;
    const prev = merged[merged.length - 1];
    if (/^\d+$/.test(w) && prev !== undefined && (/^\d+$/.test(prev) || prev.endsWith("{,}"))) merged[merged.length - 1] = prev + w;
    else if (w === "," && prev !== undefined && /\d$/.test(prev)) merged[merged.length - 1] = `${prev}{,}`;
    else merged.push(w);
  }
  const tok = merged;
  let i = 0;
  const strip = (a: string) => a.replace(/^\\left\((.*)\\right\)$/, "$1");
  function operand(): string {
    const w = tok[i++];
    if (w === undefined) return "";
    if (w === "sqrt") return `\\sqrt{${strip(postfix())}}`;
    if (w === "cbrt") return `\\sqrt[3]{${strip(postfix())}}`;
    if (FUNCS.includes(w)) {
      let f = `\\${w}`;
      if (tok[i] === "^") {
        i++;
        f += `^{${strip(operand())}}`;
      }
      return `${f} ${postfix()}`;
    }
    if (w === "(") return `\\left(${seq(")")}\\right)`;
    if (w === "π") return "\\pi ";
    return w;
  }
  function postfix(): string {
    let a = operand();
    while (tok[i] === "^") {
      i++;
      a = `${a}^{${strip(operand())}}`;
    }
    return a;
  }
  function term(): string {
    let a = postfix();
    while (tok[i] === "/") {
      i++;
      a = `\\frac{${strip(a)}}{${strip(postfix())}}`;
    }
    return a;
  }
  function seq(end?: string): string {
    let out = "";
    while (i < tok.length && tok[i] !== end) {
      const w = tok[i]!;
      if (OPX[w] !== undefined) {
        i++;
        out += OPX[w];
      } else out += term();
    }
    if (end) i++;
    return out;
  }
  return seq();
}
