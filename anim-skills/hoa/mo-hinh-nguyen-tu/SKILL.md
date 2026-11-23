---
name: mo-hinh-nguyen-tu
description: Hoạt hình mô hình cấu tạo nguyên tử gồm hạt nhân (proton mang điện dương, neutron không mang điện) ở tâm và các lớp vỏ electron (K, L, M) chuyển động theo quỹ đạo đồng tâm, minh hoạ số hiệu nguyên tử Z, số khối A = Z + N và tính trung hoà về điện. Dùng cho KHTN 7 và Hoá học 10 CTGDPT 2018. Atomic model, Bohr shells, nucleus protons neutrons, mass number A = Z + N.
license: Proprietary (EDUVN)
metadata:
  ten: "Mô hình nguyên tử (hạt nhân và lớp vỏ)"
  engine: hf
  mon: hoa
  lop: 7-10
  loai: dinh-nghia,quy-trinh
  can: so>=1
  tranh: "phương trình phản ứng,chuẩn độ,cấu trúc phân tử"
  tuKhoa: "mô hình nguyên tử,hạt nhân,proton,neutron,electron,lớp vỏ,số khối,đồng vị,Bohr,K L M"
  thoiLuong: 13-32
  fallback: the_ghi_nho
  kit: enter,draw,count,mark,focus,tint
  version: "1"
  nguon: "hf:locked-nucleus-orbit,hf:hw-box-label"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giới thiệu thành phần cấu tạo nguyên tử (proton, neutron, electron), điện tích hạt nhân và phân bố electron theo từng lớp vỏ K, L, M.
- Minh hoạ ký hiệu nguyên tử ${}^A_Z X$, tính số hạt (`p = e = Z`, `n = A − Z`) hoặc so sánh đồng vị (vd Carbon-12 và Carbon-14).

## Không dùng
- Cảnh yêu cầu biểu diễn ô lượng tử s, p, d theo quy tắc Hund/Pauli (dùng `cau-hinh-electron`).
- Cảnh mô tả liên kết giữa nhiều nguyên tử trong phân tử (dùng `cau-truc-phan-tu`).

## Ý sư phạm
Dựng nguyên tử từ trong ra ngoài: hạt nhân mang điện tích dương (+Z) ở tâm trước, sau đó vẽ từng lớp vỏ đồng tâm và đặt electron quay chậm để học sinh liên hệ ngay với ký hiệu ${}^A_Z X$.
- Beat 0 (câu 0): Hiện ký hiệu nguyên tử ${}^{12}_6\text{C}$ và khung hạt nhân ở trung tâm sân khấu.
- Beat 1 (câu 1): Điền 6 proton (`+`, đỏ son) và 6 neutron (`0`, xám mực) vào hạt nhân; chốt số khối `A = 6 + 6 = 12`.
- Beat 2 (câu 2): Vẽ lớp vỏ K (`n = 1`, 2 electron) và lớp vỏ L (`n = 2`, 4 electron) quay đều quanh hạt nhân.
- Beat 3 (câu 3): Chốt tính trung hoà về điện (`6p = 6e = Z`) và tổng kết bảng ba loại hạt cơ bản.

## Dữ liệu lấy từ lời giảng
- Ký hiệu nguyên tử, số hiệu nguyên tử `Z`, số khối `A`, số neutron `N = A − Z`.
- Phân bố electron trên các lớp vỏ lấy từ `electronConfiguration(Z).shells` trong `server/src/subjects/hoa/electronConfig.ts`.

## Bố cục
- Bố cục 2 cột: trái (`ek-col-1 ek-span-5`) chứa thẻ ký hiệu nguyên tử, bảng đếm hạt proton/neutron/electron và kết luận trung hoà điện; phải (`ek-col-7 ek-span-6`, `top:210px`) chứa sân khấu SVG mô hình nguyên tử (`828×680`).
- Để trống hoàn toàn dải phụ đề `y ≥ 936px`.

## Chuyển động
Vẽ từng quỹ đạo vỏ bằng `EK.draw`, hiện proton/neutron và các electron bằng `EK.enter`, xoay nhẹ nhóm quỹ đạo vỏ bằng `tl.to("#shellK", { rotation: 180 })` và `tl.to("#shellL", { rotation: -120 })` với `ease: "none"` suốt cảnh để tạo nhịp sống động mượt mà.

## Ví dụ
Xem `examples/vi-du-1/` — mô hình nguyên tử Carbon-12 (`Z = 6, N = 6, A = 12`, lớp vỏ `[2, 4]`, 15 giây).

## Lỗi hay gặp
- Vẽ quá 2 electron ở lớp K hoặc không khớp tổng `shells` với `Z`.
- Không phân biệt rõ màu và ký hiệu giữa proton (`+`), neutron (`0`) và electron (`−`).
- Cho electron quay quá nhanh gây rối mắt (nên giữ ≤ 12°/giây).

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Đếm đúng số hạt proton, neutron, electron theo ký hiệu ${}^A_Z X$.
- Mọi nhãn lớp vỏ (K, L) và chú thích nằm gọn trong khung, không bị vòng quay quét qua.
- Không dùng màu cam chủ đạo hay cỡ chữ nhỏ hơn 36 px.
