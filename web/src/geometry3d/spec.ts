// web/src/geometry3d/spec.ts — mô hình dựng hình không gian (phải khớp server/src/domain/geometry3d.ts).
// Toạ độ toán học: x sang phải, y hướng vào trong trang (ra sau), z hướng lên; đơn vị độ dài = a.

export type Vec3 = [number, number, number];
export type Pair = [string, string];
export type Triple = [string, string, string];

/** Hình dạng đáy (đặt trong mặt phẳng z = 0). */
export const BASE_SHAPES = [
  "triangle", // tam giác thường: sides = [AB, BC, CA]
  "equilateral", // tam giác đều cạnh a
  "isosceles", // tam giác cân tại đỉnh `at` (mặc định đỉnh đầu): cạnh bên a, đáy b
  "right", // tam giác vuông tại `at` (mặc định đỉnh giữa): hai cạnh góc vuông a, b
  "square", // hình vuông cạnh a
  "rectangle", // hình chữ nhật AB = a, AD = b
  "rhombus", // hình thoi cạnh a, góc BAD = angle (độ)
  "parallelogram", // hình bình hành AB = a, AD = b, góc BAD = angle
  "trapezoid", // hình thang: đáy lớn AD = a, đáy nhỏ BC = b, chiều cao h (cân), hoặc vuông tại A và B (right_angle)
  "regular", // đa giác đều n = số đỉnh, cạnh a
] as const;
export type BaseShape = (typeof BASE_SHAPES)[number];

export type PointDef =
  | { type: "coord"; id: string; at: Vec3 }
  | { type: "polygon"; ids: string[]; shape: BaseShape; a?: number; b?: number; sides?: [number, number, number]; angle?: number; h?: number; at?: string; rightAngle?: boolean; rotate?: number }
  | { type: "above"; id: string; of: string; height: number }
  | { type: "center"; id: string; of: string[] }
  | { type: "circumcenter"; id: string; of: Triple }
  | { type: "midpoint"; id: string; of: Pair }
  | { type: "ratio"; id: string; from: string; to: string; t: number }
  | { type: "intersect"; id: string; line: Pair; line2?: Pair; plane?: Triple }
  | { type: "foot"; id: string; from: string; line?: Pair; plane?: Triple }
  | { type: "translate"; ids: string[]; of: string[]; vector: Vec3 }
  | { type: "scale"; ids: string[]; of: string[]; center: string; k: number };

export type Body =
  | { type: "pyramid"; base: string[]; apex: string }
  | { type: "prism"; base: string[]; top: string[] }
  | { type: "cone"; center: string; apex: string; radius: number }
  | { type: "cylinder"; center: string; top: string; radius: number }
  | { type: "sphere"; center: string; radius: number };

export type Mark =
  | { type: "right"; at: string; a: string; b: string }
  | { type: "equal"; segments: Pair[]; group?: number }
  | { type: "angle"; at: string; a: string; b: string; label?: string; value?: boolean };

export type Measure =
  | { type: "length"; of: Pair }
  | { type: "distance"; from: string; to?: string; line?: Pair; plane?: Triple; foot?: string }
  | { type: "distance_lines"; lines: [Pair, Pair]; feet?: Pair }
  | { type: "angle_line_plane"; line: Pair; plane: Triple; foot?: string }
  | { type: "angle_planes"; planes: [Triple, Triple]; feet?: Pair }
  | { type: "angle_lines"; lines: [Pair, Pair] };

export type ViewMode = "sgk" | "ortho";

export type ConstructionSpec = {
  title?: string;
  points: PointDef[];
  bodies: Body[];
  segments?: Pair[];
  polygons?: string[][];
  sections?: { through: Triple }[];
  marks?: Mark[];
  measures?: Measure[];
  hide?: string[];
  view?: ViewMode;
};

export const LIMITS = { points: 60, bodies: 3, segments: 40, polygons: 8, sections: 3, marks: 30, measures: 8 } as const;
export const POINT_NAME = /^[A-Z][0-9]?['′]{0,2}$/;

/** Tên điểm do định nghĩa sinh ra. */
export const definedIds = (p: PointDef): string[] => ("ids" in p ? p.ids : [p.id]);

/** Tên điểm một định nghĩa tham chiếu tới. */
export function refsOf(p: PointDef): string[] {
  switch (p.type) {
    case "coord":
    case "polygon":
      return [];
    case "above":
      return [p.of];
    case "center":
      return p.of;
    case "circumcenter":
    case "midpoint":
      return p.of;
    case "ratio":
      return [p.from, p.to];
    case "intersect":
      return [...p.line, ...(p.line2 ?? []), ...(p.plane ?? [])];
    case "foot":
      return [p.from, ...(p.line ?? []), ...(p.plane ?? [])];
    case "translate":
      return p.of;
    case "scale":
      return [...p.of, p.center];
  }
}
