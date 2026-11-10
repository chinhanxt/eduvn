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

export type GenDeps = { ai: Ai; tts: Tts; audioDir: string; taskOverrides?: Record<string, string>; sceneConcurrency?: number };

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
  const todo = outline.filter((o) => !state.scenes.some((s) => s.outlineId === o.id));
  const failed: string[] = [];
  let done = outline.length - todo.length;
  await hooks.onProgress({ done, total: outline.length, stage: "Đang soạn các cảnh", failed });
  await pool(todo, deps.sceneConcurrency ?? 3, async (o) => {
    try {
      const scene = await buildScene(deps, o, outline, stageId, {});
      if (!scene) throw new Error("Không dựng được cảnh");
      state.scenes = [...state.scenes.filter((s) => s.outlineId !== o.id), scene].sort((a, b) => a.order - b.order);
      await hooks.onScene(state.scenes);
    } catch (e) {
      failed.push(`${o.order}. ${o.title}: ${(e as Error).message}`);
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
  const todo: StoredAction[] = [];
  for (const sc of state.scenes) {
    if (only && !only.has(sc.id)) continue;
    for (const a of sc.actions ?? []) if (a.type === "speech" && !(a as StoredAction).audioFile) todo.push(a as StoredAction);
  }
  if (todo.length === 0) return 0;
  const res = await deps.tts.synthMany(todo.map((a) => ({ text: (a as { text: string }).text, name: safe(a.id) })), deps.audioDir).catch(() => todo.map(() => null));
  let fixed = 0;
  res.forEach((r, i) => {
    if (!r) return;
    (todo[i] as StoredAction).audioFile = r.file;
    (todo[i] as StoredAction).durationMs = r.durationMs;
    fixed++;
  });
  if (fixed > 0) await hooks.onScene(state.scenes);
  return fixed;
}

/** Dựng 1 cảnh: nội dung → lời giảng (giọng đọc gom sau, xem fillMissingAudio). `edit` dùng cho "sinh lại cảnh". */
export async function buildScene(deps: GenDeps, o: SceneOutline, all: SceneOutline[], stageId: string, edit: { directive?: string }): Promise<StoredScene | null> {
  const kind = o.type === "interactive" ? TASKS.interactive : o.type === "quiz" ? TASKS.quiz : TASKS.slide;
  const content = await retry(
    `noi-dung:${o.id}`,
    () => generateSceneContent(o, caller(deps, kind, o.type !== "interactive"), { languageDirective: VI_DIRECTIVE, logger: noLog, ...(edit.directive && o.type === "slide" ? { editDirective: edit.directive } : {}) }),
    (r) => r === null,
  );
  if (!content) throw new Error("AI trả nội dung cảnh không hợp lệ");
  const idx = all.findIndex((x) => x.id === o.id);
  let actions: unknown[] = [];
  try {
    actions = await retry(
      `loi-giang:${o.id}`,
      () =>
        generateSceneActions(o, content, caller(deps, TASKS.actions, false), {
          languageDirective: VI_DIRECTIVE,
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
  return scene;
}

export const safe = (s: string) => s.replace(/[^\w-]/g, "_");
export const audioDirOf = (dataDir: string, lessonId: string) => path.join(dataDir, "ai-lessons", lessonId, "audio");
