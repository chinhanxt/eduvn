// web/src/solution/expr.ts — biểu thức hàm số an toàn để vẽ đồ thị lời giải (không eval): x, số, + - * / ^, hàm sơ cấp, pi, e.
type Fn = (x: number) => number;
const FUNCS: Record<string, (v: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp };

export function compilePlain(src: string): Fn {
  const s = src
    .replace(/\\left|\\right|\$/g, "")
    .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))")
    .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
    .replace(/\\(sin|cos|tan|ln|log|exp)/g, "$1")
    .replace(/\\cdot|[×·]/g, "*")
    .replace(/π|\\pi/g, "pi")
    .replace(/[−–]/g, "-")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/^\s*(y|f\(x\))\s*=/, "");
  const toks = s.match(/\d+(?:[.,]\d+)?|[a-z]+|[-+*/^()]|\S/gi) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const fail = (): never => {
    throw new Error("Biểu thức không hợp lệ");
  };
  const atom = (): Fn => {
    const t = toks[i++] ?? fail();
    if (/^\d/.test(t)) {
      const v = Number(t.replace(",", "."));
      return () => v;
    }
    if (t === "(") {
      const e = expr();
      if (toks[i++] !== ")") fail();
      return e;
    }
    const w = t.toLowerCase();
    if (w === "x") return (x) => x;
    if (w === "pi") return () => Math.PI;
    if (w === "e") return () => Math.E;
    const f = FUNCS[w];
    if (f) {
      const a = peek() === "(" ? atom() : power();
      return (x) => f(a(x));
    }
    return fail();
  };
  const power = (): Fn => {
    const b = atom();
    if (peek() === "^") {
      i++;
      const e = unary();
      return (x) => b(x) ** e(x);
    }
    return b;
  };
  const unary = (): Fn => {
    if (peek() === "-") {
      i++;
      const u = unary();
      return (x) => -u(x);
    }
    if (peek() === "+") i++;
    return power();
  };
  const term = (): Fn => {
    let l = unary();
    for (;;) {
      const t = peek();
      if (t === "*" || t === "/") {
        i++;
        const r = unary(), a = l;
        l = t === "*" ? (x) => a(x) * r(x) : (x) => a(x) / r(x);
      } else if (t !== undefined && t !== ")" && !/^[-+]$/.test(t)) {
        const r = power(), a = l;
        l = (x) => a(x) * r(x);
      } else return l;
    }
  };
  function expr(): Fn {
    let l = term();
    while (peek() === "+" || peek() === "-") {
      const op = toks[i++], r = term(), a = l;
      l = op === "+" ? (x) => a(x) + r(x) : (x) => a(x) - r(x);
    }
    return l;
  }
  if (toks.length > 200) fail();
  const f = expr();
  if (i !== toks.length) fail();
  return f;
}

/** Số dạng chữ "-1", "1/2", "√2", "0,5" (dùng cho toạ độ điểm đặc biệt). */
export function plainNumber(s: string): number {
  return compilePlain(s.replace(/√\s*(\d+(?:[.,]\d+)?)/g, "sqrt($1)"))(0);
}
