/** Dữ liệu mẫu riêng Gói A (Soạn · bài giảng · giấy tờ). Nhất quán với thế giới mẫu: cô Hà dạy Toán 10A1, 3 em cần giúp. */
import { KHANH_DUY, MINH_ANH, NUMBERS, SCHOOL, TEACHERS } from "../kit";

export const HA = TEACHERS.find((t) => t.id === "ha")!;
export { KHANH_DUY, MINH_ANH, NUMBERS, SCHOOL, TEACHERS };

/** Loại slide "Giấy học thuật" — mỗi loại có hình riêng tự vẽ. */
export type SlideKind = "cover" | "story" | "sign" | "steps" | "line" | "flip" | "quiz";
export type Slide = { id: string; kind: SlideKind; eyebrow: string; title: string; points: string[]; say: string[] };

export const LESSON = {
  title: "Bất phương trình bậc hai một ẩn",
  subject: "Toán 10",
  className: "10A1",
  minutes: 45,
  prompt: "Bất phương trình bậc hai một ẩn · Toán 10 · 45 phút · có ví dụ đời thực",
};

export const SLIDES: Slide[] = [
  {
    id: "s1", kind: "cover", eyebrow: "Toán 10 · Chương VII", title: "Bất phương trình bậc hai một ẩn", points: ["Lớp 10A1 · cô Lê Thu Hà"],
    say: ["Chào các em, hôm nay chúng ta học bất phương trình bậc hai một ẩn.", "Cuối buổi, các em sẽ tự giải được mọi bài dạng này chỉ với ba bước."],
  },
  {
    id: "s2", kind: "story", eyebrow: "Khởi động", title: "Bán bao nhiêu cốc thì có lãi?", points: ["Lãi P(x) = −x² + 6x − 5", "x chục cốc · P trăm nghìn đồng", "Có lãi khi P(x) > 0"],
    say: ["Quầy nước chanh của lớp bán x chục cốc mỗi buổi.", "Tiền lãi là P của x bằng trừ x bình cộng sáu x trừ năm, tính bằng trăm nghìn đồng.", "Vậy bán bao nhiêu cốc thì quầy có lãi?"],
  },
  {
    id: "s3", kind: "sign", eyebrow: "Kiến thức", title: "Dấu của tam thức bậc hai", points: ["a > 0: trong trái, ngoài cùng", "Giữa hai nghiệm: trái dấu với a"],
    say: ["Với a dương, tam thức âm giữa hai nghiệm và dương ở hai bên.", "Các em nhớ câu: trong trái, ngoài cùng."],
  },
  {
    id: "s4", kind: "steps", eyebrow: "Phương pháp", title: "Giải trong ba bước", points: ["Tìm nghiệm của f(x) = 0", "Lập bảng xét dấu", "Chọn khoảng thoả đề"],
    say: ["Bước một, tìm nghiệm.", "Bước hai, lập bảng xét dấu.", "Bước ba, chọn khoảng thoả mãn yêu cầu đề bài."],
  },
  {
    id: "s5", kind: "line", eyebrow: "Ví dụ", title: "x² − 5x + 6 < 0", points: ["Nghiệm: x = 2, x = 3", "Tập nghiệm: (2 ; 3)"],
    say: ["Tam thức có hai nghiệm là hai và ba.", "Vì a dương nên tam thức âm giữa hai nghiệm.", "Tập nghiệm là khoảng từ hai đến ba."],
  },
  {
    id: "s6", kind: "flip", eyebrow: "Lỗi hay gặp", title: "Nhân với số âm: đổi chiều", points: ["−x² + 5x − 6 > 0", "⇔ x² − 5x + 6 < 0"],
    say: ["Nhiều bạn quên đổi chiều khi nhân hai vế với số âm.", "Hãy luôn khoanh dấu bất đẳng thức trước khi nhân."],
  },
  {
    id: "s7", kind: "quiz", eyebrow: "Luyện tập", title: "Thử ngay ba câu", points: ["x² − 4 ≥ 0", "−x² + 2x + 3 > 0", "x² + x + 1 < 0"],
    say: ["Bây giờ các em thử ba câu sau.", "Câu cuối có bẫy, các em để ý dấu của delta nhé."],
  },
];

