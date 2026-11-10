// Port ý tưởng từ OpenMAIC lib/video-export/compile.ts + passes/timeline.ts (MIT), viết lại gọn:
// bài giảng → dòng thời gian (IR) thuần, không đụng Chrome/FFmpeg. Trình dựng video chỉ việc "phát" IR này.
import { estimateMs } from "../services/aiLessons/types";
import type { StoredScene } from "../services/aiLessons/types";

export type Cue = { text: string; startMs: number; durationMs: number };
export type Segment = {
  sceneIndex: number;
  sceneId: string;
  kind: "slide" | "quiz" | "interactive";
  focusId?: string;
  effect?: "spotlight" | "laser";
  /** Quiz: hiện đáp án. */
  reveal?: boolean;
  audioFile?: string;
  /** Cảnh có hoạt hình toán: clip thay hình slide, đoạn này bắt đầu từ offsetMs trong clip. */
  anim?: { hash: string; offsetMs: number };
  startMs: number;
  durationMs: number;
  cues: Cue[];
};
export type Timeline = { title: string; segments: Segment[]; totalMs: number; diagnostics: string[] };

const SILENT_MS = 4000;
const REVEAL_MS = 4000;

/** Chia lời giảng theo câu, thời lượng theo tỉ lệ số ký tự. */
export function splitCues(text: string, durationMs: number): Cue[] {
  const parts = (text.match(/[^.!?…;\n]+[.!?…;]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  // gộp câu quá ngắn để phụ đề không nhấp nháy
  const merged: string[] = [];
  for (const p of parts) {
    const last = merged[merged.length - 1];
    if (last !== undefined && last.length < 40) merged[merged.length - 1] = `${last} ${p}`;
    else merged.push(p);
  }
  const chunks = merged.length > 0 ? merged : [text];
  const total = chunks.reduce((n, c) => n + c.length, 0) || 1;
  let t = 0;
  return chunks.map((c, i) => {
    const d = i === chunks.length - 1 ? durationMs - t : Math.round((c.length / total) * durationMs);
    const cue = { text: c, startMs: t, durationMs: Math.max(d, 200) };
    t += d;
    return cue;
  });
}

export function compileTimeline(title: string, scenes: StoredScene[]): Timeline {
  const segments: Segment[] = [];
  const diagnostics: string[] = [];
  let t = 0;
  const push = (s: Omit<Segment, "startMs">) => {
    segments.push({ ...s, startMs: t });
    t += s.durationMs;
  };
  scenes.forEach((sc, sceneIndex) => {
    const kind = sc.type === "quiz" ? "quiz" : sc.type === "interactive" ? "interactive" : "slide";
    if (sc.type === "pbl") {
      diagnostics.push(`Cảnh ${sceneIndex + 1}: loại không hỗ trợ, bỏ qua`);
      return;
    }
    let focusId: string | undefined;
    let effect: Segment["effect"];
    let spoke = false;
    const animHash = sc.type === "slide" && sc.animation?.status === "xong" ? sc.animation.hash : undefined;
    let animOff = 0;
    for (const a of sc.actions ?? []) {
      if (a.type === "spotlight" || a.type === "laser") {
        focusId = a.elementId;
        effect = a.type;
      } else if (a.type === "speech" && a.text.trim()) {
        spoke = true;
        const durationMs = a.durationMs ?? estimateMs(a.text);
        if (a.durationMs === undefined) diagnostics.push(`Cảnh ${sceneIndex + 1}: chưa có giọng đọc, ước lượng thời lượng`);
        push({ sceneIndex, sceneId: sc.id, kind, focusId, effect, audioFile: a.audioFile, durationMs, cues: splitCues(a.text, durationMs), ...(animHash && { anim: { hash: animHash, offsetMs: animOff } }) });
        animOff += durationMs;
        focusId = undefined;
        effect = undefined;
      }
    }
    if (!spoke) push({ sceneIndex, sceneId: sc.id, kind, durationMs: SILENT_MS, cues: [], ...(animHash && { anim: { hash: animHash, offsetMs: 0 } }) });
    if (kind === "quiz") push({ sceneIndex, sceneId: sc.id, kind, reveal: true, durationMs: REVEAL_MS, cues: [] });
  });
  return { title, segments, totalMs: t, diagnostics };
}

const ts = (ms: number) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const f = Math.floor(ms % 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(f, 3)}`;
};

export function toSrt(tl: Timeline): string {
  let n = 0;
  const out: string[] = [];
  for (const s of tl.segments) for (const c of s.cues) out.push(`${++n}\n${ts(s.startMs + c.startMs)} --> ${ts(s.startMs + c.startMs + c.durationMs)}\n${c.text}\n`);
  return out.join("\n");
}
