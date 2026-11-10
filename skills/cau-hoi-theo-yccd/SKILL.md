---
name: cau-hoi-theo-yccd
description: Sinh câu hỏi kiểm tra bám yêu cầu cần đạt (YCCĐ) của chương trình GDPT 2018 theo bốn dạng của CV 7991 (nhiều lựa chọn, đúng/sai, trả lời ngắn, tự luận), gắn mức NB/TH/VD, kiểm phương án nhiễu. Dùng khi giáo viên nhờ "tạo câu hỏi", "ra đề theo yêu cầu cần đạt", "thêm câu vào ngân hàng". Không dùng để lập ma trận (dùng ma-tran-dac-ta-7991).
---

# Câu hỏi theo yêu cầu cần đạt

Đọc `references/bloom-dong-tu.md` và `references/dang-cau-hoi.md` trước khi viết.

## Quy trình

1. **Xác định đích**: môn, lớp, chủ đề, YCCĐ (GV nêu hoặc tự lấy từ chương trình GDPT 2018), mức (NB/TH/VD), dạng câu, số câu.
2. **Một câu = một YCCĐ + một mức**: động từ trong YCCĐ quyết định mức; câu hỏi phải đòi hỏi đúng hành động nhận thức đó, không thấp hơn, không cao hơn.
3. **Viết thân câu (stem)** rõ, đủ dữ kiện, không gợi đáp án, không phủ định kép. Công thức viết LaTeX trong cặp `$…$` (dấu đô la thường viết `\$`).
4. **Dạng nhiều lựa chọn (`mcq`)**: 4 phương án, đúng 1 (`answer` = chỉ số 0–3). Mỗi phương án nhiễu phải bắt nguồn từ một lỗi sai có thật của học sinh (nhầm dấu, nhầm công thức, áp dụng thiếu điều kiện…); độ dài và hình thức các phương án tương đương; không dùng "tất cả đều đúng/sai"; vị trí đáp án đúng phân bố đều khi sinh nhiều câu.
5. **Dạng đúng/sai (`true_false`)**: 4 ý a–d độc lập, mỗi ý kiểm một khía cạnh khác nhau của cùng tình huống; `answer` là 4 giá trị true/false, không để cả 4 giống nhau trừ khi có lí do sư phạm.
6. **Dạng trả lời ngắn (`short_answer`)**: đáp án duy nhất, là số hoặc biểu thức ngắn; nêu rõ đơn vị, quy tắc làm tròn trong đề.
7. **Dạng tự luận (`essay`)**: viết `rubric` theo từng ý với điểm thành phần cộng đúng `points`.
8. **Lời giải (`explanation`)**: ngắn, nêu lí do đáp án đúng và (với `mcq`) vì sao mỗi phương án nhiễu sai.
9. **Tự kiểm**: đáp án đúng thật sự (tự giải lại); đúng mức; không hai câu trùng ý; không lộ đáp án qua câu chữ.

## Đầu ra (chỉ trả JSON)

```json
{"questions": [
  {"type": "mcq", "subject": "Toán", "grade": 10, "topic": "Mệnh đề", "level": "TH",
   "stem": "Mệnh đề phủ định của \"$\\forall x\\in\\mathbb{R},\\ x^2\\ge 0$\" là",
   "options": ["$\\exists x\\in\\mathbb{R},\\ x^2<0$", "$\\forall x\\in\\mathbb{R},\\ x^2<0$", "$\\exists x\\in\\mathbb{R},\\ x^2\\le 0$", "$\\forall x\\in\\mathbb{R},\\ x^2\\le 0$"],
   "answer": 0, "explanation": "...", "tags": ["yccd: ..."]},
  {"type": "true_false", "...": "statements: 4 ý, answer: [true,false,true,false]"},
  {"type": "short_answer", "...": "answer: \"3,5\""},
  {"type": "essay", "...": "rubric: \"...\", points: 2"}
]}
```

Mọi câu có đủ `subject`, `grade`, `topic`, `level`, `stem`. Ghi YCCĐ vào `tags` dạng `"yccd: <nội dung>"`; câu vận dụng cao thêm tag `"VDC"` (level vẫn là `VD`).
