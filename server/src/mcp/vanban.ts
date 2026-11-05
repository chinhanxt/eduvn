import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { VANBAN_SHAPE_HELP } from "../domain/vanban";
import type { Actor } from "../service";
import type { VanBanService } from "../services/vanban";

type Link = { url: string; expiresInMinutes: number };
type Deps = { vanBan: VanBanService; actor: Actor; makeVanBanLink: (id: string) => Promise<Link> };

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerVanBanTools(server: McpServer, { vanBan, actor, makeVanBanLink }: Deps): void {
  server.registerTool(
    "tao_van_ban",
    {
      title: "Tạo văn bản hành chính (NĐ 30/2020)",
      description: `Tạo văn bản mới (không truyền id) hoặc cập nhật văn bản có sẵn (truyền id, gửi lại TOÀN BỘ nội dung), rồi trả link tải .docx đúng thể thức (quốc hiệu, tiêu ngữ, số ký hiệu, nơi nhận, chữ ký). Thiếu thành phần thì không lưu và trả danh sách lỗi tiếng Việt để sửa rồi gửi lại.\n${VANBAN_SHAPE_HELP}`,
      inputSchema: { id: z.string().optional().describe("id văn bản để cập nhật; bỏ trống để tạo mới"), van_ban: z.looseObject({}).describe("Nội dung văn bản theo JSON mô tả ở trên") },
    },
    async ({ id, van_ban }) => {
      const saved = await vanBan.save(actor, { id, vanBan: van_ban });
      return json({ ...saved, ...(await makeVanBanLink(saved.id)) });
    },
  );

  server.registerTool(
    "danh_sach_van_ban",
    {
      title: "Danh sách văn bản hành chính",
      description: "Không truyền id: liệt kê văn bản (id, loại, số ký hiệu, trích yếu). Truyền id: trả toàn bộ JSON văn bản (để chỉnh sửa rồi tao_van_ban lại) kèm link tải mới.",
      inputSchema: { id: z.string().optional() },
    },
    async ({ id }) => json(id ? { ...(await vanBan.get(actor, id)), ...(await makeVanBanLink(id)) } : await vanBan.list(actor)),
  );
}