/** Dàn ý AI viết (dòng bắt đầu bằng "#" là mục, "-" là ý con). Dùng chung cho Tạo và Giấy tờ. */
export const OUTLINE_TEXT = [
  "# Khởi động: bán bao nhiêu cốc thì có lãi?",
  "- Bài toán quầy nước chanh của lớp, lãi P(x) = −x² + 6x − 5",
  "- Cả lớp đoán khoảng số cốc bán ra thì có lãi",
  "# Dấu của tam thức bậc hai",
  "- Nhắc lại định lí, quy tắc “trong trái, ngoài cùng”",
  "- Hình parabol cắt trục hoành",
  "# Giải bất phương trình trong ba bước",
  "- Tìm nghiệm · lập bảng xét dấu · chọn khoảng",
  "- Ví dụ x² − 5x + 6 < 0",
  "# Lỗi hay gặp",
  "- Nhân với số âm mà quên đổi chiều",
  "# Luyện tập phân hoá",
  "- 3 câu từ dễ đến khó, có câu bẫy Δ < 0",
].join("\n");

export type OutlineSec = { title: string; items: string[] };
/** Tách chữ đang stream thành cây dàn ý (mục cuối có thể đang viết dở). */
export function parseOutline(text: string): OutlineSec[] {
  const out: OutlineSec[] = [];
  for (const raw of text.split("\n")) {
    const l = raw.trim();
    if (l.startsWith("#")) out.push({ title: l.replace(/^#\s*/, ""), items: [] });
    else if (l.startsWith("-") && out.length) out[out.length - 1]!.items.push(l.replace(/^-\s*/, ""));
  }
  return out;
}

/** Nguồn web AI đọc khi soạn (tên hư cấu hoặc tài liệu công khai, không gắn đường dẫn thật). */
export const SOURCES = [
  { host: "sgk", name: "SGK Toán 10 — Kết nối tri thức", quote: "Bài 18. Phương trình quy về phương trình bậc hai", hue: 210 },
  { host: "ctgdpt", name: "Chương trình GDPT 2018 — Môn Toán", quote: "Giải được bất phương trình bậc hai một ẩn", hue: 150 },
  { host: "hoso", name: "Hồ sơ lớp 10A1", quote: `${NUMBERS.needHelp.length} em cần giúp bất phương trình`, hue: 265 },
  { host: "de", name: "Đề minh hoạ tốt nghiệp THPT", quote: "Câu 12: tập nghiệm của bất phương trình…", hue: 330 },
  { host: "kho", name: "Kho học liệu tổ Toán – Tin", quote: "Giáo án mẫu của cô Thu, 2025", hue: 30 },
];

/** Giọng đọc có sẵn + giọng nhân bản của cô Hà. */
export const VOICES = [
  { id: "ha", name: "Giọng cô Hà", note: "Nhân bản · 12 giây mẫu", clone: true },
  { id: "bac-nu", name: "Hà Nội · nữ", note: "Ấm, chậm rãi" },
  { id: "nam-nam", name: "Sài Gòn · nam", note: "Rõ, vui" },
  { id: "hue-nu", name: "Huế · nữ", note: "Nhẹ nhàng" },
] as const;
export type VoiceId = (typeof VOICES)[number]["id"];

/** Sóng âm giả định (ổn định giữa các lần render). */
export function wave(n: number, seed = 1): number[] {
  let s = seed * 9301 + 49297;
  return Array.from({ length: n }, (_, i) => {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    const env = Math.sin((Math.PI * (i + 1)) / (n + 1));
    return Math.max(0.12, Math.min(1, 0.25 + env * 0.55 + (r - 0.5) * 0.6));
  });
}
