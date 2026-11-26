import type { NavEntry, NavItem } from "../../ui/shell/nav";
import type { ArtKind } from "../../demo/kit/ToolArt";

/** Một chức năng cổng GV: `side` = có trên thanh bên (việc hằng ngày); còn lại chỉ ở trang Tất cả công cụ. Màn thật và màn mô phỏng xếp chung nhóm theo nghĩa. */
export type GvTool = NavItem & { desc: string; art: ArtKind; side?: boolean; keywords?: string };
export type GvGroup = { id: string; title: string; color: string; items: GvTool[] };

/** Bản đồ mọi chức năng cổng GV (nguồn chung cho thanh bên, Ctrl K, breadcrumb và trang Tất cả công cụ). */
export const GV_TOOLS: GvGroup[] = [
  {
    id: "hang-ngay",
    title: "Hằng ngày",
    color: "#2F5D8A",
    items: [
      { to: "/", label: "Hôm nay", icon: "home", kbd: "G H", end: true, side: true, desc: "Việc hôm nay, bài chờ chấm", art: "today" },
      { to: "/lop-hoc", label: "Lớp học", icon: "users", kbd: "G L", side: true, desc: "Học sinh, giao bài, theo dõi", art: "class" },
      { to: "/cham-bai", label: "Chấm bài", icon: "inbox", kbd: "G C", hot: true, side: true, desc: "Quét phiếu, chấm ảnh, nhập tay", art: "grade", keywords: "cham anh omr phieu" },
      { to: "/so-diem", label: "Sổ điểm", icon: "chart", kbd: "G S", side: true, desc: "Điểm, điểm danh, nhận xét", art: "sheet" },
      { to: "/giay-to", label: "Giấy tờ", icon: "clip", side: true, desc: "Kế hoạch bài dạy, sổ đầu bài, VNEdu", art: "paper", keywords: "5512 smas vnedu so dau bai bao cao" },
      { to: "/tro-ly-lop", label: "Trợ lý lớp", icon: "bot", side: true, desc: "AI báo em nào cần giúp", art: "chat" },
      { to: "/van-ban", label: "Văn bản hành chính", icon: "clip", desc: "Thông báo, biên bản đúng thể thức", art: "letter" },
    ],
  },
  {
    id: "soan-bai",
    title: "Soạn bài",
    color: "#6F42C1",
    items: [
      { to: "/bai-giang-ai", label: "Bài giảng AI", icon: "spark", side: true, desc: "Bài giảng có lời thoại", art: "lesson" },
      { to: "/giao-an", label: "Giáo án", icon: "book", side: true, desc: "Kế hoạch bài dạy theo tiết", art: "plan" },
      { to: "/de-thi", label: "Đề thi", icon: "exam", kbd: "G D", side: true, desc: "Đề từ ma trận, trộn mã đề", art: "exam", keywords: "7991 ma tran kiem tra" },
      { to: "/ngan-hang", label: "Ngân hàng câu hỏi", icon: "bank", kbd: "G N", side: true, desc: "Câu hỏi theo chủ đề, mức độ", art: "bank" },
      { to: "/slide", label: "Slide", icon: "slide", side: true, desc: "Slide PowerPoint từ giáo án", art: "slides", keywords: "powerpoint pptx trinh chieu" },
      { to: "/studio", label: "Studio hoạt hình", icon: "play", side: true, desc: "AI dựng hoạt hình minh hoạ", art: "anim", keywords: "video hoat hinh" },
      { to: "/bai-giang-ai/tao", label: "Tạo bài giảng bằng AI", icon: "spark", desc: "Từ một câu yêu cầu ra bài giảng", art: "compose" },
      { to: "/infographic", label: "Infographic", icon: "image", desc: "Biến nội dung bài thành hình", art: "info" },
      { to: "/so-do", label: "Sơ đồ", icon: "graph", desc: "Sơ đồ tư duy, lưu đồ", art: "mind" },
      { to: "/xuat-ban", label: "Xuất bản", icon: "upload", desc: "PowerPoint, video, gói offline, QR", art: "export" },
      { to: "/de-cuong", label: "Đề cương học phần", icon: "list", desc: "Đề cương đại học CLO–PLO", art: "outline", keywords: "dai hoc" },
    ],
  },
  {
    id: "tren-lop",
    title: "Trên lớp",
    color: "#0B7285",
    items: [
      { to: "/lop-hoc-ai", label: "Lớp học AI", icon: "present", side: true, desc: "Thầy AI, trợ giảng, bạn học AI", art: "stage" },
      { to: "/bang-giang", label: "Bảng giảng", icon: "board", side: true, desc: "Viết, vẽ hình, chiếu công thức", art: "board" },
      { to: "/giao-phan-hoa", label: "Giao phân hoá", icon: "shuffle", side: true, desc: "Mỗi nhóm một bài vừa sức", art: "lanes" },
      { to: "/dau-truong", label: "Đấu trường", icon: "target", side: true, desc: "Cả lớp thi đấu bằng mã PIN", art: "podium" },
      { to: "/kho-cong-cu", label: "Kho công cụ", icon: "box", side: true, desc: "Mô phỏng mọi môn, AI tạo thêm", art: "kit", keywords: "phet mo phong cong cu" },
      { to: "/chong-chatgpt", label: "Chống ChatGPT", icon: "shield", side: true, desc: "Bài chống làm hộ, nhận diện AI", art: "shield" },
      { to: "/tro-choi", label: "Trò chơi ôn tập", icon: "game", desc: "Đố vui, thẻ lật từ đề", art: "cards" },
      { to: "/workbench", label: "Workbench", icon: "layers", desc: "Phân tích dữ liệu, ghi chép AI", art: "bench" },
    ],
  },
  {
    id: "tu-lieu",
    title: "Đồng nghiệp & tư liệu",
    color: "#2B7A3B",
    items: [
      { to: "/to-chuyen-mon", label: "Tổ chuyên môn", icon: "users", desc: "Chia sẻ học liệu, duyệt đề tổ", art: "team" },
      { to: "/day-theo-nang-luc", label: "Dạy theo năng lực", icon: "target", desc: "Hoạt động tích cực CTGDPT 2018", art: "wheel" },
      { to: "/ban-dong-hanh", label: "Bạn đồng hành", icon: "chat", desc: "AI cùng nghĩ, phản biện bài dạy", art: "duo" },
      { to: "/giao-trinh", label: "Giáo trình sống", icon: "bookmark", desc: "Giáo trình cập nhật theo lớp", art: "book" },
      { to: "/kho-tri-thuc", label: "Kho tri thức", icon: "layers", desc: "Tài liệu nguồn cho gia sư AI", art: "library" },
    ],
  },
  {
    id: "ai",
    title: "AI & kết nối",
    color: "#B8336A",
    items: [
      { to: "/cai-dat-ai", label: "Cài đặt AI", icon: "sliders", desc: "AI tại trường, chạy cả khi mất mạng", art: "server", keywords: "offline local may chu" },
      { to: "/ket-noi", label: "Kết nối AI", icon: "plug", desc: "Dùng EDUVN trong Claude, ChatGPT", art: "plug", keywords: "mcp" },
    ],
  },
];

const strip = ({ desc: _d, art: _a, side: _s, keywords: _k, ...n }: GvTool): NavItem => n;

/** Thanh bên GV: 3 nhóm × 6 việc hằng ngày; mục ít dùng vẫn nằm trong danh sách (ẩn) để breadcrumb, Ctrl K, phím G nhận ra. */
export function gvNav(counts: { classes?: number; grading?: number } = {}): NavEntry[] {
  const count = (n: NavItem): NavItem => (n.to === "/lop-hoc" ? { ...n, count: counts.classes } : n.to === "/cham-bai" ? { ...n, count: counts.grading } : n);
  const side: NavEntry[] = [];
  const rest: NavItem[] = [];
  GV_TOOLS.forEach((g, gi) => {
    const s = g.items.filter((t) => t.side);
    if (s.length && gi > 0) side.push({ group: g.title });
    s.forEach((t) => side.push(count(strip(t))));
    g.items.filter((t) => !t.side).forEach((t) => rest.push({ ...strip(t), hidden: true }));
  });
  return [...side, ...rest];
}
/** Chân thanh bên: lối vào bản đồ mọi chức năng. */
export const GV_FOOT: NavItem[] = [{ to: "/cong-cu", label: "Tất cả công cụ", icon: "more" }];
