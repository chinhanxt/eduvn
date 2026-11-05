# P2 — Khung ngoài toàn hệ thống (outer shell)

**Mục tiêu:** thấy được **toàn bộ hệ thống chạy từ đầu đến cuối** ở mức tối thiểu — web app, AI chat công khai, Zalo, OpenMAIC, DeepTutor — tất cả đi qua một lõi và một đăng nhập. **Không** đào sâu ruột từng module (P1 đã có lõi đủ dùng; chi tiết để sau).

**Nguyên tắc:** bề rộng trước. Mỗi luồng chỉ cần 1 đường "happy path" chạy thật + demo được. Test ở mức smoke cho từng luồng, không viết TDD dày.

**Spec:** `docs/specs/2026-11-05-eduvn-design.md` · Kiến trúc: `docs/ARCHITECTURE.md` · Mockup: `web/mockup/index.html`

## Luồng A — Web app khung (`web/`)

- Màn: Đăng nhập (SSO Keycloak) · Trang chủ (menu đủ module, thẻ "Có / Thử / Sắp có") · Kết nối AI & Zalo.
- Module "Có" (ngân hàng câu hỏi, đề thi, chấm) gọi REST lõi sẵn có, giao diện đơn giản nhất (bảng + form).
- Module "Thử" mở trang gọi sang OpenMAIC/DeepTutor (luồng D). Module "Sắp có" chỉ hiện trang giữ chỗ.
- **Cổng:** chinhan duyệt mockup trước khi code.
- **Xong khi:** đăng nhập thật → tạo 1 đề → tải Word, trên trình duyệt.

## Luồng B — AI chat công khai (MCP + SSO)

- Đưa server + Keycloak lên HTTPS (domain/tunnel — chinhan chọn).
- Keycloak: cho connector đăng ký client (DCR) hoặc client tĩnh, bật đăng nhập Google.
- **Xong khi:** thêm connector EDUVN trên Claude.ai, đăng nhập, nói "tạo đề 15 phút Toán 10, 2 mã, xuất Word" → nhận link tải.

## Luồng C — Zalo theo cách 2anh-zalo-bot

- Chạy `2anh-zalo-bot` + Hermes Agent trong `services/zalo-bridge/` với **nick Zalo riêng cho bot**.
- Hermes gọi lõi qua tool plugin gắn UID Zalo người gửi; lõi thêm bảng `channel_links` + lệnh `/lienket <mã>` (mã lấy ở trang Kết nối).
- **Xong khi:** trong nhóm Zalo thử, GV đã liên kết @bot "tạo đề…" → bot gửi file .docx.

## Luồng D — Cắm OpenMAIC + DeepTutor

- Chạy mỗi dịch vụ bằng docker (bản phát hành gốc), ghi tag vào `services/*/README.md`.
- Lõi thêm 2 cửa tối thiểu: `tao_slide` (chủ đề → PPTX qua OpenMAIC) và `tao_giao_trinh` (tài liệu → giáo trình qua DeepTutor), có cả tool MCP + nút trên web.
- **Xong khi:** từ web hoặc AI chat tạo được 1 slide và 1 giáo trình ngắn tiếng Việt.

## Thứ tự & tài nguyên máy

1. A (sau khi duyệt mockup) → 2. B → 3. C → 4. D.
D nặng nhất (OpenMAIC cần Postgres + server riêng, DeepTutor Python + RAG): chạy **một dịch vụ mỗi lúc**, kiểm RAM trước; nếu máy không đủ thì đặt D lên máy nhà (MayNha).

## Cần chinhan cung cấp

| Luồng | Cần |
|---|---|
| A | Duyệt mockup `web/mockup/index.html` |
| B | Chỗ chạy công khai: VPS/domain có sẵn, hay dùng tunnel (Cloudflare) tạm |
| C | SIM + nick Zalo riêng cho bot; quét QR lúc chạy lần đầu |
| D | Khoá LLM cho OpenMAIC/DeepTutor (Anthropic / OpenAI / Gemini / DeepSeek…) |

Mỗi luồng khi bắt đầu sẽ được tách thành checklist ngắn ngay trong file này.
