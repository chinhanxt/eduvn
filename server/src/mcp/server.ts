import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MatrixCell } from "../domain/matrix";
import { QuestionFilter, QuestionInput } from "../domain/question";
import { ResponseValue } from "../domain/scoring";
import type { Actor, ExamLinks, Service } from "../service";
import type { AssignmentService } from "../services/assignments";
import type { ClassService } from "../services/classes";
import { registerAssignmentTools } from "./assignments";
import type { LessonService } from "../services/lessons";
import { registerClassTools } from "./classes";
import { registerLessonTools } from "./lessons";
import type { VanBanService } from "../services/vanban";
import { registerVanBanTools } from "./vanban";
import type { GameService } from "../services/games";
import type { SlideService } from "../services/slides";
import { registerGameTools } from "./games";
import { registerSlideTools } from "./slides";
import { registerSkillTools } from "./skills";

export type McpDeps = { service: Service; actor: Actor; makeLinks: (examId: string) => Promise<ExamLinks>;
  classes: ClassService;
  assignments: AssignmentService;
  makeClassLink: (classRef: string, kind: "class_list" | "gradebook", term?: "HK1" | "HK2") => Promise<{ url: string; expiresInMinutes: number }>;
  lessons: LessonService;
  vanBan: VanBanService;
  slides: SlideService;
  games: GameService;
  makeSlideLink: (id: string) => Promise<{ url: string; expiresInMinutes: number }>;
  makeGameLink: (id: string) => Promise<{ url: string; expiresInMinutes: number }>;
  makeVanBanLink: (id: string) => Promise<{ url: string; expiresInMinutes: number }>;
  makeLessonLink: (id: string) => Promise<{ url: string; expiresInMinutes: number }>;
  makeMatrixLink: (examId: string) => Promise<Record<string, unknown>>;
};

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export function buildMcpServer({ service, actor, makeLinks, classes, assignments, makeClassLink, lessons, makeLessonLink, vanBan, makeVanBanLink, slides, games, makeSlideLink, makeGameLink, makeMatrixLink }: McpDeps): McpServer {
  const server = new McpServer({ name: "eduvn", version: "0.1.0" });

  server.registerTool(
    "tim_cau_hoi",
    {
      title: "Tìm câu hỏi",
      description: "Tìm câu hỏi trong ngân hàng của tổ chức. Bắt buộc: subject (môn), grade (1–12 phổ thông, 13–16 năm 1–4 đại học). Tuỳ chọn: topic, level (NB/TH/VD), type (mcq/true_false/short_answer/essay), limit.",
      inputSchema: QuestionFilter.shape,
    },
    async (args) => json(await service.searchQuestions(actor, args)),
  );

  server.registerTool(
    "them_cau_hoi",
    {
      title: "Thêm câu hỏi",
      description:
        "Thêm 1–100 câu hỏi vào ngân hàng. mcq: 4 phương án, answer = chỉ số 0–3. true_false: 4 ý (statements), answer = 4 giá trị true/false. short_answer: answer là chuỗi ngắn. essay: rubric + points. level: NB (nhận biết), TH (thông hiểu), VD (vận dụng)." +
        ' Công thức toán: viết LaTeX trong cặp $…$ chen giữa chữ, vd stem "Cho hàm số $f(x)=x^2-2x+3$. Giá trị $f\\left(\\frac{1}{2}\\right)$ bằng", phương án "$\\frac{9}{4}$"; dấu đô la thường viết \\$. File Word xuất ra phương trình sửa được.',
      inputSchema: { questions: z.array(QuestionInput).min(1).max(100) },
    },
    async ({ questions }) => {
      const ids: string[] = [];
      for (const q of questions) ids.push((await service.addQuestion(actor, q)).id);
      return json({ added: ids.length, ids });
    },
  );

  server.registerTool(
    "tao_de",
    {
      title: "Tạo đề theo ma trận",
      description:
        "Tạo đề kiểm tra theo ma trận (CV 7991): mỗi ô = chủ đề × mức độ × dạng câu × số câu (+ yccd tuỳ chọn: yêu cầu cần đạt, dùng cho bản đặc tả khi xuat_ma_tran). Tạo nhiều mã đề (101, 102…), trộn câu và phương án. Thiếu câu thì báo ô thiếu.",
      inputSchema: {
        title: z.string().min(1),
        subject: z.string().min(1),
        grade: z.number().int().min(1).max(16),
        cells: z.array(MatrixCell).min(1),
        variants: z.number().int().min(1).max(24).default(4),
        durationMinutes: z.number().int().min(5).max(240).default(45),
        seed: z.number().int().min(0).max(2147483647).optional(),
      },
    },
    async ({ title, subject, grade, cells, variants, durationMinutes, seed }) => {
      const result = await service.generateExam(actor, { title, matrix: { subject, grade, cells }, variants, durationMinutes, seed });
      if (!result.ok) {
        const lines = result.shortages.map((s) => `- ${s.cell.topic} · ${s.cell.level} · ${s.cell.type}: cần ${s.need}, có ${s.have}`);
        return fail(`Ngân hàng chưa đủ câu hỏi:\n${lines.join("\n")}`);
      }
      return json(result);
    },
  );

  server.registerTool(
    "lay_dap_an",
    { title: "Lấy đáp án", description: "Đáp án của mọi mã đề trong một đề.", inputSchema: { examId: z.string() } },
    async ({ examId }) => json(await service.getAnswerKeys(actor, examId)),
  );

  server.registerTool(
    "cham_bai",
    {
      title: "Chấm bài trắc nghiệm",
      description:
        "Chấm một bài làm. responses: khoá = số thứ tự câu trong toàn đề (no, xem lay_dap_an); mcq = chỉ số 0–3, true_false = mảng 4 true/false, short_answer = chuỗi. Tự luận trả về pendingEssay.",
      inputSchema: { examId: z.string(), code: z.string().min(1), responses: z.record(z.string(), ResponseValue) },
    },
    async ({ examId, code, responses }) => json(await service.grade(actor, examId, code, responses)),
  );

  server.registerTool(
    "xuat_word",
    { title: "Xuất file Word", description: "Tạo link tải .docx cho từng mã đề và file đáp án (hết hạn sau 15 phút).", inputSchema: { examId: z.string() } },
    async ({ examId }) => json(await makeLinks(examId)),
  );

  server.registerTool(
    "xuat_ma_tran",
    {
      title: "Xuất ma trận + bản đặc tả",
      description:
        "Link tải .docx gồm Ma trận (chủ đề × dạng câu × mức độ NB/TH/VD, số câu, số điểm, tỉ lệ %) và Bản đặc tả (chủ đề × mức độ, yêu cầu cần đạt, số câu từng dạng) của một đề, theo CV 7991. Trả kèm cảnh báo (vd tổng điểm ≠ 10) và tỉ lệ NB/TH/VD. Yêu cầu cần đạt lấy từ trường yccd ở từng ô của tao_de.",
      inputSchema: { examId: z.string() },
    },
    async ({ examId }) => json(await makeMatrixLink(examId)),
  );

  registerLessonTools(server, { lessons, actor, makeLessonLink });
  registerVanBanTools(server, { vanBan, actor, makeVanBanLink });
  registerSlideTools(server, { slides, actor, makeSlideLink });
  registerGameTools(server, { games, actor, makeGameLink });
  registerClassTools(server, { classes, actor, makeClassLink });
  registerAssignmentTools(server, { assignments, classes, service, actor });
  registerSkillTools(server);

  return server;
}
