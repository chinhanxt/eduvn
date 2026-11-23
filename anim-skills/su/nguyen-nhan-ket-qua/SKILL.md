---
name: nguyen-nhan-ket-qua
description: Sơ đồ mạch nhân quả lịch sử trên nền giấy học thuật gồm 4 mắt xích nối tiếp: Nguyên nhân → Diễn biến chính → Kết quả → Ý nghĩa lịch sử. Mỗi mắt xích sáng lên theo lời giảng cùng mũi tên dẫn hướng vẽ dần. Dùng khi bài giảng phân tích nguyên nhân, kết quả và ý nghĩa của một sự kiện lịch sử. Cause and effect history flowchart, historical causation, outcomes and significance.
license: Proprietary (EDUVN)
metadata:
  ten: "Nguyên nhân – kết quả lịch sử"
  engine: hf
  mon: su,gdcd
  lop: 6-12
  loai: nhan-qua,quy-trinh,thoi-gian
  can: moc-thoi-gian>=1
  tranh: "bản đồ chiến dịch,đồ thị hàm số,công thức"
  tuKhoa: "nguyên nhân,diễn biến,kết quả,ý nghĩa,dẫn đến,tác động,hệ quả,bài học lịch sử"
  thoiLuong: 12-36
  fallback: so_do_quy_trinh
  kit: graph,enter,draw,mark,focus
  version: "1"
  nguon: "hf:flowchart,hf:hw-pipeline,cũ:so_do_quy_trinh"
  vaiTro: chinh
---

## Khi dùng

- Bài giảng giải thích trọn vẹn chuỗi logic: vì sao sự kiện xảy ra (Nguyên nhân) → diễn biến cốt lõi → Kết quả trực tiếp → Ý nghĩa lịch sử lâu dài.
- Phù hợp cho bài học tổng hợp một trận đánh, cuộc khởi nghĩa, cuộc cách mạng hoặc cải cách lịch sử (ví dụ: Bạch Đằng 938, Cách mạng tháng Tám 1945, Công cuộc Đổi mới 1986).

## Không dùng

- Cần theo dõi mũi tên tiến công chi tiết theo từng vị trí địa lý trên bản đồ (dùng `ban-do-chien-dich`).
- Cần đối chiếu song song hai thời kỳ khác nhau theo bảng tiêu chí (dùng `so-sanh-thoi-ky`).

## Ý sư phạm

Giúp học sinh vượt qua việc học thuộc lòng rời rạc bằng cách nối rõ quan hệ nhân – quả thành một chuỗi 4 mắt xích mạch lạc.

- Beat 0 (câu 0): Hiện tiêu đề sự kiện và khối **Nguyên nhân** (màu `lam`).
- Beat 1 (câu 1): Vẽ mũi tên nối sang khối **Diễn biến chính** (màu `doSon`), làm dịu khối trước để tập trung.
- Beat 2 (câu 2): Vẽ mũi tên nối sang khối **Kết quả** (màu `xanhLa`).
- Beat 3 (câu 3): Vẽ mũi tên nối sang khối **Ý nghĩa lịch sử** (màu `tim`), mở lại toàn chuỗi bằng `EK.unfocus` và nhấn từ khoá chốt.

## Dữ liệu lấy từ lời giảng

- Bốn trường ngắn gọn trích từ lời giảng/slide: `nguyenNhan`, `dienBien`, `ketQua`, `yNghia`, kèm tên sự kiện và mốc năm đã xác thực.
- Mỗi khối tối đa 2 dòng ngắn (≤ 14 từ/dòng) để giữ cỡ chữ ≥ 38 px rõ ràng.

## Bố cục

- Lưới 12 cột 1920×1080, sân khấu `y: 150..900`, chừa trống dải phụ đề `y ≥ 936`.
- Hàng trên (`y: 64..245`): `.ek-meta` và `.ek-title` ở `.ek-col-1 ek-span-12`.
- Lưới 2×2 hoặc dải ngang 4 cột kết hợp `data-ek-graph` (khuyến nghị lưới 2×2 rộng rãi `col 1–6` và `col 7–12` nối bằng mũi tên SVG rõ nét để mỗi thẻ có bề rộng 760 px, chữ 38–40 px thoáng, không rớt chữ lẻ).

## Chuyển động

Mỗi beat mở thêm một mắt xích mới bằng `EK.enter`, nối mũi tên từ mắt xích trước bằng `EK.draw`, và chốt cảnh bằng `EK.mark` trên ý nghĩa lịch sử.

- `EK.enter(tl, "#box-nn", EK.cue(0), { from: "up" })` — hiện khối Nguyên nhân.
- `EK.draw(tl, "#edge-1", EK.cue(1) - 0.1, 0.8)` + `EK.enter(tl, "#box-db", EK.cue(1), { from: "left" })` — nối sang Diễn biến.
- `EK.draw(tl, "#edge-2", EK.cue(2) - 0.1, 0.8)` + `EK.enter(tl, "#box-kq", EK.cue(2), { from: "up" })` — nối sang Kết quả.
- `EK.draw(tl, "#edge-3", EK.cue(3) - 0.1, 0.8)` + `EK.enter(tl, "#box-yn", EK.cue(3), { from: "left" })` + `EK.mark(tl, "#kw-yn", EK.cue(3) + 0.8, "highlight", { color: "tim" })`.

## Ví dụ

Xem ví dụ vàng `examples/vi-du-1/`: **Chiến thắng Bạch Đằng năm 938 — Nguyên nhân, Diễn biến, Kết quả, Ý nghĩa** gồm `scene.json`, `plan.json` và `index.html`.

## Lỗi hay gặp

- Nhồi cả đoạn văn dài vào 4 hộp khiến chữ nhỏ dưới 36 px hoặc tràn hộp.
- Mũi tên nối giữa các khối bị đè lên viền chữ hoặc hở khỏi mép thẻ (`connector_detached`).
- Không phân biệt màu vai trò giữa nguyên nhân, diễn biến, kết quả và ý nghĩa.

## Checklist

Xem `checklist.json`; kiểm bằng mắt:
- Đủ 4 khối theo đúng trình tự Nguyên nhân → Diễn biến → Kết quả → Ý nghĩa.
- Mũi tên nối gọn gàng, không cắt ngang chữ, chữ ≥ 36 px và không rớt 1 từ lẻ cuối dòng.
- Màu thuộc tổ hợp `coDien` (`lam`, `doSon`, `xanhLa`, `tim`), tương phản đạt WCAG AA.
