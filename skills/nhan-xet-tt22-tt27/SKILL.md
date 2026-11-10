---
name: nhan-xet-tt22-tt27
description: Gợi ý nhận xét học sinh theo Thông tư 22/2021 (THCS, THPT - mức Tốt/Khá/Đạt/Chưa đạt) và Thông tư 27/2020 (tiểu học - Hoàn thành tốt/Hoàn thành/Chưa hoàn thành) từ điểm số, chuyên cần và ghi chú của giáo viên. Mỗi nhận xét đi theo thứ tự điểm mạnh, điều cần cải thiện, bước tiếp theo; đúng mức, cụ thể, không sáo rỗng, không nêu tên học sinh. Dùng khi giáo viên nhờ viết nhận xét sổ điểm/học bạ.
---

# Nhận xét học sinh theo TT22 / TT27

Đọc `references/tt22-tt27.md` (mức, ngưỡng) và `references/mau-cau.md` (mẫu câu, từ cấm) trước khi viết.

## Đầu vào

JSON: `{"scale":"TT22"|"TT27","subject":"…","term":"HK1"|"HK2","students":[{"id":"…","dtb":7.4,"scores":{"Thường xuyên 1":8,…},"attendance":{"present":30,"excused":1,"unexcused":0},"note":"ghi chú của GV (có thể rỗng)","levelHint":"Khá"}]}`.
Chỉ dùng `id` để định danh; đầu vào không có tên học sinh.

## Quy trình cho từng học sinh

1. **Chọn mức** (`level`) trong đúng thang của `scale`. Nếu có `levelHint` thì dùng đúng mức đó. TT22 theo ĐTB: ≥ 8,0 Tốt; ≥ 6,5 Khá; ≥ 5,0 Đạt; dưới 5,0 Chưa đạt. TT27 (không có điểm số): dựa trên ghi chú; không có ghi chú thì mặc định "Hoàn thành".
2. **Điểm mạnh** — một nhận định có bằng chứng từ dữ liệu (một cột điểm cao, tiến bộ, chuyên cần tốt, điều GV ghi). Không bịa sự kiện không có trong dữ liệu.
3. **Điều cần cải thiện** — một việc cụ thể, nói mềm, theo mức: mức cao thì nêu thách thức nâng cao; mức Chưa đạt/Chưa hoàn thành thì nêu đúng kiến thức/kĩ năng còn hổng, không quy chụp.
4. **Bước tiếp theo** — một hành động cụ thể em làm được trong học kì tới (làm lại dạng bài, đọc thêm, nhờ bạn/GV hỗ trợ), kèm sự phối hợp của gia đình nếu cần.
5. **Độ dài** 40–300 ký tự (giới hạn hệ thống 20–400), đúng 2–3 câu (nhắc phối hợp gia đình, nếu cần, gộp vào câu bước tiếp theo, không thêm câu thứ tư), xưng "Em" hoặc nói chủ ngữ ẩn; văn phong tôn trọng, tích cực nhưng trung thực.
6. **Tránh**: tên riêng, so sánh với bạn khác, nhãn tính cách ("lười", "kém"), câu chung chung có thể áp cho mọi học sinh ("Em ngoan, cần cố gắng hơn"), lặp nguyên một mẫu cho nhiều học sinh (mỗi nhận xét khác nhau về chi tiết và cấu trúc câu), nhắc đến chẩn đoán y tế/hoàn cảnh gia đình.
7. **Tự kiểm**: mức đúng thang; có đủ ba thành phần; không tên; không hai nhận xét giống nhau quá 60% từ.

## Đầu ra (chỉ trả JSON)

```json
{"items": [{"id": "…", "level": "Khá", "text": "Em nắm chắc kiến thức nền và làm bài kiểm tra thường xuyên ổn định. Em cần rèn thêm bước trình bày lập luận ở bài vận dụng. Học kì tới, em chọn mỗi tuần một bài khó để tự giải và nhờ thầy cô góp ý."}]}
```

Số phần tử `items` bằng số học sinh đầu vào, cùng `id`.
