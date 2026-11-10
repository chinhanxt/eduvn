// server/src/domain/solution.ts — mô hình lời giải từng bước (P13): bước có refs tới phần tử hình, hình kèm theo, phép kiểm đáp số.
import { z } from "zod";
import { ConstructionSpecSchema, unwrapSpec } from "./geometry3d";

export const MAX_STEPS = 9;
const Str = (max: number) => z.string().trim().normalize("NFC").max(max);
/** Số/biểu thức dạng chữ của AI ("a√2", "3/10", "0,25", 0.5). */
const NumText = z.union([z.number(), z.string()]).transform((v) => String(v).trim().slice(0, 120));
const Id = z.union([z.string(), z.number()]).transform((v) => String(v).trim().slice(0, 40)).pipe(z.string().min(1));

/** Tên điểm hình học: A, A', O1. */
const POINT = /[A-Z][0-9]?['′]{0,2}/g;

// ——— Phép kiểm (AI khai báo, server tự tính lại) ———
const Pair = z.tuple([z.string(), z.string()]);
const Triple = z.tuple([z.string(), z.string(), z.string()]);
export const Measure3dSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("length"), of: Pair }),
  z.object({ type: z.literal("distance"), from: z.string(), to: z.string().optional(), line: Pair.optional(), plane: Triple.optional() }),
  z.object({ type: z.literal("distance_lines"), lines: z.tuple([Pair, Pair]) }),
  z.object({ type: z.literal("angle_line_plane"), line: Pair, plane: Triple }),
  z.object({ type: z.literal("angle_planes"), planes: z.tuple([Triple, Triple]) }),
  z.object({ type: z.literal("angle_lines"), lines: z.tuple([Pair, Pair]) }),
  z.object({ type: z.literal("volume"), body: z.number().int().min(0).max(2).default(0) }),
  z.object({ type: z.literal("area"), polygon: z.array(z.string()).min(3).max(8) }),
]);
export type Measure3d = z.infer<typeof Measure3dSchema>;

export const CheckSchema = z.discriminatedUnion("type", [
  /** đo lại trên hình không gian */
  z.object({ type: z.literal("measure3d"), measure: Measure3dSchema, expect: NumText.optional() }),
  /** thế nghiệm: lhs(x) = rhs(x) với mọi x trong roots */
  z.object({ type: z.literal("equation"), lhs: Str(160), rhs: Str(160).default("0"), roots: z.array(NumText).min(1).max(8), domain: Str(160).optional() }),
  /** bất phương trình lhs op rhs; solution = các khoảng nghiệm [từ, đến] ("-inf"/"inf" cho vô cực) */
  z.object({ type: z.literal("inequality"), lhs: Str(160), op: z.enum(["<", "<=", ">", ">=", "≤", "≥"]), rhs: Str(160).default("0"), solution: z.array(z.tuple([NumText, NumText])).max(6) }),
  /** giá trị biểu thức (không có x, hoặc tại x = at) */
  z.object({ type: z.literal("value"), expr: Str(160), at: NumText.optional(), expect: NumText.optional() }),
  z.object({ type: z.literal("derivative"), f: Str(160), at: NumText, expect: NumText.optional() }),
  z.object({ type: z.literal("integral"), f: Str(160), from: NumText, to: NumText, expect: NumText.optional() }),
  /** xác suất từ cây: tổng tích theo nhánh tới các lá `leaves`; có `given` → xác suất có điều kiện P(leaves | given) */
  z.object({ type: z.literal("probability"), leaves: z.array(Id).min(1).max(30), given: z.array(Id).max(30).optional(), expect: NumText.optional() }),
]);
export type Check = z.infer<typeof CheckSchema>;

