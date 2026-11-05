import { Readable } from "node:stream";
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
  const tt27 = gb.class.scale === "TT27";
  const hk = gb.term;
  const dtbHead = tt27 ? [] : hk === "HK2" ? ["ĐTB HK2", "ĐTB cả năm"] : ["ĐTB HK1"];
  const header = ["STT", "Mã", "Họ và tên", ...cols.map((c) => `${c.name}${tt27 ? "" : ` (hệ số ${c.weight})`}`), ...dtbHead, "Vắng có phép", "Vắng không phép", "Nhận xét HK1", "Mức HK1", "Nhận xét HK2", "Mức HK2"];
  const widths = [6, 12, 28, ...cols.map(() => 11), ...dtbHead.map(() => 11), 10, 12, 50, 16, 50, 16];
  const ws = sheet(wb, "Sổ điểm", `SỔ ĐIỂM LỚP ${gb.class.name} — ${hk === "HK1" ? "HỌC KỲ 1" : "HỌC KỲ 2"}`, `Năm học ${gb.class.schoolYear}${gb.class.subject ? ` · ${gb.class.subject}` : ""} · Đánh giá nhận xét theo ${gb.class.scale === "TT27" ? "TT27" : "TT22"}`, header, widths);
  gb.students.forEach((s, i) => {
    const r = addRow(
      ws,
      [i + 1, s.code ?? "", s.fullName, ...cols.map((c) => (s.scores[c.name] !== undefined ? num(s.scores[c.name] as number) : null)), ...(tt27 ? [] : hk === "HK2" ? [s.dtb, s.dtbYear] : [s.dtb]), s.attendance.excused, s.attendance.unexcused, s.comments.HK1?.text ?? "", s.comments.HK1?.level ?? "", s.comments.HK2?.text ?? "", s.comments.HK2?.level ?? ""],
      [1, ...cols.map((_, k) => 4 + k), ...dtbHead.map((_, k) => 4 + cols.length + k), 4 + cols.length + dtbHead.length, 5 + cols.length + dtbHead.length, 6 + cols.length + dtbHead.length],
    );
    for (let k = 0; k < cols.length + dtbHead.length; k++) r.getCell(4 + k).numFmt = tt27 ? "0" : "0.0";
  });

  if (gb.dates.length) {
    const sym = { present: "x", excused: "P", unexcused: "K" } as const;
    const wa = sheet(wb, "Điểm danh", `ĐIỂM DANH LỚP ${gb.class.name}`, `${ATTENDANCE_VI.present}: x · ${ATTENDANCE_VI.excused}: P · ${ATTENDANCE_VI.unexcused}: K`, ["STT", "Mã", "Họ và tên", ...gb.dates.map((d) => dobVi(d).slice(0, 5))], [6, 12, 28, ...gb.dates.map(() => 8)]);
    gb.students.forEach((s, i) => addRow(wa, [i + 1, s.code ?? "", s.fullName, ...gb.dates.map((d) => (s.days[d] ? sym[s.days[d]] : ""))], [1, ...gb.dates.map((_, k) => 4 + k)]));
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const XLSX_MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 600;
const MAX_COLS = 30;

/** Sheet đầu tiên → lưới chuỗi (ngày → dd/mm/yyyy). Chỉ đọc tối đa 600 dòng × 30 cột. */
export async function readFirstSheet(buffer: Buffer): Promise<string[][]> {
  if (buffer.length > XLSX_MAX_BYTES) throw new Error("file quá lớn");
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from([buffer]), { sharedStrings: "cache", hyperlinks: "ignore", styles: "cache", worksheets: "emit" });
  const grid: string[][] = [];
  for await (const ws of reader) {
    for await (const row of ws as AsyncIterable<ExcelJS.Row>) {
      if (row.number > MAX_ROWS) break;
      const cells: string[] = [];
      for (let i = 1; i <= Math.min(row.cellCount, MAX_COLS); i++) {
        const c = row.getCell(i);
        const v = c.value;
        cells.push(v instanceof Date ? `${v.getUTCDate()}/${v.getUTCMonth() + 1}/${v.getUTCFullYear()}` : v === null || v === undefined ? "" : c.text);
      }
      grid[row.number - 1] = cells;
    }
    break; // chỉ sheet đầu tiên
  }
  return Array.from(grid, (r) => r ?? []);
}
