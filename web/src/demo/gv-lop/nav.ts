import type { NavEntry } from "../../ui/shell/nav";

/** Nhóm thanh bên "Lớp học AI" (Gói B mô phỏng). */
export const GV_LOP_NAV: NavEntry[] = [
  { group: "Lớp học AI" },
  { to: "/lop-hoc-ai", label: "Lớp học AI", icon: "present" },
  { to: "/ban-dong-hanh", label: "Bạn đồng hành", icon: "chat" },
  { to: "/workbench", label: "Workbench", icon: "layers" },
  { to: "/kho-cong-cu", label: "Kho công cụ", icon: "box" },
  { to: "/giao-phan-hoa", label: "Giao phân hoá", icon: "shuffle" },
  { to: "/chong-chatgpt", label: "Chống ChatGPT", icon: "shield" },
];
