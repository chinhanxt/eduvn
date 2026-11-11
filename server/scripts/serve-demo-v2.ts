// Server thử UI v2 (không Docker): PGlite + Keycloak giả + dữ liệu mẫu đủ cho 2 màn "Hôm nay" (GV + Học).
// Chạy: PORT=4325 OUT=/tmp/eduvn-demo pnpm --filter @eduvn/server exec tsx scripts/serve-demo-v2.ts
// Ghi ra $OUT/gv-token.txt (access token GV "Cô Lan Anh") và $OUT/hs-session.json (phiên mã lớp của HS "Nguyễn Minh Anh", 10A1).
// Lịch sử (bài cũ, chuỗi ngày học) được tạo bằng cách làm bài thật qua API rồi lùi mốc thời gian trong DB.
import { mkdirSync, writeFileSync } from "node:fs";
import { eq, inArray, sql } from "drizzle-orm";
import { assignments, submissions } from "../src/db/schema";
import { type Headers, bearerOf, call, issueAll, loginStudent } from "../tests/helpers/classroom";
import { createVerifier } from "../src/auth/verify";
import { buildApp } from "../src/http/app";
import { testDb } from "../tests/helpers/db";
import { AUDIENCE, ISSUER, makeIssuer } from "../tests/helpers/tokens";
import { essay, mcq, short } from "../tests/helpers/fixtures";
import { lessonPlan } from "../tests/helpers/lesson";

const port = Number(process.env.PORT ?? 4325);
const out = process.env.OUT ?? "/tmp/eduvn-demo";
mkdirSync(out, { recursive: true });
const db = await testDb();
const kc = await makeIssuer();
const app = buildApp({
  db,
  verify: createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys }),
  issuer: ISSUER,
  publicUrl: `http://127.0.0.1:${port}`,
  downloadSecret: "demo-secret-demo-secret-demo-secret!!",
  studentSecret: "demo-student-secret-demo-student-secret",
  studentRateLimit: { max: 100_000, timeWindow: 60_000 },
});
// token GV sống 12 giờ (đủ cho một buổi chụp ảnh/đo)
const t = { app, db, sign: (claims: Record<string, unknown>) => kc.sign(claims, { exp: "12h" }) };
const ok = (r: { statusCode: number; body: string }, what: string) => {
  if (r.statusCode >= 300) throw new Error(`${what}: ${r.statusCode} ${r.body.slice(0, 300)}`);
  return r;
};
const gv = bearerOf(await t.sign({ sub: "gv-1", name: "Cô Lan Anh", email: "lan.anh@chuvanan.edu.vn" }));
ok(await call(t, "GET", "/api/me", gv), "me");

// ---------- Ngân hàng câu hỏi theo chủ đề ----------
type Q = Parameters<typeof mcq>[0];
async function q(kind: "mcq" | "short" | "essay", p: Q & Record<string, unknown>) {
  const body = kind === "mcq" ? mcq(p) : kind === "short" ? short(p as never) : essay(p as never);
  ok(await call(t, "POST", "/api/questions", gv, body), "question");
}
const TOAN = ["Dấu tam thức", "Bất phương trình bậc hai", "Hàm số bậc hai", "Mệnh đề, tập hợp"];
for (const topic of TOAN)
  for (let i = 0; i < 4; i++) await q("mcq", { topic, stem: `${topic}: câu ${i + 1}`, options: ["A", "B", "C", "D"], answer: i % 4 });
for (const topic of TOAN) for (let i = 0; i < 2; i++) await q("short", { topic, stem: `${topic}: tìm m (${i + 1})`, answer: "2" } as never);
for (const topic of TOAN.slice(0, 2)) for (let i = 0; i < 2; i++) await q("essay", { topic, stem: `${topic}: chứng minh (${i + 1})`, rubric: "Lập luận đúng (1đ).", points: 1 } as never);
for (let i = 0; i < 4; i++) await q("mcq", { subject: "Ngữ văn", topic: "Nghị luận xã hội", stem: `Đọc hiểu: câu ${i + 1}`, options: ["A", "B", "C", "D"], answer: 1 });
await q("essay", { subject: "Ngữ văn", topic: "Nghị luận xã hội", stem: "Viết đoạn văn nghị luận 200 chữ về lòng biết ơn.", rubric: "Đủ ý, mạch lạc (2đ).", points: 2 } as never);

