---
name: quang-hop-ho-hap
description: Sơ đồ đối chiếu và vòng trao đổi chất giữa Quang hợp (ở lục lạp) và Hô hấp tế bào (ở ti thể), làm rõ hai quá trình ngược chiều nhưng thống nhất về vật chất (CO2, H2O, glucose, O2) và chuyển hoá năng lượng (ánh sáng ↔ ATP). Dùng cho KHTN 7 và Sinh học 10–11. Photosynthesis and cellular respiration comparison, chloroplast vs mitochondria.
license: Proprietary (EDUVN)
metadata:
  ten: "Quang hợp và hô hấp tế bào"
  engine: hf
  mon: sinh
  lop: 7-11
  loai: so-sanh,quy-trinh,nhan-qua
  tranh: "phép lai,phân bào,hệ cơ quan,dịch mã"
  tuKhoa: "quang hợp,hô hấp tế bào,lục lạp,ti thể,glucose,oxi,CO2,nước,ATP,ánh sáng,chuyển hoá năng lượng"
  thoiLuong: 14-40
  fallback: so_sanh_bang
  kit: enter,draw,follow,mark,focus
  version: "1"
  nguon: "cũ:so_sanh_bang,EK.follow"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng giải thích mối quan hệ hai chiều giữa quang hợp và hô hấp tế bào ở KHTN 7 (mức phương trình chữ) hoặc Sinh học 10–11 (mức phương trình hoá học cơ bản và bào quan lục lạp – ti thể).
- Cần so sánh trực quan nguyên liệu, sản phẩm, bào quan thực hiện và chiều chuyển hoá năng lượng (tích luỹ vs giải phóng).

## Không dùng

- Chỉ đi sâu vào một chu trình nội bộ như chu trình Calvin hay Krebs (dùng `chu-trinh-sinh-hoc`).
- Chỉ giới thiệu cấu tạo tĩnh tế bào thực vật (dùng `cau-tao-te-bao`).
- Không đưa chi tiết chuỗi truyền electron hay quang hệ I/II vào KHTN lớp 7.

## Ý sư phạm

Đặt Lục lạp (trái, xanh lá) và Ti thể (phải, lục lam) nối với nhau bằng hai cầu trao đổi vật chất chạy ngược chiều để học sinh thấy sản phẩm của quá trình này chính là nguyên liệu của quá trình kia.

- Beat 0 (câu 0): Hiện hai bào quan (Lục lạp – Quang hợp bên trái, Ti thể – Hô hấp tế bào bên phải) với vai trò năng lượng đối lập.
- Beat 1 (câu 1): Vẽ luồng trên từ Lục lạp → Ti thể mang Glucose và $\text{O}_2$ nhờ năng lượng ánh sáng mặt trời.
- Beat 2 (câu 2): Vẽ luồng dưới từ Ti thể → Lục lạp giải phóng năng lượng ATP (và nhiệt) đồng thời trả lại $\text{CO}_2$ và $\text{H}_2\text{O}$.
- Beat 3 (câu 3): Hiện bảng đối chiếu gọn 2 chiều (tích luỹ năng lượng vs giải phóng năng lượng).

## Dữ liệu lấy từ lời giảng

- Cấp lớp (KHTN 7 dùng phương trình chữ Nước + Carbon dioxide → Glucose + Oxygen; THPT có thể kèm công thức $\text{CO}_2, \text{H}_2\text{O}, \text{C}_6\text{H}_{12}\text{O}_6, \text{O}_2$, ATP).
- Bào quan thực hiện (lục lạp, ti thể) và vai trò năng lượng.

## Bố cục

- Lưới 12 cột: tiêu đề `y = 64–150`; sân khấu trên `y = 220–620` gồm Lục lạp (cột 1–4), hai mũi tên cầu nối trao đổi chất (cột 5–8), Ti thể (cột 9–12); hai thẻ so sánh đối xứng đặt ở `y = 660–880` (cột 1–6 và cột 7–12).
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.enter` mở hai khối bào quan, `EK.draw` vẽ hai đường cầu nối trên–dưới, `EK.follow` cho hai chấm chất chạy ngược chiều nhau (trên: trái → phải; dưới: phải → trái), `EK.mark` nhấn từ khoá tích luỹ / giải phóng năng lượng.

## Ví dụ

- `examples/vi-du-1/`: Mối quan hệ giữa Quang hợp và Hô hấp tế bào (KHTN 7 — đúng chuẩn mức lớp 7, không kiến thức đại học).

## Lỗi hay gặp

- Nhầm chiều mũi tên trao đổi chất ($\text{CO}_2$ + Nước phải đi từ Hô hấp → Quang hợp; Glucose + $\text{O}_2$ đi từ Quang hợp → Hô hấp).
- Dùng thuật ngữ phức tạp vượt mức KHTN 7 (như NADPH, chu trình Calvin) khi cảnh là lớp 7.

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: hai chiều trao đổi chất đúng sinh học, phân biệt màu lục lạp (`xanhLa`) và ti thể (`lucLam`) kèm chữ rõ, chữ ≥ 36 px không chạm y ≥ 936.
