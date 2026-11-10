import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ROLES } from "../domain/authz";
import type { Scale } from "../domain/comments";
import type { GradeColumn } from "../domain/gradebook";
import type { LessonPlan } from "../domain/lesson";
import type { VanBan } from "../domain/vanban";
import type { GameBody } from "../domain/games";
import type { BoardDoc } from "../domain/board";
import type { SlideDeck } from "../domain/slides";
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
    term: text("term").notNull().default("HK1"),
    column: text("column").notNull(),
    value: real("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.term, t.column] })],
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

export const lessonPlans = pgTable(
  "lesson_plans",
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
    title: text("title").notNull(),
    body: jsonb("body").$type<LessonPlan>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lesson_plans_org_idx").on(t.orgId)],
);

export const vanBan = pgTable(
  "van_ban",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    loai: text("loai").notNull(),
    trichYeu: text("trich_yeu").notNull(),
    body: jsonb("body").$type<VanBan>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("van_ban_org_idx").on(t.orgId)],
);

export const decks = pgTable(
  "decks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    sourceLessonPlanId: uuid("source_lesson_plan_id").references(() => lessonPlans.id, { onDelete: "set null" }),
    body: jsonb("body").$type<SlideDeck>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("decks_org_idx").on(t.orgId)],
);

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    topic: text("topic").notNull().default(""),
    body: jsonb("body").$type<BoardDoc>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("boards_org_idx").on(t.orgId)],
);

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    kind: text("kind").notNull(),
    body: jsonb("body").$type<GameBody>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("games_org_idx").on(t.orgId)],
);

// ---- Gia sư AI (P6, port từ DeepTutor) ------------------------------------

const orgRef = () =>
  uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" });
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const tutorKbs = pgTable(
  "tutor_kbs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgRef(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("tutor_kbs_org_idx").on(t.orgId)],
);

export const tutorDocs = pgTable(
  "tutor_docs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kbId: uuid("kb_id")
      .notNull()
      .references(() => tutorKbs.id, { onDelete: "cascade" }),
    orgId: orgRef(),
    name: text("name").notNull(),
    source: text("source").notNull(),
    pages: integer("pages").notNull(),
    chars: integer("chars").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("tutor_docs_kb_idx").on(t.kbId)],
);

export const tutorChunks = pgTable(
  "tutor_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docId: uuid("doc_id")
      .notNull()
      .references(() => tutorDocs.id, { onDelete: "cascade" }),
    kbId: uuid("kb_id")
      .notNull()
      .references(() => tutorKbs.id, { onDelete: "cascade" }),
    page: integer("page").notNull(),
    idx: integer("idx").notNull(),
    text: text("text").notNull(),
  },
  (t) => [index("tutor_chunks_kb_idx").on(t.kbId)],
);

export type TutorCitation = { n: number; docId: string; doc: string; page: number; snippet: string };

export const tutorSessions = pgTable(
  "tutor_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgRef(),
    learnerKey: text("learner_key").notNull(),
    kbId: uuid("kb_id").references(() => tutorKbs.id, { onDelete: "set null" }),
    mode: text("mode").notNull().default("chat"),
    title: text("title").notNull().default("Cuộc trò chuyện mới"),
    summary: text("summary").notNull().default(""),
    summarizedCount: integer("summarized_count").notNull().default(0),
    context: jsonb("context").$type<{ bookPageId?: string }>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tutor_sessions_learner_idx").on(t.orgId, t.learnerKey)],
);

export const tutorMessages = pgTable(
  "tutor_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => tutorSessions.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<TutorCitation[]>().notNull().default([]),
    createdAt: createdAt(),
  },
  (t) => [index("tutor_messages_session_idx").on(t.sessionId, t.seq)],
);

export const tutorReviewState = pgTable(
  "tutor_review_state",
  {
    orgId: orgRef(),
    learnerKey: text("learner_key").notNull(),
    questionId: uuid("question_id").notNull(),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    topic: text("topic").notNull(),
    intervalDays: real("interval_days").notNull(),
    ease: real("ease").notNull(),
    streak: integer("streak").notNull(),
    lapses: integer("lapses").notNull(),
    reviewCount: integer("review_count").notNull(),
    version: integer("version").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    lastReviewAt: timestamp("last_review_at", { withTimezone: true }).notNull(),
    prev: jsonb("prev").$type<Record<string, number> | null>(),
    lastCorrect: boolean("last_correct").notNull().default(true),
    isMistake: boolean("is_mistake").notNull().default(false),
    firstWrongAt: timestamp("first_wrong_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.learnerKey, t.questionId] }), index("tutor_review_due_idx").on(t.orgId, t.learnerKey, t.dueAt)],
);

export const tutorReviewEvents = pgTable(
  "tutor_review_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgRef(),
    learnerKey: text("learner_key").notNull(),
    questionId: uuid("question_id").notNull(),
    rating: text("rating").notNull(),
    correct: boolean("correct").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tutor_review_events_idx").on(t.orgId, t.learnerKey, t.reviewedAt)],
);

export type TutorPathBody = {
  description: string;
  modules: { name: string; objective: string; pointIds: string[] }[];
  points: import("../domain/tutorLearning").Point[];
  /** Bài đang chờ chấm (đáp án giữ ở máy chủ). */
  pending: { kind: "diagnostic" | "quiz"; pointId: string | null; items: { question: string; answer: string; explanation: string; pointId: string }[] } | null;
  diagnosed: boolean;
  errors: { pointId: string; question: string; errorType: string; remediation: string; at: number }[];
};

export const tutorPaths = pgTable(
  "tutor_paths",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgRef(),
    learnerKey: text("learner_key").notNull(),
    kbId: uuid("kb_id").references(() => tutorKbs.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    body: jsonb("body").$type<TutorPathBody>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tutor_paths_learner_idx").on(t.orgId, t.learnerKey)],
);

export const tutorDrafts = pgTable(
  "tutor_question_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgRef(),
    ownerId: text("owner_id").notNull(),
    /** pending = chờ GV duyệt; practice = HS luyện ngay (riêng của ownerId); approved/rejected. */
    status: text("status").notNull(),
    kbId: uuid("kb_id").references(() => tutorKbs.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    grade: integer("grade").notNull(),
    topic: text("topic").notNull(),
    body: jsonb("body").$type<QuestionInput>().notNull(),
    bankQuestionId: uuid("bank_question_id"),
    createdAt: createdAt(),
  },
  (t) => [index("tutor_drafts_org_idx").on(t.orgId, t.status)],
);

export type BookBlock = { type: string; title?: string; markdown?: string; data?: unknown; citations?: TutorCitation[] };

export const tutorBooks = pgTable(
  "tutor_books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: orgRef(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    kbId: uuid("kb_id").references(() => tutorKbs.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    scope: text("scope").notNull().default(""),
    level: text("level").notNull().default("mixed"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("tutor_books_org_idx").on(t.orgId)],
);

export const tutorBookPages = pgTable(
  "tutor_book_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => tutorBooks.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    objectives: jsonb("objectives").$type<string[]>().notNull().default([]),
    contentType: text("content_type").notNull().default("theory"),
    status: text("status").notNull().default("planned"),
    blocks: jsonb("blocks").$type<BookBlock[]>().notNull().default([]),
    updatedAt: updatedAt(),
  },
  (t) => [index("tutor_book_pages_idx").on(t.bookId, t.idx)],
);
