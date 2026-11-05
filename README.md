# EDUVN

Hệ thống hỗ trợ giáo viên & sinh viên Việt Nam: ngân hàng câu hỏi, ra đề, chấm, slide, video bài giảng, giáo trình, quản lý học viên — dùng qua AI chat (MCP + SSO), Zalo và web.

| Đọc trước | |
|---|---|
| `PRODUCT.md` | Mục tiêu, vai trò, đầu vào/đầu ra từng module, chuẩn VN |
| `docs/ARCHITECTURE.md` | Sơ đồ hệ thống, nguyên tắc, cổng |
| `docs/specs/2026-11-05-eduvn-design.md` | Yêu cầu đánh số R1–R6 + ràng buộc toàn dự án |
| `docs/ROADMAP.md` | Các đợt P1–P8 |
| `docs/modules/` | Mỗi module: mục tiêu, đầu vào, đầu ra, tiêu chí xong |
| `docs/superpowers/plans/` | Plan thực thi từng đợt |

## Cấu trúc thư mục

```
eduvn/
├── PRODUCT.md · README.md · AGENTS.md · CLAUDE.md
├── docs/            tài liệu (spec, module, plan)
├── server/          EDU-CORE: REST + MCP + domain + DB (TypeScript)
├── web/             web app (từ P4)
├── services/        dịch vụ upstream chạy phía sau
│   ├── openmaic/    slide, video (P5)
│   ├── deeptutor/   giáo trình, gia sư (P6)
│   └── zalo-bridge/ 2anh-zalo-bot + Hermes Agent (P2)
├── skills/          skill sư phạm VN cho agent (P8)
├── infra/           docker-compose: Postgres, Keycloak
└── scripts/         smoke test, tiện ích
```

## Chạy (sau khi xong P1)

```bash
docker compose -f infra/docker-compose.yml up -d
cp server/.env.example server/.env
pnpm install && pnpm --filter @eduvn/server start
bash scripts/smoke.sh
```
