// Dựng toàn bộ dữ liệu demo bằng cách ghi thẳng vào DB (nhanh), chấm bài bằng chính hàm miền của lõi (domain/*).
// Ngẫu nhiên có hạt giống (world.ts SEED): chạy lại ra cùng kết quả. Mốc thời gian tương đối theo `now`:
// học kỳ I luôn đang ở tuần 12, hôm nay có bài chờ chấm, hạn nộp, tiết dạy.
import { scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { type SceneOutline, buildCompleteScene, generateSceneActions, generateSceneContent } from "@openmaic/generation";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Db } from "../../src/db/client";
import * as S from "../../src/db/schema";
import { gradeAnswers, pickVariant, toScore10 } from "../../src/domain/assignment";
import type { Answers } from "../../src/domain/assignment";
import { validateBoard } from "../../src/domain/board";
import { validateDiagram } from "../../src/domain/diagram";
import { buildGame } from "../../src/domain/games";
import type { GradeColumn } from "../../src/domain/gradebook";
import { validateLessonPlan } from "../../src/domain/lesson";
import { gradebookScore, scoreAnswer } from "../../src/domain/live";
import { QuestionInput, type StoredQuestion } from "../../src/domain/question";
import { compareVietnameseNames } from "../../src/domain/roster";
import { round2, rulesForSubject } from "../../src/domain/scoring";
import { validateDeck } from "../../src/domain/slides";
import { parseSolution } from "../../src/domain/solution";
import { CODE_ALPHABET } from "../../src/domain/studentAuth";
import { partialAverage, startOfVnDay, vnDay } from "../../src/domain/today";
import { MASTERY_THRESHOLD, type Point } from "../../src/domain/tutorLearning";
import { chunkPages } from "../../src/domain/tutorSearch";
import { validateVanBan } from "../../src/domain/vanban";
import { type Variant, gradeVariant, makeVariants } from "../../src/domain/variants";
import { verifySolution } from "../../src/domain/verify";
import { quizVoiceLines } from "../../src/export/aiLessonTimeline";
import type { QuizQ } from "../../src/export/slideHtml";
import { slugOf } from "../../src/services/solutions";
import { toQuestion } from "./check";
import type { DAiLesson, DBoard, DBook, DChat, DDeck, DDiagram, DKb, DLesson, DMindNode, DPath, DSolution, DTopic, DVanBan } from "./types";
import { type ClassSpec, LEADERS, PERSONAS, PERSONA_BOOK, SEED, SUBJECTS_BY_LEVEL, type Teacher, display, makeClasses, makeName, makeTeachers, makeTeaching, rngTools } from "./world";

export type SeedData = {
  banks: DTopic[];
  lessons: DLesson[];
  decks: DDeck[];
  aiLessons: DAiLesson[];
  diagrams: DDiagram[];
  boards: DBoard[];
  vanban: DVanBan[];
  comments: Record<string, string[]>;
  solutions: DSolution[];
  kbs: DKb[];
  chats: DChat[];
  paths: DPath[];
  books: DBook[];
};
export type Meta = {
  seededAt: number;
  seedDay: string;
  login: { classCode: string; seat: number; pin: string };
  /** Bài có hạn "hôm nay": khởi động lại muộn quá hạn thì lùi hạn tới 3 giờ nữa. */
  live: string[];
  counts: Record<string, number>;
};

const VN = 7 * 3600_000;
const D = 86_400_000;
const H = 3600_000;
const MIN = 60_000;
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
const noLog = { debug() {}, info() {}, warn() {}, error() {} };
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const vnDate = (ms: number) => vnDay(new Date(ms));
const viDate = (ms: number) => vnDate(ms).split("-").reverse().join("/");

async function bulk<T extends PgTable>(db: Db, table: T, rows: T["$inferInsert"][]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0] as object).length || 1;
  const size = Math.max(50, Math.floor(20000 / cols));
  for (let i = 0; i < rows.length; i += size) await db.insert(table).values(rows.slice(i, i + size) as never);
}

type Stu = {
  id: string; classId: string; cls: ClassSpec; name: string; gender: "Nam" | "Nữ"; seat: number; pin: string; base: number; sub: Map<string, number>;
  diligence: number; trait?: "late" | "quitter" | "slipping"; persona?: string; userId?: string;
};
type Topic = DTopic & { stored: StoredQuestion[] };
type AsgRow = typeof S.assignments.$inferInsert & { id: string; variants: Variant[]; opensAt: Date; dueAt: Date };
type SubRow = typeof S.submissions.$inferInsert & { id: string };

