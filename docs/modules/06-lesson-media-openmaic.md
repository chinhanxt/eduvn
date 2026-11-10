# 06 · Slide & video bài giảng — OpenMAIC (P5)

**Upstream:** https://github.com/THU-MAIC/OpenMAIC (MIT, TypeScript/Next, cần PostgreSQL + server chạy lâu từ v1.2). Thư mục: `services/openmaic/`.

**Mục tiêu (dịch vụ dành cho giáo viên):** GV đưa chủ đề/giáo án → nhận slide PPTX và video MP4 tiếng Việt, sửa được.

| | |
|---|---|
| **Đầu vào** | Chủ đề, lớp, thời lượng, tài liệu đính kèm (PDF/Word), giáo án 5512 (từ P8) |
| **Đầu ra** | `.pptx`, `.mp4`, gói HTML offline; lưu link vào lõi theo tổ chức |
| **Tool MCP dự kiến** | `tao_slide`, `tao_video_bai_giang`, `trang_thai_tac_vu` |

**Cách nối:** lõi gọi API server của OpenMAIC bằng tài khoản dịch vụ (người dùng không đăng nhập OpenMAIC). Tác vụ dài → hàng đợi + trạng thái.
**Cần kiểm khi viết plan:** API sinh lớp học/xuất PPTX-MP4 của bản đang dùng; giọng TTS tiếng Việt (thay provider); RAM khi render (chạy một tác vụ mỗi lúc).

## P5b — giọng VieNeu và hoạt hình toán

- Giọng đọc: `TTS_PROVIDER=vieneu` (mặc định) gọi CLI dùng chung `vieneu-say` qua khoá nặng của máy (`HEAVY_BIN`), mẫu giọng `VIENEU_REF` ("Giọng dạy.wav") hoặc `VIENEU_VOICE`. Cả bài đọc gom 1–vài lần gọi; mỗi câu cắt thành mp3 + đệm 0,2 s lặng cuối. Xoá Edge TTS.
- Hoạt hình toán: cảnh slide có thể gắn `animation` (mẫu + tham số JSON, zod kiểm; AI chỉ chọn, không chạy mã AI viết). 7 mẫu: Manim `do_thi_ham_so`, `bien_doi_cong_thuc`, `hinh_hoc_dien_tich`, `truc_so` (mã cố định ở `services/manim/templates.py`, venv `MANIM_HOME`, TinyTeX `TINYTEX_BIN`); HyperFrames `dien_giai_tung_buoc`, `so_do_quy_trinh`, `so_sanh_bang` (HTML + GSAP + KaTeX sinh từ mẫu, `npx hyperframes render`).
- Dựng: hàng đợi 1 việc, 720p/30fps, cache `DATA_DIR/anim/<băm>.mp4`; API `POST/DELETE /api/ai-lessons/:id/canh/:sceneId/hoat-hinh`, `GET /api/ai-lessons/:id/hoat-hinh/:hash`. Task cổng AI `hoat_hinh_toan` (cổng cũ chưa có → `AI_TASK_OVERRIDES='{"hoat_hinh_toan":"slide_noi_dung"}'`).
