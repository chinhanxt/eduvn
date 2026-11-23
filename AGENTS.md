# Quy tắc cho agent làm dự án EDUVN

- **Đọc `docs/BOI-CANH.md` TRƯỚC TIÊN.** Đây là bối cảnh, phạm vi, quyết định và lộ trình hiện hành, ưu tiên hơn mọi tài liệu cũ.
- Tài liệu gốc (lịch sử): `docs/specs/2026-11-05-eduvn-design.md`; plan từng đợt ở `docs/plans/`, `docs/superpowers/plans/`.
- Phần lõi chạy thật: có test cho logic, commit theo phần. Phần mockup: ưu tiên đẹp và chạy mượt, không cần test sâu.
- Logic nghiệp vụ chỉ nằm trong `server/src/domain/` (thuần, không I/O).
- Test DB dùng PGlite (`server/tests/helpers/db.ts`); không bật Docker khi chạy test.
- **Một tác vụ nặng mỗi lúc** (build/render/test lớn) — máy dev từng treo khi chạy song song. Kiểm RAM/swap trước. Bọc lệnh nặng: `~/video-studio/bin/heavy run eduvn -- flock /tmp/eduvn-heavy.lock <lệnh>` (khoá chung với video-studio, chờ đủ RAM). vitest mặc định 2 worker (`VITEST_MAX_WORKERS`); máy từng bị systemd-oomd tắt (2026-11-10) khi vitest mở 12 worker cùng lúc TTS GPU.
- Nội dung hiển thị: tiếng Việt có dấu. Tên tool MCP: tiếng Việt không dấu `snake_case`.
- `services/*`: không sửa code upstream nếu chưa có plan cho phép; ghi bản/commit upstream đang dùng trong README của thư mục.
- Lệnh kiểm: `pnpm --filter @eduvn/server test` và `pnpm --filter @eduvn/server typecheck`, `pnpm --filter @eduvn/gateway test`, `pnpm --filter @eduvn/gateway typecheck`, `pnpm --filter @eduvn/web test` (module thuần web: công thức, bảng); P9a: `web/scripts/smoke-p9.mjs` và `scripts/load-p9.mjs` với `server/scripts/serve-pglite.ts` (xem `scripts/README.md`).
