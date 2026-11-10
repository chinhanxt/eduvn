// server/src/domain/board.ts
import { z } from "zod";
import { ConstructionSpecSchema } from "./geometry3d";

/** Bảng giảng: tài liệu JSON nhiều trang (nét bút / đồ thị / hình khối, toạ độ bảng 1280×720).
 *  Server chỉ kiểm cấu trúc + giới hạn; hình học và đồ thị tính ở trình duyệt (web/src/board). */
/** Loại hình cũ (P4); từ P10b kind là mã hình mẫu bất kỳ ("chop_vuong_sa", "ai"…) và hình vẽ theo `spec`. */
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
  kind: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, "Mã loại hình không hợp lệ"),
  cx: Num,
  cy: Num,
  size: z.number().min(60).max(600),
  th: Num,
  ph: Num,
  points: z.array(z.object({ name: PtName, a: z.number().int().min(0).max(11), b: z.number().int().min(0).max(11), t: z.number().min(0).max(1) })).max(12, "Tối đa 12 điểm dựng thêm"),
  section: Tri.nullable(),
  angle: Tri.nullable(),
  spec: ConstructionSpecSchema.optional(),
  mode: z.enum(["sgk", "ortho"]).optional(),
  print: z.boolean().optional(),
});
export const SHAPE_KINDS = ["line", "arrow", "rect", "triangle", "circle", "polygon"] as const;
const Shape = z.object({
  type: z.literal("shape"),
  id: Id,
  kind: z.enum(SHAPE_KINDS),
  color: Color,
  width: z.number().min(1).max(20),
  fill: z.boolean(),
  // line/arrow/rect/triangle/circle: [x1,y1,x2,y2] (khung bao); polygon: danh sách đỉnh [x,y,…]
  pts: z.array(Num).min(4).max(48, "Đa giác tối đa 24 đỉnh"),
});
const Text = z.object({
  type: z.literal("text"),
  id: Id,
  x: Num,
  y: Num,
  size: z.number().min(14).max(120),
  color: Color,
  text: z.string().min(1).max(500, "Chữ trên bảng tối đa 500 ký tự"),
});
const BoardObj = z.discriminatedUnion("type", [Stroke, Graph, Solid, Shape, Text]);
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
