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

export const GIA_BAO: Learner = {
  id: "gia-bao", name: "Trần Gia Bảo", short: "Gia Bảo", role: "hs", className: "10A1", avatarHue: 150,
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
  class10A1Avg: 7.2, needHelp: ["Minh Anh", "Gia Bảo", "Đức Thịnh"], earlyWarnings: 4, class11A3VanDrop: 0.6,
  prepBefore: "3 giờ", prepAfter: "25 phút", gradeBefore: "2 giờ / 40 bài", gradeAfter: "3 phút",
} as const;
