# Luồng A — Web app khung: báo cáo

## Đã làm
- Server: GET /api/me, GET /api/exams (repo: findUser, orgsOf, listExams; service: me, listExamSummaries) + 2 test trong server/tests/http/api.test.ts.
- web/ (Vite 8, React 19, TS, react-router 8, oidc-client-ts 3): login OIDC PKCE (3 nút, kc_idp_hint google/microsoft), shell sidebar navy + topbar chọn tổ chức (localStorage, header x-org-id), Trang chủ (8 công cụ, Gần đây 5 đề + nút tải, Kênh), Ngân hàng câu hỏi (lọc môn/lớp, bảng, form mcq), Đề thi (danh sách, tạo đề ma trận nhiều dòng, link Word, ô thiếu khi 422), Chấm bài (ô nhập sinh từ đáp án mcq/đúng-sai/trả lời ngắn, tổng điểm), Slide/Video/Giáo trình/Gia sư AI ("Thử"), Học viên/Tổ chức ("Sắp có"), Kết nối (URL MCP copy + Zalo "Sắp có").
- CSS lấy nguyên từ mockup; sprite Lucide nguyên văn + plus/trash/logout/check, component <Icon name>.
- web/scripts/smoke.mjs (playwright-core + /usr/bin/google-chrome).

## File
server/src/db/repo.ts, server/src/service.ts, server/src/http/app.ts, server/tests/http/api.test.ts, pnpm-workspace.yaml, pnpm-lock.yaml, infra/keycloak/realm-eduvn.json,
web/{package.json,tsconfig.json,vite.config.ts,index.html,scripts/smoke.mjs}, web/src/{main,App,Shell,Icon,auth,api,tools,sprite,styles}, web/src/pages/{Login,Home,Bank,Exams,Grade,Connect,Placeholder}.tsx

## Lệnh / kết quả
- pnpm -C server typecheck: sạch. pnpm -C server test: 14 files, 89 tests passed.
- pnpm -C web build: tsc + vite build sạch (108 modules, JS 351 kB).
- node web/scripts/smoke.mjs (Keycloak + Postgres thật, server :4310, vite :5173): SMOKE PASS — đăng nhập gv1, thêm 2 câu, ô thiếu 2/5, tạo đề 2 mã, tải .docx (PK), chấm 0.5/0.5, trang Kết nối, 6 trang giữ chỗ.

## Ảnh (1280x800)
/tmp/eduvn-web-cham-bai-nhap.png /tmp/eduvn-web-cham-bai.png /tmp/eduvn-web-de-thi.png /tmp/eduvn-web-de-thi-thieu.png /tmp/eduvn-web-giao-trinh.png /tmp/eduvn-web-gia-su.png /tmp/eduvn-web-hoc-vien.png /tmp/eduvn-web-home.png /tmp/eduvn-web-home-trong.png /tmp/eduvn-web-ket-noi.png /tmp/eduvn-web-login.png /tmp/eduvn-web-ngan-hang.png /tmp/eduvn-web-slide.png /tmp/eduvn-web-to-chuc.png /tmp/eduvn-web-video.png 

## Lệch / lưu ý
- Keycloak: webOrigins "+" không khớp redirectUri wildcard http://localhost:* nên token POST bị CORS chặn. Đổi realm-eduvn.json thành ["*"] (dev); đã áp vào Keycloak đang chạy qua admin API (import bỏ qua realm đã tồn tại; volume mới tự nhận).
- Ô tìm kiếm và chuông trên topbar chỉ trang trí.
- Chấm bài bỏ qua tự luận; nút tải ở "Gần đây" tải mã đề đầu tiên.
- Font Be Vietnam Pro tải từ Google Fonts (offline dùng font hệ thống).
- Dữ liệu smoke còn trong Postgres dev. Web chưa có unit test ngoài smoke.
