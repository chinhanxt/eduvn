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
