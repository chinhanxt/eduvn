---
name: so-sanh-thoi-ky
description: So sánh đối chiếu hai thời kỳ lịch sử, hai cuộc kháng chiến hoặc hai sự kiện lớn theo từng tiêu chí rõ ràng trên nền giấy học thuật: hai cột đối xứng, từng hàng tiêu chí hiện dần theo lời giảng, tô sáng điểm khác biệt và chốt điểm chung. Dùng khi bài giảng yêu cầu so sánh, phân biệt hai giai đoạn lịch sử. Historical period comparison, two-column contrast table, criteria-by-criteria analysis.
license: Proprietary (EDUVN)
metadata:
  ten: "So sánh thời kỳ lịch sử"
  engine: hf
  mon: su,van,gdcd
  lop: 8-12
  loai: so-sanh,thoi-gian
  can: moc-thoi-gian>=2
  tranh: "bản đồ chiến dịch,đồ thị hàm số,công thức"
  tuKhoa: "so sánh,đối chiếu,giống nhau,khác nhau,hai thời kỳ,hai cuộc kháng chiến,đặc điểm"
  thoiLuong: 12-35
  fallback: so_sanh_bang
  kit: enter,mark,focus
  version: "1"
  nguon: "hf:split-tilt-cards,cũ:so_sanh_bang"
  vaiTro: chinh
---

## Khi dùng

- Bài giảng so sánh hai cuộc kháng chiến (ví dụ: Kháng chiến chống Pháp 1945–1954 và Kháng chiến chống Mỹ 1954–1975), hai cuộc cách mạng (Cách mạng tháng Tám 1945 và Đại thắng mùa Xuân 1975) hoặc hai trào lưu yêu nước (Phan Bội Châu vs Phan Châu Trinh).
- Cần học sinh đối chiếu song song theo 3–4 tiêu chí tường minh thay vì đọc hai đoạn văn tách rời.

## Không dùng

- Bài giảng liệt kê một chuỗi hơn 3 mốc nối tiếp theo thời gian (dùng `dong-thoi-gian-su-kien`).
- Bài phân tích nguyên nhân – kết quả của một sự kiện duy nhất (dùng `nguyen-nhan-ket-qua`).

## Ý sư phạm

Đặt hai đối tượng lịch sử cạnh nhau với hệ màu nhất quán (cột A màu `lam`, cột B màu `tim`), mở dần từng hàng tiêu chí khớp lời giảng rồi kết lại bằng thẻ điểm chung cốt lõi.

- Beat 0 (câu 0): Hiện tiêu đề bài và tiêu đề 2 cột đối chiếu kèm khung niên đại.
- Beat 1 (câu 1): Mở hàng tiêu chí 1 (Bối cảnh / Đối tượng) ở cả hai cột.
- Beat 2 (câu 2): Mở hàng tiêu chí 2 (Trận quyết chiến / Bước ngoặt) và tô điểm khác biệt chính.
- Beat 3 (câu 3): Hiện thẻ **Điểm chung cốt lõi** chạy ngang cuối sân khấu (màu `xanhLa`) và nhấn từ khoá chốt.

## Dữ liệu lấy từ lời giảng

- Tên 2 đối tượng so sánh kèm niên đại chính xác từ lời giảng/slide.
- Tối đa 3–4 hàng tiêu chí ngắn gọn (≤ 12 từ mỗi ô) + 1 câu kết luận điểm chung.
- Mọi năm tháng phải trùng khớp với lời giảng và nguồn kiểm chứng.

## Bố cục

- Lưới 12 cột 1920×1080, sân khấu `y: 150..900`, dải phụ đề `y ≥ 936` để trống.
- Đầu trang (`y: 64..235`): `.ek-meta` và `.ek-title` ở `.ek-col-1 ek-span-12`.
- Hai cột đối chiếu (`y: 265..705`): Cột trái `.ek-col-1 ek-span-6` (viền màu `--c-lam`) và cột phải `.ek-col-7 ek-span-6` (viền màu `--c-tim`), chia các hàng tiêu chí thẳng hàng nhau.
- Dải kết luận điểm chung (`y: 730..885`): thẻ ngang `.ek-col-1 ek-span-12` có viền trái `--c-xanhLa`.

## Chuyển động

Hai cột mở tiêu đề trước rồi từng hàng tiêu chí trượt vào đồng bộ hai bên bằng `EK.enter`, nhấn điểm khác biệt bằng `EK.mark` trước khi hiện thẻ điểm chung.

- `EK.enter(tl, "#col-a, #col-b", EK.cue(0), { from: "up", stagger: 0.15 })` — hiện khung 2 thời kỳ.
- `EK.enter(tl, ".row-1", EK.cue(1), { from: "left", stagger: 0.12 })` — mở tiêu chí 1.
- `EK.enter(tl, ".row-2", EK.cue(2), { from: "left", stagger: 0.12 })` + `EK.mark(tl, "#diff-a, #diff-b", EK.cue(2) + 0.9, "underline", { color: "doSon" })`.
- `EK.enter(tl, "#box-chung", EK.cue(3), { from: "up" })` + `EK.mark(tl, "#kw-chung", EK.cue(3) + 0.7, "highlight", { color: "xanhLa" })`.

## Ví dụ

Xem ví dụ vàng `examples/vi-du-1/`: **So sánh Kháng chiến chống Pháp (1945–1954) và Kháng chiến chống Mỹ (1954–1975)** gồm `scene.json`, `plan.json` và `index.html`.

## Lỗi hay gặp

- Hai cột lệch hàng tiêu chí khiến học sinh phải liếc tìm đối ứng.
- Ghi quá nhiều chữ trong từng ô khiến cỡ chữ giảm dưới 36 px hoặc tràn xuống dưới `y = 900`.
- Dùng màu cam làm màu tiêu đề cột.

## Checklist

Xem `checklist.json`; kiểm bằng mắt:
- Tiêu chí hai bên thẳng hàng tuyệt đối, cỡ chữ ≥ 36 px.
- Mỗi thời kỳ giữ nhất quán một màu token (`lam` vs `tim`), điểm chung màu `xanhLa`.
- Không đè chữ, không rớt từ lẻ, không chạm vùng phụ đề `y ≥ 936`.
