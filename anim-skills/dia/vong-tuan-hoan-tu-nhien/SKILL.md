---
name: vong-tuan-hoan-tu-nhien
description: Sơ đồ vòng tuần hoàn tự nhiên Địa lí (vòng tuần hoàn nước, vòng tuần hoàn vật chất – năng lượng trong lớp vỏ địa lí): bốn khâu khép kín (Bốc hơi → Ngưng tụ → Giáng thủy/Mưa → Dòng chảy mặt & ngầm) với mũi tên và hạt chuyển động liên tục dọc chu trình. Natural water cycle, hydrological cycle diagram.
license: Proprietary (EDUVN)
metadata:
  ten: "Vòng tuần hoàn tự nhiên"
  engine: hf
  mon: dia,sinh
  lop: 6-10
  loai: quy-trinh,nhan-qua
  can: buoc>=3
  tranh: "nhiệt ẩm,bản đồ hành chính,tháp dân số"
  tuKhoa: "vòng tuần hoàn nước,bốc hơi,ngưng tụ,mưa,giáng thủy,dòng chảy mặt,nước ngầm,chu trình tự nhiên"
  thoiLuong: 12-32
  fallback: so_do_quy_trinh
  kit: graph,draw,arrow,follow,enter,focus
  version: "1"
  nguon: "hf:constellation-hub,SGK Địa lí 6 & 10 CTGDPT 2018"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng trình bày vòng tuần hoàn lớn / nhỏ của nước trên Trái Đất (Địa lí 6, Địa lí 10).
- Minh hoạ chu trình khép kín trong tự nhiên (tuần hoàn nước, vòng tuần hoàn thạch quyển / đá, vòng tuần hoàn khí quyển).

## Không dùng
- Quy trình tuyến tính có điểm đầu – điểm cuối không khép kín (dùng `quy-trinh-buoc`).
- Chuyển động quay của Trái Đất quanh Mặt Trời (dùng `trai-dat-chuyen-dong`).

## Ý sư phạm
Vẽ lần lượt bốn khâu khép kín theo chiều dòng năng lượng Mặt Trời và trọng lực để học sinh thấy mối liên hệ nhân quả giữa biển, khí quyển và lục địa.
- Beat 0 (câu 0): Bức xạ Mặt Trời làm nước biển bốc hơi bay lên cao.
- Beat 1 (câu 1): Hơi nước gặp lạnh ngưng tụ tạo thành mây và di chuyển vào đất liền.
- Beat 2 (câu 2): Hạt nước nặng dần rơi xuống thành mưa (giáng thủy) cung cấp nước ngọt cho lục địa.
- Beat 3 (câu 3): Dòng chảy sông suối trên mặt và dòng nước ngầm chảy ra biển, khép kín chu trình.

## Dữ liệu lấy từ lời giảng
- 4–5 khâu của chu trình và tên động lực chính (bức xạ Mặt Trời, trọng lực, gió).

## Bố cục
- Sân khấu 12 cột (`top: 190px`, cao 660 px): Sơ đồ vòng tuần hoàn SVG bố trí theo 4 góc rõ ràng (Biển dưới phải → Khí quyển trên → Núi/Lục địa trái → Sông & nước ngầm trở về biển), nhãn ≥ 38 px đặt thoáng không đè mũi tên.

## Chuyển động
Vẽ từng nhánh mũi tên khép vòng bằng `EK.arrow` và cho chấm giọt nước trượt dọc quỹ đạo bằng `EK.follow` đúng thứ tự lời giảng.

## Ví dụ
Xem `examples/vi-du-1/`: Vòng tuần hoàn lớn của nước trong tự nhiên (Địa lí 10 CTGDPT 2018).

## Lỗi hay gặp
- Vẽ vòng tròn quá nhỏ khiến 4 nhãn khâu chồng lên đường mũi tên.
- Đặt vòng lặp vô hạn `repeat: -1` (vi phạm lint HyperFrames).

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: 4 khâu nối kín mạch lạc, mũi tên rõ hướng, không chữ đè nét.
