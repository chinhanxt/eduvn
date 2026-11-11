// Hàm thuần của hộp thoại Xuất bản (dễ test).
export const sizeText = (n?: number) => (n === undefined ? "" : n > 1e6 ? `${(n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
export const etaText = (s?: number) => (s === undefined ? "" : s < 60 ? `còn khoảng ${Math.max(1, s)} giây` : `còn khoảng ${Math.round(s / 60)} phút`);
