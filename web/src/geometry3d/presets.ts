// web/src/geometry3d/presets.ts — thư viện hình mẫu kiểu SGK (dựng bằng ràng buộc) + chuyển hình bảng cũ sang mô hình mới.
import { solve } from "./solver";
import type { ConstructionSpec, PointDef, ViewMode } from "./spec";

export type Preset = { id: string; title: string; label: string; group: "Chóp" | "Lăng trụ" | "Tròn xoay"; spec: () => ConstructionSpec };

const SQ = ["A", "B", "C", "D"];
const TRI = ["A", "B", "C"];
const prime = (ids: string[]) => ids.map((i) => `${i}'`);
const poly = (ids: string[], shape: Extract<PointDef, { type: "polygon" }>["shape"], o: Partial<Extract<PointDef, { type: "polygon" }>> = {}): PointDef => ({ type: "polygon", ids, shape, ...o });
const prismUp = (base: string[], h: number, shift: [number, number] = [0, 0]): PointDef => ({ type: "translate", ids: prime(base), of: base, vector: [shift[0], shift[1], h] });

/** Toạ độ một đỉnh đáy (đáy đã dời tâm về gốc) — để dựng lăng trụ xiên có chân đường cao định trước. */
const baseCoord = (p: PointDef, id: string): [number, number] => {
  const v = solve({ points: [p], bodies: [] }).pts.get(id)!;
  return [v[0], v[1]];
};

/** Chóp S.(đáy): đỉnh S ở trên đỉnh A (SA ⊥ đáy) hoặc trên tâm O của đáy. */
function pyramid(base: PointDef & { type: "polygon" }, apexOn: "A" | "O", h: number): ConstructionSpec {
  const ids = base.ids;
  const points: PointDef[] = [base];
  if (apexOn === "O") points.push({ type: "center", id: "O", of: ids });
  points.push({ type: "above", id: "S", of: apexOn === "O" ? "O" : ids[0]!, height: h });
  return { points, bodies: [{ type: "pyramid", base: ids, apex: "S" }] };
}

