# P3 — Chức năng cho giáo viên (đợt 1)

**Nguồn:** khảo sát `docs/research/2026-11-05-teacher-features.md` (2anh-zalo-bot, education-agent-skills, OpenMAIC, DeepTutor, instructional_agents, Oak Aila).

**Nguyên tắc kiến trúc:** AI (Claude/ChatGPT qua MCP, sau này Zalo/Hermes) **viết nội dung**; server EDUVN **lưu, kiểm đúng chuẩn VN bằng quy tắc, xuất file** (.docx/.xlsx/.pptx/.html). Không cần khoá LLM phía server.

**Mỗi chức năng = 1 lát cắt dọc:** bảng DB (nếu cần) → domain (zod + quy tắc kiểm chuẩn) → service (phân quyền) → xuất file → tool MCP → REST → trang web (theo mockup đã duyệt: ít chữ, icon Lucide, thẻ đổ bóng) → test + smoke.

## Quy ước chung
- File xuất: `.docx` dùng `docx@^9`; `.xlsx` dùng `exceljs@^4.4.0`; `.pptx` dùng `pptxgenjs@^4.0.1`; tải qua link ký `/dl/:token` (mở rộng `DownloadClaims.kind`).
- Tool MCP: tên tiếng Việt không dấu `snake_case`, mô tả nói rõ cấu trúc JSON để AI điền đúng mẫu.
- Lỗi kiểm chuẩn trả danh sách thiếu sót bằng tiếng Việt (vd: "Hoạt động 3 thiếu Sản phẩm") để AI tự sửa và gửi lại.
- Mọi dữ liệu theo tổ chức (`org_id`), quyền theo `authz.ts` (thêm action mới nếu cần).
- Test: domain + service + 1 test HTTP + 1 test MCP mỗi chức năng; smoke web chụp ảnh trang mới.
- Font tiếng Việt trong file: Times New Roman 13–14 (văn bản/giáo án theo thông lệ).

## Danh sách (thứ tự làm)

| # | Chức năng | Đầu vào (AI/GV đưa) | Kiểm chuẩn (server) | Đầu ra | Tool MCP | Trang web |
|---|---|---|---|---|---|---|
| F1 | **Lớp học & học viên** | Tên lớp, năm học; danh sách HS (dán/Excel) | Trùng tên/mã HS | Lớp, HS; xuất danh sách .xlsx | `tao_lop`, `them_hoc_vien`, `danh_sach_lop` | Lớp học |
| F2 | **Sổ điểm & điểm danh** | Điểm theo cột (TX1…, GK, CK), điểm danh theo ngày | Thang 0–10, hệ số; ĐTB môn theo TT22 (TX hệ 1, GK hệ 2, CK hệ 3) | Sổ điểm .xlsx | `nhap_diem`, `diem_danh`, `xuat_so_diem` | Sổ điểm |
| F3 | **Nhận xét TT22/TT27** | AI viết nhận xét từng HS từ điểm + ghi chú | Độ dài, không để trống, mức (Tốt/Khá/Đạt/Chưa đạt) | Bảng nhận xét .xlsx | `luu_nhan_xet`, `xem_ho_so_hs` | trong Sổ điểm |
| F4 | **Giáo án CV 5512** | JSON giáo án: mục tiêu (kiến thức, năng lực, phẩm chất), thiết bị, 4 hoạt động × (mục tiêu, nội dung, sản phẩm, tổ chức thực hiện) | Đủ cấu phần Phụ lục IV CV 5512 | Giáo án .docx | `luu_giao_an`, `xuat_giao_an` | Giáo án |
| F5 | **Ma trận + bản đặc tả CV 7991** | Ma trận đề (đã có) + YCCĐ từng ô | Tổng điểm 10, tỉ lệ mức độ, số câu khớp | Ma trận + đặc tả .docx kèm đề | mở rộng `tao_de`, `xuat_word` | trong Đề thi |
| F6 | **Văn bản hành chính NĐ30** | JSON: loại (thông báo, kế hoạch, báo cáo, biên bản, công văn, tờ trình, giấy mời), cơ quan, số/ký hiệu, trích yếu, nội dung, nơi nhận, người ký | Đủ thành phần thể thức theo loại | .docx đúng thể thức (quốc hiệu, tiêu ngữ, số ký hiệu, nơi nhận, chữ ký) | `tao_van_ban` | Văn bản |
| F7 | **Slide bài giảng** | JSON dàn ý: tiêu đề, các slide (tiêu đề, gạch đầu dòng, ghi chú) — hoặc sinh từ giáo án F4 | Số slide, độ dài dòng | .pptx theo theme EDUVN | `tao_slide` | Slide (thay giữ chỗ) |
| F8 | **Trò chơi ôn tập** | Chọn câu hỏi từ ngân hàng / đề | ≥ 4 câu trắc nghiệm | 1 file .html chơi offline (đố vui có điểm, thẻ lật) | `tao_tro_choi` | Trò chơi |

Để đợt sau: SKKN, thông báo phụ huynh qua Zalo (cần luồng C), giáo trình/gia sư (DeepTutor), video (OpenMAIC), import câu hỏi từ Word.

## Sidebar sau P3
Soạn bài: Giáo án · Slide · Trò chơi · Video (Thử) · Giáo trình (Thử)
Đánh giá: Ngân hàng câu hỏi · Đề thi · Chấm bài
Lớp học: Lớp & học viên · Sổ điểm · Gia sư AI (Thử)
Văn bản: Văn bản hành chính
Hệ thống: Kết nối · Tổ chức

## Xong khi (mỗi chức năng)
Test xanh · typecheck · `pnpm -C web build` · gọi được qua MCP (test) · trang web chạy, ảnh chụp `/tmp/eduvn-web-<trang>.png` · file xuất mở được (LibreOffice → PDF kiểm bằng mắt 1 lần).
