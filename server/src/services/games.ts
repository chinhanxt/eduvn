import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { findExam, listQuestions } from "../db/repo";
import { games, questions } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { type GameBody, type GameKind, GameKindSchema, GameSource, TimerSchema, buildGame } from "../domain/games";
import type { QuestionInput } from "../domain/question";
import { NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();

export type GameSummary = { id: string; title: string; kind: GameKind; questionCount: number; timerSeconds: number; source: string; updatedAt: string };

export const CreateGameInput = z.object({
  title: z.string().trim().min(1, "Thiếu tên trò chơi (title)").max(120),
  kind: GameKindSchema,
  source: z.unknown(),
  timerSeconds: TimerSchema.optional(),
});

export function createGameService(db: Db) {
  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy trò chơi");
    const [row] = await db.select().from(games).where(and(eq(games.id, id), eq(games.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy trò chơi");
    return row;
  }

  const summary = (r: { id: string; title: string; kind: string; body: GameBody; updatedAt: Date }): GameSummary => ({
    id: r.id,
    title: r.title,
    kind: r.kind as GameKind,
    questionCount: r.body.items.length,
    timerSeconds: r.body.timerSeconds,
    source: r.body.source,
    updatedAt: r.updatedAt.toISOString(),
  });

  async function resolveSource(actor: Actor, raw: unknown): Promise<{ qs: QuestionInput[]; label: string }> {
    const parsed = GameSource.safeParse(raw);
    if (!parsed.success) throw new ValidationError(["Nguồn câu hỏi (source) không hợp lệ: cần { examId, code? } hoặc { questionIds } hoặc bộ lọc { subject, grade, topic?, level?, type?, limit? }"]);
    const s = parsed.data;
    if ("examId" in s) {
      assertCan(actor.role, "exam:read_key");
      const exam = Uuid.safeParse(s.examId).success ? await findExam(db, actor.orgId, s.examId) : null;
      if (!exam) throw new NotFoundError("Không tìm thấy đề");
      const v = s.code ? exam.variants.find((x) => x.code === s.code) : exam.variants[0];
      if (!v) throw new NotFoundError(`Đề không có mã ${s.code}`);
      return { qs: v.items.map((it) => it.question), label: `Đề "${exam.title}" mã ${v.code}` };
    }
    assertCan(actor.role, "question:read");
    if ("questionIds" in s) {
      const ids = s.questionIds.filter((x) => Uuid.safeParse(x).success);
      const rows = ids.length ? await db.select({ id: questions.id, body: questions.body }).from(questions).where(and(eq(questions.orgId, actor.orgId), inArray(questions.id, ids))) : [];
      const byId = new Map(rows.map((r) => [r.id, r.body]));
      const qs = ids.map((id) => byId.get(id)).filter((q): q is QuestionInput => q !== undefined);
      return { qs, label: `${qs.length} câu chọn tay` };
    }
    const rows = await listQuestions(db, actor.orgId, { ...s, limit: s.limit ?? 50 });
    const label = ["Ngân hàng", s.subject, s.grade <= 12 ? `lớp ${s.grade}` : `năm ${s.grade - 12}`, s.topic].filter(Boolean).join(" · ");
    return { qs: rows, label };
  }

  /** Tạo trò chơi: gom câu hỏi, kiểm ≥ 4 câu dùng được, lưu ảnh chụp câu hỏi (không đổi khi ngân hàng đổi). */
  async function create(actor: Actor, raw: unknown): Promise<GameSummary> {
    assertCan(actor.role, "game:manage");
    const p = CreateGameInput.safeParse(raw);
    if (!p.success) throw new ValidationError(p.error.issues.map((i) => `Sai dữ liệu tại "${i.path.join(".") || "gốc"}": ${i.message}`));
    const { qs, label } = await resolveSource(actor, p.data.source);
    const built = buildGame(p.data.kind, qs, { timerSeconds: p.data.timerSeconds, source: label });
    if (!built.ok) throw new ValidationError(built.issues);
    const [row] = await db
      .insert(games)
      .values({ orgId: actor.orgId, ownerId: actor.userId, title: p.data.title, kind: p.data.kind, body: built.body })
      .returning({ id: games.id, updatedAt: games.updatedAt });
    if (!row) throw new Error("game insert: no row");
    return summary({ id: row.id, title: p.data.title, kind: p.data.kind, body: built.body, updatedAt: row.updatedAt });
  }

  async function list(actor: Actor): Promise<GameSummary[]> {
    assertCan(actor.role, "game:read");
    const rows = await db.select().from(games).where(eq(games.orgId, actor.orgId)).orderBy(desc(games.updatedAt));
    return rows.map(summary);
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "game:manage");
    await load(actor.orgId, id);
    await db.delete(games).where(eq(games.id, id));
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadForExport(orgId: string, id: string): Promise<{ title: string; body: GameBody }> {
    const r = await load(orgId, id);
    return { title: r.title, body: r.body };
  }

  async function idFor(actor: Actor, id: string): Promise<string> {
    assertCan(actor.role, "game:read");
    return (await load(actor.orgId, id)).id;
  }

  return { create, list, remove, loadForExport, idFor };
}
export type GameService = ReturnType<typeof createGameService>;
