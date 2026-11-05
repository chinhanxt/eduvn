import { and, asc, count, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { attendance, classes, comments, scores, students } from "../db/schema";
import { type Role, assertCan } from "../domain/authz";
import { SCALES, type Scale, TERMS, type Term, validateComment } from "../domain/comments";
import { type AttendanceStatus, DEFAULT_COLUMNS, GradeColumn, averageScore, isoDate, parseAttendance, parseScore, validateColumns } from "../domain/gradebook";
import { type NewStudent, compareVietnameseNames, StudentItem, normName, normalizeStudentItems, parseRosterLines, parseRosterSheet, splitDuplicates } from "../domain/roster";
import { NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
export type ClassRow = typeof classes.$inferSelect;
export type StudentRow = typeof students.$inferSelect;

const Uuid = z.uuid();

export const CreateClassInput = z.object({
  name: z.string().trim().min(1, "Thiếu tên lớp").max(40),
  schoolYear: z.string().trim().regex(/^\d{4}-\d{4}$/, 'Năm học dạng "2026-2027"'),
  subject: z.string().trim().max(60).optional(),
  scale: z.enum(SCALES).default("TT22"),
});
export type CreateClassInput = z.input<typeof CreateClassInput>;

export const UpdateClassInput = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  subject: z.string().trim().max(60).nullable().optional(),
  scale: z.enum(SCALES).optional(),
  columns: z.array(GradeColumn).optional(),
});

export type StudentRef = string; // uuid hoặc họ tên

export type ProfileStudent = {
  id: string;
  code: string | null;
  fullName: string;
  dob: string | null;
  gender: string | null;
  note: string;
  scores: Record<string, number>;
  dtb: number | null;
  attendance: { present: number; excused: number; unexcused: number };
  days: Record<string, AttendanceStatus>;
  comments: Partial<Record<Term, { text: string; level: string }>>;
};
export type Gradebook = {
  class: { id: string; name: string; schoolYear: string; subject: string | null; scale: Scale };
  columns: GradeColumn[];
  dates: string[];
  students: ProfileStudent[];
};

