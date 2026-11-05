import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LESSON_SHAPE_HELP } from "../domain/lesson";
import type { Actor } from "../service";
import type { LessonService } from "../services/lessons";

type Deps = { lessons: LessonService; actor: Actor; makeLessonLink: (id: string) => Promise<{ url: string; expiresInMinutes: number }> };

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerLessonTools(server: McpServer, { lessons, actor, makeLessonLink }: Deps): void {
  server.registerTool(
    "luu_giao_an",
    {
      title: "Lưu giáo án (CV 5512)",
      description: `Tạo giáo án mới (không truyền id) hoặc cập nhật giáo án có sẵn (truyền id, gửi lại TOÀN BỘ nội dung). Có thiếu cấu phần thì không lưu và trả danh sách lỗi tiếng Việt để sửa rồi gửi lại.\n${LESSON_SHAPE_HELP}`,
      inputSchema: { id: z.string().optional().describe("id giáo án để cập nhật; bỏ trống để tạo mới"), plan: z.looseObject({}).describe("Nội dung giáo án theo JSON mô tả ở trên") },
    },
    async ({ id, plan }) => json(await lessons.save(actor, { id, plan })),
  );

  server.registerTool(
    "danh_sach_giao_an",
    {
      title: "Danh sách giáo án",
      description: "Không truyền id: liệt kê giáo án (id, tên bài, môn, lớp, số tiết). Truyền id: trả toàn bộ nội dung JSON giáo án (để chỉnh sửa rồi luu_giao_an lại).",
      inputSchema: { id: z.string().optional() },
    },
    async ({ id }) => json(id ? await lessons.get(actor, id) : await lessons.list(actor)),
  );

  server.registerTool(
    "xuat_giao_an",
    { title: "Xuất giáo án Word", description: "Link tải giáo án .docx (Times New Roman 13, đủ mục I–III theo CV 5512). Hết hạn sau 15 phút.", inputSchema: { id: z.string() } },
    async ({ id }) => json(await makeLessonLink(id)),
  );
}
