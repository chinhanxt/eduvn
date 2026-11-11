// XLSX (exceljs) / CSV / TSV → bảng Markdown. Mỗi trang tính một trang; trang tính dài cắt mỗi 200 dòng, lặp lại dòng tiêu đề.
import ExcelJS from "exceljs";
import { ValidationError } from "../../errors";
import { extOf } from "../registry";
import type { ParseProvider } from "../types";

export const TABLE_FORMATS = ["xlsx", "csv", "tsv"];
const ROWS_PER_PAGE = 200;
const MAX_ROWS = 5000;
const MAX_COLS = 50;

const cellMd = (s: string) => s.replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();

/** Bảng (dòng 1 = tiêu đề) → các trang Markdown. Bỏ cột/dòng trống ở cuối. */
export function tableToMarkdown(rows: string[][], title?: string): string[] {
  const trimmed = rows.map((r) => r.map((c) => cellMd(c ?? ""))).filter((r) => r.some((c) => c));
  if (!trimmed.length) return [];
  const width = Math.min(MAX_COLS, Math.max(...trimmed.map((r) => r.reduce((w, c, i) => (c ? i + 1 : w), 0))));
  const norm = trimmed.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));
  const [head, ...body] = norm as [string[], ...string[][]];
  const line = (r: string[]) => `| ${r.join(" | ")} |`;
  const top = [line(head.map((h, i) => h || `Cột ${i + 1}`)), line(head.map(() => "---"))];
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, body.length); i += ROWS_PER_PAGE) {
    const part = body.slice(i, i + ROWS_PER_PAGE);
    const label = title ? `## ${title}${body.length > ROWS_PER_PAGE ? ` (dòng ${i + 1}–${i + part.length})` : ""}\n\n` : "";
    pages.push(label + [...top, ...part.map(line)].join("\n"));
  }
  return pages;
}

/** CSV theo RFC 4180 (ngoặc kép, xuống dòng trong ô); tự nhận dấu phân cách , ; hoặc tab. */
export function parseCsv(text: string, delim?: string): string[][] {
  const s = text.replace(/^﻿/, "");
  if (!delim) {
    const first = s.split(/\r?\n/, 1)[0] ?? "";
    const counts = [",", ";", "\t"].map((d) => [d, first.split(d).length] as const);
    delim = counts.sort((a, b) => b[1] - a[1])[0]![0];
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"' && cell === "") q = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return v.result === undefined || v.result === null ? "" : cellText(v.result as ExcelJS.CellValue);
    if ("error" in v) return String(v.error);
    return "";
  }
  return String(v);
}

async function xlsxPages(buf: Buffer, warnings: string[]): Promise<string[]> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
  } catch {
    throw new ValidationError(["Không đọc được file Excel (.xlsx hỏng hoặc có mật khẩu)"]);
  }
  const pages: string[] = [];
  for (const ws of wb.worksheets) {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (r) => {
      if (rows.length >= MAX_ROWS) return;
      const vals = r.values as ExcelJS.CellValue[];
      rows.push(vals.slice(1).map(cellText));
    });
    if (ws.actualRowCount > MAX_ROWS) warnings.push(`Trang tính “${ws.name}” có ${ws.actualRowCount} dòng, chỉ đọc ${MAX_ROWS} dòng đầu`);
    pages.push(...tableToMarkdown(rows, `Trang tính: ${ws.name}`));
  }
  return pages;
}

export function createTableParser(): ParseProvider {
  return {
    info: { id: "bang-tinh", kind: "parse", label: "Bảng tính → bảng Markdown", description: "Excel .xlsx (mọi trang tính), CSV/TSV: giữ dạng bảng để AI đọc đúng hàng/cột.", local: true, free: true, formats: TABLE_FORMATS },
    check: async () => ({ ok: true, detail: "Sẵn sàng (đọc trong máy chủ)" }),
    async parse(name, buf) {
      const ext = extOf(name);
      const warnings: string[] = [];
      let pages: string[];
      if (ext === "xlsx") pages = await xlsxPages(buf, warnings);
      else {
        const rows = parseCsv(buf.toString("utf8"), ext === "tsv" ? "\t" : undefined);
        if (rows.length > MAX_ROWS + 1) warnings.push(`File có ${rows.length} dòng, chỉ đọc ${MAX_ROWS} dòng đầu`);
        pages = tableToMarkdown(rows.slice(0, MAX_ROWS + 1));
      }
      return { pages, engine: "bang-tinh", format: ext, warnings };
    },
  };
}
