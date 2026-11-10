/** Nút AI dùng skill sư phạm: nạp SKILL.md làm system prompt → cổng AI → kiểm bằng zod/validate sẵn có → trả bản nháp để giáo viên duyệt. */
import { z } from "zod";
import { LEVELS, validateComment } from "../domain/comments";
import { type LessonPlan, validateLessonPlan } from "../domain/lesson";
import { ExamMatrix } from "../domain/matrix";
import { buildMatrixReport } from "../domain/matrixReport";
import { type QuestionInput, QuestionInput as QuestionSchema } from "../domain/question";
import { rulesForSubject } from "../domain/scoring";
import { ValidationError } from "../errors";
import type { Actor } from "../service";
import { type Ai, type AiMessage, parseAiJson } from "./ai";
import type { ClassService } from "./classes";
import { SKILL_TASK, type SkillName, loadSkill, skillText } from "./skills";

type Check<T> = (raw: unknown) => { ok: true; value: T } | { ok: false; issues: string[]; partial?: T };

/** Gọi AI với skill làm system prompt; sai cấu trúc thì gửi lại danh sách lỗi một lần. */
export async function callSkillJson<T>(ai: Ai, skill: SkillName, user: string, check: Check<T>): Promise<T> {
  const messages: AiMessage[] = [{ role: "system", content: skillText(await loadSkill(skill)) }, { role: "user", content: user }];
  let last: { issues: string[]; partial?: T } = { issues: [] };
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await ai.chat(SKILL_TASK[skill], messages, { json: true });
    let r: ReturnType<Check<T>>;
    try {
      r = check(parseAiJson(text));
    } catch (e) {
      r = { ok: false, issues: [(e as Error).message] };
    }
    if (r.ok) return r.value;
    last = r;
    messages.push({ role: "assistant", content: text }, { role: "user", content: `Kết quả chưa hợp lệ:\n- ${r.issues.join("\n- ")}\nSửa các lỗi trên và trả lại toàn bộ JSON.` });
  }
  if (last.partial !== undefined) return last.partial;
  throw new ValidationError(last.issues);
}

const zodIssues = (e: z.ZodError): string[] => e.issues.map((i) => `${i.path.join(".") || "gốc"}: ${i.message}`);
const obj = (raw: unknown): Record<string, unknown> => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {});

// ---------- Giáo án 5512: sinh từng mục ----------

const Str = z.string().trim().min(1);
const Steps = z.object({ assign: Str, perform: Str, report: Str, conclude: Str });
const ActivityBlock = z.object({ name: z.string().trim().default(""), goal: Str, content: Str, product: Str, steps: Steps });
const ActivityOut = z.union([z.object({ subs: z.array(ActivityBlock).min(1) }), ActivityBlock]);
const Frame = z.object({
  objectives: z.object({ knowledge: z.array(Str).min(1), competencies: z.object({ general: z.array(Str).min(1), specific: z.array(Str).min(1) }), qualities: z.array(Str).min(1) }),
  materials: z.array(Str).min(1),
  outline: z.array(z.object({ name: Str, gist: Str, minutes: z.number().optional() })).length(4),
});

export type LessonRequest = { subject: string; grade: number; title: string; periods: number; note?: string };
const MODE_HEAD = (s: string) => `CHẾ ĐỘ: ${s}\n`;
const lessonCtx = (r: LessonRequest) => `Môn ${r.subject}, lớp ${r.grade}, bài "${r.title}", ${r.periods} tiết.${r.note ? ` Ghi chú của GV: ${r.note}` : ""}`;

