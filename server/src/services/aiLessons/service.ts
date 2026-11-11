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
import { type Ai, disabledAi, parseAiJson } from "../ai";
import { foreignNumbers, lessonFacts, slideText as factSlideText, speechText } from "../../domain/lessonFacts";
import { quizVoiceLines } from "../../export/aiLessonTimeline";
import type { QuizQ } from "../../export/slideHtml";
import { type GenDeps, audioDirOf, buildScene, fillMissingAudio, generateLesson } from "./generate";
import { lessonPlanText } from "./material";
import { estimateMs } from "./types";
import { type AnimService, AnimSpec, TEMPLATES, type TemplateName } from "../anim";
import { prefilter } from "../anim/catalog";
import { type Tts, disabledTts } from "./tts";
import type { SceneAnim, StoredAction, StoredScene } from "./types";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();
const MAX_JOBS = 2;

export type AiLessonsCfg = { dataDir: string; tts?: Tts; anim?: AnimService; taskOverrides?: Record<string, string>; chromePath?: string; sceneConcurrency?: number; markStaleOnStart?: boolean };

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

  function depsFor(id: string, row?: { subject: string; grade: number | null }): GenDeps {
    if (!ai) throw new Error("Chưa bật cổng AI");
    return { ai, tts, audioDir: audioDirOf(cfg.dataDir, id), taskOverrides: cfg.taskOverrides, sceneConcurrency: cfg.sceneConcurrency, subject: row?.subject || null, grade: row?.grade ?? null };
  }

  async function runJob(id: string): Promise<void> {
    const [row] = await db.select().from(aiLessons).where(eq(aiLessons.id, id));
    if (!row) return;
    await patch(id, { status: "running", progress: { ...row.progress, error: undefined, stage: "Đang bắt đầu" } });
    const state = { outline: (row.outline as SceneOutline[] | null) ?? null, scenes: row.scenes as StoredScene[] };
    try {
      await mkdir(audioDirOf(cfg.dataDir, id), { recursive: true });
      const r = await generateLesson(depsFor(id, row), row.request, state, {
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
    while (running.size > 0 || queue.length > 0 || animJobs.size > 0) await new Promise((r) => setTimeout(r, 10));
  }

  // ---- Hoạt hình toán: AI chọn mẫu + tham số; máy dựng bằng mẫu cố định (Manim/HyperFrames) ----
  const animJobs = new Set<Promise<void>>();

  /** Cập nhật hoạt hình của 1 cảnh (đọc-sửa-ghi để không đè các sửa khác). */
  async function patchAnim(lessonId: string, sceneId: string, hash: string, next: SceneAnim | null): Promise<void> {
    const [row] = await db.select().from(aiLessons).where(eq(aiLessons.id, lessonId));
    if (!row) return;
    const scenes = (row.scenes as StoredScene[]).map((sc) => {
      if (sc.id !== sceneId || (hash && sc.animation?.hash !== hash)) return sc;
      if (next === null) {
        const { animation: _drop, ...rest } = sc;
        return rest as StoredScene;
      }
      return { ...sc, animation: next };
    });
    await patch(lessonId, { scenes });
  }

  function speechMs(sc: StoredScene): number {
    return (sc.actions ?? []).reduce((n, a) => n + (a.type === "speech" ? ((a as { durationMs?: number }).durationMs ?? estimateMs(a.text)) : 0), 0);
  }

  const slideText = (sc: StoredScene): string => factSlideText(sc.content).slice(0, 1500);

  /** AI chọn hoạt hình: bước 1 lọc sơ bộ tất định (môn, lớp, từ khoá) còn ≤6 mẫu → bước 2 hỏi AI kèm dữ kiện của cả bài.
   *  Độ tin cậy < 0,6 hoặc sai zod → thử lại kèm lý do; số trong tham số không có trong bài (không suy ra được) → chọn lại 1 lần, vẫn lệch thì bỏ. */
  async function proposeAnim(sc: StoredScene, seconds: number, subject: string, grade: number | null, all: StoredScene[] = [sc], requirement = ""): Promise<{ spec: Record<string, unknown>; reason?: string; confidence?: number }> {
    if (!ai) throw new AiUnavailableError("Chưa bật cổng AI");
    const task = cfg.taskOverrides?.hoat_hinh_toan ?? "hoat_hinh_toan";
    const speech = (sc.actions ?? []).flatMap((a) => (a.type === "speech" ? [a.text] : [])).join(" ").slice(0, 2500);
    const cands = prefilter({ subject, grade, title: sc.title, slideText: slideText(sc), speech });
    if (cands.length === 0) throw new ValidationError(["Cảnh này chưa có mẫu hoạt hình nào hợp (không trúng từ khoá môn/chủ đề). Bạn có thể chọn mẫu thủ công."]);
    const list = cands.map(({ entry: e }) => `### ${e.id} — ${e.ten}\nDùng khi: ${e.dungKhi}\nKhông dùng khi: ${e.khongDungKhi}\nThamSo: ${e.thamSo}\nVí dụ params: ${JSON.stringify(e.viDu)}`).join("\n\n");
    const facts = lessonFacts(all, sc.order);
    // kiểm số trên TOÀN bài (đề bài + mọi cảnh: chữ slide, lời giảng, lời giải quiz) — cảnh đầu cũng được dùng số của các cảnh sau
    const lessonText = [requirement, ...all.map((x) => `${factSlideText(x.content)} ${speechText(x)} ${x.type === "quiz" ? JSON.stringify((x.content as { questions?: unknown }).questions ?? []) : ""}`)].join("\n");
    const base = `Môn: ${subject || "?"}${grade ? `, lớp ${grade}` : ""}\nCảnh: ${sc.title}\nNội dung slide: ${slideText(sc)}\nLời giảng: ${speech}\nThời lượng lời giảng: ${seconds} giây (đặt thoiLuong = ${seconds}).${facts ? `\n\nDữ kiện và số liệu của bài (các cảnh trước) — tham số PHẢI dùng đúng các số này, không tự đặt đề/số khác:\n${facts}` : ""}\n\nQuy tắc số liệu: mọi con số trong params phải lấy từ nội dung bài ở trên hoặc tính ra từ đó; xác suất ghi dạng phân số chuỗi như trong bài (vd "5/8", "4/7"), không đổi sang số thập phân. "Ví dụ params" bên dưới chỉ minh hoạ cú pháp — KHÔNG dùng số trong ví dụ.\n\nCác mẫu được phép (chỉ chọn trong danh sách này):\n${list}`;
    const allowed = new Set<string>(cands.map((c) => c.entry.id));
    let feedback = "";
    let numRetry = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = await ai.chat(task, [{ role: "user", content: base + feedback }], { json: true });
      let obj: { template?: unknown; params?: unknown; reason?: unknown; confidence?: unknown; tieuDe?: unknown };
      try {
        obj = JSON.parse(raw) as typeof obj;
      } catch {
        feedback = "\nLần trước trả không phải JSON hợp lệ. Trả đúng JSON.";
        continue;
      }
      if (obj.template === null || obj.template === undefined) throw new ValidationError(["AI thấy cảnh này không cần hoạt hình"]);
      const conf = typeof obj.confidence === "number" ? obj.confidence : 0;
      const reason = typeof obj.reason === "string" ? obj.reason.slice(0, 200) : undefined;
      if (typeof obj.template !== "string" || !allowed.has(obj.template)) {
        feedback = `\nMẫu "${String(obj.template)}" không nằm trong danh sách được phép. Chọn trong danh sách hoặc trả template null.`;
        continue;
      }
      const spec = { template: obj.template, thoiLuong: seconds, ...(typeof obj.tieuDe === "string" && obj.tieuDe.trim() && { tieuDe: obj.tieuDe.trim().slice(0, 80) }), params: obj.params ?? {} };
      const ok = AnimSpec.safeParse(spec);
      if (!ok.success) {
        feedback = `\nĐề xuất trước bị từ chối: ${ok.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}. Sửa lại cho đúng mẫu.`;
        continue;
      }
      if (conf < 0.6) {
        if (attempt >= 1) break;
        feedback = `\nĐộ tin cậy ${conf} quá thấp${reason ? ` (${reason})` : ""}. Nếu có mẫu khác hợp hơn thì chọn, nếu không trả template null.`;
        continue;
      }
      const foreign = foreignNumbers(spec.params, lessonText);
      if (foreign.length) {
        if (numRetry) throw new ValidationError([`Hoạt hình AI đề xuất dùng số liệu không có trong bài (${foreign.join("; ")}) — hãy chọn mẫu thủ công.`]);
        numRetry = true;
        feedback = `\nĐề xuất trước dùng các số ${foreign.map((x) => String(x).replace(".", ",")).join("; ")} — không có trong nội dung bài và không suy ra được từ bài. Chọn lại, dùng đúng số liệu của bài (xác suất ghi phân số chuỗi như "5/8").`;
        continue;
      }
      return { spec, reason, confidence: conf };
    }
    throw new ValidationError(["AI chưa đề xuất được hoạt hình đủ chắc chắn cho cảnh này — hãy chọn mẫu thủ công."]);
  }

  /** Lời giảng nhắc tới hình/bảng/vị trí trên slide (khi hoạt hình che slide thì người xem không thấy). */
  const VISUAL_REF = /quan sát|nhìn|(?:hãy|cùng|các em) xem|chú ý (?:vào|tới|đến)|ở (?:phía )?(?:dưới|trên|bên)|bên (?:trái|phải|cạnh)|biểu đồ|bảng|hình vẽ|hình bên|sơ đồ|trên (?:màn hình|slide)|slide/i;

  /** Viết lại các câu lời giảng không khớp với hoạt hình đang hiện (giữ số câu, ý, số liệu), đọc lại giọng câu đổi. Trả thời lượng lời giảng mới (giây) hoặc null nếu không đổi. */
  async function rewriteSpeechForAnim(lessonId: string, sceneId: string, spec: Record<string, unknown>): Promise<number | null> {
    if (!ai) return null;
    const [row] = await db.select().from(aiLessons).where(eq(aiLessons.id, lessonId));
    const sc = (row?.scenes as StoredScene[] | undefined)?.find((x) => x.id === sceneId);
    if (!row || !sc) return null;
    const speeches = (sc.actions ?? []).filter((a): a is StoredAction & { text: string } => a.type === "speech" && !!(a as { text?: string }).text);
    if (!speeches.some((a) => VISUAL_REF.test(a.text))) return null;
    const tpl = TEMPLATES[spec.template as TemplateName]?.ten ?? String(spec.template);
    const shown = `Hoạt hình "${tpl}"${spec.tieuDe ? ` — tiêu đề "${String(spec.tieuDe)}"` : ""}; nội dung hiện lần lượt: ${JSON.stringify(spec.params).slice(0, 1500)}`;
    const system = "Bạn biên tập lời giảng bài giảng video. Màn hình của cảnh này KHÔNG còn hiện slide mà hiện một hoạt hình (mô tả bên dưới). VIẾT LẠI LỜI GIẢNG: chỉ sửa những câu nhắc tới thứ không có trên màn hình (biểu đồ, bảng, hình ở dưới/bên cạnh, slide…) để chúng nói về đúng cái đang hiện trong hoạt hình, hoặc bỏ phần chỉ trỏ đó; câu nào đã khớp thì giữ NGUYÊN VĂN. Giữ đúng số câu, thứ tự, ý chính và số liệu; lời nói tự nhiên tiếng Việt, không LaTeX, không markdown. Trả về đúng JSON {\"loiGiang\": [chuỗi, …]} cùng số phần tử.";
    const user = `${shown}\n\nLời giảng hiện tại (${speeches.length} câu):\n${speeches.map((a, i) => `${i + 1}. ${a.text}`).join("\n")}`;
    const task = cfg.taskOverrides?.loi_giang ?? "loi_giang";
    let out: unknown;
    try {
      out = parseAiJson(await ai.chat(task, [{ role: "system", content: system }, { role: "user", content: user }], { json: true }));
    } catch {
      return null;
    }
    const lines = (out as { loiGiang?: unknown })?.loiGiang;
    if (!Array.isArray(lines) || lines.length !== speeches.length || !lines.every((x) => typeof x === "string" && x.trim())) return null;
    const changed = new Map<string, string>();
    speeches.forEach((a, i) => {
      const t = String(lines[i]).trim();
      if (t !== a.text.trim()) changed.set(a.id, t);
    });
    if (changed.size === 0) return null;
    const actions = (sc.actions ?? []).map((a) => {
      const t = changed.get(a.id);
      if (t === undefined) return a;
      const { audioFile: _f, durationMs: _d, ...rest } = a as StoredAction & { text: string };
      return { ...rest, text: t } as StoredAction;
    });
    const fresh: StoredScene = { ...sc, actions };
    await fillMissingAudio(depsFor(lessonId, row), { outline: null, scenes: [fresh] }, { onScene: async () => undefined }, new Set([sceneId]));
    // ghi lại chỉ phần lời giảng của cảnh này (đọc-sửa-ghi, không đè sửa khác)
    const [cur] = await db.select().from(aiLessons).where(eq(aiLessons.id, lessonId));
    if (!cur) return null;
    await patch(lessonId, { scenes: (cur.scenes as StoredScene[]).map((x) => (x.id === sceneId ? { ...x, actions: fresh.actions } : x)) });
    return Math.min(60, Math.max(3, Math.round(speechMs(fresh) / 1000)));
  }

  /** Trước khi dựng video: cảnh quiz có lời đọc câu hỏi/đáp án (bài cũ chưa có thì sinh), đọc giọng các câu còn thiếu. Trả các cảnh mới nhất. */
  async function prepareVideo(actor: Actor, id: string): Promise<StoredScene[]> {
    assertCan(actor.role, "ailesson:read");
    const r = await load(actor.orgId, id);
    const scenes = (r.scenes as StoredScene[]).map((sc) => (sc.type === "quiz" && !sc.quizVoice ? { ...sc, quizVoice: quizVoiceLines(((sc.content as { questions?: QuizQ[] }).questions ?? []), sc.id) } : sc));
    const quizIds = new Set(scenes.filter((x) => x.type === "quiz").map((x) => x.id));
    if (quizIds.size === 0) return scenes;
    await mkdir(audioDirOf(cfg.dataDir, id), { recursive: true });
    await fillMissingAudio({ ai: ai ?? disabledAi, tts, audioDir: audioDirOf(cfg.dataDir, id) }, { outline: null, scenes }, { onScene: async () => undefined }, quizIds);
    const [cur] = await db.select().from(aiLessons).where(eq(aiLessons.id, id));
    const byId = new Map(scenes.map((x) => [x.id, x]));
    const merged = ((cur?.scenes ?? r.scenes) as StoredScene[]).map((x) => (byId.get(x.id)?.quizVoice ? { ...x, quizVoice: byId.get(x.id)?.quizVoice } : x));
    await patch(id, { scenes: merged });
    return merged;
  }

  /** GV bấm "Tạo hoạt hình": spec (tuỳ chọn, nếu có sẽ không hỏi AI) → kiểm → dựng nền. */
  async function animate(actor: Actor, id: string, sceneId: string, body: unknown): Promise<StoredScene> {
    assertCan(actor.role, "ailesson:manage");
    const anim = cfg.anim;
    if (!anim) throw new ValidationError(["Máy chủ chưa bật dựng hoạt hình toán"]);
    const r = await load(actor.orgId, id);
    const sc = (r.scenes as StoredScene[]).find((x) => x.id === sceneId);
    if (!sc) throw new NotFoundError("Không tìm thấy cảnh");
    if (sc.type !== "slide") throw new ValidationError(["Hoạt hình toán chỉ gắn được vào cảnh slide"]);
    if (sc.animation?.status === "dang_dung") return sc;
    const seconds = Math.min(60, Math.max(3, Math.round(speechMs(sc) / 1000)));
    const given = z.object({ spec: z.record(z.string(), z.unknown()).optional() }).parse(body ?? {}).spec;
    const picked = given ? { spec: { ...given, thoiLuong: seconds } as Record<string, unknown>, reason: undefined, confidence: undefined } : await proposeAnim(sc, seconds, r.subject, r.grade, r.scenes as StoredScene[], r.request.requirement);
    const spec = picked.spec;
    let prepared: ReturnType<AnimService["prepare"]>;
    try {
      prepared = anim.prepare(spec);
    } catch (e) {
      throw new ValidationError([e instanceof z.ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : (e as Error).message]);
    }
    const meta = { ...(picked.reason && { reason: picked.reason }), ...(picked.confidence !== undefined && { confidence: picked.confidence }) };
    const next: SceneAnim = { spec, status: "dang_dung", hash: prepared.hash, ...meta };
    await patchAnim(id, sceneId, "", next);
    // hoạt hình thay hình slide: lời giảng nhắc tới thứ chỉ có trên slide ("biểu đồ Ven ở dưới") được viết lại cho khớp màn hình,
    // đọc lại giọng các câu đổi, rồi dựng clip theo đúng thời lượng lời giảng mới. `prepared.hash` là khoá của lượt dựng này.
    let final = spec;
    const job = rewriteSpeechForAnim(id, sceneId, spec)
      .catch(() => null)
      .then((sec) => {
        if (sec && sec !== spec.thoiLuong) final = { ...spec, thoiLuong: sec };
        return anim.render(final);
      })
      .then((res) => patchAnim(id, sceneId, prepared.hash, { spec: final, status: "xong", hash: res.hash, durationMs: res.durationMs, ...meta }))
      .catch((e: unknown) => patchAnim(id, sceneId, prepared.hash, { spec: final, status: "loi", hash: prepared.hash, error: String((e as Error).message).slice(0, 300), ...meta }))
      .then(() => undefined)
      .catch(() => undefined);
    animJobs.add(job);
    void job.finally(() => animJobs.delete(job));
    return { ...sc, animation: next };
  }

  async function removeAnimation(actor: Actor, id: string, sceneId: string): Promise<{ ok: true }> {
    assertCan(actor.role, "ailesson:manage");
    const r = await load(actor.orgId, id);
    if (!(r.scenes as StoredScene[]).some((x) => x.id === sceneId)) throw new NotFoundError("Không tìm thấy cảnh");
    await patchAnim(id, sceneId, "", null);
    return { ok: true };
  }

  /** Đường dẫn clip hoạt hình, chỉ khi bài này thật sự dùng clip đó. */
  async function animPath(actor: Actor, id: string, hash: string): Promise<string> {
    assertCan(actor.role, "ailesson:read");
    const r = await load(actor.orgId, id);
    if (!/^[0-9a-f]{24}$/.test(hash) || !(r.scenes as StoredScene[]).some((x) => x.animation?.hash === hash && x.animation.status === "xong") || !cfg.anim) throw new NotFoundError("Không có hoạt hình này");
    return cfg.anim.fileOf(hash);
  }

  /** Khởi động lại máy chủ: việc đang chạy dở coi như lỗi, cho phép "sinh tiếp". */
  async function markStale(): Promise<number> {
    const rows = await db.select().from(aiLessons).where(inArray(aiLessons.status, ["queued", "running"]));
    for (const r of rows) await patch(r.id, { status: "error", progress: { ...r.progress, stage: "Lỗi", error: "Máy chủ khởi động lại khi đang soạn — bấm \"Sinh tiếp\"" } });
    // hoạt hình đang dựng dở khi tắt máy chủ → báo lỗi để GV bấm dựng lại
    for (const r of await db.select().from(aiLessons)) {
      const scenes = r.scenes as StoredScene[];
      if (!scenes.some((x) => x.animation?.status === "dang_dung")) continue;
      await patch(r.id, { scenes: scenes.map((x) => (x.animation?.status === "dang_dung" ? { ...x, animation: { ...x.animation, status: "loi" as const, error: "Máy chủ khởi động lại khi đang dựng — bấm \"Tạo hoạt hình\"" } } : x)) });
    }
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
    // hoạt hình do máy chủ quản (tạo/bỏ qua API riêng): luôn lấy bản trong CSDL, không tin bản trình duyệt gửi lên
    const cur = new Map((r.scenes as StoredScene[]).map((x) => [x.id, x.animation]));
    const scenes = b.scenes
      ? (b.scenes.map((s, i) => {
          const { animation: _client, ...rest } = s as Record<string, unknown>;
          const keep = cur.get(s.id);
          return { ...rest, order: i + 1, ...(keep && { animation: keep }) };
        }) as unknown as StoredScene[])
      : undefined;
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
    const fresh = await buildScene(depsFor(id, r), outline, (r.outline ?? []) as SceneOutline[], id, { directive: directive?.slice(0, 500), facts: old.type === "slide" ? "" : lessonFacts(scenes, old.order) });
    if (!fresh) throw new ValidationError(["AI không dựng được lại cảnh"]);
    const next = scenes.map((s, i) => (i === idx ? { ...fresh, id: old.id, order: old.order } : s));
    await fillMissingAudio(depsFor(id), { outline: null, scenes: next }, { onScene: async () => undefined }, new Set([old.id]));
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

  return { create, list, status, get, resume, save, regenerate, remove, animate, removeAnimation, animPath, mediaPath, loadForExport, prepareVideo, saveQuiz, markStale, idle, enqueue, cfg };
}

export type AiLessonService = ReturnType<typeof createAiLessonService>;
