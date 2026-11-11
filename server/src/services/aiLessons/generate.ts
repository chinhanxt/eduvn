/** Đường ống sinh bài giảng: dàn ý → (nội dung → lời giảng → giọng đọc) từng cảnh. Dùng @openmaic/generation (MIT) làm thư viện. */
import path from "node:path";
import {
  type AICallFn,
  type SceneOutline,
  buildCompleteScene,
  generateSceneActions,
  generateSceneContent,
  generateSceneOutlinesFromRequirements,
  withGenerationRetry,
} from "@openmaic/generation";
import type { AiLessonRequest } from "../../db/schema";
import { curriculumNote, fixGradeRefs, lessonFacts, wrongGradeRefs } from "../../domain/lessonFacts";
import { INTERACTIVE_LAYOUT_RULES } from "../../export/interactiveHtml";
import { quizVoiceLines } from "../../export/aiLessonTimeline";
import type { QuizQ } from "../../export/slideHtml";
import type { Ai } from "../ai";
import type { Tts } from "./tts";
import type { StoredAction, StoredScene } from "./types";

export const VI_DIRECTIVE =
  "Dạy bằng tiếng Việt có dấu, thuật ngữ theo SGK Việt Nam và Chương trình GDPT 2018. Mọi chữ trên slide, câu hỏi, lời giảng đều bằng tiếng Việt. Công thức viết bằng LaTeX trong cặp $…$ (ví dụ $(a+b)^2 = a^2 + 2ab + b^2$). Lời giảng (speech) là lời nói tự nhiên của giáo viên, đọc được thành tiếng: KHÔNG chứa ký hiệu LaTeX hay markdown, đọc công thức bằng lời (ví dụ \"a cộng b, tất cả bình phương\"). Không dùng tiếng Trung; chỉ dùng tiếng Anh cho thuật ngữ bắt buộc.";

/** Tên task cổng AI cho từng bước. `slide_tuong_tac` có thể chưa có trên cổng cũ → ánh xạ qua AI_TASK_OVERRIDES. */
export const TASKS = { outline: "slide_dan_y", slide: "slide_noi_dung", quiz: "slide_noi_dung", interactive: "slide_tuong_tac", actions: "loi_giang" } as const;

export type GenHooks = {
  onProgress(p: { done: number; total: number; stage: string; failed: string[] }): Promise<void>;
  onOutline(outline: SceneOutline[], title: string | undefined): Promise<void>;
  /** Gọi sau mỗi cảnh xong (đã gồm giọng đọc); scenes đã sắp theo outline.order. */
  onScene(scenes: StoredScene[]): Promise<void>;
};

export type GenDeps = { ai: Ai; tts: Tts; audioDir: string; taskOverrides?: Record<string, string>; sceneConcurrency?: number; /** Môn, lớp của bài (đưa vào prompt: CTGDPT 2018, đúng lớp). */ subject?: string | null; grade?: number | null };

export type GenState = { outline: SceneOutline[] | null; scenes: StoredScene[] };

const noLog = { debug() {}, info() {}, warn() {}, error() {} };

function caller(deps: GenDeps, task: string, json: boolean): AICallFn {
  const name = deps.taskOverrides?.[task] ?? task;
  return (system, user) =>
    deps.ai.chat(name, [{ role: "system", content: system }, { role: "user", content: user }], json ? { json: true } : {});
}

async function pool<T>(items: T[], limit: number, fn: (x: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i] as T, i);
      }
    }),
  );
}

const retry = <T>(label: string, op: () => Promise<T>, bad: (r: T) => boolean) => withGenerationRetry(op, { label, maxRetries: 1, baseDelayMs: 500, maxDelayMs: 2000, shouldRetryResult: bad });

export function requirementText(req: AiLessonRequest): string {
  const n = req.sceneCount ?? 7;
  return `${req.requirement}\n\nYêu cầu bổ sung: bài giảng khoảng ${n} cảnh, có ít nhất 1 cảnh quiz (câu hỏi luyện tập) và 1 cảnh interactive (mô phỏng/sơ đồ/trò chơi tương tác) nếu phù hợp nội dung. Dạy bằng tiếng Việt.`;
}

