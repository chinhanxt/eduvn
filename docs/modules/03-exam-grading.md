# 03 · Ra đề, đáp án, chấm (P1; chấm từ ảnh ở P7)

**Mục tiêu:** từ ma trận ra N mã đề + đáp án + file Word trong vài giây; chấm đúng quy tắc CV 7991.

| | |
|---|---|
| **Đầu vào** | Ma trận `{subject, grade, cells[{topic, level, type, count}]}`, số mã đề, thời gian, `seed?`; bài làm `{ "1": 2, "13": [true,false,true,true], "17": "1,5" }` |
| **Đầu ra** | `examId`, mã đề `101…`, đáp án theo mã, `.docx` đề + đáp án (link ký 15 phút), kết quả chấm `{total, autoMax, pendingEssay, items}` |
| **Quy tắc điểm** | `PointRules` cấu hình được; mặc định spec R4.1; Toán tự dùng 0,5đ trả lời ngắn |
| **Code** | `server/src/domain/{matrix,variants,scoring,rng}.ts`, `server/src/export/docx.ts` |

**Để sau:** bản đặc tả đề tự sinh · điểm theo câu tuỳ chỉnh · chấm phiếu bằng ảnh (P7) · công thức Word thật.

**Xong khi:** thiếu câu → báo ô thiếu; cùng seed → cùng đề; chấm bài làm đúng hết = `autoMax`; .docx mở được bằng Word/LibreOffice.
