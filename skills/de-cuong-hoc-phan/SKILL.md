---
name: de-cuong-hoc-phan
description: Xây dựng đề cương chi tiết học phần đại học theo hướng chuẩn đầu ra (OBE) - thông tin học phần, chuẩn đầu ra học phần (CLO), ma trận CLO-PLO, kế hoạch giảng dạy theo tuần, đánh giá thành phần có trọng số và rubric, học liệu. Dùng khi giảng viên nhờ soạn đề cương học phần, syllabus. Luồng ADDIE chia hai pha.
---

# Đề cương học phần (đại học)

Đọc `references/obe-clo-plo.md` (CLO, PLO, ma trận) và `references/addie-vi.md` (luồng) trước khi viết.

## Luồng ADDIE rút gọn (ý từ instructional_agents)

- **Phân tích (Analyze)**: đọc tên học phần, ngành, trình độ, số tín chỉ, PLO của chương trình đào tạo (nếu GV cho), yêu cầu riêng. Xác định người học và điều kiện tiên quyết.
- **Thiết kế (Design)**: viết CLO bằng động từ Bloom đo được → nối với PLO → thiết kế đánh giá thành phần để đo từng CLO → chia tuần.
- **Phát triển (Develop)**: viết nội dung từng tuần, hoạt động, học liệu.
- GV duyệt từng pha (người thật luôn là bước cuối).

## Pha (dòng đầu yêu cầu có dạng `PHA: …`)

- `PHA: khung` — Phân tích + Thiết kế: thông tin chung, mô tả, CLO, ma trận CLO–PLO, đánh giá thành phần.
- `PHA: ke_hoach` — Phát triển: kế hoạch giảng dạy theo tuần + học liệu, dựa trên khung đã cho.
- `PHA: toan_bo` (hoặc không ghi) — cả hai pha trong một lượt.

## Quy tắc

1. **CLO**: 4–7 CLO, mỗi CLO một động từ Bloom, đo được, nêu bối cảnh; đánh số CLO1, CLO2…; có đủ từ mức nhớ/hiểu đến vận dụng/phân tích; không trùng ý.
2. **PLO**: nếu GV không cho danh sách PLO, tự đặt 4–6 PLO hợp lí cho ngành (đánh số PLO1…) và nói rõ trong `ghiChu` là PLO giả định cần đối chiếu chương trình đào tạo.
3. **Ma trận CLO–PLO**: mỗi CLO nối ít nhất 1 PLO; mỗi PLO được nối bởi ít nhất 1 CLO; mức đóng góp `I` (giới thiệu), `R` (củng cố), `M` (thành thạo).
4. **Đánh giá thành phần**: trọng số cộng đúng 100%; mỗi CLO được đo bởi ít nhất một thành phần; hình thức phù hợp (chuyên cần, bài tập, bài tập lớn/đồ án, giữa kì, cuối kì); mỗi thành phần ghi tiêu chí/rubric ngắn.
5. **Kế hoạch tuần**: số tuần = số tuần của học kì (mặc định 15); tổng số tiết lí thuyết + thực hành khớp số tín chỉ (1 tín chỉ = 15 tiết lí thuyết hoặc 30 tiết thực hành); mỗi tuần có chủ đề, CLO đạt, hoạt động dạy-học, nhiệm vụ tự học; tuần ôn tập/kiểm tra rõ ràng; tiến trình từ cơ bản đến nâng cao.
6. **Học liệu**: giáo trình chính 1–2, tham khảo 2–4. Chỉ ghi tài liệu có thật bạn chắc chắn; nếu không chắc, ghi mô tả loại tài liệu cần chọn và đánh dấu "GV bổ sung".

## Đầu ra (chỉ trả JSON)

```json
{
  "name": "Nhập môn lập trình", "code": "IT1010", "credits": 3, "level": "Đại học năm 1",
  "hours": {"lecture": 30, "practice": 30, "selfStudy": 90},
  "prerequisites": ["Không"],
  "description": "…",
  "plos": [{"code": "PLO1", "text": "…"}],
  "clos": [{"code": "CLO1", "text": "Giải thích được …", "bloom": "Hiểu"}],
  "cloPlo": [{"clo": "CLO1", "plo": [{"code": "PLO1", "level": "I"}]}],
  "assessment": [{"component": "Chuyên cần", "weight": 10, "method": "…", "clos": ["CLO1"], "criteria": "…"}],
  "schedule": [{"week": 1, "topic": "…", "clos": ["CLO1"], "activities": "…", "selfStudy": "…"}],
  "materials": {"main": ["…"], "reference": ["…"]},
  "ghiChu": ""
}
```
Pha `khung` bỏ `schedule` và `materials`; pha `ke_hoach` chỉ trả `{"schedule":[…],"materials":{…}}`.
