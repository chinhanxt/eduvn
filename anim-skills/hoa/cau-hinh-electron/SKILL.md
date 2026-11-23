---
name: cau-hinh-electron
description: Hoạt hình điền electron vào các ô lượng tử (orbital) theo đúng ba quy tắc: nguyên lý vững bền Aufbau, nguyên lý loại trừ Pauli (tối đa 2e ngược spin) và quy tắc Hund (điền độc thân trước khi ghép đôi). Dùng cho bài giảng Hoá học 10 về cấu trúc lớp vỏ nguyên tử và viết cấu hình electron theo số hiệu Z. Electron configuration, orbital box filling, Aufbau Pauli Hund.
license: Proprietary (EDUVN)
metadata:
  ten: "Cấu hình electron và ô orbital"
  engine: hf
  mon: hoa
  lop: 10-12
  loai: quy-trinh,cong-thuc
  can: so>=1
  tranh: "phương trình phản ứng,bản đồ,biểu đồ"
  tuKhoa: "cấu hình electron,orbital,ô lượng tử,Aufbau,Pauli,Hund,phân lớp,s p d f,độc thân,spin"
  thoiLuong: 14-35
  fallback: dien_giai_tung_buoc
  kit: enter,draw,mark,focus,tint
  version: "1"
  nguon: "hf:locked-nucleus-orbit,manim-Chemistry(ý)"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giải thích cách viết cấu hình electron hoặc biểu diễn ô lượng tử (orbital) của một nguyên tố có số hiệu Z cụ thể (vd O, N, Na, Fe, Cr, Cu).
- Cần minh hoạ trực quan quy tắc Hund (điền từng mũi tên song song vào các ô cùng phân lớp trước khi ghép đôi) và nguyên lý Pauli (hai mũi tên ngược chiều trong một ô).
- So sánh số electron độc thân hoặc phân biệt lớp vỏ ngoài cùng.

## Không dùng
- Cảnh chỉ liệt kê xu hướng bảng tuần hoàn trên nhiều nguyên tố (dùng `bang-tuan-hoan-xu-huong`).
- Cảnh mô phỏng va chạm phân tử hoặc cân bằng phương trình hoá học.

## Ý sư phạm
Dựng thang năng lượng các phân lớp `1s → 2s → 2p → 3s → ...` để từng electron xuất hiện theo đúng thứ tự Aufbau, Hund và Pauli, đồng thời chốt chuỗi cấu hình chuẩn bên trái.
- Beat 0 (câu 0): Giới thiệu nguyên tố (Z, tổng số electron) và dựng thang năng lượng cùng các ô orbital trống.
- Beat 1 (câu 1): Điền các phân lớp bên trong (`1s`, `2s`) minh hoạ nguyên lý Aufbau và Pauli (`↑↓`).
- Beat 2 (câu 2): Điền phân lớp ngoài cùng (`2p` hoặc `3d`) lần lượt từng ô theo quy tắc Hund (`↑ ↑ ↑`), sau đó mới ghép đôi spin ngược chiều.
- Beat 3 (câu 3): Khoanh vùng các electron độc thân và chốt cấu hình electron hoàn chỉnh.

## Dữ liệu lấy từ lời giảng
- Ký hiệu nguyên tố, tên IUPAC 2018 và số hiệu nguyên tử Z.
- Phân bố electron từng phân lớp và trạng thái từng ô orbital lấy từ bộ tính tất định `server/src/subjects/hoa/electronConfig.ts` (đảm bảo đúng cả các ngoại lệ Cr, Cu).

## Bố cục
- Bố cục 2 cột trên lưới 12 cột: cột 1–5 (`ek-col-1 ek-span-5`) chứa thẻ nguyên tố, thẻ quy tắc và thẻ cấu hình kết quả; cột 7–12 (`ek-col-7 ek-span-6`) chứa sân khấu SVG thang năng lượng và các ô orbital (`y: 210–870`).
- Ô orbital kích thước tối thiểu `88×88 px`, nhãn phân lớp ≥ 40 px; để trống dải phụ đề `y ≥ 936px`.

## Chuyển động
Vẽ trục năng lượng và khung các ô orbital bằng `EK.draw`, sau đó vẽ từng mũi tên electron `↑` / `↓` nối tiếp nhau theo đúng thứ tự bước điền, kết hợp `EK.enter` cho thẻ quy tắc bên trái và `EK.mark` nhấn cặp/electron độc thân ở beat cuối.
- Mỗi electron cách nhau 0,3–0,45 s để mắt kịp theo dõi thứ tự Hund.

## Ví dụ
Xem `examples/vi-du-1/` — điền 8 electron cho nguyên tử Oxygen (`Z = 8`, `1s² 2s² 2p⁴`, 2 electron độc thân, 16 giây).

## Lỗi hay gặp
- Ghép đôi ở ô `2p` đầu tiên trước khi điền hết các ô cùng phân lớp (vi phạm quy tắc Hund).
- Viết sai mũi tên cùng chiều trong một ô (vi phạm nguyên lý Pauli).
- Quên sắp xếp cấu hình kết quả theo thứ tự lớp (`3d` trước `4s`) với nguyên tố Z ≥ 21.

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Tổng số mũi tên electron khớp chính xác với Z.
- Quy tắc Hund và Pauli thể hiện rõ ràng, phân biệt màu mũi tên ghép đôi và độc thân bằng màu token.
- Không đè nhãn phân lớp lên khung ô orbital.
