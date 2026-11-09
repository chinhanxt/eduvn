# P9 — Lớp học trực tuyến (spec, 2026-11-10)

Quyết định theo giao quyền của chinhan (2026-11-09): tối ưu, mượt, hiệu năng tốt; cho cả học sinh phổ thông lẫn sinh viên đại học.

Nguồn: `docs/research/2026-11-09-online-school-pain-points.md` (top 10) và `docs/research/2026-11-10-p9-online-class-repos.md` (repo tái chế).

P9 gồm 2 phần, mỗi phần một plan riêng:
- **P9a (lõi):** tài khoản HS, giao bài, phòng làm bài, chấm, kết quả, thống kê.
- **P9b:** trang khoá học, thông báo, góc phụ huynh, ôn câu sai (ts-fsrs), xuất Excel theo mẫu sở.

## 1. Danh tính học sinh

Có 2 đường đăng nhập. Cả 2 cùng ra một **StudentActor** `{ studentId, classId, orgId }`.

| Đường | Dành cho | Cách |
|---|---|---|
| **Thẻ lớp** | HS phổ thông, nhất là dưới 13 tuổi, không email | GV bấm "Cấp mã" cho lớp. Mỗi HS có `pin` (6 số, lưu băm scrypt) và thẻ in sẵn gồm mã lớp, số thứ tự, PIN và QR. Đăng nhập bằng mã lớp + số thứ tự + PIN, hoặc quét QR. QR chứa token ký HS256 kèm `badgeVersion`; GV đổi version là thu hồi được. |
| **Tài khoản Keycloak** | SV, HS lớn, GV muốn cho HS dùng Google | Đăng nhập OIDC như hiện nay, rồi nhập **mã tham gia** lớp (6 ký tự, bảng chữ không nhầm lẫn, GV bật/tắt được). Lõi tạo dòng `students` mới, hoặc gắn vào dòng có sẵn khi trùng họ tên + ngày sinh và GV xác nhận. Lưu `students.user_id`. |

- Phiên HS là JWT do lõi tự ký (`jose`, issuer `eduvn-student`, sống 12 giờ, có `ver`), gửi qua `Authorization: Bearer`. Lõi nhận cả token Keycloak lẫn token HS. Mọi route `/api/student/*` chỉ nhận StudentActor.
- **Chống dò PIN:** sai 5 lần trong 10 phút thì khoá số thứ tự đó 10 phút, theo cặp (lớp, số thứ tự) và theo IP. Thông báo lỗi luôn chung chung.
- Quyền: thêm hành động `assignment:manage` (GV, owner, admin), `assignment:read` (thêm trợ giảng) và `student:credentials` (GV).

## 2. Giao bài

**Bảng `assignments`:**

| Cột | Ý nghĩa |
|---|---|
| `id`, `org_id`, `class_id`, `owner_id` | Định danh và chủ sở hữu |
| `title` | Tên bài |
| `kind` | `practice` (luyện tập) hoặc `test` (kiểm tra) |
| `source` | `{ examId }` hoặc `{ questionIds }` |
| `variants` | jsonb: **bản chụp** câu hỏi lúc giao, tạo bằng `domain/variants.ts`; sửa ngân hàng sau đó không ảnh hưởng |
| `rules` | Thang điểm (`rulesForSubject`) |
| `opens_at`, `due_at` | Thời điểm mở và hạn nộp |
| `duration_minutes` | Thời lượng; `null` = không giới hạn trong cửa sổ mở |
| `attempts_allowed` | Số lượt làm, mặc định 1 cho `test` và 3 cho `practice` |
| `show_solution` | `after_submit`, `after_due` hoặc `never` |
| `shuffle` | Có đảo câu hay không |
| `status` | `draft`, `published` hoặc `closed` |
| `created_at` | Thời điểm tạo |

- Mỗi HS nhận một mã đề: đề nhiều mã thì chia đều theo vị trí trong danh sách; nếu `shuffle` thì đảo thêm thứ tự câu trong phần bằng seed của submission (giữ đúng thứ tự các phần theo CV 7991).
- GV cũng tạo được bài từ một nhóm câu trong ngân hàng (lọc theo chủ đề và mức độ, chọn tay), không cần qua đề.

## 3. Phòng làm bài

**Bảng `submissions`:**

| Cột | Ý nghĩa |
|---|---|
| `id`, `assignment_id`, `student_id`, `attempt` | Định danh |
| `variant_code`, `seed` | Mã đề và seed đảo câu của lượt này |
| `started_at` | Lúc bắt đầu |
| `deadline_at` | Máy chủ tính: `min(started_at + duration, due_at)` |
| `submitted_at`, `status` | Trạng thái: `in_progress`, `submitted` hoặc `auto_submitted` |
| `answers` | jsonb `{ [no]: ResponseValue }` |
| `seq` | Số thứ tự lần lưu, chống ghi đè ngược |
| `score`, `max_score` | Điểm và điểm tối đa |
| `leave_count` | Số lần rời tab |
| `updated_at` | Lần cập nhật cuối |

