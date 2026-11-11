---
name: ma-tran-dac-ta-7991
description: Lập ma trận và bản đặc tả đề kiểm tra theo Công văn 7991/BGDĐT-GDTrH từ mô tả đề của giáo viên (môn, lớp, thời lượng, chủ đề, tỉ lệ mức độ). Dùng khi giáo viên nhờ "lập ma trận đề", "làm bảng đặc tả", "chia số câu theo NB/TH/VD". Không dùng để viết nội dung câu hỏi (dùng cau-hoi-theo-yccd).
---

# Ma trận + bản đặc tả đề kiểm tra (CV 7991)

Đọc `references/cv7991.md` (dạng thức, điểm, tỉ lệ) và `references/bloom-muc-do.md` (ánh xạ Bloom → mức Việt) trước khi lập.

## Quy trình

1. **Đọc mô tả đề**: môn, lớp, thời lượng, loại đề (giữa kì/cuối kì/15 phút), danh sách chủ đề (nếu GV không nêu thì tự chọn các chủ đề trọng tâm đúng chương trình GDPT 2018 của môn/lớp, 3–8 chủ đề).
2. **Chốt khung điểm**: tổng đúng 10 điểm. Dùng điểm mỗi câu theo CV 7991 (xem reference): trắc nghiệm nhiều lựa chọn 0,25; đúng/sai tối đa 1,0; trả lời ngắn 0,25 (môn Toán 0,5); tự luận do GV định (mặc định 1 điểm/câu). Công thức kiểm: tổng = 0,25×(số câu nhiều lựa chọn) + 1×(số câu đúng/sai) + (0,25 hoặc 0,5)×(số câu trả lời ngắn) + 1×(số câu tự luận) phải bằng đúng 10; hãy tính ra số cụ thể trước khi trả.
3. **Chốt tỉ lệ mức độ** (điểm): nếu GV không nêu, dùng NB 40% – TH 30% – VD 30% (VD gồm cả vận dụng cao).
4. **Phân bổ ô** (chủ đề × mức × dạng câu × số câu): số điểm mỗi chủ đề tỉ lệ với số tiết/độ quan trọng; NB và TH ưu tiên dạng nhiều lựa chọn và đúng/sai; VD ưu tiên trả lời ngắn và tự luận. Mỗi ô phải có số câu nguyên dương.
5. **Viết yêu cầu cần đạt (yccd)** cho mỗi ô: một câu bắt đầu bằng động từ đúng mức (xem reference), bám chương trình GDPT 2018, cụ thể (không viết "hiểu bài").
6. **Tự kiểm**: cộng điểm = 10; tỉ lệ NB/TH/VD lệch không quá 5 điểm phần trăm so với mục tiêu; không ô nào trùng (cùng chủ đề + mức + dạng); mỗi chủ đề có ít nhất một ô; yccd khớp mức của ô. Nếu lệch, chỉnh số câu rồi mới trả.

## Đầu ra (chỉ trả JSON, không chữ thừa)

```json
{
  "title": "Kiểm tra giữa kì 1 – Toán 10",
  "durationMinutes": 45,
  "subject": "Toán",
  "grade": 10,
  "cells": [
    {"topic": "Mệnh đề và tập hợp", "level": "NB", "type": "mcq", "count": 4,
     "yccd": "Nhận biết được mệnh đề, mệnh đề phủ định, mệnh đề chứa biến."}
  ],
  "ghiChu": "Tổng 10 điểm; NB 40% – TH 30% – VD 30%."
}
```

- `level` ∈ `NB` | `TH` | `VD`. Mức vận dụng cao (VDC) ghi `VD` và mở đầu yccd bằng "(Vận dụng cao)".
- `type` ∈ `mcq` | `true_false` | `short_answer` | `essay`.
- Chủ đề viết đúng một tên nhất quán ở mọi ô cùng chủ đề (hệ thống ghép ô theo tên).
