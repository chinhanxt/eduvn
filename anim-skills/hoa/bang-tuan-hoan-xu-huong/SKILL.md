---
name: bang-tuan-hoan-xu-huong
description: Hoạt hình quy luật biến đổi tuần hoàn tính chất nguyên tố (độ âm điện Pauling, bán kính nguyên tử, tính kim loại – phi kim) theo chu kỳ và nhóm A trên bảng tuần hoàn: tô màu các ô nguyên tố theo cường độ, vẽ mũi tên xu hướng tăng/giảm và nhấn cực trị (vd Fluorine F = 3,98). Dùng cho Hoá học 10 CTGDPT 2018. Periodic table trends, electronegativity, atomic radius, choropleth.
license: Proprietary (EDUVN)
metadata:
  ten: "Xu hướng bảng tuần hoàn"
  engine: hf
  mon: hoa
  lop: 10-12
  loai: so-lieu,so-sanh
  can: so>=2
  tranh: "phương trình phản ứng,chuẩn độ,cấu trúc phân tử"
  tuKhoa: "bảng tuần hoàn,xu hướng,độ âm điện,bán kính nguyên tử,chu kỳ,nhóm A,kim loại,phi kim,Fluorine,Pauling"
  thoiLuong: 14-35
  fallback: bieu_do_so_lieu
  kit: enter,draw,arrow,fill,mark,focus
  version: "1"
  nguon: "manim-Chemistry(dữ liệu),hf:spain-map(choropleth),hf:hw-arrow"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng phân tích quy luật biến đổi độ âm điện, bán kính nguyên tử, năng lượng ion hoá hoặc tính kim loại/phi kim trong một chu kỳ và một nhóm A.
- Cần so sánh định lượng dãy nguyên tố liền kề (vd Chu kỳ 2: Li → F; Nhóm VIIA: F → I).

## Không dùng
- Cảnh điền từng electron vào ô orbital của một nguyên tố duy nhất (dùng `cau-hinh-electron`).
- Cảnh mô tả cấu tạo hạt nhân và vỏ nguyên tử đơn lẻ (dùng `mo-hinh-nguyen-tu`).

## Ý sư phạm
Tô màu dần từng ô nguyên tố dọc theo chu kỳ và nhóm bằng thang sắc độ token rồi vẽ mũi tên xu hướng để học sinh tự khái quát quy luật biến đổi.
- Beat 0 (câu 0): Dựng khung chu kỳ 2 (Li → F) và nhóm VIIA (F → I) từ bảng tuần hoàn.
- Beat 1 (câu 1): Lần lượt tô màu và bật giá trị độ âm điện dọc Chu kỳ 2 từ trái sang phải (0,98 → 3,98) cùng mũi tên tăng.
- Beat 2 (câu 2): Bật giá trị dọc Nhóm VIIA từ trên xuống dưới (3,98 → 2,66) cùng mũi tên giảm.
- Beat 3 (câu 3): Khoanh cực đại tại Fluorine (3,98) và hiện thẻ tóm tắt quy luật tổng quát.

## Dữ liệu lấy từ lời giảng
- Danh sách ký hiệu nguyên tố, số hiệu Z và giá trị tính chất (độ âm điện Pauling hoặc bán kính pm) lấy từ bảng tuần hoàn chuẩn `server/src/subjects/hoa/periodicTable.ts` (IUPAC/PubChem).

## Bố cục
- Tiêu đề `.ek-meta` ở `top:64px`, `.ek-title` ở `top:112px`.
- Sân khấu SVG lưới nguyên tố đặt ở `ek-col-1 ek-span-12`, `top:216px`, cao `674px` (góc trên chứa hàng Chu kỳ 2 gồm 7 ô rộng 164 px; cột phải chứa Nhóm VIIA gồm 4 ô; góc dưới trái rộng đặt thẻ quy luật + giải thích).
- Để trống hoàn toàn dải phụ đề `y ≥ 936px`.

## Chuyển động
Hiện khung bảng bằng `EK.enter`, tô màu từng ô theo thứ tự chu kỳ bằng `EK.fill` cách nhau 0,25 s, vẽ mũi tên xu hướng bằng `EK.draw`, rồi khoanh nhấn cực trị bằng `EK.mark`.

## Ví dụ
Xem `examples/vi-du-1/` — xu hướng biến đổi độ âm điện thang Pauling trong Chu kỳ 2 (`Li → F`) và Nhóm VIIA (`F → I`, 15 giây).

## Lỗi hay gặp
- Dùng màu cam chủ đạo hoặc màu ngoài token cho thang nhiệt độ âm điện.
- Chữ số giá trị trong ô nguyên tố nhỏ hơn 36 px (phải giữ ≥ 36 px bằng cách chỉ hiển thị ký hiệu + số trị gọn gàng).
- Ghi sai số độ âm điện hoặc gán độ âm điện cho khí hiếm Ne/Ar khi bài giảng nói về nhóm IA–VIIA.

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Mọi giá trị độ âm điện khớp chính xác với `periodicTable.ts` (Pauling).
- Mũi tên xu hướng không che khuất ô nguyên tố hay số liệu.
- Chữ tương phản đạt AA trên nền từng ô đã tô.
