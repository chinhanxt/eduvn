// Đường dẫn cổng Học v2 cho khu bài tập (thuần, không DOM — dùng cả trong khung, trang và test).

export const HOC_PATH = {
  baiTap: "/hoc/bai-tap",
  qr: "/hoc/bai-tap/qr",
  lamBai: (id: string) => `/hoc/lam-bai/${encodeURIComponent(id)}`,
  ketQua: (sid?: string) => (sid ? `/hoc/ket-qua/${encodeURIComponent(sid)}` : "/hoc/ket-qua"),
} as const;
