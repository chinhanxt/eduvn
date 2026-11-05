# 07 · Giáo trình & gia sư sinh viên — DeepTutor (P6)

**Upstream:** https://github.com/HKUDS/DeepTutor (Apache-2.0, Python). Thư mục: `services/deeptutor/`. Giữ nguyên LICENSE/NOTICE.

**Mục tiêu:** GV có giáo trình nhiều chương từ tài liệu của mình; SV có gia sư trả lời theo đúng tài liệu môn.

| | |
|---|---|
| **Đầu vào** | Tài liệu môn (PDF, Word, slide), đề cương |
| **Đầu ra** | Giáo trình (chức năng Book), kho tri thức theo lớp, gia sư chat cho SV, câu hỏi luyện tập → đẩy về ngân hàng câu hỏi (02) |
| **Tool MCP dự kiến** | `tao_giao_trinh`, `hoi_gia_su`, `sinh_cau_hoi_tu_tai_lieu` |

**Cách nối:** một kho tri thức DeepTutor cho mỗi lớp/môn; lõi map lớp → KB; SV hỏi qua Zalo/web, lõi chuyển tiếp.
**Cần kiểm khi viết plan:** API HTTP/SSE của TutorBot, tách người dùng của DeepTutor, chất lượng tiếng Việt khi đặt ngôn ngữ đầu ra.
