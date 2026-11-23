---
name: ban-do-chien-dich
description: Bản đồ chiến dịch quân sự Việt Nam trên nền giấy học thuật: địa danh chuẩn hoá từ bộ địa danh lịch sử, mũi tên tiến công/bao vây/rút lui vẽ dần theo từng đợt lời giảng, tô vùng giải phóng, luôn thể hiện đúng chủ quyền Việt Nam (Hoàng Sa, Trường Sa). Dùng khi bài giảng trình bày diễn biến chiến dịch hoặc trận đánh có từ 2 địa danh trở lên. Campaign map, military operation arrows, battle phases, liberation zones.
license: Proprietary (EDUVN)
metadata:
  ten: "Bản đồ chiến dịch"
  engine: hf
  mon: su,dia
  lop: 6-12
  loai: ban-do,dien-bien,thoi-gian
  can: dia-danh>=2,moc-thoi-gian>=1
  tranh: "định nghĩa,khái niệm,phân tích văn học"
  tuKhoa: "chiến dịch,trận đánh,tiến công,mũi tên,bao vây,rút lui,giải phóng,Điện Biên Phủ,Hồ Chí Minh,Bạch Đằng,Chi Lăng"
  thoiLuong: 12-45
  fallback: dong_thoi_gian
  kit: map,place,arrow,fill,mark,focus,enter
  version: "1"
  nguon: "hf:us-map-flow,hf:hw-arrow,StoryMapJS(mô hình),NaturalEarth vnm"
  vaiTro: chinh
---

## Khi dùng

- Bài giảng kể diễn biến một chiến dịch quân sự hoặc trận quyết chiến lịch sử theo các đợt (ví dụ: Điện Biên Phủ 1954, Chiến dịch Hồ Chí Minh 1975, Biên giới 1950, Chi Lăng – Xương Giang 1427, Bạch Đằng 938/1288).
- Lời giảng có ít nhất 2 địa danh nằm trong `services/anim-kit-data/dia-danh-lich-su.json` và ít nhất 1 mốc thời gian.
- Cần giúp học sinh hình dung hướng tiến công, mũi bao vây, hướng địch rút lui và vùng được giải phóng theo đúng trình tự thời gian.

## Không dùng

- Cảnh chỉ nêu định nghĩa, khái niệm hoặc nguyên nhân – ý nghĩa thuần tuý không có vận động không gian (dùng `nguyen-nhan-ket-qua`).
- Cảnh chỉ liệt kê nhiều năm nối tiếp không gắn diễn biến trên bản đồ (dùng `dong-thoi-gian-su-kien`).
- Địa danh không xác định được trong bộ dữ liệu địa danh (AI không được tự bịa toạ độ).

## Ý sư phạm

Kể diễn biến chiến dịch theo từng đợt tiến công bám sát lời giảng, tách rõ không gian bản đồ và thẻ diễn biến để học sinh nắm được logic quân sự.

- Beat 0 (câu 0): Hiện bản đồ nền giấy (kèm ô định vị Việt Nam có đủ QĐ. Hoàng Sa và QĐ. Trường Sa khi phóng cận cảnh) cùng các địa danh then chốt.
- Beat 1 (câu 1): Đợt 1 — vẽ dần mũi tên tiến công mở màn, sáng thẻ tóm tắt Đợt 1.
- Beat 2 (câu 2): Đợt 2 — làm lùi mũi tên Đợt 1 về mờ nhẹ, vẽ mũi tên Đợt 2 và mũi bao vây cắt tiếp vận.
- Beat 3 (câu 3): Đợt 3 — vẽ mũi tổng công kích quyết định và tô vùng giải phóng dần theo tiến độ.
- Beat 4 (câu 4): Tổng kết chiến dịch — hiện thẻ kết quả/ý nghĩa ngắn gọn, giữ toàn cảnh chiến trường rõ nét.

## Dữ liệu lấy từ lời giảng

