// server/src/domain/mathText.ts
/** Chuỗi có công thức: chữ thường + LaTeX trong cặp $…$. Ngoài công thức, \$ là dấu đô la thường. */
export type Segment = { kind: "text" | "math"; value: string };

export function splitMath(s: string): Segment[] {
  const out: Segment[] = [];
  let buf = "";
  let inMath = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "\\" && s[i + 1] === "$") {
      buf += inMath ? "\\$" : "$";
      i++;
      continue;
    }
    if (ch === "$") {
      if (inMath) {
        const v = buf.trim();
        if (v) out.push({ kind: "math", value: v });
      } else if (buf) out.push({ kind: "text", value: buf });
      buf = "";
      inMath = !inMath;
      continue;
    }
    buf += ch;
  }
  if (inMath) out.push({ kind: "text", value: `$${buf}` });
  else if (buf) out.push({ kind: "text", value: buf });
  return out;
}

export function hasBalancedMath(s: string): boolean {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && s[i + 1] === "$") {
      i++;
      continue;
    }
    if (s[i] === "$") n++;
  }
  return n % 2 === 0;
}

const SYMBOLS: Record<string, string> = {
  pi: "π", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", varphi: "φ", phi: "φ", theta: "θ", lambda: "λ", mu: "μ",
  sigma: "σ", omega: "ω", Omega: "Ω", varepsilon: "ε", epsilon: "ε", infty: "∞", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠",
  approx: "≈", pm: "±", mp: "∓", cdot: "·", times: "×", div: "÷", in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆", cap: "∩", cup: "∪",
  varnothing: "∅", emptyset: "∅", perp: "⊥", parallel: "∥", triangle: "△", backsim: "∽", sim: "∼", circ: "°", to: "→", rightarrow: "→",
  Rightarrow: "⇒", Leftrightarrow: "⇔", iff: "⇔", forall: "∀", exists: "∃", setminus: "∖", angle: "∠", equiv: "≡", ldots: "…",
  dots: "…", cdots: "⋯", int: "∫", sum: "∑", prime: "′", lvert: "|", rvert: "|", mid: "|",
  sin: "sin", cos: "cos", tan: "tan", cot: "cot", ln: "ln", log: "log", lim: "lim", max: "max", min: "min",
  "{": "{", "}": "}", "$": "$", "%": "%", ",": " ", ";": " ", ":": " ", "!": "", " ": " ", quad: " ", qquad: " ",
};
const SUP: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "−": "⁻", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", k: "ᵏ", x: "ˣ", "′": "′",
};
const SUB: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "−": "₋", "-": "₋", "=": "₌", "(": "₍", ")": "₎", n: "ₙ", k: "ₖ", i: "ᵢ", x: "ₓ", a: "ₐ", m: "ₘ",
};
const BB: Record<string, string> = { R: "ℝ", N: "ℕ", Z: "ℤ", Q: "ℚ", C: "ℂ" };
const FUNCS = /(sin|cos|tan|cot|ln|log)([A-Za-zα-ω(])/g;

/** LaTeX → chữ thường Unicode gần đúng (dùng cho pptx, trò chơi, chỗ không có phương trình). */
export function latexToPlain(latex: string): string {
  const s = latex;
  let i = 0;
  const skipSpaces = () => {
    while (s[i] === " ") i++;
  };
  function readCommand(): string {
    i++;
    if (i >= s.length) return "";
    if (!/[A-Za-z]/.test(s[i]!)) return s[i++]!;
    let name = "";
    while (i < s.length && /[A-Za-z]/.test(s[i]!)) name += s[i++];
    return name;
  }
  function rawGroup(): string {
    skipSpaces();
    if (s[i] !== "{") return s[i++] ?? "";
    let depth = 0;
    let out = "";
    for (; i < s.length; i++) {
      const ch = s[i]!;
      if (ch === "{" && depth++ === 0) continue;
      if (ch === "}" && --depth === 0) {
        i++;
        break;
      }
      out += ch;
    }
    return out;
  }
  function arg(): string {
    skipSpaces();
    if (s[i] === "{") {
      i++;
      const v = seq("}");
      i++;
      return v;
    }
    if (s[i] === "\\") return command(readCommand());
    return s[i++] ?? "";
  }
  function optArg(): string | null {
    skipSpaces();
    if (s[i] !== "[") return null;
    i++;
    const v = seq("]");
    i++;
    return v;
  }
  const wrap = (v: string) => (v.length > 1 && /[+\-−·×/= ]/.test(v) ? `(${v})` : v);
  function script(v: string, map: Record<string, string>, mark: string): string {
    if (v === "°") return "°";
    const conv = [...v].map((c) => map[c]);
    return v && conv.every(Boolean) ? conv.join("") : `${mark}(${v})`;
  }
  function command(c: string): string {
    switch (c) {
      case "frac":
      case "dfrac":
      case "tfrac": {
        const a = arg();
        const b = arg();
        return `${wrap(a)}/${wrap(b)}`;
      }
      case "sqrt": {
        const n = optArg();
        const v = arg();
        const root = n === "3" ? "∛" : n === "4" ? "∜" : n ? `${script(n, SUP, "^")}√` : "√";
        return root + wrap(v);
      }
      case "widehat":
      case "hat":
        return `∠${arg()}`;
      case "overrightarrow":
      case "vec":
        return `→${arg()}`;
      case "overline":
      case "bar":
        return arg();
      case "text":
      case "mathrm":
      case "operatorname":
      case "textbf":
        return rawGroup();
      case "mathbf":
        return arg();
      case "mathbb": {
        const v = arg();
        return BB[v] ?? v;
      }
      case "begin": {
        const env = rawGroup();
        if (env === "array") rawGroup();
        const endTag = `\\end{${env}}`;
        const end = s.indexOf(endTag, i);
        const body = end < 0 ? s.slice(i) : s.slice(i, end);
        i = end < 0 ? s.length : end + endTag.length;
        const rows = body
          .split("\\\\")
          .map((r) => latexToPlain(r.replace(/&/g, "")))
          .filter(Boolean);
        return env === "cases" ? `{${rows.join("; ")}}` : rows.join("; ");
      }
      default:
        return SYMBOLS[c] ?? c;
    }
  }
  function seq(stop?: string): string {
    let out = "";
    while (i < s.length && s[i] !== stop) {
      const ch = s[i]!;
      if (ch === " ") {
        i++;
        continue;
      }
      if (ch === "\\") {
        if (s[i + 1] === "\\") {
          i += 2;
          out += "; ";
          continue;
        }
        const c = readCommand();
        if (c === "left" || c === "right") {
          skipSpaces();
          if (s[i] === ".") i++;
          continue;
        }
        if (c === "limits" || c === "displaystyle") continue;
        out += command(c);
        continue;
      }
      if (ch === "^") {
        i++;
        out += script(arg(), SUP, "^");
        continue;
      }
      if (ch === "_") {
        i++;
        out += script(arg(), SUB, "_");
        continue;
      }
      if (ch === "{") {
        i++;
        out += seq("}");
        i++;
        continue;
      }
      if (ch === "}") {
        i++;
        continue;
      }
      out += ch === "-" ? "−" : ch === "*" ? "·" : ch === "~" ? " " : ch;
      i++;
    }
    return out;
  }
  return seq().replace(FUNCS, "$1 $2").replace(/\s+/g, " ").trim();
}

export function toPlainText(s: string): string {
  return splitMath(s)
    .map((seg) => (seg.kind === "text" ? seg.value : latexToPlain(seg.value)))
    .join("");
}
