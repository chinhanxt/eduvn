# Lộ trình

Mỗi đợt = **một plan riêng** trong `docs/superpowers/plans/`, viết ngay trước khi làm (upstream thay đổi hằng tuần nên không viết sẵn chi tiết). Mỗi plan tự cho ra phần mềm chạy được, test được.

| Đợt | Plan | Kết quả bàn giao | Module | Trạng thái |
|---|---|---|---|---|
| P1 | `2026-11-05-p1-core-question-bank-mcp.md` | Lõi + SSO (dev) + ngân hàng câu hỏi + ra đề/đáp án/.docx + chấm + MCP | 01, 02, 03, 05 | Code xong 2026-11-05 (nhánh `p1-core`, 87 test, smoke OK) — chờ chinhan duyệt .docx |
| P2 | `2026-11-05-p2-outer-shell.md` | **Khung ngoài**: A. web app khung · B. AI chat công khai (MCP + SSO qua HTTPS) · C. Zalo (2anh) · D. cắm OpenMAIC/DeepTutor | 01, 05, 06, 07, 08 | **A xong** 2026-11-05 (web khung theo mockup, đăng nhập OIDC, trang chủ/ngân hàng/đề/chấm/kết nối, smoke OK). **B, C, D hoãn** theo chinhan: B chờ domain/tunnel HTTPS, C chờ nick + SIM Zalo riêng, D chờ quyết định khoá LLM phía server (gộp vào P5/P6) |
| P3 | `2026-11-05-p3-teacher-features.md` | 8 chức năng GV: lớp & học viên, sổ điểm/điểm danh (TT22/TT27, HK1/HK2), nhận xét, giáo án CV 5512, ma trận + đặc tả CV 7991, văn bản NĐ30, slide .pptx, trò chơi ôn tập .html | 02–04 | Code xong 2026-11-05 (157 test, smoke OK) |
| P4 | `2026-11-06-p4-formula-board.md` | Ô công thức (bàn phím toán VN, gõ tắt, đọc; Word ra phương trình thật) + Bảng giảng: bút, đồ thị hàm số có thanh trượt, hình không gian (thiết diện, đo góc), gợi ý bài liên quan + chiếu + trò chơi | 02, 03, 06 | Code xong 2026-11-06 (253 test: 217 server + 36 web, smoke OK) |
| P5 | `p5-lesson-media-openmaic.md` | **Cho giáo viên** — qua OpenMAIC: bài học tương tác từ chủ đề/giáo án/tài liệu, slide có lời giảng, xuất PPTX + video MP4 tiếng Việt | 06 | Chờ khoá LLM phía server |
| P6 | `p6-textbook-tutor-deeptutor.md` | **Cho học sinh** — qua DeepTutor: gia sư hỏi đáp theo tài liệu môn (có trích dẫn), luyện câu + ôn giãn cách, giáo trình sống (Book) | 07 | Chờ khoá LLM phía server |
| P7 | `p7-paper-grading.md` | Chấm từ ảnh phiếu/bài viết tay | 03 | |
| P8 | `p8-vn-pedagogy-skills.md` | Skill: giáo án 5512, đặc tả 7991, nhận xét, câu hỏi theo YCCĐ | `skills/` | |

Ưu tiên (2026-11-05): dựng khung ngoài trước (P2), các đợt đào sâu (P4–P8) làm sau.

Phân vai dịch vụ (chinhan chốt 2026-11-09): **OpenMAIC phục vụ giáo viên** (soạn và giảng), **DeepTutor phục vụ học sinh** (tự học, hỏi gia sư). Cả hai tự gọi LLM nên cần khoá LLM phía server — hiện đang hoãn.

## Cổng chuyển đợt

Chỉ sang đợt sau khi đợt trước: toàn bộ test xanh · `scripts/smoke.sh` chạy thật với Keycloak · chinhan duyệt demo.
