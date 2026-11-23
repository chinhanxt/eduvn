---
name: cau-truc-phan-tu
description: Hoạt hình công thức cấu tạo phân tử 2D dựng chính xác từ chuỗi SMILES bằng thư viện smilesDrawer (MIT), vẽ dần khung mạch carbon, gắn dị tố O/N và tô nổi từng nhóm chức đặc trưng (–OH, –CHO, –COOH, –COO–, –NH₂, vòng thơm). Dùng cho Hoá học hữu cơ 9–12 CTGDPT 2018. Molecular 2D structure from SMILES, smilesDrawer, functional groups highlighting.
license: Proprietary (EDUVN)
metadata:
  ten: "Cấu trúc phân tử 2D và nhóm chức"
  engine: hf
  mon: hoa
  lop: 9-12
  loai: dinh-nghia,tu-khoa
  can: cong-thuc>=1
  tranh: "cân bằng phương trình,bảng tuần hoàn,chuẩn độ"
  tuKhoa: "công thức cấu tạo,phân tử 2D,SMILES,nhóm chức,hữu cơ,carboxyl,hydroxyl,amino,ester,benzene,liên kết"
  thoiLuong: 13-32
  fallback: the_ghi_nho
  kit: enter,draw,mark,focus,fill,tint
  version: "1"
  nguon: "smilesDrawer(MIT),hf:svg-stroke-trace,hf:vox-annotate"
  vaiTro: chinh
---

## Khi dùng
- Lời giảng giới thiệu công thức cấu tạo 2D, nhận diện nhóm chức hoặc giải thích tính chất hoá học dựa trên cấu tạo phân tử hữu cơ (alcohol, aldehyde, carboxylic acid, ester, amine, amino acid, glucose).
- Cần tô nổi từng nhóm chức trên cùng một phân tử đa chức hoặc tạp chức (vd amino acid có cả `–NH₂` và `–COOH`).

## Không dùng
- Cảnh chỉ cân bằng phương trình phản ứng (dùng `can-bang-phuong-trinh`).
- Cảnh mô tả cấu tạo hạt nhân và vỏ nguyên tử đơn lẻ (dùng `mo-hinh-nguyen-tu`).
- Tuyệt đối không dùng cho chất nổ, chất độc cấm hoặc phân tử ngoài phạm vi SGK.

## Ý sư phạm
Dựng hình học 2D chuẩn xác từ SMILES bằng smilesDrawer trước để học sinh nắm khung phân tử, rồi lần lượt khoanh tô từng nhóm chức gắn với tính chất hoá học tương ứng.
- Beat 0 (câu 0): Hiện tên gọi IUPAC 2018, công thức phân tử, SMILES và vẽ khung liên kết 2D dựng từ smilesDrawer.
- Beat 1 (câu 1): Khoanh tô nhóm chức thứ nhất (vd nhóm amino `–NH₂`, màu xanh lam) và giải thích tính chất đặc trưng (tính base).
- Beat 2 (câu 2): Khoanh tô nhóm chức thứ hai (vd nhóm carboxyl `–COOH`, màu đỏ son) và giải thích tính chất tương ứng (tính acid).
- Beat 3 (câu 3): Kết hợp hai vùng nhấn mạnh để chốt tính chất tổng hợp (tính lưỡng tính) cùng ghi chú an toàn SGK.

## Dữ liệu lấy từ lời giảng
- Tên IUPAC tiếng Việt (CTGDPT 2018), công thức phân tử, khối lượng mol (tính từ `formula.ts`) và chuỗi SMILES đã kiểm từ `server/src/subjects/hoa/molecules.ts`.
- Toạ độ 2D của các liên kết và nguyên tử dựng tất định bằng `smiles-drawer` (MIT) qua bộ tiền xử lý `smiles-preprocess.mjs` (AI không tự bịa toạ độ phân tử).

## Bố cục
- Bố cục 2 cột: trái (`ek-col-1 ek-span-5`) chứa thẻ danh pháp + công thức + thẻ phân tích từng nhóm chức; phải (`ek-col-7 ek-span-6`, `top:216px`, cao `670px`) chứa sân khấu SVG công thức cấu tạo 2D cỡ lớn kèm vùng tô nhóm chức mềm (alpha 0,14).
- Để trống dải phụ đề `y ≥ 936px`.

## Chuyển động
Vẽ khung liên kết bằng `EK.draw`, hiện ký hiệu nguyên tố bằng `EK.enter`, sau đó lần lượt khoanh sáng từng nhóm chức bằng `EK.enter` + `EK.draw` vòng bao và `EK.mark` tiêu đề thẻ tính chất bên trái.

## Ví dụ
Xem `examples/vi-du-1/` — cấu tạo 2D của **2-Aminopropanoic acid (Alanine)** (`SMILES: CC(N)C(=O)O`, dựng từ smilesDrawer MIT), tô nhóm amino `–NH₂` và nhóm carboxyl `–COOH` (15 giây).

## Lỗi hay gặp
- Tự đoán toạ độ nguyên tử bằng tay khiến góc liên kết sai lệch thay vì dùng `smilesDrawer`.
- Dùng màu nguyên tố ngoài bảng token (phải quy đổi C → `--ink`, O → `--c-doSon`, N → `--c-lam`, halogen → `--c-xanhLa`).
- Ký hiệu nguyên tử trên hình phân tử nhỏ hơn 36 px.

## Checklist
Xem `checklist.json`. Kiểm tra bằng mắt:
- Hình học phân tử 2D khớp chính xác với chuỗi SMILES và công thức phân tử.
- Nhóm chức được khoanh đúng nguyên tử và liên kết tương ứng, không che chữ ký hiệu nguyên tố.
- Tên gọi chuẩn danh pháp IUPAC tiếng Việt theo CTGDPT 2018.
