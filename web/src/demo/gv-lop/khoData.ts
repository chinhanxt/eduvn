/** Kho công cụ động (mô phỏng): mọi môn, mọi cấp, 4 nguồn. Số liệu nhất quán với thế giới mẫu (Trường Liên cấp Bình Minh). */
export type Src = "chuan" | "mo" | "ai" | "cd";
export type Level = "THCS" | "THPT" | "ĐH";
export type ThumbKind =
  | "pendulum" | "curves" | "parabola" | "molecule" | "cell" | "map" | "timeline" | "text" | "code" | "blocks" | "notes" | "palette"
  | "runner" | "gear" | "wave" | "cards" | "circuit" | "bars" | "orbit" | "mindmap" | "scale" | "punnett" | "perspective" | "bell";
export type Tool = { id: string; name: string; subject: string; level: Level; src: Src; kind: ThumbKind; uses: number; by?: string; isNew?: boolean };

export const SRC: Record<Src, { label: string; color: string }> = {
  chuan: { label: "Chuẩn", color: "var(--gl-c1)" },
  mo: { label: "Mở", color: "var(--gl-c3)" },
  ai: { label: "AI tạo", color: "var(--gl-c4)" },
  cd: { label: "Cộng đồng GV", color: "var(--gl-c5)" },
};

export const SUBJECTS = ["Toán", "Vật lí", "Hoá học", "Sinh học", "Ngữ văn", "Lịch sử", "Địa lí", "Tin học", "Tiếng Anh", "GDCD/KTPL", "Công nghệ", "Âm nhạc", "Mỹ thuật", "Thể dục", "Trải nghiệm"] as const;

/** Màu vật thể theo môn (bảng màu dữ liệu, không phải màu nhấn giao diện). */
export const SUBJECT_COLOR: Record<string, string> = {
  "Toán": "var(--gl-c1)", "Vật lí": "var(--gl-c2)", "Hoá học": "var(--gl-c4)", "Sinh học": "var(--gl-c3)", "Ngữ văn": "var(--gl-c5)",
  "Lịch sử": "var(--gl-c6)", "Địa lí": "var(--gl-c3)", "Tin học": "var(--gl-c1)", "Tiếng Anh": "var(--gl-c7)", "GDCD/KTPL": "var(--gl-c6)",
  "Công nghệ": "var(--gl-c2)", "Âm nhạc": "var(--gl-c4)", "Mỹ thuật": "var(--gl-c5)", "Thể dục": "var(--gl-c7)", "Trải nghiệm": "var(--gl-c3)",
  "Kinh tế": "var(--gl-c6)", "Xác suất": "var(--gl-c1)", "Cơ học": "var(--gl-c2)", "Điện – mạch": "var(--gl-c2)", "Lập trình": "var(--gl-c1)",
};