export async function draftLessonPlan(ai: Ai, r: LessonRequest): Promise<LessonPlan> {
  const frame = await callSkillJson(ai, "giao-an-5512", MODE_HEAD("khung") + lessonCtx(r), (raw) => {
    const p = Frame.safeParse(raw);
    return p.success ? { ok: true, value: p.data } : { ok: false, issues: zodIssues(p.error) };
  });
  const frameJson = JSON.stringify(frame);
  const blocks = await Promise.all(
    [1, 2, 3, 4].map((n) =>
      callSkillJson(ai, "giao-an-5512", `${MODE_HEAD(`hoat_dong ${n}`)}${lessonCtx(r)}\nKhung đã có: ${frameJson}\nChỉ viết hoạt động ${n}.`, (raw) => {
        const p = ActivityOut.safeParse(raw);
        if (!p.success) return { ok: false, issues: zodIssues(p.error) };
        if ("subs" in p.data && n !== 2) return { ok: false, issues: ["Chỉ hoạt động 2 mới được chia subs"] };
        return { ok: true, value: p.data };
      }),
    ),
  );
  const empty = { name: "", goal: "", content: "", product: "", steps: { assign: "", perform: "", report: "", conclude: "" } };
  const activities = blocks.map((b, i) => ("subs" in b ? { ...empty, name: frame.outline[i]?.name ?? "", subs: b.subs } : { ...b, name: b.name || (frame.outline[i]?.name ?? ""), subs: [] }));
  const v = validateLessonPlan({
    header: { subject: r.subject, grade: r.grade, title: r.title, periods: r.periods },
    objectives: frame.objectives,
    materials: frame.materials,
    activities,
  });
  if (!v.ok) throw new ValidationError(v.issues);
  return v.plan;
}

// ---------- Ma trận + đặc tả 7991 ----------

const MatrixOut = z.object({ title: z.string().trim().default("Đề kiểm tra"), durationMinutes: z.number().int().min(5).max(240).default(45), subject: z.string(), grade: z.number(), cells: z.array(z.unknown()).min(1) });

export async function draftMatrix(ai: Ai, p: { description: string; subject?: string; grade?: number }) {
  const user = `${p.subject ? `Môn: ${p.subject}\n` : ""}${p.grade ? `Lớp: ${p.grade}\n` : ""}${p.description}`;
  return callSkillJson(ai, "ma-tran-dac-ta-7991", user, (raw) => {
    const head = MatrixOut.safeParse(obj(raw));
    if (!head.success) return { ok: false, issues: zodIssues(head.error) };
    const cells = head.data.cells.map((c) => {
      const o = obj(c);
      return { ...o, level: o.level === "VDC" ? "VD" : o.level };
    });
    const m = ExamMatrix.safeParse({ subject: p.subject || head.data.subject, grade: p.grade || head.data.grade, cells });
    if (!m.success) return { ok: false, issues: zodIssues(m.error) };
    const report = buildMatrixReport(m.data, rulesForSubject(m.data.subject));
    const value = { title: head.data.title, durationMinutes: head.data.durationMinutes, matrix: m.data, report };
    // Tổng điểm lệch 10: gửi lại kèm số điểm đã tính; vẫn lệch thì trả bản này kèm cảnh báo để GV chỉnh.
    return report.warnings.length ? { ok: false, issues: [`${report.warnings.join("; ")}. Điểm tính theo luật điểm: ${report.levelRatio.NB.points} (NB) + ${report.levelRatio.TH.points} (TH) + ${report.levelRatio.VD.points} (VD). Chỉnh số câu để tổng đúng bằng 10.`], partial: value } : { ok: true, value };
  });
}

// ---------- Câu hỏi theo YCCĐ ----------

export type QuestionRequest = { subject: string; grade: number; topic: string; yccd?: string; level: "NB" | "TH" | "VD"; type: QuestionInput["type"] | "mix"; count: number };
const TYPE_VI = { mcq: "nhiều lựa chọn (mcq)", true_false: "đúng/sai (true_false)", short_answer: "trả lời ngắn (short_answer)", essay: "tự luận (essay)", mix: "nhiều dạng khác nhau" } as const;

