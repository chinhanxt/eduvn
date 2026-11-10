/** Biểu thức hàm số an toàn: chuỗi của AI → cây AST (danh sách lồng nhau). Không eval; Python chỉ duyệt cây qua whitelist. */
export type Ast = ["num", number] | ["x"] | ["a"] | ["const", "pi" | "e"] | ["neg", Ast] | ["fn", string, Ast] | [Bin, Ast, Ast];
type Bin = "add" | "sub" | "mul" | "div" | "pow";

const FUNCS: Record<string, (v: number) => number> = { sin: Math.sin, cos: Math.cos, tan: Math.tan, sqrt: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp };
const MAX_LEN = 120;
const MAX_NODES = 200;

type Tok = { k: "num"; v: number } | { k: "id"; v: string } | { k: "op"; v: string };

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:[.,]\d+)?)|([A-Za-z]+)|([-+*/^()×·÷]))/y;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) throw new Error(`Ký tự không hợp lệ trong biểu thức: "${src.slice(pos).trim()[0]}"`);
    pos = re.lastIndex;
    if (m[1] !== undefined) out.push({ k: "num", v: Number(m[1].replace(",", ".")) });
    else if (m[2] !== undefined) out.push({ k: "id", v: m[2].toLowerCase() });
    else out.push({ k: "op", v: m[3] === "×" || m[3] === "·" ? "*" : m[3] === "÷" ? "/" : (m[3] as string) });
  }
  return out;
}

/** Phân tích; ném Error tiếng Việt nếu sai. Cho phép nhân ngầm: 2x, 3(x+1), 2sin(x), x^2a. Biến: x và a. */
export function parseExpr(src: string): Ast {
  if (src.length > MAX_LEN) throw new Error("Biểu thức quá dài");
  const toks = lex(src.replace(/\*\*/g, "^"));
  if (toks.length === 0) throw new Error("Biểu thức rỗng");
  let i = 0;
  let nodes = 0;
  const node = <T extends Ast>(n: T): T => {
    if (++nodes > MAX_NODES) throw new Error("Biểu thức quá phức tạp");
    return n;
  };
  const peek = () => toks[i];
  const isOp = (v: string) => peek()?.k === "op" && peek()?.v === v;
  const startsAtom = () => {
    const t = peek();
    return !!t && (t.k === "num" || t.k === "id" || (t.k === "op" && t.v === "("));
  };

  function expr(): Ast {
    let l = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[i++] as Tok).v === "+" ? "add" : "sub";
      l = node([op, l, term()] as Ast);
    }
    return l;
  }
  function term(): Ast {
    let l = unary();
    for (;;) {
      if (isOp("*") || isOp("/")) {
        const op = (toks[i++] as Tok).v === "*" ? "mul" : "div";
        l = node([op, l, unary()] as Ast);
      } else if (startsAtom()) l = node(["mul", l, power()] as Ast);
      else return l;
    }
  }
  function unary(): Ast {
    if (isOp("-")) {
      i++;
      return node(["neg", unary()]);
    }
    if (isOp("+")) {
      i++;
      return unary();
    }
    return power();
  }
  function power(): Ast {
    const base = atom();
    if (isOp("^")) {
      i++;
      return node(["pow", base, unary()]);
    }
    return base;
  }
  function atom(): Ast {
    const t = toks[i++];
    if (!t) throw new Error("Biểu thức thiếu vế");
    if (t.k === "num") return node(["num", t.v]);
    if (t.k === "op" && t.v === "(") {
      const e = expr();
      if (!isOp(")")) throw new Error("Thiếu dấu )");
      i++;
      return e;
    }
    if (t.k === "id") {
      if (t.v === "x") return node(["x"]);
      if (t.v === "a") return node(["a"]);
      if (t.v === "pi") return node(["const", "pi"]);
      if (t.v === "e") return node(["const", "e"]);
      if (t.v in FUNCS) {
        let arg: Ast;
        if (isOp("(")) {
          i++;
          arg = expr();
          if (!isOp(")")) throw new Error("Thiếu dấu )");
          i++;
        } else arg = power();
        return node(["fn", t.v, arg]);
      }
      throw new Error(`Không hỗ trợ "${t.v}" (chỉ x, a, pi, e, sin, cos, tan, sqrt, abs, ln, log, exp)`);
    }
    throw new Error(`Dấu "${t.v}" đặt sai chỗ`);
  }

  const ast = expr();
  if (i < toks.length) throw new Error("Biểu thức thừa phần cuối");
  return ast;
}

/** Tính giá trị (dùng để kiểm thử và để biết đồ thị có điểm nào vẽ được). */
export function evalAst(n: Ast, x: number, a = 0): number {
  switch (n[0]) {
    case "num": return n[1];
    case "x": return x;
    case "a": return a;
    case "const": return n[1] === "pi" ? Math.PI : Math.E;
    case "neg": return -evalAst(n[1], x, a);
    case "fn": return (FUNCS[n[1]] as (v: number) => number)(evalAst(n[2], x, a));
    default: {
      const l = evalAst(n[1], x, a);
      const r = evalAst(n[2], x, a);
      return n[0] === "add" ? l + r : n[0] === "sub" ? l - r : n[0] === "mul" ? l * r : n[0] === "div" ? l / r : l ** r;
    }
  }
}
