# Kiến trúc

```
 Claude.ai / ChatGPT        Zalo (nhóm lớp, nhắn riêng)          Web app (P4+)
        │ MCP + OAuth              │                                   │ OIDC
        │                 zca-js sidecar (Node)                        │
        │                          │ WebSocket nội bộ (token)          │
        │                 plugin Python ⇄ Hermes Agent                 │
        │                          │ REST + service token (P2)         │
        ▼                          ▼                                   ▼
 ┌──────────────────────────── server/ (EDU-CORE) ─────────────────────────────┐
 │ Fastify · REST /api/* · MCP /mcp (Streamable HTTP, stateless) · /dl/:token  │
 │ auth: JWT từ Keycloak (OIDC) → Actor{userId, orgId, role}                   │
 │ domain: câu hỏi · ma trận · mã đề · chấm điểm · phân quyền (thuần, test kỹ) │
 │ db: Postgres (Drizzle) · test: PGlite (in-process, không cần Docker)        │
 └───────────────┬───────────────────────────┬─────────────────────────────────┘
                 │ HTTP nội bộ (P5)          │ HTTP nội bộ (P6)
          services/openmaic           services/deeptutor
          slide · video MP4           giáo trình · gia sư · RAG
                 
 infra/: Postgres 17 · Keycloak 26 (SSO, realm `eduvn`)
```

## Nguyên tắc

1. **Một lõi duy nhất giữ danh tính, tổ chức, quyền.** OpenMAIC/DeepTutor/Hermes không giữ người dùng thật; lõi gọi chúng bằng tài khoản dịch vụ.
2. **Logic nghiệp vụ thuần trong `server/src/domain/`** — không I/O, test nhanh, dùng lại cho web/Zalo/MCP.
3. **MCP là cửa chính cho AI.** Mọi tính năng mới phải có tool MCP tương ứng; REST dùng cho web app và Zalo.
4. **Upstream không fork nếu chưa cần.** `services/*` chạy image/bản phát hành gốc + cấu hình; chỉ fork khi buộc phải sửa.
5. **Một tiến trình nặng mỗi lúc** trên máy dev (máy đã từng treo khi build/render song song).

## Danh tính & phân quyền

- Keycloak phát access token (audience `eduvn-api`). Lõi xác thực bằng JWKS.
- `users.sub` = `sub` của OIDC. Lần đầu đăng nhập → tự tạo tổ chức cá nhân, vai trò `owner`.
- Chọn tổ chức bằng header `x-org-id`; không gửi → tổ chức đầu tiên của người dùng.
- Ma trận quyền: `server/src/domain/authz.ts` (nguồn sự thật duy nhất).
- MCP: 401 kèm `WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource"` để client AI tự chạy OAuth với Keycloak (chuẩn MCP Authorization).

## Kênh Zalo (theo cách 2anh-zalo-bot)

Chi tiết: `docs/modules/08-zalo-channel.md`. Tóm tắt: nick Zalo riêng cho bot ⇄ `zca-js` ⇄ Hermes Agent; Hermes gọi lõi bằng tool plugin, plugin gắn **UID Zalo đã xác minh tại thời điểm gọi** (giống `_owner_only` của 2anh), lõi map UID → tài khoản qua bảng liên kết.

## Cổng (máy dev)

| Dịch vụ | Cổng |
|---|---|
| server | 4310 |
| Postgres | 5442 |
| Keycloak | 8180 |
| OpenMAIC (P5) | 4320 |
| DeepTutor (P6) | 4330 |
| Cổng AI (gateway) | 4340 |
| Proxy agy của cổng AI | 8900 |

## Cổng AI (`gateway/`)

Mọi lời gọi AI của lõi, OpenMAIC, DeepTutor đi qua `gateway` (API kiểu OpenAI, token dịch vụ). Bên trong: vài tiến trình `agy acp` chạy sẵn qua proxy xoay tài khoản riêng (8900), phiên bám theo hội thoại; định tuyến tác vụ → model/effort ở `gateway/tasks.json`; khoá API Anthropic là dự phòng. Agent không được dùng công cụ (mọi yêu cầu quyền đều bị từ chối). Chạy: `cp gateway/.env.example gateway/.env` rồi `pnpm --filter @eduvn/gateway start`; đo: `GATEWAY_TOKEN=… pnpm --filter @eduvn/gateway bench`.

Chi tiết vận hành cổng AI:

- **Hội thoại**: khoá lấy từ trường body `conversation`, hoặc header `x-eduvn-conversation`, hoặc `user` (theo thứ tự). Bên trong khoá thành `tác-vụ:khoá`, nên cùng một khách dùng hai tác vụ không lẫn ngữ cảnh; đổi lời dặn hệ thống (vd ngữ cảnh RAG mới) hoặc model thì mở phiên mới; máy khách gửi lịch sử đã sửa thì phiên cũ bị bỏ.
- **Chế độ JSON**: tác vụ `json`, `response_format` `json_object` hoặc `json_schema`. Nội dung trả về luôn là `JSON.stringify` của JSON đã kiểm. Với `json_schema` cổng chỉ kiểm là JSON hợp lệ, KHÔNG ép theo lược đồ.
- **Không hỗ trợ `tools`**: body có `tools` (khác rỗng) hoặc `tool_choice` khác `none` → 400 `tools_unsupported`. `n>1` → 400. `max_tokens`, `temperature`, `top_p`, `stop`… được nhận và bỏ qua. `stream_options.include_usage` thêm mảnh `usage` cuối stream.
- **Chặn công cụ**: nếu agy vẫn chạy công cụ (tool_call hoàn tất), câu trả lời bị bỏ, hỏi lại một lần ở phiên tạm; vẫn vậy → 502 `tool_used`. Tiến trình agy chỉ nhận biến môi trường trong danh sách cho phép (không có token/khoá API).
- **Proxy 8900**: nếu cổng tự bật proxy (`AGY_MANAGE_PROXY=1` và proxy chưa chạy) thì khi tắt sẽ chạy `agy-switch proxy stop --port P --pid-file F`; proxy có sẵn của người dùng thì để yên.
- **Dữ liệu tạm** `WORK_DIR` mặc định `/var/tmp/eduvn-gateway` (ngoài repo). Giới hạn dài hạn: `MAX_CONVERSATIONS`, tiến trình agy được thay mới sau `AGY_RECYCLE_SESSIONS` phiên. `/health` trả 503 khi không còn backend nào và có `metrics` (requests, errors, fallbacks, retries, toolBlocked, restarts).
