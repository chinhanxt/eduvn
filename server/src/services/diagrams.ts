// server/src/services/diagrams.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { diagrams } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { AI_MAX_NODES, type AiDiagram, type DiagramDoc, parseAiDiagram, validateDiagram } from "../domain/diagram";
import { AiUnavailableError, NotFoundError, ValidationError } from "../errors";
import { type Ai, parseAiJson } from "./ai";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type DiagramSummary = { id: string; title: string; subject: string; grade: number; topic: string; kind: "mind" | "flow"; nodeCount: number; updatedAt: string };

type Row = { id: string; title: string; subject: string; grade: number; topic: string; body: DiagramDoc; updatedAt: Date };
type ListRow = Omit<Row, "body"> & { kind: "mind" | "flow"; nodeCount: number };
const summary = (r: Row | ListRow): DiagramSummary => ({
  id: r.id, title: r.title, subject: r.subject, grade: r.grade, topic: r.topic,
  kind: "body" in r ? r.body.kind : r.kind,
  nodeCount: "body" in r ? r.body.nodes.length : Number(r.nodeCount),
  updatedAt: r.updatedAt.toISOString(),
});

const AiReq = z.object({
  topic: z.string().trim().min(1, "Nhập chủ đề").max(300),
  kind: z.enum(["mind", "flow"]).default("mind"),
  subject: z.string().trim().max(60).default(""),
  grade: z.number().int().min(1).max(16).optional(),
  /** Sơ đồ công thức: mỗi nút lá là một công thức LaTeX, nhóm theo nhánh. */
  formulas: z.boolean().default(false),
});

export function createDiagramService(db: Db, ai: Ai) {
  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy sơ đồ");
    const [row] = await db.select().from(diagrams).where(and(eq(diagrams.id, id), eq(diagrams.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy sơ đồ");
    return row;
  }

  async function create(actor: Actor, raw: unknown): Promise<DiagramSummary> {
    assertCan(actor.role, "board:manage");
    const v = validateDiagram(raw, "create");
    if (!v.ok) throw new ValidationError(v.issues);
    const { doc, ...m } = v.diagram;
    const [row] = await db.insert(diagrams).values({ ...m, body: doc, orgId: actor.orgId, ownerId: actor.userId }).returning();
    if (!row) throw new Error("diagram insert: no row");
    return summary(row);
  }

  async function save(actor: Actor, id: string, raw: unknown): Promise<DiagramSummary> {
    assertCan(actor.role, "board:manage");
    const v = validateDiagram(raw, "save");
    if (!v.ok) throw new ValidationError(v.issues);
    await load(actor.orgId, id);
    const { doc, ...m } = v.diagram;
    const [row] = await db.update(diagrams).set({ ...m, body: doc, updatedAt: new Date() }).where(eq(diagrams.id, id)).returning();
    if (!row) throw new Error("diagram update: no row");
    return summary(row);
  }

  async function list(actor: Actor): Promise<DiagramSummary[]> {
    assertCan(actor.role, "board:read");
    const rows = await db
      .select({ id: diagrams.id, title: diagrams.title, subject: diagrams.subject, grade: diagrams.grade, topic: diagrams.topic, updatedAt: diagrams.updatedAt, kind: sql<"mind" | "flow">`${diagrams.body}->>'kind'`, nodeCount: sql<number>`jsonb_array_length(${diagrams.body}->'nodes')` })
      .from(diagrams)
      .where(eq(diagrams.orgId, actor.orgId))
      .orderBy(desc(diagrams.updatedAt));
    return rows.map(summary);
  }

  async function get(actor: Actor, id: string): Promise<DiagramSummary & { doc: DiagramDoc }> {
    assertCan(actor.role, "board:read");
    const r = await load(actor.orgId, id);
    return { ...summary(r), doc: r.body };
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "board:manage");
    await load(actor.orgId, id);
    await db.delete(diagrams).where(eq(diagrams.id, id));
  }

  /** AI dựng nút + nối từ chủ đề; web tự layout. */
  async function draw(actor: Actor, raw: unknown): Promise<AiDiagram> {
    assertCan(actor.role, "board:manage");
    const r = AiReq.safeParse(raw);
    if (!r.success) throw new ValidationError(r.error.issues.map((i) => i.message));
    const q = r.data;
    const ctx = [q.subject && `môn ${q.subject}`, q.grade && `lớp ${q.grade}`].filter(Boolean).join(", ");
    const shape =
      q.kind === "mind"
        ? "Sơ đồ tư duy: nút gốc (parent=null) là chủ đề, các nhánh có parent là id nút cha, tối đa 3 tầng; links để rỗng hoặc chỉ vài liên hệ chéo."
        : "Lưu đồ: các bước nối bằng links theo thứ tự thực hiện, rẽ nhánh dùng nhãn \"Có\"/\"Không\"; parent luôn null.";
    const formula = q.formulas
      ? `Đây là SƠ ĐỒ CÔNG THỨC: nút gốc là chủ đề; 3–6 nhánh cấp 1 là các nhóm công thức (tên nhóm ngắn, không công thức); mỗi nút lá là ĐÚNG MỘT công thức chuẩn SGK viết LaTeX trong $…$, có thể kèm tên rất ngắn phía trước (vd "Nhân đôi: $\\sin 2a=2\\sin a\\cos a$"). Phân số dùng \\dfrac, căn dùng \\sqrt, không dùng \\begin hay \\text. Công thức phải đúng toán học, đủ các công thức trọng tâm của chủ đề.\n`
      : "";
    const prompt = `Vẽ ${q.kind === "mind" ? "sơ đồ tư duy" : "lưu đồ"} tiếng Việt có dấu về: ${q.topic}${ctx ? ` (${ctx})` : ""}.\n${formula}${shape}\nBỏ qua định dạng mặc định; CHỈ trả JSON đúng dạng {"nodes":[{"id":"n1","label":"...","parent":null}],"links":[{"from":"n1","to":"n2","label":""}]}. Tối đa ${AI_MAX_NODES} nút, chữ ngắn gọn, công thức viết LaTeX trong $…$.`;
    const text = await ai.chat("so_do_tu_duy", [{ role: "user", content: prompt }], { json: true });
    let parsed: unknown;
    try {
      parsed = parseAiJson(text);
    } catch {
      throw new AiUnavailableError("AI trả về không phải JSON, thử lại");
    }
    const out = parseAiDiagram(parsed, q.kind);
    if (!out.ok) throw new AiUnavailableError(`${out.error}, thử lại`);
    return out.diagram;
  }

  return { create, save, list, get, remove, draw };
}
export type DiagramService = ReturnType<typeof createDiagramService>;
