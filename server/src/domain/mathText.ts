// server/src/domain/mathText.ts
/** Chuỗi có công thức: chữ thường + LaTeX trong cặp $…$. Ngoài công thức, \$ là dấu đô la thường. */
export type Segment = { kind: "text" | "math"; value: string };

export function splitMath(s: string): Segment[] {
  const out: Segment[] = [];
  let buf = "";
  let inMath = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === "\\") {
      let n = 1;
      while (s[i + n] === "\\") n++;
      if (s[i + n] !== "$") {
        buf += "\\".repeat(n);
        i += n - 1;
      } else if (n % 2 === 1) {
        // số lẻ dấu \ trước $: $ là dấu đô la thường
        buf += "\\".repeat(n - 1) + (inMath ? "\\$" : "$");
        i += n;
      } else {
        // số chẵn: \\ = một dấu \ thường (trong chữ), $ là dấu mở/đóng công thức
        buf += "\\".repeat(inMath ? n : n - 1);
        i += n - 1;
      }
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
    if (s[i] === "\\") {
      let k = 1;
      while (s[i + k] === "\\") k++;
      if (s[i + k] === "$" && k % 2 === 1) i += k;
      else i += k - 1;
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
  leqslant: "≤", geqslant: "≥",
  rho: "ρ", tau: "τ", xi: "ξ", zeta: "ζ", eta: "η", kappa: "κ", nu: "ν", chi: "χ", psi: "ψ", upsilon: "υ", iota: "ι",
  Gamma: "Γ", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Lambda: "Λ", Theta: "Θ", Pi: "Π",
  leftarrow: "←", Leftarrow: "⇐", leftrightarrow: "↔", therefore: "∴", because: "∵", wedge: "∧", vee: "∨", neg: "¬",
  nabla: "∇", partial: "∂", degree: "°", ell: "ℓ",
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
const FUNCS = new Set(["sin", "cos", "tan", "cot", "sinh", "cosh", "tanh", "ln", "log", "lim", "max", "min"]);
const SIZING = new Set(["big", "Big", "bigg", "Bigg", "bigl", "bigr", "Bigl", "Bigr", "biggl", "biggr", "Biggl", "Biggr"]);

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
      case "mathcal":
      case "mathscr":
      case "mathfrak":
      case "boldsymbol":
        return arg();
      case "binom":
      case "dbinom":
      case "tbinom": {
        const a = arg();
        const b = arg();
        return `C(${a}, ${b})`;
      }
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
        if (FUNCS.has(c)) {
          skipSpaces();
          return /[A-Za-z0-9(\\α-ω]/.test(s[i] ?? "") ? `${c} ` : c;
        }
        if (SYMBOLS[c] !== undefined) return SYMBOLS[c]!;
        return /[A-Za-z]/.test(c) ? "" : c;
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
        if (c === "left" || c === "right" || SIZING.has(c)) {
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
  return seq().replace(/\s+/g, " ").trim();
}

export function toPlainText(s: string): string {
  return splitMath(s)
    .map((seg) => (seg.kind === "text" ? seg.value : latexToPlain(seg.value)))
    .join("");
}
