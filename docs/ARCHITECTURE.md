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
