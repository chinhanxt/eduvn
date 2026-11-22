---
name: bieu-do-nhiet-am
description: Biểu đồ nhiệt–ẩm khí hậu chuẩn Atlat Địa lí Việt Nam trang 9: cột lượng mưa 12 tháng (trục trái mm, xanh lam) kết hợp đường nhiệt độ (trục phải °C, đỏ son), tô dải mùa mưa (≥100 mm) và nhấn biên độ nhiệt năm. Dùng khi lời giảng phân tích khí hậu trạm (Hà Nội, Huế, TP.HCM…) có số liệu nhiệt độ và lượng mưa 12 tháng. Climograph, temperature precipitation dual-axis chart, monsoon seasons.
license: Proprietary (EDUVN)
metadata:
  ten: "Biểu đồ nhiệt – ẩm (Atlat)"
  engine: hf
  mon: dia
  lop: 6-12
  loai: nhiet-am,so-lieu
  can: thang>=6,so>=6
  tranh: "cơ cấu,dân số,bản đồ hành chính"
  tuKhoa: "nhiệt ẩm,lượng mưa,nhiệt độ,mùa mưa,mùa khô,biên độ nhiệt,Atlat trang 9,khí hậu,Hà Nội,Huế,TP.HCM"
  thoiLuong: 14-40
  fallback: bieu_do_so_lieu
  kit: chart,grow,draw,enter,count,mark,focus
  version: "1"
  nguon: "hf:data-chart,Atlat Địa lí Việt Nam trang 9,QCVN 02:2022/BXD"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng phân tích chế độ nhiệt và chế độ mưa 12 tháng của một trạm khí tượng (Hà Nội, Huế, Đà Nẵng, TP. Hồ Chí Minh, Sa Pa, Đà Lạt…).
- Slide có bảng số liệu nhiệt độ (°C) và lượng mưa (mm) theo 12 tháng hoặc nêu rõ tổng lượng mưa năm, biên độ nhiệt, mùa mưa – mùa khô.
- Cần so sánh trực quan thời điểm đỉnh mưa, tháng nóng nhất, tháng lạnh nhất theo quy ước Atlat Địa lí Việt Nam.

## Không dùng
- Bảng số liệu cơ cấu tỉ trọng (%) theo ngành kinh tế (dùng `bieu-do-co-cau`).
- Bài chỉ so sánh quy mô sản lượng theo năm không liên quan khí hậu (dùng `bieu-do-cot-duong`).
- Cảnh chỉ định nghĩa khái niệm khí hậu mà không có số liệu tháng cụ thể.

## Ý sư phạm
Hiển thị tuần tự hệ trục nhiệt–ẩm chuẩn Atlat, dựng cột lượng mưa 12 tháng rồi tô dải mùa mưa trước khi vẽ đường nhiệt độ để học sinh đối chiếu nhịp mưa – nhiệt.
- Beat 0 (câu 0): Tiêu đề trạm khí tượng và khung hai trục (trục trái lượng mưa mm bắt đầu từ 0, trục phải nhiệt độ °C).
- Beat 1 (câu 1): Mọc 12 cột lượng mưa xanh lam theo tháng, nhấn cực đại mưa và đếm tổng lượng mưa năm.
- Beat 2 (câu 2): Tô dải nền mùa mưa (các tháng liên tiếp ≥ 100 mm) để phân biệt rõ mùa mưa và mùa khô.
- Beat 3 (câu 3): Vẽ đường nhiệt độ đỏ son qua 12 tháng, nhấn tháng nóng nhất và tháng lạnh nhất.
- Beat 4 (câu 4): Thẻ tóm tắt đặc trưng khí hậu và biên độ nhiệt năm.

## Dữ liệu lấy từ lời giảng
- Tên trạm khí tượng (hoặc mã trong `dia-danh.json`).
- Mảng 12 giá trị lượng mưa (mm) và 12 giá trị nhiệt độ (°C) lấy đúng từ bảng/lời giảng, không tự bịa số.
- Tổng lượng mưa năm, nhiệt độ trung bình năm, biên độ nhiệt năm và khoảng tháng mùa mưa phải khớp phép tính từ 12 tháng.

## Bố cục
- Lưới 12 cột chuẩn `kit.css`, sân khấu y 150–900, để trống hoàn toàn dải phụ đề y ≥ 936.
- Cột 1–4 (`ek-col-1 ek-span-4`): Tiêu đề, thẻ chỉ số tổng lượng mưa (`.ek-num`), thẻ nhận xét mùa mưa và biên độ nhiệt.
- Cột 5–12 (`ek-col-5 ek-span-8`): Khung SVG biểu đồ nhiệt–ẩm `data-ek-chart="nhiet-am"` (1112×640 px) đặt ở `top: 190px`.

## Chuyển động
Mọc cột mưa từ đáy bằng `EK.grow`, hiện vùng mùa mưa bằng `EK.enter`, sau đó vẽ đường nhiệt độ bằng `EK.draw` và đếm chỉ số bằng `EK.count`.
- Dùng đúng `EK.enter`, `EK.grow`, `EK.draw`, `EK.count`, `EK.mark`; không lặp phóng to/thu nhỏ, không đứng yên quá 4 s.

## Ví dụ
Xem `examples/vi-du-1/`: Biểu đồ nhiệt–ẩm trạm khí tượng Hà Nội (Láng) theo số liệu QCVN 02:2022/BXD & Atlat Địa lí Việt Nam trang 9 (tổng mưa 1.676,2 mm; mùa mưa T5–T10; nhiệt độ TB 23,5 °C; biên độ 12,5 °C).

## Lỗi hay gặp
- Trục lượng mưa không bắt đầu từ 0 làm sai tỉ lệ độ cao cột.
- Đổi màu sai quy ước Atlat (mưa phải xanh lam `--c-lam`, nhiệt độ phải đỏ son `--c-doSon`).
- Chú thích mùa mưa đè lên đường nhiệt độ hoặc nhãn số liệu chìm vào dải phụ đề y ≥ 936.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: hai trục có rõ đơn vị mm và °C, cột mưa không bị cắt, đường nhiệt nổi bật và không có nhãn đè nhau.