/** Sinh (hoặc sinh tiếp) cả bài. Cảnh nào đã có trong state.scenes thì bỏ qua; cảnh lỗi bỏ qua, ghi vào failed. */
export async function generateLesson(deps: GenDeps, req: AiLessonRequest, state: GenState, hooks: GenHooks, stageId: string): Promise<{ failed: string[]; title?: string }> {
  let title: string | undefined;
  if (!state.outline) {
    await hooks.onProgress({ done: 0, total: 0, stage: "Đang lập dàn ý", failed: [] });
    const r = await retry(
      "dan-y",
      () => generateSceneOutlinesFromRequirements({ requirement: requirementText(req) }, req.materialText, undefined, caller(deps, TASKS.outline, true), { logger: noLog }),
      (x) => !x.success,
    );
    if (!r.success || !r.data || r.data.outlines.length === 0) throw new Error(r.error ?? "AI không lập được dàn ý");
    title = r.data.courseTitle;
    state.outline = r.data.outlines.map((o, i) => ({ ...o, order: i + 1, type: o.type === "pbl" ? "slide" : o.type }));
    await hooks.onOutline(state.outline, title);
  }
  const outline = state.outline;
  // cảnh quiz/tương tác soạn sau các cảnh slide đứng trước nó để dùng đúng đề + số liệu của bài (5 đỏ 3 xanh → 5/8, 4/7)
  const late = (o: SceneOutline) => o.type === "quiz" || o.type === "interactive";
  const todo = outline.filter((o) => !state.scenes.some((s) => s.outlineId === o.id)).sort((a, b) => Number(late(a)) - Number(late(b)) || a.order - b.order);
  const settled = new Map<string, Promise<void>>();
  const release = new Map<string, () => void>();
  for (const o of todo) if (!late(o)) settled.set(o.id, new Promise((r) => release.set(o.id, r)));
  const failed: string[] = [];
  let done = outline.length - todo.length;
  await hooks.onProgress({ done, total: outline.length, stage: "Đang soạn các cảnh", failed });
  await pool(todo, deps.sceneConcurrency ?? 3, async (o) => {
    try {
      if (late(o)) await Promise.all(todo.filter((x) => !late(x) && x.order < o.order).map((x) => settled.get(x.id)));
      const facts = late(o) ? lessonFacts(state.scenes, o.order) : "";
      const scene = await buildScene(deps, o, outline, stageId, { facts });
      if (!scene) throw new Error("Không dựng được cảnh");
      state.scenes = [...state.scenes.filter((s) => s.outlineId !== o.id), scene].sort((a, b) => a.order - b.order);
      await hooks.onScene(state.scenes);
    } catch (e) {
      failed.push(`${o.order}. ${o.title}: ${(e as Error).message}`);
    } finally {
      release.get(o.id)?.();
    }
    done++;
    await hooks.onProgress({ done, total: outline.length, stage: done >= outline.length ? "Hoàn tất" : "Đang soạn các cảnh", failed });
  });
  await hooks.onProgress({ done, total: outline.length, stage: "Đang đọc lời giảng", failed });
  await fillMissingAudio(deps, state, hooks);
  return { failed, title };
}

/** Đọc lời giảng còn thiếu tiếng (cả bài gom một lần gọi VieNeu); cũng bù lại các câu lỗi ở lượt trước. `only` = chỉ các cảnh này. */
export async function fillMissingAudio(deps: GenDeps, state: GenState, hooks: Pick<GenHooks, "onScene">, only?: Set<string>): Promise<number> {
  const todo: { id: string; text: string; audioFile?: string; durationMs?: number }[] = [];
  for (const sc of state.scenes) {
    if (only && !only.has(sc.id)) continue;
    for (const a of sc.actions ?? []) if (a.type === "speech" && !(a as StoredAction).audioFile) todo.push(a as StoredAction & { text: string });
    // lời đọc câu hỏi/đáp án của cảnh quiz (video)
    for (const v of sc.quizVoice ?? []) for (const line of [v.q, v.a]) if (!line.audioFile && line.text) todo.push(line);
  }
  if (todo.length === 0) return 0;
  const res = await deps.tts.synthMany(todo.map((a) => ({ text: a.text, name: safe(a.id) })), deps.audioDir).catch(() => todo.map(() => null));
  let fixed = 0;
  res.forEach((r, i) => {
    if (!r) return;
    (todo[i] as { audioFile?: string }).audioFile = r.file;
    (todo[i] as { durationMs?: number }).durationMs = r.durationMs;
    fixed++;
  });
  if (fixed > 0) await hooks.onScene(state.scenes);
  return fixed;
}

