/** Thế giới mẫu dùng chung cho mọi màn mô phỏng (xem docs/demo/the-gioi-mau.md). Chỉ THÊM, không đổi tên/số đã có. */
export const SCHOOL = { name: "Trường Liên cấp Bình Minh", principal: "thầy Lý Thành Công", students: 1240, teachers: 86 } as const;

export type Person = { id: string; name: string; short: string; role: "gv" | "hs" | "sv" | "ph" | "bgh"; className?: string; subject?: string };
export const TEACHERS: Person[] = [
  { id: "ha", name: "Lê Thu Hà", short: "cô Hà", role: "gv", subject: "Toán", className: "10A1" },
  { id: "bao-gv", name: "Nguyễn Quốc Bảo", short: "thầy Bảo", role: "gv", subject: "Ngữ văn", className: "11A3" },
  { id: "phuong", name: "Trần Mai Phương", short: "cô Phương", role: "gv", subject: "Lịch sử – Địa lí", className: "12A1" },
  { id: "lan", name: "Võ Ngọc Lan", short: "cô Lan", role: "gv", subject: "Sinh học", className: "8A2" },
  { id: "long", name: "Phạm Đức Long", short: "thầy Long", role: "gv", subject: "Hoá học" },
  { id: "minh", name: "Hoàng Minh", short: "thầy Minh", role: "gv", subject: "Tiếng Anh" },
  { id: "khai", name: "Đặng Văn Khải", short: "TS. Khải", role: "gv", subject: "Lập trình", className: "KTPM K23" },
];
export const CLASSES = [
  { id: "8A2", level: "THCS", homeroom: "lan", size: 38, avg: 7.4 },
  { id: "10A1", level: "THPT", homeroom: "ha", size: 42, avg: 7.2 },
  { id: "11A3", level: "THPT", homeroom: "bao-gv", size: 40, avg: 6.8 },
  { id: "12A1", level: "THPT", homeroom: "phuong", size: 41, avg: 7.6 },
  { id: "KTPM K23", level: "Đại học", homeroom: "khai", size: 56, avg: 7.9 },
] as const;

/** Mức thành thạo 0–1 theo chủ đề (bản đồ năng lực). */
export type Mastery = { subject: string; topic: string; level: number; trend: "len" | "xuong" | "giu" };
export type Learner = Person & {
  avatarHue: number; goal: string; strengths: string[]; weaknesses: string[]; habits: string[]; errors: string[];
  forgetting: { concept: string; dueInDays: number }[]; mastery: Mastery[]; scores: Record<string, number>; guardian?: string; wellbeing?: string;
};

export const MINH_ANH: Learner = {
  id: "minh-anh", name: "Nguyễn Minh Anh", short: "Minh Anh", role: "hs", className: "10A1", avatarHue: 205,
  goal: "ĐH Bách khoa · ngành CNTT",
  strengths: ["Hoá học", "Tiếng Anh"], weaknesses: ["Bất phương trình bậc hai", "Đọc hiểu nghị luận"],
  habits: ["Học tốt 20–22h", "Thích ví dụ đời thực"],
  errors: ["Đổi chiều bất đẳng thức khi nhân số âm", "Đọc thiếu yêu cầu đề"],
  forgetting: [{ concept: "Công thức lượng giác", dueInDays: 1 }, { concept: "Định luật bảo toàn khối lượng", dueInDays: 4 }],
  mastery: [
    { subject: "Toán", topic: "Bất phương trình bậc hai", level: 0.42, trend: "len" },
    { subject: "Toán", topic: "Hàm số bậc hai", level: 0.78, trend: "giu" },
    { subject: "Toán", topic: "Lượng giác", level: 0.61, trend: "xuong" },
    { subject: "Ngữ văn", topic: "Đọc hiểu nghị luận", level: 0.48, trend: "len" },
    { subject: "Hoá học", topic: "Phản ứng oxi hoá – khử", level: 0.88, trend: "len" },
    { subject: "Tiếng Anh", topic: "Thì hiện tại hoàn thành", level: 0.84, trend: "giu" },
    { subject: "Lịch sử", topic: "Chiến dịch Điện Biên Phủ", level: 0.7, trend: "giu" },
    { subject: "Sinh học", topic: "Di truyền Mendel", level: 0.66, trend: "len" },
  ],
  scores: { Toán: 6.4, "Ngữ văn": 6.8, "Hoá học": 8.6, "Tiếng Anh": 8.2, "Lịch sử": 7.5, "Địa lí": 7.3, "Sinh học": 7.1 },
  guardian: "ph-hong",
};