export async function draftQuestions(ai: Ai, r: QuestionRequest): Promise<{ questions: QuestionInput[]; rejected: { index: number; issues: string[] }[] }> {
  const user = `Môn ${r.subject}, lớp ${r.grade}, chủ đề ${r.topic}.${r.yccd ? ` YCCĐ: ${r.yccd}.` : ""} Mức ${r.level}. Tạo ${r.count} câu ${TYPE_VI[r.type]}.`;
  return callSkillJson(ai, "cau-hoi-theo-yccd", user, (raw) => {
    const list = obj(raw).questions;
    if (!Array.isArray(list) || list.length === 0) return { ok: false, issues: ['Thiếu mảng "questions"'] };
    const questions: QuestionInput[] = [];
    const rejected: { index: number; issues: string[] }[] = [];
    list.forEach((q, index) => {
      const o = obj(q);
      const p = QuestionSchema.safeParse({ ...o, subject: r.subject, grade: r.grade, topic: r.topic, level: r.level, answer: typeof o.answer === "number" && o.type === "short_answer" ? String(o.answer) : o.answer });
      const issues = p.success ? mcqIssues(p.data) : zodIssues(p.error);
      if (p.success && issues.length === 0) questions.push(p.data);
      else rejected.push({ index: index + 1, issues });
    });
    return questions.length ? { ok: true, value: { questions, rejected } } : { ok: false, issues: rejected.flatMap((x) => x.issues.map((i) => `Câu ${x.index}: ${i}`)) };
  });
}

/** Kiểm phương án nhiễu: không trùng nhau. */
function mcqIssues(q: QuestionInput): string[] {
  if (q.type !== "mcq") return [];
  const norm = q.options.map((o) => o.replace(/^\s*[A-D][.)]\s*/, "").trim().toLowerCase());
  return new Set(norm).size < 4 ? ["Có hai phương án trùng nhau"] : [];
}