/** Chỉ dẫn ngôn ngữ + bối cảnh bài cho một cảnh: lớp/CTGDPT 2018, dàn ý cả bài, dữ kiện các cảnh trước (quiz/tương tác), luật bố cục cảnh tương tác. */
export function sceneDirective(deps: Pick<GenDeps, "subject" | "grade">, o: SceneOutline, all: SceneOutline[], facts = "", extra = ""): string {
  const parts = [VI_DIRECTIVE];
  const cur = curriculumNote(deps.subject, deps.grade);
  if (cur) parts.push(cur);
  if (all.length > 1) parts.push(`Dàn ý cả bài (giữ mạch và số liệu thống nhất giữa các cảnh, không lặp nội dung cảnh khác):\n${all.map((x) => `${x.order}. [${x.type}] ${x.title}${x.description ? ` — ${x.description}` : ""}`).join("\n")}`);
  if (facts) parts.push(`Dữ kiện, đề bài và số liệu ĐÃ dùng ở các cảnh trước của bài — cảnh này PHẢI dùng đúng các số liệu này (cùng đề, cùng số lượng; xác suất ghi dạng phân số như trong bài), không tự đặt đề/số khác:\n${facts}`);
  if (o.type === "interactive") parts.push(INTERACTIVE_LAYOUT_RULES);
  if (extra) parts.push(extra);
  return parts.join("\n\n");
}

/** Chữ của một cảnh quiz dùng để kiểm tên sách/lớp. */
const quizText = (qs: QuizQ[]) => qs.map((q) => [q.question, ...(q.options ?? []).map((x) => x.label), q.analysis ?? ""].join(" ")).join(" ");

/** Dựng 1 cảnh: nội dung → lời giảng (giọng đọc gom sau, xem fillMissingAudio). `edit` dùng cho "sinh lại cảnh"; `facts` = dữ kiện các cảnh trước. */
export async function buildScene(deps: GenDeps, o: SceneOutline, all: SceneOutline[], stageId: string, edit: { directive?: string; facts?: string }): Promise<StoredScene | null> {
  const kind = o.type === "interactive" ? TASKS.interactive : o.type === "quiz" ? TASKS.quiz : TASKS.slide;
  const gen = (extra = "") =>
    retry(
      `noi-dung:${o.id}`,
      () => generateSceneContent(o, caller(deps, kind, o.type !== "interactive"), { languageDirective: sceneDirective(deps, o, all, edit.facts, extra), logger: noLog, ...(edit.directive && o.type === "slide" ? { editDirective: edit.directive } : {}) }),
      (r) => r === null,
    );
  let content = await gen();
  if (!content) throw new Error("AI trả nội dung cảnh không hợp lệ");
  if (o.type === "quiz") {
    // kiểm tên SGK/lớp trong câu hỏi + lời giải: lệch lớp của bài → sinh lại 1 lần kèm nhắc, vẫn lệch thì sửa về đúng lớp
    const qs = () => ((content as { questions?: QuizQ[] }).questions ?? []);
    const wrong = wrongGradeRefs(quizText(qs()), deps.grade);
    if (wrong.length) {
      const again = await gen(`Lần trước câu hỏi/lời giải nhắc "${wrong.join('", "')}" nhưng bài dành cho lớp ${deps.grade}. Chỉ nhắc đúng lớp ${deps.grade} hoặc không nhắc tên sách.`).catch(() => null);
      if (again) content = again;
    }
    for (const q of qs()) {
      q.question = fixGradeRefs(q.question, deps.grade);
      if (q.analysis) q.analysis = fixGradeRefs(q.analysis, deps.grade);
      for (const op of q.options ?? []) op.label = fixGradeRefs(op.label, deps.grade);
    }
  }
  const idx = all.findIndex((x) => x.id === o.id);
  let actions: unknown[] = [];
  try {
    actions = await retry(
      `loi-giang:${o.id}`,
      () =>
        generateSceneActions(o, content, caller(deps, TASKS.actions, false), {
          languageDirective: sceneDirective(deps, o, [], ""),
          logger: noLog,
          ctx: { pageIndex: Math.max(idx, 0) + 1, totalPages: all.length, allTitles: all.map((x) => x.title), previousSpeeches: [] },
        }),
      (r) => r.length === 0,
    );
  } catch {
    actions = [];
  }
  if (actions.length === 0) actions = [{ id: `speech_${o.id}`, type: "speech", text: [o.description, ...o.keyPoints].filter(Boolean).join(". ") }];
  const built = buildCompleteScene(o, content, actions as never, stageId);
  if (!built) return null;
  const scene = built as StoredScene;
  if (scene.type === "quiz") scene.quizVoice = quizVoiceLines((scene.content as { questions?: QuizQ[] }).questions ?? [], scene.id);
  return scene;
}

export const safe = (s: string) => s.replace(/[^\w-]/g, "_");
export const audioDirOf = (dataDir: string, lessonId: string) => path.join(dataDir, "ai-lessons", lessonId, "audio");
