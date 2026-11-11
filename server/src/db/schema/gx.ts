// P14/GX "Xuất bản & Nhập": kho mẫu PowerPoint của trường/tổ (migration 0016).
import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations, users } from "../schema";

/** Mẫu .pptx của tổ chức. `kind`: "mau" = đổ bài vào đúng mẫu (giữ master/layout/logo); "phong_cach" = chỉ lấy màu/phông từ slide tham khảo. */
export const pptxTemplates = pgTable(
  "pptx_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["mau", "phong_cach"] }).notNull().default("mau"),
    fileName: text("file_name").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    /** Kết quả phân tích tệp mẫu (kích thước, theme, layout, placeholder). */
    info: jsonb("info").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pptx_templates_org_idx").on(t.orgId)],
);
