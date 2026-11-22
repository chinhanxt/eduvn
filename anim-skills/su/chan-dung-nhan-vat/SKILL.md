---
name: chan-dung-nhan-vat
description: Thẻ chân dung nhân vật lịch sử trên nền giấy học thuật gồm khung chân dung công cộng hoặc Creative Commons (hoặc huy hiệu chữ lồng học thuật khi thiếu ảnh tự do) kèm dòng ghi nguồn bắt buộc, mốc cuộc đời – sự nghiệp và câu nói tiêu biểu. Dùng khi bài giảng giới thiệu anh hùng dân tộc, danh nhân hoặc nhân vật lịch sử trọng tâm. Historical figure portrait card, public domain or CC attribution, biography milestones.
license: Proprietary (EDUVN)
metadata:
  ten: "Chân dung nhân vật lịch sử"
  engine: hf
  mon: su,van
  lop: 4-12
  loai: nhan-vat,thoi-gian
  can: ten-rieng>=1,moc-thoi-gian>=1
  tranh: "bản đồ chiến dịch,đồ thị hàm số,công thức"
  tuKhoa: "nhân vật,anh hùng,danh nhân,tiểu sử,cuộc đời,sự nghiệp,câu nói,Võ Nguyên Giáp,Hồ Chí Minh,Trần Hưng Đạo,Quang Trung,Ngô Quyền"
  thoiLuong: 12-30
  fallback: the_ghi_nho
  kit: enter,mark,words,focus
  version: "1"
  nguon: "hf:titlecard-calm,Wikimedia Commons(quy ước PD/CC)"
  vaiTro: chinh
---

## Khi dùng

- Bài giảng giới thiệu tiểu sử, vai trò và đóng góp của một nhân vật lịch sử trọng tâm (ví dụ: Ngô Quyền, Lý Thường Kiệt, Trần Hưng Đạo, Nguyễn Trãi, Quang Trung, Chủ tịch Hồ Chí Minh, Đại tướng Võ Nguyên Giáp).
- Cần tổng hợp gọn gàng niên đại cuộc đời, 2–3 mốc sự nghiệp tiêu biểu và câu nói/nhận định chuẩn sách giáo khoa.

## Không dùng

- Bài giảng so sánh nhiều nhân vật/thời kỳ theo bảng tiêu chí (dùng `so-sanh-thoi-ky`).
- Bài trình bày diễn biến trận đánh trên bản đồ (dùng `ban-do-chien-dich`).
- Khi chỉ có ảnh bản quyền thương mại không rõ giấy phép — trong trường hợp đó bắt buộc chuyển sang huy hiệu chữ lồng học thuật (xem `references/nguon-anh-cong-cong-cc.md`).

## Ý sư phạm

Đặt hồ sơ nhân vật ở bố cục 2 cột kiểu sách tham khảo cao cấp: cột trái là khung chân dung có ghi nguồn minh bạch, cột phải mở dần các mốc sự nghiệp theo nhịp lời giảng.

- Beat 0 (câu 0): Hiện khung chân dung (ảnh công cộng/CC cục bộ hoặc huy hiệu chữ lồng), họ tên, năm sinh – năm mất và vai trò lịch sử kèm dòng nguồn `.ek-meta`.
- Beat 1 (câu 1): Hiện mốc sự nghiệp 1 kèm năm xác thực.
- Beat 2 (câu 2): Hiện mốc sự nghiệp 2 (đỉnh cao đóng góp) và nhấn từ khoá chính.
- Beat 3 (câu 3): Hiện câu nói tiêu biểu hoặc đánh giá lịch sử chuẩn sách giáo khoa trong khối trích dẫn serif.

## Dữ liệu lấy từ lời giảng

- Họ tên, năm sinh – năm mất, vai trò và 2–3 mốc sự nghiệp trích từ lời giảng/slide và đối chiếu Wikidata (P569/P570).
- Hình ảnh: **chỉ** dùng tệp cục bộ `assets/...` thuộc Phạm vi công cộng (Public Domain) hoặc Creative Commons (CC BY / CC BY-SA) kèm dòng ghi nguồn rõ tác giả + giấy phép, hoặc huy hiệu chữ lồng học thuật EDUVN theo `references/nguon-anh-cong-cong-cc.md`.

## Bố cục

- Lưới 12 cột 1920×1080, sân khấu `y: 150..900`, dải phụ đề `y ≥ 936` để trống.
- Cột trái `.ek-col-1 ek-span-4` (`y: 150..885`): thẻ chân dung/huy hiệu nhân vật, tên lớn (`.ek-title`), niên đại (`1911–2013`), chức vụ/vai trò và dòng nguồn `.ek-meta` ở đáy thẻ.
- Cột phải `.ek-col-6 ek-span-7` (`y: 150..885`): danh sách 2–3 mốc sự nghiệp dạng thẻ nối dọc + khung trích dẫn `.ek-read` ở dưới cùng.

## Chuyển động

Khung chân dung và tên nhân vật hiện trước bằng `EK.enter`, tiếp đó từng mốc sự nghiệp trượt vào theo cue lời giảng và chốt bằng câu nói tiêu biểu được nhấn bằng `EK.mark`.

- `EK.enter(tl, "#portrait-card", EK.cue(0), { from: "left" })` — hiện thẻ chân dung + nguồn bản quyền.
- `EK.enter(tl, "#ms-1", EK.cue(1), { from: "up" })` — hiện mốc sự nghiệp 1.
- `EK.enter(tl, "#ms-2", EK.cue(2), { from: "up" })` + `EK.mark(tl, "#kw-role", EK.cue(2) + 0.7, "highlight", { color: "accent" })`.
- `EK.enter(tl, "#quote-card", EK.cue(3), { from: "up" })` + `EK.words(tl, "#quote-txt", { t: EK.cue(3) + 0.35, per: 0.14 })`.

## Ví dụ

Xem ví dụ vàng `examples/vi-du-1/`: **Đại tướng Võ Nguyên Giáp (1911–2013)** gồm `scene.json`, `plan.json` và `index.html`.

## Lỗi hay gặp

- Chèn link ảnh trực tiếp từ internet (`https://...`) làm hỏng hộp cát dựng video hoặc vi phạm bản quyền.
- Thiếu dòng ghi nguồn giấy phép cho ảnh công cộng/CC.
- Ghi năm sinh/mất ước đoán không đối chiếu Wikidata/SGK.

## Checklist

Xem `checklist.json`; kiểm bằng mắt:
- Có dòng ghi nguồn minh bạch (Public Domain / CC kèm tác giả, hoặc huy hiệu học thuật EDUVN).
- Mốc năm sinh – mất và các mốc sự nghiệp rõ ràng, chữ ≥ 36 px (trừ dòng nguồn `.ek-meta` 30 px).
- Bố cục cân đối, không đè chữ, không lấn vùng phụ đề `y ≥ 936`.
