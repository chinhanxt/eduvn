---
name: phan-bao
description: Hoạt hình phân bào (nguyên phân và giảm phân) biến hình liên tục màng tế bào và nhiễm sắc thể qua các kì bằng MorphSVG, đếm chính xác số NST, crômatit và tâm động ở từng kì. Dùng khi lời giảng giải thích diễn biến kì đầu, kì giữa, kì sau, kì cuối của nguyên phân hoặc giảm phân I/II. Mitosis, meiosis, cell division, MorphSVG chromosomes.
license: Proprietary (EDUVN)
metadata:
  ten: "Phân bào (Nguyên phân & Giảm phân)"
  engine: hf
  mon: sinh
  lop: 9-12
  loai: quy-trinh,dien-bien
  can: buoc>=3
  tranh: "định nghĩa,phép lai,chu trình,lưới thức ăn"
  tuKhoa: "nguyên phân,giảm phân,kì đầu,kì giữa,kì sau,kì cuối,nhiễm sắc thể,crômatit,tâm động,2n"
  thoiLuong: 16-45
  fallback: so_do_quy_trinh
  kit: enter,morph,draw,count,mark,focus
  version: "1"
  nguon: "hf:morph-swap,MorphSVGPlugin"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng trình bày diễn biến liên tục qua các kì nguyên phân (Kì đầu → Kì giữa → Kì sau → Kì cuối) ở KHTN 9 hoặc Sinh học 10.
- Lời giảng trình bày giảm phân I và giảm phân II, so sánh sự thay đổi số NST, số crômatit và số tâm động (2n kép → 4n đơn → 2n đơn, hoặc 2n kép → n kép → n đơn).

## Không dùng

- Bài chỉ giới thiệu cấu tạo tĩnh của tế bào nhân thực (dùng `cau-tao-te-bao`).
- Bài tập lai di truyền Punnett (dùng `di-truyen-punnett`).
- Lớp 6–8 chưa học cơ chế phân bào có thoi phân bào.

## Ý sư phạm

Biến hình liên tục một tế bào gốc bằng MorphSVG qua từng kì để học sinh thấy sự tách crômatit ở tâm động và đối chiếu ngay bảng đếm NST, crômatit, tâm động theo thời gian thực.

- Beat 0 (câu 0): Mở tế bào ở Kì đầu với đúng $2n$ NST kép đang đóng xoắn, hiển thị số NST, crômatit, tâm động.
- Beat 1 (câu 1): Biến hình sang Kì giữa: các NST kép xếp 1 hàng (nguyên phân) hoặc 2 hàng (giảm phân I) trên mặt phẳng xích đạo, thoi phân bào bám tâm động.
- Beat 2 (câu 2): Biến hình sang Kì sau: crômatit tách nhau ở tâm động kéo về 2 cực, bảng đếm nhảy lên $4n$ NST đơn và $0$ crômatit.
- Beat 3 (câu 3): Màng tế bào thắt eo biến hình (MorphSVG) thành 2 tế bào con ở Kì cuối, mỗi tế bào có đúng $2n$ NST đơn.

## Dữ liệu lấy từ lời giảng

- Loại phân bào (nguyên phân hoặc giảm phân I/II) và bộ NST $2n$ (ưu tiên $2n = 4$ để đếm trực quan trên màn hình; nếu bài dùng loài khác như $2n = 8$ thì ghi rõ số liệu khớp loài đó).
- Bốn con số định lượng ở từng kì: số NST, trạng thái đơn/kép, số crômatit, số tâm động (tính lại khớp `server/src/subjects/sinh/cellDivision.ts`).

## Bố cục

- Lưới 12 cột: thanh tiêu đề trên `y = 64–150`, sân khấu chia đôi: sơ đồ tế bào động SVG cột 1–7 (`top: 210px`), bảng chỉ số định lượng và thẻ diễn biến từng kì cột 8–12.
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.morph` (MorphSVG) để biến hình mượt màng tế bào (tròn → kéo dài → thắt eo → tách đôi) và hình thái NST (kép chữ X → đơn chữ V), kết hợp `EK.draw` cho sợi thoi phân bào, `EK.count` cập nhật số NST/crômatit/tâm động khớp từng kì và `EK.focus` nhấn mạnh thẻ kì hiện tại.

## Ví dụ

- `examples/vi-du-1/`: Nguyên phân ở tế bào lưỡng bội $2n = 4$ qua 4 kì với MorphSVG biến hình màng tế bào và đếm NST/crômatit/tâm động khớp 100%.

## Lỗi hay gặp

- Vẽ sai số lượng NST so với $2n$ đã nêu (ví dụ ghi $2n = 4$ nhưng vẽ 6 NST).
- Quên đổi số crômatit về **0** ở Kì sau và Kì cuối nguyên phân khi NST đã tách thành NST đơn.
- Dùng tween trực tiếp `width`/`height` thay vì `EK.morph` hoặc `scale`/`x`/`y`.

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: đếm tay từng NST trong khung hình ở mỗi kì phải khớp đúng bảng số bên phải; màng tế bào biến hình mượt không giật; không nhãn nào lấn vào dải y ≥ 936.
