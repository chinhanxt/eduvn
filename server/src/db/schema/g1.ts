// G1 — nhà cung cấp phụ: cấu hình theo trường, thư viện giọng, nhật ký dùng, cờ tính năng (migration 0017_providers).
import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organizations, users } from "../schema";

/** Mỗi trường bật/tắt, chọn mặc định, tuỳ chọn cho từng nhà cung cấp (tts: giọng + tốc độ; asr: ngôn ngữ…). */
export const providerConfigs = pgTable(
  "provider_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    providerId: text("provider_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    isDefault: boolean("is_default").notNull().default(false),
    options: jsonb("options").$type<Record<string, unknown>>().notNull().default({}),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("provider_configs_org_kind_idx").on(t.orgId, t.kind, t.providerId)],
);

/** Giọng GV tải lên để nhân bản (file mẫu wav đã chuẩn hoá trong DATA_DIR/voices/<org>/<id>.wav). */
export const voices = pgTable(
  "voices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    /** Engine đọc giọng này: vieneu | omnivoice. */
    provider: text("provider").notNull(),
    /** Đường dẫn tương đối trong DATA_DIR. */
    file: text("file").notNull(),
    refText: text("ref_text").notNull().default(""),
    gender: text("gender", { enum: ["nam", "nu"] }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    speed: real("speed").notNull().default(1),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("voices_org_idx").on(t.orgId)],
);

/** Một lượt dùng nhà cung cấp phụ (giọng: ký tự · ASR: giây · ảnh: ảnh · tài liệu: trang · LLM: token). */
export const usageEvents = pgTable(
  "usage_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    provider: text("provider").notNull(),
    task: text("task"),
    units: real("units").notNull().default(0),
    unit: text("unit").notNull(),
    ok: boolean("ok").notNull().default(true),
    ms: integer("ms").notNull().default(0),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_events_org_time_idx").on(t.orgId, t.createdAt), index("usage_events_kind_idx").on(t.orgId, t.kind)],
);

/** Bật/tắt tính năng theo trường (mô-đun). */
export const featureFlags = pgTable(
  "feature_flags",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.key] })],
);
