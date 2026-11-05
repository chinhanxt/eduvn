import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "../src/db/client";
import { addMember, createOrg, ensureUser } from "../src/db/repo";
import { ForbiddenError } from "../src/domain/authz";
import { NotFoundError } from "../src/errors";
import { type Actor, createService } from "../src/service";
import { testDb } from "./helpers/db";
import { mcq, responsesFromKey, short, tf } from "./helpers/fixtures";

let db: Db;
let teacher: Actor;
let student: Actor;

beforeEach(async () => {
  db = await testDb();
  const t = await ensureUser(db, { sub: "t1", name: "Cô Lan" });
  const s = await ensureUser(db, { sub: "s1", name: "Em Nam" });
  const org = await createOrg(db, "Trung tâm A", t.id);
  await addMember(db, org.id, s.id, "student");
  teacher = { userId: t.id, orgId: org.id, role: "owner" };
  student = { userId: s.id, orgId: org.id, role: "student" };
});

const matrix = {
  subject: "Toán",
  grade: 10,
  cells: [
    { topic: "Mệnh đề", level: "NB" as const, type: "mcq" as const, count: 2 },
    { topic: "Mệnh đề", level: "NB" as const, type: "true_false" as const, count: 1 },
  ],
};

async function seedBank(svc: ReturnType<typeof createService>) {
  await svc.addQuestion(teacher, mcq({ stem: "C1" }));
  await svc.addQuestion(teacher, mcq({ stem: "C2" }));
  await svc.addQuestion(teacher, tf());
}

describe("service", () => {
  it("student không thêm được câu hỏi, không xem được đáp án", async () => {
    const svc = createService(db);
    await expect(svc.addQuestion(student, mcq())).rejects.toBeInstanceOf(ForbiddenError);
    await seedBank(svc);
    const res = await svc.generateExam(teacher, { title: "KT", matrix, variants: 1, seed: 1 });
    if (!res.ok) throw new Error("expected ok");
    await expect(svc.getAnswerKeys(student, res.examId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("searchQuestions kiểm tra bộ lọc", async () => {
    await expect(createService(db).searchQuestions(teacher, { subject: "Toán" })).rejects.toThrow();
  });

  it("ra đề → đáp án → chấm đúng hết được điểm tối đa", async () => {
    const svc = createService(db);
    await seedBank(svc);
    const res = await svc.generateExam(teacher, { title: "KT 15 phút", matrix, variants: 2, seed: 1 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.codes).toEqual(["101", "102"]);
    expect(res.questionCount).toBe(3);
    const keys = await svc.getAnswerKeys(teacher, res.examId);
    expect(keys.map((k) => k.code)).toEqual(["101", "102"]);
    const result = await svc.grade(teacher, res.examId, "102", responsesFromKey(keys[1]!.entries));
    expect(result.total).toBe(1.5);
    expect(result.autoMax).toBe(1.5);
  });

  it("môn Toán: trả lời ngắn 0,5đ", async () => {
    const svc = createService(db);
    await svc.addQuestion(teacher, short({ answer: "1,5" }));
    const res = await svc.generateExam(teacher, {
      title: "KT",
      matrix: { subject: "Toán", grade: 10, cells: [{ topic: "Mệnh đề", level: "NB", type: "short_answer", count: 1 }] },
      variants: 1,
      seed: 2,
    });
    if (!res.ok) throw new Error("expected ok");
    expect((await svc.grade(teacher, res.examId, "101", { "1": "1.5" })).total).toBe(0.5);
  });

  it("thiếu câu → ok:false kèm ô thiếu, không lưu đề", async () => {
    const res = await createService(db).generateExam(teacher, { title: "KT", matrix, variants: 1 });
    expect(res).toEqual({ ok: false, shortages: [expect.objectContaining({ need: 2, have: 0 }), expect.objectContaining({ need: 1, have: 0 })] });
  });

  it("đề/mã đề không tồn tại → NotFoundError", async () => {
    const svc = createService(db);
    await expect(svc.getExam(teacher, "not-a-uuid")).rejects.toBeInstanceOf(NotFoundError);
    await expect(svc.getExam(teacher, "00000000-0000-4000-8000-000000000000")).rejects.toBeInstanceOf(NotFoundError);
    await seedBank(svc);
    const res = await svc.generateExam(teacher, { title: "KT", matrix, variants: 1, seed: 1 });
    if (!res.ok) throw new Error("expected ok");
    await expect(svc.grade(teacher, res.examId, "999", {})).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("unicode chủ đề", () => {
  it("chủ đề lưu dạng NFD vẫn tìm được bằng NFC", async () => {
    const svc = createService(db);
    await svc.addQuestion(teacher, mcq({ topic: "Mệnh đề".normalize("NFD") }));
    const found = await svc.searchQuestions(teacher, { subject: "Toán", grade: 10, topic: "Mệnh đề".normalize("NFC") });
    expect(found).toHaveLength(1);
  });
});
