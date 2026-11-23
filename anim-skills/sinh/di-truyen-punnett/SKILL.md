---
name: di-truyen-punnett
description: Bảng Punnett điền dần từng ô kết hợp giao tử bố mẹ, tô màu phân loại mù màu theo kiểu hình và đếm tăng dần tỉ lệ kiểu gen, tỉ lệ kiểu hình. Dùng cho phép lai Mendel 1 hoặc 2 cặp tính trạng, trội không hoàn toàn, liên kết giới tính X. Punnett square, Mendelian genetics, genotype phenotype ratio.
license: Proprietary (EDUVN)
metadata:
  ten: "Bảng Punnett và tỉ lệ di truyền"
  engine: hf
  mon: sinh
  lop: 9-12
  loai: xac-suat,so-lieu,so-sanh
  can: so>=2
  tranh: "định nghĩa,chu trình,cấu tạo tế bào,phân bào"
  tuKhoa: "Punnett,Mendel,phép lai,kiểu gen,kiểu hình,giao tử,Aa,F1,F2,tỉ lệ,trội,lặn,liên kết giới tính"
  thoiLuong: 14-40
  fallback: so_sanh_bang
  kit: enter,mark,count,focus,fill
  version: "1"
  nguon: "cũ:so_sanh_bang,EK.count"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng giải bài tập phép lai Mendel một cặp hoặc hai cặp gen (đậu Hà Lan $Aa \times Aa$, $AaBb \times AaBb$, lai phân tích).
- Phép lai trội không hoàn toàn ($1:2:1$) hoặc di truyền liên kết giới tính trên NST $X$ ($X^A X^a \times X^A Y$).

## Không dùng

- Phép lai nhiều hơn 3 cặp gen (> 64 ô Punnett, nên dùng sơ đồ nhân xác suất độc lập).
- Bài giải thích phân bào (dùng `phan-bao`) hoặc dịch mã (dùng `phien-ma-dich-ma`).

## Ý sư phạm

Hiển thị sơ đồ bố mẹ $P$ và các giao tử ở hàng/cột trước, rồi điền dần từng ô giao điểm bảng Punnett trước khi đếm lên tỉ lệ kiểu gen và tỉ lệ kiểu hình ở cột phải.

- Beat 0 (câu 0): Hiện tiêu đề, sơ đồ $P$ và các giao tử $G_P$ trên hàng đầu và cột trái bảng Punnett.
- Beat 1 (câu 1): Điền lần lượt các ô tổ hợp trong bảng Punnett kèm kiểu gen và nhãn kiểu hình ngắn gọn.
- Beat 2 (câu 2): Làm nổi nhóm kiểu gen đồng nhất và đếm lên tỉ lệ kiểu gen ($1:2:1$ hoặc tương ứng).
- Beat 3 (câu 3): Gộp nhóm theo kiểu hình và đếm tỉ lệ phần trăm kiểu hình (ví dụ 75% vàng : 25% xanh).

## Dữ liệu lấy từ lời giảng

- Kiểu gen bố mẹ $P$, quy ước alen trội/lặn và chế độ trội (hoàn toàn, không hoàn toàn hay liên kết giới tính).
- Danh sách giao tử, từng ô tổ hợp $F_1$, tỉ lệ kiểu gen và tỉ lệ kiểu hình (tự kiểm lại khớp `server/src/subjects/sinh/mendel.ts`).

## Bố cục

- Lưới 12 cột: tiêu đề và sơ đồ $P$ trên `y = 64–200`; bảng Punnett đặt cột 1–6 (`top: 250px`), thẻ tỉ lệ kiểu gen và tỉ lệ kiểu hình có thanh tỉ lệ đặt cột 7–12 (`top: 250px`).
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.enter` mở khung bảng và giao tử theo thứ tự, sau đó điền từng ô bằng `EK.enter(..., { from: "scale" })`, dùng `EK.mark` nhấn kiểu hình trội/lặn và `EK.count` đếm tỉ lệ phần trăm ở bảng kết quả. Không dùng `EK.camera`.

## Ví dụ

- `examples/vi-du-1/`: Phép lai Mendel một cặp tính trạng $Aa \times Aa$ ở đậu Hà Lan (KHTN 9, kiểu gen $1:2:1$, kiểu hình $3:1$, 75% hạt vàng : 25% hạt xanh).

## Lỗi hay gặp

- Viết ngược thứ tự alen (`aA` thay vì `Aa`).
- Tổng tỉ lệ phần trăm các kiểu gen hoặc kiểu hình khác 100%.
- Chỉ dùng màu để phân biệt kiểu hình mà thiếu nhãn chữ trong ô Punnett (vi phạm trợ năng mù màu).

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: mọi ô Punnett có đủ kiểu gen và kiểu hình, tổng phần trăm = 100%, tỉ lệ đếm khớp đúng phép tính `crossMendel`, chữ ≥ 36 px không đè nhau.
