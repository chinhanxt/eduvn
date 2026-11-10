import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ASSIGNMENT_KINDS, SHOW_SOLUTION } from "../domain/assignment";
import { NotFoundError } from "../errors";
import type { Actor, Service } from "../service";
import type { AssignmentService } from "../services/assignments";
import type { ClassService } from "../services/classes";

type Deps = { assignments: AssignmentService; classes: ClassService; service: Service; actor: Actor };

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerAssignmentTools(server: McpServer, { assignments, classes, service, actor }: Deps): void {
  const classRef = z.string().min(1).describe('Tên lớp (vd "10A1") hoặc id lớp');

  server.registerTool(
    "giao_bai",
    {
      title: "Giao bài cho lớp",
      description:
        "Giao một đề đã tạo (examId từ tao_de) cho lớp làm trực tuyến và mở ngay (published). dueAt: hạn nộp ISO 8601 có múi giờ, vd \"2026-11-12T21:00:00+07:00\". opensAt (tuỳ chọn, mặc định ngay bây giờ). kind: \"test\" (kiểm tra, mặc định 1 lượt, lời giải sau hạn nộp) hoặc \"practice\" (luyện tập, 3 lượt, lời giải ngay khi nộp). durationMinutes: bỏ trống = theo đề; null = không giới hạn trong cửa sổ mở. Mỗi HS nhận một mã đề theo số thứ tự; shuffle = đảo câu trong từng phần. HS vào bằng mã lớp + số thứ tự + PIN ở trang /hs.",
      inputSchema: {
        class: classRef,
        examId: z.string().min(1),
        title: z.string().min(1).max(160).optional(),
        dueAt: z.string().min(1),
        opensAt: z.string().optional(),
        kind: z.enum(ASSIGNMENT_KINDS).default("test"),
        durationMinutes: z.number().int().min(1).max(300).nullable().optional(),
        attemptsAllowed: z.number().int().min(1).max(10).optional(),
        showSolution: z.enum(SHOW_SOLUTION).optional(),
        shuffle: z.boolean().default(false),
      },
    },
    async ({ class: c, examId, title, ...rest }) => {
      const classId = await classes.classIdFor(actor, c, "class:read");
      const exam = await service.getExam(actor, examId);
      const a = await assignments.create(actor, classId, { ...rest, title: title ?? exam.title, source: { examId: exam.id }, publish: true });
      return json({ ...a, note: "HS đăng nhập tại /hs bằng mã lớp + số thứ tự + PIN (GV cấp ở tab Thẻ lớp)." });
    },
  );

  server.registerTool(
    "ket_qua_bai",
    {
      title: "Kết quả bài giao",
      description:
        "Tóm tắt kết quả một bài giao: số đã nộp / sĩ số, điểm trung bình và trung vị (thang 10), phân bố điểm, câu khó/dễ/cần xem lại (độ khó p, độ phân biệt D), chủ đề yếu, học sinh cần quan tâm. Truyền assignmentId, hoặc chỉ class để lấy bài giao mới nhất của lớp.",
      inputSchema: { assignmentId: z.string().optional(), class: classRef.optional() },
    },
    async ({ assignmentId, class: c }) => {
      let id = assignmentId;
      if (!id) {
        if (!c) throw new NotFoundError("Cần assignmentId hoặc class");
        const list = await assignments.list(actor, await classes.classIdFor(actor, c, "class:read"));
        id = list[0]?.id;
        if (!id) throw new NotFoundError(`Lớp "${c}" chưa có bài giao`);
      }
      const r = await assignments.results(actor, id);
      const s = r.stats;
      return json({
        assignment: { id: r.assignment.id, title: r.assignment.title, dueAt: r.assignment.dueAt, status: r.assignment.status },
        submitted: s.submitted,
        rosterSize: s.rosterSize,
        mean: s.mean,
        median: s.median,
        distribution: s.distribution,
        items: s.items.map((i) => ({ cau: i.label, topic: i.topic, p: i.p, d: i.d, flag: i.flag, hayChon: i.choices.slice(0, 2) })),
        weakTopics: s.topics.filter((t) => t.rate < 0.5),
        atRisk: s.atRisk.map((a) => ({ fullName: a.fullName, score10: a.score10, reasons: a.reasons })),
        pendingEssays: r.rows.reduce((n, x) => n + x.pending, 0),
      });
    },
  );
}
