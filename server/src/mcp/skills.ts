import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SKILL_NAMES, listSkills, loadSkill, skillText } from "../services/skills";

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

/** Cho AI ngoài (Claude/ChatGPT qua MCP) đọc bộ skill sư phạm: tool `lay_skill` và một prompt cho mỗi skill. */
export function registerSkillTools(server: McpServer): void {
  server.registerTool(
    "lay_skill",
    {
      title: "Lấy skill sư phạm",
      description:
        "Không truyền name: liệt kê 6 skill (ma-tran-dac-ta-7991, cau-hoi-theo-yccd, giao-an-5512, nhan-xet-tt22-tt27, de-cuong-hoc-phan, rubric-tu-luan) kèm mô tả. Truyền name: trả toàn văn quy trình + tài liệu tham chiếu (CV 5512, CV 7991, TT22, TT27, CT GDPT 2018) và định dạng JSON đầu ra khớp các tool luu_giao_an, them_cau_hoi, tao_de, luu_nhan_xet… Đọc skill trước khi soạn.",
      inputSchema: { name: z.string().optional().describe("tên skill") },
    },
    async ({ name }) => {
      if (!name) return json(await listSkills());
      const s = await loadSkill(name);
      return { content: [{ type: "text" as const, text: skillText(s) }] };
    },
  );

  for (const name of SKILL_NAMES) {
    server.registerPrompt(name, { title: name, description: `Nạp skill ${name} làm chỉ dẫn cho cuộc trò chuyện`, argsSchema: { yeu_cau: z.string().optional().describe("Yêu cầu cụ thể của giáo viên") } }, async ({ yeu_cau }) => ({
      messages: [{ role: "user" as const, content: { type: "text" as const, text: `${skillText(await loadSkill(name))}${yeu_cau ? `\n\n---\nYêu cầu của giáo viên: ${yeu_cau}` : ""}` } }],
    }));
  }
}
