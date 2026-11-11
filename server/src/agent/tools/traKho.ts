// Công cụ mẫu: tra kho tri thức BM25 sẵn có (P6, s/tutor/kb.ts). Tìm song song tối đa 3 kho (DeepTutor DT-115: gieo ngữ cảnh từ ≤3 kho).
import { z } from "zod";
import type { KbService } from "../../tutor/kb";
import { defineTool } from "../tools";

const MAX_KBS = 3;
const KbIds = z.array(z.uuid()).max(MAX_KBS);

/** `params.kbIds` (khung soạn chọn) thu hẹp kho; không có thì tra 3 kho mới nhất của trường. */
export function kbSearchTool(kb: KbService) {
  return defineTool({
    name: "tra_kho_tri_thuc",
    title: "Tra kho tri thức",
    description: "Tìm đoạn tài liệu (sách, giáo án, vở ghi của lớp/trường) theo từ khoá. Dùng khi câu hỏi cần dẫn tài liệu; kết quả đánh số [n] để trích dẫn trong ANSWER.",
    input: z.object({
      q: z.string().trim().min(2).max(300).describe("từ khoá hoặc câu hỏi cần tra, tiếng Việt có dấu"),
      k: z.number().int().min(1).max(8).optional().describe("số đoạn cần lấy, mặc định 5"),
    }),
    async run({ q, k = 5 }, ctx) {
      const chosen = KbIds.safeParse(ctx.params.kbIds);
      const kbIds = chosen.success && chosen.data.length ? chosen.data : (await kb.list(ctx.actor)).filter((x) => x.docCount > 0).slice(0, MAX_KBS).map((x) => x.id);
      if (!kbIds.length) return { ok: false, content: "Trường chưa có kho tri thức nào có tài liệu. Trả lời bằng hiểu biết chung và nói rõ là không có tài liệu để dẫn.", summary: "Chưa có kho tài liệu" };
      ctx.progress(`Đang tìm “${q}” trong ${kbIds.length} kho`);
      const all = (await Promise.all(kbIds.map((id) => kb.search(ctx.actor, id, q, k).catch(() => [])))).flat();
      const hits = all.sort((a, b) => b.score - a.score).slice(0, k);
      if (!hits.length) return { content: `Không thấy đoạn nào khớp “${q}”. Thử từ khoá khác, hoặc trả lời bằng hiểu biết chung và nói rõ.`, summary: "Không thấy đoạn khớp" };
      return {
        content: hits.map((h, i) => `[#${i + 1}] ${h.doc}, trang ${h.page}:\n${h.text}`).join("\n\n"),
        summary: `${hits.length} đoạn · ${[...new Set(hits.map((h) => h.doc))].slice(0, 2).join(", ")}`,
        sources: hits.map((h) => ({ title: h.doc, page: h.page, snippet: h.text.length > 220 ? `${h.text.slice(0, 220)}…` : h.text })),
      };
    },
  });
}
