import { z } from "zod";
import type { LessonPlan } from "./lesson";

/** Bộ slide bài giảng: JSON dàn ý → .pptx. */

export const LAYOUTS = ["title", "bullets", "two_column", "section", "quiz"] as const;
export const MAX_SLIDES = 60;
export const MAX_BULLETS = 8;
export const MAX_BULLET_CHARS = 140;

const text = z.string().trim().normalize("NFC");
const list = z.array(text).optional();

export const Slide = z.object({
  layout: z.enum(LAYOUTS),
  title: text.default(""),
  bullets: list,
  left: list,
  right: list,
  question: text.optional(),
  options: list,
  /** Chỉ số phương án đúng (0 = A) hoặc chữ A–F. */
  answer: z.union([z.number().int().min(0).max(5), text]).optional(),
  notes: text.optional(),
});
export type Slide = z.infer<typeof Slide>;

export const SlideDeck = z.object({
  title: text.default(""),
  subtitle: text.optional(),
  subject: text.optional(),
  grade: z.number().int().min(1).max(16).optional(),
  slides: z.array(Slide),
});
export type SlideDeck = z.infer<typeof SlideDeck>;

export const SLIDE_SHAPE_HELP = `JSON bộ slide: { "title": "Tên bài giảng", "subtitle"?: "...", "subject"?: "Toán", "grade"?: 10, "slides": [ { "layout": "title"|"bullets"|"two_column"|"section"|"quiz", "title": "Tiêu đề slide (bắt buộc)", "bullets"?: ["gạch đầu dòng"], "left"?: [..], "right"?: [..], "question"?: "...", "options"?: ["A","B","C","D"], "answer"?: 0 (chỉ số) hoặc "B", "notes"?: "ghi chú cho người trình bày" } ] }.
layout: title = bìa (title + bullets[0] làm phụ đề tuỳ chọn); bullets = tiêu đề + gạch đầu dòng; two_column = 2 cột left/right; section = trang chuyển mục (bullets[0] là mô tả ngắn); quiz = câu hỏi trắc nghiệm (question + 2–6 options + answer; đáp án nằm trong ghi chú).
Giới hạn: 1–${MAX_SLIDES} slide; mỗi slide ≤ ${MAX_BULLETS} gạch đầu dòng (mỗi cột cũng vậy); mỗi dòng ≤ ${MAX_BULLET_CHARS} ký tự; tiêu đề bắt buộc.`;

export type DeckValidation = { ok: true; deck: SlideDeck } | { ok: false; issues: string[] };

export function answerIndex(s: Slide): number | null {
  if (s.answer === undefined || s.answer === "") return null;
  if (typeof s.answer === "number") return s.answer;
  const m = /^([A-Fa-f])$/.exec(s.answer.trim());
  return m?.[1] ? m[1].toUpperCase().charCodeAt(0) - 65 : null;
}

function checkLines(items: string[] | undefined, label: string, issues: string[]): void {
  if (!items) return;
  if (items.length > MAX_BULLETS) issues.push(`${label}: có ${items.length} dòng, tối đa ${MAX_BULLETS}`);
  items.forEach((b, i) => {
    if (b === "") issues.push(`${label}: dòng ${i + 1} đang để trống`);
    else if ([...b].length > MAX_BULLET_CHARS) issues.push(`${label}: dòng ${i + 1} dài ${[...b].length} ký tự, tối đa ${MAX_BULLET_CHARS}`);
  });
}

export function validateDeck(input: unknown): DeckValidation {
  const parsed = SlideDeck.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `Sai kiểu dữ liệu tại "${i.path.join(".") || "gốc"}": ${i.message}`);
    return { ok: false, issues: issues.length ? issues : ["Bộ slide phải là một object JSON"] };
  }
  const deck = parsed.data;
  const issues: string[] = [];
  if (deck.title === "") issues.push("Thiếu tên bộ slide (title)");
  if (deck.slides.length < 1) issues.push("Cần ít nhất 1 slide");
  if (deck.slides.length > MAX_SLIDES) issues.push(`Có ${deck.slides.length} slide, tối đa ${MAX_SLIDES}`);
  deck.slides.forEach((s, i) => {
    const at = `Slide ${i + 1}${s.title ? ` "${s.title}"` : ""}`;
    if (s.title === "") issues.push(`Slide ${i + 1} thiếu tiêu đề (title)`);
    checkLines(s.bullets, `${at} (bullets)`, issues);
    checkLines(s.left, `${at} (left)`, issues);
    checkLines(s.right, `${at} (right)`, issues);
    if (s.layout === "bullets" && !(s.bullets && s.bullets.length > 0)) issues.push(`${at} (bullets) cần ít nhất 1 gạch đầu dòng`);
    if (s.layout === "two_column") {
      if (!(s.left && s.left.length > 0)) issues.push(`${at} (two_column) thiếu cột trái (left)`);
      if (!(s.right && s.right.length > 0)) issues.push(`${at} (two_column) thiếu cột phải (right)`);
    }
    if (s.layout === "quiz") {
      const n = s.options?.length ?? 0;
      if (!s.question) issues.push(`${at} (quiz) thiếu câu hỏi (question)`);
      else if ([...s.question].length > 300) issues.push(`${at} (quiz): câu hỏi quá dài (tối đa 300 ký tự)`);
      if (n < 2 || n > 6) issues.push(`${at} (quiz) cần 2–6 phương án (options), đang có ${n}`);
      else {
        s.options?.forEach((o, k) => {
          if (o === "") issues.push(`${at} (quiz): phương án ${k + 1} đang để trống`);
          else if ([...o].length > MAX_BULLET_CHARS) issues.push(`${at} (quiz): phương án ${k + 1} dài hơn ${MAX_BULLET_CHARS} ký tự`);
        });
        const a = answerIndex(s);
        if (a === null || a >= n) issues.push(`${at} (quiz) thiếu hoặc sai đáp án (answer: chỉ số 0–${n - 1} hoặc chữ A–${String.fromCharCode(64 + n)})`);
      }
    }
  });
  return issues.length ? { ok: false, issues } : { ok: true, deck };
}

