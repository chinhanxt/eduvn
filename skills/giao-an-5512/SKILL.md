---
name: giao-an-5512
description: Soạn kế hoạch bài dạy (giáo án) theo Công văn 5512/BGDĐT-GDTrH, Phụ lục IV - mục tiêu kiến thức/năng lực/phẩm chất, thiết bị, 4 hoạt động (Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng) mỗi hoạt động có a) mục tiêu b) nội dung c) sản phẩm d) tổ chức thực hiện 4 bước. Dùng khi giáo viên nhờ soạn giáo án, kế hoạch bài dạy. Có thể sinh từng mục.
---

# Giáo án theo CV 5512

Đọc `references/cv5512.md` (cấu trúc) và `references/nang-luc-pham-chat.md` (năng lực, phẩm chất theo GDPT 2018) trước khi viết.

## Chế độ (dòng đầu của yêu cầu có dạng `CHẾ ĐỘ: …`)

- `CHẾ ĐỘ: khung` — chỉ sinh phần chung và dàn ý 4 hoạt động.
- `CHẾ ĐỘ: hoat_dong N` (N = 1–4) — viết đầy đủ hoạt động N, dựa vào khung đã cho, không lặp nội dung hoạt động khác.
- `CHẾ ĐỘ: toan_bo` (hoặc không ghi chế độ) — sinh trọn giáo án một lượt.

## Quy trình

1. **Đọc đầu vào**: môn, lớp, tên bài, số tiết, ghi chú của GV. Thiếu thì suy luận hợp lí theo chương trình GDPT 2018, không hỏi lại.
2. **Mục tiêu trước** (thiết kế ngược): viết 3–5 mục tiêu kiến thức bằng động từ đo được (nêu, giải thích, tính, vận dụng…), 1–2 năng lực chung, 1–2 năng lực đặc thù của môn, 1–2 phẩm chất. Mọi hoạt động sau phải phục vụ ít nhất một mục tiêu.
3. **Thiết bị, học liệu**: liệt kê cụ thể (SGK, máy chiếu, phiếu học tập số…, vật liệu thí nghiệm), không viết chung chung.
4. **Dàn ý 4 hoạt động**, đúng thứ tự: 1 Mở đầu (tạo tình huống, xác định vấn đề), 2 Hình thành kiến thức mới (có thể chia 2.1, 2.2…), 3 Luyện tập (bài tập có phân tầng), 4 Vận dụng (tình huống thực tiễn/dự án nhỏ). Tổng thời lượng khớp số tiết (45 phút/tiết).
5. **Mỗi hoạt động** phải đủ:
   - `goal` (a): học sinh làm được gì sau hoạt động.
   - `content` (b): nhiệm vụ cụ thể giao cho học sinh (câu hỏi, bài tập, thảo luận…), kèm thời gian.
   - `product` (c): sản phẩm học sinh tạo ra, nêu rõ đáp án/kết quả mong đợi.
   - `steps` (d): bốn bước `assign` (chuyển giao nhiệm vụ), `perform` (thực hiện nhiệm vụ), `report` (báo cáo, thảo luận), `conclude` (kết luận, nhận định); mỗi bước nói rõ GV làm gì và HS làm gì, không để trống.
6. **Tự kiểm**: có đúng 4 hoạt động; không trường nào rỗng; hoạt động 2 hoặc có `subs` (khi đó để trống goal/content/product/steps cấp hoạt động 2) hoặc không có `subs`; hoạt động 3 và 4 không lặp lại ví dụ của hoạt động 2; mục tiêu ↔ sản phẩm khớp nhau.

## Đầu ra (chỉ trả JSON)

Toàn bộ:
```json
{"header": {"subject": "Toán", "grade": 10, "title": "Mệnh đề", "periods": 2},
 "objectives": {"knowledge": ["…"], "competencies": {"general": ["…"], "specific": ["…"]}, "qualities": ["…"]},
 "materials": ["…"],
 "activities": [
   {"name": "…", "goal": "…", "content": "…", "product": "…",
    "steps": {"assign": "…", "perform": "…", "report": "…", "conclude": "…"}},
   {"subs": [ {"name": "…", "goal": "…", "content": "…", "product": "…", "steps": {"assign": "…", "perform": "…", "report": "…", "conclude": "…"}} ]},
   {"…": "hoạt động 3"}, {"…": "hoạt động 4"}]}
```
Chế độ `khung`: `{"header":…, "objectives":…, "materials":…, "outline":[{"name":"…","gist":"1–2 câu nội dung chính","minutes":8} ×4]}`.
Chế độ `hoat_dong N`: một object hoạt động (hoặc `{"subs":[…]}` cho hoạt động 2 khi cần).
Công thức viết LaTeX trong `$…$`. Tiếng Việt có dấu.
