import { z } from "zod";

/** Mô hình dựng hình không gian (phải khớp web/src/geometry3d/spec.ts). Server chỉ kiểm cấu trúc,
 *  tên điểm tham chiếu và giới hạn; toạ độ, nét khuất, số đo tính ở trình duyệt (bộ giải web/src/geometry3d). */
export const BASE_SHAPES = ["triangle", "equilateral", "isosceles", "right", "square", "rectangle", "rhombus", "parallelogram", "trapezoid", "regular"] as const;
export const LIMITS = { points: 60, bodies: 3, segments: 40, polygons: 8, sections: 3, marks: 30, measures: 8 } as const;

/** Biểu thức độ dài theo a: "a√2", "2a", "a*sqrt(3)/2", "√6/3" → số (a = 1). Không dùng eval. */
export function parseLength(raw: string): number {
  const s = raw
    .normalize("NFC")
    .replace(/\s+/g, "")
    .replace(/[×·]|\\cdot|\\times/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/,/g, ".")
    .replace(/\\?sqrt/gi, "√")
    .replace(/\\[dt]?frac/g, "")
    .replace(/\}\{/g, ")/(")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\$/g, "")
    .replace(/π|\\pi/g, "p");
  let i = 0;
  const peek = () => s[i];
  const num = (): number => {
    const m = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("Độ dài không hợp lệ");
    i += m[0].length;
    return Number(m[0]);
  };
  const atom = (): number => {
    const c = peek();
    if (c === "(") {
      i++;
      const v = expr();
      if (peek() !== ")") throw new Error("Thiếu dấu )");
      i++;
      return v;
    }
    if (c === "√") {
      i++;
      return Math.sqrt(atom());
    }
    if (c === "a") {
      i++;
      return 1;
    }
    if (c === "p") {
      i++;
      return Math.PI;
    }
    if (c === "-") {
      i++;
      return -atom();
    }
    return num();
  };
  const power = (): number => {
    let v = atom();
    while (peek() === "^") {
      i++;
      v = v ** atom();
    }
    return v;
  };
  const term = (): number => {
    let v = power();
    for (;;) {
      const c = peek();
      if (c === "*") (i++, (v *= power()));
      else if (c === "/") (i++, (v /= power()));
      else if (c !== undefined && /[\d(√ap]/.test(c)) v *= power(); // nhân ngầm: 2a√3
      else return v;
    }
  };
  function expr(): number {
    let v = term();
    for (;;) {
      if (peek() === "+") (i++, (v += term()));
      else if (peek() === "-") (i++, (v -= term()));
      else return v;
    }
  }
  const v = expr();
  if (i !== s.length || !Number.isFinite(v)) throw new Error("Độ dài không hợp lệ");
  return v;
}

