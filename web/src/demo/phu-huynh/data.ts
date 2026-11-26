import { KHANH_DUY, KHANH_DUY_MORE, MINH_ANH, MINH_ANH_MORE, TEACHERS, type Learner } from "../kit/world";

const HOA = MINH_ANH_MORE.lastTest.score.toLocaleString("vi-VN");
const CO_HA = (TEACHERS.find((t) => t.id === "ha")?.short ?? "cô Hà").replace(/^c/, "C");

/** Dữ liệu mẫu riêng cổng Phụ huynh (nhất quán với thế giới mẫu: docs/demo/the-gioi-mau.md). Câu ngắn, lời đời thường. */
export type Light = "xanh" | "vang" | "do";
export type Step = { text: string; tip?: string };
export type Day = { d: string; light: Light; note: string };

export type ParentView = {
  slug: string;
  child: Learner;
  /** Cách xưng: "bác", "chị". */
  you: string;
  /** "bác Tư", "chị Hồng". */
  hi: string;
  relation: string;
  light: Light;
  /** Một dòng lý do, tối đa 6 từ. */
  reason: string;
  /** Bài đã làm hôm nay / tổng (vòng tiến độ nhỏ). */
  done: [number, number];
  /** Tóm tắt đọc to khi bấm Nghe. */
  read: string;
  /** Kèm con 10 phút: mỗi bước tối đa 12 từ. */
  steps: Step[];
  week: Day[];
  weekSay: string;
  ask: { q: string; a: string; from: string };
  zalo: string;
};

export const VIEWS: ParentView[] = [
  {
    slug: KHANH_DUY.id,
    child: KHANH_DUY,
    you: "bác",
    hi: "bác Tư",
    relation: "Ông nội",
    light: "vang",
    reason: "Toán hơi xuống · ngủ muộn",
    done: [2, 3],
    read: "Chào bác Tư. Hôm nay Khánh Duy đi học đủ. Môn Toán đang hơi xuống. Mấy tối nay con ngủ muộn. Tối nay bác ngồi cùng con mười phút nhé.",
    steps: [
      { text: "Hỏi con: hôm nay Toán có chỗ nào khó?", tip: "Bác chỉ cần nghe con kể." },
      { text: "Cùng con xem video ngắn cô Hà gửi." },
      { text: "Nhắc con cất điện thoại, ngủ trước 11 giờ." },
    ],
    week: [
      { d: "T2", light: "xanh", note: "Học tốt" },
      { d: "T3", light: "xanh", note: "Học tốt" },
      { d: "T4", light: "vang", note: "Ngủ muộn" },
      { d: "T5", light: "vang", note: "Ngủ muộn" },
      { d: "T6", light: "vang", note: "Ngủ muộn" },
      { d: "T7", light: "do", note: "Không học" },
      { d: "CN", light: "xanh", note: "Học tốt" },
    ],
    weekSay: `3 ngày tốt. ${KHANH_DUY_MORE.lateNights} tối con ngủ muộn.`,
    ask: {
      q: "Cô ơi, cháu Duy học Toán có theo kịp không?",
      a: "Duy đang chậm phần bất phương trình. Cô gửi con 3 video ngắn, mỗi video một phút. Bác nhắc con xem giúp cô nhé.",
      from: CO_HA,
    },
    zalo: "Khánh Duy hôm nay: Để ý. Toán hơi xuống, con ngủ muộn. Tối nay bác ngồi cùng con 10 phút nhé.",
  },
  {
    slug: MINH_ANH.id,
    child: MINH_ANH,
    you: "chị",
    hi: "chị Hồng",
    relation: "Mẹ",
    light: "xanh",
    reason: `Hoá được ${HOA} điểm`,
    done: [3, 3],
    read: "Chào chị Hồng. Hôm nay Minh Anh học tốt. Con được chín phẩy năm điểm bài kiểm tra Hoá. Môn Toán đang tiến bộ. Tối nay chị hỏi bài con mười phút nhé.",
    steps: [
      { text: "Hỏi con: nhân với số âm thì dấu đổi thế nào?", tip: "Con đúng nếu nói: đổi chiều." },
      { text: "Nhắc con ôn công thức lượng giác." },
      { text: `Khen con bài Hoá được ${HOA} điểm.` },
    ],
    week: [
      { d: "T2", light: "xanh", note: "Học tốt" },
      { d: "T3", light: "xanh", note: "Học tốt" },
      { d: "T4", light: "xanh", note: "Học tốt" },
      { d: "T5", light: "xanh", note: "Học tốt" },
      { d: "T6", light: "xanh", note: "Học tốt" },
      { d: "T7", light: "vang", note: "Học ít" },
      { d: "CN", light: "xanh", note: "Học tốt" },
    ],
    weekSay: "6 ngày tốt. Con học đều, ngủ sớm.",
    ask: {
      q: "Cô ơi, Minh Anh muốn thi Bách khoa thì cần cố phần nào?",
      a: "Minh Anh cần cố thêm bất phương trình và lượng giác. Chị hỏi con mỗi tối một câu là đủ ạ.",
      from: CO_HA,
    },
    zalo: `Minh Anh hôm nay: Ổn. Hoá được ${HOA} điểm. Tối nay chị hỏi con 1 câu nhé.`,
  },
];

export const viewFor = (slug: string | undefined): ParentView => VIEWS.find((v) => v.slug === slug) ?? VIEWS[0]!;

export const LIGHTS: Record<Light, { word: string; icon: string }> = {
  xanh: { word: "Ổn", icon: "check" },
  vang: { word: "Để ý", icon: "eye" },
  do: { word: "Cần giúp", icon: "alert" },
};