/** Cắt về tối đa `max` ký tự, ưu tiên cắt ở dấu câu/khoảng trắng. */
export function clip(s: string, max = MAX_BULLET_CHARS): string {
  const t = s.replace(/\s+/g, " ").trim();
  const chars = [...t];
  if (chars.length <= max) return t;
  const cut = chars.slice(0, max - 1).join("");
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
  return `${(at > max * 0.5 ? cut.slice(0, at) : cut).replace(/[\s.,;:]+$/, "")}…`;
}

/** Tách đoạn dài thành các ý ngắn (theo câu), mỗi ý ≤ 140 ký tự. */
function toBullets(s: string, label: string): string[] {
  const parts = s.split(/(?<=[.;!?])\s+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  return parts.map((p, i) => clip(i === 0 && label ? `${label}: ${p}` : p));
}

const capBullets = (items: string[]): string[] => items.filter((x) => x.trim() !== "").slice(0, MAX_BULLETS).map((x) => clip(x));

/** Giáo án (CV 5512) → bìa, Mục tiêu, mỗi hoạt động một slide chuyển mục + slide nội dung, kết thúc. Ghi chú = 4 bước tổ chức. */
export function slidesFromLessonPlan(plan: LessonPlan): SlideDeck {
  const h = plan.header;
  const slides: Slide[] = [];
  const meta = [h.subject, h.grade ? (h.grade <= 12 ? `Lớp ${h.grade}` : `Năm ${h.grade - 12}`) : "", h.periods ? `${h.periods} tiết` : ""].filter(Boolean).join(" · ");
  slides.push({ layout: "title", title: h.title || "Bài giảng", bullets: [meta, h.teacher ? `GV: ${h.teacher}` : ""].filter(Boolean), notes: h.school || undefined });

  const o = plan.objectives;
  const goals = capBullets([
    ...o.knowledge.map((x) => `Kiến thức: ${x}`),
    ...o.competencies.general.map((x) => `Năng lực chung: ${x}`),
    ...o.competencies.specific.map((x) => `Năng lực đặc thù: ${x}`),
    ...o.qualities.map((x) => `Phẩm chất: ${x}`),
  ]);
  if (goals.length > 0) slides.push({ layout: "bullets", title: "Mục tiêu bài học", bullets: goals, notes: plan.materials.length ? `Chuẩn bị: ${plan.materials.join("; ")}` : undefined });

  const stepNotes = (a: { steps: { assign: string; perform: string; report: string; conclude: string } }) =>
    [a.steps.assign && `1. Chuyển giao nhiệm vụ: ${a.steps.assign}`, a.steps.perform && `2. Thực hiện nhiệm vụ: ${a.steps.perform}`, a.steps.report && `3. Báo cáo, thảo luận: ${a.steps.report}`, a.steps.conclude && `4. Kết luận, nhận định: ${a.steps.conclude}`].filter(Boolean).join("\n");

  const content = (name: string, a: { goal: string; content: string; product: string; steps: { assign: string; perform: string; report: string; conclude: string } }): Slide => ({
    layout: "bullets",
    title: clip(name, 80),
    bullets: capBullets([...toBullets(a.goal, "Mục tiêu"), ...toBullets(a.content, "Nội dung"), ...toBullets(a.product, "Sản phẩm")]),
    notes: stepNotes(a) || undefined,
  });

  plan.activities.forEach((a, i) => {
    const n = i + 1;
    const nm = a.name || `Hoạt động ${n}`;
    slides.push({ layout: "section", title: `Hoạt động ${n}`, bullets: [clip(nm)] });
    if (a.subs.length > 0) a.subs.forEach((s, k) => slides.push(content(`${n}.${k + 1}. ${s.name || nm}`, s)));
    else slides.push(content(`${n}. ${nm}`, a));
  });

  slides.push({ layout: "section", title: "Cảm ơn các em!", bullets: ["Chúc cả lớp học tập tốt"] });
  return { title: h.title || "Bài giảng", subtitle: meta || undefined, subject: h.subject || undefined, grade: h.grade, slides: slides.slice(0, MAX_SLIDES) };
}