type Cell = { topic: string; level: "NB"; type: "mcq" | "short_answer" | "essay"; count: number };
async function exam(title: string, cells: Cell[], subject = "Toán"): Promise<{ id: string; key: { no: number; section: string; answer: string }[] }> {
  const r = ok(await call(t, "POST", "/api/exams", gv, { title, variants: 1, durationMinutes: 15, matrix: { subject, grade: 10, cells } }), "exam");
  const id = r.json().examId as string;
  const key = ok(await call(t, "GET", `/api/exams/${id}/key`, gv), "key").json()[0].entries;
  return { id, key };
}
const kt15 = await exam("Kiểm tra 15′ · Bất phương trình bậc hai", [
  { topic: "Dấu tam thức", level: "NB", type: "mcq", count: 3 },
  { topic: "Bất phương trình bậc hai", level: "NB", type: "mcq", count: 3 },
  { topic: "Bất phương trình bậc hai", level: "NB", type: "short_answer", count: 2 },
  { topic: "Dấu tam thức", level: "NB", type: "essay", count: 2 },
]);
const luyen = await exam("Luyện tập · Hàm số bậc hai", [
  { topic: "Hàm số bậc hai", level: "NB", type: "mcq", count: 4 },
  { topic: "Dấu tam thức", level: "NB", type: "mcq", count: 4 },
  { topic: "Hàm số bậc hai", level: "NB", type: "short_answer", count: 2 },
  { topic: "Mệnh đề, tập hợp", level: "NB", type: "mcq", count: 2 },
]);
const nho = await exam("Bài tập nhỏ", [
  { topic: "Mệnh đề, tập hợp", level: "NB", type: "mcq", count: 3 },
  { topic: "Hàm số bậc hai", level: "NB", type: "mcq", count: 3 },
  { topic: "Dấu tam thức", level: "NB", type: "mcq", count: 2 },
]);
const van = await exam("Đoạn văn nghị luận · 200 chữ", [
  { topic: "Nghị luận xã hội", level: "NB", type: "mcq", count: 2 },
  { topic: "Nghị luận xã hội", level: "NB", type: "essay", count: 1 },
], "Ngữ văn");

/** Bài làm: mỗi câu đúng với xác suất p (giả ngẫu nhiên ổn định theo seed). */
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
function answers(key: { no: number; section: string; answer: string }[], p: number, upTo = Infinity) {
  const a: Record<string, unknown> = {};
  for (const e of key) {
    if (e.no > upTo) continue;
    const right = rnd() < p;
    if (e.section === "mcq") a[String(e.no)] = right ? "ABCD".indexOf(e.answer) : ("ABCD".indexOf(e.answer) + 1) % 4;
    else if (e.section === "short_answer") a[String(e.no)] = right ? e.answer : "0";
    else if (e.section === "essay") a[String(e.no)] = "Bài làm tự luận của em.";
  }
  return a;
}

// ---------- Lớp ----------
const HO = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
const TEN = ["An", "Bình", "Châu", "Dũng", "Giang", "Hà Ngân", "Hải", "Khánh", "Linh", "Mai", "Nam", "Phúc", "Quân", "Thảo", "Trang", "Tuấn", "Vy", "Yến"];
async function klass(name: string, subject: string, n: number, first?: string) {
  const c = ok(await call(t, "POST", "/api/classes", gv, { name, schoolYear: "2026-2027", subject }), "class").json().id as string;
  const lines = Array.from({ length: n }, (_, i) => (i === 0 && first ? first : `${HO[i % HO.length]} ${["Văn", "Thị", "Minh", "Đức", "Thu"][i % 5]} ${TEN[(i * 7) % TEN.length]}`));
  ok(await call(t, "POST", `/api/classes/${c}/students`, gv, { text: lines.join("\n") }), "students");
  const { classCode, cards } = await issueAll(t, gv, c);
  const hs = await Promise.all(cards.map((k) => loginStudent(t, classCode, k)));
  return { id: c, name, hs, cards, classCode };
}
const c10a1 = await klass("10A1", "Toán 10", 14, "Nguyễn Minh Anh");
const c10a3 = await klass("10A3", "Toán 10", 16);
const c11b2 = await klass("11B2", "Toán 11", 12);

