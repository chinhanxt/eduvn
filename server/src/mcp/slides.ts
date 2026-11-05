import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SLIDE_SHAPE_HELP } from "../domain/slides";
import { ValidationError } from "../errors";
import type { Actor } from "../service";
import type { SlideService } from "../services/slides";

type Link = { url: string; expiresInMinutes: number };
type Deps = { slides: SlideService; actor: Actor; makeSlideLink: (id: string) => Promise<Link> };

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerSlideTools(server: McpServer, { slides, actor, makeSlideLink }: Deps): void {
  server.registerTool(
    "tao_slide",
    {
      title: "Tạo slide bài giảng (.pptx)",
      description: `Tạo bộ slide .pptx (16:9, theme EDUVN) và trả link tải (hết hạn sau 15 phút). Hai cách: (1) truyền "deck" là JSON dàn ý; (2) truyền "lessonPlanId" để tự dựng từ giáo án đã lưu (bìa, Mục tiêu, mỗi hoạt động một slide chuyển mục + slide nội dung, kết thúc; 4 bước tổ chức nằm trong ghi chú). Truyền "id" kèm "deck" để cập nhật bộ slide có sẵn. Sai giới hạn thì không lưu và trả danh sách lỗi tiếng Việt để sửa rồi gửi lại.\n${SLIDE_SHAPE_HELP}`,
      inputSchema: {
        id: z.string().optional().describe("id bộ slide để cập nhật (kèm deck)"),
        deck: z.looseObject({}).optional().describe("Dàn ý slide theo JSON mô tả ở trên"),
        lessonPlanId: z.string().optional().describe("id giáo án đã lưu (xem danh_sach_giao_an) để dựng slide"),
      },
    },
    async ({ id, deck, lessonPlanId }) => {
      if ((deck === undefined) === (lessonPlanId === undefined)) throw new ValidationError(["Truyền đúng một trong hai: deck (JSON dàn ý) hoặc lessonPlanId (id giáo án)"]);
      const saved = lessonPlanId !== undefined ? await slides.fromLesson(actor, lessonPlanId) : await slides.save(actor, { id, deck });
      return json({ ...saved, ...(await makeSlideLink(saved.id)) });
    },
  );

  server.registerTool(
    "danh_sach_slide",
    {
      title: "Danh sách slide",
      description: "Không truyền id: liệt kê bộ slide (id, tên, số slide, giáo án nguồn). Truyền id: trả JSON dàn ý đầy đủ kèm link tải .pptx mới.",
      inputSchema: { id: z.string().optional() },
    },
    async ({ id }) => {
      if (!id) return json(await slides.list(actor));
      const d = await slides.get(actor, id);
      return json({ ...d, ...(await makeSlideLink(id)) });
    },
  );
}
