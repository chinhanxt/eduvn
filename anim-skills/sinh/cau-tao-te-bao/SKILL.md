---
name: cau-tao-te-bao
description: Hình nét sơ đồ học thuật cấu tạo tế bào (thực vật, động vật, vi khuẩn) kèm nhãn chú thích và đường dẫn không cắt chéo, kết hợp đúng một chuyển động camera phóng chậm vào một bào quan trọng tâm. Dùng khi giới thiệu cấu trúc tế bào và chức năng bào quan ở lớp 6–10. Cell structure, organelle diagram, annotated schematic, camera zoom.
license: Proprietary (EDUVN)
metadata:
  ten: "Cấu tạo tế bào và phóng đại bào quan"
  engine: hf
  mon: sinh
  lop: 6-10
  loai: dinh-nghia,quy-trinh
  tranh: "phép lai,lưới thức ăn,tỉ lệ,nguyên phân,giảm phân"
  tuKhoa: "tế bào,bào quan,nhân,lục lạp,ti thể,không bào,thành tế bào,màng sinh chất,tế bào thực vật,tế bào động vật"
  thoiLuong: 14-40
  fallback: dien_giai_tung_buoc
  kit: enter,draw,focus,camera,mark
  version: "1"
  nguon: "hf:hw-box-label,hf:push-in,EK.camera"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng giới thiệu các thành phần cấu tạo tế bào thực vật, tế bào động vật hoặc tế bào nhân sơ (KHTN 6, Sinh học 10).
- Cần dẫn đường chú thích tới từng bào quan rồi phóng chậm vào đúng 1 bào quan trọng tâm (như lục lạp, ti thể hoặc nhân tế bào) để giải thích chức năng.

## Không dùng

- Quá trình phân chia tế bào có biến hình NST (dùng `phan-bao`).
- So sánh hai quá trình trao đổi chất giữa lục lạp và ti thể (dùng `quang-hop-ho-hap`).
- Không đưa chi tiết sinh hoá đại học (như cấu trúc siêu hiển vi phức hợp ATP synthase) vào bài KHTN lớp 6.

## Ý sư phạm

Vẽ khung tế bào tổng thể bằng hình nét sạch trước, gọi tên từng thành phần qua đường dẫn `.ek-leader` rõ ràng, rồi thực hiện đúng một cú máy phóng chậm (`EK.camera`) vào bào quan trọng tâm để giữ sự chú ý của học sinh.

- Beat 0 (câu 0): Vẽ thành tế bào và màng sinh chất cùng không bào trung tâm tạo khung tổng thể.
- Beat 1 (câu 1): Lần lượt hiện nhân tế bào, tế bào chất và lục lạp kèm đường dẫn chú thích thẳng hàng.
- Beat 2 (câu 2): Làm nổi lục lạp (`EK.focus`) và phóng chậm camera (`EK.camera`, đúng 1 lần, ≥ 1,8 s) vào khu vực lục lạp.
- Beat 3 (câu 3): Hiện thẻ kết luận ngắn gọn về vai trò của bào quan đang phóng đại.

## Dữ liệu lấy từ lời giảng

- Loại tế bào (thực vật, động vật hay nhân sơ) và danh sách bộ phận được nhắc tới trong bài.
- Tên bào quan trọng tâm cần phóng đại và chức năng tương ứng theo đúng trình độ lớp.

## Bố cục

- Bọc toàn bộ sân khấu trong đúng một `.ek-world` để dùng `EK.camera`.
- Lưới 12 cột: sơ đồ tế bào nét học thuật đặt cột 1–7 (`top: 200px`), danh sách nhãn chú thích và đường dẫn đặt cột 8–12 thẳng hàng không cắt chéo.
- Dải lời giảng `y ≥ 936` để trống hoàn toàn (cả trước và sau khi phóng camera).

## Chuyển động

Dùng `EK.draw` vẽ đường nét thành tế bào, màng và đường dẫn `.ek-leader`; `EK.enter` mở các bào quan và nhãn; `EK.focus` làm mờ nhẹ phần nền rồi gọi **đúng 1 lần** `EK.camera(tl, t, dur ≥ 1.8, { x, y, scale })` để phóng vào bào quan trọng tâm. Tuyệt đối không gọi `EK.camera` lần 2.

## Ví dụ

- `examples/vi-du-1/`: Cấu tạo tế bào thực vật (KHTN 6) gồm thành tế bào, màng sinh chất, nhân, không bào lớn, lục lạp và 1 chuyển động camera phóng chậm vào lục lạp.

## Lỗi hay gặp

- Gọi `EK.camera` hai lần (phóng vào rồi thu ra) — vi phạm hợp đồng `camera_nhieu`.
- Đường dẫn `.ek-leader` cắt chéo nhau hoặc nhãn `[data-ek-for]` cách vật > 120 px mà không có `.ek-leader`.
- Camera phóng quá lớn làm nhãn tràn ra khỏi khung 1920×1080 hoặc chạm dải phụ đề y ≥ 936.

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: hình tế bào nét học thuật sạch, đường dẫn không cắt chéo, đúng 1 chuyển động camera mượt ≥ 1,5 s, sau khi phóng mọi chữ quan trọng vẫn nằm gọn trong vùng an toàn.