export const PRESETS: Preset[] = [
  { id: "tu_dien", title: "Tứ diện", label: "ABCD", group: "Chóp", spec: () => ({ points: [poly(["B", "C", "D"], "triangle", { sides: [1.15, 1.3, 1.6] }), { type: "coord", id: "A", at: [-0.15, 0.12, 1.25] }], bodies: [{ type: "pyramid", base: ["B", "C", "D"], apex: "A" }] }) },
  { id: "tu_dien_deu", title: "Tứ diện đều", label: "ABCD", group: "Chóp", spec: () => ({ points: [poly(["B", "C", "D"], "equilateral"), { type: "center", id: "G", of: ["B", "C", "D"] }, { type: "above", id: "A", of: "G", height: Math.sqrt(2 / 3) }], bodies: [{ type: "pyramid", base: ["B", "C", "D"], apex: "A" }], segments: [["A", "G"]], marks: [{ type: "equal", segments: [["A", "B"], ["A", "C"], ["A", "D"], ["B", "C"], ["C", "D"], ["B", "D"]] }] }) },
  { id: "chop_tam_giac_deu", title: "Chóp tam giác đều", label: "S.ABC", group: "Chóp", spec: () => ({ ...pyramid(poly(TRI, "equilateral") as PointDef & { type: "polygon" }, "O", 1.15), segments: [["S", "O"]], marks: [{ type: "equal", segments: [["S", "A"], ["S", "B"], ["S", "C"]] }] }) },
  { id: "chop_tam_giac_sa", title: "Chóp S.ABC, SA ⊥ (ABC), đáy vuông tại B", label: "S.ABC", group: "Chóp", spec: () => ({ ...pyramid(poly(TRI, "right", { b: 1.2 }) as PointDef & { type: "polygon" }, "A", 1.3), marks: [{ type: "right", at: "A", a: "S", b: "B" }, { type: "right", at: "B", a: "A", b: "C" }] }) },
  { id: "chop_tu_giac_deu", title: "Chóp tứ giác đều", label: "S.ABCD", group: "Chóp", spec: () => ({ ...pyramid(poly(SQ, "square") as PointDef & { type: "polygon" }, "O", 1.2), segments: [["S", "O"], ["A", "C"], ["B", "D"]], marks: [{ type: "right", at: "O", a: "S", b: "C" }] }) },
  { id: "chop_vuong_sa", title: "Chóp đáy vuông, SA ⊥ đáy", label: "S.ABCD", group: "Chóp", spec: () => ({ ...pyramid(poly(SQ, "square") as PointDef & { type: "polygon" }, "A", 1.3), marks: [{ type: "right", at: "A", a: "S", b: "B" }, { type: "right", at: "A", a: "S", b: "D" }] }) },
  { id: "chop_chu_nhat_sa", title: "Chóp đáy chữ nhật, SA ⊥ đáy", label: "S.ABCD", group: "Chóp", spec: () => ({ ...pyramid(poly(SQ, "rectangle", { a: 1.5, b: 1 }) as PointDef & { type: "polygon" }, "A", 1.2), marks: [{ type: "right", at: "A", a: "S", b: "B" }, { type: "right", at: "A", a: "S", b: "D" }] }) },
  { id: "chop_thoi", title: "Chóp đáy hình thoi, SO ⊥ đáy", label: "S.ABCD", group: "Chóp", spec: () => ({ ...pyramid(poly(SQ, "rhombus", { angle: 60, a: 1.2, rotate: -30 }) as PointDef & { type: "polygon" }, "O", 1.2), segments: [["S", "O"], ["A", "C"], ["B", "D"]] }) },
  { id: "chop_thang", title: "Chóp đáy hình thang vuông, SA ⊥ đáy", label: "S.ABCD", group: "Chóp", spec: () => ({ ...pyramid(poly(SQ, "trapezoid", { a: 2, b: 1, h: 1, rightAngle: true }) as PointDef & { type: "polygon" }, "A", 1.6), marks: [{ type: "right", at: "A", a: "S", b: "D" }, { type: "right", at: "B", a: "A", b: "C" }] }) },
  { id: "chop_binh_hanh", title: "Chóp đáy hình bình hành", label: "S.ABCD", group: "Chóp", spec: () => ({ ...pyramid(poly(SQ, "parallelogram", { a: 1.5, b: 1, angle: 65 }) as PointDef & { type: "polygon" }, "O", 1.2), hide: ["O"] }) },
  { id: "chop_mat_ben", title: "Chóp có mặt bên SAB đều, vuông góc đáy", label: "S.ABCD", group: "Chóp", spec: () => ({ points: [poly(SQ, "square"), { type: "midpoint", id: "H", of: ["A", "B"] }, { type: "above", id: "S", of: "H", height: Math.sqrt(3) / 2 }], bodies: [{ type: "pyramid", base: SQ, apex: "S" }], segments: [["S", "H"]], marks: [{ type: "right", at: "H", a: "S", b: "B" }, { type: "equal", segments: [["S", "A"], ["S", "B"], ["A", "B"]] }] }) },
  { id: "chop_cut", title: "Chóp cụt tứ giác đều", label: "ABCD.A'B'C'D'", group: "Chóp", spec: () => ({ points: [poly(SQ, "square", { a: 1.5 }), { type: "center", id: "O", of: SQ }, { type: "above", id: "S", of: "O", height: 2.2 }, { type: "scale", ids: prime(SQ), of: SQ, center: "S", k: 0.5 }, { type: "center", id: "O'", of: prime(SQ) }], bodies: [{ type: "prism", base: SQ, top: prime(SQ) }], segments: [["O", "O'"]], hide: ["S"] }) },
  { id: "lap_phuong", title: "Hình lập phương", label: "ABCD.A'B'C'D'", group: "Lăng trụ", spec: () => ({ points: [poly(SQ, "square"), prismUp(SQ, 1)], bodies: [{ type: "prism", base: SQ, top: prime(SQ) }] }) },
  { id: "hop_chu_nhat", title: "Hình hộp chữ nhật", label: "ABCD.A'B'C'D'", group: "Lăng trụ", spec: () => ({ points: [poly(SQ, "rectangle", { a: 1.6, b: 1 }), prismUp(SQ, 0.9)], bodies: [{ type: "prism", base: SQ, top: prime(SQ) }] }) },
  { id: "hop_xien", title: "Hình hộp (xiên)", label: "ABCD.A'B'C'D'", group: "Lăng trụ", spec: () => ({ points: [poly(SQ, "parallelogram", { a: 1.5, b: 1, angle: 70 }), prismUp(SQ, 1, [0.35, 0.2])], bodies: [{ type: "prism", base: SQ, top: prime(SQ) }] }) },
  { id: "lang_tru_dung_tam_giac", title: "Lăng trụ đứng, đáy vuông tại B", label: "ABC.A'B'C'", group: "Lăng trụ", spec: () => ({ points: [poly(TRI, "right", { b: 1.3 }), prismUp(TRI, 1.3)], bodies: [{ type: "prism", base: TRI, top: prime(TRI) }], marks: [{ type: "right", at: "B", a: "A", b: "C" }] }) },
  { id: "lang_tru_tam_giac_deu", title: "Lăng trụ tam giác đều", label: "ABC.A'B'C'", group: "Lăng trụ", spec: () => ({ points: [poly(TRI, "equilateral"), prismUp(TRI, 1.3)], bodies: [{ type: "prism", base: TRI, top: prime(TRI) }] }) },
  {
    id: "lang_tru_xien_tam_giac",
    title: "Lăng trụ xiên, A′ chiếu xuống trọng tâm đáy",
    label: "ABC.A'B'C'",
    group: "Lăng trụ",
    spec: () => {
      const base = poly(TRI, "equilateral", { a: 1.2 });
      const [ax, ay] = baseCoord(base, "A");
      return { points: [base, { type: "center", id: "G", of: TRI }, prismUp(TRI, 1.1, [-ax, -ay])], bodies: [{ type: "prism", base: TRI, top: prime(TRI) }], segments: [["A'", "G"]], marks: [{ type: "right", at: "G", a: "A'", b: "B" }] };
    },
  },
  { id: "lang_tru_tu_giac_deu", title: "Lăng trụ tứ giác đều", label: "ABCD.A'B'C'D'", group: "Lăng trụ", spec: () => ({ points: [poly(SQ, "square"), prismUp(SQ, 1.6)], bodies: [{ type: "prism", base: SQ, top: prime(SQ) }] }) },
  { id: "lang_tru_luc_giac_deu", title: "Lăng trụ lục giác đều", label: "ABCDEF.A'B'C'D'E'F'", group: "Lăng trụ", spec: () => ({ points: [poly(["A", "B", "C", "D", "E", "F"], "regular", { a: 0.7 }), prismUp(["A", "B", "C", "D", "E", "F"], 1.3)], bodies: [{ type: "prism", base: ["A", "B", "C", "D", "E", "F"], top: prime(["A", "B", "C", "D", "E", "F"]) }] }) },
  {
    id: "non",
    title: "Hình nón",
    label: "S, O",
    group: "Tròn xoay",
    spec: () => ({ points: [{ type: "coord", id: "O", at: [0, 0, 0] }, { type: "above", id: "S", of: "O", height: 1.7 }, { type: "coord", id: "A", at: [0.9 * Math.cos(-1.1), 0.9 * Math.sin(-1.1), 0] }], bodies: [{ type: "cone", center: "O", apex: "S", radius: 0.9 }], segments: [["S", "O"], ["O", "A"], ["S", "A"]], marks: [{ type: "right", at: "O", a: "S", b: "A" }], view: "ortho" }),
  },
  {
    id: "tru",
    title: "Hình trụ",
    label: "O, O′",
    group: "Tròn xoay",
    spec: () => ({ points: [{ type: "coord", id: "O", at: [0, 0, 0] }, { type: "above", id: "O'", of: "O", height: 1.6 }, { type: "coord", id: "A", at: [0.8 * Math.cos(-1.1), 0.8 * Math.sin(-1.1), 0] }, { type: "above", id: "A'", of: "A", height: 1.6 }], bodies: [{ type: "cylinder", center: "O", top: "O'", radius: 0.8 }], segments: [["O", "O'"], ["O", "A"], ["O'", "A'"], ["A", "A'"]], view: "ortho" }),
  },
  {
    id: "cau",
    title: "Mặt cầu",
    label: "S(O; R)",
    group: "Tròn xoay",
    spec: () => ({ points: [{ type: "coord", id: "O", at: [0, 0, 0] }, { type: "coord", id: "A", at: [Math.cos(-0.6), Math.sin(-0.6), 0] }], bodies: [{ type: "sphere", center: "O", radius: 1 }], segments: [["O", "A"]], view: "ortho" }),
  },
];
export const PRESET_MAP = new Map(PRESETS.map((p) => [p.id, p]));

