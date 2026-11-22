---
name: chu-trinh-sinh-hoc
description: Vòng tuần hoàn sinh học khép kín (chu trình Krebs, chu trình Calvin, chu trình nitơ, chu trình nước) với các chặng chuyển hoá và chấm hạt chạy mượt quanh vòng bằng MotionPath. Dùng khi lời giảng trình bày chuỗi chuyển hoá tuần hoàn khép kín có ≥3 chặng nối tiếp quay về chất ban đầu. Biological cycle, Krebs cycle, Calvin cycle, nitrogen cycle, water cycle.
license: Proprietary (EDUVN)
metadata:
  ten: "Chu trình sinh học"
  engine: hf
  mon: sinh
  lop: 6-12
  loai: quy-trinh,dien-bien,nhan-qua
  can: buoc>=3
  tranh: "định nghĩa,bảng so sánh,phép lai"
  tuKhoa: "chu trình,Krebs,Calvin,nitơ,nước,tuần hoàn,chất nền ti thể,ATP,NADH,CO2"
  thoiLuong: 14-45
  fallback: so_do_quy_trinh
  kit: enter,draw,follow,mark,focus,count
  version: "1"
  nguon: "hf:constellation-hub,EK.follow"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng trình bày một chu trình sinh học khép kín có chất đầu vào, các chặng trung gian và bước tái tạo chất nhận ban đầu (chu trình Krebs, chu trình Calvin ở lớp 10–11; chu trình nước, chu trình carbon, chu trình nitơ ở lớp 8 và 12).
- Cần minh hoạ sản phẩm đi ra tại từng chặng (ví dụ $\text{CO}_2$, ATP, NADH, $\text{FADH}_2$, mưa, bốc hơi) đồng bộ với chuyển động liên tục quanh vòng.

## Không dùng

- Quá trình tuyến tính một chiều không quay về điểm xuất phát (dùng `phien-ma-dich-ma` hoặc `so-do-quy-trinh`).
- Chỉ nêu định nghĩa khái niệm mà không mô tả diễn biến từng chặng.
- Không đưa chi tiết sinh hoá Krebs/Calvin vào lớp 6–9 (chỉ dùng cho lớp 10–12; lớp 6–9 dùng chu trình nước/carbon đơn giản).

## Ý sư phạm

Vẽ vòng chu trình trước để học sinh nắm cấu trúc khép kín, sau đó dẫn mắt theo từng chặng bằng một chấm chuyển hoá chạy quanh vòng và cộng dồn sản phẩm ở bảng tổng kết.

- Beat 0 (câu 0): Hiện tiêu đề và vòng chu trình nền cùng chất đầu vào.
- Beat 1 (câu 1): Chấm chạy chặng 1 từ chất nhận + chất đầu vào tạo hợp chất trung gian đầu tiên.
- Beat 2 (câu 2): Chấm chạy chặng 2–3, hiện mũi tên rẽ nhánh giải phóng sản phẩm (như $\text{CO}_2$, NADH).
- Beat 3 (câu 3): Chấm khép kín vòng tái tạo chất nhận ban đầu, đếm tổng sản phẩm ở cột phải.

## Dữ liệu lấy từ lời giảng

- Tên chu trình, nơi diễn ra (ví dụ chất nền ti thể, chất nền lục lạp, sinh quyển).
- Tên các chặng / hợp chất chính (3–5 nút quanh vòng) và số carbon (nếu là Krebs/Calvin).
- Sản phẩm đầu vào và đầu ra kèm đúng con số nêu trong lời giảng (không tự thêm số liệu đại học).

## Bố cục

- Lưới 12 cột: tiêu đề và phân loại đặt ở cột 1–12 (`top: 64px` và `112px`).
- Sân khấu `y = 210–890`: sơ đồ vòng chu trình đặt cột 1–7 (`width: 970px`), thẻ diễn biến và bảng đếm sản phẩm đặt cột 8–12 (`width: 686px`).
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.enter` mở tiêu đề và khung vòng, `EK.draw` vẽ đường vòng và các nhánh ra, `EK.follow` cho chấm chất chạy liên tục từng đoạn quanh vòng, `EK.focus` làm nổi chặng đang giảng và `EK.count` đếm tổng sản phẩm cuối vòng. Không gọi `EK.camera` quá 0–1 lần.

## Ví dụ

- `examples/vi-du-1/`: Chu trình Krebs trong chất nền ti thể (Sinh học 10, 1 phân tử Acetyl-CoA tạo 2 $\text{CO}_2$, 3 NADH, 1 $\text{FADH}_2$, 1 ATP).

## Lỗi hay gặp

- Nhãn hợp chất đặt sát vòng nên đè lên mũi tên hoặc chạm nhau.
- Số sản phẩm ghi cho 1 phân tử glucose (2 vòng) nhưng lời giảng đang nói 1 phân tử Acetyl-CoA (1 vòng) — phải thống nhất tuyệt đối.
- Chấm chạy quá nhanh hoặc đứng yên quá 4 giây giữa hai beat.

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: vòng tròn đều, chữ ≥ 36 px rõ nét, chấm bám đúng đường vòng, mọi nhãn không chạm dải phụ đề y ≥ 936 và mọi số sản phẩm khớp lời giảng.
