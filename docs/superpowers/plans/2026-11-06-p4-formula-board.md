# P4 — Ô công thức + Bảng giảng (đồ thị, hình 3D, gợi ý bài) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến 2 mockup đã duyệt thành chức năng thật, **chưa có trợ giảng AI nói chuyện**: (1) GV nhập công thức không cần biết LaTeX (bàn phím toán VN, gõ tắt, đọc), lưu trong ngân hàng câu hỏi, xuất Word ra phương trình thật; (2) Bảng giảng: bút, đồ thị hàm số có thanh trượt, hình không gian 3D (xoay, lấy điểm, cắt thiết diện, đo góc), gợi ý bài liên quan từ ngân hàng + chiếu câu + tạo trò chơi; lưu bài giảng.

**Architecture:** Mọi chuỗi có công thức theo một quy ước: chữ thường + LaTeX trong cặp `$…$` (`\$` = dấu đô la thường). Server: `domain/mathText.ts` tách/kiểm/đổi sang chữ thường Unicode; Word dùng `latexToMath` của `docx/math` (phương trình sửa được), pptx + trò chơi dùng bản chữ thường. Bảng giảng là một tài liệu JSON (`BoardDoc`: trang → nét bút / đồ thị / hình khối) lưu ở bảng `boards`; server chỉ kiểm cấu trúc + giới hạn, còn hình học/đồ thị tính ở trình duyệt trong các module thuần `web/src/board/*.ts` (test bằng vitest). Gợi ý bài: `domain/related.ts` xếp hạng câu hỏi theo chủ đề + từ khoá rút từ trang bảng. Không dùng LLM.

**Tech Stack:** Như P1–P3 (Node 24, pnpm, TS 7, Fastify 5, Drizzle, PGlite, docx 9, React 19, Vite 8). Thêm ở `web/`: `mathlive@^0.111.4`, `@cortex-js/compute-engine@^0.181.1`, `perfect-freehand@^1.2.3`, dev `vitest@^5.1.0`.

**Spec:** `docs/specs/2026-11-05-eduvn-design.md` (R2 ngân hàng câu hỏi, ràng buộc toàn dự án) · Mockup đã duyệt: `web/mockup/cong-thuc.html`, `web/mockup/bang-giang.html` · Khảo sát: `docs/research/2026-11-06-llm-avatar-board-stack.md`.

## Global Constraints

- Node `>=24`, pnpm workspace, TypeScript ESM `strict: true`. Mọi lệnh chạy từ gốc repo `~/projects/eduvn`.
- Thư viện tối thiểu (spec): `fastify@^5.12.8`, `@modelcontextprotocol/sdk@^1.32.2`, `drizzle-orm@^0.45.4`, `drizzle-kit@^0.31.11`, `@electric-sql/pglite@^0.5.15`, `pg@^8.23.1`, `jose@^6.2.15`, `zod@^4.6.7`, `docx@^9.15.2`, `vitest@^5.1.0`, `typescript@^7.0.2`, `tsx@^4.23.15`.
- Test DB = PGlite trong tiến trình. **Không bật Docker khi chạy test.** Docker chỉ dùng ở Task 15 (smoke).
- **Một tác vụ nặng mỗi lúc** (test lớn, build, smoke); không chạy song song.
- Logic nghiệp vụ server chỉ trong `server/src/domain/` (thuần, không I/O).
- Định danh code tiếng Anh; nội dung hiển thị tiếng Việt có dấu; tên tool MCP tiếng Việt không dấu `snake_case`.
- Cổng dev: server 4310, Postgres 5442, Keycloak 8180, web 5173.
- **Quy ước công thức:** chuỗi = chữ + LaTeX trong `$…$`; `\$` ngoài công thức = dấu đô la; `$` chưa đóng là lỗi nhập liệu.
- **Không** nhận dạng chữ viết tay / hình vẽ tay ở đợt này (cần mô hình riêng, đợt sau). Trên bảng: công thức nhập bằng ô công thức (bàn phím, gõ tắt, đọc); hình khối lấy từ thư viện hình.
- Chỉ dùng thư viện MIT/Apache/BSD. Không dùng tldraw, GeoGebra, Desmos.
- CSS mới phải có tiền tố: `me-` (ô công thức), `kb-` (bàn phím toán), `bd-` (bảng giảng). `styles.css` đã dùng `.tabs .chip .hint .opt .score .card .cards` — không được đè.
- Giao diện: ít chữ, icon Lucide SVG trong `web/src/sprite.ts`, thẻ đổ bóng; nền bảng `#242b35`, thanh công cụ trái navy `#1e2340`, màu nhấn `#4f6bed`.
- Bảng: hệ toạ độ cố định 1280×720 (SVG `viewBox`); phần HTML trên bảng nằm trong `<foreignObject>` nên tự co giãn theo bảng.

## Đã kiểm trước (probe 2026-11-06)

- `docx@9.15.2`: `import { latexToMath } from "docx/math"` trả `MathComponent[]`; dùng `new Math({ children })` (import `Math` từ `docx`). Đã chạy được ~80 lệnh hay gặp (`\frac`, `\sqrt[n]`, `\widehat`, `\overrightarrow`, `cases`, `array`, `\lim\limits`, `\int`, `\sum`, `C_n^k`, `\left…\right`, `{,}`, chữ Hy Lạp, `\le\ge\ne`, `\in\subset\cap\cup`, `\perp\parallel`…). Riêng `\mathbb{R}` ra chữ R thường → phải đổi trước sang `ℝ`. LaTeX hỏng (thiếu `}`, lệnh lạ, `x^` cụt) → **ném lỗi** → bắt lỗi và chèn chữ thường thay thế.
- LibreOffice vẽ sai vài công thức dù XML trong .docx đúng (`[1;2)` → `¿`, chữ `DEF` → `≝`) vì bộ chuyển OMML→StarMath của nó. Với các ca đó kiểm bằng XML, không kiểm bằng ảnh LibreOffice.
- `@cortex-js/compute-engine@0.181.1`: `import { ComputeEngine, compile } from "@cortex-js/compute-engine"`; `ce.parse(latex)`; `y=…` và `f(x)=…` có `operator === "Equal"`, vế trái `op1` (`symbol === "y"` hoặc `["f","x"]`), vế phải `op2`; `expr.unknowns` liệt kê ẩn và tham số (vd `["A","B","x"]`); `compile(expr).run({ x, A, B })` trả số; ngoài miền → `NaN`/`Infinity`; LaTeX hỏng → `isValid === false`. 2000 lần `run` ≈ 11 ms.
- `mathlive@0.111.4`: gõ thật áp dụng `inlineShortcuts` (vd `can2` → `\sqrt2`); `MathfieldElement.decimalSeparator = ","`; font qua `import "mathlive/fonts.css"` + `MathfieldElement.fontsDirectory = null`; sự kiện `move-out` (detail.direction) để ra khỏi ô; `executeCommand(["insert", latex, { selectionMode: "placeholder" }])`; `convertLatexToMarkup(latex)` để hiển thị tĩnh (cần `mathlive/static.css`).
- `web/mockup/cong-thuc.html` là bản chạy được của: ô toán chen giữa chữ (contenteditable + `<math-field>` bọc trong `span[contenteditable=false]`), bàn phím VN, bộ chuyển giọng đọc. `web/mockup/bang-giang.html` là bản chạy được của: chiếu 3D trực giao, ẩn cạnh khuất theo pháp tuyến mặt, thiết diện mặt phẳng ∩ khối lồi, cung đo góc, đồ thị SVG. Code dưới đây lấy từ đó.

## Cấu trúc file

**Server**
| File | Trách nhiệm |
|---|---|
| Create `server/src/domain/mathText.ts` | Tách `$…$`, kiểm cân dấu, LaTeX → chữ thường Unicode |
| Modify `server/src/domain/question.ts` | Kiểu chuỗi có công thức cho stem/options/statements/answer/rubric/explanation |
| Create `server/src/export/mathDocx.ts` | Chuỗi có công thức → `TextRun` + phương trình Word |
| Modify `server/src/export/docx.ts` | Đề + đáp án dùng `mathRuns` |
| Modify `server/src/domain/games.ts`, `server/src/export/slides.ts` | Đổi công thức sang chữ thường |
| Create `server/src/domain/related.ts` | Xếp hạng câu hỏi liên quan |
| Modify `server/src/service.ts`, `server/src/http/app.ts` | `relatedQuestions` + `GET /api/questions/related`; route `/api/boards*` |
| Create `server/src/domain/board.ts` | Schema + giới hạn `BoardDoc` |
| Create `server/src/services/boards.ts` | CRUD bảng giảng theo tổ chức |
| Modify `server/src/db/schema.ts`, `server/src/domain/authz.ts` | Bảng `boards`; quyền `board:manage`, `board:read` |
| Create `server/drizzle/0007_*.sql` | Sinh bằng drizzle-kit |
| Modify `server/src/mcp/server.ts`, `server/src/mcp/slides.ts` | Mô tả quy ước `$…$` cho AI |

**Web**
| File | Trách nhiệm |
|---|---|
| Create `web/vitest.config.ts`, `web/tests/*.test.ts` | Test module thuần |
| Create `web/src/math/segments.ts` | Tách/ghép `$…$`, lọc LaTeX nguy hiểm |
| Create `web/src/math/viToLatex.ts` | Câu đọc tiếng Việt → LaTeX |
| Create `web/src/math/keyboard.ts` | Dữ liệu bàn phím + gõ tắt |
| Create `web/src/math/mathStore.ts` | Ô toán đang mở (cho bàn phím dùng chung) |
| Create `web/src/math/setup.ts`, `web/src/math/math.css` | Nạp MathLive, font, CSS |
| Create `web/src/math/MathText.tsx` | Hiển thị chuỗi có công thức |
| Create `web/src/math/MathEditor.tsx` | Ô nhập chữ + công thức (`MathEditor`) và ô chỉ công thức (`MathField`) |
| Create `web/src/math/MathKeyboard.tsx`, `web/src/math/VoiceButton.tsx` | Bàn phím toán VN; nút đọc công thức |
| Create `web/src/board/geom3.ts`, `web/src/board/solids.ts` | Toán 3D: khối, chiếu, cạnh khuất, thiết diện, góc, chọn điểm |
| Create `web/src/board/graph.ts`, `web/src/board/ink.ts`, `web/src/board/doc.ts` | Đồ thị; nét bút; kiểu tài liệu + tiện ích |
| Create `web/src/board/useBoard.ts` | Trạng thái bảng: tải/lưu/hoàn tác/trang |
| Create `web/src/board/BoardPage.tsx`, `GraphView.tsx`, `SolidView.tsx`, `SuggestPanel.tsx`, `Projector.tsx`, `board.css` | Giao diện bảng |
| Create `web/src/pages/Boards.tsx` | Danh sách + tạo bài giảng |
| Modify `web/src/App.tsx`, `Shell.tsx`, `tools.ts`, `sprite.ts`, `api.ts`, `main.tsx`, `styles.css`, `pages/Bank.tsx`, `scripts/smoke.mjs`, `package.json` | Nối vào app |

**Docs:** `docs/ROADMAP.md` (dòng P4), `AGENTS.md` (lệnh test web).

---

### Task 1: Chuỗi có công thức ở server (`mathText`) + kiểm khi lưu câu hỏi

**Files:**
- Create: `server/src/domain/mathText.ts`
- Modify: `server/src/domain/question.ts`
- Modify: `server/src/mcp/server.ts` (mô tả `them_cau_hoi`)
- Test: `server/tests/domain/mathText.test.ts`

**Interfaces:**
- Produces: `type Segment = { kind: "text" | "math"; value: string }`; `splitMath(s: string): Segment[]`; `hasBalancedMath(s: string): boolean`; `latexToPlain(latex: string): string`; `toPlainText(s: string): string`. `QuestionInput` từ chối chuỗi có `$` chưa đóng với thông báo chứa `dấu $`.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// server/tests/domain/mathText.test.ts
import { describe, expect, it } from "vitest";
import { hasBalancedMath, latexToPlain, splitMath, toPlainText } from "../../src/domain/mathText";
import { parseQuestion } from "../../src/domain/question";
import { mcq } from "../helpers/fixtures";

describe("splitMath", () => {
  it("tách chữ và công thức", () => {
    expect(splitMath("Cho $f(x)=x^2$. Tính $f(2)$")).toEqual([
      { kind: "text", value: "Cho " },
      { kind: "math", value: "f(x)=x^2" },
      { kind: "text", value: ". Tính " },
      { kind: "math", value: "f(2)" },
    ]);
  });
  it("\\$ ngoài công thức là dấu đô la; trong công thức giữ nguyên \\$", () => {
    expect(splitMath("Giá 5\\$ và $a\\$b$")).toEqual([{ kind: "text", value: "Giá 5$ và " }, { kind: "math", value: "a\\$b" }]);
  });
  it("bỏ cặp $$ rỗng; $ chưa đóng thành chữ", () => {
    expect(splitMath("a $$ b")).toEqual([{ kind: "text", value: "a " }, { kind: "text", value: " b" }]);
    expect(splitMath("x $y")).toEqual([{ kind: "text", value: "x " }, { kind: "text", value: "$y" }]);
  });
  it("không có công thức", () => expect(splitMath("2 + 2 = 4")).toEqual([{ kind: "text", value: "2 + 2 = 4" }]));
});

describe("hasBalancedMath", () => {
  it.each([
    ["a $x$", true],
    ["a $x", false],
    ["5\\$", true],
    ["$a$ và $b$", true],
  ])("%s → %s", (s, ok) => expect(hasBalancedMath(s)).toBe(ok));
});

describe("latexToPlain", () => {
  it.each([
    ["x^2-2x+3", "x²−2x+3"],
    ["\\frac{9}{4}", "9/4"],
    ["-\\frac{9}{4}", "−9/4"],
    ["\\frac{x+1}{x-1}", "(x+1)/(x−1)"],
    ["\\sqrt2", "√2"],
    ["\\sqrt{x+1}", "√(x+1)"],
    ["\\sqrt[3]{x}", "∛x"],
    ["f\\left(\\frac12\\right)", "f(1/2)"],
    ["x\\ge 2{,}5", "x≥2,5"],
    ["\\widehat{ABC}=90^{\\circ}", "∠ABC=90°"],
    ["\\sin^2x+\\cos^2x=1", "sin²x+cos²x=1"],
    ["\\sin x", "sin x"],
    ["\\mathbb{R}\\setminus\\{1\\}", "ℝ∖{1}"],
    ["C_{n}^{k}", "Cₙᵏ"],
    ["\\begin{cases}x+y=1\\\\x-y=3\\end{cases}", "{x+y=1; x−y=3}"],
    ["\\pi", "π"],
    ["x^{n+1}", "xⁿ⁺¹"],
    ["x^{ab}", "x^(ab)"],
    ["\\text{5 cm}", "5 cm"],
  ])("%s → %s", (latex, plain) => expect(latexToPlain(latex)).toBe(plain));
});

describe("toPlainText", () => {
  it("thay từng công thức bằng chữ thường", () => {
    expect(toPlainText("Cho $f(x)=x^2-2x+3$. Giá trị $f\\left(\\frac12\\right)$ bằng")).toBe("Cho f(x)=x²−2x+3. Giá trị f(1/2) bằng");
  });
});

