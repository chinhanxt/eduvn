---
name: ban-do-luong
description: Bản đồ luồng Địa lí trên nền bản đồ Việt Nam (34 hoặc 63 tỉnh, kèm Hoàng Sa và Trường Sa): mũi tên cong vẽ dần nối vùng xuất đi và vùng đến với độ dày tỉ lệ lưu lượng (di cư lao động, vận tải hàng hoá, luồng thương mại). Flow map, migration arrows, trade flow Vietnam.
license: Proprietary (EDUVN)
metadata:
  ten: "Bản đồ luồng (di cư / thương mại)"
  engine: hf
  mon: dia
  lop: 9-12
  loai: ban-do,dia-danh,so-lieu
  can: dia-danh>=2
  tranh: "nhiệt ẩm,tháp dân số,cơ cấu tròn"
  tuKhoa: "bản đồ luồng,di cư,xuất cư,nhập cư,thương mại,vận tải,hành lang kinh tế,mũi tên lưu lượng"
  thoiLuong: 14-40
  fallback: so_do_quy_trinh
  kit: map,place,arrow,enter,mark
  version: "1"
  nguon: "hf:us-map-flow,NaturalEarth _vnm,Tổng điều tra dân số GSO"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng trình bày hướng di cư liên vùng (vd từ ĐBSCL, Bắc Trung Bộ về Đông Nam Bộ và Đồng bằng sông Hồng).
- Mô tả luồng vận chuyển hàng hoá, tuyến giao thông huyết mạch hoặc hành lang kinh tế (Đông – Tây, Bắc – Nam).

## Không dùng
- Bài chỉ so sánh giá trị tĩnh theo từng tỉnh không có dòng chuyển dịch (dùng `ban-do-chu-de`).
- Luồng gió mùa tự nhiên (dùng `gio-mua-khi-hau`).

## Ý sư phạm
Vẽ nền bản đồ Việt Nam và định vị các cực hút – vùng xuất trước, rồi lần lượt vẽ các mũi tên cong với độ dày tương ứng lưu lượng để học sinh đọc ngay cực nhập cư chính.
- Beat 0 (câu 0): Hiện bản đồ Việt Nam 34 tỉnh/thành (kèm Hoàng Sa, Trường Sa) và 2 cực thu hút lớn Hà Nội, TP. Hồ Chí Minh.
- Beat 1 (câu 1): Vẽ luồng di cư dày nhất từ ĐBSCL (Cần Thơ) tiến về TP. Hồ Chí Minh / Đông Nam Bộ.
- Beat 2 (câu 2): Vẽ các luồng từ Bắc Trung Bộ (Vinh) và Tây Nguyên (Buôn Ma Thuột) hướng về hai trung tâm kinh tế lớn.
- Beat 3 (câu 3): Thẻ tổng kết động lực việc làm, khu công nghiệp và đô thị hoá.

## Dữ liệu lấy từ lời giảng
- Danh sách địa danh xuất phát và đích đến phải là `id` hợp lệ trong `dia-danh.json`.
- Tỉ suất di cư thuần hoặc khối lượng luồng (nếu có) lấy từ lời giảng; độ rộng nét mũi tên tỉ lệ thuận với lưu lượng.

## Bố cục
- Cột 1–6 (`ek-col-1 ek-span-6`): Bản đồ `data-ek-map="vn34"` (828×780 px) kèm các mũi tên `data-ek-arrow` cong mượt không đè lên nhãn Hoàng Sa, Trường Sa.
- Cột 7–12 (`ek-col-7 ek-span-6`): Tiêu đề và 3 thẻ giải thích từng nhóm luồng di cư.

## Chuyển động
Vẽ từng luồng mũi tên theo thứ tự lời giảng bằng `EK.arrow`, kết hợp `EK.enter` cho địa danh đích và thẻ giải thích.

## Ví dụ
Xem `examples/vi-du-1/`: Các luồng di cư lao động chủ yếu hướng về vùng Đông Nam Bộ (TP.HCM) và Đồng bằng sông Hồng (Hà Nội).

## Lỗi hay gặp
- Mũi tên vẽ cắt ngang nhau rối mắt hoặc che mất nhãn Quần đảo Hoàng Sa, Trường Sa.
- Tất cả mũi tên cùng độ dày khiến học sinh không phân biệt được luồng chính – luồng phụ.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: đầu mũi tên bám đúng tọa độ địa danh đích, độ dày phản ánh đúng quy mô luồng.
