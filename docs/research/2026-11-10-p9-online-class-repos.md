# P9 "Lớp học trực tuyến": repo nguồn mở để bóc / học theo

Ngày: 2026-11-10. Phạm vi: chỉ tra cứu (siêu dữ liệu `gh api` ngày 2026-11-09, đọc cây thư mục qua API, không clone). Ghi chú: `[CV]` = chưa xác minh được. Cột "Dùng" dùng 3 nhãn: **Mã** (MIT/Apache/BSD, được bóc/port mã), **Dependency** (cài làm thư viện, giữ nguyên giấy phép), **Ý tưởng** (GPL/AGPL/MPL/chưa rõ: chỉ đọc để học thiết kế, tự viết lại, không chép mã).

Nền hiện có (đã đọc `server/src/db/schema.ts`): `organizations`, `users(sub)`, `memberships(role)`, `questions(body jsonb, 4 dạng CV 7991)`, `exams(variants jsonb, durationMinutes, seed)`, `classes`, `students(classId, code, fullName, dob)`, `scores(studentId, term, column)`, `attendance`, `comments`. Chưa có: tài khoản HS, bài giao, bài nộp, khoá học, thông báo, nhật ký phòng thi.

## 1. LMS / lõi giao bài

| Repo | Giấy phép | Hoạt động (push, sao) | Ngôn ngữ | Dùng | Đáng bóc gì |
|---|---|---|---|---|---|
| [classroomio/classroomio](https://github.com/classroomio/classroomio) | AGPL-3.0 | 2026-11-09, 1,7k | TS (Svelte + Hono, Drizzle) | **Ý tưởng** | `packages/question-types/src/`: `question-type-registry.ts`, `render-contract.ts`, `answer-codecs.ts`, `question-scoring.ts`, `question-scoring-rules.ts`, `ADDING_A_QUESTION_TYPE.md`. Mẫu "registry dạng câu hỏi: mỗi dạng có codec đáp án + luật chấm + bộ render" khớp 4 dạng CV 7991 của ta. Cũng đáng xem `packages/db/src/schema.ts` (bảng course/lesson/submission), `apps/api/src/routes/{course,cohort,invite,report}`. Cùng stack TS + Drizzle nên đọc nhanh nhưng phải viết lại. |
| [frappe/lms](https://github.com/frappe/lms) | AGPL-3.0 | 2026-11-09, 3,4k | Python + Vue | **Ý tưởng** | Mô hình dữ liệu (`lms/lms/doctype/`): `lms_quiz` (trường: `shuffle_questions`, `limit_questions_to`, `duration`, `max_attempts`, `show_answers`, `show_submission_history`, `passing_percentage`, `enable_negative_marking`, `marks_to_cut`, `schedule_start/end`, `enable_proctoring`, `max_violations`), `lms_quiz_submission`, `lms_quiz_result`, **`lms_quiz_violation_log`** (`quiz_submission`, `event_type`, `severity`, `timestamp`), `lms_assignment(_submission)`, `lms_course_progress`, `lms_enrollment`, `lms_batch` (lớp), `lms_video_watch_duration`. Giao diện: `frontend/src/components/{Quiz.vue,ProctoringMonitor.vue}`, `pages/{QuizPage,QuizSubmission}.vue`. Bộ trường cấu hình phòng thi là danh sách kiểm tra tốt nhất tìm được. Lưu ý: bản mới dùng camera + nhận diện khuôn mặt (không hợp học sinh nhỏ, bỏ). |
| [moodle/moodle](https://github.com/moodle/moodle) | GPL-3.0 | 2026-10-30, 7,6k | PHP | **Ý tưởng** | `public/mod/quiz/report/statistics/classes/{calculator.php,calculated.php}` (facility, discriminative efficiency, thống kê theo lần làm); `public/question/type/{multichoice,truefalse,shortanswer,numerical,match,ordering}/questiontype.php` (luật chấm, phạt sai); `public/mod/quiz/classes/local/{access_rule_base.php,override_manager.php}` (luật truy cập: giờ mở/đóng, giới hạn thời gian, ngoại lệ theo HS). Nguồn tham chiếu nghiệp vụ. |
| [instructure/canvas-lms](https://github.com/instructure/canvas-lms) | AGPL-3.0 | 2026-04-30, 6,9k | Ruby + React | **Ý tưởng** | Mô hình Assignment / Submission / due_at / lock_at / override theo lớp-người (`app/models/assignment*.rb`, `submission.rb`) [CV: đường dẫn chưa mở]. Quá nặng, chỉ tham khảo khái niệm "ghi đè hạn cho từng HS". |
| [openedx/openedx-platform](https://github.com/openedx/openedx-platform) | AGPL-3.0 | 2026-11-09, 8,2k | Python | **Ý tưởng** | Mô hình khoá học (chương, bài, đơn vị) và tiến độ; cực nặng, không bóc. Chỉ dùng để đối chiếu cấu trúc cây `course > chapter > lesson`. |
| [oppia/oppia](https://github.com/oppia/oppia) | **Apache-2.0** | 2026-11-08, 7k | Python + Angular/TS | **Mã** (port TS) | `extensions/interactions/`: `NumericInput`, `FractionInput`, `NumericExpressionInput`, `AlgebraicExpressionInput`, `MathEquationInput`, `RatioExpressionInput`, `NumberWithUnits`, `TextInput`, `MultipleChoiceInput`, `ItemSelectionInput`, `DragAndDropSortInput`. Mỗi dạng có `answer-defs.ts`, `rule-input-defs.ts` (luật như `Equals`, `IsEquivalentTo`, `MatchesExactlyWith`), `interaction_specs.json`, `rule_templates.json`. Hợp nhất để viết luật chấm "trả lời ngắn" toán (phân số, tỉ số, biểu thức tương đương) cho dạng 3 của CV 7991. Port phần TS thuần, không kéo Angular. Công sức vừa. |

Kết luận mục 1: **không có LMS giấy phép rộng rãi nào nặng đủ để bóc nguyên module**; đa số là AGPL/GPL. Hướng đi: lấy Frappe + Moodle + ClassroomIO làm "đề bài thiết kế" (bảng, trường, trạng thái), tự viết bằng Drizzle; chỉ port mã từ Oppia (Apache) và các thư viện nhỏ ở dưới.

## 2. Thư viện nhỏ theo từng nhu cầu

| Nhu cầu | Repo | Giấy phép | Hoạt động | Dùng | Ghi chú / công sức |
|---|---|---|---|---|---|
| Ôn giãn cách (P6, dùng chung bảng `review_cards`) | [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) | MIT | 2026-11-09, 862 sao | **Dependency** | `npm i ts-fsrs`, gói `packages/fsrs` (scheduler, models, reschedule), `packages/binding` cho tham số tối ưu. Lưu `due/stability/difficulty/state/lapses` trong 1 dòng cho mỗi (HS, câu hỏi). Công sức: 0,5 ngày. |
| Mô hình câu hỏi/đáp án chuẩn | [Citolab/qti-components](https://github.com/Citolab/qti-components) (GPL-3.0, 18 sao); [agencyenterprise/qti-3-player](https://github.com/agencyenterprise/qti-3-player) (MIT, 3 sao, 2026-04) | GPL / MIT | tích cực / thưa | **Ý tưởng** (Citolab) / xem xét (agency) | QTI 3 là chuẩn xuất/nhập đề; chỉ cần nếu muốn liên thông LMS khác. Chưa cần ở P9: giữ JSON riêng của ta. Mức nhỏ, giữ trong danh sách "sau". |
| Lưu nháp offline phía trình duyệt | [dexie/Dexie.js](https://github.com/dexie/Dexie.js) | Apache-2.0 | 2026-11-09, 14,7k | **Dependency** | IndexedDB có `liveQuery`; dùng làm hàng đợi `pending_answers` (khoá `attemptId+questionId`). `localForage` (Apache, 25,8k) đã ngừng cập nhật từ 2024-07: bỏ. |
| Gom đồng bộ / thử lại | [TanStack/query](https://github.com/TanStack/query) (MIT, 50k) + [TanStack/pacer](https://github.com/TanStack/pacer) (MIT, 795) | MIT | 2026-11 | **Dependency** | `useMutation` có `networkMode: 'offlineFirst'`, `retry`; Pacer cho debounce/batch autosave. Công sức: 1 ngày cho `useAutosave`. |
| Tab-leave / proctoring-lite | (không có thư viện đáng dùng) | n/a | n/a | tự viết | Chỉ cần `document.visibilitychange`, `window.blur/focus`, `fullscreenchange`, `online/offline`, `paste/copy` (tuỳ chọn). Tham khảo bảng `lms_quiz_violation_log` của Frappe (loại sự kiện + mức độ + thời điểm). 1 bảng `attempt_events`. 0,5 ngày. |
| QR cho thẻ HS | [soldair/node-qrcode](https://github.com/soldair/node-qrcode) (MIT, 8,2k, push 2024-08) | MIT | ổn định, ít cập nhật | **Dependency** | `QRCode.toString(svg)` phía server cho PDF thẻ; có `kozakdenys/qr-code-styling` (MIT, 3k) nếu cần QR có logo. |
| Đọc/ghi Excel | [exceljs/exceljs](https://github.com/exceljs/exceljs) (MIT, 15,5k, **push 2025-01**), [SheetJS](https://github.com/SheetJS/sheetjs) (Apache-2.0, bản npm cũ, bản mới phát qua CDN riêng) | MIT / Apache | exceljs ít cập nhật | **Dependency** | Cần giữ định dạng mẫu (gộp ô, tiêu đề): exceljs dễ hơn. Nếu repo đã có sẵn một thư viện xlsx từ P3 thì giữ thư viện đó. |
| Thông báo trong ứng dụng đa kênh | [novuhq/novu](https://github.com/novuhq/novu) | MIT lõi, có thư mục `ee` [CV] (SPDX báo NOASSERTION) | 2026-11-09, 40k | **Ý tưởng** | Quá nặng cho trường học nhỏ; học mô hình `notification` + `subscriber` + `read/seen`. |
| Web Push | [web-push-libs/web-push](https://github.com/web-push-libs/web-push) | MPL-2.0 [CV: SPDX NOASSERTION] | 2026-11-09, 3,6k | **Dependency** (MPL cho dùng như thư viện, không chép mã) | `webpush.sendNotification(sub, payload)`, VAPID. Dùng cho thông báo hạn nộp ngoài tab. Công sức 1 ngày (bảng `push_subscriptions`, service worker). |
| Hàng đợi việc nền (nhắc hạn, đóng bài, chấm lô) | [timgit/pg-boss](https://github.com/timgit/pg-boss) (MIT, 4,1k), [graphile/worker](https://github.com/graphile/worker) (MIT, 2,4k) | MIT | tích cực | **Dependency** | Cùng Postgres, khỏi thêm Redis. pg-boss có `sendDebounced`/`singletonKey` cho "đóng bài lúc hạn". Chọn pg-boss. |
| Giới hạn tốc độ / bảo vệ quá tải | [fastify/fastify-rate-limit](https://github.com/fastify/fastify-rate-limit), [fastify/under-pressure](https://github.com/fastify/under-pressure) | MIT | 2026-10/11 | **Dependency** | Khoá giới hạn theo `attemptId` cho endpoint autosave; `under-pressure` trả 503 + `Retry-After` khi event-loop trễ (client tự thử lại có jitter). |
| SSE / WebSocket cho chuông thông báo | [fastify/fastify-websocket](https://github.com/fastify/fastify-websocket) (MIT, 467), [websockets/ws](https://github.com/websockets/ws) | MIT | tích cực | **Dependency** | P9 không cần kênh hai chiều: SSE (một route Fastify tự viết) đủ cho "có thông báo mới"; client rơi về thăm dò 30 s. |

Thư viện QTI/IRT thật sự đáng dùng: **không tìm được**. IRT trong JS chỉ có để chấm/CAT ([yeatmanlab/jsCAT](https://github.com/yeatmanlab/jsCAT) MIT 20 sao, `@geekie/irt` ~4 tải/tuần), không có hiệu chỉnh Rasch/2PL từ dữ liệu; hiệu chỉnh phải làm bằng R/Python ngoài. Với lớp 30–100 HS, IRT không ổn định, **dùng thống kê cổ điển (CTT)**, xem mục 3.

## 3. Phân tích câu hỏi (CTT) bằng SQL

Công thức (nguồn tóm tắt: [MetricGate](https://metricgate.com/docs/discrimination-index-item-analysis/), [CSU East Bay](https://www.csueastbay.edu/testing/faculty/auto/score-reports/discriminative-analysis.html), cách Moodle ở `report/statistics/classes/calculator.php`):
- Độ khó (facility) p = tỉ lệ điểm đạt / điểm tối đa của câu (với câu nhiều ý lấy điểm/maxScore).
- Phân biệt D = p(nhóm cao 27%) − p(nhóm thấp 27%); hoặc tương quan điểm-nhị phân (point-biserial) = `corr(item_score, total_score)` ([CV: dùng `corr()` của Postgres là suy luận, cần thử]).
- Mồi nhử (distractor): đếm lựa chọn theo nhóm cao/thấp cho dạng trắc nghiệm.
- Chỉ báo "yếu theo chủ đề": tỉ lệ đúng theo `questions.topic` và `level`, so với trung bình lớp/khối.

Thiết kế bảng cho 1.000+ HS: **bảng phẳng `answer_items`** (một dòng cho mỗi câu của mỗi lần làm) thay vì nhét vào jsonb:

```sql
-- answer_items(attempt_id, student_id, assignment_id, question_id, topic, level,
--              score real, max_score real, correct bool, choice text, answered_at)
-- chỉ mục: (assignment_id, question_id), (student_id, topic)
WITH tot AS (
  SELECT attempt_id, sum(score) total
  FROM answer_items WHERE assignment_id = $1 GROUP BY attempt_id
), g AS (
  SELECT a.*, t.total,
         ntile(100) OVER (ORDER BY t.total) pct   -- hoặc percent_rank()
  FROM answer_items a JOIN tot t USING (attempt_id)
  WHERE a.assignment_id = $1
)
SELECT question_id,
       avg(score/NULLIF(max_score,0))                                   AS p_khó,
       avg(score/NULLIF(max_score,0)) FILTER (WHERE pct > 73)
     - avg(score/NULLIF(max_score,0)) FILTER (WHERE pct <= 27)          AS d_phân_biệt,
       corr(score, total)                                               AS r_pb,
       count(*)                                                         AS n
FROM g GROUP BY question_id ORDER BY p_khó;
```

Yếu theo chủ đề cho một HS/lớp: `GROUP BY topic` trên cùng bảng; cho lớp lớn dùng **vật hoá** `MATERIALIZED VIEW class_topic_stats` làm tươi bằng pg-boss sau khi đóng bài (không cần thời gian thực). Cờ cảnh báo: n < 10 thì không tính D; p < 0,3 hoặc D < 0,2 = "xem lại câu"; p > 0,9 = "quá dễ" [ngưỡng phổ biến, chinhan chốt lại].

## 4. Tài khoản HS dưới 13 tuổi không email (Keycloak)

Phát hiện: **không tìm được ví dụ hoàn chỉnh** "realm cho trẻ em + thẻ QR" sẵn dùng. Những gì có thật và dùng được:
- Keycloak: `username` là trường bắt buộc duy nhất khi tạo người dùng, email tuỳ chọn khi tắt "Email as username" ([Admin guide 24](https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/24.0/html/server_administration_guide/assembly-managing-users_server_administration_guide)). Không nên bật "Email as username" vì khó đảo ngược ([diễn đàn](https://forum.keycloak.org/t/user-email-and-password-to-log-in-to-the-app-instead-of-username-and-password/12788)). `[CV]` Keycloak 26 User Profile: cấu hình thuộc tính `email` không bắt buộc cho vai trò `student`.
- Thiết kế đề xuất (tự dựng, `[CV]` cần thử với Keycloak thật):
  1. Realm hiện có, nhóm/vai `student`, `parent`. Tên đăng nhập = `<mã-trường>.<mã-HS>` (ví dụ `thcs-a.8a-014`), mật khẩu ngẫu nhiên 8 ký tự bỏ ký tự dễ nhầm (không 0/O/1/l), bật `Temporary` = false cho trẻ nhỏ.
  2. GV bấm "Cấp tài khoản" → server gọi Admin REST tạo user hàng loạt (dịch vụ riêng có quyền `manage-users` hẹp), sinh PDF thẻ có QR (`node-qrcode`).
  3. QR không chứa mật khẩu thật: chứa **mã đổi một lần** (`/vao?c=<token>`, băm lưu DB, hết hạn 7 ngày, dùng 1 lần, ràng buộc lớp). Máy chủ đổi mã này lấy phiên: hoặc (a) gọi Keycloak direct grant bằng mật khẩu đã giữ mã hoá tạm, hoặc (b) cài một authenticator SPI "badge token" trong Keycloak. Mục (b) mới sạch nhưng cần Java; ví dụ gần nhất: [Keycloak extensions list](https://www.keycloak.org/extensions) có "QR login another device", [IBM Verify blog](https://community.ibm.com/community/user/blogs/austin-bruch1/2019/11/22/cloud-identity-keycloak-integration) mô tả authenticator QR dùng Authenticator SPI, và tutorial [email-link authenticator](https://dev.to/yakovlev_alexey/how-to-create-a-keycloak-plugin-3acj) làm mẫu khung SPI.
  4. Token Exchange chuẩn (V2) từ Keycloak 26.2 **không** hỗ trợ giả danh người dùng (`requested_subject`), nên không dùng hướng này ([báo cáo](https://glama.ai/mcp/servers/@cbcoutinho/nextcloud-mcp-server/blob/8603ed114ef62221798e2332cf68aa5dc2b548a4/docs/oauth-impersonation-findings.md), [bài Skycloak](https://skycloak.io/blog/keycloak-token-exchange-practical-guide/); thứ cấp, `[CV]`).
  5. Phương án gọn hơn cho P9: **phiên lớp học nội bộ** (cookie do EDUVN ký) cho HS dưới 13, chỉ có quyền "làm bài/xem điểm của mình", không dùng Keycloak; Keycloak chỉ giữ GV, phụ huynh, HS trên 13. Dễ nhất, nhưng phải tự xử lý quên mật khẩu bằng "GV cấp lại thẻ".
- Liên kết phụ huynh: bảng `guardianships(parent_user_id, student_id)` tự tạo; mã mời in trên thẻ HS.
- Pháp lý: Nghị định 13/2023 về bảo vệ dữ liệu cá nhân, trẻ em cần sự đồng ý của cha mẹ `[CV]`; cân nhắc khi lưu họ tên + ngày sinh.

## 5. Mẫu nhập VNEdu / SMAS

**Không tìm được tệp mẫu hay mô tả cột chính thức** qua tìm kiếm công khai (nhiều lượt tìm; chỉ có hướng dẫn chung "xuất file mẫu từ hệ thống, điền, nhập lại", ví dụ [THPT Hoàng Văn Thụ](https://thpt-hoangvanthu.ninhbinh.edu.vn/wp-content/uploads/2026/04/385983a3-6ac8-409d-9f40-059b19dfcb09.pdf), [hoatieu: nhập điểm VNEdu](https://dienthoaivui.com.vn/vnedu-giao-vien-nhap-diem), [hoatieu: SMAS](https://hoatieu.vn/bieu-mau/cach-in-phieu-ghi-diem-hoc-ba-trong-smas-201778)). Mọi bố cục cột dưới đây là `[CV]`:

| Hệ thống | Bố cục dự kiến `[CV]` | Cách xử lý đề xuất |
|---|---|---|
| VNEdu (GV bộ môn) | Hàng tiêu đề chứa: STT, Mã học sinh (mã MOET/ID), Họ và tên, Ngày sinh, rồi nhóm cột điểm: TX (ĐĐGtx), GK, CK, TB; theo học kỳ | Không đoán. Lấy **một tệp xuất thật** từ tài khoản GV trường (chinhan hoặc GV thử), đặt vào `fixtures/exports/vnedu-*.xlsx`, ghi test giữ nguyên ô gộp/tiêu đề. |
| SMAS (Viettel) | Điểm miệng / 15 phút / 1 tiết / học kỳ (hệ cũ TT58); với TT22 là nhận xét + điểm kiểm tra định kỳ `[CV]` | Như trên: nhập từ tệp mẫu xuất ra, khớp cột bằng **tên tiêu đề đã chuẩn hoá** (bỏ dấu, hạ chữ), không theo vị trí cột. |

Cách thiết kế chịu lỗi: mô-đun `export/templates/{vnedu,smas}.ts` mỗi cái = {khớp tiêu đề, bản đồ `GradeColumn` ↔ cột}, và màn "xem trước + báo cột chưa khớp". Ghi nhận trong `classes.columns` đã có `GradeColumn`, nên ánh xạ chủ yếu là tên cột. Không có repo nào đáng bóc: tìm "vnedu" trên GitHub chỉ ra các app Android/bài tập nhỏ không liên quan.

## 6. Hiệu năng: 1.000+ HS nộp bài đồng thời

Không có repo cụ thể đáng bóc; các mẫu sau dựng từ Postgres + Fastify (đều tự viết, nhỏ):
1. **Autosave theo lô, idempotent**: client giữ hàng đợi Dexie, gửi `PUT /attempts/:id/answers` mỗi 5–10 s hoặc khi đổi câu, body = `{seq, answers:[{qid, value, clientTs}]}`; server `INSERT ... ON CONFLICT (attempt_id, question_id) DO UPDATE ... WHERE excluded.seq > answer_drafts.seq` (chống đến muộn/đảo thứ tự). Một câu lệnh `unnest` cho cả lô.
2. **Nộp idempotent**: `POST /attempts/:id/submit` với `Idempotency-Key`; chuyển trạng thái `in_progress → submitted` bằng `UPDATE ... WHERE status='in_progress' RETURNING`; gọi lại trả kết quả cũ. Server luôn chấm lại từ bản nháp đã lưu, không tin điểm từ client.
3. **Giờ do server**: lưu `started_at`, `deadline_at = least(started_at + duration, assignment.close_at)` khi bắt đầu; đồng hồ client chỉ hiển thị (đồng bộ bằng `serverNow` trong mỗi phản hồi autosave). Hết giờ: pg-boss đóng và chấm các lần chưa nộp (có thêm 10–30 s ân hạn cho mạng chậm).
4. **Xáo trộn theo HS, có thể tái lập**: hạt giống = hash(`attemptId`) đưa vào `rng.ts` đã có; chọn `variants[i]` của `exams` theo `i = hash % n`; đáp án đúng không bao giờ gửi xuống trình duyệt khi `show_answers=false` (chỉ gửi sau nộp).
5. **Chấm lô**: trắc nghiệm chấm đồng bộ trong giao dịch nộp (ms); tự luận/ảnh đẩy sang pg-boss → cổng AI.
6. **Chống bão**: `fastify-rate-limit` theo attempt; `under-pressure` trả 503 + `Retry-After`; client thử lại có jitter. Ước lượng: 1.000 HS × 1 yêu cầu / 8 s ≈ 125 req/s ghi nhỏ, Postgres đơn lẻ chịu được `[CV: cần đo bằng k6/autocannon]`.
7. **Nhật ký phòng thi**: `attempt_events(attempt_id, kind, at, meta)` ghi theo lô cùng autosave; chỉ ghi "rời tab / thoát toàn màn hình / mất mạng / dán", mặc định chỉ báo GV, không tự huỷ bài (tránh phạt oan khi rớt mạng).

## 7. Ánh xạ vào lược đồ (đề xuất bảng mới)

| Chức năng P9 | Bảng mới (tham chiếu bảng sẵn có) | Lấy ý từ |
|---|---|---|
| Tài khoản HS, mã vào lớp, thẻ | `student_accounts(student_id→students, user_id→users NULL, login_name, pass_hash NULL)`, `class_join_codes(class_id, code, expires_at)`, `badge_tokens(student_id, token_hash, expires_at, used_at)` | Frappe `lms_enrollment`/`lms_batch`, mục 4 |
| Phụ huynh chỉ đọc | `guardianships(parent_user_id→users, student_id→students)` + vai `parent` trong `memberships` | tự thiết kế |
| Giao bài | `assignments(class_id, exam_id→exams NULL, question_set jsonb, open_at, due_at, close_at, duration_min, settings jsonb{shuffle, show_answers, max_attempts, proctor})`, `assignment_overrides(assignment_id, student_id, due_at)` | Frappe `lms_quiz`, Moodle `override_manager.php`, Canvas overrides |
| Làm / nộp | `attempts(id, assignment_id, student_id, variant_idx, seed, started_at, deadline_at, submitted_at, status, score)`, `answer_drafts(attempt_id, question_id, value jsonb, seq)`, `answer_items(...)` (mục 3), `attempt_events(...)` | Frappe `lms_quiz_submission`, `lms_quiz_violation_log` |
| Khoá học | `courses(org_id, class_id NULL, title)`, `chapters`, `lessons(kind: text/video/file/quiz, body, media)`, `lesson_progress(student_id, lesson_id, status, watched_s)` | Frappe `lms_course/chapter/lesson/course_progress/video_watch_duration`; ClassroomIO |
| Thông báo | `notifications(user_id, kind, payload jsonb, created_at, read_at)`, `push_subscriptions` | Novu (mô hình) + web-push |
| Ôn giãn cách (chung với P6) | `review_cards(student_id, question_id, due, stability, difficulty, state, lapses)` | ts-fsrs |
| Thống kê | `MATERIALIZED VIEW class_item_stats`, `class_topic_stats` | mục 3 |
| Xuất VNEdu/SMAS | không có bảng; mô-đun `export/templates/*` đọc `scores` + `classes.columns` | mục 5 |

## 8. Chọn dùng / bóc phần nào (rút gọn)

1. **ts-fsrs** (MIT) làm dependency cho ôn giãn cách. Giá trị cao, 0,5 ngày.
2. **Oppia `extensions/interactions/*` luật chấm** (Apache-2.0) port sang TS cho dạng "trả lời ngắn": phân số, số, biểu thức tương đương, tỉ số; dùng chung với `mathText.ts` + MathLive. 2–3 ngày.
3. **Dexie + TanStack Query/Pacer** (Apache/MIT) cho autosave và offline; **pg-boss** (MIT) cho đóng bài/nhắc hạn/chấm lô; **fastify-rate-limit + under-pressure** (MIT) chống bão nộp.
4. **node-qrcode** (MIT) + exceljs (MIT, giữ nếu đã dùng) cho thẻ HS và xuất Excel; **web-push** (MPL-2.0, chỉ làm thư viện) cho đẩy thông báo.
5. **Tự viết bằng cách đọc**: Frappe LMS (bộ trường quiz + `lms_quiz_violation_log`, tiến độ khoá học), Moodle `report/statistics/calculator.php` + `override_manager.php`, ClassroomIO `packages/question-types` (registry dạng câu hỏi). Chỉ đọc cấu trúc, không chép mã (AGPL/GPL).
6. **CTT bằng SQL** (mục 3) thay vì IRT; bảng phẳng `answer_items` là quyết định lược đồ quan trọng nhất của P9.
7. HS dưới 13: cân nhắc "phiên lớp học nội bộ + thẻ QR mã dùng một lần" (mục 4 phương án 5) trước khi viết Java SPI cho Keycloak.
8. VNEdu/SMAS: xin **tệp xuất thật** trước khi code mẫu (mục 5).

## 9. Tránh

- Chép mã từ ClassroomIO, Frappe LMS, Canvas, Open edX (AGPL), Moodle, Citolab qti-components (GPL): sẽ buộc mở mã toàn bộ sản phẩm khi phục vụ qua mạng. Chỉ đọc ý tưởng.
- Nhúng nguyên Moodle / Canvas / Open edX làm "lõi": nặng, khác stack, mất sổ điểm TT22/27 và ngân hàng câu hỏi của ta.
- Proctoring bằng camera / nhận diện khuôn mặt (Frappe `ProctoringMonitor.vue`): quá xâm phạm cho học sinh, lệch với "proctoring-lite".
- IRT (2PL/Rasch) ở lớp nhỏ: không ổn định, thiếu thư viện JS để hiệu chỉnh.
- `localForage` (ngừng cập nhật 2024-07); Novu cho việc gửi thông báo (quá nặng); Redis/BullMQ (pg-boss đủ).
- Dựa vào Keycloak Token Exchange V2 để "giả danh" HS; cần phiên bản preview/legacy `[CV]`.
- Đoán cột VNEdu/SMAS khi chưa có tệp mẫu thật.

## Nguồn chính

[ClassroomIO](https://github.com/classroomio/classroomio) · [Frappe LMS](https://github.com/frappe/lms) · [Moodle](https://github.com/moodle/moodle) · [Oppia](https://github.com/oppia/oppia) · [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) · [Dexie](https://github.com/dexie/Dexie.js) · [pg-boss](https://github.com/timgit/pg-boss) · [web-push](https://github.com/web-push-libs/web-push) · [jsCAT](https://github.com/yeatmanlab/jsCAT) · [Keycloak token exchange 26.2](https://www.keycloak.org/2025/05/standard-token-exchange-kc-26-2) · [Keycloak extensions](https://www.keycloak.org/extensions)
