# Bảng mã di truyền chuẩn (64 bộ ba mARN, chiều 5' → 3')

Tài liệu đối chiếu nhanh cho skill `phien-ma-dich-ma` (khớp 100% `server/src/subjects/sinh/geneticCode.ts`).

| Chữ thứ nhất | U | C | A | G | Chữ thứ ba |
|---|---|---|---|---|---|
| **U** | UUU Phe · UUC Phe · UUA Leu · UUG Leu | UCU Ser · UCC Ser · UCA Ser · UCG Ser | UAU Tyr · UAC Tyr · **UAA Stop** · **UAG Stop** | UGU Cys · UGC Cys · **UGA Stop** · UGG Trp | U / C / A / G |
| **C** | CUU Leu · CUC Leu · CUA Leu · CUG Leu | CCU Pro · CCC Pro · CCA Pro · CCG Pro | CAU His · CAC His · CAA Gln · CAG Gln | CGU Arg · CGC Arg · CGA Arg · CGG Arg | U / C / A / G |
| **A** | AUU Ile · AUC Ile · AUA Ile · **AUG Met (Mở đầu)** | ACU Thr · ACC Thr · ACA Thr · ACG Thr | AAU Asn · AAC Asn · AAA Lys · AAG Lys | AGU Ser · AGC Ser · AGA Arg · AGG Arg | U / C / A / G |
| **G** | GUU Val · GUC Val · GUA Val · GUG Val | GCU Ala · GCC Ala · GCA Ala · GCG Ala | GAU Asp · GAC Asp · GAA Glu · GAG Glu | GGU Gly · GGC Gly · GGA Gly · GGG Gly | U / C / A / G |

## Lưu ý dịch mã chuẩn SGK 2018

- Phiên mã từ mạch khuôn ADN ($3' \to 5'$) sang mARN ($5' \to 3'$): $A \to U,\ T \to A,\ G \to C,\ C \to G$.
- Ribôxôm luôn bắt đầu dịch mã từ bộ ba mở đầu `AUG` (Met) và dừng ngay khi gặp 1 trong 3 bộ ba kết thúc (`UAA`, `UAG`, `UGA`).
- Bộ ba kết thúc **không** mã hoá axit amin; số liên kết peptit trong chuỗi sơ khai bằng $(\text{số axit amin sơ khai} - 1)$.
