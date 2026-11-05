import { z } from "zod";
import type { Db } from "./db/client";
import { type ExamRow, findExam, findUser, insertExam, insertQuestion, listExams, listQuestions, orgsOf } from "./db/repo";
import { type Role, assertCan } from "./domain/authz";
import { ExamMatrix, type Shortage, selectQuestions } from "./domain/matrix";
import { QuestionFilter, type StoredQuestion, parseQuestion } from "./domain/question";
import { mulberry32 } from "./domain/rng";
import { type ResponseValue, rulesForSubject } from "./domain/scoring";
import { type GradeResult, type KeyEntry, type Variant, answerKey, gradeVariant, makeVariants } from "./domain/variants";
import { NotFoundError } from "./errors";

export type Actor = { userId: string; orgId: string; role: Role };
export type ExamLinks = { exams: { code: string; url: string }[]; answerKey: string; matrix: string; expiresInMinutes: number };

export const GenerateExamInput = z.object({
  title: z.string().trim().min(1),
  matrix: ExamMatrix,
  variants: z.number().int().min(1).max(24).default(4),
  durationMinutes: z.number().int().min(5).max(240).default(45),
  seed: z.number().int().min(0).max(2147483647).optional(),
});
export type GenerateExamInput = z.input<typeof GenerateExamInput>;

export type GenerateExamResult =
  | { ok: true; examId: string; codes: string[]; questionCount: number; seed: number }
  | { ok: false; shortages: Shortage[] };

const Uuid = z.uuid();

export function createService(db: Db) {
  async function loadExam(orgId: string, examId: string): Promise<ExamRow> {
    const exam = Uuid.safeParse(examId).success ? await findExam(db, orgId, examId) : null;
    if (!exam) throw new NotFoundError("Không tìm thấy đề");
    return exam;
  }

  function variantOf(exam: ExamRow, code: string): Variant {
    const v = exam.variants.find((x) => x.code === code);
    if (!v) throw new NotFoundError(`Đề không có mã ${code}`);
    return v;
  }

  async function addQuestion(actor: Actor, input: unknown): Promise<StoredQuestion> {
    assertCan(actor.role, "question:write");
    return insertQuestion(db, actor.orgId, actor.userId, parseQuestion(input));
  }

  async function searchQuestions(actor: Actor, filter: unknown): Promise<StoredQuestion[]> {
    assertCan(actor.role, "question:read");
    return listQuestions(db, actor.orgId, QuestionFilter.parse(filter));
  }

  async function generateExam(actor: Actor, input: GenerateExamInput): Promise<GenerateExamResult> {
    assertCan(actor.role, "exam:create");
    const p = GenerateExamInput.parse(input);
    const seed = p.seed ?? Math.floor(Math.random() * 2147483647);
    const pool = await listQuestions(db, actor.orgId, { subject: p.matrix.subject, grade: p.matrix.grade, limit: 10000 });
    const { selected, shortages } = selectQuestions(pool, p.matrix, mulberry32(seed));
    if (shortages.length > 0) return { ok: false, shortages };
    const variants = makeVariants(selected, p.variants, seed);
    const examId = await insertExam(db, {
      orgId: actor.orgId,
      ownerId: actor.userId,
      title: p.title,
      durationMinutes: p.durationMinutes,
      seed,
      matrix: p.matrix,
      variants,
    });
    return { ok: true, examId, codes: variants.map((v) => v.code), questionCount: selected.length, seed };
  }

  async function getExam(actor: Actor, examId: string): Promise<ExamRow> {
    assertCan(actor.role, "exam:read_key");
    return loadExam(actor.orgId, examId);
  }

  async function getAnswerKeys(actor: Actor, examId: string): Promise<{ code: string; entries: KeyEntry[] }[]> {
    const exam = await getExam(actor, examId);
    return exam.variants.map((v) => ({ code: v.code, entries: answerKey(v) }));
  }

  async function grade(actor: Actor, examId: string, code: string, responses: Record<string, ResponseValue>): Promise<GradeResult> {
    assertCan(actor.role, "exam:grade");
    const exam = await loadExam(actor.orgId, examId);
    const byNo = Object.fromEntries(Object.entries(responses).map(([k, v]) => [Number(k), v]));
    return gradeVariant(variantOf(exam, code), byNo, rulesForSubject(exam.matrix.subject));
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadExamForExport(orgId: string, examId: string): Promise<ExamRow> {
    return loadExam(orgId, examId);
  }

  async function me(actor: Actor) {
    const user = await findUser(db, actor.userId);
    if (!user) throw new NotFoundError("Không tìm thấy người dùng");
    const orgs = await orgsOf(db, actor.userId);
    const org = orgs.find((o) => o.id === actor.orgId);
    return {
      user: { name: user.name, email: user.email },
      org: { id: actor.orgId, name: org?.name ?? "" },
      role: actor.role,
      orgs,
    };
  }

  async function listExamSummaries(actor: Actor) {
    assertCan(actor.role, "exam:read_key");
    const rows = await listExams(db, actor.orgId);
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      subject: r.matrix.subject,
      grade: r.matrix.grade,
      codes: r.variants.map((v) => v.code),
      createdAt: r.createdAt.toISOString(),
    }));
  }

  return { me, listExamSummaries, addQuestion, searchQuestions, generateExam, getExam, getAnswerKeys, grade, loadExamForExport };
}

export type Service = ReturnType<typeof createService>;