// ——— Hình ———
const GraphFigure = z.object({
  kind: z.literal("graph"),
  spec: z.object({
    expr: Str(160),
    xRange: z.tuple([z.number(), z.number()]).optional(),
    points: z.array(z.object({ id: Id, x: NumText, y: NumText.optional(), label: Str(40).optional() })).max(12).default([]),
  }),
});
const TreeFigure = z.object({
  kind: z.literal("tree"),
  spec: z.object({
    nodes: z
      .array(z.object({ id: Id, label: Str(60), parent: Id.nullish().transform((v) => v ?? null), p: NumText.optional() }))
      .min(1)
      .max(40),
  }),
});
const DiagramFigure = z.object({
  kind: z.literal("diagram"),
  spec: z.object({
    nodes: z.array(z.object({ id: Id, label: Str(200), parent: Id.nullish().transform((v) => v ?? null) })).min(1).max(30),
    links: z.array(z.object({ from: Id, to: Id, label: Str(60).optional() })).max(60).default([]),
  }),
});
const PlaneFigure = z.object({
  kind: z.literal("plane"),
  spec: z.object({
    points: z.array(z.object({ id: Id, x: z.number().finite().min(-100).max(100), y: z.number().finite().min(-100).max(100) })).min(1).max(30),
    segments: z.array(z.tuple([Id, Id])).max(40).default([]),
    circles: z.array(z.object({ center: Id, r: z.number().positive().max(100) })).max(4).default([]),
  }),
});
const Solid3dFigure = z.object({ kind: z.literal("solid3d"), spec: z.preprocess(unwrapSpec, ConstructionSpecSchema) });
export const FigureSchema = z.discriminatedUnion("kind", [Solid3dFigure, GraphFigure, TreeFigure, DiagramFigure, PlaneFigure]);
export type Figure = z.infer<typeof FigureSchema>;

