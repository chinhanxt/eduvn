---
name: phan-ung-va-cham
description: Hoạt hình thuyết va chạm hiệu quả và các yếu tố ảnh hưởng đến tốc độ phản ứng (nhiệt độ, nồng độ): đặt hai bình phản ứng song song với các hạt chuyển động tất định theo hạt giống EK.rand(seed), toả vòng sáng khi va chạm đủ năng lượng hoạt hoá và đếm số va chạm hiệu quả. Dùng cho bài Tốc độ phản ứng Hoá học 10–11. Collision theory, reaction rate, temperature, concentration, deterministic seeded particles.
license: Proprietary (EDUVN)
metadata:
  ten: "Phản ứng va chạm và tốc độ phản ứng"
  engine: hf
  mon: hoa
  lop: 10-12
  loai: so-sanh,nhan-qua
  can: so>=2
  tranh: "cấu hình electron,bảng tuần hoàn,cân bằng phương trình"
  tuKhoa: "tốc độ phản ứng,va chạm hiệu quả,nhiệt độ,nồng độ,năng lượng hoạt hoá,động năng,hạt,xúc tác"
  thoiLuong: 14-35
  fallback: so_sanh_bang
  kit: enter,count,mark,focus,rand,tint
  version: "1"
  nguon: "d3(hạt có hạt giống),hf:count-up"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giải thích ảnh hưởng của nhiệt độ, nồng độ hoặc diện tích bề mặt đến tốc độ phản ứng hoá học dựa trên thuyết va chạm.
- Cần so sánh trực quan hai điều kiện (vd: 25 °C so với 65 °C, hoặc dung dịch loãng so với dung dịch đặc).
- Bài học về năng lượng hoạt hoá và tần số va chạm hiệu quả (Hoá học 10 CTGDPT 2018).

## Không dùng
- Cảnh chỉ cân bằng hệ số phương trình (dùng `can-bang-phuong-trinh`).
- Cảnh vẽ đường cong chuẩn độ pH (dùng `chuan-do-ph`).

## Ý sư phạm
Đặt hai buồng phản ứng song song để học sinh nhìn thấy ngay sự khác biệt về vận tốc chuyển động hạt và tần số va chạm hiệu quả, kết hợp bộ đếm số liệu định lượng.
- Beat 0 (câu 0): Mở hai bình phản ứng ở hai điều kiện khác nhau (vd 25 °C và 65 °C) cùng chú thích loại hạt chất A và chất B.
- Beat 1 (câu 1): Hạt ở bình nhiệt độ thấp chuyển động chậm, chỉ xảy ra ít va chạm hiệu quả.
- Beat 2 (câu 2): Hạt ở bình nhiệt độ cao chuyển động nhanh hơn nhiều, số vòng va chạm hiệu quả tăng vọt.
- Beat 3 (câu 3): Chốt kết luận mối quan hệ giữa nhiệt độ/nồng độ, tần số va chạm hiệu quả và tốc độ phản ứng.

## Dữ liệu lấy từ lời giảng
- Giá trị điều kiện so sánh (hai mức nhiệt độ °C hoặc hai mức nồng độ M) nêu trong bài giảng.
- Hạt giống cố định (seed nguyên dương) cho `EK.rand(seed)` để mọi lần dựng và tua khung đều cho cùng quỹ đạo hạt.

## Bố cục
- Tiêu đề `.ek-meta` ở `top:64px`, `.ek-title` ở `top:112px`.
- Hai bình phản ứng đối xứng trên 12 cột: bình trái `ek-col-1 ek-span-6`, bình phải `ek-col-7 ek-span-6`, vùng sân khấu `top:226px`, cao `536px` (`y ≤ 762px`).
- Thanh tổng kết quy luật đặt ở `top:794px` (cao `98px`, kết thúc `< 900px`), để trống dải phụ đề `y ≥ 936px`.

## Chuyển động
Khởi tạo chuỗi điểm chuyển động hạt bằng bộ sinh ngẫu nhiên tất định `EK.rand(seed)` (tuyệt đối không dùng `Math.random`) và ghép các đoạn `tl.to(sel, { x, y, ease: "none" })` liên tục suốt cảnh để không có khoảng chết; mỗi lần va chạm hiệu quả phóng vòng sáng `scale` + tăng bộ đếm `EK.count`.

## Ví dụ
Xem `examples/vi-du-1/` — so sánh tốc độ phản ứng ở `25 °C` (2 va chạm hiệu quả) và `65 °C` (9 va chạm hiệu quả) với hạt giống `seed = 202610` (15 giây).

## Lỗi hay gặp
- Dùng `Math.random()` khiến lint chặn (`js_ngau_nhien`) và hình giật khi tua khung.
- Tween `cx`/`cy` hoặc `left`/`top` thay vì `x`/`y` (vi phạm quy tắc hiệu năng và lint).
- Quá nhiều hạt (> 24 hạt) gây rối mắt và vượt giới hạn phần tử.

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Hai loại hạt (chất A, chất B) phân biệt màu rõ trên nền sáng, đạt tương phản AA.
- Quỹ đạo hạt luôn nằm gọn trong lòng bình phản ứng, không thoát ra ngoài khung.
- Tốc độ chuyển động ở bình nóng/đặc rõ rệt hơn bình lạnh/loãng và khớp số đếm va chạm.
