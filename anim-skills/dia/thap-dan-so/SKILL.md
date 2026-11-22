---
name: thap-dan-so
description: Tháp dân số theo nhóm tuổi và giới tính (Nam trái, Nữ phải, đơn vị %) có biến hình giữa hai mốc năm (vd 1999 → 2019) để học sinh thấy rõ đáy tháp thu hẹp, thân phình và đỉnh mở rộng (già hoá dân số). Population pyramid morph animation across census years.
license: Proprietary (EDUVN)
metadata:
  ten: "Tháp dân số biến hình"
  engine: hf
  mon: dia
  lop: 8-12
  loai: so-lieu,so-sanh,thoi-gian
  can: moc-thoi-gian>=2,so>=4
  tranh: "nhiệt ẩm,bản đồ,địa hình"
  tuKhoa: "tháp dân số,cơ cấu tuổi,giới tính,dân số trẻ,dân số vàng,già hóa dân số,1999,2019,Atlat trang 15"
  thoiLuong: 12-35
  fallback: bieu_do_so_lieu
  kit: chart,grow,enter,count,mark
  version: "1"
  nguon: "hf:chart-story,Atlat Địa lí Việt Nam trang 15,Tổng điều tra Dân số GSO"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng so sánh cơ cấu dân số theo tuổi và giới tính giữa 2 năm tổng điều tra (1999 vs 2019, hoặc 2009 vs 2024) hay giữa 2 quốc gia (dân số trẻ vs dân số già).
- Phân tích quá trình chuyển từ cơ cấu dân số trẻ sang cơ cấu dân số vàng và già hoá dân số.

## Không dùng
- Cơ cấu ngành kinh tế (dùng `bieu-do-co-cau`).
- Phân bố mật độ dân số giữa các tỉnh (dùng `ban-do-chu-de`).

## Ý sư phạm
Dựng tháp dân số năm gốc trước để nhận diện hình dáng đáy rộng, sau đó biến đổi trực tiếp độ dài các thanh sang năm mới để học sinh thấy ngay sự dịch chuyển của ba nhóm tuổi (0–14, 15–64, 65+).
- Beat 0 (câu 0): Hiện khung tháp đối xứng Nam (trái, xanh lam) – Nữ (phải, hồng) và số liệu năm gốc 1999.
- Beat 1 (câu 1): Biến đổi các thanh sang năm 2019, đồng thời đếm năm 1999 → 2019.
- Beat 2 (câu 2): Nhấn vùng đáy (0–14 tuổi thu hẹp từ 33,1% xuống 24,3%) và đỉnh (65+ tăng 5,8% lên 7,7%).
- Beat 3 (câu 3): Kết luận Việt Nam trong thời kì cơ cấu dân số vàng và đang già hoá.

## Dữ liệu lấy từ lời giảng
- Nhóm tuổi sắp từ dưới lên trên (0–9 đến 70+ hoặc 0–4 đến 80+).
- Hai mảng tỉ trọng (%) Nam và Nữ cho mỗi mốc năm; tổng toàn tháp mỗi năm bằng 100 %.
- Tỉ trọng 3 nhóm tuổi lớn (0–14, 15–64, 65+) khớp nguồn Tổng cục Thống kê.

## Bố cục
- Cột 1–7 (`ek-col-1 ek-span-7`): Biểu đồ tháp dân số `data-ek-chart="thap"` (970×680 px), trục giữa ghi nhóm tuổi, hai cánh đối xứng cùng thang đo 0–12 %.
- Cột 8–12 (`ek-col-8 ek-span-5`): Chỉ số năm lớn (`.ek-num`), 2 thẻ so sánh đáy – đỉnh và kết luận.

## Chuyển động
Mọc các thanh năm gốc bằng `EK.grow`, chuyển mượt sang năm mới bằng chuyển đổi `scaleX` trên các thanh đối xứng (không tween `width`), đồng bộ `EK.count` đổi năm và tỉ trọng.

## Ví dụ
Xem `examples/vi-du-1/`: Tháp dân số Việt Nam 1999 → 2019 (Tổng điều tra Dân số và Nhà ở, GSO).

## Lỗi hay gặp
- Hai cánh Nam và Nữ không cùng tỉ lệ thang đo làm sai cảm nhận tỉ số giới tính.
- Sắp nhóm tuổi ngược (để 0–4 trên cùng thay vì dưới đáy).

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: hai phía đối xứng chuẩn xác, nhãn nhóm tuổi rõ ràng ≥ 36 px, không đè thanh.