/** Chế độ chiếu mặc định của một hình: có khối tròn xoay → chiếu vuông góc (elip đáy nằm ngang như SGK). */
export const defaultMode = (spec: ConstructionSpec): ViewMode => spec.view ?? (spec.bodies.some((b) => b.type !== "pyramid" && b.type !== "prism") ? "ortho" : "sgk");

// ---------- hình bảng cũ (P4) ----------
export const LEGACY_KINDS = ["cube", "cuboid", "pyramid4", "pyramid3", "prism3"] as const;
export type LegacyKind = (typeof LEGACY_KINDS)[number];
const LEGACY_NAMES: Record<LegacyKind, string[]> = {
  cube: [...SQ, ...prime(SQ)],
  cuboid: [...SQ, ...prime(SQ)],
  pyramid4: [...SQ, "S"],
  pyramid3: [...TRI, "S"],
  prism3: [...TRI, ...prime(TRI)],
};
export type LegacyState = { kind: string; points: { name: string; a: number; b: number; t: number }[]; section: [string, string, string] | null; angle: [string, string, string] | null };

/** Bảng lưu trước P10b không có `spec`: dựng lại từ loại hình + điểm trên cạnh + thiết diện + góc. */
export function legacySpec(o: LegacyState): ConstructionSpec {
  const kind = (LEGACY_KINDS as readonly string[]).includes(o.kind) ? (o.kind as LegacyKind) : "cube";
  let spec: ConstructionSpec;
  if (kind === "cube") spec = PRESET_MAP.get("lap_phuong")!.spec();
  else if (kind === "cuboid") spec = { points: [poly(SQ, "rectangle", { a: 1.4, b: 1 }), prismUp(SQ, 0.8)], bodies: [{ type: "prism", base: SQ, top: prime(SQ) }] };
  else if (kind === "pyramid4") spec = { ...PRESET_MAP.get("chop_tu_giac_deu")!.spec(), segments: [], marks: [], hide: ["O"] };
  else if (kind === "pyramid3") spec = { ...PRESET_MAP.get("chop_tam_giac_deu")!.spec(), segments: [], marks: [], hide: ["O"] };
  else spec = PRESET_MAP.get("lang_tru_tam_giac_deu")!.spec();
  const names = LEGACY_NAMES[kind];
  for (const p of o.points) {
    const a = names[p.a], b = names[p.b];
    if (a && b && !names.includes(p.name)) spec.points.push({ type: "ratio", id: p.name, from: a, to: b, t: p.t });
  }
  if (o.section) spec.sections = [{ through: o.section }];
  if (o.angle) spec.marks = [...(spec.marks ?? []), { type: "angle", at: o.angle[1], a: o.angle[0], b: o.angle[2] }];
  return spec;
}

export function presetForKind(kind: string): ConstructionSpec {
  return PRESET_MAP.get(kind)?.spec() ?? legacySpec({ kind, points: [], section: null, angle: null });
}
