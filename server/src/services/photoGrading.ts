// server/src/services/photoGrading.ts
/** P7: chấm từ ảnh. (a) lưu kết quả phiếu trắc nghiệm đã quét (chấm lại ở server bằng luật CV 7991);
 *  (b) bài viết tay: phiên âm bằng LLM-vision → GV sửa → chấm theo rubric → GV duyệt → lưu. */
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { photoResults, students } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { EssayGrading, TRANSCRIBE_SYSTEM, gradePrompt, normalizeEssay } from "../domain/essay";
import { ResponseValue } from "../domain/scoring";
import { type SeatMatch, matchSeat } from "../domain/seatMatch";
import { AiUnavailableError, NotFoundError, ValidationError } from "../errors";
import type { Service } from "../service";
import type { ClassService } from "./classes";
import { type Ai, parseAiJson } from "./ai";
import { INK_TASK } from "./ink";

type Actor = { userId: string; orgId: string; role: Role };
const Uuid = z.uuid();
const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const OmrSave = z.object({
  examId: Uuid,
  code: z.string().min(1),
  /** SBD đọc từ phiếu (GV có thể sửa). */
  student: z.string().trim().max(80).default(""),
  /** Lớp để ghép SBD ↔ số thứ tự HS; `studentId` = GV chọn tay (thắng SBD). */
  classId: Uuid.optional(),
  studentId: Uuid.optional(),
  responses: z.record(z.string(), ResponseValue),
  /** Số ô nghi vấn máy đánh dấu / số ô GV đã sửa — để lưu vết. */
  doubts: z.number().int().min(0).default(0),
  edited: z.number().int().min(0).default(0),
});
const Transcribe = z.object({ images: z.array(z.string().regex(IMG).max(5_000_000)).min(1).max(8), hint: z.string().max(500).default("") });
const GradeReq = z.object({
  question: z.string().trim().min(1).max(8000),
  reference: z.string().max(8000).default(""),
  rubric: z.string().trim().min(1).max(8000),
  maxPoints: z.number().positive().max(100),
  transcript: z.string().trim().min(1).max(30000),
});
const EssaySave = z.object({
  examId: Uuid.optional(),
  student: z.string().trim().max(80).default(""),
  classId: Uuid.optional(),
  studentId: Uuid.optional(),
  title: z.string().trim().max(200).default(""),
  maxPoints: z.number().positive().max(100),
  transcript: z.string().max(30000),
  grading: EssayGrading,
});

const ToGradebook = z.object({ classId: z.string().min(1).optional(), studentId: z.string().min(1).optional(), column: z.string().min(1), term: z.enum(["HK1", "HK2"]).default("HK1") });

