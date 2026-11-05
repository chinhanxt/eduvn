import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ROLES } from "../domain/authz";
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
