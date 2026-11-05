# EDUVN — Thiết kế tổng thể (spec)

Nguồn: thảo luận 2026-11-05 với chinhan. Sản phẩm: `PRODUCT.md`. Kiến trúc: `docs/ARCHITECTURE.md`.

## R1. Danh tính, tổ chức, vai trò
- R1.1 Đăng nhập qua OIDC (Keycloak 26, realm `eduvn`). Access token có `aud` chứa `eduvn-api`.
- R1.2 Người dùng định danh bằng `sub`; lưu `email`, `name` nếu có.
- R1.3 Đăng nhập lần đầu không có tổ chức → tự tạo tổ chức "Không gian của <tên>" với vai trò `owner`.
- R1.4 Vai trò: `owner`, `admin`, `teacher`, `assistant`, `student`. Hành động: `org:manage`, `member:manage`, `question:read`, `question:write`, `exam:create`, `exam:read_key`, `exam:grade`.
- R1.5 Chọn tổ chức qua header `x-org-id`; không phải thành viên → 403.

## R2. Ngân hàng câu hỏi
- R2.1 4 dạng: `mcq` (4 phương án, 1 đáp án), `true_false` (4 ý, mỗi ý Đ/S), `short_answer` (đáp án chuỗi), `essay` (rubric + điểm).
- R2.2 Trường chung: `subject`, `grade` (1–12 phổ thông; 13–16 = năm 1–4 đại học), `topic`, `level` (`NB`|`TH`|`VD`), `stem`, `explanation?`, `tags[]`.
- R2.3 Câu hỏi thuộc một tổ chức; chỉ thành viên đọc được.
- R2.4 Lọc theo môn + lớp (bắt buộc), chủ đề, mức độ, dạng (tuỳ chọn).

## R3. Ra đề
- R3.1 Ma trận = môn, lớp, danh sách ô {chủ đề, mức độ, dạng, số câu}.
- R3.2 Thiếu câu ở ô nào → báo rõ ô đó, cần bao nhiêu, có bao nhiêu; không tạo đề.
- R3.3 Một câu không xuất hiện 2 lần trong cùng đề.
- R3.4 N mã đề (1–24), mã bắt đầu từ 101. Mỗi mã: giữ thứ tự phần I→II→III→IV, trộn câu trong phần, trộn phương án câu `mcq`. Đánh số "Câu k" lại từ 1 trong mỗi phần.
- R3.5 Có `seed` → kết quả tái lập được.
- R3.6 Đáp án theo mã đề: `mcq` → A–D; `true_false` → chuỗi Đ/S (vd `ĐSSĐ`); `short_answer` → đáp án; `essay` → "Tự luận".
- R3.7 Xuất .docx: đề theo mã (tiêu đề, môn, lớp, thời gian, mã đề, họ tên/SBD, các phần, "HẾT"); đáp án tất cả mã trong 1 file.
- R3.8 Link tải ký HMAC, hết hạn 15 phút (để mở được từ AI chat không cần bearer).

## R4. Chấm
- R4.1 Quy tắc mặc định (CV 7991): mcq 0,25; đúng/sai theo số ý đúng [0; 0,1; 0,25; 0,5; 1]; trả lời ngắn 0,25 (Toán 0,5).
- R4.2 Trả lời ngắn so sánh sau chuẩn hoá: bỏ khoảng trắng, chữ thường, `,` → `.`.
- R4.3 Tự luận không chấm tự động → liệt kê câu chờ chấm.
- R4.4 Kết quả: tổng điểm (làm tròn 2 chữ số), điểm tối đa phần tự động, điểm từng câu.

## R5. MCP
- R5.1 Endpoint `POST /mcp`, Streamable HTTP, stateless, trả JSON.
- R5.2 Không có/sai token → 401 + `WWW-Authenticate: Bearer resource_metadata="<PUBLIC_URL>/.well-known/oauth-protected-resource"`.
- R5.3 `/.well-known/oauth-protected-resource` trả `resource`, `authorization_servers`.
- R5.4 Tool (tên tiếng Việt không dấu): `tim_cau_hoi`, `them_cau_hoi`, `tao_de`, `lay_dap_an`, `cham_bai`, `xuat_word`. Quyền như REST.

## R6. Zalo (P2) — theo cách 2anh-zalo-bot
- R6.1 Nick Zalo riêng cho bot, đăng nhập QR qua `zca-js`, Hermes Agent làm bộ não.
- R6.2 Lõi nhận lệnh từ kênh bằng service token + danh tính kênh đã xác minh (`zalo:<uid>`), map sang người dùng qua liên kết một lần.
- R6.3 Giới hạn gửi: theo mặc định của 2anh (5 tin liền, sau đó ~20 tin/phút).

## Ràng buộc toàn dự án
- Node `>=24`, pnpm workspace, TypeScript ESM, `strict: true`.
- Thư viện (bản tối thiểu đã kiểm 2026-11-05): `fastify@^5.12.8`, `@modelcontextprotocol/sdk@^1.32.2`, `drizzle-orm@^0.45.4`, `drizzle-kit@^0.31.11`, `@electric-sql/pglite@^0.5.15`, `pg@^8.23.1`, `jose@^6.2.15`, `zod@^4.6.7`, `docx@^9.15.2`, `vitest@^5.1.0`, `typescript@^7.0.2`, `tsx@^4.23.15`.
- Test DB dùng PGlite trong tiến trình — không bật Docker khi chạy test.
- Định danh code tiếng Anh; nội dung hiển thị cho GV/SV tiếng Việt có dấu; tên tool MCP tiếng Việt không dấu, `snake_case`.
- Cổng dev: server 4310, Postgres 5442, Keycloak 8180.
- Không chạy song song nhiều tác vụ nặng (build/render/test lớn) trên máy dev.