export const KHANH_DUY: Learner = {
  id: "khanh-duy", name: "Trần Khánh Duy", short: "Khánh Duy", role: "hs", className: "10A1", avatarHue: 150,
  goal: "Chưa chọn ngành",
  strengths: ["Địa lí", "Thể dục"], weaknesses: ["Bất phương trình bậc hai", "Hoá học"],
  habits: ["Thích học bằng video", "Hay nản sau 15 phút"],
  errors: ["Quên điều kiện xác định", "Làm tắt bước"],
  forgetting: [{ concept: "Bảng tuần hoàn nhóm IA", dueInDays: 0 }],
  mastery: [
    { subject: "Toán", topic: "Bất phương trình bậc hai", level: 0.35, trend: "xuong" },
    { subject: "Địa lí", topic: "Biểu đồ nhiệt – ẩm", level: 0.82, trend: "len" },
    { subject: "Hoá học", topic: "Phản ứng oxi hoá – khử", level: 0.4, trend: "xuong" },
  ],
  scores: { Toán: 5.6, "Ngữ văn": 6.5, "Hoá học": 5.2, "Địa lí": 8.4 },
  guardian: "ph-tu", wellbeing: "2 tuần nay thức khuya, điểm tụt",
};

export const THAO_VY: Learner = {
  id: "thao-vy", name: "Lê Thảo Vy", short: "Thảo Vy", role: "hs", className: "8A2", avatarHue: 330,
  goal: "Vào lớp 10 chuyên Sinh", strengths: ["Sinh học"], weaknesses: ["Phân số"], habits: ["Học sáng sớm"], errors: ["Quy đồng sai mẫu"],
  forgetting: [], mastery: [{ subject: "Sinh học", topic: "Tế bào", level: 0.9, trend: "len" }], scores: { "Sinh học": 9.1, Toán: 6.9 },
};

export const QUANG_HUY: Learner = {
  id: "quang-huy", name: "Phạm Quang Huy", short: "Quang Huy", role: "sv", className: "KTPM K23", avatarHue: 265,
  goal: "Kỹ sư phần mềm", strengths: ["Cấu trúc dữ liệu"], weaknesses: ["Xác suất thống kê"], habits: ["Học khuya"], errors: ["Nhầm phân phối"],
  forgetting: [], mastery: [{ subject: "Lập trình", topic: "Đồ thị BFS/DFS", level: 0.8, trend: "len" }], scores: { "Lập trình": 8.8, "Xác suất": 6.1 },
};

export const GUARDIANS: Person[] = [
  { id: "ph-hong", name: "Nguyễn Thị Hồng", short: "chị Hồng", role: "ph" },
  { id: "ph-tu", name: "Trần Văn Tư", short: "bác Tư", role: "ph" },
];

export const NUMBERS = {
  class10A1Avg: 7.2, needHelp: ["Minh Anh", "Khánh Duy", "Đức Thịnh"], earlyWarnings: 4, class11A3VanDrop: 0.6,
  prepBefore: "3 giờ", prepAfter: "25 phút", gradeBefore: "2 giờ / 40 bài", gradeAfter: "3 phút",
} as const;

/* ---------------- Bổ sung 2026-11-26 (gom từ 5 gói mô phỏng, dùng chung) ---------------- */

/** Lịch của mọi màn: hôm nay Thứ Tư 25/11/2026, tuần học 12 (T2 23/11 – CN 29/11). */
export const DEMO_DAY = { label: "Thứ Tư 25/11", iso: "2026-11-25", week: 12, monday: 23, month: 11 } as const;

/** Em thứ ba cần giúp bất phương trình (cùng Minh Anh, Khánh Duy). */
export const DUC_THINH: Learner = {
  id: "duc-thinh", name: "Đỗ Đức Thịnh", short: "Đức Thịnh", role: "hs", className: "10A1", avatarHue: 30,
  goal: "Chưa chọn ngành", strengths: ["Tin học"], weaknesses: ["Bất phương trình bậc hai"], habits: ["Làm nhanh, hay bỏ dở giữa bài"],
  errors: ["Dừng ở bước tìm nghiệm tam thức"],
  forgetting: [], mastery: [{ subject: "Toán", topic: "Bất phương trình bậc hai", level: 0.3, trend: "xuong" }], scores: { Toán: 5.8, "Tin học": 8.4 },
};

