import { z } from "zod";

export type Gender = "Nam" | "Nữ";
export type NewStudent = { fullName: string; code: string | null; dob: string | null; gender: Gender | null; note: string };

export const normName = (s: string): string => s.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

export const StudentObject = z.object({
  fullName: z.string().optional(),
  name: z.string().optional(),
  code: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  note: z.string().optional(),
});
export const StudentItem = z.union([z.string(), StudentObject]);
export type StudentItem = z.infer<typeof StudentItem>;

const pad = (n: number) => String(n).padStart(2, "0");

/** dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy hoặc yyyy-mm-dd → yyyy-mm-dd. Rỗng → null. Sai → undefined. */
export function parseDob(raw: string | undefined): string | null | undefined {
  const s = (raw ?? "").trim();
  if (s === "") return null;
  let y: number;
  let m: number;
  let d: number;
  let r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (r) {
    d = Number(r[1]);
    m = Number(r[2]);
    y = Number(r[3]);
  } else if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    y = Number(r[1]);
    m = Number(r[2]);
    d = Number(r[3]);
  } else return undefined;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return undefined;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export const dobVi = (iso: string | null): string => (iso ? iso.split("-").reverse().join("/") : "");

export function parseGender(raw: string | undefined): Gender | null | undefined {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "") return null;
  if (["nam", "m", "male", "trai"].includes(s)) return "Nam";
  if (["nữ", "nu", "f", "female", "gái", "gai"].includes(s)) return "Nữ";
  return undefined;
}

function build(i: number, o: { fullName?: string; code?: string; dob?: string; gender?: string; note?: string }, errors: string[]): NewStudent | null {
  const fullName = (o.fullName ?? "").trim().replace(/\s+/g, " ");
  if (!fullName) {
    errors.push(`Dòng ${i}: thiếu họ tên`);
    return null;
  }
  const dob = parseDob(o.dob);
  const gender = parseGender(o.gender);
  let ok = true;
  if (dob === undefined) {
    errors.push(`Dòng ${i} (${fullName}): ngày sinh "${o.dob}" sai, dùng dd/mm/yyyy`);
    ok = false;
  }
  if (gender === undefined) {
    errors.push(`Dòng ${i} (${fullName}): giới tính "${o.gender}" sai, dùng Nam hoặc Nữ`);
    ok = false;
  }
  if (!ok) return null;
  return { fullName, code: o.code?.trim() || null, dob: dob ?? null, gender: gender ?? null, note: (o.note ?? "").trim() };
}

const HEADER = /^(họ và tên|họ tên|họ & tên)$/i;

/** Dòng dán: "Họ tên ; Ngày sinh ; Giới tính ; Ghi chú" (ngăn bằng TAB hoặc ;). */
export function parseRosterLines(text: string): { rows: NewStudent[]; errors: string[] } {
  const rows: NewStudent[] = [];
  const errors: string[] = [];
  text.split(/\r?\n/).forEach((line, idx) => {
    if (line.trim() === "") return;
    const cells = line.split(/\t|;/).map((c) => c.trim());
    if (HEADER.test(cells[0] ?? "")) return;
    const first = (cells[0] ?? "").replace(/^\d+\s*[.)]\s+/, "");
    const r = build(idx + 1, { fullName: first, dob: cells[1], gender: cells[2], note: cells.slice(3).join(" ") }, errors);
    if (r) rows.push(r);
  });
  return { rows, errors };
}

export function normalizeStudentItems(items: StudentItem[]): { rows: NewStudent[]; errors: string[] } {
  const rows: NewStudent[] = [];
  const errors: string[] = [];
  items.forEach((it, idx) => {
    if (typeof it === "string") {
      const p = parseRosterLines(it);
      if (p.rows.length === 0 && p.errors.length === 0) errors.push(`Mục ${idx + 1}: rỗng`);
      rows.push(...p.rows);
      errors.push(...p.errors.map((e) => e.replace(/^Dòng \d+/, `Mục ${idx + 1}`)));
    } else {
      const r = build(idx + 1, { ...it, fullName: it.fullName ?? it.name }, errors);
      if (r) rows.push(r);
    }
  });
  return { rows, errors };
}

const stripAccent = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Bảng tính: tìm dòng tiêu đề có "Họ và tên"/"Họ tên", map cột theo tiêu đề. */
export function parseRosterSheet(grid: string[][]): { rows: NewStudent[]; errors: string[] } {
  const head = grid.slice(0, 15).findIndex((r) => r.some((c) => HEADER.test(c.trim())));
  if (head < 0) return { rows: [], errors: ['Không tìm thấy dòng tiêu đề có cột "Họ và tên" hoặc "Họ tên" ở sheet đầu tiên'] };
  const cols = (grid[head] ?? []).map(stripAccent);
  const find = (...names: string[]) => cols.findIndex((c) => names.includes(c));
  const iName = (grid[head] ?? []).findIndex((c) => HEADER.test(c.trim()));
  const iCode = find("ma", "mahs", "mahocsinh", "mahocvien", "mssv", "mahv");
  const iDob = find("ngaysinh", "ns");
  const iGender = find("gioitinh", "gt");
  const iNote = find("ghichu", "note");
  const rows: NewStudent[] = [];
  const errors: string[] = [];
  grid.slice(head + 1).forEach((r, k) => {
    if (r.every((c) => c.trim() === "")) return;
    const at = (i: number) => (i >= 0 ? r[i] : undefined);
    const s = build(head + k + 2, { fullName: at(iName), code: at(iCode), dob: at(iDob), gender: at(iGender), note: at(iNote) }, errors);
    if (s) rows.push(s);
  });
  return { rows, errors };
}

type Known = { fullName: string; code: string | null; dob: string | null };

/** Trùng mã hoặc (trùng tên + cùng ngày sinh) → bỏ qua; chỉ trùng tên → vẫn thêm, kèm cảnh báo. */
export function splitDuplicates(existing: Known[], incoming: NewStudent[]): { accept: NewStudent[]; warnings: string[] } {
  const seen: Known[] = [...existing];
  const accept: NewStudent[] = [];
  const warnings: string[] = [];
  for (const s of incoming) {
    const sameName = seen.filter((k) => normName(k.fullName) === normName(s.fullName));
    if (s.code && seen.some((k) => k.code && k.code.toLowerCase() === s.code?.toLowerCase())) {
      warnings.push(`Bỏ qua "${s.fullName}": mã ${s.code} đã có trong lớp`);
      continue;
    }
    if (s.dob && sameName.some((k) => k.dob === s.dob)) {
      warnings.push(`Bỏ qua "${s.fullName}": đã có học viên cùng tên và ngày sinh ${dobVi(s.dob)}`);
      continue;
    }
    if (sameName.length > 0) warnings.push(`Trùng tên: "${s.fullName}" đã có ${sameName.length} học viên cùng tên trong lớp — vẫn thêm, hãy kiểm tra`);
    accept.push(s);
    seen.push(s);
  }
  return { accept, warnings };
}

const VI = new Intl.Collator("vi");

/** Thứ tự danh sách lớp VN: theo TÊN (từ cuối), rồi họ đệm; còn lại do `position` quyết định ở nơi gọi. */
export function compareVietnameseNames(a: string, b: string): number {
  const split = (n: string) => {
    const w = n.normalize("NFC").trim().split(/\s+/);
    return { given: w[w.length - 1] ?? "", rest: w.slice(0, -1).join(" ") };
  };
  const x = split(a);
  const y = split(b);
  return VI.compare(x.given, y.given) || VI.compare(x.rest, y.rest);
}
