/** Kế hoạch beat của Studio hoạt hình (hợp đồng docs/anim-studio/anim-plan.md): zod SceneInfo/AnimPlan,
 * mốc câu, mốc cue nội suy theo âm tiết, kiểm phủ beat + dữ liệu có nguồn, sinh assertion motion.json. Thuần, không I/O. */
import { z } from "zod";
import { foldVi } from "./tutorSearch";

export const SceneInfo = z.object({
  subject: z.string().max(40).default(""),
  grade: z.number().int().min(1).max(16).nullable().default(null),
  title: z.string().max(300).default(""),
  slideText: z.string().max(6000).default(""),
  speech: z.array(z.object({ text: z.string().max(2000), durationMs: z.number().int().min(0).max(120_000) })).max(60),
  prevAnimated: z.boolean().optional(),
});
export type SceneInfo = z.infer<typeof SceneInfo>;

const SkillRef = z.object({ id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id skill dạng kebab-case").max(64), vaiTro: z.enum(["chinh", "phu"]) });
const Cue = z.string().regex(/^(t|kw:.{1,80}|word:\d{1,3})$/, 'cue là "t", "kw:<cụm từ>" hoặc "word:<n>"');

export const Beat = z.object({
  i: z.number().int().min(0).max(15),
  t0: z.number().min(0).max(60),
  t1: z.number().min(0).max(60.5),
  cau: z.array(z.number().int().min(0).max(59)).min(1).max(20),
  cue: Cue.default("t"),
  viec: z.string().trim().min(1).max(200),
  skill: z.string().max(64),
  duLieu: z.record(z.string(), z.unknown()).optional(),
});
export type Beat = z.infer<typeof Beat>;

export const AnimPlan = z
  .object({
    skills: z.array(SkillRef).max(3),
    confidence: z.number().min(0).max(1),
    lyDo: z.string().trim().min(1).max(300),
    beats: z.array(Beat).max(8),
    khongCanHoatHinh: z.boolean().default(false),
  })
  .superRefine((p, ctx) => {
    if (p.khongCanHoatHinh) return;
    if (p.skills.length === 0) ctx.addIssue({ code: "custom", path: ["skills"], message: "Cần 1–3 skill khi có hoạt hình" });
    if (p.skills.filter((s) => s.vaiTro === "chinh").length !== 1) ctx.addIssue({ code: "custom", path: ["skills"], message: "Cần đúng 1 skill vai trò chinh" });
    if (new Set(p.skills.map((s) => s.id)).size !== p.skills.length) ctx.addIssue({ code: "custom", path: ["skills"], message: "Skill bị lặp" });
    if (p.beats.length === 0) ctx.addIssue({ code: "custom", path: ["beats"], message: "Cần ít nhất 1 beat" });
    const ids = new Set(p.skills.map((s) => s.id));
    p.beats.forEach((b, k) => {
      if (b.i !== k) ctx.addIssue({ code: "custom", path: ["beats", k, "i"], message: `Chỉ số beat phải liên tục từ 0 (gặp ${b.i} ở vị trí ${k})` });
      if (!(b.t0 < b.t1)) ctx.addIssue({ code: "custom", path: ["beats", k], message: "t0 phải nhỏ hơn t1" });
      if (!ids.has(b.skill)) ctx.addIssue({ code: "custom", path: ["beats", k, "skill"], message: `Beat dùng skill "${b.skill}" không có trong skills` });
      if (b.duLieu && JSON.stringify(b.duLieu).length > 2048) ctx.addIssue({ code: "custom", path: ["beats", k, "duLieu"], message: "duLieu quá 2 KB" });
    });
  });
export type AnimPlan = z.infer<typeof AnimPlan>;

export const r2 = (n: number) => Math.round(n * 100) / 100;

/** Mốc từng câu lời giảng (giây, cộng dồn durationMs). */
export function sentenceTimes(scene: Pick<SceneInfo, "speech">): { t0: number; t1: number; text: string }[] {
  let acc = 0;
  return scene.speech.map((s) => {
    const t0 = acc;
    acc += s.durationMs;
    return { t0: r2(t0 / 1000), t1: r2(acc / 1000), text: s.text };
  });
}

/** Tổng thời lượng cảnh, kẹp 3–60 s. */
export const sceneDuration = (scene: Pick<SceneInfo, "speech">) => r2(Math.min(60, Math.max(3, scene.speech.reduce((n, s) => n + s.durationMs, 0) / 1000)));

/** Âm tiết của câu (mỗi từ cách trắng = 1 âm tiết tiếng Việt; dấu câu ngắt = 1 âm tiết nghỉ). */
export function syllables(text: string): { w: string; pause: boolean }[] {
  const out: { w: string; pause: boolean }[] = [];
  for (const raw of text.normalize("NFC").split(/\s+/).filter(Boolean)) {
    const core = raw.replace(/[.,;:!?…"“”()«»]+$/u, "");
    if (core) out.push({ w: core, pause: false });
    if (/[.,;:!?…]$/u.test(raw)) out.push({ w: "", pause: true });
  }
  return out;
}

const fold = (s: string) => foldVi(s).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

/** Thời điểm cụm `kw` được đọc trong câu (nội suy âm tiết), hoặc null nếu không có. */
export function keywordTime(sent: { t0: number; t1: number; text: string }, kw: string): number | null {
  const syl = syllables(sent.text);
  const words = syl.map((s) => (s.pause ? "" : fold(s.w)));
  const target = fold(kw).split(" ").filter(Boolean);
  if (!target.length) return null;
  for (let i = 0; i < words.length; i++) {
    let j = 0;
    let k = i;
    while (j < target.length && k < words.length) {
      if (words[k] === "") {
        k++;
        continue;
      }
      if (words[k] !== target[j]) break;
      j++;
      k++;
    }
    if (j === target.length) return r2(sent.t0 + ((sent.t1 - sent.t0) * i) / Math.max(1, syl.length));
  }
  return null;
}

/** Mốc cue từng beat (giây), kẹp trong [t0, t1 − 0,3]. */
export function cueTimes(plan: Pick<AnimPlan, "beats">, scene: Pick<SceneInfo, "speech">): number[] {
  const sents = sentenceTimes(scene);
  return plan.beats.map((b) => {
    let t: number | null = b.t0;
    if (b.cue.startsWith("kw:")) {
      const kw = b.cue.slice(3);
      t = null;
      for (const c of b.cau) {
        const s = sents[c];
        if (s && (t = keywordTime(s, kw)) !== null) break;
      }
      t ??= b.t0;
    } else if (b.cue.startsWith("word:")) {
      const n = Number(b.cue.slice(5));
      let seen = 0;
      for (const c of b.cau) {
        const s = sents[c];
        if (!s) continue;
        const syl = syllables(s.text);
        if (n < seen + syl.length) {
          t = r2(s.t0 + ((s.t1 - s.t0) * (n - seen)) / Math.max(1, syl.length));
          break;
        }
        seen += syl.length;
      }
    }
    return r2(Math.min(Math.max(t, b.t0), Math.max(b.t0, b.t1 - 0.3)));
  });
}

// ---- Số có nguồn ----

/** Các cách đọc số (giá trị tuyệt đối) của một chuỗi số kiểu Việt/Anh: "1.000" → 1000, "16,4" → 16,4, "1,500" → 1,5 hoặc 1500. */
export function numberReadings(tok: string): number[] {
  const t = tok.replace(/[−–-]/g, "").trim();
  const out = new Set<number>();
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) out.add(Number(t.replace(/\./g, "")));
  if (/^\d{1,3}(,\d{3})+$/.test(t)) out.add(Number(t.replace(/,/g, "")));
  if (/^\d+([.,]\d+)?$/.test(t)) out.add(Number(t.replace(",", ".")));
  if (/^\d{1,3}( \d{3})+$/.test(t)) out.add(Number(t.replace(/ /g, "")));
  return [...out].filter(Number.isFinite);
}

const NUM_RE = /\d{1,3}(?:[., ]\d{3})+(?![\d])|\d+(?:[.,]\d+)?/g;

/** Mọi chuỗi số trong văn bản (bỏ chữ số dính trong mã/hợp chất như H2O, CO2). */
export function numberTokens(text: string): string[] {
  const out: string[] = [];
  for (const m of text.normalize("NFC").matchAll(NUM_RE)) {
    const before = text[(m.index ?? 0) - 1] ?? "";
    if (/[A-Za-zÀ-ỹ]/.test(before)) continue;
    out.push(m[0]);
  }
  return out;
}

/** Tập giá trị số có trong nguồn (slide + lời giảng), mọi cách đọc. */
export function sourceNumbers(scene: Pick<SceneInfo, "slideText" | "speech" | "title">): Set<number> {
  const s = new Set<number>();
  for (const text of [scene.title, scene.slideText, ...scene.speech.map((x) => x.text)]) for (const tok of numberTokens(text)) for (const v of numberReadings(tok)) s.add(v);
  return s;
}

/** Số hiển thị có nguồn? Số nguyên 0–12 (số thứ tự, bước) luôn được phép. */
export function numberHasSource(tok: string, src: Set<number>): boolean {
  const rs = numberReadings(tok);
  if (rs.length === 0) return true;
  return rs.some((v) => (Number.isInteger(v) && v >= 0 && v <= 12) || src.has(v) || [...src].some((x) => Math.abs(x - v) < 1e-9));
}

function collectNumbers(v: unknown, out: string[]): void {
  if (typeof v === "number") out.push(String(v));
  else if (typeof v === "string") out.push(...numberTokens(v));
  else if (Array.isArray(v)) for (const x of v) collectNumbers(x, out);
  else if (v && typeof v === "object") for (const x of Object.values(v)) collectNumbers(x, out);
}

function collectPlaces(v: unknown, out: string[], key = ""): void {
  if (typeof v === "string" && ["places", "from", "to", "via", "place", "noi"].includes(key)) out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectPlaces(x, out, key);
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) collectPlaces(x, out, k);
}

export type PlanCtx = { scene: SceneInfo; candidates: string[]; placeIds?: Set<string> };

/** Kiểm tất định sau khi AI trả (anim-plan.md §3). Rỗng = hợp lệ. */
export function validatePlan(plan: AnimPlan, ctx: PlanCtx): string[] {
  if (plan.khongCanHoatHinh) return [];
  const errs: string[] = [];
  const T = sceneDuration(ctx.scene);
  const n = ctx.scene.speech.length;
  const cand = new Set(ctx.candidates);
  for (const s of plan.skills) if (!cand.has(s.id)) errs.push(`Skill "${s.id}" không thuộc danh sách ứng viên`);
  const bs = plan.beats;
  if (bs.length) {
    if (Math.abs(bs[0]!.t0) > 0.05) errs.push(`Beat 0 phải bắt đầu tại 0 (gặp ${bs[0]!.t0})`);
    for (let k = 1; k < bs.length; k++) if (Math.abs(bs[k]!.t0 - bs[k - 1]!.t1) > 0.05) errs.push(`Beat ${k} phải bắt đầu đúng lúc beat ${k - 1} kết thúc (${bs[k - 1]!.t1}), gặp ${bs[k]!.t0} — không hở, không chồng`);
    if (Math.abs(bs[bs.length - 1]!.t1 - T) > 0.3) errs.push(`Beat cuối phải kết thúc tại T = ${T} s (gặp ${bs[bs.length - 1]!.t1})`);
  }
  const minBeats = T >= 9 ? 3 : 1;
  if (bs.length < minBeats || bs.length > 8) errs.push(`Cảnh ${T} s cần ${minBeats}–8 beat (gặp ${bs.length})`);
  const sents = sentenceTimes(ctx.scene);
  bs.forEach((b, k) => {
    const d = b.t1 - b.t0;
    if (d > 12.0001) errs.push(`Beat ${k} dài ${r2(d)} s > 12 s — chia nhỏ`);
    if (d < 0.9999 && bs.length > 1) errs.push(`Beat ${k} ngắn ${r2(d)} s < 1 s — gộp với beat bên cạnh`);
    for (const c of b.cau) if (c >= n) errs.push(`Beat ${k} trỏ câu ${c} nhưng lời giảng chỉ có ${n} câu`);
    for (let j = 1; j < b.cau.length; j++) if (b.cau[j]! <= b.cau[j - 1]!) errs.push(`Beat ${k}: chỉ số câu phải tăng dần`);
    if (b.cue.startsWith("kw:")) {
      const kw = b.cue.slice(3);
      if (!b.cau.some((c) => sents[c] && keywordTime(sents[c]!, kw) !== null)) errs.push(`Beat ${k}: cue "${kw}" không có trong câu ${b.cau.join(", ")}`);
    }
    if (b.duLieu) {
      const src = sourceNumbers(ctx.scene);
      const nums: string[] = [];
      collectNumbers(b.duLieu, nums);
      for (const x of new Set(nums)) if (!numberHasSource(x, src)) errs.push(`Beat ${k}: số ${x} trong duLieu không có trong slide/lời giảng — không bịa số`);
      if (ctx.placeIds) {
        const ps: string[] = [];
        collectPlaces(b.duLieu, ps);
        for (const p of new Set(ps)) if (!ctx.placeIds.has(p)) errs.push(`Beat ${k}: địa danh "${p}" không có trong bộ địa danh`);
      }
    }
  });
  return errs;
}

/** Chuẩn hoá: beat cuối kết thúc đúng T, làm tròn 2 chữ số. */
export function normalizePlan(plan: AnimPlan, scene: SceneInfo): AnimPlan {
  const T = sceneDuration(scene);
  const beats = plan.beats.map((b, k, all) => ({ ...b, t0: r2(k === 0 ? 0 : all[k - 1]!.t1), t1: r2(k === all.length - 1 ? T : b.t1) }));
  return { ...plan, beats };
}

export type MotionAssertion =
  | { kind: "appearsBy"; selector: string; bySec: number }
  | { kind: "before"; a: string; b: string }
  | { kind: "staysInFrame"; selector: string }
  | { kind: "keepsMoving"; withinSelector?: string; maxStaticSec?: number };

export const beatSel = (i: number) => `[data-ek-beat="${i}"]`;

/** index.motion.json từ kế hoạch beat (anim-plan.md §5): chỉ cho beat có phần tử trong bài. */
export function motionSidecar(T: number, cues: number[], present: Set<number>, opts: { labels?: boolean; extra?: MotionAssertion[] } = {}): { duration: number; assertions: MotionAssertion[] } {
  const a: MotionAssertion[] = [];
  const idx = cues.map((_, i) => i).filter((i) => present.has(i));
  for (const i of idx) a.push({ kind: "appearsBy", selector: beatSel(i), bySec: r2(Math.min(T, cues[i]! + 0.6)) });
  for (let k = 1; k < idx.length; k++) a.push({ kind: "before", a: beatSel(idx[k - 1]!), b: beatSel(idx[k]!) });
  if (opts.labels) a.push({ kind: "staysInFrame", selector: ".ek-label" });
  a.push({ kind: "keepsMoving", maxStaticSec: 4 });
  return { duration: T, assertions: [...a, ...(opts.extra ?? [])] };
}

/** Khối lớp: 1-5 | 6-9 | 10-12 | dh (cho prior phản hồi). */
export const khoiOf = (grade: number | null | undefined): "1-5" | "6-9" | "10-12" | "dh" => (!grade ? "6-9" : grade <= 5 ? "1-5" : grade <= 9 ? "6-9" : grade <= 12 ? "10-12" : "dh");