const Len = z.union([z.number(), z.string().max(60)]).transform((v, ctx) => {
  if (typeof v === "number") return v;
  try {
    return parseLength(v);
  } catch {
    ctx.addIssue({ code: "custom", message: `Độ dài "${v}" không đọc được` });
    return z.NEVER;
  }
});
const Pos = Len.pipe(z.number().finite().positive().max(100));
const Real = Len.pipe(z.number().finite().min(-100).max(100));
const Name = z.string().trim().regex(/^[A-Z][0-9]?['′]{0,2}$/, "Tên điểm là chữ in hoa, có thể kèm số hoặc dấu phẩy trên (A, A', O1)").transform((v) => v.replace(/′/g, "'"));
const Pair = z.tuple([Name, Name]);
const Triple = z.tuple([Name, Name, Name]);
const V3 = z.tuple([Real, Real, Real]);

const PointDef = z.discriminatedUnion("type", [
  z.object({ type: z.literal("coord"), id: Name, at: V3 }),
  z.object({
    type: z.literal("polygon"),
    ids: z.array(Name).min(3).max(8),
    shape: z.enum(BASE_SHAPES),
    a: Pos.optional(),
    b: Pos.optional(),
    sides: z.tuple([Pos, Pos, Pos]).optional(),
    angle: z.number().gt(0).lt(180).optional(),
    h: Pos.optional(),
    at: Name.optional(),
    rightAngle: z.boolean().optional(),
    rotate: z.number().min(-360).max(360).optional(),
  }),
  z.object({ type: z.literal("above"), id: Name, of: Name, height: Real }),
  z.object({ type: z.literal("center"), id: Name, of: z.array(Name).min(2).max(8) }),
  z.object({ type: z.literal("circumcenter"), id: Name, of: Triple }),
  z.object({ type: z.literal("midpoint"), id: Name, of: Pair }),
  z.object({ type: z.literal("ratio"), id: Name, from: Name, to: Name, t: Len.pipe(z.number().min(-10).max(10)) }),
  z.object({ type: z.literal("intersect"), id: Name, line: Pair, line2: Pair.optional(), plane: Triple.optional() }).refine((p) => !!p.line2 !== !!p.plane, "Giao điểm cần đúng một trong line2 / plane"),
  z.object({ type: z.literal("foot"), id: Name, from: Name, line: Pair.optional(), plane: Triple.optional() }).refine((p) => !!p.line !== !!p.plane, "Hình chiếu cần đúng một trong line / plane"),
  z.object({ type: z.literal("translate"), ids: z.array(Name).min(1).max(8), of: z.array(Name).min(1).max(8), vector: V3 }),
  z.object({ type: z.literal("scale"), ids: z.array(Name).min(1).max(8), of: z.array(Name).min(1).max(8), center: Name, k: Len.pipe(z.number().min(-10).max(10)) }),
]);
const Body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pyramid"), base: z.array(Name).min(3).max(8), apex: Name }),
  z.object({ type: z.literal("prism"), base: z.array(Name).min(3).max(8), top: z.array(Name).min(3).max(8) }).refine((b) => b.base.length === b.top.length, "Hai đáy lăng trụ phải cùng số đỉnh"),
  z.object({ type: z.literal("cone"), center: Name, apex: Name, radius: Pos }),
  z.object({ type: z.literal("cylinder"), center: Name, top: Name, radius: Pos }),
  z.object({ type: z.literal("sphere"), center: Name, radius: Pos }),
]);
const Mark = z.discriminatedUnion("type", [
  z.object({ type: z.literal("right"), at: Name, a: Name, b: Name }),
  z.object({ type: z.literal("equal"), segments: z.array(Pair).min(1).max(8), group: z.number().int().min(1).max(3).optional() }),
  z.object({ type: z.literal("angle"), at: Name, a: Name, b: Name, label: z.string().max(12).optional(), value: z.boolean().optional() }),
]);
const Measure = z.discriminatedUnion("type", [
  z.object({ type: z.literal("length"), of: Pair }),
  z.object({ type: z.literal("distance"), from: Name, to: Name.optional(), line: Pair.optional(), plane: Triple.optional(), foot: Name.optional() }).refine((m) => [m.to, m.line, m.plane].filter(Boolean).length === 1, "Khoảng cách cần đúng một trong to / line / plane"),
  z.object({ type: z.literal("distance_lines"), lines: z.tuple([Pair, Pair]), feet: Pair.optional() }),
  z.object({ type: z.literal("angle_line_plane"), line: Pair, plane: Triple, foot: Name.optional() }),
  z.object({ type: z.literal("angle_planes"), planes: z.tuple([Triple, Triple]), feet: Pair.optional() }),
  z.object({ type: z.literal("angle_lines"), lines: z.tuple([Pair, Pair]) }),
]);

const definedIds = (p: z.infer<typeof PointDef>): string[] => ("ids" in p ? p.ids : [p.id]);

