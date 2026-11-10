import katex from "katex";
import { userManager } from "../auth";
import { ApiError, getOrgId } from "../api";
import { type Canvas, type El, esc, quizHtml, slideHtml, type QuizQ } from "../../../server/src/export/slideHtml";

export type { Canvas, El, QuizQ };
export type Action = { id: string; type: string; text?: string; elementId?: string; audioFile?: string; durationMs?: number; [k: string]: unknown };
export type Scene = {
  id: string;
  outlineId?: string;
  type: "slide" | "quiz" | "interactive" | "pbl";
  title: string;
  order: number;
  content: { type: string; canvas?: Canvas; questions?: QuizQ[]; html?: string; widgetType?: string };
  actions?: Action[];
};
export type Progress = { done: number; total: number; stage: string; error?: string; failed?: string[] };
export type LessonSummary = { id: string; title: string; subject: string; grade: number | null; status: "queued" | "running" | "done" | "error"; progress: Progress; sceneCount: number; updatedAt: string };
export type LessonDetail = LessonSummary & { scenes: Scene[]; outline: unknown[] | null };
export type Status = { status: LessonSummary["status"]; done: number; total: number; stage: string; error?: string; failed: string[] };
export type VideoStatus = { status: "none" | "running" | "done" | "error"; done: number; total: number; error?: string };

export const BASE = "/api/ai-lessons";

export const latex = (tex: string): string => {
  try {
    return katex.renderToString(tex, { throwOnError: false, output: "html" });
  } catch {
    return esc(tex);
  }
};
const KATEX_CSS = '<link rel="stylesheet" href="/vendor/interactive/katex@0.16.38/dist/katex.min.css">';

export const sceneHtml = (s: Scene, o: { focusId?: string; effect?: "spotlight" | "laser"; subtitle?: string; reveal?: boolean }): string => {
  if (s.type === "quiz") return quizHtml(s.title, s.content.questions ?? [], { latex, reveal: o.reveal, subtitle: o.subtitle, extraHead: KATEX_CSS });
  return slideHtml(s.content.canvas ?? { elements: [] }, { latex, focusId: o.focusId, effect: o.effect, subtitle: o.subtitle, extraHead: KATEX_CSS });
};

/** Gọi API có xác thực, trả Blob (âm thanh, pptx, mp4). */
export async function blobFetch(path: string): Promise<Blob> {
  const user = await userManager.getUser();
  if (!user || user.expired) throw new ApiError(401, { error: "Hết phiên đăng nhập" });
  const headers: Record<string, string> = { authorization: `Bearer ${user.access_token}` };
  const org = getOrgId();
  if (org) headers["x-org-id"] = org;
  const res = await fetch(path, { headers });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  return res.blob();
}

export async function downloadBlob(path: string, filename: string): Promise<void> {
  const url = URL.createObjectURL(await blobFetch(path));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export { cqwToPx, estimateMs, gradeQuestion, splitCues } from "./pure";