export const TOOLS: Tool[] = [
  { id: "parabol", name: "Parabol kéo thả", subject: "Toán", level: "THPT", src: "chuan", kind: "parabola", uses: 2140 },
  { id: "cung-cau", name: "Cung – cầu thị trường", subject: "GDCD/KTPL", level: "THPT", src: "chuan", kind: "curves", uses: 612 },
  { id: "phan-tu", name: "Phân tử 3D xoay được", subject: "Hoá học", level: "THPT", src: "mo", kind: "molecule", uses: 1870 },
  { id: "dien-bien-phu", name: "Diễn biến Điện Biên Phủ", subject: "Lịch sử", level: "THPT", src: "chuan", kind: "map", uses: 955 },
  { id: "nguyen-phan", name: "Nguyên phân từng kì", subject: "Sinh học", level: "THPT", src: "chuan", kind: "cell", uses: 1320 },
  { id: "khuong-nhac", name: "Khuông nhạc gõ thử", subject: "Âm nhạc", level: "THCS", src: "mo", kind: "notes", uses: 488 },
  { id: "python", name: "Python chạy trong trình duyệt", subject: "Tin học", level: "THPT", src: "mo", kind: "code", uses: 2610 },
  { id: "luan-diem", name: "Bản đồ luận điểm", subject: "Ngữ văn", level: "THPT", src: "chuan", kind: "mindmap", uses: 1104 },
  { id: "nhiet-am", name: "Biểu đồ nhiệt – ẩm", subject: "Địa lí", level: "THPT", src: "chuan", kind: "bars", uses: 1460 },
  { id: "song-dung", name: "Sóng dừng trên dây", subject: "Vật lí", level: "THPT", src: "mo", kind: "wave", uses: 740 },
  { id: "banh-xe-mau", name: "Bánh xe màu", subject: "Mỹ thuật", level: "THCS", src: "mo", kind: "palette", uses: 392 },
  { id: "nhip-tim", name: "Nhịp tim khi chạy 100 m", subject: "Thể dục", level: "THPT", src: "ai", kind: "runner", uses: 156 },
  { id: "banh-rang", name: "Hộp số bánh răng", subject: "Công nghệ", level: "THCS", src: "chuan", kind: "gear", uses: 530 },
  { id: "tu-vung", name: "Thẻ từ vựng lật", subject: "Tiếng Anh", level: "THCS", src: "cd", kind: "cards", uses: 1980, by: "thầy Minh" },
  { id: "phan-phoi", name: "Phân phối chuẩn", subject: "Xác suất", level: "ĐH", src: "mo", kind: "bell", uses: 860 },
  { id: "mendel", name: "Lai Mendel – bảng Punnett", subject: "Sinh học", level: "THCS", src: "cd", kind: "punnett", uses: 677, by: "cô Lan" },
  { id: "bau-troi", name: "Bầu trời đêm", subject: "Địa lí", level: "THCS", src: "mo", kind: "orbit", uses: 1210 },
  { id: "dong-thoi-gian", name: "Dòng thời gian kéo thả", subject: "Lịch sử", level: "THPT", src: "chuan", kind: "timeline", uses: 1530 },
  { id: "mach-rlc", name: "Mạch RLC", subject: "Điện – mạch", level: "ĐH", src: "mo", kind: "circuit", uses: 420 },
  { id: "keo-khoi", name: "Lập trình kéo khối", subject: "Tin học", level: "THCS", src: "mo", kind: "blocks", uses: 2290 },
  { id: "can-bang-pt", name: "Cân bằng phương trình", subject: "Hoá học", level: "THCS", src: "chuan", kind: "scale", uses: 1650 },
  { id: "tu-tu", name: "Gạch chân biện pháp tu từ", subject: "Ngữ văn", level: "THCS", src: "ai", kind: "text", uses: 318, by: "thầy Bảo" },
  { id: "phoi-canh", name: "Phối cảnh một điểm tụ", subject: "Mỹ thuật", level: "THPT", src: "ai", kind: "perspective", uses: 141 },
  { id: "bfs", name: "Duyệt đồ thị BFS/DFS", subject: "Lập trình", level: "ĐH", src: "cd", kind: "mindmap", uses: 590, by: "TS. Khải" },
  { id: "co-gian", name: "Độ co giãn của cầu", subject: "Kinh tế", level: "ĐH", src: "cd", kind: "curves", uses: 274 },
  { id: "nghe-nghiep", name: "Bánh xe nghề nghiệp", subject: "Trải nghiệm", level: "THPT", src: "cd", kind: "palette", uses: 805, by: "cô Phương" },
  { id: "mach-nha", name: "Mạch điện trong nhà", subject: "Công nghệ", level: "THCS", src: "mo", kind: "circuit", uses: 466 },
  { id: "phat-am", name: "Luyện phát âm có sóng giọng", subject: "Tiếng Anh", level: "THPT", src: "ai", kind: "wave", uses: 702, by: "thầy Minh" },
  { id: "va-cham", name: "Va chạm đàn hồi", subject: "Cơ học", level: "ĐH", src: "ai", kind: "pendulum", uses: 233 },
  { id: "tinh-huong", name: "Tình huống kỹ năng sống", subject: "Trải nghiệm", level: "THCS", src: "ai", kind: "cards", uses: 390, by: "cô Lan" },
  { id: "ngan-sach", name: "Ngân sách gia đình", subject: "GDCD/KTPL", level: "THCS", src: "cd", kind: "scale", uses: 512 },
  { id: "tiep-suc", name: "Đồng hồ tiếp sức", subject: "Thể dục", level: "THCS", src: "cd", kind: "runner", uses: 288 },
];

/** Môn lớn → môn trong danh mục (ĐH gộp theo ngành gần nhất khi lọc). */
export const subjectGroup = (s: string) =>
  ({ "Kinh tế": "GDCD/KTPL", "Xác suất": "Toán", "Cơ học": "Vật lí", "Điện – mạch": "Vật lí", "Lập trình": "Tin học" })[s] ?? s;

export const TOTAL_TOOLS = 1284;

/** Công cụ gợi ý cho bài đang soạn (Rơi tự do · Vật lí 10). */
export const FOR_LESSON = [
  { name: "Ống chân không", note: "Chuẩn", kind: "pendulum" as ThumbKind },
  { name: "Đồ thị s – t", note: "Chuẩn", kind: "parabola" as ThumbKind },
  { name: "Phân tích video rơi", note: "Cộng đồng GV", kind: "wave" as ThumbKind },
];
