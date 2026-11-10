import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { SceneOutline } from "@openmaic/generation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../../db/client";
import { type AiLessonProgress, type AiLessonRequest, aiLessons, lessonPlans } from "../../db/schema";
import { type Role, assertCan } from "../../domain/authz";
import { type StoredQuestion, QuestionInput } from "../../domain/question";
import { AiUnavailableError, NotFoundError, ValidationError } from "../../errors";
import { type Ai, disabledAi } from "../ai";
import { type GenDeps, audioDirOf, buildScene, generateLesson } from "./generate";
import { lessonPlanText } from "./material";
import { type Tts, disabledTts } from "./tts";
import type { StoredScene } from "./types";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();
const MAX_JOBS = 2;

export type AiLessonsCfg = { dataDir: string; tts?: Tts; taskOverrides?: Record<string, string>; chromePath?: string; sceneConcurrency?: number; markStaleOnStart?: boolean };

export const CreateInput = z.object({
  requirement: z.string().trim().min(3, "Hãy mô tả bài giảng cần soạn").max(2000),
  subject: z.string().trim().max(60).optional(),
  grade: z.number().int().min(1).max(16).optional(),
  sceneCount: z.number().int().min(3).max(12).optional(),
  lessonPlanId: z.uuid().optional(),
  materialText: z.string().max(60_000).optional(),
  materialName: z.string().max(200).optional(),
});

export type AiLessonSummary = { id: string; title: string; subject: string; grade: number | null; status: string; progress: AiLessonProgress; sceneCount: number; updatedAt: string };

export type SaveQuizResult = { saved: number; skipped: string[]; ids: string[] };