Ràng buộc: unique `(assignment_id, student_id, attempt)`.

- **Tự lưu:**
  - Trình duyệt ghi mỗi thay đổi vào IndexedDB (Dexie) ngay lập tức.
  - Cứ 3 giây (có thay đổi), hoặc khi rời trang, thì gửi `PUT /api/student/submissions/:id/answers {seq, answers}`.
  - Máy chủ chỉ chạy một câu `UPDATE … WHERE id=$1 AND seq<$2 AND status='in_progress' AND now()<=deadline_at+grace`.
  - Bị mất mạng thì vẫn làm bài bình thường, có mạng lại thì gửi bản mới nhất.
- **Nộp bài:** `POST …/submit {seq, answers}` chạy idempotent; nộp lại trả đúng kết quả cũ. Quá `deadline_at` + 30 giây ân hạn thì từ chối lưu và chốt bài bằng bản đã lưu.
- **Tự nộp khi hết giờ:**
  - Không cần hàng đợi việc nền.
  - Mỗi lần đọc bài thì chốt luôn nếu đã quá hạn.
  - Thêm một vòng quét mỗi phút chốt các bài quá hạn và ghi `auto_submitted`.
- **Rời tab:** bắt `visibilitychange`/`blur`, cộng `leave_count`, ghi vào `submission_events (submission_id, at, kind)`. GV xem được. Không dùng camera.
- **Giao diện làm bài:**
  - Một câu mỗi màn trên điện thoại; danh sách câu trên máy tính.
  - Bảng số câu (đã làm, đánh dấu xem lại), đồng hồ đếm ngược theo giờ máy chủ, trạng thái lưu ("Đã lưu", "Đang lưu…", "Mất mạng – vẫn lưu trên máy").
  - Câu trả lời ngắn dùng ô công thức (MathLive). Đúng/sai là 4 công tắc.

## 4. Chấm, kết quả, thống kê

- **Chấm khi nộp:** dùng `scoreItem` và `rulesForSubject` có sẵn. Tự luận để "chờ chấm" (GV chấm tay ở trang kết quả; chấm bằng AI để P7). Ghi bảng phẳng `answer_items (submission_id, assignment_id, no, question_id, topic, level, type, points, max_points, correct)`.
- **Trả lời ngắn:** chuẩn hoá theo luật của Oppia (Apache-2.0, chép lại sang TS):
  - bỏ khoảng trắng thừa;
  - dấu phẩy thập phân bằng dấu chấm;
  - so số với sai số tương đối 1e-9;
  - chấp nhận nhiều đáp án tách bằng `|`.
  - Số: dấu phẩy là thập phân; dấu chấm theo nhóm 3 chữ số là phân cách hàng nghìn; đơn vị/phần trăm chỉ khớp khi đáp án có ghi. Đáp án dạng `3.141`/`2.000` bị từ chối khi nhập vì mơ hồ.
- **Kết quả cho HS:** điểm, từng câu đúng/sai, lời giải và đáp án theo `show_solution`.
- **Thống kê cho GV** (SQL trên `answer_items`):
  - tỉ lệ nộp;
  - phân bố điểm;
  - từng câu: độ khó p = điểm trung bình / tối đa, độ phân biệt = chênh lệch giữa nhóm 27% cao và 27% thấp;
  - đáp án nhiễu được chọn nhiều;
  - chủ đề yếu theo tỉ lệ đúng;
  - danh sách HS cần quan tâm.
- **Theo dõi trực tiếp:** trang GV xem ai đang làm, đã nộp, rời tab mấy lần. Trang tự hỏi lại mỗi 5 giây; có cache 2 giây phía máy chủ.

## 5. Hiệu năng (mục tiêu đo được)

- Bài thử tải `scripts/load-p9.mjs` (autocannon, Postgres thật trong docker): **1.000 HS**, mỗi em tự lưu mỗi 3 giây trong 2 phút, rồi cả lớp nộp trong 10 giây.
- Mục tiêu trên máy dev:
  - tự lưu: p95 < 150 ms;
  - nộp: p95 < 400 ms;
  - 0 lỗi 5xx;
  - không mất câu trả lời: số đáp án lưu cuối cùng phải bằng số đáp án đã gửi.
- Cách đạt:
  - mỗi lần lưu chỉ một câu `UPDATE` theo khoá chính, không đọc trước;
  - token HS kiểm bằng HS256 trong bộ nhớ, không gọi DB;
  - chấm và ghi `answer_items` trong một giao dịch lúc nộp;
  - `@fastify/under-pressure` trả 503 có `Retry-After` khi quá tải, máy khách tự gửi lại;
  - giới hạn tần suất theo HS (`@fastify/rate-limit`).

## 6. Ngoài phạm vi P9a

Để P9b:
- trang khoá học;
- thông báo;
- phụ huynh;
- ôn câu sai;
- xuất Excel theo mẫu VNEdu/SMAS (**cần chinhan gửi một tệp xuất thật**, vì không có mẫu công khai).

Để P7: chấm tự luận bằng AI.
