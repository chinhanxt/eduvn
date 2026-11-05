# F6 — Văn bản hành chính NĐ 30/2020 (report)

## Đã làm
- Domain `server/src/domain/vanban.ts`: zod strict (khoá lạ bị từ chối), 8 loại (thong_bao, ke_hoach, bao_cao, bien_ban, to_trinh, giay_moi, quyet_dinh, cong_van), validator trả danh sách lỗi tiếng Việt (biên bản: thoi_gian/dia_diem/thanh_phan; giấy mời: thoi_gian/dia_diem; QĐ: can_cu; công văn & tờ trình: kinh_gui; công văn: trích yếu; noi_nhan, chuc_vu_ky, nguoi_ky; quyen_han KT./TM./TL./TUQ. cần chuc_vu_cap_tren; so/ngay sai định dạng). Helper: số ký hiệu (`Số: 45/KH-THPTND`, công văn `…/THPTND-VP`), ngày (0 đệm, trống → "ngày … tháng … năm …"), nơi nhận (`- …;`, `- Lưu: VT.` cuối), đánh số I./1./a), căn cứ.
- Khối nội dung: chuỗi | `{doan}` | `{cap:1|2|3, tieu_de}` (tự đánh số, không gõ số) | `{danh_sach:[]}`.
- Export `server/src/export/vanban.ts`: A4, lề 20/20/30/15 mm, Times New Roman, thân 14pt căn đều, thụt 1 cm, dòng 1,15; bảng đầu 2 cột không viền (cơ quan chủ quản + ban hành + gạch ngắn | quốc hiệu + tiêu ngữ + gạch ngắn; hàng 2: số ký hiệu (+ "V/v" cho công văn) | địa danh, ngày nghiêng); tên loại + trích yếu (trừ công văn); Kính gửi; căn cứ nghiêng; "QUYẾT ĐỊNH:" cho QĐ; thời gian/địa điểm/thành phần; bảng cuối (Nơi nhận 11pt | quyền hạn + chức vụ + chỗ ký + họ tên); số trang giữa header từ trang 2.
- DB: bảng `van_ban` + migration `0004_amusing_harry_osborn.sql`. Quyền `vanban:manage|read` (teacher/admin/owner; assistant chỉ đọc).
- Service `services/vanban.ts`; REST `/api/van-ban` (GET list/get, POST 201, PUT, DELETE, POST :id/export); link tải ký `kind:"van_ban"` ở `/dl/:token`.
- MCP: `tao_van_ban` (mô tả liệt kê toàn bộ khoá JSON; tạo/cập nhật + trả link .docx), `danh_sach_van_ban`.
- Web: trang `/van-ban` (nhóm sidebar "Văn bản" → "Văn bản hành chính"): icon + nhãn loại + số ký hiệu + nút Tải Word. Smoke mở rộng.

## Lệnh / kết quả
- `pnpm -C server test`: 137 test, 136 xanh; 1 lỗi là test danh sách tool (đã thêm 2 tool mới), mcp.test.ts chạy lại 6/6 xanh. Test mới: domain 9, HTTP 1, MCP 1.
- `pnpm -C server typecheck`: sạch. `pnpm -C web build`: OK.
- `pnpm -C web smoke`: SMOKE PASS (gồm văn bản thiếu nơi nhận bị từ chối, lưu, tải .docx).
- LibreOffice → PDF → PNG đã xem: header đúng dạng văn bản hành chính.

## File
- /tmp/eduvn-vb-ke_hoach-1.png, /tmp/eduvn-vb-cong_van-1.png, /tmp/eduvn-vb-bien_ban-1.png (+ .docx/.pdf)
- /tmp/eduvn-web-van-ban.png, /tmp/eduvn-van-ban.docx

## Sai khác / thiếu sót
- `loai` dùng snake_case không dấu; thêm khoá phụ ngoài đề: ky_hieu_don_vi, kinh_gui, chu_tri, thu_ky.
- Web chỉ có danh sách + tải (minimal), không có trang chi tiết; biên bản chỉ một khối ký.
- Mới xem bằng mắt trang 1 của kế hoạch và công văn; số trang từ trang 2 chưa kiểm.

## Sửa chữ ký biên bản (follow-up)
- Biên bản: khối cuối là bảng 2 cột không viền: trái "THƯ KÝ" + chỗ ký + `thu_ky`, phải "CHỦ TRÌ" (hoặc "CHỦ TỌA" khi `vai_tro_chu_tri: "CHỦ TỌA"`) + chỗ ký + `chu_tri` (đậm). Không có "Nơi nhận" trừ khi `noi_nhan` được gửi (khi đó hiện bên dưới).
- Validator: biên bản bắt buộc `thu_ky`, `chu_tri` ("Biên bản thiếu họ tên thư ký (thu_ky)" / "…chủ trì/chủ tọa (chu_tri)"); `chuc_vu_ky`, `nguoi_ky`, `noi_nhan` tuỳ chọn riêng với biên bản. Khoá mới: `vai_tro_chu_tri`. Mô tả MCP đã cập nhật.
- Test: `pnpm -C server test` 137/137 xanh (focused 11/11), typecheck sạch. Ảnh /tmp/eduvn-vb-bien_ban-1.png đã xem: THƯ KÝ | CHỦ TỌA đúng, không có Nơi nhận.
