/** Dữ liệu mẫu riêng màn Hồ sơ AI (gói C) — nhất quán với thế giới mẫu (MINH_ANH trong demo/kit/world.ts). */

/** Điểm 3 tháng trước (để radar có lớp so sánh). */
export const SCORES_BEFORE: Record<string, number> = { Toán: 5.7, "Ngữ văn": 6.3, "Hoá học": 8.2, "Tiếng Anh": 7.9, "Lịch sử": 7.3, "Địa lí": 7.1, "Sinh học": 6.5 };

export type Evidence = { icon: string; t: string; s: string; when: string };
export type Insight = {
  id: string;
  tag: string;
  color: string;
  text: string;
  /** Suy đoán (chưa đủ bằng chứng) → hiện "Có vẻ". */
  guess?: boolean;
  conf: number;
  stat: string;
  subject?: string;
  ev: Evidence[];
  /** Ví dụ bài làm sai → sửa (chỉ cho lỗi đặc trưng). */
  slip?: { pre: string; wrong: string; right: string; post: string };
};

export const INSIGHTS: Insight[] = [
  {
    id: "hoa", tag: "Mạnh", color: "var(--c3)", text: "Hoá học là môn mạnh nhất", conf: 0.94, stat: "8,6", subject: "Hoá học",
    ev: [
      { icon: "exam", t: "Kiểm tra 15′ · Oxi hoá – khử", s: "9,5 điểm · nhanh hơn lớp 4 phút", when: "18/11" },
      { icon: "layers", t: "Luyện tập 24 câu", s: "Đúng 22 câu mức vận dụng", when: "20/11" },
      { icon: "chat", t: "Hỏi gia sư 6 câu nâng cao", s: "Tự đặt câu hỏi ngoài bài", when: "tuần này" },
    ],
  },
  {
    id: "doi-chieu", tag: "Lỗi hay gặp", color: "var(--c8)", text: "Quên đổi chiều bất đẳng thức khi nhân số âm", conf: 0.88, stat: "7 lần", subject: "Toán",
    slip: { pre: "−2x > 6  ⇒  x ", wrong: ">", right: "<", post: " −3" },
    ev: [
      { icon: "exam", t: "Kiểm tra 15′ · Bất phương trình, câu 4", s: "Nhân −1 nhưng giữ dấu >", when: "14/11" },
      { icon: "layers", t: "Luyện tập, câu 7 và 9", s: "Cùng một lỗi, hai dạng bài", when: "19/11" },
      { icon: "bot", t: "Phiên gia sư", s: "Em tự nhận ra sau gợi ý thứ hai", when: "21/11" },
    ],
  },
  {
    id: "doc-de", tag: "Lỗi hay gặp", color: "var(--c8)", text: "Đọc thiếu yêu cầu đề", conf: 0.71, stat: "4 lần", subject: "Ngữ văn",
    ev: [
      { icon: "pen", t: "Đọc hiểu nghị luận, câu 3", s: "Đề hỏi hai ý, em trả lời một", when: "12/11" },
      { icon: "exam", t: "Toán · “tìm m nguyên”", s: "Đưa ra cả m không nguyên", when: "17/11" },
    ],
  },
  {
    id: "luong-giac", tag: "Sắp quên", color: "var(--c1)", text: "Công thức lượng giác", conf: 0.8, stat: "ngày mai", subject: "Toán",
    ev: [
      { icon: "repeat", t: "Lần ôn gần nhất", s: "Cách đây 6 ngày · nhớ 5/8 thẻ", when: "19/11" },
      { icon: "trenddn", t: "Độ nhớ ước tính", s: "Còn 64%, sẽ dưới ngưỡng vào ngày mai", when: "hôm nay" },
    ],
  },
  {
    id: "gio-hoc", tag: "Nhịp học", color: "var(--c7)", text: "Học tốt nhất lúc 20–22h", guess: true, conf: 0.62, stat: "41 phiên",
    ev: [
      { icon: "clock", t: "41 phiên học trong 6 tuần", s: "68% bài điểm cao rơi vào 20–22h", when: "6 tuần" },
      { icon: "timer", t: "Phiên ngắn trước 18h", s: "Trung bình 9 phút, hay bỏ dở", when: "6 tuần" },
    ],
  },
  {
    id: "vi-du", tag: "Sở thích", color: "var(--c5)", text: "Thích ví dụ đời thực", guess: true, conf: 0.58, stat: "9 lần",
    ev: [
      { icon: "bulb", t: "Bấm “Cho em ví dụ thật”", s: "9 lần trong 3 tuần", when: "3 tuần" },
      { icon: "check", t: "Hiểu nhanh hơn khi có ví dụ", s: "Đúng ngay lần đầu 7/9 lần", when: "3 tuần" },
    ],
  },
];

/** Đường quên: các lần ôn (ngày, so với hôm nay) + ngày rơi xuống ngưỡng. */
export const CURVES = [
  { id: "luong-giac", label: "Lượng giác", color: "var(--c1)", reviews: [-14, -6], cross: 1, s0: 10 },
  { id: "btkl", label: "Bảo toàn khối lượng", color: "var(--c7)", reviews: [-12, -4], cross: 4, s0: 12 },
  { id: "hsb2", label: "Hàm số bậc hai", color: "var(--c3)", reviews: [-10, -3], cross: 12, s0: 14 },
] as const;
export const THRESHOLD = 0.6;

