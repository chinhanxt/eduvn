import { index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ROLES } from "../domain/authz";
import type { Scale } from "../domain/comments";
import type { GradeColumn } from "../domain/gradebook";
import type { ExamMatrix } from "../domain/matrix";
import type { QuestionInput } from "../domain/question";
import type { Variant } from "../domain/variants";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  sub: text("sub").notNull().unique(),
  email: text("email"),
  name: text("name"),
  createdAt: createdAt(),
});

export const memberships = pgTable(
  "memberships",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ROLES }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] })],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    topic: text("topic").notNull(),
    level: text("level").notNull(),
    type: text("type").notNull(),
    body: jsonb("body").$type<QuestionInput>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("questions_lookup_idx").on(t.orgId, t.subject, t.grade, t.topic)],
);

export const exams = pgTable("exams", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  seed: integer("seed").notNull(),
  matrix: jsonb("matrix").$type<ExamMatrix>().notNull(),
  variants: jsonb("variants").$type<Variant[]>().notNull(),
  createdAt: createdAt(),
});

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    schoolYear: text("school_year").notNull(),
    subject: text("subject"),
    scale: text("scale").$type<Scale>().notNull().default("TT22"),
    columns: jsonb("columns").$type<GradeColumn[]>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("classes_org_idx").on(t.orgId)],
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    code: text("code"),
    fullName: text("full_name").notNull(),
    dob: text("dob"),
    gender: text("gender"),
    note: text("note").notNull().default(""),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("students_class_idx").on(t.classId)],
);

export const scores = pgTable(
  "scores",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    column: text("column").notNull(),
    value: real("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.column] })],
);

export const attendance = pgTable(
  "attendance",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    status: text("status").notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.date] })],
);

export const comments = pgTable(
  "comments",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    text: text("text").notNull(),
    level: text("level").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.term] })],
);
