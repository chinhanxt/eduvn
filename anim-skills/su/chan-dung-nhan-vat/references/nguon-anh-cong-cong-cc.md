# Quy tắc nguồn ảnh công cộng và Creative Commons — `chan-dung-nhan-vat`

Tài liệu quy định bản quyền hình ảnh cho skill `chan-dung-nhan-vat` và phần hồ sơ nhân vật trên trang `/hoc/su/dong-thoi-gian`.

## 1. Giấy phép được phép sử dụng

Chỉ được dùng ảnh thuộc một trong các nhóm giấy phép rõ ràng sau:

| Giấy phép | Ký hiệu | Yêu cầu ghi nguồn trên khung hình |
|---|---|---|
| Phạm vi công cộng (Public Domain) | `PD`, `CC0`, `PD-Vietnam`, `PD-USGov` | Ghi: `Nguồn: <kho/tác giả> (Phạm vi công cộng)` |
| Creative Commons Ghi công | `CC BY 4.0` / `CC BY 3.0` | Ghi đầy đủ: `Ảnh: <Tác giả> · CC BY 4.0 · <Nguồn>` |
| Creative Commons Ghi công – Chia sẻ tương tự | `CC BY-SA 4.0` / `CC BY-SA 3.0` | Ghi đầy đủ: `Ảnh: <Tác giả> · CC BY-SA 4.0 · <Nguồn>` |

**Cấm tuyệt đối:**
- Ảnh có bản quyền thương mại, ảnh báo chí không có giấy phép mở, ảnh watermark.
- Ảnh chân dung do AI tự vẽ lại khuôn mặt nhân vật lịch sử mà không ghi chú rõ ràng là minh hoạ — với Lịch sử giáo dục, **không bịa chân dung**.
- Nạp trực tiếp URL ảnh từ internet (`https://...`) trong HTML bài dựng HyperFrames (hộp cát dựng video cắt mạng; mọi tệp ảnh đã kiểm phải được lưu cục bộ trong `assets/` và ghi vào `THIRD_PARTY_LICENSES.md`).

## 2. Phương án dự phòng khi không có ảnh tự do đã kiểm

Đối với nhiều nhân vật lịch sử thời phong kiến Việt Nam (Ngô Quyền, Lý Thường Kiệt, Trần Hưng Đạo, Lê Lợi, Quang Trung…) không có ảnh chụp thật và các tranh/tượng hiện đại thường còn bản quyền tác giả:
- **Ưu tiên 1**: Dùng **khung huy hiệu chữ lồng (monogram) + khung niên đại** theo phong cách Giấy học thuật (nền `--sunken`, viền `--accent`, chữ serif đậm hai chữ cái đầu + năm sinh – năm mất, nhãn `"Tư liệu chân dung: chưa có ảnh công cộng"`).
- **Ưu tiên 2**: Nếu GV cung cấp ảnh tư liệu riêng trong kho tài liệu tổ chức (đã tự chịu trách nhiệm bản quyền nội bộ), hiển thị kèm dòng `Tư liệu giáo viên cung cấp`.

## 3. Quy chuẩn hiển thị dòng nguồn trong video 1080p

- Đặt dòng nguồn ngay dưới khung chân dung hoặc ở góc dưới cùng vùng sân khấu (`y ≤ 885`, không lấn vào dải phụ đề `y ≥ 936`).
- Dùng lớp `.ek-meta` (30 px, màu `--ink3`, tương phản ≥ 4,5:1 trên nền `#FDFCF9`) — đây là ngoại lệ cỡ chữ duy nhất dưới 36 px được `kit-api.md` cho phép.
- Ví dụ chuẩn: `Ảnh: tư liệu Wikimedia Commons (Public Domain)` hoặc `Huy hiệu chữ lồng · Minh hoạ học thuật EDUVN`.
