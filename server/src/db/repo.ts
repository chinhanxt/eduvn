import { and, asc, eq } from "drizzle-orm";
import type { Role } from "../domain/authz";
import type { ExamMatrix } from "../domain/matrix";
import type { QuestionFilter, QuestionInput, StoredQuestion } from "../domain/question";
import type { Variant } from "../domain/variants";
import type { Db } from "./client";
import { exams, memberships, organizations, questions, users } from "./schema";

export type UserRow = typeof users.$inferSelect;
export type ExamRow = typeof exams.$inferSelect;

export async function ensureUser(db: Db, p: { sub: string; email?: string; name?: string }): Promise<UserRow> {
  const values = { sub: p.sub, email: p.email ?? null, name: p.name ?? null };
  const [row] = await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.sub, set: { email: values.email, name: values.name } })
    .returning();
  if (!row) throw new Error("ensureUser: no row returned");
  return row;
}

export async function createOrg(db: Db, name: string, ownerId: string): Promise<{ id: string; name: string }> {
  const [org] = await db.insert(organizations).values({ name }).returning({ id: organizations.id, name: organizations.name });
  if (!org) throw new Error("createOrg: no row returned");
  await db.insert(memberships).values({ orgId: org.id, userId: ownerId, role: "owner" });
  return org;
}

export async function addMember(db: Db, orgId: string, userId: string, role: Role): Promise<void> {
  await db.insert(memberships).values({ orgId, userId, role });
}

export async function getRole(db: Db, orgId: string, userId: string): Promise<Role | null> {
  const [m] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  return m?.role ?? null;
}

export async function membershipsOf(db: Db, userId: string): Promise<{ orgId: string; role: Role }[]> {
  return db
    .select({ orgId: memberships.orgId, role: memberships.role })
    .from(memberships)
    .where(eq(memberships.userId, userId))
    .orderBy(asc(memberships.createdAt));
}

export async function insertQuestion(db: Db, orgId: string, ownerId: string, q: QuestionInput): Promise<StoredQuestion> {
  const [row] = await db
    .insert(questions)
    .values({ orgId, ownerId, subject: q.subject, grade: q.grade, topic: q.topic, level: q.level, type: q.type, body: q })
    .returning({ id: questions.id });
  if (!row) throw new Error("insertQuestion: no row returned");
  return { ...q, id: row.id };
}

export async function listQuestions(db: Db, orgId: string, f: QuestionFilter): Promise<StoredQuestion[]> {
  const conds = [eq(questions.orgId, orgId), eq(questions.subject, f.subject), eq(questions.grade, f.grade)];
  if (f.topic) conds.push(eq(questions.topic, f.topic));
  if (f.level) conds.push(eq(questions.level, f.level));
  if (f.type) conds.push(eq(questions.type, f.type));
  const rows = await db
    .select({ id: questions.id, body: questions.body })
    .from(questions)
    .where(and(...conds))
    .orderBy(asc(questions.createdAt))
    .limit(f.limit ?? 500);
  return rows.map((r) => ({ ...r.body, id: r.id }));
}

export async function insertExam(
  db: Db,
  e: { orgId: string; ownerId: string; title: string; durationMinutes: number; seed: number; matrix: ExamMatrix; variants: Variant[] },
): Promise<string> {
  const [row] = await db.insert(exams).values(e).returning({ id: exams.id });
  if (!row) throw new Error("insertExam: no row returned");
  return row.id;
}

export async function findExam(db: Db, orgId: string, examId: string): Promise<ExamRow | null> {
  const [row] = await db
    .select()
    .from(exams)
    .where(and(eq(exams.orgId, orgId), eq(exams.id, examId)));
  return row ?? null;
}
