---
name: gio-mua-khi-hau
description: Hoạt động của hai mùa gió chính ở Việt Nam trên bản đồ 34 tỉnh (kèm Hoàng Sa, Trường Sa): Gió mùa Đông Bắc (T11–T4, xanh lam) bị chặn tại dãy Bạch Mã (16°B) và Gió mùa Tây Nam (T5–T10, lục lam / hiệu ứng phơn đỏ son ở Đông Trường Sơn). Monsoon winds animation Vietnam map.
license: Proprietary (EDUVN)
metadata:
  ten: "Gió mùa và phân hoá khí hậu"
  engine: hf
  mon: dia
  lop: 6-12
  loai: ban-do,dia-danh,nhan-qua
  can: dia-danh>=1
  tranh: "tháp dân số,cơ cấu GDP,di cư"
  tuKhoa: "gió mùa,Đông Bắc,Tây Nam,Bạch Mã,đèo Hải Vân,hiệu ứng phơn,gió Lào,khí hậu nhiệt đới ẩm gió mùa"
  thoiLuong: 14-40
  fallback: so_do_quy_trinh
  kit: map,arrow,enter,exit,mark,focus
  version: "1"
  nguon: "hf:us-map-flow,Atlat Địa lí Việt Nam trang 9,NaturalEarth _vnm"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giải thích cơ chế hoạt động và hệ quả của Gió mùa Đông Bắc (mùa đông) và Gió mùa Tây Nam (mùa hạ) tại Việt Nam.
- Giải thích vai trò bức chắn địa hình của dãy Bạch Mã (vĩ tuyến 16°B) và dãy Trường Sơn (hiệu ứng phơn khô nóng ở Bắc Trung Bộ).

## Không dùng
- Phân tích bảng số liệu nhiệt – mưa 12 tháng của một trạm cụ thể (dùng `bieu-do-nhiet-am`).
- Luồng di cư dân cư hay thương mại (dùng `ban-do-luong`).

## Ý sư phạm
Tách rạch ròi 2 mùa gió bằng mã màu (lam = lạnh Đông Bắc, lục lam/đỏ son = ẩm và phơn Tây Nam) trên cùng bản đồ Việt Nam để học sinh hiểu trực tiếp nguyên nhân phân hoá khí hậu Bắc – Nam và Đông – Tây.
- Beat 0 (câu 0): Hiện bản đồ Việt Nam 34 tỉnh/thành cùng Hoàng Sa, Trường Sa và đánh dấu ranh giới Bạch Mã (16°B).
- Beat 1 (câu 1): Vẽ mũi tên Gió mùa Đông Bắc (T11–T4) thổi từ Đông Bắc tràn xuống miền Bắc.
- Beat 2 (câu 2): Nhấn bức chắn dãy Bạch Mã (đèo Hải Vân) làm gió lạnh suy yếu, tạo sự phân hoá Bắc – Nam.
- Beat 3 (câu 3): Chuyển sang mùa hạ (T5–T10): vẽ mũi tên Gió mùa Tây Nam gây mưa lớn Nam Bộ – Tây Nguyên và hiệu ứng phơn khô nóng ở Bắc Trung Bộ.
- Beat 4 (câu 4): Thẻ tổng kết hai mùa gió đối lập định hình khí hậu Việt Nam.

## Dữ liệu lấy từ lời giảng
- Thời gian hoạt động từng mùa gió (T11–T4 và T5–T10), địa danh chắn gió (`bach-ma`, `deo-hai-van`, `ha-noi`, `tp-ho-chi-minh`, `vinh`).

## Bố cục
- Cột 1–6 (`ek-col-1 ek-span-6`): Bản đồ Việt Nam `data-ek-map="vn34"` (828×780 px) kèm các mũi tên gió mùa cong mượt.
- Cột 7–12 (`ek-col-7 ek-span-6`): Tiêu đề và các thẻ phân tích Gió mùa Đông Bắc, ranh giới Bạch Mã, Gió mùa Tây Nam.

## Chuyển động
Vẽ luồng gió mùa Đông Bắc bằng `EK.arrow`, làm mờ nhẹ khi chuyển sang mùa hạ rồi vẽ luồng Gió mùa Tây Nam bằng `EK.arrow` để tránh rối hai hệ mũi tên cùng lúc.

## Ví dụ
Xem `examples/vi-du-1/`: Cơ chế Gió mùa Đông Bắc (T11–T4) và Gió mùa Tây Nam (T5–T10) với bức chắn Bạch Mã – Trường Sơn.

## Lỗi hay gặp
- Vẽ cùng lúc hai hệ gió mùa Đông Bắc và Tây Nam chồng chéo nhau không giảm mờ mùa trước.
- Bỏ sót Quần đảo Hoàng Sa, Trường Sa trên bản đồ khí hậu Việt Nam.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: hướng mũi tên đúng thực tế khí tượng, ranh giới 16°B đặt đúng Huế – Đà Nẵng, có Hoàng Sa và Trường Sa.