const vn = (dayOffset: number, hh: number, mm = 0) => {
  const d = new Date(Date.now() + 7 * 3600_000);
  const iso = `${d.toISOString().slice(0, 10)}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00+07:00`;
  return new Date(new Date(iso).getTime() + dayOffset * 86_400_000).toISOString();
};
async function give(cls: { id: string }, ex: { id: string }, title: string, dueAt: string, kind: "practice" | "test" = "practice", extra: Record<string, unknown> = {}) {
  return ok(await call(t, "POST", `/api/classes/${cls.id}/assignments`, gv, { title, source: { examId: ex.id }, dueAt, publish: true, kind, ...extra }), "assignment").json().id as string;
}
const start = async (hs: Headers, id: string) => ok(await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {}), "start").json().submission.id as string;
const submit = async (hs: Headers, id: string, a: Record<string, unknown>) => {
  const sid = await start(hs, id);
  ok(await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs, { seq: 1, answers: a }), "submit");
  return sid;
};
async function gradeAll(aid: string, sids: string[], score: () => number) {
  const res = ok(await call(t, "GET", `/api/assignments/${aid}/results`, gv), "results").json();
  const essays = res.stats.items.filter((i: { type: string }) => i.type === "essay").map((i: { label: number; max?: number }) => i.label);
  for (const sid of sids) await call(t, "PUT", `/api/assignments/${aid}/submissions/${sid}/grades`, gv, { points: Object.fromEntries(essays.map((n: number) => [n, score()])) });
}
/** Lùi một bài (hạn + mọi lượt làm) về quá khứ `days` ngày. */
async function shift(aid: string, days: number) {
  const iv = sql.raw(`interval '${days * 24} hours'`);
  await t.db.update(assignments).set({ opensAt: sql`${assignments.opensAt} - ${iv}`, dueAt: sql`${assignments.dueAt} - ${iv}` }).where(eq(assignments.id, aid));
  await t.db.update(submissions).set({ startedAt: sql`${submissions.startedAt} - ${iv}`, deadlineAt: sql`${submissions.deadlineAt} - ${iv}`, submittedAt: sql`${submissions.submittedAt} - ${iv}`, updatedAt: sql`${submissions.updatedAt} - ${iv}` }).where(inArray(submissions.assignmentId, [aid]));
}

// ---- Lịch sử: 3 bài cũ mỗi lớp (học lực, điểm TB, nộp đúng hạn, HS cần quan tâm) ----
for (const [cls, skill] of [[c10a1, 0.78], [c10a3, 0.55], [c11b2, 0.82]] as const) {
  for (const [i, days] of [[0, 20], [1, 12], [2, 5]] as const) {
    const aid = await give(cls, nho, `Bài tập về nhà ${i + 1}`, vn(0, 23, 0));
    const sids: string[] = [];
    for (const [k, hs] of cls.hs.entries()) {
      if (k === cls.hs.length - 1 && i > 0) continue; // em cuối bỏ 2 bài gần → "cần quan tâm"
      const weak = k === cls.hs.length - 2; // em áp chót: điểm thấp
      sids.push(await submit(hs, aid, answers(nho.key, weak ? 0.2 : skill + (k % 3) * 0.05)));
    }
    await shift(aid, days);
  }
}
// ---- Chuỗi ngày học của Minh Anh (10A1): bài nhỏ rải 14 ngày qua ----
const minhAnh = c10a1.hs[0]!;
for (const days of [13, 11, 10, 10, 9, 8, 7, 7, 6, 5, 4, 4, 3, 2, 1, 1]) {
  const aid = await give(c10a1, nho, `Ôn nhanh ${days}`, vn(0, 23, 30));
  await submit(minhAnh, aid, answers(nho.key, 0.7));
  // cả lớp cùng làm (để không ai bị tính "bỏ bài"); em cuối lớp bỏ vài bài
  for (const [k, hs] of c10a1.hs.entries()) if (k > 0 && !(k === c10a1.hs.length - 1 && days % 3 === 0)) await submit(hs, aid, answers(nho.key, 0.75));
  await shift(aid, days);
}