// ---------- Nhận xét TT22/TT27 ----------

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLowerCase();
const nameGrams = (full: string): string[] => {
  const w = full.trim().split(/\s+/);
  return w.length < 2 ? [] : [full.trim(), ...w.slice(0, -1).map((x, i) => `${x} ${w[i + 1] ?? ""}`)];
};
export const leaksName = (text: string, fullName: string): boolean => nameGrams(fullName).some((g) => fold(text).includes(fold(g)));
const scrub = (text: string, names: string[]): string => names.reduce((t, n) => nameGrams(n).reduce((acc, g) => acc.replace(new RegExp(g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "em"), t), text);

export const levelFromDtb = (dtb: number): string => (dtb >= 8 ? "Tốt" : dtb >= 6.5 ? "Khá" : dtb >= 5 ? "Đạt" : "Chưa đạt");

export type CommentDraft = { student: string; text: string; level: string; issues: string[] };

export async function draftComments(ai: Ai, classes: ClassService, actor: Actor, p: { classId: string; term: "HK1" | "HK2"; students?: string[] }): Promise<{ term: string; scale: string; items: CommentDraft[] }> {
  const gb = await classes.gradebook(actor, p.classId, undefined, p.term);
  const all = gb.students.map((s) => s.fullName);
  const pick = gb.students.filter((s) => !p.students || p.students.includes(s.id));
  if (pick.length === 0) throw new ValidationError(["Lớp chưa có học sinh được chọn"]);
  const levels = LEVELS[gb.class.scale];
  const fallbackLevel = (dtb: number | null) => (gb.class.scale === "TT22" && dtb !== null ? levelFromDtb(dtb) : (levels[Math.min(1, levels.length - 1)] as string));
  const out: CommentDraft[] = [];
  for (let i = 0; i < pick.length; i += 12) {
    const chunk = pick.slice(i, i + 12);
    const key = (n: number) => `h${n + 1}`;
    const user = JSON.stringify({
      scale: gb.class.scale,
      subject: gb.class.subject ?? "",
      term: p.term,
      students: chunk.map((s, n) => ({ id: key(n), ...(s.dtb !== null && { dtb: s.dtb, ...(gb.class.scale === "TT22" && { levelHint: levelFromDtb(s.dtb) }) }), scores: s.scores, attendance: s.attendance, note: scrub(s.note, all) })),
    });
    const items = await callSkillJson(ai, "nhan-xet-tt22-tt27", user, (raw) => {
      const list = obj(raw).items;
      if (!Array.isArray(list)) return { ok: false, issues: ['Thiếu mảng "items"'] };
      const issues: string[] = [];
      const drafts = chunk.map((s, n): CommentDraft => {
        const it = obj(list.find((x) => obj(x).id === key(n)));
        const text = typeof it.text === "string" ? it.text.trim() : "";
        let level = typeof it.level === "string" ? it.level : "";
        const mine: string[] = [];
        if (!levels.includes(level)) {
          level = fallbackLevel(s.dtb);
          mine.push("mức AI trả không hợp lệ, đã đặt lại");
        }
        mine.push(...validateComment(gb.class.scale, text, level).filter((e) => !e.startsWith("mức")));
        if (leaksName(text, s.fullName)) mine.push("nhận xét lộ tên học sinh");
        issues.push(...mine.map((m) => `${key(n)}: ${m}`));
        return { student: s.id, text, level, issues: mine };
      });
      return issues.length ? { ok: false, issues, partial: drafts } : { ok: true, value: drafts };
    });
    out.push(...items);
  }
  return { term: p.term, scale: gb.class.scale, items: out };
}

// ---------- Đề cương học phần ----------

const Code = z.string().trim().min(1);
const Level3 = z.enum(["I", "R", "M"]);
const Khung = z.object({
  name: Str,
  code: z.string().trim().default(""),
  credits: z.number().int().min(1).max(15),
  level: z.string().trim().default(""),
  hours: z.object({ lecture: z.number().min(0), practice: z.number().min(0), selfStudy: z.number().min(0) }),
  prerequisites: z.array(Str).default([]),
  description: Str,
  plos: z.array(z.object({ code: Code, text: Str })).min(1),
  clos: z.array(z.object({ code: Code, text: Str, bloom: z.string().default("") })).min(3).max(10),
  cloPlo: z.array(z.object({ clo: Code, plo: z.array(z.object({ code: Code, level: Level3.default("R") })).min(1) })).min(1),
  assessment: z.array(z.object({ component: Str, weight: z.number().positive(), method: Str, clos: z.array(Code).min(1), criteria: z.string().default("") })).min(1),
  ghiChu: z.string().default(""),
});
const KeHoach = z.object({
  schedule: z.array(z.object({ week: z.number().int().min(1).max(30), topic: Str, clos: z.array(Code).default([]), activities: Str, selfStudy: z.string().default("") })).min(4),
  materials: z.object({ main: z.array(Str).default([]), reference: z.array(Str).default([]) }),
});
export const Syllabus = Khung.extend(KeHoach.shape);
export type Syllabus = z.infer<typeof Syllabus>;

function khungIssues(k: z.infer<typeof Khung>): string[] {
  const issues: string[] = [];
  const clos = new Set(k.clos.map((c) => c.code));
  const plos = new Set(k.plos.map((c) => c.code));
  const sum = Math.round(k.assessment.reduce((a, x) => a + x.weight, 0) * 100) / 100;
  if (sum !== 100) issues.push(`Tổng trọng số đánh giá là ${sum}, phải bằng 100`);
  for (const c of clos) {
    if (!k.assessment.some((a) => a.clos.includes(c))) issues.push(`${c} chưa được đo bởi thành phần đánh giá nào`);
    if (!k.cloPlo.some((m) => m.clo === c)) issues.push(`${c} chưa có trong ma trận CLO–PLO`);
  }
  for (const m of k.cloPlo) for (const x of m.plo) if (!plos.has(x.code)) issues.push(`Ma trận CLO–PLO dùng ${x.code} không có trong danh sách PLO`);
  for (const a of k.assessment) for (const c of a.clos) if (!clos.has(c)) issues.push(`Đánh giá "${a.component}" dùng ${c} không có trong danh sách CLO`);
  return issues;
}

export type SyllabusRequest = { name: string; credits: number; major?: string; level?: string; weeks?: number; plos?: string; note?: string };

export async function draftSyllabus(ai: Ai, r: SyllabusRequest): Promise<Syllabus> {
  const ctx = `Học phần: ${r.name}, ${r.credits} tín chỉ${r.major ? `, ngành ${r.major}` : ""}${r.level ? `, ${r.level}` : ""}, ${r.weeks ?? 15} tuần.${r.plos ? ` PLO của chương trình: ${r.plos}.` : " GV chưa cung cấp danh sách PLO."}${r.note ? ` Yêu cầu thêm: ${r.note}` : ""}`;
  const khung = await callSkillJson(ai, "de-cuong-hoc-phan", `PHA: khung\n${ctx}`, (raw) => {
    const p = Khung.safeParse(raw);
    if (!p.success) return { ok: false, issues: zodIssues(p.error) };
    const issues = khungIssues(p.data);
    return issues.length ? { ok: false, issues } : { ok: true, value: p.data };
  });
  const clos = new Set(khung.clos.map((c) => c.code));
  const plan = await callSkillJson(ai, "de-cuong-hoc-phan", `PHA: ke_hoach\n${ctx}\nKhung đã duyệt: ${JSON.stringify({ clos: khung.clos, assessment: khung.assessment, hours: khung.hours })}`, (raw) => {
    const p = KeHoach.safeParse(raw);
    if (!p.success) return { ok: false, issues: zodIssues(p.error) };
    const bad = p.data.schedule.flatMap((w) => w.clos.filter((c) => !clos.has(c)).map((c) => `Tuần ${w.week} dùng ${c} không có trong CLO`));
    return bad.length ? { ok: false, issues: bad } : { ok: true, value: p.data };
  });
  return { ...khung, ...plan };
}

// ---------- Rubric (dùng cho P7b) ----------

export const Rubric = z.object({
  totalPoints: z.number().positive(),
  criteria: z.array(z.object({ name: Str, maxPoints: z.number().positive(), levels: z.array(z.object({ label: Str, points: z.number().min(0), descriptor: Str })).min(2) })).min(1),
  notes: z.string().default(""),
});
export type Rubric = z.infer<typeof Rubric>;

/** Rubric theo tiêu chí cho một câu tự luận (đề + thang chấm gốc nếu có). */
export async function rubricFor(ai: Ai, q: { stem: string; points: number; rubric?: string; subject?: string; grade?: number }): Promise<Rubric> {
  const user = `Đề (${q.points} điểm${q.subject ? `, ${q.subject}` : ""}${q.grade ? ` ${q.grade}` : ""}): ${q.stem}${q.rubric ? `\nĐáp án/thang chấm có sẵn: ${q.rubric}` : "\n(Không có đáp án mẫu.)"}`;
  return callSkillJson(ai, "rubric-tu-luan", user, (raw) => {
    const p = Rubric.safeParse(raw);
    if (!p.success) return { ok: false, issues: zodIssues(p.error) };
    const sum = Math.round(p.data.criteria.reduce((a, c) => a + c.maxPoints, 0) * 100) / 100;
    const issues: string[] = [];
    if (p.data.criteria.some((c) => c.levels.some((l) => (l.points * 4) % 1 !== 0) || (c.maxPoints * 4) % 1 !== 0)) issues.push("Mọi điểm phải là bội của 0,25");
    if (sum !== q.points) issues.push(`Tổng maxPoints là ${sum}, phải bằng ${q.points}`);
    for (const c of p.data.criteria) if (Math.max(...c.levels.map((l) => l.points)) !== c.maxPoints) issues.push(`Tiêu chí "${c.name}": mức cao nhất phải bằng maxPoints`);
    return issues.length ? { ok: false, issues } : { ok: true, value: { ...p.data, totalPoints: q.points } };
  });
}

/** Văn bản thang chấm để đưa vào prompt chấm bài. */
export function rubricText(r: Rubric): string {
  return [...r.criteria.map((c) => `- ${c.name} (tối đa ${c.maxPoints} điểm): ${c.levels.map((l) => `${l.label} ${l.points} đ — ${l.descriptor}`).join("; ")}`), r.notes && `Lưu ý: ${r.notes}`].filter(Boolean).join("\n");
}
