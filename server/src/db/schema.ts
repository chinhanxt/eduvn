import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Answers, AssignmentKind, AssignmentSource, AssignmentStatus, ShowSolution, SubmissionStatus } from "../domain/assignment";
import { ROLES } from "../domain/authz";
import type { Scale } from "../domain/comments";
import type { GradeColumn } from "../domain/gradebook";
import type { LessonPlan } from "../domain/lesson";
import type { VanBan } from "../domain/vanban";
import type { GameBody } from "../domain/games";
import type { BoardDoc } from "../domain/board";
import type { DiagramDoc } from "../domain/diagram";
import type { SlideDeck } from "../domain/slides";
import type { Solution } from "../domain/solution";
import type { ExamMatrix } from "../domain/matrix";
import type { QuestionInput, QuestionType } from "../domain/question";
import type { PointRules } from "../domain/scoring";
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
    /** Mã lớp in trên thẻ (đăng nhập bằng số thứ tự + PIN). */
    code: text("code").unique(),
    /** Mã tham gia cho tài khoản Keycloak (SV, HS lớn); chỉ dùng được khi joinOpen. */
    joinCode: text("join_code").unique(),
    joinOpen: boolean("join_open").notNull().default(false),
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
    /** Số thứ tự trên thẻ lớp: cấp khi "Cấp mã", không đổi khi thêm HS sau. */
    seat: integer("seat"),
    pinHash: text("pin_hash"),
    /** Tăng khi cấp lại thẻ: thẻ QR và phiên cũ hết dùng. */
    badgeVersion: integer("badge_version").notNull().default(0),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** HS tự tham gia trùng họ tên + ngày sinh: chờ GV xác nhận. */
    linkPending: boolean("link_pending").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("students_class_idx").on(t.classId), uniqueIndex("students_seat_uq").on(t.classId, t.seat), uniqueIndex("students_user_uq").on(t.classId, t.userId)],
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

export const diagrams = pgTable(
  "diagrams",
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
    body: jsonb("body").$type<DiagramDoc>().notNull(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("diagrams_org_idx").on(t.orgId)],
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

export type AiLessonProgress = { done: number; total: number; stage: string; error?: string; failed?: string[] };
export type AiLessonRequest = { requirement: string; sceneCount?: number; lessonPlanId?: string; materialText?: string; materialName?: string };

export const aiLessons = pgTable(
  "ai_lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    subject: text("subject").notNull().default(""),
    grade: integer("grade"),
    /** queued | running | done | error */
    status: text("status").notNull().default("queued"),
    progress: jsonb("progress").$type<AiLessonProgress>().notNull(),
    request: jsonb("request").$type<AiLessonRequest>().notNull(),
    outline: jsonb("outline").$type<unknown[]>(),
    scenes: jsonb("scenes").$type<unknown[]>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_lessons_org_idx").on(t.orgId)],
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

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    kind: text("kind").$type<AssignmentKind>().notNull(),
    subject: text("subject").notNull(),
    source: jsonb("source").$type<AssignmentSource>().notNull(),
    /** Bản chụp mã đề lúc giao: sửa ngân hàng/đề sau đó không ảnh hưởng. */
    variants: jsonb("variants").$type<Variant[]>().notNull(),
    rules: jsonb("rules").$type<PointRules>().notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes"),
    attemptsAllowed: integer("attempts_allowed").notNull(),
    showSolution: text("show_solution").$type<ShowSolution>().notNull(),
    shuffle: boolean("shuffle").notNull().default(false),
    status: text("status").$type<AssignmentStatus>().notNull().default("draft"),
    createdAt: createdAt(),
  },
  (t) => [index("assignments_class_idx").on(t.classId)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),
    variantCode: text("variant_code").notNull(),
    seed: integer("seed").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    /** Máy chủ tính: min(started_at + thời lượng, due_at). */
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    status: text("status").$type<SubmissionStatus>().notNull().default("in_progress"),
    answers: jsonb("answers").$type<Answers>().notNull().default({}),
    /** Số thứ tự lần lưu (do máy khách tăng dần): chỉ ghi khi seq mới lớn hơn. */
    seq: integer("seq").notNull().default(0),
    score: real("score"),
    maxScore: real("max_score"),
    /** Số câu tự luận chờ GV chấm. */
    pending: integer("pending").notNull().default(0),
    leaveCount: integer("leave_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("submissions_attempt_uq").on(t.assignmentId, t.studentId, t.attempt), index("submissions_open_idx").on(t.status, t.deadlineAt)],
);

export const submissionEvents = pgTable(
  "submission_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind").notNull(),
  },
  (t) => [index("submission_events_sub_idx").on(t.submissionId)],
);

/** Bảng phẳng: một dòng cho mỗi câu của mỗi bài đã chốt (thống kê CTT). */
export const answerItems = pgTable(
  "answer_items",
  {
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    no: integer("no").notNull(),
    questionId: text("question_id").notNull(),
    topic: text("topic").notNull(),
    level: text("level").notNull(),
    type: text("type").$type<QuestionType>().notNull(),
    /** null = tự luận chờ chấm. */
    points: real("points"),
    maxPoints: real("max_points").notNull(),
    correct: boolean("correct"),
    choice: text("choice"),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.no] }), index("answer_items_assignment_idx").on(t.assignmentId, t.questionId)],
);

/** Phiên chơi trực tiếp (P11): lưu một lần lúc kết thúc. `qstats` = thống kê từng câu. */
export type LiveQStat = { i: number; q: string; kind: "choice" | "text"; answered: number; correct: number; counts: number[] };
export type LiveAnswer = { i: number; ok: boolean; pts: number; ms: number };

export const liveSessions = pgTable(
  "live_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    questionCount: integer("question_count").notNull(),
    qstats: jsonb("qstats").$type<LiveQStat[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("live_sessions_org_idx").on(t.orgId)],
);

export const liveResults = pgTable(
  "live_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => liveSessions.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    rank: integer("rank").notNull(),
    score: integer("score").notNull(),
    correctCount: integer("correct_count").notNull(),
    answers: jsonb("answers").$type<LiveAnswer[]>().notNull(),
  },
  (t) => [index("live_results_session_idx").on(t.sessionId)],
);

/** Kết quả chấm từ ảnh (P7): kind "omr" = phiếu trắc nghiệm quét; "essay" = bài viết tay đã duyệt. */
export const photoResults = pgTable(
  "photo_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").$type<"omr" | "essay">().notNull(),
    examId: uuid("exam_id").references(() => exams.id, { onDelete: "set null" }),
    /** SBD / tên học sinh GV nhập. */
    student: text("student").notNull().default(""),
    title: text("title").notNull().default(""),
    total: real("total").notNull(),
    max: real("max").notNull(),
    body: jsonb("body").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("photo_results_org_idx").on(t.orgId, t.kind)],
);

/** P13 — lời giải từng bước. Gắn với câu trong ngân hàng (question_id) hoặc đứng riêng; `slug` có khi GV chia sẻ công khai. */
export const solutions = pgTable(
  "solutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    questionId: uuid("question_id").references(() => questions.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    topic: text("topic").notNull().default(""),
    status: text("status", { enum: ["verified", "mismatch", "unchecked"] }).notNull(),
    body: jsonb("body").$type<Solution>().notNull(),
    slug: text("slug").unique(),
    views: integer("views").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("solutions_org_idx").on(t.orgId), uniqueIndex("solutions_question_idx").on(t.questionId), index("solutions_public_idx").on(t.publishedAt)],
);
export * from "./schema/gx";