- Mã địa danh (`id`) đối chiếu bắt buộc với `services/anim-kit-data/dia-danh-lich-su.json` (ví dụ: `tuan-giao`, `muong-phang`, `him-lam`, `doi-doc-lap`, `doi-a1`, `muong-thanh`, `ham-de-castries`, `hong-cum`).
- Tên đợt, ngày/tháng/năm và kết quả lấy nguyên văn từ slide hoặc lời giảng; tuyệt đối không tự thêm số liệu quân số hay mốc ngày ngoài nguồn.
- Quy ước ký hiệu mũi tên, căn cứ, trận đánh đọc tại `references/ky-hieu-ban-do-quan-su.md`.

## Bố cục

- Lưới 12 cột 1920×1080, nền giấy `#FDFCF9`, sân khấu chính `y: 150..900`, để trống hoàn toàn dải phụ đề `y ≥ 936`.
- Cột 1–7 (`ek-col-1 ek-span-7`): khung bản đồ SVG (`data-ek-map`) chiếm khoảng 970×700 px; khi phóng cận cảnh chiến trường phải có ô bản đồ Việt Nam thu nhỏ ở góc trống thể hiện đủ Hoàng Sa và Trường Sa.
- Cột 8–12 (`ek-col-8 ek-span-5`): tiêu đề gọn ở trên cùng và các thẻ diễn biến từng đợt (`.ek-card`) xếp dọc rõ ràng, không đè nhau.
- Cỡ chữ mọi nhãn địa danh và nội dung thẻ ≥ 36 px (chỉ dòng `.ek-meta` được 30 px).

## Chuyển động

Bản đồ hiện trước rồi đặt địa danh, vẽ dần mũi tên từng đợt bằng `EK.arrow` và tô vùng giải phóng bằng `EK.fill` khớp từng mốc `EK.cue(i)`.

- `EK.enter(tl, "#map-wrap", EK.b(0))` — hiện khung bản đồ nền giấy cùng địa danh chủ chốt.
- `EK.arrow(tl, "#arr-dot1-1", EK.cue(1), 1.2)` — vẽ mũi tên tiến công Đợt 1 (nét liền `--c-doSon`).
- `EK.enter(tl, "#card-dot1", EK.cue(1))` — hiện thẻ diễn biến Đợt 1; ở beat sau làm dịu thẻ cũ bằng `tl.to(..., { opacity: 0.45 })`.
- `EK.fill(tl, "#zone-lib", EK.cue(3), "xanhLa", { alpha: 0.16, dur: 0.9 })` — tô vùng giải phóng ở giai đoạn kết thúc.
- Tối đa 1 lần gọi `EK.camera` (≥ 1,5 s) nếu cần lia nhẹ; không phóng to/thu nhỏ lặp.

## Ví dụ

Xem ví dụ vàng `examples/vi-du-1/`: **Chiến dịch Điện Biên Phủ 1954 — 3 đợt tiến công** (56 ngày đêm, 13/3 – 7/5/1954) gồm `scene.json`, `plan.json` và `index.html`.

## Lỗi hay gặp

- Tự bịa toạ độ địa danh hoặc đặt nhãn đè lên mũi tên tiến công.
- Quên ô bản đồ định vị có Hoàng Sa, Trường Sa khi phóng lớn vào một khu vực hẹp.
- Vẽ cùng lúc toàn bộ mũi tên của cả 3 đợt khiến học sinh không theo kịp trình tự chiến dịch.
- Dùng màu cam làm màu chủ đạo hoặc chữ nhãn nhỏ hơn 36 px.

## Checklist

Xem `checklist.json` cho các luật kiểm tự động; người kiểm bằng mắt xác nhận:
- Bản đồ thể hiện đúng chủ quyền Việt Nam (Hoàng Sa, Trường Sa rõ ràng, không bị cắt).
- Các mũi tên tiến công (nét liền đỏ son) phân biệt rõ với mũi bao vây/rút lui (nét đứt) và xuất hiện đúng thứ tự từng đợt lời giảng.
- Không nhãn địa danh nào đè lên nhau, tràn khung hoặc lấn xuống vùng phụ đề `y ≥ 936`.
