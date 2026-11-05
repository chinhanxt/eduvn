type Obj = Record<string, unknown>;
const base = {
  co_quan_chu_quan: "SỞ GD&ĐT TP. HỒ CHÍ MINH",
  co_quan_ban_hanh: "TRƯỜNG THPT NGUYỄN DU",
  ky_hieu_co_quan: "THPTND",
  so: 45,
  dia_danh: "TP. Hồ Chí Minh",
  ngay: "2026-11-05",
  noi_nhan: ["Sở GD&ĐT (để báo cáo)", "Các tổ chuyên môn", "Lưu: VT"],
  chuc_vu_ky: "HIỆU TRƯỞNG",
  nguoi_ky: "Nguyễn Văn An",
};

export const keHoach = (over: Obj = {}): Obj => ({
  ...base,
  loai: "ke_hoach",
  trich_yeu: "Tổ chức Hội thi Olympic Toán học năm học 2026–2027",
  can_cu: ["Căn cứ Kế hoạch giáo dục nhà trường năm học 2026–2027", "Căn cứ Công văn số 1234/SGDĐT-GDTrH ngày 01/10/2026 của Sở GD&ĐT"],
  noi_dung: [
    "Thực hiện chỉ đạo của Sở, Trường THPT Nguyễn Du xây dựng kế hoạch tổ chức Hội thi Olympic Toán học như sau:",
    { cap: 1, tieu_de: "Mục đích, yêu cầu" },
    { cap: 2, tieu_de: "Mục đích" },
    "Phát hiện, bồi dưỡng học sinh có năng khiếu môn Toán; tạo sân chơi trí tuệ lành mạnh.",
    { cap: 2, tieu_de: "Yêu cầu" },
    { danh_sach: ["Tổ chức nghiêm túc, an toàn, tiết kiệm", "100% học sinh khối 10, 11 được thông tin"] },
    { cap: 1, tieu_de: "Thời gian, địa điểm" },
    { cap: 2, tieu_de: "Thời gian" },
    { cap: 3, tieu_de: "Vòng sơ khảo: ngày 20/11/2026" },
    { cap: 3, tieu_de: "Vòng chung kết: ngày 05/12/2026" },
    { cap: 1, tieu_de: "Tổ chức thực hiện" },
    "Tổ Toán chủ trì, phối hợp Đoàn trường và Văn phòng triển khai kế hoạch này.",
  ],
  ...over,
});

export const congVan = (over: Obj = {}): Obj => ({
  ...base,
  loai: "cong_van",
  ky_hieu_co_quan: "THPTND",
  ky_hieu_don_vi: "VP",
  so: undefined,
  ngay: undefined,
  trich_yeu: "Đề nghị cử cán bộ tham dự tập huấn chương trình GDPT 2018",
  kinh_gui: ["Phòng Giáo dục và Đào tạo Quận 1"],
  noi_dung: [
    "Thực hiện Kế hoạch số 12/KH-SGDĐT ngày 15/10/2026 của Sở GD&ĐT về tập huấn giáo viên, Trường THPT Nguyễn Du đề nghị Quý Phòng cử 02 cán bộ quản lý tham dự đợt tập huấn.",
    "Rất mong nhận được sự quan tâm, phối hợp của Quý Phòng./.",
  ],
  ...over,
});

export const bienBan = (over: Obj = {}): Obj => ({
  ...base,
  loai: "bien_ban",
  trich_yeu: "Họp Hội đồng sư phạm tháng 11 năm 2026",
  thoi_gian: "14 giờ 00 phút, ngày 05 tháng 11 năm 2026",
  dia_diem: "Phòng họp lớn, Trường THPT Nguyễn Du",
  thanh_phan: ["Ông Nguyễn Văn An – Hiệu trưởng (chủ trì)", "Bà Trần Thị Lan – Thư ký", "Toàn thể giáo viên, nhân viên"],
  noi_dung: ["Hội đồng sư phạm thống nhất các nội dung sau:", { cap: 1, tieu_de: "Triển khai nhiệm vụ tháng 11" }, "Kết thúc cuộc họp lúc 16 giờ 00 phút cùng ngày."],
  ...over,
});
