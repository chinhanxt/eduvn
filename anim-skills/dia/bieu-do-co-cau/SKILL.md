---
name: bieu-do-co-cau
description: Biểu đồ cơ cấu Địa lí chuẩn đề thi TN THPT: biểu đồ miền (chuyển dịch cơ cấu ≥ 4 mốc năm, khoảng cách năm giãn đúng tỉ lệ thật), biểu đồ tròn (1–3 năm) hoặc cột chồng 100%, đảm bảo tổng mỗi năm bằng 100%. Stacked area, pie, 100% stacked bar composition chart.
license: Proprietary (EDUVN)
metadata:
  ten: "Biểu đồ cơ cấu (tròn / miền / cột 100%)"
  engine: hf
  mon: dia
  lop: 8-12
  loai: so-lieu,so-sanh,thoi-gian
  can: so>=3
  tranh: "nhiệt ẩm,mặt cắt,bản đồ"
  tuKhoa: "cơ cấu,tỉ trọng,chuyển dịch cơ cấu,biểu đồ miền,biểu đồ tròn,cột chồng 100%,GDP,nông nghiệp,công nghiệp,dịch vụ"
  thoiLuong: 12-38
  fallback: bieu_do_so_lieu
  kit: chart,draw,grow,enter,count,mark
  version: "1"
  nguon: "hf:chart-story,Niên giám Thống kê GSO,quy ước đề thi THPT"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng phân tích **cơ cấu** (1–3 năm → tròn) hoặc **chuyển dịch cơ cấu** (≥ 4 mốc năm → miền / cột 100%) của GDP, lao động, xuất nhập khẩu, diện tích cây trồng…
- Bảng số liệu cho theo % có tổng bằng 100% hoặc cho giá trị tuyệt đối yêu cầu tính tỉ trọng.

## Không dùng
- Phân tích tốc độ tăng trưởng (lấy năm gốc = 100%, các năm sau > 100% → dùng `bieu-do-cot-duong`).
- Phân tích nhiệt độ – lượng mưa 12 tháng (dùng `bieu-do-nhiet-am`).

## Ý sư phạm
Dựng hệ trục 0–100 % với các mốc năm giãn đúng khoảng cách thật trước khi tô lần lượt từng miền cơ cấu từ đáy lên đỉnh để học sinh quan sát rõ xu hướng tăng/giảm tỉ trọng.
- Beat 0 (câu 0): Tiêu đề và khung trục 0–100% có các năm 2010, 2015, 2018, 2023 giãn đúng khoảng cách thật (5–3–5 năm).
- Beat 1 (câu 1): Hiện miền Nông – lâm – thủy sản thu hẹp từ 15,4% xuống 12,0%.
- Beat 2 (câu 2): Hiện miền Công nghiệp & xây dựng mở rộng từ 33,0% lên 37,1% và miền Dịch vụ luôn giữ trên 50%.
- Beat 3 (câu 3): Kết luận xu hướng công nghiệp hoá – hiện đại hoá, tổng cơ cấu luôn tròn 100%.

## Dữ liệu lấy từ lời giảng
- Danh sách mốc năm thật (để tiền xử lý đặt tọa độ X đúng tỉ lệ năm).
- Mảng tỉ trọng (%) các thành phần; tổng từng năm bắt buộc bằng 100,0 % (±0,2 % do làm tròn).

## Bố cục
- Cột 1–8 (`ek-col-1 ek-span-8`): Biểu đồ miền 100% `data-ek-chart="mien"` (1112×640 px) đặt ở `top: 190px`.
- Cột 9–12 (`ek-col-9 ek-span-4`): 3 thẻ số liệu từng khu vực kinh tế và nhận xét chuyển dịch.

## Chuyển động
Vẽ khung trục trước bằng `EK.enter`, mọc/hiện lần lượt 3 miền theo thứ tự từ dưới lên trên (`.ek-area-0`, `.ek-area-1`, `.ek-area-2`) rồi nhấn xu hướng biến đổi bằng `EK.enter`.

## Ví dụ
Xem `examples/vi-du-1/`: Biểu đồ miền chuyển dịch cơ cấu GDP Việt Nam giai đoạn 2010–2023 (2010, 2015, 2018, 2023 giãn đúng tỉ lệ 5–3–5 năm).

## Lỗi hay gặp
- Chia đều khoảng cách năm khi các mốc cách nhau không đều (ví dụ 2010–2015–2018–2023).
- Tổng tỉ trọng một năm lệch khỏi 100%.
- Dùng biểu đồ tròn cho chuỗi 5–6 năm thay vì biểu đồ miền.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: tổng độ cao đạt đúng vạch 100%, khoảng cách 2015–2018 hẹp hơn 2010–2015 và 2018–2023.
