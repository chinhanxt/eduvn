import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../../src/db/client";
import { addMember, createOrg, ensureUser, findExam, getRole, insertExam, insertQuestion, listQuestions, membershipsOf } from "../../src/db/repo";
import { testDb } from "../helpers/db";
import { mcq, tf } from "../helpers/fixtures";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("users & orgs", () => {
  it("ensureUser là upsert theo sub", async () => {
    const a = await ensureUser(db, { sub: "s1", email: "a@x.test" });
    const b = await ensureUser(db, { sub: "s1", email: "b@x.test", name: "B" });
    expect(b.id).toBe(a.id);
    expect(b.email).toBe("b@x.test");
    expect(b.name).toBe("B");
  });

  it("createOrg gán owner; người ngoài không có vai trò", async () => {
    const u = await ensureUser(db, { sub: "s1" });
    const stranger = await ensureUser(db, { sub: "s2" });
    const org = await createOrg(db, "Trung tâm A", u.id);
    expect(await getRole(db, org.id, u.id)).toBe("owner");
    expect(await getRole(db, org.id, stranger.id)).toBeNull();
    await addMember(db, org.id, stranger.id, "student");
    expect(await getRole(db, org.id, stranger.id)).toBe("student");
    expect(await membershipsOf(db, stranger.id)).toEqual([{ orgId: org.id, role: "student" }]);
  });
});

describe("questions", () => {
  it("lưu, lọc, và cách ly theo tổ chức", async () => {
    const u = await ensureUser(db, { sub: "s1" });
    const orgA = await createOrg(db, "A", u.id);
    const orgB = await createOrg(db, "B", u.id);
    const saved = await insertQuestion(db, orgA.id, u.id, mcq());
    await insertQuestion(db, orgA.id, u.id, tf());
    await insertQuestion(db, orgA.id, u.id, mcq({ grade: 11 }));
    await insertQuestion(db, orgB.id, u.id, mcq());

    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.stem).toBe(mcq().stem);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10 })).toHaveLength(2);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10, type: "true_false" })).toHaveLength(1);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10, level: "VD" })).toHaveLength(0);
    expect(await listQuestions(db, orgB.id, { subject: "Toán", grade: 10 })).toHaveLength(1);
    expect(await listQuestions(db, orgA.id, { subject: "Toán", grade: 10, limit: 1 })).toHaveLength(1);
  });
});

describe("exams", () => {
  it("lưu và đọc lại theo tổ chức", async () => {
    const u = await ensureUser(db, { sub: "s1" });
    const org = await createOrg(db, "A", u.id);
    const other = await createOrg(db, "B", u.id);
    const matrix = { subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB" as const, type: "mcq" as const, count: 1 }] };
    const id = await insertExam(db, { orgId: org.id, ownerId: u.id, title: "KT", durationMinutes: 15, seed: 1, matrix, variants: [] });
    const row = await findExam(db, org.id, id);
    expect(row?.title).toBe("KT");
    expect(row?.matrix).toEqual(matrix);
    expect(await findExam(db, other.id, id)).toBeNull();
  });
});
