import { z } from "zod";

export const GradeColumn = z.object({
  name: z.string().trim().min(1).max(12),
  weight: z.number().int().min(1).max(5),
});
export type GradeColumn = z.infer<typeof GradeColumn>;

/** TT22/2021: TX hệ số 1, GK hệ số 2, CK hệ số 3. */
export const DEFAULT_COLUMNS: GradeColumn[] = [
  { name: "TX1", weight: 1 },
  { name: "TX2", weight: 1 },
  { name: "TX3", weight: 1 },
  { name: "GK", weight: 2 },
  { name: "CK", weight: 3 },
];

/** TT27/2020 (tiểu học): đánh giá định kỳ GKI, CKI, GKII, CN — điểm nguyên 1–10, không có ĐTB. */
export const TT27_COLUMNS: GradeColumn[] = [
  { name: "GKI", weight: 1 },
  { name: "CKI", weight: 1 },
  { name: "GKII", weight: 1 },
  { name: "CN", weight: 1 },
];

export const columnsFor = (scale: string): GradeColumn[] => (scale === "TT27" ? TT27_COLUMNS : DEFAULT_COLUMNS);

export function validateColumns(cols: GradeColumn[]): string[] {
  const errors: string[] = [];
  if (cols.length === 0) errors.push("Cần ít nhất 1 cột điểm");
  if (cols.length > 20) errors.push("Tối đa 20 cột điểm");
  const seen = new Set<string>();
  for (const c of cols) {
    const k = c.name.toLowerCase();
    if (seen.has(k)) errors.push(`Cột "${c.name}" bị trùng tên`);
    seen.add(k);
  }
  return errors;
}

/** Điểm 0–10, tối đa 1 chữ số thập phân, nhận "8,5". Rỗng/null → null (xoá điểm). Sai → chuỗi lỗi. */
export function parseScore(v: unknown, scale: string = "TT22"): { ok: true; value: number | null } | { ok: false; error: string } {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return { ok: true, value: null };
  const s = typeof v === "number" ? String(v) : typeof v === "string" ? v.trim().replace(",", ".") : "";
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, error: `điểm "${String(v)}" không phải số` };
  const n = Number(s);
  if (scale === "TT27") {
    if (!/^\d+$/.test(s) || n < 1 || n > 10) return { ok: false, error: `điểm ${s.replace(".", ",")} không hợp lệ: lớp TT27 chỉ nhận số nguyên từ 1 đến 10` };
    return { ok: true, value: n };
  }
  if (n < 0 || n > 10) return { ok: false, error: `điểm ${s.replace(".", ",")} ngoài thang 0–10` };
  if (Math.abs(n * 10 - Math.round(n * 10)) > 1e-9) return { ok: false, error: `điểm ${s.replace(".", ",")} chỉ được tối đa 1 chữ số thập phân` };
  return { ok: true, value: Math.round(n * 10) / 10 };
}

/** ĐTB môn = Σ(điểm×hệ số)/Σhệ số, làm tròn 1 chữ số; null nếu thiếu bất kỳ cột nào. */
export function averageScore(cols: GradeColumn[], scores: Record<string, number | undefined>): number | null {
  let sum10 = 0;
  let w = 0;
  for (const c of cols) {
    const s = scores[c.name];
    if (s === undefined) return null;
    sum10 += Math.round(s * 10) * c.weight;
    w += c.weight;
  }
  if (w === 0) return null;
  return Math.floor((2 * sum10 + w) / (2 * w)) / 10;
}

/** ĐTB cả năm = (ĐTB HK1 + 2×ĐTB HK2)/3, làm tròn 1 chữ số; chỉ có khi đủ cả hai học kỳ. */
export function yearAverage(hk1: number | null, hk2: number | null): number | null {
  if (hk1 === null || hk2 === null) return null;
  return Math.floor((2 * (Math.round(hk1 * 10) + 2 * Math.round(hk2 * 10)) + 3) / 6) / 10;
}

export const ATTENDANCE = ["present", "excused", "unexcused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE)[number];
export const ATTENDANCE_VI: Record<AttendanceStatus, string> = { present: "Có mặt", excused: "Vắng có phép", unexcused: "Vắng không phép" };

export function parseAttendance(v: unknown): AttendanceStatus | null {
  const s = String(v ?? "").trim().toLowerCase();
  if ((ATTENDANCE as readonly string[]).includes(s)) return s as AttendanceStatus;
  const alias: Record<string, AttendanceStatus> = {
    "có mặt": "present", co_mat: "present", comat: "present", "có": "present",
    "vắng có phép": "excused", vang_co_phep: "excused", "có phép": "excused", p: "excused",
    "vắng không phép": "unexcused", vang_khong_phep: "unexcused", "không phép": "unexcused", k: "unexcused",
  };
  return alias[s] ?? null;
}

export const isoDate = (s: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === s;
};
