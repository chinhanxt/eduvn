import ExcelJS from "exceljs";
import { ATTENDANCE_VI } from "../domain/gradebook";
import { dobVi } from "../domain/roster";
import type { Gradebook } from "../services/classes";

const FONT = { name: "Times New Roman", size: 13 };
const num = (n: number) => n; // hiển thị dấu phẩy nhờ numFmt theo locale của Excel; giữ số thật để tính được

function sheet(wb: ExcelJS.Workbook, name: string, title: string, sub: string, header: string[], widths: number[]) {
  const ws = wb.addWorksheet(name);
  ws.mergeCells(1, 1, 1, Math.max(header.length, 2));
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { ...FONT, size: 15, bold: true };
  ws.getCell(2, 1).value = sub;
  ws.getCell(2, 1).font = { ...FONT, italic: true };
  const h = ws.getRow(4);
  header.forEach((t, i) => {
    const c = h.getCell(i + 1);
    c.value = t;
    c.font = { ...FONT, bold: true };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8ECFB" } };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });
  ws.views = [{ state: "frozen", xSplit: 3, ySplit: 4 }];
  return ws;
}

function addRow(ws: ExcelJS.Worksheet, values: (string | number | null)[], center: number[] = []) {
  const r = ws.addRow(values);
  r.eachCell({ includeEmpty: true }, (c, i) => {
    c.font = FONT;
    c.alignment = { vertical: "top", wrapText: true, horizontal: center.includes(i) ? "center" : undefined };
    c.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });
  return r;
}

export async function renderClassListXlsx(gb: Gradebook): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = sheet(wb, `Lớp ${gb.class.name}`.slice(0, 31), `DANH SÁCH LỚP ${gb.class.name}`, `Năm học ${gb.class.schoolYear}${gb.class.subject ? ` · ${gb.class.subject}` : ""}`, ["STT", "Mã", "Họ và tên", "Ngày sinh", "Giới tính", "Ghi chú"], [6, 14, 32, 14, 11, 30]);
  gb.students.forEach((s, i) => addRow(ws, [i + 1, s.code ?? "", s.fullName, dobVi(s.dob), s.gender ?? "", s.note], [1, 4, 5]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function renderGradebookXlsx(gb: Gradebook): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const cols = gb.columns;
  const header = ["STT", "Mã", "Họ và tên", ...cols.map((c) => `${c.name} (hệ số ${c.weight})`), "ĐTB", "Vắng có phép", "Vắng không phép", "Nhận xét HK1", "Mức HK1", "Nhận xét HK2", "Mức HK2"];
  const widths = [6, 12, 28, ...cols.map(() => 11), 9, 10, 12, 50, 16, 50, 16];
  const ws = sheet(wb, "Sổ điểm", `SỔ ĐIỂM LỚP ${gb.class.name}`, `Năm học ${gb.class.schoolYear}${gb.class.subject ? ` · ${gb.class.subject}` : ""} · Đánh giá nhận xét theo ${gb.class.scale === "TT27" ? "TT27" : "TT22"}`, header, widths);
  gb.students.forEach((s, i) => {
    const r = addRow(
      ws,
      [i + 1, s.code ?? "", s.fullName, ...cols.map((c) => (s.scores[c.name] !== undefined ? num(s.scores[c.name] as number) : null)), s.dtb, s.attendance.excused, s.attendance.unexcused, s.comments.HK1?.text ?? "", s.comments.HK1?.level ?? "", s.comments.HK2?.text ?? "", s.comments.HK2?.level ?? ""],
      [1, ...cols.map((_, k) => 4 + k), 4 + cols.length, 5 + cols.length, 6 + cols.length],
    );
    for (let k = 0; k <= cols.length; k++) r.getCell(4 + k).numFmt = "0.0";
  });

  if (gb.dates.length) {
    const sym = { present: "x", excused: "P", unexcused: "K" } as const;
    const wa = sheet(wb, "Điểm danh", `ĐIỂM DANH LỚP ${gb.class.name}`, `${ATTENDANCE_VI.present}: x · ${ATTENDANCE_VI.excused}: P · ${ATTENDANCE_VI.unexcused}: K`, ["STT", "Mã", "Họ và tên", ...gb.dates.map((d) => dobVi(d).slice(0, 5))], [6, 12, 28, ...gb.dates.map(() => 8)]);
    gb.students.forEach((s, i) => addRow(wa, [i + 1, s.code ?? "", s.fullName, ...gb.dates.map((d) => (s.days[d] ? sym[s.days[d]] : ""))], [1, ...gb.dates.map((_, k) => 4 + k)]));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Sheet đầu tiên → lưới chuỗi (ngày → dd/mm/yyyy). */
export async function readFirstSheet(buffer: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const grid: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row, n) => {
    const cells: string[] = [];
    for (let i = 1; i <= row.cellCount; i++) {
      const v = row.getCell(i).value;
      if (v instanceof Date) cells.push(`${v.getUTCDate()}/${v.getUTCMonth() + 1}/${v.getUTCFullYear()}`);
      else if (v && typeof v === "object") cells.push(String((v as { text?: string; result?: unknown }).text ?? (v as { result?: unknown }).result ?? ""));
      else cells.push(v === null || v === undefined ? "" : String(v));
    }
    grid[n - 1] = cells;
  });
  return Array.from(grid, (r) => r ?? []);
}
