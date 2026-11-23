# Chuẩn đẹp EDUVN (bản dự thi)

Lệnh của chủ dự án: **thẩm mỹ web lên hàng đầu. Demo phải đẹp mặt, tự nói lên chức năng, rất ít chữ.** Bổ sung cho `eduvn-design-system.md`; chỗ nào khác thì theo file này.

## Nguyên tắc
1. **Hình nói thay chữ.** Mỗi màn có một vật thể trung tâm cho thấy chức năng (bản đồ, đồ thị, bảng trắng, phổ điểm, sân khấu lớp học). Người xem hiểu màn làm gì trong 3 giây, không cần đọc.
2. **Ít chữ.** Tiêu đề ≤ 5 từ. Không có câu mô tả dưới tiêu đề, trừ khi thiếu nó là không hiểu. Nhãn nút 1–2 từ. Không đoạn giới thiệu, không chú thích kỹ thuật, không số hiệu nội bộ (P13, G3, CV…) trên giao diện.
3. **Thoáng.** Khoảng trắng là thành phần thiết kế: lề trang ≥ 40 px ở desktop, giữa các khối ≥ 32 px. Mỗi màn một việc chính và **một** nút chính. Việc phụ gom vào menu hoặc hiện khi rê chuột.
4. **Ít khung.** Không lồng thẻ trong thẻ. Tách khối bằng khoảng trắng, đường kẻ mảnh hoặc nền rất nhạt. Hạn chế bóng đổ; không gradient trang trí, không glassmorphism, không icon trong ô màu tròn lặp lại, không lưới 3 thẻ "tính năng" na ná nhau.
5. **Chữ có nhịp.** Source Serif 4 cho tiêu đề lớn và nội dung đọc; Inter cho giao diện, số dùng `tabular-nums`. Thang cỡ rõ ràng, chênh lệch mạnh giữa tiêu đề và thân. Việt hoá đủ dấu, không rớt chữ lẻ (`text-wrap: balance/pretty`).
6. **Màu tiết chế.** Nền trắng ngà `#FDFCF9`, mực `#1C1B1A`. GV nhấn `#3346D1`, Học nhấn `#0B7466`; mỗi màn chỉ một màu nhấn. Bảng màu đa dạng trong `services/video-theme/tokens.json` chỉ dành cho dữ liệu và vật thể. **Không dùng cam làm màu chủ đạo.**
7. **Chuyển động có nghĩa.** 150–280 ms, easing mượt, vào theo thứ tự; số đếm lên, biểu đồ vẽ dần, chữ AI hiện dần, skeleton đúng hình. Không nảy, không zoom giật. Tôn trọng `prefers-reduced-motion`.
8. **Không bao giờ có màn trống xấu.** Trạng thái trống phải là bản xem trước đẹp của chức năng với dữ liệu mẫu và một nút chính, không phải ô xám kèm "Chưa có dữ liệu".
9. **Đồng bộ.** Dùng thành phần `web/src/ui/`. Đúng ở 1440, 1024, 390; sáng và tối đều đẹp.

## Cách tự kiểm mỗi màn
Chụp 1440 và 390, tự xem ảnh rồi trả lời: nhìn 3 giây có biết màn làm gì không? Bỏ được chữ nào? Bỏ được khung nào? Có giống template AI không? Nếu còn "có" ở câu bỏ được hay giống template thì sửa tiếp.