/** Hiệu quả học theo giờ (6h → 23h), 0–1. */
export const HOURS = [0.15, 0.2, 0.25, 0.2, 0.22, 0.3, 0.28, 0.25, 0.3, 0.35, 0.32, 0.38, 0.45, 0.5, 0.92, 1, 0.84, 0.35];

export type Memory = { id: string; text: string; src: string; conf: number; when: string; guess?: boolean };
export const MEMORY: { group: string; icon: string; items: Memory[] }[] = [
  {
    group: "Năng lực", icon: "chart",
    items: [
      { id: "m1", text: "Bất phương trình bậc hai đang lên: 42%", src: "12 bài làm", conf: 0.9, when: "22/11" },
      { id: "m2", text: "Hoá học là môn mạnh nhất (8,6)", src: "Sổ điểm + 24 câu luyện", conf: 0.94, when: "20/11" },
    ],
  },
  {
    group: "Lỗi hay gặp", icon: "alert",
    items: [
      { id: "m3", text: "Quên đổi chiều bất đẳng thức khi nhân số âm", src: "7 câu sai", conf: 0.88, when: "21/11" },
      { id: "m4", text: "Đọc thiếu yêu cầu đề", src: "4 câu sai, 2 môn", conf: 0.71, when: "17/11" },
    ],
  },
  {
    group: "Nhịp học", icon: "clock",
    items: [
      { id: "m5", text: "Học tốt nhất lúc 20–22h", src: "41 phiên học", conf: 0.62, when: "23/11", guess: true },
      { id: "m6", text: "Mỗi phiên khoảng 25 phút", src: "41 phiên học", conf: 0.77, when: "23/11" },
    ],
  },
  {
    group: "Mục tiêu", icon: "target",
    items: [{ id: "m7", text: "ĐH Bách khoa · ngành CNTT", src: "Em tự đặt", conf: 1, when: "05/09" }],
  },
  {
    group: "Ký ức", icon: "bookmark",
    items: [
      { id: "m8", text: "“À ra thế!” khi hiểu vì sao nhân số âm phải đổi chiều", src: "Phiên gia sư", conf: 1, when: "21/11" },
      { id: "m9", text: "Từng hỏi: vì sao dung dịch Fe³⁺ có màu vàng nâu?", src: "Phiên gia sư", conf: 1, when: "10/11" },
    ],
  },
];

export const WHO_SEES = [
  { name: "Minh Anh", role: "Em", hue: 205, sees: "Tất cả" },
  { name: "Lê Thu Hà", role: "Cô Hà · chủ nhiệm", hue: 28, sees: "Năng lực, lỗi môn Toán" },
  { name: "Nguyễn Thị Hồng", role: "Mẹ", hue: 340, sees: "Tóm tắt mỗi tuần" },
  { name: "Bình Minh", role: "Nhà trường", hue: 230, sees: "Số tổng hợp" },
];

export const ACCESS_LOG = [
  { who: "AI gia sư", what: "cập nhật “lỗi hay gặp”", when: "2 phút trước", icon: "bot" },
  { who: "Cô Hà", what: "xem năng lực Toán", when: "07:40 hôm nay", icon: "eye" },
  { who: "Mẹ", what: "nhận tóm tắt tuần", when: "CN 21:00", icon: "mail" },
];

/** Học bạ sống: lớp 6 → đại học. `v` = năng lực tổng (0–10), `proj` = dự kiến. */
export type Year = { k: string; label: string; year: string; place: string; v: number; proj?: boolean; now?: boolean; best: string; moment: string; note: string };
export const YEARS: Year[] = [
  { k: "6", label: "Lớp 6", year: "2022", place: "THCS Bình Minh", v: 6.1, best: "Toán hình", moment: "Lần đầu tự giải bài toán chuyển động", note: "Hồ sơ bắt đầu từ đây" },
  { k: "7", label: "Lớp 7", year: "2023", place: "THCS Bình Minh", v: 6.5, best: "Khoa học tự nhiên", moment: "Mê thí nghiệm đổi màu quỳ tím", note: "Hiểu nhanh khi có thí nghiệm" },
  { k: "8", label: "Lớp 8", year: "2024", place: "THCS Bình Minh", v: 7.0, best: "Hoá học 9,0", moment: "Giải Ba Hoá học cấp trường", note: "Bắt đầu học tốt buổi tối" },
  { k: "9", label: "Lớp 9", year: "2025", place: "THCS Bình Minh", v: 7.3, best: "Tiếng Anh", moment: "Vào lớp 10 với 41,5 điểm", note: "Vững dần đọc hiểu" },
  { k: "10", label: "Lớp 10", year: "2026", place: "THPT Bình Minh · 10A1", v: 7.4, now: true, best: "Hoá học 8,6", moment: "AI bàn giao hồ sơ cho cô Hà ngay ngày đầu năm", note: "Đang vá bất phương trình" },
  { k: "11", label: "Lớp 11", year: "2027", place: "THPT Bình Minh", v: 7.8, proj: true, best: "—", moment: "Chọn tổ hợp thi", note: "Dự kiến" },
  { k: "12", label: "Lớp 12", year: "2028", place: "THPT Bình Minh", v: 8.2, proj: true, best: "—", moment: "Thi tốt nghiệp THPT", note: "Dự kiến" },
  { k: "ĐH", label: "Đại học", year: "2029", place: "ĐH Bách khoa · CNTT", v: 8.5, proj: true, best: "—", moment: "Mục tiêu của em", note: "Hồ sơ thành hồ sơ năng lực" },
];
