---
name: mat-cat-dia-hinh
description: Lát cắt địa hình dọc tuyến A–B theo Atlat Địa lí Việt Nam trang 13–14: vẽ dần đường địa hình theo độ cao thực (m) từ mực nước biển 0 m, tô khối núi/cao nguyên/đồng bằng, gắn tên đỉnh núi và thung lũng sông lớn (Fansipan 3.143 m, sông Đà, sông Hồng). Elevation cross-section profile, terrain relief animation.
license: Proprietary (EDUVN)
metadata:
  ten: "Mặt cắt địa hình A–B"
  engine: hf
  mon: dia
  lop: 6-12
  loai: dia-danh,so-lieu,ham-so
  can: dia-danh>=2,so>=2
  tranh: "nhiệt ẩm,cơ cấu,tháp dân số"
  tuKhoa: "mặt cắt địa hình,lát cắt địa hình,độ cao,Fansipan,Hoàng Liên Sơn,hướng nghiêng,Tây Bắc Đông Nam,Atlat trang 13"
  thoiLuong: 12-35
  fallback: do_thi_ham_so
  kit: chart,draw,enter,mark,count
  version: "1"
  nguon: "hf:mk-line-graph,Atlat Địa lí Việt Nam trang 13–14"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng phân tích lát cắt địa hình A–B trong Atlat trang 13–14 (Tây Bắc – Đông Nam qua Hoàng Liên Sơn; vĩ tuyến 14°B qua Tây Nguyên ra Biển Đông…).
- Chứng minh hướng nghiêng chung của địa hình Việt Nam (cao ở Tây Bắc, thấp dần ra Đông Nam) hoặc sự phân bậc địa hình theo độ cao.

## Không dùng
- Phân bố mật độ dân số hay hành chính theo tỉnh (dùng `ban-do-chu-de`).
- Biểu đồ khí hậu 12 tháng (dùng `bieu-do-nhiet-am`).

## Ý sư phạm
Vẽ đường mặt cắt liên tục từ điểm đầu A (vùng núi cao) trượt dần xuống điểm cuối B (mực nước biển 0 m) để học sinh cảm nhận trực quan độ dốc và các bậc địa hình.
- Beat 0 (câu 0): Khung trục độ cao 0–3.500 m và tuyến cắt A (Tây Bắc) → B (Đông Nam).
- Beat 1 (câu 1): Vẽ đường mặt cắt nâng vọt lên đỉnh Fansipan 3.143 m (Hoàng Liên Sơn).
- Beat 2 (câu 2): Tiếp tục đường cắt hạ qua thung lũng sông Hồng, vùng trung du rồi phẳng ra Đồng bằng sông Hồng (12 m) và mực biển 0 m.
- Beat 3 (câu 3): Kết luận địa hình phân bậc rõ và nghiêng theo hướng Tây Bắc – Đông Nam.

## Dữ liệu lấy từ lời giảng
- Danh sách điểm mốc dọc lát cắt: tên địa danh (khớp `dia-danh.json` khi có), khoảng cách tương đối (km) và độ cao tuyệt đối (m) so với mực nước biển 0 m.

## Bố cục
- Cột 1–12 (`ek-col-1 ek-span-12`): Lát cắt địa hình rộng toàn sân khấu (1680×500 px) đặt tại `top: 230px`, bên dưới là 2 thẻ nhận xét đối xứng (cột 1–6 và cột 7–12) nằm trên y = 900.

## Chuyển động
Vẽ nét đường địa hình từ trái sang phải bằng `EK.draw`, tô khối đất nhạt bằng `EK.enter`, sau đó bật nhãn đỉnh núi và độ cao đúng nhịp lời giảng.

## Ví dụ
Xem `examples/vi-du-1/`: Mặt cắt địa hình hướng Tây Bắc – Đông Nam từ biên giới Việt – Trung qua đỉnh Fansipan (3.143 m) xuống Đồng bằng sông Hồng ra Biển Đông.

## Lỗi hay gặp
- Trục độ cao không bắt đầu từ 0 m (mực nước biển).
- Nhãn tên đỉnh núi và thung lũng nằm sát nhau gây chồng chữ.

## Checklist
Xem `checklist.json`. Kiểm bằng mắt: đỉnh Fansipan cao nhất khớp đúng thang 3.143 m, mực 0 m hiển thị rõ, không đè chữ.