export async function seedAll(db: Db, now: number, data: SeedData): Promise<Meta> {
  const t = rngTools(SEED);
  const counts: Record<string, number> = {};
  const count = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);
  const t00 = Date.now();
  const log = (what: string) => process.env.SEED_LOG && console.log(`[seed] ${((Date.now() - t00) / 1000).toFixed(1)}s ${what}`);

  // ---------- Lịch: tuần 1 học kỳ I bắt đầu 11 tuần trước tuần này ----------
  const dayStart = startOfVnDay(new Date(now)).getTime();
  const dow = (ms: number) => new Date(ms + VN).getUTCDay();
  const monday0 = dayStart - ((dow(dayStart) + 6) % 7) * D;
  const week1 = monday0 - 11 * 7 * D;
  const wk = (w: number, d: number, hh: number, mm = 0) => week1 + (w - 1) * 7 * D + (d - 1) * D + hh * H + mm * MIN;
  const at = (off: number, hh: number, mm = 0) => dayStart + off * D + hh * H + mm * MIN;
  const past = (ms: number) => Math.min(ms, now - (2 + Math.floor(t.r() * 6)) * MIN);
  /** Ngày học thứ k trước hôm nay (bỏ Chủ nhật), 0h. */
  const schoolDayBack = (k: number) => {
    let d = dayStart;
    for (let n = 0; n < k; ) {
      d -= D;
      if (dow(d) !== 0) n++;
    }
    return d;
  };
  const schoolDayAhead = (k: number) => {
    let d = dayStart;
    for (let n = 0; n < k; ) {
      d += D;
      if (dow(d) !== 0) n++;
    }
    return d;
  };

  // ---------- Tổ chức, người dùng ----------
  const orgId = t.uuid();
  await db.insert(S.organizations).values({ id: orgId, name: "Trường Liên cấp Bình Minh", createdAt: new Date(wk(1, 1, 7) - 30 * D) });
  const teachers = makeTeachers(t);
  const tUser = new Map<string, string>();
  const users: (typeof S.users.$inferInsert)[] = [];
  const members: (typeof S.memberships.$inferInsert)[] = [];
  const created = new Date(wk(1, 1, 7) - 25 * D);
  for (const l of LEADERS) {
    const id = t.uuid();
    users.push({ id, sub: l.sub, name: l.name, email: l.email, createdAt: created });
    members.push({ orgId, userId: id, role: l.role, createdAt: l.role === "owner" ? new Date(created.getTime() - D) : created });
  }
  const slug = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  for (const x of teachers) {
    const id = t.uuid();
    tUser.set(x.key, id);
    const parts = slug(x.name).split(" ");
    const email = `${parts[parts.length - 1]}.${parts.slice(0, -1).map((p) => p[0]).join("")}@binhminh.edu.vn`;
    users.push({ id, sub: x.key === "ha" ? "gv-1" : `gv-${x.key}`, name: display(x), email: x.key === "ha" ? "ha.lt@binhminh.edu.vn" : email, createdAt: created });
    members.push({ orgId, userId: id, role: "teacher", createdAt: new Date(created.getTime() + users.length * MIN) });
  }
  const maUser = t.uuid();
  users.push({ id: maUser, sub: "hs-minh-anh", name: "Nguyễn Minh Anh", email: "minhanh.10a1@binhminh.edu.vn", createdAt: new Date(wk(1, 2, 19)) });
  members.push({ orgId, userId: maUser, role: "student", createdAt: new Date(wk(1, 2, 19)) });
  await bulk(db, S.users, users);
  await bulk(db, S.memberships, members);
  count("giáo viên", teachers.length);
  count("ban giám hiệu + quản trị", LEADERS.length);
  const T = (key: string) => teachers.find((x) => x.key === key)!;
  const U = (key: string) => tUser.get(key)!;

  log("users");
  // ---------- Lớp + học sinh ----------
  const classes = makeClasses(t, teachers);
  const teaching = makeTeaching(t, teachers, classes);
  const classId = new Map<string, string>();
  const classCode = new Map<string, string>();
  const students: Stu[] = [];
  const codeOf = () => Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(t.r() * CODE_ALPHABET.length)]).join("");
  const usedCodes = new Set<string>();
  const uniq = () => {
    let c = codeOf();
    while (usedCodes.has(c)) c = codeOf();
    usedCodes.add(c);
    return c;
  };
  const columnsOf = (c: ClassSpec): GradeColumn[] => {
    if (c.level === "ĐH") return [{ name: "CC", weight: 1 }, { name: "BT", weight: 2 }, { name: "GK", weight: 2 }, { name: "CK", weight: 5 }];
    const s = T(c.homeroom).subject;
    const four = ["Toán", "Ngữ văn", "Tiếng Anh", "Khoa học tự nhiên"].includes(s);
    return [...Array.from({ length: four ? 4 : 3 }, (_, i) => ({ name: `TX${i + 1}`, weight: 1 })), { name: "GK", weight: 2 }, { name: "CK", weight: 3 }];
  };
  const classRows: (typeof S.classes.$inferInsert)[] = [];
  const studentRows: (typeof S.students.$inferInsert)[] = [];
  const roots = new Map<string, Stu[]>();
  let hsCode = 0;
  for (const c of classes) {
    const id = t.uuid();
    classId.set(c.name, id);
    const code = uniq();
    classCode.set(c.name, code);
    classRows.push({ id, orgId, name: c.name, schoolYear: "2026-2027", subject: c.subject, scale: "TT22", columns: columnsOf(c), code, joinCode: uniq(), joinOpen: c.level === "ĐH", createdAt: new Date(wk(1, 1, 7) - (7 - (classRows.length % 5)) * D) });
    // danh sách: nhân vật + tên sinh ngẫu nhiên, không trùng trong lớp
    let list: { name: string; gender: "Nam" | "Nữ"; persona?: (typeof PERSONAS)[number] }[] = [];
    if (c.from) {
      const src = roots.get(c.from)!;
      const keep = t.shuffle(src.filter((s) => !s.persona)).slice(0, c.size - src.filter((s) => s.persona).length);
      list = [...src.filter((s) => s.persona), ...keep].map((s) => ({ name: s.name, gender: s.gender, persona: PERSONAS.find((p) => p.name === s.persona) }));
    } else {
      const ps = PERSONAS.filter((p) => p.className === c.name);
      list = ps.map((p) => ({ name: p.name, gender: p.gender, persona: p }));
      const names = new Set(list.map((x) => x.name));
      while (list.length < c.size) {
        const g = t.chance(c.level === "ĐH" ? 0.28 : 0.49) ? "Nữ" : "Nam";
        const n = makeName(t, g);
        if (names.has(n)) continue;
        names.add(n);
        list.push({ name: n, gender: g });
      }
    }
    const sorted = [...list].sort((a, b) => compareVietnameseNames(a.name, b.name));
    const mine: Stu[] = [];
    const yob = c.level === "ĐH" ? 2006 : 2021 - c.grade;
    for (const [i, x] of sorted.entries()) {
      const p = x.persona;
      const sid = t.uuid();
      const src = c.from ? roots.get(c.from)!.find((s) => s.name === x.name) : undefined;
      const base = src?.base ?? clamp(t.normal(c.avg / 10 + 0.02, 0.12), 0.28, 0.97);
      const stu: Stu = {
        id: sid, classId: id, cls: c, name: x.name, gender: x.gender, seat: i + 1, pin: String(t.int(0, 999999)).padStart(6, "0"), base,
        sub: new Map(Object.entries(p?.ability ?? {})), diligence: p?.diligence ?? clamp(t.normal(0.93, 0.05), 0.7, 1), trait: p?.trait, persona: p?.name,
      };
      if (p?.name === "Nguyễn Minh Anh" && c.name === "10A1") stu.userId = maUser;
      mine.push(stu);
      const dob = p?.dob ?? `${yob}-${String(t.int(1, 12)).padStart(2, "0")}-${String(t.int(1, 28)).padStart(2, "0")}`;
      studentRows.push({
        id: sid, classId: id, code: c.level === "ĐH" ? `2312${String(100 + i).padStart(4, "0")}` : `79${String(c.grade).padStart(2, "0")}${String(++hsCode).padStart(6, "0")}`, fullName: x.name, dob, gender: x.gender,
        note: "", position: i, seat: i + 1, badgeVersion: 1, userId: stu.userId ?? null, linkPending: false, createdAt: new Date(wk(1, 1, 7) - 5 * D),
      });
    }
    roots.set(c.name, mine);
    students.push(...mine);
  }
  log("students built");
  // PIN: băm scrypt N=1024 (verifyPin đọc N từ chuỗi băm) để dựng nhanh; muối theo hạt giống.
  for (let i = 0; i < studentRows.length; i += 64) {
    await Promise.all(
      studentRows.slice(i, i + 64).map(async (row, j) => {
        const salt = Buffer.from(t.uuid().replace(/-/g, ""), "hex");
        const h = await scrypt(students[i + j]!.pin, salt, 32, { N: 1024, r: 8, p: 1 });
        row.pinHash = `s1$1024$${salt.toString("base64url")}$${h.toString("base64url")}`;
      }),
    );
  }
  await bulk(db, S.classes, classRows);
  await bulk(db, S.students, studentRows);
  count("lớp", classes.length);
  count("học sinh (hồ sơ lớp)", students.length);
  count("học sinh (người)", students.filter((s) => !s.cls.from).length);

  const abilityOf = (s: Stu, subject: string, ms: number) => {
    let a = s.sub.get(subject) ?? clamp(s.base + ((hashStr(s.id + subject) % 1000) / 1000 - 0.5) * 0.14, 0.2, 0.98);
    if (s.trait === "slipping" && subject === "Toán") a = ms > now - 15 * D ? 0.42 : 0.68;
    if (s.cls.name === "11A3" && subject === "Ngữ văn") a += ms > now - 30 * D ? -0.05 : 0.01;
    return clamp(a, 0.05, 0.99);
  };

  log("classes inserted");
  // ---------- Ngân hàng câu hỏi ----------
  const topics = new Map<string, Topic[]>();
  const qRows: (typeof S.questions.$inferInsert)[] = [];
  const ownerFor = (subject: string, grade: number) => {
    const level = grade >= 13 ? "ĐH" : grade >= 10 ? "THPT" : "THCS";
    const named = teachers.find((x) => x.subject === subject && x.levels.includes(level as never) && !x.key.startsWith("gv"));
    return (named ?? teachers.find((x) => x.subject === subject) ?? T("ha")).key;
  };
  for (const tp of data.banks) {
    const key = `${tp.subject}|${tp.grade}`;
    const stored: StoredQuestion[] = tp.qs.map((q) => ({ ...QuestionInput.parse(toQuestion(tp, q)), id: t.uuid() }));
    const owner = U(ownerFor(tp.subject, tp.grade));
    const when = Math.min(wk(Math.max(1, tp.week - 1), 3, 21), now - 3 * D);
    for (const [i, q] of stored.entries()) qRows.push({ id: q.id, orgId, ownerId: owner, subject: q.subject, grade: q.grade, topic: q.topic, level: q.level, type: q.type, body: stripId(q), createdAt: new Date(when + i * 7 * MIN) });
    (topics.get(key) ?? topics.set(key, []).get(key)!).push({ ...tp, stored });
  }
  for (const v of topics.values()) v.sort((a, b) => a.week - b.week);
  await bulk(db, S.questions, qRows);
  count("câu hỏi", qRows.length);
  for (const q of qRows) count(`câu hỏi · ${q.type}`);

  log("bank");
  // ---------- Đề + bài giao + bài làm ----------
  const examRows: (typeof S.exams.$inferInsert)[] = [];
  const examCache = new Map<string, { id: string; variants: Variant[]; minutes: number }>();
  const yccdOf = new Map<string, string>();
  for (const v of topics.values()) for (const tp of v) yccdOf.set(`${tp.subject}|${tp.grade}|${tp.topic}`, tp.yccd);
  function exam(key: string, title: string, subject: string, grade: number, qs: StoredQuestion[], nVar: number, minutes: number, owner: string, createdMs: number) {
    const hit = examCache.get(key);
    if (hit) return hit;
    const cells = new Map<string, { topic: string; level: StoredQuestion["level"]; type: StoredQuestion["type"]; count: number; yccd?: string }>();
    for (const q of qs) {
      const k = `${q.topic}|${q.level}|${q.type}`;
      const c = cells.get(k) ?? cells.set(k, { topic: q.topic, level: q.level, type: q.type, count: 0, yccd: yccdOf.get(`${subject}|${grade}|${q.topic}`) }).get(k)!;
      c.count++;
    }
    const seed = t.int(1, 2_000_000_000);
    const variants = makeVariants(qs, nVar, seed);
    const id = t.uuid();
    examRows.push({ id, orgId, ownerId: owner, title, durationMinutes: minutes, seed, matrix: { subject, grade, cells: [...cells.values()] }, variants, createdAt: new Date(createdMs) });
    const e = { id, variants, minutes };
    examCache.set(key, e);
    return e;
  }

  const asgRows: AsgRow[] = [];
  const subRows: SubRow[] = [];
  const itemRows: (typeof S.answerItems.$inferInsert)[] = [];
  const eventRows: (typeof S.submissionEvents.$inferInsert)[] = [];
  const live: string[] = [];
  /** Kết quả từng HS theo (lớp, môn) để vào sổ điểm. */
  const results = new Map<string, { at: number; kind: string; title: string; s10: number }[]>();
  const pickDistractor = (n: number) => t.weighted([[0, 5], [1, 3], [2, 2]] as const) % n;

  type Plan = {
    cls: ClassSpec; subject: string; owner: string; title: string; kind: "practice" | "test"; qs: StoredQuestion[]; examKey: string; examTitle: string;
    opens: number; due: number; minutes: number | null; nVar: number; attempts: number; /** tỉ lệ bài tự luận GV chưa chấm */ pendingEssays?: number;
    special?: (s: Stu) => { skip?: boolean; inProgress?: number; target10?: number; quit?: boolean } | undefined;
  };
  const plans: Plan[] = [];
  const level = (c: ClassSpec) => c.level;
  const testSlot: Record<string, [number, number]> = { Toán: [2, 0], "Ngữ văn": [3, 1], "Tiếng Anh": [4, 2], "Vật lí": [1, 3], "Hoá học": [5, 1], "Khoa học tự nhiên": [4, 0], "Lịch sử và Địa lí": [5, 2], "Lập trình": [2, 4], "Xác suất thống kê": [3, 4], "Cơ sở dữ liệu": [4, 4] };
  const periodTime = (c: ClassSpec, slot: number): [number, number] => {
    const am: [number, number][] = [[7, 15], [8, 5], [9, 10], [10, 0], [13, 30]];
    const pm: [number, number][] = [[13, 15], [14, 5], [15, 10], [16, 0], [18, 0]];
    return (c.level === "THCS" ? pm : am)[(slot + Number(/\d$/.exec(c.name)?.[0] ?? 1) - 1) % 4]!;
  };
  const dueHour = (subject: string, owner: string) => (owner === "ha" ? 21 : subject === "Ngữ văn" ? 22 : 22);
  const noEssay = (qs: StoredQuestion[]) => qs.filter((q) => q.type !== "essay");

  for (const c of classes) {
    for (const [subject, core] of SUBJECTS_BY_LEVEL[level(c)]!) {
      const owner = teaching.get(`${c.name}|${subject}`);
      if (!owner) continue;
      const grade = c.grade;
      const tps = topics.get(`${subject}|${grade}`) ?? [];
      if (!tps.length) continue;
      const nameOf = c.level === "ĐH" ? subject : `${subject} ${grade}`;
      const [tDay, tSlot] = testSlot[subject] ?? [5, 3];
      tps.forEach((tp, i) => {
        if (tp.week > 13) return;
        const prev = tps[i - 1];
        // Luyện tập: mở thứ Năm tuần học chủ đề, hạn thứ Hai tuần sau
        let qs = subject === "Ngữ văn" ? tp.stored : noEssay(tp.stored);
        if ((qs.length < 5 || subject === "Toán") && prev) qs = [...qs, ...noEssay(prev.stored).slice(0, 3)];
        const ltTitle = c.level === "ĐH" ? `Bài tập tuần ${tp.week} · ${tp.topic}` : `Luyện tập · ${tp.topic}`;
        plans.push({ cls: c, subject, owner, title: ltTitle, kind: "practice", qs, examKey: `${grade}|${subject}|LT|${tp.topic}|${c.from ?? ""}`, examTitle: ltTitle, opens: wk(tp.week, 4, 16, t.int(0, 50)), due: wk(tp.week + 1, 1, dueHour(subject, owner)), minutes: null, nVar: 1, attempts: 3 });
        // Kiểm tra 15′ cho môn chính, chủ đề thứ 2 và thứ 4…
        if (core && i % 2 === 1 && tp.week + 1 <= 12) {
          const kq = [...tp.stored, ...(prev ? noEssay(prev.stored).slice(0, 2) : [])];
          const [hh, mm] = periodTime(c, tSlot);
          const opens = wk(tp.week + 1, tDay, hh, mm);
          const title = c.level === "ĐH" ? `Kiểm tra nhanh · ${tp.topic}` : `Kiểm tra 15′ · ${tp.topic}`;
          plans.push({ cls: c, subject, owner, title, kind: "test", qs: kq, examKey: `${grade}|${subject}|KT|${tp.topic}`, examTitle: `${title} · ${nameOf}`, opens, due: opens + 20 * MIN, minutes: 15, nVar: 2, attempts: 1 });
        }
      });
      // Kiểm tra giữa kì I: tuần 9, mọi chủ đề tới tuần 8
      const gkTopics = tps.filter((x) => x.week <= 8);
      if (core && gkTopics.length) {
        const qs = gkTopics.flatMap((x) => x.stored).slice(0, 24);
        const long = (subject === "Toán" || subject === "Ngữ văn") && c.level !== "THCS" ? 90 : subject === "Toán" || subject === "Ngữ văn" ? 60 : 45;
        const [hh, mm] = periodTime(c, tSlot);
        const opens = wk(9, tDay, hh, mm);
        const title = c.level === "ĐH" ? `Kiểm tra giữa kỳ · ${subject}` : `Kiểm tra giữa kì I · ${nameOf}`;
        plans.push({ cls: c, subject, owner, title, kind: "test", qs, examKey: `${grade}|${subject}|GK|${c.from ?? ""}`, examTitle: title, opens, due: opens + (long + 5) * MIN, minutes: long, nVar: 4, attempts: 1 });
      }
    }
  }

  // ---- Việc "hôm nay" của cô Hà (Toán 10A1, 10A2, 10A3) và tuần này của 10A1 (đủ môn) ----
  const T10 = (name: string) => (topics.get("Toán|10") ?? []).find((x) => x.topic === name);
  const find = (cls: string, title: string) => plans.find((p) => p.cls.name === cls && p.title === title);
  const bpt = T10("Bất phương trình bậc hai một ẩn");
  const dau = T10("Dấu của tam thức bậc hai");
  const lt = (cls: string, topic: string) => find(cls, `Luyện tập · ${topic}`);
  if (bpt && dau) {
    const p1 = lt("10A1", bpt.topic);
    if (p1) Object.assign(p1, { opens: at(-2, 16, 20), due: Math.max(at(0, 21), now + 2 * H), special: (s: Stu) => (s.persona === "Nguyễn Minh Anh" ? { inProgress: 0.6 } : s.persona === "Đỗ Đức Thịnh" ? { skip: true } : undefined) });
    const p3 = lt("10A3", bpt.topic);
    if (p3) Object.assign(p3, { opens: at(-1, 16, 40), due: at(1, 21) });
    const p2 = lt("10A2", bpt.topic);
    if (p2) Object.assign(p2, { opens: at(-4, 16, 10), due: schoolDayBack(1) + 21 * H });
    const kt = (cls: string) => find(cls, `Kiểm tra 15′ · ${dau.topic}`);
    const k2 = kt("10A2");
    const y = schoolDayBack(1);
    if (k2) Object.assign(k2, { opens: y + 9 * H + 10 * MIN, due: y + 9 * H + 30 * MIN, pendingEssays: 0.72 });
    const k1 = kt("10A1");
    if (k1) Object.assign(k1, { opens: schoolDayBack(4) + 7 * H + 15 * MIN, due: schoolDayBack(4) + 7 * H + 35 * MIN, pendingEssays: 0.12 });
    const k3 = kt("10A3");
    if (k3) Object.assign(k3, { opens: schoolDayBack(2) + 10 * H, due: schoolDayBack(2) + 10 * H + 20 * MIN });
    for (const cls of ["10A1", "10A2", "10A3"]) {
      const title = `Bài tập về nhà · ${dau.topic}`;
      plans.push({ cls: classes.find((c) => c.name === cls)!, subject: "Toán", owner: "ha", title, kind: "practice", qs: [...noEssay(dau.stored), ...noEssay(T10("Hàm số bậc hai")?.stored ?? []).slice(0, 3)], examKey: `10|Toán|BTVN|${dau.topic}`, examTitle: title, opens: at(-9, 16, 30), due: at(-5, 21), minutes: null, nVar: 1, attempts: 3 });
    }
    // KT 15′ BPT bậc hai sắp tới (chưa mở) cho 10A1, 10A3
    for (const [cls, day] of [["10A1", 2], ["10A3", 3]] as const) {
      const d0 = schoolDayAhead(day);
      const title = `Kiểm tra 15′ · ${bpt.topic}`;
      plans.push({ cls: classes.find((c) => c.name === cls)!, subject: "Toán", owner: "ha", title, kind: "test", qs: [...bpt.stored, ...noEssay(dau.stored).slice(0, 3)], examKey: `10|Toán|KT|${bpt.topic}`, examTitle: `${title} · Toán 10`, opens: d0 + 7 * H + 15 * MIN, due: d0 + 7 * H + 35 * MIN, minutes: 15, nVar: 2, attempts: 1 });
    }
  }
  // 10A1 các môn khác: tuần này có hạn liên tục (Hôm nay của Minh Anh)
  const extra = (subject: string, topicName: string | undefined, title: string, dueOff: number, hh: number, withEssay = false, maSkip = false) => {
    const tp = (topics.get(`${subject}|10`) ?? []).find((x) => x.topic === topicName) ?? (topics.get(`${subject}|10`) ?? []).slice(-1)[0];
    if (!tp) return;
    for (const cls of ["10A1", "10A2", "10A3", "10A4"]) {
      const owner = teaching.get(`${cls}|${subject}`);
      if (!owner) continue;
      plans.push({ cls: classes.find((c) => c.name === cls)!, subject, owner, title, kind: "practice", qs: withEssay ? tp.stored : noEssay(tp.stored), examKey: `10|${subject}|X|${title}`, examTitle: title, opens: at(-1 - (cls === "10A1" ? 0 : 1), 15, 30), due: Math.max(at(dueOff, hh), now + 3 * H), minutes: null, nVar: 1, attempts: 2, ...(maSkip ? { special: (s: Stu) => (s.persona === "Nguyễn Minh Anh" ? { skip: true } : undefined) } : {}) });
    }
  };
  const hoa = (topics.get("Hoá học|10") ?? []).find((x) => /oxi hoá/i.test(x.topic));
  extra("Hoá học", hoa?.topic, "Bài tập về nhà · Cân bằng phản ứng oxi hoá – khử", 1, 22, false, true);
  extra("Tiếng Anh", (topics.get("Tiếng Anh|10") ?? []).find((x) => /hoàn thành/i.test(x.topic))?.topic, "Luyện tập · Unit 5 · Thì hiện tại hoàn thành", 2, 22);
  extra("Ngữ văn", (topics.get("Ngữ văn|10") ?? []).find((x) => /nghị luận/i.test(x.topic))?.topic, "Viết · Đoạn văn nghị luận về hiền tài", 3, 22, true, true);
  // Hoá 10A1 KT 15′ Oxi hoá – khử tuần trước: Minh Anh 9,5
  if (hoa) {
    const k = find("10A1", `Kiểm tra 15′ · ${hoa.topic}`);
    const opens = dayStart - 7 * D + 8 * H + 5 * MIN;
    const target = (s: Stu) => (s.persona === "Nguyễn Minh Anh" ? { target10: 9.5 } : undefined);
    if (k) Object.assign(k, { opens, due: opens + 20 * MIN, special: target });
    else plans.push({ cls: classes.find((c) => c.name === "10A1")!, subject: "Hoá học", owner: "long", title: `Kiểm tra 15′ · ${hoa.topic}`, kind: "test", qs: hoa.stored, examKey: `10|Hoá học|KT|${hoa.topic}`, examTitle: `Kiểm tra 15′ · ${hoa.topic} · Hoá học 10`, opens, due: opens + 20 * MIN, minutes: 15, nVar: 2, attempts: 1, special: target });
  }
  // Đức Thịnh bỏ 2 bài Toán gần nhất (đã hết hạn) → "HS cần quan tâm"
  for (const p of plans) if (p.cls.name === "10A1" && p.subject === "Toán" && p.kind === "practice" && p.due < now && p.due > now - 24 * D) p.special ??= (s: Stu) => (s.persona === "Đỗ Đức Thịnh" ? { skip: true } : undefined);

  log("plans");
  // ---- Mô phỏng ----
  const byClass = new Map<string, Stu[]>();
  for (const s of students) (byClass.get(s.cls.name) ?? byClass.set(s.cls.name, []).get(s.cls.name)!).push(s);
  for (const p of plans.sort((a, b) => a.opens - b.opens)) {
    const owner = U(p.owner);
    const ex = exam(p.examKey, p.examTitle, p.subject, p.cls.grade, p.qs, p.nVar, p.minutes ?? 45, owner, p.opens - t.int(1, 4) * D);
    const rules = rulesForSubject(p.subject);
    const aid = t.uuid();
    const a: AsgRow = {
      id: aid, orgId, classId: classId.get(p.cls.name)!, ownerId: owner, title: p.title, kind: p.kind, subject: p.subject, source: { examId: ex.id }, variants: ex.variants, rules,
      opensAt: new Date(p.opens), dueAt: new Date(p.due), durationMinutes: p.minutes, attemptsAllowed: p.attempts, showSolution: p.kind === "test" ? "after_due" : "after_submit", shuffle: p.kind === "test",
      status: "published", createdAt: new Date(Math.min(p.opens - t.int(2, 30) * H, now - H)),
    };
    asgRows.push(a);
    if (p.due > now && p.due < dayStart + 2 * D) live.push(aid);
    if (p.opens > now) continue;
    const closed = p.due <= now;
    const frac = closed ? 1 : clamp((now - p.opens) / (p.due - p.opens), 0, 1);
    for (const s of byClass.get(p.cls.name) ?? []) {
      const sp = p.special?.(s);
      if (sp?.skip) continue;
      let doIt = p.kind === "test" ? t.chance(0.975) : t.chance(s.diligence - (s.trait === "quitter" ? 0.12 : 0));
      if (!closed && !sp?.inProgress) doIt = doIt && t.chance(clamp(frac * 1.25, 0, 0.92));
      if (!doIt && !sp?.inProgress && !sp?.target10) continue;
      const v = pickVariant(ex.variants, s.seat, s.id);
      const attempts = p.kind === "practice" && closed && t.chance(0.09) ? 2 : 1;
      for (let k = 1; k <= attempts; k++) {
        // thời điểm làm
        let start: number;
        const lastStart = Math.min(p.due, now) - (p.kind === "test" ? 0 : 25 * MIN);
        if (p.kind === "test") start = p.opens + t.int(0, 150) * 1000;
        else {
          start = p.opens + t.r() * Math.max(10 * MIN, lastStart - p.opens);
          const hr = new Date(start + VN).getUTCHours();
          if (hr < 6 || hr > 23) start = startOfVnDay(new Date(start)).getTime() + (19 + t.r() * 3) * H;
          if (s.trait === "late" || (s.trait === "slipping" && start > now - 7 * D)) start = Math.max(p.opens, Math.min(lastStart, p.due - t.int(15, 70) * MIN));
          if (start > lastStart) start = p.opens + t.r() * Math.max(MIN, lastStart - p.opens);
          if (k === 2) start = Math.min(lastStart, start + t.int(30, 600) * MIN);
        }
        if (sp?.inProgress) start = now - t.int(18, 30) * MIN;
        start = Math.min(start, now - 4 * MIN);
        const deadline = p.minutes === null ? p.due : Math.min(start + p.minutes * MIN, p.due);
        const ab = abilityOf(s, p.subject, start) + (k === 2 ? 0.1 : 0);
        const answers: Answers = {};
        const quitAt = s.trait === "quitter" && p.kind === "test" && t.chance(0.6) ? Math.ceil(v.items.length * 0.6) : Infinity;
        for (const it of v.items) {
          if (sp?.inProgress && it.no > Math.round(v.items.length * sp.inProgress)) break;
          if (it.no > quitAt) break;
          const q = it.question;
          const pr = clamp(ab + (q.level === "NB" ? 0.15 : q.level === "VD" ? -0.2 : 0), 0.04, 0.985);
          const ok = sp?.target10 ? true : t.chance(pr);
          if (q.type === "mcq") answers[String(it.no)] = ok ? q.answer : [0, 1, 2, 3].filter((x) => x !== q.answer)[pickDistractor(3)]!;
          else if (q.type === "true_false") answers[String(it.no)] = q.answer.map((b) => (sp?.target10 || t.chance(clamp(pr + 0.1, 0, 0.99)) ? b : !b));
          else if (q.type === "short_answer") answers[String(it.no)] = ok ? q.answer : wrongShort(q.answer, t);
          else answers[String(it.no)] = essayText(q, ab, t);
        }
        if (sp?.inProgress) {
          const sid = t.uuid();
          subRows.push({ id: sid, assignmentId: aid, studentId: s.id, attempt: 1, variantCode: v.code, seed: t.int(1, 2e9), startedAt: new Date(start), deadlineAt: new Date(deadline), submittedAt: null, status: "in_progress", answers, seq: Object.keys(answers).length, score: null, maxScore: null, pending: 0, leaveCount: 0, updatedAt: new Date(now - t.int(1, 3) * MIN) });
          continue;
        }
        const g = gradeAnswers(v, answers, rules);
        const essays = g.items.filter((i) => i.type === "essay");
        const ungraded = p.pendingEssays !== undefined && t.chance(p.pendingEssays);
        let score = g.score;
        let pending = g.pending;
        for (const e of essays) {
          if (ungraded) continue;
          let pts = Math.round(e.maxPoints * clamp(t.normal(ab, 0.15), 0, 1) * 4) / 4;
          if (sp?.target10) {
            const need = round2((sp.target10 * g.maxScore) / 10 - g.score);
            pts = clamp(need, 0, e.maxPoints);
          }
          e.points = pts;
          e.correct = pts >= e.maxPoints;
          score = round2(score + pts);
          pending--;
        }
        const quick = p.kind === "test" ? (p.minutes ?? 15) * MIN * (0.55 + t.r() * 0.45) : v.items.length * (35 + t.r() * 80) * 1000;
        let submitted = Math.min(start + quick, deadline);
        const auto = quitAt !== Infinity || (p.kind === "test" && t.chance(0.04));
        if (auto) submitted = deadline;
        submitted = Math.min(submitted, now - MIN);
        const sid = t.uuid();
        const leaves = p.kind === "test" ? (t.chance(0.12) ? t.int(1, 3) : 0) : t.chance(0.05) ? 1 : 0;
        subRows.push({ id: sid, assignmentId: aid, studentId: s.id, attempt: k, variantCode: v.code, seed: t.int(1, 2e9), startedAt: new Date(start), deadlineAt: new Date(deadline), submittedAt: new Date(submitted), status: auto ? "auto_submitted" : "submitted", answers, seq: v.items.length + t.int(0, 4), score, maxScore: g.maxScore, pending, leaveCount: leaves, updatedAt: new Date(submitted) });
        for (const i of g.items) itemRows.push({ ...i, submissionId: sid, assignmentId: aid });
        for (let l = 0; l < leaves; l++) {
          const out = start + (submitted - start) * t.r() * 0.9;
          eventRows.push({ id: t.uuid(), submissionId: sid, at: new Date(out), kind: "leave" });
          eventRows.push({ id: t.uuid(), submissionId: sid, at: new Date(out + t.int(4, 50) * 1000), kind: "return" });
        }
        const s10 = toScore10(score, g.maxScore);
        if (s10 !== null && pending === 0) {
          const rk = `${s.id}|${p.subject}`;
          (results.get(rk) ?? results.set(rk, []).get(rk)!).push({ at: submitted, kind: p.kind === "test" ? (p.title.includes("giữa") ? "GK" : "KT") : "LT", title: p.title, s10 });
        }
      }
    }
  }
  log("simulated");
  await bulk(db, S.exams, examRows);
  await bulk(db, S.assignments, asgRows);
  await bulk(db, S.submissions, subRows);
  await bulk(db, S.answerItems, itemRows);
  await bulk(db, S.submissionEvents, eventRows);
  count("đề", examRows.length);
  count("mã đề", examRows.reduce((n, e) => n + (e.variants as Variant[]).length, 0));
  count("bài giao", asgRows.length);
  count("bài làm", subRows.length);
  count("bài làm chờ chấm tự luận", subRows.filter((s) => (s.pending ?? 0) > 0).length);
  count("câu trả lời", itemRows.length);
  count("sự kiện rời tab", eventRows.length);

  log("subs inserted");
  // ---------- Sổ điểm (môn GVCN), điểm danh, nhận xét ----------
  const scoreRows: (typeof S.scores.$inferInsert)[] = [];
  for (const c of classes) {
    const subject = T(c.homeroom).subject;
    const cols = classRows.find((r) => r.name === c.name)!.columns as GradeColumn[];
    const ros = byClass.get(c.name) ?? [];
    const book = new Map<string, Record<string, number>>();
    for (const s of ros) {
      const rs = (results.get(`${s.id}|${subject}`) ?? []).sort((a, b) => a.at - b.at);
      const ab = abilityOf(s, subject, now - 20 * D);
      const fake = () => clamp(Math.round((ab * 10 + t.normal(0.2, 0.9)) * 4) / 4, 2, 10);
      const gk = rs.find((r) => r.kind === "GK")?.s10;
      const tx = rs.filter((r) => r.kind !== "GK").map((r) => r.s10);
      const row: Record<string, number> = {};
      const txCols = cols.filter((x) => x.name.startsWith("TX") || x.name === "CC" || x.name === "BT");
      txCols.forEach((col, i) => {
        const part = tx.slice(Math.floor((i * tx.length) / txCols.length), Math.floor(((i + 1) * tx.length) / txCols.length));
        row[col.name] = part.length ? part.reduce((a, b) => a + b, 0) / part.length : fake();
      });
      row.GK = gk ?? fake();
      row.CK = clamp(Math.round((row.GK! * 0.6 + abilityOf(s, subject, now) * 10 * 0.4 + t.normal(0, 0.5)) * 4) / 4, 1, 10);
      for (const k of Object.keys(row)) row[k] = clamp(Math.round(row[k]! * 10) / 10, 0, 10);
      const fixed = s.persona && !c.from ? PERSONA_BOOK[s.persona] : undefined;
      if (fixed !== undefined) {
        // TX lệch ±0,3 từng cặp (lẻ thì cột cuối bằng đúng điểm), GK = điểm → TB đúng bằng điểm nhân vật
        const ks = Object.keys(row).filter((k) => k !== "GK" && k !== "CK");
        ks.forEach((k, i) => (row[k] = Math.round((fixed + (ks.length % 2 && i === ks.length - 1 ? 0 : i % 2 ? -0.3 : 0.3)) * 10) / 10));
        row.GK = fixed;
        row.CK = fixed;
      }
      book.set(s.id, row);
    }
    // TB lớp đúng bằng số của thế giới mẫu: dời đều rồi chỉnh từng 0,1
    const free = ros.filter((s) => !(s.persona && PERSONA_BOOK[s.persona] !== undefined && !c.from));
    const rawMean = () => {
      const v = ros.map((s) => partialAverage(cols, book.get(s.id)!)).filter((x): x is number => x !== null);
      return v.reduce((a, b) => a + b, 0) / v.length;
    };
    const mean = () => Math.round(rawMean() * 10) / 10;
    const shiftAll = (by: number) => {
      for (const s of free) {
        const row = book.get(s.id)!;
        for (const k of Object.keys(row)) row[k] = clamp(Math.round((row[k]! + by) * 10) / 10, 0, 10);
      }
    };
    for (let n = 0; n < 3; n++) shiftAll(Math.round(((c.avg - rawMean()) * ros.length) / Math.max(1, free.length) * 10) / 10);
    for (let n = 0; n < 3000 && mean() !== c.avg; n++) {
      const up = mean() < c.avg;
      const row = book.get(free[t.int(0, free.length - 1)]!.id)!;
      const k = t.pick(Object.keys(row));
      row[k] = clamp(Math.round((row[k]! + (up ? 0.1 : -0.1)) * 10) / 10, 0, 10);
    }
    for (const s of ros) for (const [column, value] of Object.entries(book.get(s.id)!)) scoreRows.push({ studentId: s.id, term: "HK1", column, value });
  }
  await bulk(db, S.scores, scoreRows);
  count("ô điểm sổ điểm", scoreRows.length);

  log("scores");
  const attRows: (typeof S.attendance.$inferInsert)[] = [];
  const lastSat = (() => {
    let d = dayStart - D;
    while (dow(d) !== 6) d -= D;
    return vnDate(d);
  })();
  for (let d = week1; d <= dayStart; d += D) {
    if (dow(d) === 0 || (d === dayStart && now - dayStart < 7.5 * H)) continue;
    const iso = vnDate(d);
    for (const s of students) {
      if (s.cls.from || (s.cls.level === "ĐH" && dow(d) === 6)) continue;
      let status = "present";
      const r = t.r();
      if (r < 0.013) status = "excused";
      else if (r < 0.017) status = "unexcused";
      if (s.persona === "Trần Khánh Duy" && iso === lastSat) status = "excused";
      if (s.persona === "Nguyễn Minh Anh") status = "present";
      attRows.push({ studentId: s.id, date: iso, status });
    }
  }
  await bulk(db, S.attendance, attRows);
  count("lượt điểm danh", attRows.length);

  const comRows: (typeof S.comments.$inferInsert)[] = [];
  for (const cname of ["10A1", "10A2", "11A3", "8A2", "12A1", "KTPM K23"]) {
    const c = classes.find((x) => x.name === cname)!;
    const cols = classRows.find((r) => r.name === cname)!.columns as GradeColumn[];
    const ros = byClass.get(cname) ?? [];
    for (const [i, s] of ros.entries()) {
      if (cname !== "10A1" && i % 3 === 2) continue; // các lớp khác đang nhập dở
      const row = Object.fromEntries(scoreRows.filter((x) => x.studentId === s.id).map((x) => [x.column, x.value])) as Record<string, number>;
      const avg = partialAverage(cols, row) ?? 6;
      const lv = avg >= 8 ? "Tốt" : avg >= 6.5 ? "Khá" : avg >= 5 ? "Đạt" : "Chưa đạt";
      const pool = data.comments[lv] ?? [];
      if (!pool.length) continue;
      comRows.push({ studentId: s.id, term: "HK1", text: pool[(i * 7 + c.grade) % pool.length]!, level: lv, updatedAt: new Date(now - t.int(1, 9) * D - t.int(0, 600) * MIN) });
    }
  }
  await bulk(db, S.comments, comRows);
  count("nhận xét", comRows.length);

  log("att+comments");
  // ---------- Nội dung GV soạn ----------
  const lessonIds = new Map<string, string>();
  const lpRows: (typeof S.lessonPlans.$inferInsert)[] = [];
  for (const l of data.lessons) {
    const teachMs = l.teachDay >= 0 ? (l.teachDay === 0 ? dayStart : schoolDayAhead(l.teachDay)) : schoolDayBack(-l.teachDay);
    const plan = { ...l.plan, header: { ...l.plan.header, date: viDate(teachMs) } };
    const v = validateLessonPlan(plan);
    if (!v.ok) throw new Error(`giáo án ${l.plan.header.title}: ${v.issues.join("; ")}`);
    const id = t.uuid();
    lessonIds.set(v.plan.header.title, id);
    const made = Math.min(teachMs - t.int(2, 6) * D - t.int(0, 300) * MIN, now - 2 * H);
    lpRows.push({ id, orgId, ownerId: U(l.owner), subject: v.plan.header.subject, grade: v.plan.header.grade ?? 10, title: v.plan.header.title, body: v.plan, createdAt: new Date(made), updatedAt: new Date(Math.min(made + t.int(1, 40) * H, now - H)) });
  }
  await bulk(db, S.lessonPlans, lpRows);
  count("giáo án", lpRows.length);

  const deckRows: (typeof S.decks.$inferInsert)[] = [];
  for (const [i, d] of data.decks.entries()) {
    const v = validateDeck(d.deck);
    if (!v.ok) throw new Error(`slide ${d.deck.title}: ${v.issues.join("; ")}`);
    const made = now - (3 + i * 4) * D - t.int(0, 600) * MIN;
    deckRows.push({ id: t.uuid(), orgId, ownerId: U(d.owner), title: v.deck.title, sourceLessonPlanId: d.fromLesson ? (lessonIds.get(d.fromLesson) ?? null) : null, body: v.deck, createdAt: new Date(made), updatedAt: new Date(made + t.int(1, 30) * H) });
  }
  await bulk(db, S.decks, deckRows);
  count("bộ slide", deckRows.length);

  const aiRows: (typeof S.aiLessons.$inferInsert)[] = [];
  for (const [li, l] of data.aiLessons.entries()) {
    const stageId = t.uuid();
    const outline: SceneOutline[] = l.scenes.map((s, i) => ({
      id: `s${i + 1}`, type: s.type, title: s.title, description: s.description, keyPoints: s.keyPoints, order: i + 1,
      ...(s.type === "quiz" ? { quizConfig: { questionCount: s.questions.length, difficulty: "medium" as const, questionTypes: ["single" as const] } } : {}),
    })) as SceneOutline[];
    const scenes: unknown[] = [];
    for (const [i, s] of l.scenes.entries()) {
      const o = outline[i]!;
      let reply: string;
      if (s.type === "slide") {
        const els: Record<string, unknown>[] = [
          { id: "t1", type: "text", left: 60, top: 36, width: 880, height: 72, content: `<p><strong><span style="font-size:32px">${esc(plainMath(s.heading))}</span></strong></p>`, defaultFontName: "", defaultColor: "#1F2A44" },
          { id: "t2", type: "text", left: 70, top: 132, width: s.formula ? 860 : 860, height: Math.min(300, 52 * s.bullets.length + 20), content: s.bullets.map((b) => `<p><span style="font-size:22px">• ${esc(plainMath(b))}</span></p>`).join(""), defaultFontName: "", defaultColor: "#2B2F36" },
        ];
        if (s.formula) els.push({ id: "l1", type: "latex", left: 180, top: 150 + Math.min(300, 52 * s.bullets.length + 20), width: 640, height: 90, latex: s.formula });
        reply = JSON.stringify({ elements: els, background: { type: "solid", color: "#FDFCF9" } });
      } else {
        reply = JSON.stringify(s.questions.map((q, k) => ({ id: `q${k + 1}`, type: "single", question: q.question, options: q.options.map((label, j) => ({ label, value: "ABCD"[j] })), answer: ["ABCD"[q.answer]], analysis: q.analysis, points: 10 })));
      }
      const content = await generateSceneContent(o, async () => reply, { languageDirective: "", logger: noLog });
      if (!content) throw new Error(`bài giảng AI ${l.title}: cảnh ${i + 1} không dựng được`);
      const acts = JSON.stringify([...(s.type === "slide" ? [{ type: "action", name: "spotlight", params: { elementId: "t2" } }] : []), ...s.speech.map((x) => ({ type: "text", content: x }))]);
      const actions = await generateSceneActions(o, content, async () => acts, { languageDirective: "", logger: noLog, ctx: { pageIndex: i + 1, totalPages: l.scenes.length, allTitles: l.scenes.map((x) => x.title), previousSpeeches: [] } });
      const scene = buildCompleteScene(o, content, actions, stageId) as (Record<string, unknown> & { id: string; type: string; content: { questions?: QuizQ[] } }) | null;
      if (!scene) throw new Error(`bài giảng AI ${l.title}: cảnh ${i + 1} lỗi`);
      if (scene.type === "quiz") scene.quizVoice = quizVoiceLines(scene.content.questions ?? [], scene.id);
      scenes.push(scene);
    }
    const made = now - (2 + li * 5) * D - t.int(0, 500) * MIN;
    aiRows.push({ id: t.uuid(), orgId, ownerId: U(l.owner), title: l.title, subject: l.subject, grade: l.grade, status: "done", progress: { done: scenes.length, total: scenes.length, stage: "Hoàn tất" }, request: { requirement: l.requirement, sceneCount: scenes.length }, outline, scenes, createdAt: new Date(made), updatedAt: new Date(made + t.int(5, 40) * MIN) });
  }
  await bulk(db, S.aiLessons, aiRows);
  count("bài giảng AI", aiRows.length);
  count("cảnh bài giảng AI", aiRows.reduce((n, r) => n + (r.scenes as unknown[]).length, 0));

  const boardRows: (typeof S.boards.$inferInsert)[] = [];
  for (const [i, b] of data.boards.entries()) {
    const pages = b.pages.map((pg, pi) => {
      // bảng phấn nền tối: chữ màu phấn (bảng màu web/src/board/doc.ts)
      const g = !!pg.graph;
      const rows = pg.lines.flatMap((line, li) => wrapBoard(line, li === 0 ? (g ? 34 : 52) : g ? 44 : 66).map((text, k) => ({ text, li, k })));
      const objects: Record<string, unknown>[] = rows.map((r, ri) => ({ type: "text", id: `p${pi}t${ri}`, x: 60, y: 46 + ri * (g ? 50 : 56) + (r.li > 0 ? 14 : 0), size: r.li === 0 ? 28 : g ? 21 : 24, color: r.li === 0 ? "#ffb547" : r.li % 3 === 2 ? "#5cc8ff" : "#f3f0e6", text: r.text }));
      if (pg.graph) objects.push({ type: "graph", id: `p${pi}g`, x: 740, y: 130, w: 500, h: 420, exprs: pg.graph.exprs.map((latex, k) => ({ latex, color: ["#ff7a6b", "#5cc8ff", "#7ee2a8"][k % 3] })), params: {}, view: pg.graph.view });
      return { id: `p${pi + 1}`, objects };
    });
    const v = validateBoard({ title: b.title, subject: b.subject, grade: b.grade, topic: b.topic, doc: { version: 1, pages } }, "save");
    if (!v.ok) throw new Error(`bảng giảng ${b.title}: ${v.issues.join("; ")}`);
    const made = now - (1 + i * 3) * D - t.int(0, 600) * MIN;
    boardRows.push({ id: t.uuid(), orgId, ownerId: U(b.owner), title: v.board.title, subject: v.board.subject, grade: v.board.grade, topic: v.board.topic, body: v.board.doc, createdAt: new Date(made), updatedAt: new Date(made + t.int(1, 20) * H) });
  }
  await bulk(db, S.boards, boardRows);
  count("bảng giảng", boardRows.length);

  const diaRows: (typeof S.diagrams.$inferInsert)[] = [];
  for (const [i, d] of data.diagrams.entries()) {
    const doc = d.kind === "mind" ? layoutMind(d.root) : layoutFlow(d.nodes, d.edges);
    const v = validateDiagram({ title: d.title, subject: d.subject, grade: d.grade, topic: d.topic, doc }, "save");
    if (!v.ok) throw new Error(`sơ đồ ${d.title}: ${v.issues.join("; ")}`);
    const made = now - (2 + i * 4) * D - t.int(0, 600) * MIN;
    diaRows.push({ id: t.uuid(), orgId, ownerId: U(d.owner), title: v.diagram.title, subject: v.diagram.subject, grade: v.diagram.grade, topic: v.diagram.topic, body: v.diagram.doc, createdAt: new Date(made), updatedAt: new Date(made + t.int(1, 30) * H) });
  }
  await bulk(db, S.diagrams, diaRows);
  count("sơ đồ", diaRows.length);

  // Trò chơi ôn tập từ ngân hàng
  const gameRows: (typeof S.games.$inferInsert)[] = [];
  const gamePicks: [string, number, string, "quiz" | "flashcards", string][] = [
    ["Toán", 10, "Bất phương trình bậc hai một ẩn", "quiz", "ha"], ["Toán", 10, "Dấu của tam thức bậc hai", "flashcards", "ha"], ["Toán", 10, "Hàm số bậc hai", "quiz", "ha"],
    ["Hoá học", 10, "", "quiz", "long"], ["Tiếng Anh", 10, "", "flashcards", "minh"], ["Vật lí", 10, "", "quiz", "binh"], ["Lịch sử", 12, "", "quiz", "phuong"],
    ["Khoa học tự nhiên", 8, "", "quiz", "lan"], ["Ngữ văn", 11, "", "flashcards", "bao-gv"], ["Lập trình", 14, "", "quiz", "khai"], ["Địa lí", 10, "", "flashcards", "phuong"],
  ];
  for (const [i, [subject, grade, topic, kind, owner]] of gamePicks.entries()) {
    const list = topics.get(`${subject}|${grade}`) ?? [];
    const tp = list.find((x) => x.topic === topic) ?? list[list.length - 1];
    if (!tp) continue;
    const qs = [...tp.stored, ...(list[list.indexOf(tp) - 1]?.stored ?? [])];
    const g = buildGame(kind, qs, { timerSeconds: kind === "quiz" ? 20 : 0, source: `Ngân hàng · ${tp.topic}` });
    if (!g.ok) continue;
    const made = now - (1 + i * 3) * D - t.int(0, 500) * MIN;
    gameRows.push({ id: t.uuid(), orgId, ownerId: U(owner), title: `${kind === "quiz" ? "Đố nhanh" : "Thẻ lật"} · ${tp.topic}`, kind, body: g.body, createdAt: new Date(made), updatedAt: new Date(made) });
  }
  await bulk(db, S.games, gameRows);
  count("trò chơi", gameRows.length);

  const vbRows: (typeof S.vanBan.$inferInsert)[] = [];
  for (const d of data.vanban) {
    const v = validateVanBan(d.input);
    if (!v.ok) throw new Error(`văn bản: ${v.issues.join("; ")}`);
    const made = now - d.daysAgo * D - t.int(0, 400) * MIN;
    vbRows.push({ id: t.uuid(), orgId, ownerId: U(d.owner), loai: v.doc.loai, trichYeu: v.doc.trich_yeu, body: v.doc, createdAt: new Date(made), updatedAt: new Date(made + t.int(5, 300) * MIN) });
  }
  await bulk(db, S.vanBan, vbRows);
  count("văn bản hành chính", vbRows.length);

  log("content");
  // ---------- Đấu trường: phiên đã chơi ----------
  const liveRows: (typeof S.liveSessions.$inferInsert)[] = [];
  const liveRes: (typeof S.liveResults.$inferInsert)[] = [];
  const sessionsPlan: [string, number, string, number][] = [
    ["10A1", 0, "Bất phương trình bậc hai một ẩn", 2], ["10A1", 1, "Dấu của tam thức bậc hai", 6], ["10A2", 2, "Dấu của tam thức bậc hai", 5], ["10A3", 3, "Hàm số bậc hai", 13],
    ["10A1", 4, "Hàm số bậc hai", 16], ["10A2", 5, "Hàm số và đồ thị", 30],
  ];
  const otherLive: [string, string, number, string][] = [["11A3", "Ngữ văn", 11, "bao-gv"], ["8A2", "Khoa học tự nhiên", 8, "lan"], ["12A1", "Lịch sử", 12, "phuong"], ["KTPM K23", "Lập trình", 14, "khai"]];
  const playLive = (cname: string, owner: string, title: string, qs: StoredQuestion[], daysAgo: number, subject: string) => {
    const g = buildGame("quiz", qs, { timerSeconds: 20, source: title });
    if (!g.ok) return;
    const items = g.body.items.slice(0, 10);
    const ros = (byClass.get(cname) ?? []).filter(() => t.chance(0.93));
    const started = Math.min(schoolDayBack(daysAgo) + t.int(8, 10) * H + t.int(0, 50) * MIN, now - 3 * H);
    const qstats: S.LiveQStat[] = items.map((it, i) => ({ i, q: it.q.slice(0, 200), kind: it.kind, answered: 0, correct: 0, counts: it.kind === "choice" ? (it.options ?? []).map(() => 0) : [] }));
    const players = ros.map((s) => {
      let score = 0;
      let streak = 0;
      let correct = 0;
      const answers: S.LiveAnswer[] = items.map((it, i) => {
        const ok = t.chance(clamp(abilityOf(s, subject, started) + 0.05, 0.1, 0.97));
        const ms = t.int(2500, 18500);
        streak = ok ? streak + 1 : 0;
        const pts = scoreAnswer(ok, ms, 20000, streak);
        score += pts;
        if (ok) correct++;
        const st = qstats[i]!;
        st.answered++;
        if (ok) st.correct++;
        if (it.kind === "choice" && st.counts.length) {
          const ans = it.answer as number;
          st.counts[ok ? ans : (ans + 1 + t.int(0, st.counts.length - 2)) % st.counts.length]! += 1;
        }
        return { i, ok, pts, ms };
      });
      return { s, score, correct, answers };
    });
    players.sort((a, b) => b.score - a.score || b.correct - a.correct || a.s.name.localeCompare(b.s.name, "vi"));
    const sid = t.uuid();
    liveRows.push({ id: sid, orgId, ownerId: U(owner), classId: classId.get(cname)!, title, questionCount: items.length, qstats, startedAt: new Date(started), endedAt: new Date(started + t.int(9, 14) * MIN) });
    players.forEach((p, i) => liveRes.push({ id: t.uuid(), sessionId: sid, studentId: p.s.id, name: p.s.name, rank: i + 1, score: p.score, correctCount: p.correct, answers: p.answers }));
    void gradebookScore;
  };
  for (const [cname, , topic, daysAgo] of sessionsPlan) {
    const tp = T10(topic);
    if (tp) playLive(cname, "ha", `Đấu trường · ${tp.topic}`, [...tp.stored], daysAgo, "Toán");
  }
  for (const [cname, subject, grade, owner] of otherLive) {
    const list = topics.get(`${subject}|${grade}`) ?? [];
    const tp = list[list.length - 1];
    if (tp) playLive(cname, owner, `Đấu trường · ${tp.topic}`, [...tp.stored, ...(list[list.length - 2]?.stored ?? [])], t.int(3, 20), subject);
  }
  await bulk(db, S.liveSessions, liveRows);
  await bulk(db, S.liveResults, liveRes);
  count("phiên đấu trường", liveRows.length);
  count("lượt chơi đấu trường", liveRes.length);

  // ---------- Chấm ảnh: phiếu tô trắc nghiệm giữa kì 10A3 + bài viết tay ----------
  const photoRows: (typeof S.photoResults.$inferInsert)[] = [];
  const toanGk = (topics.get("Toán|10") ?? []).filter((x) => x.week <= 8).flatMap((x) => noEssay(x.stored));
  if (toanGk.length >= 8) {
    const ex = exam("10|Toán|OMR", "Đề giữa kì I · Toán 10 · phiếu tô (giấy)", "Toán", 10, toanGk.slice(0, 22), 4, 90, U("ha"), wk(8, 5, 15));
    await db.insert(S.exams).values(examRows[examRows.length - 1]!);
    count("đề", 1);
    const scanDay = wk(9, 3, 20);
    for (const s of byClass.get("10A3") ?? []) {
      const v = pickVariant(ex.variants, s.seat, s.id);
      const resp: Record<number, number | boolean[] | string | null> = {};
      const ab = abilityOf(s, "Toán", scanDay);
      for (const it of v.items) {
        const q = it.question;
        const ok = t.chance(clamp(ab + (q.level === "NB" ? 0.15 : q.level === "VD" ? -0.2 : 0), 0.05, 0.98));
        if (q.type === "mcq") resp[it.no] = ok ? q.answer : (q.answer + 1 + t.int(0, 2)) % 4;
        else if (q.type === "true_false") resp[it.no] = q.answer.map((b) => (t.chance(clamp(ab + 0.1, 0, 0.99)) ? b : !b));
        else if (q.type === "short_answer") resp[it.no] = ok ? q.answer : wrongShort(q.answer, t);
      }
      const r = gradeVariant(v, resp, rulesForSubject("Toán"));
      const doubts = t.chance(0.2) ? t.int(1, 3) : 0;
      photoRows.push({ id: t.uuid(), orgId, ownerId: U("ha"), kind: "omr", examId: ex.id, student: `${s.seat} · ${s.name}`, title: `Mã đề ${v.code}`, total: r.total, max: r.autoMax, body: { code: v.code, sbd: String(s.seat).padStart(2, "0"), classId: classId.get("10A3"), studentId: s.id, responses: resp, doubts, edited: doubts ? t.int(0, doubts) : 0, items: r.items, pendingEssay: r.pendingEssay }, createdAt: new Date(scanDay + photoRows.length * 25_000) });
    }
  }
  const vanTp = (topics.get("Ngữ văn|11") ?? []).find((x) => /nghị luận/i.test(x.topic));
  const vanEssay = vanTp?.stored.find((q) => q.type === "essay");
  if (vanEssay && vanEssay.type === "essay") {
    for (const s of (byClass.get("11A3") ?? []).slice(0, 9)) {
      const ab = abilityOf(s, "Ngữ văn", now - 3 * D);
      const crit = [
        { name: "Bảo đảm cấu trúc đoạn văn nghị luận", max: 0.5 },
        { name: "Xác định đúng vấn đề nghị luận", max: 0.5 },
        { name: "Triển khai luận điểm, lí lẽ và dẫn chứng", max: 2 },
        { name: "Chính tả, ngữ pháp, diễn đạt", max: 0.5 },
        { name: "Sáng tạo", max: 0.5 },
      ].map((c) => ({ ...c, points: Math.round(c.max * clamp(t.normal(ab, 0.15), 0, 1) * 4) / 4 }));
      const total = round2(crit.reduce((a, c) => a + c.points, 0));
      photoRows.push({
        id: t.uuid(), orgId, ownerId: U("bao-gv"), kind: "essay", examId: null, student: `${s.seat} · ${s.name}`, title: "Viết đoạn văn nghị luận (bài viết tay)", total, max: 4,
        body: { transcript: essayText(vanEssay, ab, t), criteria: crit, comment: total >= 3 ? "Đoạn văn mạch lạc, luận điểm rõ; cần thêm dẫn chứng cụ thể từ đời sống." : total >= 2 ? "Đã nêu được vấn đề nhưng lí lẽ còn chung chung; chú ý câu chủ đề và liên kết câu." : "Đoạn văn còn lan man, chưa bám đề; em lập dàn ý ngắn trước khi viết.", classId: classId.get("11A3"), studentId: s.id },
        createdAt: new Date(now - 2 * D - t.int(0, 300) * MIN),
      });
    }
  }
  await bulk(db, S.photoResults, photoRows);
  count("kết quả chấm ảnh", photoRows.length);

  // ---------- Lời giải từng bước (thư viện công khai) ----------
  const solRows: (typeof S.solutions.$inferInsert)[] = [];
  const slugs = new Set<string>();
  for (const s of data.solutions) {
    const p = parseSolution(s.solution);
    if (!p.ok) throw new Error(`lời giải: ${p.issues.join("; ")}`);
    const sol = { ...p.solution, verification: verifySolution(p.solution) };
    let sl = slugOf(sol.problem, t.uuid().slice(0, 6));
    while (slugs.has(sl)) sl = slugOf(sol.problem, t.uuid().slice(0, 6));
    slugs.add(sl);
    const made = now - s.daysAgo * D - t.int(0, 600) * MIN;
    solRows.push({ id: t.uuid(), orgId, ownerId: U(s.owner), questionId: null, subject: sol.subject, topic: sol.topic, status: sol.verification.status, body: sol, slug: sl, views: s.views, publishedAt: new Date(made + t.int(10, 120) * MIN), createdAt: new Date(made), updatedAt: new Date(made + t.int(5, 60) * MIN) });
  }
  await bulk(db, S.solutions, solRows);
  count("lời giải công khai", solRows.length);

  log("live+photo+solutions");
  // ---------- Gia sư: kho tri thức, phiên chat, thẻ ôn, lộ trình, giáo trình ----------
  const kbIds = new Map<string, string>();
  const docIds = new Map<string, Map<string, string>>();
  const kbRows: (typeof S.tutorKbs.$inferInsert)[] = [];
  const docRows: (typeof S.tutorDocs.$inferInsert)[] = [];
  const chunkRows: (typeof S.tutorChunks.$inferInsert)[] = [];
  for (const [i, k] of data.kbs.entries()) {
    const id = t.uuid();
    kbIds.set(k.key, id);
    const made = wk(2 + (data.kbs.length - 1 - i), 2, 20);
    kbRows.push({ id, orgId, ownerId: U(k.owner), name: k.name, subject: k.subject, grade: k.grade, classId: k.className ? (classId.get(k.className) ?? null) : null, createdAt: new Date(made) });
    const dm = new Map<string, string>();
    docIds.set(k.key, dm);
    for (const [j, d] of k.docs.entries()) {
      const did = t.uuid();
      dm.set(d.name, did);
      docRows.push({ id: did, kbId: id, orgId, name: d.name, source: d.source, pages: d.pages.length, chars: d.pages.reduce((a, p) => a + p.length, 0), createdAt: new Date(made + (j + 1) * 7 * MIN) });
      for (const c of chunkPages(d.pages)) chunkRows.push({ id: t.uuid(), docId: did, kbId: id, page: c.page, idx: c.idx, text: c.text });
    }
  }
  await bulk(db, S.tutorKbs, kbRows);
  await bulk(db, S.tutorDocs, docRows);
  await bulk(db, S.tutorChunks, chunkRows);
  count("kho tri thức", kbRows.length);
  count("tài liệu kho", docRows.length);
  count("đoạn chỉ mục", chunkRows.length);

  const sesRows: (typeof S.tutorSessions.$inferInsert)[] = [];
  const msgRows: (typeof S.tutorMessages.$inferInsert)[] = [];
  for (const c of data.chats) {
    const id = t.uuid();
    const start = Math.min(at(-c.daysAgo, c.hour, t.int(0, 40)), now - 30 * MIN);
    const kbId = c.kbKey ? (kbIds.get(c.kbKey) ?? null) : null;
    const dm = c.kbKey ? docIds.get(c.kbKey) : undefined;
    let ts = start;
    c.messages.forEach((m, j) => {
      ts += (m.role === "user" ? t.int(40, 150) : t.int(6, 20)) * 1000;
      const citations = (m.cite ?? []).map((x) => ({ n: x.n, docId: dm?.get(x.doc) ?? "", doc: x.doc, page: x.page, snippet: x.snippet })).filter((x) => x.docId);
      msgRows.push({ id: t.uuid(), sessionId: id, seq: j + 1, role: m.role, content: m.content, citations, createdAt: new Date(Math.min(ts, now - MIN)) });
    });
    sesRows.push({ id, orgId, learnerKey: maUser, kbId, mode: c.mode, title: c.title, summary: c.summary ?? "", summarizedCount: c.summary ? Math.max(0, c.messages.length - 4) : 0, context: {}, createdAt: new Date(start), updatedAt: new Date(Math.min(ts, now - MIN)) });
  }
  await bulk(db, S.tutorSessions, sesRows);
  await bulk(db, S.tutorMessages, msgRows);
  count("phiên gia sư", sesRows.length);
  count("tin nhắn gia sư", msgRows.length);

  // Thẻ ôn SM-2 của Minh Anh (câu lớp 10 nhiều môn) + lượt ôn mỗi tối 20–22h, chuỗi ngày liên tục
  const reviewSubjects = ["Toán", "Hoá học", "Tiếng Anh", "Vật lí", "Sinh học", "Lịch sử", "Ngữ văn", "Địa lí"];
  const cards: StoredQuestion[] = [];
  for (const subj of reviewSubjects) {
    const list = (topics.get(`${subj}|10`) ?? []).filter((x) => x.week <= 12);
    for (const tp of list.slice(-3)) cards.push(...noEssay(tp.stored).slice(0, subj === "Toán" ? 3 : 2));
  }
  const rsRows: (typeof S.tutorReviewState.$inferInsert)[] = [];
  const reRows: (typeof S.tutorReviewEvents.$inferInsert)[] = [];
  cards.forEach((q, i) => {
    const due = i % 4 === 0 || (q.subject === "Toán" && i % 2 === 0);
    const interval = [1, 3, 6, 9.5, 14][i % 5]!;
    const dueAt = due ? now - t.int(1, 20) * H : now + t.int(1, 6) * D + t.int(0, 12) * H;
    const wrong = q.subject === "Toán" ? i % 3 === 0 : i % 7 === 3;
    rsRows.push({
      orgId, learnerKey: maUser, questionId: q.id, subject: q.subject, grade: q.grade, topic: q.topic, intervalDays: interval, ease: wrong ? 2.1 : 2.5 + (i % 3) * 0.1, streak: wrong ? 0 : 1 + (i % 4), lapses: wrong ? 1 + (i % 2) : 0,
      reviewCount: 2 + (i % 5), version: 2 + (i % 5), dueAt: new Date(dueAt), lastReviewAt: new Date(Math.min(dueAt - interval * D, now - 2 * H)), prev: null, lastCorrect: !wrong, isMistake: wrong, firstWrongAt: wrong ? new Date(now - t.int(4, 20) * D) : null,
    });
  });
  // 70 ngày, nghỉ một tối cách đây 26 ngày → chuỗi hiện tại 25 ngày, dài nhất 43 ngày
  for (let back = 69; back >= 0; back--) {
    if (back === 26) continue;
    const n = back === 0 ? (now - dayStart > 20.5 * H ? 6 : 0) : 4 + ((back * 7) % 6);
    const base = at(-back, 20, t.int(5, 40));
    for (let j = 0; j < n && cards.length; j++) {
      const q = cards[(back * 5 + j) % cards.length]!;
      const ok = t.chance(q.subject === "Toán" ? 0.68 : 0.86);
      reRows.push({ id: t.uuid(), orgId, learnerKey: maUser, questionId: q.id, rating: ok ? (t.chance(0.2) ? "easy" : "good") : "again", correct: ok, reviewedAt: new Date(Math.min(base + j * t.int(2, 6) * MIN, now - 5 * MIN)) });
    }
  }
  await bulk(db, S.tutorReviewState, rsRows);
  await bulk(db, S.tutorReviewEvents, reRows);
  count("thẻ ôn SM-2", rsRows.length);
  count("lượt ôn", reRows.length);

  const pathRows: (typeof S.tutorPaths.$inferInsert)[] = [];
  for (const p of data.paths) {
    const pts: Point[] = [];
    const modules = p.modules.map((m, mi) => ({
      name: m.name, objective: m.objective,
      pointIds: m.points.map((x, xi) => {
        const id = `p${mi + 1}_${xi + 1}`;
        const mastered = x.mastery >= MASTERY_THRESHOLD && x.attempts >= 2;
        pts.push({ id, name: x.name, type: x.type, mastery: x.mastery, attempts: x.attempts, status: x.attempts === 0 ? "new" : mastered ? "mastered" : "learning", explained: x.attempts > 0, reviewRound: mastered ? 1 : 0, nextReviewAt: mastered ? now + t.int(1, 9) * D : null });
        return id;
      }),
    }));
    const errors = p.errors.map((e) => ({ pointId: pts.find((x) => x.name === e.point)?.id ?? pts[0]!.id, question: e.question, errorType: e.errorType, remediation: e.remediation, at: now - e.daysAgo * D }));
    const made = now - p.daysAgo * D;
    pathRows.push({ id: t.uuid(), orgId, learnerKey: maUser, kbId: p.kbKey ? (kbIds.get(p.kbKey) ?? null) : null, name: p.name, goal: p.goal, subject: p.subject, grade: p.grade, body: { description: p.description, modules, points: pts, pending: null, diagnosed: true, errors }, createdAt: new Date(made), updatedAt: new Date(now - t.int(2, 30) * H) });
  }
  await bulk(db, S.tutorPaths, pathRows);
  count("lộ trình", pathRows.length);

  const bookRows: (typeof S.tutorBooks.$inferInsert)[] = [];
  const pageRows: (typeof S.tutorBookPages.$inferInsert)[] = [];
  for (const [i, b] of data.books.entries()) {
    const id = t.uuid();
    const made = now - (6 + i * 9) * D;
    bookRows.push({ id, orgId, ownerId: U(b.owner), kbId: b.kbKey ? (kbIds.get(b.kbKey) ?? null) : null, title: b.title, description: b.description, scope: b.scope, level: b.level, createdAt: new Date(made), updatedAt: new Date(made + 2 * D) });
    const dm = b.kbKey ? docIds.get(b.kbKey) : undefined;
    const fix = (bl: DBook["pages"][number]["blocks"]) => bl.map((x) => (x.citations ? { ...x, citations: x.citations.map((c) => ({ ...c, docId: c.docId || (dm?.get(c.doc) ?? "") })).filter((c) => c.docId) } : x));
    b.pages.forEach((pg, j) => pageRows.push({ id: t.uuid(), bookId: id, idx: j, title: pg.title, summary: pg.summary, objectives: pg.objectives, contentType: pg.contentType, status: pg.blocks.length ? "ready" : "planned", blocks: fix(pg.blocks), updatedAt: new Date(made + (j + 1) * H) }));
  }
  await bulk(db, S.tutorBooks, bookRows);
  await bulk(db, S.tutorBookPages, pageRows);
  count("giáo trình", bookRows.length);
  count("trang giáo trình", pageRows.length);

  // Câu AI soạn từ kho tri thức đang chờ GV duyệt
  const draftRows: (typeof S.tutorDrafts.$inferInsert)[] = [];
  const kb10 = data.kbs.find((k) => k.subject === "Toán" && k.grade === 10);
  for (const tp of [bpt, T10("Phương trình quy về phương trình bậc hai")].filter((x): x is Topic => !!x))
    for (const q of noEssay(tp.stored).slice(0, 3)) draftRows.push({ id: t.uuid(), orgId, ownerId: U("ha"), status: "pending", kbId: kb10 ? (kbIds.get(kb10.key) ?? null) : null, subject: q.subject, grade: q.grade, topic: q.topic, body: { ...stripId(q), stem: q.stem }, bankQuestionId: null, createdAt: new Date(now - t.int(3, 30) * H) });
  await bulk(db, S.tutorDrafts, draftRows);
  count("câu AI soạn chờ duyệt", draftRows.length);

  const me = students.find((s) => s.userId === maUser)!;
  return { seededAt: now, seedDay: vnDate(now), login: { classCode: classCode.get("10A1")!, seat: me.seat, pin: me.pin }, live, counts };
}

