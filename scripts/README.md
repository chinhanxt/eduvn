# scripts/

`smoke.sh` (P1 Task 13): lấy token thật từ Keycloak → gọi REST + MCP của server đang chạy.
`load-p9.mjs` (P9a): thử tải lớp học trực tuyến — N HS (mặc định 1.000) tự lưu mỗi 3 giây rồi nộp dồn; in p50/p95/p99, số 5xx, số HS mất câu. Biến: `API`, `TEACHER_TOKEN` (hoặc Keycloak `KC`), `N`, `DURATION`, `SAVE_EVERY`, `SUBMIT_WINDOW`, `CONNECTIONS`. Không cần Docker: chạy `server/scripts/serve-pglite.ts` (PGlite + Keycloak giả, ghi token ra `TOKEN_FILE`).
`web/scripts/smoke-p9.mjs` (P9a): Playwright — GV cấp thẻ + giao bài, 3 HS điện thoại đăng nhập mã lớp + STT + PIN làm/nộp, GV xem kết quả. Dùng với `serve-pglite.ts` (cổng 4323) và vite (`API_URL=http://127.0.0.1:4323 WEB_PORT=5183`).