export function createPhotoGradingService(db: Db, service: Service, ai: Ai, classes: ClassService) {
  /** Danh sách HS của lớp kèm số thứ tự (SBD) để ghép phiếu. */
  async function roster(actor: Actor, classId: string) {
    const cls = await classes.getClass(actor, classId);
    const rows = await db.select({ id: students.id, fullName: students.fullName, seat: students.seat }).from(students).where(eq(students.classId, cls.id)).orderBy(students.position);
    return { id: cls.id, name: cls.name, columns: cls.columns, students: rows };
  }

  async function saveOmr(actor: Actor, raw: unknown) {
    assertCan(actor.role, "exam:grade");
    const b = OmrSave.parse(raw);
    let match: SeatMatch | null = null;
    if (b.classId) {
      const ro = await roster(actor, b.classId);
      if (b.studentId) {
        const st = ro.students.find((s) => s.id === b.studentId);
        if (!st) throw new ValidationError(["Học sinh không thuộc lớp đã chọn"]);
        match = { status: "ok", student: st };
      } else match = matchSeat(ro.students, b.student);
    } else if (b.studentId) throw new ValidationError(["Chọn lớp trước khi chọn học sinh"]);
    const st = match?.status === "ok" ? match.student : null;
    const r = await service.grade(actor, b.examId, b.code, b.responses);
    const label = st ? `${st.seat ?? "—"} · ${st.fullName}` : b.student;
    const [row] = await db
      .insert(photoResults)
      .values({ orgId: actor.orgId, ownerId: actor.userId, kind: "omr", examId: b.examId, student: label, title: `Mã đề ${b.code}`, total: r.total, max: r.autoMax, body: { code: b.code, sbd: b.student, classId: b.classId ?? null, studentId: st?.id ?? null, responses: b.responses, doubts: b.doubts, edited: b.edited, items: r.items, pendingEssay: r.pendingEssay } })
      .returning();
    return { id: row!.id, total: r.total, max: r.autoMax, match: match?.status ?? null, student: st };
  }

  async function transcribe(actor: Actor, raw: unknown): Promise<{ text: string }> {
    assertCan(actor.role, "exam:grade");
    const b = Transcribe.parse(raw);
    const text = await ai.chat(INK_TASK, [
      { role: "system", content: TRANSCRIBE_SYSTEM },
      { role: "user", content: [{ type: "text", text: b.hint ? `Gợi ý môn/đề: ${b.hint}` : "Phiên âm bài làm trong ảnh." }, ...b.images.map((url) => ({ type: "image_url" as const, image_url: { url } }))] },
    ]);
    const clean = text.replace(/^```(?:\w+)?\n?|\n?```$/g, "").trim();
    if (!clean) throw new AiUnavailableError("AI không đọc được chữ trong ảnh, thử chụp rõ hơn");
    return { text: clean };
  }

  async function gradeEssay(actor: Actor, raw: unknown) {
    assertCan(actor.role, "exam:grade");
    const b = GradeReq.parse(raw);
    const out = await ai.chat("cham_tu_luan", [{ role: "user", content: gradePrompt(b) }], { json: true });
    try {
      return normalizeEssay(parseAiJson(out), b.maxPoints);
    } catch {
      throw new AiUnavailableError("AI trả kết quả chấm sai định dạng, thử lại");
    }
  }

  async function saveEssay(actor: Actor, raw: unknown) {
    assertCan(actor.role, "exam:grade");
    const b = EssaySave.parse(raw);
    const g = normalizeEssay(b.grading, b.maxPoints);
    let st: { id: string; fullName: string; seat: number | null } | undefined;
    if (b.studentId) {
      if (!b.classId) throw new ValidationError(["Chọn lớp trước khi chọn học sinh"]);
      st = (await roster(actor, b.classId)).students.find((s) => s.id === b.studentId);
      if (!st) throw new ValidationError(["Học sinh không thuộc lớp đã chọn"]);
    }
    const student = st ? `${st.seat ?? "—"} · ${st.fullName}` : b.student;
    const [row] = await db
      .insert(photoResults)
      .values({ orgId: actor.orgId, ownerId: actor.userId, kind: "essay", examId: b.examId ?? null, student, title: b.title, total: g.total, max: g.max, body: { transcript: b.transcript, criteria: g.criteria, comment: g.comment, classId: st ? b.classId : null, studentId: st?.id ?? null } })
      .returning();
    return { id: row!.id, total: g.total, max: g.max, criteria: g.criteria, comment: g.comment };
  }

  /** Các câu tự luận của đề (để chọn câu cần chấm). */
  async function essaysOf(actor: Actor, examId: string) {
    const exam = await service.getExam(actor, examId);
    return (exam.variants[0]?.items ?? [])
      .filter((it) => it.question.type === "essay")
      .map((it) => {
        const q = it.question;
        return q.type === "essay" ? { no: it.no, stem: q.stem, rubric: q.rubric, reference: q.explanation ?? "", points: q.points } : null;
      })
      .filter((x) => x !== null);
  }

  async function list(actor: Actor, kind?: string) {
    assertCan(actor.role, "exam:grade");
    const k = kind === "omr" || kind === "essay" ? kind : undefined;
    const rows = await db
      .select()
      .from(photoResults)
      .where(and(eq(photoResults.orgId, actor.orgId), ...(k ? [eq(photoResults.kind, k)] : [])))
      .orderBy(desc(photoResults.createdAt))
      .limit(200);
    return rows.map((r) => ({ id: r.id, kind: r.kind, examId: r.examId, student: r.student, title: r.title, total: r.total, max: r.max, createdAt: r.createdAt.toISOString(), body: r.body }));
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "exam:grade");
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy kết quả");
    const del = await db.delete(photoResults).where(and(eq(photoResults.id, id), eq(photoResults.orgId, actor.orgId))).returning({ id: photoResults.id });
    if (del.length === 0) throw new NotFoundError("Không tìm thấy kết quả");
  }

  /** Ghi điểm (quy về thang 10) của một kết quả đã lưu vào cột điểm của lớp; dùng enterScores có sẵn. */
  async function toGradebook(actor: Actor, id: string, raw: unknown) {
    assertCan(actor.role, "grade:write");
    const b = ToGradebook.parse(raw);
    const [row] = Uuid.safeParse(id).success ? await db.select().from(photoResults).where(and(eq(photoResults.id, id), eq(photoResults.orgId, actor.orgId))) : [];
    if (!row) throw new NotFoundError("Không tìm thấy kết quả");
    // Phiếu đã ghép HS lúc lưu → không cần chọn lại.
    const classId = b.classId ?? (row.body.classId as string | null | undefined) ?? undefined;
    const studentId = b.studentId ?? (row.body.studentId as string | null | undefined) ?? undefined;
    if (!classId || !studentId) throw new ValidationError(["Chọn lớp và học sinh để ghi điểm"]);
    const raw10 = row.max > 0 ? (row.total / row.max) * 10 : 0;
    const cls = await classes.getClass(actor, classId);
    const score = cls.scale === "TT27" ? Math.min(10, Math.max(1, Math.round(raw10))) : Math.round(raw10 * 10) / 10;
    const r = await classes.enterScores(actor, classId, b.column, { [studentId]: score }, b.term);
    return { score, term: r.term, column: r.column, class: cls.name };
  }

  return { roster, toGradebook, saveOmr, transcribe, gradeEssay, saveEssay, essaysOf, list, remove };
}
export type PhotoGradingService = ReturnType<typeof createPhotoGradingService>;
