import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GAME_KINDS, GAME_SHAPE_HELP } from "../domain/games";
import type { Actor } from "../service";
import type { GameService } from "../services/games";

type Link = { url: string; expiresInMinutes: number };
type Deps = { games: GameService; actor: Actor; makeGameLink: (id: string) => Promise<Link> };

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerGameTools(server: McpServer, { games, actor, makeGameLink }: Deps): void {
  server.registerTool(
    "tao_tro_choi",
    {
      title: "Tạo trò chơi ôn tập (.html)",
      description: `Tạo 1 file .html chơi offline trên điện thoại từ câu hỏi trong ngân hàng / đề, trả link tải (hết hạn sau 15 phút). Thiếu câu (< 4) thì báo lỗi tiếng Việt.\n${GAME_SHAPE_HELP}`,
      inputSchema: {
        title: z.string().min(1).describe("Tên trò chơi"),
        kind: z.enum(GAME_KINDS),
        source: z.looseObject({}).describe("Nguồn câu hỏi như mô tả ở trên"),
        timerSeconds: z.number().int().min(0).max(300).optional().describe("quiz: giây cho mỗi câu, 0 hoặc bỏ trống = không giới hạn"),
      },
    },
    async ({ title, kind, source, timerSeconds }) => {
      const g = await games.create(actor, { title, kind, source, timerSeconds });
      return json({ ...g, ...(await makeGameLink(g.id)) });
    },
  );

  server.registerTool(
    "danh_sach_tro_choi",
    { title: "Danh sách trò chơi", description: "Liệt kê trò chơi ôn tập đã tạo (id, tên, loại, số câu). Truyền id để lấy link tải mới.", inputSchema: { id: z.string().optional() } },
    async ({ id }) => {
      const all = await games.list(actor);
      if (!id) return json(all);
      const g = all.find((x) => x.id === id);
      return json(g ? { ...g, ...(await makeGameLink(id)) } : null);
    },
  );
}
