---
name: dien-phan-pin-dien-hoa
description: Hoạt hình nguyên tắc hoạt động của pin điện hoá (Pin Galvani Zn–Cu) hoặc bình điện phân: mô tả hai điện cực anode/cathode, bán phản ứng oxi hoá và khử, dòng electron di chuyển có hướng trên mạch ngoài (EK.follow), vai trò cầu muối trung hoà điện tích và công thức tính suất điện động chuẩn E°pin. Dùng cho Hoá học 12 CTGDPT 2018. Galvanic cell, electrolysis, anode cathode electron flow, salt bridge.
license: Proprietary (EDUVN)
metadata:
  ten: "Pin điện hoá và điện phân"
  engine: hf
  mon: hoa
  lop: 12-13
  loai: quy-trinh,phuong-trinh-hoa
  can: cong-thuc>=1
  tranh: "bảng tuần hoàn,chuẩn độ,cấu trúc phân tử"
  tuKhoa: "pin điện hoá,pin Galvani,điện phân,anode,cathode,cực âm,cực dương,cầu muối,suất điện động,dòng electron"
  thoiLuong: 15-38
  fallback: so_do_quy_trinh
  kit: enter,draw,follow,count,mark,focus,tint
  version: "1"
  nguon: "hf:arc-motion-path,hf:hw-pipeline"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng trình bày cấu tạo và nguyên tắc hoạt động của pin Galvani (vd Pin Zn–Cu), chiều dịch chuyển của electron trên dây dẫn, vai trò của cầu muối hoặc tính suất điện động chuẩn $E^\circ_{\text{pin}} = E^\circ_{\text{cathode}} - E^\circ_{\text{anode}}$.
- Hoặc bài giảng về sơ đồ điện phân nóng chảy / điện phân dung dịch (quá trình ở cực âm cathode và cực dương anode).

## Không dùng
- Cảnh chỉ cân bằng phương trình oxi hoá – khử không có sơ đồ hai điện cực (dùng `can-bang-phuong-trinh`).
- Cảnh vẽ đường cong chuẩn độ pH (dùng `chuan-do-ph`).

## Ý sư phạm
Tách mạch điện hoá thành hai nửa pin đặt đối xứng kèm cầu muối và dây dẫn mạch ngoài để học sinh theo dõi trọn vẹn đường đi của electron từ cực oxi hoá (anode) sang cực khử (cathode).
- Beat 0 (câu 0): Dựng hai cốc dung dịch ZnSO₄ và CuSO₄, hai thanh điện cực Zn (−) và Cu (+), cầu muối KCl và vôn kế.
- Beat 1 (câu 1): Nhấn cực âm anode Zn — bán phản ứng oxi hoá `Zn(s) → Zn²⁺(aq) + 2e⁻`, hạt electron tách ra đi lên dây dẫn.
- Beat 2 (câu 2): Chấm electron chạy dọc dây dẫn qua vôn kế sang cực dương cathode Cu — bán phản ứng khử `Cu²⁺(aq) + 2e⁻ → Cu(s)`, vôn kế nhảy lên `1,10 V`.
- Beat 3 (câu 3): Cầu muối duy trì trung hoà điện tích; chốt phương trình tổng và công thức $E^\circ_{\text{pin}} = +1{,}10\text{ V}$.

## Dữ liệu lấy từ lời giảng
- Cặp oxi hoá – khử chuẩn (vd `Zn²⁺/Zn` có $E^\circ = -0{,}76\text{ V}$; `Cu²⁺/Cu` có $E^\circ = +0{,}34\text{ V}$).
- Phương trình bán phản ứng và phản ứng tổng đã kiểm cân bằng nguyên tử + điện tích bằng `server/src/subjects/hoa/balancer.ts`.

## Bố cục
- Tiêu đề `.ek-meta` ở `top:64px`, `.ek-title` ở `top:112px`.
- Sân khấu SVG sơ đồ pin điện hoá (`ek-col-1 ek-span-12`, `top:216px`, cao `532px`): cốc anode trái (`x = 90..490`), cầu muối ở giữa (`x = 460..1220`), cốc cathode phải (`x = 1190..1590`), vôn kế trên đỉnh mạch ngoài (`x = 840, y = 78`).
- Thanh tổng kết phương trình tổng & $E^\circ_{\text{pin}}$ đặt ở `top:782px` (cao `110px`, kết thúc `< 900px`), giữ trống dải phụ đề `y ≥ 936px`.

## Chuyển động
Vẽ dây mạch ngoài và cầu muối bằng `EK.draw`, cho 3 hạt electron (`e⁻`) chạy liên tục dọc đường dây `#wirePath` bằng `EK.follow` (MotionPath), đồng thời đếm suất điện động `0,00 → 1,10 V` bằng `EK.count` và hiện từng bán phản ứng đúng nhịp lời giảng.

## Ví dụ
Xem `examples/vi-du-1/` — Pin điện hoá Galvani Zn–Cu ($E^\circ_{\text{pin}} = +1{,}10\text{ V}$, phương trình cân bằng `Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s)`, 16 giây).

## Lỗi hay gặp
- Nhầm dấu cực của pin điện hoá với bình điện phân (trong pin Galvani: anode là cực âm, cathode là cực dương; trong bình điện phân: ngược dấu nhưng anode luôn xảy ra oxi hoá và cathode luôn xảy ra khử).
- Quên cân bằng điện tích trong bán phản ứng hoặc ghi sai dấu khi tính $E^\circ_{\text{pin}}$.

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Chiều chạy electron đi từ anode Zn (−) sang cathode Cu (+).
- Cả hai bán phản ứng và phương trình tổng đều cân bằng nguyên tử và điện tích.
- Giá trị $E^\circ_{\text{pin}} = +0{,}34 - (-0{,}76) = +1{,}10\text{ V}$ hiển thị chính xác.
