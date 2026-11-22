---
name: he-co-quan
description: Sơ đồ giải phẫu dạng nét học thuật cho các hệ cơ quan ở người và động vật (tuần hoàn kép, tiêu hoá, hô hấp, bài tiết) với đường dẫn chú thích sạch và chấm dòng chảy di chuyển qua các bộ phận bằng MotionPath. Không dùng ảnh gây khó chịu. Human organ systems, circulatory system, digestive tract, schematic diagram.
license: Proprietary (EDUVN)
metadata:
  ten: "Sơ đồ hệ cơ quan ở người"
  engine: hf
  mon: sinh
  lop: 8-11
  loai: quy-trinh,dien-bien,nhan-qua
  can: buoc>=2
  tranh: "phép lai,bảng Punnett,phân bào,dịch mã"
  tuKhoa: "hệ tuần hoàn,tim,phổi,tâm nhĩ,tâm thất,hệ tiêu hoá,hô hấp,bài tiết,vòng tuần hoàn lớn,vòng tuần hoàn nhỏ"
  thoiLuong: 14-42
  fallback: so_do_quy_trinh
  kit: enter,draw,follow,focus,mark
  version: "1"
  nguon: "hf:constellation-hub,EK.follow,EK.draw"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng trình bày cấu tạo và đường đi dòng chất trong một hệ cơ quan ở người/động vật (KHTN 8, Sinh học 11): hai vòng tuần hoàn máu, ống tiêu hoá, đường dẫn khí hô hấp, quá trình lọc ở thận.
- Cần thể hiện rõ chiều lưu chuyển (máu giàu $\text{O}_2$ / nghèo $\text{O}_2$, đường đi thức ăn, khí hít vào – thở ra) bằng sơ đồ nét học thuật sạch.

## Không dùng

- Cấu tạo mức tế bào và bào quan (dùng `cau-tao-te-bao`).
- Chu trình sinh hoá tế bào (dùng `chu-trinh-sinh-hoc`).
- TUYỆT ĐỐI không dùng ảnh chụp giải phẫu thật gây khó chịu; mọi cơ quan đều vẽ dạng sơ đồ nét học thuật trừu tượng rõ ràng.

## Ý sư phạm

Vẽ khung sơ đồ cơ quan dạng nét hình học học thuật trước, đánh dấu rõ từng bộ phận rồi cho chấm dòng chảy đi theo đúng chiều sinh lí để học sinh nhớ ngay trình tự hoạt động.

- Beat 0 (câu 0): Hiện sơ đồ nét tim 4 ngăn (hoặc ống cơ quan chính) kèm nhãn các phần cốt lõi.
- Beat 1 (câu 1): Vẽ đường vòng tuần hoàn nhỏ (hoặc giai đoạn đầu), chấm chạy từ tâm thất phải qua phổi trao đổi khí về tâm nhĩ trái.
- Beat 2 (câu 2): Vẽ đường vòng tuần hoàn lớn (hoặc giai đoạn sau), chấm chạy từ tâm thất trái tới cơ quan nuôi cơ thể rồi quay về tâm nhĩ phải.
- Beat 3 (câu 3): Tổng kết chức năng phối hợp của toàn hệ ở thẻ bên phải.

## Dữ liệu lấy từ lời giảng

- Tên hệ cơ quan, các bộ phận chính (4–6 nút chính, đúng chuẩn tên SGK KHTN 8 / Sinh học 11).
- Chiều di chuyển và sự thay đổi chất (máu giàu $\text{CO}_2$ → máu giàu $\text{O}_2$, hoặc phân giải cơ học → hấp thụ dinh dưỡng).

## Bố cục

- Lưới 12 cột: tiêu đề `y = 64–150`; sơ đồ nét hệ cơ quan đặt cột 1–7 (`top: 200px`), thẻ diễn biến từng vòng/chặng và chú giải màu đặt cột 8–12 (`top: 220px`).
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.enter` mở các khối cơ quan, `EK.draw` vẽ mạch/ống dẫn theo đúng chiều sinh lí, `EK.follow` cho chấm dòng máu/thức ăn chạy dọc đường dẫn và `EK.focus` làm nổi từng vòng tuần hoàn khi giảng. Không dùng `EK.camera`.

## Ví dụ

- `examples/vi-du-1/`: Hai vòng tuần hoàn máu ở người (KHTN 8): sơ đồ nét tim 4 ngăn (tâm nhĩ phải, tâm thất phải, tâm nhĩ trái, tâm thất trái), vòng tuần hoàn nhỏ qua phổi và vòng tuần hoàn lớn qua các cơ quan.

## Lỗi hay gặp

- Nhầm bên trái–phải của tim trên sơ đồ giải phẫu (tâm nhĩ/thất PHẢI của người nằm ở bên TRÁI màn hình nhìn vào, tâm nhĩ/thất TRÁI nằm ở bên PHẢI màn hình!).
- Nhầm chiều vòng tuần hoàn nhỏ (xuất phát từ tâm thất phải → phổi → tâm nhĩ trái, không phải tâm nhĩ phải!).
- Chỉ tô đỏ–xanh mà không ghi chú rõ "Giàu $\text{O}_2$" / "Giàu $\text{CO}_2$" (khó đọc với người mù màu).

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: hình nét học thuật sạch, đúng trái–phải giải phẫu của tim, có chú giải chữ rõ bên cạnh màu sắc, không nhãn đè nhau và không chạm y ≥ 936.
