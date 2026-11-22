---
name: phien-ma-dich-ma
description: Dòng thông tin di truyền ADN → mARN → chuỗi axit amin theo nguyên tắc bổ sung và bảng mã di truyền chuẩn, với khung đọc ribôxôm trượt qua từng bộ ba và lắp ghép axit amin từng bước. Dùng khi giảng về phiên mã, dịch mã và mối quan hệ gen – tính trạng ở lớp 9 và 12. Transcription, translation, mRNA codons, amino acid chain.
license: Proprietary (EDUVN)
metadata:
  ten: "Phiên mã và dịch mã di truyền"
  engine: hf
  mon: sinh
  lop: 9-12
  loai: quy-trinh,dien-bien
  can: buoc>=2
  tranh: "phép lai,lưới thức ăn,chu trình,hệ cơ quan"
  tuKhoa: "phiên mã,dịch mã,ADN,DNA,mARN,mRNA,bộ ba,codon,ribôxôm,axit amin,AUG,UAA,nguyên tắc bổ sung"
  thoiLuong: 14-42
  fallback: dien_giai_tung_buoc
  kit: enter,draw,mark,focus,count,tint
  version: "1"
  nguon: "hf:code-typing,hf:text-match-cut,EK.mark"
  vaiTro: chinh
---

## Khi dùng

- Lời giảng giải thích cơ chế phiên mã từ mạch khuôn ADN ($3' \to 5'$) sang mARN ($5' \to 3'$) theo nguyên tắc bổ sung (A–U, T–A, G–C, C–G).
- Lời giảng minh hoạ dịch mã: ribôxôm trượt trên mARN từ bộ ba mở đầu `AUG`, lắp ghép các axit amin theo bảng mã di truyền chuẩn và dừng tại mã kết thúc (`UAA`, `UAG`, `UGA`).

## Không dùng

- Bài chỉ tính chiều dài hay liên kết hiđrô mà không đi qua trình tự bộ ba.
- Bài về nguyên phân/giảm phân (dùng `phan-bao`) hay lai Mendel (dùng `di-truyen-punnett`).

## Ý sư phạm

Đặt ba băng song song theo trục dọc (mạch khuôn ADN $3' \to 5'$ → phân tử mARN $5' \to 3'$ → chuỗi pôlipeptit) và cho khung đọc dịch chuyển từng bộ ba một để học sinh đối chiếu trực tiếp từng cặp bổ sung và từng axit amin.

- Beat 0 (câu 0): Hiện băng mạch khuôn ADN $3' \to 5'$ chia rõ từng bộ ba (triplet).
- Beat 1 (câu 1): Phiên mã: vẽ liên kết bổ sung và hiện băng mARN $5' \to 3'$ tương ứng từng bộ ba (nhấn A → U).
- Beat 2 (câu 2): Dịch mã: khung ribôxôm trượt qua `AUG` → các bộ ba tiếp theo, lắp từng hạt axit amin và nối liên kết peptit.
- Beat 3 (câu 3): Ribôxôm gặp mã kết thúc (`UAA`/`UAG`/`UGA`), dừng dịch mã và tổng kết số axit amin + số liên kết peptit.

## Dữ liệu lấy từ lời giảng

- Trình tự mạch khuôn ADN ($3' \to 5'$) hoặc trình tự mARN ($5' \to 3'$), chiều hai đầu $3'$ và $5'$.
- Tên các axit amin theo đúng bảng mã di truyền chuẩn và số axit amin / liên kết peptit (tự kiểm 100% qua `server/src/subjects/sinh/geneticCode.ts`).

## Bố cục

- Lưới 12 cột: tiêu đề `y = 64–150`; ba dải ngang căn giữa trên cột 1–12 (`top: 230px`, `410px`, `600px`) tương ứng ADN khuôn, mARN và chuỗi axit amin; thẻ kết luận & bộ đếm nằm tại `top: 760px`.
- Dải lời giảng `y ≥ 936` để trống hoàn toàn.

## Chuyển động

Dùng `EK.enter` mở các bộ ba ADN và mARN tuần tự (`stagger`), `EK.draw` nối đường bổ sung giữa ADN–mARN và liên kết peptit giữa các axit amin, `tl.to(..., { x })` trượt khung ribôxôm mượt qua từng bộ ba, `EK.mark` nhấn mã kết thúc và `EK.count` đếm số axit amin.

## Ví dụ

- `examples/vi-du-1/`: Phiên mã và dịch mã đoạn mạch khuôn ADN `3'-TAC-AAA-GGG-ATT-5'` → mARN `5'-AUG-UUU-CCC-UAA-3'` → chuỗi `Met – Phe – Pro` (3 axit amin sơ khai, 2 liên kết peptit, dừng tại `UAA`).

## Lỗi hay gặp

- Nhầm chiều mạch khuôn ADN ($5' \to 3'$ thay vì $3' \to 5'$) dẫn đến sai toàn bộ bảng mã dịch ra.
- Đếm bộ ba kết thúc (`UAA`/`UAG`/`UGA`) thành một axit amin (sai sinh học — mã kết thúc KHÔNG mã hoá axit amin).
- Tra sai bảng mã di truyền chuẩn.

## Checklist

Xem `checklist.json`. Kiểm bằng mắt: ghi rõ chiều $3'$–$5'$ và $5'$–$3'$, mỗi cặp bổ sung ADN–mARN thẳng cột dọc, mỗi axit amin khớp đúng bảng mã chuẩn, dừng đúng mã kết thúc.
