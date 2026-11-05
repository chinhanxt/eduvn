# Lộ trình

Mỗi đợt = **một plan riêng** trong `docs/superpowers/plans/`, viết ngay trước khi làm (upstream thay đổi hằng tuần nên không viết sẵn chi tiết). Mỗi plan tự cho ra phần mềm chạy được, test được.

| Đợt | Plan | Kết quả bàn giao | Module | Trạng thái |
|---|---|---|---|---|
| P1 | `2026-11-05-p1-core-question-bank-mcp.md` | Lõi + SSO (dev) + ngân hàng câu hỏi + ra đề/đáp án/.docx + chấm + MCP | 01, 02, 03, 05 | Code xong 2026-11-05 (nhánh `p1-core`, 87 test, smoke OK) — chờ chinhan duyệt .docx |
| P2 | `p2-zalo-demo.md` | Bot Zalo demo: GV nhắn "tạo đề…" trong Zalo → nhận file .docx | 08 | Chờ P1 |
| P3 | `p3-public-mcp-connectors.md` | Deploy HTTPS, Keycloak đăng ký client động, connector Claude.ai + ChatGPT | 05 | Chờ P1 |
| P4 | `p4-classroom.md` | Lớp, học viên, import Excel, điểm danh, sổ điểm, nhận xét TT22/27, web app tối thiểu | 04 | |
| P5 | `p5-lesson-media-openmaic.md` | Slide PPTX + video MP4 tiếng Việt qua OpenMAIC | 06 | |
| P6 | `p6-textbook-tutor-deeptutor.md` | Giáo trình + gia sư SV qua DeepTutor | 07 | |
| P7 | `p7-paper-grading.md` | Chấm từ ảnh phiếu/bài viết tay | 03 | |
| P8 | `p8-vn-pedagogy-skills.md` | Skill: giáo án 5512, đặc tả 7991, nhận xét, câu hỏi theo YCCĐ | `skills/` | |

## Cổng chuyển đợt

Chỉ sang đợt sau khi đợt trước: toàn bộ test xanh · `scripts/smoke.sh` chạy thật với Keycloak · chinhan duyệt demo.