export function createClassService(db: Db) {
  async function loadClass(orgId: string, classId: string): Promise<ClassRow> {
    if (!Uuid.safeParse(classId).success) throw new NotFoundError("Không tìm thấy lớp");
    const [row] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy lớp");
    return row;
  }

  /** Nhận id hoặc tên lớp (vd "10A1"). */
  async function resolveClass(orgId: string, ref: string): Promise<ClassRow> {
    if (Uuid.safeParse(ref).success) return loadClass(orgId, ref);
    const rows = await db.select().from(classes).where(eq(classes.orgId, orgId));
    const hits = rows.filter((c) => normName(c.name) === normName(ref));
    if (hits.length === 0) throw new NotFoundError(`Không tìm thấy lớp "${ref}"`);
    if (hits.length > 1) throw new ValidationError([`Có ${hits.length} lớp tên "${ref}" (${hits.map((h) => `${h.schoolYear}: ${h.id}`).join("; ")}) — dùng id lớp`]);
    return hits[0] as ClassRow;
  }

  /** Thứ tự VN: tên → họ đệm → position (thứ tự thêm vào). STT = vị trí trong danh sách này. */
  const studentsOf = async (classId: string) =>
    (await db.select().from(students).where(eq(students.classId, classId))).sort(
      (a, b) => compareVietnameseNames(a.fullName, b.fullName) || a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime(),
    );

  function resolveStudents(rows: StudentRow[], refs: string[]): { map: Map<string, StudentRow>; errors: string[]; label: (ref: string) => string } {
    const label = (ref: string) => {
      const i = rows.findIndex((r) => r === map.get(ref));
      return i < 0 ? ref : `${(rows[i] as StudentRow).fullName} (STT ${i + 1})`;
    };
    const map = new Map<string, StudentRow>();
    const errors: string[] = [];
    for (const ref of refs) {
      const byId = rows.find((r) => r.id === ref);
      if (byId) {
        map.set(ref, byId);
        continue;
      }
      const hits = rows.filter((r) => normName(r.fullName) === normName(ref) || (r.code && r.code.toLowerCase() === ref.trim().toLowerCase()));
      if (hits.length === 1) map.set(ref, hits[0] as StudentRow);
      else if (hits.length === 0) errors.push(`Không có học viên "${ref}" trong lớp`);
      else errors.push(`Có ${hits.length} học viên tên "${ref}" — dùng id: ${hits.map((h) => h.id).join(", ")}`);
    }
    return { map, errors, label };
  }

  async function createClass(actor: Actor, input: unknown): Promise<ClassRow> {
    assertCan(actor.role, "class:manage");
    const p = CreateClassInput.parse(input);
    const [row] = await db
      .insert(classes)
      .values({ orgId: actor.orgId, name: p.name, schoolYear: p.schoolYear, subject: p.subject || null, scale: p.scale, columns: DEFAULT_COLUMNS })
      .returning();
    if (!row) throw new Error("createClass: no row");
    return row;
  }

  async function updateClass(actor: Actor, classId: string, input: unknown): Promise<ClassRow> {
    assertCan(actor.role, "class:manage");
    const p = UpdateClassInput.parse(input);
    await loadClass(actor.orgId, classId);
    if (p.columns) {
      const errs = validateColumns(p.columns);
      if (errs.length) throw new ValidationError(errs);
    }
    const [row] = await db
      .update(classes)
      .set({ ...(p.name !== undefined && { name: p.name }), ...(p.subject !== undefined && { subject: p.subject || null }), ...(p.scale && { scale: p.scale }), ...(p.columns && { columns: p.columns }) })
      .where(eq(classes.id, classId))
      .returning();
    return row as ClassRow;
  }

  async function listClasses(actor: Actor) {
    assertCan(actor.role, "class:read");
    const rows = await db
      .select({ c: classes, n: count(students.id) })
      .from(classes)
      .leftJoin(students, eq(students.classId, classes.id))
      .where(eq(classes.orgId, actor.orgId))
      .groupBy(classes.id)
      .orderBy(asc(classes.schoolYear), asc(classes.name));
    return rows.map(({ c, n }) => ({ id: c.id, name: c.name, schoolYear: c.schoolYear, subject: c.subject, scale: c.scale, studentCount: n }));
  }

  async function getClass(actor: Actor, ref: string) {
    assertCan(actor.role, "class:read");
    const c = await resolveClass(actor.orgId, ref);
    const rows = await studentsOf(c.id);
    return {
      id: c.id,
      name: c.name,
      schoolYear: c.schoolYear,
      subject: c.subject,
      scale: c.scale,
      columns: c.columns,
      students: rows.map((s) => ({ id: s.id, code: s.code, fullName: s.fullName, dob: s.dob, gender: s.gender, note: s.note })),
    };
  }

  async function insertStudents(classId: string, parsed: { rows: NewStudent[]; errors: string[] }) {
    if (parsed.errors.length) throw new ValidationError(parsed.errors);
    if (parsed.rows.length === 0) throw new ValidationError(["Không có học viên nào để thêm"]);
    if (parsed.rows.length > 500) throw new ValidationError(["Tối đa 500 học viên mỗi lần thêm"]);
    const existing = await studentsOf(classId);
    const { accept, warnings } = splitDuplicates(existing, parsed.rows);
    const start = existing.reduce((m, r) => Math.max(m, r.position), 0);
    const inserted = accept.length
      ? await db.insert(students).values(accept.map((s, i) => ({ classId, ...s, position: start + i + 1 }))).returning({ id: students.id })
      : [];
    return { added: inserted.length, ids: inserted.map((r) => r.id), warnings };
  }

  async function addStudents(actor: Actor, classRef: string, input: { text?: string; students?: StudentItem[] }) {
    assertCan(actor.role, "class:manage");
    const c = await resolveClass(actor.orgId, classRef);
    const parsed = input.text !== undefined ? parseRosterLines(input.text) : normalizeStudentItems(input.students ?? []);
    if (input.text !== undefined && input.students?.length) {
      const more = normalizeStudentItems(input.students);
      parsed.rows.push(...more.rows);
      parsed.errors.push(...more.errors);
    }
    return insertStudents(c.id, parsed);
  }

  async function addStudentsFromXlsx(actor: Actor, classRef: string, buffer: Buffer) {
    assertCan(actor.role, "class:manage");
    const c = await resolveClass(actor.orgId, classRef);
    const { readFirstSheet } = await import("../export/xlsx");
    let grid: string[][];
    try {
      grid = await readFirstSheet(buffer);
    } catch {
      throw new ValidationError(["Không đọc được file Excel (.xlsx)"]);
    }
    return insertStudents(c.id, parseRosterSheet(grid));
  }

  async function removeStudent(actor: Actor, classRef: string, studentId: string) {
    assertCan(actor.role, "class:manage");
    const c = await resolveClass(actor.orgId, classRef);
    const gone = Uuid.safeParse(studentId).success
      ? await db.delete(students).where(and(eq(students.id, studentId), eq(students.classId, c.id))).returning({ id: students.id })
      : [];
    if (gone.length === 0) throw new NotFoundError("Không tìm thấy học viên");
  }

  async function enterScores(actor: Actor, classRef: string, column: string, entries: Record<string, unknown>) {
    assertCan(actor.role, "grade:write");
    const c = await resolveClass(actor.orgId, classRef);
    const col = c.columns.find((x) => x.name.toLowerCase() === column.trim().toLowerCase());
    if (!col) throw new ValidationError([`Lớp ${c.name} không có cột "${column}". Các cột: ${c.columns.map((x) => x.name).join(", ")}`]);
    const rows = await studentsOf(c.id);
    const refs = Object.keys(entries);
    if (refs.length === 0) throw new ValidationError(["Chưa có điểm nào để nhập"]);
    const { map, errors, label } = resolveStudents(rows, refs);
    const todo: { studentId: string; value: number | null }[] = [];
    for (const ref of refs) {
      const r = parseScore(entries[ref]);
      if (!r.ok) errors.push(`${label(ref)}: ${r.error}`);
      else {
        const st = map.get(ref);
        if (st) todo.push({ studentId: st.id, value: r.value });
      }
    }
    if (errors.length) throw new ValidationError(errors);
    await db.transaction(async (tx) => {
      for (const t of todo) {
        if (t.value === null) await tx.delete(scores).where(and(eq(scores.studentId, t.studentId), eq(scores.column, col.name)));
        else
          await tx
            .insert(scores)
            .values({ studentId: t.studentId, column: col.name, value: t.value })
            .onConflictDoUpdate({ target: [scores.studentId, scores.column], set: { value: t.value } });
      }
    });
    return { column: col.name, updated: todo.length };
  }

  async function markAttendance(actor: Actor, classRef: string, date: string, records: Record<string, unknown>, defaultStatus?: string) {
    assertCan(actor.role, "grade:write");
    const c = await resolveClass(actor.orgId, classRef);
    if (!isoDate(date)) throw new ValidationError([`Ngày "${date}" sai, dùng yyyy-mm-dd`]);
    const rows = await studentsOf(c.id);
    const { map, errors, label } = resolveStudents(rows, Object.keys(records));
    const final = new Map<string, AttendanceStatus>();
    if (defaultStatus !== undefined) {
      const d = parseAttendance(defaultStatus);
      if (!d) errors.push(`Trạng thái mặc định "${defaultStatus}" sai`);
      else for (const r of rows) final.set(r.id, d);
    }
    for (const [ref, v] of Object.entries(records)) {
      const st = parseAttendance(v);
      if (!st) errors.push(`${label(ref)}: trạng thái "${String(v)}" sai, dùng present (có mặt) / excused (vắng có phép) / unexcused (vắng không phép)`);
      else if (map.get(ref)) final.set((map.get(ref) as StudentRow).id, st);
    }
    if (errors.length) throw new ValidationError(errors);
    if (final.size === 0) throw new ValidationError(["Chưa có bản ghi điểm danh nào"]);
    await db.transaction(async (tx) => {
      for (const [studentId, status] of final)
        await tx.insert(attendance).values({ studentId, date, status }).onConflictDoUpdate({ target: [attendance.studentId, attendance.date], set: { status } });
    });
    return { date, updated: final.size };
  }

  async function attendanceOn(actor: Actor, classRef: string, date: string) {
    assertCan(actor.role, "class:read");
    const c = await resolveClass(actor.orgId, classRef);
    if (!isoDate(date)) throw new ValidationError([`Ngày "${date}" sai, dùng yyyy-mm-dd`]);
    const rows = await db
      .select({ id: attendance.studentId, status: attendance.status })
      .from(attendance)
      .innerJoin(students, eq(students.id, attendance.studentId))
      .where(and(eq(students.classId, c.id), eq(attendance.date, date)));
    return Object.fromEntries(rows.map((r) => [r.id, r.status as AttendanceStatus]));
  }

  async function saveComments(actor: Actor, classRef: string, term: string, items: { student: string; text: string; level: string }[]) {
    assertCan(actor.role, "class:manage");
    const c = await resolveClass(actor.orgId, classRef);
    if (!(TERMS as readonly string[]).includes(term)) throw new ValidationError([`Học kỳ "${term}" sai, dùng HK1 hoặc HK2`]);
    if (items.length === 0) throw new ValidationError(["Chưa có nhận xét nào"]);
    const rows = await studentsOf(c.id);
    const { map, errors, label } = resolveStudents(rows, items.map((i) => i.student));
    for (const it of items) {
      const st = map.get(it.student);
      if (!st) continue;
      for (const e of validateComment(c.scale, it.text, it.level)) errors.push(`${label(it.student)}: ${e}`);
    }
    if (errors.length) throw new ValidationError(errors);
    await db.transaction(async (tx) => {
      for (const it of items) {
        const st = map.get(it.student) as StudentRow;
        await tx
          .insert(comments)
          .values({ studentId: st.id, term, text: it.text.trim(), level: it.level })
          .onConflictDoUpdate({ target: [comments.studentId, comments.term], set: { text: it.text.trim(), level: it.level, updatedAt: sql`now()` } });
      }
    });
    return { term, saved: items.length };
  }

  async function buildGradebook(c: ClassRow, only?: string): Promise<Gradebook> {
    let rows = await studentsOf(c.id);
    if (only !== undefined) {
      const { map, errors } = resolveStudents(rows, [only]);
      if (errors.length) throw new ValidationError(errors);
      rows = [map.get(only) as StudentRow];
    }
    const ids = rows.map((r) => r.id);
    const [sc, at, cm] = ids.length
      ? await Promise.all([
          db.select().from(scores).where(inArray(scores.studentId, ids)),
          db.select().from(attendance).where(inArray(attendance.studentId, ids)),
          db.select().from(comments).where(inArray(comments.studentId, ids)),
        ])
      : [[], [], []];
    const dates = [...new Set(at.map((a) => a.date))].sort();
    return {
      class: { id: c.id, name: c.name, schoolYear: c.schoolYear, subject: c.subject, scale: c.scale },
      columns: c.columns,
      dates,
      students: rows.map((s) => {
        const mine: Record<string, number> = {};
        for (const x of sc) if (x.studentId === s.id) mine[x.column] = x.value;
        const days: Record<string, AttendanceStatus> = {};
        const tally = { present: 0, excused: 0, unexcused: 0 };
        for (const a of at)
          if (a.studentId === s.id) {
            days[a.date] = a.status as AttendanceStatus;
            tally[a.status as AttendanceStatus]++;
          }
        const cms: ProfileStudent["comments"] = {};
        for (const x of cm) if (x.studentId === s.id) cms[x.term as Term] = { text: x.text, level: x.level };
        return { id: s.id, code: s.code, fullName: s.fullName, dob: s.dob, gender: s.gender, note: s.note, scores: mine, dtb: averageScore(c.columns, mine), attendance: tally, days, comments: cms };
      }),
    };
  }

  /** Sổ điểm đầy đủ hoặc hồ sơ 1 học viên (id/tên) — để AI viết nhận xét. */
  async function gradebook(actor: Actor, classRef: string, student?: string): Promise<Gradebook> {
    assertCan(actor.role, "class:read");
    return buildGradebook(await resolveClass(actor.orgId, classRef), student);
  }

  /** Không kiểm vai trò: chỉ gọi sau khi đã xác minh link tải ký HMAC. */
  async function loadForExport(orgId: string, classId: string): Promise<Gradebook> {
    return buildGradebook(await loadClass(orgId, classId));
  }

  async function classIdFor(actor: Actor, classRef: string, action: "class:read"): Promise<string> {
    assertCan(actor.role, action);
    return (await resolveClass(actor.orgId, classRef)).id;
  }

  return { createClass, updateClass, listClasses, getClass, addStudents, addStudentsFromXlsx, removeStudent, enterScores, markAttendance, attendanceOn, saveComments, gradebook, loadForExport, classIdFor };
}

export type ClassService = ReturnType<typeof createClassService>;
