# 06 · Slide & video bài giảng — OpenMAIC (P5)

**Upstream:** https://github.com/THU-MAIC/OpenMAIC (MIT, TypeScript/Next, cần PostgreSQL + server chạy lâu từ v1.2). Thư mục: `services/openmaic/`.

**Mục tiêu:** GV đưa chủ đề/giáo án → nhận slide PPTX và video MP4 tiếng Việt, sửa được.

| | |
|---|---|
| **Đầu vào** | Chủ đề, lớp, thời lượng, tài liệu đính kèm (PDF/Word), giáo án 5512 (từ P8) |
| **Đầu ra** | `.pptx`, `.mp4`, gói HTML offline; lưu link vào lõi theo tổ chức |
| **Tool MCP dự kiến** | `tao_slide`, `tao_video_bai_giang`, `trang_thai_tac_vu` |

**Cách nối:** lõi gọi API server của OpenMAIC bằng tài khoản dịch vụ (người dùng không đăng nhập OpenMAIC). Tác vụ dài → hàng đợi + trạng thái.
**Cần kiểm khi viết plan:** API sinh lớp học/xuất PPTX-MP4 của bản đang dùng; giọng TTS tiếng Việt (thay provider); RAM khi render (chạy một tác vụ mỗi lúc).
