// server/src/domain/diagram.ts
import { z } from "zod";

/** Sơ đồ tư duy / lưu đồ: tài liệu JSON (toạ độ tự do). Server chỉ kiểm cấu trúc + giới hạn;
 *  layout, định tuyến đường nối và đặt chữ tính ở trình duyệt (web/src/diagram). */
export const SHAPES = ["rect", "round", "ellipse", "diamond", "parallelogram", "cloud", "pill"] as const;
export const MAX_NODES = 300;
export const MAX_EDGES = 500;
export const MAX_IMAGE_BYTES = 300 * 1024;

const Id = z.string().min(1).max(40);
const Num = z.number().finite().min(-100000).max(100000);
const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Màu phải dạng #rrggbb");
const Image = z
  .string()
  .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Ảnh phải là data URL png/jpeg/webp")
  .refine((s) => Math.floor((s.length * 3) / 4) <= MAX_IMAGE_BYTES, "Mỗi ảnh tối đa 300 KB");

const DNode = z.object({
  id: Id,
  x: Num,
  y: Num,
  w: z.number().finite().min(20).max(2000),
  h: z.number().finite().min(20).max(2000),
  shape: z.enum(SHAPES),
  label: z.string().max(500, "Chữ trong hình tối đa 500 ký tự"),
  color: Color,
  parent: Id.nullish(),
  image: Image.optional(),
});
const DEdge = z.object({
  id: Id,
  from: Id,
  to: Id,
  label: z.string().max(200).optional(),
  dashed: z.boolean().optional(),
  kind: z.enum(["tree", "link"]),
});
export const DiagramDocSchema = z
  .object({
    version: z.literal(1),
    kind: z.enum(["mind", "flow"]),
    nodes: z.array(DNode).max(MAX_NODES, `Tối đa ${MAX_NODES} hình`),
    edges: z.array(DEdge).max(MAX_EDGES, `Tối đa ${MAX_EDGES} đường nối`),
  })
  .superRefine((d, ctx) => {
    const ids = new Set(d.nodes.map((n) => n.id));
    if (ids.size !== d.nodes.length) ctx.addIssue({ code: "custom", message: "Mã hình bị trùng" });
    for (const e of d.edges) if (!ids.has(e.from) || !ids.has(e.to)) ctx.addIssue({ code: "custom", message: `Đường nối ${e.id} trỏ tới hình không có` });
  });
export type DiagramDoc = z.infer<typeof DiagramDocSchema>;

const meta = {
  title: z.string().trim().normalize("NFC").min(1, "Thiếu tên sơ đồ").max(120),
  subject: z.string().trim().normalize("NFC").min(1, "Thiếu môn").max(60),
  grade: z.number().int().min(1).max(16),
  topic: z.string().trim().normalize("NFC").max(120).default(""),
};
const SaveSchema = z.object({ ...meta, doc: DiagramDocSchema });
const CreateSchema = z.object({ ...meta, doc: DiagramDocSchema.optional() });
export type DiagramInput = z.infer<typeof SaveSchema>;

export const emptyDiagramDoc = (kind: "mind" | "flow" = "mind"): DiagramDoc => ({ version: 1, kind, nodes: [], edges: [] });

export function validateDiagram(raw: unknown, mode: "create" | "save"): { ok: true; diagram: DiagramInput } | { ok: false; issues: string[] } {
  const r = (mode === "create" ? CreateSchema : SaveSchema).safeParse(raw);
  if (!r.success) return { ok: false, issues: r.error.issues.map((i) => `Sai dữ liệu tại "${i.path.join(".") || "gốc"}": ${i.message}`) };
  return { ok: true, diagram: { ...r.data, doc: r.data.doc ?? emptyDiagramDoc() } };
}

/** Kết quả AI vẽ sơ đồ: web tự layout. */
export const AI_MAX_NODES = 40;
const AiId = z.union([z.string(), z.number()]).transform((v) => String(v).slice(0, 40)).pipe(z.string().min(1));
const AiNode = z.object({ id: AiId, label: z.string().trim().min(1).transform((v) => v.slice(0, 500)), parent: AiId.nullish() });
const AiResultSchema = z.object({
  nodes: z.array(AiNode).min(1).max(AI_MAX_NODES),
  links: z.array(z.object({ from: AiId, to: AiId, label: z.string().nullish().transform((v) => v?.slice(0, 200) || undefined) })).max(AI_MAX_NODES * 2).default([]),
});
export type AiDiagram = z.infer<typeof AiResultSchema>;

type Tree = { text?: unknown; children?: unknown };
/** Nhận cả dạng {nodes,links} lẫn dạng cây mặc định của tác vụ so_do_tu_duy ({root:{text,children}}). */
export function parseAiDiagram(raw: unknown, kind: "mind" | "flow" = "mind"): { ok: true; diagram: AiDiagram } | { ok: false; error: string } {
  let v = raw;
  const root = (raw as { root?: Tree } | null)?.root;
  if (root && typeof root === "object" && !Array.isArray((raw as { nodes?: unknown }).nodes)) {
    const nodes: { id: string; label: string; parent: string | null }[] = [];
    const walk = (t: Tree, parent: string | null) => {
      if (nodes.length >= AI_MAX_NODES || typeof t.text !== "string") return;
      const id = `a${nodes.length + 1}`;
      nodes.push({ id, label: t.text, parent });
      if (Array.isArray(t.children)) for (const c of t.children) if (c && typeof c === "object") walk(c as Tree, id);
    };
    walk(root, null);
    // lưu đồ: các nút theo thứ tự duyệt cây nối thành chuỗi bước
    v = kind === "flow" ? { nodes: nodes.map((n) => ({ ...n, parent: null })), links: nodes.slice(1).map((n, i) => ({ from: nodes[i]!.id, to: n.id })) } : { nodes, links: [] };
  }
  const o = v as { nodes?: unknown; links?: unknown; edges?: unknown } | null;
  if (o && Array.isArray(o.nodes)) {
    // chịu vài cách đặt tên khác của model
    const pick = (x: Record<string, unknown>, ...ks: string[]) => ks.map((k) => x[k]).find((y) => y !== undefined);
    const arr = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is Record<string, unknown> => !!i && typeof i === "object") : []);
    v = {
      nodes: arr(o.nodes).map((n) => ({ id: n.id, label: pick(n, "label", "text", "name", "title"), parent: pick(n, "parent", "parentId") })),
      links: arr(o.links ?? o.edges).map((l) => ({ from: pick(l, "from", "source"), to: pick(l, "to", "target"), label: pick(l, "label", "text") })),
    };
  }
  const r = AiResultSchema.safeParse(v);
  if (!r.success) return { ok: false, error: "AI trả sơ đồ sai định dạng" };
  const ids = new Set(r.data.nodes.map((n) => n.id));
  if (ids.size !== r.data.nodes.length) return { ok: false, error: "AI trả mã hình bị trùng" };
  return {
    ok: true,
    diagram: {
      nodes: r.data.nodes.map((n) => ({ ...n, parent: kind === "mind" && n.parent && ids.has(n.parent) && n.parent !== n.id ? n.parent : null })),
      links: r.data.links.filter((l) => ids.has(l.from) && ids.has(l.to) && l.from !== l.to),
    },
  };
}
