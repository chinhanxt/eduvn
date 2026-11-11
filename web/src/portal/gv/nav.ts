import type { NavEntry, NavItem } from "../../ui/shell/nav";

/** Mục thanh bên cổng GV (thứ tự theo mockup v2: việc hằng ngày trước, nhóm Soạn, rồi công cụ khác). */
export function gvNav(counts: { classes?: number; grading?: number } = {}): NavEntry[] {
  return [
    { to: "/", label: "Hôm nay", icon: "home", kbd: "G H", end: true },
    { to: "/lop-hoc", label: "Lớp học", icon: "users", kbd: "G L", count: counts.classes },
    { to: "/cham-bai", label: "Chấm bài", icon: "inbox", kbd: "G C", count: counts.grading, hot: true },
    { to: "/so-diem", label: "Sổ điểm", icon: "chart", kbd: "G S" },
    { group: "Soạn" },
    { to: "/ngan-hang", label: "Ngân hàng câu hỏi", icon: "bank", kbd: "G N" },
    { to: "/de-thi", label: "Đề thi", icon: "exam", kbd: "G D" },
    { to: "/bai-giang-ai", label: "Bài giảng AI", icon: "spark" },
    { to: "/giao-an", label: "Giáo án", icon: "book" },
    { to: "/bang-giang", label: "Bảng giảng", icon: "board" },
    { to: "/so-do", label: "Sơ đồ", icon: "graph" },
    { to: "/slide", label: "Slide", icon: "slide" },
    { to: "/de-cuong", label: "Đề cương học phần", icon: "list" },
    { group: "Ôn tập & tư liệu" },
    { to: "/tro-choi", label: "Trò chơi ôn tập", icon: "game" },
    { to: "/dau-truong", label: "Đấu trường", icon: "target" },
    { to: "/giao-trinh", label: "Giáo trình sống", icon: "layers" },
    { to: "/kho-tri-thuc", label: "Kho tri thức", icon: "box" },
    { to: "/van-ban", label: "Văn bản hành chính", icon: "clip" },
    { to: "/cong-cu", label: "Tất cả công cụ", icon: "more" },
  ];
}
export const GV_FOOT: NavItem[] = [{ to: "/ket-noi", label: "Kết nối AI", icon: "plug" }];

