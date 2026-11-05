# 02 · Ngân hàng câu hỏi (P1)

**Mục tiêu:** kho câu hỏi chuẩn hoá theo chương trình VN, đủ dữ liệu để ra đề theo ma trận CV 7991.

| | |
|---|---|
| **Đầu vào** | Câu hỏi JSON (từ AI chat qua `them_cau_hoi`, REST `POST /api/questions`); sau này: import Word/Excel |
| **Đầu ra** | Câu hỏi đã kiểm (`StoredQuestion`), tìm theo môn/lớp/chủ đề/mức độ/dạng |
| **Dạng câu** | `mcq` · `true_false` · `short_answer` · `essay` (spec R2) |
| **Code** | `server/src/domain/question.ts`, `server/src/db/repo.ts` |

**Để sau:** gắn yêu cầu cần đạt (YCCĐ) theo CT GDPT 2018 · import .docx · trùng lặp/gần trùng · ảnh trong câu hỏi · công thức MathType.

**Xong khi:** câu sai cấu trúc bị từ chối kèm lỗi zod; lọc đúng; câu tổ chức A không lộ sang B.