// ---------------- tiện ích ----------------
function stripId(q: StoredQuestion): QuestionInput {
  const { id: _id, ...rest } = q;
  return rest as QuestionInput;
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
/** Ngắt dòng chữ bảng giảng theo độ dài hiển thị (công thức $…$ giữ nguyên một khối). */
function wrapBoard(line: string, max: number): string[] {
  const toks = line.match(/\$[^$]*\$|\S+/g) ?? [line];
  const len = (x: string) => x.replace(/\\[a-zA-Z]+/g, "x").replace(/[${}^_]/g, "").length;
  const out: string[] = [];
  let cur = "";
  for (const tk of toks) {
    if (cur && len(cur) + 1 + len(tk) > max) {
      out.push(cur);
      cur = tk;
    } else cur = cur ? `${cur} ${tk}` : tk;
  }
  if (cur) out.push(cur);
  return out;
}
/** Ô chữ của cảnh slide không dựng công thức: đổi $…$ sang chữ Unicode (x², √, ≤, ⇔…). */
function plainMath(text: string): string {
  const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", n: "ⁿ", "+": "⁺" };
  const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  return text.replace(/\$([^$]+)\$/g, (_m, tex: string) => {
    let x = tex;
    for (let i = 0; i < 3; i++) x = x.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2").replace(/\\(?:mathrm|text|mathbf|operatorname)\{([^{}]*)\}/g, "$1").replace(/\\sqrt\{([^{}]*)\}/g, (_a, r: string) => (/^\w+$/.test(r) ? `√${r}` : `√(${r})`)).replace(/\\xrightarrow\{([^{}]*)\}/g, "→");
    const MAP: [RegExp, string][] = [[/\\left|\\right/g, ""], [/\\iff|\\Leftrightarrow/g, "⇔"], [/\\Rightarrow/g, "⇒"], [/\\to|\\rightarrow/g, "→"], [/\\geq?/g, "≥"], [/\\leq?/g, "≤"], [/\\neq?/g, "≠"], [/\\infty/g, "∞"], [/\\times/g, "×"], [/\\cdot/g, "·"], [/\\approx/g, "≈"], [/\\pm/g, "±"], [/\\Delta/g, "Δ"], [/\\pi/g, "π"], [/\\circ/g, "°"], [/\\in/g, "∈"], [/\\mathbb\{R\}/g, "ℝ"], [/\\,|\\;|\\!/g, " "]];
    for (const [re, to] of MAP) x = x.replace(re, to);
    x = x.replace(/\\([{}])/g, "$1").replace(/\^\{([^{}]*)\}|\^(.)/g, (_a, g1?: string, g2?: string) => [...(g1 ?? g2 ?? "")].map((c) => SUP[c] ?? c).join(""));
    x = x.replace(/_\{([^{}]*)\}|_(\d)/g, (_a, g1?: string, g2?: string) => [...(g1 ?? g2 ?? "")].map((c) => SUB[c] ?? c).join(""));
    return x.replace(/[{}]/g, "").replace(/ - /g, " − ").replace(/(^|[^\w])-(?=[\w(√])/g, "$1−").replace(/\s+/g, " ").trim();
  });
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrongShort(key: string, t: ReturnType<typeof rngTools>): string | null {
  if (t.chance(0.12)) return null;
  const n = Number(key.replace(",", "."));
  if (Number.isFinite(n)) {
    const d = t.pick([1, -1, 2, -2, 0.5]);
    const w = Number.isInteger(n) ? n + Math.round(d) || n + 1 : Math.round((n + d) * 100) / 100;
    return String(w).replace(".", ",");
  }
  return t.pick(["không", "có", "chưa chắc", key.split(" ")[0] === key ? "—" : key.split(" ")[0]!]);
}

function essayText(q: QuestionInput, ab: number, t: ReturnType<typeof rngTools>): string {
  const ex = q.explanation?.trim();
  const rub = q.type === "essay" ? q.rubric : "";
  const ideas = (ex || rub).split(/[;.]\s+/).filter((x) => x.length > 8);
  const keep = Math.max(1, Math.round(ideas.length * clamp(ab + t.normal(0, 0.1), 0.2, 1)));
  const body = ideas.slice(0, keep).map((x) => x.replace(/\(\d+([,.]\d+)?đ\)/g, "").trim()).join(". ");
  return body ? `${body}.` : "Em trình bày theo các bước đã học trên lớp.";
}

const PALETTE = ["#2F5D8A", "#2B7A3B", "#B8336A", "#6F42C1", "#0B7285", "#8A5A00", "#3346D1"];
function layoutMind(root: DMindNode) {
  const nodes: Record<string, unknown>[] = [];
  const edges: Record<string, unknown>[] = [];
  let n = 0;
  const size = (label: string, lvl: number) => ({ w: Math.min(260, Math.max(lvl === 0 ? 200 : 120, label.length * (lvl === 0 ? 11 : 8.4) + 36)), h: lvl === 0 ? 64 : 44 });
  const leaves = (x: DMindNode): number => (x.children?.length ? x.children.reduce((a, c) => a + leaves(c), 0) : 1);
  const rootId = `n${n++}`;
  const rs = size(root.label, 0);
  nodes.push({ id: rootId, x: -rs.w / 2, y: -rs.h / 2, w: rs.w, h: rs.h, shape: "pill", label: root.label, color: "#2F5D8A", parent: null });
  const kids = root.children ?? [];
  const sides: [DMindNode[], DMindNode[]] = [[], []];
  kids.forEach((k, i) => sides[i % 2].push(k));
  sides.forEach((side, si) => {
    const dir = si === 0 ? 1 : -1;
    const total = side.reduce((a, c) => a + leaves(c), 0);
    let y = (-total * 58) / 2;
    const place = (x: DMindNode, lvl: number, parent: string, color: string, xPos: number) => {
      const id = `n${n++}`;
      const s = size(x.label, lvl);
      const span = leaves(x) * 58;
      const cy = y + span / 2;
      if (!x.children?.length) y += 58;
      nodes.push({ id, x: dir > 0 ? xPos : xPos - s.w, y: cy - s.h / 2, w: s.w, h: s.h, shape: "round", label: x.label, color, parent });
      edges.push({ id: `e${id}`, from: parent, to: id, kind: "tree" });
      if (x.children?.length) {
        const before = y;
        y = cy - span / 2;
        for (const c of x.children) place(c, lvl + 1, id, color, xPos + dir * (s.w + 60));
        y = Math.max(y, before);
      }
    };
    side.forEach((k, i) => place(k, 1, rootId, PALETTE[(si + i * 2) % PALETTE.length]!, dir * (rs.w / 2 + 70)));
  });
  return { version: 1 as const, kind: "mind" as const, nodes, edges };
}

function layoutFlow(ns: { id: string; label: string; shape: string }[], es: { from: string; to: string; label?: string }[]) {
  const depth = new Map<string, number>();
  const first = ns[0]?.id;
  if (first) depth.set(first, 0);
  for (let k = 0; k < ns.length; k++)
    for (const e of es) {
      const d = depth.get(e.from);
      if (d !== undefined && !depth.has(e.to)) depth.set(e.to, d + 1);
    }
  ns.forEach((x, i) => depth.has(x.id) || depth.set(x.id, i));
  const rows = new Map<number, string[]>();
  for (const x of ns) {
    const d = depth.get(x.id)!;
    (rows.get(d) ?? rows.set(d, []).get(d)!).push(x.id);
  }
  const nodes = ns.map((x) => {
    const d = depth.get(x.id)!;
    const row = rows.get(d)!;
    const w = Math.min(280, Math.max(150, x.label.length * 8 + 40));
    const h = x.shape === "diamond" ? 90 : 52;
    const col = row.indexOf(x.id) - (row.length - 1) / 2;
    return { id: x.id, x: col * 320 - w / 2, y: d * 130, w, h, shape: x.shape, label: x.label, color: x.shape === "diamond" ? "#B8336A" : x.shape === "pill" ? "#2B7A3B" : "#2F5D8A", parent: null };
  });
  const edges = es.map((e, i) => ({ id: `e${i}`, from: e.from, to: e.to, ...(e.label ? { label: e.label } : {}), kind: "link" as const }));
  return { version: 1 as const, kind: "flow" as const, nodes, edges };
}
