---
name: ban-do-chu-de
description: Bản đồ chuyên đề Việt Nam dạng choropleth theo lớp 34 tỉnh/thành phố (từ 01/07/2025, Nghị quyết 202/2025/QH15) hoặc 63 tỉnh (Atlat cũ): tô màu tuần tự theo chỉ số (mật độ dân số, GRDP, tỉ lệ rừng…), chú giải đặt ngay trên vùng và luôn hiển thị đầy đủ Quần đảo Hoàng Sa, Trường Sa thuộc Việt Nam. Choropleth Vietnam thematic map, 34 provinces, 63 provinces.
license: Proprietary (EDUVN)
metadata:
  ten: "Bản đồ chuyên đề (34 / 63 tỉnh)"
  engine: hf
  mon: dia,su
  lop: 6-12
  loai: ban-do,so-lieu,dia-danh
  can: dia-danh>=2,so>=2
  tranh: "nhiệt ẩm,12 tháng,tháp dân số"
  tuKhoa: "bản đồ chuyên đề,34 tỉnh,63 tỉnh,mật độ dân số,phân bố dân cư,choropleth,Hoàng Sa,Trường Sa,vùng kinh tế"
  thoiLuong: 14-45
  fallback: bieu_do_so_lieu
  kit: map,fill,enter,mark,focus,count
  version: "1"
  nguon: "hf:spain-map,NaturalEarth _vnm,geoBoundaries VNM,Nghị quyết 202/2025/QH15"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng phân tích sự phân bố không gian của một chỉ tiêu kinh tế – xã hội hoặc tự nhiên theo 34 tỉnh/thành mới (từ 01/07/2025) hoặc 63 tỉnh theo Atlat cũ.
- So sánh sự chênh lệch theo vùng (Đồng bằng sông Hồng, Đông Nam Bộ, Trung du miền núi phía Bắc, ĐBSCL…).
- Giới thiệu đơn vị hành chính Việt Nam sau sắp xếp 34 tỉnh/thành kèm khẳng định chủ quyền biển đảo.

## Không dùng
- Lời giảng mô tả luồng di chuyển, tuyến thương mại hay hướng gió (dùng `ban-do-luong` hoặc `gio-mua-khi-hau`).
- Bài phân tích diễn biến số liệu theo thời gian của cả nước không tách theo tỉnh (dùng `bieu-do-co-cau` hoặc `bieu-do-cot-duong`).

## Ý sư phạm
Dựng nền bản đồ Việt Nam trọn vẹn lãnh thổ rồi tô màu lần lượt theo từng ngưỡng giá trị (cao → trung bình → thấp) gắn chú giải trực tiếp ngay trên vùng để học sinh nhận ra quy luật phân bố không gian.
- Beat 0 (câu 0): Hiện bản đồ Việt Nam 34 tỉnh/thành cùng Quần đảo Hoàng Sa và Quần đảo Trường Sa.
- Beat 1 (câu 1): Tô đậm nhóm mật độ cao nhất (> 1.000 người/km²: Hà Nội, TP.HCM, Hải Phòng, Hưng Yên, Ninh Bình) kèm nhãn trực tiếp trên vùng.
- Beat 2 (câu 2): Tô nhóm mật độ trung bình (300–1.000 người/km²: Bắc Ninh, Đồng Tháp, Vĩnh Long, Cần Thơ, An Giang).
- Beat 3 (câu 3): Tô nhóm mật độ thấp (< 150 người/km²: Lai Châu, Điện Biên, Cao Bằng, Sơn La) để làm nổi bật tương phản đồng bằng – miền núi.
- Beat 4 (câu 4): Thẻ kết luận quy luật phân bố dân cư và thang chú giải tổng quát.

## Dữ liệu lấy từ lời giảng
- Chế độ bản đồ: `vn34` (mặc định từ 01/07/2025) hoặc `vn63` (chỉ khi đề bài nêu Atlat 63 tỉnh cũ).
- Danh sách mã tỉnh (`id` khớp `vn34.topo.json` / `vn63.topo.json`) và giá trị chỉ tiêu lấy từ lời giảng hoặc Nghị quyết 202/2025/QH15.
- Quần đảo Hoàng Sa (`da-nang`) và Quần đảo Trường Sa (`khanh-hoa`) luôn tự động hiển thị kèm nhãn.

## Bố cục
- Lưới 12 cột chuẩn `kit.css`, sân khấu y 150–900, trống hoàn toàn dải phụ đề y ≥ 936.
- Cột 1–6 (`ek-col-1 ek-span-6`): Bản đồ Việt Nam `data-ek-map="vn34"` (828×760 px) hiển thị đủ đất liền từ Lũng Cú đến Cà Mau và hai quần đảo Hoàng Sa, Trường Sa ở Biển Đông.
- Cột 7–12 (`ek-col-7 ek-span-6`): Tiêu đề, thang màu 4 bậc và các thẻ phân tích vùng theo từng beat.

## Chuyển động
Hiện bản đồ nền bằng `EK.enter`, sau đó tô từng nhóm tỉnh bằng `EK.fill` đúng màu token tuần tự và hiện chú giải vùng bằng `EK.enter`.
- Tối đa 1 chuyển động camera nếu cần; giữ nhãn vùng ngắn gọn (≤ 40 ký tự), không chồng lấn.

## Ví dụ
Xem `examples/vi-du-1/`: Bản đồ mật độ dân số 34 tỉnh/thành phố Việt Nam sau sắp xếp 01/07/2025 theo số liệu Nghị quyết 202/2025/QH15.

## Lỗi hay gặp
- Quên hoặc cắt mất Quần đảo Hoàng Sa, Trường Sa ra khỏi khung bản đồ Việt Nam.
- Nhồi tên cả 34 tỉnh lên màn hình gây chồng chữ (chỉ đặt chú giải nhóm vùng và 3–5 tỉnh cực trị tiêu biểu).
- Dùng màu ngẫu nhiên thay vì thang sắc độ có trật tự từ nhạt đến đậm.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: Hoàng Sa và Trường Sa hiện rõ thuộc Việt Nam, màu vùng phân bậc trực quan, chú giải nằm gọn trong vùng an toàn.