export function createAiLessonService(db: Db, ai: Ai | undefined, cfg: AiLessonsCfg) {
  const tts = cfg.tts ?? disabledTts;
  const queue: string[] = [];
  const running = new Set<string>();

  async function load(orgId: string, id: string) {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài giảng");
    const [row] = await db.select().from(aiLessons).where(and(eq(aiLessons.id, id), eq(aiLessons.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy bài giảng");
    return row;
  }

  const summary = (r: typeof aiLessons.$inferSelect): AiLessonSummary => ({
    id: r.id,
    title: r.title,
    subject: r.subject,
    grade: r.grade,
    status: r.status,
    progress: r.progress,
    sceneCount: r.scenes.length,
    updatedAt: r.updatedAt.toISOString(),
  });

  const patch = (id: string, v: Partial<typeof aiLessons.$inferInsert>) => db.update(aiLessons).set({ ...v, updatedAt: new Date() }).where(eq(aiLessons.id, id));

  function depsFor(id: string): GenDeps {
    if (!ai) throw new Error("Chưa bật cổng AI");
    return { ai, tts, audioDir: audioDirOf(cfg.dataDir, id), taskOverrides: cfg.taskOverrides, sceneConcurrency: cfg.sceneConcurrency };
  }

  async function runJob(id: string): Promise<void> {
    const [row] = await db.select().from(aiLessons).where(eq(aiLessons.id, id));
    if (!row) return;
    await patch(id, { status: "running", progress: { ...row.progress, error: undefined, stage: "Đang bắt đầu" } });
    const state = { outline: (row.outline as SceneOutline[] | null) ?? null, scenes: row.scenes as StoredScene[] };
    try {
      await mkdir(audioDirOf(cfg.dataDir, id), { recursive: true });
      const r = await generateLesson(depsFor(id), row.request, state, {
        onProgress: async (p) => void (await patch(id, { progress: p })),
        onOutline: async (outline, title) => void (await patch(id, { outline, ...(title && { title: title.slice(0, 200) }) })),
        onScene: async (scenes) => void (await patch(id, { scenes })),
      }, id);
      const total = state.outline?.length ?? 0;
      if (state.scenes.length === 0) throw new Error(r.failed[0] ?? "Không soạn được cảnh nào");
      await patch(id, { status: "done", progress: { done: state.scenes.length, total, stage: "Hoàn tất", failed: r.failed } });
    } catch (e) {
      const cur = (await db.select().from(aiLessons).where(eq(aiLessons.id, id)))[0];
      await patch(id, { status: "error", progress: { done: cur?.progress.done ?? 0, total: cur?.progress.total ?? 0, stage: "Lỗi", error: (e as Error).message } });
    }
  }

  function pump(): void {
    while (running.size < MAX_JOBS && queue.length > 0) {
      const id = queue.shift() as string;
      running.add(id);
      void runJob(id).finally(() => {
        running.delete(id);
        pump();
      });
    }
  }

  function enqueue(id: string): void {
    if (running.has(id) || queue.includes(id)) return;
    queue.push(id);
    pump();
  }

  /** Chờ hết việc nền (dùng cho test). */
  async function idle(): Promise<void> {
    while (running.size > 0 || queue.length > 0) await new Promise((r) => setTimeout(r, 10));
  }

  /** Khởi động lại máy chủ: việc đang chạy dở coi như lỗi, cho phép "sinh tiếp". */
  async function markStale(): Promise<number> {
    const rows = await db.select().from(aiLessons).where(inArray(aiLessons.status, ["queued", "running"]));
    for (const r of rows) await patch(r.id, { status: "error", progress: { ...r.progress, stage: "Lỗi", error: "Máy chủ khởi động lại khi đang soạn — bấm \"Sinh tiếp\"" } });
    return rows.length;
  }

  async function create(actor: Actor, input: unknown): Promise<{ id: string }> {
    assertCan(actor.role, "ailesson:manage");
    if (!ai || ai === disabledAi) throw new AiUnavailableError("Chưa bật cổng AI (đặt GATEWAY_URL và GATEWAY_TOKEN)");
    const p = CreateInput.parse(input);
    let subject = p.subject ?? "";
    let grade = p.grade ?? null;
    const request: AiLessonRequest = { requirement: p.requirement, sceneCount: p.sceneCount, materialText: p.materialText, materialName: p.materialName };
    if (p.lessonPlanId) {
      assertCan(actor.role, "lesson:read");
      const [lp] = await db.select().from(lessonPlans).where(and(eq(lessonPlans.id, p.lessonPlanId), eq(lessonPlans.orgId, actor.orgId)));
      if (!lp) throw new NotFoundError("Không tìm thấy giáo án");
      request.lessonPlanId = lp.id;
      request.materialText = [`Giáo án: ${lp.title}`, lessonPlanText(lp.body), p.materialText].filter(Boolean).join("\n\n").slice(0, 60_000);
      subject ||= lp.subject;
      grade ??= lp.grade;
    }
    const [row] = await db
      .insert(aiLessons)
      .values({ orgId: actor.orgId, ownerId: actor.userId, title: p.requirement.slice(0, 80), subject, grade, status: "queued", progress: { done: 0, total: 0, stage: "Đang chờ" }, request })
      .returning({ id: aiLessons.id });
    if (!row) throw new Error("ai_lessons insert: no row");
    enqueue(row.id);
    return { id: row.id };
  }

  async function list(actor: Actor): Promise<AiLessonSummary[]> {
    assertCan(actor.role, "ailesson:read");
    const rows = await db.select().from(aiLessons).where(eq(aiLessons.orgId, actor.orgId)).orderBy(desc(aiLessons.updatedAt));
    return rows.map(summary);
  }

  async function status(actor: Actor, id: string) {
    assertCan(actor.role, "ailesson:read");
    const r = await load(actor.orgId, id);
    return { status: r.status, done: r.progress.done, total: r.progress.total, stage: r.progress.stage, ...(r.progress.error && { error: r.progress.error }), failed: r.progress.failed ?? [] };
  }

  async function get(actor: Actor, id: string) {
    assertCan(actor.role, "ailesson:read");
    const r = await load(actor.orgId, id);
    return { ...summary(r), outline: r.outline, scenes: r.scenes as StoredScene[], request: { requirement: r.request.requirement, materialName: r.request.materialName } };
  }

  async function resume(actor: Actor, id: string): Promise<{ id: string }> {
    assertCan(actor.role, "ailesson:manage");
    const r = await load(actor.orgId, id);
    if (r.status === "running" || r.status === "queued") return { id };
    await patch(id, { status: "queued", progress: { ...r.progress, stage: "Đang chờ", error: undefined } });
    enqueue(id);
    return { id };
  }

  const Edit = z.object({ title: z.string().trim().min(1).max(200).optional(), scenes: z.array(z.looseObject({ id: z.string(), type: z.string(), title: z.string() })).max(60).optional() });

  /** Lưu sửa nhanh: đổi tiêu đề, danh sách/thứ tự/nội dung cảnh (xoá, thêm, sửa chữ, kéo vị trí đều là sửa JSON cảnh). */
  async function save(actor: Actor, id: string, body: unknown) {
    assertCan(actor.role, "ailesson:manage");
    const r = await load(actor.orgId, id);
    const b = Edit.parse(body);
    const scenes = b.scenes ? (b.scenes.map((s, i) => ({ ...s, order: i + 1 })) as unknown as StoredScene[]) : undefined;
    await patch(id, { ...(b.title && { title: b.title }), ...(scenes && { scenes }) });
    return { ok: true, sceneCount: scenes?.length ?? r.scenes.length };
  }

  async function regenerate(actor: Actor, id: string, sceneId: string, directive?: string): Promise<StoredScene> {
    assertCan(actor.role, "ailesson:manage");
    const r = await load(actor.orgId, id);
    const scenes = r.scenes as StoredScene[];
    const idx = scenes.findIndex((s) => s.id === sceneId);
    if (idx < 0) throw new NotFoundError("Không tìm thấy cảnh");
    const old = scenes[idx] as StoredScene;
    const outline = ((r.outline ?? []) as SceneOutline[]).find((o) => o.id === old.outlineId);
    if (!outline) throw new ValidationError(["Cảnh này không còn dàn ý gốc để sinh lại"]);
    const fresh = await buildScene(depsFor(id), outline, (r.outline ?? []) as SceneOutline[], id, { directive: directive?.slice(0, 500) });
    if (!fresh) throw new ValidationError(["AI không dựng được lại cảnh"]);
    const next = scenes.map((s, i) => (i === idx ? { ...fresh, id: old.id, order: old.order } : s));
    await patch(id, { scenes: next });
    return next[idx] as StoredScene;
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "ailesson:manage");
    await load(actor.orgId, id);
    await db.delete(aiLessons).where(eq(aiLessons.id, id));
    await rm(path.join(cfg.dataDir, "ai-lessons", id), { recursive: true, force: true });
  }

  /** Đường dẫn file media đã kiểm tra (chống ../). */
  async function mediaPath(actor: Actor, id: string, kind: "audio" | "video", file: string): Promise<string> {
    assertCan(actor.role, "ailesson:read");
    await load(actor.orgId, id);
    if (!/^[\w-]+\.(mp3|mp4|srt)$/.test(file)) throw new NotFoundError("Không có tệp này");
    return path.join(cfg.dataDir, "ai-lessons", id, kind, file);
  }

  async function loadForExport(actor: Actor, id: string) {
    assertCan(actor.role, "ailesson:read");
    const r = await load(actor.orgId, id);
    return { title: r.title, subject: r.subject, grade: r.grade, scenes: r.scenes as StoredScene[], dir: path.join(cfg.dataDir, "ai-lessons", id) };
  }

  /** Quiz của cảnh → ngân hàng câu hỏi. Trắc nghiệm 4 phương án → mcq; tự luận ngắn → short_answer. */
  async function saveQuiz(actor: Actor, id: string, sceneId: string, body: unknown, addQuestion: (a: Actor, q: unknown) => Promise<StoredQuestion>): Promise<SaveQuizResult> {
    assertCan(actor.role, "question:write");
    assertCan(actor.role, "ailesson:read");
    const r = await load(actor.orgId, id);
    const scene = (r.scenes as StoredScene[]).find((s) => s.id === sceneId);
    if (!scene || scene.type !== "quiz") throw new NotFoundError("Không tìm thấy cảnh quiz");
    const o = z.object({ subject: z.string().trim().min(1).optional(), grade: z.number().int().min(1).max(16).optional(), topic: z.string().trim().min(1).optional(), level: z.enum(["NB", "TH", "VD"]).default("TH") }).parse(body ?? {});
    const subject = o.subject ?? r.subject;
    const grade = o.grade ?? r.grade;
    if (!subject || !grade) throw new ValidationError(["Cần chọn môn và lớp để lưu vào ngân hàng"]);
    const topic = o.topic ?? scene.title;
    const qs = (scene.content as { questions: { type: string; question: string; options?: { value: string; label: string }[]; answer?: string[]; analysis?: string }[] }).questions;
    const saved: string[] = [];
    const skipped: string[] = [];
    for (const [i, q] of qs.entries()) {
      const base = { subject, grade, topic, level: o.level, stem: q.question, explanation: q.analysis || undefined, tags: ["bai-giang-ai"] };
      let input: unknown;
      if (q.type === "single" && q.options?.length === 4 && q.answer?.[0] !== undefined) {
        const ai_ = q.options.findIndex((x) => x.value === q.answer?.[0]);
        input = ai_ < 0 ? null : { ...base, type: "mcq", options: q.options.map((x) => x.label), answer: ai_ };
      } else if (q.type === "short_answer") {
        input = q.answer?.[0] ? { ...base, type: "short_answer", answer: q.answer[0] } : q.analysis ? { ...base, type: "essay", rubric: q.analysis, points: 1 } : null;
      } else input = null;
      const parsed = input ? QuestionInput.safeParse(input) : null;
      if (!parsed?.success) {
        skipped.push(`Câu ${i + 1}: ${q.type === "multiple" ? "nhiều đáp án — chưa hỗ trợ" : q.type === "single" && q.options?.length !== 4 ? "trắc nghiệm cần đúng 4 phương án" : "thiếu đáp án hoặc công thức lỗi"}`);
        continue;
      }
      saved.push((await addQuestion(actor, parsed.data)).id);
    }
    return { saved: saved.length, skipped, ids: saved };
  }

  return { create, list, status, get, resume, save, regenerate, remove, mediaPath, loadForExport, saveQuiz, markStale, idle, enqueue, cfg };
}

export type AiLessonService = ReturnType<typeof createAiLessonService>;
