export type Tool = { to: string; name: string; icon: string; color: "blue" | "green" | "violet" | "amber"; pill?: string };

/** 8 công cụ ở trang chủ. */
export const TOOLS: Tool[] = [
  { to: "/de-thi", name: "Tạo đề", icon: "exam", color: "blue" },
  { to: "/ngan-hang", name: "Thêm câu hỏi", icon: "bank", color: "blue" },
  { to: "/cham-bai", name: "Chấm bài", icon: "grade", color: "green" },
  { to: "/slide", name: "Làm slide", icon: "slide", color: "violet" },
  { to: "/video", name: "Video bài giảng", icon: "video", color: "violet", pill: "Thử" },
  { to: "/giao-trinh", name: "Giáo trình", icon: "book", color: "violet", pill: "Thử" },
  { to: "/gia-su", name: "Gia sư AI", icon: "cap", color: "amber", pill: "Thử" },
  { to: "/lop-hoc", name: "Lớp học", icon: "users", color: "amber" },
];
