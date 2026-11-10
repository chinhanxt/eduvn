# Bốn dạng câu hỏi theo CV 7991 và cách kiểm

| Dạng | Cấu trúc trong hệ thống | Kiểm bắt buộc |
|---|---|---|
| mcq | `stem`, `options` (đúng 4), `answer` 0–3 | 1 đáp án đúng duy nhất; mỗi nhiễu từ một lỗi sai thật; độ dài tương đương |
| true_false | `stem`, `statements` (đúng 4), `answer` (4 boolean) | 4 ý độc lập, không ý nào phụ thuộc đáp án ý khác |
| short_answer | `stem`, `answer` (chuỗi) | đáp án duy nhất sau khi chuẩn hoá (dấu phẩy thập phân tương đương dấu chấm) |
| essay | `stem`, `rubric`, `points` | thang chấm cộng đúng bằng `points` |

Công thức: LaTeX trong `$…$`; mọi `$` phải đóng cặp. Tiếng Việt có dấu, đơn vị đo ghi rõ.
Các lỗi hay gặp của phương án nhiễu cần tránh: nhiễu vô lí (ai cũng loại được), hai phương án cùng đúng, đáp án đúng luôn dài nhất, phương án "cả A và B".
