# Kế hoạch mockup theo bản đồ toàn bộ

Nguồn: sơ đồ `toan-bo.html` (148 chức năng, 14 mảng). Mọi mục "Mô phỏng", "Sắp làm" hay "Đang làm" chưa có màn đều được làm thành **màn mô phỏng**.

**Cách làm chung cho mọi màn:**
- Dữ liệu mẫu lấy từ `web/src/demo/kit` (thế giới mẫu: `docs/demo/the-gioi-mau.md`).
- Không gọi server.
- Chữ AI hiện dần bằng `useFakeStream` + `<StreamingText>`.
- Thao tác bấm được, có trạng thái và chuyển động.
- Có nhãn `<MockBadge/>`.
- Theo `docs/design/chuan-dep.md`.

## Gói A — Cổng GV: Soạn, bài giảng, giấy tờ (`web/src/demo/gv-soan/`, route `/gv/...`)
| Màn | Mục bao phủ |
|---|---|
| Tạo bài giảng AI (wizard) | duyệt · sửa dàn ý, nghiên cứu web khi soạn, ảnh minh hoạ AI, nhân bản giọng |
| Trình sửa bài giảng | editor kéo thả · hoàn tác, đọc lại từng câu, đổi giọng |
| Xuất bản | PowerPoint gốc · Office Math, HTML offline · gói zip, nhập PPTX, QR, xuất video có tiến độ |
| Studio hoạt hình | AI tự sáng tác, kho 87 skill, bộ chọn skill, tự kiểm khung |
| Infographic | biến nội dung bài thành infographic (dùng `@antv/infographic` nếu cài được, không thì mô phỏng bằng SVG) |
| Giấy tờ | Kế hoạch bài dạy CV 5512, sổ đầu bài, báo cáo tổ, nhập VNEdu · SMAS một chạm |
| Tổ chuyên môn | thư viện học liệu tổ, chia sẻ · nhân bản, duyệt đề tổ, thư viện khoá học |
| Dạy theo năng lực | gợi ý hoạt động dạy học tích cực theo năng lực CTGDPT 2018 |

## Gói B — Cổng GV: Lớp học AI, công cụ, trợ lý (`web/src/demo/gv-lop/`)
| Màn | Mục bao phủ |
|---|---|
| Lớp học AI | GV AI · trợ giảng · bạn học AI, bàn tròn tranh luận, hỏi bằng giọng, ngắt lời, AI vẽ bảng trắng, AI điều khiển mô phỏng, quiz chấm AI, thẻ kết khoá |
| Bạn đồng hành | bạn đồng hành, nhóm tranh luận, phòng tập tư vấn |
| Workbench | chat để soạn khoá, 45 công cụ · 24 skill, công bố · nhân bản, tour, cài như app |
| Kho công cụ | "Bạn cần công cụ gì?", AI tạo công cụ, khối dựng sẵn, tự kiểm, kho mở (PhET, phân tử, Python · Blockly, bản đồ · thiên văn, nhạc lý), công cụ chuẩn các môn (gồm 5 gói môn), cộng đồng GV |
| Giao bài phân hoá | AI chia nhóm theo trình độ, 3 mức bài, giao một chạm |
| Chống ChatGPT | bài tập chống AI, nhận diện bài làm bằng AI |
| Trợ lý lớp (AI của GV) | "3 em cần giúp, vì sao" + gợi ý giảng lại |
| Cài đặt AI & hệ thống | Whisper · đọc mọi file, tìm web SearXNG, AI local tại trường, mạng yếu · offline, trạng thái |

## Gói C — Cổng Học: tự học + AI hồ sơ (`web/src/demo/hoc/`, route `/hoc/...`)
| Màn | Mục bao phủ |
|---|---|
| Hồ sơ AI của em | bản đồ năng lực, đường quên, lỗi đặc trưng, nhịp học, mục tiêu, "AI biết gì về em" (sửa · quên), học bạ sống cấp 2 → ĐH |
| Gia sư hiểu mình | gia sư tác tử, trí nhớ dài hạn, hai em – hai cách giảng (Minh Anh / Gia Bảo) |
| Vòng lặp lỗ hổng | phát hiện → bài vừa sức → kiểm lại, sổ câu sai |
| Sổ tay học tập | sổ nguồn, hỏi có trích dẫn, podcast 2 giọng, ghi chú · Co-Writer |
| Nghiên cứu sâu | câu hỏi → cây truy vấn → nguồn → báo cáo trích dẫn |
| Đọc & xem | đọc tài liệu nhập vai, học qua video có ghi chú theo mốc |
| Lịch học | lịch, nhắc ôn đúng lúc sắp quên |
| Ôn thi & hướng nghiệp | ôn THPT/ĐH theo năng lực, gợi ý ngành – trường từ hồ sơ |

## Gói D — Cổng Phụ huynh + Nhà trường (cổng mới, công khai: `/phu-huynh/*`, `/truong/*`; `web/src/demo/phu-huynh/`, `web/src/demo/truong/`)
| Màn | Mục bao phủ |
|---|---|
| Phụ huynh — Con hôm nay | vào bằng link/QR, 1 màn: xanh/vàng/đỏ, việc tối nay, nghe đọc to, chữ to |
| Phụ huynh — Kèm con | "cách kèm con 10 phút" dễ hiểu, infographic tuần, hỏi cô bằng giọng, xem tin Zalo |
| Nhà trường — Toàn trường | bức tranh toàn trường, so sánh lớp · GV, cảnh báo sớm |
| Nhà trường — Sức khoẻ & AI phối hợp | sức khoẻ tinh thần (chỉ báo GV chủ nhiệm), tín hiệu chạy HS → GV → phụ huynh |
| Nhà trường — Quản trị | quản lý người dùng, nhật ký kiểm toán, AI nhà trường |