export const ConstructionSpecSchema = z
  .object({
    title: z.string().trim().max(200).optional(),
    points: z.array(PointDef).min(1).max(LIMITS.points, `Tối đa ${LIMITS.points} định nghĩa điểm`),
    bodies: z.array(Body).max(LIMITS.bodies),
    segments: z.array(Pair).max(LIMITS.segments).optional(),
    polygons: z.array(z.array(Name).min(3).max(8)).max(LIMITS.polygons).optional(),
    sections: z.array(z.object({ through: Triple })).max(LIMITS.sections).optional(),
    marks: z.array(Mark).max(LIMITS.marks).optional(),
    measures: z.array(Measure).max(LIMITS.measures).optional(),
    hide: z.array(Name).max(LIMITS.points).optional(),
    view: z.enum(["sgk", "ortho"]).optional(),
  })
  .superRefine((s, ctx) => {
    const ids = s.points.flatMap(definedIds);
    const known = new Set(ids);
    if (known.size !== ids.length) ctx.addIssue({ code: "custom", message: `Tên điểm bị định nghĩa hai lần: ${[...new Set(ids.filter((x, i) => ids.indexOf(x) !== i))].join(", ")}` });
    for (const p of s.points) {
      if ((p.type === "translate" || p.type === "scale") && p.ids.length !== p.of.length) ctx.addIssue({ code: "custom", message: "ids và of phải cùng độ dài" });
      if (p.type === "polygon" && p.at && !p.ids.includes(p.at)) ctx.addIssue({ code: "custom", message: `Đỉnh ${p.at} không thuộc đa giác` });
    }
    // các tên được dùng (không tính tên điểm do số đo tự đặt) phải có định nghĩa
    const refs = new Set<string>();
    const add = (...n: (string | undefined)[]) => n.forEach((x) => x && refs.add(x));
    for (const p of s.points) {
      if (p.type === "above") add(p.of);
      if (p.type === "center" || p.type === "circumcenter" || p.type === "midpoint" || p.type === "translate") add(...p.of);
      if (p.type === "ratio") add(p.from, p.to);
      if (p.type === "intersect") add(...p.line, ...(p.line2 ?? []), ...(p.plane ?? []));
      if (p.type === "foot") add(p.from, ...(p.line ?? []), ...(p.plane ?? []));
      if (p.type === "scale") add(...p.of, p.center);
    }
    for (const b of s.bodies) {
      if (b.type === "pyramid") add(...b.base, b.apex);
      else if (b.type === "prism") add(...b.base, ...b.top);
      else add(b.center, b.type === "cone" ? b.apex : b.type === "cylinder" ? b.top : undefined);
    }
    for (const sg of s.segments ?? []) add(...sg);
    for (const pg of s.polygons ?? []) add(...pg);
    for (const sc of s.sections ?? []) add(...sc.through);
    const missing = [...refs].filter((r) => !known.has(r));
    if (missing.length) ctx.addIssue({ code: "custom", message: `Điểm chưa được định nghĩa: ${missing.join(", ")}` });
  });
export type ConstructionSpec = z.infer<typeof ConstructionSpecSchema>;

/** Model đôi khi bọc spec trong {spec: …} / {construction: …} hoặc đặt "solids" thay "bodies". */
export function unwrapSpec(raw: unknown): unknown {
  let v = raw;
  for (let i = 0; i < 2 && v && typeof v === "object" && !Array.isArray(v); i++) {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.points)) break;
    v = o.spec ?? o.construction ?? o.hinh ?? o.figure ?? v;
  }
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const o = { ...(v as Record<string, unknown>) };
    if (!o.bodies && Array.isArray(o.solids)) o.bodies = o.solids;
    if (!o.bodies) o.bodies = [];
    return o;
  }
  return v;
}

export function parseSpec(raw: unknown): { ok: true; spec: ConstructionSpec } | { ok: false; issues: string[] } {
  const r = ConstructionSpecSchema.safeParse(unwrapSpec(raw));
  if (!r.success) return { ok: false, issues: r.error.issues.slice(0, 8).map((i) => `${i.path.join(".") || "gốc"}: ${i.message}`) };
  return { ok: true, spec: r.data };
}