// ---- Hôm nay: KT 15′ 10A3 hạn 17:00 (chờ chấm tự luận, chấm được một phần) ----
const kt = await give(c10a3, kt15, "Kiểm tra 15′ · Bất phương trình bậc hai", vn(0, 17), "test", { attemptsAllowed: 1 });
const ktSids: string[] = [];
for (const [k, hs] of c10a3.hs.entries()) if (k < c10a3.hs.length - 1) ktSids.push(await submit(hs, kt, answers(kt15.key, 0.35 + (k % 5) * 0.12)));
await gradeAll(kt, ktSids.slice(0, 7), () => (rnd() < 0.5 ? 1 : 0));
// ---- Hạn 21:00 11B2: luyện tập (không tự luận), 2/3 lớp đã nộp ----
const lt = await give(c11b2, luyen, "Luyện tập · Hàm số bậc hai", vn(0, 21));
for (const [k, hs] of c11b2.hs.entries()) if (k < 8) await submit(hs, lt, answers(luyen.key, 0.7));
// ---- 10A1: Minh Anh đang làm dở 6/12 câu (hạn 21:00), KT thứ Tư, Ngữ văn thứ Sáu ----
const lt10 = await give(c10a1, luyen, "Luyện tập · Hàm số bậc hai", vn(0, 21));
const cur = await start(minhAnh, lt10);
ok(await call(t, "PUT", `/api/student/submissions/${cur}/answers`, minhAnh, { seq: 1, answers: answers(luyen.key, 0.8, 6) }), "save");
for (const [k, hs] of c10a1.hs.entries()) if (k > 0 && k < 9) await submit(hs, lt10, answers(luyen.key, 0.75));
await give(c10a1, kt15, "Kiểm tra 15′ · Tích vô hướng", vn(1, 7, 30), "test", { attemptsAllowed: 1, opensAt: vn(0, 6) });
await give(c10a1, van, "Đoạn văn nghị luận · 200 chữ", vn(3, 21));

// ---- Tiết dạy hôm nay + bảng giảng cùng tên ----
const today = vn(0, 12).slice(0, 10);
const viDate = `${today.slice(8, 10)}/${today.slice(5, 7)}/${today.slice(0, 4)}`;
const base = lessonPlan();
ok(await call(t, "POST", "/api/lessons", gv, { ...base, header: { ...base.header, teacher: "Cô Lan Anh", date: viDate, title: "Bất phương trình bậc hai", periods: 1 } }), "lesson");
ok(await call(t, "POST", "/api/boards", gv, { title: "Bất phương trình bậc hai", subject: "Toán", grade: 10, topic: "Bất phương trình bậc hai" }), "board");

// ---------- Ghi token + phiên HS (đăng nhập lại lúc này để token còn hạn) ----------
writeFileSync(`${out}/gv-token.txt`, gv.authorization!.slice(7));
const card = c10a1.cards[0]!;
const s = ok(await call(t, "POST", "/api/student/session", {}, { classCode: c10a1.classCode, seat: card.seat, pin: card.pin }), "hs login").json();
writeFileSync(`${out}/hs-session.json`, JSON.stringify(s));
await t.app.listen({ host: "127.0.0.1", port });
console.log(`demo v2 :${port} · lớp 10A1 mã ${c10a1.classCode} · Minh Anh STT ${card.seat} PIN ${card.pin}`);