export const StepSchema = z.object({
  title: Str(120).pipe(z.string().min(1, "Bước thiếu tiêu đề")),
  body: Str(4000),
  refs: z.array(Id).max(20).default([]),
  check: CheckSchema.optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const VerificationSchema = z.object({
  status: z.enum(["verified", "mismatch", "unchecked"]),
  details: z.array(z.object({ ok: z.boolean().nullable(), label: Str(200), expected: Str(120).optional(), measured: Str(120).optional() })).max(40),
});
export type Verification = z.infer<typeof VerificationSchema>;

export const SolutionSchema = z.object({
  problem: Str(6000).pipe(z.string().min(1, "Thiếu đề bài")),
  subject: Str(60).default("Toán"),
  topic: Str(120).default(""),
  answer: Str(600).pipe(z.string().min(1, "Thiếu đáp số")),
  steps: z.array(StepSchema).min(1, "Lời giải cần ít nhất một bước").max(MAX_STEPS),
  figure: FigureSchema.nullish().transform((v) => v ?? undefined),
  /** phép kiểm cho đáp số cuối (ngoài phép kiểm theo bước) */
  checks: z.array(CheckSchema).max(8).default([]),
  verification: VerificationSchema.default({ status: "unchecked", details: [] }),
});
export type Solution = z.infer<typeof SolutionSchema>;

/** Chuẩn hoá id phần tử: hình không gian/phẳng dùng "A" (điểm), "A-B" (đoạn), "A-B-C" (mặt); AI hay viết "SA", "(SBC)". */
export function normalizeRef(ref: string, kind: Figure["kind"] | undefined): string {
  const r = ref.trim().replace(/′/g, "'");
  if (kind !== "solid3d" && kind !== "plane") return r;
  const bare = r.replace(/^mp\s*/i, "").replace(/[()\s]/g, "");
  const parts = bare.includes("-") ? bare.split("-").filter(Boolean) : (bare.match(POINT) ?? []);
  if (!parts.length || parts.join(bare.includes("-") ? "-" : "") !== bare) return r;
  return parts.join("-");
}

/** Model hay bọc lời giải trong {solution: …}, đặt "buoc"/"loi_giai" thay "steps", refs là chuỗi. */
export function unwrapSolution(raw: unknown): unknown {
  let v = raw;
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    if (!Array.isArray(o.steps)) v = o.solution ?? o.loi_giai ?? o.result ?? v;
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return v;
  const o = { ...(v as Record<string, unknown>) };
  if (!Array.isArray(o.steps)) o.steps = o.buoc ?? o.cac_buoc;
  if (o.answer === undefined && o.dap_so !== undefined) o.answer = o.dap_so;
  if (typeof o.answer === "number") o.answer = String(o.answer);
  if (Array.isArray(o.steps))
    o.steps = o.steps.map((s) => {
      if (!s || typeof s !== "object") return s;
      const st = { ...(s as Record<string, unknown>) };
      if (st.body === undefined) st.body = st.content ?? st.noi_dung ?? st.text ?? "";
      if (typeof st.refs === "string") st.refs = st.refs.split(/[,;]\s*/).filter(Boolean);
      if (st.check === null) delete st.check;
      return st;
    });
  if (o.figure && typeof o.figure === "object" && !Array.isArray(o.figure)) {
    const f = o.figure as Record<string, unknown>;
    if (f.spec === undefined) {
      const { kind, ...rest } = f;
      o.figure = { kind, spec: rest };
    }
  }
  return o;
}

export function parseSolution(raw: unknown): { ok: true; solution: Solution } | { ok: false; issues: string[] } {
  const r = SolutionSchema.safeParse(unwrapSolution(raw));
  if (!r.success) return { ok: false, issues: r.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "gốc"}: ${i.message}`) };
  const kind = r.data.figure?.kind;
  const steps = r.data.steps.map((s) => ({ ...s, refs: [...new Set(s.refs.map((x) => normalizeRef(x, kind)))] }));
  return { ok: true, solution: { ...r.data, steps } };
}

/** Id các phần tử hình có thể tô sáng (để lọc refs AI bịa). */
export function figureElementIds(f: Figure | undefined): Set<string> {
  const out = new Set<string>();
  if (!f) return out;
  if (f.kind === "graph") {
    out.add("f");
    for (const p of f.spec.points) out.add(p.id);
  } else if (f.kind === "tree" || f.kind === "diagram") for (const n of f.spec.nodes) out.add(n.id);
  else if (f.kind === "plane") {
    for (const p of f.spec.points) out.add(p.id);
    for (const [a, b] of f.spec.segments) out.add(`${a}-${b}`).add(`${b}-${a}`);
  }
  return out;
}

/** Đọc dần JSON lời giải đang stream: các bước đã đóng ngoặc + tiêu đề/nội dung (dở) của bước đang viết. */
export function partialSteps(text: string): { done: unknown[]; current?: { title: string; body: string } } {
  const k = text.search(/"(steps|buoc|cac_buoc)"\s*:\s*\[/);
  if (k < 0) return { done: [] };
  let i = text.indexOf("[", k) + 1;
  const done: unknown[] = [];
  for (;;) {
    while (i < text.length && /[\s,]/.test(text[i]!)) i++;
    if (i >= text.length || text[i] !== "{") return { done };
    // tìm dấu } khớp (bỏ qua ngoặc trong chuỗi)
    let depth = 0, inStr = false, j = i;
    for (; j < text.length; j++) {
      const c = text[j]!;
      if (inStr) {
        if (c === "\\") j++;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "{" || c === "[") depth++;
      else if (c === "}" || c === "]") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (j >= text.length) return { done, current: { title: partialField(text.slice(i), "title"), body: partialField(text.slice(i), "body") } };
    try {
      done.push(JSON.parse(text.slice(i, j + 1)));
    } catch {
      return { done };
    }
    i = j + 1;
  }
}

function partialField(obj: string, key: string): string {
  const m = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)(")?`).exec(obj);
  if (!m) return "";
  const raw = m[1]!.replace(/\\u[0-9a-fA-F]{0,3}$|\\$/, "");
  try {
    return JSON.parse(`"${raw}"`) as string;
  } catch {
    return raw;
  }
}
