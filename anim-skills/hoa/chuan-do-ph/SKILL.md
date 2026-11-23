---
name: chuan-do-ph
description: Hoạt hình đường cong chuẩn độ acid–base pH theo thể tích dung dịch chuẩn Vb: vẽ đường cong pH(Vb) chính xác từ phương trình bảo toàn điện tích, tô vùng bước nhảy pH, đánh dấu điểm tương đương (Vtd, pHtd) và mô phỏng đổi màu chất chỉ thị phenolphthalein trong bình tam giác. Dùng cho bài Chuẩn độ acid–base Hoá học 11–12 CTGDPT 2018. Acid-base titration curve, pH jump, equivalence point, phenolphthalein indicator.
license: Proprietary (EDUVN)
metadata:
  ten: "Đường cong chuẩn độ pH"
  engine: hf
  mon: hoa
  lop: 11-12
  loai: ham-so,so-lieu,quy-trinh
  can: so>=2
  tranh: "cấu hình electron,bảng tuần hoàn,cấu trúc phân tử"
  tuKhoa: "chuẩn độ,pH,đường cong chuẩn độ,điểm tương đương,chỉ thị,phenolphthalein,acid,base,NaOH,HCl"
  thoiLuong: 14-35
  fallback: bieu_do_so_lieu
  kit: enter,draw,count,fill,mark,focus,follow
  version: "1"
  nguon: "hf:mk-line-graph,hf:count-up"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giải thích quá trình chuẩn độ dung dịch acid bằng dung dịch base (hoặc ngược lại), đường cong pH, bước nhảy pH và cách chọn chất chỉ thị màu.
- Minh hoạ điểm tương đương (vd `25 mL HCl 0,1 M + NaOH 0,1 M → V_tđ = 25 mL, pH = 7,0`) và sự đổi màu của phenolphthalein (không màu → hồng nhạt ở pH 8,2–10).

## Không dùng
- Cảnh so sánh tốc độ phản ứng theo nhiệt độ/nồng độ (dùng `phan-ung-va-cham`).
- Cảnh chỉ cân bằng phương trình trung hoà đơn thuần (dùng `can-bang-phuong-trinh`).

## Ý sư phạm
Liên kết đồng bộ chuyển động của điểm chạy trên đường cong `pH(V)` với sự đổi màu dung dịch trong bình tam giác bên cạnh để học sinh thấy vì sao chỉ một giọt dư gần điểm tương đương đã làm đổi màu chỉ thị.
- Beat 0 (câu 0): Dựng hệ trục `V_NaOH (mL) – pH`, bình tam giác chứa HCl không màu và thông số thí nghiệm.
- Beat 1 (câu 1): Nhỏ dần NaOH từ `0 → 24 mL`, đường cong đi lên chậm trong vùng acid (`pH 1,0 → 2,7`), bình giữ không màu.
- Beat 2 (câu 2): Bước nhảy pH đột ngột quanh `V_tđ = 25,0 mL` (`pH = 7,0`), đánh dấu điểm tương đương và vùng đổi màu phenolphthalein (`pH 8,2–10`) khiến dung dịch chuyển hồng nhạt.
- Beat 3 (câu 3): Chốt công thức tính nồng độ `C_A · V_A = C_B · V_B` và ghi chú an toàn phòng thí nghiệm.

## Dữ liệu lấy từ lời giảng
- Nồng độ và thể tích ban đầu của acid (`C_A`, `V_A`) và nồng độ dung dịch chuẩn base (`C_B`).
- Toạ độ đường cong `pH(V_b)` và điểm tương đương `(V_tđ, pH_tđ)` tính tất định bằng `titrationCurve()` trong `server/src/subjects/hoa/stoichiometry.ts`.

## Bố cục
- Tiêu đề `.ek-meta` ở `top:64px`, `.ek-title` ở `top:112px`.
- Bố cục 2 cột: trái (`ek-col-1 ek-span-7`, `top:216px`, cao `670px`) vẽ đồ thị đường cong chuẩn độ pH; phải (`ek-col-8 ek-span-5`, `top:216px`) chứa bình tam giác mô phỏng màu chỉ thị + đồng hồ số `V_NaOH` và `pH` + thẻ công thức.
- Để trống dải phụ đề `y ≥ 936px`.

## Chuyển động
Vẽ hệ trục và lưới bằng `EK.draw`, vẽ đường cong `pH(V)` bằng `EK.draw` đồng bộ với số nhảy `EK.count` (thể tích và pH), đổi màu dung dịch trong bình bằng `EK.fill(..., "hong", { alpha: 0.25 })` đúng thời điểm vượt ngưỡng phenolphthalein (`pH ≥ 8,2`).

## Ví dụ
Xem `examples/vi-du-1/` — chuẩn độ `25 mL HCl 0,1 M` bằng `NaOH 0,1 M` có chỉ thị phenolphthalein (`V_tđ = 25,0 mL`, `pH_tđ = 7,0`, 16 giây).

## Lỗi hay gặp
- Vẽ bước nhảy pH quá thoải như đường thẳng thay vì dốc đứng quanh `V_tđ`.
- Đổi màu phenolphthalein quá sớm (khi `pH < 8,2`) hoặc tô màu hồng chói vượt bảng màu token.
- Thiếu ghi chú an toàn khi thao tác với acid/base loãng trên burette.

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Đường cong đi qua đúng các điểm `(0; 1,0)`, `(25; 7,0)` và tiệm cận `12,5` tại `50 mL`.
- Vùng đổi màu chỉ thị `pH 8,2–10` cắt ngang đúng đoạn dốc đứng của bước nhảy pH.
- Bình tam giác chuyển sang hồng nhạt mượt mà đúng lúc vượt điểm tương đương.