describe("câu hỏi có công thức", () => {
  it("nhận công thức ở câu hỏi và phương án", () => {
    const q = parseQuestion(mcq({ stem: "Giá trị $f(\\frac12)$ bằng", options: ["$\\frac94$", "$-\\frac94$", "$\\frac34$", "$\\sqrt2$"] }));
    expect(q.stem).toContain("$f(\\frac12)$");
  });
  it("từ chối $ chưa đóng", () => {
    expect(() => parseQuestion(mcq({ stem: "Cho $x^2" }))).toThrow(/dấu \$/);
    expect(() => parseQuestion(mcq({ options: ["$a", "b", "c", "d"] }))).toThrow(/dấu \$/);
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/mathText.test.ts`
Expected: FAIL — `Cannot find module '../../src/domain/mathText'`.

- [ ] **Step 3: Viết `mathText.ts`**

```ts
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
```

- [ ] **Step 4: Áp dụng vào câu hỏi**

Trong `server/src/domain/question.ts`, thêm import và kiểu chuỗi có công thức, rồi thay các trường:

```ts
import { hasBalancedMath } from "./mathText";

const MATH_MSG = "Công thức thiếu dấu $ đóng (ký hiệu đô la thường viết \\$)";
/** Chuỗi bắt buộc, cho phép công thức $…$. */
const mathText = () => z.string().trim().min(1).refine(hasBalancedMath, MATH_MSG);
```

- `base.stem`: `mathText()`; `base.explanation`: `z.string().refine(hasBalancedMath, MATH_MSG).optional()`.
- `McqQuestion.options`: `z.array(mathText()).length(4)`.
- `TrueFalseQuestion.statements`: `z.array(mathText()).length(4)`.
- `ShortAnswerQuestion.answer`: `mathText()`.
- `EssayQuestion.rubric`: `mathText()`.

- [ ] **Step 5: Mô tả cho AI chat**

Trong `server/src/mcp/server.ts`, tool `them_cau_hoi`: nối thêm vào sau chuỗi `description` hiện có (giữ nguyên phần cũ):

```ts
      description:
        "Thêm 1–100 câu hỏi vào ngân hàng. … (giữ nguyên câu cũ)" +
        ' Công thức toán: viết LaTeX trong cặp $…$ chen giữa chữ, vd stem "Cho hàm số $f(x)=x^2-2x+3$. Giá trị $f\\left(\\frac{1}{2}\\right)$ bằng", phương án "$\\frac{9}{4}$"; dấu đô la thường viết \\$. File Word xuất ra phương trình sửa được.',
```

(AI đọc thấy: `… $f\left(\frac{1}{2}\right)$ …; dấu đô la thường viết \$ …`.)

- [ ] **Step 6: Chạy test, thấy xanh; chạy toàn bộ server**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/mathText.test.ts` → PASS.
Run: `pnpm --filter @eduvn/server test && pnpm --filter @eduvn/server typecheck` → PASS (157+ test).

- [ ] **Step 7: Commit**

```bash
git add server/src/domain/mathText.ts server/src/domain/question.ts server/src/mcp/server.ts server/tests/domain/mathText.test.ts
git commit -m "feat(server): chuỗi có công thức \$…\$ — tách, kiểm, đổi chữ thường; câu hỏi từ chối \$ chưa đóng"
```

---

### Task 2: Xuất Word ra phương trình thật

**Files:**
- Create: `server/src/export/mathDocx.ts`
- Modify: `server/src/export/docx.ts`
- Test: `server/tests/export/mathDocx.test.ts`

**Interfaces:**
- Consumes: `splitMath`, `latexToPlain` (Task 1).
- Produces: `prepareLatex(latex: string): string`; `mathRuns(s: string, style?: { bold?: boolean }): ParagraphChild[]`.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// server/tests/export/mathDocx.test.ts
import { Document, Packer, Paragraph } from "docx";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { makeVariants } from "../../src/domain/variants";
import { renderExamDocx } from "../../src/export/docx";
import { mathRuns, prepareLatex } from "../../src/export/mathDocx";
import { mcq, stored } from "../helpers/fixtures";

async function xmlOf(children: Paragraph[]): Promise<string> {
  const buf = await Packer.toBuffer(new Document({ sections: [{ children }] }));
  return (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
}

describe("mathRuns", () => {
  it("chữ → w:t, công thức → m:oMath", async () => {
    const xml = await xmlOf([new Paragraph({ children: mathRuns("Cho $\\frac{9}{4}$ và $\\sqrt2$") })]);
    expect(xml).toContain("Cho ");
    expect((xml.match(/<m:oMath>/g) ?? []).length).toBe(2);
    expect(xml).toContain("<m:f>");
    expect(xml).toContain("<m:rad>");
  });
  it("LaTeX hỏng → chữ thường, không ném lỗi", async () => {
    const xml = await xmlOf([new Paragraph({ children: mathRuns("Lỗi $\\frac{1$ đây") })]);
    expect(xml).not.toContain("<m:oMath>");
    expect(xml).toContain("Lỗi ");
  });
  it("\\mathbb{R} đổi trước thành ℝ", () => {
    expect(prepareLatex("x\\in\\mathbb{R}\\setminus\\{1\\}")).toBe("x\\inℝ\\setminus\\{1\\}");
  });
});

describe("đề có công thức", () => {
  it("câu hỏi và phương án ra phương trình Word", async () => {
    const pool = [stored(mcq({ stem: "Giá trị $f\\left(\\frac{1}{2}\\right)$ bằng", options: ["$\\frac{9}{4}$", "$-\\frac{9}{4}$", "$\\frac{3}{4}$", "$\\sqrt{2}$"] }), "m1")];
    const [v] = makeVariants(pool, 1, 1);
    const buf = await renderExamDocx({ title: "KT", subject: "Toán", grade: 10, durationMinutes: 15 }, v!);
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect((xml.match(/<m:oMath>/g) ?? []).length).toBe(5);
    expect(xml).not.toContain("$");
  });
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/export/mathDocx.test.ts`
Expected: FAIL — không tìm thấy `../../src/export/mathDocx`.

- [ ] **Step 3: Viết `mathDocx.ts`**

```ts
// server/src/export/mathDocx.ts
import { Math as OMath, type ParagraphChild, TextRun } from "docx";
import { latexToMath } from "docx/math";
import { latexToPlain, splitMath } from "../domain/mathText";

const BB: Record<string, string> = { R: "ℝ", N: "ℕ", Z: "ℤ", Q: "ℚ", C: "ℂ" };

/** Sửa trước các lệnh mà latexToMath của docx chưa hiểu đúng (đã thử 2026-11-06). */
export function prepareLatex(latex: string): string {
  return latex.replace(/\\mathbb\s*\{?([A-Z])\}?/g, (_m, c: string) => BB[c] ?? c);
}

/** Chuỗi có công thức $…$ → các run cho Paragraph: chữ là TextRun, công thức là phương trình Word sửa được. */
export function mathRuns(s: string, style: { bold?: boolean } = {}): ParagraphChild[] {
  return splitMath(s).map((seg) => {
    if (seg.kind === "text") return new TextRun({ text: seg.value, bold: style.bold });
    try {
      return new OMath({ children: [...latexToMath(prepareLatex(seg.value))] });
    } catch {
      return new TextRun({ text: latexToPlain(seg.value), bold: style.bold });
    }
  });
}
```

- [ ] **Step 4: Dùng trong `docx.ts`**

Trong `server/src/export/docx.ts`:

```ts
import { mathRuns } from "./mathDocx";

function indented(text: string): Paragraph {
  return new Paragraph({ indent: { left: 360 }, children: mathRuns(text) });
}
```

Trong `itemParagraphs`, đổi `new TextRun(q.stem)` thành `...mathRuns(q.stem)`:

```ts
  const head = new Paragraph({
    spacing: { before: 120 },
    children: [new TextRun({ text: `Câu ${it.sectionNo}. `, bold: true }), ...mathRuns(q.stem)],
  });
```

Trong `cell` (bảng đáp án — đáp án trả lời ngắn có thể có công thức):

```ts
function cell(text: string, isBold = false): TableCell {
  return new TableCell({ children: [new Paragraph({ children: mathRuns(text, { bold: isBold }) })] });
}
```

Các chỗ khác dùng `indented(...)` (phương án `A. …`, ý `a) …`, `(1 điểm)`) đã đi qua `mathRuns` nhờ hàm `indented` mới.

- [ ] **Step 5: Chạy test, thấy xanh; chạy bộ docx cũ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/export` → PASS (gồm `docx.test.ts` cũ).

- [ ] **Step 6: Kiểm bằng mắt một lần**

```bash
cd /tmp && cat > p4-docx.mts <<'EOF'
import { writeFileSync } from "node:fs";
import { makeVariants } from "/home/chinhan/projects/eduvn/server/src/domain/variants";
import { renderExamDocx } from "/home/chinhan/projects/eduvn/server/src/export/docx";
const q = { subject: "Toán", grade: 10, topic: "Hàm số", level: "TH", tags: [], type: "mcq", stem: "Cho hàm số $f(x)=x^2-2x+3$. Giá trị $f\\left(\\frac{1}{2}\\right)$ bằng", options: ["$\\frac{9}{4}$", "$-\\frac{9}{4}$", "$\\frac{3}{4}$", "$\\sqrt{2}$"], answer: 0, id: "q1" } as const;
const [v] = makeVariants([q as never], 1, 1);
writeFileSync("/tmp/p4-de.docx", await renderExamDocx({ title: "Kiểm tra", subject: "Toán", grade: 10, durationMinutes: 15 }, v!));
EOF
pnpm --filter @eduvn/server exec tsx /tmp/p4-docx.mts && soffice --headless --convert-to pdf --outdir /tmp /tmp/p4-de.docx >/dev/null && pdftoppm -r 80 -png -f 1 -l 1 /tmp/p4-de.pdf /tmp/p4-de
```

Mở `/tmp/p4-de-1.png`: câu 1 có `x²−2x+3` dạng phương trình, `f(1/2)` dạng phân số đứng, 4 phương án là phân số/căn.

- [ ] **Step 7: Commit**

```bash
git add server/src/export/mathDocx.ts server/src/export/docx.ts server/tests/export/mathDocx.test.ts
git commit -m "feat(server): xuất Word ra phương trình thật cho công thức \$…\$"
```

---

### Task 3: Trò chơi và slide hiện công thức dạng chữ thường

**Files:**
- Modify: `server/src/domain/games.ts` (`itemsFromQuestions`)
- Modify: `server/src/export/slides.ts` (`renderSlidesPptx`)
- Modify: `server/src/mcp/slides.ts` (mô tả `tao_slide`)
- Test: `server/tests/domain/games.test.ts`, `server/tests/domain/slides.test.ts` (thêm ca)

**Interfaces:**
- Consumes: `toPlainText` (Task 1).
- Produces: `plainDeck(deck: SlideDeck): SlideDeck` (export từ `server/src/export/slides.ts`).

- [ ] **Step 1: Thêm test (đỏ)**

Cuối `server/tests/domain/games.test.ts`:

```ts
describe("công thức trong trò chơi", () => {
  it("đổi $…$ sang chữ thường ở câu hỏi, phương án, đáp án", () => {
    const qs = [mcq({ stem: "Tính $\\frac{1}{2}+\\frac{1}{4}$", options: ["$\\frac34$", "$1$", "$\\frac12$", "$x^2$"] }), mcq(), mcq(), short({ answer: "$\\sqrt2$" })];
    const r = buildGame("quiz", qs, { source: "x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.body.items[0]).toMatchObject({ q: "Tính 1/2+1/4", options: ["3/4", "1", "1/2", "x²"] });
    expect(r.body.items[3]).toMatchObject({ kind: "text", answer: "√2" });
  });
});
```

Cuối `server/tests/domain/slides.test.ts`:

```ts
import { plainDeck } from "../../src/export/slides";

describe("plainDeck", () => {
  it("đổi công thức trong mọi chuỗi của slide", () => {
    const d = plainDeck({ title: "Hàm $y=x^2$", slides: [{ layout: "quiz", title: "Câu 1", question: "Đỉnh của $y=x^2-3$?", options: ["$(0;-3)$", "$(0;3)$"], answer: 0, bullets: ["$\\sqrt2$"] }] });
    expect(d.title).toBe("Hàm y=x²");
    expect(d.slides[0]).toMatchObject({ question: "Đỉnh của y=x²−3?", options: ["(0;−3)", "(0;3)"], bullets: ["√2"], answer: 0 });
  });
});
```

- [ ] **Step 2: Chạy, thấy đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/games.test.ts tests/domain/slides.test.ts`
Expected: FAIL (`plainDeck` chưa có; item `q` còn `$`).

- [ ] **Step 3: Sửa `itemsFromQuestions`**

```ts
// server/src/domain/games.ts
import { toPlainText as P } from "./mathText";

export function itemsFromQuestions(qs: readonly QuestionInput[]): GameItem[] {
  const out: GameItem[] = [];
  for (const q of qs) {
    const explain = P(q.explanation?.trim() ?? "");
    const stem = P(q.stem);
    if (q.type === "mcq") out.push({ kind: "choice", q: stem, options: q.options.map(P), answer: q.answer, explain });
    else if (q.type === "true_false") {
      q.statements.forEach((st, i) => out.push({ kind: "choice", q: `${stem}\n${P(st)}`, options: ["Đúng", "Sai"], answer: q.answer[i] ? 0 : 1, explain }));
    } else if (q.type === "short_answer") out.push({ kind: "text", q: stem, answer: P(q.answer), explain });
  }
  return out;
}
```

- [ ] **Step 4: Thêm `plainDeck` và dùng trong `renderSlidesPptx`**

```ts
// server/src/export/slides.ts
import { toPlainText } from "../domain/mathText";

const P = (s: string | undefined): string | undefined => (s === undefined ? undefined : toPlainText(s));
const PL = (l: string[] | undefined): string[] | undefined => l?.map(toPlainText);

/** pptx không có phương trình: đổi công thức $…$ sang chữ thường Unicode. */
export function plainDeck(deck: SlideDeck): SlideDeck {
  return {
    ...deck,
    title: toPlainText(deck.title),
    subtitle: P(deck.subtitle),
    slides: deck.slides.map((s) => ({
      ...s,
      title: toPlainText(s.title),
      bullets: PL(s.bullets),
      left: PL(s.left),
      right: PL(s.right),
      question: P(s.question),
      options: PL(s.options),
      notes: P(s.notes),
      answer: typeof s.answer === "string" ? toPlainText(s.answer) : s.answer,
    })),
  };
}
```

Trong `renderSlidesPptx(deck)`, dòng đầu thân hàm: `deck = plainDeck(deck);` (đổi tham số thành `deckIn` rồi `const deck = plainDeck(deckIn);` nếu linter cấm gán lại tham số).

- [ ] **Step 5: Mô tả `tao_slide`**

Trong `server/src/mcp/slides.ts`, nối vào cuối `description` của `tao_slide`: `" Công thức viết LaTeX trong $…$ (vd $x^2-3$); trong .pptx hiển thị dạng chữ thường (x²−3)."`

- [ ] **Step 6: Xanh + toàn bộ**

Run: `pnpm --filter @eduvn/server test && pnpm --filter @eduvn/server typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/domain/games.ts server/src/export/slides.ts server/src/mcp/slides.ts server/tests/domain/games.test.ts server/tests/domain/slides.test.ts
git commit -m "feat(server): trò chơi và slide hiện công thức dạng chữ thường"
```

---

### Task 4: Gợi ý câu hỏi liên quan

**Files:**
- Create: `server/src/domain/related.ts`
- Modify: `server/src/service.ts` (thêm `relatedQuestions`), `server/src/http/app.ts` (route)
- Test: `server/tests/domain/related.test.ts`, `server/tests/http/related.test.ts`

**Interfaces:**
- Consumes: `toPlainText` (Task 1), `listQuestions` (repo).
- Produces: `words(s: string): Set<string>`; `rankRelated(pool: StoredQuestion[], ctx: { topic?: string; text?: string; exclude?: string[] }, limit: number): StoredQuestion[]`; `service.relatedQuestions(actor, query: unknown): Promise<StoredQuestion[]>`; REST `GET /api/questions/related?subject&grade&topic&text&limit&exclude` → `StoredQuestion[]` (đầy đủ trường, gồm `answer`).

- [ ] **Step 1: Test domain (đỏ)**

```ts
// server/tests/domain/related.test.ts
import { describe, expect, it } from "vitest";
import { rankRelated, words } from "../../src/domain/related";
import { mcq, stored } from "../helpers/fixtures";

const bank = [
  stored(mcq({ topic: "Thiết diện", stem: "Cho hình lập phương $ABCD.A'B'C'D'$. Thiết diện cắt bởi $(MNP)$ là hình gì?" }), "q1"),
  stored(mcq({ topic: "Hàm số bậc hai", stem: "Đỉnh của parabol $y=x^2-3$ là" }), "q2"),
  stored(mcq({ topic: "Mệnh đề", stem: "Câu nào là mệnh đề?" }), "q3"),
  stored(mcq({ topic: "Thiết diện", stem: "Hình chóp $S.ABCD$ cắt bởi mặt phẳng qua trung điểm" }), "q4"),
];

describe("words", () => {
  it("chữ thường, bỏ từ 1 ký tự và từ dừng", () => {
    expect([...words("Cho hình lập phương ABCD, tính x")]).toEqual(["hình", "lập", "phương", "abcd"]);
  });
});

describe("rankRelated", () => {
  it("đúng chủ đề + nhiều từ khoá trên bảng đứng trước; không khớp gì thì bỏ", () => {
    const r = rankRelated(bank, { topic: "Thiết diện", text: "hình lập phương thiết diện" }, 5);
    expect(r.map((q) => q.id)).toEqual(["q1", "q4"]);
  });
  it("không có chủ đề: chỉ theo từ khoá", () => {
    expect(rankRelated(bank, { text: "parabol" }, 5).map((q) => q.id)).toEqual(["q2"]);
  });
  it("bỏ câu đã loại trừ; giới hạn số câu", () => {
    expect(rankRelated(bank, { topic: "Thiết diện", exclude: ["q1"] }, 5).map((q) => q.id)).toEqual(["q4"]);
    expect(rankRelated(bank, { topic: "Thiết diện" }, 1)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/related.test.ts` → FAIL (thiếu module).

- [ ] **Step 3: Viết `related.ts`**

```ts
// server/src/domain/related.ts
import { toPlainText } from "./mathText";
import type { StoredQuestion } from "./question";

const STOP = new Set(["của", "và", "là", "các", "cho", "có", "một", "những", "được", "với", "trong", "theo", "sau", "đây", "nào", "bằng", "thì", "này", "khi", "hãy", "tính", "tìm", "biết", "câu", "hỏi", "đúng", "sai", "gì", "bởi", "qua"]);

/** Tập từ (âm tiết) chữ thường ≥ 2 ký tự, bỏ từ dừng. */
export function words(s: string): Set<string> {
  return new Set(
    s
      .normalize("NFC")
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 2 && !STOP.has(w)),
  );
}

function questionText(q: StoredQuestion): string {
  const parts = [q.topic, q.stem, ...q.tags];
  if (q.type === "mcq") parts.push(...q.options);
  if (q.type === "true_false") parts.push(...q.statements);
  return toPlainText(parts.join(" "));
}

/** Điểm = 3 nếu đúng chủ đề + số từ khoá trùng. Điểm 0 bị bỏ; hoà điểm thì câu mới hơn (đứng sau trong pool) trước. */
export function rankRelated(pool: StoredQuestion[], ctx: { topic?: string; text?: string; exclude?: string[] }, limit: number): StoredQuestion[] {
  const topic = ctx.topic?.normalize("NFC").trim().toLowerCase() ?? "";
  const kw = words(`${ctx.topic ?? ""} ${ctx.text ?? ""}`);
  const skip = new Set(ctx.exclude ?? []);
  return pool
    .map((q, idx) => {
      if (skip.has(q.id)) return { q, idx, score: 0 };
      const qw = words(questionText(q));
      let hit = 0;
      for (const w of kw) if (qw.has(w)) hit++;
      const score = (topic && q.topic.toLowerCase() === topic ? 3 : 0) + hit;
      return { q, idx, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.idx - a.idx)
    .slice(0, limit)
    .map((s) => s.q);
}
```

- [ ] **Step 4: Xanh domain**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/related.test.ts` → PASS.

- [ ] **Step 5: Test HTTP (đỏ)**

```ts
// server/tests/http/related.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { mcq } from "../helpers/fixtures";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});

describe("GET /api/questions/related", () => {
  it("trả câu đầy đủ (có đáp án), xếp theo chủ đề + từ khoá", async () => {
    for (const q of [
      mcq({ topic: "Thiết diện", stem: "Thiết diện của hình lập phương cắt bởi $(MNP)$", answer: 3 }),
      mcq({ topic: "Mệnh đề", stem: "Câu nào là mệnh đề?" }),
    ]) {
      expect((await t.app.inject({ method: "POST", url: "/api/questions", headers: auth, payload: q })).statusCode).toBe(201);
    }
    const q = new URLSearchParams({ subject: "Toán", grade: "10", topic: "Thiết diện", text: "hình lập phương" });
    const res = await t.app.inject({ method: "GET", url: `/api/questions/related?${q}`, headers: auth });
    expect(res.statusCode).toBe(200);
    const rows = res.json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ topic: "Thiết diện", type: "mcq", answer: 3 });
    expect(rows[0].options).toHaveLength(4);
  });
  it("thiếu lớp → 400", async () => {
    expect((await t.app.inject({ method: "GET", url: "/api/questions/related?subject=Toán", headers: auth })).statusCode).toBe(400);
  });
});
```

- [ ] **Step 6: Đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/http/related.test.ts` → FAIL (404).

- [ ] **Step 7: Service + route**

Trong `server/src/service.ts`:

```ts
import { rankRelated } from "./domain/related";

export const RelatedInput = z.object({
  subject: z.string().trim().normalize("NFC").min(1),
  grade: z.coerce.number().int().min(1).max(16),
  topic: z.string().trim().normalize("NFC").max(120).optional(),
  text: z.string().max(2000).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(8),
  exclude: z.preprocess((v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v), z.array(z.string()).max(100)).optional(),
});
```

Trong `createService`, thêm và trả ra trong object cuối:

```ts
  async function relatedQuestions(actor: Actor, query: unknown): Promise<StoredQuestion[]> {
    assertCan(actor.role, "question:read");
    const p = RelatedInput.parse(query);
    const pool = await listQuestions(db, actor.orgId, { subject: p.subject, grade: p.grade, limit: 2000 });
    return rankRelated(pool, { topic: p.topic, text: p.text, exclude: p.exclude }, p.limit);
  }
```

`return { me, listExamSummaries, addQuestion, searchQuestions, relatedQuestions, generateExam, getExam, getAnswerKeys, grade, loadExamForExport };`

Trong `server/src/http/app.ts`, ngay sau route `GET /api/questions`:

```ts
  app.get("/api/questions/related", async (req) => service.relatedQuestions(await authenticate(req), req.query));
```

(`ZodError` đã được error handler trả 400.)

- [ ] **Step 8: Xanh + toàn bộ**

Run: `pnpm --filter @eduvn/server test && pnpm --filter @eduvn/server typecheck` → PASS.

- [ ] **Step 9: Commit**

```bash
git add server/src/domain/related.ts server/src/service.ts server/src/http/app.ts server/tests/domain/related.test.ts server/tests/http/related.test.ts
git commit -m "feat(server): gợi ý câu hỏi liên quan theo chủ đề + từ khoá trên bảng"
```

---

### Task 5: Lưu bảng giảng (bảng `boards`, REST, quyền)

**Files:**
- Create: `server/src/domain/board.ts`, `server/src/services/boards.ts`
- Modify: `server/src/db/schema.ts`, `server/src/domain/authz.ts`, `server/src/http/app.ts`
- Create (sinh tự động): `server/drizzle/0007_*.sql`, cập nhật `server/drizzle/meta/*`
- Test: `server/tests/domain/board.test.ts`, `server/tests/http/boards.test.ts`, thêm ca vào `server/tests/domain/authz.test.ts`

**Interfaces:**
- Produces (domain): `SOLID_KINDS`; `BoardDocSchema`; `type BoardDoc`; `emptyBoardDoc(): BoardDoc`; `validateBoard(raw: unknown, mode: "create" | "save"): { ok: true; board: { title; subject; grade; topic; doc: BoardDoc } } | { ok: false; issues: string[] }`.
- Produces (REST, dùng ở web Task 10–14):
  - `GET /api/boards` → `BoardSummary[]` = `{ id, title, subject, grade, topic, pageCount, updatedAt }[]` (mới sửa trước).
  - `POST /api/boards` body `{ title, subject, grade, topic?, doc? }` → 201 `BoardSummary`.
  - `GET /api/boards/:id` → `BoardSummary & { doc: BoardDoc }`.
  - `PUT /api/boards/:id` body `{ title, subject, grade, topic, doc }` → `BoardSummary`; bodyLimit 4 MB.
  - `DELETE /api/boards/:id` → 204.
- Định dạng `BoardDoc` (web Task 9 phải khớp y hệt):

```ts
type BoardDoc = { version: 1; pages: { id: string; objects: BoardObj[] }[] };
type BoardObj =
  | { type: "stroke"; id: string; color: string; width: number; pts: number[] } // pts = [x0,y0,x1,y1,…] toạ độ bảng 1280×720
  | { type: "graph"; id: string; x: number; y: number; w: number; h: number; exprs: { latex: string; color: string }[]; params: Record<string, number>; view: { xMin: number; xMax: number; yMin: number; yMax: number } }
  | { type: "solid"; id: string; kind: "cube" | "cuboid" | "pyramid4" | "pyramid3" | "prism3"; cx: number; cy: number; size: number; th: number; ph: number;
      points: { name: string; a: number; b: number; t: number }[]; section: [string, string, string] | null; angle: [string, string, string] | null };
```

- [ ] **Step 1: Test domain (đỏ)**

```ts
// server/tests/domain/board.test.ts
import { describe, expect, it } from "vitest";
import { emptyBoardDoc, validateBoard } from "../../src/domain/board";

export const sampleDoc = () => ({
  version: 1 as const,
  pages: [
    {
      id: "p1",
      objects: [
        { type: "stroke", id: "s1", color: "#f3f0e6", width: 4.5, pts: [10, 10, 20, 25, 30, 40] },
        { type: "graph", id: "g1", x: 560, y: 50, w: 660, h: 420, exprs: [{ latex: "y=A\\sin x+B", color: "#5cc8ff" }], params: { A: 2, B: 1 }, view: { xMin: -5, xMax: 5, yMin: -4, yMax: 5 } },
        { type: "solid", id: "c1", kind: "cube", cx: 360, cy: 360, size: 210, th: 0.62, ph: 0.42, points: [{ name: "M", a: 0, b: 1, t: 0.5 }], section: ["M", "C", "C'"], angle: null },
      ],
    },
  ],
});
const meta = { title: "Ôn tập hình không gian", subject: "Toán", grade: 11, topic: "Thiết diện" };

describe("validateBoard", () => {
  it("nhận tài liệu hợp lệ", () => {
    const r = validateBoard({ ...meta, doc: sampleDoc() }, "save");
    expect(r.ok).toBe(true);
  });
  it("tạo mới không có doc → 1 trang trống", () => {
    const r = validateBoard(meta, "create");
    expect(r.ok && r.board.doc).toEqual(emptyBoardDoc());
  });
  it("lưu bắt buộc có doc; báo lỗi tiếng Việt kèm đường dẫn", () => {
    const r = validateBoard(meta, "save");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toContain('"doc"');
  });
  it("giới hạn: 30 trang, loại khối, màu", () => {
    const pages = Array.from({ length: 31 }, (_, i) => ({ id: `p${i}`, objects: [] }));
    const r1 = validateBoard({ ...meta, doc: { version: 1, pages } }, "save");
    expect(!r1.ok && r1.issues.join()).toContain("Tối đa 30 trang");
    const bad = sampleDoc();
    (bad.pages[0]!.objects[2] as { kind: string }).kind = "sphere";
    expect(validateBoard({ ...meta, doc: bad }, "save").ok).toBe(false);
    const bad2 = sampleDoc();
    (bad2.pages[0]!.objects[0] as { color: string }).color = "red";
    expect(validateBoard({ ...meta, doc: bad2 }, "save").ok).toBe(false);
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/board.test.ts` → FAIL.

- [ ] **Step 3: Viết `board.ts`**

```ts
// server/src/domain/board.ts
import { z } from "zod";

/** Bảng giảng: tài liệu JSON nhiều trang (nét bút / đồ thị / hình khối, toạ độ bảng 1280×720).
 *  Server chỉ kiểm cấu trúc + giới hạn; hình học và đồ thị tính ở trình duyệt (web/src/board). */
export const SOLID_KINDS = ["cube", "cuboid", "pyramid4", "pyramid3", "prism3"] as const;
export const MAX_PAGES = 30;

const Id = z.string().min(1).max(40);
const Num = z.number().finite();
const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Màu phải dạng #rrggbb");
const PtName = z.string().min(1).max(4);
const Tri = z.tuple([PtName, PtName, PtName]);

const Stroke = z.object({
  type: z.literal("stroke"),
  id: Id,
  color: Color,
  width: z.number().min(1).max(40),
  pts: z.array(Num).min(2).max(4000, "Nét bút quá dài (tối đa 2000 điểm)"),
});
const Graph = z.object({
  type: z.literal("graph"),
  id: Id,
  x: Num,
  y: Num,
  w: z.number().min(120).max(1280),
  h: z.number().min(100).max(720),
  exprs: z.array(z.object({ latex: z.string().min(1).max(500), color: Color })).min(1).max(6, "Tối đa 6 hàm trên một đồ thị"),
  params: z.record(z.string().regex(/^[A-Za-z]\w{0,11}$/), Num),
  view: z.object({ xMin: Num, xMax: Num, yMin: Num, yMax: Num }).refine((v) => v.xMax > v.xMin && v.yMax > v.yMin, "Khung đồ thị không hợp lệ"),
});
const Solid = z.object({
  type: z.literal("solid"),
  id: Id,
  kind: z.enum(SOLID_KINDS),
  cx: Num,
  cy: Num,
  size: z.number().min(60).max(600),
  th: Num,
  ph: Num,
  points: z.array(z.object({ name: PtName, a: z.number().int().min(0).max(11), b: z.number().int().min(0).max(11), t: z.number().min(0).max(1) })).max(12, "Tối đa 12 điểm dựng thêm"),
  section: Tri.nullable(),
  angle: Tri.nullable(),
});
const BoardObj = z.discriminatedUnion("type", [Stroke, Graph, Solid]);
export const BoardDocSchema = z.object({
  version: z.literal(1),
  pages: z
    .array(z.object({ id: Id, objects: z.array(BoardObj).max(800, "Tối đa 800 đối tượng mỗi trang") }))
    .min(1, "Cần ít nhất 1 trang")
    .max(MAX_PAGES, `Tối đa ${MAX_PAGES} trang`),
});
export type BoardDoc = z.infer<typeof BoardDocSchema>;

const meta = {
  title: z.string().trim().normalize("NFC").min(1, "Thiếu tên bài giảng").max(120),
  subject: z.string().trim().normalize("NFC").min(1, "Thiếu môn").max(60),
  grade: z.number().int().min(1).max(16),
  topic: z.string().trim().normalize("NFC").max(120).default(""),
};
const SaveSchema = z.object({ ...meta, doc: BoardDocSchema });
const CreateSchema = z.object({ ...meta, doc: BoardDocSchema.optional() });
export type BoardInput = z.infer<typeof SaveSchema>;

export const emptyBoardDoc = (): BoardDoc => ({ version: 1, pages: [{ id: "p1", objects: [] }] });

export function validateBoard(raw: unknown, mode: "create" | "save"): { ok: true; board: BoardInput } | { ok: false; issues: string[] } {
  const r = (mode === "create" ? CreateSchema : SaveSchema).safeParse(raw);
  if (!r.success) return { ok: false, issues: r.error.issues.map((i) => `Sai dữ liệu tại "${i.path.join(".") || "gốc"}": ${i.message}`) };
  return { ok: true, board: { ...r.data, doc: r.data.doc ?? emptyBoardDoc() } };
}
```

- [ ] **Step 4: Xanh domain**

Run: `pnpm --filter @eduvn/server exec vitest run tests/domain/board.test.ts` → PASS.

- [ ] **Step 5: Quyền**

Trong `server/src/domain/authz.ts`: thêm `"board:manage"`, `"board:read"` vào `ACTIONS`; thêm cả hai vào `TEACHING`; thêm `"board:read"` vào danh sách của `assistant`.

Thêm vào `server/tests/domain/authz.test.ts`:

```ts
  it("bảng giảng: GV soạn, trợ giảng chỉ xem", () => {
    expect(can("teacher", "board:manage")).toBe(true);
    expect(can("assistant", "board:read")).toBe(true);
    expect(can("assistant", "board:manage")).toBe(false);
  });
```

- [ ] **Step 6: Bảng DB + migration**

Trong `server/src/db/schema.ts` (theo mẫu `decks`):

```ts
import type { BoardDoc } from "../domain/board";

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    topic: text("topic").notNull().default(""),
    body: jsonb("body").$type<BoardDoc>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("boards_org_idx").on(t.orgId)],
);
```

Run: `pnpm --filter @eduvn/server db:generate`
Expected: tạo `server/drizzle/0007_<tên ngẫu nhiên>.sql` có `CREATE TABLE "boards"` + index; không đụng bảng khác (mở file kiểm).

- [ ] **Step 7: Service**

```ts
// server/src/services/boards.ts
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { boards } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type BoardDoc, validateBoard } from "../domain/board";
import { NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type BoardSummary = { id: string; title: string; subject: string; grade: number; topic: string; pageCount: number; updatedAt: string };

type Row = { id: string; title: string; subject: string; grade: number; topic: string; body: BoardDoc; updatedAt: Date };
const summary = (r: Row): BoardSummary => ({ id: r.id, title: r.title, subject: r.subject, grade: r.grade, topic: r.topic, pageCount: r.body.pages.length, updatedAt: r.updatedAt.toISOString() });

export function createBoardService(db: Db) {
  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài giảng");
    const [row] = await db.select().from(boards).where(and(eq(boards.id, id), eq(boards.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy bài giảng");
    return row;
  }

  async function create(actor: Actor, raw: unknown): Promise<BoardSummary> {
    assertCan(actor.role, "board:manage");
    const v = validateBoard(raw, "create");
    if (!v.ok) throw new ValidationError(v.issues);
    const { doc, ...m } = v.board;
    const [row] = await db.insert(boards).values({ ...m, body: doc, orgId: actor.orgId, ownerId: actor.userId }).returning();
    if (!row) throw new Error("board insert: no row");
    return summary(row);
  }

  async function save(actor: Actor, id: string, raw: unknown): Promise<BoardSummary> {
    assertCan(actor.role, "board:manage");
    const v = validateBoard(raw, "save");
    if (!v.ok) throw new ValidationError(v.issues);
    await load(actor.orgId, id);
    const { doc, ...m } = v.board;
    const [row] = await db.update(boards).set({ ...m, body: doc, updatedAt: new Date() }).where(eq(boards.id, id)).returning();
    if (!row) throw new Error("board update: no row");
    return summary(row);
  }

  async function list(actor: Actor): Promise<BoardSummary[]> {
    assertCan(actor.role, "board:read");
    const rows = await db.select().from(boards).where(eq(boards.orgId, actor.orgId)).orderBy(desc(boards.updatedAt));
    return rows.map(summary);
  }

  async function get(actor: Actor, id: string): Promise<BoardSummary & { doc: BoardDoc }> {
    assertCan(actor.role, "board:read");
    const r = await load(actor.orgId, id);
    return { ...summary(r), doc: r.body };
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "board:manage");
    await load(actor.orgId, id);
    await db.delete(boards).where(eq(boards.id, id));
  }

  return { create, save, list, get, remove };
}
export type BoardService = ReturnType<typeof createBoardService>;
```

- [ ] **Step 8: Test HTTP (đỏ)**

```ts
// server/tests/http/boards.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { sampleDoc } from "../domain/board.test";

let t: Awaited<ReturnType<typeof testApp>>;
let auth: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  auth = { authorization: `Bearer ${await t.sign({ sub: "gv-1", name: "Cô Lan" })}` };
});
afterEach(async () => {
  await t.app.close();
});
const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: unknown, headers = auth) => t.app.inject({ method, url, headers, payload: payload as object });
const meta = { title: "Ôn tập hình không gian", subject: "Toán", grade: 11, topic: "Thiết diện" };

describe("HTTP bảng giảng", () => {
  it("tạo → lưu → mở lại → xoá", async () => {
    const created = await call("POST", "/api/boards", meta);
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ ...meta, pageCount: 1 });
    const id = created.json().id;

    const saved = await call("PUT", `/api/boards/${id}`, { ...meta, doc: sampleDoc() });
    expect(saved.statusCode).toBe(200);
    const got = (await call("GET", `/api/boards/${id}`)).json();
    expect(got.doc.pages[0].objects.map((o: { type: string }) => o.type)).toEqual(["stroke", "graph", "solid"]);
    expect((await call("GET", "/api/boards")).json()).toHaveLength(1);

    const bad = await call("PUT", `/api/boards/${id}`, { ...meta, doc: { version: 1, pages: [] } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().issues[0]).toContain("Cần ít nhất 1 trang");

    expect((await call("DELETE", `/api/boards/${id}`)).statusCode).toBe(204);
    expect((await call("GET", `/api/boards/${id}`)).statusCode).toBe(404);
  });

  it("tổ chức khác không thấy", async () => {
    const id = (await call("POST", "/api/boards", meta)).json().id;
    const other = { authorization: `Bearer ${await t.sign({ sub: "gv-2", name: "Thầy Minh" })}` };
    expect((await call("GET", `/api/boards/${id}`, undefined, other)).statusCode).toBe(404);
    expect((await call("GET", "/api/boards", undefined, other)).json()).toHaveLength(0);
  });

  it("nhận tài liệu > 1 MB (đến 4 MB)", async () => {
    const id = (await call("POST", "/api/boards", meta)).json().id;
    const pts = Array.from({ length: 4000 }, (_, i) => 100 + (i % 500) + 0.123456789);
    const strokes = Array.from({ length: 60 }, (_, i) => ({ type: "stroke", id: `s${i}`, color: "#f3f0e6", width: 4, pts }));
    const res = await call("PUT", `/api/boards/${id}`, { ...meta, doc: { version: 1, pages: [{ id: "p1", objects: strokes }] } });
    expect(res.statusCode).toBe(200);
  });
});
```

- [ ] **Step 9: Đỏ**

Run: `pnpm --filter @eduvn/server exec vitest run tests/http/boards.test.ts` → FAIL (404).

- [ ] **Step 10: Route**

Trong `server/src/http/app.ts`: `import { createBoardService } from "../services/boards";`, tạo `const boardsSvc = createBoardService(deps.db);` cạnh các service khác, rồi thêm (sau nhóm `/api/games`):

```ts
  const BIG = { bodyLimit: 4 * 1024 * 1024 };
  app.get("/api/boards", async (req) => boardsSvc.list(await authenticate(req)));
  app.get("/api/boards/:id", async (req) => boardsSvc.get(await authenticate(req), Cid(req)));
  app.post("/api/boards", BIG, async (req, reply) => reply.code(201).send(await boardsSvc.create(await authenticate(req), req.body)));
  app.put("/api/boards/:id", BIG, async (req) => boardsSvc.save(await authenticate(req), Cid(req), req.body));
  app.delete("/api/boards/:id", async (req, reply) => {
    await boardsSvc.remove(await authenticate(req), Cid(req));
    return reply.code(204).send();
  });
```

- [ ] **Step 11: Xanh + toàn bộ**

Run: `pnpm --filter @eduvn/server test && pnpm --filter @eduvn/server typecheck` → PASS.

- [ ] **Step 12: Commit**

```bash
git add server/src/domain/board.ts server/src/services/boards.ts server/src/db/schema.ts server/src/domain/authz.ts server/src/http/app.ts server/drizzle server/tests/domain/board.test.ts server/tests/http/boards.test.ts server/tests/domain/authz.test.ts
git commit -m "feat(server): lưu bảng giảng (boards) — schema, quyền, REST, giới hạn 4 MB"
```

---

### Task 6: Web — cài thư viện, vitest, module công thức thuần

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`
- Create: `web/src/math/segments.ts`, `web/src/math/viToLatex.ts`, `web/src/math/keyboard.ts`
- Test: `web/tests/segments.test.ts`, `web/tests/viToLatex.test.ts`
- Modify: `AGENTS.md` (lệnh test web)

**Interfaces:**
- Produces: `splitMath(s): Segment[]`, `escapeText(t): string`, `joinSegments(segs): string`, `isSafeLatex(l): boolean` (segments.ts); `viToLatex(text: string): string`; từ keyboard.ts: `VN_SHORTCUTS: Record<string,string>`, `HINTS: [keys: string, latex: string][]`, `TAB_NAMES`, `type TabName`, `SETS: Record<TabName, [label: string, insert: string][]>`, `NUM: string[]`, `OPS: [label: string, insert: string][]`.

- [ ] **Step 1: Cài thư viện + cấu hình test**

```bash
pnpm --filter @eduvn/web add mathlive@^0.111.4 @cortex-js/compute-engine@^0.181.1 perfect-freehand@^1.2.3
pnpm --filter @eduvn/web add -D vitest@^5.1.0
```

Thêm script vào `web/package.json`: `"test": "vitest run"`.

```ts
// web/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { include: ["tests/**/*.test.ts"], environment: "node" } });
```

Trong `AGENTS.md`, dòng "Lệnh kiểm" thêm: `` `pnpm --filter @eduvn/web test` (module thuần web: công thức, bảng) ``.

- [ ] **Step 2: Test (đỏ)**

```ts
// web/tests/segments.test.ts
import { describe, expect, it } from "vitest";
import { isSafeLatex, joinSegments, splitMath } from "../src/math/segments";

describe("segments", () => {
  it("tách như server", () => {
    expect(splitMath("Cho $f(x)$, giá 5\\$")).toEqual([
      { kind: "text", value: "Cho " },
      { kind: "math", value: "f(x)" },
      { kind: "text", value: ", giá 5$" },
    ]);
  });
  it("ghép lại giữ nguyên", () => {
    const s = "Cho $f(x)=x^2$, giá 5\\$";
    expect(joinSegments(splitMath(s))).toBe(s);
  });
  it("chặn lệnh LaTeX có thể chèn liên kết/HTML", () => {
    expect(isSafeLatex("\\frac{1}{2}")).toBe(true);
    expect(isSafeLatex("\\href{javascript:alert(1)}{x}")).toBe(false);
    expect(isSafeLatex("\\htmlData{a=b}{x}")).toBe(false);
  });
});
```

```ts
// web/tests/viToLatex.test.ts
import { describe, expect, it } from "vitest";
import { viToLatex } from "../src/math/viToLatex";

describe("viToLatex", () => {
  it.each([
    ["y bằng x bình phương trừ ba", "y=x^{2}-3"],
    ["trừ chín phần tư", "-\\frac{9}{4}"],
    ["căn bậc hai của x cộng một", "\\sqrt{x}+1"],
    ["x lớn hơn hoặc bằng hai phẩy năm", "x\\ge 2{,}5"],
    ["sin bình phương x cộng cos bình phương x bằng một", "\\sin^{2} x+\\cos^{2} x=1"],
    ["năm cộng hai căn hai", "5+2\\sqrt{2}"],
    ["x mũ ba trừ ba x cộng một", "x^{3}-3x+1"],
    ["mở ngoặc x cộng một đóng ngoặc bình phương", "\\left(x+1\\right)^{2}"],
  ])("%s", (vi, latex) => expect(viToLatex(vi)).toBe(latex));
});
```

- [ ] **Step 3: Đỏ**

Run: `pnpm --filter @eduvn/web test` → FAIL (thiếu module).

- [ ] **Step 4: `segments.ts`**

```ts
// web/src/math/segments.ts
/** Cùng quy ước với server/src/domain/mathText.ts: chữ + LaTeX trong $…$, \$ = dấu đô la thường. */
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

export const escapeText = (t: string): string => t.replace(/\$/g, "\\$");

export const joinSegments = (segs: Segment[]): string => segs.map((s) => (s.kind === "text" ? escapeText(s.value) : `$${s.value}$`)).join("");

const UNSAFE = /\\(href|url|html\w*|class|cssId|style|data|includegraphics)(?![A-Za-z])/;
export const isSafeLatex = (l: string): boolean => !UNSAFE.test(l);
```

- [ ] **Step 5: `viToLatex.ts`** (từ mockup, thêm "sin bình phương x")

```ts
// web/src/math/viToLatex.ts
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
```

- [ ] **Step 6: `keyboard.ts`** (dữ liệu bàn phím, lấy nguyên từ mockup)

```ts
// web/src/math/keyboard.ts
/** Gõ tắt kiểu Việt cho MathLive (áp dụng khi gõ bằng bàn phím thật). */
export const VN_SHORTCUTS: Record<string, string> = {
  can: "\\sqrt{#?}", can3: "\\sqrt[3]{#?}", goc: "\\widehat{#?}", vt: "\\overrightarrow{#?}",
  he: "\\begin{cases}#?\\\\#?\\end{cases}", hoac: "\\left[\\begin{array}{l}#?\\\\#?\\end{array}\\right.",
  vc: "\\infty", vg: "\\perp", ss: "\\parallel", tp: "\\int_{#?}^{#?}", thuoc: "\\in", do: "^{\\circ}",
  ">=": "\\ge", "<=": "\\le", "!=": "\\ne", "=>": "\\Rightarrow", "<=>": "\\Leftrightarrow",
};
export const HINTS: [string, string][] = [["x^2", "x^2"], ["1/2", "\\frac{1}{2}"], ["can", "\\sqrt{x}"], ["pi", "\\pi"], [">=", "\\ge"], ["goc", "\\widehat{A}"], ["vt", "\\overrightarrow{AB}"], ["he", "\\{"]];

export const TAB_NAMES = ["Cơ bản", "Hàm số", "Hình học", "Giải tích · Tổ hợp"] as const;
export type TabName = (typeof TAB_NAMES)[number];

export const SETS: Record<TabName, [string, string][]> = {
  "Cơ bản": [
    ["x", "x"], ["y", "y"], ["a", "a"], ["b", "b"], ["(\\square)", "\\left(#0\\right)"], ["[\\square]", "\\left[#0\\right]"],
    ["\\square^2", "#@^{2}"], ["\\square^{\\square}", "#@^{#?}"], ["\\sqrt{\\square}", "\\sqrt{#0}"], ["\\sqrt[3]{\\square}", "\\sqrt[3]{#0}"], ["\\frac{\\square}{\\square}", "\\frac{#0}{#?}"], ["|\\square|", "\\left|#0\\right|"],
    ["\\pi", "\\pi"], ["\\pm", "\\pm"], ["<", "<"], [">", ">"], ["\\le", "\\le"], ["\\ge", "\\ge"],
    ["\\ne", "\\ne"], ["\\approx", "\\approx"], ["\\%", "\\%"], ["^{\\circ}", "^{\\circ}"], [";", ";"], ["\\square_{\\square}", "#@_{#?}"],
  ],
  "Hàm số": [
    ["\\sin", "\\sin"], ["\\cos", "\\cos"], ["\\tan", "\\tan"], ["\\cot", "\\cot"], ["\\log_{\\square}", "\\log_{#?}"], ["\\ln", "\\ln"],
    ["e^{\\square}", "e^{#?}"], ["f(x)", "f(x)"], ["f'(x)", "f'(x)"], ["y'", "y'"], ["\\infty", "\\infty"], ["\\mathbb{R}", "\\mathbb{R}"],
    ["[a;b]", "\\left[#?;#?\\right]"], ["(a;b)", "\\left(#?;#?\\right)"], ["[a;b)", "\\left[#?;#?\\right)"], ["(a;b]", "\\left(#?;#?\\right]"], ["\\mathbb{R}\\setminus\\{\\}", "\\mathbb{R}\\setminus\\left\\{#?\\right\\}"], ["\\in", "\\in"],
    ["\\sin^2", "\\sin^2"], ["\\cos^2", "\\cos^2"], ["\\frac{\\pi}{2}", "\\frac{\\pi}{2}"], ["k2\\pi", "k2\\pi"], ["\\Rightarrow", "\\Rightarrow"], ["\\Leftrightarrow", "\\Leftrightarrow"],
  ],
  "Hình học": [
    ["\\widehat{ABC}", "\\widehat{#?}"], ["\\overrightarrow{AB}", "\\overrightarrow{#?}"], ["\\triangle", "\\triangle "], ["\\perp", "\\perp"], ["\\parallel", "\\parallel"], ["^{\\circ}", "^{\\circ}"],
    ["\\in", "\\in"], ["\\notin", "\\notin"], ["\\subset", "\\subset"], ["\\cap", "\\cap"], ["\\cup", "\\cup"], ["\\varnothing", "\\varnothing"],
    ["\\backsim", "\\backsim"], ["=", "="], ["\\cdot", "\\cdot"], ["(\\alpha)", "\\left(\\alpha\\right)"], ["S_{ABC}", "S_{#?}"], ["V", "V"],
    ["\\vec{0}", "\\overrightarrow{0}"], ["\\cos(\\vec a,\\vec b)", "\\cos\\left(#?,#?\\right)"], ["d(A,P)", "d\\left(#?,#?\\right)"], ["\\alpha", "\\alpha"], ["\\beta", "\\beta"], ["\\Delta", "\\Delta"],
  ],
  "Giải tích · Tổ hợp": [
    ["\\lim\\limits_{x\\to a}", "\\lim\\limits_{x\\to#?}"], ["\\lim\\limits_{x\\to+\\infty}", "\\lim\\limits_{x\\to+\\infty}"], ["\\int", "\\int"], ["\\int_a^b", "\\int_{#?}^{#?}"], ["\\sum", "\\sum_{#?}^{#?}"], ["dx", "\\,dx"],
    ["n!", "#@!"], ["C_n^k", "C_{#?}^{#?}"], ["A_n^k", "A_{#?}^{#?}"], ["P_n", "P_{#?}"], ["\\to", "\\to"], ["\\infty", "\\infty"],
    ["\\begin{cases}\\square\\\\\\square\\end{cases}", "\\begin{cases}#?\\\\#?\\end{cases}"], ["\\left[\\begin{array}{l}\\square\\\\\\square\\end{array}\\right.", "\\left[\\begin{array}{l}#?\\\\#?\\end{array}\\right."], ["\\Rightarrow", "\\Rightarrow"], ["\\Leftrightarrow", "\\Leftrightarrow"], ["\\forall", "\\forall"], ["\\exists", "\\exists"],
    ["\\log_a b", "\\log_{#?}#?"], ["F(x)", "F(x)"], ["\\left.F\\right|_a^b", "\\left.#?\\right|_{#?}^{#?}"], ["\\Delta", "\\Delta"], ["\\overline{x}", "\\overline{#?}"], ["\\lvert\\square\\rvert", "\\left|#0\\right|"],
  ],
};
export const NUM = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", ",", "="];
export const OPS: [string, string][] = [["+", "+"], ["-", "-"], ["\\times", "\\cdot"], [":", ":"]];
```

- [ ] **Step 7: Xanh**

Run: `pnpm --filter @eduvn/web test` → PASS. `pnpm --filter @eduvn/web typecheck` → PASS.

- [ ] **Step 8: Commit**

```bash
git add web/package.json pnpm-lock.yaml web/vitest.config.ts web/src/math/segments.ts web/src/math/viToLatex.ts web/src/math/keyboard.ts web/tests AGENTS.md
git commit -m "feat(web): thư viện công thức + vitest; tách \$…\$, đọc công thức tiếng Việt, dữ liệu bàn phím"
```

---

### Task 7: Ô công thức, bàn phím toán, nút đọc — dùng trong Ngân hàng câu hỏi

**Files:**
- Create: `web/src/math/mathStore.ts`, `web/src/math/setup.ts`, `web/src/math/math.css`, `web/src/math/MathText.tsx`, `web/src/math/MathEditor.tsx`, `web/src/math/MathKeyboard.tsx`, `web/src/math/VoiceButton.tsx`
- Modify: `web/src/main.tsx`, `web/src/App.tsx`, `web/src/styles.css`, `web/src/sprite.ts`, `web/src/pages/Bank.tsx`

**Interfaces:**
- Consumes: Task 6.
- Produces:
  - `MathText({ value: string })` — hiển thị chuỗi có công thức.
  - `MathEditor({ value, onChange, placeholder?, testId? })` — ô chữ + công thức, **không điều khiển** (đổi giá trị từ ngoài bằng `key`). Gõ `$` hoặc Ctrl+M chèn công thức; dán chuỗi có `$…$` tự thành công thức.
  - `MathField({ value, onChange, onEnter?, testId?, autoFocus? })` — ô chỉ một công thức (LaTeX), không điều khiển.
  - `VoiceButton({ onLatex })`.
  - `mathStore.get(): { mf: MathfieldElement; exit: () => void } | null`, `mathStore.set(v)`, `mathStore.subscribe(cb): () => void`.
  - `<MathKeyboard />` gắn một lần ở `App`, hiện khi có ô toán đang mở; đặt `--kb-h` trên `<html>`.
  - Icon mới trong sprite: `del`, `left`, `right`, `mic`, `x`, `board`, `pointer`, `eraser`, `graph`, `box`, `undo`, `save`, `max`, `present`, `rotate`, `cut`, `angle`, `move`, `target`, `game`.

- [ ] **Step 1: `mathStore.ts` + `setup.ts`**

```ts
// web/src/math/mathStore.ts
import type { MathfieldElement } from "mathlive";

type Active = { mf: MathfieldElement; exit: () => void } | null;
let active: Active = null;
const subs = new Set<() => void>();

/** Ô toán đang mở — bàn phím toán dùng chung đọc từ đây. */
export const mathStore = {
  get: (): Active => active,
  set(v: Active) {
    active = v;
    for (const f of subs) f();
  },
  subscribe(cb: () => void): () => void {
    subs.add(cb);
    return () => {
      subs.delete(cb);
    };
  },
};
```

```ts
// web/src/math/setup.ts
import "mathlive";
import "mathlive/fonts.css";
import "mathlive/static.css";
import { MathfieldElement } from "mathlive";
import "./math.css";

MathfieldElement.fontsDirectory = null; // font đã nạp qua fonts.css (Vite đóng gói)
MathfieldElement.soundsDirectory = null;
MathfieldElement.decimalSeparator = ",";
```

(Nếu typings không cho `null`, dùng `MathfieldElement.fontsDirectory = null as unknown as string;` và ghi chú lý do.)

Trong `web/src/main.tsx`, thêm dòng đầu: `import "./math/setup";`.

- [ ] **Step 2: `MathText.tsx`**

```tsx
// web/src/math/MathText.tsx
import { convertLatexToMarkup } from "mathlive";
import { isSafeLatex, splitMath } from "./segments";

const cache = new Map<string, string>();
export function texMarkup(latex: string): string {
  let m = cache.get(latex);
  if (m === undefined) {
    m = isSafeLatex(latex) ? convertLatexToMarkup(latex) : "";
    cache.set(latex, m);
  }
  return m;
}

/** Hiển thị chuỗi có công thức $…$. LaTeX có lệnh nguy hiểm (\href, \html…) hiện dạng chữ. */
export function MathText({ value }: { value: string }) {
  return (
    <span className="me-text">
      {splitMath(value).map((s, i) =>
        s.kind === "text" || !isSafeLatex(s.value) ? (
          <span key={i}>{s.kind === "text" ? s.value : s.value}</span>
        ) : (
          <span key={i} className="me-tex" dangerouslySetInnerHTML={{ __html: texMarkup(s.value) }} />
        ),
      )}
    </span>
  );
}
```

- [ ] **Step 3: `MathEditor.tsx`** (`makeMathField`, `MathEditor`, `MathField`)

```tsx
// web/src/math/MathEditor.tsx
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";
import { VN_SHORTCUTS } from "./keyboard";
import { mathStore } from "./mathStore";
import { escapeText, splitMath } from "./segments";
import { VoiceButton } from "./VoiceButton";

const ZW = "​";

/** Một <math-field> đã cấu hình: gõ tắt VN, báo cho bàn phím dùng chung khi được mở. */
export function makeMathField(latex: string, onInput: () => void, onExit: (forward: boolean) => void): MathfieldElement {
  const mf = new MathfieldElement();
  mf.mathVirtualKeyboardPolicy = "manual";
  mf.smartFence = true;
  mf.value = latex;
  mf.addEventListener("mount", () => {
    mf.inlineShortcuts = { ...mf.inlineShortcuts, ...VN_SHORTCUTS };
  }, { once: true });
  mf.addEventListener("input", onInput);
  mf.addEventListener("focus", () => mathStore.set({ mf, exit: () => onExit(true) }));
  mf.addEventListener("blur", () =>
    setTimeout(() => {
      if (document.activeElement?.tagName !== "MATH-FIELD" && mathStore.get()?.mf === mf) mathStore.set(null);
    }, 120),
  );
  mf.addEventListener("move-out", (e) => {
    e.preventDefault();
    onExit((e as CustomEvent<{ direction: string }>).detail.direction !== "backward");
  });
  return mf;
}

function serialize(root: HTMLElement): string {
  let out = "";
  root.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out += escapeText((n.nodeValue ?? "").replaceAll(ZW, ""));
    else if (n instanceof HTMLElement && n.classList.contains("me-wrap")) {
      const v = (n.firstChild as MathfieldElement).value.trim();
      if (v) out += `$${v}$`;
    } else out += escapeText(n.textContent ?? "");
  });
  return out.replace(/ /g, " ");
}

type EditorProps = { value: string; onChange: (v: string) => void; placeholder?: string; testId?: string };

/** Ô chữ + công thức chen giữa. Không điều khiển: muốn nạp giá trị mới thì đổi `key`. */
export function MathEditor({ value, onChange, placeholder, testId }: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const emit = () => {
    if (ref.current) changeRef.current(serialize(ref.current));
  };

  function placeCaretAfter(wrap: HTMLElement) {
    const r = document.createRange();
    const n = wrap.nextSibling;
    if (n && n.nodeType === Node.TEXT_NODE) r.setStart(n, (n.nodeValue ?? "").length);
    else r.setStartAfter(wrap);
    r.collapse(true);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }

  function exitMath(wrap: HTMLElement, forward: boolean) {
    const root = ref.current;
    if (!root) return;
    const mf = wrap.firstChild as MathfieldElement;
    if (!mf.value.trim()) {
      const n = wrap.nextSibling;
      wrap.remove();
      if (n?.nodeValue === ZW) n.remove();
      emit();
      root.focus();
      mathStore.set(null);
      return;
    }
    root.focus();
    if (forward) placeCaretAfter(wrap);
    else {
      const r = document.createRange();
      r.setStartBefore(wrap);
      r.collapse(true);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(r);
    }
    mathStore.set(null);
  }

  function makeWrap(latex: string): HTMLSpanElement {
    const wrap = document.createElement("span");
    wrap.className = "me-wrap";
    wrap.contentEditable = "false";
    wrap.append(makeMathField(latex, emit, (fwd) => exitMath(wrap, fwd)));
    return wrap;
  }

  function insertMath(latex = "", focus = true) {
    const root = ref.current;
    if (!root) return;
    const sel = getSelection();
    let r: Range;
    const anchor = sel?.anchorNode ?? null;
    const anchorEl = anchor instanceof Element ? anchor : anchor?.parentElement;
    if (sel && sel.rangeCount && anchor && root.contains(anchor) && !anchorEl?.closest(".me-wrap")) r = sel.getRangeAt(0);
    else {
      r = document.createRange();
      r.selectNodeContents(root);
      r.collapse(false);
    }
    const wrap = makeWrap(latex);
    r.deleteContents();
    r.insertNode(wrap);
    wrap.after(document.createTextNode(ZW));
    if (focus) setTimeout(() => (wrap.firstChild as MathfieldElement).focus(), 30);
    else placeCaretAfter(wrap);
    emit();
  }

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.replaceChildren();
    for (const seg of splitMath(value)) {
      if (seg.kind === "text") root.append(seg.value);
      else root.append(makeWrap(seg.value), ZW);
    }
    // giá trị ban đầu chỉ nạp một lần (component không điều khiển)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") e.preventDefault();
    if (e.key === "$" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "m")) {
      e.preventDefault();
      insertMath();
    }
  };
  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " ");
    for (const s of splitMath(text)) {
      if (s.kind === "text") document.execCommand("insertText", false, s.value);
      else insertMath(s.value, false);
    }
    emit();
  };

  return (
    <div className="me">
      <div ref={ref} className="me-rich" contentEditable suppressContentEditableWarning data-ph={placeholder} data-testid={testId} onInput={emit} onKeyDown={onKeyDown} onPaste={onPaste} />
      <div className="me-tools">
        <button type="button" className="me-fx" title="Chèn công thức (gõ $ hoặc Ctrl+M)" onMouseDown={(e) => e.preventDefault()} onClick={() => insertMath()}>
          <i>ƒx</i>
        </button>
        <VoiceButton onLatex={(l) => insertMath(l, false)} />
      </div>
    </div>
  );
}

type FieldProps = { value: string; onChange: (v: string) => void; onEnter?: () => void; testId?: string; autoFocus?: boolean };

/** Ô chỉ một công thức (giá trị = LaTeX). Không điều khiển. */
export function MathField({ value, onChange, onEnter, testId, autoFocus }: FieldProps) {
  const host = useRef<HTMLDivElement>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const enterRef = useRef(onEnter);
  enterRef.current = onEnter;
  useEffect(() => {
    const mf = makeMathField(value, () => changeRef.current(mf.value), () => mf.blur());
    if (testId) mf.dataset.testid = testId;
    mf.addEventListener("keydown", (e) => {
      if ((e as globalThis.KeyboardEvent).key === "Enter") {
        e.preventDefault();
        enterRef.current?.();
      }
    });
    host.current?.replaceChildren(mf);
    if (autoFocus) setTimeout(() => mf.focus(), 30);
    return () => {
      if (mathStore.get()?.mf === mf) mathStore.set(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="me-field" ref={host} />;
}
```

- [ ] **Step 4: `VoiceButton.tsx`**

```tsx
// web/src/math/VoiceButton.tsx
import { useRef, useState } from "react";
import { Icon } from "../Icon";
import { texMarkup } from "./MathText";
import { viToLatex } from "./viToLatex";

type Rec = { lang: string; interimResults: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
type RecCtor = new () => Rec;

/** Đọc công thức bằng giọng nói (Chrome/Edge) hoặc gõ câu đọc → công thức. */
export function VoiceButton({ onLatex }: { onLatex: (latex: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec | null>(null);
  const latex = text.trim() ? viToLatex(text) : "";

  const start = () => {
    setOpen(true);
    setText("");
    const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "vi-VN";
    r.interimResults = true;
    r.onresult = (e) => setText(Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
    }
  };
  const close = () => {
    rec.current?.stop();
    setOpen(false);
  };
  const insert = () => {
    if (latex) onLatex(latex);
    close();
  };

  return (
    <span className="me-voice-wrap">
      <button type="button" className="me-mic" title="Đọc công thức" onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? close() : start())}>
        <Icon name="mic" size={16} />
      </button>
      {open && (
        <div className={listening ? "me-voice listen" : "me-voice"} data-testid="voice">
          <div className="me-voice-hd">
            <span className="me-voice-dot"><Icon name="mic" size={16} /></span>
            {listening ? "Đang nghe…" : "Đọc hoặc gõ câu đọc"}
          </div>
          <input autoFocus value={text} placeholder="vd: x bình phương trừ ba" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => (e.key === "Enter" ? insert() : e.key === "Escape" ? close() : undefined)} />
          <div className="me-voice-out">
            <span className="me-tex" dangerouslySetInnerHTML={{ __html: latex ? texMarkup(latex) : "" }} />
            <button type="button" disabled={!latex} onClick={insert}>Chèn</button>
          </div>
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 5: `MathKeyboard.tsx`**

```tsx
// web/src/math/MathKeyboard.tsx
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "../Icon";
import { HINTS, NUM, OPS, SETS, TAB_NAMES, type TabName } from "./keyboard";
import { mathStore } from "./mathStore";
import { texMarkup } from "./MathText";

/** Bàn phím toán VN, gắn một lần ở App; hiện khi có ô toán đang mở. */
export function MathKeyboard() {
  const active = useSyncExternalStore(mathStore.subscribe, mathStore.get);
  const [tab, setTab] = useState<TabName>(TAB_NAMES[0]);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    document.documentElement.style.setProperty("--kb-h", active ? `${ref.current?.offsetHeight ?? 0}px` : "0px");
  }, [active, tab]);

  const insert = (ins: string) => active?.mf.executeCommand(["insert", ins, { focus: true, feedback: false, selectionMode: "placeholder" }]);
  const cmd = (c: "deleteBackward" | "moveToPreviousChar" | "moveToNextChar") => active?.mf.executeCommand(c);
  const key = (label: string, ins: string, cls = "") => (
    <button type="button" key={label + ins} className={`kb-key ${cls}`} onClick={() => insert(ins)} dangerouslySetInnerHTML={{ __html: texMarkup(label) }} />
  );

  return (
    <div ref={ref} className={active ? "kb on" : "kb"} onMouseDown={(e) => e.preventDefault()} data-testid="math-kb" aria-hidden={!active}>
      <div className="kb-head">
        <div className="kb-tabs">
          {TAB_NAMES.map((t) => (
            <button type="button" key={t} className={t === tab ? "on" : ""} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
        <div className="kb-hints">
          Gõ nhanh
          {HINTS.map(([k, l]) => (
            <span key={k} className="kb-hint"><code>{k}</code><span dangerouslySetInnerHTML={{ __html: texMarkup(l) }} /></span>
          ))}
        </div>
      </div>
      <div className="kb-keys">
        <div className="kb-g kb-6">{SETS[tab].map(([l, i]) => key(l, i, l.length > 22 ? "small" : ""))}</div>
        <div className="kb-g kb-3">{NUM.map((n) => key(n === "," ? "{,}" : n, n === "," ? "{,}" : n, "num"))}</div>
        <div className="kb-g kb-1">{OPS.map(([l, i]) => key(l, i, "op"))}</div>
        <div className="kb-g kb-ctl">
          <button type="button" className="kb-key ctl kb-del" onClick={() => cmd("deleteBackward")} title="Xoá"><Icon name="del" /></button>
          <button type="button" className="kb-key ctl" onClick={() => cmd("moveToPreviousChar")} title="Sang trái"><Icon name="left" /></button>
          <button type="button" className="kb-key ctl" onClick={() => cmd("moveToNextChar")} title="Sang phải"><Icon name="right" /></button>
          <button type="button" className="kb-key kb-done" onClick={() => active?.exit()} data-testid="kb-done">Xong</button>
        </div>
      </div>
    </div>
  );
}
```

Trong `web/src/App.tsx`: bọc kết quả trong fragment và gắn bàn phím khi đã đăng nhập:

```tsx
import { MathKeyboard } from "./math/MathKeyboard";
// …
  return (
    <>
      <Routes>{/* giữ nguyên */}</Routes>
      {user && <MathKeyboard />}
    </>
  );
```

- [ ] **Step 6: CSS**

```css
/* web/src/math/math.css — ô công thức (me-) và bàn phím toán (kb-) */
.me { position: relative; }
.me-rich { min-height: 42px; padding: 7px 76px 7px 12px; border-radius: 12px; background: var(--card); border: 1px solid var(--line); outline: none; line-height: 2; font-size: 15px; overflow-wrap: anywhere; }
.me-rich:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--blue-bg); }
.me-rich:empty::before { content: attr(data-ph); color: #a5abbd; }
.me-wrap { display: inline-block; vertical-align: middle; margin: 0 2px; }
math-field { display: inline-block; min-width: 26px; padding: 1px 6px; border-radius: 8px; background: var(--blue-bg); font-size: 17px; border: 0; outline: none; --caret-color: var(--brand); --selection-background-color: #d5ddfc; --contains-highlight-background-color: transparent; --placeholder-color: #9aa8f2; }
math-field:focus-within { box-shadow: 0 0 0 2px var(--brand); background: #fff; }
math-field::part(menu-toggle), math-field::part(virtual-keyboard-toggle) { display: none; }
.me-field math-field { display: block; width: 100%; font-size: 22px; padding: 8px 12px; border-radius: 12px; background: var(--bg); }
.me-tools { position: absolute; right: 6px; top: 6px; display: flex; gap: 4px; }
.me-tools button { width: 30px; height: 30px; border: 0; border-radius: 9px; background: var(--bg); color: var(--brand); display: grid; place-items: center; }
.me-fx i { font-family: "Times New Roman", serif; font-style: italic; font-weight: 600; font-size: 15px; }
.me-tex { display: inline-block; vertical-align: middle; }
.me-voice-wrap { position: relative; display: inline-flex; }
.me-voice { position: absolute; right: 0; top: 38px; width: 320px; z-index: 70; background: #fff; border-radius: 14px; box-shadow: var(--shadow-hi); padding: 12px; display: grid; gap: 10px; }
.me-voice-hd { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 13px; }
.me-voice-dot { width: 30px; height: 30px; border-radius: 50%; background: var(--brand); color: #fff; display: grid; place-items: center; position: relative; }
.me-voice.listen .me-voice-dot::after { content: ""; position: absolute; inset: -5px; border-radius: 50%; border: 2px solid var(--brand); animation: me-ring 1.2s infinite; }
@keyframes me-ring { from { opacity: .7; transform: scale(.85); } to { opacity: 0; transform: scale(1.35); } }
.me-voice input { border: 0; background: var(--bg); border-radius: 10px; padding: 9px 11px; font: inherit; outline: none; }
.me-voice-out { display: flex; align-items: center; gap: 10px; min-height: 36px; }
.me-voice-out .me-tex { flex: 1; font-size: 19px; }
.me-voice-out button { border: 0; background: var(--brand); color: #fff; border-radius: 10px; padding: 7px 12px; font-weight: 500; }
.me-voice-out button:disabled { opacity: .4; }

.kb { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; background: #fff; box-shadow: 0 -1px 0 var(--line), 0 -12px 32px rgba(20,28,60,.10); padding: 10px 22px 16px; transform: translateY(105%); transition: transform .3s cubic-bezier(.2,.8,.2,1); }
.kb.on { transform: none; }
.kb-head { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.kb-tabs { display: flex; gap: 3px; background: var(--bg); padding: 3px; border-radius: 11px; }
.kb-tabs button { border: 0; background: transparent; padding: 5px 13px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--muted); }
.kb-tabs button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow); }
.kb-hints { margin-left: auto; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }
.kb-hint { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 8px; background: var(--bg); }
.kb-hint code { font: 600 12px ui-monospace, monospace; color: var(--ink); }
.kb-keys { display: grid; grid-template-columns: 6fr 3fr 1fr 1.3fr; gap: 14px; }
.kb-g { display: grid; gap: 6px; }
.kb-6 { grid-template-columns: repeat(6, 1fr); } .kb-3 { grid-template-columns: repeat(3, 1fr); } .kb-1 { grid-template-columns: 1fr; }
.kb-ctl { grid-template-columns: 1fr 1fr; }
.kb-key { height: 42px; border: 0; border-radius: 10px; background: var(--bg); color: var(--ink); display: grid; place-items: center; font-size: 15px; box-shadow: 0 1px 0 #e3e6ef; padding: 0 4px; overflow: hidden; transition: transform .12s, background .15s; }
.kb-key:hover { background: #eceff7; }
.kb-key:active { transform: scale(.94); background: #dfe5fd; }
.kb-key.num { background: #fff; box-shadow: 0 0 0 1px var(--line), 0 1px 0 #e3e6ef; font-weight: 500; font-size: 16px; }
.kb-key.op { color: var(--brand); font-weight: 600; }
.kb-key.ctl { background: #eef0f6; }
.kb-key.small .ML__latex { font-size: 13px; }
.kb-del { grid-column: span 2; }
.kb-done { grid-column: span 2; grid-row: span 2; height: auto; background: var(--brand); color: #fff; font-weight: 600; }
```

Trong `web/src/styles.css` thêm: `main { padding-bottom: calc(28px + var(--kb-h, 0px)); transition: padding-bottom .3s; }`.

- [ ] **Step 7: Icon mới trong sprite**

Thêm vào chuỗi `SPRITE` trong `web/src/sprite.ts` (Lucide, ISC):

```
  <symbol id="del" viewBox="0 0 24 24"><path d="M10 5a2 2 0 0 0-1.34.52L2.4 11.26a1 1 0 0 0 0 1.48l6.26 5.74A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"/><path d="m12 9 6 6"/><path d="m18 9-6 6"/></symbol>
  <symbol id="left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>
  <symbol id="right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
  <symbol id="mic" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></symbol>
  <symbol id="x" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></symbol>
  <symbol id="board" viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></symbol>
  <symbol id="pointer" viewBox="0 0 24 24"><path d="M4.04 4.69a.5.5 0 0 1 .65-.65l16 6.5a.5.5 0 0 1-.06.95l-6.12 1.58a2 2 0 0 0-1.44 1.43l-1.58 6.13a.5.5 0 0 1-.95.06z"/></symbol>
  <symbol id="eraser" viewBox="0 0 24 24"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></symbol>
  <symbol id="graph" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4.5 3 1.5 0 2.5-3 3.5-5"/></symbol>
  <symbol id="box" viewBox="0 0 24 24"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></symbol>
  <symbol id="undo" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></symbol>
  <symbol id="save" viewBox="0 0 24 24"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></symbol>
  <symbol id="max" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></symbol>
  <symbol id="present" viewBox="0 0 24 24"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></symbol>
  <symbol id="rotate" viewBox="0 0 24 24"><path d="M16.47 7.5C15.64 4.24 13.95 2 12 2 9.24 2 7 6.48 7 12s2.24 10 5 10c.34 0 .68-.07 1-.2"/><path d="m15.19 13.71 3.82 1.86-1.86 3.81"/><path d="M19 15.57c-1.8.89-4.27 1.43-7 1.43-5.52 0-10-2.24-10-5s4.48-5 10-5c4.84 0 8.87 1.72 9.8 4"/></symbol>
  <symbol id="cut" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></symbol>
  <symbol id="angle" viewBox="0 0 24 24"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M4 11a9 9 0 0 1 9 9"/></symbol>
  <symbol id="move" viewBox="0 0 24 24"><path d="M12 2v20"/><path d="m15 19-3 3-3-3"/><path d="m19 9 3 3-3 3"/><path d="M2 12h20"/><path d="m5 9-3 3 3 3"/><path d="m9 5 3-3 3 3"/></symbol>
  <symbol id="target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></symbol>
  <symbol id="game" viewBox="0 0 24 24"><path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/></symbol>
```

- [ ] **Step 8: Ngân hàng câu hỏi dùng ô công thức**

Trong `web/src/pages/Bank.tsx`:
- `import { MathEditor } from "../math/MathEditor";` và `import { MathText } from "../math/MathText";`.
- Ô bảng: `<td><MathText value={q.stem} /></td>`.
- Trong `AddForm`: thêm `const [formKey, setFormKey] = useState(0);`; sau khi lưu thành công (cạnh `setStem("")`) gọi `setFormKey((k) => k + 1);`.
- Thay ô câu hỏi:

```tsx
      <MathEditor key={`stem-${formKey}`} value={stem} onChange={setStem} placeholder="Câu hỏi — gõ $ để chèn công thức" testId="q-stem" />
```

- Thay ô phương án (bên trong `.opt`, giữ radio và chữ cái):

```tsx
          <div style={{ flex: 1 }}>
            <MathEditor key={`opt-${i}-${formKey}`} value={o} onChange={(v) => setOptions((prev) => prev.map((x, j) => (j === i ? v : x)))} placeholder={`Phương án ${"ABCD"[i]}`} testId={`q-opt-${i}`} />
          </div>
```

- [ ] **Step 9: Kiểm**

Run: `pnpm --filter @eduvn/web typecheck && pnpm --filter @eduvn/web build` → sạch.
Run: `pnpm --filter @eduvn/web test` → PASS.
Chạy app (server + web như README), vào **Ngân hàng câu hỏi → Thêm**: gõ chữ, gõ `$` → ô công thức + bàn phím hiện; gõ `x^2-3`, bấm **Xong** → con trỏ ra sau công thức; nút micro → gõ "trừ chín phần tư" → **Chèn** ra `−9/4`; lưu → bảng hiện công thức. Chụp `/tmp/eduvn-web-cong-thuc.png`.

- [ ] **Step 10: Commit**

```bash
git add web/src/math web/src/main.tsx web/src/App.tsx web/src/styles.css web/src/sprite.ts web/src/pages/Bank.tsx
git commit -m "feat(web): ô công thức, bàn phím toán VN, đọc công thức; ngân hàng câu hỏi nhập và hiển thị công thức"
```

---

### Task 8: Toán hình không gian (module thuần)

**Files:**
- Create: `web/src/board/geom3.ts`, `web/src/board/solids.ts`
- Test: `web/tests/solids.test.ts`

**Interfaces:**
- Produces:
  - geom3: `type V3 = readonly [number, number, number]`; `add`, `sub`, `mul(a, k)`, `dot`, `cross`, `len`, `norm`, `lerp(a, b, t)`.
  - solids: `type SolidKind = "cube" | "cuboid" | "pyramid4" | "pyramid3" | "prism3"`; `type SolidDef = { kind; title: string; label: string; names: string[]; verts: V3[]; edges: [number, number][]; faces: number[][] }`; `SOLIDS: Record<SolidKind, SolidDef>`; `SOLID_ORDER: SolidKind[]`;
  - `type SolidState = { kind: SolidKind; cx: number; cy: number; size: number; th: number; ph: number; points: { name: string; a: number; b: number; t: number }[]; section: [string, string, string] | null; angle: [string, string, string] | null }`;
  - `project(st, p: V3): [x: number, y: number]`; `hiddenEdges(st): boolean[]` (theo thứ tự `SOLIDS[kind].edges`); `resolvePoint(st, name): V3 | null`; `sectionPolygon(def, p1, p2, p3): V3[] | null`; `angleDeg(a, b, c): number`; `shapeName(poly: V3[]): string`; `fmtDeg(deg): string`;
  - `type Scene = { faces: [number, number][][]; edges: { a: [number, number]; b: [number, number]; hidden: boolean }[]; labels: { name: string; vertex: boolean; px: number; py: number; x: number; y: number }[]; section: { pts: [number, number][]; name: string } | null; angle: { arc: [number, number][]; value: number; x: number; y: number } | null }`; `solidScene(st): Scene`;
  - `pickPoint(st, x, y, max = 20): string | null`; `pickEdgePoint(st, x, y, max = 18): { a: number; b: number; t: number } | null`; `nextPointName(st): string`.

- [ ] **Step 1: Test (đỏ)**

```ts
// web/tests/solids.test.ts
import { describe, expect, it } from "vitest";
import { type SolidState, SOLIDS, angleDeg, fmtDeg, hiddenEdges, nextPointName, pickEdgePoint, pickPoint, project, resolvePoint, sectionPolygon, shapeName, solidScene } from "../src/board/solids";

const cube = (p: Partial<SolidState> = {}): SolidState => ({ kind: "cube", cx: 400, cy: 360, size: 200, th: 0.62, ph: 0.42, points: [], section: null, angle: null, ...p });
const MNP = [{ name: "M", a: 0, b: 1, t: 0.5 }, { name: "N", a: 1, b: 2, t: 0.5 }, { name: "P", a: 2, b: 6, t: 0.5 }];

describe("hình lập phương", () => {
  it("nhìn chéo: đúng 3 cạnh khuất", () => {
    expect(hiddenEdges(cube()).filter(Boolean)).toHaveLength(3);
  });
  it("mặt phẳng qua trung điểm AB, BC, CC' cắt theo lục giác đều, góc 120°", () => {
    const st = cube({ points: MNP });
    const poly = sectionPolygon(SOLIDS.cube, resolvePoint(st, "M")!, resolvePoint(st, "N")!, resolvePoint(st, "P")!);
    expect(poly).toHaveLength(6);
    expect(shapeName(poly!)).toBe("lục giác đều");
    expect(angleDeg(poly![5]!, poly![0]!, poly![1]!)).toBeCloseTo(120, 6);
  });
  it("mặt chéo ACC'A' là hình chữ nhật", () => {
    const st = cube();
    const poly = sectionPolygon(SOLIDS.cube, resolvePoint(st, "A")!, resolvePoint(st, "C")!, resolvePoint(st, "C'")!);
    expect(shapeName(poly!)).toBe("hình chữ nhật");
  });
  it("3 điểm thẳng hàng → không có mặt phẳng", () => {
    const st = cube({ points: [{ name: "M", a: 0, b: 1, t: 0.5 }] });
    expect(sectionPolygon(SOLIDS.cube, resolvePoint(st, "A")!, resolvePoint(st, "M")!, resolvePoint(st, "B")!)).toBeNull();
  });
  it("góc ABC = 90°; định dạng dấu phẩy", () => {
    const st = cube();
    expect(angleDeg(resolvePoint(st, "A")!, resolvePoint(st, "B")!, resolvePoint(st, "C")!)).toBeCloseTo(90, 6);
    expect(fmtDeg(54.7356)).toBe("54,7°");
  });
  it("cảnh có thiết diện + góc + nhãn", () => {
    const sc = solidScene(cube({ points: MNP, section: ["M", "N", "P"], angle: ["M", "N", "P"] }));
    expect(sc.section?.name).toBe("lục giác đều");
    expect(sc.labels.map((l) => l.name)).toEqual(["A", "B", "C", "D", "A'", "B'", "C'", "D'", "M", "N", "P"]);
    expect(sc.angle?.value).toBeCloseTo(120, 6);
  });
});

describe("chọn điểm trên màn hình", () => {
  it("bấm gần trung điểm AB → điểm trên cạnh, t = 1/2; bấm vào đỉnh → không tạo điểm mới", () => {
    const st = cube();
    const [ax, ay] = project(st, SOLIDS.cube.verts[0]!);
    const [bx, by] = project(st, SOLIDS.cube.verts[1]!);
    expect(pickEdgePoint(st, (ax + bx) / 2 + 2, (ay + by) / 2 - 1)).toEqual({ a: 0, b: 1, t: 0.5 });
    expect(pickEdgePoint(st, ax, ay)).toBeNull();
    expect(pickPoint(st, ax + 3, ay - 2)).toBe("A");
  });
  it("tên điểm kế tiếp bỏ tên đã dùng", () => {
    expect(nextPointName(cube())).toBe("M");
    expect(nextPointName(cube({ points: [{ name: "M", a: 0, b: 1, t: 0.5 }] }))).toBe("N");
  });
});

describe("hình chóp S.ABCD", () => {
  it("mặt phẳng qua trung điểm SA, SB, SC song song đáy → hình vuông", () => {
    const st: SolidState = { kind: "pyramid4", cx: 400, cy: 360, size: 200, th: 0.6, ph: 0.4, points: [{ name: "M", a: 4, b: 0, t: 0.5 }, { name: "N", a: 4, b: 1, t: 0.5 }, { name: "P", a: 4, b: 2, t: 0.5 }], section: null, angle: null };
    const poly = sectionPolygon(SOLIDS.pyramid4, resolvePoint(st, "M")!, resolvePoint(st, "N")!, resolvePoint(st, "P")!);
    expect(poly).toHaveLength(4);
    expect(shapeName(poly!)).toBe("hình vuông");
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `pnpm --filter @eduvn/web test` → FAIL (thiếu module).

- [ ] **Step 3: `geom3.ts`**

```ts
// web/src/board/geom3.ts
export type V3 = readonly [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));
```

- [ ] **Step 4: `solids.ts`**

```ts
// web/src/board/solids.ts
import { type V3, add, cross, dot, len, lerp, mul, norm, sub } from "./geom3";

export type SolidKind = "cube" | "cuboid" | "pyramid4" | "pyramid3" | "prism3";
export type SolidDef = { kind: SolidKind; title: string; label: string; names: string[]; verts: V3[]; edges: [number, number][]; faces: number[][] };
export type PointRef = { name: string; a: number; b: number; t: number };
export type SolidState = { kind: SolidKind; cx: number; cy: number; size: number; th: number; ph: number; points: PointRef[]; section: [string, string, string] | null; angle: [string, string, string] | null };

const H3 = Math.sqrt(3) / 2;
const BOX_EDGES: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const BOX_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
const PRIME = ["A", "B", "C", "D", "A'", "B'", "C'", "D'"];
const box = (x: number, y: number, z: number): V3[] => [[0, 0, 0], [x, 0, 0], [x, y, 0], [0, y, 0], [0, 0, z], [x, 0, z], [x, y, z], [0, y, z]];

/** Toạ độ toán học (z hướng lên). Quy ước tên đỉnh theo SGK: đáy ABCD, A' nằm trên A. */
export const SOLIDS: Record<SolidKind, SolidDef> = {
  cube: { kind: "cube", title: "hình lập phương", label: "ABCD.A'B'C'D'", names: PRIME, verts: box(1, 1, 1), edges: BOX_EDGES, faces: BOX_FACES },
  cuboid: { kind: "cuboid", title: "hình hộp chữ nhật", label: "ABCD.A'B'C'D'", names: PRIME, verts: box(1.4, 1, 0.8), edges: BOX_EDGES, faces: BOX_FACES },
  pyramid4: {
    kind: "pyramid4", title: "hình chóp tứ giác đều", label: "S.ABCD", names: ["A", "B", "C", "D", "S"],
    verts: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0.5, 0.5, 1.1]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3]],
    faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]],
  },
  pyramid3: {
    kind: "pyramid3", title: "hình chóp tam giác đều", label: "S.ABC", names: ["A", "B", "C", "S"],
    verts: [[0, 0, 0], [1, 0, 0], [0.5, H3, 0], [0.5, H3 / 3, 0.95]],
    edges: [[0, 1], [1, 2], [2, 0], [3, 0], [3, 1], [3, 2]],
    faces: [[0, 1, 2], [0, 1, 3], [1, 2, 3], [2, 0, 3]],
  },
  prism3: {
    kind: "prism3", title: "hình lăng trụ tam giác đều", label: "ABC.A'B'C'", names: ["A", "B", "C", "A'", "B'", "C'"],
    verts: [[0, 0, 0], [1, 0, 0], [0.5, H3, 0], [0, 0, 1], [1, 0, 1], [0.5, H3, 1]],
    edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]],
    faces: [[0, 1, 2], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]],
  },
};
export const SOLID_ORDER: SolidKind[] = ["cube", "cuboid", "pyramid4", "pyramid3", "prism3"];

const centroid = (pts: readonly V3[]): V3 => mul(pts.reduce<V3>((s, p) => add(s, p), [0, 0, 0]), 1 / pts.length);

/** Xoay quanh trục đứng (th) rồi nghiêng (ph); trục màn hình: X phải, Y lên, Z hướng về người xem. */
function rotate(v: V3, th: number, ph: number): V3 {
  const X = v[0], Y = v[2], Z = v[1];
  const c = Math.cos(th), s = Math.sin(th), cp = Math.cos(ph), sp = Math.sin(ph);
  const X1 = X * c + Z * s, Z1 = -X * s + Z * c;
  return [X1, Y * cp - Z1 * sp, Y * sp + Z1 * cp];
}

export function project(st: SolidState, p: V3): [number, number] {
  const r = rotate(sub(p, centroid(SOLIDS[st.kind].verts)), st.th, st.ph);
  return [st.cx + r[0] * st.size, st.cy - r[1] * st.size];
}

function faceNormals(def: SolidDef): V3[] {
  const c = centroid(def.verts);
  return def.faces.map((f) => {
    const [a, b, d] = [def.verts[f[0]!]!, def.verts[f[1]!]!, def.verts[f[2]!]!];
    const n = norm(cross(sub(b, a), sub(d, a)));
    return dot(n, sub(centroid(f.map((i) => def.verts[i]!)), c)) < 0 ? mul(n, -1) : n;
  });
}

export function hiddenEdges(st: SolidState): boolean[] {
  const def = SOLIDS[st.kind];
  const vis = faceNormals(def).map((n) => rotate(n, st.th, st.ph)[2] > 1e-9);
  return def.edges.map(([i, j]) => {
    const owners = def.faces.map((f, k) => ({ f, k })).filter(({ f }) => f.some((v, x) => (v === i && f[(x + 1) % f.length] === j) || (v === j && f[(x + 1) % f.length] === i)));
    return owners.every(({ k }) => !vis[k]);
  });
}

export function resolvePoint(st: SolidState, name: string): V3 | null {
  const def = SOLIDS[st.kind];
  const vi = def.names.indexOf(name);
  if (vi >= 0) return def.verts[vi]!;
  const p = st.points.find((x) => x.name === name);
  if (!p) return null;
  const a = def.verts[p.a], b = def.verts[p.b];
  return a && b ? lerp(a, b, p.t) : null;
}

export function sectionPolygon(def: SolidDef, p1: V3, p2: V3, p3: V3): V3[] | null {
  const n = cross(sub(p2, p1), sub(p3, p1));
  const nl = len(n);
  if (nl < 1e-9) return null;
  const d = dot(n, p1);
  const eps = 1e-9 * nl;
  const pts: V3[] = [];
  const push = (p: V3) => {
    if (!pts.some((q) => len(sub(p, q)) < 1e-7)) pts.push(p);
  };
  for (const [i, j] of def.edges) {
    const A = def.verts[i]!, B = def.verts[j]!;
    const fa = dot(n, A) - d, fb = dot(n, B) - d;
    if (Math.abs(fa) < eps) push(A);
    if (Math.abs(fb) < eps) push(B);
    if ((fa < -eps && fb > eps) || (fa > eps && fb < -eps)) push(lerp(A, B, fa / (fa - fb)));
  }
  if (pts.length < 3) return null;
  const c = centroid(pts);
  const u = norm(sub(pts[0]!, c)), w = cross(norm(n), u);
  const ang = (p: V3) => Math.atan2(dot(sub(p, c), w), dot(sub(p, c), u));
  return pts.sort((a, b) => ang(a) - ang(b));
}

export function angleDeg(a: V3, b: V3, c: V3): number {
  const u = sub(a, b), v = sub(c, b);
  const cos = dot(u, v) / ((len(u) || 1) * (len(v) || 1));
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

const NGON = ["", "", "", "tam giác", "tứ giác", "ngũ giác", "lục giác"];
export function shapeName(poly: V3[]): string {
  const n = poly.length;
  const base = NGON[n] ?? `đa giác ${n} cạnh`;
  const sides = poly.map((p, i) => len(sub(poly[(i + 1) % n]!, p)));
  const angs = poly.map((p, i) => angleDeg(poly[(i + n - 1) % n]!, p, poly[(i + 1) % n]!));
  const eqS = sides.every((s) => Math.abs(s - sides[0]!) < 1e-6 * Math.max(1, sides[0]!));
  const eqA = angs.every((a) => Math.abs(a - angs[0]!) < 1e-4);
  if (eqS && eqA) return n === 4 ? "hình vuông" : `${base} đều`;
  if (n === 4 && eqA) return "hình chữ nhật";
  return base;
}

export const fmtDeg = (deg: number): string => `${(Math.round(deg * 10) / 10).toString().replace(".", ",")}°`;

export type Scene = {
  faces: [number, number][][];
  edges: { a: [number, number]; b: [number, number]; hidden: boolean }[];
  labels: { name: string; vertex: boolean; px: number; py: number; x: number; y: number }[];
  section: { pts: [number, number][]; name: string } | null;
  angle: { arc: [number, number][]; value: number; x: number; y: number } | null;
};

export function solidScene(st: SolidState): Scene {
  const def = SOLIDS[st.kind];
  const P = (p: V3) => project(st, p);
  const vis = faceNormals(def).map((n) => rotate(n, st.th, st.ph)[2] > 1e-9);
  const hid = hiddenEdges(st);
  const [ccx, ccy] = P(centroid(def.verts));
  const label = (name: string, p: V3, vertex: boolean) => {
    const [px, py] = P(p);
    const dx = px - ccx, dy = py - ccy, L = Math.hypot(dx, dy) || 1;
    return { name, vertex, px, py, x: px + (dx / L) * 20, y: py + (dy / L) * 18 };
  };
  const labels = [
    ...def.names.map((n, i) => label(n, def.verts[i]!, true)),
    ...st.points.map((p) => label(p.name, resolvePoint(st, p.name)!, false)),
  ];
  let section: Scene["section"] = null;
  if (st.section) {
    const [a, b, c] = st.section.map((n) => resolvePoint(st, n));
    const poly = a && b && c ? sectionPolygon(def, a, b, c) : null;
    if (poly) section = { pts: poly.map(P), name: shapeName(poly) };
  }
  let angle: Scene["angle"] = null;
  if (st.angle) {
    const [a, b, c] = st.angle.map((n) => resolvePoint(st, n));
    if (a && b && c && len(sub(a, b)) > 1e-9 && len(sub(c, b)) > 1e-9) {
      const u1 = norm(sub(a, b)), u2 = norm(sub(c, b));
      const arc: [number, number][] = [];
      for (let k = 0; k <= 16; k++) arc.push(P(add(b, mul(norm(add(mul(u1, 1 - k / 16), mul(u2, k / 16))), 0.13))));
      const [x, y] = P(add(b, mul(norm(add(u1, u2)), 0.27)));
      angle = { arc, value: angleDeg(a, b, c), x, y };
    }
  }
  return {
    faces: def.faces.filter((_, k) => vis[k]).map((f) => f.map((i) => P(def.verts[i]!))),
    edges: def.edges.map(([i, j], k) => ({ a: P(def.verts[i]!), b: P(def.verts[j]!), hidden: hid[k]! })),
    labels,
    section,
    angle,
  };
}

export function pickPoint(st: SolidState, x: number, y: number, max = 20): string | null {
  let best: string | null = null;
  let bd = max;
  for (const l of solidScene(st).labels) {
    const d = Math.hypot(l.px - x, l.py - y);
    if (d <= bd) {
      bd = d;
      best = l.name;
    }
  }
  return best;
}

const SNAPS = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
export function pickEdgePoint(st: SolidState, x: number, y: number, max = 18): { a: number; b: number; t: number } | null {
  const def = SOLIDS[st.kind];
  let best: { a: number; b: number; t: number; d: number } | null = null;
  for (const [i, j] of def.edges) {
    const [ax, ay] = project(st, def.verts[i]!);
    const [bx, by] = project(st, def.verts[j]!);
    const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L2));
    const d = Math.hypot(ax + vx * t - x, ay + vy * t - y);
    if (d <= max && (!best || d < best.d)) {
      const snapped = SNAPS.reduce((p, s) => (Math.abs(s - t) < Math.abs(p - t) ? s : p), 0);
      best = { a: i, b: j, t: snapped, d };
    }
  }
  if (!best || best.t === 0 || best.t === 1) return null;
  return { a: best.a, b: best.b, t: best.t };
}

const POINT_NAMES = ["M", "N", "P", "Q", "K", "H", "I", "J", "E", "F", "G", "L"];
export function nextPointName(st: SolidState): string {
  const used = new Set([...SOLIDS[st.kind].names, ...st.points.map((p) => p.name)]);
  return POINT_NAMES.find((n) => !used.has(n)) ?? `M${st.points.length}`;
}
```

- [ ] **Step 5: Xanh**

Run: `pnpm --filter @eduvn/web test` → PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/board/geom3.ts web/src/board/solids.ts web/tests/solids.test.ts
git commit -m "feat(web): toán hình không gian — 5 khối, chiếu, cạnh khuất, thiết diện, góc, chọn điểm"
```

---

### Task 9: Đồ thị, nét bút, kiểu tài liệu bảng (module thuần)

**Files:**
- Create: `web/src/board/graph.ts`, `web/src/board/ink.ts`, `web/src/board/doc.ts`
- Test: `web/tests/graph.test.ts`, `web/tests/doc.test.ts`

**Interfaces:**
- Consumes: `SOLIDS`, `SolidKind`, `PointRef` (Task 8).
- Produces:
  - graph: `type View2 = { xMin; xMax; yMin; yMax }`; `type Box = { x; y; w; h }`; `type Compiled = { ok: true; params: string[]; f: (x: number, p: Readonly<Record<string, number>>) => number } | { ok: false; error: string }`; `compileExpr(latex): Compiled`; `mapX(x, v, b)`, `mapY(y, v, b)`; `samplePath(f: (x: number) => number, v, b, n = 480): string`; `ticks(min, max, target = 10): number[]`; `autoView(fs: ((x: number) => number)[], xMin, xMax): View2`.
  - ink: `strokePath(pts: readonly number[], width: number): string`; `hitStroke(pts, x, y, r): boolean`.
  - doc: kiểu `Stroke`, `GraphObj`, `SolidObj`, `BoardObj`, `BoardPageDoc`, `BoardDoc` (khớp Task 5); `newId()`, `emptyPage()`, `PALETTE`, `CURVE_COLORS`, `graphFromExprs(exprs: string[], xRange: [number, number], old?: GraphObj): GraphObj`, `newSolid(kind): SolidObj`, `boardKeywords(page): string`.

- [ ] **Step 1: Test (đỏ)**

```ts
// web/tests/graph.test.ts
import { describe, expect, it } from "vitest";
import { autoView, compileExpr, samplePath, ticks } from "../src/board/graph";
import { hitStroke, strokePath } from "../src/board/ink";

describe("compileExpr", () => {
  it("y = … và f(x) = … ; nhận tham số", () => {
    const a = compileExpr("y=x^2-3");
    expect(a.ok && a.f(2, {})).toBe(1);
    const b = compileExpr("A\\sin x+B");
    expect(b.ok && b.params).toEqual(["A", "B"]);
    expect(b.ok && b.f(Math.PI / 2, { A: 2, B: 1 })).toBeCloseTo(3);
    const c = compileExpr("f(x)=\\frac{x^2-3}{x+1}");
    expect(c.ok && c.f(2, {})).toBeCloseTo(1 / 3);
  });
  it("công thức hỏng hoặc không phải hàm y = … → báo lỗi tiếng Việt", () => {
    expect(compileExpr("\\frac{").ok).toBe(false);
    const r = compileExpr("x^2+y^2=4");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("y =");
  });
});

describe("samplePath", () => {
  const v = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  const b = { x: 0, y: 0, w: 500, h: 500 };
  it("1/x tách thành 2 nhánh ở tiệm cận", () => {
    expect((samplePath((x) => 1 / x, v, b).match(/M/g) ?? []).length).toBe(2);
  });
  it("√x chỉ vẽ phần xác định", () => {
    const d = samplePath((x) => Math.sqrt(x), v, b);
    expect(d.startsWith("M250.0")).toBe(true);
  });
});

it("ticks đẹp", () => expect(ticks(-4, 5)).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4, 5]));
it("autoView bao đỉnh parabol và trục hoành", () => {
  const v = autoView([(x) => x * x - 3], -5, 5);
  expect(v.yMin).toBeLessThan(-3);
  expect(v.yMax).toBeGreaterThan(5);
  expect(v.yMax).toBeLessThanOrEqual(30);
});

describe("ink", () => {
  it("strokePath ra đường kín", () => {
    const d = strokePath([10, 10, 50, 40, 90, 20], 4);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
  });
  it("hitStroke theo đoạn thẳng, không chỉ theo điểm", () => {
    expect(hitStroke([0, 0, 100, 0], 50, 5, 8)).toBe(true);
    expect(hitStroke([0, 0, 100, 0], 50, 20, 8)).toBe(false);
  });
});
```

```ts
// web/tests/doc.test.ts
import { describe, expect, it } from "vitest";
import { boardKeywords, graphFromExprs, newSolid } from "../src/board/doc";

describe("graphFromExprs", () => {
  it("tham số mặc định 1, giữ giá trị cũ; khung tự căn", () => {
    const g = graphFromExprs(["y=A\\sin x+B"], [-5, 5]);
    expect(g.params).toEqual({ A: 1, B: 1 });
    const g2 = graphFromExprs(["y=A\\sin x+B", "y=x^2-3"], [-4, 4], { ...g, params: { A: 2, B: 0 } });
    expect(g2.params).toEqual({ A: 2, B: 0 });
    expect(g2.exprs.map((e) => e.color)).toEqual(["#ff7a6b", "#5cc8ff"]);
    expect(g2.view.xMin).toBe(-4);
    expect(g2.id).toBe(g.id);
  });
});

describe("boardKeywords", () => {
  it("rút từ khoá từ khối, thiết diện, loại hàm", () => {
    const solid = { ...newSolid("cube"), section: ["A", "C", "C'"] as [string, string, string] };
    const kw = boardKeywords({ id: "p", objects: [solid, graphFromExprs(["y=x^2-3", "A\\sin x+B"], [-5, 5])] });
    for (const w of ["hình lập phương", "thiết diện", "đồ thị hàm số", "bậc hai", "lượng giác"]) expect(kw).toContain(w);
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `pnpm --filter @eduvn/web test` → FAIL.

- [ ] **Step 3: `graph.ts`**

```ts
// web/src/board/graph.ts
import { ComputeEngine, compile } from "@cortex-js/compute-engine";

export type View2 = { xMin: number; xMax: number; yMin: number; yMax: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Compiled = { ok: true; params: string[]; f: (x: number, p: Readonly<Record<string, number>>) => number } | { ok: false; error: string };

const ce = new ComputeEngine();
const cache = new Map<string, Compiled>();
const BAD = "Công thức chưa đúng — kiểm lại ngoặc, phân số";

/** "y = …", "f(x) = …" hoặc chỉ vế phải; mọi chữ khác x là tham số (thanh trượt). */
export function compileExpr(latex: string): Compiled {
  const hit = cache.get(latex);
  if (hit) return hit;
  let out: Compiled;
  try {
    const e = ce.parse(latex);
    if (!e.isValid) out = { ok: false, error: BAD };
    else {
      let rhs = e;
      if (e.operator === "Equal") {
        const lhs = e.op1;
        const isFn = lhs.symbol === "y" || (lhs.nops === 1 && lhs.op1.symbol === "x");
        rhs = e.op2;
        if (!isFn) {
          out = { ok: false, error: "Chỉ vẽ hàm dạng y = … hoặc f(x) = …" };
          cache.set(latex, out);
          return out;
        }
      }
      const c = compile(rhs);
      if (!c.success) out = { ok: false, error: "Chưa vẽ được công thức này" };
      else {
        const params = [...rhs.unknowns].filter((u) => u !== "x").sort();
        out = {
          ok: true,
          params,
          f: (x, p) => {
            const v = c.run({ ...p, x });
            return typeof v === "number" ? v : Number.NaN;
          },
        };
      }
    }
  } catch {
    out = { ok: false, error: BAD };
  }
  cache.set(latex, out);
  return out;
}

export const mapX = (x: number, v: View2, b: Box): number => b.x + ((x - v.xMin) / (v.xMax - v.xMin)) * b.w;
export const mapY = (y: number, v: View2, b: Box): number => b.y + b.h - ((y - v.yMin) / (v.yMax - v.yMin)) * b.h;

/** Đường SVG; ngắt nét ở chỗ không xác định hoặc nhảy quá một khung (tiệm cận). */
export function samplePath(f: (x: number) => number, v: View2, b: Box, n = 480): string {
  const span = v.yMax - v.yMin;
  let d = "";
  let on = false;
  let prev = 0;
  for (let i = 0; i <= n; i++) {
    const x = v.xMin + ((v.xMax - v.xMin) * i) / n;
    const y = f(x);
    const bad = !Number.isFinite(y) || y < v.yMin - span || y > v.yMax + span;
    if (bad) {
      on = false;
      continue;
    }
    if (on && Math.abs(y - prev) > span) on = false;
    d += `${on ? "L" : "M"}${mapX(x, v, b).toFixed(1)} ${mapY(y, v, b).toFixed(1)}`;
    on = true;
    prev = y;
  }
  return d;
}

export function ticks(min: number, max: number, target = 10): number[] {
  const raw = (max - min) / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  const step = (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
  const out: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) out.push(Math.round(t / step) * step);
  return out;
}

/** Khung y tự căn: phân vị 5–95% các giá trị, luôn chứa trục hoành, cao ít nhất 4, tối đa ±50. */
export function autoView(fs: ((x: number) => number)[], xMin: number, xMax: number): View2 {
  const ys: number[] = [];
  for (const f of fs) for (let i = 0; i <= 200; i++) {
    const y = f(xMin + ((xMax - xMin) * i) / 200);
    if (Number.isFinite(y)) ys.push(y);
  }
  ys.sort((a, b) => a - b);
  let lo = ys.length ? ys[Math.floor(ys.length * 0.05)]! : -5;
  let hi = ys.length ? ys[Math.floor(ys.length * 0.95)]! : 5;
  lo = Math.max(-50, Math.min(lo, 0));
  hi = Math.min(50, Math.max(hi, 0));
  if (hi - lo < 4) {
    const mid = (hi + lo) / 2;
    lo = mid - 2;
    hi = mid + 2;
  }
  const pad = (hi - lo) * 0.12;
  return { xMin, xMax, yMin: Math.floor(lo - pad), yMax: Math.ceil(hi + pad) };
}
```

(Nếu typings của Compute Engine cho `run` nhận kiểu khác `Record<string, number>`, ép kiểu tại chỗ gọi, không đổi hành vi.)

- [ ] **Step 4: `ink.ts`**

```ts
// web/src/board/ink.ts
import { getStroke } from "perfect-freehand";

/** Nét bút đẹp (perfect-freehand) → đường SVG kín để tô màu. pts = [x0,y0,x1,y1,…]. */
export function strokePath(pts: readonly number[], width: number): string {
  const input: [number, number][] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) input.push([pts[i]!, pts[i + 1]!]);
  if (input.length === 1) input.push([input[0]![0] + 0.1, input[0]![1]]);
  const outline = getStroke(input, { size: width, thinning: 0.45, smoothing: 0.6, streamline: 0.4 });
  if (!outline.length) return "";
  const [first, ...rest] = outline;
  return `M${first![0]!.toFixed(1)} ${first![1]!.toFixed(1)}${rest.map((p) => `L${p[0]!.toFixed(1)} ${p[1]!.toFixed(1)}`).join("")}Z`;
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / L2)) : 0;
  return Math.hypot(ax + vx * t - px, ay + vy * t - py);
}

export function hitStroke(pts: readonly number[], x: number, y: number, r: number): boolean {
  if (pts.length === 2) return Math.hypot(pts[0]! - x, pts[1]! - y) <= r;
  for (let i = 0; i + 3 < pts.length; i += 2) if (segDist(x, y, pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!) <= r) return true;
  return false;
}
```

- [ ] **Step 5: `doc.ts`**

```ts
// web/src/board/doc.ts
import { autoView, compileExpr, type View2 } from "./graph";
import { type PointRef, SOLIDS, type SolidKind } from "./solids";

/** Phải khớp server/src/domain/board.ts (BoardDocSchema). */
export type Stroke = { type: "stroke"; id: string; color: string; width: number; pts: number[] };
export type GraphObj = { type: "graph"; id: string; x: number; y: number; w: number; h: number; exprs: { latex: string; color: string }[]; params: Record<string, number>; view: View2 };
export type SolidObj = { type: "solid"; id: string; kind: SolidKind; cx: number; cy: number; size: number; th: number; ph: number; points: PointRef[]; section: [string, string, string] | null; angle: [string, string, string] | null };
export type BoardObj = Stroke | GraphObj | SolidObj;
export type BoardPageDoc = { id: string; objects: BoardObj[] };
export type BoardDoc = { version: 1; pages: BoardPageDoc[] };

export const newId = (): string => Math.random().toString(36).slice(2, 10);
export const emptyPage = (): BoardPageDoc => ({ id: newId(), objects: [] });
export const PALETTE = ["#f3f0e6", "#ff7a6b", "#5cc8ff", "#ffb547"];
export const CURVE_COLORS = ["#ff7a6b", "#5cc8ff", "#7ee2a8", "#ffb547", "#c39bff", "#f3f0e6"];

export function graphFromExprs(exprs: string[], xRange: [number, number], old?: GraphObj): GraphObj {
  const compiled = exprs.map(compileExpr);
  const names = [...new Set(compiled.flatMap((c) => (c.ok ? c.params : [])))];
  const params = Object.fromEntries(names.map((n) => [n, old?.params[n] ?? 1]));
  const fs = compiled.flatMap((c) => (c.ok ? [(x: number) => c.f(x, params)] : []));
  return {
    type: "graph",
    id: old?.id ?? newId(),
    x: old?.x ?? 560,
    y: old?.y ?? 50,
    w: old?.w ?? 660,
    h: old?.h ?? 420,
    exprs: exprs.map((latex, i) => ({ latex, color: CURVE_COLORS[i % CURVE_COLORS.length]! })),
    params,
    view: autoView(fs, xRange[0], xRange[1]),
  };
}

export const newSolid = (kind: SolidKind): SolidObj => ({ type: "solid", id: newId(), kind, cx: 380, cy: 330, size: 200, th: 0.62, ph: 0.42, points: [], section: null, angle: null });

const EXPR_HINTS: [RegExp, string][] = [
  [/\\(sin|cos|tan|cot)/, "lượng giác"],
  [/x\^\{?2(?!\d)/, "bậc hai parabol"],
  [/x\^\{?3(?!\d)/, "bậc ba"],
  [/\\frac/, "phân thức"],
  [/\\sqrt/, "căn thức"],
  [/\\(ln|log)/, "logarit"],
  [/\^\{?x/, "hàm số mũ"],
];

/** Từ khoá mô tả trang bảng — gửi cho gợi ý bài liên quan. */
export function boardKeywords(page: BoardPageDoc): string {
  const out = new Set<string>();
  for (const o of page.objects) {
    if (o.type === "solid") {
      out.add(SOLIDS[o.kind].title);
      if (o.section) out.add("thiết diện mặt phẳng cắt");
      if (o.angle) out.add("góc");
    }
    if (o.type === "graph") {
      out.add("đồ thị hàm số");
      for (const e of o.exprs) for (const [re, w] of EXPR_HINTS) if (re.test(e.latex)) out.add(w);
    }
  }
  return [...out].join(" ");
}
```

- [ ] **Step 6: Xanh**

Run: `pnpm --filter @eduvn/web test && pnpm --filter @eduvn/web typecheck` → PASS.

- [ ] **Step 7: Commit**

```bash
git add web/src/board/graph.ts web/src/board/ink.ts web/src/board/doc.ts web/tests/graph.test.ts web/tests/doc.test.ts
git commit -m "feat(web): đồ thị hàm số (Compute Engine), nét bút, kiểu tài liệu bảng giảng"
```

---

### Task 10: Danh sách bài giảng + nối vào app

**Files:**
- Create: `web/src/pages/Boards.tsx`
- Modify: `web/src/api.ts`, `web/src/App.tsx`, `web/src/Shell.tsx`, `web/src/tools.ts`

**Interfaces:**
- Consumes: REST Task 5; `BoardDoc` (Task 9).
- Produces: trong `api.ts`: `type BoardSummary`, `type BoardDetail = BoardSummary & { doc: BoardDoc }`, `type BankQuestion`, `gradeLabel(g: number): string`. Route `/bang-giang` (trong Shell) và `/bang-giang/:id` (toàn màn hình, ngoài Shell — `BoardPage` làm ở Task 11; ở task này tạm trỏ tới `BoardPage` tối thiểu ở Step 3).

- [ ] **Step 1: `api.ts`**

```ts
import type { BoardDoc } from "./board/doc";

export type BoardSummary = { id: string; title: string; subject: string; grade: number; topic: string; pageCount: number; updatedAt: string };
export type BoardDetail = BoardSummary & { doc: BoardDoc };
/** Câu hỏi đầy đủ (gợi ý bài, chiếu lên bảng). */
export type BankQuestion = Question & { options?: string[]; statements?: string[]; answer: number | boolean[] | string; explanation?: string; rubric?: string; points?: number };
export const gradeLabel = (g: number): string => (g <= 12 ? `Lớp ${g}` : `Năm ${g - 12}`);
```

- [ ] **Step 2: `pages/Boards.tsx`**

```tsx
// web/src/pages/Boards.tsx
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, type BoardSummary, errText, gradeLabel } from "../api";
import { Icon } from "../Icon";
import { SUBJECT_DEFAULT } from "./Bank";

export function Boards() {
  const nav = useNavigate();
  const [rows, setRows] = useState<BoardSummary[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", subject: SUBJECT_DEFAULT, grade: 10, topic: "" });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<BoardSummary[]>("/api/boards").then(setRows).catch((e: unknown) => setError(errText(e)));
  }, []);
  useEffect(load, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const b = await api<BoardSummary>("/api/boards", { method: "POST", body: form });
      nav(`/bang-giang/${b.id}`);
    } catch (err) {
      setError(errText(err));
    }
  };
  const remove = async (b: BoardSummary) => {
    if (!confirm(`Xoá bài giảng "${b.title}"?`)) return;
    await api(`/api/boards/${b.id}`, { method: "DELETE" });
    load();
  };

  return (
    <>
      <h1>Bảng giảng</h1>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setAdding((a) => !a)} data-testid="bg-new"><Icon name="plus" size={18} />Tạo</button>
      </div>
      {error && <div className="err">{error}</div>}
      {adding && (
        <form className="card" style={{ marginBottom: 16 }} onSubmit={(e) => void create(e)}>
          <div className="formrow">
            <label className="lbl">Tên bài<input className="inp" style={{ width: 280 }} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="bg-title" /></label>
            <label className="lbl">Môn<input className="inp w-m" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
            <label className="lbl">Lớp<input className="inp w-s" type="number" min={1} max={16} value={form.grade} onChange={(e) => setForm({ ...form, grade: Number(e.target.value) })} /></label>
            <label className="lbl">Chủ đề<input className="inp w-m" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} data-testid="bg-topic" /></label>
            <button className="btn" data-testid="bg-create"><Icon name="check" size={18} />Tạo</button>
          </div>
        </form>
      )}
      {rows?.length === 0 && <div className="card empty">—</div>}
      <div className="cards">
        {rows?.map((b) => (
          <div className="cls" key={b.id} data-testid="bg-card">
            <Link to={`/bang-giang/${b.id}`} style={{ textDecoration: "none" }}>
              <div className="ic violet" style={{ marginBottom: 10 }}><Icon name="board" /></div>
              <div style={{ fontWeight: 600 }}>{b.title}</div>
              <div className="meta">{b.subject} · {gradeLabel(b.grade)}{b.topic ? ` · ${b.topic}` : ""}</div>
            </Link>
            <div className="cnt">{b.pageCount} trang<span style={{ flex: 1 }} /><button className="xbtn" onClick={() => void remove(b)} aria-label="Xoá"><Icon name="trash" size={16} /></button></div>
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Route, menu, ô trang chủ**

`web/src/App.tsx` (nhánh đã đăng nhập; bảng chạy toàn màn hình, ngoài Shell):

```tsx
import { Boards } from "./pages/Boards";
import { BoardPage } from "./board/BoardPage";
// …
      ) : (
        <>
          <Route path="bang-giang/:id" element={<BoardPage />} />
          <Route element={<Shell />}>
            {/* các route cũ giữ nguyên */}
            <Route path="bang-giang" element={<Boards />} />
            {/* … */}
          </Route>
        </>
      )}
```

Ở task này tạo `web/src/board/BoardPage.tsx` tối thiểu để build được (Task 11 thay toàn bộ):

```tsx
export function BoardPage() {
  return <div className="center">…</div>;
}
```

`web/src/Shell.tsx` — nhóm "Soạn bài", ngay sau "Giáo án": `{ to: "/bang-giang", label: "Bảng giảng", icon: "board" },`.

`web/src/tools.ts` — thêm sau "Soạn giáo án": `{ to: "/bang-giang", name: "Bảng giảng", icon: "board", color: "violet" },` (sửa chú thích thành "13 công cụ").

- [ ] **Step 4: Kiểm**

Run: `pnpm --filter @eduvn/web typecheck && pnpm --filter @eduvn/web build` → sạch. Chạy app: menu có "Bảng giảng"; tạo bài → chuyển sang `/bang-giang/:id`.

- [ ] **Step 5: Commit**

```bash
git add web/src/api.ts web/src/pages/Boards.tsx web/src/App.tsx web/src/Shell.tsx web/src/tools.ts web/src/board/BoardPage.tsx
git commit -m "feat(web): danh sách + tạo bài giảng, menu và ô trang chủ Bảng giảng"
```

---

### Task 11: Màn bảng giảng — khung, trang, bút, tẩy, hoàn tác, lưu

**Files:**
- Create: `web/src/board/useBoard.ts`, `web/src/board/board.css`
- Modify (thay toàn bộ): `web/src/board/BoardPage.tsx`

**Interfaces:**
- Consumes: `BoardDetail`, `api`, `errText`, `gradeLabel` (Task 10); `strokePath`, `hitStroke`, `PALETTE`, `newId`, `emptyPage`, kiểu doc (Task 9).
- Produces: `useBoard(id)` trả `{ board, doc, page, setPage, current, dirty, saving, error, setError, snapshot, updateObj, addObj, removeObjs, undo, addPage, deletePage, save }`:
  - `snapshot(): void` — chụp trạng thái vào lịch sử (gọi ở đầu một thao tác kéo).
  - `updateObj(id: string, patch: Partial<BoardObj>, live?: boolean)` — `live=true` không chụp lịch sử (dùng khi đang kéo).
  - `addObj(o: BoardObj)`, `removeObjs(ids: string[], live?: boolean)`, `undo()`, `addPage()`, `deletePage()`, `save(): Promise<void>`.
- `BoardPage` truyền cho Task 12–14 các hàm này và `toBoard(e): [x, y]` (toạ độ bảng 1280×720).

- [ ] **Step 1: `useBoard.ts`**

```ts
// web/src/board/useBoard.ts
import { useEffect, useRef, useState } from "react";
import { api, type BoardDetail, errText } from "../api";
import { type BoardDoc, type BoardObj, type BoardPageDoc, emptyPage } from "./doc";

export function useBoard(id: string) {
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [doc, setDoc] = useState<BoardDoc | null>(null);
  const [page, setPage] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hist = useRef<BoardDoc[]>([]);
  const docRef = useRef<BoardDoc | null>(null);
  docRef.current = doc;

  useEffect(() => {
    api<BoardDetail>(`/api/boards/${id}`)
      .then((b) => {
        setBoard(b);
        setDoc(b.doc);
      })
      .catch((e: unknown) => setError(errText(e)));
  }, [id]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  const snapshot = () => {
    const d = docRef.current;
    if (!d) return;
    hist.current.push(d);
    if (hist.current.length > 60) hist.current.shift();
  };
  const patchPage = (fn: (p: BoardPageDoc) => BoardPageDoc) => {
    setDoc((d) => (d ? { ...d, pages: d.pages.map((p, i) => (i === page ? fn(p) : p)) } : d));
    setDirty(true);
  };
  const change = (fn: (p: BoardPageDoc) => BoardPageDoc, live = false) => {
    if (!live) snapshot();
    patchPage(fn);
  };

  return {
    board,
    doc,
    page,
    setPage,
    current: doc?.pages[page] ?? null,
    dirty,
    saving,
    error,
    setError,
    snapshot,
    updateObj: (oid: string, patch: Partial<BoardObj>, live = false) =>
      change((p) => ({ ...p, objects: p.objects.map((o) => (o.id === oid ? ({ ...o, ...patch } as BoardObj) : o)) }), live),
    addObj: (o: BoardObj) => change((p) => ({ ...p, objects: [...p.objects, o] })),
    removeObjs: (ids: string[], live = false) => change((p) => ({ ...p, objects: p.objects.filter((o) => !ids.includes(o.id)) }), live),
    undo: () => {
      const prev = hist.current.pop();
      if (!prev) return;
      setDoc(prev);
      setDirty(true);
      setPage((pg) => Math.min(pg, prev.pages.length - 1));
    },
    addPage: () => {
      if (!doc || doc.pages.length >= 30) return;
      snapshot();
      setDoc({ ...doc, pages: [...doc.pages.slice(0, page + 1), emptyPage(), ...doc.pages.slice(page + 1)] });
      setPage(page + 1);
      setDirty(true);
    },
    deletePage: () => {
      if (!doc || doc.pages.length <= 1) return;
      snapshot();
      setDoc({ ...doc, pages: doc.pages.filter((_, i) => i !== page) });
      setPage(Math.max(0, page - 1));
      setDirty(true);
    },
    save: async () => {
      if (!board || !doc) return;
      setSaving(true);
      try {
        await api(`/api/boards/${id}`, { method: "PUT", body: { title: board.title, subject: board.subject, grade: board.grade, topic: board.topic, doc } });
        setDirty(false);
      } catch (e) {
        setError(errText(e));
      } finally {
        setSaving(false);
      }
    },
  };
}
export type BoardApi = ReturnType<typeof useBoard>;
```

- [ ] **Step 2: `BoardPage.tsx`** (khung + bút + tẩy; chỗ gắn đồ thị/khối/gợi ý ghi rõ cho Task 12–14)

```tsx
// web/src/board/BoardPage.tsx
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { gradeLabel } from "../api";
import { Icon } from "../Icon";
import "./board.css";
import { type BoardObj, newId, PALETTE, type Stroke } from "./doc";
import { hitStroke, strokePath } from "./ink";
import { useBoard } from "./useBoard";

export type Tool = "pointer" | "pen" | "eraser";
export const W = 1280;
export const H = 720;
export type ToBoard = (e: { clientX: number; clientY: number }) => [number, number];

const typing = () => {
  const a = document.activeElement;
  return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "MATH-FIELD" || (a as HTMLElement).isContentEditable);
};

export function BoardPage() {
  const { id = "" } = useParams();
  const b = useBoard(id);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(PALETTE[0]!);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<number[] | null>(null);
  const erasing = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const toBoard: ToBoard = (e) => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void b.save();
      } else if (typing()) return;
      else if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        b.undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        b.removeObjs([selected]);
        setSelected(null);
      } else if (e.key === "v") setTool("pointer");
      else if (e.key === "p") setTool("pen");
      else if (e.key === "e") setTool("eraser");
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  useEffect(() => setSelected(null), [b.page]);

  if (!b.board || !b.doc || !b.current) return <div className="center">{b.error ?? "…"}</div>;
  const objs = b.current.objects;

  const erase = (x: number, y: number) => {
    const hits = objs.filter((o): o is Stroke => o.type === "stroke" && hitStroke(o.pts, x, y, 14)).map((o) => o.id);
    if (hits.length) b.removeObjs(hits, true);
  };
  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const [x, y] = toBoard(e);
    if (tool === "pen") {
      svgRef.current?.setPointerCapture(e.pointerId);
      setDraft([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    } else if (tool === "eraser") {
      svgRef.current?.setPointerCapture(e.pointerId);
      b.snapshot();
      erasing.current = true;
      erase(x, y);
    } else setSelected(null);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const [x, y] = toBoard(e);
    if (draft) {
      const lx = draft[draft.length - 2]!, ly = draft[draft.length - 1]!;
      if (draft.length < 4000 && Math.hypot(x - lx, y - ly) > 1.5) setDraft([...draft, Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    } else if (erasing.current) erase(x, y);
  };
  const onUp = () => {
    if (draft) {
      const pts = draft.length >= 4 ? draft : [draft[0]!, draft[1]!, draft[0]! + 0.5, draft[1]!];
      b.addObj({ type: "stroke", id: newId(), color, width: 4.5, pts });
      setDraft(null);
    }
    erasing.current = false;
  };

  const rail = (icon: string, title: string, on: boolean, onClick: () => void, testId?: string) => (
    <button className={on ? "bd-rb on" : "bd-rb"} title={title} onClick={onClick} data-testid={testId}><Icon name={icon} /></button>
  );
  const n = b.doc.pages.length;

  return (
    <div className="bd" ref={rootRef}>
      <aside className="bd-rail">
        <Link to="/bang-giang" className="bd-mark" title="Danh sách bài giảng"><Icon name="cap" /></Link>
        {rail("pointer", "Chọn (V)", tool === "pointer", () => setTool("pointer"), "t-pointer")}
        {rail("pen", "Bút (P)", tool === "pen", () => setTool("pen"), "t-pen")}
        {rail("eraser", "Tẩy (E)", tool === "eraser", () => setTool("eraser"), "t-eraser")}
        <div className="bd-sep" />
        {/* Task 12: nút đồ thị · Task 13: nút hình khối · Task 14: nút gợi ý bài */}
        <div className="bd-swatches">
          {PALETTE.map((c) => (
            <button key={c} className={c === color && tool === "pen" ? "bd-sw on" : "bd-sw"} style={{ background: c }} aria-label="Màu bút" onClick={() => { setColor(c); setTool("pen"); }} />
          ))}
        </div>
      </aside>
      <section className="bd-main">
        <header className="bd-top">
          <span className="bd-title">{b.board.title}</span>
          <span className="bd-chip">{b.board.subject} · {gradeLabel(b.board.grade)}{b.board.topic ? ` · ${b.board.topic}` : ""}</span>
          <span className="bd-grow" />
          {b.error && <span className="bd-err" onClick={() => b.setError(null)}>{b.error}</span>}
          <span className={b.dirty ? "bd-state" : "bd-state ok"} data-testid="bd-state">{b.saving ? "Đang lưu…" : b.dirty ? "Chưa lưu" : "Đã lưu"}</span>
          <button className="bd-btn" onClick={b.undo} title="Hoàn tác (Ctrl+Z)"><Icon name="undo" /></button>
          <button className="bd-btn pri" onClick={() => void b.save()} data-testid="bd-save"><Icon name="save" />Lưu</button>
          <button className="bd-btn" onClick={() => void rootRef.current?.requestFullscreen()} title="Toàn màn hình"><Icon name="max" /></button>
        </header>
        <div className="bd-wrap">
          <div className="bd-stage" data-testid="bd-stage">
            <svg ref={svgRef} className={`bd-svg bd-tool-${tool}`} viewBox={`0 0 ${W} ${H}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <defs>
                <pattern id="bd-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,.07)" /></pattern>
              </defs>
              <rect width={W} height={H} fill="url(#bd-dots)" />
              {objs.map((o) => renderObject(o))}
              {objs.map((o) => (o.type === "stroke" ? <path key={o.id} className="bd-ink" d={strokePath(o.pts, o.width)} fill={o.color} /> : null))}
              {draft && <path d={strokePath(draft, 4.5)} fill={color} />}
            </svg>
            {/* Task 14: <Projector /> */}
          </div>
        </div>
        <footer className="bd-pages">
          <button className="bd-btn" disabled={b.page === 0} onClick={() => b.setPage(b.page - 1)} title="Trang trước"><Icon name="left" /></button>
          <span data-testid="bd-page">Trang {b.page + 1}/{n}</span>
          <button className="bd-btn" disabled={b.page >= n - 1} onClick={() => b.setPage(b.page + 1)} title="Trang sau"><Icon name="right" /></button>
          <button className="bd-btn" onClick={b.addPage} disabled={n >= 30} title="Thêm trang" data-testid="bd-add-page"><Icon name="plus" /></button>
          <button className="bd-btn" onClick={() => confirm("Xoá trang này?") && b.deletePage()} disabled={n <= 1} title="Xoá trang"><Icon name="trash" /></button>
        </footer>
      </section>
      {/* Task 14: <SuggestPanel /> · Task 12: <GraphDialog /> · Task 13: <SolidPicker /> */}
    </div>
  );

  function renderObject(o: BoardObj) {
    // Task 12: o.type === "graph" → <GraphView …/> ; Task 13: o.type === "solid" → <SolidView …/>
    void o;
    void selected;
    return null;
  }
}
```

- [ ] **Step 3: `board.css`**

```css
/* web/src/board/board.css — bảng giảng (bd-) */
.bd { position: fixed; inset: 0; display: grid; grid-template-columns: 64px 1fr auto; background: var(--bg); z-index: 10; }
.bd-rail { background: var(--side); display: flex; flex-direction: column; align-items: center; padding: 14px 0; gap: 6px; }
.bd-mark { width: 36px; height: 36px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; margin-bottom: 14px; }
.bd-rb { width: 42px; height: 42px; border-radius: 12px; border: 0; background: transparent; color: var(--side-ink); display: grid; place-items: center; position: relative; transition: background .2s, color .2s; }
.bd-rb:hover { background: rgba(255,255,255,.05); }
.bd-rb.on { background: var(--side-active); color: #fff; }
.bd-rb.on::before { content: ""; position: absolute; left: -11px; top: 10px; bottom: 10px; width: 3px; border-radius: 3px; background: var(--brand); }
.bd-sep { width: 28px; height: 1px; background: rgba(255,255,255,.08); margin: 6px 0; }
.bd-swatches { margin-top: auto; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.bd-sw { width: 18px; height: 18px; border-radius: 50%; border: 0; box-shadow: 0 0 0 2px var(--side); }
.bd-sw.on { box-shadow: 0 0 0 2px var(--side), 0 0 0 4px rgba(255,255,255,.55); }
.bd-main { display: grid; grid-template-rows: 62px 1fr 56px; min-width: 0; min-height: 0; }
.bd-top { display: flex; align-items: center; gap: 10px; padding: 0 22px; }
.bd-title { font-weight: 700; font-size: 16px; }
.bd-chip { background: var(--card); box-shadow: var(--shadow); padding: 5px 12px; border-radius: 999px; font-size: 12.5px; color: var(--muted); font-weight: 500; }
.bd-grow { flex: 1; }
.bd-state { font-size: 12.5px; color: var(--amber); font-weight: 500; }
.bd-state.ok { color: var(--green); }
.bd-err { font-size: 12.5px; color: #b42318; background: #fdecec; padding: 4px 10px; border-radius: 8px; cursor: pointer; max-width: 420px; }
.bd-btn { display: inline-flex; align-items: center; gap: 7px; border: 0; font-weight: 500; font-size: 13px; padding: 8px 12px; border-radius: 12px; background: var(--card); box-shadow: var(--shadow); color: var(--ink); }
.bd-btn:disabled { opacity: .4; }
.bd-btn.pri { background: var(--brand); color: #fff; }
.bd-btn svg.i { width: 17px; height: 17px; }
.bd-wrap { display: grid; place-items: center; padding: 2px 22px; min-height: 0; }
.bd-stage { position: relative; aspect-ratio: 16 / 9; width: min(100%, calc((100vh - 140px) * 16 / 9)); border-radius: 18px; background: #242b35; overflow: hidden; user-select: none; touch-action: none; box-shadow: 0 2px 6px rgba(20,28,60,.15), 0 18px 40px rgba(20,28,60,.22); }
.bd-svg { position: absolute; inset: 0; width: 100%; height: 100%; font-family: "Be Vietnam Pro", system-ui, sans-serif; }
.bd-tool-pen { cursor: crosshair; } .bd-tool-eraser { cursor: cell; }
.bd-tool-pen .bd-obj, .bd-tool-eraser .bd-obj { pointer-events: none; }
.bd-ink { pointer-events: none; }
.bd-pages { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: var(--muted); font-weight: 500; }
```

(Task 12–14 nối thêm CSS vào file này.)

- [ ] **Step 4: Kiểm**

Run: `pnpm --filter @eduvn/web typecheck && pnpm --filter @eduvn/web build` → sạch.
Chạy app: mở một bài giảng → vẽ bằng bút (4 màu), tẩy xoá nét, Ctrl+Z hoàn tác, thêm/xoá/chuyển trang, **Lưu** → tải lại trang vẫn còn nét. Chụp `/tmp/eduvn-web-bang-giang-but.png`.

- [ ] **Step 5: Commit**

```bash
git add web/src/board/useBoard.ts web/src/board/BoardPage.tsx web/src/board/board.css
git commit -m "feat(web): màn bảng giảng — bút, tẩy, trang, hoàn tác, lưu"
```

---

### Task 12: Đồ thị hàm số trên bảng

**Files:**
- Create: `web/src/board/GraphView.tsx` (gồm `GraphView`, `GraphDialog`)
- Modify: `web/src/board/BoardPage.tsx`, `web/src/board/board.css`

**Interfaces:**
- Consumes: `compileExpr`, `samplePath`, `ticks`, `autoView`, `mapX`, `mapY` (Task 9); `graphFromExprs`, `CURVE_COLORS`, `GraphObj` (Task 9); `MathField`, `MathText`, `VoiceButton` (Task 7); `BoardApi`, `Tool`, `ToBoard` (Task 11); `vn` (api.ts).
- Produces: `GraphView({ obj, tool, selected, onSelect, onEdit, b, toBoard })`; `GraphDialog({ initial?: GraphObj, onCancel, onDone(exprs: string[], xRange: [number, number]) })`.

- [ ] **Step 1: `GraphView.tsx`**

```tsx
// web/src/board/GraphView.tsx
import { type PointerEvent, useRef, useState } from "react";
import { vn } from "../api";
import { Icon } from "../Icon";
import { MathField } from "../math/MathEditor";
import { MathText } from "../math/MathText";
import { VoiceButton } from "../math/VoiceButton";
import type { Tool, ToBoard } from "./BoardPage";
import { CURVE_COLORS, type GraphObj } from "./doc";
import { autoView, compileExpr, mapX, mapY, samplePath, ticks } from "./graph";
import type { BoardApi } from "./useBoard";

type Props = { obj: GraphObj; tool: Tool; selected: boolean; onSelect: () => void; onEdit: () => void; b: BoardApi; toBoard: ToBoard };

export function GraphView({ obj, tool, selected, onSelect, onEdit, b, toBoard }: Props) {
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const box = { x: obj.x + 20, y: obj.y + 20, w: obj.w - 40, h: obj.h - 40 };
  const v = obj.view;
  const compiled = obj.exprs.map((e) => compileExpr(e.latex));
  const params = [...new Set(compiled.flatMap((c) => (c.ok ? c.params : [])))];
  const clip = `bd-clip-${obj.id}`;

  const down = (e: PointerEvent<SVGRectElement>) => {
    e.stopPropagation();
    onSelect();
    if (tool !== "pointer") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const [sx, sy] = toBoard(e);
    drag.current = { sx, sy, ox: obj.x, oy: obj.y };
    b.snapshot();
  };
  const move = (e: PointerEvent<SVGRectElement>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toBoard(e);
    b.updateObj(obj.id, { x: Math.max(80 - obj.w, Math.min(1200, d.ox + x - d.sx)), y: Math.max(0, Math.min(660, d.oy + y - d.sy)) }, true);
  };
  const up = () => {
    drag.current = null;
  };
  const refit = () => {
    const fs = compiled.flatMap((c) => (c.ok ? [(x: number) => c.f(x, obj.params)] : []));
    b.updateObj(obj.id, { view: autoView(fs, v.xMin, v.xMax) });
  };

  return (
    <g className="bd-obj" data-testid="bd-graph">
      <rect x={obj.x} y={obj.y} width={obj.w} height={obj.h} rx={16} className={selected ? "bd-card sel" : "bd-card"} onPointerDown={down} onPointerMove={move} onPointerUp={up} />
      <clipPath id={clip}><rect x={box.x} y={box.y} width={box.w} height={box.h} /></clipPath>
      <g pointerEvents="none">
        {ticks(v.xMin, v.xMax).map((t) => <line key={`gx${t}`} x1={mapX(t, v, box)} x2={mapX(t, v, box)} y1={box.y} y2={box.y + box.h} className="bd-grid" />)}
        {ticks(v.yMin, v.yMax, 8).map((t) => <line key={`gy${t}`} x1={box.x} x2={box.x + box.w} y1={mapY(t, v, box)} y2={mapY(t, v, box)} className="bd-grid" />)}
        {v.yMin < 0 && v.yMax > 0 && <line x1={box.x} x2={box.x + box.w} y1={mapY(0, v, box)} y2={mapY(0, v, box)} className="bd-axis" />}
        {v.xMin < 0 && v.xMax > 0 && <line x1={mapX(0, v, box)} x2={mapX(0, v, box)} y1={box.y} y2={box.y + box.h} className="bd-axis" />}
        {ticks(v.xMin, v.xMax).filter((t) => t !== 0).map((t) => (
          <text key={`tx${t}`} x={mapX(t, v, box)} y={Math.min(box.y + box.h - 4, Math.max(box.y + 14, mapY(0, v, box) + 18))} className="bd-tick" textAnchor="middle">{vn(t)}</text>
        ))}
        {ticks(v.yMin, v.yMax, 8).filter((t) => t !== 0).map((t) => (
          <text key={`ty${t}`} x={Math.max(box.x + 22, Math.min(box.x + box.w - 4, mapX(0, v, box) - 8))} y={mapY(t, v, box) + 4} className="bd-tick" textAnchor="end">{vn(t)}</text>
        ))}
        <g clipPath={`url(#${clip})`}>
          {compiled.map((c, i) => (c.ok ? <path key={i} className="bd-curve" d={samplePath((x) => c.f(x, obj.params), v, box)} stroke={obj.exprs[i]!.color} /> : null))}
        </g>
      </g>
      <foreignObject x={obj.x + 24} y={obj.y + 22} width={obj.w - 48} height={40 * obj.exprs.length} pointerEvents="none">
        <div className="bd-legend">
          {obj.exprs.map((e, i) => (
            <div key={i}><span className="bd-cdot" style={{ background: e.color }} /><MathText value={`$${e.latex}$`} /></div>
          ))}
        </div>
      </foreignObject>
      {params.length > 0 && (
        <foreignObject x={obj.x} y={obj.y + obj.h + 8} width={obj.w} height={56}>
          <div className="bd-sliders">
            {params.map((p) => (
              <label key={p} className="bd-sl">
                <i>{p}</i>
                <input type="range" min={-5} max={5} step={0.1} value={obj.params[p] ?? 1} onPointerDown={(e) => { e.stopPropagation(); b.snapshot(); }} onChange={(e) => b.updateObj(obj.id, { params: { ...obj.params, [p]: Number(e.target.value) } }, true)} data-testid={`bd-sl-${p}`} />
                <output>{vn(obj.params[p] ?? 1)}</output>
              </label>
            ))}
          </div>
        </foreignObject>
      )}
      {selected && (
        <foreignObject x={obj.x + obj.w - 156} y={Math.max(0, obj.y - 50)} width={156} height={46}>
          <div className="bd-mini">
            <button onClick={onEdit} title="Sửa hàm" data-testid="bd-graph-edit"><Icon name="pen" /></button>
            <button onClick={refit} title="Căn khung"><Icon name="max" /></button>
            <button onClick={() => b.removeObjs([obj.id])} title="Xoá"><Icon name="trash" /></button>
          </div>
        </foreignObject>
      )}
    </g>
  );
}

type DialogProps = { initial?: GraphObj; onCancel: () => void; onDone: (exprs: string[], xRange: [number, number]) => void };

export function GraphDialog({ initial, onCancel, onDone }: DialogProps) {
  const [rows, setRows] = useState(() => (initial?.exprs.map((e, i) => ({ key: i, latex: e.latex })) ?? [{ key: 0, latex: "" }]));
  const [xMin, setXMin] = useState(initial?.view.xMin ?? -5);
  const [xMax, setXMax] = useState(initial?.view.xMax ?? 5);
  const [errs, setErrs] = useState<Record<number, string>>({});

  const submit = () => {
    const filled = rows.filter((r) => r.latex.trim());
    if (!filled.length) {
      setErrs({ [rows[0]!.key]: "Nhập hàm số, vd y = x^2 − 3" });
      return;
    }
    const e: Record<number, string> = {};
    for (const r of filled) {
      const c = compileExpr(r.latex);
      if (!c.ok) e[r.key] = c.error;
    }
    if (!(xMax > xMin)) e[rows[0]!.key] = "Khoảng x không hợp lệ";
    setErrs(e);
    if (Object.keys(e).length) return;
    onDone(filled.map((r) => r.latex.trim()), [xMin, xMax]);
  };

  return (
    <div className="bd-modal" role="dialog">
      <div className="bd-dlg" data-testid="bd-graph-dlg">
        <div className="bd-dlg-hd"><Icon name="graph" />Đồ thị hàm số</div>
        {rows.map((r, i) => (
          <div className="bd-expr" key={r.key}>
            <span className="bd-cdot" style={{ background: CURVE_COLORS[i % CURVE_COLORS.length] }} />
            <div className="bd-expr-f">
              <MathField value={r.latex} autoFocus={i === rows.length - 1} onChange={(v) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, latex: v } : x)))} onEnter={submit} testId={`bd-expr-${i}`} />
            </div>
            <VoiceButton onLatex={(l) => setRows((rs) => rs.map((x) => (x.key === r.key ? { key: Date.now(), latex: l } : x)))} />
            {rows.length > 1 && <button className="xbtn" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label="Bỏ hàm"><Icon name="x" size={16} /></button>}
            {errs[r.key] && <div className="bd-dlg-err">{errs[r.key]}</div>}
          </div>
        ))}
        {rows.length < 6 && (
          <button className="bd-link" onClick={() => setRows((rs) => [...rs, { key: Date.now(), latex: "" }])}><Icon name="plus" size={16} />Thêm hàm</button>
        )}
        <div className="bd-range">x từ <input type="number" value={xMin} onChange={(e) => setXMin(Number(e.target.value))} /> đến <input type="number" value={xMax} onChange={(e) => setXMax(Number(e.target.value))} /></div>
        <div className="bd-dlg-ft">
          <button className="bd-btn" onClick={onCancel}>Huỷ</button>
          <button className="bd-btn pri" onClick={submit} data-testid="bd-graph-ok">Vẽ</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Gắn vào `BoardPage.tsx`**

- Import: `import { GraphDialog, GraphView } from "./GraphView";` và `import { graphFromExprs, type GraphObj } from "./doc";` (gộp vào import doc sẵn có).
- State: `const [graphDlg, setGraphDlg] = useState<{ edit?: GraphObj } | null>(null);`
- Rail (thay dòng chú thích Task 12): `{rail("graph", "Đồ thị hàm số", false, () => setGraphDlg({}), "t-graph")}`
- Trong `renderObject`: 

```tsx
    if (o.type === "graph")
      return <GraphView key={o.id} obj={o} tool={tool} selected={selected === o.id} onSelect={() => setSelected(o.id)} onEdit={() => setGraphDlg({ edit: o })} b={b} toBoard={toBoard} />;
```

- Cuối `.bd` (thay chú thích Task 12):

```tsx
      {graphDlg && (
        <GraphDialog
          initial={graphDlg.edit}
          onCancel={() => setGraphDlg(null)}
          onDone={(exprs, xr) => {
            if (graphDlg.edit) b.updateObj(graphDlg.edit.id, graphFromExprs(exprs, xr, graphDlg.edit));
            else {
              const g = graphFromExprs(exprs, xr);
              b.addObj(g);
              setSelected(g.id);
            }
            setTool("pointer");
            setGraphDlg(null);
          }}
        />
      )}
```

- [ ] **Step 3: CSS (nối vào `board.css`)**

```css
.bd-card { fill: rgba(255,255,255,.035); stroke: rgba(255,255,255,.12); cursor: move; }
.bd-card.sel { stroke: #8fa2ff; stroke-width: 2; }
.bd-grid { stroke: rgba(255,255,255,.07); }
.bd-axis { stroke: rgba(255,255,255,.5); stroke-width: 1.5; }
.bd-tick { fill: rgba(255,255,255,.45); font-size: 13px; }
.bd-curve { fill: none; stroke-width: 3.4; stroke-linecap: round; stroke-linejoin: round; }
.bd-legend { display: grid; gap: 4px; color: #fff; font-size: 18px; }
.bd-legend > div { display: inline-flex; align-items: center; gap: 8px; width: max-content; padding: 2px 10px; border-radius: 999px; background: rgba(36,43,53,.75); }
.bd-cdot { width: 11px; height: 11px; border-radius: 50%; flex: none; }
.bd-sliders { display: flex; gap: 24px; padding: 10px 16px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 14px; color: #fff; font-size: 16px; }
.bd-sl { display: flex; align-items: center; gap: 12px; flex: 1; }
.bd-sl i { font-weight: 600; }
.bd-sl input { flex: 1; accent-color: #5cc8ff; }
.bd-sl output { min-width: 34px; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.bd-mini { display: flex; gap: 4px; background: #fff; border-radius: 12px; padding: 4px; box-shadow: var(--shadow-hi); width: max-content; margin-left: auto; }
.bd-mini button { width: 36px; height: 36px; border: 0; border-radius: 9px; background: transparent; color: var(--ink); display: grid; place-items: center; }
.bd-mini button:hover { background: var(--bg); }
.bd-modal { position: fixed; inset: 0; background: rgba(20,28,60,.35); display: grid; place-items: center; z-index: 50; padding-bottom: var(--kb-h, 0px); }
.bd-dlg { width: 520px; max-width: 94vw; background: #fff; border-radius: 18px; box-shadow: var(--shadow-hi); padding: 18px 20px; display: grid; gap: 12px; }
.bd-dlg-hd { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; }
.bd-expr { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 8px; }
.bd-expr-f { min-width: 0; }
.bd-dlg-err { grid-column: 2 / -1; color: #b42318; font-size: 12.5px; }
.bd-link { justify-self: start; display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: var(--brand); font-weight: 500; }
.bd-range { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; }
.bd-range input { width: 72px; border: 1px solid var(--line); border-radius: 9px; padding: 5px 8px; font: inherit; }
.bd-dlg-ft { display: flex; justify-content: flex-end; gap: 8px; }
```

- [ ] **Step 4: Kiểm**

Run: `pnpm --filter @eduvn/web typecheck && pnpm --filter @eduvn/web build && pnpm --filter @eduvn/web test` → sạch/xanh.
Chạy app: nút đồ thị → gõ `y=x^2-3` (bàn phím hiện) → **Vẽ** → parabol + lưới + nhãn; mở lại **Sửa** thêm `y=A\sin x+B` → hiện thanh trượt A, B; kéo A lên 2 → đường sin đổi ngay; kéo thẻ đồ thị di chuyển; **Căn khung**; Ctrl+Z quay lại. Gõ sai `\frac{` → báo lỗi tiếng Việt. Chụp `/tmp/eduvn-web-bang-giang-do-thi.png`.

- [ ] **Step 5: Commit**

```bash
git add web/src/board/GraphView.tsx web/src/board/BoardPage.tsx web/src/board/board.css
git commit -m "feat(web): đồ thị hàm số trên bảng — nhập bằng ô công thức, thanh trượt tham số, kéo, căn khung"
```

---

### Task 13: Hình không gian trên bảng

**Files:**
- Create: `web/src/board/SolidView.tsx` (gồm `SolidView`, `SolidPicker`)
- Modify: `web/src/board/BoardPage.tsx`, `web/src/board/board.css`

**Interfaces:**
- Consumes: `solidScene`, `pickPoint`, `pickEdgePoint`, `nextPointName`, `fmtDeg`, `SOLIDS`, `SOLID_ORDER`, `SolidKind` (Task 8); `newSolid`, `SolidObj` (Task 9); `BoardApi`, `Tool`, `ToBoard` (Task 11).
- Produces: `SolidView({ obj, tool, selected, onSelect, b, toBoard })`; `SolidPicker({ onPick(kind), onClose })`. Mỗi điểm vẽ có `data-pt="<tên>"` (smoke dùng).

- [ ] **Step 1: `SolidView.tsx`**

```tsx
// web/src/board/SolidView.tsx
import { type PointerEvent, useRef, useState } from "react";
import { Icon } from "../Icon";
import type { Tool, ToBoard } from "./BoardPage";
import type { SolidObj } from "./doc";
import { fmtDeg, nextPointName, pickEdgePoint, pickPoint, SOLID_ORDER, SOLIDS, type SolidKind, solidScene } from "./solids";
import type { BoardApi } from "./useBoard";

type Mode = "rotate" | "point" | "cut" | "angle";
const MODES: { m: Mode; icon: string; label: string }[] = [
  { m: "rotate", icon: "rotate", label: "Xoay" },
  { m: "point", icon: "target", label: "Điểm" },
  { m: "cut", icon: "cut", label: "Cắt" },
  { m: "angle", icon: "angle", label: "Đo góc" },
];
type Tri = [string, string, string];
const pts = (a: [number, number][]) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

type Props = { obj: SolidObj; tool: Tool; selected: boolean; onSelect: () => void; b: BoardApi; toBoard: ToBoard };

export function SolidView({ obj, tool, selected, onSelect, b, toBoard }: Props) {
  const [mode, setMode] = useState<Mode>("rotate");
  const [picks, setPicks] = useState<string[]>([]);
  const drag = useRef<{ kind: "rot" | "move"; sx: number; sy: number; a: number; c: number } | null>(null);
  const sc = solidScene(obj);

  const down = (e: PointerEvent<SVGGElement>) => {
    if ((e.target as Element).closest(".bd-tbw")) return;
    e.stopPropagation();
    onSelect();
    if (tool !== "pointer") return;
    const [x, y] = toBoard(e);
    if (mode === "rotate") {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: "rot", sx: x, sy: y, a: obj.th, c: obj.ph };
      b.snapshot();
      return;
    }
    if (mode === "point") {
      const ep = pickEdgePoint(obj, x, y);
      if (ep) b.updateObj(obj.id, { points: [...obj.points, { name: nextPointName(obj), ...ep }] });
      return;
    }
    const name = pickPoint(obj, x, y);
    if (!name) return;
    const next = picks.includes(name) ? picks : [...picks, name];
    if (next.length === 3) {
      b.updateObj(obj.id, mode === "cut" ? { section: next as Tri } : { angle: next as Tri });
      setPicks([]);
    } else setPicks(next);
  };
  const move = (e: PointerEvent<Element>) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = toBoard(e);
    if (d.kind === "rot") b.updateObj(obj.id, { th: d.a + (x - d.sx) * 0.01, ph: Math.max(-0.2, Math.min(1.3, d.c + (y - d.sy) * 0.006)) }, true);
    else b.updateObj(obj.id, { cx: Math.max(40, Math.min(1240, d.a + x - d.sx)), cy: Math.max(40, Math.min(680, d.c + y - d.sy)) }, true);
  };
  const up = () => {
    drag.current = null;
  };
  const startMove = (e: PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = toBoard(e);
    drag.current = { kind: "move", sx: x, sy: y, a: obj.cx, c: obj.cy };
    b.snapshot();
  };

  let info = "";
  if ((mode === "cut" || mode === "angle") && selected) info = `Chọn điểm ${picks.length + 1}/3${picks.length ? `: ${picks.join(", ")}` : ""}`;
  else if (mode === "point" && selected) info = "Bấm lên cạnh để lấy điểm (chia 1/4, 1/3, 1/2…)";
  else if (sc.section && obj.angle && sc.angle) info = `Thiết diện: ${sc.section.name} · Góc ${obj.angle.join("")}: ${fmtDeg(sc.angle.value)}`;
  else if (sc.section) info = `Thiết diện: ${sc.section.name}`;
  else if (obj.angle && sc.angle) info = `Góc ${obj.angle.join("")} = ${fmtDeg(sc.angle.value)}`;
  else if (obj.section) info = "3 điểm thẳng hàng — chọn lại";

  return (
    <g className="bd-obj" data-testid="bd-solid" onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      {sc.faces.map((f, i) => <polygon key={`f${i}`} points={pts(f)} className="bd-face" />)}
      {sc.section && <polygon points={pts(sc.section.pts)} className="bd-sec" />}
      {sc.edges.map((e, i) => <line key={`e${i}`} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} className={e.hidden ? "bd-edge hid" : "bd-edge"} />)}
      {sc.angle && (
        <>
          <polyline points={pts(sc.angle.arc)} className="bd-arc" />
          <text x={sc.angle.x} y={sc.angle.y} className="bd-alabel" textAnchor="middle" dominantBaseline="middle">{fmtDeg(sc.angle.value)}</text>
        </>
      )}
      {sc.labels.map((l) => (
        <g key={l.name} data-pt={l.name}>
          <circle cx={l.px} cy={l.py} r={16} className={picks.includes(l.name) ? "bd-hit on" : "bd-hit"} />
          <circle cx={l.px} cy={l.py} r={l.vertex ? 3.5 : 6} className={l.vertex ? "bd-v" : "bd-p"} />
          <text x={l.x} y={l.y} className={l.vertex ? "bd-vl" : "bd-pl"} textAnchor="middle" dominantBaseline="middle">{l.name}</text>
        </g>
      ))}
      {(selected || info) && (
        <foreignObject x={obj.cx - 230} y={obj.cy + obj.size * 0.9} width={460} height={110}>
          <div className="bd-tbw">
            {info && <div className="bd-info" data-testid="bd-info">{info}</div>}
            {selected && (
              <div className="bd-tb">
                {MODES.map(({ m, icon, label }) => (
                  <button key={m} className={mode === m ? "on" : ""} onPointerDown={(e) => e.stopPropagation()} onClick={() => { setMode(m); setPicks([]); }} data-testid={`bd-m-${m}`}>
                    <Icon name={icon} />{label}
                  </button>
                ))}
                <button onPointerDown={startMove} onPointerMove={move} onPointerUp={up} title="Kéo để dời hình"><Icon name="move" />Dời</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.updateObj(obj.id, { points: [], section: null, angle: null })} title="Xoá điểm, thiết diện, góc"><Icon name="eraser" />Xoá dựng</button>
                <button onPointerDown={(e) => e.stopPropagation()} onClick={() => b.removeObjs([obj.id])} title="Xoá hình"><Icon name="trash" /></button>
              </div>
            )}
          </div>
        </foreignObject>
      )}
    </g>
  );
}

/** Thư viện hình không gian (kiểu thư viện hình của draw.io). */
export function SolidPicker({ onPick, onClose }: { onPick: (k: SolidKind) => void; onClose: () => void }) {
  return (
    <div className="bd-modal" onClick={onClose}>
      <div className="bd-dlg" onClick={(e) => e.stopPropagation()} data-testid="bd-solid-picker">
        <div className="bd-dlg-hd"><Icon name="box" />Thư viện hình</div>
        <div className="bd-lib">
          {SOLID_ORDER.map((k) => {
            const sc = solidScene({ kind: k, cx: 60, cy: 58, size: 52, th: 0.62, ph: 0.42, points: [], section: null, angle: null });
            return (
              <button key={k} className="bd-lib-item" onClick={() => onPick(k)} data-testid={`bd-lib-${k}`}>
                <svg viewBox="0 0 120 116" width={120} height={116}>
                  {sc.edges.map((e, i) => <line key={i} x1={e.a[0]} y1={e.a[1]} x2={e.b[0]} y2={e.b[1]} stroke={e.hidden ? "#b4b9c9" : "#1b2033"} strokeDasharray={e.hidden ? "4 4" : undefined} strokeWidth={1.6} />)}
                </svg>
                <b>{SOLIDS[k].label}</b>
                <small>{SOLIDS[k].title}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Gắn vào `BoardPage.tsx`**

- Import: `import { SolidPicker, SolidView } from "./SolidView";` và `newSolid` từ `./doc`.
- State: `const [picker, setPicker] = useState(false);`
- Rail (thay chú thích Task 13): `{rail("box", "Hình không gian", picker, () => setPicker((p) => !p), "t-solid")}`
- Trong `renderObject`:

```tsx
    if (o.type === "solid") return <SolidView key={o.id} obj={o} tool={tool} selected={selected === o.id} onSelect={() => setSelected(o.id)} b={b} toBoard={toBoard} />;
```

- Cuối `.bd`:

```tsx
      {picker && (
        <SolidPicker
          onClose={() => setPicker(false)}
          onPick={(k) => {
            const s = newSolid(k);
            b.addObj(s);
            setSelected(s.id);
            setTool("pointer");
            setPicker(false);
          }}
        />
      )}
```

- [ ] **Step 3: CSS (nối vào `board.css`)**

```css
.bd-face { fill: rgba(140,165,255,.06); cursor: grab; }
.bd-edge { stroke: #fff; stroke-width: 2.6; stroke-linecap: round; pointer-events: none; }
.bd-edge.hid { stroke: rgba(255,255,255,.38); stroke-width: 1.6; stroke-dasharray: 7 7; }
.bd-sec { fill: rgba(255,181,71,.30); stroke: #ffc56b; stroke-width: 2.6; stroke-linejoin: round; pointer-events: none; }
.bd-arc { fill: none; stroke: #fff; stroke-width: 2; pointer-events: none; }
.bd-alabel { fill: #fff; font-size: 16px; font-weight: 600; pointer-events: none; }
.bd-hit { fill: transparent; }
.bd-hit.on { fill: rgba(143,162,255,.35); }
.bd-v { fill: #fff; }
.bd-p { fill: #ffb547; stroke: #242b35; stroke-width: 2; }
.bd-vl { fill: rgba(255,255,255,.85); font-size: 17px; font-weight: 500; pointer-events: none; }
.bd-pl { fill: #ffb547; font-size: 18px; font-weight: 700; pointer-events: none; }
.bd-tbw { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.bd-info { background: rgba(36,43,53,.85); color: #fff; padding: 5px 14px; border-radius: 999px; font-size: 15px; font-weight: 500; }
.bd-tb { display: flex; gap: 2px; padding: 5px; background: #fff; border-radius: 14px; box-shadow: var(--shadow-hi); }
.bd-tb button { border: 0; background: transparent; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 9px; border-radius: 10px; font-size: 11.5px; color: var(--muted); touch-action: none; }
.bd-tb button svg.i { width: 22px; height: 22px; color: var(--ink); }
.bd-tb button.on { background: var(--blue-bg); color: var(--brand); }
.bd-tb button.on svg.i { color: var(--brand); }
.bd-lib { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.bd-lib-item { border: 0; background: var(--bg); border-radius: 14px; padding: 10px; display: grid; justify-items: center; gap: 2px; }
.bd-lib-item:hover { box-shadow: var(--shadow-hi); background: #fff; }
.bd-lib-item small { color: var(--muted); }
```

- [ ] **Step 4: Kiểm**

Run: `pnpm --filter @eduvn/web typecheck && pnpm --filter @eduvn/web build && pnpm --filter @eduvn/web test` → sạch/xanh.
Chạy app: thư viện hình → lập phương → kéo xoay; **Điểm** → bấm giữa AB, BC, CC' → hiện M, N, P; **Cắt** → chọn M, N, P → "Thiết diện: lục giác đều"; **Đo góc** chọn A, B, C → 90°; **Dời** kéo hình; thử chóp S.ABCD, lăng trụ. Lưu → tải lại còn nguyên. Chụp `/tmp/eduvn-web-bang-giang-3d.png`.

- [ ] **Step 5: Commit**

```bash
git add web/src/board/SolidView.tsx web/src/board/BoardPage.tsx web/src/board/board.css
git commit -m "feat(web): hình không gian trên bảng — thư viện 5 khối, xoay, lấy điểm, cắt thiết diện, đo góc"
```

---

### Task 14: Gợi ý bài liên quan, chiếu câu, tạo trò chơi

**Files:**
- Create: `web/src/board/SuggestPanel.tsx`, `web/src/board/Projector.tsx`
- Modify: `web/src/board/BoardPage.tsx`, `web/src/board/board.css`

**Interfaces:**
- Consumes: `GET /api/questions/related` (Task 4); `POST /api/games` + `exportGame(id, true)` (đã có); `boardKeywords` (Task 9); `MathText` (Task 7); `BankQuestion`, `BoardDetail`, `errText` (api.ts).
- Produces: `SuggestPanel({ board, page, onProject, onClose })`; `Projector({ q, onClose })`.

- [ ] **Step 1: `SuggestPanel.tsx`**

```tsx
// web/src/board/SuggestPanel.tsx
import { useEffect, useState } from "react";
import { api, type BankQuestion, type BoardDetail, errText, exportGame } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { boardKeywords, type BoardPageDoc } from "./doc";

const LEVEL: Record<string, string> = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng" };
const TYPE: Record<string, string> = { mcq: "Trắc nghiệm", true_false: "Đúng/sai", short_answer: "Trả lời ngắn", essay: "Tự luận" };

type Props = { board: BoardDetail; page: BoardPageDoc; onProject: (q: BankQuestion) => void; onClose: () => void };

export function SuggestPanel({ board, page, onProject, onClose }: Props) {
  const kw = boardKeywords(page);
  const [rows, setRows] = useState<BankQuestion[] | null>(null);
  const [pick, setPick] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams({ subject: board.subject, grade: String(board.grade), topic: board.topic, text: kw, limit: "8" });
      api<BankQuestion[]>(`/api/questions/related?${q}`)
        .then((r) => {
          setRows(r);
          setErr(null);
        })
        .catch((e: unknown) => setErr(errText(e)));
    }, 400);
    return () => clearTimeout(t);
  }, [board.subject, board.grade, board.topic, kw]);

  const makeGame = async () => {
    setErr(null);
    try {
      const g = await api<{ id: string }>("/api/games", { method: "POST", body: { title: `Ôn tập: ${board.topic || board.title}`, kind: "quiz", source: { questionIds: pick } } });
      await exportGame(g.id, true);
    } catch (e) {
      setErr(errText(e));
    }
  };

  return (
    <aside className="bd-side" data-testid="bd-suggest">
      <div className="bd-side-hd">
        <span className="bd-side-ic"><Icon name="spark" /></span>Gợi ý bài liên quan
        <button className="xbtn" onClick={onClose} aria-label="Đóng"><Icon name="x" size={16} /></button>
      </div>
      <div className="bd-side-ctx">{[board.topic, kw].filter(Boolean).join(" · ") || "Chưa có chủ đề"}</div>
      {err && <div className="err">{err}</div>}
      <div className="bd-side-list">
        {rows === null && <div className="bd-sk" />}
        {rows?.length === 0 && <div className="empty">Chưa có câu phù hợp. Thêm câu chủ đề “{board.topic || "…"}” trong Ngân hàng câu hỏi.</div>}
        {rows?.map((q) => (
          <div className="bd-q" key={q.id} data-testid="bd-q">
            <input type="checkbox" checked={pick.includes(q.id)} onChange={(e) => setPick((p) => (e.target.checked ? [...p, q.id] : p.filter((x) => x !== q.id)))} aria-label="Chọn cho trò chơi" />
            <div className="bd-q-body">
              <MathText value={q.stem} />
              <small>{LEVEL[q.level]} · {TYPE[q.type]}</small>
            </div>
            <button className="bd-q-show" onClick={() => onProject(q)} title="Chiếu lên bảng" data-testid="bd-show"><Icon name="present" /></button>
          </div>
        ))}
      </div>
      <button className="bd-btn pri bd-side-ft" disabled={pick.length === 0} onClick={() => void makeGame()}>
        <Icon name="game" />Tạo trò chơi ({pick.length})
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: `Projector.tsx`**

```tsx
// web/src/board/Projector.tsx
import { useState } from "react";
import type { BankQuestion } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";

export function Projector({ q, onClose }: { q: BankQuestion; onClose: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="bd-proj" data-testid="bd-proj">
      <div className="bd-proj-card">
        <div className="bd-proj-hd">
          <span className="bd-live"><i />Đang chiếu</span>
          <span className="bd-grow" />
          <button className="xbtn" onClick={onClose} aria-label="Đóng"><Icon name="x" /></button>
        </div>
        <div className="bd-proj-q"><MathText value={q.stem} /></div>
        {q.type === "mcq" && (
          <div className="bd-proj-opts">
            {q.options?.map((o, i) => (
              <div key={i} className={show && q.answer === i ? "bd-po right" : "bd-po"}><b>{"ABCD"[i]}</b><MathText value={o} /></div>
            ))}
          </div>
        )}
        {q.type === "true_false" && (
          <div className="bd-proj-opts one">
            {q.statements?.map((s, i) => (
              <div key={i} className="bd-po"><b>{"abcd"[i]}</b><MathText value={s} />{show && <em className={(q.answer as boolean[])[i] ? "ok" : "no"}>{(q.answer as boolean[])[i] ? "Đúng" : "Sai"}</em>}</div>
            ))}
          </div>
        )}
        {q.type === "short_answer" && show && <div className="bd-po right">Đáp án: <MathText value={String(q.answer)} /></div>}
        {q.type === "essay" && show && <div className="bd-po">{q.rubric}</div>}
        <button className="bd-btn pri" onClick={() => setShow((s) => !s)} data-testid="bd-reveal">{show ? "Ẩn đáp án" : "Hiện đáp án"}</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Gắn vào `BoardPage.tsx`**

- Import `SuggestPanel`, `Projector`, `type BankQuestion`.
- State: `const [suggest, setSuggest] = useState(false);` `const [projected, setProjected] = useState<BankQuestion | null>(null);`
- Rail (thay chú thích Task 14): `{rail("spark", "Gợi ý bài liên quan", suggest, () => setSuggest((s) => !s), "t-suggest")}`
- Trong `.bd-stage` (thay chú thích): `{projected && <Projector q={projected} onClose={() => setProjected(null)} />}`
- Cuối `.bd` (thay chú thích): `{suggest && <SuggestPanel board={b.board} page={b.current} onProject={setProjected} onClose={() => setSuggest(false)} />}`
- Bỏ các chú thích "Task 12/13/14" còn sót và dòng `void o; void selected;` trong `renderObject` (giờ trả `null` ở cuối cho kiểu `stroke`).

- [ ] **Step 4: CSS (nối vào `board.css`)**

```css
.bd-side { width: 320px; background: var(--card); box-shadow: -1px 0 0 var(--line); display: flex; flex-direction: column; min-height: 0; padding-bottom: 14px; }
.bd-side-hd { display: flex; align-items: center; gap: 10px; padding: 18px 16px 8px; font-weight: 600; }
.bd-side-hd .xbtn { margin-left: auto; }
.bd-side-ic { width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--violet-bg); color: var(--violet); }
.bd-side-ic svg.i { width: 16px; height: 16px; }
.bd-side-ctx { padding: 0 16px 10px; font-size: 12px; color: var(--muted); }
.bd-side-list { flex: 1; overflow-y: auto; padding: 0 12px; display: grid; gap: 8px; align-content: start; }
.bd-q { display: flex; gap: 10px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; background: var(--bg); font-size: 13.5px; }
.bd-q input { margin-top: 4px; }
.bd-q-body { flex: 1; min-width: 0; display: grid; gap: 2px; }
.bd-q-body small { color: var(--muted); font-size: 11.5px; }
.bd-q-show { border: 0; background: #fff; color: var(--brand); width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex: none; box-shadow: var(--shadow); }
.bd-side-ft { margin: 12px 12px 0; justify-content: center; }
.bd-sk { height: 64px; border-radius: 12px; background: linear-gradient(90deg, #eef0f6 25%, #f8f9fc 50%, #eef0f6 75%); background-size: 200% 100%; animation: bd-sh 1.1s infinite linear; }
@keyframes bd-sh { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.bd-proj { position: absolute; inset: 0; background: rgba(20,24,32,.55); display: grid; place-items: center; z-index: 5; }
.bd-proj-card { width: 78%; max-height: 90%; overflow: auto; background: #fff; border-radius: 18px; box-shadow: var(--shadow-hi); padding: 22px 26px; display: grid; gap: 16px; font-size: clamp(15px, 1.6vw, 24px); }
.bd-proj-hd { display: flex; align-items: center; }
.bd-live { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--green); background: var(--green-bg); padding: 3px 10px; border-radius: 999px; font-weight: 500; }
.bd-live i { width: 7px; height: 7px; border-radius: 50%; background: var(--green); }
.bd-proj-q { line-height: 1.7; }
.bd-proj-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bd-proj-opts.one { grid-template-columns: 1fr; }
.bd-po { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; background: var(--bg); }
.bd-po b { width: 1.8em; height: 1.8em; border-radius: 50%; display: grid; place-items: center; background: #fff; box-shadow: var(--shadow); font-size: .8em; flex: none; }
.bd-po.right { background: var(--green-bg); color: var(--green); font-weight: 600; }
.bd-po.right b { background: var(--green); color: #fff; }
.bd-po em { margin-left: auto; font-style: normal; font-weight: 600; }
.bd-po em.ok { color: var(--green); } .bd-po em.no { color: #b42318; }
.bd-proj-card > .bd-btn { justify-self: start; }
```

- [ ] **Step 5: Kiểm**

Run: `pnpm --filter @eduvn/web typecheck && pnpm --filter @eduvn/web build && pnpm --filter @eduvn/web test` → sạch/xanh.
Chạy app: trong Ngân hàng thêm 4 câu chủ đề "Thiết diện" (có câu nhắc "hình lập phương"); tạo bài giảng chủ đề "Thiết diện", thêm lập phương có thiết diện → mở gợi ý → câu khớp đứng đầu; **Chiếu** → thẻ lớn có công thức; **Hiện đáp án** tô xanh; chọn 4 câu → **Tạo trò chơi** mở tab trò chơi. Chụp `/tmp/eduvn-web-bang-giang-goi-y.png`.

- [ ] **Step 6: Commit**

```bash
git add web/src/board/SuggestPanel.tsx web/src/board/Projector.tsx web/src/board/BoardPage.tsx web/src/board/board.css
git commit -m "feat(web): gợi ý bài liên quan trên bảng, chiếu câu hỏi, tạo trò chơi từ câu chọn"
```

---

### Task 15: Smoke E2E + tài liệu

**Files:**
- Modify: `web/scripts/smoke.mjs`, `docs/ROADMAP.md`

**Interfaces:**
- Consumes: `data-testid` đã đặt ở Task 7, 10–14: `q-stem`, `math-kb`, `kb-done`, `bg-new`, `bg-title`, `bg-topic`, `bg-create`, `bd-stage`, `t-pen`, `t-graph`, `bd-expr-0`, `bd-graph-ok`, `bd-graph`, `t-solid`, `bd-lib-cube`, `bd-solid`, `bd-m-cut`, `[data-pt=…]`, `bd-info`, `t-suggest`, `bd-q`, `bd-show`, `bd-proj`, `bd-reveal`, `bd-save`, `bd-state`.

- [ ] **Step 1: Thêm khối smoke** (chèn ngay sau phần "Thêm 2 câu hỏi" trong `web/scripts/smoke.mjs`; hàm `post` kiểu mới dùng chung token như các khối cũ)

```js
  // P4 — ô công thức trong ngân hàng
  await page.getByTestId("q-topic").fill(`Thiết diện ${topic}`);
  await page.getByTestId("q-stem").click();
  await page.keyboard.type("Cho hàm số ");
  await page.keyboard.type("$");
  await page.waitForSelector("[data-testid=math-kb].on");
  assert(true, "gõ $ mở ô công thức + bàn phím toán");
  await page.keyboard.type("x^2");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("-3");
  await page.getByTestId("kb-done").click();
  await page.keyboard.type(" có đỉnh là");
  for (let k = 0; k < 4; k++) await page.getByTestId(`q-opt-${k}`).fill(`Điểm ${"ABCD"[k]}`);
  await page.getByLabel("Đáp án A").check();
  await page.getByTestId("q-save").click();
  await page.waitForFunction(() => [...document.querySelectorAll("[data-testid=q-table] .me-tex")].length > 0);
  assert(true, "câu hỏi có công thức hiển thị dạng toán trong bảng");
  await shot("cong-thuc");

  // P4 — bảng giảng
  const apiPost = (url, body) => page.evaluate(async ([url, body]) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const r = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() };
  }, [url, body]);
  const tdTopic = `Thiết diện ${Date.now() % 1000}`;
  for (let k = 0; k < 4; k++) {
    const r = await apiPost("/api/questions", { type: "mcq", subject: "Toán", grade: 11, topic: tdTopic, level: "TH", tags: [], stem: `Thiết diện của hình lập phương cắt bởi $(MNP)$ — câu ${k + 1}`, options: ["Tam giác", "Tứ giác", "Ngũ giác", "Lục giác"], answer: 3 });
    assert(r.status === 201, `thêm câu thiết diện ${k + 1}`);
  }
  await page.goto(`${BASE}/bang-giang`);
  await page.waitForSelector("h1");
  await page.getByTestId("bg-new").click();
  await page.getByTestId("bg-title").fill("Ôn tập hình không gian");
  await page.locator("form input[type=number]").fill("11");
  await page.getByTestId("bg-topic").fill(tdTopic);
  await page.getByTestId("bg-create").click();
  await page.waitForSelector("[data-testid=bd-stage]");
  const stage = await page.getByTestId("bd-stage").boundingBox();
  await page.getByTestId("t-pen").click();
  await page.mouse.move(stage.x + 60, stage.y + 60);
  await page.mouse.down();
  for (let k = 1; k <= 12; k++) await page.mouse.move(stage.x + 60 + k * 12, stage.y + 60 + Math.sin(k) * 10);
  await page.mouse.up();
  assert((await page.locator(".bd-ink").count()) === 1, "vẽ được 1 nét bút");

  await page.getByTestId("t-graph").click();
  await page.locator("[data-testid=bd-expr-0]").click();
  await page.keyboard.type("y=x^2");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.type("-3");
  await page.getByTestId("bd-graph-ok").click();
  await page.waitForSelector("[data-testid=bd-graph] .bd-curve");
  assert(true, "vẽ đồ thị y = x² − 3");

  await page.getByTestId("t-solid").click();
  await page.getByTestId("bd-lib-cube").click();
  await page.waitForSelector("[data-testid=bd-solid]");
  await page.getByTestId("bd-m-cut").click();
  for (const p of ["A", "C", "C'"]) await page.locator(`[data-pt="${p}"] .bd-hit`).click();
  await page.waitForFunction(() => document.querySelector("[data-testid=bd-info]")?.textContent?.includes("hình chữ nhật"));
  assert(true, "cắt lập phương qua A, C, C' → hình chữ nhật");
  await shot("bang-giang");

  await page.getByTestId("t-suggest").click();
  await page.waitForSelector("[data-testid=bd-q]");
  assert((await page.getByTestId("bd-q").count()) >= 1, "gợi ý bài liên quan có câu");
  await page.getByTestId("bd-show").first().click();
  await page.getByTestId("bd-reveal").click();
  await page.waitForSelector("[data-testid=bd-proj] .bd-po.right");
  assert(true, "chiếu câu + hiện đáp án");
  await shot("bang-giang-chieu");
  await page.locator("[data-testid=bd-proj] .xbtn").click();

  await page.getByTestId("bd-save").click();
  await page.waitForFunction(() => document.querySelector("[data-testid=bd-state]")?.textContent === "Đã lưu");
  await page.reload();
  await page.waitForSelector("[data-testid=bd-solid]");
  assert((await page.locator(".bd-ink").count()) === 1 && (await page.getByTestId("bd-graph").count()) === 1, "lưu và mở lại bài giảng còn nguyên");
```

- [ ] **Step 2: Chạy smoke** (một tác vụ nặng mỗi lúc)

```bash
docker compose -f infra/docker-compose.yml up -d
pnpm -C server start &   # cửa sổ riêng
pnpm -C web dev &        # cửa sổ riêng
node web/scripts/smoke.mjs
```

Expected: mọi dòng `ok`, không `SMOKE FAIL`, không `pageerror`. Xem bằng mắt `/tmp/eduvn-web-cong-thuc.png`, `/tmp/eduvn-web-bang-giang.png`, `/tmp/eduvn-web-bang-giang-chieu.png` — khớp mockup (bảng nền tối, thanh trái navy, thẻ đổ bóng, ít chữ).

- [ ] **Step 3: ROADMAP**

Trong `docs/ROADMAP.md`, thay dòng P4 bằng:

```
| P4 | `2026-11-06-p4-formula-board.md` | Ô công thức (bàn phím toán VN, gõ tắt, đọc; Word ra phương trình thật) + Bảng giảng: bút, đồ thị hàm số có thanh trượt, hình không gian (thiết diện, đo góc), gợi ý bài liên quan + chiếu + trò chơi | 02, 03, 06 | Code xong <ngày> (… test, smoke OK) |
```

(Điền ngày và số test thật khi xong. Nội dung lớp/sổ điểm của P4 cũ đã làm ở P3.)

- [ ] **Step 4: Toàn bộ test lần cuối** (lần lượt, không song song)

Run: `pnpm --filter @eduvn/server test && pnpm --filter @eduvn/server typecheck`
Run: `pnpm --filter @eduvn/web test && pnpm --filter @eduvn/web build`
Expected: tất cả xanh.

- [ ] **Step 5: Commit**

```bash
git add web/scripts/smoke.mjs docs/ROADMAP.md
git commit -m "test(web): smoke ô công thức + bảng giảng; cập nhật lộ trình P4"
```

---

## Ngoài phạm vi (đợt sau)

- Nhận dạng chữ viết tay → công thức (Pix2Text/LLM thị giác) và nét vẽ tay → hình (cần làm thử trên mẫu GV thật).
- Trợ giảng ảo nói chuyện (TalkingHead + VieNeu-TTS + STT), chấm phát âm.
- Nhập đề Word có MathType; hình trụ/nón/cầu; khối tuỳ chỉnh; bảng nhiều người cùng xem.
- Sửa câu hỏi đúng/sai, trả lời ngắn trên web (form web hiện chỉ có trắc nghiệm; AI chat thêm được mọi dạng qua MCP).
