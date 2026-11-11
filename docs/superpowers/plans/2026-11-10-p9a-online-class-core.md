# P9a — Lớp học trực tuyến (lõi): tài khoản HS, giao bài, phòng làm bài, chấm, kết quả, thống kê — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GV cấp thẻ lớp (mã lớp + số thứ tự + PIN + QR) hoặc mở mã tham gia cho tài khoản Google/Keycloak; giao bài từ đề hoặc từ nhóm câu ngân hàng; HS làm bài trên điện thoại ở `/hs` (tự lưu IndexedDB + máy chủ mỗi 3 giây, đồng hồ theo giờ máy chủ, mất mạng vẫn làm, bắt rời tab), nộp idempotent, tự nộp khi hết giờ; chấm ngay (trả lời ngắn so khớp kiểu Oppia), HS xem kết quả theo cài đặt lời giải; GV theo dõi trực tiếp (5 giây), xem bảng điểm, thống kê CTT (p, D, đáp án nhiễu, chủ đề yếu, HS cần quan tâm), chấm tay tự luận; AI giao bài/xem kết quả qua MCP. Chịu được 1.000 HS tự lưu + nộp dồn (đo bằng autocannon trên Postgres thật).

**Architecture:**
- Danh tính HS tách khỏi Keycloak: lõi tự ký phiên HS (HS256, `jose`, issuer `eduvn-student`, audience `hs-session`, 12 giờ, claim `ver` = `students.badge_version`). Thẻ QR = JWT HS256 audience `hs-badge` (không hết hạn, thu hồi bằng tăng `badge_version`). Ba đường vào cùng ra một `StudentActor { studentId, classId, orgId, ver }`: mã lớp + số thứ tự + PIN (scrypt), QR, token Keycloak + mã tham gia. Route `/api/student/*` chỉ nhận phiên HS (trừ 3 route đăng nhập).
- Logic thuần trong `server/src/domain/`: `shortAnswer.ts` (so khớp trả lời ngắn), `assignment.ts` (cài đặt bài, mã đề, thứ tự câu, câu gửi HS không lộ đáp án, hạn + ân hạn 30 giây, chấm ra `answer_items`, mức xem kết quả), `analytics.ts` (CTT, theo dõi, bảng điểm), `studentAuth.ts` (mã, PIN, số thứ tự, chống dò PIN).
- Dịch vụ mới: `services/credentials.ts` (thẻ lớp, đăng nhập HS), `services/assignments.ts` (GV), `services/submissions.ts` (HS). Route ở file mới `http/student.ts`, `http/classroom.ts`; `http/app.ts` chỉ thêm dây nối, `@fastify/rate-limit` (theo bài làm) và `@fastify/under-pressure` (503 + `Retry-After`).
- Đường nóng: tự lưu = **một** câu `UPDATE … WHERE id AND student_id AND seq < $seq AND status='in_progress' AND deadline_at >= now−30s RETURNING`; phiên HS kiểm bằng HMAC trong bộ nhớ (khoá nhập sẵn), không đọc DB. Nộp = một giao dịch (`SELECT … FOR UPDATE` → chấm → `UPDATE` → `INSERT answer_items`). Không có hàng đợi việc nền: chốt bài quá hạn khi đọc + vòng quét 60 giây trong tiến trình (`sweepMs`).
- Web: khu HS `/hs` (bố cục riêng, ưu tiên điện thoại, CSS tiền tố `hs-`), module thuần `web/src/student/*.ts` (đồng hồ máy chủ, hàng đợi tự lưu Dexie, bắt rời tab, gửi lại có nhiễu) test bằng vitest; trang lớp GV thêm 4 tab (CSS tiền tố `lh-`), in thẻ QR bằng `qrcode`.

**Tech Stack:** Như P1–P4 + G (Node 24, pnpm 12, TS 7, Fastify 5, Drizzle 0.45, PGlite, jose 6, zod 4, React 19, Vite 8, MathLive). Thêm ở `server/`: `@fastify/rate-limit@^11.2.2`, `@fastify/under-pressure@^9.2.1`, dev `autocannon@^9.0.0`. Thêm ở `web/`: `dexie@^4.4.7`, `qrcode@^1.5.4`, dev `@types/qrcode@^1.5.6`.

**Spec:** `docs/specs/2026-11-10-p9-lop-hoc-truc-tuyen.md` (P9a) · Khảo sát repo: `docs/research/2026-11-10-p9-online-class-repos.md` · Mockup đã dựng: `web/mockup/lop-hoc.html` (màn 1–4 HS, 5–8 GV) · Thiết kế chung: `docs/specs/2026-11-05-eduvn-design.md`.

## Global Constraints

- Node `>=24`, pnpm workspace, TypeScript ESM `strict: true`. Mọi lệnh chạy từ gốc repo `~/projects/eduvn`.
- Thư viện tối thiểu (spec gốc): `fastify@^5.12.8`, `@modelcontextprotocol/sdk@^1.32.2`, `drizzle-orm@^0.45.4`, `drizzle-kit@^0.31.11`, `@electric-sql/pglite@^0.5.15`, `pg@^8.23.1`, `jose@^6.2.15`, `zod@^4.6.7`, `vitest@^5.1.0`, `typescript@^7.0.2`, `tsx@^4.23.15`. P9a chỉ thêm đúng 6 gói ở dòng Tech Stack, không thêm gói nào khác (không TanStack, không pg-boss: P9a không có hàng đợi việc nền).
- TDD từng task: test đỏ → code tối thiểu → test xanh → commit. Không gộp task.
- Test DB = PGlite trong tiến trình (`server/tests/helpers/db.ts`). **Không bật Docker khi chạy test.** Docker (Postgres + Keycloak trong `infra/`) chỉ dùng ở Task 12 (smoke, thử tải) — controller chạy.
- **Một tác vụ nặng mỗi lúc.** Mọi lệnh test/typecheck/build/install bọc trong `flock /tmp/eduvn-heavy.lock`. Kiểm RAM/swap trước (`free -h`). Ổ `/home` sát đầy (còn 1,9 GB lúc probe): không tạo bản sao `node_modules` hay cache thừa.
- Logic nghiệp vụ server chỉ trong `server/src/domain/` (thuần, không I/O). `services/*` gọi DB + domain; `http/*` chỉ nối route.
- Định danh code tiếng Anh; nội dung hiển thị và thông báo lỗi tiếng Việt có dấu; tên tool MCP tiếng Việt không dấu `snake_case` (`giao_bai`, `ket_qua_bai`).
- Cổng dev: server 4310, Postgres 5442, Keycloak 8180, web 5173.
- **Câu hỏi gửi xuống HS không bao giờ chứa đáp án, lời giải, hướng dẫn chấm, `questionId`** (chỉ `PublicItem`). Đáp án/lời giải chỉ xuất hiện ở trang kết quả theo `show_solution`.
- `/api/student/*` chỉ nhận phiên HS; token Keycloak ở đó trả 401, phiên HS ở route GV trả 401.
- Tự lưu = đúng **một** câu `UPDATE` theo khoá chính khi thành công; không đọc trước, không gọi DB để kiểm phiên.
- Route mới đặt ở `server/src/http/student.ts` và `server/src/http/classroom.ts`; `app.ts` chỉ thêm import, dựng service, đăng ký plugin/route.
- CSS mới phải có tiền tố: `hs-` (khu HS; mọi thứ nằm trong `.hs`) và `lh-` (tab lớp của GV). `styles.css` đã dùng `.tabs .chip .hint .opt .score .card .cards .btn .ic .avatar` — không được đè; các quy tắc của mockup mang tên trùng phải đổi sang tiền tố.
- Giao diện theo `web/mockup/lop-hoc.html` (Be Vietnam Pro, icon Lucide trong `web/src/sprite.ts`, thẻ đổ bóng, màu nhấn `#4f6bed`). Điện thoại: mỗi màn một câu, nút ≥ 44 px.
- Ngoài phạm vi P9a (P9b/P7): trang khoá học, thông báo, phụ huynh, ôn câu sai, xuất VNEdu/SMAS, chấm tự luận bằng AI.
- Test HTTP mới dùng PGlite nặng: mỗi `describe` của file test mới khai `{ timeout: 60_000 }` (máy dev có lúc tải cao, test 2–4 giây có thể vượt 20 giây mặc định).

## Đã kiểm trước (probe 2026-11-10, máy dev)

- **Cả plan đã chạy thử trong bản sao tạm** (`/tmp`, `node_modules` liên kết tới repo, không sửa repo): server 47 file test xanh + `tsc --noEmit` sạch; web 9 file test xanh + `tsc` sạch + `vite build` được; `load-p9.mjs` chạy khô với server PGlite trong tiến trình (N = 60): 0×5xx, 0 câu mất. Code trong plan là code đã chạy.
- `drizzle-kit@0.31.11`: `pnpm --filter @eduvn/server db:generate` sinh `server/drizzle/0008_<tên>.sql` **không hỏi gì** (chỉ thêm cột/bảng): 4 `CREATE TABLE` (`answer_items`, `assignments`, `submission_events`, `submissions`), 8 `ADD COLUMN` (`classes.code/join_code/join_open`, `students.seat/pin_hash/badge_version/user_id/link_pending`), unique `students_seat_uq (class_id, seat)`, `students_user_uq (class_id, user_id)`, `submissions_attempt_uq`, ràng buộc unique `classes_code_unique`, `classes_join_code_unique`. Migration mới nhất hiện có: `0007_calm_scrambler.sql`.
- `jose@6.2.x` HS256: `new SignJWT(c).setProtectedHeader({ alg: "HS256" })…sign(key)`, `jwtVerify(t, key, { issuer, audience, algorithms: ["HS256"] })`. Truyền `Uint8Array` mỗi lần ≈ 400 µs/lần kiểm; **nhập sẵn `CryptoKey`** (`crypto.subtle.importKey("raw", …, { name: "HMAC", hash: "SHA-256" }, false, ["sign","verify"])`) ≈ 190 µs → dùng khoá nhập một lần. Claim sai → `errors.JWTClaimValidationFailed` (`code = ERR_JWT_CLAIM_VALIDATION_FAILED`).
- `node:crypto` scrypt: `scryptSync` N = 16384 ≈ 176 ms **chặn event loop**; `promisify(scrypt)` N = 4096 ≈ 46 ms/lần, 40 lần song song ≈ 366 ms → dùng bản async, N = 4096, muối 16 byte, so bằng `timingSafeEqual`. Cấp 1.000 PIN ≈ 12 giây (băm 16 cái một lượt, ngoài giao dịch).
- `@fastify/rate-limit@11.2.2`, `@fastify/under-pressure@9.2.1` khai `fastify: '5.x'`. Trong `buildApp` (hàm đồng bộ) gọi `app.register(rateLimit, { global: false })` **không cần await** nếu route nằm trong `app.register(async (s) => { … })` đăng ký sau đó: route-level `config: { rateLimit: { max, timeWindow, keyGenerator } }` có hiệu lực (thử: lần 2 → 429, header `retry-after`). `errorResponseBuilder` trả `{ statusCode: 429, message }` → đi qua `setErrorHandler` của app (nhánh 4xx sẵn có). `under-pressure` ném lỗi `code = "FST_UNDER_PRESSURE"`, `statusCode 503`, header `retry-after` vẫn giữ khi qua error handler — **error handler hiện tại đổi mọi lỗi ≥ 500 thành 500 "Lỗi máy chủ"** → phải thêm nhánh 503.
- PGlite + drizzle: `update(...).where(and(eq(id), lt(seq, n), …)).returning({ seq })` trả `[]` khi seq cũ → biết trượt mà không cần đọc trước. `db.execute(sql…select now()…)` trên PGlite trả chuỗi, trên `pg` trả `Date` → không dùng giờ DB; mọi mốc giờ lấy từ đồng hồ Node (`now()` truyền vào service, test truyền đồng hồ giả) và so qua cột có kiểu (`gte(submissions.deadlineAt, cutoff)`). `make_interval(mins => n)` chạy được trên PGlite.
- `zod@4.6.7`: `z.iso.datetime({ offset: true })` nhận `2026-11-10T07:00:00+07:00` và `…Z`, từ chối `2026-11-10`; `z.record(z.string().regex(/^\d{1,3}$/), …)` từ chối khoá chữ.
- `autocannon@9.0.0` (CommonJS, `autocannon.js`): `requests: [{ setupRequest(req, ctx), onResponse(status, body, ctx) }]` ghép đúng request ↔ response theo kết nối (`pipelining: 1`); `result.latency` có `p50/p90/p97_5/p99` nhưng **không có p95** → tự tính từ sự kiện `inst.on("response", (_c, status, _bytes, ms) => …)`. Hết `duration` thì dừng, vài phản hồi cuối không tới `onResponse` dù máy chủ đã lưu → "mất câu" phải tính là *máy chủ có ít câu hơn bản đã được xác nhận*.
- `qrcode@1.5.4`: `QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 })` chạy cả node (vitest) lẫn trình duyệt; token thẻ (bỏ iss/iat/exp) dài < 140 ký tự → URL `/hs/qr#<token>` ra mã 59×59 ô.
- `dexie@4.4.7` có `EntityTable`; **không khai bảng bằng field của class** (TS `useDefineForClassFields` ghi đè bảng Dexie) → dùng `new Dexie("eduvn-hs") as Dexie & { drafts: EntityTable<Draft, "submissionId"> }`.
- npm (2026-11-09): `@fastify/rate-limit` 11.2.2 (02/11), `@fastify/under-pressure` 9.2.1 (08/10), `autocannon` 9.0.0 (06/11), `dexie` 4.4.7 (19/10), `qrcode` 1.5.4 (2024-08), `@types/qrcode` 1.5.6. pnpm 12.3.4.
- Code hiện tại:
  - `students` không có số thứ tự cố định: STT ở web = vị trí trong danh sách xếp theo tên (`compareVietnameseNames` + `position`) → thêm HS là STT nhảy → cần cột `students.seat` cấp khi "Cấp mã".
  - `ROLES` đã có `"student"` (không quyền); `authenticate()` trong `app.ts` luôn đi Keycloak (`deps.verify`, RS256) → phiên HS gửi vào route GV tự 401.
  - `scoreItem` trả lời ngắn dùng `normalizeShort` (bỏ khoảng trắng, phẩy → chấm) — không hiểu `\frac{3}{2}` mà ô công thức MathLive xuất ra (`decimalSeparator = ","` cho `1{,}5`).
  - `tests/config.test.ts` so `toEqual` toàn bộ config → thêm `STUDENT_SECRET` vào `env` của test. `tests/mcp/mcp.test.ts` so đúng danh sách tool → thêm `giao_bai`, `ket_qua_bai`.
  - `413` luôn báo "Bài giảng quá lớn" cho mọi route.
  - `App.tsx` chặn mọi route khi chưa đăng nhập Keycloak và chỉ gắn `MathKeyboard` khi có `user`; `Callback` luôn về `/`.
  - `MathField` (`web/src/math/MathEditor.tsx`) không điều khiển, `testId` gắn vào `math-field.dataset.testid`.
- Mockup `web/mockup/lop-hoc.html`: có **2 mã khác nhau** — "Mã lớp" in trên thẻ (`TO10A1`) và "mã tham gia" (`K7M4QX`); tab GV "Giao bài · Theo dõi · Thống kê · Thẻ lớp"; 27 icon (`chevl chevr clock flag checkc wifioff loader qr printer camera refresh alert chart shuffle lock eye arrowl arrowr cal user send list shield timer repeat ban eyeoff`) chưa có trong `sprite.ts`.
- Máy dev lúc probe có tiến trình khác chiếm 500 % CPU (load ≈ 30): file test PGlite chạy riêng thì 2–4 giây/test, chạy cả bộ dưới tải thì vượt 20 giây → lý do của ràng buộc `timeout: 60_000` ở trên.

## Quyết định thêm trong plan (ngoài danh sách đã chốt)

1. **Số thứ tự cố định** `students.seat`: "Cấp mã" cấp cho mọi HS chưa có số (theo thứ tự danh sách lớp, tiếp sau số lớn nhất); HS tự tham gia nhận số kế tiếp. Mã đề chia theo `(seat − 1) % số mã đề`; chưa có số thì theo băm id.
2. **Hai mã như mockup:** `classes.code` (in trên thẻ, luôn dùng được với PIN) và `classes.join_code` (cho tài khoản Keycloak, chỉ dùng khi `join_open`). Cả hai 6 ký tự từ `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, sinh khi GV mở tab Thẻ lớp lần đầu cấp mã/bật mã tham gia.
3. **Chống dò PIN** trong bộ nhớ tiến trình: 5 lần sai / 10 phút theo (mã lớp, STT) như spec; theo IP là **30** lần (cả lớp thường chung một IP qua NAT của trường — 5 lần sẽ khoá cả lớp). Bị khoá → 429 + `Retry-After`; sai → 401 chung "Mã lớp, số thứ tự hoặc PIN chưa đúng".
4. **Thu hồi:** "Đổi mã (thu hồi)" = cấp lại PIN cả lớp + tăng `badge_version` → thẻ QR cũ và phiên cũ bị từ chối ở các route không nóng (`me`, danh sách bài, vào bài, xem kết quả). Tự lưu/nộp của bài **đang mở** không kiểm `ver` (không đọc DB trên đường nóng) nên bài dở không mất.
5. HS tự tham gia trùng họ tên + ngày sinh với HS có sẵn (chưa gắn tài khoản) → `link_pending = true`, trả 202 "chờ GV xác nhận"; GV duyệt ở tab Thẻ lớp. Không trùng → tạo HS mới, vào ngay.
6. Mặc định lời giải: `test` → `after_due`, `practice` → `after_submit`. Mức xem: `full` (đáp án + lời giải), `marks` (chỉ đúng/sai + điểm), `score` (chỉ điểm).
7. Thống kê/bảng điểm lấy **lượt đã nộp có điểm cao nhất** của mỗi HS. `answer_items.choice` lưu lựa chọn (trắc nghiệm = nội dung phương án vì mỗi mã đề đảo phương án; đúng/sai = `ĐS_Đ`; trả lời ngắn = chuỗi đã nhập) để đếm đáp án nhiễu. Câu đúng/sai được trả lời dở: mảng 4 ý có `null` (nới `ResponseValue`).
8. Tự luận: HS gõ chữ (≤ 5.000 ký tự), GV chấm tay ở tab Kết quả (`PUT …/grades`, quyền `exam:grade` nên trợ giảng chấm được).
9. Trang kết quả HS **không** hiện "Hạng trong lớp" (mockup có) và thống kê không có lý do "Giảm 2 bài liên tiếp" (cần dữ liệu nhiều bài — để P9b).
10. Quét QR: nếu trình duyệt có `BarcodeDetector` thì bật camera ngay trong trang; không thì hướng dẫn dùng camera điện thoại (URL `…/hs/qr#<token>`, token sau `#` nên không vào log máy chủ).
11. `AppDeps` thêm `studentSecret`, `now?`, `pressure?`, `studentRateLimit?` (mặc định 60 lần/phút/bài làm/route), `sweepMs?`. `main.ts` bật `pressure: { maxEventLoopDelay: 1000 }`, `sweepMs: 60_000`; test không bật.
12. `scripts/load-p9.mjs` ở gốc repo (như spec), import `../server/node_modules/autocannon/autocannon.js` (cùng kiểu `web/scripts/smoke.mjs` import exceljs); nhận `TEACHER_TOKEN` để chạy không cần Keycloak.

## Cấu trúc file

**Server**
| File | Trách nhiệm |
|---|---|
| Create `server/src/domain/shortAnswer.ts` | So khớp trả lời ngắn (kiểu Oppia) |
| Modify `server/src/domain/scoring.ts` | `ResponseValue` nhận ý `null`; trả lời ngắn dùng `matchShortAnswer` |
| Create `server/src/domain/assignment.ts` | Cài đặt bài, mã đề, thứ tự câu, `PublicItem`, hạn, chấm → `ItemResult`, mức xem, trạng thái HS |
| Create `server/src/domain/analytics.ts` | CTT (p, D, nhiễu, chủ đề yếu, HS cần quan tâm), theo dõi, bảng điểm |
| Create `server/src/domain/studentAuth.ts` | Mã lớp, PIN, số thứ tự, `PinGuard` |
| Create `server/src/auth/student.ts` | Phiên HS + thẻ QR (HS256), băm PIN (scrypt) |
| Modify `server/src/config.ts`, `server/.env.example` | `STUDENT_SECRET` |
| Modify `server/src/domain/authz.ts` | `assignment:manage`, `assignment:read`, `student:credentials` |
| Modify `server/src/db/schema.ts`; Create `server/drizzle/0008_*.sql` | Cột mới `classes`, `students`; bảng `assignments`, `submissions`, `submission_events`, `answer_items` |
| Modify `server/src/errors.ts` | `TooManyRequestsError` (429), `ConflictError` (409) |
| Create `server/src/services/credentials.ts` | Thẻ lớp, mã tham gia, đăng nhập HS, `sortedRoster`, `loadFreshStudent` |
| Create `server/src/services/assignments.ts` | Giao bài (GV), theo dõi, kết quả, chấm tự luận |
| Create `server/src/services/submissions.ts` | Phòng làm bài (HS): vào bài, tự lưu, sự kiện, nộp, kết quả, chốt bài quá hạn |
| Create `server/src/http/student.ts`, `server/src/http/classroom.ts` | Route HS, route GV |
| Modify `server/src/http/app.ts`, `server/src/main.ts` | Nối service, plugin, lỗi 409/429/503/413, vòng quét |
| Create `server/src/mcp/assignments.ts`; Modify `server/src/mcp/server.ts` | `giao_bai`, `ket_qua_bai` |
| Tests | `tests/domain/{shortAnswer,assignment,analytics,studentAuth}.test.ts`, `tests/auth/student.test.ts`, `tests/db/p9-schema.test.ts`, `tests/helpers/classroom.ts`, `tests/http/{credentials,assignments,submissions,results}.test.ts`, `tests/mcp/assignments.test.ts`; sửa `tests/helpers/app.ts`, `tests/config.test.ts`, `tests/domain/authz.test.ts`, `tests/mcp/mcp.test.ts` |

**Web**
| File | Trách nhiệm |
|---|---|
| Create `web/src/student/{types,answers,clock,syncQueue,leave,studentApi,draftStore}.ts` | Kiểu API HS; module thuần: đã làm, đồng hồ máy chủ, hàng đợi tự lưu, rời tab, gọi API có phiên HS + gửi lại; Dexie |
| Create `web/src/pages/classroom/badgeSheet.ts` | Trang in thẻ A4 (8 thẻ/trang) + QR SVG |
| Create `web/src/student/{StudentApp,StudentLogin,MyAssignments,ExamRoom,QuestionCard,ResultPage}.tsx`, `web/src/student/hs.css` | Khu HS `/hs` (mockup màn 1–4) |
| Create `web/src/pages/classroom/{types.ts,ClassroomTabs.tsx,AssignTab.tsx,MonitorTab.tsx,ResultsTab.tsx,BadgesTab.tsx,lh.css}` | 4 tab lớp GV (mockup màn 5–8) |
| Modify `web/src/App.tsx`, `web/src/auth.tsx`, `web/src/pages/Login.tsx`, `web/src/pages/Classes.tsx`, `web/src/sprite.ts`, `web/package.json` | Nối vào app |
| Tests | `web/tests/{hsClock,hsSync,hsLeave,badgeSheet}.test.ts` |
| Modify `web/scripts/smoke.mjs`; Create `scripts/load-p9.mjs` | Smoke E2E P9a; thử tải |

**Docs:** `docs/ROADMAP.md` (dòng P9), `scripts/README.md`, `AGENTS.md` (lệnh thử tải).

## Hợp đồng REST (dùng chung server ↔ web; tasks bên dưới định nghĩa kiểu chi tiết)

| Route | Ai | Thân → Kết quả |
|---|---|---|
| `POST /api/student/session` | công khai | `{ classCode, seat, pin }` → 200 `StudentSession` · 401 sai · 429 bị khoá |
| `POST /api/student/session/qr` | công khai | `{ token }` → 200 `StudentSession` · 401 |
| `POST /api/student/session/oidc` | Bearer Keycloak | `{ joinCode, fullName?, dob? }` → 200 `StudentSession` · 202 `{ pending: true, message }` · 403 mã đang tắt · 404 mã sai |
| `GET /api/student/me` | phiên HS | `{ student, class }` |
| `GET /api/student/assignments` | phiên HS | `MyAssignment[]` |
| `POST /api/student/assignments/:id/start` | phiên HS | `{}` → `RoomPayload` · 409 hết lượt/chưa mở |
| `PUT /api/student/submissions/:id/answers` | phiên HS | `{ seq, answers }` → `SaveResult` · 409 `{ status }` · 429 |
| `POST /api/student/submissions/:id/events` | phiên HS | `{ events: [{ kind: "leave"\|"return" }] }` → `{ ok, leaveCount }` |
| `POST /api/student/submissions/:id/submit` | phiên HS | `{ seq, answers }` → `StudentResult` (idempotent) |
| `GET /api/student/submissions/:id` | phiên HS | `StudentResult` · 409 chưa nộp |
| `GET/POST /api/classes/:id/credentials` | GV | → `CredentialStatus` / `{ studentIds? }` → 201 `{ classCode, cards: BadgeCard[] }` |
| `PUT /api/classes/:id/join` | GV | `{ open }` → `{ classCode, joinCode, joinOpen }` |
| `POST /api/classes/:id/students/:sid/link` | GV | `{ approve }` → `{ approved }` |
| `GET/POST /api/classes/:id/assignments` | GV | → `AssignmentListItem[]` / `AssignmentInput` → 201 `AssignmentSummary` |
| `GET/PATCH/DELETE /api/assignments/:id` | GV | `AssignmentSummary` / `{ title?, dueAt?, status? }` / 204 |
| `GET /api/assignments/:id/monitor` | GV, trợ giảng | `MonitorPayload` (cache 2 giây) |
| `GET /api/assignments/:id/results` | GV, trợ giảng | `ResultsPayload` |
| `GET /api/assignments/:id/submissions/:sid` | GV, trợ giảng | `SubmissionDetail` |
| `PUT /api/assignments/:id/submissions/:sid/grades` | GV, trợ giảng | `{ points: { [no]: điểm } }` → `{ score, maxScore, pending }` |

---

### Task 1: Trả lời ngắn kiểu Oppia + quy tắc bài giao (domain)

**Files:**
- Create: `server/src/domain/shortAnswer.ts`, `server/src/domain/assignment.ts`
- Modify: `server/src/domain/scoring.ts`
- Test: `server/tests/domain/shortAnswer.test.ts`, `server/tests/domain/assignment.test.ts`

**Interfaces:**
- Produces (`shortAnswer.ts`): `REL_TOL = 1e-9`; `normalizeAnswer(raw: string): string`; `parseNumber(s: string): number | null` (nhận chuỗi đã chuẩn hoá); `acceptedAnswers(key: string): string[]`; `matchShortAnswer(response: string, key: string): boolean`.
- Changes (`scoring.ts`): `ResponseValue = number | (boolean | null)[] | string | null`; `scoreItem` nhánh `short_answer` dùng `matchShortAnswer` (`normalizeShort` giữ nguyên, vẫn export).
- Produces (`assignment.ts`), dùng ở Task 4–11:
  - hằng/kiểu `ASSIGNMENT_KINDS`, `AssignmentKind`, `SHOW_SOLUTION`, `ShowSolution`, `ASSIGNMENT_STATUS`, `AssignmentStatus`, `SUBMISSION_STATUS`, `SubmissionStatus`, `AssignmentSource = { examId } | { questionIds }`, `GRACE_MS = 30_000`;
  - `AssignmentInput` (zod) + `AssignmentInputParsed`; `AssignmentSettings`; `resolveSettings(p, now, examDuration) → { ok: true; settings } | { ok: false; issues }`;
  - `hashString`, `pickVariant(variants, seat, studentId)`, `variantByCode(variants, code)`, `displayOrder(v, shuffle, seed): number[]`;
  - `PublicItem` (union theo `type`, chỉ `no, section, stem, maxPoints` + `options`/`statements`), `publicItems(v, order, rules)`;
  - `computeDeadline(startedAt, durationMinutes, dueAt)`, `saveCutoff(now)`, `isExpired(deadlineAt, now)`;
  - `AnswerValue`, `Answers` (zod, khoá `"1".."999"`, ≤ 200 khoá, chuỗi ≤ 5.000), `SaveBody = { seq ≥ 1, answers }`, `isAnswered`, `answeredCount`;
  - `ItemResult = { no, questionId, topic, level, type, points: number|null, maxPoints, correct: boolean|null, choice: string|null }`, `Graded = { score, maxScore, pending, items }`, `choiceOf`, `gradeAnswers(v, answers, rules)`, `toScore10(score, max)`;
  - `ResultLevel = "full" | "marks" | "score"`, `resultLevel(show, dueAt, now)`, `ReviewItem = PublicItem & { response, points, correct, key?, explanation?, rubric? }`, `reviewItems(v, order, rules, answers, graded, level, includeRubric = false)`;
  - `StudentState = "chua_mo" | "chua_lam" | "dang_lam" | "da_nop" | "qua_han"`, `studentState(a, subs, now) → { state, canStart }`.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// server/tests/domain/shortAnswer.test.ts
import { describe, expect, it } from "vitest";
import { MATH_RULES, scoreItem } from "../../src/domain/scoring";
import { acceptedAnswers, matchShortAnswer, normalizeAnswer, parseNumber } from "../../src/domain/shortAnswer";
import { short } from "../helpers/fixtures";

describe("normalizeAnswer", () => {
  it.each([
    [" 1 , 5 ", "1.5"],
    ["1{,}5", "1.5"],
    ["$\\frac{3}{2}$", "(3)/(2)"],
    ["\\dfrac32", "(3)/(2)"],
    ["-\\frac{\\sqrt{3}}{2}", "-(sqrt(3))/(2)"],
    ["\\sqrt2", "sqrt(2)"],
    ["x^{2}", "x^2"],
    ["\\left(1;2\\right)", "(1;2)"],
    ["x \\le 3", "x<=3"],
    ["2\\pi", "2π"],
    ["−4", "-4"],
    ["ABC", "abc"],
  ])("%s → %s", (raw, out) => expect(normalizeAnswer(raw)).toBe(out));
});

describe("parseNumber", () => {
  it.each([
    ["1.5", 1.5],
    ["-2", -2],
    [".5", 0.5],
    ["(3)/(2)", 1.5],
    ["-(9)/(4)", -2.25],
    ["(-3)/2", -1.5],
    ["3/0", null],
    ["x=3", null],
    ["sqrt(2)", null],
  ])("%s → %s", (s, n) => expect(parseNumber(s)).toBe(n));
});

describe("matchShortAnswer", () => {
  it("số: dấu phẩy, phân số, sai số tương đối 1e-9", () => {
    expect(matchShortAnswer("1.5", "1,5")).toBe(true);
    expect(matchShortAnswer("\\frac{3}{2}", "1,5")).toBe(true);
    expect(matchShortAnswer("1{,}5", "$\\frac32$")).toBe(true);
    expect(matchShortAnswer("-\\frac{9}{4}", "-2,25")).toBe(true);
    expect(matchShortAnswer("0,30000000000000004", "0,3")).toBe(true);
    expect(matchShortAnswer("1000000,5", "1000000,4")).toBe(false);
    expect(matchShortAnswer("1,6", "1,5")).toBe(false);
  });
  it("chữ: NFC, hoa thường, khoảng trắng; dấu tiếng Việt vẫn phải đúng", () => {
    expect(matchShortAnswer("Hà Nội".normalize("NFD"), "hà nội")).toBe(true);
    expect(matchShortAnswer("ha noi", "Hà Nội")).toBe(false);
    expect(matchShortAnswer("\\sqrt{3}", "$\\sqrt3$")).toBe(true);
  });
  it("nhiều đáp án tách bằng |; rỗng không bao giờ đúng", () => {
    expect(acceptedAnswers("x=3 | 3 ||")).toEqual(["x=3", "3"]);
    expect(matchShortAnswer("3", "x=3|3")).toBe(true);
    expect(matchShortAnswer("x = 3", "x=3|3")).toBe(true);
    expect(matchShortAnswer("", "x=3|3")).toBe(false);
    expect(matchShortAnswer("   ", "")).toBe(false);
  });
  it("scoreItem dùng luật mới", () => {
    expect(scoreItem(short({ answer: "$\\frac{3}{2}$|1,5" }), "\\frac{3}{2}", MATH_RULES)).toBe(0.5);
    expect(scoreItem(short({ answer: "1,5" }), "3/2", MATH_RULES)).toBe(0.5);
    expect(scoreItem(short({ answer: "1,5" }), "2", MATH_RULES)).toBe(0);
  });
});
```

```ts
// server/tests/domain/assignment.test.ts
import { describe, expect, it } from "vitest";
import {
  AssignmentInput,
  Answers,
  answeredCount,
  computeDeadline,
  displayOrder,
  gradeAnswers,
  isExpired,
  pickVariant,
  publicItems,
  resolveSettings,
  resultLevel,
  reviewItems,
  saveCutoff,
  studentState,
  toScore10,
} from "../../src/domain/assignment";
import { MATH_RULES } from "../../src/domain/scoring";
import { SECTION_ORDER, makeVariants } from "../../src/domain/variants";
import { essay, mcq, short, stored, tf } from "../helpers/fixtures";

const QS = [
  stored(mcq({ explanation: "Vì 2 + 2 = 4" }), "m1"),
  stored(mcq({ stem: "Câu 2", answer: 2 }), "m2"),
  stored(mcq({ stem: "Câu 3", answer: 1 }), "m3"),
  stored(tf(), "t1"),
  stored(short(), "s1"),
  stored(essay(), "e1"),
];
const [V1, V2] = makeVariants(QS, 2, 7);
const NOW = new Date("2026-11-10T07:00:00Z");
const uuid = "11111111-1111-4111-8111-111111111111";

describe("cài đặt bài giao", () => {
  it("mặc định theo loại bài, thời lượng theo đề", () => {
    const p = AssignmentInput.parse({ title: "KT 15 phút", source: { examId: uuid }, dueAt: "2026-11-10T09:00:00+07:00" });
    const r = resolveSettings(p, new Date("2026-11-09T23:00:00Z"), 45);
    expect(r).toEqual({ ok: true, settings: { kind: "test", opensAt: new Date("2026-11-09T23:00:00Z"), dueAt: new Date("2026-11-10T02:00:00Z"), durationMinutes: 45, attemptsAllowed: 1, showSolution: "after_due", shuffle: false } });
    const q = AssignmentInput.parse({ title: "Luyện", kind: "practice", source: { questionIds: [uuid] }, dueAt: "2026-11-12T00:00:00Z", durationMinutes: null });
    const r2 = resolveSettings(q, NOW, null);
    expect(r2.ok && r2.settings).toMatchObject({ durationMinutes: null, attemptsAllowed: 3, showSolution: "after_submit" });
  });
  it("báo lỗi hạn nộp", () => {
    const p = AssignmentInput.parse({ title: "x", source: { examId: uuid }, opensAt: "2026-11-10T08:00:00Z", dueAt: "2026-11-10T06:00:00Z" });
    expect(resolveSettings(p, NOW, 45)).toEqual({ ok: false, issues: ["Hạn nộp phải sau giờ mở bài", "Hạn nộp phải ở tương lai"] });
    expect(AssignmentInput.safeParse({ title: "x", source: { examId: uuid, questionIds: [uuid] }, dueAt: "2026-11-10T09:00:00Z" }).success).toBe(false);
    expect(AssignmentInput.safeParse({ title: "x", source: { examId: uuid }, dueAt: "10/11/2026" }).success).toBe(false);
  });
});

describe("mã đề, thứ tự câu, câu gửi HS", () => {
  it("chia mã đề theo số thứ tự; chưa có số thì theo id (ổn định)", () => {
    expect([1, 2, 3, 4].map((s) => pickVariant([V1!, V2!], s, "x").code)).toEqual(["101", "102", "101", "102"]);
    expect(pickVariant([V1!, V2!], null, "abc").code).toBe(pickVariant([V1!, V2!], null, "abc").code);
  });
  it("đảo câu giữ thứ tự phần, tái lập theo seed", () => {
    expect(displayOrder(V1!, false, 1)).toEqual([1, 2, 3, 4, 5, 6]);
    const o = displayOrder(V1!, true, 99);
    expect(o).toEqual(displayOrder(V1!, true, 99));
    expect([...o].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    const sec = o.map((no) => SECTION_ORDER.indexOf(V1!.items.find((i) => i.no === no)!.section));
    expect(sec).toEqual([...sec].sort());
    const seeds = Array.from({ length: 20 }, (_, i) => displayOrder(V1!, true, i).slice(0, 3).join());
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
  it("câu gửi HS không lộ đáp án, lời giải, hướng dẫn chấm", () => {
    const items = publicItems(V1!, displayOrder(V1!, false, 0), MATH_RULES);
    const json = JSON.stringify(items);
    for (const k of ['"answer"', '"explanation"', '"rubric"', '"questionId"', '"points":1,']) expect(json).not.toContain(k);
    expect(items.map((i) => i.type)).toEqual(["mcq", "mcq", "mcq", "true_false", "short_answer", "essay"]);
    expect(items[0]).toMatchObject({ no: 1, maxPoints: 0.25 });
    expect(items[0]!.type === "mcq" && items[0]!.options).toHaveLength(4);
    expect(items[5]).toMatchObject({ type: "essay", maxPoints: 1 });
  });
});

describe("thời gian", () => {
  it("hạn = min(bắt đầu + thời lượng, hạn nộp); ân hạn 30 giây", () => {
    const due = new Date("2026-11-10T08:00:00Z");
    expect(computeDeadline(NOW, 45, due)).toEqual(new Date("2026-11-10T07:45:00Z"));
    expect(computeDeadline(NOW, 90, due)).toEqual(due);
    expect(computeDeadline(NOW, null, due)).toEqual(due);
    const dl = new Date("2026-11-10T07:45:00Z");
    expect(isExpired(dl, new Date("2026-11-10T07:45:30Z"))).toBe(false);
    expect(isExpired(dl, new Date("2026-11-10T07:45:31Z"))).toBe(true);
    expect(saveCutoff(new Date("2026-11-10T07:45:30Z"))).toEqual(dl);
  });
});

describe("chấm bài nộp", () => {
  const key = (no: number) => V1!.items.find((i) => i.no === no)!.question;
  it("chấm đủ dạng, tự luận chờ chấm, ghi lựa chọn", () => {
    const m1 = key(1);
    const answers = Answers.parse({
      "1": m1.type === "mcq" ? m1.answer : 0,
      "2": 3,
      "4": [true, false, null, true],
      "5": "\\frac{3}{2}",
      "6": "Giả sử √2 = p/q…",
    });
    const g = gradeAnswers(V1!, answers, MATH_RULES);
    expect(g.pending).toBe(1);
    expect(g.maxScore).toBe(3.25);
    const byNo = new Map(g.items.map((i) => [i.no, i]));
    expect(byNo.get(1)).toMatchObject({ points: 0.25, correct: true, questionId: expect.any(String), topic: "Mệnh đề", level: "NB", type: "mcq" });
    expect(byNo.get(3)).toMatchObject({ points: 0, correct: false, choice: null });
    expect(byNo.get(4)).toMatchObject({ points: 0.5, correct: false, choice: "ĐS_Đ" });
    expect(byNo.get(5)).toMatchObject({ points: 0.5, correct: true, choice: "\\frac{3}{2}" });
    expect(byNo.get(6)).toMatchObject({ points: null, correct: null, choice: null });
    const m2 = key(2);
    expect(byNo.get(2)!.choice).toBe(m2.type === "mcq" ? m2.options[3] : "");
    expect(g.score).toBe(g.items.reduce((s, i) => s + (i.points ?? 0), 0));
    expect(answeredCount(answers)).toBe(4);
    expect(toScore10(g.score, g.maxScore)).toBe(Math.round((g.score / 3.25) * 1000) / 100);
    expect(toScore10(1, 0)).toBeNull();
  });
  it("từ chối đáp án sai kiểu", () => {
    expect(Answers.safeParse({ "1": 4 }).success).toBe(false);
    expect(Answers.safeParse({ a: 1 }).success).toBe(false);
    expect(Answers.safeParse({ "4": [true, false] }).success).toBe(false);
    expect(Answers.safeParse({ "5": "x".repeat(5001) }).success).toBe(false);
  });
});

describe("phần HS được xem", () => {
  const due = new Date("2026-11-10T08:00:00Z");
  it("mức xem theo show_solution", () => {
    expect(resultLevel("after_submit", due, NOW)).toBe("full");
    expect(resultLevel("after_due", due, NOW)).toBe("marks");
    expect(resultLevel("after_due", due, due)).toBe("full");
    expect(resultLevel("never", due, due)).toBe("score");
  });
  it("reviewItems: full có đáp án + lời giải; marks không; rubric chỉ cho GV", () => {
    const answers = { "1": 1 };
    const g = gradeAnswers(V1!, answers, MATH_RULES);
    const graded = new Map(g.items.map((i) => [i.no, i]));
    const order = displayOrder(V1!, false, 0);
    const full = reviewItems(V1!, order, MATH_RULES, answers, graded, "full");
    const m1 = full.find((i) => i.no === 1)!;
    expect(m1.key).toMatch(/^[ABCD]$/);
    expect(m1.response).toBe(1);
    expect(full.find((i) => i.no === 6)!.rubric).toBeUndefined();
    expect(reviewItems(V1!, order, MATH_RULES, answers, graded, "full", true).find((i) => i.no === 6)!.rubric).toContain("phản chứng");
    const marks = reviewItems(V1!, order, MATH_RULES, answers, graded, "marks");
    expect(JSON.stringify(marks)).not.toMatch(/"key"|"explanation"|"rubric"/);
    expect(marks.find((i) => i.no === 4)!.points).toBe(0);
    const score = reviewItems(V1!, order, MATH_RULES, answers, graded, "score");
    expect(score.every((i) => i.points === null && i.correct === null)).toBe(true);
  });
});

describe("trạng thái bài của HS", () => {
  const a = { opensAt: new Date("2026-11-10T06:00:00Z"), dueAt: new Date("2026-11-10T08:00:00Z"), status: "published" as const, attemptsAllowed: 2 };
  it.each([
    ["chưa mở", { ...a, opensAt: new Date("2026-11-10T07:30:00Z") }, [], { state: "chua_mo", canStart: false }],
    ["chưa làm", a, [], { state: "chua_lam", canStart: true }],
    ["đang làm", a, [{ status: "in_progress" }], { state: "dang_lam", canStart: true }],
    ["đã nộp, còn lượt", a, [{ status: "submitted" }], { state: "da_nop", canStart: true }],
    ["đã nộp, hết lượt", a, [{ status: "submitted" }, { status: "auto_submitted" }], { state: "da_nop", canStart: false }],
    ["quá hạn", { ...a, dueAt: new Date("2026-11-10T06:30:00Z") }, [], { state: "qua_han", canStart: false }],
    ["đã đóng", { ...a, status: "closed" as const }, [], { state: "qua_han", canStart: false }],
  ] as const)("%s", (_n, asg, subs, out) => expect(studentState(asg, subs, NOW)).toEqual(out));
});
```

- [ ] **Step 2: Chạy test, thấy đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/domain/shortAnswer.test.ts tests/domain/assignment.test.ts`
Expected: FAIL — `Cannot find module '../../src/domain/shortAnswer'` / `'../../src/domain/assignment'`.

- [ ] **Step 3: Viết `shortAnswer.ts`**

```ts
// server/src/domain/shortAnswer.ts
/** Trả lời ngắn: so khớp theo tinh thần luật TextInput/NumericInput của Oppia
 *  (https://github.com/oppia/oppia, Apache-2.0; viết lại bằng TS, không chép mã):
 *  - Unicode NFC, không phân biệt hoa thường, bỏ mọi khoảng trắng;
 *  - dấu phẩy thập phân = dấu chấm; bỏ $…$ và lệnh LaTeX trình bày ({,}, \left, \right, \, …);
 *  - \frac{a}{b}, \dfrac, \frac32, \sqrt{x}, \sqrt2 đổi về dạng chữ (a)/(b), sqrt(x);
 *  - nếu cả hai là số (thập phân hoặc phân số a/b) thì so với sai số tương đối 1e-9 (tối thiểu 1e-9 quanh 0);
 *  - đáp án chuẩn có thể có nhiều cách viết, tách bằng "|". */
export const REL_TOL = 1e-9;

const LATEX_WORDS: [RegExp, string][] = [
  [/\\left|\\right/g, ""],
  [/\\[,;:! ]/g, ""],
  [/\\leq?(?![a-zA-Z])/g, "<="],
  [/\\geq?(?![a-zA-Z])/g, ">="],
  [/\\neq?(?![a-zA-Z])/g, "≠"],
  [/\\infty/g, "∞"],
  [/\\pi/g, "π"],
  [/\\%/g, "%"],
  [/\\cdot|\\times/g, "*"],
  [/\\[dt]frac/g, "\\frac"],
];

function unwrap(s: string): string {
  let prev = "";
  let cur = s;
  while (prev !== cur) {
    prev = cur;
    cur = cur
      .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
      .replace(/\\sqrt(\d)/g, "sqrt($1)")
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)")
      .replace(/\\frac(\d)(\d)/g, "($1)/($2)");
  }
  return cur;
}

export function normalizeAnswer(raw: string): string {
  let s = raw.normalize("NFC").replace(/\$/g, "").replace(/\{,\}/g, ".");
  for (const [re, to] of LATEX_WORDS) s = s.replace(re, to);
  s = unwrap(s);
  return s
    .replace(/[−–]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/[{}]/g, "");
}

const NUM = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)`;
const PLAIN = new RegExp(`^${NUM}$`);
const FRACTION = new RegExp(`^([+-]?)\\(?(${NUM})\\)?/\\(?(${NUM})\\)?$`);

/** Chuỗi đã chuẩn hoá → số (thập phân hoặc phân số), không phải số → null. */
export function parseNumber(s: string): number | null {
  if (PLAIN.test(s)) return Number(s);
  const m = FRACTION.exec(s);
  if (!m) return null;
  const d = Number(m[3]);
  if (d === 0) return null;
  const v = Number(m[2]) / d;
  return m[1] === "-" ? -v : v;
}

export const acceptedAnswers = (key: string): string[] =>
  key
    .split("|")
    .map((k) => k.trim())
    .filter(Boolean);

function equalsOne(response: string, accepted: string): boolean {
  const x = normalizeAnswer(response);
  const y = normalizeAnswer(accepted);
  if (x === "" || y === "") return false;
  if (x === y) return true;
  const a = parseNumber(x);
  const b = parseNumber(y);
  return a !== null && b !== null && Math.abs(a - b) <= REL_TOL * Math.max(1, Math.abs(a), Math.abs(b));
}

export function matchShortAnswer(response: string, key: string): boolean {
  return acceptedAnswers(key).some((k) => equalsOne(response, k));
}
```

- [ ] **Step 4: Sửa `scoring.ts`**

Thêm import ngay dưới `import type { QuestionInput } from "./question";`:

```ts
import { matchShortAnswer } from "./shortAnswer";
```

Thay dòng `export const ResponseValue = …` bằng:

```ts
/** Đúng/sai: mảng 4 ý, ý chưa chọn = null (tính là sai ý đó). */
export const ResponseValue = z.union([z.number().int(), z.array(z.boolean().nullable()), z.string(), z.null()]);
```

Trong `scoreItem`, nhánh `case "short_answer":` thay bằng:

```ts
    case "short_answer":
      return typeof r === "string" && matchShortAnswer(r, q.answer) ? rules.shortAnswer : 0;
```

- [ ] **Step 5: Viết `assignment.ts`**

```ts
// server/src/domain/assignment.ts
import { z } from "zod";
import type { QuestionType } from "./question";
import { mulberry32, shuffle } from "./rng";
import { type PointRules, type ResponseValue, maxPoints, round2, scoreItem } from "./scoring";
import { SECTION_ORDER, type Variant, type VariantItem, answerKey } from "./variants";

/** Bài giao cho lớp (P9a): bản chụp mã đề lúc giao, luật thời gian, chấm, phần HS được xem. */
export const ASSIGNMENT_KINDS = ["practice", "test"] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];
export const SHOW_SOLUTION = ["after_submit", "after_due", "never"] as const;
export type ShowSolution = (typeof SHOW_SOLUTION)[number];
export const ASSIGNMENT_STATUS = ["draft", "published", "closed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUS)[number];
export const SUBMISSION_STATUS = ["in_progress", "submitted", "auto_submitted"] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUS)[number];
export type AssignmentSource = { examId: string } | { questionIds: string[] };

/** Ân hạn mạng chậm sau giờ hết bài. */
export const GRACE_MS = 30_000;

const Iso = z.iso.datetime({ offset: true, message: "Thời điểm dạng ISO 8601, vd 2026-11-10T07:30:00+07:00" });

export const AssignmentInput = z.object({
  title: z.string().trim().normalize("NFC").min(1, "Thiếu tên bài").max(160),
  kind: z.enum(ASSIGNMENT_KINDS).default("test"),
  source: z.union([
    z.object({ examId: z.uuid() }).strict(),
    z.object({ questionIds: z.array(z.uuid()).min(1, "Chọn ít nhất 1 câu").max(100, "Tối đa 100 câu") }).strict(),
  ]),
  opensAt: Iso.optional(),
  dueAt: Iso,
  /** undefined = theo đề (nếu có); null = không giới hạn trong cửa sổ mở. */
  durationMinutes: z.number().int().min(1).max(300).nullable().optional(),
  attemptsAllowed: z.number().int().min(1).max(10).optional(),
  showSolution: z.enum(SHOW_SOLUTION).optional(),
  shuffle: z.boolean().default(false),
  publish: z.boolean().default(false),
});
export type AssignmentInputParsed = z.output<typeof AssignmentInput>;

export type AssignmentSettings = {
  kind: AssignmentKind;
  opensAt: Date;
  dueAt: Date;
  durationMinutes: number | null;
  attemptsAllowed: number;
  showSolution: ShowSolution;
  shuffle: boolean;
};

export function resolveSettings(p: AssignmentInputParsed, now: Date, examDuration: number | null): { ok: true; settings: AssignmentSettings } | { ok: false; issues: string[] } {
  const opensAt = p.opensAt ? new Date(p.opensAt) : now;
  const dueAt = new Date(p.dueAt);
  const issues: string[] = [];
  if (dueAt.getTime() <= opensAt.getTime()) issues.push("Hạn nộp phải sau giờ mở bài");
  if (dueAt.getTime() <= now.getTime()) issues.push("Hạn nộp phải ở tương lai");
  if (issues.length) return { ok: false, issues };
  const test = p.kind === "test";
  return {
    ok: true,
    settings: {
      kind: p.kind,
      opensAt,
      dueAt,
      durationMinutes: p.durationMinutes === undefined ? examDuration : p.durationMinutes,
      attemptsAllowed: p.attemptsAllowed ?? (test ? 1 : 3),
      showSolution: p.showSolution ?? (test ? "after_due" : "after_submit"),
      shuffle: p.shuffle,
    },
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mã đề chia đều theo số thứ tự; HS chưa có số thứ tự thì theo băm id. */
export function pickVariant(variants: readonly Variant[], seat: number | null, studentId: string): Variant {
  if (variants.length === 0) throw new Error("assignment has no variants");
  const idx = seat !== null && seat > 0 ? (seat - 1) % variants.length : hashString(studentId) % variants.length;
  return variants[idx] as Variant;
}

export function variantByCode(variants: readonly Variant[], code: string): Variant {
  const v = variants.find((x) => x.code === code);
  if (!v) throw new Error(`variant ${code} not found`);
  return v;
}

/** Thứ tự hiển thị (danh sách `no`): giữ thứ tự các phần CV 7991; shuffle thì đảo trong từng phần theo seed. */
export function displayOrder(v: Variant, doShuffle: boolean, seed: number): number[] {
  if (!doShuffle) return v.items.map((i) => i.no);
  const rng = mulberry32(seed);
  return SECTION_ORDER.flatMap((s) =>
    shuffle(
      v.items.filter((i) => i.section === s),
      rng,
    ).map((i) => i.no),
  );
}

type ItemBase = { no: number; section: QuestionType; stem: string; maxPoints: number };
/** Câu hỏi gửi xuống trình duyệt HS: KHÔNG có đáp án, lời giải, hướng dẫn chấm. */
export type PublicItem =
  | (ItemBase & { type: "mcq"; options: string[] })
  | (ItemBase & { type: "true_false"; statements: string[] })
  | (ItemBase & { type: "short_answer" })
  | (ItemBase & { type: "essay" });

export function publicItems(v: Variant, order: readonly number[], rules: PointRules): PublicItem[] {
  const byNo = new Map(v.items.map((i) => [i.no, i]));
  return order.map((no) => {
    const it = byNo.get(no) as VariantItem;
    const q = it.question;
    const base: ItemBase = { no, section: it.section, stem: q.stem, maxPoints: maxPoints(q, rules) };
    switch (q.type) {
      case "mcq":
        return { ...base, type: "mcq" as const, options: [...q.options] };
      case "true_false":
        return { ...base, type: "true_false" as const, statements: [...q.statements] };
      case "short_answer":
        return { ...base, type: "short_answer" as const };
      case "essay":
        return { ...base, type: "essay" as const };
    }
  });
}

export function computeDeadline(startedAt: Date, durationMinutes: number | null, dueAt: Date): Date {
  if (durationMinutes === null) return dueAt;
  return new Date(Math.min(startedAt.getTime() + durationMinutes * 60_000, dueAt.getTime()));
}
/** Còn lưu được khi deadline_at >= saveCutoff(now). */
export const saveCutoff = (now: Date): Date => new Date(now.getTime() - GRACE_MS);
export const isExpired = (deadlineAt: Date, now: Date): boolean => now.getTime() > deadlineAt.getTime() + GRACE_MS;

/** Đáp án HS: trắc nghiệm = chỉ số 0–3; đúng/sai = 4 ý (null = chưa chọn); trả lời ngắn = LaTeX/chữ; tự luận = chữ. */
export const AnswerValue = z.union([z.number().int().min(0).max(3), z.array(z.boolean().nullable()).length(4), z.string().max(5000), z.null()]);
export type AnswerValue = z.infer<typeof AnswerValue>;
export const Answers = z.record(z.string().regex(/^\d{1,3}$/), AnswerValue).refine((a) => Object.keys(a).length <= 200, "Quá nhiều câu trả lời");
export type Answers = z.infer<typeof Answers>;
export const SaveBody = z.object({ seq: z.number().int().min(1).max(2_000_000_000), answers: Answers });
export type SaveBody = z.infer<typeof SaveBody>;

export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.every((x) => x !== null);
  return v.trim() !== "";
}
export const answeredCount = (a: Answers): number => Object.values(a).filter(isAnswered).length;

export type ItemResult = {
  no: number;
  questionId: string;
  topic: string;
  level: string;
  type: QuestionType;
  /** null = tự luận chờ GV chấm. */
  points: number | null;
  maxPoints: number;
  correct: boolean | null;
  /** Lựa chọn của HS để đếm đáp án nhiễu: trắc nghiệm = nội dung phương án; đúng/sai = "ĐS_Đ"; trả lời ngắn = chuỗi đã nhập. */
  choice: string | null;
};
export type Graded = { score: number; maxScore: number; pending: number; items: ItemResult[] };

export function choiceOf(q: VariantItem["question"], r: ResponseValue | undefined): string | null {
  if (r === undefined || r === null) return null;
  switch (q.type) {
    case "mcq":
      return typeof r === "number" ? (q.options[r] ?? null) : null;
    case "true_false":
      return Array.isArray(r) ? r.map((b) => (b === null ? "_" : b ? "Đ" : "S")).join("") : null;
    case "short_answer":
      return typeof r === "string" && r.trim() ? r.trim().slice(0, 200) : null;
    case "essay":
      return null;
  }
}

export function gradeAnswers(v: Variant, answers: Answers, rules: PointRules): Graded {
  const items: ItemResult[] = v.items.map((it) => {
    const r = answers[String(it.no)];
    const points = scoreItem(it.question, r, rules);
    const max = maxPoints(it.question, rules);
    return {
      no: it.no,
      questionId: it.questionId,
      topic: it.question.topic,
      level: it.question.level,
      type: it.question.type,
      points,
      maxPoints: max,
      correct: points === null ? null : points >= max,
      choice: choiceOf(it.question, r),
    };
  });
  return {
    score: round2(items.reduce((s, i) => s + (i.points ?? 0), 0)),
    maxScore: round2(items.reduce((s, i) => s + i.maxPoints, 0)),
    pending: items.filter((i) => i.points === null).length,
    items,
  };
}

export const toScore10 = (score: number | null, max: number | null): number | null => (score === null || max === null || max <= 0 ? null : round2((score / max) * 10));

/** Mức HS được xem sau khi nộp: full = điểm + đúng/sai + đáp án + lời giải; marks = điểm + đúng/sai; score = chỉ điểm. */
export type ResultLevel = "full" | "marks" | "score";
export function resultLevel(show: ShowSolution, dueAt: Date, now: Date): ResultLevel {
  if (show === "never") return "score";
  if (show === "after_submit") return "full";
  return now.getTime() >= dueAt.getTime() ? "full" : "marks";
}

export type ReviewItem = PublicItem & { response: AnswerValue | null; points: number | null; correct: boolean | null; key?: string; explanation?: string; rubric?: string };

export function reviewItems(
  v: Variant,
  order: readonly number[],
  rules: PointRules,
  answers: Answers,
  graded: ReadonlyMap<number, { points: number | null; correct: boolean | null }>,
  level: ResultLevel,
  includeRubric = false,
): ReviewItem[] {
  const keys = new Map(answerKey(v).map((k) => [k.no, k.answer]));
  const byNo = new Map(v.items.map((i) => [i.no, i]));
  return publicItems(v, order, rules).map((p) => {
    const q = (byNo.get(p.no) as VariantItem).question;
    const g = graded.get(p.no);
    const out: ReviewItem = { ...p, response: answers[String(p.no)] ?? null, points: level === "score" ? null : (g?.points ?? null), correct: level === "score" ? null : (g?.correct ?? null) };
    if (level === "full") {
      if (q.type !== "essay") out.key = keys.get(p.no);
      if (q.explanation) out.explanation = q.explanation;
      if (includeRubric && q.type === "essay") out.rubric = q.rubric;
    }
    return out;
  });
}

export type StudentState = "chua_mo" | "chua_lam" | "dang_lam" | "da_nop" | "qua_han";

export function studentState(
  a: { opensAt: Date; dueAt: Date; status: AssignmentStatus; attemptsAllowed: number },
  subs: readonly { status: SubmissionStatus }[],
  now: Date,
): { state: StudentState; canStart: boolean } {
  const open = a.status === "published" && now.getTime() >= a.opensAt.getTime() && now.getTime() < a.dueAt.getTime();
  if (subs.some((s) => s.status === "in_progress")) return { state: "dang_lam", canStart: true };
  if (subs.length > 0) return { state: "da_nop", canStart: open && subs.length < a.attemptsAllowed };
  if (a.status === "published" && now.getTime() < a.opensAt.getTime()) return { state: "chua_mo", canStart: false };
  if (!open) return { state: "qua_han", canStart: false };
  return { state: "chua_lam", canStart: true };
}
```

- [ ] **Step 6: Xanh + test cũ không vỡ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/domain/` → PASS (cả `scoring.test.ts`, `variants.test.ts` cũ).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 7: Commit**

```bash
git add server/src/domain/shortAnswer.ts server/src/domain/assignment.ts server/src/domain/scoring.ts server/tests/domain/shortAnswer.test.ts server/tests/domain/assignment.test.ts
git commit -m "feat(server): trả lời ngắn kiểu Oppia (phân số, phẩy thập phân, nhiều đáp án) + quy tắc bài giao (mã đề, đảo câu, hạn, chấm, mức xem kết quả)"
```

---

### Task 2: Thống kê CTT, theo dõi, bảng điểm (domain)

**Files:**
- Create: `server/src/domain/analytics.ts`
- Test: `server/tests/domain/analytics.test.ts`

**Interfaces:**
- Consumes: `SubmissionStatus`, `toScore10` (Task 1); `QuestionType`; `round2`.
- Produces (dùng ở Task 8, kiểu web ở Task 11 phải khớp):
  - `RosterRow = { id, seat: number|null, fullName }`; `SubRow = { id, studentId, attempt, status, score, maxScore, pending, leaveCount, answered, startedAt: Date, submittedAt: Date|null, updatedAt: Date }`; `ItemRow = { submissionId, questionId, topic, level, type, points, maxPoints, correct, choice }`; `QuestionMeta = { questionId, label, stem }`.
  - `MIN_FOR_D = 10`; `ItemStat = { questionId, label, stem, topic, level, type, n, p, d, flag: "Khó"|"Dễ"|"Xem lại"|null, choices: { choice, count, correct }[] }`; `AssignmentStats = { rosterSize, started, submitted, submitRate, mean, median, best, worst, distribution: number[10], items, topics: { topic, n, rate }[], atRisk: { studentId, fullName, seat, score10, reasons }[] }`.
  - `bestByStudent(subs): Map<studentId, SubRow>`; `analyze({ roster, subs, items, questions, dueAt, now }): AssignmentStats`.
  - `MonitorState = "chua_vao"|"dang_lam"|"da_nop"|"tu_nop"`; `MonitorRow = { studentId, seat, fullName, state, answered, total, leaveCount, score10, updatedAt: string|null, submissionId }`; `buildMonitor(roster, subs, total) → { counts, rows }`.
  - `ResultRow = { studentId, seat, fullName, submissionId, status, attempts, score, maxScore, score10, pending, leaveCount, submittedAt }`; `resultRows(roster, subs)`.
- Quy tắc: p = Σ điểm / Σ tối đa (bỏ câu chờ chấm); nhóm cao/thấp = `max(1, round(0,27·N))` bài; D chỉ tính khi N ≥ 10; cờ: p < 0,3 "Khó", p > 0,9 "Dễ", còn lại D < 0,2 "Xem lại"; phân bố 10 ô thang 10; HS cần quan tâm: quá hạn mà chưa nộp ("Chưa nộp"/"Chưa vào bài"), dưới 5 điểm, rời bài ≥ 3 lần; xếp theo số lý do giảm dần rồi điểm tăng dần.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// server/tests/domain/analytics.test.ts
import { describe, expect, it } from "vitest";
import { type ItemRow, type RosterRow, type SubRow, analyze, bestByStudent, buildMonitor, resultRows } from "../../src/domain/analytics";

const T0 = new Date("2026-11-10T07:00:00Z");
const sub = (p: Partial<SubRow> & { id: string; studentId: string }): SubRow => ({
  attempt: 1, status: "submitted", score: 0, maxScore: 10, pending: 0, leaveCount: 0, answered: 0, startedAt: T0, submittedAt: T0, updatedAt: T0, ...p,
});
const item = (submissionId: string, questionId: string, topic: string, ok: boolean, choice: string | null): ItemRow => ({
  submissionId, questionId, topic, level: "NB", type: "mcq", points: ok ? 0.25 : 0, maxPoints: 0.25, correct: ok, choice,
});

// 12 bài: HS i có điểm i × 0,8 (thang 10). Nhóm cao = s11, s10, s9; nhóm thấp = s0, s1, s2.
const N = 12;
const roster: RosterRow[] = [...Array.from({ length: N }, (_, i) => ({ id: `s${i}`, seat: i + 1, fullName: `HS ${i}` })), { id: "s12", seat: 13, fullName: "HS 12" }];
const subs: SubRow[] = Array.from({ length: N }, (_, i) => sub({ id: `b${i}`, studentId: `s${i}`, score: i * 0.8, leaveCount: i === 3 ? 4 : 0 }));
const items: ItemRow[] = Array.from({ length: N }, (_, i) => [
  item(`b${i}`, "q1", "A", i >= 6, i >= 6 ? "X" : "Y"),
  item(`b${i}`, "q2", "A", true, "Z"),
  item(`b${i}`, "q3", "B", i % 2 === 0, "W"),
  item(`b${i}`, "q4", "B", false, i < 8 ? "B" : "C"),
]).flat();
const questions = ["q1", "q2", "q3", "q4"].map((q, i) => ({ questionId: q, label: i + 1, stem: `Câu ${q}` }));
const past = { dueAt: new Date("2026-11-10T06:00:00Z"), now: T0 };

describe("analyze", () => {
  const s = analyze({ roster, subs, items, questions, ...past });
  it("tỉ lệ nộp, trung bình, trung vị, phân bố", () => {
    expect(s).toMatchObject({ rosterSize: 13, started: 12, submitted: 12, submitRate: 0.92, mean: 4.4, median: 4.4 });
    expect(s.distribution).toEqual([2, 1, 1, 1, 2, 1, 1, 1, 2, 0]);
    expect(s.best).toEqual({ studentId: "s11", fullName: "HS 11", score10: 8.8 });
    expect(s.worst).toEqual({ studentId: "s0", fullName: "HS 0", score10: 0 });
  });
  it("độ khó p, độ phân biệt D, cờ, đáp án nhiễu", () => {
    expect(s.items.map((i) => [i.label, i.p, i.d, i.flag])).toEqual([
      [1, 0.5, 1, null],
      [2, 1, 0, "Dễ"],
      [3, 0.5, -0.33, "Xem lại"],
      [4, 0, 0, "Khó"],
    ]);
    expect(s.items[3]!.choices).toEqual([
      { choice: "B", count: 8, correct: false },
      { choice: "C", count: 4, correct: false },
    ]);
    expect(s.items[0]!.choices[0]).toEqual({ choice: "X", count: 6, correct: true });
    expect(s.items[0]).toMatchObject({ n: 12, stem: "Câu q1", topic: "A" });
  });
  it("chủ đề yếu xếp tăng dần theo tỉ lệ đúng", () => {
    expect(s.topics).toEqual([
      { topic: "B", n: 24, rate: 0.25 },
      { topic: "A", n: 24, rate: 0.75 },
    ]);
  });
  it("HS cần quan tâm: chưa vào bài, dưới 5, rời bài nhiều", () => {
    expect(s.atRisk.map((a) => a.studentId)).toEqual(["s3", "s12", "s0", "s1", "s2", "s4", "s5", "s6"]);
    expect(s.atRisk[0]!.reasons).toEqual(["Dưới 5 điểm", "Rời bài 4 lần"]);
    expect(s.atRisk[1]!.reasons).toEqual(["Chưa vào bài"]);
  });
  it("dưới 10 bài thì không tính D; chưa tới hạn thì chưa báo chưa nộp", () => {
    const few = analyze({ roster, subs: subs.slice(0, 5), items, questions, dueAt: new Date("2026-11-11T00:00:00Z"), now: T0 });
    expect(few.items.every((i) => i.d === null)).toBe(true);
    expect(few.atRisk.some((a) => a.reasons.includes("Chưa vào bài"))).toBe(false);
    expect(few.items[0]!.n).toBe(5);
  });
  it("lớp trống", () => {
    expect(analyze({ roster: [], subs: [], items: [], questions: [], ...past })).toMatchObject({ submitRate: 0, mean: null, median: null, best: null, items: [], topics: [] });
  });
});

describe("theo dõi + bảng điểm", () => {
  const r3: RosterRow[] = [{ id: "a", seat: 1, fullName: "An" }, { id: "b", seat: 2, fullName: "Bình" }, { id: "c", seat: 3, fullName: "Cường" }];
  const s3: SubRow[] = [
    sub({ id: "x1", studentId: "b", status: "in_progress", score: null, maxScore: null, answered: 2, leaveCount: 1 }),
    sub({ id: "x2", studentId: "c", attempt: 1, score: 2, maxScore: 4 }),
    sub({ id: "x3", studentId: "c", attempt: 2, status: "auto_submitted", score: 3, maxScore: 4, leaveCount: 2 }),
  ];
  it("buildMonitor lấy lượt mới nhất", () => {
    const m = buildMonitor(r3, s3, 6);
    expect(m.counts).toEqual({ chua_vao: 1, dang_lam: 1, da_nop: 0, tu_nop: 1 });
    expect(m.rows.map((r) => [r.studentId, r.state, r.answered, r.score10, r.submissionId])).toEqual([
      ["a", "chua_vao", 0, null, null],
      ["b", "dang_lam", 2, null, "x1"],
      ["c", "tu_nop", 0, 7.5, "x3"],
    ]);
    expect(m.rows[1]).toMatchObject({ total: 6, leaveCount: 1, updatedAt: T0.toISOString() });
  });
  it("resultRows lấy lượt tốt nhất", () => {
    const rows = resultRows(r3, s3);
    expect(rows.map((r) => [r.studentId, r.status, r.attempts, r.score, r.score10, r.leaveCount])).toEqual([
      ["a", null, 0, null, null, 0],
      ["b", "in_progress", 1, null, null, 1],
      ["c", "auto_submitted", 2, 3, 7.5, 2],
    ]);
    expect(bestByStudent(s3).get("c")!.id).toBe("x3");
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/domain/analytics.test.ts` → FAIL (`Cannot find module`).

- [ ] **Step 3: Viết `analytics.ts`**

```ts
// server/src/domain/analytics.ts
import { type SubmissionStatus, toScore10 } from "./assignment";
import type { QuestionType } from "./question";
import { round2 } from "./scoring";

/** Thống kê cổ điển (CTT) cho một bài giao, tính trên các dòng answer_items (lớp nhỏ nên tính trong bộ nhớ).
 *  p = điểm đạt / điểm tối đa; D = p(nhóm 27% cao) − p(nhóm 27% thấp), chỉ tính khi ≥ 10 bài. */
export type RosterRow = { id: string; seat: number | null; fullName: string };
export type SubRow = {
  id: string;
  studentId: string;
  attempt: number;
  status: SubmissionStatus;
  score: number | null;
  maxScore: number | null;
  pending: number;
  leaveCount: number;
  answered: number;
  startedAt: Date;
  submittedAt: Date | null;
  updatedAt: Date;
};
export type ItemRow = { submissionId: string; questionId: string; topic: string; level: string; type: QuestionType; points: number | null; maxPoints: number; correct: boolean | null; choice: string | null };
/** label = số câu trong mã đề đầu tiên (để GV đối chiếu đề). */
export type QuestionMeta = { questionId: string; label: number; stem: string };

export const MIN_FOR_D = 10;
export type ItemFlag = "Khó" | "Dễ" | "Xem lại";
export type ItemStat = {
  questionId: string;
  label: number;
  stem: string;
  topic: string;
  level: string;
  type: QuestionType;
  n: number;
  p: number | null;
  d: number | null;
  flag: ItemFlag | null;
  choices: { choice: string; count: number; correct: boolean }[];
};
export type StudentRef = { studentId: string; fullName: string; score10: number };
export type AtRisk = { studentId: string; fullName: string; seat: number | null; score10: number | null; reasons: string[] };
export type AssignmentStats = {
  rosterSize: number;
  started: number;
  submitted: number;
  /** 0–1 */
  submitRate: number;
  mean: number | null;
  median: number | null;
  best: StudentRef | null;
  worst: StudentRef | null;
  /** 10 ô theo thang 10: [0,1), [1,2), …, [9,10]. */
  distribution: number[];
  items: ItemStat[];
  topics: { topic: string; n: number; rate: number }[];
  atRisk: AtRisk[];
};

const finalized = (s: SubRow) => s.status !== "in_progress";

/** Mỗi HS lấy lượt đã nộp có điểm thang 10 cao nhất (bằng nhau thì lượt sau). */
export function bestByStudent(subs: readonly SubRow[]): Map<string, SubRow> {
  const out = new Map<string, SubRow>();
  for (const s of subs) {
    if (!finalized(s)) continue;
    const cur = out.get(s.studentId);
    const a = toScore10(s.score, s.maxScore) ?? -1;
    const b = cur ? (toScore10(cur.score, cur.maxScore) ?? -1) : -2;
    if (!cur || a > b || (a === b && s.attempt > cur.attempt)) out.set(s.studentId, s);
  }
  return out;
}

const pOf = (rows: readonly ItemRow[]): number | null => {
  const graded = rows.filter((r) => r.points !== null);
  const max = graded.reduce((s, r) => s + r.maxPoints, 0);
  return graded.length && max > 0 ? graded.reduce((s, r) => s + (r.points ?? 0), 0) / max : null;
};

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return round2(s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2);
}

export function analyze(input: { roster: readonly RosterRow[]; subs: readonly SubRow[]; items: readonly ItemRow[]; questions: readonly QuestionMeta[]; dueAt: Date; now: Date }): AssignmentStats {
  const { roster, subs, now, dueAt } = input;
  const names = new Map(roster.map((r) => [r.id, r]));
  const best = bestByStudent(subs);
  const chosen = new Set([...best.values()].map((s) => s.id));
  const items = input.items.filter((i) => chosen.has(i.submissionId));
  const scored = [...best.values()]
    .map((s) => ({ s, v: toScore10(s.score, s.maxScore) }))
    .filter((x): x is { s: SubRow; v: number } => x.v !== null)
    .sort((a, b) => b.v - a.v);
  const values = scored.map((x) => x.v);
  const distribution = Array.from({ length: 10 }, () => 0);
  for (const v of values) distribution[Math.min(9, Math.floor(v))]! += 1;
  const ref = (x: { s: SubRow; v: number } | undefined): StudentRef | null => (x ? { studentId: x.s.studentId, fullName: names.get(x.s.studentId)?.fullName ?? "", score10: x.v } : null);

  const k = Math.max(1, Math.round(0.27 * scored.length));
  const upper = new Set(scored.slice(0, k).map((x) => x.s.id));
  const lower = new Set(scored.slice(-k).map((x) => x.s.id));
  const enough = scored.length >= MIN_FOR_D;

  const byQ = new Map<string, ItemRow[]>();
  for (const r of items) (byQ.get(r.questionId) ?? byQ.set(r.questionId, []).get(r.questionId)!).push(r);
  const meta = new Map(input.questions.map((q) => [q.questionId, q]));
  const itemStats: ItemStat[] = [...byQ.entries()].map(([questionId, rows]) => {
    const first = rows[0] as ItemRow;
    const p = pOf(rows);
    const pu = pOf(rows.filter((r) => upper.has(r.submissionId)));
    const pl = pOf(rows.filter((r) => lower.has(r.submissionId)));
    const d = enough && pu !== null && pl !== null ? round2(pu - pl) : null;
    const flag: ItemFlag | null = p === null ? null : p < 0.3 ? "Khó" : p > 0.9 ? "Dễ" : d !== null && d < 0.2 ? "Xem lại" : null;
    const counts = new Map<string, { count: number; correct: boolean }>();
    for (const r of rows) {
      if (r.choice === null) continue;
      const c = counts.get(r.choice) ?? { count: 0, correct: false };
      c.count++;
      c.correct ||= r.correct === true;
      counts.set(r.choice, c);
    }
    const choices = [...counts.entries()]
      .map(([choice, c]) => ({ choice, ...c }))
      .sort((a, b) => b.count - a.count || a.choice.localeCompare(b.choice))
      .slice(0, 5);
    const m = meta.get(questionId);
    return { questionId, label: m?.label ?? 0, stem: m?.stem ?? "", topic: first.topic, level: first.level, type: first.type, n: rows.filter((r) => r.points !== null).length, p: p === null ? null : round2(p), d, flag, choices };
  });
  itemStats.sort((a, b) => a.label - b.label);

  const byTopic = new Map<string, ItemRow[]>();
  for (const r of items) if (r.points !== null) (byTopic.get(r.topic) ?? byTopic.set(r.topic, []).get(r.topic)!).push(r);
  const topics = [...byTopic.entries()].map(([topic, rows]) => ({ topic, n: rows.length, rate: round2(pOf(rows) ?? 0) })).sort((a, b) => a.rate - b.rate || a.topic.localeCompare(b.topic, "vi"));

  const pastDue = now.getTime() >= dueAt.getTime();
  const atRisk: AtRisk[] = [];
  for (const r of roster) {
    const mine = subs.filter((s) => s.studentId === r.id);
    const b = best.get(r.id);
    const s10 = b ? toScore10(b.score, b.maxScore) : null;
    const reasons: string[] = [];
    if (!b && pastDue) reasons.push(mine.length ? "Chưa nộp" : "Chưa vào bài");
    if (s10 !== null && s10 < 5) reasons.push("Dưới 5 điểm");
    const leaves = mine.reduce((m, s) => Math.max(m, s.leaveCount), 0);
    if (leaves >= 3) reasons.push(`Rời bài ${leaves} lần`);
    if (reasons.length) atRisk.push({ studentId: r.id, fullName: r.fullName, seat: r.seat, score10: s10, reasons });
  }
  atRisk.sort((a, b) => b.reasons.length - a.reasons.length || (a.score10 ?? -1) - (b.score10 ?? -1));

  return {
    rosterSize: roster.length,
    started: new Set(subs.map((s) => s.studentId)).size,
    submitted: best.size,
    submitRate: roster.length ? round2(best.size / roster.length) : 0,
    mean: values.length ? round2(values.reduce((a, b) => a + b, 0) / values.length) : null,
    median: median(values),
    best: ref(scored[0]),
    worst: ref(scored[scored.length - 1]),
    distribution,
    items: itemStats,
    topics,
    atRisk,
  };
}

export type MonitorState = "chua_vao" | "dang_lam" | "da_nop" | "tu_nop";
export type MonitorRow = {
  studentId: string;
  seat: number | null;
  fullName: string;
  state: MonitorState;
  answered: number;
  total: number;
  leaveCount: number;
  score10: number | null;
  updatedAt: string | null;
  submissionId: string | null;
};

/** Theo dõi trực tiếp: lượt mới nhất của từng HS. */
export function buildMonitor(roster: readonly RosterRow[], subs: readonly SubRow[], total: number): { counts: Record<MonitorState, number>; rows: MonitorRow[] } {
  const latest = new Map<string, SubRow>();
  for (const s of subs) {
    const cur = latest.get(s.studentId);
    if (!cur || s.attempt > cur.attempt) latest.set(s.studentId, s);
  }
  const counts: Record<MonitorState, number> = { chua_vao: 0, dang_lam: 0, da_nop: 0, tu_nop: 0 };
  const rows = roster.map((r): MonitorRow => {
    const s = latest.get(r.id);
    const state: MonitorState = !s ? "chua_vao" : s.status === "in_progress" ? "dang_lam" : s.status === "submitted" ? "da_nop" : "tu_nop";
    counts[state]++;
    return {
      studentId: r.id,
      seat: r.seat,
      fullName: r.fullName,
      state,
      answered: s?.answered ?? 0,
      total,
      leaveCount: s?.leaveCount ?? 0,
      score10: s ? toScore10(s.score, s.maxScore) : null,
      updatedAt: s ? s.updatedAt.toISOString() : null,
      submissionId: s?.id ?? null,
    };
  });
  return { counts, rows };
}

export type ResultRow = {
  studentId: string;
  seat: number | null;
  fullName: string;
  submissionId: string | null;
  status: SubmissionStatus | null;
  attempts: number;
  score: number | null;
  maxScore: number | null;
  score10: number | null;
  pending: number;
  leaveCount: number;
  submittedAt: string | null;
};

/** Bảng điểm GV: mỗi HS một dòng (lượt tốt nhất; chưa nộp thì lượt đang làm nếu có). */
export function resultRows(roster: readonly RosterRow[], subs: readonly SubRow[]): ResultRow[] {
  const best = bestByStudent(subs);
  return roster.map((r) => {
    const mine = subs.filter((s) => s.studentId === r.id);
    const s = best.get(r.id) ?? mine.find((x) => x.status === "in_progress");
    return {
      studentId: r.id,
      seat: r.seat,
      fullName: r.fullName,
      submissionId: s?.id ?? null,
      status: s?.status ?? null,
      attempts: mine.length,
      score: s && finalized(s) ? s.score : null,
      maxScore: s && finalized(s) ? s.maxScore : null,
      score10: s && finalized(s) ? toScore10(s.score, s.maxScore) : null,
      pending: s?.pending ?? 0,
      leaveCount: mine.reduce((m, x) => Math.max(m, x.leaveCount), 0),
      submittedAt: s?.submittedAt ? s.submittedAt.toISOString() : null,
    };
  });
}
```

- [ ] **Step 4: Xanh**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/domain/analytics.test.ts` → PASS (8 test).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 5: Commit**

```bash
git add server/src/domain/analytics.ts server/tests/domain/analytics.test.ts
git commit -m "feat(server): thống kê bài giao kiểu CTT (độ khó p, độ phân biệt D, đáp án nhiễu, chủ đề yếu, HS cần quan tâm) + theo dõi + bảng điểm"
```

---

### Task 3: Danh tính HS — mã lớp, PIN, chống dò, phiên HS256, cấu hình, quyền

**Files:**
- Create: `server/src/domain/studentAuth.ts`, `server/src/auth/student.ts`
- Modify: `server/src/config.ts`, `server/.env.example`, `server/.env` (máy dev, không commit — `.env` nằm trong `.gitignore`), `server/src/domain/authz.ts`
- Test: `server/tests/domain/studentAuth.test.ts`, `server/tests/auth/student.test.ts`; sửa `server/tests/config.test.ts`, `server/tests/domain/authz.test.ts`

**Interfaces:**
- Produces (`domain/studentAuth.ts`): `CODE_ALPHABET`, `CODE_LENGTH = 6`, `makeCode(randInt)`, `normalizeCode(s)`, `isCode(s)`, `makePin(randInt)`, `isPin(s)`, `assignSeats(roster: { id, seat }[]): Map<id, seat>`, `GuardOptions`, `DEFAULT_GUARD = { maxFails: 5, maxIpFails: 30, windowMs: 600_000, lockMs: 600_000 }`, `class PinGuard { lockedFor(keys, now): number /*giây*/; fail(seatKey, ipKey, now); success(seatKey); prune(now) }`.
- Produces (`auth/student.ts`): `StudentActor = { studentId, classId, orgId, ver }`; `SESSION_TTL_SECONDS = 43200`; `hashPin(pin): Promise<string>` (dạng `s1$4096$<muối>$<băm>`); `verifyPin(pin, stored | null): Promise<boolean>`; `createStudentAuth(secret) → { signSession(a), verifySession(token): Promise<StudentActor>, signBadge({ studentId, ver }), verifyBadge(token): Promise<{ studentId, ver }> }`; `StudentAuth`.
- Config: `STUDENT_SECRET` bắt buộc, ≥ 32 ký tự.
- Quyền: `ACTIONS` thêm `"assignment:manage"`, `"assignment:read"`, `"student:credentials"`; `TEACHING` thêm cả ba; `assistant` thêm `"assignment:read"`.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// server/tests/domain/studentAuth.test.ts
import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, PinGuard, assignSeats, isCode, isPin, makeCode, makePin, normalizeCode } from "../../src/domain/studentAuth";

const seq = (...xs: number[]) => {
  let i = 0;
  return () => xs[i++ % xs.length] as number;
};

describe("mã lớp, PIN, số thứ tự", () => {
  it("mã 6 ký tự từ bảng chữ không nhầm lẫn", () => {
    expect(CODE_ALPHABET).not.toMatch(/[ILO01]/);
    expect(makeCode(seq(0, 1, 2, 3, 30, 29))).toBe("ABCD98");
    expect(isCode("ABCD98")).toBe(true);
    expect(isCode("ABCD9O")).toBe(false);
    expect(isCode("ABC")).toBe(false);
    expect(normalizeCode(" abc-d98 ")).toBe("ABCD98");
  });
  it("PIN 6 số", () => {
    expect(makePin(seq(0, 4, 2, 9, 1, 7))).toBe("042917");
    expect(isPin("042917")).toBe(true);
    expect(isPin("42917")).toBe(false);
    expect(isPin("04291a")).toBe(false);
  });
  it("cấp số thứ tự tiếp sau số lớn nhất, theo thứ tự danh sách", () => {
    expect([...assignSeats([{ id: "a", seat: null }, { id: "b", seat: 2 }, { id: "c", seat: null }])]).toEqual([["a", 3], ["c", 4]]);
    expect(assignSeats([{ id: "a", seat: 1 }]).size).toBe(0);
  });
});

describe("PinGuard", () => {
  it("sai 5 lần / 10 phút thì khoá số thứ tự đó 10 phút", () => {
    const g = new PinGuard();
    for (let i = 0; i < 4; i++) g.fail("ABCDEF:7", "ip:1", i * 1000);
    expect(g.lockedFor(["ABCDEF:7", "ip:1"], 5000)).toBe(0);
    g.fail("ABCDEF:7", "ip:1", 5000);
    expect(g.lockedFor(["ABCDEF:7", "ip:1"], 5000)).toBe(600);
    expect(g.lockedFor(["ABCDEF:8", "ip:1"], 5000)).toBe(0);
    expect(g.lockedFor(["ABCDEF:7"], 5000 + 600_000)).toBe(0);
  });
  it("lần sai cũ quá 10 phút không tính; đúng thì xoá đếm", () => {
    const g = new PinGuard();
    for (let i = 0; i < 4; i++) g.fail("k", "ip", 0);
    g.fail("k", "ip", 600_001);
    expect(g.lockedFor(["k"], 600_001)).toBe(0);
    for (let i = 0; i < 3; i++) g.fail("k2", "ip2", 1);
    g.success("k2");
    g.fail("k2", "ip2", 2);
    expect(g.lockedFor(["k2"], 2)).toBe(0);
  });
  it("khoá theo IP sau 30 lần sai ở nhiều số thứ tự", () => {
    const g = new PinGuard();
    for (let i = 0; i < 30; i++) g.fail(`C:${i}`, "ip:9", i);
    expect(g.lockedFor(["C:99", "ip:9"], 31)).toBe(600);
    g.prune(10_000_000);
    expect(g.lockedFor(["ip:9"], 10_000_000)).toBe(0);
  });
});
```

```ts
// server/tests/auth/student.test.ts
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { createStudentAuth, hashPin, verifyPin } from "../../src/auth/student";

const SECRET = "student-secret-student-secret-0123";

describe("token HS", () => {
  const auth = createStudentAuth(SECRET);
  const actor = { studentId: "s-1", classId: "c-1", orgId: "o-1", ver: 2 };
  it("phiên ký/kiểm HS256, sống 12 giờ", async () => {
    const t = await auth.signSession(actor);
    expect(await auth.verifySession(t)).toEqual(actor);
    const [, body] = t.split(".");
    const p = JSON.parse(Buffer.from(body!, "base64url").toString());
    expect(p.exp - p.iat).toBe(12 * 3600);
    expect(p.iss).toBe("eduvn-student");
  });
  it("thẻ QR không dùng làm phiên được và ngược lại; khoá khác bị từ chối", async () => {
    const badge = await auth.signBadge({ studentId: "s-1", ver: 2 });
    expect(await auth.verifyBadge(badge)).toEqual({ studentId: "s-1", ver: 2 });
    expect(badge.length).toBeLessThan(140);
    await expect(auth.verifySession(badge)).rejects.toThrow();
    await expect(auth.verifyBadge(await auth.signSession(actor))).rejects.toThrow();
    const other = createStudentAuth("x".repeat(32));
    await expect(other.verifySession(await auth.signSession(actor))).rejects.toThrow();
    const noVer = await new SignJWT({ cid: "c", oid: "o" }).setProtectedHeader({ alg: "HS256" }).setIssuer("eduvn-student").setAudience("hs-session").setSubject("s").setExpirationTime("1h").sign(new TextEncoder().encode(SECRET));
    await expect(auth.verifySession(noVer)).rejects.toThrow();
  });
  it("từ chối secret ngắn", () => {
    expect(() => createStudentAuth("short")).toThrow(/32/);
  });
});

describe("PIN băm scrypt", () => {
  it("băm có muối; kiểm đúng/sai; không có HS vẫn trả false", async () => {
    const h = await hashPin("042917");
    expect(h).toMatch(/^s1\$4096\$/);
    expect(h).not.toBe(await hashPin("042917"));
    expect(await verifyPin("042917", h)).toBe(true);
    expect(await verifyPin("042918", h)).toBe(false);
    expect(await verifyPin("042917", null)).toBe(false);
  });
});
```

Trong `server/tests/config.test.ts`: thêm `STUDENT_SECRET: "y".repeat(32),` vào object `env` (sau `DOWNLOAD_SECRET`), và trong test "từ chối secret ngắn và thiếu biến" thêm sau dòng `DOWNLOAD_SECRET: "short"`:

```ts
    expect(() => loadConfig({ ...env, STUDENT_SECRET: "short" })).toThrow();
    expect(() => loadConfig({ ...env, STUDENT_SECRET: undefined })).toThrow();
```

Trong `server/tests/domain/authz.test.ts`, thêm trước `it("assertCan …`:

```ts
  it("bài giao, thẻ lớp: GV giao + cấp mã; trợ giảng chỉ xem bài giao", () => {
    expect(can("teacher", "assignment:manage")).toBe(true);
    expect(can("teacher", "student:credentials")).toBe(true);
    expect(can("assistant", "assignment:read")).toBe(true);
    expect(can("assistant", "assignment:manage")).toBe(false);
    expect(can("assistant", "student:credentials")).toBe(false);
    expect(can("student", "assignment:read")).toBe(false);
  });
```

- [ ] **Step 2: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/domain/studentAuth.test.ts tests/auth/student.test.ts tests/config.test.ts tests/domain/authz.test.ts`
Expected: FAIL — thiếu module; `STUDENT_SECRET: "short"` không ném; quyền mới chưa có (`ACTIONS` không chứa → lỗi kiểu ở `can`).

- [ ] **Step 3: Viết `domain/studentAuth.ts`**

```ts
// server/src/domain/studentAuth.ts
/** Danh tính HS (thẻ lớp): mã lớp, PIN, số thứ tự, chống dò PIN. Thuần, không I/O. */
/** Bảng chữ không nhầm lẫn: bỏ I, L, O, 0, 1. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function makeCode(randInt: (n: number) => number): string {
  let s = "";
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[randInt(CODE_ALPHABET.length)];
  return s;
}
export const normalizeCode = (s: string): string => s.normalize("NFC").toUpperCase().replace(/[\s-]/g, "");
export const isCode = (s: string): boolean => s.length === CODE_LENGTH && [...s].every((c) => CODE_ALPHABET.includes(c));

export function makePin(randInt: (n: number) => number): string {
  return Array.from({ length: 6 }, () => String(randInt(10))).join("");
}
export const isPin = (s: string): boolean => /^\d{6}$/.test(s);

/** Cấp số thứ tự cho HS chưa có: tiếp sau số lớn nhất, theo thứ tự danh sách lớp truyền vào. */
export function assignSeats(roster: readonly { id: string; seat: number | null }[]): Map<string, number> {
  let next = roster.reduce((m, r) => Math.max(m, r.seat ?? 0), 0);
  const out = new Map<string, number>();
  for (const r of roster) if (r.seat === null) out.set(r.id, ++next);
  return out;
}

export type GuardOptions = { maxFails: number; maxIpFails: number; windowMs: number; lockMs: number };
/** Theo (lớp, số thứ tự): 5 lần sai / 10 phút. Theo IP: 30 lần (cả lớp thường chung một IP qua NAT của trường). */
export const DEFAULT_GUARD: GuardOptions = { maxFails: 5, maxIpFails: 30, windowMs: 600_000, lockMs: 600_000 };

/** Chống dò PIN trong bộ nhớ tiến trình: sai đủ số lần trong cửa sổ thì khoá khoá đó lockMs. */
export class PinGuard {
  private fails = new Map<string, number[]>();
  private locks = new Map<string, number>();
  constructor(private readonly o: GuardOptions = DEFAULT_GUARD) {}

  /** Số giây còn bị khoá (0 = không khoá). */
  lockedFor(keys: readonly string[], now: number): number {
    let ms = 0;
    for (const k of keys) {
      const until = this.locks.get(k);
      if (until === undefined) continue;
      if (until > now) ms = Math.max(ms, until - now);
      else this.locks.delete(k);
    }
    return Math.ceil(ms / 1000);
  }

  fail(seatKey: string, ipKey: string, now: number): void {
    this.bump(seatKey, this.o.maxFails, now);
    this.bump(ipKey, this.o.maxIpFails, now);
    if (this.fails.size > 50_000) this.prune(now);
  }

  success(seatKey: string): void {
    this.fails.delete(seatKey);
  }

  prune(now: number): void {
    for (const [k, list] of this.fails) if (!list.some((t) => t > now - this.o.windowMs)) this.fails.delete(k);
    for (const [k, until] of this.locks) if (until <= now) this.locks.delete(k);
  }

  private bump(key: string, max: number, now: number): void {
    const list = (this.fails.get(key) ?? []).filter((t) => t > now - this.o.windowMs);
    list.push(now);
    if (list.length >= max) {
      this.locks.set(key, now + this.o.lockMs);
      this.fails.delete(key);
    } else this.fails.set(key, list);
  }
}
```

- [ ] **Step 4: Viết `auth/student.ts`**

```ts
// server/src/auth/student.ts
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";

/** Phiên HS do lõi tự ký (HS256, sống 12 giờ) + thẻ QR (HS256, không hết hạn, thu hồi bằng badge_version). */
export type StudentActor = { studentId: string; classId: string; orgId: string; ver: number };

const ISSUER = "eduvn-student";
const AUD_SESSION = "hs-session";
const AUD_BADGE = "hs-badge";
export const SESSION_TTL_SECONDS = 12 * 3600;

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
/** N = 4096 ≈ 45 ms/lần trên máy dev, chạy ở threadpool (không chặn event loop). */
const SCRYPT_N = 4096;
/** Dùng khi không có HS khớp: vẫn băm một lần để thời gian trả lời như nhau. */
const DUMMY_HASH = `s1$${SCRYPT_N}$${"A".repeat(22)}$${"A".repeat(43)}`;

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(pin, salt, 32, { N: SCRYPT_N, r: 8, p: 1 });
  return `s1$${SCRYPT_N}$${salt.toString("base64url")}$${h.toString("base64url")}`;
}

export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  const [, n, salt, want] = (stored ?? DUMMY_HASH).split("$");
  const expected = Buffer.from(want ?? "", "base64url");
  const got = await scrypt(pin, Buffer.from(salt ?? "", "base64url"), 32, { N: Number(n) || SCRYPT_N, r: 8, p: 1 });
  return stored !== null && expected.length === got.length && timingSafeEqual(expected, got);
}

export function createStudentAuth(secret: string) {
  if (secret.length < 32) throw new Error("STUDENT_SECRET must be at least 32 characters");
  // Nhập khoá một lần: jwtVerify với CryptoKey nhanh gấp đôi so với truyền Uint8Array mỗi lần.
  const keyP = crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

  return {
    async signSession(a: StudentActor): Promise<string> {
      return new SignJWT({ cid: a.classId, oid: a.orgId, ver: a.ver })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(ISSUER)
        .setAudience(AUD_SESSION)
        .setSubject(a.studentId)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .sign(await keyP);
    },
    async verifySession(token: string): Promise<StudentActor> {
      const { payload } = await jwtVerify(token, await keyP, { issuer: ISSUER, audience: AUD_SESSION, algorithms: ["HS256"], requiredClaims: ["exp", "sub"] });
      const { sub, cid, oid, ver } = payload as Record<string, unknown>;
      if (typeof sub !== "string" || typeof cid !== "string" || typeof oid !== "string" || typeof ver !== "number") throw new Error("bad student session");
      return { studentId: sub, classId: cid, orgId: oid, ver };
    },
    /** Token in trên thẻ QR: ngắn (không iss/exp) để mã QR thưa, dễ quét. */
    async signBadge(b: { studentId: string; ver: number }): Promise<string> {
      return new SignJWT({ v: b.ver }).setProtectedHeader({ alg: "HS256" }).setAudience(AUD_BADGE).setSubject(b.studentId).sign(await keyP);
    },
    async verifyBadge(token: string): Promise<{ studentId: string; ver: number }> {
      const { payload } = await jwtVerify(token, await keyP, { audience: AUD_BADGE, algorithms: ["HS256"] });
      if (typeof payload.sub !== "string" || typeof payload.v !== "number") throw new Error("bad badge");
      return { studentId: payload.sub, ver: payload.v };
    },
  };
}
export type StudentAuth = ReturnType<typeof createStudentAuth>;
```

- [ ] **Step 5: Cấu hình + quyền**

`server/src/config.ts`: thêm vào `Env` ngay sau `DOWNLOAD_SECRET: z.string().min(32),`:

```ts
  STUDENT_SECRET: z.string().min(32),
```

`server/.env.example`: thêm dòng `STUDENT_SECRET=dev-only-student-secret-change-me-0123` sau `DOWNLOAD_SECRET`. Thêm cùng dòng vào `server/.env` trên máy dev (không `git add`).

`server/src/domain/authz.ts`:
- `ACTIONS`: thêm `"assignment:manage", "assignment:read", "student:credentials"` sau `"board:read"`.
- `TEACHING`: thêm `"assignment:manage", "assignment:read", "student:credentials"` vào cuối mảng.
- `GRANTS.assistant`: thêm `"assignment:read"` vào cuối mảng.

- [ ] **Step 6: Xanh**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/domain/studentAuth.test.ts tests/auth/student.test.ts tests/config.test.ts tests/domain/authz.test.ts` → PASS.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi (`main.ts` chưa dùng `STUDENT_SECRET`; Task 5 mới nối vào app).

- [ ] **Step 7: Commit**

```bash
git add server/src/domain/studentAuth.ts server/src/auth/student.ts server/src/config.ts server/.env.example server/src/domain/authz.ts server/tests/domain/studentAuth.test.ts server/tests/auth/student.test.ts server/tests/config.test.ts server/tests/domain/authz.test.ts
git commit -m "feat(server): danh tính HS — mã lớp, PIN băm scrypt, chống dò PIN, phiên HS256 + thẻ QR, STUDENT_SECRET, quyền giao bài/cấp mã"
```

---

### Task 4: Lược đồ DB P9a + migration 0008

**Files:**
- Modify: `server/src/db/schema.ts`
- Create (sinh tự động): `server/drizzle/0008_*.sql`, cập nhật `server/drizzle/meta/*`
- Test: `server/tests/db/p9-schema.test.ts`

**Interfaces:**
- Consumes: kiểu `Answers, AssignmentKind, AssignmentSource, AssignmentStatus, ShowSolution, SubmissionStatus` (Task 1), `PointRules`, `QuestionType`, `Variant`.
- Produces (drizzle): `classes.code`, `classes.joinCode`, `classes.joinOpen`; `students.seat`, `students.pinHash`, `students.badgeVersion`, `students.userId`, `students.linkPending`; bảng `assignments`, `submissions`, `submissionEvents`, `answerItems` (cột như dưới). Các task sau dùng đúng tên này.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// server/tests/db/p9-schema.test.ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ensureUser } from "../../src/db/repo";
import { answerItems, assignments, classes, organizations, students, submissions } from "../../src/db/schema";
import { DEFAULT_RULES } from "../../src/domain/scoring";
import { testDb } from "../helpers/db";

async function seed() {
  const db = await testDb();
  const u = await ensureUser(db, { sub: "gv-1" });
  const [o] = await db.insert(organizations).values({ name: "Trường A" }).returning();
  const [c] = await db.insert(classes).values({ orgId: o!.id, name: "10A1", schoolYear: "2026-2027", columns: [] }).returning();
  const [s1, s2] = await db.insert(students).values([{ classId: c!.id, fullName: "An", seat: 1 }, { classId: c!.id, fullName: "Bình" }]).returning();
  const now = new Date();
  const [a] = await db
    .insert(assignments)
    .values({ orgId: o!.id, classId: c!.id, ownerId: u.id, title: "KT", kind: "test", subject: "Toán", source: { questionIds: [] }, variants: [], rules: DEFAULT_RULES, opensAt: now, dueAt: now, attemptsAllowed: 1, showSolution: "after_due" })
    .returning();
  return { db, c: c!, s1: s1!, s2: s2!, a: a!, now };
}

describe("lược đồ P9a", { timeout: 60_000 }, () => {
  it("mặc định: bài nháp, bài làm đang làm, đáp án rỗng, mã tham gia tắt", async () => {
    const { db, c, s1, a, now } = await seed();
    expect(a.status).toBe("draft");
    const [sub] = await db.insert(submissions).values({ assignmentId: a.id, studentId: s1.id, attempt: 1, variantCode: "101", seed: 1, startedAt: now, deadlineAt: now }).returning();
    expect(sub).toMatchObject({ status: "in_progress", answers: {}, seq: 0, leaveCount: 0, pending: 0, score: null });
    const [cls] = await db.select().from(classes).where(eq(classes.id, c.id));
    expect(cls).toMatchObject({ code: null, joinCode: null, joinOpen: false });
    expect(s1).toMatchObject({ seat: 1, pinHash: null, badgeVersion: 0, userId: null, linkPending: false });
  });

  it("một lượt mỗi (bài, HS, lần làm); số thứ tự không trùng trong lớp", async () => {
    const { db, s1, s2, a, now } = await seed();
    const row = { assignmentId: a.id, studentId: s1.id, attempt: 1, variantCode: "101", seed: 1, startedAt: now, deadlineAt: now };
    await db.insert(submissions).values(row);
    await expect(db.insert(submissions).values(row)).rejects.toThrow();
    await db.insert(submissions).values({ ...row, attempt: 2 });
    await expect(db.update(students).set({ seat: 1 }).where(eq(students.id, s2.id))).rejects.toThrow();
  });

  it("xoá HS thì xoá bài làm và answer_items", async () => {
    const { db, s1, a, now } = await seed();
    const [sub] = await db.insert(submissions).values({ assignmentId: a.id, studentId: s1.id, attempt: 1, variantCode: "101", seed: 1, startedAt: now, deadlineAt: now }).returning();
    await db.insert(answerItems).values({ submissionId: sub!.id, assignmentId: a.id, no: 1, questionId: "q", topic: "T", level: "NB", type: "mcq", points: 0.25, maxPoints: 0.25, correct: true, choice: "A" });
    await db.delete(students).where(eq(students.id, s1.id));
    expect(await db.select().from(submissions)).toHaveLength(0);
    expect(await db.select().from(answerItems)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/db/p9-schema.test.ts` → FAIL (`assignments` không có trong schema).

- [ ] **Step 3: Sửa `schema.ts`**

Dòng import đầu file thay bằng:

```ts
import { boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { Answers, AssignmentKind, AssignmentSource, AssignmentStatus, ShowSolution, SubmissionStatus } from "../domain/assignment";
```

Dòng `import type { QuestionInput } from "../domain/question";` thay bằng:

```ts
import type { QuestionInput, QuestionType } from "../domain/question";
import type { PointRules } from "../domain/scoring";
```

Trong `classes`, ngay sau `columns: jsonb("columns").$type<GradeColumn[]>().notNull(),` thêm:

```ts
    /** Mã lớp in trên thẻ (đăng nhập bằng số thứ tự + PIN). */
    code: text("code").unique(),
    /** Mã tham gia cho tài khoản Keycloak (SV, HS lớn); chỉ dùng được khi joinOpen. */
    joinCode: text("join_code").unique(),
    joinOpen: boolean("join_open").notNull().default(false),
```

Trong `students`, ngay sau `position: integer("position").notNull().default(0),` thêm:

```ts
    /** Số thứ tự trên thẻ lớp: cấp khi "Cấp mã", không đổi khi thêm HS sau. */
    seat: integer("seat"),
    pinHash: text("pin_hash"),
    /** Tăng khi cấp lại thẻ: thẻ QR và phiên cũ hết dùng. */
    badgeVersion: integer("badge_version").notNull().default(0),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** HS tự tham gia trùng họ tên + ngày sinh: chờ GV xác nhận. */
    linkPending: boolean("link_pending").notNull().default(false),
```

và đổi danh sách index của `students` thành:

```ts
  (t) => [index("students_class_idx").on(t.classId), uniqueIndex("students_seat_uq").on(t.classId, t.seat), uniqueIndex("students_user_uq").on(t.classId, t.userId)],
```

Thêm vào cuối file:

```ts
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    kind: text("kind").$type<AssignmentKind>().notNull(),
    subject: text("subject").notNull(),
    source: jsonb("source").$type<AssignmentSource>().notNull(),
    /** Bản chụp mã đề lúc giao: sửa ngân hàng/đề sau đó không ảnh hưởng. */
    variants: jsonb("variants").$type<Variant[]>().notNull(),
    rules: jsonb("rules").$type<PointRules>().notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes"),
    attemptsAllowed: integer("attempts_allowed").notNull(),
    showSolution: text("show_solution").$type<ShowSolution>().notNull(),
    shuffle: boolean("shuffle").notNull().default(false),
    status: text("status").$type<AssignmentStatus>().notNull().default("draft"),
    createdAt: createdAt(),
  },
  (t) => [index("assignments_class_idx").on(t.classId)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    attempt: integer("attempt").notNull(),
    variantCode: text("variant_code").notNull(),
    seed: integer("seed").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    /** Máy chủ tính: min(started_at + thời lượng, due_at). */
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    status: text("status").$type<SubmissionStatus>().notNull().default("in_progress"),
    answers: jsonb("answers").$type<Answers>().notNull().default({}),
    /** Số thứ tự lần lưu (do máy khách tăng dần): chỉ ghi khi seq mới lớn hơn. */
    seq: integer("seq").notNull().default(0),
    score: real("score"),
    maxScore: real("max_score"),
    /** Số câu tự luận chờ GV chấm. */
    pending: integer("pending").notNull().default(0),
    leaveCount: integer("leave_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("submissions_attempt_uq").on(t.assignmentId, t.studentId, t.attempt), index("submissions_open_idx").on(t.status, t.deadlineAt)],
);

export const submissionEvents = pgTable(
  "submission_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    kind: text("kind").notNull(),
  },
  (t) => [index("submission_events_sub_idx").on(t.submissionId)],
);

/** Bảng phẳng: một dòng cho mỗi câu của mỗi bài đã chốt (thống kê CTT). */
export const answerItems = pgTable(
  "answer_items",
  {
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    no: integer("no").notNull(),
    questionId: text("question_id").notNull(),
    topic: text("topic").notNull(),
    level: text("level").notNull(),
    type: text("type").$type<QuestionType>().notNull(),
    /** null = tự luận chờ chấm. */
    points: real("points"),
    maxPoints: real("max_points").notNull(),
    correct: boolean("correct"),
    choice: text("choice"),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.no] }), index("answer_items_assignment_idx").on(t.assignmentId, t.questionId)],
);
```

- [ ] **Step 4: Sinh migration**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server db:generate`
Expected: tạo `server/drizzle/0008_<tên ngẫu nhiên>.sql` (không hỏi gì). Mở file kiểm: 4 `CREATE TABLE` (`answer_items`, `assignments`, `submission_events`, `submissions`), 8 `ALTER TABLE … ADD COLUMN` (3 ở `classes`, 5 ở `students`), các FK, `CREATE UNIQUE INDEX "students_seat_uq"`, `"students_user_uq"`, `"submissions_attempt_uq"`, `ADD CONSTRAINT "classes_code_unique"`, `"classes_join_code_unique"`. **Không** có `DROP` nào. Nếu drizzle-kit hỏi đổi tên cột: chọn "create column" (không có cột nào bị đổi tên).

- [ ] **Step 5: Xanh + toàn bộ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/db/` → PASS.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 6: Commit**

```bash
git add server/src/db/schema.ts server/drizzle server/tests/db/p9-schema.test.ts
git commit -m "feat(server): lược đồ P9a — mã lớp, số thứ tự + PIN, bài giao, bài làm, nhật ký rời tab, answer_items (migration 0008)"
```

---

### Task 5: Thẻ lớp + đăng nhập HS (service, route HS/GV, lỗi 409/429/503, rate-limit, under-pressure)

**Files:**
- Modify: `server/package.json` (2 dependency), `server/src/errors.ts`, `server/src/http/app.ts`, `server/src/main.ts`, `server/tests/helpers/app.ts`
- Create: `server/src/services/credentials.ts`, `server/src/http/student.ts`, `server/src/http/classroom.ts`, `server/tests/helpers/classroom.ts`
- Test: `server/tests/http/credentials.test.ts`

**Interfaces:**
- Consumes: Task 3 (`createStudentAuth`, `hashPin`, `verifyPin`, `PinGuard`, `assignSeats`, `makeCode`, `makePin`, `isCode`, `isPin`, `normalizeCode`), Task 4 (cột mới), `ensureUser` (`db/repo.ts`), `compareVietnameseNames`, `normName`, `parseDob` (`domain/roster.ts`).
- Produces:
  - `errors.ts`: `TooManyRequestsError(message, retryAfterSec)` → 429 + `Retry-After`; `ConflictError(message, extra = {})` → 409 `{ error, ...extra }`.
  - `services/credentials.ts`: `vnOrder`, `sortedRoster(db, classId): Promise<StudentRow[]>`, `loadFreshStudent(db, sa): Promise<StudentRow>` (401 nếu sai lớp / `ver` cũ / chờ xác nhận); `createCredentialService(db, auth, { guard?, now? }) → { status, issue, setJoin, resolveLink, loginBadge(raw, ip), loginQr(raw), loginOidc(identity, raw), me(sa) }`; kiểu `BadgeCard`, `CredentialStatus`, `StudentSession`, `JoinPending`.
  - `http/student.ts`: `bearer(req)`, `StudentRouteDeps = { auth, verify, credentials, rateLimit }` (Task 7 thêm `submissions`), `registerStudentRoutes(app, d)`.
  - `http/classroom.ts`: `ClassroomDeps = { authenticate, credentials }` (Task 6 thêm `assignments`), `registerClassroomRoutes(app, d)`.
  - `AppDeps` thêm `studentSecret: string; now?: () => Date; pressure?: { maxEventLoopDelay: number }; studentRateLimit?: { max: number; timeWindow: number }`.
  - `tests/helpers/app.ts`: `STUDENT_SECRET`, `testApp(opts: { now?; studentRateLimit? } = {})`.
  - `tests/helpers/classroom.ts`: `TApp`, `Card`, `Headers`, `bearerOf`, `teacher(t, sub?, name?)`, `call(t, method, url, headers, payload?)`, `classWithStudents(t, auth, lines?)` (lớp 10A1 môn Toán, mặc định An/Bình/Cường → STT 1/2/3), `issueAll(t, auth, classId)`, `loginStudent(t, classCode, card)`.

- [ ] **Step 1: Cài thư viện**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server add @fastify/rate-limit@^11.2.2 @fastify/under-pressure@^9.2.1`
Expected: `server/package.json` có 2 dependency mới, `pnpm-lock.yaml` đổi.

- [ ] **Step 2: Helper test + test HTTP (đỏ)**

`server/tests/helpers/app.ts`: thêm trước `export async function testApp`:

```ts
export const STUDENT_SECRET = "student-secret-student-secret-0123";
```

đổi chữ ký thành `export async function testApp(opts: { now?: () => Date; studentRateLimit?: { max: number; timeWindow: number } } = {}) {` và trong object truyền `buildApp` thêm sau `downloadSecret: …,`:

```ts
    studentSecret: STUDENT_SECRET,
    ...opts,
```

```ts
// server/tests/helpers/classroom.ts
import type { testApp } from "./app";

/** Dựng nhanh lớp + thẻ lớp + đăng nhập HS cho các test HTTP của P9a. */
export type TApp = Awaited<ReturnType<typeof testApp>>;
export type Card = { studentId: string; seat: number; fullName: string; pin: string; qrToken: string };
export type Headers = Record<string, string>;

export const bearerOf = (token: string): Headers => ({ authorization: `Bearer ${token}` });

export async function teacher(t: TApp, sub = "gv-1", name = "Cô Lan"): Promise<Headers> {
  return bearerOf(await t.sign({ sub, name }));
}

export const call = (t: TApp, method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", url: string, headers: Headers, payload?: unknown) =>
  t.app.inject({ method, url, headers, payload: payload as object });

/** Lớp 10A1 (Toán) + danh sách: mặc định 3 HS, thứ tự lớp An (1), Bình (2), Cường (3). */
export async function classWithStudents(t: TApp, auth: Headers, lines = ["Nguyễn Văn An;05/03/2010", "Trần Thị Bình", "Lê Văn Cường"]): Promise<string> {
  const c = await call(t, "POST", "/api/classes", auth, { name: "10A1", schoolYear: "2026-2027", subject: "Toán" });
  await call(t, "POST", `/api/classes/${c.json().id}/students`, auth, { text: lines.join("\n") });
  return c.json().id as string;
}

export async function issueAll(t: TApp, auth: Headers, classId: string): Promise<{ classCode: string; cards: Card[] }> {
  const r = await call(t, "POST", `/api/classes/${classId}/credentials`, auth, {});
  if (r.statusCode !== 201) throw new Error(`issue ${r.statusCode} ${r.body}`);
  return r.json();
}

export async function loginStudent(t: TApp, classCode: string, card: Card): Promise<Headers> {
  const r = await call(t, "POST", "/api/student/session", {}, { classCode, seat: card.seat, pin: card.pin });
  if (r.statusCode !== 200) throw new Error(`login ${r.statusCode} ${r.body}`);
  return bearerOf(r.json().token);
}
```

```ts
// server/tests/http/credentials.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, bearerOf, call, classWithStudents, issueAll, loginStudent, teacher } from "../helpers/classroom";

let t: TApp;
let gv: Headers;
let classId: string;
beforeEach(async () => {
  t = await testApp();
  gv = await teacher(t);
  classId = await classWithStudents(t, gv);
});
afterEach(async () => {
  await t.app.close();
});

describe("thẻ lớp (GV)", { timeout: 60_000 }, () => {
  it("cấp mã: số thứ tự theo danh sách, PIN 6 số chỉ trả một lần; cấp lại từng em", async () => {
    expect((await call(t, "GET", `/api/classes/${classId}/credentials`, gv)).json()).toMatchObject({ classCode: null, joinOpen: false });
    const first = await issueAll(t, gv, classId);
    expect(first.classCode).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(first.cards.map((c) => [c.seat, c.fullName])).toEqual([[1, "Nguyễn Văn An"], [2, "Trần Thị Bình"], [3, "Lê Văn Cường"]]);
    expect(first.cards.every((c) => /^\d{6}$/.test(c.pin) && c.qrToken.length > 20)).toBe(true);
    const st = (await call(t, "GET", `/api/classes/${classId}/credentials`, gv)).json();
    expect(st.students.map((s: { seat: number; hasPin: boolean }) => [s.seat, s.hasPin])).toEqual([[1, true], [2, true], [3, true]]);
    expect(JSON.stringify(st)).not.toContain(first.cards[0]!.pin);
    expect((await issueAll(t, gv, classId)).cards).toHaveLength(0);
    const again = await call(t, "POST", `/api/classes/${classId}/credentials`, gv, { studentIds: [first.cards[1]!.studentId] });
    expect(again.json().cards.map((c: { seat: number }) => c.seat)).toEqual([2]);
    await call(t, "POST", `/api/classes/${classId}/students`, gv, { text: "Đỗ Văn Ánh" });
    const late = await issueAll(t, gv, classId);
    expect(late.cards.map((c) => [c.seat, c.fullName])).toEqual([[4, "Đỗ Văn Ánh"]]);
  });

  it("lớp tổ chức khác: 404", async () => {
    const other = await teacher(t, "gv-2", "Thầy Minh");
    expect((await call(t, "POST", `/api/classes/${classId}/credentials`, other, {})).statusCode).toBe(404);
  });
});

describe("đăng nhập HS", { timeout: 60_000 }, () => {
  it("mã lớp + số thứ tự + PIN; phiên HS chỉ dùng cho /api/student", async () => {
    const { classCode, cards } = await issueAll(t, gv, classId);
    const ok = await call(t, "POST", "/api/student/session", {}, { classCode: classCode.toLowerCase(), seat: "1", pin: cards[0]!.pin });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ expiresInSeconds: 43200, student: { fullName: "Nguyễn Văn An", seat: 1 }, class: { name: "10A1", subject: "Toán" } });
    const hs = bearerOf(ok.json().token);
    expect((await call(t, "GET", "/api/student/me", hs)).json().student.seat).toBe(1);
    expect((await call(t, "GET", "/api/classes", hs)).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/me", gv)).statusCode).toBe(401);
    const bad = await call(t, "POST", "/api/student/session", {}, { classCode, seat: 1, pin: cards[1]!.pin });
    expect(bad.statusCode).toBe(401);
    expect(bad.json().error).toBe("Mã lớp, số thứ tự hoặc PIN chưa đúng");
    for (const body of [{ classCode: "ZZZZZZ", seat: 1, pin: cards[0]!.pin }, { classCode, seat: 9, pin: "123456" }, { classCode, seat: 1 }]) {
      const r = await call(t, "POST", "/api/student/session", {}, body);
      expect([r.statusCode, r.json().error]).toEqual([401, "Mã lớp, số thứ tự hoặc PIN chưa đúng"]);
    }
  });

  it("sai 5 lần thì khoá số thứ tự đó (429 + Retry-After), số khác vẫn vào được", async () => {
    const { classCode, cards } = await issueAll(t, gv, classId);
    const wrong = cards[0]!.pin === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect((await call(t, "POST", "/api/student/session", {}, { classCode, seat: 1, pin: wrong })).statusCode).toBe(401);
    const locked = await call(t, "POST", "/api/student/session", {}, { classCode, seat: 1, pin: cards[0]!.pin });
    expect(locked.statusCode).toBe(429);
    expect(Number(locked.headers["retry-after"])).toBeGreaterThan(500);
    expect((await call(t, "POST", "/api/student/session", {}, { classCode, seat: 2, pin: cards[1]!.pin })).statusCode).toBe(200);
  });

  it("thẻ QR; cấp lại thì QR và phiên cũ hết dùng", async () => {
    const { classCode, cards } = await issueAll(t, gv, classId);
    const qr = await call(t, "POST", "/api/student/session/qr", {}, { token: cards[2]!.qrToken });
    expect(qr.json().student.fullName).toBe("Lê Văn Cường");
    const hs = await loginStudent(t, classCode, cards[2]!);
    await call(t, "POST", `/api/classes/${classId}/credentials`, gv, { studentIds: [cards[2]!.studentId] });
    expect((await call(t, "POST", "/api/student/session/qr", {}, { token: cards[2]!.qrToken })).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/me", hs)).statusCode).toBe(401);
    expect((await call(t, "GET", "/api/student/me", bearerOf(qr.json().token))).statusCode).toBe(401);
    expect((await call(t, "POST", "/api/student/session/qr", {}, { token: "abc.def.ghi" })).statusCode).toBe(401);
  });

  it("tài khoản Keycloak + mã tham gia: tắt thì 403; tự vào lớp; trùng họ tên + ngày sinh chờ GV xác nhận", async () => {
    const st0 = (await call(t, "PUT", `/api/classes/${classId}/join`, gv, { open: false })).json();
    const sv = bearerOf(await t.sign({ sub: "sv-1", name: "Phạm Thị Dung" }));
    expect((await call(t, "POST", "/api/student/session/oidc", sv, { joinCode: st0.joinCode })).statusCode).toBe(403);
    expect((await call(t, "POST", "/api/student/session/oidc", sv, { joinCode: "ZZZZZZ" })).statusCode).toBe(404);
    expect((await call(t, "POST", "/api/student/session/oidc", {}, { joinCode: st0.joinCode })).statusCode).toBe(401);
    const { joinCode } = (await call(t, "PUT", `/api/classes/${classId}/join`, gv, { open: true })).json();
    const r = await call(t, "POST", "/api/student/session/oidc", sv, { joinCode });
    expect(r.statusCode).toBe(200);
    expect(r.json().student).toMatchObject({ fullName: "Phạm Thị Dung", seat: 4 });
    expect((await call(t, "POST", "/api/student/session/oidc", sv, { joinCode })).json().student.id).toBe(r.json().student.id);

    const an = bearerOf(await t.sign({ sub: "sv-2", name: "An" }));
    const p = await call(t, "POST", "/api/student/session/oidc", an, { joinCode, fullName: "nguyễn văn an", dob: "05/03/2010" });
    expect(p.statusCode).toBe(202);
    expect(p.json().pending).toBe(true);
    const st = (await call(t, "GET", `/api/classes/${classId}/credentials`, gv)).json();
    const row = st.students.find((s: { linkPending: boolean }) => s.linkPending);
    expect(row.fullName).toBe("Nguyễn Văn An");
    expect((await call(t, "POST", "/api/student/session/oidc", an, { joinCode })).statusCode).toBe(202);
    expect((await call(t, "POST", `/api/classes/${classId}/students/${row.id}/link`, gv, { approve: true })).json()).toEqual({ approved: true });
    const ok = await call(t, "POST", "/api/student/session/oidc", an, { joinCode });
    expect([ok.statusCode, ok.json().student.id]).toEqual([200, row.id]);
    expect((await call(t, "POST", `/api/classes/${classId}/students/${row.id}/link`, gv, { approve: true })).statusCode).toBe(404);
  });
});
```

- [ ] **Step 3: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/credentials.test.ts` → FAIL (404 ở `/api/classes/:id/credentials`; `buildApp` chưa biết `studentSecret` — test vẫn chạy được vì vitest không kiểm kiểu).

- [ ] **Step 4: Lỗi mới**

Thêm vào cuối `server/src/errors.ts`:

```ts
/** 429: kèm số giây chờ (header Retry-After). */
export class TooManyRequestsError extends Error {
  constructor(
    message: string,
    public retryAfterSec: number,
  ) {
    super(message);
    this.name = "TooManyRequestsError";
  }
}

/** 409: trạng thái không cho phép (bài đã nộp, hết lượt…); extra gửi kèm trong thân lỗi. */
export class ConflictError extends Error {
  constructor(
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ConflictError";
  }
}
```

- [ ] **Step 5: Viết `services/credentials.ts`**

```ts
// server/src/services/credentials.ts
import { randomInt } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { type StudentActor, type StudentAuth, SESSION_TTL_SECONDS, hashPin, verifyPin } from "../auth/student";
import type { Identity } from "../auth/verify";
import type { Db } from "../db/client";
import { ensureUser } from "../db/repo";
import { classes, students } from "../db/schema";
import { ForbiddenError, type Role, assertCan } from "../domain/authz";
import { compareVietnameseNames, normName, parseDob } from "../domain/roster";
import { PinGuard, assignSeats, isCode, isPin, makeCode, makePin, normalizeCode } from "../domain/studentAuth";
import { NotFoundError, TooManyRequestsError, UnauthorizedError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
type ClassRow = typeof classes.$inferSelect;
export type StudentRow = typeof students.$inferSelect;

export type BadgeCard = { studentId: string; seat: number; fullName: string; pin: string; qrToken: string };
export type CredentialStatus = {
  classId: string;
  className: string;
  subject: string | null;
  classCode: string | null;
  joinCode: string | null;
  joinOpen: boolean;
  students: { id: string; seat: number | null; fullName: string; dob: string | null; hasPin: boolean; linked: boolean; linkPending: boolean }[];
};
export type StudentSession = { token: string; expiresInSeconds: number; student: { id: string; fullName: string; seat: number | null }; class: { id: string; name: string; subject: string | null } };
export type JoinPending = { pending: true; message: string };

const Uuid = z.uuid();
const LOGIN_FAIL = "Mã lớp, số thứ tự hoặc PIN chưa đúng";
const QR_FAIL = "Thẻ QR không hợp lệ hoặc đã được cấp lại";
const STALE = "Phiên đã hết, em đăng nhập lại nhé";
const PENDING = "Đã gửi yêu cầu vào lớp. Em chờ giáo viên xác nhận rồi đăng nhập lại nhé.";
export const BadgeLogin = z.object({ classCode: z.string().max(20), seat: z.coerce.number().int().min(1).max(9999), pin: z.string().max(12) });
export const QrLogin = z.object({ token: z.string().min(10).max(2000) });
export const OidcJoin = z.object({ joinCode: z.string().max(20), fullName: z.string().trim().normalize("NFC").min(1).max(80).optional(), dob: z.string().max(20).optional() });
export const IssueInput = z.object({ studentIds: z.array(z.uuid()).max(2000).optional() });

/** Thứ tự danh sách lớp VN (như services/classes.ts): tên → họ đệm → position. */
export const vnOrder = (a: StudentRow, b: StudentRow): number =>
  compareVietnameseNames(a.fullName, b.fullName) || a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();

export async function sortedRoster(db: Db, classId: string): Promise<StudentRow[]> {
  return (await db.select().from(students).where(eq(students.classId, classId))).sort(vnOrder);
}

/** Phiên HS còn hiệu lực với DB: đúng lớp, đúng phiên bản thẻ, không chờ xác nhận. Dùng ở các route không nóng. */
export async function loadFreshStudent(db: Db, sa: StudentActor): Promise<StudentRow> {
  const [s] = await db.select().from(students).where(eq(students.id, sa.studentId));
  if (!s || s.classId !== sa.classId || s.badgeVersion !== sa.ver || s.linkPending) throw new UnauthorizedError(STALE);
  return s;
}

export function createCredentialService(db: Db, auth: StudentAuth, opts: { guard?: PinGuard; now?: () => Date } = {}) {
  const guard = opts.guard ?? new PinGuard();
  const now = opts.now ?? (() => new Date());
  const rand = (n: number) => randomInt(n);

  async function loadClass(orgId: string, classId: string): Promise<ClassRow> {
    if (!Uuid.safeParse(classId).success) throw new NotFoundError("Không tìm thấy lớp");
    const [row] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.orgId, orgId)));
    if (!row) throw new NotFoundError("Không tìm thấy lớp");
    return row;
  }

  async function uniqueCode(col: "code" | "joinCode"): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const c = makeCode(rand);
      const [hit] = await db.select({ id: classes.id }).from(classes).where(eq(col === "code" ? classes.code : classes.joinCode, c));
      if (!hit) return c;
    }
    throw new Error("could not generate a unique class code");
  }

  async function ensureCodes(c: ClassRow): Promise<{ code: string; joinCode: string }> {
    if (c.code && c.joinCode) return { code: c.code, joinCode: c.joinCode };
    const code = c.code ?? (await uniqueCode("code"));
    const joinCode = c.joinCode ?? (await uniqueCode("joinCode"));
    await db.update(classes).set({ code, joinCode }).where(eq(classes.id, c.id));
    return { code, joinCode };
  }

  async function status(actor: Actor, classId: string): Promise<CredentialStatus> {
    assertCan(actor.role, "class:read");
    const c = await loadClass(actor.orgId, classId);
    const rows = await sortedRoster(db, c.id);
    return {
      classId: c.id,
      className: c.name,
      subject: c.subject,
      classCode: c.code,
      joinCode: c.joinCode,
      joinOpen: c.joinOpen,
      students: rows.map((s) => ({ id: s.id, seat: s.seat, fullName: s.fullName, dob: s.dob, hasPin: s.pinHash !== null, linked: s.userId !== null && !s.linkPending, linkPending: s.linkPending })),
    };
  }

  /** Cấp PIN + thẻ QR. Không truyền studentIds: các HS chưa có PIN. Có studentIds: cấp lại (thẻ và phiên cũ hết dùng).
   *  PIN chỉ trả về đúng một lần (DB lưu bản băm). */
  async function issue(actor: Actor, classId: string, raw: unknown): Promise<{ classCode: string; cards: BadgeCard[] }> {
    assertCan(actor.role, "student:credentials");
    const input = IssueInput.parse(raw ?? {});
    const c = await loadClass(actor.orgId, classId);
    const { code } = await ensureCodes(c);
    const before = await sortedRoster(db, c.id);
    const unknown = (input.studentIds ?? []).filter((id) => !before.some((r) => r.id === id));
    if (unknown.length) throw new ValidationError([`Không có học viên ${unknown.join(", ")} trong lớp`]);
    const wanted = input.studentIds ? new Set(input.studentIds) : null;
    const targets = before.filter((r) => (wanted ? wanted.has(r.id) : r.pinHash === null));
    const pins = targets.map(() => makePin(rand));
    const hashes: string[] = [];
    for (let i = 0; i < pins.length; i += 16) hashes.push(...(await Promise.all(pins.slice(i, i + 16).map(hashPin))));
    const updated = await db.transaction(async (tx) => {
      await tx.execute(sql`select id from classes where id = ${c.id} for update`);
      const rows = (await tx.select().from(students).where(eq(students.classId, c.id))).sort(vnOrder);
      const seats = assignSeats(rows);
      for (const [id, seat] of seats) await tx.update(students).set({ seat }).where(eq(students.id, id));
      const out: { id: string; seat: number; fullName: string; ver: number; pin: string }[] = [];
      for (const [i, t] of targets.entries()) {
        const [r] = await tx
          .update(students)
          .set({ pinHash: hashes[i] as string, badgeVersion: sql`${students.badgeVersion} + 1` })
          .where(eq(students.id, t.id))
          .returning({ id: students.id, seat: students.seat, fullName: students.fullName, ver: students.badgeVersion });
        if (r) out.push({ id: r.id, seat: r.seat as number, fullName: r.fullName, ver: r.ver, pin: pins[i] as string });
      }
      return out;
    });
    const cards = await Promise.all(updated.map(async (u) => ({ studentId: u.id, seat: u.seat, fullName: u.fullName, pin: u.pin, qrToken: await auth.signBadge({ studentId: u.id, ver: u.ver }) })));
    return { classCode: code, cards: cards.sort((a, b) => a.seat - b.seat) };
  }

  async function setJoin(actor: Actor, classId: string, open: boolean): Promise<{ classCode: string; joinCode: string; joinOpen: boolean }> {
    assertCan(actor.role, "student:credentials");
    const c = await loadClass(actor.orgId, classId);
    const { code, joinCode } = await ensureCodes(c);
    await db.update(classes).set({ joinOpen: open }).where(eq(classes.id, c.id));
    return { classCode: code, joinCode, joinOpen: open };
  }

  async function resolveLink(actor: Actor, classId: string, studentId: string, approve: boolean): Promise<{ approved: boolean }> {
    assertCan(actor.role, "student:credentials");
    const c = await loadClass(actor.orgId, classId);
    const [s] = Uuid.safeParse(studentId).success ? await db.select().from(students).where(and(eq(students.id, studentId), eq(students.classId, c.id))) : [];
    if (!s?.linkPending) throw new NotFoundError("Không có yêu cầu vào lớp của học viên này");
    await db.update(students).set(approve ? { linkPending: false } : { linkPending: false, userId: null }).where(eq(students.id, s.id));
    return { approved: approve };
  }

  async function sessionFor(s: StudentRow, c: ClassRow): Promise<StudentSession> {
    const token = await auth.signSession({ studentId: s.id, classId: c.id, orgId: c.orgId, ver: s.badgeVersion });
    return { token, expiresInSeconds: SESSION_TTL_SECONDS, student: { id: s.id, fullName: s.fullName, seat: s.seat }, class: { id: c.id, name: c.name, subject: c.subject } };
  }

  async function loginBadge(raw: unknown, ip: string): Promise<StudentSession> {
    const p = BadgeLogin.safeParse(raw);
    if (!p.success) throw new UnauthorizedError(LOGIN_FAIL);
    const code = normalizeCode(p.data.classCode);
    const seatKey = `${code}:${p.data.seat}`;
    const ipKey = `ip:${ip}`;
    const t = now().getTime();
    const wait = guard.lockedFor([seatKey, ipKey], t);
    if (wait > 0) throw new TooManyRequestsError("Sai quá nhiều lần. Em chờ ít phút rồi thử lại nhé.", wait);
    const [row] =
      isCode(code) && isPin(p.data.pin)
        ? await db
            .select({ s: students, c: classes })
            .from(students)
            .innerJoin(classes, eq(classes.id, students.classId))
            .where(and(eq(classes.code, code), eq(students.seat, p.data.seat)))
        : [];
    const ok = await verifyPin(p.data.pin, row?.s.pinHash ?? null);
    if (!row || !ok) {
      guard.fail(seatKey, ipKey, t);
      throw new UnauthorizedError(LOGIN_FAIL);
    }
    guard.success(seatKey);
    return sessionFor(row.s, row.c);
  }

  async function loginQr(raw: unknown): Promise<StudentSession> {
    const p = QrLogin.safeParse(raw);
    if (!p.success) throw new UnauthorizedError(QR_FAIL);
    let b: { studentId: string; ver: number };
    try {
      b = await auth.verifyBadge(p.data.token);
    } catch {
      throw new UnauthorizedError(QR_FAIL);
    }
    const [row] = await db.select({ s: students, c: classes }).from(students).innerJoin(classes, eq(classes.id, students.classId)).where(eq(students.id, b.studentId));
    if (!row || row.s.badgeVersion !== b.ver || row.s.pinHash === null) throw new UnauthorizedError(QR_FAIL);
    return sessionFor(row.s, row.c);
  }

  /** Tài khoản Keycloak + mã tham gia → phiên HS. Trùng họ tên + ngày sinh với HS có sẵn: chờ GV xác nhận. */
  async function loginOidc(identity: Identity, raw: unknown): Promise<StudentSession | JoinPending> {
    const p = OidcJoin.parse(raw);
    const code = normalizeCode(p.joinCode);
    const [c] = isCode(code) ? await db.select().from(classes).where(eq(classes.joinCode, code)) : [];
    if (!c) throw new NotFoundError("Mã tham gia không đúng");
    const user = await ensureUser(db, identity);
    const [mine] = await db.select().from(students).where(and(eq(students.classId, c.id), eq(students.userId, user.id)));
    if (mine) return mine.linkPending ? { pending: true, message: PENDING } : sessionFor(mine, c);
    if (!c.joinOpen) throw new ForbiddenError("Lớp đang tắt mã tham gia. Em hỏi giáo viên nhé.");
    const fullName = (p.fullName ?? identity.name ?? "").trim().replace(/\s+/g, " ");
    if (!fullName) throw new ValidationError(["Thiếu họ tên"]);
    const dob = parseDob(p.dob);
    if (dob === undefined) throw new ValidationError([`Ngày sinh "${p.dob}" sai, dùng dd/mm/yyyy`]);
    return db.transaction(async (tx) => {
      await tx.execute(sql`select id from classes where id = ${c.id} for update`);
      const rows = (await tx.select().from(students).where(eq(students.classId, c.id))).sort(vnOrder);
      const match = dob ? rows.find((r) => r.userId === null && r.dob === dob && normName(r.fullName) === normName(fullName)) : undefined;
      if (match) {
        await tx.update(students).set({ userId: user.id, linkPending: true }).where(eq(students.id, match.id));
        return { pending: true as const, message: PENDING };
      }
      // HS có sẵn chưa có số thứ tự thì cấp theo danh sách trước, HS mới vào sau cùng
      const seats = assignSeats(rows);
      for (const [id, n] of seats) await tx.update(students).set({ seat: n }).where(eq(students.id, id));
      const seat = Math.max(0, ...rows.map((r) => r.seat ?? 0), ...seats.values()) + 1;
      const position = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1;
      const [s] = await tx.insert(students).values({ classId: c.id, fullName, dob, position, seat, userId: user.id }).returning();
      return sessionFor(s as StudentRow, c);
    });
  }

  async function me(sa: StudentActor): Promise<Omit<StudentSession, "token" | "expiresInSeconds">> {
    const s = await loadFreshStudent(db, sa);
    const [c] = await db.select().from(classes).where(eq(classes.id, s.classId));
    if (!c) throw new UnauthorizedError(STALE);
    return { student: { id: s.id, fullName: s.fullName, seat: s.seat }, class: { id: c.id, name: c.name, subject: c.subject } };
  }

  return { status, issue, setJoin, resolveLink, loginBadge, loginQr, loginOidc, me };
}
export type CredentialService = ReturnType<typeof createCredentialService>;
```

- [ ] **Step 6: Viết route**

```ts
// server/src/http/student.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { StudentActor, StudentAuth } from "../auth/student";
import type { VerifyToken } from "../auth/verify";
import { UnauthorizedError } from "../errors";
import type { CredentialService } from "../services/credentials";

export type StudentRouteDeps = {
  auth: StudentAuth;
  verify: VerifyToken;
  credentials: CredentialService;
  /** Giới hạn mỗi bài làm trên các route ghi (lưu, sự kiện, nộp). */
  rateLimit: { max: number; timeWindow: number };
};

export function bearer(req: FastifyRequest): string {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? "");
  if (!m?.[1]) throw new UnauthorizedError("Thiếu access token");
  return m[1];
}

/** /api/student/*: chỉ nhận phiên HS (HS256 do lõi ký); riêng các route đăng nhập thì nhận mã/thẻ/token Keycloak. */
export function registerStudentRoutes(app: FastifyInstance, d: StudentRouteDeps): void {
  app.register(async (s) => {
    const student = async (req: FastifyRequest): Promise<StudentActor> => {
      const token = bearer(req);
      try {
        return await d.auth.verifySession(token);
      } catch {
        throw new UnauthorizedError("Phiên đã hết, em đăng nhập lại nhé");
      }
    };

    s.post("/api/student/session", async (req) => d.credentials.loginBadge(req.body, req.ip));
    s.post("/api/student/session/qr", async (req) => d.credentials.loginQr(req.body));
    s.post("/api/student/session/oidc", async (req, reply) => {
      let identity;
      try {
        identity = await d.verify(bearer(req));
      } catch {
        throw new UnauthorizedError("Em đăng nhập tài khoản trước rồi mới tham gia lớp");
      }
      const r = await d.credentials.loginOidc(identity, req.body);
      return reply.code("pending" in r ? 202 : 200).send(r);
    });
    s.get("/api/student/me", async (req) => d.credentials.me(await student(req)));
  });
}
```

```ts
// server/src/http/classroom.ts
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Actor } from "../service";
import type { CredentialService } from "../services/credentials";

export type ClassroomDeps = { authenticate: (req: FastifyRequest) => Promise<Actor>; credentials: CredentialService };

type P = { Params: { id: string; sid: string } };
const JoinBody = z.object({ open: z.boolean() });
const LinkBody = z.object({ approve: z.boolean() });

/** Route GV cho lớp học trực tuyến: thẻ lớp, mã tham gia. */
export function registerClassroomRoutes(app: FastifyInstance, d: ClassroomDeps): void {
  app.get<P>("/api/classes/:id/credentials", async (req) => d.credentials.status(await d.authenticate(req), req.params.id));
  app.post<P>("/api/classes/:id/credentials", async (req, reply) => reply.code(201).send(await d.credentials.issue(await d.authenticate(req), req.params.id, req.body)));
  app.put<P>("/api/classes/:id/join", async (req) => {
    const actor = await d.authenticate(req);
    return d.credentials.setJoin(actor, req.params.id, JoinBody.parse(req.body).open);
  });
  app.post<P>("/api/classes/:id/students/:sid/link", async (req) => {
    const actor = await d.authenticate(req);
    return d.credentials.resolveLink(actor, req.params.id, req.params.sid, LinkBody.parse(req.body).approve);
  });
}
```

- [ ] **Step 7: Nối vào `app.ts`**

1. Import — thêm ngay dưới dòng import `StreamableHTTPServerTransport`:

```ts
import rateLimit from "@fastify/rate-limit";
import underPressure from "@fastify/under-pressure";
```

thêm dưới `import { type DownloadClaims, createDownloadSigner } from "../auth/download";`:

```ts
import { createStudentAuth } from "../auth/student";
```

thay `import { NotFoundError, UnauthorizedError, ValidationError } from "../errors";` bằng:

```ts
import { ConflictError, NotFoundError, TooManyRequestsError, UnauthorizedError, ValidationError } from "../errors";
import { createCredentialService } from "../services/credentials";
import { registerClassroomRoutes } from "./classroom";
import { registerStudentRoutes } from "./student";
```

2. Thay dòng `export type AppDeps = { … };` bằng:

```ts
export type AppDeps = {
  db: Db;
  verify: VerifyToken;
  issuer: string;
  publicUrl: string;
  downloadSecret: string;
  /** Khoá ký phiên HS + thẻ QR (HS256, ≥ 32 ký tự). */
  studentSecret: string;
  /** Đồng hồ (test truyền đồng hồ giả). */
  now?: () => Date;
  /** Bật @fastify/under-pressure: quá tải trả 503 + Retry-After. Test không bật. */
  pressure?: { maxEventLoopDelay: number };
  /** Giới hạn mỗi bài làm trên route ghi của HS; mặc định 60 lần/phút. */
  studentRateLimit?: { max: number; timeWindow: number };
};
```

3. Ngay sau `const boardsSvc = createBoardService(deps.db);` thêm:

```ts
  const now = deps.now ?? (() => new Date());
  const studentAuth = createStudentAuth(deps.studentSecret);
  const credentials = createCredentialService(deps.db, studentAuth, { now });
```

4. Thay đầu error handler `app.setErrorHandler((err, _req, reply) => {` bằng:

```ts
  if (deps.pressure) app.register(underPressure, { maxEventLoopDelay: deps.pressure.maxEventLoopDelay, retryAfter: 2, exposeStatusRoute: false });
  app.register(rateLimit, { global: false, errorResponseBuilder: (_req, ctx) => ({ statusCode: 429, message: `Gửi quá nhanh, thử lại sau ${Math.ceil(ctx.ttl / 1000)} giây` }) });

  app.setErrorHandler((err, req, reply) => {
```

5. Trong error handler, thay dòng `if ((err as { code?: string }).code === "FST_ERR_CTP_BODY_TOO_LARGE") return …;` bằng:

```ts
    if (err instanceof TooManyRequestsError) return reply.code(429).header("retry-after", String(err.retryAfterSec)).send({ error: err.message });
    if (err instanceof ConflictError) return reply.code(409).send({ error: err.message, ...err.extra });
    const code = (err as { code?: string }).code;
    if (code === "FST_UNDER_PRESSURE") return reply.code(503).send({ error: "Máy chủ đang bận, thử lại sau giây lát" });
    if (code === "FST_ERR_CTP_BODY_TOO_LARGE")
      return reply.code(413).send({ error: req.url.startsWith("/api/boards") ? "Bài giảng quá lớn (tối đa 4 MB) — xoá bớt nét vẽ hoặc tách trang." : "Dữ liệu gửi lên quá lớn" });
```

6. Ngay sau `app.get("/health", async () => ({ ok: true }));` thêm:

```ts

  registerStudentRoutes(app, { auth: studentAuth, verify: deps.verify, credentials, rateLimit: deps.studentRateLimit ?? { max: 60, timeWindow: 60_000 } });
  registerClassroomRoutes(app, { authenticate, credentials });
```

`server/src/main.ts`: trong object `buildApp({ … })` thêm sau `downloadSecret: cfg.DOWNLOAD_SECRET,`:

```ts
  studentSecret: cfg.STUDENT_SECRET,
  pressure: { maxEventLoopDelay: 1000 },
```

- [ ] **Step 8: Xanh + toàn bộ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/credentials.test.ts` → PASS (6 test).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server test` → PASS (test cũ không vỡ).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 9: Commit**

```bash
git add server/package.json pnpm-lock.yaml server/src/errors.ts server/src/services/credentials.ts server/src/http/student.ts server/src/http/classroom.ts server/src/http/app.ts server/src/main.ts server/tests/helpers/app.ts server/tests/helpers/classroom.ts server/tests/http/credentials.test.ts
git commit -m "feat(server): thẻ lớp + đăng nhập HS (mã lớp + STT + PIN, QR, Keycloak + mã tham gia), chống dò PIN, lỗi 409/429/503, rate-limit, under-pressure"
```

---

### Task 6: Giao bài phía GV (service + route)

**Files:**
- Create: `server/src/services/assignments.ts`
- Modify: `server/src/http/classroom.ts`, `server/src/http/app.ts`, `server/tests/helpers/classroom.ts`
- Test: `server/tests/http/assignments.test.ts`

**Interfaces:**
- Consumes: `AssignmentInput`, `resolveSettings`, `ASSIGNMENT_STATUS` (Task 1); `makeVariants`, `rulesForSubject`, `maxPoints`, `round2`; bảng `assignments`, `exams`, `questions`, `students`, `submissions`.
- Produces:
  - `AssignmentSummary = { id, classId, title, kind, subject, status, source: "exam"|"bank", opensAt, dueAt, durationMinutes, attemptsAllowed, showSolution, shuffle, questionCount, variantCodes, maxScore, createdAt }` (ISO cho mọi mốc giờ); `AssignmentListItem = AssignmentSummary & { rosterSize, submitted, inProgress }`; `AssignmentPatch` (zod `{ title?, dueAt?, status? }`); `summarize(row)`.
  - `createAssignmentService(db, { now? }) → { create(actor, classId, raw), list(actor, classId), get(actor, id), update(actor, id, raw), remove(actor, id), load(orgId, id) }`; `AssignmentService`. Task 8 thêm `finalize?` vào options và 4 hàm.
  - Route GV: `GET|POST /api/classes/:id/assignments`, `GET|PATCH|DELETE /api/assignments/:id`.
  - `ClassroomDeps` thêm `assignments: AssignmentService`.
  - `tests/helpers/classroom.ts` thêm `examFor(t, auth, variants = 2)` (5 câu "Mệnh đề": 2 trắc nghiệm, đúng/sai, trả lời ngắn "1,5", tự luận 1 điểm → Toán tối đa 3 điểm, đề 15 phút), `inHours(h, from?)`, `publishFromExam(t, auth, classId, examId, extra?)` (giao luôn, hạn +2 giờ).
- Quy tắc: gia hạn (`dueAt`) thì bài đang làm được tính lại `deadline_at = least(started_at + thời lượng, hạn mới)` (không giới hạn giờ → hạn mới); đã có bài làm thì không về `draft` (409).

- [ ] **Step 1: Helper + test (đỏ)**

Thêm vào cuối `server/tests/helpers/classroom.ts`:

```ts
/** Ngân hàng 5 câu (2 trắc nghiệm, 1 đúng/sai, 1 trả lời ngắn "1,5", 1 tự luận) + đề `variants` mã. Toán: tối đa 3 điểm. */
export async function examFor(t: TApp, auth: Headers, variants = 2): Promise<string> {
  const { essay, mcq, short, tf } = await import("./fixtures");
  for (const q of [mcq(), mcq({ stem: "Số nào là số chẵn?", options: ["1", "3", "4", "5"], answer: 2 }), tf(), short(), essay()]) {
    const r = await call(t, "POST", "/api/questions", auth, q);
    if (r.statusCode !== 201) throw new Error(`question ${r.body}`);
  }
  const cells = (["mcq", "true_false", "short_answer", "essay"] as const).map((type) => ({ topic: "Mệnh đề", level: "NB", type, count: type === "mcq" ? 2 : 1 }));
  const r = await call(t, "POST", "/api/exams", auth, { title: "Kiểm tra 15 phút", variants, durationMinutes: 15, matrix: { subject: "Toán", grade: 10, cells } });
  if (r.statusCode !== 201) throw new Error(`exam ${r.body}`);
  return r.json().examId as string;
}

export const inHours = (h: number, from = new Date()) => new Date(from.getTime() + h * 3600_000).toISOString();

export async function publishFromExam(t: TApp, auth: Headers, classId: string, examId: string, extra: Record<string, unknown> = {}): Promise<{ id: string; [k: string]: unknown }> {
  const r = await call(t, "POST", `/api/classes/${classId}/assignments`, auth, { title: "KT 15 phút", source: { examId }, dueAt: inHours(2), publish: true, ...extra });
  if (r.statusCode !== 201) throw new Error(`assignment ${r.statusCode} ${r.body}`);
  return r.json();
}
```

```ts
// server/tests/http/assignments.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, inHours, publishFromExam, teacher } from "../helpers/classroom";

let t: TApp;
let gv: Headers;
let classId: string;
let examId: string;
beforeEach(async () => {
  t = await testApp();
  gv = await teacher(t);
  classId = await classWithStudents(t, gv);
  examId = await examFor(t, gv);
});
afterEach(async () => {
  await t.app.close();
});

describe("giao bài (GV)", { timeout: 60_000 }, () => {
  it("từ đề: chụp mã đề, mặc định theo loại bài, thời lượng theo đề", async () => {
    const a = await publishFromExam(t, gv, classId, examId);
    expect(a).toMatchObject({ kind: "test", status: "published", source: "exam", subject: "Toán", questionCount: 5, variantCodes: ["101", "102"], maxScore: 3, durationMinutes: 15, attemptsAllowed: 1, showSolution: "after_due", shuffle: false });
    const list = (await call(t, "GET", `/api/classes/${classId}/assignments`, gv)).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, rosterSize: 3, submitted: 0, inProgress: 0 });
    expect((await call(t, "GET", `/api/assignments/${a.id}`, gv)).json().title).toBe("KT 15 phút");
  });

  it("từ nhóm câu ngân hàng: 1 mã đề; luyện tập 3 lượt, lời giải sau khi nộp; nháp", async () => {
    const qs = (await call(t, "GET", "/api/questions?subject=Toán&grade=10&type=mcq", gv)).json() as { id: string }[];
    const r = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "Luyện tập mệnh đề", kind: "practice", source: { questionIds: qs.map((q) => q.id) }, dueAt: inHours(24), durationMinutes: null });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ status: "draft", source: "bank", questionCount: 2, variantCodes: ["101"], attemptsAllowed: 3, showSolution: "after_submit", durationMinutes: null, maxScore: 0.5 });
  });

  it("báo lỗi: hạn đã qua, đề không có, câu không có", async () => {
    const past = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "x", source: { examId }, dueAt: inHours(-1) });
    expect(past.statusCode).toBe(400);
    expect(past.json().issues).toContain("Hạn nộp phải ở tương lai");
    const noExam = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "x", source: { examId: "11111111-1111-4111-8111-111111111111" }, dueAt: inHours(1) });
    expect(noExam.statusCode).toBe(404);
    const noQ = await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "x", source: { questionIds: ["11111111-1111-4111-8111-111111111111"] }, dueAt: inHours(1) });
    expect(noQ.statusCode).toBe(400);
    expect((await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "", source: { examId }, dueAt: inHours(1) })).statusCode).toBe(400);
  });

  it("sửa, đóng, xoá; tổ chức khác không thấy", async () => {
    const a = await publishFromExam(t, gv, classId, examId);
    const due = inHours(5);
    const up = await call(t, "PATCH", `/api/assignments/${a.id}`, gv, { title: "KT sửa", dueAt: due, status: "closed" });
    expect(up.json()).toMatchObject({ title: "KT sửa", status: "closed", dueAt: new Date(due).toISOString() });
    expect((await call(t, "PATCH", `/api/assignments/${a.id}`, gv, { status: "draft" })).json().status).toBe("draft");
    const other = await teacher(t, "gv-2", "Thầy Minh");
    expect((await call(t, "GET", `/api/assignments/${a.id}`, other)).statusCode).toBe(404);
    expect((await call(t, "GET", `/api/classes/${classId}/assignments`, other)).statusCode).toBe(404);
    expect((await call(t, "DELETE", `/api/assignments/${a.id}`, gv)).statusCode).toBe(204);
    expect((await call(t, "GET", `/api/assignments/${a.id}`, gv)).statusCode).toBe(404);
    expect((await call(t, "GET", `/api/assignments/not-a-uuid`, gv)).statusCode).toBe(404);
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/assignments.test.ts` → FAIL (`assignment 404`).

- [ ] **Step 3: Viết `services/assignments.ts`**

```ts
// server/src/services/assignments.ts
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client";
import { assignments, classes, exams, questions, students, submissions } from "../db/schema";
import { AssignmentInput, ASSIGNMENT_STATUS, type AssignmentKind, type AssignmentStatus, type ShowSolution, resolveSettings } from "../domain/assignment";
import { type Role, assertCan } from "../domain/authz";
import { maxPoints, round2, rulesForSubject } from "../domain/scoring";
import { type Variant, makeVariants } from "../domain/variants";
import { ConflictError, NotFoundError, ValidationError } from "../errors";

type Actor = { userId: string; orgId: string; role: Role };
export type AssignmentRow = typeof assignments.$inferSelect;

export type AssignmentSummary = {
  id: string;
  classId: string;
  title: string;
  kind: AssignmentKind;
  subject: string;
  status: AssignmentStatus;
  source: "exam" | "bank";
  opensAt: string;
  dueAt: string;
  durationMinutes: number | null;
  attemptsAllowed: number;
  showSolution: ShowSolution;
  shuffle: boolean;
  questionCount: number;
  variantCodes: string[];
  maxScore: number;
  createdAt: string;
};
export type AssignmentListItem = AssignmentSummary & { rosterSize: number; submitted: number; inProgress: number };

const Uuid = z.uuid();
const Iso = z.iso.datetime({ offset: true });
export const AssignmentPatch = z.object({
  title: z.string().trim().normalize("NFC").min(1).max(160).optional(),
  dueAt: Iso.optional(),
  status: z.enum(ASSIGNMENT_STATUS).optional(),
});

export function summarize(r: AssignmentRow): AssignmentSummary {
  const first = r.variants[0];
  return {
    id: r.id,
    classId: r.classId,
    title: r.title,
    kind: r.kind,
    subject: r.subject,
    status: r.status,
    source: "examId" in r.source ? "exam" : "bank",
    opensAt: r.opensAt.toISOString(),
    dueAt: r.dueAt.toISOString(),
    durationMinutes: r.durationMinutes,
    attemptsAllowed: r.attemptsAllowed,
    showSolution: r.showSolution,
    shuffle: r.shuffle,
    questionCount: first?.items.length ?? 0,
    variantCodes: r.variants.map((v) => v.code),
    maxScore: round2((first?.items ?? []).reduce((s, it) => s + maxPoints(it.question, r.rules), 0)),
    createdAt: r.createdAt.toISOString(),
  };
}

export function createAssignmentService(db: Db, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  async function loadClass(orgId: string, classId: string) {
    if (!Uuid.safeParse(classId).success) throw new NotFoundError("Không tìm thấy lớp");
    const [c] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.orgId, orgId)));
    if (!c) throw new NotFoundError("Không tìm thấy lớp");
    return c;
  }

  async function load(orgId: string, id: string): Promise<AssignmentRow> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài giao");
    const [a] = await db.select().from(assignments).where(and(eq(assignments.id, id), eq(assignments.orgId, orgId)));
    if (!a) throw new NotFoundError("Không tìm thấy bài giao");
    return a;
  }

  /** Giao bài từ đề (chụp các mã đề) hoặc từ nhóm câu ngân hàng (1 mã đề). */
  async function create(actor: Actor, classId: string, raw: unknown): Promise<AssignmentSummary> {
    assertCan(actor.role, "assignment:manage");
    const c = await loadClass(actor.orgId, classId);
    const p = AssignmentInput.parse(raw);
    let variants: Variant[];
    let subject: string;
    let examDuration: number | null = null;
    if ("examId" in p.source) {
      const [exam] = await db.select().from(exams).where(and(eq(exams.id, p.source.examId), eq(exams.orgId, actor.orgId)));
      if (!exam) throw new NotFoundError("Không tìm thấy đề");
      variants = exam.variants;
      subject = exam.matrix.subject;
      examDuration = exam.durationMinutes;
    } else {
      const ids = [...new Set(p.source.questionIds)];
      const rows = await db.select({ id: questions.id, body: questions.body }).from(questions).where(and(eq(questions.orgId, actor.orgId), inArray(questions.id, ids)));
      if (rows.length !== ids.length) throw new ValidationError(["Có câu hỏi không còn trong ngân hàng"]);
      const byId = new Map(rows.map((r) => [r.id, r.body]));
      const picked = ids.map((id) => ({ ...(byId.get(id) as (typeof rows)[number]["body"]), id }));
      variants = makeVariants(picked, 1, randomInt(2147483647));
      subject = picked[0]?.subject ?? c.subject ?? "";
    }
    if (!variants[0]?.items.length) throw new ValidationError(["Đề không có câu hỏi"]);
    const s = resolveSettings(p, now(), examDuration);
    if (!s.ok) throw new ValidationError(s.issues);
    const [row] = await db
      .insert(assignments)
      .values({ orgId: actor.orgId, classId: c.id, ownerId: actor.userId, title: p.title, subject, source: p.source, variants, rules: rulesForSubject(subject), ...s.settings, status: p.publish ? "published" : "draft" })
      .returning();
    if (!row) throw new Error("assignment insert: no row");
    return summarize(row);
  }

  async function list(actor: Actor, classId: string): Promise<AssignmentListItem[]> {
    assertCan(actor.role, "assignment:read");
    const c = await loadClass(actor.orgId, classId);
    const rows = await db.select().from(assignments).where(eq(assignments.classId, c.id)).orderBy(desc(assignments.createdAt));
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(students).where(eq(students.classId, c.id));
    const counts = rows.length
      ? await db
          .select({
            id: submissions.assignmentId,
            submitted: sql<number>`count(distinct ${submissions.studentId}) filter (where ${submissions.status} <> 'in_progress')::int`,
            inProgress: sql<number>`count(*) filter (where ${submissions.status} = 'in_progress')::int`,
          })
          .from(submissions)
          .where(inArray(submissions.assignmentId, rows.map((r) => r.id)))
          .groupBy(submissions.assignmentId)
      : [];
    const by = new Map(counts.map((x) => [x.id, x]));
    return rows.map((r) => ({ ...summarize(r), rosterSize: n, submitted: by.get(r.id)?.submitted ?? 0, inProgress: by.get(r.id)?.inProgress ?? 0 }));
  }

  async function get(actor: Actor, id: string): Promise<AssignmentSummary> {
    assertCan(actor.role, "assignment:read");
    return summarize(await load(actor.orgId, id));
  }

  /** Đổi tên, gia hạn (bài đang làm được nới hạn theo), mở/đóng. Đã có bài làm thì không về nháp. */
  async function update(actor: Actor, id: string, raw: unknown): Promise<AssignmentSummary> {
    assertCan(actor.role, "assignment:manage");
    const a = await load(actor.orgId, id);
    const p = AssignmentPatch.parse(raw);
    const dueAt = p.dueAt ? new Date(p.dueAt) : undefined;
    if (dueAt && dueAt.getTime() <= a.opensAt.getTime()) throw new ValidationError(["Hạn nộp phải sau giờ mở bài"]);
    if (p.status === "draft" && a.status !== "draft") {
      const [has] = await db.select({ id: submissions.id }).from(submissions).where(eq(submissions.assignmentId, id)).limit(1);
      if (has) throw new ConflictError("Bài đã có học sinh làm, không chuyển về nháp được");
    }
    const [row] = await db
      .update(assignments)
      .set({ ...(p.title !== undefined && { title: p.title }), ...(dueAt && { dueAt }), ...(p.status && { status: p.status }) })
      .where(eq(assignments.id, id))
      .returning();
    if (dueAt) {
      const due = dueAt.toISOString();
      await db
        .update(submissions)
        .set({
          deadlineAt:
            a.durationMinutes === null ? dueAt : sql`least(${submissions.startedAt} + make_interval(mins => ${a.durationMinutes}), ${due}::timestamptz)`,
        })
        .where(and(eq(submissions.assignmentId, id), eq(submissions.status, "in_progress")));
    }
    return summarize(row as AssignmentRow);
  }

  async function remove(actor: Actor, id: string): Promise<void> {
    assertCan(actor.role, "assignment:manage");
    await load(actor.orgId, id);
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  return { create, list, get, update, remove, load };
}
export type AssignmentService = ReturnType<typeof createAssignmentService>;
```

- [ ] **Step 4: Route + nối**

`server/src/http/classroom.ts`:
- thêm `import type { AssignmentService } from "../services/assignments";` trên dòng import `CredentialService`;
- đổi `ClassroomDeps` thành `{ authenticate: (req: FastifyRequest) => Promise<Actor>; credentials: CredentialService; assignments: AssignmentService }`;
- sửa chú thích thành `/** Route GV cho lớp học trực tuyến: thẻ lớp, mã tham gia, bài giao. */`;
- thêm vào cuối thân `registerClassroomRoutes`:

```ts
  app.get<P>("/api/classes/:id/assignments", async (req) => d.assignments.list(await d.authenticate(req), req.params.id));
  app.post<P>("/api/classes/:id/assignments", async (req, reply) => reply.code(201).send(await d.assignments.create(await d.authenticate(req), req.params.id, req.body)));
  app.get<P>("/api/assignments/:id", async (req) => d.assignments.get(await d.authenticate(req), req.params.id));
  app.patch<P>("/api/assignments/:id", async (req) => d.assignments.update(await d.authenticate(req), req.params.id, req.body));
  app.delete<P>("/api/assignments/:id", async (req, reply) => {
    await d.assignments.remove(await d.authenticate(req), req.params.id);
    return reply.code(204).send();
  });
```

`server/src/http/app.ts`:
- thêm `import { createAssignmentService } from "../services/assignments";` trên dòng import `createCredentialService`;
- sau `const credentials = createCredentialService(…);` thêm `const assignmentsSvc = createAssignmentService(deps.db, { now });`;
- đổi `registerClassroomRoutes(app, { authenticate, credentials });` thành `registerClassroomRoutes(app, { authenticate, credentials, assignments: assignmentsSvc });`.

- [ ] **Step 5: Xanh**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/assignments.test.ts` → PASS (4 test).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/assignments.ts server/src/http/classroom.ts server/src/http/app.ts server/tests/helpers/classroom.ts server/tests/http/assignments.test.ts
git commit -m "feat(server): giao bài cho lớp — từ đề (chụp mã đề) hoặc nhóm câu ngân hàng, hạn nộp, thời lượng, số lượt, lời giải, đảo câu; sửa/gia hạn/đóng/xoá"
```

---

### Task 7: Phòng làm bài phía server — vào bài, tự lưu, rời tab, nộp, chốt bài quá hạn

**Files:**
- Create: `server/src/services/submissions.ts`
- Modify: `server/src/http/student.ts`, `server/src/http/app.ts`, `server/src/main.ts`
- Test: `server/tests/http/submissions.test.ts`

**Interfaces:**
- Consumes: Task 1 (`SaveBody`, `pickVariant`, `variantByCode`, `displayOrder`, `publicItems`, `computeDeadline`, `saveCutoff`, `isExpired`, `gradeAnswers`, `reviewItems`, `resultLevel`, `studentState`, `answeredCount`, `toScore10`), `loadFreshStudent` (Task 5), bảng Task 4.
- Produces (kiểu web Task 9 phải khớp y hệt):
  - `RoomPayload = { submission: { id, attempt, status, seq, answers, startedAt, deadlineAt, variantCode }, assignment: { id, title, kind, subject, durationMinutes, dueAt, attemptsAllowed }, questions: PublicItem[], serverNow }`.
  - `SaveResult = { ok: true, seq, serverNow, deadlineAt }`.
  - `StudentResult = { submissionId, assignmentId, title, status, attempt, attemptsAllowed, attemptsUsed, canRetry, score, maxScore, score10, pending, correctCount, startedAt, submittedAt, level, items: ReviewItem[] }`.
  - `MyAssignment = { id, title, kind, subject, questionCount, durationMinutes, opensAt, dueAt, attemptsAllowed, attemptsUsed, state, canStart, answered, score10, currentSubmissionId, lastSubmissionId }`.
  - `EventsBody`; `createSubmissionService(db, { now? }) → { listMine, start, save, events, submit, result, finalize(id, { studentId?, body? }): Promise<boolean>, finalizeExpired({ assignmentId?, limit? }): Promise<number> }`; `SubmissionService`.
  - Route HS: `GET /api/student/assignments`, `POST /api/student/assignments/:id/start`, `PUT /api/student/submissions/:id/answers` (bodyLimit 256 KB, rate-limit), `POST …/events` (rate-limit), `POST …/submit` (bodyLimit 256 KB, rate-limit), `GET /api/student/submissions/:id`. Khoá rate-limit = `"<submissionId>:<route>"`.
  - `StudentRouteDeps` thêm `submissions`; `AppDeps` thêm `sweepMs?: number` (bật `setInterval` trong `onReady`, `unref()`, dừng ở `onClose`).
- Quy tắc then chốt:
  - Tự lưu thành công = **một** `UPDATE … RETURNING`. Trượt mới `SELECT`: còn hạn + seq cũ/trùng → 200 với seq máy chủ (idempotent); quá hạn + ân hạn → chốt bài rồi 409 `{ status: "auto_submitted" }`; đã nộp → 409 `{ status }`.
  - Nộp: `finalize` trong giao dịch có `FOR UPDATE`; bản gửi kèm chỉ dùng khi chưa quá hạn + ân hạn và `seq` mới hơn; quá hạn → `auto_submitted` bằng bản đã lưu, `submitted_at = deadline_at`. Nộp lại → trả kết quả cũ.
  - `listMine`, `start`, `result` gọi `loadFreshStudent` (thẻ bị cấp lại → 401) và chốt bài quá hạn của chính HS trước khi trả.

- [ ] **Step 1: Test (đỏ)**

```ts
// server/tests/http/submissions.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { createSubmissionService } from "../../src/services/submissions";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, inHours, issueAll, loginStudent, publishFromExam, teacher } from "../helpers/classroom";
import { responsesFromKey } from "../helpers/fixtures";

let t: TApp;
let clock: Date;
const tick = (ms: number) => {
  clock = new Date(clock.getTime() + ms);
};
afterEach(async () => {
  await t.app.close();
});

async function setup(extra: Record<string, unknown> = {}, opts: { studentRateLimit?: { max: number; timeWindow: number } } = {}) {
  clock = new Date();
  t = await testApp({ now: () => clock, ...opts });
  const gv = await teacher(t);
  const classId = await classWithStudents(t, gv);
  const examId = await examFor(t, gv);
  const a = await publishFromExam(t, gv, classId, examId, extra);
  const { classCode, cards } = await issueAll(t, gv, classId);
  const hs = await Promise.all(cards.map((c) => loginStudent(t, classCode, c)));
  return { gv, classId, examId, a, hs };
}
const start = async (hs: Headers, id: string) => {
  const r = await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {});
  if (r.statusCode !== 200) throw new Error(`start ${r.statusCode} ${r.body}`);
  return r.json();
};
const save = (hs: Headers, sid: string, seq: number, answers: Record<string, unknown>) => call(t, "PUT", `/api/student/submissions/${sid}/answers`, hs, { seq, answers });

describe("phòng làm bài", { timeout: 60_000 }, () => {
  it("vào bài → câu hỏi không lộ đáp án → tự lưu theo seq → nộp idempotent → kết quả theo show_solution", async () => {
    const { gv, examId, a, hs } = await setup();
    const list = (await call(t, "GET", "/api/student/assignments", hs[0]!)).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: a.id, state: "chua_lam", canStart: true, questionCount: 5, attemptsUsed: 0 });

    const room = await start(hs[0]!, a.id);
    expect(room.submission).toMatchObject({ attempt: 1, seq: 0, answers: {}, status: "in_progress", variantCode: "101" });
    expect(new Date(room.submission.deadlineAt).getTime() - clock.getTime()).toBe(15 * 60_000);
    expect(room.questions).toHaveLength(5);
    expect(JSON.stringify(room.questions)).not.toMatch(/"answer"|"explanation"|"rubric"|"questionId"/);
    expect(room.serverNow).toBe(clock.toISOString());
    const sid = room.submission.id as string;

    expect((await save(hs[0]!, sid, 1, { "1": 0 })).json()).toMatchObject({ ok: true, seq: 1, deadlineAt: room.submission.deadlineAt });
    expect((await save(hs[0]!, sid, 3, { "1": 1, "2": 2 })).json().seq).toBe(3);
    expect((await save(hs[0]!, sid, 2, { "1": 3 })).json()).toMatchObject({ ok: true, seq: 3 });
    const again = await start(hs[0]!, a.id);
    expect([again.submission.id, again.submission.seq, again.submission.answers]).toEqual([sid, 3, { "1": 1, "2": 2 }]);
    expect((await save(hs[0]!, sid, 4, { "1": 9 })).statusCode).toBe(400);
    expect((await call(t, "GET", "/api/student/assignments", hs[0]!)).json()[0]).toMatchObject({ state: "dang_lam", answered: 2, currentSubmissionId: sid });

    const key = ((await call(t, "GET", `/api/exams/${examId}/key`, gv)).json() as { code: string; entries: never[] }[]).find((k) => k.code === "101")!;
    const answers = { ...responsesFromKey(key.entries), [String(key.entries.find((e: { section: string }) => e.section === "short_answer")!["no"])]: "\\frac{3}{2}" };
    const sub = await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs[0]!, { seq: 4, answers });
    expect(sub.statusCode).toBe(200);
    const res = sub.json();
    expect(res).toMatchObject({ status: "submitted", score: 2, maxScore: 3, score10: 6.67, pending: 1, correctCount: 4, level: "marks", attemptsUsed: 1, canRetry: false });
    expect(JSON.stringify(res.items)).not.toMatch(/"key"|"explanation"/);
    const twice = await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs[0]!, { seq: 9, answers: {} });
    expect(twice.json()).toMatchObject({ status: "submitted", score: 2 });
    expect((await save(hs[0]!, sid, 10, {})).json()).toMatchObject({ status: "submitted" });
    expect((await save(hs[0]!, sid, 10, {})).statusCode).toBe(409);
    const more = await call(t, "POST", `/api/student/assignments/${a.id}/start`, hs[0]!, {});
    expect([more.statusCode, more.json().error]).toEqual([409, "Em đã dùng hết lượt làm bài này"]);
    expect((await call(t, "GET", "/api/student/assignments", hs[0]!)).json()[0]).toMatchObject({ state: "da_nop", canStart: false, score10: 6.67, lastSubmissionId: sid });

    tick(3 * 3600_000);
    const after = (await call(t, "GET", `/api/student/submissions/${sid}`, hs[0]!)).json();
    expect(after.level).toBe("full");
    expect(after.items.find((i: { type: string }) => i.type === "mcq").key).toMatch(/^[ABCD]$/);
  });

  it("hết giờ: còn lưu trong 30 giây ân hạn, sau đó 409 và bài tự nộp bằng bản đã lưu", async () => {
    const { a, hs } = await setup({ durationMinutes: 10 });
    const sid = (await start(hs[0]!, a.id)).submission.id;
    await save(hs[0]!, sid, 1, { "1": 0 });
    tick(10 * 60_000 + 20_000);
    expect((await save(hs[0]!, sid, 2, { "1": 0, "2": 1 })).statusCode).toBe(200);
    tick(11_000);
    const late = await save(hs[0]!, sid, 3, { "1": 3 });
    expect([late.statusCode, late.json().status]).toEqual([409, "auto_submitted"]);
    const r = (await call(t, "GET", `/api/student/submissions/${sid}`, hs[0]!)).json();
    expect(r.status).toBe("auto_submitted");
    expect(r.items.filter((i: { response: unknown }) => i.response !== null)).toHaveLength(2);
    const lateSubmit = await call(t, "POST", `/api/student/submissions/${sid}/submit`, hs[0]!, { seq: 5, answers: { "1": 3 } });
    expect(lateSubmit.json().status).toBe("auto_submitted");
  });

  it("nộp muộn quá ân hạn: bỏ bản gửi kèm; quét định kỳ chốt bài bỏ dở", async () => {
    const { a, hs } = await setup({ durationMinutes: 10 });
    const s0 = (await start(hs[0]!, a.id)).submission.id;
    const s1 = (await start(hs[1]!, a.id)).submission.id;
    await save(hs[0]!, s0, 1, { "1": 0 });
    tick(11 * 60_000);
    const r = await call(t, "POST", `/api/student/submissions/${s0}/submit`, hs[0]!, { seq: 2, answers: { "1": 0, "2": 1 } });
    expect(r.json()).toMatchObject({ status: "auto_submitted" });
    expect(r.json().items.filter((i: { response: unknown }) => i.response !== null)).toHaveLength(1);
    const sweeper = createSubmissionService(t.db, { now: () => clock });
    expect(await sweeper.finalizeExpired()).toBe(1);
    expect(await sweeper.finalizeExpired()).toBe(0);
    expect((await call(t, "GET", `/api/student/submissions/${s1}`, hs[1]!)).json()).toMatchObject({ status: "auto_submitted", score: 0 });
  });

  it("mã đề theo số thứ tự; đảo câu giữ thứ tự phần", async () => {
    const { a, hs } = await setup({ shuffle: true });
    const r1 = await start(hs[0]!, a.id);
    const r2 = await start(hs[1]!, a.id);
    expect([r1.submission.variantCode, r2.submission.variantCode]).toEqual(["101", "102"]);
    const order = ["mcq", "true_false", "short_answer", "essay"];
    const types = (r1.questions as { type: string }[]).map((q) => order.indexOf(q.type));
    expect(types).toEqual([...types].sort());
  });

  it("rời tab cộng leave_count; GV gia hạn thì bài đang làm được nới hạn", async () => {
    const { gv, a, hs } = await setup({ durationMinutes: null });
    const room = await start(hs[0]!, a.id);
    const ev = await call(t, "POST", `/api/student/submissions/${room.submission.id}/events`, hs[0]!, { events: [{ kind: "leave" }, { kind: "return" }, { kind: "leave" }] });
    expect(ev.json()).toEqual({ ok: true, leaveCount: 2 });
    const due = inHours(6, clock);
    await call(t, "PATCH", `/api/assignments/${a.id}`, gv, { dueAt: due });
    expect((await start(hs[0]!, a.id)).submission.deadlineAt).toBe(new Date(due).toISOString());
  });

  it("luyện tập nhiều lượt: nộp xong làm lại được, lượt mới", async () => {
    const { a, hs } = await setup({ kind: "practice" });
    const s1 = (await start(hs[0]!, a.id)).submission.id;
    const res = (await call(t, "POST", `/api/student/submissions/${s1}/submit`, hs[0]!, { seq: 1, answers: {} })).json();
    expect(res).toMatchObject({ level: "full", canRetry: true, attemptsAllowed: 3 });
    const r2 = await start(hs[0]!, a.id);
    expect(r2.submission.attempt).toBe(2);
    expect(r2.submission.id).not.toBe(s1);
  });

  it("cô lập: bài người khác 404, token GV 401, bài nháp ẩn, quá giới hạn tần suất 429", async () => {
    const { gv, classId, examId, a, hs } = await setup({}, { studentRateLimit: { max: 3, timeWindow: 60_000 } });
    const sid = (await start(hs[0]!, a.id)).submission.id;
    expect((await save(hs[1]!, sid, 1, {})).statusCode).toBe(404);
    expect((await call(t, "GET", `/api/student/submissions/${sid}`, hs[1]!)).statusCode).toBe(404);
    expect((await call(t, "GET", "/api/student/assignments", gv)).statusCode).toBe(401);
    expect((await save(hs[0]!, "x", 1, {})).statusCode).toBe(404);
    await call(t, "POST", `/api/classes/${classId}/assignments`, gv, { title: "Nháp", source: { examId }, dueAt: inHours(3, clock) });
    expect((await call(t, "GET", "/api/student/assignments", hs[0]!)).json()).toHaveLength(1);
    for (let i = 1; i <= 2; i++) expect((await save(hs[0]!, sid, i, {})).statusCode).toBe(200);
    const limited = await save(hs[0]!, sid, 4, {});
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});
```

- [ ] **Step 2: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/submissions.test.ts` → FAIL (404 ở `/api/student/assignments`).

- [ ] **Step 3: Viết `services/submissions.ts`**

```ts
// server/src/services/submissions.ts
import { randomInt } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { z } from "zod";
import type { StudentActor } from "../auth/student";
import type { Db } from "../db/client";
import { answerItems, assignments, submissionEvents, submissions } from "../db/schema";
import {
  type Answers,
  type AssignmentKind,
  type PublicItem,
  type ResultLevel,
  type ReviewItem,
  type StudentState,
  type SubmissionStatus,
  SaveBody,
  answeredCount,
  computeDeadline,
  displayOrder,
  gradeAnswers,
  isExpired,
  pickVariant,
  publicItems,
  resultLevel,
  reviewItems,
  saveCutoff,
  studentState,
  toScore10,
  variantByCode,
} from "../domain/assignment";
import { ConflictError, NotFoundError } from "../errors";
import { loadFreshStudent } from "./credentials";

export type RoomPayload = {
  submission: { id: string; attempt: number; status: SubmissionStatus; seq: number; answers: Answers; startedAt: string; deadlineAt: string; variantCode: string };
  assignment: { id: string; title: string; kind: AssignmentKind; subject: string; durationMinutes: number | null; dueAt: string; attemptsAllowed: number };
  questions: PublicItem[];
  serverNow: string;
};
export type SaveResult = { ok: true; seq: number; serverNow: string; deadlineAt: string };
export type StudentResult = {
  submissionId: string;
  assignmentId: string;
  title: string;
  status: SubmissionStatus;
  attempt: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  canRetry: boolean;
  score: number | null;
  maxScore: number | null;
  score10: number | null;
  pending: number;
  correctCount: number;
  startedAt: string;
  submittedAt: string | null;
  level: ResultLevel;
  items: ReviewItem[];
};
export type MyAssignment = {
  id: string;
  title: string;
  kind: AssignmentKind;
  subject: string;
  questionCount: number;
  durationMinutes: number | null;
  opensAt: string;
  dueAt: string;
  attemptsAllowed: number;
  attemptsUsed: number;
  state: StudentState;
  canStart: boolean;
  answered: number;
  score10: number | null;
  currentSubmissionId: string | null;
  lastSubmissionId: string | null;
};

const Uuid = z.uuid();
export const EventsBody = z.object({ events: z.array(z.object({ kind: z.enum(["leave", "return"]) })).min(1).max(50) });
type SubRow = typeof submissions.$inferSelect;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export function createSubmissionService(db: Db, opts: { now?: () => Date } = {}) {
  const now = opts.now ?? (() => new Date());

  const subsOf = (assignmentId: string, studentId: string) =>
    db.select().from(submissions).where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).orderBy(asc(submissions.attempt));

  async function loadForStudent(sa: StudentActor, assignmentId: string) {
    if (!Uuid.safeParse(assignmentId).success) throw new NotFoundError("Không tìm thấy bài");
    const [a] = await db.select().from(assignments).where(and(eq(assignments.id, assignmentId), eq(assignments.classId, sa.classId), ne(assignments.status, "draft")));
    if (!a) throw new NotFoundError("Không tìm thấy bài");
    return a;
  }

  /** Chốt một bài trong một giao dịch: khoá dòng, chấm, ghi answer_items. Bài đã chốt thì không làm gì (trả false). */
  async function finalize(id: string, o: { studentId?: string; body?: SaveBody } = {}): Promise<boolean> {
    const t = now();
    return db.transaction(async (tx: Tx) => {
      const [s] = await tx.select().from(submissions).where(eq(submissions.id, id)).for("update");
      if (!s || (o.studentId !== undefined && s.studentId !== o.studentId)) throw new NotFoundError("Không tìm thấy bài làm");
      if (s.status !== "in_progress") return false;
      const [a] = await tx.select({ variants: assignments.variants, rules: assignments.rules }).from(assignments).where(eq(assignments.id, s.assignmentId));
      if (!a) throw new NotFoundError("Không tìm thấy bài");
      const late = isExpired(s.deadlineAt, t);
      const useBody = o.body !== undefined && !late && o.body.seq > s.seq;
      const answers = useBody ? (o.body as SaveBody).answers : s.answers;
      const g = gradeAnswers(variantByCode(a.variants, s.variantCode), answers, a.rules);
      await tx
        .update(submissions)
        .set({
          status: o.body !== undefined && !late ? "submitted" : "auto_submitted",
          submittedAt: late ? s.deadlineAt : t,
          answers,
          seq: useBody ? (o.body as SaveBody).seq : s.seq,
          score: g.score,
          maxScore: g.maxScore,
          pending: g.pending,
          updatedAt: t,
        })
        .where(eq(submissions.id, id));
      if (g.items.length) await tx.insert(answerItems).values(g.items.map((i) => ({ ...i, submissionId: id, assignmentId: s.assignmentId })));
      return true;
    });
  }

  /** Chốt các bài quá hạn + ân hạn (gọi khi đọc và mỗi phút từ main.ts). */
  async function finalizeExpired(o: { assignmentId?: string; limit?: number } = {}): Promise<number> {
    const conds = [eq(submissions.status, "in_progress"), lt(submissions.deadlineAt, saveCutoff(now()))];
    if (o.assignmentId) conds.push(eq(submissions.assignmentId, o.assignmentId));
    const ids = await db.select({ id: submissions.id }).from(submissions).where(and(...conds)).limit(o.limit ?? 500);
    let n = 0;
    for (const { id } of ids) if (await finalize(id)) n++;
    return n;
  }

  async function listMine(sa: StudentActor): Promise<MyAssignment[]> {
    await loadFreshStudent(db, sa);
    const rows = await db.select().from(assignments).where(and(eq(assignments.classId, sa.classId), ne(assignments.status, "draft"))).orderBy(desc(assignments.dueAt));
    if (!rows.length) return [];
    const load = () => db.select().from(submissions).where(and(eq(submissions.studentId, sa.studentId), inArray(submissions.assignmentId, rows.map((r) => r.id))));
    let subs = await load();
    const t = now();
    const expired = subs.filter((s) => s.status === "in_progress" && isExpired(s.deadlineAt, t));
    if (expired.length) {
      for (const s of expired) await finalize(s.id);
      subs = await load();
    }
    return rows.map((a) => {
      const mine = subs.filter((s) => s.assignmentId === a.id).sort((x, y) => x.attempt - y.attempt);
      const cur = mine.find((s) => s.status === "in_progress");
      const done = mine.filter((s) => s.status !== "in_progress");
      const best = done.reduce<number | null>((m, s) => Math.max(m ?? -1, toScore10(s.score, s.maxScore) ?? -1), null);
      const st = studentState(a, mine, t);
      return {
        id: a.id,
        title: a.title,
        kind: a.kind,
        subject: a.subject,
        questionCount: a.variants[0]?.items.length ?? 0,
        durationMinutes: a.durationMinutes,
        opensAt: a.opensAt.toISOString(),
        dueAt: a.dueAt.toISOString(),
        attemptsAllowed: a.attemptsAllowed,
        attemptsUsed: mine.length,
        state: st.state,
        canStart: st.canStart,
        answered: cur ? answeredCount(cur.answers) : 0,
        score10: best === null || best < 0 ? null : best,
        currentSubmissionId: cur?.id ?? null,
        lastSubmissionId: done[done.length - 1]?.id ?? null,
      };
    });
  }

  /** Vào phòng: tiếp tục lượt đang làm, hoặc mở lượt mới nếu còn lượt và bài đang mở. */
  async function start(sa: StudentActor, assignmentId: string): Promise<RoomPayload> {
    const me = await loadFreshStudent(db, sa);
    const a = await loadForStudent(sa, assignmentId);
    const t = now();
    let subs = await subsOf(a.id, sa.studentId);
    const stale = subs.find((s) => s.status === "in_progress" && isExpired(s.deadlineAt, t));
    if (stale) {
      await finalize(stale.id);
      subs = await subsOf(a.id, sa.studentId);
    }
    let cur: SubRow | undefined = subs.find((s) => s.status === "in_progress");
    if (!cur) {
      const st = studentState(a, subs, t);
      if (!st.canStart) throw new ConflictError(subs.length >= a.attemptsAllowed ? "Em đã dùng hết lượt làm bài này" : "Bài chưa mở hoặc đã hết hạn", { state: st.state });
      const v = pickVariant(a.variants, me.seat, sa.studentId);
      const [ins] = await db
        .insert(submissions)
        .values({
          assignmentId: a.id,
          studentId: sa.studentId,
          attempt: subs.reduce((m, s) => Math.max(m, s.attempt), 0) + 1,
          variantCode: v.code,
          seed: randomInt(2147483647),
          startedAt: t,
          deadlineAt: computeDeadline(t, a.durationMinutes, a.dueAt),
          updatedAt: t,
        })
        .onConflictDoNothing()
        .returning();
      cur = ins ?? (await subsOf(a.id, sa.studentId)).find((s) => s.status === "in_progress");
      if (!cur) throw new ConflictError("Bài đang được mở ở máy khác, em tải lại trang nhé");
    }
    const v = variantByCode(a.variants, cur.variantCode);
    return {
      submission: { id: cur.id, attempt: cur.attempt, status: cur.status, seq: cur.seq, answers: cur.answers, startedAt: cur.startedAt.toISOString(), deadlineAt: cur.deadlineAt.toISOString(), variantCode: cur.variantCode },
      assignment: { id: a.id, title: a.title, kind: a.kind, subject: a.subject, durationMinutes: a.durationMinutes, dueAt: a.dueAt.toISOString(), attemptsAllowed: a.attemptsAllowed },
      questions: publicItems(v, displayOrder(v, a.shuffle, cur.seed), a.rules),
      serverNow: t.toISOString(),
    };
  }

  /** Tự lưu: đúng MỘT câu UPDATE theo khoá chính (không đọc trước). Trượt thì mới đọc để giải thích. */
  async function save(sa: StudentActor, id: string, raw: unknown): Promise<SaveResult> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    const p = SaveBody.parse(raw);
    const t = now();
    const [row] = await db
      .update(submissions)
      .set({ answers: p.answers, seq: p.seq, updatedAt: t })
      .where(and(eq(submissions.id, id), eq(submissions.studentId, sa.studentId), lt(submissions.seq, p.seq), eq(submissions.status, "in_progress"), gte(submissions.deadlineAt, saveCutoff(t))))
      .returning({ seq: submissions.seq, deadlineAt: submissions.deadlineAt });
    if (row) return { ok: true, seq: row.seq, serverNow: t.toISOString(), deadlineAt: row.deadlineAt.toISOString() };
    const [s] = await db.select({ studentId: submissions.studentId, status: submissions.status, seq: submissions.seq, deadlineAt: submissions.deadlineAt }).from(submissions).where(eq(submissions.id, id));
    if (!s || s.studentId !== sa.studentId) throw new NotFoundError("Không tìm thấy bài làm");
    if (s.status === "in_progress" && !isExpired(s.deadlineAt, t)) return { ok: true, seq: s.seq, serverNow: t.toISOString(), deadlineAt: s.deadlineAt.toISOString() };
    if (s.status === "in_progress") await finalize(id);
    throw new ConflictError(s.status === "in_progress" ? "Đã hết giờ làm bài. Bài đã được nộp với các câu đã lưu." : "Bài đã nộp rồi", { status: s.status === "in_progress" ? "auto_submitted" : s.status });
  }

  async function events(sa: StudentActor, id: string, raw: unknown): Promise<{ ok: true; leaveCount: number }> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    const p = EventsBody.parse(raw);
    const leaves = p.events.filter((e) => e.kind === "leave").length;
    const [row] = await db
      .update(submissions)
      .set({ leaveCount: sql`${submissions.leaveCount} + ${leaves}` })
      .where(and(eq(submissions.id, id), eq(submissions.studentId, sa.studentId), eq(submissions.status, "in_progress")))
      .returning({ leaveCount: submissions.leaveCount });
    if (!row) throw new NotFoundError("Không tìm thấy bài đang làm");
    await db.insert(submissionEvents).values(p.events.map((e) => ({ submissionId: id, kind: e.kind, at: now() })));
    return { ok: true, leaveCount: row.leaveCount };
  }

  /** Nộp: idempotent. Quá hạn + ân hạn thì bỏ bản gửi kèm, chốt bằng bản đã lưu (auto_submitted). */
  async function submit(sa: StudentActor, id: string, raw: unknown): Promise<StudentResult> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    await finalize(id, { studentId: sa.studentId, body: SaveBody.parse(raw) });
    return resultOf(sa, id);
  }

  async function result(sa: StudentActor, id: string): Promise<StudentResult> {
    await loadFreshStudent(db, sa);
    return resultOf(sa, id);
  }

  async function resultOf(sa: StudentActor, id: string): Promise<StudentResult> {
    if (!Uuid.safeParse(id).success) throw new NotFoundError("Không tìm thấy bài làm");
    const t = now();
    let [s] = await db.select().from(submissions).where(and(eq(submissions.id, id), eq(submissions.studentId, sa.studentId)));
    if (!s) throw new NotFoundError("Không tìm thấy bài làm");
    if (s.status === "in_progress" && isExpired(s.deadlineAt, t)) {
      await finalize(id);
      [s] = await db.select().from(submissions).where(eq(submissions.id, id));
    }
    if (!s || s.status === "in_progress") throw new ConflictError("Bài chưa nộp", { status: "in_progress" });
    const [a] = await db.select().from(assignments).where(eq(assignments.id, s.assignmentId));
    if (!a) throw new NotFoundError("Không tìm thấy bài");
    const items = await db.select({ no: answerItems.no, points: answerItems.points, correct: answerItems.correct }).from(answerItems).where(eq(answerItems.submissionId, id));
    const all = await subsOf(a.id, sa.studentId);
    const v = variantByCode(a.variants, s.variantCode);
    const level = resultLevel(a.showSolution, a.dueAt, t);
    return {
      submissionId: s.id,
      assignmentId: a.id,
      title: a.title,
      status: s.status,
      attempt: s.attempt,
      attemptsAllowed: a.attemptsAllowed,
      attemptsUsed: all.length,
      canRetry: studentState(a, all, t).canStart && !all.some((x) => x.status === "in_progress"),
      score: s.score,
      maxScore: s.maxScore,
      score10: toScore10(s.score, s.maxScore),
      pending: s.pending,
      correctCount: level === "score" ? 0 : items.filter((i) => i.correct === true).length,
      startedAt: s.startedAt.toISOString(),
      submittedAt: s.submittedAt?.toISOString() ?? null,
      level,
      items: reviewItems(v, displayOrder(v, a.shuffle, s.seed), a.rules, s.answers, new Map(items.map((i) => [i.no, i])), level),
    };
  }

  return { listMine, start, save, events, submit, result, finalize, finalizeExpired };
}
export type SubmissionService = ReturnType<typeof createSubmissionService>;
```

- [ ] **Step 4: Route HS**

`server/src/http/student.ts`:
- thêm `import type { SubmissionService } from "../services/submissions";` dưới import `CredentialService`;
- trong `StudentRouteDeps` thêm `submissions: SubmissionService;` sau `credentials`;
- trong `app.register(async (s) => { … })`, sau dòng `s.get("/api/student/me", …);` thêm:

```ts

    type P = { Params: { id: string } };
    const SMALL = 256 * 1024;
    const limited = { rateLimit: { ...d.rateLimit, keyGenerator: (req: FastifyRequest) => `${(req.params as { id: string }).id}:${req.routeOptions.url}` } };
    s.get("/api/student/assignments", async (req) => d.submissions.listMine(await student(req)));
    s.post<P>("/api/student/assignments/:id/start", async (req) => d.submissions.start(await student(req), req.params.id));
    s.put<P>("/api/student/submissions/:id/answers", { bodyLimit: SMALL, config: limited }, async (req) => d.submissions.save(await student(req), req.params.id, req.body));
    s.post<P>("/api/student/submissions/:id/events", { config: limited }, async (req) => d.submissions.events(await student(req), req.params.id, req.body));
    s.post<P>("/api/student/submissions/:id/submit", { bodyLimit: SMALL, config: limited }, async (req) => d.submissions.submit(await student(req), req.params.id, req.body));
    s.get<P>("/api/student/submissions/:id", async (req) => d.submissions.result(await student(req), req.params.id));
```

- [ ] **Step 5: Nối + vòng quét**

`server/src/http/app.ts`:
- thêm `import { createSubmissionService } from "../services/submissions";` dưới import `createCredentialService`;
- trong `AppDeps` thêm (sau `studentRateLimit`):

```ts
  /** Chu kỳ quét chốt bài quá hạn (ms); main.ts dùng 60 000, test không bật. */
  sweepMs?: number;
```

- thêm `const submissionsSvc = createSubmissionService(deps.db, { now });` **trước** dòng `const assignmentsSvc = …`;
- trong lời gọi `registerStudentRoutes(app, { … })` thêm `submissions: submissionsSvc,` sau `credentials,`;
- ngay sau dòng `registerClassroomRoutes(…);` thêm:

```ts

  if (deps.sweepMs) {
    let timer: NodeJS.Timeout | undefined;
    app.addHook("onReady", async () => {
      timer = setInterval(() => {
        submissionsSvc.finalizeExpired().catch((e: unknown) => console.error("sweep", e));
      }, deps.sweepMs);
      timer.unref();
    });
    app.addHook("onClose", async () => clearInterval(timer));
  }
```

`server/src/main.ts`: thêm `sweepMs: 60_000,` sau `pressure: { maxEventLoopDelay: 1000 },`.

- [ ] **Step 6: Xanh + toàn bộ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/submissions.test.ts` → PASS (7 test).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server test` → PASS.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/submissions.ts server/src/http/student.ts server/src/http/app.ts server/src/main.ts server/tests/http/submissions.test.ts
git commit -m "feat(server): phòng làm bài — vào bài theo mã đề/STT, tự lưu một UPDATE theo seq, rời tab, nộp idempotent, ân hạn 30 giây, tự nộp khi hết giờ + vòng quét 60 giây"
```

---

### Task 8: GV theo dõi trực tiếp, kết quả + thống kê, chấm tự luận; MCP `giao_bai`, `ket_qua_bai`

**Files:**
- Modify: `server/src/services/assignments.ts`, `server/src/http/classroom.ts`, `server/src/http/app.ts`, `server/src/mcp/server.ts`, `server/tests/mcp/mcp.test.ts`
- Create: `server/src/mcp/assignments.ts`
- Test: `server/tests/http/results.test.ts`, `server/tests/mcp/assignments.test.ts`

**Interfaces:**
- Consumes: `analyze`, `buildMonitor`, `resultRows` + kiểu (Task 2); `reviewItems`, `displayOrder`, `variantByCode`, `answeredCount` (Task 1); `sortedRoster` (Task 5); `SubmissionService.finalizeExpired` (Task 7); `ClassService.classIdFor`, `Service.getExam`.
- Produces:
  - `MonitorPayload = { assignment: AssignmentSummary, serverNow, counts: Record<MonitorState, number>, rows: MonitorRow[] }`; `ResultsPayload = { assignment, rows: ResultRow[], stats: AssignmentStats }`; `SubmissionDetail = { student: { id, fullName, seat }, submission: { id, attempt, status, variantCode, startedAt, submittedAt, score, maxScore, pending, leaveCount }, items: ReviewItem[] (mức full + rubric), events: { at, kind }[] }`; `GradeEssayBody = { points: Record<no, number> }`.
  - `createAssignmentService(db, { now?, finalize?: (assignmentId) => Promise<number> })` thêm `monitor(actor, id)` (cache 2 giây theo `id`, kiểm quyền trước khi đọc cache), `results(actor, id)`, `submissionDetail(actor, id, submissionId)`, `gradeEssays(actor, id, submissionId, raw)` (quyền `exam:grade`; câu không phải tự luận/điểm vượt tối đa → 400; bài chưa nộp → 409; cập nhật `answer_items` + `submissions.score/pending` trong một giao dịch, xoá cache theo dõi).
  - Route GV: `GET /api/assignments/:id/monitor`, `GET …/results`, `GET …/submissions/:sid`, `PUT …/submissions/:sid/grades`.
  - MCP: `registerAssignmentTools(server, { assignments, classes, service, actor })`; `giao_bai { class, examId, title?, dueAt, opensAt?, kind, durationMinutes?, attemptsAllowed?, showSolution?, shuffle }` → `AssignmentSummary & { note }`; `ket_qua_bai { assignmentId? , class? }` → tóm tắt. `McpDeps` thêm `assignments: AssignmentService`.

- [ ] **Step 1: Test (đỏ)**

```ts
// server/tests/http/results.test.ts
import { afterEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type Headers, type TApp, call, classWithStudents, examFor, issueAll, loginStudent, publishFromExam, teacher } from "../helpers/classroom";
import { responsesFromKey } from "../helpers/fixtures";

let t: TApp;
let clock: Date;
afterEach(async () => {
  await t.app.close();
});

async function setup() {
  clock = new Date();
  t = await testApp({ now: () => clock });
  const gv = await teacher(t);
  const classId = await classWithStudents(t, gv);
  const examId = await examFor(t, gv, 1);
  const a = await publishFromExam(t, gv, classId, examId, { showSolution: "after_submit" });
  const { classCode, cards } = await issueAll(t, gv, classId);
  const hs = await Promise.all(cards.map((c) => loginStudent(t, classCode, c)));
  const key = (await call(t, "GET", `/api/exams/${examId}/key`, gv)).json()[0].entries;
  return { gv, a, hs, full: responsesFromKey(key) };
}
const startId = async (hs: Headers, id: string) => (await call(t, "POST", `/api/student/assignments/${id}/start`, hs, {})).json().submission.id as string;

describe("theo dõi + kết quả (GV)", { timeout: 60_000 }, () => {
  it("theo dõi trực tiếp: trạng thái, số câu đã làm, rời tab; cache 2 giây", async () => {
    const { gv, a, hs, full } = await setup();
    const s0 = await startId(hs[0]!, a.id);
    await call(t, "PUT", `/api/student/submissions/${s0}/answers`, hs[0]!, { seq: 1, answers: { "1": 0, "2": 1 } });
    await call(t, "POST", `/api/student/submissions/${s0}/events`, hs[0]!, { events: [{ kind: "leave" }] });
    const s1 = await startId(hs[1]!, a.id);
    await call(t, "POST", `/api/student/submissions/${s1}/submit`, hs[1]!, { seq: 1, answers: full });
    const m = (await call(t, "GET", `/api/assignments/${a.id}/monitor`, gv)).json();
    expect(m.counts).toEqual({ chua_vao: 1, dang_lam: 1, da_nop: 1, tu_nop: 0 });
    expect(m.rows.map((r: { seat: number; state: string; answered: number; leaveCount: number }) => [r.seat, r.state, r.answered, r.leaveCount])).toEqual([
      [1, "dang_lam", 2, 1],
      [2, "da_nop", 5, 0],
      [3, "chua_vao", 0, 0],
    ]);
    await call(t, "PUT", `/api/student/submissions/${s0}/answers`, hs[0]!, { seq: 2, answers: { "1": 0, "2": 1, "3": [true, true, true, true] } });
    const cached = (await call(t, "GET", `/api/assignments/${a.id}/monitor`, gv)).json();
    expect([cached.serverNow, cached.rows[0].answered]).toEqual([m.serverNow, 2]);
    clock = new Date(clock.getTime() + 2500);
    expect((await call(t, "GET", `/api/assignments/${a.id}/monitor`, gv)).json().rows[0].answered).toBe(3);
  });

  it("bảng điểm + thống kê; GV chấm tự luận thì điểm HS cập nhật; xem bài làm có hướng dẫn chấm", async () => {
    const { gv, a, hs, full } = await setup();
    const ids = await Promise.all(hs.map((h) => startId(h, a.id)));
    await call(t, "POST", `/api/student/submissions/${ids[0]}/submit`, hs[0]!, { seq: 1, answers: full });
    await call(t, "POST", `/api/student/submissions/${ids[1]}/submit`, hs[1]!, { seq: 1, answers: { "1": full["1"] } });
    const r = (await call(t, "GET", `/api/assignments/${a.id}/results`, gv)).json();
    expect(r.rows.map((x: { seat: number; status: string | null; score: number | null; pending: number }) => [x.seat, x.status, x.score, x.pending])).toEqual([
      [1, "submitted", 2, 1],
      [2, "submitted", 0.25, 1],
      [3, "in_progress", null, 0],
    ]);
    expect(r.stats).toMatchObject({ rosterSize: 3, started: 3, submitted: 2, submitRate: 0.67, mean: 3.75 });
    expect(r.stats.items).toHaveLength(5);
    expect(r.stats.items[0]).toMatchObject({ label: 1, n: 2, p: 1, d: null });
    expect(r.stats.topics[0].topic).toBe("Mệnh đề");

    const essayNo = r.stats.items.find((i: { type: string }) => i.type === "essay").label as number;
    const bad = await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[0]}/grades`, gv, { points: { [essayNo]: 5 } });
    expect([bad.statusCode, bad.json().issues]).toEqual([400, [`Câu ${essayNo}: tối đa 1 điểm`]]);
    expect((await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[0]}/grades`, gv, { points: { "1": 0.25 } })).statusCode).toBe(400);
    const ok = await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[0]}/grades`, gv, { points: { [essayNo]: 0.75 } });
    expect(ok.json()).toEqual({ score: 2.75, maxScore: 3, pending: 0 });
    expect((await call(t, "GET", `/api/student/submissions/${ids[0]}`, hs[0]!)).json()).toMatchObject({ score: 2.75, pending: 0, score10: 9.17 });
    expect((await call(t, "PUT", `/api/assignments/${a.id}/submissions/${ids[2]}/grades`, gv, { points: { [essayNo]: 1 } })).statusCode).toBe(409);

    const d = (await call(t, "GET", `/api/assignments/${a.id}/submissions/${ids[0]}`, gv)).json();
    expect(d.student).toMatchObject({ fullName: "Nguyễn Văn An", seat: 1 });
    expect(d.items.find((i: { type: string }) => i.type === "essay")).toMatchObject({ points: 0.75, rubric: expect.stringContaining("phản chứng") });
    expect(d.items.find((i: { type: string }) => i.type === "mcq").key).toMatch(/^[ABCD]$/);
  });

  it("hết hạn: GV đọc kết quả thì bài bỏ dở được chốt; HS chưa vào bị báo", async () => {
    const { gv, a, hs } = await setup();
    await startId(hs[0]!, a.id);
    clock = new Date(clock.getTime() + 3 * 3600_000);
    const r = (await call(t, "GET", `/api/assignments/${a.id}/results`, gv)).json();
    expect(r.rows[0].status).toBe("auto_submitted");
    expect(r.stats.atRisk.map((x: { fullName: string; reasons: string[] }) => [x.fullName, x.reasons])).toEqual([
      ["Trần Thị Bình", ["Chưa vào bài"]],
      ["Lê Văn Cường", ["Chưa vào bài"]],
      ["Nguyễn Văn An", ["Dưới 5 điểm"]],
    ]);
    const other = await teacher(t, "gv-2", "Thầy Minh");
    expect((await call(t, "GET", `/api/assignments/${a.id}/results`, other)).statusCode).toBe(404);
  });
});
```

```ts
// server/tests/mcp/assignments.test.ts
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testApp } from "../helpers/app";
import { type TApp, bearerOf, classWithStudents, examFor, inHours } from "../helpers/classroom";

let t: TApp;
let client: Client;
let gv: Record<string, string>;
beforeEach(async () => {
  t = await testApp();
  await t.app.listen({ port: 0, host: "127.0.0.1" });
  const base = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  gv = bearerOf(await t.sign({ sub: "gv-mcp", name: "Thầy Minh" }));
  client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`), { requestInit: { headers: gv } }));
});
afterEach(async () => {
  await client.close();
  await t.app.close();
});
type R = { content: { text: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as R;
const data = (r: R) => JSON.parse(r.content[0]?.text ?? "null");

describe("MCP bài giao", { timeout: 60_000 }, () => {
  it("giao_bai theo tên lớp → ket_qua_bai theo lớp", async () => {
    await classWithStudents(t, gv);
    const examId = await examFor(t, gv);
    const a = data(await call("giao_bai", { class: "10A1", examId, dueAt: inHours(2) }));
    expect(a).toMatchObject({ title: "Kiểm tra 15 phút", status: "published", kind: "test", variantCodes: ["101", "102"], note: expect.stringContaining("/hs") });
    const r = data(await call("ket_qua_bai", { class: "10A1" }));
    expect(r).toMatchObject({ assignment: { id: a.id }, submitted: 0, rosterSize: 3, mean: null, pendingEssays: 0 });
    expect(data(await call("ket_qua_bai", { assignmentId: a.id })).assignment.title).toBe("Kiểm tra 15 phút");
    const bad = await call("giao_bai", { class: "10A1", examId, dueAt: "ngày mai" });
    expect(bad.isError).toBe(true);
    expect((await call("ket_qua_bai", {})).isError).toBe(true);
  });
});
```

Trong `server/tests/mcp/mcp.test.ts`, danh sách tool mong đợi: thay `"diem_danh", "lay_dap_an"` bằng `"diem_danh", "giao_bai", "ket_qua_bai", "lay_dap_an"`.

- [ ] **Step 2: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/results.test.ts tests/mcp/` → FAIL (404 `/monitor`; tool `giao_bai` không có).

- [ ] **Step 3: Mở rộng `services/assignments.ts`**

Thay 3 dòng import:

```ts
import { answerItems, assignments, classes, exams, questions, students, submissionEvents, submissions } from "../db/schema";
import { type AssignmentStats, type ItemRow, type MonitorRow, type MonitorState, type ResultRow, type SubRow, analyze, buildMonitor, resultRows } from "../domain/analytics";
import { AssignmentInput, ASSIGNMENT_STATUS, type AssignmentKind, type AssignmentStatus, type ReviewItem, type ShowSolution, type SubmissionStatus, answeredCount, displayOrder, resolveSettings, reviewItems, variantByCode } from "../domain/assignment";
```

(thay cho import `../db/schema` và `../domain/assignment` cũ), và thêm `import { sortedRoster } from "./credentials";` dưới import `../errors`.

Thêm ngay trước `export const AssignmentPatch`:

```ts
export type MonitorPayload = { assignment: AssignmentSummary; serverNow: string; counts: Record<MonitorState, number>; rows: MonitorRow[] };
export type ResultsPayload = { assignment: AssignmentSummary; rows: ResultRow[]; stats: AssignmentStats };
export type SubmissionDetail = {
  student: { id: string; fullName: string; seat: number | null };
  submission: { id: string; attempt: number; status: SubmissionStatus; variantCode: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; pending: number; leaveCount: number };
  items: ReviewItem[];
  events: { at: string; kind: string }[];
};
export const GradeEssayBody = z.object({ points: z.record(z.string().regex(/^\d{1,3}$/), z.number().min(0).max(100)) });
const MONITOR_TTL_MS = 2000;
```

Thay đầu hàm factory:

```ts
/** finalize: chốt các bài quá hạn của một bài giao trước khi GV đọc (từ SubmissionService.finalizeExpired). */
export function createAssignmentService(db: Db, opts: { now?: () => Date; finalize?: (assignmentId: string) => Promise<number> } = {}) {
  const now = opts.now ?? (() => new Date());
  const monitorCache = new Map<string, { at: number; data: MonitorPayload }>();
```

Thay dòng `return { create, list, get, update, remove, load };` bằng:

```ts
  async function subRows(assignmentId: string): Promise<SubRow[]> {
    const rows = await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
    return rows.map((s) => ({ ...s, answered: answeredCount(s.answers) }));
  }

  /** Theo dõi trực tiếp (GV hỏi lại mỗi 5 giây): cache 2 giây phía máy chủ. */
  async function monitor(actor: Actor, id: string): Promise<MonitorPayload> {
    assertCan(actor.role, "assignment:read");
    const a = await load(actor.orgId, id);
    const t = now().getTime();
    const hit = monitorCache.get(id);
    if (hit && t - hit.at < MONITOR_TTL_MS) return hit.data;
    await opts.finalize?.(id);
    const [roster, subs] = await Promise.all([sortedRoster(db, a.classId), subRows(id)]);
    const data: MonitorPayload = { assignment: summarize(a), serverNow: new Date(t).toISOString(), ...buildMonitor(roster, subs, a.variants[0]?.items.length ?? 0) };
    if (monitorCache.size > 500) for (const [k, v] of monitorCache) if (t - v.at >= MONITOR_TTL_MS) monitorCache.delete(k);
    monitorCache.set(id, { at: t, data });
    return data;
  }

  async function results(actor: Actor, id: string): Promise<ResultsPayload> {
    assertCan(actor.role, "assignment:read");
    const a = await load(actor.orgId, id);
    await opts.finalize?.(id);
    const [roster, subs, items] = await Promise.all([
      sortedRoster(db, a.classId),
      subRows(id),
      db
        .select({ submissionId: answerItems.submissionId, questionId: answerItems.questionId, topic: answerItems.topic, level: answerItems.level, type: answerItems.type, points: answerItems.points, maxPoints: answerItems.maxPoints, correct: answerItems.correct, choice: answerItems.choice })
        .from(answerItems)
        .where(eq(answerItems.assignmentId, id)) as Promise<ItemRow[]>,
    ]);
    const questionsMeta = (a.variants[0]?.items ?? []).map((it) => ({ questionId: it.questionId, label: it.no, stem: it.question.stem }));
    return { assignment: summarize(a), rows: resultRows(roster, subs), stats: analyze({ roster, subs, items, questions: questionsMeta, dueAt: a.dueAt, now: now() }) };
  }

  async function loadSubmission(a: AssignmentRow, submissionId: string) {
    if (!Uuid.safeParse(submissionId).success) throw new NotFoundError("Không tìm thấy bài làm");
    const [s] = await db.select().from(submissions).where(and(eq(submissions.id, submissionId), eq(submissions.assignmentId, a.id)));
    if (!s) throw new NotFoundError("Không tìm thấy bài làm");
    return s;
  }

  /** Bài làm của một HS cho GV: đáp án, đúng/sai, hướng dẫn chấm tự luận, nhật ký rời tab. */
  async function submissionDetail(actor: Actor, id: string, submissionId: string): Promise<SubmissionDetail> {
    assertCan(actor.role, "assignment:read");
    const a = await load(actor.orgId, id);
    const s = await loadSubmission(a, submissionId);
    const [st] = await db.select().from(students).where(eq(students.id, s.studentId));
    const items = await db.select({ no: answerItems.no, points: answerItems.points, correct: answerItems.correct }).from(answerItems).where(eq(answerItems.submissionId, s.id));
    const events = await db.select({ at: submissionEvents.at, kind: submissionEvents.kind }).from(submissionEvents).where(eq(submissionEvents.submissionId, s.id)).orderBy(submissionEvents.at);
    const v = variantByCode(a.variants, s.variantCode);
    return {
      student: { id: s.studentId, fullName: st?.fullName ?? "", seat: st?.seat ?? null },
      submission: { id: s.id, attempt: s.attempt, status: s.status, variantCode: s.variantCode, startedAt: s.startedAt.toISOString(), submittedAt: s.submittedAt?.toISOString() ?? null, score: s.score, maxScore: s.maxScore, pending: s.pending, leaveCount: s.leaveCount },
      items: reviewItems(v, displayOrder(v, false, 0), a.rules, s.answers, new Map(items.map((i) => [i.no, i])), "full", true),
      events: events.map((e) => ({ at: e.at.toISOString(), kind: e.kind })),
    };
  }

  /** GV chấm tay câu tự luận: { points: { [no]: điểm } }, 0 ≤ điểm ≤ tối đa của câu. */
  async function gradeEssays(actor: Actor, id: string, submissionId: string, raw: unknown): Promise<{ score: number; maxScore: number; pending: number }> {
    assertCan(actor.role, "exam:grade");
    const a = await load(actor.orgId, id);
    const s = await loadSubmission(a, submissionId);
    if (s.status === "in_progress") throw new ConflictError("Bài chưa nộp");
    const p = GradeEssayBody.parse(raw);
    return db.transaction(async (tx) => {
      const rows = await tx.select().from(answerItems).where(eq(answerItems.submissionId, s.id));
      const issues: string[] = [];
      for (const [no, pts] of Object.entries(p.points)) {
        const r = rows.find((x) => x.no === Number(no));
        if (!r || r.type !== "essay") issues.push(`Câu ${no} không phải câu tự luận`);
        else if (pts > r.maxPoints) issues.push(`Câu ${no}: tối đa ${String(r.maxPoints).replace(".", ",")} điểm`);
      }
      if (issues.length) throw new ValidationError(issues);
      for (const [no, pts] of Object.entries(p.points)) {
        const r = rows.find((x) => x.no === Number(no)) as (typeof rows)[number];
        await tx.update(answerItems).set({ points: pts, correct: pts >= r.maxPoints }).where(and(eq(answerItems.submissionId, s.id), eq(answerItems.no, r.no)));
        r.points = pts;
      }
      const score = round2(rows.reduce((m, r) => m + (r.points ?? 0), 0));
      const pending = rows.filter((r) => r.points === null).length;
      await tx.update(submissions).set({ score, pending }).where(eq(submissions.id, s.id));
      monitorCache.delete(id);
      return { score, maxScore: s.maxScore ?? 0, pending };
    });
  }
  return { create, list, get, update, remove, load, monitor, results, submissionDetail, gradeEssays };
```

- [ ] **Step 4: Route GV**

Trong `server/src/http/classroom.ts`, thêm **trước** `app.delete<P>("/api/assignments/:id", …)`:

```ts
  app.get<P>("/api/assignments/:id/monitor", async (req) => d.assignments.monitor(await d.authenticate(req), req.params.id));
  app.get<P>("/api/assignments/:id/results", async (req) => d.assignments.results(await d.authenticate(req), req.params.id));
  app.get<P>("/api/assignments/:id/submissions/:sid", async (req) => d.assignments.submissionDetail(await d.authenticate(req), req.params.id, req.params.sid));
  app.put<P>("/api/assignments/:id/submissions/:sid/grades", async (req) => d.assignments.gradeEssays(await d.authenticate(req), req.params.id, req.params.sid, req.body));
```

- [ ] **Step 5: MCP**

```ts
// server/src/mcp/assignments.ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ASSIGNMENT_KINDS, SHOW_SOLUTION } from "../domain/assignment";
import { NotFoundError } from "../errors";
import type { Actor, Service } from "../service";
import type { AssignmentService } from "../services/assignments";
import type { ClassService } from "../services/classes";

type Deps = { assignments: AssignmentService; classes: ClassService; service: Service; actor: Actor };

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

export function registerAssignmentTools(server: McpServer, { assignments, classes, service, actor }: Deps): void {
  const classRef = z.string().min(1).describe('Tên lớp (vd "10A1") hoặc id lớp');

  server.registerTool(
    "giao_bai",
    {
      title: "Giao bài cho lớp",
      description:
        "Giao một đề đã tạo (examId từ tao_de) cho lớp làm trực tuyến và mở ngay (published). dueAt: hạn nộp ISO 8601 có múi giờ, vd \"2026-11-12T21:00:00+07:00\". opensAt (tuỳ chọn, mặc định ngay bây giờ). kind: \"test\" (kiểm tra, mặc định 1 lượt, lời giải sau hạn nộp) hoặc \"practice\" (luyện tập, 3 lượt, lời giải ngay khi nộp). durationMinutes: bỏ trống = theo đề; null = không giới hạn trong cửa sổ mở. Mỗi HS nhận một mã đề theo số thứ tự; shuffle = đảo câu trong từng phần. HS vào bằng mã lớp + số thứ tự + PIN ở trang /hs.",
      inputSchema: {
        class: classRef,
        examId: z.string().min(1),
        title: z.string().min(1).max(160).optional(),
        dueAt: z.string().min(1),
        opensAt: z.string().optional(),
        kind: z.enum(ASSIGNMENT_KINDS).default("test"),
        durationMinutes: z.number().int().min(1).max(300).nullable().optional(),
        attemptsAllowed: z.number().int().min(1).max(10).optional(),
        showSolution: z.enum(SHOW_SOLUTION).optional(),
        shuffle: z.boolean().default(false),
      },
    },
    async ({ class: c, examId, title, ...rest }) => {
      const classId = await classes.classIdFor(actor, c, "class:read");
      const exam = await service.getExam(actor, examId);
      const a = await assignments.create(actor, classId, { ...rest, title: title ?? exam.title, source: { examId: exam.id }, publish: true });
      return json({ ...a, note: "HS đăng nhập tại /hs bằng mã lớp + số thứ tự + PIN (GV cấp ở tab Thẻ lớp)." });
    },
  );

  server.registerTool(
    "ket_qua_bai",
    {
      title: "Kết quả bài giao",
      description:
        "Tóm tắt kết quả một bài giao: số đã nộp / sĩ số, điểm trung bình và trung vị (thang 10), phân bố điểm, câu khó/dễ/cần xem lại (độ khó p, độ phân biệt D), chủ đề yếu, học sinh cần quan tâm. Truyền assignmentId, hoặc chỉ class để lấy bài giao mới nhất của lớp.",
      inputSchema: { assignmentId: z.string().optional(), class: classRef.optional() },
    },
    async ({ assignmentId, class: c }) => {
      let id = assignmentId;
      if (!id) {
        if (!c) throw new NotFoundError("Cần assignmentId hoặc class");
        const list = await assignments.list(actor, await classes.classIdFor(actor, c, "class:read"));
        id = list[0]?.id;
        if (!id) throw new NotFoundError(`Lớp "${c}" chưa có bài giao`);
      }
      const r = await assignments.results(actor, id);
      const s = r.stats;
      return json({
        assignment: { id: r.assignment.id, title: r.assignment.title, dueAt: r.assignment.dueAt, status: r.assignment.status },
        submitted: s.submitted,
        rosterSize: s.rosterSize,
        mean: s.mean,
        median: s.median,
        distribution: s.distribution,
        items: s.items.map((i) => ({ cau: i.label, topic: i.topic, p: i.p, d: i.d, flag: i.flag, hayChon: i.choices.slice(0, 2) })),
        weakTopics: s.topics.filter((t) => t.rate < 0.5),
        atRisk: s.atRisk.map((a) => ({ fullName: a.fullName, score10: a.score10, reasons: a.reasons })),
        pendingEssays: r.rows.reduce((n, x) => n + x.pending, 0),
      });
    },
  );
}
```

`server/src/mcp/server.ts`:
- thêm `import type { AssignmentService } from "../services/assignments";` trên import `ClassService`, và `import { registerAssignmentTools } from "./assignments";` dưới nó;
- `McpDeps`: thêm `assignments: AssignmentService;` ở dòng đầu sau `makeLinks…;`;
- chữ ký `buildMcpServer({ service, actor, assignments, makeLinks, … })`;
- sau `registerClassTools(server, { classes, actor, makeClassLink });` thêm `registerAssignmentTools(server, { assignments, classes, service, actor });`.

`server/src/http/app.ts`:
- đổi dòng tạo `assignmentsSvc` thành `const assignmentsSvc = createAssignmentService(deps.db, { now, finalize: (id) => submissionsSvc.finalizeExpired({ assignmentId: id }) });`;
- trong `buildMcpServer({ service, actor, … })` của route `/mcp` thêm `assignments: assignmentsSvc,` ngay sau `actor,`.

- [ ] **Step 6: Xanh + toàn bộ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server exec vitest run tests/http/results.test.ts tests/mcp/` → PASS.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server test` → PASS toàn bộ (47 file).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck` → không lỗi.

- [ ] **Step 7: Commit**

```bash
git add server/src/services/assignments.ts server/src/http/classroom.ts server/src/http/app.ts server/src/mcp/assignments.ts server/src/mcp/server.ts server/tests/http/results.test.ts server/tests/mcp/assignments.test.ts server/tests/mcp/mcp.test.ts
git commit -m "feat(server): GV theo dõi trực tiếp (cache 2 giây), bảng điểm + thống kê CTT, xem/chấm tự luận; MCP giao_bai, ket_qua_bai"
```

---

### Task 9: Web — thư viện + module thuần của khu HS (đồng hồ máy chủ, hàng đợi tự lưu, rời tab, API có phiên HS, Dexie, thẻ in)

**Files:**
- Modify: `web/package.json`
- Create: `web/src/student/types.ts`, `web/src/student/answers.ts`, `web/src/student/clock.ts`, `web/src/student/syncQueue.ts`, `web/src/student/leave.ts`, `web/src/student/studentApi.ts`, `web/src/student/draftStore.ts`, `web/src/pages/classroom/badgeSheet.ts`
- Test: `web/tests/hsClock.test.ts`, `web/tests/hsSync.test.ts`, `web/tests/hsLeave.test.ts`, `web/tests/badgeSheet.test.ts`

**Interfaces:**
- `types.ts`: bản sao kiểu server — `AnswerValue`, `Answers`, `SubmissionStatus`, `StudentState`, `ResultLevel`, `PublicItem`, `ReviewItem`, `StudentSession`, `MyAssignment`, `RoomPayload`, `SaveResult`, `StudentResult` (đúng tên trường Task 5/7).
- `answers.ts`: `isAnswered(v)`, `isPartial(v)`, `answeredCount(a, nos)`, `unanswered(a, nos)`.
- `clock.ts`: `class ServerClock { sample(serverNow, sentAt, receivedAt); now(); remainingMs(deadlineIso) }` (bỏ mẫu trễ hơn mẫu tốt nhất > 50 ms), `formatClock(ms)` ("12:34", "1:02:03"), `timerTone(ms)` ("" | "warn" ≤ 5 phút | "crit" ≤ 1 phút), `formatCountdown(ms)` ("Còn 1 ngày 2 giờ"…).
- `syncQueue.ts`: `Draft = { submissionId, seq, syncedSeq, answers, flags, updatedAt }`, `DraftStore { get, put }`, `SendResult = { kind: "ok"; seq } | { kind: "closed"; status } | { kind: "retry"; afterMs } | { kind: "offline" }`, `Sender = (seq, answers, { keepalive }) => Promise<SendResult>`, `SyncStatus = "saved" | "saving" | "offline" | "closed"`, `class AnswerSync { static open(store, submissionId, server, send, onChange?, clock?); answers; flags; seq; dirty; set(no, v); toggleFlag(no); flush(keepalive?); forSubmit(); markClosed() }`, `memoryStore()`.
- `leave.ts`: `class LeaveTracker { update(visible, focused) }` (gộp blur + hidden thành một lần), `watchLeave(tracker, doc?, win?) → unsubscribe`, `class EventOutbox { push(kind); size; flush(send) }`.
- `studentApi.ts`: `StoredSession = StudentSession & { expiresAt }`, `isSessionValid`, `loadSession`, `saveSession`, `clearSession` (localStorage `eduvn.hs`), `StudentApiError(status, body)`, `retryAfterMs(header, attempt, rand?)`, `hsFetch(path, { method?, body?, keepalive?, retries? = 2, token? })` (429/503 tự gửi lại), `hsJson<T>(path, init)` (401 ngoài route đăng nhập → xoá phiên, về `/hs`), `errMsg(e)`.
- `draftStore.ts`: `pickStore(): Promise<DraftStore>` (Dexie DB `eduvn-hs`, bảng `drafts` khoá `submissionId`; IndexedDB bị chặn → `memoryStore()`).
- `badgeSheet.ts`: `BadgeView`, `PER_PAGE = 8`, `seatLabel(n)`, `qrSvg(url)`, `badgeSheetHtml({ className, subject, classCode, cards, svgs })` (A4 dọc, 2 × 4 thẻ, thoát ký tự), `printBadges({ className, subject, classCode, cards: BadgeCard[] })` (URL QR = `${location.origin}/hs/qr#${qrToken}`).

- [ ] **Step 1: Cài thư viện**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web add dexie@^4.4.7 qrcode@^1.5.4`
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web add -D @types/qrcode@^1.5.6`

- [ ] **Step 2: Test (đỏ)**

```ts
// web/tests/hsClock.test.ts
import { describe, expect, it } from "vitest";
import { ServerClock, formatClock, formatCountdown, timerTone } from "../src/student/clock";

describe("ServerClock", () => {
  it("lệch giờ ước từ serverNow, giữ mẫu có độ trễ nhỏ", () => {
    let local = 1_000_000;
    const c = new ServerClock(() => local);
    c.sample(new Date(1_005_050).toISOString(), 1_000_000, 1_000_100); // rtt 100 → lệch +5000
    expect(c.now()).toBe(1_005_000);
    c.sample(new Date(2_000_000).toISOString(), 1_000_000, 1_001_000); // rtt 1000 → bỏ
    expect(c.now()).toBe(1_005_000);
    c.sample(new Date(1_003_040).toISOString(), 1_000_000, 1_000_080); // rtt 80 → lệch +3000
    expect(c.now()).toBe(1_003_000);
    c.sample("không phải giờ", 0, 0);
    local += 1000;
    expect(c.remainingMs(new Date(1_010_000).toISOString())).toBe(6000);
    expect(c.remainingMs(new Date(0).toISOString())).toBe(0);
  });
});

describe("định dạng giờ", () => {
  it.each([
    [754_000, "12:34"],
    [3_723_000, "1:02:03"],
    [500, "00:01"],
    [0, "00:00"],
  ])("%s ms → %s", (ms, s) => expect(formatClock(ms)).toBe(s));
  it("màu đồng hồ", () => {
    expect([timerTone(400_000), timerTone(300_000), timerTone(60_000)]).toEqual(["", "warn", "crit"]);
  });
  it("đếm ngược hạn nộp", () => {
    expect(formatCountdown(26 * 3600_000 + 14 * 60_000)).toBe("Còn 1 ngày 2 giờ");
    expect(formatCountdown(3 * 3600_000 + 5 * 60_000)).toBe("Còn 3 giờ 5 phút");
    expect(formatCountdown(65_000)).toBe("Còn 1 phút 05 giây");
    expect(formatCountdown(-1)).toBe("Đã hết hạn");
  });
});
```

```ts
// web/tests/hsSync.test.ts
import { describe, expect, it } from "vitest";
import { isAnswered, isPartial, unanswered } from "../src/student/answers";
import { AnswerSync, type SendResult, memoryStore } from "../src/student/syncQueue";

function harness(results: SendResult[] = []) {
  const sent: { seq: number; answers: Record<string, unknown>; keepalive: boolean }[] = [];
  const statuses: string[] = [];
  let t = 0;
  const store = memoryStore();
  const send = async (seq: number, answers: Record<string, unknown>, o: { keepalive: boolean }) => {
    sent.push({ seq, answers, keepalive: o.keepalive });
    return results.shift() ?? ({ kind: "ok", seq } as SendResult);
  };
  const open = (server = { seq: 0, answers: {} }) => AnswerSync.open(store, "sub-1", server, send, (s) => statuses.push(s), () => t);
  return { sent, statuses, store, open, advance: (ms: number) => (t += ms) };
}

describe("AnswerSync", () => {
  it("ghi máy ngay, gửi bản mới nhất, chỉ gửi khi có thay đổi", async () => {
    const h = harness();
    const s = await h.open();
    expect(s.status).toBe("saved");
    await s.set(1, 2);
    await s.set(2, "\\frac{3}{2}");
    expect((await h.store.get("sub-1"))?.seq).toBe(2);
    expect(s.status).toBe("saving");
    await s.flush();
    expect(h.sent).toEqual([{ seq: 2, answers: { "1": 2, "2": "\\frac{3}{2}" }, keepalive: false }]);
    expect(s.status).toBe("saved");
    await s.flush();
    expect(h.sent).toHaveLength(1);
  });

  it("mất mạng: vẫn ghi máy, báo offline; có mạng lại gửi bản cuối", async () => {
    const h = harness([{ kind: "offline" }]);
    const s = await h.open();
    await s.set(1, 0);
    await s.flush();
    expect(s.status).toBe("offline");
    await s.set(1, 3);
    expect(s.status).toBe("offline");
    await s.flush(true);
    expect(h.sent.map((x) => [x.seq, x.answers["1"], x.keepalive])).toEqual([[1, 0, false], [2, 3, true]]);
    expect(s.status).toBe("saved");
  });

  it("máy chủ bận: chờ đúng thời gian rồi mới gửi lại", async () => {
    const h = harness([{ kind: "retry", afterMs: 2000 }]);
    const s = await h.open();
    await s.set(1, 1);
    await s.flush();
    await s.flush();
    expect(h.sent).toHaveLength(1);
    h.advance(2000);
    await s.flush();
    expect(h.sent).toHaveLength(2);
  });

  it("bài đã nộp/hết giờ: đóng, không nhận thêm", async () => {
    const h = harness([{ kind: "closed", status: "auto_submitted" }]);
    const s = await h.open();
    await s.set(1, 1);
    await s.flush();
    expect(s.status).toBe("closed");
    await s.set(1, 2);
    expect(s.answers["1"]).toBe(1);
  });

  it("mở lại: lấy bản máy nếu mới hơn máy chủ; ngược lại lấy máy chủ, giữ đánh dấu", async () => {
    const h = harness();
    const s = await h.open();
    await s.set(1, 1);
    await s.toggleFlag(3);
    const again = await h.open({ seq: 0, answers: {} });
    expect([again.seq, again.answers, again.flags, again.status]).toEqual([1, { "1": 1 }, [3], "saving"]);
    const fromServer = await h.open({ seq: 5, answers: { "1": 2 } });
    expect([fromServer.seq, fromServer.answers, fromServer.flags, fromServer.dirty]).toEqual([5, { "1": 2 }, [3], false]);
    const sub = await fromServer.forSubmit();
    expect(sub.seq).toBe(6);
  });

  it("chỉ một lần gửi tại một thời điểm", async () => {
    let release: () => void = () => {};
    const sent: number[] = [];
    const s = await AnswerSync.open(memoryStore(), "x", { seq: 0, answers: {} }, (seq) => {
      sent.push(seq);
      return new Promise<SendResult>((r) => (release = () => r({ kind: "ok", seq })));
    });
    await s.set(1, 1);
    const a = s.flush();
    await Promise.resolve();
    await s.flush();
    release();
    await a;
    expect(sent).toEqual([1]);
  });
});

describe("đáp án đã làm", () => {
  it("đúng/sai đủ 4 ý mới tính đã làm", () => {
    expect([isAnswered(0), isAnswered(null), isAnswered(" "), isAnswered("x"), isAnswered([true, false, true, false]), isAnswered([true, null, true, false])]).toEqual([true, false, false, true, true, false]);
    expect(isPartial([true, null, null, null])).toBe(true);
    expect(isPartial([null, null, null, null])).toBe(false);
    expect(unanswered({ "1": 0, "3": "" }, [1, 2, 3])).toEqual([2, 3]);
  });
});
```

```ts
// web/tests/hsLeave.test.ts
import { describe, expect, it } from "vitest";
import { EventOutbox, LeaveTracker } from "../src/student/leave";
import { isSessionValid, retryAfterMs } from "../src/student/studentApi";

describe("LeaveTracker", () => {
  it("blur + hidden chỉ tính một lần rời; quay lại khi vừa hiện vừa có focus", () => {
    const ev: string[] = [];
    const t = new LeaveTracker((k) => ev.push(k));
    t.update(true, true);
    t.update(true, false);
    t.update(false, false);
    t.update(true, false);
    t.update(true, true);
    t.update(true, true);
    expect(ev).toEqual(["leave", "return"]);
  });
});

describe("EventOutbox", () => {
  it("gửi theo lô; gửi hỏng thì giữ lại", async () => {
    const o = new EventOutbox();
    o.push("leave");
    o.push("return");
    await o.flush(async () => false);
    expect(o.size).toBe(2);
    const got: unknown[] = [];
    await o.flush(async (e) => {
      got.push(...e);
      return true;
    });
    expect(got).toEqual([{ kind: "leave" }, { kind: "return" }]);
    expect(o.size).toBe(0);
    o.push("leave");
    await o.flush(async () => {
      throw new TypeError("offline");
    });
    expect(o.size).toBe(1);
  });
});

describe("gửi lại + phiên", () => {
  it("Retry-After hoặc lùi dần, cộng nhiễu", () => {
    expect(retryAfterMs("3", 0, () => 0)).toBe(3000);
    expect(retryAfterMs(null, 0, () => 0)).toBe(500);
    expect(retryAfterMs(null, 3, () => 0.5)).toBe(4200);
    expect(retryAfterMs("x", 10, () => 1)).toBe(8400);
  });
  it("phiên hết hạn trước 1 phút thì coi như hết", () => {
    const s = { token: "t", expiresInSeconds: 1, expiresAt: 100_000, student: { id: "s", fullName: "An", seat: 1 }, class: { id: "c", name: "10A1", subject: null } };
    expect(isSessionValid(s, 30_000)).toBe(true);
    expect(isSessionValid(s, 50_000)).toBe(false);
    expect(isSessionValid(null)).toBe(false);
  });
});
```

```ts
// web/tests/badgeSheet.test.ts
import { describe, expect, it } from "vitest";
import { badgeSheetHtml, qrSvg, seatLabel } from "../src/pages/classroom/badgeSheet";

describe("thẻ lớp in A4", () => {
  it("8 thẻ mỗi trang, thoát ký tự, đủ mã lớp + STT + PIN", () => {
    const cards = Array.from({ length: 9 }, (_, i) => ({ seat: i + 1, fullName: i === 0 ? "<b>An</b>" : `HS ${i + 1}`, pin: "042917", qrUrl: "u" }));
    const html = badgeSheetHtml({ className: "10A1", subject: "Toán", classCode: "K7M4QX", cards, svgs: cards.map(() => "<svg></svg>") });
    expect(html.match(/<section class="page">/g)).toHaveLength(2);
    expect(html.match(/class="badge"/g)).toHaveLength(9);
    expect(html).toContain("&lt;b&gt;An&lt;/b&gt;");
    expect(html).not.toContain("<b>An</b>");
    expect(html).toContain("Lớp 10A1 · Toán");
    expect(html).toContain("<b>09</b>");
    expect(html).toContain("042917");
    expect(seatLabel(7)).toBe("07");
  });
  it("QR là SVG", async () => {
    expect(await qrSvg("http://localhost:5173/hs/qr#abc")).toMatch(/^<svg/);
  });
});
```

- [ ] **Step 3: Đỏ**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web exec vitest run tests/hsClock.test.ts tests/hsSync.test.ts tests/hsLeave.test.ts tests/badgeSheet.test.ts` → FAIL (thiếu module).

- [ ] **Step 4: Viết module**

```ts
// web/src/student/types.ts
/** Kiểu dữ liệu API học sinh — khớp server/src/services/submissions.ts, credentials.ts, domain/assignment.ts. */
export type AnswerValue = number | (boolean | null)[] | string | null;
export type Answers = Record<string, AnswerValue>;
export type SubmissionStatus = "in_progress" | "submitted" | "auto_submitted";
export type StudentState = "chua_mo" | "chua_lam" | "dang_lam" | "da_nop" | "qua_han";
export type ResultLevel = "full" | "marks" | "score";

type ItemBase = { no: number; section: string; stem: string; maxPoints: number };
export type PublicItem =
  | (ItemBase & { type: "mcq"; options: string[] })
  | (ItemBase & { type: "true_false"; statements: string[] })
  | (ItemBase & { type: "short_answer" })
  | (ItemBase & { type: "essay" });
export type ReviewItem = PublicItem & { response: AnswerValue; points: number | null; correct: boolean | null; key?: string; explanation?: string };

export type StudentSession = { token: string; expiresInSeconds: number; student: { id: string; fullName: string; seat: number | null }; class: { id: string; name: string; subject: string | null } };
export type MyAssignment = {
  id: string;
  title: string;
  kind: "practice" | "test";
  subject: string;
  questionCount: number;
  durationMinutes: number | null;
  opensAt: string;
  dueAt: string;
  attemptsAllowed: number;
  attemptsUsed: number;
  state: StudentState;
  canStart: boolean;
  answered: number;
  score10: number | null;
  currentSubmissionId: string | null;
  lastSubmissionId: string | null;
};
export type RoomPayload = {
  submission: { id: string; attempt: number; status: SubmissionStatus; seq: number; answers: Answers; startedAt: string; deadlineAt: string; variantCode: string };
  assignment: { id: string; title: string; kind: "practice" | "test"; subject: string; durationMinutes: number | null; dueAt: string; attemptsAllowed: number };
  questions: PublicItem[];
  serverNow: string;
};
export type SaveResult = { ok: true; seq: number; serverNow: string; deadlineAt: string };
export type StudentResult = {
  submissionId: string;
  assignmentId: string;
  title: string;
  status: SubmissionStatus;
  attempt: number;
  attemptsAllowed: number;
  attemptsUsed: number;
  canRetry: boolean;
  score: number | null;
  maxScore: number | null;
  score10: number | null;
  pending: number;
  correctCount: number;
  startedAt: string;
  submittedAt: string | null;
  level: ResultLevel;
  items: ReviewItem[];
};
```

```ts
// web/src/student/answers.ts
import type { AnswerValue, Answers } from "./types";

/** Giống server/src/domain/assignment.ts: đúng/sai phải đủ 4 ý mới tính là đã làm. */
export function isAnswered(v: AnswerValue | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.every((x) => x !== null);
  return v.trim() !== "";
}
/** Đúng/sai mới chọn vài ý: hiện "làm dở" trên bảng số câu. */
export const isPartial = (v: AnswerValue | undefined): boolean => Array.isArray(v) && !isAnswered(v) && v.some((x) => x !== null);
export const answeredCount = (a: Answers, nos: readonly number[]): number => nos.filter((n) => isAnswered(a[String(n)])).length;
export const unanswered = (a: Answers, nos: readonly number[]): number[] => nos.filter((n) => !isAnswered(a[String(n)]));
```

```ts
// web/src/student/clock.ts
/** Đồng hồ theo máy chủ: độ lệch ước từ serverNow trong phản hồi, ưu tiên mẫu có độ trễ nhỏ. */
export class ServerClock {
  private offset = 0;
  private bestRtt = Number.POSITIVE_INFINITY;
  constructor(private readonly local: () => number = () => Date.now()) {}

  /** sentAt/receivedAt: giờ máy lúc gửi/nhận; serverNow: ISO của máy chủ. Mẫu trễ hơn mẫu tốt nhất quá 50 ms thì bỏ. */
  sample(serverNow: string, sentAt: number, receivedAt: number): void {
    const server = Date.parse(serverNow);
    if (Number.isNaN(server)) return;
    const rtt = Math.max(0, receivedAt - sentAt);
    if (rtt > this.bestRtt + 50) return;
    this.bestRtt = Math.min(this.bestRtt, rtt);
    this.offset = server - (sentAt + rtt / 2);
  }

  now(): number {
    return this.local() + this.offset;
  }

  remainingMs(deadlineIso: string): number {
    return Math.max(0, Date.parse(deadlineIso) - this.now());
  }
}

const p2 = (n: number) => String(n).padStart(2, "0");
/** 754000 → "12:34"; 3 723 000 → "1:02:03". */
export function formatClock(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${p2(m)}:${p2(s % 60)}` : `${p2(m)}:${p2(s % 60)}`;
}
export const timerTone = (ms: number): "" | "warn" | "crit" => (ms <= 60_000 ? "crit" : ms <= 300_000 ? "warn" : "");

/** Hạn nộp ở danh sách bài (như mockup lop-hoc.html). */
export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s <= 0) return "Đã hết hạn";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `Còn ${d} ngày ${h} giờ`;
  if (h) return `Còn ${h} giờ ${m} phút`;
  return `Còn ${m} phút ${p2(s % 60)} giây`;
}
```

```ts
// web/src/student/syncQueue.ts
import type { AnswerValue, Answers } from "./types";

/** Bản nháp trên máy (IndexedDB): seq tăng mỗi lần đổi đáp án; syncedSeq = bản máy chủ đã nhận. */
export type Draft = { submissionId: string; seq: number; syncedSeq: number; answers: Answers; flags: number[]; updatedAt: number };
export interface DraftStore {
  get(submissionId: string): Promise<Draft | undefined>;
  put(d: Draft): Promise<void>;
}
export type SendResult = { kind: "ok"; seq: number } | { kind: "closed"; status: string } | { kind: "retry"; afterMs: number } | { kind: "offline" };
export type Sender = (seq: number, answers: Answers, opts: { keepalive: boolean }) => Promise<SendResult>;
export type SyncStatus = "saved" | "saving" | "offline" | "closed";

/** Hàng đợi tự lưu: ghi máy ngay mỗi thay đổi, gửi bản MỚI NHẤT khi flush (mỗi 3 giây / khi rời trang). */
export class AnswerSync {
  status: SyncStatus = "saved";
  private inflight = false;
  private retryAt = 0;

  private constructor(
    private draft: Draft,
    private readonly store: DraftStore,
    private readonly send: Sender,
    private readonly onChange: (s: SyncStatus, d: Draft) => void,
    private readonly clock: () => number,
  ) {}

  /** Lấy bản mới hơn giữa máy và máy chủ (máy mới hơn khi mất mạng rồi tải lại trang). */
  static async open(store: DraftStore, submissionId: string, server: { seq: number; answers: Answers }, send: Sender, onChange: (s: SyncStatus, d: Draft) => void = () => {}, clock: () => number = () => Date.now()): Promise<AnswerSync> {
    const local = await store.get(submissionId);
    const draft: Draft =
      local && local.seq > server.seq
        ? { ...local, syncedSeq: Math.max(local.syncedSeq, server.seq) }
        : { submissionId, seq: server.seq, syncedSeq: server.seq, answers: server.answers, flags: local?.flags ?? [], updatedAt: clock() };
    await store.put(draft);
    const s = new AnswerSync(draft, store, send, onChange, clock);
    s.status = s.dirty ? "saving" : "saved";
    return s;
  }

  get answers(): Answers {
    return this.draft.answers;
  }
  get flags(): number[] {
    return this.draft.flags;
  }
  get seq(): number {
    return this.draft.seq;
  }
  get dirty(): boolean {
    return this.draft.seq > this.draft.syncedSeq;
  }

  async set(no: number, value: AnswerValue): Promise<void> {
    if (this.status === "closed") return;
    this.draft = { ...this.draft, seq: this.draft.seq + 1, answers: { ...this.draft.answers, [String(no)]: value }, updatedAt: this.clock() };
    await this.store.put(this.draft);
    this.emit(this.status === "offline" ? "offline" : "saving");
  }

  async toggleFlag(no: number): Promise<void> {
    const flags = this.draft.flags.includes(no) ? this.draft.flags.filter((x) => x !== no) : [...this.draft.flags, no];
    this.draft = { ...this.draft, flags };
    await this.store.put(this.draft);
    this.emit(this.status);
  }

  async flush(keepalive = false): Promise<void> {
    if (this.inflight || this.status === "closed" || !this.dirty || this.clock() < this.retryAt) return;
    this.inflight = true;
    const seq = this.draft.seq;
    try {
      const r = await this.send(seq, this.draft.answers, { keepalive });
      if (r.kind === "ok") {
        this.draft = { ...this.draft, syncedSeq: Math.max(this.draft.syncedSeq, seq) };
        await this.store.put(this.draft);
        this.emit(this.dirty ? "saving" : "saved");
      } else if (r.kind === "closed") this.emit("closed");
      else if (r.kind === "retry") {
        this.retryAt = this.clock() + r.afterMs;
        this.emit("saving");
      } else this.emit("offline");
    } catch {
      this.emit("offline");
    } finally {
      this.inflight = false;
    }
  }

  /** Bản để nộp: seq mới, luôn lớn hơn mọi bản đã gửi. */
  async forSubmit(): Promise<{ seq: number; answers: Answers }> {
    this.draft = { ...this.draft, seq: this.draft.seq + 1 };
    await this.store.put(this.draft);
    return { seq: this.draft.seq, answers: this.draft.answers };
  }

  markClosed(): void {
    this.emit("closed");
  }

  private emit(s: SyncStatus): void {
    this.status = s;
    this.onChange(s, this.draft);
  }
}

export function memoryStore(): DraftStore {
  const m = new Map<string, Draft>();
  return { get: async (id) => m.get(id), put: async (d) => void m.set(d.submissionId, d) };
}
```

```ts
// web/src/student/leave.ts
export type LeaveKind = "leave" | "return";

/** Gộp blur + visibilitychange thành MỘT lần rời bài / quay lại. */
export class LeaveTracker {
  private away = false;
  constructor(private readonly onEvent: (k: LeaveKind) => void) {}
  update(visible: boolean, focused: boolean): void {
    const away = !visible || !focused;
    if (away === this.away) return;
    this.away = away;
    this.onEvent(away ? "leave" : "return");
  }
}

export function watchLeave(t: LeaveTracker, doc: Document = document, win: Window = window): () => void {
  const check = () => t.update(doc.visibilityState === "visible", doc.hasFocus());
  doc.addEventListener("visibilitychange", check);
  win.addEventListener("blur", check);
  win.addEventListener("focus", check);
  return () => {
    doc.removeEventListener("visibilitychange", check);
    win.removeEventListener("blur", check);
    win.removeEventListener("focus", check);
  };
}

/** Hộp thư sự kiện: gửi theo lô, gửi hỏng thì giữ lại lần sau. */
export class EventOutbox {
  private q: LeaveKind[] = [];
  private busy = false;
  push(k: LeaveKind): void {
    this.q.push(k);
  }
  get size(): number {
    return this.q.length;
  }
  async flush(send: (events: { kind: LeaveKind }[]) => Promise<boolean>): Promise<void> {
    if (this.busy || !this.q.length) return;
    this.busy = true;
    const batch = this.q.splice(0, 50);
    try {
      if (!(await send(batch.map((kind) => ({ kind }))))) this.q.unshift(...batch);
    } catch {
      this.q.unshift(...batch);
    } finally {
      this.busy = false;
    }
  }
}
```

```ts
// web/src/student/studentApi.ts
import type { StudentSession } from "./types";

const KEY = "eduvn.hs";
export type StoredSession = StudentSession & { expiresAt: number };

export const isSessionValid = (s: StoredSession | null, now = Date.now()): s is StoredSession => !!s && s.expiresAt - 60_000 > now;

export function loadSession(): StoredSession | null {
  try {
    const s = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? "null") as StoredSession | null;
    return isSessionValid(s) ? s : null;
  } catch {
    return null;
  }
}
export function saveSession(s: StudentSession, now = Date.now()): StoredSession {
  const stored = { ...s, expiresAt: now + s.expiresInSeconds * 1000 };
  globalThis.localStorage?.setItem(KEY, JSON.stringify(stored));
  return stored;
}
export const clearSession = (): void => globalThis.localStorage?.removeItem(KEY);

export class StudentApiError extends Error {
  constructor(
    public status: number,
    public body: { error?: string; status?: string; issues?: unknown[] } | null,
  ) {
    super(body?.error ?? `HTTP ${status}`);
  }
}

/** Chờ trước khi gửi lại khi 429/503: theo Retry-After nếu có, không thì lùi dần; cộng nhiễu 0–400 ms để cả lớp không gửi cùng lúc. */
export function retryAfterMs(header: string | null, attempt: number, rand: () => number = Math.random): number {
  const s = Number(header);
  const base = header !== null && Number.isFinite(s) && s > 0 ? s * 1000 : Math.min(8000, 500 * 2 ** attempt);
  return Math.round(base + rand() * 400);
}

type Init = { method?: string; body?: unknown; keepalive?: boolean; retries?: number; token?: string | null };

/** fetch có phiên HS; 429/503 thì tự gửi lại (mặc định 2 lần). Lỗi mạng ném TypeError như fetch. */
export async function hsFetch(path: string, init: Init = {}): Promise<Response> {
  const token = init.token === undefined ? loadSession()?.token : init.token;
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  const retries = init.retries ?? 2;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(path, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body), keepalive: init.keepalive });
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      await new Promise((r) => setTimeout(r, retryAfterMs(res.headers.get("retry-after"), attempt)));
      continue;
    }
    return res;
  }
}

/** JSON hoặc ném StudentApiError. 401 ngoài trang đăng nhập: xoá phiên, về /hs. */
export async function hsJson<T>(path: string, init: Init = {}): Promise<T> {
  const res = await hsFetch(path, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/api/student/session")) {
      clearSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/hs") window.location.assign("/hs");
    }
    throw new StudentApiError(res.status, data);
  }
  return data as T;
}

export const errMsg = (e: unknown): string => (e instanceof StudentApiError ? e.message : e instanceof TypeError ? "Mất mạng – em kiểm tra kết nối rồi thử lại" : "Có lỗi, em thử lại nhé");
```

```ts
// web/src/student/draftStore.ts
import Dexie, { type EntityTable } from "dexie";
import { type Draft, type DraftStore, memoryStore } from "./syncQueue";

type HsDb = Dexie & { drafts: EntityTable<Draft, "submissionId"> };
let db: HsDb | null = null;

function open(): HsDb {
  if (!db) {
    db = new Dexie("eduvn-hs") as HsDb;
    db.version(1).stores({ drafts: "submissionId, updatedAt" });
  }
  return db;
}

/** IndexedDB (Dexie); trình duyệt chặn IndexedDB thì giữ trong bộ nhớ. */
export async function pickStore(): Promise<DraftStore> {
  try {
    const d = open();
    await d.open();
    return {
      get: (id) => d.drafts.get(id),
      put: async (x) => {
        await d.drafts.put(x);
      },
    };
  } catch {
    return memoryStore();
  }
}
```

```ts
// web/src/pages/classroom/badgeSheet.ts
import QRCode from "qrcode";

export type BadgeView = { seat: number; fullName: string; pin: string; qrUrl: string };
export const PER_PAGE = 8;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
export const seatLabel = (n: number) => String(n).padStart(2, "0");

export const qrSvg = (url: string): Promise<string> => QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 1 });

/** Trang in A4 dọc, 8 thẻ mỗi trang (2 × 4), cắt theo nét đứt. svgs[i] = QR của cards[i]. */
export function badgeSheetHtml(o: { className: string; subject: string | null; classCode: string; cards: readonly BadgeView[]; svgs: readonly string[] }): string {
  const sub = esc(`Lớp ${o.className}${o.subject ? ` · ${o.subject}` : ""}`);
  const badge = (c: BadgeView, i: number) => `<div class="badge"><div class="bh"><b>EDUVN</b><span>${esc(o.classCode)}</span></div>
<div class="g"><div class="nm">${esc(c.fullName)}</div><div class="cl">${sub}</div>
<div class="kv"><div><small>Mã lớp</small><b>${esc(o.classCode)}</b></div><div><small>STT</small><b>${seatLabel(c.seat)}</b></div><div><small>PIN</small><b>${esc(c.pin)}</b></div></div></div>
<div class="qr">${o.svgs[i] ?? ""}</div></div>`;
  const pages: string[] = [];
  for (let i = 0; i < o.cards.length; i += PER_PAGE) pages.push(`<section class="page">${o.cards.slice(i, i + PER_PAGE).map((c, k) => badge(c, i + k)).join("")}</section>`);
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Thẻ lớp ${esc(o.className)}</title><style>
@page { size: A4 portrait; margin: 10mm; }
* { box-sizing: border-box; } body { margin: 0; font: 12px/1.35 "Be Vietnam Pro", system-ui, sans-serif; color: #1b2033; }
.page { width: 190mm; height: 277mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); gap: 4mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
.badge { border: 1.5px dashed #b6bdd4; border-radius: 4mm; padding: 4mm; display: grid; grid-template-columns: 1fr 34mm; grid-template-rows: auto 1fr; gap: 2mm 3mm; overflow: hidden; }
.bh { grid-column: 1 / -1; display: flex; justify-content: space-between; color: #3e57d1; font-weight: 700; } .bh span { color: #636b84; font-weight: 500; }
.nm { font-weight: 700; font-size: 15px; } .cl { color: #636b84; margin-bottom: 2mm; }
.kv { display: flex; gap: 1.5mm; } .kv div { background: #f4f6fb; border-radius: 2mm; padding: 1mm 2mm; } .kv small { display: block; color: #636b84; font-size: 9px; } .kv b { font-size: 13px; letter-spacing: .03em; }
.qr svg { width: 34mm; height: 34mm; display: block; }
</style></head><body>${pages.join("")}</body></html>`;
}

/** Mở cửa sổ in. URL QR = <origin>/hs/qr#<token> (token nằm sau #, không lên log máy chủ). */
export async function printBadges(o: { className: string; subject: string | null; classCode: string; cards: readonly { seat: number; fullName: string; pin: string; qrToken: string }[] }): Promise<void> {
  const views = o.cards.map((c) => ({ seat: c.seat, fullName: c.fullName, pin: c.pin, qrUrl: `${window.location.origin}/hs/qr#${c.qrToken}` }));
  const svgs = await Promise.all(views.map((v) => qrSvg(v.qrUrl)));
  const w = window.open("", "_blank");
  if (!w) throw new Error("Trình duyệt chặn cửa sổ in — cho phép cửa sổ bật lên rồi thử lại");
  w.document.write(badgeSheetHtml({ ...o, cards: views, svgs }));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
```

- [ ] **Step 5: Xanh**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web test` → PASS (9 file: 5 cũ + 4 mới, 20 test mới).
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web typecheck` → không lỗi.

- [ ] **Step 6: Commit**

```bash
git add web/package.json pnpm-lock.yaml web/src/student web/src/pages/classroom/badgeSheet.ts web/tests/hsClock.test.ts web/tests/hsSync.test.ts web/tests/hsLeave.test.ts web/tests/badgeSheet.test.ts
git commit -m "feat(web): module thuần khu HS — đồng hồ theo máy chủ, hàng đợi tự lưu (Dexie), bắt rời tab, gửi lại có nhiễu; trang in thẻ lớp có QR"
```

---

### Task 10: Web — khu học sinh `/hs` (đăng nhập, bài của em, phòng làm bài, kết quả)

**Files:**
- Create: `web/src/student/StudentApp.tsx`, `web/src/student/StudentLogin.tsx`, `web/src/student/MyAssignments.tsx`, `web/src/student/QuestionCard.tsx`, `web/src/student/ExamRoom.tsx`, `web/src/student/ResultPage.tsx`, `web/src/student/hs.css`
- Modify: `web/src/App.tsx`, `web/src/auth.tsx`, `web/src/pages/Login.tsx`, `web/src/sprite.ts`

**Interfaces:**
- Consumes: Task 9 (mọi module `web/src/student/*.ts`), REST Task 5/7, `MathField` (`math/MathEditor.tsx`), `MathText`, `MathKeyboard`, `Icon`, `vn` (`api.ts`), `useAuth`, `userManager`.
- Produces: route `/hs` (đăng nhập hoặc "Bài của em"), `/hs/qr#<token>`, `/hs/bai/:assignmentId` (phòng làm bài), `/hs/ket-qua/:submissionId`. `auth.tsx` export `AFTER_LOGIN_KEY = "eduvn.after"`; `Callback` quay về `sessionStorage[AFTER_LOGIN_KEY]` nếu bắt đầu bằng `/hs`.
- `data-testid` (smoke Task 12 dùng): đăng nhập `hs-in-code`, `hs-in-seat`, `hs-in-pin-0…5`, `hs-go`, `hs-in-join`, `hs-join`, `hs-err`, `hs-info`; danh sách `hs-asg`, `hs-start`; phòng `hs-variant`, `hs-save`, `hs-timer`, `hs-submit-top`, `hs-submit`, `hs-confirm`, `hs-pal-<i>`, `hs-q-<no>`, `hs-opt-<no>-<k>`, `hs-tf-<no>-<k>-d|s`, `hs-sa-<no>` (math-field), `hs-essay-<no>`, `hs-flag-<no>`, `hs-done`; kết quả `hs-score`, `hs-rq`; `hs-logout`.
- Giao diện = `web/mockup/lop-hoc.html` màn 1–4 (CSS dưới đây là bản chép có tiền tố `hs-`). Phòng làm bài: máy tính = danh sách câu + cột bảng số câu; điện thoại (≤ 720 px) = một câu mỗi màn + bảng số câu phía trên + thanh dưới (Câu trước / Xem lại / Câu sau|Nộp bài) + nút "Nộp" trên thanh đầu. Trạng thái lưu: "Đã lưu" / "Đang lưu…" / "Mất mạng – vẫn lưu trên máy". Hết giờ → tự nộp + hộp "Hết giờ rồi!". Bàn phím toán VN (`MathKeyboard`) hiện cả ở `/hs` khi mở ô công thức.

- [ ] **Step 1: Icon**

Chép 27 `<symbol>` còn thiếu từ mockup vào cuối chuỗi `SPRITE`:

```bash
python3 - <<'PY'
import re
m = open("web/mockup/lop-hoc.html").read(); p = "web/src/sprite.ts"; s = open(p).read()
have = set(re.findall(r'<symbol id="([a-z0-9-]+)"', s))
add = [re.sub(r"\s+", " ", f) for f, i in re.findall(r'(<symbol id="([a-z0-9-]+)".*?</symbol>)', m, re.S) if i not in have]
k = s.rstrip().rindex("`"); s = s[:k].rstrip("\n") + "\n" + "".join(f"  {x}\n" for x in add) + s[k:]
open(p, "w").write(s); print(len(add), "icon:", " ".join(re.findall(r'id="([a-z0-9-]+)"', "".join(add))))
PY
```

Expected: `27 icon: chevl chevr clock flag checkc wifioff loader qr printer camera refresh alert chart shuffle lock eye arrowl arrowr cal user send list shield timer repeat ban eyeoff`.

- [ ] **Step 2: Nối route + đăng nhập quay về**

`web/src/auth.tsx`: thêm ngay trên `const KEYCLOAK =`:

```ts
/** Trang quay về sau khi đăng nhập Keycloak (khu HS: /hs?ma=…). */
export const AFTER_LOGIN_KEY = "eduvn.after";
```

`web/src/pages/Login.tsx`: import thành `import { AFTER_LOGIN_KEY, finishLogin, useAuth } from "../auth";`; trong `Callback` thay `.then(() => window.location.replace("/"))` bằng:

```tsx
      .then(() => {
        const after = window.sessionStorage.getItem(AFTER_LOGIN_KEY);
        window.sessionStorage.removeItem(AFTER_LOGIN_KEY);
        window.location.replace(after?.startsWith("/hs") ? after : "/");
      })
```

`web/src/App.tsx`:
- import router thành `import { Navigate, Route, Routes, useLocation } from "react-router";` và thêm `import { StudentApp } from "./student/StudentApp";`;
- trong `App()`, sau `const { user, ready } = useAuth();` thêm `const inHs = /^\/hs(\/|$)/.test(useLocation().pathname);`;
- thêm route ngay sau `<Route path="/callback" element={<Callback />} />`: `<Route path="/hs/*" element={<StudentApp />} />` (khu HS không cần đăng nhập Keycloak);
- đổi `{user && <MathKeyboard />}` thành `{(user || inHs) && <MathKeyboard />}`.

- [ ] **Step 3: Thành phần**

```tsx
// web/src/student/StudentApp.tsx
import { useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Icon } from "../Icon";
import { ExamRoom } from "./ExamRoom";
import { MyAssignments } from "./MyAssignments";
import { QrLogin, StudentLogin } from "./StudentLogin";
import { ResultPage } from "./ResultPage";
import { type StoredSession, clearSession, loadSession } from "./studentApi";
import "./hs.css";

/** Khu học sinh /hs: bố cục riêng, ưu tiên điện thoại; chỉ dùng phiên HS (không cần Keycloak). */
export function StudentApp() {
  return (
    <div className="hs">
      <Routes>
        <Route index element={<HsHome />} />
        <Route path="qr" element={<QrLogin />} />
        <Route path="bai/:id" element={<Need><ExamRoom /></Need>} />
        <Route path="ket-qua/:sid" element={<Need><HsHead /><ResultPage /></Need>} />
        <Route path="*" element={<Navigate to="/hs" replace />} />
      </Routes>
    </div>
  );
}

function Need({ children }: { children: ReactNode }) {
  return loadSession() ? <>{children}</> : <Navigate to="/hs" replace />;
}

function HsHome() {
  const [s, setS] = useState<StoredSession | null>(loadSession);
  if (!s) return <StudentLogin onLogin={setS} />;
  return (
    <>
      <HsHead onLogout={() => setS(null)} />
      <MyAssignments />
    </>
  );
}

export function HsHead({ onLogout }: { onLogout?: () => void }) {
  const s = loadSession();
  if (!s) return null;
  const given = s.student.fullName.trim().split(/\s+/).pop() ?? "";
  const out = () => {
    clearSession();
    if (onLogout) onLogout();
    else window.location.assign("/hs");
  };
  return (
    <header className="hs-head">
      <div className="hs-in">
        <span className="mark"><Icon name="cap" /></span>
        <b className="hs-brand">EDUVN</b>
        <div className="hs-me">
          <div><b>{s.student.fullName}</b><small>Lớp {s.class.name}{s.student.seat ? ` · STT ${s.student.seat}` : ""}</small></div>
          <span className="avatar">{given.charAt(0).toUpperCase()}</span>
          <button className="hs-btn sm" onClick={out} aria-label="Đăng xuất" data-testid="hs-logout"><Icon name="logout" /></button>
        </div>
      </div>
    </header>
  );
}
```

```tsx
// web/src/student/StudentLogin.tsx
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { AFTER_LOGIN_KEY, useAuth, userManager } from "../auth";
import { Icon } from "../Icon";
import { type StoredSession, errMsg, hsFetch, hsJson, saveSession } from "./studentApi";
import type { StudentSession } from "./types";

type BarcodeDetectorLike = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/** Đăng nhập HS: mã lớp + số thứ tự + PIN; quét thẻ QR; hoặc tài khoản (Google/email) + mã tham gia. */
export function StudentLogin({ onLogin }: { onLogin: (s: StoredSession) => void }) {
  const { user, login } = useAuth();
  const [tab, setTab] = useState<"card" | "qr">("card");
  const [code, setCode] = useState("");
  const [seat, setSeat] = useState("");
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [join, setJoin] = useState(() => new URLSearchParams(window.location.search).get("ma") ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pins = useRef<(HTMLInputElement | null)[]>([]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const s = await hsJson<StudentSession>("/api/student/session", { method: "POST", body: { classCode: code, seat: Number(seat), pin: pin.join("") }, token: null });
      onLogin(saveSession(s));
    } catch (x) {
      setErr(errMsg(x));
      setPin(["", "", "", "", "", ""]);
      pins.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      // dán cả 6 số
      const next = [...pin];
      digits.slice(0, 6 - i).split("").forEach((d, k) => (next[i + k] = d));
      setPin(next);
      pins.current[Math.min(5, i + digits.length)]?.focus();
      return;
    }
    const next = [...pin];
    next[i] = digits;
    setPin(next);
    if (digits && i < 5) pins.current[i + 1]?.focus();
  };

  const joinWith = useCallback(
    async (jc: string, idp?: "google") => {
      setErr(null);
      setInfo(null);
      const u = await userManager.getUser();
      if (!u || u.expired) {
        window.sessionStorage.setItem(AFTER_LOGIN_KEY, `/hs?ma=${encodeURIComponent(jc)}`);
        login(idp);
        return;
      }
      try {
        const res = await hsFetch("/api/student/session/oidc", { method: "POST", body: { joinCode: jc, fullName: u.profile.name }, token: u.access_token });
        const data = (await res.json()) as StudentSession & { message?: string; error?: string };
        if (res.status === 200) onLogin(saveSession(data));
        else if (res.status === 202) setInfo(data.message ?? "Chờ giáo viên xác nhận");
        else setErr(data.error ?? "Không vào được lớp");
      } catch (x) {
        setErr(errMsg(x));
      }
    },
    [login, onLogin],
  );

  // Quay về từ Keycloak với ?ma=…: tự đổi sang phiên HS
  useEffect(() => {
    const ma = new URLSearchParams(window.location.search).get("ma");
    if (ma && user) void joinWith(ma);
  }, [user, joinWith]);

  const google = () => (join.trim() ? void joinWith(join.trim(), "google") : setErr("Nhập mã tham gia lớp ở ô bên dưới trước nhé"));

  return (
    <div className="hs-login">
      <div className="hs-col">
        <div className="hs-box">
          <div className="hs-lhead">
            <div className="brand"><span className="mark"><Icon name="cap" /></span>EDUVN</div>
            <p>Chào em! Vào lớp thôi nào</p>
          </div>
          <div className="hs-seg hs-seg-full">
            <button className={tab === "card" ? "on" : ""} onClick={() => setTab("card")}><Icon name="key" />Mã lớp + PIN</button>
            <button className={tab === "qr" ? "on" : ""} onClick={() => setTab("qr")}><Icon name="qr" />Quét thẻ QR</button>
          </div>
          {err && <div className="hs-err" data-testid="hs-err">{err}</div>}
          {info && <div className="hs-info" data-testid="hs-info">{info}</div>}
          {tab === "card" ? (
            <form onSubmit={(e) => void submit(e)}>
              <div className="hs-lrow">
                <label><div className="hs-bigl"><span className="n">1</span>Mã lớp</div><input className="hs-bigin" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoComplete="off" data-testid="hs-in-code" /></label>
                <label><div className="hs-bigl"><span className="n">2</span>Số TT</div><input className="hs-bigin" value={seat} onChange={(e) => setSeat(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={3} data-testid="hs-in-seat" /></label>
              </div>
              <div className="hs-bigl"><span className="n">3</span>Mã PIN (6 số)</div>
              <div className="hs-pins">
                {pin.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      pins.current[i] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`PIN số ${i + 1}`}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Backspace" && !pin[i] && i > 0 && pins.current[i - 1]?.focus()}
                    data-testid={`hs-in-pin-${i}`}
                  />
                ))}
              </div>
              <button className="hs-btn primary lg block" disabled={busy || code.length !== 6 || !seat || pin.join("").length !== 6} data-testid="hs-go"><Icon name="arrowr" />Vào lớp</button>
            </form>
          ) : (
            <QrScan />
          )}
        </div>
        <div className="hs-box hs-alt">
          <div className="hs-ttl"><Icon name="user" />Sinh viên / học sinh lớn</div>
          <button className="hs-gbtn" onClick={google}><Icon name="key" />Đăng nhập bằng Google</button>
          <div className="hs-or">hoặc</div>
          <div className="hs-join">
            <input className="hs-inp" placeholder="MÃ THAM GIA" maxLength={6} aria-label="Mã tham gia lớp" value={join} onChange={(e) => setJoin(e.target.value.toUpperCase())} data-testid="hs-in-join" />
            <button className="hs-btn primary" disabled={join.trim().length !== 6} onClick={() => void joinWith(join.trim())} data-testid="hs-join">Tham gia</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quét QR bằng camera nếu trình duyệt có BarcodeDetector; không thì hướng dẫn dùng camera điện thoại. */
function QrScan() {
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && !!window.BarcodeDetector;
  useEffect(() => {
    if (!on || !window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    const det = new window.BarcodeDetector({ formats: ["qr_code"] });
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        timer = window.setInterval(async () => {
          if (!video.current) return;
          const hit = (await det.detect(video.current)).find((c) => c.rawValue.startsWith(`${window.location.origin}/hs/qr#`));
          if (hit) window.location.assign(hit.rawValue);
        }, 300);
      })
      .catch(() => setErr("Không mở được camera. Em dùng camera điện thoại quét mã nhé."));
    return () => {
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);
  return (
    <div>
      <div className="hs-qrcam">
        {on ? <video ref={video} muted playsInline /> : <Icon name="camera" />}
        <span className="cr a" /><span className="cr b" /><span className="cr c" /><span className="cr d" />
      </div>
      {err && <div className="hs-err">{err}</div>}
      <p className="hs-muted hs-center">{supported ? "Đưa mã QR trên thẻ vào khung" : "Mở camera điện thoại, quét mã QR trên thẻ — trang sẽ tự vào lớp."}</p>
      {supported && !on && <button className="hs-btn lg block" onClick={() => setOn(true)}><Icon name="camera" />Bật camera</button>}
    </div>
  );
}

/** /hs/qr#<token>: đổi thẻ QR lấy phiên HS. */
export function QrLogin() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", "/hs/qr");
    if (!token) {
      setErr("Thẻ QR không hợp lệ hoặc đã được cấp lại");
      return;
    }
    hsJson<StudentSession>("/api/student/session/qr", { method: "POST", body: { token }, token: null })
      .then((s) => {
        saveSession(s);
        nav("/hs", { replace: true });
      })
      .catch((e: unknown) => setErr(errMsg(e)));
  }, [nav]);
  return (
    <div className="hs-login">
      <div className="hs-box hs-center">
        {err ? <><div className="hs-err">{err}</div><a className="hs-btn" href="/hs">Đăng nhập bằng mã lớp</a></> : "Đang vào lớp…"}
      </div>
    </div>
  );
}
```

```tsx
// web/src/student/MyAssignments.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { vn } from "../api";
import { Icon } from "../Icon";
import { formatCountdown } from "./clock";
import { errMsg, hsJson } from "./studentApi";
import type { MyAssignment } from "./types";

type Filter = "all" | "todo" | "done";
const CHIP: Record<MyAssignment["state"], [string, string, string]> = {
  chua_mo: ["", "lock", "Chưa mở"],
  chua_lam: ["", "", "Chưa làm"],
  dang_lam: ["c-blue", "loader", "Đang làm"],
  da_nop: ["c-green", "check", "Đã nộp"],
  qua_han: ["c-red", "alert", "Quá hạn"],
};

/** "Bài của em": thẻ bài + hạn nộp đếm ngược + nút làm/làm tiếp/xem kết quả. */
export function MyAssignments() {
  const [rows, setRows] = useState<MyAssignment[] | null>(null);
  const [f, setF] = useState<Filter>("all");
  const [err, setErr] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    hsJson<MyAssignment[]>("/api/student/assignments").then(setRows).catch((e: unknown) => setErr(errMsg(e)));
    const iv = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(iv);
  }, []);
  const shown = (rows ?? []).filter((a) => f === "all" || (f === "todo" ? a.state === "chua_lam" || a.state === "dang_lam" : a.state === "da_nop"));
  return (
    <main className="hs-main">
      <div className="hs-hello">
        <h1>Bài của em</h1>
        <div className="hs-seg">
          {(["all", "todo", "done"] as const).map((k) => (
            <button key={k} className={f === k ? "on" : ""} onClick={() => setF(k)}>{{ all: "Tất cả", todo: "Cần làm", done: "Đã nộp" }[k]}</button>
          ))}
        </div>
      </div>
      {err && <div className="hs-err">{err}</div>}
      {rows && shown.length === 0 && <div className="hs-card hs-empty">Chưa có bài nào</div>}
      <div className="hs-asg-grid">
        {shown.map((a) => {
          const left = Date.parse(a.dueAt) - Date.now();
          const [cc, ci, cl] = CHIP[a.state];
          const due = a.state === "da_nop" ? "ok" : a.state === "qua_han" ? "late" : left < 6 * 3600_000 ? "soon" : "";
          const dueText = a.state === "da_nop" ? "Đã nộp" : a.state === "qua_han" ? "Hạn đã qua · không nộp được" : a.state === "chua_mo" ? `Mở lúc ${new Date(a.opensAt).toLocaleString("vi-VN")}` : formatCountdown(left);
          const go = a.state === "da_nop" && !a.canStart ? `/hs/ket-qua/${a.lastSubmissionId}` : `/hs/bai/${a.id}`;
          return (
            <div key={a.id} className="hs-card hs-asg" data-testid="hs-asg">
              <div className="top">
                <span className={`ic ${a.state === "da_nop" ? "green" : a.state === "qua_han" ? "red" : a.kind === "test" ? "blue" : "violet"}`}><Icon name={a.kind === "test" ? "exam" : "repeat"} /></span>
                <div className="g">
                  <div className="t">{a.title}</div>
                  <div className="chips">
                    <span className={`hs-chip ${a.kind === "test" ? "c-violet" : ""}`}>{a.kind === "test" ? "Kiểm tra" : "Luyện tập"}</span>
                    <span className={`hs-chip ${cc}`}>{ci && <Icon name={ci} />}{cl}</span>
                  </div>
                </div>
                {a.score10 !== null && <div className="sc"><b>{vn(a.score10)}</b><small>điểm</small></div>}
              </div>
              <div className="meta">
                <span><Icon name="list" />{a.questionCount} câu</span>
                <span><Icon name="timer" />{a.durationMinutes ? `${a.durationMinutes} phút` : "Không giới hạn"}</span>
                <span><Icon name="repeat" />Lượt {a.attemptsUsed} / {a.attemptsAllowed}</span>
              </div>
              {a.state === "dang_lam" && (
                <div>
                  <div className="hs-bar"><i style={{ width: `${(a.answered / Math.max(1, a.questionCount)) * 100}%` }} /></div>
                  <small className="hs-muted">Đã làm {a.answered}/{a.questionCount} câu</small>
                </div>
              )}
              <div className={`due ${due}`}><Icon name="clock" /><span>{dueText}</span></div>
              {a.state === "qua_han" || a.state === "chua_mo" || (a.state === "da_nop" && !a.lastSubmissionId) ? (
                <button className="hs-btn" disabled>{a.state === "chua_mo" ? "Chưa mở" : "Đã quá hạn"}</button>
              ) : (
                <Link className={`hs-btn ${a.state === "da_nop" && !a.canStart ? "" : "primary"}`} to={go} data-testid="hs-start">
                  <Icon name={a.state === "da_nop" && !a.canStart ? "eye" : "arrowr"} />
                  {a.state === "dang_lam" ? "Làm tiếp" : a.state === "da_nop" ? (a.canStart ? "Làm lại" : "Xem kết quả") : "Làm bài"}
                </Link>
              )}
              {a.state === "da_nop" && a.canStart && a.lastSubmissionId && <Link className="hs-link" to={`/hs/ket-qua/${a.lastSubmissionId}`}>Xem kết quả lượt trước</Link>}
            </div>
          );
        })}
      </div>
    </main>
  );
}
```

```tsx
// web/src/student/QuestionCard.tsx
import { vn } from "../api";
import { Icon } from "../Icon";
import { MathField } from "../math/MathEditor";
import { MathText } from "../math/MathText";
import type { AnswerValue, PublicItem } from "./types";

const LETTERS = "ABCD";
const TYPE_VI = { mcq: "Trắc nghiệm", true_false: "Đúng / Sai", short_answer: "Trả lời ngắn", essay: "Tự luận" } as const;

type Props = { q: PublicItem; index: number; value: AnswerValue | undefined; flagged: boolean; current: boolean; onAnswer: (v: AnswerValue) => void; onFlag: () => void; onFocus: () => void };

/** Một câu trong phòng làm bài. Trên điện thoại chỉ câu `current` hiện (CSS). */
export function QuestionCard({ q, index, value, flagged, current, onAnswer, onFlag, onFocus }: Props) {
  return (
    <div id={`hs-q-${index}`} className={`hs-card hs-q${current ? " cur" : ""}`} onFocusCapture={onFocus} data-testid={`hs-q-${q.no}`}>
      <div className="qh">
        <span className="qn">{index + 1}</span>
        <span className="hs-chip c-blue">{TYPE_VI[q.type]}</span>
        <span className="pt">{vn(q.maxPoints)} điểm</span>
        <button className={`flagbtn${flagged ? " on" : ""}`} onClick={onFlag} data-testid={`hs-flag-${q.no}`}><Icon name="flag" />{flagged ? "Đã đánh dấu" : "Đánh dấu xem lại"}</button>
      </div>
      <div className="qt"><MathText value={q.stem} /></div>
      {q.type === "mcq" && (
        <div className="hs-opts">
          {q.options.map((o, k) => (
            <button key={k} className={`hs-opt${value === k ? " on" : ""}`} onClick={() => onAnswer(k)} data-testid={`hs-opt-${q.no}-${k}`}>
              <span className="l">{LETTERS[k]}</span><span><MathText value={o} /></span>
            </button>
          ))}
        </div>
      )}
      {q.type === "true_false" && (
        <div className="hs-tf">
          {q.statements.map((s, k) => {
            const cur = Array.isArray(value) ? value : [null, null, null, null];
            const pick = (b: boolean) => onAnswer(cur.map((x, i) => (i === k ? b : x)));
            return (
              <div key={k} className="r">
                <span className="l">{"abcd"[k]}</span>
                <span className="s"><MathText value={s} /></span>
                <div className="tog" role="group" aria-label={`Ý ${"abcd"[k]}`}>
                  <button className={`t${cur[k] === true ? " on" : ""}`} onClick={() => pick(true)} data-testid={`hs-tf-${q.no}-${k}-d`}>Đúng</button>
                  <button className={`f${cur[k] === false ? " on" : ""}`} onClick={() => pick(false)} data-testid={`hs-tf-${q.no}-${k}-s`}>Sai</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {q.type === "short_answer" && (
        <div className="hs-sa">
          <MathField key={q.no} value={typeof value === "string" ? value : ""} onChange={(v) => onAnswer(v)} testId={`hs-sa-${q.no}`} />
          <small className="hs-muted">Ô công thức · gõ như trên bàn phím, bàn phím toán hiện bên dưới</small>
        </div>
      )}
      {q.type === "essay" && (
        <textarea className="hs-essay" maxLength={5000} value={typeof value === "string" ? value : ""} onChange={(e) => onAnswer(e.target.value)} placeholder="Em trình bày bài làm ở đây" data-testid={`hs-essay-${q.no}`} />
      )}
    </div>
  );
}
```

```tsx
// web/src/student/ExamRoom.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Icon } from "../Icon";
import { isAnswered, isPartial, unanswered } from "./answers";
import { ServerClock, formatClock, timerTone } from "./clock";
import { pickStore } from "./draftStore";
import { EventOutbox, LeaveTracker, watchLeave } from "./leave";
import { QuestionCard } from "./QuestionCard";
import { StudentApiError, errMsg, hsFetch, hsJson, retryAfterMs } from "./studentApi";
import { AnswerSync, type Sender, type SyncStatus } from "./syncQueue";
import type { AnswerValue, Answers, RoomPayload, SaveResult, StudentResult } from "./types";

const SAVE_TEXT: Record<SyncStatus, [string, string]> = {
  saved: ["checkc", "Đã lưu"],
  saving: ["loader", "Đang lưu…"],
  offline: ["wifioff", "Mất mạng – vẫn lưu trên máy"],
  closed: ["checkc", "Đã nộp"],
};

/** Phòng làm bài: lưu máy (Dexie) mỗi thay đổi + gửi máy chủ mỗi 3 giây; đồng hồ theo giờ máy chủ; bắt rời tab. */
export function ExamRoom() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const clock = useRef(new ServerClock());
  const outbox = useRef(new EventOutbox());
  const submitted = useRef(false);
  const autoTried = useRef(0);
  const [room, setRoom] = useState<RoomPayload | null>(null);
  const [sync, setSync] = useState<AnswerSync | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<number[]>([]);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [deadline, setDeadline] = useState("");
  const [left, setLeft] = useState(Number.POSITIVE_INFINITY);
  const [cur, setCur] = useState(0);
  const [ask, setAsk] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 1) Vào phòng: bắt đầu/tiếp tục lượt, nạp bản nháp mới nhất (máy hoặc máy chủ)
  useEffect(() => {
    let alive = true;
    (async () => {
      const sentAt = Date.now();
      const r = await hsJson<RoomPayload>(`/api/student/assignments/${id}/start`, { method: "POST", body: {} });
      clock.current.sample(r.serverNow, sentAt, Date.now());
      const sid = r.submission.id;
      const send: Sender = async (seq, ans, o) => {
        const t0 = Date.now();
        try {
          const res = await hsFetch(`/api/student/submissions/${sid}/answers`, { method: "PUT", body: { seq, answers: ans }, keepalive: o.keepalive, retries: 0 });
          if (res.ok) {
            const b = (await res.json()) as SaveResult;
            clock.current.sample(b.serverNow, t0, Date.now());
            setDeadline(b.deadlineAt);
            return { kind: "ok", seq: b.seq };
          }
          if (res.status === 409) return { kind: "closed", status: ((await res.json()) as { status?: string }).status ?? "submitted" };
          if (res.status === 401) return { kind: "closed", status: "unauthorized" };
          return { kind: "retry", afterMs: retryAfterMs(res.headers.get("retry-after"), 1) };
        } catch {
          return { kind: "offline" };
        }
      };
      const s = await AnswerSync.open(await pickStore(), sid, { seq: r.submission.seq, answers: r.submission.answers }, send, (st, d) => {
        setStatus(st);
        setAnswers(d.answers);
        setFlags(d.flags);
      });
      if (!alive) return;
      setRoom(r);
      setSync(s);
      setAnswers(s.answers);
      setFlags(s.flags);
      setStatus(s.status);
      setDeadline(r.submission.deadlineAt);
    })().catch((e: unknown) => setErr(e instanceof StudentApiError && e.status === 409 ? e.message : errMsg(e)));
    return () => {
      alive = false;
    };
  }, [id]);

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (!sync || !room || submitted.current) return;
      submitted.current = true;
      setBusy(true);
      setAsk(false);
      try {
        const body = await sync.forSubmit();
        await hsJson<StudentResult>(`/api/student/submissions/${room.submission.id}/submit`, { method: "POST", body });
        sync.markClosed();
        if (auto) setTimeUp(true);
        else nav(`/hs/ket-qua/${room.submission.id}`, { replace: true });
      } catch (e) {
        submitted.current = false;
        setErr(`${errMsg(e)}. Bài vẫn lưu trên máy, em bấm Nộp lại nhé.`);
      } finally {
        setBusy(false);
      }
    },
    [sync, room, nav],
  );

  // 2) Gửi mỗi 3 giây, khi rời trang, khi có mạng lại; ghi rời tab
  useEffect(() => {
    if (!sync || !room) return;
    const sid = room.submission.id;
    const sendEvents = (keepalive: boolean) => async (events: { kind: "leave" | "return" }[]) =>
      (await hsFetch(`/api/student/submissions/${sid}/events`, { method: "POST", body: { events }, keepalive, retries: 0 })).ok;
    const iv = window.setInterval(() => {
      void sync.flush();
      void outbox.current.flush(sendEvents(false));
    }, 3000);
    const stop = watchLeave(
      new LeaveTracker((k) => {
        outbox.current.push(k);
        if (k === "leave") void sync.flush(true);
      }),
    );
    const onHide = () => {
      void sync.flush(true);
      void outbox.current.flush(sendEvents(true));
    };
    const onOnline = () => void sync.flush();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(iv);
      stop();
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("online", onOnline);
    };
  }, [sync, room]);

  // 3) Đồng hồ theo giờ máy chủ; hết giờ thì tự nộp (thử lại mỗi 5 giây nếu mất mạng)
  useEffect(() => {
    if (!deadline) return;
    const iv = window.setInterval(() => {
      const ms = clock.current.remainingMs(deadline);
      setLeft(ms);
      if (ms === 0 && !submitted.current && Date.now() - autoTried.current > 5000) {
        autoTried.current = Date.now();
        void doSubmit(true);
      }
    }, 250);
    return () => window.clearInterval(iv);
  }, [deadline, doSubmit]);

  // Máy chủ báo bài đã chốt (hết giờ + ân hạn) khi đang lưu
  useEffect(() => {
    if (status === "closed" && !submitted.current) setTimeUp(true);
  }, [status]);

  if (err && !room) return <div className="hs-main"><div className="hs-err">{err}</div><a className="hs-btn" href="/hs">Về bài của em</a></div>;
  if (!room) return <div className="hs-main hs-muted">Đang mở bài…</div>;

  const qs = room.questions;
  const nos = qs.map((q) => q.no);
  const answer = (no: number, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [String(no)]: v }));
    void sync?.set(no, v);
  };
  const go = (i: number) => {
    setCur(i);
    if (window.innerWidth > 720) document.getElementById(`hs-q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const missing = unanswered(answers, nos);
  const done = nos.length - missing.length;
  const [ic, text] = SAVE_TEXT[status];
  const tone = timerTone(left);

  return (
    <>
      <div className="hs-extop">
        <div className="hs-in">
          <span className="ic blue"><Icon name="exam" /></span>
          <div className="ttl"><b>{room.assignment.title}</b><small data-testid="hs-variant">{room.assignment.subject} · mã đề {room.submission.variantCode}</small></div>
          <span className={`hs-save ${status}`} data-testid="hs-save"><Icon name={ic} /><span className="tx2">{text}</span></span>
          {Number.isFinite(left) && <span className={`hs-timer ${tone}`} title="Giờ theo máy chủ" data-testid="hs-timer"><Icon name="timer" />{formatClock(left)}</span>}
          <button className="hs-btn primary top-submit" onClick={() => setAsk(true)} disabled={busy} data-testid="hs-submit-top"><Icon name="send" />Nộp</button>
        </div>
      </div>
      {err && <div className="hs-main"><div className="hs-err">{err}</div></div>}
      <div className="hs-exbody">
        <div className="hs-qs">
          {qs.map((q, i) => (
            <QuestionCard key={q.no} q={q} index={i} value={answers[String(q.no)]} flagged={flags.includes(q.no)} current={i === cur} onAnswer={(v) => answer(q.no, v)} onFlag={() => void sync?.toggleFlag(q.no)} onFocus={() => setCur(i)} />
          ))}
        </div>
        <div className="hs-side">
          <div className="hs-card">
            <h2>Câu hỏi</h2>
            <div className="hs-pal">
              {qs.map((q, i) => {
                const v = answers[String(q.no)];
                const cls = [isAnswered(v) ? "ans" : isPartial(v) ? "part" : "", flags.includes(q.no) ? "flag" : "", i === cur ? "cur" : ""].join(" ");
                return (
                  <button key={q.no} className={cls} onClick={() => go(i)} aria-label={`Câu ${i + 1}`} data-testid={`hs-pal-${i}`}>
                    {i + 1}<span className="fl"><Icon name="flag" /></span>
                  </button>
                );
              })}
            </div>
            <div className="hs-legend"><span><i className="a" />Đã làm</span><span><i className="p" />Làm dở</span><span><i className="f" />Đánh dấu xem lại</span></div>
          </div>
          <div className="hs-card">
            <div className="sumline"><span className="hs-muted">Đã làm</span><span data-testid="hs-done">{done} / {nos.length}</span></div>
            <button className="hs-btn primary lg block" onClick={() => setAsk(true)} disabled={busy} data-testid="hs-submit"><Icon name="send" />Nộp bài</button>
          </div>
        </div>
      </div>
      <div className="hs-bottombar">
        <button className="hs-btn sq" onClick={() => go(Math.max(0, cur - 1))} disabled={cur === 0} aria-label="Câu trước"><Icon name="chevl" /></button>
        <button className={`hs-btn${flags.includes(qs[cur]?.no ?? -1) ? " flagged" : ""}`} onClick={() => qs[cur] && void sync?.toggleFlag(qs[cur].no)}><Icon name="flag" />Xem lại</button>
        {cur === qs.length - 1 ? (
          <button className="hs-btn primary" onClick={() => setAsk(true)}><Icon name="send" />Nộp bài</button>
        ) : (
          <button className="hs-btn primary" onClick={() => go(cur + 1)}>Câu sau<Icon name="chevr" /></button>
        )}
      </div>
      {ask && (
        <div className="hs-modal" role="dialog">
          <div className="hs-dlg">
            <div className={`ic ${missing.length ? "amber" : "green"}`}><Icon name={missing.length ? "alert" : "checkc"} /></div>
            <h3>{missing.length ? `Còn ${missing.length} câu chưa trả lời` : "Em đã trả lời hết rồi"}</h3>
            <div className="hs-muted">{missing.length ? "Nộp xong sẽ không sửa được nữa." : `Còn ${flags.length} câu đánh dấu xem lại. Nộp xong sẽ không sửa được nữa.`}</div>
            <div className="hs-nums">{missing.map((no) => <b key={no} className={flags.includes(no) ? "f" : ""}>{nos.indexOf(no) + 1}</b>)}</div>
            <div className="row">
              <button className="hs-btn" onClick={() => setAsk(false)}>Làm tiếp</button>
              <button className="hs-btn primary" onClick={() => void doSubmit(false)} disabled={busy} data-testid="hs-confirm">Nộp bài</button>
            </div>
          </div>
        </div>
      )}
      {timeUp && (
        <div className="hs-modal" role="dialog">
          <div className="hs-dlg">
            <div className="ic red"><Icon name="timer" /></div>
            <h3>Hết giờ rồi!</h3>
            <div className="hs-muted">Bài của em đã được tự nộp với các câu đã lưu.</div>
            <div className="row"><button className="hs-btn primary" onClick={() => nav(`/hs/ket-qua/${room.submission.id}`, { replace: true })}>Xem kết quả</button></div>
          </div>
        </div>
      )}
    </>
  );
}
```

```tsx
// web/src/student/ResultPage.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { vn } from "../api";
import { Icon } from "../Icon";
import { MathText } from "../math/MathText";
import { errMsg, hsJson, loadSession } from "./studentApi";
import type { ReviewItem, StudentResult } from "./types";

const LETTERS = "ABCD";
const LEVEL_VI = { full: "Lời giải: đã hiện", marks: "Lời giải: hiện sau hạn nộp", score: "Chỉ hiện điểm" } as const;

function duration(a: string, b: string | null): string {
  if (!b) return "—";
  const s = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m} phút ${s % 60} giây` : `${s} giây`;
}

function verdict(i: ReviewItem): [string, string, string, string] | null {
  if (i.correct === null) return i.type === "essay" && i.points === null ? ["violet", "clock", "c-violet", "Chờ chấm"] : null;
  if (i.correct) return ["green", "check", "c-green", "Đúng"];
  if ((i.points ?? 0) > 0) return ["amber", "alert", "c-amber", "Đúng một phần"];
  return ["red", "x", "c-red", "Sai"];
}

/** Kết quả của HS: điểm thang 10, từng câu đúng/sai, đáp án + lời giải theo cài đặt của GV. */
export function ResultPage() {
  const { sid = "" } = useParams();
  const [r, setR] = useState<StudentResult | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    hsJson<StudentResult>(`/api/student/submissions/${sid}`).then(setR).catch((e: unknown) => setErr(errMsg(e)));
  }, [sid]);
  if (err) return <main className="hs-main"><div className="hs-err">{err}</div></main>;
  if (!r) return <main className="hs-main hs-muted">…</main>;
  const name = loadSession()?.student.fullName.trim().split(/\s+/).pop() ?? "";
  const s10 = r.score10 ?? 0;
  const hello = s10 >= 8 ? `Làm tốt lắm, ${name}!` : s10 >= 5 ? `Em đã hoàn thành bài, ${name}!` : `Cố gắng thêm nhé, ${name}!`;
  return (
    <main className="hs-main hs-narrow">
      <div className="hs-card hs-res">
        <div className="ring">
          <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="#eceef4" strokeWidth="9" /><circle cx="50" cy="50" r="44" fill="none" stroke={s10 >= 5 ? "#16a34a" : "#d63a3a"} strokeWidth="9" strokeLinecap="round" strokeDasharray="276.5" strokeDashoffset={276.5 * (1 - s10 / 10)} /></svg>
          <div className="v"><b data-testid="hs-score">{r.score10 === null ? "—" : vn(r.score10)}</b><small>trên 10</small></div>
        </div>
        <div className="info">
          <div><h1>{hello}</h1><div className="hs-muted">{r.title}{r.status === "auto_submitted" ? " · tự nộp khi hết giờ" : ""}</div></div>
          <div className="stats">
            {r.level !== "score" && <div className="stat"><b>{r.correctCount} / {r.items.length}</b><small>Câu đúng hoàn toàn</small></div>}
            <div className="stat"><b>{duration(r.startedAt, r.submittedAt)}</b><small>Thời gian làm</small></div>
            <div className="stat"><b>{vn(r.score)} / {vn(r.maxScore)}</b><small>Điểm bài</small></div>
          </div>
          <div className="chips">
            <span className="hs-chip c-green"><Icon name="eye" />{LEVEL_VI[r.level]}</span>
            <span className="hs-chip"><Icon name="repeat" />Lượt {r.attempt} / {r.attemptsAllowed}</span>
            {r.pending > 0 && <span className="hs-chip c-violet">Còn {r.pending} câu tự luận chờ thầy cô chấm</span>}
          </div>
        </div>
      </div>
      {r.items.map((it, i) => {
        const v = verdict(it);
        return (
          <div key={it.no} className={`hs-card hs-rq${open === i ? " open" : ""}`} data-testid="hs-rq">
            <div className="rh" role="button" tabIndex={0} onClick={() => setOpen(open === i ? null : i)} onKeyDown={(e) => e.key === "Enter" && setOpen(open === i ? null : i)}>
              <span className={`rn ${v?.[0] ?? ""}`}>{v ? <Icon name={v[1]} /> : i + 1}</span>
              <div className="g"><b>Câu {i + 1}</b>{v && <span className={`hs-chip ${v[2]}`}>{v[3]}</span>}</div>
              {it.points !== null && <span className="pts">{vn(it.points)} / {vn(it.maxPoints)}</span>}
              <span className="chev"><Icon name="chev" /></span>
            </div>
            {open === i && (
              <div className="rb">
                <div className="qt"><MathText value={it.stem} /></div>
                <Answer it={it} />
                {it.explanation && <div className="hs-sol"><div className="st"><Icon name="spark" />Lời giải</div><MathText value={it.explanation} /></div>}
              </div>
            )}
          </div>
        );
      })}
      <div className="hs-actions">
        <Link className="hs-btn" to="/hs"><Icon name="arrowl" />Về bài của em</Link>
        {r.canRetry ? <Link className="hs-btn primary" to={`/hs/bai/${r.assignmentId}`}><Icon name="repeat" />Làm lại</Link> : <button className="hs-btn" disabled><Icon name="repeat" />Làm lại (hết lượt)</button>}
      </div>
    </main>
  );
}

function Answer({ it }: { it: ReviewItem }) {
  if (it.type === "mcq") {
    const mine = typeof it.response === "number" ? it.response : null;
    const key = it.key ? LETTERS.indexOf(it.key) : -1;
    return (
      <div className="hs-ansrow">
        <div className={`a ${it.correct === null ? "" : it.correct ? "ok" : "bad"}`}><small>Em chọn</small>{mine === null ? "Chưa trả lời" : <>{LETTERS[mine]}. <MathText value={it.options[mine] ?? ""} /></>}</div>
        {key >= 0 && key !== mine && <div className="a ok"><small>Đáp án đúng</small>{LETTERS[key]}. <MathText value={it.options[key] ?? ""} /></div>}
      </div>
    );
  }
  if (it.type === "true_false") {
    const mine = Array.isArray(it.response) ? it.response : [null, null, null, null];
    return (
      <div className="hs-tfres">
        {it.statements.map((s, k) => {
          const want = it.key ? it.key[k] === "Đ" : null;
          const ok = want === null || mine[k] === null ? null : mine[k] === want;
          return (
            <div key={k} className="r">
              <span className="l">{"abcd"[k]}</span>
              <span className="s"><MathText value={s} /></span>
              <span className={`hs-chip ${ok === null ? "" : ok ? "c-green" : "c-red"}`}>{ok !== null && <Icon name={ok ? "check" : "x"} />}Em chọn {mine[k] === null ? "—" : mine[k] ? "Đúng" : "Sai"}</span>
            </div>
          );
        })}
      </div>
    );
  }
  if (it.type === "short_answer") {
    const mine = typeof it.response === "string" && it.response.trim() ? it.response : null;
    return (
      <div className="hs-ansrow">
        <div className={`a ${it.correct === null ? "" : it.correct ? "ok" : "bad"}`}><small>Em nhập</small>{mine ? <MathText value={`$${mine}$`} /> : "Chưa trả lời"}</div>
        {it.key && <div className="a"><small>Đáp án</small><MathText value={it.key.split("|")[0] ?? ""} /></div>}
      </div>
    );
  }
  return <div className="hs-essayres">{typeof it.response === "string" && it.response ? it.response : "Chưa trả lời"}</div>;
}
```

```css
/* web/src/student/hs.css */
/* Khu học sinh /hs — chép từ web/mockup/lop-hoc.html (màn 1–4), mọi lớp có tiền tố hs- hoặc nằm trong .hs */
.hs { --line2: #dde1ec; --brand-d: #3e57d1; --red: #d63a3a; --red-bg: #fdeaea; --gray-bg: #f0f2f7; --hs-muted: #636b84; min-height: 100vh; background: var(--bg); }
.hs .ic { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex: none; margin: 0; }
.hs .ic.red { background: var(--red-bg); color: var(--red); }
.hs .mark { width: 34px; height: 34px; border-radius: 10px; background: var(--brand); color: #fff; display: grid; place-items: center; flex: none; }
.hs-muted { color: var(--hs-muted); }
.hs-center { text-align: center; }
.hs-card { background: var(--card); border-radius: 16px; padding: 20px; box-shadow: var(--shadow); }
.hs-empty { color: var(--hs-muted); text-align: center; }
.hs-err { background: var(--red-bg); color: #b42318; border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; white-space: pre-line; }
.hs-info { background: var(--green-bg); color: #116b34; border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; }
.hs-link { color: var(--brand); font-size: 13px; text-align: center; }

.hs-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--line2); background: var(--card); color: var(--ink); padding: 0 16px; min-height: 42px; border-radius: 12px; font-weight: 600; text-decoration: none; white-space: nowrap; transition: box-shadow .15s, transform .1s, background .15s; }
.hs-btn:hover { box-shadow: var(--shadow); }
.hs-btn:active { transform: scale(.98); }
.hs-btn.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
.hs-btn.primary:hover { background: var(--brand-d); }
.hs-btn.lg { min-height: 54px; font-size: 16px; border-radius: 14px; padding: 0 22px; }
.hs-btn.block { width: 100%; }
.hs-btn.sm { min-height: 38px; padding: 0 12px; }
.hs-btn.flagged { background: var(--amber-bg); color: var(--amber); border-color: #f3d9a8; }
.hs-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.hs-btn:focus-visible, .hs-opt:focus-visible, .hs-seg button:focus-visible, .hs-pal button:focus-visible { outline: 3px solid #b9c5fb; outline-offset: 2px; }
.hs-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; background: var(--gray-bg); color: var(--hs-muted); }
.hs-chip svg.i { width: 14px; height: 14px; stroke-width: 2.2; }
.hs .c-blue { background: var(--blue-bg); color: var(--brand-d); } .hs .c-green { background: var(--green-bg); color: var(--green); }
.hs .c-amber { background: var(--amber-bg); color: var(--amber); } .hs .c-red { background: var(--red-bg); color: var(--red); }
.hs .c-violet { background: var(--violet-bg); color: #6d3fd1; }
.hs-seg { display: inline-flex; background: var(--gray-bg); border-radius: 12px; padding: 4px; gap: 2px; }
.hs-seg button { border: 0; background: transparent; padding: 0 16px; min-height: 38px; border-radius: 9px; font-weight: 600; color: var(--hs-muted); display: inline-flex; align-items: center; gap: 8px; }
.hs-seg button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow); }
.hs-seg-full { display: flex; margin-bottom: 20px; } .hs-seg-full button { flex: 1; justify-content: center; min-height: 46px; }
.hs-inp { width: 100%; min-height: 46px; padding: 0 14px; border: 1.5px solid var(--line2); border-radius: 12px; font: inherit; background: #fff; color: var(--ink); }
.hs-inp:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 4px #e1e7fd; }
.hs-bar { height: 8px; background: var(--gray-bg); border-radius: 99px; overflow: hidden; } .hs-bar i { display: block; height: 100%; background: var(--brand); border-radius: 99px; }

/* 1. Đăng nhập */
.hs-login { min-height: 100vh; display: grid; place-items: center; padding: 28px 16px; background: linear-gradient(160deg, #1e2340 0%, #2c3470 55%, #4f6bed 100%); }
.hs-col { width: 100%; max-width: 480px; display: grid; gap: 14px; }
.hs-box { background: var(--card); border-radius: 22px; padding: 28px; box-shadow: var(--shadow-hi); }
.hs-lhead { text-align: center; margin-bottom: 20px; } .hs-lhead p { margin: 6px 0 0; color: var(--hs-muted); }
.hs-bigl { font-weight: 700; font-size: 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.hs-bigl .n { width: 24px; height: 24px; border-radius: 50%; background: var(--brand); color: #fff; display: grid; place-items: center; font-size: 12px; }
.hs-bigin { width: 100%; height: 66px; border: 2px solid var(--line2); border-radius: 16px; font: 700 30px/1 "Be Vietnam Pro", sans-serif; text-align: center; letter-spacing: .14em; color: var(--ink); background: #f9fafd; text-transform: uppercase; }
.hs-bigin:focus { outline: none; border-color: var(--brand); background: #fff; box-shadow: 0 0 0 5px #e1e7fd; }
.hs-lrow { display: grid; grid-template-columns: 1fr 112px; gap: 12px; margin-bottom: 18px; }
.hs-pins { display: flex; gap: 8px; margin-bottom: 22px; }
.hs-pins input { flex: 1; min-width: 0; height: 66px; border: 2px solid var(--line2); border-radius: 14px; text-align: center; font: 700 28px/1 "Be Vietnam Pro", sans-serif; background: #f9fafd; color: var(--ink); padding: 0; }
.hs-pins input:focus { outline: none; border-color: var(--brand); background: #fff; box-shadow: 0 0 0 4px #e1e7fd; }
.hs-qrcam { position: relative; aspect-ratio: 1; max-width: 280px; margin: 0 auto 18px; border-radius: 22px; background: radial-gradient(circle at 50% 40%, #39406e, #1e2340); overflow: hidden; display: grid; place-items: center; color: #8b92b8; }
.hs-qrcam video { width: 100%; height: 100%; object-fit: cover; }
.hs-qrcam > svg.i { width: 54px; height: 54px; stroke-width: 1.4; }
.hs-qrcam .cr { position: absolute; width: 46px; height: 46px; border: 4px solid #fff; }
.hs-qrcam .a { top: 26px; left: 26px; border-right: 0; border-bottom: 0; border-radius: 14px 0 0 0; } .hs-qrcam .b { top: 26px; right: 26px; border-left: 0; border-bottom: 0; border-radius: 0 14px 0 0; }
.hs-qrcam .c { bottom: 26px; left: 26px; border-right: 0; border-top: 0; border-radius: 0 0 0 14px; } .hs-qrcam .d { bottom: 26px; right: 26px; border-left: 0; border-top: 0; border-radius: 0 0 14px 0; }
.hs-alt { display: grid; gap: 10px; } .hs-ttl { font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.hs-gbtn { display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; min-height: 50px; border-radius: 14px; border: 1.5px solid var(--line2); background: #fff; font-weight: 600; }
.hs-join { display: flex; gap: 10px; } .hs-join .hs-inp { text-transform: uppercase; letter-spacing: .2em; font-weight: 700; text-align: center; min-height: 50px; }
.hs-or { display: flex; align-items: center; gap: 12px; color: var(--hs-muted); font-size: 12px; } .hs-or::before, .hs-or::after { content: ""; flex: 1; height: 1px; background: var(--line2); }

/* Vỏ HS */
.hs-head { background: #fff; box-shadow: 0 1px 0 var(--line); position: sticky; top: 0; z-index: 30; }
.hs-head .hs-in { max-width: 1120px; margin: 0 auto; padding: 12px 24px; display: flex; align-items: center; gap: 14px; }
.hs-brand { font-size: 17px; }
.hs-me { margin-left: auto; display: flex; align-items: center; gap: 10px; text-align: right; } .hs-me small { display: block; color: var(--hs-muted); line-height: 1.2; }
.hs .avatar { width: 38px; height: 38px; border-radius: 50%; background: #f4b740; color: #1e2340; display: grid; place-items: center; font-weight: 700; flex: none; }
.hs-main { max-width: 1120px; margin: 0 auto; padding: 24px; }
.hs-narrow { max-width: 860px; }

/* 2. Bài của em */
.hs-hello { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 20px; } .hs-hello h1 { margin: 0; } .hs-hello .hs-seg { margin-left: auto; }
.hs-asg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.hs-asg { display: flex; flex-direction: column; gap: 14px; transition: box-shadow .15s, transform .15s; }
.hs-asg:hover { box-shadow: var(--shadow-hi); transform: translateY(-2px); }
.hs-asg .top { display: flex; gap: 12px; align-items: flex-start; } .hs-asg .g { flex: 1; min-width: 0; } .hs-asg .t { font-weight: 600; font-size: 15px; line-height: 1.35; }
.hs-asg .chips { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
.hs-asg .sc { text-align: right; } .hs-asg .sc b { display: block; font-size: 26px; color: var(--green); line-height: 1; } .hs-asg .sc small { color: var(--hs-muted); }
.hs-asg .meta { display: flex; flex-wrap: wrap; gap: 6px 16px; color: var(--hs-muted); font-size: 13px; }
.hs-asg .meta span { display: inline-flex; align-items: center; gap: 6px; } .hs-asg .meta svg.i { width: 16px; height: 16px; }
.hs-asg .due { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; padding: 9px 12px; border-radius: 12px; background: var(--gray-bg); color: var(--hs-muted); font-variant-numeric: tabular-nums; }
.hs-asg .due.soon { background: var(--amber-bg); color: var(--amber); } .hs-asg .due.late { background: var(--red-bg); color: var(--red); } .hs-asg .due.ok { background: var(--green-bg); color: var(--green); }
.hs-asg .hs-btn { margin-top: auto; }

/* 3. Phòng làm bài */
.hs-extop { position: sticky; top: 0; z-index: 30; background: #fff; box-shadow: 0 1px 0 var(--line), 0 6px 16px rgba(20,28,60,.05); }
.hs-extop .hs-in { max-width: 1120px; margin: 0 auto; padding: 10px 24px; display: flex; align-items: center; gap: 12px; }
.hs-extop .ic { width: 40px; height: 40px; }
.hs-extop .ttl { min-width: 0; flex: 1; } .hs-extop .ttl b { display: block; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .hs-extop .ttl small { color: var(--hs-muted); }
.hs-timer { display: inline-flex; align-items: center; gap: 8px; background: var(--blue-bg); color: var(--brand-d); padding: 8px 14px; border-radius: 12px; font-weight: 700; font-size: 20px; font-variant-numeric: tabular-nums; }
.hs-timer.warn { background: var(--amber-bg); color: var(--amber); } .hs-timer.crit { background: var(--red-bg); color: var(--red); animation: hs-pulse 1s infinite; }
@keyframes hs-pulse { 50% { opacity: .65; } }
.hs-save { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; background: var(--green-bg); color: var(--green); white-space: nowrap; }
.hs-save svg.i { width: 16px; height: 16px; stroke-width: 2.2; }
.hs-save.saving { background: var(--blue-bg); color: var(--brand-d); } .hs-save.saving svg.i { animation: hs-spin 1s linear infinite; }
.hs-save.offline { background: var(--amber-bg); color: var(--amber); }
@keyframes hs-spin { to { transform: rotate(360deg); } }
.hs-exbody { max-width: 1120px; margin: 0 auto; padding: 18px 24px 40px; display: grid; grid-template-columns: 1fr 270px; gap: 20px; align-items: start; }
.hs-qs { display: grid; gap: 16px; min-width: 0; }
.hs-q { scroll-margin-top: 90px; transition: box-shadow .2s; }
.hs-q.cur { box-shadow: 0 0 0 2px #b9c5fb, var(--shadow-hi); }
.hs-q .qh { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.hs-q .qn { width: 34px; height: 34px; border-radius: 10px; background: var(--side); color: #fff; font-weight: 700; display: grid; place-items: center; }
.hs-q .pt { margin-left: auto; color: var(--hs-muted); font-size: 12.5px; }
.hs-q .flagbtn { border: 0; background: var(--gray-bg); color: var(--hs-muted); border-radius: 10px; padding: 0 12px; min-height: 34px; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 12.5px; }
.hs-q .flagbtn.on { background: var(--amber-bg); color: var(--amber); } .hs-q .flagbtn svg.i { width: 16px; height: 16px; }
.hs-q .qt { font-size: 17px; line-height: 1.7; margin-bottom: 16px; }
.hs-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.hs-opt { display: flex; align-items: center; gap: 12px; min-height: 58px; padding: 10px 14px; border: 2px solid var(--line2); border-radius: 14px; background: #fff; text-align: left; font-size: 16px; color: var(--ink); }
.hs-opt:hover { border-color: #b9c5fb; }
.hs-opt .l { width: 32px; height: 32px; border-radius: 50%; background: var(--gray-bg); display: grid; place-items: center; font-weight: 700; flex: none; font-size: 14px; }
.hs-opt.on { border-color: var(--brand); background: var(--blue-bg); } .hs-opt.on .l { background: var(--brand); color: #fff; }
.hs-tf { display: grid; gap: 10px; }
.hs-tf .r { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 2px solid var(--line); border-radius: 14px; background: #fff; }
.hs-tf .l, .hs-tfres .l { width: 28px; height: 28px; border-radius: 8px; background: var(--gray-bg); font-weight: 700; display: grid; place-items: center; flex: none; }
.hs-tf .s { flex: 1; line-height: 1.6; min-width: 0; }
.hs-tf .tog { display: flex; background: var(--gray-bg); border-radius: 12px; padding: 3px; flex: none; }
.hs-tf .tog button { border: 0; background: transparent; min-width: 64px; min-height: 44px; padding: 0 12px; border-radius: 9px; font-weight: 700; color: var(--hs-muted); }
.hs-tf .tog button.t.on { background: var(--green); color: #fff; } .hs-tf .tog button.f.on { background: var(--red); color: #fff; }
.hs-sa { display: grid; gap: 10px; }
.hs-sa math-field { min-height: 64px; font-size: 26px; border: 2px solid var(--line2); border-radius: 14px; background: #f9fafd; }
.hs-sa math-field:focus-within { border-color: var(--brand); background: #fff; box-shadow: 0 0 0 4px #e1e7fd; }
.hs-essay { width: 100%; min-height: 180px; font: inherit; font-size: 16px; border: 2px solid var(--line2); border-radius: 14px; padding: 12px 14px; resize: vertical; }
.hs-side { position: sticky; top: 80px; display: grid; gap: 14px; }
.hs-side h2 { margin: 0 0 14px; }
.hs-pal { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.hs-pal button { position: relative; aspect-ratio: 1; min-height: 52px; border: 2px solid var(--line2); background: #fff; border-radius: 12px; font-weight: 700; font-size: 16px; color: var(--ink); }
.hs-pal button.part { border-style: dashed; border-color: var(--brand); color: var(--brand); }
.hs-pal button.ans { background: var(--brand); border-color: var(--brand); color: #fff; }
.hs-pal button.cur { box-shadow: 0 0 0 3px #b9c5fb; }
.hs-pal button .fl { position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: var(--amber); color: #fff; display: none; place-items: center; border: 2px solid #fff; }
.hs-pal button.flag .fl { display: grid; } .hs-pal .fl svg.i { width: 11px; height: 11px; stroke-width: 2.6; }
.hs-legend { display: grid; gap: 6px; margin-top: 14px; color: var(--hs-muted); font-size: 12.5px; }
.hs-legend span { display: flex; align-items: center; gap: 8px; } .hs-legend i { width: 16px; height: 16px; border-radius: 5px; border: 2px solid var(--line2); display: inline-block; }
.hs-legend i.a { background: var(--brand); border-color: var(--brand); } .hs-legend i.f { background: var(--amber); border-color: var(--amber); } .hs-legend i.p { border: 2px dashed var(--brand); }
.hs-side .sumline { display: flex; justify-content: space-between; margin-bottom: 14px; font-weight: 600; }
.hs-bottombar, .hs .top-submit { display: none; }
.hs-modal { position: fixed; inset: 0; background: rgba(20, 24, 50, .5); display: flex; align-items: center; justify-content: center; z-index: 90; padding: 16px; }
.hs-dlg { background: #fff; border-radius: 20px; padding: 26px; width: 100%; max-width: 420px; box-shadow: var(--shadow-hi); text-align: center; }
.hs-dlg .ic { margin: 0 auto 14px; width: 56px; height: 56px; border-radius: 16px; }
.hs-dlg h3 { margin: 0 0 6px; font-size: 18px; }
.hs-dlg .row { display: flex; gap: 10px; margin-top: 20px; } .hs-dlg .row .hs-btn { flex: 1; }
.hs-nums { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
.hs-nums b { min-width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--gray-bg); font-weight: 700; } .hs-nums b.f { background: var(--amber-bg); color: var(--amber); }

/* 4. Kết quả */
.hs-res { display: flex; align-items: center; gap: 26px; flex-wrap: wrap; }
.hs-res .ring { position: relative; width: 150px; height: 150px; flex: none; }
.hs-res .ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.hs-res .ring .v { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; } .hs-res .ring .v b { font-size: 38px; line-height: 1; } .hs-res .ring .v small { color: var(--hs-muted); }
.hs-res .info { flex: 1; min-width: 240px; display: grid; gap: 10px; } .hs-res h1 { margin: 0; }
.hs-res .stats, .hs-res .chips { display: flex; gap: 10px; flex-wrap: wrap; }
.hs-res .stat { background: var(--bg); border-radius: 12px; padding: 8px 14px; } .hs-res .stat b { display: block; font-size: 18px; line-height: 1.3; } .hs-res .stat small { color: var(--hs-muted); }
.hs-rq { margin-top: 14px; }
.hs-rq .rh { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.hs-rq .rn { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--gray-bg); font-weight: 700; }
.hs-rq .rn.green { background: var(--green-bg); color: var(--green); } .hs-rq .rn.red { background: var(--red-bg); color: var(--red); } .hs-rq .rn.amber { background: var(--amber-bg); color: var(--amber); } .hs-rq .rn.violet { background: var(--violet-bg); color: var(--violet); }
.hs-rq .g { flex: 1; min-width: 0; display: flex; gap: 8px; align-items: center; } .hs-rq .pts { font-weight: 700; font-variant-numeric: tabular-nums; }
.hs-rq .chev { color: var(--hs-muted); transition: transform .2s; } .hs-rq.open .chev { transform: rotate(180deg); }
.hs-rq .rb { margin-top: 16px; border-top: 1px solid var(--line); padding-top: 16px; } .hs-rq .qt { line-height: 1.7; font-size: 15.5px; margin-bottom: 12px; }
.hs-ansrow { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.hs-ansrow .a { padding: 8px 12px; border-radius: 10px; background: var(--gray-bg); } .hs-ansrow .a small { display: block; color: var(--hs-muted); font-size: 11.5px; }
.hs-ansrow .a.ok { background: var(--green-bg); } .hs-ansrow .a.bad { background: var(--red-bg); }
.hs-tfres .r { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid var(--line); } .hs-tfres .r:first-child { border-top: 0; } .hs-tfres .s { flex: 1; line-height: 1.6; }
.hs-essayres { white-space: pre-wrap; background: var(--gray-bg); border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
.hs-sol { background: #f6f8ff; border: 1px solid #dfe5fd; border-radius: 14px; padding: 14px 16px; line-height: 1.9; }
.hs-sol .st { font-weight: 700; color: var(--brand-d); display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.hs-actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }

@media (max-width: 900px) { .hs-exbody { grid-template-columns: 1fr; } }
@media (max-width: 720px) {
  .hs-main { padding: 16px; } .hs-head .hs-in { padding: 10px 16px; } .hs-me div { display: none; }
  .hs-login { padding: 16px 12px; place-items: start center; } .hs-box { padding: 22px 18px; }
  .hs-bigin, .hs-pins input { height: 62px; } .hs-pins { gap: 6px; } .hs-lrow { grid-template-columns: 1fr 96px; }
  /* Phòng làm bài: mỗi màn một câu */
  .hs-extop .hs-in { padding: 8px 14px; gap: 8px; } .hs-extop .ttl small { display: none; } .hs-extop .ttl b { font-size: 14px; } .hs-extop .ic { display: none; }
  .hs-timer { font-size: 17px; padding: 6px 10px; } .hs-save .tx2 { display: none; } .hs-save { padding: 8px; }
  .hs .top-submit { display: inline-flex; min-height: 38px; padding: 0 14px; }
  .hs-exbody { padding: 12px 14px 110px; gap: 12px; display: flex; flex-direction: column-reverse; }
  .hs-side { position: static; width: 100%; } .hs-side .hs-card { padding: 12px; } .hs-side .sumline, .hs-side .hs-legend, .hs-side h2, .hs-side .hs-card + .hs-card { display: none; }
  .hs-pal { grid-template-columns: repeat(6, 1fr); gap: 6px; } .hs-pal button { min-height: 44px; border-radius: 10px; }
  .hs-q { display: none; } .hs-q.cur { display: block; box-shadow: var(--shadow); }
  .hs-opts { grid-template-columns: 1fr; } .hs-q .qt { font-size: 18px; }
  .hs-tf .r { flex-wrap: wrap; } .hs-tf .tog { width: 100%; } .hs-tf .tog button { flex: 1; min-height: 48px; }
  .hs-bottombar { display: flex; position: fixed; left: 0; right: 0; bottom: var(--kb-h, 0px); z-index: 40; background: #fff; box-shadow: 0 -4px 18px rgba(20,28,60,.1); padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); gap: 10px; }
  .hs-bottombar .hs-btn { flex: 1; min-height: 52px; } .hs-bottombar .hs-btn.sq { flex: none; width: 52px; padding: 0; }
  .hs-res { gap: 16px; } .hs-res .ring { width: 124px; height: 124px; } .hs-res .ring .v b { font-size: 32px; }
}
```

- [ ] **Step 4: Kiểm**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web typecheck` → không lỗi.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web test` → PASS.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web build` → build xong (cảnh báo kích thước chunk là bình thường).
Xem tay (nếu server + vite đang chạy): `/hs` trên khung 390 × 844 khớp mockup màn 1; sai PIN hiện lỗi chung; sau đăng nhập thấy "Bài của em".

- [ ] **Step 5: Commit**

```bash
git add web/src/student web/src/App.tsx web/src/auth.tsx web/src/pages/Login.tsx web/src/sprite.ts
git commit -m "feat(web): khu học sinh /hs — đăng nhập thẻ lớp/QR/Google, bài của em, phòng làm bài (tự lưu, mất mạng vẫn làm, đồng hồ máy chủ, bắt rời tab), kết quả + lời giải"
```

---

### Task 11: Web — trang lớp GV: Giao bài · Theo dõi · Kết quả & thống kê · Thẻ lớp

**Files:**
- Create: `web/src/pages/classroom/types.ts`, `web/src/pages/classroom/ClassroomTabs.tsx`, `web/src/pages/classroom/AssignTab.tsx`, `web/src/pages/classroom/MonitorTab.tsx`, `web/src/pages/classroom/ResultsTab.tsx`, `web/src/pages/classroom/BadgesTab.tsx`, `web/src/pages/classroom/lh.css`
- Modify: `web/src/pages/Classes.tsx` (chỉ `ClassDetailPage`)

**Interfaces:**
- Consumes: REST Task 5/6/8 (kiểu ở `classroom/types.ts` khớp `AssignmentSummary`, `AssignmentListItem`, `MonitorPayload`, `ResultsPayload`, `SubmissionDetail`, `CredentialStatus`, `BadgeCard`), `printBadges` + `seatLabel` (Task 9), `api`, `errText`, `vn`, `gradeLabel`, `ExamSummary`, `BankQuestion` (`api.ts`), `MathText`, `Icon`.
- Produces: tab theo `?tab=hoc-vien|giao-bai|theo-doi|ket-qua|the-lop` (+ `&bai=<assignmentId>`); "Học viên" là nội dung cũ của trang lớp, giữ nguyên.
- `data-testid` (smoke dùng): `lh-tab-<tab>`, `lh-new`, `lh-exams`, `lh-title`, `lh-due`, `lh-publish`, `lh-asg`, `lh-open-monitor`, `lh-pick`, `lh-monitor`, `lh-mrow`, `lh-count-<k>`, `lh-kpi-submit`, `lh-items`, `lh-results`, `lh-row`, `lh-score`, `lh-essay-<no>`, `lh-grade-save`, `lh-issue`, `lh-print`, `lh-class-code`, `lh-join-code`, `lh-join-toggle`, `lh-badges`, `lh-pin-<seat>`.
- Hành vi: "Giao bài" = danh sách bài (giao/đóng/theo dõi/kết quả) + form mockup màn 5 (đổi loại bài thì đặt lại số lượt + lời giải mặc định; giao xong chuyển sang Theo dõi). "Theo dõi" hỏi lại mỗi 5 giây, vòng đếm 5 giây, lọc theo ô đếm, tìm tên (mockup màn 6). "Kết quả & thống kê" = 4 KPI, biểu đồ phân bố SVG, chủ đề yếu, bảng từng câu (p, D theo dải màu, đáp án nhiễu), HS cần quan tâm, bảng điểm + hộp xem bài/chấm tự luận (mockup màn 7). "Thẻ lớp": Cấp mã (PIN chỉ hiện ngay sau khi cấp), In thẻ (cửa sổ in A4), Đổi mã (thu hồi, có xác nhận), mã lớp + mã tham gia + công tắc bật/tắt, danh sách chờ xác nhận (mockup màn 8).

- [ ] **Step 1: Thành phần**

```ts
// web/src/pages/classroom/types.ts
/** Kiểu API GV cho lớp học trực tuyến — khớp server/src/services/assignments.ts, credentials.ts, domain/analytics.ts. */
import type { ReviewItem } from "../../student/types";

export type AssignmentSummary = {
  id: string;
  classId: string;
  title: string;
  kind: "practice" | "test";
  subject: string;
  status: "draft" | "published" | "closed";
  source: "exam" | "bank";
  opensAt: string;
  dueAt: string;
  durationMinutes: number | null;
  attemptsAllowed: number;
  showSolution: "after_submit" | "after_due" | "never";
  shuffle: boolean;
  questionCount: number;
  variantCodes: string[];
  maxScore: number;
  createdAt: string;
};
export type AssignmentListItem = AssignmentSummary & { rosterSize: number; submitted: number; inProgress: number };
export type MonitorState = "chua_vao" | "dang_lam" | "da_nop" | "tu_nop";
export type MonitorRow = { studentId: string; seat: number | null; fullName: string; state: MonitorState; answered: number; total: number; leaveCount: number; score10: number | null; updatedAt: string | null; submissionId: string | null };
export type MonitorPayload = { assignment: AssignmentSummary; serverNow: string; counts: Record<MonitorState, number>; rows: MonitorRow[] };
export type ResultRow = { studentId: string; seat: number | null; fullName: string; submissionId: string | null; status: "in_progress" | "submitted" | "auto_submitted" | null; attempts: number; score: number | null; maxScore: number | null; score10: number | null; pending: number; leaveCount: number; submittedAt: string | null };
export type ItemStat = { questionId: string; label: number; stem: string; topic: string; level: string; type: string; n: number; p: number | null; d: number | null; flag: "Khó" | "Dễ" | "Xem lại" | null; choices: { choice: string; count: number; correct: boolean }[] };
export type AssignmentStats = {
  rosterSize: number;
  started: number;
  submitted: number;
  submitRate: number;
  mean: number | null;
  median: number | null;
  best: { studentId: string; fullName: string; score10: number } | null;
  worst: { studentId: string; fullName: string; score10: number } | null;
  distribution: number[];
  items: ItemStat[];
  topics: { topic: string; n: number; rate: number }[];
  atRisk: { studentId: string; fullName: string; seat: number | null; score10: number | null; reasons: string[] }[];
};
export type ResultsPayload = { assignment: AssignmentSummary; rows: ResultRow[]; stats: AssignmentStats };
export type SubmissionDetail = {
  student: { id: string; fullName: string; seat: number | null };
  submission: { id: string; attempt: number; status: string; variantCode: string; startedAt: string; submittedAt: string | null; score: number | null; maxScore: number | null; pending: number; leaveCount: number };
  items: (ReviewItem & { rubric?: string })[];
  events: { at: string; kind: string }[];
};
export type CredentialStatus = {
  classId: string;
  className: string;
  subject: string | null;
  classCode: string | null;
  joinCode: string | null;
  joinOpen: boolean;
  students: { id: string; seat: number | null; fullName: string; dob: string | null; hasPin: boolean; linked: boolean; linkPending: boolean }[];
};
export type BadgeCard = { studentId: string; seat: number; fullName: string; pin: string; qrToken: string };
export type IssueResult = { classCode: string; cards: BadgeCard[] };
```

```tsx
// web/src/pages/classroom/ClassroomTabs.tsx
import { useEffect, useState } from "react";
import { api, errText } from "../../api";
import { Icon } from "../../Icon";
import { fmtWhen } from "./AssignTab";
import { MonitorTab } from "./MonitorTab";
import { ResultsTab } from "./ResultsTab";
import type { AssignmentListItem } from "./types";
import "./lh.css";

export type ClassTab = "hoc-vien" | "giao-bai" | "theo-doi" | "ket-qua" | "the-lop";
const TABS: [ClassTab, string, string][] = [
  ["hoc-vien", "users", "Học viên"],
  ["giao-bai", "plus", "Giao bài"],
  ["theo-doi", "eye", "Theo dõi"],
  ["ket-qua", "chart", "Kết quả & thống kê"],
  ["the-lop", "qr", "Thẻ lớp"],
];

export function ClassTabs({ tab, onTab }: { tab: ClassTab; onTab: (t: ClassTab) => void }) {
  return (
    <div className="lh-tabs" role="tablist">
      {TABS.map(([k, ic, label]) => (
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => onTab(k)} data-testid={`lh-tab-${k}`}>
          <Icon name={ic} size={18} />{label}
        </button>
      ))}
    </div>
  );
}

/** Theo dõi / Kết quả: chọn bài giao (mặc định bài mới nhất đã giao), rồi hiện tab tương ứng. */
export function AssignmentScoped({ classId, tab, assignmentId, onPick }: { classId: string; tab: "theo-doi" | "ket-qua"; assignmentId: string | null; onPick: (id: string) => void }) {
  const [rows, setRows] = useState<AssignmentListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<AssignmentListItem[]>(`/api/classes/${classId}/assignments`).then(setRows).catch((e: unknown) => setErr(errText(e)));
  }, [classId]);
  if (err) return <div className="err">{err}</div>;
  if (!rows) return null;
  const given = rows.filter((a) => a.status !== "draft");
  const cur = given.find((a) => a.id === assignmentId) ?? given[0];
  if (!cur) return <div className="card"><div className="empty">Chưa giao bài nào — mở tab Giao bài</div></div>;
  return (
    <>
      <div className="bar">
        <label className="lbl">Bài giao
          <select className="inp" value={cur.id} onChange={(e) => onPick(e.target.value)} data-testid="lh-pick">
            {given.map((a) => <option key={a.id} value={a.id}>{a.title} · hạn {fmtWhen(a.dueAt)}</option>)}
          </select>
        </label>
      </div>
      {tab === "theo-doi" ? <MonitorTab key={cur.id} assignmentId={cur.id} /> : <ResultsTab key={cur.id} assignmentId={cur.id} />}
    </>
  );
}
```

```tsx
// web/src/pages/classroom/AssignTab.tsx
import { useEffect, useMemo, useState } from "react";
import { type BankQuestion, type ExamSummary, api, errText, gradeLabel } from "../../api";
import { Icon } from "../../Icon";
import { MathText } from "../../math/MathText";
import type { AssignmentListItem } from "./types";

const STATUS_VI = { draft: ["", "Nháp"], published: ["c-green", "Đang giao"], closed: ["", "Đã đóng"] } as const;
const SOL_VI = { after_submit: ["Sau khi nộp", "Em xem ngay khi nộp xong"], after_due: ["Sau hạn nộp", "Chờ cả lớp nộp xong"], never: ["Không hiện", "Chỉ hiện điểm"] } as const;
const LEVEL_VI = { NB: "Nhận biết", TH: "Thông hiểu", VD: "Vận dụng" } as const;
const pad = (n: number) => String(n).padStart(2, "0");
/** Date → giá trị cho <input type="datetime-local"> theo giờ máy. */
export const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Tab "Giao bài": danh sách bài đã giao + form giao bài mới (màn 5 của mockup). */
export function AssignTab({ classId, subject, className, rosterSize, onOpen }: { classId: string; subject: string | null; className: string; rosterSize: number; onOpen: (assignmentId: string, tab: "theo-doi" | "ket-qua") => void }) {
  const [rows, setRows] = useState<AssignmentListItem[] | null>(null);
  const [form, setForm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = () => {
    api<AssignmentListItem[]>(`/api/classes/${classId}/assignments`).then(setRows).catch((e: unknown) => setErr(errText(e)));
  };
  useEffect(load, [classId]);
  const patch = async (id: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/assignments/${id}`, { method: "PATCH", body });
      load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  if (form) return <AssignForm classId={classId} subject={subject} className={className} rosterSize={rosterSize} onDone={(id) => { setForm(false); load(); if (id) onOpen(id, "theo-doi"); }} />;
  return (
    <>
      <div className="bar">
        <span className="sp" />
        <button className="btn" onClick={() => setForm(true)} data-testid="lh-new"><Icon name="plus" size={18} />Giao bài mới</button>
      </div>
      {err && <div className="err">{err}</div>}
      {rows?.length === 0 && <div className="card"><div className="empty">Chưa giao bài nào</div></div>}
      <div className="lh-list">
        {rows?.map((a) => (
          <div key={a.id} className="card lh-arow" data-testid="lh-asg">
            <span className={`ic ${a.kind === "test" ? "blue" : "violet"}`}><Icon name={a.kind === "test" ? "exam" : "repeat"} /></span>
            <div className="g">
              <b>{a.title}</b>
              <small>{fmtWhen(a.opensAt)} → {fmtWhen(a.dueAt)} · {a.questionCount} câu · {a.durationMinutes ? `${a.durationMinutes} phút` : "không giới hạn giờ"} · {a.variantCodes.length} mã đề</small>
            </div>
            <span className={`lh-chip ${STATUS_VI[a.status][0]}`}>{STATUS_VI[a.status][1]}</span>
            <span className="lh-cnt" title="Đã nộp / sĩ số"><Icon name="check" size={16} />{a.submitted}/{a.rosterSize}</span>
            {a.status === "draft" && <button className="btn sm" onClick={() => void patch(a.id, { status: "published" })}><Icon name="send" size={16} />Giao</button>}
            {a.status === "published" && <button className="btn ghost sm" onClick={() => void patch(a.id, { status: "closed" })}>Đóng</button>}
            <button className="btn ghost sm" onClick={() => onOpen(a.id, "theo-doi")} data-testid="lh-open-monitor"><Icon name="eye" size={16} />Theo dõi</button>
            <button className="btn ghost sm" onClick={() => onOpen(a.id, "ket-qua")}><Icon name="chart" size={16} />Kết quả</button>
          </div>
        ))}
      </div>
    </>
  );
}

function AssignForm({ classId, subject, className, rosterSize, onDone }: { classId: string; subject: string | null; className: string; rosterSize: number; onDone: (id: string | null) => void }) {
  const now = new Date();
  const [title, setTitle] = useState("");
  const [src, setSrc] = useState<"exam" | "bank">("exam");
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [examId, setExamId] = useState("");
  const [grade, setGrade] = useState(() => Number.parseInt(className, 10) || 10);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>(["NB", "TH", "VD"]);
  const [picked, setPicked] = useState<string[]>([]);
  const [kind, setKind] = useState<"test" | "practice">("test");
  const [opensAt, setOpensAt] = useState(toLocalInput(now));
  const [dueAt, setDueAt] = useState(toLocalInput(new Date(now.getTime() + 24 * 3600_000)));
  const [dur, setDur] = useState(15);
  const [noLimit, setNoLimit] = useState(false);
  const [attempts, setAttempts] = useState(1);
  const [sol, setSol] = useState<"after_submit" | "after_due" | "never">("after_due");
  const [shuffle, setShuffle] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then((xs) => {
      setExams(xs);
      if (xs[0]) setExamId((id) => id || xs[0]!.id);
    }).catch((e: unknown) => setErr(errText(e)));
  }, []);
  useEffect(() => {
    if (src !== "bank" || !subject) return;
    api<BankQuestion[]>(`/api/questions?subject=${encodeURIComponent(subject)}&grade=${grade}&limit=500`).then(setBank).catch((e: unknown) => setErr(errText(e)));
  }, [src, subject, grade]);
  const allTopics = useMemo(() => [...new Set(bank.map((q) => q.topic))], [bank]);
  const shownBank = bank.filter((q) => (topics.length === 0 || topics.includes(q.topic)) && levels.includes(q.level));
  const exam = exams.find((e) => e.id === examId);
  const setKindDefaults = (k: "test" | "practice") => {
    setKind(k);
    setAttempts(k === "test" ? 1 : 3);
    setSol(k === "test" ? "after_due" : "after_submit");
  };
  const toggle = (xs: string[], x: string) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);

  const save = async (publish: boolean) => {
    setErr(null);
    setBusy(true);
    try {
      const body = {
        title: title || exam?.title || "Bài tập",
        kind,
        source: src === "exam" ? { examId } : { questionIds: picked },
        opensAt: new Date(opensAt).toISOString(),
        dueAt: new Date(dueAt).toISOString(),
        durationMinutes: noLimit ? null : dur,
        attemptsAllowed: attempts,
        showSolution: sol,
        shuffle,
        publish,
      };
      const r = await api<{ id: string }>(`/api/classes/${classId}/assignments`, { method: "POST", body });
      onDone(publish ? r.id : null);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lh-gb">
      <div className="card lh-form">
        {err && <div className="err">{err}</div>}
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic blue"><Icon name="exam" /></span>Nội dung</div>
          <label className="lh-field">Tên bài<input className="inp w-l" value={title} placeholder={exam?.title ?? "Kiểm tra 15 phút"} onChange={(e) => setTitle(e.target.value)} data-testid="lh-title" /></label>
          <div className="lh-seg">
            <button className={src === "exam" ? "on" : ""} onClick={() => setSrc("exam")}>Từ đề đã tạo</button>
            <button className={src === "bank" ? "on" : ""} onClick={() => setSrc("bank")}>Nhóm câu từ ngân hàng</button>
          </div>
          {src === "exam" ? (
            <div className="lh-pick" data-testid="lh-exams">
              {exams.length === 0 && <div className="empty">Chưa có đề — tạo đề ở mục Đề thi</div>}
              {exams.map((e) => (
                <label key={e.id} className="p">
                  <input type="radio" name="lh-exam" checked={examId === e.id} onChange={() => setExamId(e.id)} />
                  <span className="g"><b>{e.title}</b><small>{e.subject} · {gradeLabel(e.grade)} · {e.codes.length} mã đề</small></span>
                </label>
              ))}
            </div>
          ) : (
            <div className="lh-sec">
              {!subject && <div className="warn">Lớp chưa có môn — đặt môn cho lớp để lọc ngân hàng câu hỏi.</div>}
              <label className="lh-field">Khối<input className="inp w-s" type="number" min={1} max={16} value={grade} onChange={(e) => setGrade(Number(e.target.value) || 10)} /></label>
              <div className="lh-chips">{allTopics.map((t) => <button key={t} className={topics.includes(t) ? "on" : ""} onClick={() => setTopics(toggle(topics, t))}>{t}</button>)}</div>
              <div className="lh-chips">{(["NB", "TH", "VD"] as const).map((l) => <button key={l} className={levels.includes(l) ? "on" : ""} onClick={() => setLevels(toggle(levels, l))}>{LEVEL_VI[l]}</button>)}</div>
              <div className="lh-bq-list">
                {shownBank.map((q) => (
                  <label key={q.id} className="lh-bq">
                    <input type="checkbox" checked={picked.includes(q.id)} onChange={() => setPicked(toggle(picked, q.id))} />
                    <span className="t"><MathText value={q.stem} /></span>
                    <span className="lh-chip">{LEVEL_VI[q.level]}</span>
                  </label>
                ))}
              </div>
              <div className="hint" style={{ textAlign: "left" }}>Đã chọn {picked.length} câu</div>
            </div>
          )}
        </div>
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic violet"><Icon name="shield" /></span>Loại bài</div>
          <div className="lh-seg">
            <button className={kind === "practice" ? "on" : ""} onClick={() => setKindDefaults("practice")}>Luyện tập</button>
            <button className={kind === "test" ? "on" : ""} onClick={() => setKindDefaults("test")}>Kiểm tra</button>
          </div>
        </div>
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic amber"><Icon name="cal" /></span>Thời gian</div>
          <div className="lh-g2">
            <label className="lh-field">Mở lúc<input className="inp" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} /></label>
            <label className="lh-field">Hạn nộp<input className="inp" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} data-testid="lh-due" /></label>
          </div>
          <div className="lh-g2">
            <div className="lh-field">Thời gian làm (phút)
              <Stepper value={dur} min={1} max={300} step={5} onChange={setDur} disabled={noLimit} />
              <label className="lh-tgl"><input type="checkbox" checked={noLimit} onChange={(e) => setNoLimit(e.target.checked)} />Không giới hạn trong cửa sổ mở</label>
            </div>
            <div className="lh-field">Số lượt làm
              <Stepper value={attempts} min={1} max={10} step={1} onChange={setAttempts} />
              <small className="hint" style={{ textAlign: "left" }}>Mặc định {kind === "test" ? "1 lượt cho kiểm tra" : "3 lượt cho luyện tập"}</small>
            </div>
          </div>
        </div>
        <div className="lh-sec">
          <div className="lh-sh"><span className="ic green"><Icon name="eye" /></span>Hiện lời giải</div>
          <div className="lh-pick">
            {(Object.keys(SOL_VI) as (keyof typeof SOL_VI)[]).map((k) => (
              <label key={k} className="p"><input type="radio" name="lh-sol" checked={sol === k} onChange={() => setSol(k)} /><span className="g"><b>{SOL_VI[k][0]}</b><small>{SOL_VI[k][1]}</small></span></label>
            ))}
          </div>
          <label className="lh-tgl"><input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /><span><b>Đảo thứ tự câu</b><small>Giữ nguyên thứ tự các phần theo CV 7991</small></span><Icon name="shuffle" /></label>
        </div>
        <div className="lh-actions">
          <button className="btn ghost" onClick={() => onDone(null)}>Huỷ</button>
          <button className="btn ghost" disabled={busy} onClick={() => void save(false)}>Lưu nháp</button>
          <button className="btn" disabled={busy || (src === "exam" ? !examId : picked.length === 0)} onClick={() => void save(true)} data-testid="lh-publish"><Icon name="send" size={18} />Giao bài</button>
        </div>
      </div>
      <div className="card lh-sum">
        <h2>Tóm tắt</h2>
        <div className="li"><span className="ic blue"><Icon name="users" /></span><div><b>Lớp {className}</b><small>{rosterSize} học sinh · {src === "exam" ? `${exam?.codes.length ?? 0} mã đề` : "1 mã đề"}</small></div></div>
        <div className="li"><span className="ic amber"><Icon name="cal" /></span><div><b>{fmtWhen(new Date(opensAt).toISOString())} → {fmtWhen(new Date(dueAt).toISOString())}</b><small>Mở lúc → hạn nộp</small></div></div>
        <div className="li"><span className="ic violet"><Icon name="timer" /></span><div><b>{noLimit ? "Không giới hạn giờ" : `${dur} phút`} · {attempts} lượt</b><small>{kind === "test" ? "Kiểm tra" : "Luyện tập"}</small></div></div>
        <div className="li"><span className="ic green"><Icon name="eye" /></span><div><b>{sol === "never" ? "Không hiện lời giải" : `Lời giải ${SOL_VI[sol][0].toLowerCase()}`}</b><small>{shuffle ? "Đảo thứ tự câu" : "Giữ thứ tự câu"}</small></div></div>
      </div>
    </div>
  );
}

function Stepper({ value, min, max, step, onChange, disabled }: { value: number; min: number; max: number; step: number; onChange: (n: number) => void; disabled?: boolean }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className={`lh-step${disabled ? " off" : ""}`}>
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value - step))} aria-label="Giảm">−</button>
      <input inputMode="numeric" disabled={disabled} value={value} onChange={(e) => onChange(clamp(Number(e.target.value) || min))} />
      <button type="button" disabled={disabled} onClick={() => onChange(clamp(value + step))} aria-label="Tăng">+</button>
    </div>
  );
}
```

```tsx
// web/src/pages/classroom/MonitorTab.tsx
import { useEffect, useState } from "react";
import { api, errText, vn } from "../../api";
import { Icon } from "../../Icon";
import { fmtWhen } from "./AssignTab";
import type { MonitorPayload, MonitorState } from "./types";

const POLL_MS = 5000;
const STATE_VI: Record<MonitorState, [string, string]> = { chua_vao: ["", "Chưa vào"], dang_lam: ["c-blue", "Đang làm"], da_nop: ["c-green", "Đã nộp"], tu_nop: ["c-amber", "Tự nộp hết giờ"] };
type Filter = "all" | "chua_vao" | "dang_lam" | "done";

/** Tab "Theo dõi": hỏi lại mỗi 5 giây (máy chủ cache 2 giây) — ai đang làm, đã nộp, rời tab mấy lần. */
export function MonitorTab({ assignmentId }: { assignmentId: string }) {
  const [m, setM] = useState<MonitorPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [since, setSince] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [round, setRound] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api<MonitorPayload>(`/api/assignments/${assignmentId}/monitor`)
        .then((x) => {
          if (!alive) return;
          setM(x);
          setErr(null);
          setSince(0);
          setRound((r) => r + 1);
        })
        .catch((e: unknown) => alive && setErr(errText(e)));
    void load();
    const poll = window.setInterval(() => void load(), POLL_MS);
    const sec = window.setInterval(() => setSince((s) => s + 1), 1000);
    return () => {
      alive = false;
      window.clearInterval(poll);
      window.clearInterval(sec);
    };
  }, [assignmentId]);
  if (!m) return err ? <div className="err">{err}</div> : null;
  const done = m.counts.da_nop + m.counts.tu_nop;
  const cards: [Filter, string, string, string, number][] = [
    ["all", "users", "violet", "Cả lớp", m.rows.length],
    ["chua_vao", "ban", "amber", "Chưa vào", m.counts.chua_vao],
    ["dang_lam", "loader", "blue", "Đang làm", m.counts.dang_lam],
    ["done", "check", "green", "Đã nộp", done],
  ];
  const rows = m.rows.filter((r) => (filter === "all" || (filter === "done" ? r.state === "da_nop" || r.state === "tu_nop" : r.state === filter)) && r.fullName.toLowerCase().includes(q.trim().toLowerCase()));
  const ago = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.parse(m.serverNow) - Date.parse(iso)) / 1000)) + since : null);
  return (
    <>
      <div className="lh-mhead">
        <div className="g"><h2>{m.assignment.title}</h2><span className="hint">Mở {fmtWhen(m.assignment.opensAt)} · hạn {fmtWhen(m.assignment.dueAt)} · {m.assignment.questionCount} câu</span></div>
        <div className="lh-live"><span className="dotl" />Trực tiếp<svg className="lh-ring" viewBox="0 0 26 26"><circle className="bg" cx="13" cy="13" r="11" /><circle key={round} className="fg run" cx="13" cy="13" r="11" /></svg><span className="hint">{since ? `cập nhật ${since} giây trước` : "vừa cập nhật"}</span></div>
      </div>
      {err && <div className="err">{err}</div>}
      <div className="lh-counters">
        {cards.map(([k, ic, color, label, n]) => (
          <button key={k} className={`card lh-cntc${filter === k ? " on" : ""}`} onClick={() => setFilter(k)} data-testid={`lh-count-${k}`}>
            <span className={`ic ${color}`}><Icon name={ic} /></span><div><b>{n}</b><small>{label}</small></div>
          </button>
        ))}
      </div>
      <div className="card lh-tablecard">
        <div className="lh-tools"><input className="inp" placeholder="Tìm học sinh…" value={q} onChange={(e) => setQ(e.target.value)} /><span className="lh-chip c-amber"><Icon name="eyeoff" size={14} />Rời tab: số lần HS thoát khỏi trang</span></div>
        <div className="lh-scroll">
          <table className="lh-tbl" data-testid="lh-monitor">
            <thead><tr><th>TT</th><th>Họ tên</th><th>Trạng thái</th><th className="lh-hide-sm">Tiến độ</th><th>Rời tab</th><th className="lh-hide-sm num">Cập nhật</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const label = r.state === "dang_lam" ? `Đang làm – ${r.answered}/${r.total} câu` : r.state === "chua_vao" ? "Chưa vào" : `${STATE_VI[r.state][1]} – ${vn(r.score10)}`;
                const pg = r.state === "chua_vao" ? 0 : r.state === "dang_lam" ? r.answered : r.total;
                const a = ago(r.updatedAt);
                return (
                  <tr key={r.studentId} data-testid="lh-mrow">
                    <td className="hint">{r.seat ?? "—"}</td>
                    <td><div className="lh-nm"><span className="avatar">{(r.fullName.trim().split(/\s+/).pop() ?? "").charAt(0)}</span>{r.fullName}</div></td>
                    <td><span className={`lh-chip ${STATE_VI[r.state][0]}`}>{label}</span></td>
                    <td className="lh-hide-sm"><div className="lh-pg"><div className="lh-bar"><i style={{ width: `${(pg / Math.max(1, r.total)) * 100}%`, background: r.state === "dang_lam" ? undefined : "var(--green)" }} /></div><small>{pg}/{r.total}</small></div></td>
                    <td><span className={`lh-leave ${r.leaveCount >= 5 ? "h" : r.leaveCount >= 2 ? "m" : ""}`}><Icon name="eyeoff" size={13} />{r.leaveCount}</span></td>
                    <td className="lh-hide-sm num hint">{r.state === "chua_vao" ? "—" : r.state === "dang_lam" ? `${a} giây trước` : "đã nộp"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
```

```tsx
// web/src/pages/classroom/ResultsTab.tsx
import { useEffect, useState } from "react";
import { api, errText, vn } from "../../api";
import { Icon } from "../../Icon";
import { MathText } from "../../math/MathText";
import type { ResultsPayload, SubmissionDetail } from "./types";

const band = (d: number): [string, string] => (d >= 0.4 ? ["g", "Tốt"] : d >= 0.3 ? ["b", "Khá"] : d >= 0.2 ? ["a", "Xem lại"] : ["r", "Kém"]);
const ease = (p: number): [string, string] => (p >= 0.8 ? ["Dễ", "var(--green)"] : p >= 0.4 ? ["Vừa", "var(--brand)"] : ["Khó", "#d63a3a"]);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const LETTERS = "ABCD";

/** Tab "Kết quả & thống kê": số liệu (màn 7 của mockup) + bảng điểm + xem/chấm từng bài. */
export function ResultsTab({ assignmentId }: { assignmentId: string }) {
  const [r, setR] = useState<ResultsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const load = () => {
    api<ResultsPayload>(`/api/assignments/${assignmentId}/results`).then(setR).catch((e: unknown) => setErr(errText(e)));
  };
  useEffect(load, [assignmentId]);
  if (!r) return err ? <div className="err">{err}</div> : null;
  const s = r.stats;
  return (
    <>
      {err && <div className="err">{err}</div>}
      <div className="lh-kpis">
        <div className="card lh-kpi"><small>Tỉ lệ nộp</small><b data-testid="lh-kpi-submit">{s.submitted} / {s.rosterSize}</b><span>{pct(s.submitRate)}</span></div>
        <div className="card lh-kpi"><small>Điểm trung bình</small><b>{s.mean === null ? "—" : vn(s.mean)}</b><span>Trung vị {s.median === null ? "—" : vn(s.median)}</span></div>
        <div className="card lh-kpi"><small>Cao nhất</small><b>{s.best ? vn(s.best.score10) : "—"}</b><span>{s.best?.fullName ?? ""}</span></div>
        <div className="card lh-kpi"><small>Thấp nhất</small><b>{s.worst ? vn(s.worst.score10) : "—"}</b><span>{s.worst?.fullName ?? ""}</span></div>
      </div>
      <div className="lh-grid2">
        <div className="card"><h2>Phân bố điểm</h2><Histogram counts={s.distribution} mean={s.mean} /></div>
        <div className="card">
          <h2>Chủ đề yếu <small className="hint">· tỉ lệ đúng</small></h2>
          <div className="lh-wk">
            {s.topics.map((t) => (
              <div key={t.topic} className="w"><span>{t.topic}</span><div className="lh-bar"><i style={{ width: pct(t.rate), background: t.rate < 0.5 ? "#d63a3a" : t.rate < 0.65 ? "#e08a00" : "var(--brand)" }} /></div><b>{pct(t.rate)}</b></div>
            ))}
          </div>
        </div>
      </div>
      <div className="card lh-block">
        <h2>Từng câu hỏi</h2>
        <div className="lh-scroll">
          <table className="lh-tbl" data-testid="lh-items">
            <thead><tr><th>Câu</th><th>Chủ đề</th><th>Độ khó p</th><th>Độ phân biệt D</th><th>Đáp án nhiễu hay chọn</th></tr></thead>
            <tbody>
              {s.items.map((i) => {
                const wrong = i.choices.find((c) => !c.correct);
                return (
                  <tr key={i.questionId}>
                    <td><b>Câu {i.label}</b>{i.flag && <span className="lh-chip c-amber">{i.flag}</span>}</td>
                    <td>{i.topic}</td>
                    <td>{i.p === null ? "—" : <div className="lh-pbar"><div className="lh-bar"><i style={{ width: pct(i.p), background: ease(i.p)[1] }} /></div><b>{vn(i.p)}</b><span className="lh-chip">{ease(i.p)[0]}</span></div>}</td>
                    <td>{i.d === null ? <span className="hint">cần ≥ 10 bài</span> : <span className={`lh-bd ${band(i.d)[0]}`}>{vn(i.d)} <small>{band(i.d)[1]}</small></span>}</td>
                    <td>{wrong ? <><MathText value={wrong.choice} /> · {pct(wrong.count / Math.max(1, i.n))}</> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="lh-legd"><b>Độ phân biệt D:</b><span className="lh-bd g">≥ 0,40 <small>Tốt</small></span><span className="lh-bd b">0,30–0,39 <small>Khá</small></span><span className="lh-bd a">0,20–0,29 <small>Xem lại</small></span><span className="lh-bd r">&lt; 0,20 <small>Kém</small></span></div>
      </div>
      <div className="card lh-block">
        <h2>Học sinh cần quan tâm</h2>
        {s.atRisk.length === 0 && <div className="empty">Không có</div>}
        <div className="lh-att">
          {s.atRisk.map((a) => (
            <div key={a.studentId} className="a"><span className="avatar">{(a.fullName.trim().split(/\s+/).pop() ?? "").charAt(0)}</span><div className="g"><b>{a.fullName}</b><div className="why">{a.reasons.map((x) => <span key={x} className={`lh-chip ${x.startsWith("Rời") ? "c-amber" : "c-red"}`}>{x}</span>)}</div></div><span className="sc">{a.score10 === null ? "—" : vn(a.score10)}</span></div>
          ))}
        </div>
      </div>
      <div className="card lh-block">
        <h2>Bảng điểm</h2>
        <table className="lh-tbl" data-testid="lh-results">
          <thead><tr><th>TT</th><th>Họ tên</th><th>Trạng thái</th><th className="num">Điểm (thang 10)</th><th className="num">Lượt</th><th /></tr></thead>
          <tbody>
            {r.rows.map((x) => (
              <tr key={x.studentId} data-testid="lh-row">
                <td className="hint">{x.seat ?? "—"}</td>
                <td>{x.fullName}</td>
                <td>{x.status === null ? "Chưa vào" : x.status === "in_progress" ? "Đang làm" : x.status === "auto_submitted" ? "Tự nộp hết giờ" : "Đã nộp"}{x.pending > 0 && <span className="lh-chip c-violet">{x.pending} câu chờ chấm</span>}</td>
                <td className="num" data-testid="lh-score">{x.score10 === null ? "—" : vn(x.score10)}</td>
                <td className="num">{x.attempts}</td>
                <td>{x.submissionId && x.status !== "in_progress" && <button className="btn ghost sm" onClick={() => setOpen(x.submissionId)}>Xem bài</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <SubmissionView assignmentId={assignmentId} submissionId={open} onClose={(changed) => { setOpen(null); if (changed) load(); }} />}
    </>
  );
}

function Histogram({ counts, mean }: { counts: number[]; mean: number | null }) {
  const W = 580, H = 250, L = 34, B = 34, T = 22, bw = 46, gap = 8.4;
  const top = Math.max(2, ...counts);
  const sc = (H - B - T) / top;
  const ticks = Array.from({ length: 5 }, (_, i) => Math.round((top / 4) * i));
  return (
    <svg className="lh-hist" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Biểu đồ phân bố điểm">
      {ticks.map((g) => <g key={g}><line x1={L} x2={W - 6} y1={H - B - g * sc} y2={H - B - g * sc} stroke="#eceef4" /><text x={L - 8} y={H - B - g * sc + 4} textAnchor="end">{g}</text></g>)}
      {counts.map((n, i) => {
        const x = L + 8 + i * (bw + gap), h = n * sc, y = H - B - h;
        return (
          <g key={i}>
            {n > 0 && <rect x={x} y={y} width={bw} height={h} rx={7} fill={i < 5 ? "#ef6a6a" : i < 7 ? "#6c83ee" : "#4f6bed"}><title>{`${i}–${i + 1} điểm: ${n} HS`}</title></rect>}
            {n > 0 && <text className="cnt-t" x={x + bw / 2} y={y - 6} textAnchor="middle">{n}</text>}
            <text x={x + bw / 2} y={H - 14} textAnchor="middle">{i}–{i + 1}</text>
          </g>
        );
      })}
      {mean !== null && (() => {
        const mx = L + 8 + mean * (bw + gap) - gap / 2;
        return <g><line x1={mx} x2={mx} y1={T - 6} y2={H - B} stroke="#1b2033" strokeDasharray="4 4" /><rect x={mx - 38} y={T - 22} width={76} height={20} rx={10} fill="#1b2033" /><text x={mx} y={T - 8} textAnchor="middle" style={{ fill: "#fff" }}>TB {vn(mean)}</text></g>;
      })()}
    </svg>
  );
}

function SubmissionView({ assignmentId, submissionId, onClose }: { assignmentId: string; submissionId: string; onClose: (changed: boolean) => void }) {
  const [d, setD] = useState<SubmissionDetail | null>(null);
  const [pts, setPts] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<SubmissionDetail>(`/api/assignments/${assignmentId}/submissions/${submissionId}`).then(setD).catch((e: unknown) => setErr(errText(e)));
  }, [assignmentId, submissionId]);
  const save = async () => {
    const points = Object.fromEntries(Object.entries(pts).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v.replace(",", "."))]));
    try {
      await api(`/api/assignments/${assignmentId}/submissions/${submissionId}/grades`, { method: "PUT", body: { points } });
      onClose(true);
    } catch (e) {
      setErr(errText(e));
    }
  };
  return (
    <div className="lh-modal" role="dialog">
      <div className="lh-dlg">
        <div className="lh-dhead"><b>{d ? `${d.student.fullName} · mã đề ${d.submission.variantCode}` : "…"}</b><button className="xbtn" onClick={() => onClose(false)} aria-label="Đóng"><Icon name="x" /></button></div>
        {err && <div className="err">{err}</div>}
        {d && (
          <>
            <div className="hint" style={{ textAlign: "left" }}>Điểm {vn(d.submission.score)} / {vn(d.submission.maxScore)} · rời tab {d.submission.leaveCount} lần{d.events.length ? ` (${d.events.filter((e) => e.kind === "leave").map((e) => new Date(e.at).toLocaleTimeString("vi-VN")).join(", ")})` : ""}</div>
            {d.items.map((it, i) => (
              <div key={it.no} className="lh-ditem">
                <div><b>Câu {i + 1}</b> <span className="hint">{vn(it.points)} / {vn(it.maxPoints)}</span></div>
                <MathText value={it.stem} />
                <div className="hint" style={{ textAlign: "left" }}>
                  Trả lời: {it.response === null ? "—" : it.type === "mcq" && typeof it.response === "number" ? LETTERS[it.response] : it.type === "true_false" && Array.isArray(it.response) ? it.response.map((b) => (b === null ? "_" : b ? "Đ" : "S")).join("") : it.type === "short_answer" ? <MathText value={`$${String(it.response)}$`} /> : String(it.response)}
                  {it.key && <> · Đáp án: <MathText value={it.key} /></>}
                </div>
                {it.type === "essay" && (
                  <div className="lh-essay">
                    {it.rubric && <div className="warn"><MathText value={it.rubric} /></div>}
                    <label className="lh-field">Điểm (tối đa {vn(it.maxPoints)})<input className="inp w-s" inputMode="decimal" defaultValue={it.points === null ? "" : vn(it.points)} onChange={(e) => setPts({ ...pts, [String(it.no)]: e.target.value })} data-testid={`lh-essay-${it.no}`} /></label>
                  </div>
                )}
              </div>
            ))}
            {d.items.some((x) => x.type === "essay") && <button className="btn" onClick={() => void save()} data-testid="lh-grade-save"><Icon name="check" size={18} />Lưu điểm tự luận</button>}
          </>
        )}
      </div>
    </div>
  );
}
```

```tsx
// web/src/pages/classroom/BadgesTab.tsx
import { useEffect, useState } from "react";
import { api, errText } from "../../api";
import { Icon } from "../../Icon";
import { printBadges, seatLabel } from "./badgeSheet";
import type { CredentialStatus, IssueResult } from "./types";

/** Tab "Thẻ lớp": cấp mã (PIN chỉ hiện một lần) → in thẻ QR; đổi mã (thu hồi); mã tham gia bật/tắt; duyệt HS tự vào lớp. */
export function BadgesTab({ classId }: { classId: string }) {
  const [st, setSt] = useState<CredentialStatus | null>(null);
  const [issued, setIssued] = useState<IssueResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const load = () => {
    api<CredentialStatus>(`/api/classes/${classId}/credentials`).then(setSt).catch((e: unknown) => setErr(errText(e)));
  };
  useEffect(load, [classId]);
  const issue = async (all: boolean) => {
    setErr(null);
    setConfirm(false);
    try {
      const body = all && st ? { studentIds: st.students.map((s) => s.id) } : {};
      const r = await api<IssueResult>(`/api/classes/${classId}/credentials`, { method: "POST", body });
      setIssued(r);
      setNote(r.cards.length ? `Đã cấp mã cho ${r.cards.length} học sinh — in thẻ ngay, PIN chỉ hiện một lần.` : "Học sinh nào cũng đã có mã. Bấm “Đổi mã” để cấp lại cả lớp.");
      load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  const join = async (open: boolean) => {
    try {
      await api(`/api/classes/${classId}/join`, { method: "PUT", body: { open } });
      load();
    } catch (e) {
      setErr(errText(e));
    }
  };
  const link = async (sid: string, approve: boolean) => {
    await api(`/api/classes/${classId}/students/${sid}/link`, { method: "POST", body: { approve } }).catch((e: unknown) => setErr(errText(e)));
    load();
  };
  if (!st) return err ? <div className="err">{err}</div> : null;
  const pending = st.students.filter((s) => s.linkPending);
  const cards = issued?.cards ?? [];
  return (
    <>
      <div className="lh-tools">
        <button className="btn" onClick={() => void issue(false)} data-testid="lh-issue"><Icon name="key" size={18} />Cấp mã</button>
        <button className="btn ghost" disabled={!cards.length} onClick={() => issued && void printBadges({ className: st.className, subject: st.subject, classCode: issued.classCode, cards }).catch((e: unknown) => setErr(errText(e)))} data-testid="lh-print"><Icon name="printer" size={18} />In thẻ</button>
        <button className="btn ghost lh-danger" onClick={() => setConfirm(true)}><Icon name="ban" size={18} />Đổi mã (thu hồi)</button>
      </div>
      {err && <div className="err">{err}</div>}
      {note && <div className="ok-box">{note}</div>}
      <div className="card lh-jcard">
        <span className="ic violet"><Icon name="users" /></span>
        <div className="g"><small>Mã lớp (in trên thẻ)</small><span className="code" data-testid="lh-class-code">{st.classCode ?? "—"}</span></div>
        <div className="g"><small>Mã tham gia lớp (cho sinh viên / HS dùng Google)</small><span className={`code${st.joinOpen ? "" : " off"}`} data-testid="lh-join-code">{st.joinCode ?? "—"}</span></div>
        {st.joinCode && <button className="btn ghost" onClick={() => void navigator.clipboard?.writeText(st.joinCode ?? "")}><Icon name="copy" size={18} />Sao chép</button>}
        <label className="lh-tgl"><input type="checkbox" checked={st.joinOpen} onChange={(e) => void join(e.target.checked)} data-testid="lh-join-toggle" />{st.joinOpen ? "Đang bật" : "Đang tắt"}</label>
      </div>
      {pending.length > 0 && (
        <div className="card lh-block">
          <h2>Chờ xác nhận vào lớp</h2>
          {pending.map((s) => (
            <div key={s.id} className="lh-arow"><div className="g"><b>{s.fullName}</b><small>Tài khoản tự tham gia, trùng họ tên + ngày sinh</small></div><button className="btn sm" onClick={() => void link(s.id, true)}>Đúng em này</button><button className="btn ghost sm" onClick={() => void link(s.id, false)}>Không phải</button></div>
          ))}
        </div>
      )}
      <div className="card lh-block">
        <table className="lh-tbl" data-testid="lh-badges">
          <thead><tr><th>STT</th><th>Họ tên</th><th>PIN</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {st.students.map((s) => {
              const c = cards.find((x) => x.studentId === s.id);
              return (
                <tr key={s.id}>
                  <td>{s.seat ? seatLabel(s.seat) : "—"}</td>
                  <td>{s.fullName}</td>
                  <td className="lh-pin" data-testid={s.seat ? `lh-pin-${s.seat}` : undefined}>{c ? c.pin : s.hasPin ? "••••••" : "—"}</td>
                  <td>{s.linked ? <span className="lh-chip c-blue">Tài khoản</span> : s.hasPin ? <span className="lh-chip c-green">Đã cấp</span> : <span className="lh-chip">Chưa cấp</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="hint">PIN chỉ hiện ngay sau khi cấp. Quên PIN thì cấp lại cho em đó (thẻ cũ hết dùng).</div>
      </div>
      {confirm && (
        <div className="lh-modal" role="dialog">
          <div className="lh-dlg lh-center">
            <div className="ic red"><Icon name="ban" /></div>
            <h3>Đổi mã cả lớp?</h3>
            <div className="hint">Thẻ đã in sẽ không dùng được nữa. Học sinh đăng nhập lại bằng thẻ mới; bài đang làm dở vẫn được lưu.</div>
            <div className="lh-actions"><button className="btn ghost" onClick={() => setConfirm(false)}>Huỷ</button><button className="btn lh-danger-fill" onClick={() => void issue(true)}>Thu hồi &amp; đổi mã</button></div>
          </div>
        </div>
      )}
    </>
  );
}
```

```css
/* web/src/pages/classroom/lh.css */
/* Trang lớp — 4 tab lớp học trực tuyến; chép từ web/mockup/lop-hoc.html (màn 5–8), tiền tố lh- */
.lh-tabs { display: flex; gap: 4px; margin: 4px 0 22px; border-bottom: 1px solid #dde1ec; overflow-x: auto; scrollbar-width: none; }
.lh-tabs button { border: 0; background: transparent; padding: 0 16px; min-height: 44px; font-weight: 600; color: var(--muted); border-bottom: 3px solid transparent; margin-bottom: -1px; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
.lh-tabs button.on { color: #3e57d1; border-bottom-color: var(--brand); }
.lh-chip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; white-space: nowrap; background: #f0f2f7; color: var(--muted); margin-left: 6px; }
.lh-chip.c-blue { background: var(--blue-bg); color: #3e57d1; } .lh-chip.c-green { background: var(--green-bg); color: var(--green); }
.lh-chip.c-amber { background: var(--amber-bg); color: var(--amber); } .lh-chip.c-red { background: #fdeaea; color: #d63a3a; } .lh-chip.c-violet { background: var(--violet-bg); color: #6d3fd1; }
.lh-list { display: grid; gap: 12px; }
.lh-arow { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.lh-arow .ic { margin: 0; width: 40px; height: 40px; }
.lh-arow .g { flex: 1; min-width: 220px; } .lh-arow small { display: block; color: var(--muted); }
.lh-cnt { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); font-variant-numeric: tabular-nums; }
.lh-block { margin-bottom: 16px; }
.lh-center { text-align: center; }
.lh-danger { color: #d63a3a; }
.lh-danger-fill { background: #d63a3a; }
.lh-modal { position: fixed; inset: 0; background: rgba(20, 24, 50, .5); display: flex; align-items: center; justify-content: center; z-index: 90; padding: 16px; }
.lh-dlg { background: #fff; border-radius: 20px; padding: 24px; width: 100%; max-width: 720px; max-height: 90vh; overflow: auto; box-shadow: var(--shadow-hi); display: grid; gap: 12px; }
.lh-dlg .ic { margin: 0 auto; } .lh-dlg h3 { margin: 0; }
.lh-dhead { display: flex; align-items: center; justify-content: space-between; }
.lh-ditem { border-top: 1px solid var(--line); padding-top: 10px; display: grid; gap: 6px; }
.lh-essay { display: grid; gap: 8px; }

/* 5. Giao bài */
.lh-gb { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
.lh-form { display: grid; gap: 18px; }
.lh-sec { display: grid; gap: 14px; } .lh-sec + .lh-sec { border-top: 1px solid var(--line); padding-top: 18px; }
.lh-form > .lh-sec + .lh-sec { border-top: 1px solid var(--line); }
.lh-sh { display: flex; align-items: center; gap: 10px; font-weight: 700; } .lh-sh .ic { margin: 0; width: 32px; height: 32px; border-radius: 10px; } .lh-sh .ic svg.i { width: 17px; height: 17px; }
.lh-field { display: grid; gap: 6px; font-weight: 600; font-size: 13px; }
.lh-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.lh-seg { display: inline-flex; justify-self: start; background: #f0f2f7; border-radius: 12px; padding: 4px; gap: 2px; }
.lh-seg button { border: 0; background: transparent; padding: 0 16px; min-height: 38px; border-radius: 9px; font-weight: 600; color: var(--muted); }
.lh-seg button.on { background: #fff; color: var(--ink); box-shadow: var(--shadow); }
.lh-pick { display: grid; gap: 8px; }
.lh-pick label.p { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 2px solid #dde1ec; border-radius: 14px; cursor: pointer; }
.lh-pick label.p:has(input:checked) { border-color: var(--brand); background: var(--blue-bg); }
.lh-pick label.p input { accent-color: var(--brand); width: 18px; height: 18px; flex: none; }
.lh-pick label.p .g { flex: 1; min-width: 0; } .lh-pick label.p small { color: var(--muted); display: block; }
.lh-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.lh-chips button { border: 1.5px solid #dde1ec; background: #fff; border-radius: 999px; min-height: 36px; padding: 0 14px; font-weight: 500; }
.lh-chips button.on { background: var(--blue-bg); border-color: var(--brand); color: #3e57d1; font-weight: 600; }
.lh-bq-list { display: grid; gap: 8px; max-height: 360px; overflow: auto; }
.lh-bq { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 12px; cursor: pointer; }
.lh-bq:has(input:checked) { border-color: var(--brand); background: #f7f9ff; }
.lh-bq input { accent-color: var(--brand); width: 18px; height: 18px; flex: none; } .lh-bq .t { flex: 1; min-width: 0; }
.lh-step { display: inline-flex; align-items: center; border: 1.5px solid #dde1ec; border-radius: 12px; overflow: hidden; background: #fff; width: 100%; }
.lh-step.off { opacity: .4; }
.lh-step button { width: 46px; min-height: 46px; border: 0; background: #f0f2f7; font-size: 20px; font-weight: 600; }
.lh-step input { flex: 1; min-width: 0; border: 0; text-align: center; font: 700 16px "Be Vietnam Pro", sans-serif; min-height: 46px; background: transparent; }
.lh-tgl { display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 13px; }
.lh-tgl input { accent-color: var(--brand); width: 18px; height: 18px; } .lh-tgl span { flex: 1; } .lh-tgl small { display: block; color: var(--muted); font-weight: 400; }
.lh-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.lh-sum { position: sticky; top: 76px; display: grid; gap: 12px; }
.lh-sum .li { display: flex; gap: 12px; align-items: flex-start; } .lh-sum .ic { margin: 0; width: 36px; height: 36px; border-radius: 10px; } .lh-sum .ic svg.i { width: 18px; height: 18px; }
.lh-sum small { color: var(--muted); display: block; line-height: 1.3; } .lh-sum b { line-height: 1.3; display: block; }

/* 6. Theo dõi */
.lh-mhead { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; } .lh-mhead .g { flex: 1; min-width: 220px; } .lh-mhead h2 { font-size: 17px; margin: 0; }
.lh-live { display: inline-flex; align-items: center; gap: 10px; background: #fff; box-shadow: var(--shadow); border-radius: 999px; padding: 6px 14px 6px 8px; font-weight: 600; font-size: 13px; }
.lh-live .dotl { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; animation: lh-pulse 1.4s infinite; margin-left: 6px; }
@keyframes lh-pulse { 50% { opacity: .55; } }
.lh-ring { width: 26px; height: 26px; transform: rotate(-90deg); }
.lh-ring circle { fill: none; stroke-width: 3.5; } .lh-ring .bg { stroke: #dde1ec; } .lh-ring .fg { stroke: var(--brand); stroke-linecap: round; stroke-dasharray: 69.1; stroke-dashoffset: 0; }
.lh-ring .fg.run { animation: lh-cdr 5s linear forwards; } @keyframes lh-cdr { to { stroke-dashoffset: 69.1; } }
.lh-counters { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin: 18px 0; }
.lh-cntc { display: flex; align-items: center; gap: 14px; border: 2px solid transparent; text-align: left; font: inherit; color: inherit; }
.lh-cntc .ic { margin: 0; } .lh-cntc.on { border-color: var(--brand); }
.lh-cntc b { font-size: 28px; line-height: 1; display: block; font-variant-numeric: tabular-nums; } .lh-cntc small { color: var(--muted); }
.lh-tablecard { padding: 12px 8px; }
.lh-tools { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; padding: 0 12px; }
.lh-tools .inp { max-width: 260px; }
.lh-scroll { overflow-x: auto; }
.lh-tbl { width: 100%; border-collapse: collapse; }
.lh-tbl th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); font-weight: 600; padding: 10px 12px; border-bottom: 1px solid #dde1ec; white-space: nowrap; }
.lh-tbl td { padding: 11px 12px; border-bottom: 1px solid var(--line); vertical-align: middle; }
.lh-tbl tr:last-child td { border-bottom: 0; }
.lh-tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.lh-nm { display: flex; align-items: center; gap: 10px; font-weight: 500; } .lh-nm .avatar, .lh-att .avatar { width: 30px; height: 30px; font-size: 12px; background: #cfe0ff; }
.lh-bar { flex: 1; height: 8px; background: #f0f2f7; border-radius: 99px; overflow: hidden; } .lh-bar i { display: block; height: 100%; background: var(--brand); border-radius: 99px; }
.lh-pg { display: flex; align-items: center; gap: 10px; min-width: 130px; } .lh-pg small { color: var(--muted); font-variant-numeric: tabular-nums; width: 34px; }
.lh-leave { display: inline-flex; align-items: center; gap: 5px; min-width: 38px; justify-content: center; padding: 2px 9px; border-radius: 999px; background: #f0f2f7; color: var(--muted); font-weight: 600; font-size: 12.5px; }
.lh-leave.m { background: var(--amber-bg); color: var(--amber); } .lh-leave.h { background: #fdeaea; color: #d63a3a; }

/* 7. Kết quả & thống kê */
.lh-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 16px; }
.lh-kpi small { color: var(--muted); display: block; } .lh-kpi b { font-size: 26px; line-height: 1.2; display: block; } .lh-kpi span { font-size: 12.5px; color: var(--muted); }
.lh-grid2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; margin-bottom: 16px; }
.lh-hist text { font: 600 11px "Be Vietnam Pro", sans-serif; fill: var(--muted); } .lh-hist .cnt-t { fill: var(--ink); font-size: 12px; }
.lh-pbar { display: flex; align-items: center; gap: 8px; min-width: 120px; } .lh-pbar b { width: 38px; font-variant-numeric: tabular-nums; }
.lh-bd { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 12.5px; font-variant-numeric: tabular-nums; } .lh-bd small { font-weight: 600; font-size: 11.5px; }
.lh-bd.g { background: var(--green-bg); color: var(--green); } .lh-bd.b { background: var(--blue-bg); color: #3e57d1; } .lh-bd.a { background: var(--amber-bg); color: var(--amber); } .lh-bd.r { background: #fdeaea; color: #d63a3a; }
.lh-wk { display: grid; gap: 12px; } .lh-wk .w { display: grid; grid-template-columns: 150px 1fr 44px; align-items: center; gap: 10px; font-size: 13.5px; } .lh-wk .w b { text-align: right; font-variant-numeric: tabular-nums; } .lh-wk .lh-bar { height: 10px; }
.lh-att { display: grid; gap: 4px; } .lh-att .a { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); } .lh-att .a:first-child { border-top: 0; }
.lh-att .g { flex: 1; min-width: 0; } .lh-att .why { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; } .lh-att .why .lh-chip { margin-left: 0; } .lh-att .sc { font-weight: 700; font-variant-numeric: tabular-nums; }
.lh-legd { display: flex; gap: 8px 14px; flex-wrap: wrap; color: var(--muted); font-size: 12.5px; margin-top: 12px; align-items: center; }

/* 8. Thẻ lớp */
.lh-jcard { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.lh-jcard .ic { margin: 0; } .lh-jcard .g { flex: 1; min-width: 200px; } .lh-jcard small { color: var(--muted); display: block; }
.lh-jcard .code { font-size: 28px; font-weight: 700; letter-spacing: .24em; font-variant-numeric: tabular-nums; } .lh-jcard .code.off { opacity: .35; }
.lh-pin { font-family: ui-monospace, monospace; font-size: 16px; letter-spacing: .12em; }

@media (max-width: 900px) {
  .lh-gb, .lh-grid2 { grid-template-columns: 1fr; } .lh-sum { position: static; }
  .lh-counters, .lh-kpis { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 720px) { .lh-g2 { grid-template-columns: 1fr; } .lh-hide-sm { display: none; } .lh-wk .w { grid-template-columns: 110px 1fr 40px; } }
```

- [ ] **Step 2: Gắn tab vào `ClassDetailPage`**

`web/src/pages/Classes.tsx`:
- import router thành `import { Link, useParams, useSearchParams } from "react-router";`, và thêm sau `import { Icon } from "../Icon";`:

```ts
import { AssignTab } from "./classroom/AssignTab";
import { BadgesTab } from "./classroom/BadgesTab";
import { AssignmentScoped, type ClassTab, ClassTabs } from "./classroom/ClassroomTabs";
```

- trong `ClassDetailPage`, ngay sau `const file = useRef<HTMLInputElement>(null);` thêm:

```ts
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") ?? "hoc-vien") as ClassTab;
  const picked = sp.get("bai");
  const goTab = (t: ClassTab, bai: string | null = picked) => setSp(t === "hoc-vien" ? {} : { tab: t, ...(bai ? { bai } : {}) });
```

- ngay sau dòng `<h1>{c.name} <small …>…</small></h1>` thêm:

```tsx
      <ClassTabs tab={tab} onTab={(t) => goTab(t)} />
      {tab === "giao-bai" && <AssignTab classId={c.id} subject={c.subject} className={c.name} rosterSize={c.students.length} onOpen={(aid, t) => goTab(t, aid)} />}
      {(tab === "theo-doi" || tab === "ket-qua") && <AssignmentScoped classId={c.id} tab={tab} assignmentId={picked} onPick={(aid) => goTab(tab, aid)} />}
      {tab === "the-lop" && <BadgesTab classId={c.id} />}
      {tab === "hoc-vien" && <>
```

- đóng fragment: ngay trước `</>` cuối cùng của `return` (sau `</div>` của thẻ bảng học viên) thêm `</>}`. Toàn bộ phần cũ từ `<div className="bar">` đến hết thẻ bảng học viên nằm trong fragment `hoc-vien`, không sửa gì bên trong.

- [ ] **Step 3: Kiểm**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web typecheck` → không lỗi.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web test` → PASS.
Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web build` → build xong.

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/classroom web/src/pages/Classes.tsx
git commit -m "feat(web): trang lớp GV — giao bài, theo dõi trực tiếp, kết quả + thống kê + chấm tự luận, thẻ lớp (cấp/in/thu hồi mã, mã tham gia)"
```

---

### Task 12: Smoke E2E P9a + thử tải 1.000 HS + tài liệu (controller chạy thật)

**Files:**
- Modify: `web/scripts/smoke.mjs`, `docs/ROADMAP.md`, `scripts/README.md`, `AGENTS.md`, `server/package.json` (dev `autocannon`)
- Create: `scripts/load-p9.mjs`

**Interfaces:**
- Consumes: mọi `data-testid` ở Task 10–11; REST Task 5–8; helper `apiPost` (đã có trong `smoke.mjs`, khai ở đoạn P4), biến `classId` (lớp 5 HS tạo ở đoạn "Lớp & học viên (F1)", môn Toán).
- Produces: smoke chạy được đường: GV cấp mã → giao bài từ đề → **ngữ cảnh trình duyệt thứ hai (điện thoại 390 × 844)** đăng nhập mã lớp + STT 1 + PIN → trả lời 2 trắc nghiệm + 1 trả lời ngắn gõ công thức `3/2` (MathLive → `\frac{3}{2}`, khớp đáp án "1,5") → chờ "Đã lưu" → kiểm máy chủ có 3 câu → nộp → 10/10 → GV thấy 1/5 đã nộp, điểm 10, thống kê 3 câu. `scripts/load-p9.mjs` in JSON kết quả và `exitCode = 0` khi đạt mục tiêu.

- [ ] **Step 1: Thư viện thử tải**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server add -D autocannon@^9.0.0`

- [ ] **Step 2: Smoke**

Trong `web/scripts/smoke.mjs`, chèn đoạn sau ngay **trước** dòng `  // Các trang còn lại`:

```js
  // P9a — lớp học trực tuyến: thẻ lớp → giao bài → HS (điện thoại) đăng nhập mã lớp + STT + PIN → làm (có công thức) → tự lưu → nộp → GV xem kết quả
  const p9Topic = `Lớp trực tuyến ${Date.now() % 100000}`;
  for (let i = 0; i < 2; i++) {
    const r = await apiPost("/api/questions", { type: "mcq", subject: "Toán", grade: 10, topic: p9Topic, level: "NB", tags: [], stem: `P9 câu ${i + 1}: $${i}+1$ bằng`, options: [`$${i}$`, `$${i + 1}$`, `$${i + 2}$`, `$${i + 3}$`], answer: 1 });
    assert(r.status === 201, `P9: thêm câu trắc nghiệm ${i + 1}`);
  }
  assert((await apiPost("/api/questions", { type: "short_answer", subject: "Toán", grade: 10, topic: p9Topic, level: "TH", tags: [], stem: "Viết $\\frac{3}{2}$ dưới dạng số thập phân.", answer: "1,5" })).status === 201, "P9: thêm câu trả lời ngắn");
  const p9Title = `Kiểm tra P9 ${p9Topic}`;
  const p9Exam = await apiPost("/api/exams", { title: p9Title, variants: 1, durationMinutes: 15, matrix: { subject: "Toán", grade: 10, cells: [{ topic: p9Topic, level: "NB", type: "mcq", count: 2 }, { topic: p9Topic, level: "TH", type: "short_answer", count: 1 }] } });
  assert(p9Exam.status === 201, "P9: tạo đề 2 trắc nghiệm + 1 trả lời ngắn");

  await page.goto(`${BASE}/lop-hoc/${classId}?tab=the-lop`);
  await page.getByTestId("lh-issue").click();
  await page.waitForFunction(() => /^\d{6}$/.test(document.querySelector("[data-testid=lh-pin-1]")?.textContent ?? ""));
  const classCode = (await page.getByTestId("lh-class-code").innerText()).trim();
  const pin1 = (await page.getByTestId("lh-pin-1").innerText()).trim();
  assert(/^[A-Z2-9]{6}$/.test(classCode), `P9: cấp mã lớp ${classCode} + PIN cho cả lớp`);
  await shot("lh-the-lop");

  await page.goto(`${BASE}/lop-hoc/${classId}?tab=giao-bai`);
  await page.getByTestId("lh-new").click();
  await page.locator("[data-testid=lh-exams] label", { hasText: p9Title }).click();
  await page.getByTestId("lh-publish").click();
  await page.waitForSelector("[data-testid=lh-monitor]");
  assert((await page.locator("[data-testid=lh-mrow]").count()) === 5, "P9: giao bài → tab Theo dõi có 5 HS");
  await shot("lh-theo-doi");

  const keyOf = await page.evaluate(async (examId) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    return (await (await fetch(`/api/exams/${examId}/key`, { headers: { authorization: `Bearer ${token}` } })).json())[0].entries;
  }, p9Exam.body.examId);

  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const hs = await ctx2.newPage();
  hs.on("pageerror", (e) => console.log("hs pageerror", e.message));
  await hs.goto(`${BASE}/hs`);
  await hs.getByTestId("hs-in-code").fill(classCode);
  await hs.getByTestId("hs-in-seat").fill("1");
  for (let i = 0; i < 6; i++) await hs.getByTestId(`hs-in-pin-${i}`).fill(pin1[i]);
  await hs.screenshot({ path: SHOT("hs-dang-nhap") });
  await hs.getByTestId("hs-go").click();
  const card = hs.locator("[data-testid=hs-asg]", { hasText: p9Title });
  await card.waitFor();
  assert(true, "P9: HS đăng nhập bằng mã lớp + STT + PIN, thấy bài được giao");
  await card.getByTestId("hs-start").click();
  await hs.waitForSelector("[data-testid=hs-pal-0]");
  for (const [i, e] of keyOf.entries()) {
    await hs.getByTestId(`hs-pal-${i}`).click();
    if (e.section === "mcq") await hs.getByTestId(`hs-opt-${e.no}-${"ABCD".indexOf(e.answer)}`).click();
    else {
      await hs.waitForTimeout(600); // chờ math-field gắn xong
      await hs.locator(`[data-testid=hs-sa-${e.no}]`).click();
      await hs.keyboard.type("3/2"); // MathLive: 3/2 → \frac{3}{2}
    }
  }
  await hs.waitForFunction(() => document.querySelector("[data-testid=hs-save]")?.textContent?.includes("Đã lưu"), null, { timeout: 15000 });
  await hs.screenshot({ path: SHOT("hs-lam-bai") });
  const answered = await page.evaluate(async (classId) => {
    const k = Object.keys(localStorage).find((x) => x.startsWith("oidc.user:"));
    const token = JSON.parse(localStorage.getItem(k)).access_token;
    const h = { authorization: `Bearer ${token}` };
    const list = await (await fetch(`/api/classes/${classId}/assignments`, { headers: h })).json();
    const m = await (await fetch(`/api/assignments/${list[0].id}/monitor`, { headers: h })).json();
    return m.rows.find((r) => r.seat === 1).answered;
  }, classId);
  assert(answered === 3, `P9: tự lưu lên máy chủ đủ 3 câu (thấy ${answered})`);
  await hs.getByTestId("hs-submit-top").click();
  await hs.getByTestId("hs-confirm").click();
  await hs.waitForSelector("[data-testid=hs-score]");
  const score = (await hs.getByTestId("hs-score").innerText()).trim();
  assert(score === "10", `P9: nộp bài, chấm đúng hết (công thức 3/2 = 1,5): ${score}/10`);
  await hs.screenshot({ path: SHOT("hs-ket-qua") });
  await ctx2.close();

  await page.goto(`${BASE}/lop-hoc/${classId}?tab=ket-qua`);
  await page.waitForFunction(() => document.querySelector("[data-testid=lh-kpi-submit]")?.textContent?.replace(/\s+/g, "") === "1/5");
  assert((await page.locator("[data-testid=lh-row]").first().getByTestId("lh-score").innerText()).trim() === "10", "P9: GV thấy điểm 10 và thống kê (nộp 1/5)");
  assert((await page.locator("[data-testid=lh-items] tbody tr").count()) === 3, "P9: thống kê từng câu (3 câu)");
  await shot("lh-ket-qua");
```

Run: `node --check web/scripts/smoke.mjs` → không lỗi cú pháp.

- [ ] **Step 3: Script thử tải**

```js
// scripts/load-p9.mjs
// Thử tải P9a: N học sinh tự lưu mỗi SAVE_EVERY giây trong DURATION giây, rồi cả lớp nộp trong SUBMIT_WINDOW giây.
// Cần: server đang chạy (Postgres thật trong docker, infra/), Keycloak (lấy token gv1) hoặc TEACHER_TOKEN.
// Chạy: flock /tmp/eduvn-heavy.lock node scripts/load-p9.mjs
import autocannon from "../server/node_modules/autocannon/autocannon.js";

const API = process.env.API ?? "http://localhost:4310";
const KC = process.env.KC ?? "http://localhost:8180";
const N = Number(process.env.N ?? 1000);
const DURATION = Number(process.env.DURATION ?? 120);
const SAVE_EVERY = Number(process.env.SAVE_EVERY ?? 3);
const SUBMIT_WINDOW = Number(process.env.SUBMIT_WINDOW ?? 10);
const CONNECTIONS = Number(process.env.CONNECTIONS ?? 200);
const TARGET = { saveP95: 150, submitP95: 400 };

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const p95 = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)] : NaN;
};
async function teacherToken() {
  if (process.env.TEACHER_TOKEN) return process.env.TEACHER_TOKEN;
  const r = await fetch(`${KC}/realms/eduvn/protocol/openid-connect/token`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "password", client_id: "eduvn-dev", username: "gv1", password: "gv1-dev-pass", scope: "openid" }),
  });
  if (!r.ok) throw new Error(`Keycloak ${r.status}`);
  return (await r.json()).access_token;
}
async function call(method, path, token, body) {
  const r = await fetch(`${API}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body !== undefined && { "content-type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (i < items.length) {
      const k = i++;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

const gv = await teacherToken();
const tag = `Tải ${Date.now()}`;
log(`chuẩn bị lớp ${N} HS`);
const cls = await call("POST", "/api/classes", gv, { name: `T${Date.now() % 100000}`, schoolYear: "2026-2027", subject: "Toán" });
const names = Array.from({ length: N }, (_, i) => `Học Sinh ${String(i + 1).padStart(4, "0")}`);
for (let i = 0; i < N; i += 500) await call("POST", `/api/classes/${cls.id}/students`, gv, { text: names.slice(i, i + 500).join("\n") });
for (let i = 0; i < 10; i++) await call("POST", "/api/questions", gv, { type: "mcq", subject: "Toán", grade: 10, topic: tag, level: "NB", tags: [], stem: `Câu ${i + 1}: ${i} + 1 = ?`, options: [String(i), String(i + 1), String(i + 2), String(i + 3)], answer: 1 });
for (let i = 0; i < 2; i++) await call("POST", "/api/questions", gv, { type: "short_answer", subject: "Toán", grade: 10, topic: tag, level: "TH", tags: [], stem: `Viết ${i + 1}/2 dạng thập phân`, answer: i === 0 ? "0,5" : "1" });
const exam = await call("POST", "/api/exams", gv, { title: tag, variants: 4, durationMinutes: 60, matrix: { subject: "Toán", grade: 10, cells: [{ topic: tag, level: "NB", type: "mcq", count: 10 }, { topic: tag, level: "TH", type: "short_answer", count: 2 }] } });
const asg = await call("POST", `/api/classes/${cls.id}/assignments`, gv, { title: tag, source: { examId: exam.examId }, dueAt: new Date(Date.now() + 3 * 3600_000).toISOString(), publish: true });
log("cấp mã");
const { classCode, cards } = await call("POST", `/api/classes/${cls.id}/credentials`, gv, {});
log("đăng nhập + vào bài");
const students = await pool(cards, 25, async (c) => {
  const s = await call("POST", "/api/student/session", "", { classCode, seat: c.seat, pin: c.pin });
  const room = await call("POST", `/api/student/assignments/${asg.id}/start`, s.token, {});
  return { studentId: c.studentId, token: s.token, sid: room.submission.id, nos: room.questions.map((q) => q.no), seq: 0, answers: {}, acked: {}, ackedSeq: 0 };
});

function nextAnswers(st) {
  const k = Math.min(st.nos.length, Object.keys(st.answers).length + 1);
  const answers = {};
  st.nos.slice(0, k).forEach((no, i) => (answers[String(no)] = i >= 10 ? "1{,}0" : (st.seq + i) % 4));
  return answers;
}

async function run(name, opts, makeBody, method) {
  const lat = [];
  let k = 0;
  let s5xx = 0;
  let other = 0;
  const inst = autocannon({
    url: API,
    connections: CONNECTIONS,
    pipelining: 1,
    ...opts,
    requests: [{
      method,
      setupRequest(req, ctx) {
        const st = students[k++ % students.length];
        const { path, body, seq, answers } = makeBody(st);
        ctx.st = st;
        ctx.seq = seq;
        ctx.answers = answers;
        return { ...req, path, headers: { authorization: `Bearer ${st.token}`, "content-type": "application/json" }, body: JSON.stringify(body) };
      },
      onResponse(status, _body, ctx) {
        if (status >= 500) s5xx++;
        else if (status >= 300) other++;
        else if (ctx.seq > ctx.st.ackedSeq) {
          ctx.st.ackedSeq = ctx.seq;
          ctx.st.acked = ctx.answers;
        }
      },
    }],
  });
  inst.on("response", (_c, _status, _bytes, ms) => lat.push(ms));
  const res = await inst;
  const out = { name, requests: res.requests.total, p50: res.latency.p50, p95: p95(lat), p99: res.latency.p99, max: res.latency.max, s5xx, non2xx: other, errors: res.errors, timeouts: res.timeouts };
  log(JSON.stringify(out));
  return out;
}

log(`tự lưu: ${N} HS × mỗi ${SAVE_EVERY}s trong ${DURATION}s`);
const save = await run("autosave", { duration: DURATION, overallRate: Math.ceil(N / SAVE_EVERY) }, (st) => {
  st.seq++;
  st.answers = nextAnswers(st);
  return { path: `/api/student/submissions/${st.sid}/answers`, body: { seq: st.seq, answers: st.answers }, seq: st.seq, answers: st.answers };
}, "PUT");

const answeredOf = (a) => Object.values(a).filter((v) => v !== null && v !== "").length;
const mon = await call("GET", `/api/assignments/${asg.id}/monitor`, gv);
const byId = new Map(mon.rows.map((r) => [r.studentId, r]));
// mất = máy chủ có ÍT câu hơn bản đã được xác nhận (bản gửi cuối có thể đã lưu dù autocannon dừng trước khi nhận phản hồi)
const lostAfterSave = students.filter((st) => (byId.get(st.studentId)?.answered ?? 0) < answeredOf(st.acked)).length;
log(`sau tự lưu: ${lostAfterSave} HS lệch số câu đã lưu`);

log(`nộp: ${N} bài trong ${SUBMIT_WINDOW}s`);
const submit = await run("submit", { amount: N, overallRate: Math.ceil(N / SUBMIT_WINDOW) }, (st) => {
  const seq = st.seq + 1;
  return { path: `/api/student/submissions/${st.sid}/submit`, body: { seq, answers: st.answers }, seq, answers: st.answers };
}, "POST");

const res = await call("GET", `/api/assignments/${asg.id}/results`, gv);
const notFinal = res.rows.filter((r) => r.status === null || r.status === "in_progress").length;
const mon2 = await call("GET", `/api/assignments/${asg.id}/monitor`, gv);
const byId2 = new Map(mon2.rows.map((r) => [r.studentId, r]));
const lostAfterSubmit = students.filter((st) => (byId2.get(st.studentId)?.answered ?? 0) < answeredOf(st.answers)).length;

const pass = save.p95 < TARGET.saveP95 && submit.p95 < TARGET.submitP95 && save.s5xx + submit.s5xx === 0 && lostAfterSave === 0 && lostAfterSubmit === 0 && notFinal === 0;
console.log(JSON.stringify({ N, autosave: save, submit, lostAfterSave, lostAfterSubmit, notFinal, target: TARGET, pass }, null, 2));
process.exitCode = pass ? 0 : 1;
```

Run: `node --check scripts/load-p9.mjs` → không lỗi.

- [ ] **Step 4: Tài liệu**

`scripts/README.md` thêm dòng:

```md
`load-p9.mjs` (P9a Task 12): thử tải lớp học trực tuyến — N HS (mặc định 1.000) tự lưu mỗi 3 giây trong 2 phút rồi nộp dồn trong 10 giây; in p50/p95/p99, số 5xx, số HS mất câu. Biến: `API`, `KC`, `N`, `DURATION`, `SAVE_EVERY`, `SUBMIT_WINDOW`, `CONNECTIONS`, `TEACHER_TOKEN`. Chạy: `flock /tmp/eduvn-heavy.lock node scripts/load-p9.mjs`.
```

`AGENTS.md`, dòng "Lệnh kiểm": thêm `, thử tải P9 (cần Postgres + Keycloak + server chạy): flock /tmp/eduvn-heavy.lock node scripts/load-p9.mjs`.

`docs/ROADMAP.md`, dòng P9: cột Plan thành `` `2026-11-10-p9a-online-class-core.md` (P9a) · P9b chưa viết ``; cột Trạng thái thành `**P9a code xong <ngày>** (<n> test server + <m> test web, smoke OK; tải 1.000 HS: tự lưu p95 <x> ms, nộp p95 <y> ms, 0×5xx, 0 câu mất). P9b (khoá học, thông báo, phụ huynh, ôn câu sai, xuất VNEdu/SMAS) chưa làm` — controller điền số đo thật ở Step 6.

- [ ] **Step 5: Smoke thật (controller)**

```bash
free -h
docker compose -f infra/docker-compose.yml up -d
grep -q STUDENT_SECRET server/.env || echo "STUDENT_SECRET=dev-only-student-secret-change-me-0123" >> server/.env
pnpm --filter @eduvn/server start        # chạy nền, chờ "eduvn server: http://localhost:4310"
pnpm --filter @eduvn/web dev             # chạy nền, cổng 5173
flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web smoke
```

Expected: các dòng `ok  P9: …` (cấp mã, giao bài → 5 HS ở Theo dõi, HS đăng nhập, tự lưu đủ 3 câu, nộp 10/10, GV thấy 1/5 + thống kê 3 câu) rồi `SMOKE PASS`. Ảnh: `/tmp/eduvn-web-lh-the-lop.png`, `lh-theo-doi`, `hs-dang-nhap`, `hs-lam-bai`, `hs-ket-qua`, `lh-ket-qua` — mở ra đối chiếu `web/mockup/lop-hoc.html` (màn 1, 3, 4, 6, 7, 8).

- [ ] **Step 6: Thử tải thật (controller)**

Dừng vite trước (giảm tải máy). Server + Postgres + Keycloak vẫn chạy.

```bash
free -h
flock /tmp/eduvn-heavy.lock node scripts/load-p9.mjs | tee /tmp/eduvn-load-p9.txt
```

Expected: JSON cuối có `"pass": true` — `autosave.p95 < 150`, `submit.p95 < 400`, `s5xx = 0` ở cả hai pha, `lostAfterSave = 0`, `lostAfterSubmit = 0`, `notFinal = 0`. Ghi số vào `docs/ROADMAP.md` (Step 4).
Nếu không đạt: ghi số thật vào ROADMAP, **không** chỉnh mục tiêu; báo lại kèm `/tmp/eduvn-load-p9.txt` (lần chạy khô trên PGlite N = 60 cho nộp p95 ≈ 420–500 ms, chỉ có giá trị tham khảo vì PGlite chạy đơn luồng). Lớp thử tải (tên `T<số>`, 1.000 HS) ở lại DB dev; xoá khi cần: `docker compose -f infra/docker-compose.yml exec postgres psql -U eduvn -c "delete from classes where name ~ '^T[0-9]+$'"`.

- [ ] **Step 7: Toàn bộ test + commit**

Run: `flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server test && flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/server typecheck && flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web test && flock /tmp/eduvn-heavy.lock pnpm --filter @eduvn/web typecheck` → PASS.

```bash
git add web/scripts/smoke.mjs scripts/load-p9.mjs scripts/README.md AGENTS.md docs/ROADMAP.md server/package.json pnpm-lock.yaml
git commit -m "test: smoke lớp học trực tuyến (GV giao bài → HS điện thoại làm, công thức, tự lưu, nộp → GV xem kết quả) + thử tải 1.000 HS; cập nhật lộ trình P9a"
```

---

## Self-review (đã làm khi viết plan)

**Phủ spec P9a:**
| Spec | Task |
|---|---|
| §1 Hai đường đăng nhập → một StudentActor; thẻ lớp (mã lớp + STT + PIN scrypt + QR có `badgeVersion`, thu hồi) | 3 (token, PIN), 4 (cột), 5 (service + route), 10 (web), 11 (tab Thẻ lớp + in) |
| §1 Keycloak + mã tham gia 6 ký tự bật/tắt; tạo HS mới hoặc gắn HS có sẵn khi trùng họ tên + ngày sinh và GV xác nhận; `students.user_id` | 4, 5 (`loginOidc`, `resolveLink`), 10 (`joinWith`), 11 (duyệt) |
| §1 Phiên HS jose, issuer `eduvn-student`, 12 giờ, `ver`, Bearer; `/api/student/*` chỉ nhận StudentActor | 3, 5 (`registerStudentRoutes`), test 401 chéo ở Task 5/7 |
| §1 Chống dò PIN 5 lần/10 phút theo (lớp, STT) và theo IP, lỗi chung | 3 (`PinGuard`), 5 (test khoá + 429); IP = 30 (quyết định 3) |
| §1 Quyền `assignment:manage`, `assignment:read`, `student:credentials` | 3 |
| §2 Bảng `assignments` đủ cột; bản chụp variants; rules; mặc định 1/3 lượt; `show_solution`; `shuffle`; `status` | 1 (`AssignmentInput`, `resolveSettings`), 4, 6 |
| §2 Mã đề chia đều theo vị trí; đảo câu trong phần bằng seed; giao từ nhóm câu ngân hàng (lọc chủ đề, mức độ, chọn tay) | 1 (`pickVariant`, `displayOrder`), 6 (`questionIds`), 11 (form "Nhóm câu từ ngân hàng") |
| §3 Bảng `submissions` (unique attempt), tự lưu Dexie + 3 giây + rời trang, một câu UPDATE có điều kiện, mất mạng vẫn làm | 4, 7 (`save`), 9 (`AnswerSync`, `pickStore`), 10 (`ExamRoom`) |
| §3 Nộp idempotent; quá hạn + 30 giây từ chối lưu, chốt bằng bản đã lưu; chốt khi đọc + quét mỗi phút → `auto_submitted` | 1 (`isExpired`), 7 (`finalize`, `finalizeExpired`, `sweepMs`) |
| §3 Rời tab: visibilitychange/blur, `leave_count`, `submission_events`, GV xem | 7 (`events`), 9 (`LeaveTracker`, `EventOutbox`), 8 (`submissionDetail.events`), 11 (cột Rời tab) |
| §3 Giao diện: một câu/màn trên điện thoại, danh sách trên máy tính, bảng số câu (đã làm, xem lại), đồng hồ máy chủ, 3 trạng thái lưu, MathLive cho trả lời ngắn, đúng/sai 4 công tắc | 9 (`ServerClock`), 10 |
| §4 Chấm khi nộp bằng `scoreItem` + `rulesForSubject`; tự luận chờ chấm, GV chấm tay; bảng phẳng `answer_items` | 1 (`gradeAnswers`), 4, 7, 8 (`gradeEssays`), 11 |
| §4 Trả lời ngắn kiểu Oppia (khoảng trắng, phẩy, 1e-9, `|`) | 1 (`shortAnswer.ts`) |
| §4 Kết quả HS theo `show_solution` | 1 (`resultLevel`, `reviewItems`), 7 (`result`), 10 (`ResultPage`) |
| §4 Thống kê: tỉ lệ nộp, phân bố, p, D (27 %), đáp án nhiễu, chủ đề yếu, HS cần quan tâm | 2, 8 (`results`), 11 (`ResultsTab`) — tính trong bộ nhớ trên các dòng `answer_items` (quyết định đã chốt) |
| §4 Theo dõi trực tiếp: hỏi lại 5 giây, cache 2 giây | 2 (`buildMonitor`), 8 (`monitor`), 11 (`MonitorTab`) |
| §5 Thử tải 1.000 HS, p95 150/400 ms, 0×5xx, không mất câu; HS256 trong bộ nhớ; nộp một giao dịch; under-pressure 503 + Retry-After, client gửi lại; rate-limit theo HS | 3 (CryptoKey), 5 (plugin), 7 (giao dịch, rate-limit theo bài làm), 9 (`retryAfterMs`, `hsFetch`), 12 (`load-p9.mjs`) |
| MCP `giao_bai`, `ket_qua_bai` | 8 |
| Ngoài phạm vi (khoá học, thông báo, phụ huynh, ôn câu sai, VNEdu/SMAS, chấm AI) | không có task nào đụng tới |

**Placeholder:** không có `TODO`/"tương tự"/"…phần còn lại". Chỗ để trống có chủ đích duy nhất là số đo thật trong `docs/ROADMAP.md` (Task 12 Step 4/6, controller điền sau khi chạy).

**Khớp kiểu giữa task:** `SubmissionStatus`, `AnswerValue`, `Answers` (Task 1) dùng ở schema (4), service (5–8) và bản sao web (9); `PublicItem`/`ReviewItem` server (1) = web (9) (`section` ở web để `string`); `RoomPayload`/`SaveResult`/`StudentResult`/`MyAssignment` (7) = web (9); `MonitorPayload`/`ResultsPayload`/`SubmissionDetail` (8) và `AssignmentSummary`/`AssignmentListItem` (6) = `web/src/pages/classroom/types.ts` (11); `CredentialStatus`/`BadgeCard` (5) = web (11); `StudentRouteDeps` (5 → 7 thêm `submissions`), `ClassroomDeps` (5 → 6 thêm `assignments`), `createAssignmentService` options (6 `{ now }` → 8 thêm `finalize`) ghi rõ ở bước sửa; `AppDeps` (5 → 7 thêm `sweepMs`); thứ tự khai báo trong `app.ts`: `credentials` → `submissionsSvc` → `assignmentsSvc` (8 dùng `submissionsSvc` trong `finalize`).

**Rủi ro còn lại:** số đo p95 nộp bài trên Postgres thật chưa có (chỉ chạy khô PGlite); máy dev tải cao làm test PGlite chậm (đã nới timeout 60 giây ở file test mới); `/home` gần đầy; khoá chống dò PIN và cache theo dõi nằm trong bộ nhớ một tiến trình (chạy nhiều tiến trình thì phải chuyển sang DB/Redis — ngoài P9a).
