---
name: bien-doi-lanh-tho
description: Hoạt hình lịch sử thể hiện sự hình thành, mở rộng không gian lãnh thổ và xác lập chủ quyền biển đảo Việt Nam (Hoàng Sa, Trường Sa) qua các mốc thời kỳ trên nền bản đồ Natural Earth góc nhìn Việt Nam (_vnm). Dùng khi bài giảng trình bày quá trình phát triển lãnh thổ, kinh đô qua các triều đại hoặc lịch sử bảo vệ chủ quyền Biển Đông. Historical territory evolution, dynastic capital shifts, Vietnam maritime sovereignty map.
license: Proprietary (EDUVN)
metadata:
  ten: "Biến đổi lãnh thổ"
  engine: hf
  mon: su,dia
  lop: 6-12
  loai: ban-do,thoi-gian
  can: dia-danh>=2,moc-thoi-gian>=2
  tranh: "định nghĩa,công thức,biểu đồ nhiệt ẩm"
  tuKhoa: "lãnh thổ,biên giới,mở cõi,kinh đô,Đại Cồ Việt,Đại Việt,Đàng Trong,Đàng Ngoài,Hoàng Sa,Trường Sa,chủ quyền,biển đảo"
  thoiLuong: 14-40
  fallback: dong_thoi_gian
  kit: map,place,fill,arrow,enter,mark
  version: "1"
  nguon: "NaturalEarth vnm,hf:world-map,OHM(mô hình)"
  vaiTro: chinh
---

## Khi dùng

- Bài giảng trình bày quá trình hình thành và mở rộng không gian lãnh thổ Việt Nam từ thế kỷ X đến thế kỷ XIX (Hoa Lư → Thăng Long → Phú Xuân → Gia Định).
- Bài giảng chuyên đề lịch sử bảo vệ chủ quyền, các quyền và lợi ích hợp pháp của Việt Nam ở Biển Đông (Quần đảo Hoàng Sa, Quần đảo Trường Sa thời chúa Nguyễn và triều Nguyễn).
- Cần liên kết sự dịch chuyển kinh đô/trung tâm hành chính với đường mốc thời gian.

## Không dùng

- Bài giảng chỉ miêu tả các mũi tiến công chiến thuật của một trận đánh ngắn ngày (dùng `ban-do-chien-dich`).
- Bài giảng Địa lí thuần về mật độ dân số hay cơ cấu kinh tế theo tỉnh hiện nay (dùng `ban-do-chu-de` của gói Địa).

## Ý sư phạm

Giữ đường bờ Việt Nam toàn vẹn (`_vnm`) làm nền tham chiếu nhất quán và tô dần các dải không gian phát triển theo từng thế kỷ, giúp học sinh thấy rõ sự liền mạch từ Bắc vào Nam và ra hai quần đảo Hoàng Sa, Trường Sa.

- Beat 0 (câu 0): Hiện bản đồ Việt Nam toàn cảnh (`_vnm`, đầy đủ QĐ. Hoàng Sa và QĐ. Trường Sa) và tô không gian Đại Cồ Việt – Đại Việt thế kỷ X–XI (Hoa Lư 968, Thăng Long 1010).
- Beat 1 (câu 1): Mở rộng xuống miền Trung thế kỷ XV–XVI (Thuận Hoá, Phú Xuân, thương cảng Hội An).
- Beat 2 (câu 2): Mở cõi vào Nam Bộ (Gia Định 1698) và vẽ tuyến hải trình đội Hoàng Sa, đội Bắc Hải thực thi chủ quyền trên QĐ. Hoàng Sa và QĐ. Trường Sa từ thế kỷ XVII.
- Beat 3 (câu 3): Hoàn thiện dải lãnh thổ thống nhất đầu thế kỷ XIX (đo đạc, cắm mốc 1816–1836) cùng thẻ chốt lịch sử chủ quyền.

## Dữ liệu lấy từ lời giảng

- Các mốc thế kỷ/năm và tên kinh đô/địa danh trích từ slide và đối chiếu với `services/anim-kit-data/dia-danh-lich-su.json` (`hoa-lu`, `thang-long-ha-noi`, `phu-xuan-hue`, `hoi-an`, `gia-dinh-sai-gon`, `hoang-sa`, `truong-sa`).
- Tuân thủ tuyệt đối quy ước chủ quyền tại `references/chu-quyen-bien-dao-viet-nam.md`.

## Bố cục

- Lưới 12 cột 1920×1080, sân khấu `y: 150..900`, dải phụ đề `y ≥ 936` để trống.
- Cột 1–6 (`ek-col-1 ek-span-6`): khung bản đồ toàn cảnh Việt Nam và Biển Đông cao 740 px (tỉ lệ dọc vừa khít hình chữ S + Hoàng Sa + Trường Sa).
- Cột 7–12 (`ek-col-7 ek-span-6`): tiêu đề bài giảng, thanh mốc giai đoạn ngang gọn và các thẻ diễn giải từng giai đoạn (`.ek-card`).

## Chuyển động

Bản đồ hiện ở beat 0 rồi lần lượt tô dần từng vùng không gian bằng `EK.fill`, nối hải trình ra Hoàng Sa – Trường Sa bằng `EK.arrow`, đồng bộ thanh mốc giai đoạn.

- `EK.enter(tl, "#map-vn", EK.b(0))` — hiện bản đồ nền `_vnm` với nhãn `QĐ. Hoàng Sa`, `QĐ. Trường Sa`, `Biển Đông`.
- `EK.fill(tl, "#zone-bac", EK.cue(0), "lam", { alpha: 0.25, dur: 0.8 })` — tô vùng Bắc Bộ thế kỷ X–XI.
- `EK.fill(tl, "#zone-trung", EK.cue(1), "lucLam", { alpha: 0.25, dur: 0.8 })` — mở rộng miền Trung.
- `EK.fill(tl, "#zone-nam", EK.cue(2), "xanhLa", { alpha: 0.25, dur: 0.8 })` và `EK.arrow(tl, "#sea-hs, #sea-ts", EK.cue(2) + 0.5, 1.1)` — mở rộng Nam Bộ và hải trình Hoàng Sa, Trường Sa.
- `EK.mark(tl, "#kw-chuquyen", EK.cue(3) + 0.6, "highlight", { color: "accent" })` — nhấn thông điệp kết luận.

## Ví dụ

Xem ví dụ vàng `examples/vi-du-1/`: **Không gian lãnh thổ và chủ quyền biển đảo Việt Nam (thế kỷ X – XIX)** gồm `scene.json`, `plan.json` và `index.html`.

## Lỗi hay gặp

- Cắt mất quần đảo Trường Sa ở cạnh dưới hoặc Hoàng Sa ở cạnh phải do chọn khung chiếu quá hẹp.
- Dùng màu tô quá đậm làm chìm đường bờ biển hoặc giảm tương phản chữ địa danh.
- Tự chế biên giới hành chính hiện đại vào bản đồ cổ đại mà không ghi rõ chú thích nền tham chiếu.

## Checklist

Xem `checklist.json`; kiểm bằng ảnh chụp thực tế:
- Bản đồ sử dụng nền Natural Earth `_vnm`, thể hiện đầy đủ và rõ ràng QĐ. Hoàng Sa và QĐ. Trường Sa thuộc Việt Nam.
- Tiến trình mở rộng không gian chạy đúng thứ tự thời gian từ Bắc vào Nam và ra biển đảo.
- Chữ ≥ 36 px, không đè nhau, không lấn vào vùng phụ đề `y ≥ 936`.
