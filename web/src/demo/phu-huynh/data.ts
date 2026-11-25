import { KHANH_DUY, MINH_ANH, TEACHERS, type Learner } from "../kit";

/** Dữ liệu mẫu riêng cổng Phụ huynh (nhất quán với thế giới mẫu: docs/demo/the-gioi-mau.md). */
export type Light = "xanh" | "vang" | "do";
export type Fact = { icon: string; text: string; tone?: "ok" | "warn" | "down" | "up" };
export type Step = { min: number; text: string; hint?: string };
export type Day = { d: string; min: number; bed: string; late: boolean };
export type Trend = { subject: string; score: number; dir: "len" | "xuong" | "giu" };

export type ParentView = {
  slug: string;
  child: Learner;
  /** Cách gọi người kèm trong câu: "bác", "chị". */
  you: string;
  guardian: string;
  relation: string;
  light: Light;
  headline: string;
  facts: Fact[];
  /** Đoạn đọc to cho phần "Con hôm nay". */
  read: string;
  steps: Step[];
  calm: string;
  week: Day[];
  trends: Trend[];
  ask: { q: string; a: string; from: string };
  zalo: string;
};

const ha = TEACHERS.find((t) => t.id === "ha")!;

export const VIEWS: ParentView[] = [
  {
    slug: KHANH_DUY.id,
    child: KHANH_DUY,
    you: "bác",
    guardian: "bác Trần Văn Tư",
    relation: "Ông nội",
    light: "vang",
    headline: "Cần để ý một chút",
    facts: [
      { icon: "check", text: "Đi học đủ", tone: "ok" },
      { icon: "book", text: "Làm 2 / 3 bài" },
      { icon: "trenddn", text: "Toán hơi xuống", tone: "down" },
      { icon: "moon", text: "Thức khuya 4 tối", tone: "warn" },
    ],
    read:
      "Chào bác Tư. Hôm nay Khánh Duy đi học đủ, làm được hai trên ba bài. Môn Toán đang hơi xuống, con còn lúng túng phần bất phương trình. Mấy tối nay con thức khuya. Tối nay bác chỉ cần ngồi cùng con mười phút.",
    steps: [
      { min: 3, text: "Hỏi con: “Hôm nay học Toán có chỗ nào khó không?”", hint: "Bác chỉ cần nghe con kể." },
      { min: 5, text: "Cùng con xem video ngắn cô Hà gửi.", hint: "Con hiểu nhanh hơn khi được xem." },
      { min: 2, text: "Nhắc con cất điện thoại, đi ngủ trước 11 giờ.", hint: "Ngủ đủ thì mai học vào hơn." },
    ],
    calm: "Bác không cần biết Toán. Ngồi cạnh con là đủ.",
    week: [
      { d: "T2", min: 40, bed: "22:40", late: false },
      { d: "T3", min: 30, bed: "23:10", late: false },
      { d: "T4", min: 20, bed: "23:50", late: true },
      { d: "T5", min: 10, bed: "00:15", late: true },
      { d: "T6", min: 20, bed: "23:45", late: true },
      { d: "T7", min: 0, bed: "00:30", late: true },
      { d: "CN", min: 30, bed: "22:50", late: false },
    ],
    trends: [
      { subject: "Địa lí", score: 8.4, dir: "len" },
      { subject: "Toán", score: 5.6, dir: "xuong" },
      { subject: "Hoá học", score: 5.2, dir: "xuong" },
    ],
    ask: {
      q: "Cô ơi, dạo này cháu Duy học Toán có theo kịp các bạn không?",
      a: "Thưa bác, Duy đang chậm ở phần bất phương trình, nhưng con hiểu rất nhanh khi xem video. Tuần này cô gửi con ba video ngắn, mỗi cái năm phút. Bác nhắc con xem giúp cô, xem xong con kể lại cho bác nghe là được ạ.",
      from: `${ha.short.replace(/^c/, "C")} · chủ nhiệm 10A1`,
    },
    zalo: "Khánh Duy hôm nay: cần để ý. Toán hơi xuống, con thức khuya 4 tối. Tối nay bác ngồi cùng con 10 phút nhé.",
  },
  {
    slug: MINH_ANH.id,
    child: MINH_ANH,
    you: "chị",
    guardian: "chị Nguyễn Thị Hồng",
    relation: "Mẹ",
    light: "xanh",
    headline: "Con đang học tốt",
    facts: [
      { icon: "check", text: "Đi học đủ", tone: "ok" },
      { icon: "book", text: "Làm đủ 3 / 3 bài", tone: "ok" },
      { icon: "flag", text: "Hoá được 9 điểm", tone: "up" },
      { icon: "trend", text: "Toán đang lên", tone: "up" },
    ],
    read:
      "Chào chị Hồng. Hôm nay Minh Anh học tốt. Con được chín điểm bài kiểm tra Hoá. Môn Toán, phần bất phương trình đang tiến bộ dần. Tối nay chị dành mười phút hỏi bài con nhé.",
    steps: [
      { min: 4, text: "Hỏi con: “Nhân hai vế với số âm thì dấu lớn bé đổi thế nào?”", hint: "Con đúng nếu nói: phải đổi chiều." },
      { min: 4, text: "Nhắc con ôn công thức lượng giác.", hint: "Mai là lúc con dễ quên phần này." },
      { min: 2, text: "Khen con bài Hoá được 9 điểm.", hint: "Một lời khen làm con học hăng hơn." },
    ],
    calm: "Chị không cần giảng. Hỏi và khen là đủ.",
    week: [
      { d: "T2", min: 50, bed: "22:10", late: false },
      { d: "T3", min: 40, bed: "22:20", late: false },
      { d: "T4", min: 60, bed: "22:30", late: false },
      { d: "T5", min: 40, bed: "22:00", late: false },
      { d: "T6", min: 50, bed: "22:40", late: false },
      { d: "T7", min: 30, bed: "23:00", late: false },
      { d: "CN", min: 40, bed: "22:15", late: false },
    ],
    trends: [
      { subject: "Hoá học", score: 8.6, dir: "len" },
      { subject: "Tiếng Anh", score: 8.2, dir: "giu" },
      { subject: "Toán", score: 6.4, dir: "len" },
    ],
    ask: {
      q: "Cô ơi, Minh Anh muốn thi Bách khoa thì Toán cần cố thêm phần nào ạ?",
      a: "Thưa chị, Minh Anh nắm chắc hàm số rồi. Con cần cố thêm phần bất phương trình và lượng giác. Cô đã xếp cho con mỗi tối hai mươi phút luyện đúng hai phần này. Chị cứ hỏi con mỗi tối một câu như hướng dẫn là đủ ạ.",
      from: `${ha.short.replace(/^c/, "C")} · chủ nhiệm 10A1`,
    },
    zalo: "Minh Anh hôm nay: học tốt. Hoá được 9 điểm, Toán đang lên. Tối nay chị hỏi con 1 câu bất phương trình nhé.",
  },
];

export const viewFor = (slug: string | undefined): ParentView => VIEWS.find((v) => v.slug === slug) ?? VIEWS[0]!;

export const LIGHTS: { id: Light; label: string; icon: string }[] = [
  { id: "xanh", label: "Ổn", icon: "check" },
  { id: "vang", label: "Để ý", icon: "eye" },
  { id: "do", label: "Cần giúp", icon: "alert" },
];

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ""}` : `${m} phút`);
