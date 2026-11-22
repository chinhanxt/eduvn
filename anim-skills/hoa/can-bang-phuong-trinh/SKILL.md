---
name: can-bang-phuong-trinh
description: Hoạt hình cân bằng phương trình hoá học theo định luật bảo toàn nguyên tử (và điện tích với phương trình ion): đếm nguyên tử hai vế bằng thanh so sánh và số nhảy, điều chỉnh từng hệ số nguyên dương tới khi cân bằng tối giản. Dùng khi bài giảng hướng dẫn cân bằng PTHH hoặc phản ứng oxi hoá – khử ở Hoá học 8–12. Chemical equation balancing, atom counting, stoichiometric coefficients.
license: Proprietary (EDUVN)
metadata:
  ten: "Cân bằng phương trình hoá học"
  engine: hf
  mon: hoa
  lop: 8-12
  loai: phuong-trinh-hoa,quy-trinh
  can: cong-thuc>=1
  tranh: "định nghĩa,lịch sử,cấu trúc phân tử"
  tuKhoa: "cân bằng,phương trình hoá học,hệ số,nguyên tử,vế trái,vế phải,bảo toàn,oxi hoá khử,ion"
  thoiLuong: 12-35
  fallback: can_bang_phuong_trinh_hoa_hoc
  kit: enter,count,grow,mark,focus,tint,draw
  version: "1"
  nguon: "cũ:can_bang_phuong_trinh_hoa_hoc,hf:count-up,hf:marker-highlight"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng hướng dẫn cân bằng một phương trình hoá học cụ thể (phân tử, oxi hoá – khử hoặc phương trình ion).
- Cần minh hoạ trực quan sự chênh lệch số nguyên tử từng nguyên tố giữa vế trái và vế phải trước và sau khi đặt hệ số.
- Bài học về định luật bảo toàn khối lượng, bảo toàn nguyên tố hoặc lập phương trình hoá học (Hoá học 8–12).

## Không dùng
- Cảnh chỉ nêu định nghĩa khái niệm mà không có phương trình cụ thể.
- Cảnh giảng về cấu trúc không gian phân tử, tốc độ va chạm hay bảng tuần hoàn.
- Phương trình chưa kiểm tra tính cân bằng tất định (mọi hệ số cuối phải được bộ giải đại số tuyến tính kiểm tra).

## Ý sư phạm
Tách rõ phương trình và bảng đếm nguyên tử hai vế để học sinh thấy hệ số thay đổi kéo theo số nguyên tử khớp dần tới trạng thái cân bằng tối giản.
- Beat 0 (câu 0): Hiện phương trình ban đầu với hệ số 1 và bảng đếm nguyên tử hai vế đang lệch.
- Beat 1 (câu 1): Nhấn nguyên tố đầu tiên bị lệch, tăng hệ số tương ứng để khớp số nguyên tử hai vế.
- Beat 2 (câu 2): Nhấn nguyên tố tiếp theo (thường là O hoặc H), điều chỉnh hệ số để khớp hoàn toàn.
- Beat 3 (câu 3): Chốt phương trình hoàn chỉnh kèm trạng thái chất và khẳng định hệ số nguyên dương tối giản.

## Dữ liệu lấy từ lời giảng
- Công thức các chất tham gia, sản phẩm, ký hiệu trạng thái `(s)/(l)/(g)/(aq)` và điều kiện phản ứng (nếu có).
- Bộ hệ số cân bằng tối giản lấy từ bộ giải tất định `server/src/subjects/hoa/balancer.ts` (AI không tự đoán hệ số).
- Số nguyên tử hai vế ở từng bước trung gian phải tính đúng bằng tích hệ số × chỉ số.

## Bố cục
- Tiêu đề `.ek-meta` ở `top:64px`, `.ek-title` ở `top:116px` (`.ek-col-1.ek-span-12`).
- Khung phương trình chính đặt ở `top:236px` rộng 12 cột (`.ek-col-1.ek-span-12`), mỗi hệ số có `id` riêng để đổi số mượt.
- Khu đếm nguyên tử hai vế đặt ở `top:444px` chia 2 hoặc 3 thẻ đều nhau theo số nguyên tố chính, kết thúc trước `y = 780px`.
- Thanh kết luận đặt ở `top:806px` (cao ≤ 82 px), giữ hoàn toàn trống dải phụ đề `y ≥ 936px`.

## Chuyển động
Vào phương trình và bảng đếm cùng lúc, sau đó lần lượt nhấn từng nguyên tố bằng `EK.focus`, đếm tăng hệ số và số nguyên tử bằng `EK.count`, kéo thanh so sánh bằng `tl.to(..., { scaleX })`, rồi đổi trạng thái sang xanh `--ok` bằng `EK.tint`.
- Không dùng `EK.camera` nếu toàn bộ phương trình đã đọc rõ trên 12 cột.
- Mỗi beat có ít nhất 2 thay đổi thị giác, không để tĩnh quá 3,5 giây.

## Ví dụ
Xem `examples/vi-du-1/` — cân bằng phản ứng sắt cháy trong khí oxygen: `3Fe(s) + 2O₂(g) → Fe₃O₄(s)` (4 beat, 15 giây).

## Lỗi hay gặp
- Hệ số cuối chưa tối giản (vd `6Fe + 4O₂ → 2Fe₃O₄`) hoặc đếm sai nguyên tử khi công thức có ngoặc.
- Ghi nhầm số nguyên tử không khớp với hệ số đang hiển thị trên phương trình.
- Chữ phương trình quá nhỏ (< 56 px) hoặc tràn mép khi phương trình có 5–6 chất (cần cân chỉnh khoảng cách giữa các hạng tử).

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Mọi chỉ số nguyên tử viết đúng dạng `<sub>`, không dùng dấu `=` khi phương trình chưa cân bằng.
- Số nguyên tử trái/phải trong bảng đếm khớp tuyệt đối với hệ số hiển thị ở mọi beat.
- Khung kết luận không chạm dải phụ đề `y ≥ 936px`.
