// Dữ kiện của bài giảng AI (thuần, không I/O): chữ của cảnh, số liệu đã dùng, kiểm số trong tham số hoạt hình,
// kiểm tên SGK/lớp trong nội dung sinh ra. Dùng khi sinh cảnh tương tác/quiz, khi AI chọn hoạt hình.

export type FactScene = { order: number; type: string; title: string; content?: unknown; actions?: { type: string; text?: string }[] };

/** HTML → chữ (bỏ thẻ, gộp khoảng trắng). */
export const htmlText = (h: string): string => h.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

/** Chữ hiện trên slide: các ô chữ, công thức ($…$), bảng. */
export function slideText(content: unknown): string {
  const els = (content as { canvas?: { elements?: { type?: string; content?: string; latex?: string; data?: unknown; text?: { content?: string } }[] } })?.canvas?.elements ?? [];
  return els
    .map((e) => {
      if (e.content) return htmlText(e.content);
      if (e.latex) return `$${e.latex}$`;
      if (e.text?.content) return htmlText(e.text.content);
      if (e.type === "table" && Array.isArray(e.data)) return (e.data as { text?: string }[][]).map((r) => r.map((c) => c.text ?? "").join(" | ")).join(" ; ");
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export const speechText = (s: FactScene): string => (s.actions ?? []).flatMap((a) => (a.type === "speech" && a.text ? [a.text] : [])).join(" ");

/** Dữ kiện các cảnh slide đứng trước `beforeOrder` (đề, số liệu, công thức) để cảnh sau dùng đúng; cắt ≤ max ký tự. */
export function lessonFacts(scenes: FactScene[], beforeOrder: number, max = 2500): string {
  const parts = scenes
    .filter((s) => s.order < beforeOrder && s.type === "slide")
    .sort((a, b) => a.order - b.order)
    .map((s) => `- ${s.title}: ${slideText(s.content)}`.slice(0, 900));
  let out = "";
  for (const p of parts) {
    if (out.length + p.length > max) break;
    out += `${out ? "\n" : ""}${p}`;
  }
  return out;
}

// ---- số liệu ----

const close = (a: number, b: number) => Math.abs(a - b) <= (Math.abs(b) < 1.5 ? 0.0016 : 1e-6 + Math.abs(b) * 1e-4);

/** Các số trong chữ: số nguyên, thập phân (0,6 hoặc 0.6), phân số a/b và \frac{a}{b} (trả cả giá trị thương), phần trăm (40% → 40 và 0,4). Bỏ số mũ (^2). */
export function numbersIn(text: string): { ints: number[]; values: number[] } {
  const t = text.replace(/\^\{?-?\d+\}?/g, " ");
  const ints: number[] = [];
  const values: number[] = [];
  for (const m of t.matchAll(/\\d?frac\s*\{\s*(\d+)\s*\}\s*\{\s*(\d+)\s*\}|(\d+)\s*\/\s*(\d+)|(\d+(?:[.,]\d+)?)\s*(%)?/g)) {
    const [a, b] = m[1] !== undefined ? [Number(m[1]), Number(m[2])] : m[3] !== undefined ? [Number(m[3]), Number(m[4])] : [Number.NaN, Number.NaN];
    if (!Number.isNaN(a)) {
      ints.push(a, b);
      values.push(a, b);
      if (b) values.push(a / b);
      continue;
    }
    const v = Number((m[5] as string).replace(",", "."));
    if (Number.isInteger(v)) ints.push(v);
    values.push(v);
    if (m[6]) values.push(v / 100);
  }
  return { ints, values };
}

/** Tập số "suy ra được" từ nội dung bài: số có trong bài, phần bù 1 − p, tích hai xác suất, số nguyên ±1 và tổng hai số nguyên (vd 5 + 3 = 8, 8 − 1 = 7). */
export function derivable(text: string): number[] {
  const { ints, values } = numbersIn(text);
  const probs = [...new Set(values.filter((v) => v > 0 && v < 1))].slice(0, 40);
  const out = new Set<number>([0, 1, 2, ...values]);
  for (const p of probs) out.add(1 - p);
  const ps = [...new Set([...probs, ...probs.map((p) => 1 - p)])];
  for (const p of ps) for (const q of ps) out.add(p * q);
  const is = [...new Set(ints)].slice(0, 40);
  for (const a of is) {
    out.add(a - 1);
    out.add(a + 1);
    for (const b of is) if (b !== a) out.add(a + b);
  }
  return [...out];
}

/** Khoá tham số mang số liệu (các khoá khác như khung trục xMin/xMax, số hình… không kiểm). */
const DATA_KEYS = new Set(["xs", "giaTri", "u1", "d", "q"]);
/** Khoá chữ không kiểm (LaTeX công thức tổng quát, biểu thức hàm số). */
const SKIP_TEXT = new Set(["bieuThuc", "f", "g", "latex", "tieuDe"]);

/** Số trong tham số hoạt hình (số ở khoá số liệu + số viết trong chữ) mà nội dung bài không có và không suy ra được. */
export function foreignNumbers(params: unknown, lessonText: string): number[] {
  const ok = derivable(lessonText);
  const bad = new Set<number>();
  const check = (v: number) => {
    if (!Number.isFinite(v) || ok.some((x) => close(v, x))) return;
    bad.add(Math.round(v * 10000) / 10000);
  };
  const walk = (v: unknown, key: string) => {
    if (typeof v === "number") {
      if (DATA_KEYS.has(key)) check(v);
    } else if (typeof v === "string") {
      if (SKIP_TEXT.has(key)) return;
      if (DATA_KEYS.has(key)) {
        const f = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(v);
        if (f) return check(Number(f[1]) / Number(f[2]));
      }
      for (const n of numbersIn(v).values) check(n);
    } else if (Array.isArray(v)) for (const x of v) walk(x, key);
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(params, "");
  return [...bad];
}

// ---- lớp / sách giáo khoa ----

const SUBJECTS = "Toán|Ngữ văn|Văn|Vật lí|Vật lý|Hoá học|Hóa học|Sinh học|Tin học|Tiếng Anh|Lịch sử|Địa lí|Địa lý|Công nghệ|GDCD|Khoa học tự nhiên|KHTN";
const BOOK_REF = new RegExp(`((?:SGK|sách giáo khoa|Sách giáo khoa|chương trình|Chương trình)\\s+)?(${SUBJECTS})(\\s+(?:lớp\\s+)?)(\\d{1,2})\\b`, "gu");

/** Các chỗ nhắc "SGK Toán 12", "Toán lớp 12"… mà lớp khác lớp của bài. */
export function wrongGradeRefs(text: string, grade: number | null | undefined): string[] {
  if (!grade || grade > 12) return [];
  const out: string[] = [];
  for (const m of text.normalize("NFC").matchAll(BOOK_REF)) if (Number(m[4]) !== grade) out.push(m[0].trim());
  return [...new Set(out)];
}

/** Sửa chỗ nhắc sách/lớp lệch về đúng lớp của bài ("SGK Toán 12" → "SGK Toán 11"). */
export function fixGradeRefs(text: string, grade: number | null | undefined): string {
  if (!grade || grade > 12) return text;
  return text.normalize("NFC").replace(BOOK_REF, (all, pre: string | undefined, sub: string, mid: string, n: string) => (Number(n) === grade ? all : `${pre ?? ""}${sub}${mid}${grade}`));
}

/** Câu chỉ dẫn bối cảnh lớp/chương trình đưa vào mọi prompt sinh cảnh. */
export function curriculumNote(subject: string | null | undefined, grade: number | null | undefined): string {
  if (!grade && !subject) return "";
  const who = `${subject ? `môn ${subject}` : ""}${subject && grade ? ", " : ""}${grade ? (grade <= 12 ? `lớp ${grade}` : "bậc đại học") : ""}`;
  const book = grade && grade <= 12 ? ` Khi nhắc sách/lớp (trong slide, lời giải, ghi chú) chỉ dùng đúng lớp ${grade}${subject ? `, ví dụ "SGK ${subject} ${grade}"` : ""}; không nhắc sách giáo khoa của lớp khác.` : "";
  return `Bài dành cho ${who}, theo Chương trình giáo dục phổ thông 2018.${book}`;
}
