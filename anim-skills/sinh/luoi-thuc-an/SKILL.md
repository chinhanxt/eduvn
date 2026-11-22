---
name: luoi-thuc-an
description: Sơ đồ chuỗi và lưới thức ăn liên kết bằng mũi tên chiều dòng năng lượng, kết hợp tháp năng lượng mọc dần thể hiện quy tắc truyền 10% năng lượng qua các bậc dinh dưỡng. Dùng khi giảng về hệ sinh thái, lưới thức ăn, bậc dinh dưỡng và tháp sinh thái. Food web, trophic levels, energy pyramid.
license: Proprietary (EDUVN)
metadata:
  ten: "Lưới thức ăn và tháp năng lượng"
  engine: hf
  mon: sinh
  lop: 7-12
  loai: nhan-qua,so-lieu,quy-trinh
  can: so>=2
  tranh: "định nghĩa,phép lai,phân bào,cấu tạo tế bào"
  tuKhoa: "lưới thức ăn,chuỗi thức ăn,tháp năng lượng,bậc dinh dưỡng,sinh vật sản xuất,tiêu thụ,10%,kcal"
  thoiLuong: 14-45
  fallback: so_do_quy_trinh
  kit: enter,draw,arrow,grow,count,focus
  version: "1"
  nguon: "hf:flowchart,dagre,EK.grow"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng trình bày chuỗi/lưới thức ăn gồm sinh vật sản xuất và các bậc sinh vật tiêu thụ (KHTN 8, Sinh học 12).
- Cần liên hệ trực tiếp cấu trúc lưới thức ăn với tháp năng lượng và sự thất thoát năng lượng (~90% mỗi bậc, chỉ truyền ~10%).

## Không dùng

- Chu trình sinh địa hoá tuần hoàn vật chất khép kín (dùng `chu-trinh-sinh-hoc`).
- So sánh hai quá trình tế bào (dùng `quang-hop-ho-hap`).

## Ý sư phạm

Dựng lưới thức ăn từ bậc sinh vật sản xuất (đáy) lên bậc tiêu thụ cao nhất (đỉnh) để làm rõ chiều mũi tên dòng năng lượng, rồi dựng tháp năng lượng song song để học sinh thấy ngay sự thu hẹp năng lượng qua từng bậc.

- Beat 0 (câu 0): Hiện sinh vật sản xuất (bậc 1) ở lưới thức ăn và tầng đáy tháp năng lượng.
- Beat 1 (câu 1): Vẽ mũi tên lên sinh vật tiêu thụ bậc 1 (động vật ăn thực vật) và mọc tầng 2 của tháp (10%).
- Beat 2 (câu 2): Vẽ mũi tên lên sinh vật tiêu thụ bậc 2 và bậc 3, mọc tầng 3 và tầng đỉnh tháp năng lượng.
- Beat 3 (câu 3): Nhấn mạnh quy luật truyền 10% năng lượng và lí do chuỗi thức ăn hiếm khi quá 4–5 mắt xích.

## Dữ liệu lấy từ lời giảng

- Tên các loài sinh vật trong lưới thức ăn và mối quan hệ ăn–bị ăn (chiều mũi tên đi từ con mồi/thức ăn → sinh vật ăn).
- Giá trị năng lượng (kcal hoặc kJ) ở từng bậc dinh dưỡng và hiệu suất sinh thái (mặc định 10%, tự kiểm qua `energy_pyramid`).

## Bố cục

- Lưới 12 cột: tiêu đề `y = 64–150`; sân khấu chia hai cột: lưới thức ăn (SVG + thẻ loài) đặt cột 1–6 (`top: 210px`), tháp năng lượng 4 tầng căn giữa và thẻ quy tắc 10% đặt cột 7–12 (`top: 210px`).
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.enter` cho nút loài theo từng bậc từ dưới lên, `EK.arrow` vẽ mũi tên dòng năng lượng, `EK.grow(..., { from: "left" })` mọc từng tầng tháp năng lượng, và `EK.count` đếm giá trị năng lượng kcal từng tầng. Không dùng `EK.camera`.

## Ví dụ

- `examples/vi-du-1/`: Lưới thức ăn và tháp năng lượng hệ sinh thái đồng cỏ (Sinh học 12: Cỏ 10.000 kcal → Châu chấu/Thỏ 1.000 kcal → Ếch/Rắn 100 kcal → Đại bàng 10 kcal).

## Lỗi hay gặp

- Vẽ ngược chiều mũi tên chuỗi thức ăn (mũi tên phải chỉ theo chiều dòng năng lượng: từ cỏ → châu chấu, KHÔNG chỉ ngược lại).
- Số kcal giữa hai bậc không khớp hiệu suất sinh thái đã nêu trong lời giảng.
- Quá nhiều loài (≥ 10 nút) làm nhãn đè lên mũi tên.

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: mũi tên hướng đúng chiều dòng năng lượng, bề rộng các tầng tháp giảm dần từ đáy lên đỉnh, chữ ≥ 36 px rõ và không chạm y ≥ 936.
