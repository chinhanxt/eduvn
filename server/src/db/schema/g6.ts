// Bảng của gói G6 (gia sư AI dạng tác tử). Đợt 1: lượt + sự kiện của runtime tác tử (s/agent).
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AgentLoopState, AgentUsage, TurnAttachment, TurnStatus } from "../../agent/types";
import { organizations } from "../schema";

const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Một lượt tác tử: câu hỏi → các bước (suy nghĩ / công cụ / ask_user) → câu trả lời. `state` giữ vòng lặp để tiếp sau ask_user (sống qua khởi động lại). */
export const agentTurns = pgTable(
  "agent_turns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Chủ lượt: userId Keycloak, hoặc khoá khác do gói gọi đặt (vd `hs:<id>`). */
    ownerKey: text("owner_key").notNull(),
    /** Nơi dùng: `tro_ly` (gia sư), `workbench`, `lop_hoc`… */
    scope: text("scope").notNull().default("tro_ly"),
    /** Mạch hội thoại: các lượt cùng thread là lịch sử của nhau. */
    threadId: uuid("thread_id").notNull(),
    capability: text("capability").notNull().default("chat"),
    message: text("message").notNull(),
    attachments: jsonb("attachments").$type<TurnAttachment[]>().notNull().default([]),
    /** Tham số riêng của gói gọi (vd kbIds). */
    params: jsonb("params").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").$type<TurnStatus>().notNull().default("running"),
    answer: text("answer").notNull().default(""),
    state: jsonb("state").$type<AgentLoopState | null>(),
    usage: jsonb("usage").$type<AgentUsage | null>(),
    error: text("error"),
    lastSeq: integer("last_seq").notNull().default(0),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
  },
  (t) => [index("agent_turns_thread_idx").on(t.orgId, t.ownerKey, t.threadId, t.createdAt), index("agent_turns_status_idx").on(t.status)],
);

/** Nhật ký sự kiện của lượt (seq tăng dần từ 1) — phát lại khi nối lại SSE (Last-Event-ID) hoặc F5. */
export const agentEvents = pgTable(
  "agent_events",
  {
    turnId: uuid("turn_id")
      .notNull()
      .references(() => agentTurns.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.turnId, t.seq] })],
);
