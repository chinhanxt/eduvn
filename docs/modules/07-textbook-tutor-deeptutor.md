# 07 · Gia sư & giáo trình cho học sinh — DeepTutor (P6)

**Upstream:** https://github.com/HKUDS/DeepTutor (Apache-2.0, Python). Thư mục: `services/deeptutor/`. Giữ nguyên LICENSE/NOTICE.

**Mục tiêu (dịch vụ dành cho học sinh):** HS có gia sư trả lời theo đúng tài liệu môn, luyện câu và ôn giãn cách; GV chỉ nạp tài liệu và giáo trình cho lớp.

| | |
|---|---|
| **Đầu vào** | Tài liệu môn (PDF, Word, slide), đề cương |
| **Đầu ra** | Giáo trình (chức năng Book), kho tri thức theo lớp, gia sư chat cho SV, câu hỏi luyện tập → đẩy về ngân hàng câu hỏi (02) |
| **Tool MCP dự kiến** | `tao_giao_trinh`, `hoi_gia_su`, `sinh_cau_hoi_tu_tai_lieu` |

**Cách nối:** một kho tri thức DeepTutor cho mỗi lớp/môn; lõi map lớp → KB; HS hỏi qua Zalo/web, lõi chuyển tiếp.
**Cần kiểm khi viết plan:** API HTTP/SSE của TutorBot, tách người dùng của DeepTutor, chất lượng tiếng Việt khi đặt ngôn ngữ đầu ra.
