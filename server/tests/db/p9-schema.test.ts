import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ensureUser } from "../../src/db/repo";
import { answerItems, assignments, classes, organizations, students, submissions } from "../../src/db/schema";
import { DEFAULT_RULES } from "../../src/domain/scoring";
import { testDb } from "../helpers/db";

async function seed() {
  const db = await testDb();
  const u = await ensureUser(db, { sub: "gv-1" });
  const [o] = await db.insert(organizations).values({ name: "Trường A" }).returning();
  const [c] = await db.insert(classes).values({ orgId: o!.id, name: "10A1", schoolYear: "2026-2027", columns: [] }).returning();
  const [s1, s2] = await db.insert(students).values([{ classId: c!.id, fullName: "An", seat: 1 }, { classId: c!.id, fullName: "Bình" }]).returning();
  const now = new Date();
  const [a] = await db
    .insert(assignments)
    .values({ orgId: o!.id, classId: c!.id, ownerId: u.id, title: "KT", kind: "test", subject: "Toán", source: { questionIds: [] }, variants: [], rules: DEFAULT_RULES, opensAt: now, dueAt: now, attemptsAllowed: 1, showSolution: "after_due" })
    .returning();
  return { db, c: c!, s1: s1!, s2: s2!, a: a!, now };
}

describe("lược đồ P9a", { timeout: 60_000 }, () => {
  it("mặc định: bài nháp, bài làm đang làm, đáp án rỗng, mã tham gia tắt", async () => {
    const { db, c, s1, a, now } = await seed();
    expect(a.status).toBe("draft");
    const [sub] = await db.insert(submissions).values({ assignmentId: a.id, studentId: s1.id, attempt: 1, variantCode: "101", seed: 1, startedAt: now, deadlineAt: now }).returning();
    expect(sub).toMatchObject({ status: "in_progress", answers: {}, seq: 0, leaveCount: 0, pending: 0, score: null });
    const [cls] = await db.select().from(classes).where(eq(classes.id, c.id));
    expect(cls).toMatchObject({ code: null, joinCode: null, joinOpen: false });
    expect(s1).toMatchObject({ seat: 1, pinHash: null, badgeVersion: 0, userId: null, linkPending: false });
  });

  it("một lượt mỗi (bài, HS, lần làm); số thứ tự không trùng trong lớp", async () => {
    const { db, s1, s2, a, now } = await seed();
    const row = { assignmentId: a.id, studentId: s1.id, attempt: 1, variantCode: "101", seed: 1, startedAt: now, deadlineAt: now };
    await db.insert(submissions).values(row);
    await expect(db.insert(submissions).values(row)).rejects.toThrow();
    await db.insert(submissions).values({ ...row, attempt: 2 });
    await expect(db.update(students).set({ seat: 1 }).where(eq(students.id, s2.id))).rejects.toThrow();
  });

  it("xoá HS thì xoá bài làm và answer_items", async () => {
    const { db, s1, a, now } = await seed();
    const [sub] = await db.insert(submissions).values({ assignmentId: a.id, studentId: s1.id, attempt: 1, variantCode: "101", seed: 1, startedAt: now, deadlineAt: now }).returning();
    await db.insert(answerItems).values({ submissionId: sub!.id, assignmentId: a.id, no: 1, questionId: "q", topic: "T", level: "NB", type: "mcq", points: 0.25, maxPoints: 0.25, correct: true, choice: "A" });
    await db.delete(students).where(eq(students.id, s1.id));
    expect(await db.select().from(submissions)).toHaveLength(0);
    expect(await db.select().from(answerItems)).toHaveLength(0);
  });
});
