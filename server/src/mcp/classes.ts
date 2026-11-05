import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { LEVELS, SCALES, TERMS } from "../domain/comments";
import { StudentItem } from "../domain/roster";
import { CreateClassInput } from "../services/classes";
import type { ClassService } from "../services/classes";
import type { Actor } from "../service";

type Deps = {
  classes: ClassService;
  actor: Actor;
  makeClassLink: (classRef: string, kind: "class_list" | "gradebook") => Promise<{ url: string; expiresInMinutes: number }>;
};

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerClassTools(server: McpServer, { classes, actor, makeClassLink }: Deps): void {
  const classRef = z.string().min(1).describe('Tên lớp (vd "10A1") hoặc id lớp');

  server.registerTool(
    "tao_lop",
    {
      title: "Tạo lớp",
      description: 'Tạo lớp học. name: "10A1". schoolYear: "2026-2027". subject: môn (tuỳ chọn). scale: "TT22" (Tốt/Khá/Đạt/Chưa đạt, THCS/THPT) hoặc "TT27" (Hoàn thành tốt/Hoàn thành/Chưa hoàn thành, tiểu học). Cột điểm mặc định TX1,TX2,TX3 (hệ số 1), GK (2), CK (3).',
      inputSchema: CreateClassInput.shape,
    },
    async (args) => json(await classes.createClass(actor, args)),
  );

  server.registerTool(
    "them_hoc_vien",
    {
      title: "Thêm học viên",
      description:
        'Thêm học viên vào lớp. students: mảng, mỗi phần tử là chuỗi "Họ tên;Ngày sinh;Giới tính;Ghi chú" (ngăn bằng ; hoặc TAB, chỉ họ tên là bắt buộc) hoặc object {fullName, code?, dob? (dd/mm/yyyy), gender? (Nam/Nữ), note?}. Trả về số đã thêm, id, và danh sách cảnh báo trùng tên/mã.',
      inputSchema: { class: classRef, students: z.array(StudentItem).min(1).max(500) },
    },
    async ({ class: c, students }) => json(await classes.addStudents(actor, c, { students })),
  );

  server.registerTool(
    "danh_sach_lop",
    {
      title: "Danh sách lớp",
      description: "Không truyền class: liệt kê các lớp (kèm sĩ số). Truyền class: chi tiết lớp gồm cột điểm và danh sách học viên (id, mã, họ tên, ngày sinh yyyy-mm-dd, giới tính, ghi chú).",
      inputSchema: { class: classRef.optional() },
    },
    async ({ class: c }) => json(c ? await classes.getClass(actor, c) : await classes.listClasses(actor)),
  );

  server.registerTool(
    "nhap_diem",
    {
      title: "Nhập điểm",
      description:
        'Nhập điểm một cột (vd "TX1", "GK", "CK") cho nhiều học viên. scores: object {studentId hoặc họ tên: điểm}. Điểm 0–10, tối đa 1 chữ số thập phân, nhận cả "8,5"; rỗng/null = xoá điểm. Có lỗi ở bất kỳ dòng nào thì không lưu gì và trả danh sách lỗi. ĐTB (TT22: Σ điểm×hệ số / Σ hệ số) chỉ có khi đủ mọi cột.',
      inputSchema: { class: classRef, column: z.string().min(1), scores: z.record(z.string(), z.union([z.string(), z.number(), z.null()])) },
    },
    async ({ class: c, column, scores }) => json(await classes.enterScores(actor, c, column, scores)),
  );

  server.registerTool(
    "diem_danh",
    {
      title: "Điểm danh",
      description:
        'Điểm danh theo ngày yyyy-mm-dd. records: {studentId hoặc họ tên: "present" (có mặt) | "excused" (vắng có phép) | "unexcused" (vắng không phép)}. defaultStatus (tuỳ chọn, thường "present"): áp cho cả lớp trước, rồi records ghi đè.',
      inputSchema: { class: classRef, date: z.string(), records: z.record(z.string(), z.string()).default({}), defaultStatus: z.string().optional() },
    },
    async ({ class: c, date, records, defaultStatus }) => json(await classes.markAttendance(actor, c, date, records, defaultStatus)),
  );

  server.registerTool(
    "xuat_so_diem",
    { title: "Xuất sổ điểm", description: "Link tải sổ điểm .xlsx của lớp (điểm, ĐTB, vắng, nhận xét + mức; sheet điểm danh). Hết hạn sau 15 phút.", inputSchema: { class: classRef } },
    async ({ class: c }) => json(await makeClassLink(c, "gradebook")),
  );

  server.registerTool(
    "xem_ho_so_hs",
    {
      title: "Xem hồ sơ học viên",
      description: "Điểm từng cột, ĐTB, thống kê + ngày vắng, nhận xét đã có (HK1/HK2) và thang đánh giá của lớp — để viết nhận xét. Không truyền student thì trả cả lớp.",
      inputSchema: { class: classRef, student: z.string().optional().describe("id hoặc họ tên") },
    },
    async ({ class: c, student }) => {
      const gb = await classes.gradebook(actor, c, student);
      return json({ ...gb, levels: LEVELS[gb.class.scale], commentRules: "Nhận xét 20–400 ký tự, không để trống; level thuộc levels" });
    },
  );

  server.registerTool(
    "luu_nhan_xet",
    {
      title: "Lưu nhận xét",
      description: `Lưu nhận xét hàng loạt cho một học kỳ (${TERMS.join(" hoặc ")}). items: [{student: id hoặc họ tên, text: 20–400 ký tự, level}]. level theo thang của lớp: TT22 = ${LEVELS.TT22.join(" / ")}; TT27 = ${LEVELS.TT27.join(" / ")}. Có lỗi thì không lưu gì và trả danh sách lỗi. Thang lớp: ${SCALES.join("/")}.`,
      inputSchema: { class: classRef, term: z.enum(TERMS), items: z.array(z.object({ student: z.string().min(1), text: z.string(), level: z.string() })).min(1).max(500) },
    },
    async ({ class: c, term, items }) => json(await classes.saveComments(actor, c, term, items)),
  );
}
