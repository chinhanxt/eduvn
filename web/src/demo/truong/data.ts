import { CLASSES, NUMBERS, SCHOOL, TEACHERS } from "../kit/world";

/** Dữ liệu mẫu riêng cổng Nhà trường. Lớp/GV/số gốc lấy từ thế giới mẫu; lớp thêm (6A1, 7A3…) chỉ để bản đồ đủ dày. */
export const SUBJECTS = ["Toán", "Ngữ văn", "Tiếng Anh", "Hoá học", "Sinh học", "Lịch sử", "Địa lí"] as const;
export type Subject = (typeof SUBJECTS)[number];

export type ClassRow = { id: string; level: string; homeroom: string; size: number; now: number[]; prev: number[] };

const base = (seed: number, avg: number, shape: number[]) => shape.map((d, i) => Math.round((avg + d + (((seed * 7 + i * 13) % 5) - 2) * 0.06) * 10) / 10);

/** Điểm TB từng môn tháng này và tháng trước. 11A3 Ngữ văn tụt đúng 0,6 (NUMBERS.class11A3VanDrop). */
export const ROWS: ClassRow[] = (() => {
  const extra = [
    { id: "6A1", level: "THCS", homeroom: "cô Đỗ Thị Mai", size: 40, avg: 7.6 },
    { id: "7A3", level: "THCS", homeroom: "thầy Vũ Văn Hưng", size: 39, avg: 7.1 },
    { id: "9A1", level: "THCS", homeroom: "cô Bùi Thu Trang", size: 41, avg: 7.5 },
    { id: "10A2", level: "THPT", homeroom: "thầy Phạm Đức Long", size: 43, avg: 7.0 },
    { id: "11A1", level: "THPT", homeroom: "cô Ngô Thanh Bình", size: 42, avg: 7.4 },
    { id: "12A2", level: "THPT", homeroom: "thầy Hoàng Minh", size: 40, avg: 7.3 },
  ];
  const core = CLASSES.filter((c) => c.level !== "Đại học").map((c) => ({
    id: c.id as string, level: c.level as string, size: c.size as number, avg: c.avg as number,
    homeroom: TEACHERS.find((t) => t.id === c.homeroom)?.short ?? "",
  }));
  const all = [...core, ...extra].sort((a, b) => parseInt(a.id) - parseInt(b.id) || a.id.localeCompare(b.id));
  const shape = [-0.5, 0, 0.4, 0.3, 0.1, -0.1, 0];
  // tiến/lùi trung bình mỗi lớp so với tháng trước
  const drift: Record<string, number> = { "6A1": 0.2, "7A3": -0.1, "8A2": 0.1, "9A1": 0.3, "10A1": 0.3, "10A2": 0.2, "11A1": 0.1, "11A3": -0.1, "12A1": 0.2, "12A2": 0 };
  return all.map((c, k) => {
    const now = base(k, c.avg, shape);
    const dr = drift[c.id] ?? 0;
    const prev = now.map((v, i) => Math.round((v - dr + (((k + i) % 3) - 1) * 0.1) * 10) / 10);
    if (c.id === "11A3") {
      now[1] = 6.1;
      prev[1] = Math.round((6.1 + NUMBERS.class11A3VanDrop) * 10) / 10;
    }
    if (c.id === "10A1") {
      now[0] = 6.6; prev[0] = 6.3; now[3] = 8.0;
    }
    return { id: c.id, level: c.level, homeroom: c.homeroom, size: c.size, now, prev };
  });
})();

export const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
export const schoolAvg = Math.round(avg(ROWS.flatMap((r) => r.now)) * 10) / 10;
export const fmt = (n: number, d = 1) => n.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });

/** So sánh GV: tiến bộ điểm lớp mình dạy (tháng trước → tháng này) và giờ soạn tiết kiệm nhờ AI mỗi tuần. */
export const TEACHER_ROWS = [
  { name: "cô Lê Thu Hà", subject: "Toán", prev: 6.5, now: 6.8, saved: 9.2 },
  { name: "thầy Phạm Đức Long", subject: "Hoá học", prev: 7.6, now: 7.9, saved: 7.5 },
  { name: "cô Võ Ngọc Lan", subject: "Sinh học", prev: 7.5, now: 7.6, saved: 6.1 },
  { name: "thầy Hoàng Minh", subject: "Tiếng Anh", prev: 7.7, now: 7.8, saved: 8.4 },
  { name: "cô Trần Mai Phương", subject: "Sử – Địa", prev: 7.4, now: 7.5, saved: 5.0 },
  { name: "thầy Nguyễn Quốc Bảo", subject: "Ngữ văn", prev: 6.9, now: 6.5, saved: 2.1 },
];

export const KPIS = [
  { label: "học sinh", value: SCHOOL.students, dec: 0 },
  { label: "giáo viên", value: SCHOOL.teachers, dec: 0 },
  { label: "điểm TB", value: schoolAvg, dec: 1, delta: "+0,1" },
  { label: "cảnh báo sớm", value: NUMBERS.earlyWarnings, dec: 0, alert: true },
];

/** Sức khoẻ tinh thần: số tín hiệu quá tải (tổng hợp) theo tuần và theo lớp. Nhóm dưới 5 em: ẩn. */
export const WELL_WEEKS = [9, 11, 10, 13, 12, 17, 21, 23];
export const WELL_CLASSES = [
  { id: "12A1", n: 7 },
  { id: "11A3", n: 6 },
  { id: "12A2", n: 5 },
  { id: "10A1", n: 2 },
  { id: "9A1", n: 2 },
  { id: "8A2", n: 1 },
];
export const HIDE_UNDER = 5;
