---
name: dong-thoi-gian-su-kien
description: Dòng thời gian lịch sử đúng tỉ lệ năm thật trên nền giấy học thuật: các thời kỳ thể hiện thành dải màu phân loại đạt chuẩn AA, mốc sự kiện bật lên khớp lời giảng kèm thẻ diễn giải ngắn gọn. Dùng khi bài giảng trình bày tiến trình nhiều mốc năm hoặc chuyển tiếp giữa các thời kỳ lịch sử. Proportional historical timeline, era bands, chronological events, TimelineJS data model.
license: Proprietary (EDUVN)
metadata:
  ten: "Dòng thời gian sự kiện"
  engine: hf
  mon: su,van
  lop: 4-12
  loai: thoi-gian,dien-bien
  can: moc-thoi-gian>=2
  tranh: "công thức,đồ thị hàm số,bản đồ chiến dịch"
  tuKhoa: "dòng thời gian,niên biểu,mốc lịch sử,thời kỳ,giai đoạn,năm,thế kỷ,tiến trình"
  thoiLuong: 10-40
  fallback: dong_thoi_gian
  kit: timeline,enter,mark,focus
  version: "1"
  nguon: "TimelineJS3(mô hình dữ liệu),hf:beat-timeline,cũ:dong_thoi_gian"
  vaiTro: chinh
---

## Khi dùng

- Bài giảng giới thiệu tiến trình lịch sử qua nhiều mốc năm cách quãng không đều (ví dụ: 1930–1945–1954–1968–1975, hoặc các triều đại phong kiến Việt Nam thế kỷ X–XIX).
- Cần nhấn mạnh **tỉ lệ khoảng cách thời gian thật** giữa các sự kiện và ranh giới giữa các thời kỳ lịch sử.
- Bài tổng kết chương/giai đoạn giúp học sinh hệ thống hoá niên biểu.

## Không dùng

- Bài giảng tập trung vào đường hành quân, mũi tên đánh chiếm cụ thể trên bản đồ (dùng `ban-do-chien-dich`).
- Bài chỉ phân tích quan hệ nhân quả của một sự kiện đơn lẻ (dùng `nguyen-nhan-ket-qua`).
- Bài chỉ có 1 mốc năm duy nhất.

## Ý sư phạm

Đặt các sự kiện trên trục năm đúng tỉ lệ thật để học sinh cảm nhận được độ dài từng thời kỳ, rồi bật sáng từng mốc theo nhịp lời giảng.

- Beat 0 (câu 0): Vẽ trục năm tuyến tính từ năm đầu đến năm cuối kèm các dải màu thời kỳ (era) ở trên trục.
- Beat 1 (câu 1): Bật mốc sự kiện 1 đúng vị trí tỉ lệ trên trục + hiện thẻ nội dung sự kiện 1.
- Beat 2 (câu 2): Chuyển điểm sáng sang mốc sự kiện 2 (mốc 1 lùi nhẹ về trạng thái đã qua), tô dải thời kỳ tương ứng.
- Beat 3 (câu 3): Bật các mốc cuối cùng và hiện thẻ tổng kết mạch phát triển của cả giai đoạn.

## Dữ liệu lấy từ lời giảng

- Mảng sự kiện theo mô hình TimelineJS (xem `references/mo-hinh-su-kien-timelinejs.md`): `tu`, `den`, `buoc`, `thoiKy[{tu, den, nhan}]`, `moc[{nam, nhan}]`.
- Mọi năm tháng và tên sự kiện phải lấy chính xác từ slide/lời giảng và đối chiếu được với nguồn (Wikidata / SGK CTGDPT 2018); không tự thêm mốc năm ngoài bài.

## Bố cục

- Lưới 12 cột 1920×1080, sân khấu `y: 150..900`, để trống dải phụ đề `y ≥ 936`.
- Hàng trên (`y: 150..270`): dòng phân loại `.ek-meta` và tiêu đề `.ek-title` (`.ek-col-1 ek-span-12`).
- Vùng giữa (`y: 295..590`): trục thời gian SVG (`data-ek-timeline`, `.ek-col-1 ek-span-12`, cao ~285 px) gồm dải màu thời kỳ và các chấm/nhãn mốc đặt đúng tỉ lệ năm (so le trên/dưới khi hai mốc gần nhau).
- Vùng dưới (`y: 615..885`): thẻ chi tiết sự kiện đang nói (`.ek-card`, tối đa 2 thẻ song song hoặc 1 thẻ rộng `.ek-col-1 ek-span-12` thay đổi sạch theo beat).

## Chuyển động

Trục năm và dải thời kỳ hiện ra ở beat mở đầu, sau đó từng mốc sự kiện bật lên bằng `EK.enter` và được nhấn bằng `EK.mark` khớp mốc `EK.cue(i)`.

- `EK.enter(tl, "#tl-svg", EK.b(0), { from: "fade" })` và `EK.draw(tl, "#tl-svg .ek-tl-axis", EK.b(0) + 0.1, 1.1)` — vẽ trục thời gian.
- `EK.enter(tl, "#tl-svg .ek-era", EK.b(0) + 0.6, { from: "left", stagger: 0.2 })` — hiện các dải thời kỳ.
- Tại mỗi beat `k`: `EK.enter(tl, "#ev-k", EK.cue(k), { from: "scale" })` + hiện thẻ chi tiết `#card-k` và làm dịu thẻ trước (`opacity: 0.45` hoặc hoán đổi sạch).
- Không đứng yên quá 4 giây; không dùng ease nảy `elastic`/`bounce`.

## Ví dụ

Xem ví dụ vàng `examples/vi-du-1/`: **Tiến trình cách mạng Việt Nam 1945–1975** (4 mốc lớn qua 2 thời kỳ kháng chiến chống Pháp và chống Mỹ) gồm `scene.json`, `plan.json` và `index.html`.

## Lỗi hay gặp

- Chia đều khoảng cách các mốc sự kiện thay vì theo đúng tỉ lệ năm thật (làm sai lệch nhận thức lịch sử).
- Để hai nhãn năm sát nhau đè chữ lên nhau trên trục.
- Hiển thị quá 6 mốc chi tiết cùng lúc trên một cảnh 15–25 giây khiến chữ phải thu nhỏ dưới 36 px.

## Checklist

Xem `checklist.json`; kiểm bằng mắt:
- Khoảng cách trên trục phản ánh đúng hiệu số năm (vd 1954–1975 dài hơn 1945–1954 hơn 2 lần).
- Mỗi thời kỳ có dải màu phân biệt đạt AA và không dùng cam làm màu chủ đạo.
- Nhãn mốc không đè nhau, chữ ≥ 36 px, không lấn vào dải phụ đề `y ≥ 936`.
