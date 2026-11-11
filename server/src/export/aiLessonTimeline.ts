// Port ý tưởng từ OpenMAIC lib/video-export/compile.ts + passes/timeline.ts (MIT), viết lại gọn:
// bài giảng → dòng thời gian (IR) thuần, không đụng Chrome/FFmpeg. Trình dựng video chỉ việc "phát" IR này.
import { estimateMs } from "../services/aiLessons/types";
import type { QuizVoice, StoredScene } from "../services/aiLessons/types";
import type { QuizQ } from "./slideHtml";

export type Cue = { text: string; startMs: number; durationMs: number };
export type Segment = {
  sceneIndex: number;
  sceneId: string;
  kind: "slide" | "quiz" | "interactive";
  focusId?: string;
  effect?: "spotlight" | "laser";
  /** Quiz: hiện đáp án. */
  reveal?: boolean;
  /** Quiz: số thứ tự câu hỏi đang hiện (mỗi câu một đoạn). */
  quizIndex?: number;
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
/** Thời gian nghĩ sau khi đọc xong câu hỏi (phương án vẫn trên màn hình), và nghỉ sau lời giải. */
const THINK_MS = 3000;
const AFTER_REVEAL_MS = 800;
const MAX_CUE = 140;

/** Câu quá dài (> MAX_CUE ký tự) chia tiếp ở dấu phẩy/hai chấm hoặc khoảng trắng gần giữa, để phụ đề tối đa 2 dòng. */
function halve(c: string): string[] {
  if (c.length <= MAX_CUE) return [c];
  const mid = c.length / 2;
  let best = -1;
  let bd = Number.POSITIVE_INFINITY;
  for (const m of c.matchAll(/[,:;] |\s/g)) {
    const pos = (m.index ?? 0) + (m[0].length > 1 ? 1 : 0);
    const d = Math.abs(pos - mid) - (m[0].length > 1 ? 25 : 0);
    if (pos > 20 && pos < c.length - 20 && d < bd) {
      bd = d;
      best = pos;
    }
  }
  if (best < 0) return [c];
  return [...halve(c.slice(0, best).trim()), ...halve(c.slice(best).trim())];
}

/** Lời giải thích ngắn cho đoạn hiện đáp án: "Đáp án B. <câu đầu của phần giải thích>" (≤ ~140 ký tự). */
export function shortExplain(q: QuizQ): string {
  const ans = (q.answer ?? []).join(", ");
  const head = ans ? `Đáp án ${ans}.` : "";
  const plain = (q.analysis ?? "").replace(/\$/g, "").replace(/\^2/g, "²").replace(/\^3/g, "³").replace(/\*/g, "·").replace(/\s+/g, " ").trim();
  let body = "";
  for (const sent of plain.split(/(?<=[.!?])\s+/)) {
    if ((head + " " + body + sent).length > MAX_CUE) break;
    body += `${body ? " " : ""}${sent}`;
  }
  if (!body && plain) {
    const room = MAX_CUE - head.length - 2;
    const cut = plain.slice(0, room);
    body = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 10))}…`;
  }
  return `${head} ${body}`.trim();
}

const SYM: Record<string, string> = { cap: "∩", cup: "∪", cdot: "·", times: "×", le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", ne: "≠", approx: "≈", pm: "±", in: "∈", infty: "∞", pi: "π", alpha: "α", beta: "β", Omega: "Ω", omega: "ω", Rightarrow: "⇒", to: "→", mid: "|", emptyset: "∅", varnothing: "∅", subset: "⊂", Delta: "Δ" };
/** Chữ cho phụ đề: công thức LaTeX → ký hiệu đọc được (P(A∩B) = 5/8 · 4/7), bỏ ** của markdown. */
export function plainText(t: string): string {
  return t
    .replace(/\$+([^$]*)\$+/g, (_m, f: string) =>
      f
        .replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2")
        .replace(/\\[dt]?frac\s*(\d)(\d)/g, "$1/$2")
        .replace(/\\overline\s*\{([^{}]*)\}/g, "$1\u0305")
        .replace(/\\(?:left|right|,|;|!|quad|qquad)\s?/g, "")
        .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\([a-zA-Z]+)\s?/g, (_x, k: string) => SYM[k] ?? "")
        .replace(/\^\{?2\}?/g, "²")
        .replace(/\^\{?3\}?/g, "³")
        .replace(/[{}]/g, ""),
    )
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Câu lời giải đọc kèm đáp án: câu đầu có nội dung của phần giải thích (bỏ câu dẫn kết thúc bằng ":"; tách cả gạch đầu dòng), ≤ ~220 ký tự. */
export function oneLineExplain(analysis: string | undefined): string {
  const parts = (analysis ?? "")
    .replace(/\s*\n\s*[-•*]\s+|\s+[-•]\s+(?=\p{Lu})/gu, "\n")
    .split(/\n|(?<=[.!?])\s+/)
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter((x) => x && !x.endsWith(":"));
  let first = parts[0] ?? "";
  if (first.length > 220) {
    const cut = first.slice(0, 220);
    const at = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf("; "));
    first = `${cut.slice(0, at > 80 ? at : cut.lastIndexOf(" "))}.`;
  }
  return first;
}

/** Lời đọc cho từng câu quiz trong video: chỉ đọc câu hỏi (phương án hiện trên màn hình, không đọc), rồi đáp án + 1 câu lời giải. */
export function quizVoiceLines(qs: QuizQ[], sceneId: string): QuizVoice[] {
  return qs.map((q, i) => {
    const ask = `Câu ${i + 1}. ${q.question.trim()}`;
    const ans = q.answer ?? [];
    const head = ans.length ? `Đáp án đúng: ${ans.length > 1 ? `${ans.slice(0, -1).join(", ")} và ${ans[ans.length - 1]}` : ans[0]}.` : "Các em so với lời giải nhé.";
    const body = oneLineExplain(q.analysis);
    return { q: { id: `qv_${sceneId}_${i}_q`, text: ask }, a: { id: `qv_${sceneId}_${i}_a`, text: `${head}${body ? ` ${body}` : ""}` } };
  });
}

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
  const chunks = merged.length > 0 ? merged.flatMap(halve) : [text];
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
    const qs: QuizQ[] = kind === "quiz" ? ((sc.content as unknown as { questions?: QuizQ[] }).questions ?? []) : [];
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
        push({ sceneIndex, sceneId: sc.id, kind, focusId, effect, audioFile: a.audioFile, durationMs, cues: splitCues(a.text, durationMs), ...(qs.length > 0 && { quizIndex: 0 }), ...(animHash && { anim: { hash: animHash, offsetMs: animOff } }) });
        animOff += durationMs;
        focusId = undefined;
        effect = undefined;
      }
    }
    if (kind === "quiz" && qs.length > 0) {
      // mỗi câu hỏi hai đoạn, thời lượng theo nội dung: đọc câu hỏi (không đọc phương án) rồi chờ 3 s nghĩ; đọc đáp án + 1 câu lời giải.
      // Có giọng đọc (quizVoice) thì theo đúng độ dài tiếng; chưa có thì ước lượng theo số chữ.
      const voice = sc.quizVoice ?? quizVoiceLines(qs, sc.id);
      qs.forEach((q, qi) => {
        const v = voice[qi];
        const ask = v?.q.text ?? "";
        const askMs = v?.q.durationMs ?? estimateMs(ask);
        push({ sceneIndex, sceneId: sc.id, kind, quizIndex: qi, audioFile: v?.q.audioFile, durationMs: askMs + THINK_MS, cues: [...splitCues(plainText(ask), askMs), { text: "", startMs: askMs, durationMs: THINK_MS }] });
        const ans = v?.a.text || shortExplain(q);
        const ansMs = v?.a.durationMs ?? Math.max(REVEAL_MS - AFTER_REVEAL_MS, estimateMs(ans));
        push({ sceneIndex, sceneId: sc.id, kind, quizIndex: qi, reveal: true, audioFile: v?.a.audioFile, durationMs: ansMs + AFTER_REVEAL_MS, cues: [...splitCues(plainText(ans), ansMs), { text: "", startMs: ansMs, durationMs: AFTER_REVEAL_MS }] });
        if (!v?.q.audioFile) diagnostics.push(`Cảnh ${sceneIndex + 1}: câu hỏi ${qi + 1} chưa có giọng đọc, ước lượng thời lượng`);
      });
      return;
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
  for (const s of tl.segments) for (const c of s.cues) if (c.text) out.push(`${++n}\n${ts(s.startMs + c.startMs)} --> ${ts(s.startMs + c.startMs + c.durationMs)}\n${c.text}\n`);
  return out.join("\n");
}
