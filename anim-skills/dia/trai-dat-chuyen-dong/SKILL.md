---
name: trai-dat-chuyen-dong
description: Mô phỏng hai chuyển động chính của Trái Đất bằng Manim (phong cách Giấy học thuật): tự quay quanh trục nghiêng 23°27' sinh ngày – đêm và chuyển động tịnh tiến quanh Mặt Trời qua 4 vị trí Xuân phân (21/3), Hạ chí (22/6), Thu phân (23/9), Đông chí (22/12) sinh ra các mùa. Earth rotation day night, revolution seasons 23.45 axial tilt Manim.
license: Proprietary (EDUVN)
metadata:
  ten: "Chuyển động Trái Đất (ngày đêm & mùa)"
  engine: manim
  mon: dia
  lop: 6-10
  loai: quy-trinh,nhan-qua,thoi-gian
  can: moc-thoi-gian>=1
  tranh: "bản đồ 34 tỉnh,nhiệt ẩm,cơ cấu GDP"
  tuKhoa: "Trái Đất,tự quay,ngày đêm,quay quanh Mặt Trời,bốn mùa,trục nghiêng,23 độ 27 phút,Xuân phân,Hạ chí,Thu phân,Đông chí"
  thoiLuong: 14-36
  fallback: so_do_quy_trinh
  kit: manim:StudioScene
  version: "1"
  nguon: "Manim StudioScene (services/manim/studio.py),SGK Địa lí 6 & 10 CTGDPT 2018"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giải thích hiện tượng luân phiên ngày – đêm (Trái Đất hình cầu tự quay từ Tây sang Đông quanh trục).
- Giải thích nguyên nhân sinh ra 4 mùa Xuân – Hạ – Thu – Đông do trục Trái Đất nghiêng 23°27' và không đổi hướng khi chuyển động quanh Mặt Trời.

## Không dùng
- Phân tích biểu đồ nhiệt độ – lượng mưa theo tháng của trạm khí tượng Việt Nam (dùng `bieu-do-nhiet-am`).
- Vòng tuần hoàn nước trên Trái Đất (dùng `vong-tuan-hoan-tu-nhien`).

## Ý sư phạm
Hiển thị trực tiếp góc nghiêng trục 23°27' không đổi phương khi Trái Đất đi hết quỹ đạo elip quanh Mặt Trời, đồng thời vẽ đường phân chia sáng – tối để học sinh tự suy ra ngày dài đêm ngắn ở Hạ chí và ngược lại ở Đông chí.
- Beat 0 (câu 0): Mặt Trời ở tâm và Trái Đất tự quay từ Tây sang Đông quanh trục nghiêng 23°27', chia rõ nửa sáng (ngày) và nửa tối (đêm).
- Beat 1 (câu 1): Quỹ đạo elip quanh Mặt Trời hiện ra, Trái Đất tiến tới vị trí Hạ chí (22/6) — bán cầu Bắc ngả về phía Mặt Trời.
- Beat 2 (câu 2): Tiếp tục quỹ đạo qua Thu phân (23/9) sang Đông chí (22/12) — bán cầu Bắc chếch xa Mặt Trời, mùa đông lạnh.
- Beat 3 (câu 3): Khép kín về Xuân phân (21/3), tóm tắt nguyên nhân trục nghiêng 23°27' không đổi hướng sinh ra 4 mùa.

## Dữ liệu lấy từ lời giảng
- Góc nghiêng trục 23°27' so với pháp tuyến mặt phẳng quỹ đạo (66°33' so với mặt phẳng quỹ đạo).
- Bốn mốc thời gian chuẩn: 21/3 (Xuân phân), 22/6 (Hạ chí), 23/9 (Thu phân), 22/12 (Đông chí).

## Bố cục
- Dùng khung `StudioScene` (`services/manim/studio.py`), nền `#FDFCF9`, 1920×1080, vùng sân khấu y 150–900, để trống dải phụ đề y ≥ 936.
- Sân khấu trái (cột 1–8): Quỹ đạo elip, Mặt Trời màu vàng đậm (`#8A6200`), Trái Đất xanh lam (`#2F5D8A`) với trục nghiêng đỏ son (`#B42318`) luôn giữ song song.
- Cột phải (cột 9–12): Tiêu đề và thẻ tóm tắt từng mốc mùa.

## Chuyển động
Quay Trái Đất dọc quỹ đạo bằng `MoveAlongPath` kết hợp giữ góc trục nghiêng song song cố định; tô bán cầu sáng – tối luôn hướng thẳng về Mặt Trời.

## Ví dụ
Xem `examples/vi-du-1/scene.py`: Mô phỏng chuyển động Trái Đất quanh Mặt Trời và hiện tượng ngày – đêm, 4 mùa bằng `StudioScene`.

## Lỗi hay gặp
- Cho trục Trái Đất xoay theo quỹ đạo thay vì giữ song song không đổi hướng (sai vật lí – địa lí!).
- Quên chia nửa tối quay lưng về phía Mặt Trời.
- Dùng chữ nhỏ hơn 36 px quy đổi hoặc tràn xuống vùng phụ đề y ≥ 936.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: trục 23°27' song song ở cả 4 vị trí, bán cầu sáng luôn hướng về Mặt Trời, đủ 4 mốc 21/3 – 22/6 – 23/9 – 22/12.
