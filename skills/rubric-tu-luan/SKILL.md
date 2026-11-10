---
name: rubric-tu-luan
description: Lập rubric (thang chấm theo tiêu chí) cho câu hỏi tự luận hoặc bài tập, theo thang điểm Việt Nam (tổng điểm 10 hoặc điểm của câu), mỗi tiêu chí có các mức mô tả cụ thể. Dùng khi giáo viên cần thang chấm, hoặc khi hệ thống chấm bài tự luận/viết tay bằng AI theo từng tiêu chí.
---

# Rubric chấm tự luận

Đọc `references/thang-diem-viet.md` và `references/mau-rubric.md`.

## Quy trình

1. **Đọc đề, đáp án mẫu (nếu có), tổng điểm** `totalPoints` (điểm của câu hoặc 10 cho cả bài).
2. **Xác định 3–6 tiêu chí** phản ánh đúng điều đề yêu cầu (nội dung/kiến thức, lập luận/phương pháp, kết quả, trình bày; với văn: ý, bố cục, dùng từ, sáng tạo). Mỗi tiêu chí đo một điều, không chồng lấn.
3. **Chia điểm**: tổng `maxPoints` của các tiêu chí bằng `totalPoints`; tiêu chí trọng tâm điểm cao hơn; điểm là bội của 0,25.
4. **Mức mô tả** cho từng tiêu chí: 3–4 mức (đầy đủ, một phần, sơ sài, không đạt), mỗi mức có `points` giảm dần và `descriptor` quan sát được ("nêu đúng cả 3 bước…", "thiếu điều kiện xác định…"), không dùng từ mơ hồ ("tốt", "khá") đứng một mình.
5. **Quy tắc đặc biệt** trong `notes`: chấp nhận cách giải khác đúng bản chất; không trừ điểm lặp lỗi dây chuyền (sai kết quả trước làm sai kết quả sau thì chỉ trừ một lần); làm tròn đến 0,25.
6. **Tự kiểm**: tổng điểm đúng; mức cao nhất của mỗi tiêu chí = `maxPoints`; mức thấp nhất = 0; hai người chấm độc lập sẽ cho điểm gần nhau.

## Đầu ra (chỉ trả JSON)

```json
{"totalPoints": 3,
 "criteria": [
   {"name": "Kiến thức và nội dung", "maxPoints": 1.5,
    "levels": [{"label": "Đầy đủ", "points": 1.5, "descriptor": "…"}, {"label": "Một phần", "points": 0.75, "descriptor": "…"}, {"label": "Chưa đạt", "points": 0, "descriptor": "…"}]}
 ],
 "notes": "…"}
```