/** Thêm vào hồ sơ Minh Anh: Vật lí (Lớp học AI · Rơi tự do), bài Hoá gần nhất, điểm 3 tháng trước, các năm học. */
export const MINH_ANH_MORE = {
  physics: { subject: "Vật lí", topic: "Rơi tự do", level: 0.86, score: 7.8 },
  lastTest: { subject: "Hoá học", title: "Kiểm tra 15′ · Oxi hoá – khử", score: 9.5, date: "18/11" },
  scores3MonthsAgo: { Toán: 5.7, "Ngữ văn": 6.3, "Hoá học": 8.2, "Tiếng Anh": 7.9, "Lịch sử": 7.3, "Địa lí": 7.1, "Sinh học": 6.5 } as Record<string, number>,
  /** Điểm vào lớp 10 và TB các năm (lớp 6 → 10). */
  entrance10: 41.5,
  yearly: [ { grade: 6, avg: 6.1 }, { grade: 7, avg: 6.5 }, { grade: 8, avg: 7.0 }, { grade: 9, avg: 7.3 }, { grade: 10, avg: 7.4 } ],
} as const;

/** Mục tiêu thi ĐH của Minh Anh: tổ hợp D07 (Toán · Hoá · Anh), Bách khoa CNTT. Điểm thi dự kiến khác điểm TB lớp. */
export const EXAM_GOAL = {
  combo: "D07", subjects: ["Toán", "Hoá học", "Tiếng Anh"], school: "ĐH Bách khoa", major: "CNTT",
  need: 27.5, now: 24.6, afterFix: 26.2,
  projected: { Toán: 7.4, "Hoá học": 8.7, "Tiếng Anh": 8.5 } as Record<string, number>,
} as const;

/** GV khác (tổ Toán – Tin và GV chủ nhiệm các lớp thêm của cổng Nhà trường). TS. Khải sinh hoạt tổ Toán – Tin. */
export const MORE_TEACHERS: Person[] = [
  { id: "thu", name: "Đinh Hoài Thu", short: "cô Thu", role: "gv", subject: "Toán" },
  { id: "tam", name: "Lương Văn Tâm", short: "thầy Tâm", role: "gv", subject: "Toán" },
  { id: "ngoc", name: "Hồ Bích Ngọc", short: "cô Ngọc", role: "gv", subject: "Tin học" },
  { id: "mai", name: "Đỗ Thị Mai", short: "cô Mai", role: "gv", className: "6A1" },
  { id: "hung", name: "Vũ Văn Hưng", short: "thầy Hưng", role: "gv", className: "7A3" },
  { id: "trang", name: "Bùi Thu Trang", short: "cô Trang", role: "gv", className: "9A1" },
  { id: "binh", name: "Ngô Thanh Bình", short: "cô Bình", role: "gv", className: "11A1" },
];

/** Tổ chuyên môn. Thầy Bảo là tổ trưởng Văn. */
export const DEPARTMENTS = [
  { id: "toan-tin", name: "Tổ Toán – Tin", members: ["ha", "khai", "thu", "tam", "ngoc"] },
  { id: "van", name: "Tổ Ngữ văn", members: ["bao-gv"], lead: "bao-gv" },
  { id: "khtn", name: "Tổ Khoa học tự nhiên", members: ["long", "lan"] },
  { id: "xa-hoi", name: "Tổ Xã hội", members: ["phuong", "minh"] },
] as const;

/** Lớp thêm (chỉ để bản đồ toàn trường đủ dày). GV chủ nhiệm theo id trong TEACHERS / MORE_TEACHERS. */
export const MORE_CLASSES = [
  { id: "6A1", level: "THCS", homeroom: "mai", size: 40, avg: 7.6 },
  { id: "7A3", level: "THCS", homeroom: "hung", size: 39, avg: 7.1 },
  { id: "9A1", level: "THCS", homeroom: "trang", size: 41, avg: 7.5 },
  { id: "10A2", level: "THPT", homeroom: "long", size: 43, avg: 7.0 },
  { id: "11A1", level: "THPT", homeroom: "binh", size: 42, avg: 7.4 },
  { id: "12A2", level: "THPT", homeroom: "minh", size: 40, avg: 7.3 },
] as const;

/** Một phần danh sách 10A1 (10 em đầu sổ điểm). */
export const ROSTER_10A1 = ["Nguyễn Minh Anh", "Trần Khánh Duy", "Đỗ Đức Thịnh", "Lê Bảo Châu", "Hoàng Gia Hân", "Vũ Quốc Huy", "Đặng Thu Trang", "Bùi Nhật Nam", "Đỗ Khánh Linh", "Ngô Tuấn Kiệt"];

/** Số liệu toàn trường bổ sung. 1.240 HS tính cả 56 SV KTPM K23. */
export const SCHOOL_MORE = { parents: 1105, principals: 4, admins: 2, tools: 1284, toolSubjects: 15, animSkills: 87, aiModel: "14B · 1 GPU" } as const;

/** Khánh Duy: video ngắn 60 giây; tuần này 3 tối ngủ muộn, nghỉ học thứ Bảy. */
export const KHANH_DUY_MORE = { videoSeconds: 60, focusMinutes: 15, lateNights: 3, toanBefore: 6.8 } as const;
