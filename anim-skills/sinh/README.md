# Kho skill hoạt hình môn Sinh học (`anim-skills/sinh/`)

Gồm **8 skill hoạt hình HyperFrames** theo phong cách "Giấy học thuật" (`tokens.json` v2) và hợp đồng Studio hoạt hình EDUVN (`origin/anim-s1: docs/anim-studio/`), bám sát CTGDPT 2018 (KHTN 6–9 & Sinh học 10–12).

| ID | Tên skill | Lớp | Hoạt cảnh chính | Fallback |
|---|---|---|---|---|
| `chu-trinh-sinh-hoc` | Chu trình sinh học | 6–12 | Vòng tuần hoàn (Krebs, Calvin, nitơ, nước), chấm chạy quanh vòng (`EK.follow`) | `so_do_quy_trinh` |
| `phan-bao` | Phân bào (Nguyên phân & Giảm phân) | 9–12 | Biến hình liên tục bằng MorphSVG (`EK.morph`), đếm chính xác NST/crômatit/tâm động | `so_do_quy_trinh` |
| `di-truyen-punnett` | Bảng Punnett và tỉ lệ di truyền | 9–12 | Bảng Punnett điền từng ô, đếm tỉ lệ kiểu gen/kiểu hình (`EK.count`) | `so_sanh_bang` |
| `luoi-thuc-an` | Lưới thức ăn và tháp năng lượng | 7–12 | Lưới thức ăn đúng chiều dòng năng lượng + tháp năng lượng quy tắc 10% (`EK.grow`) | `so_do_quy_trinh` |
| `cau-tao-te-bao` | Cấu tạo tế bào và phóng đại bào quan | 6–10 | Hình nét có nhãn `data-ek-for` + `.ek-leader`, phóng chậm đúng 1 lần (`EK.camera`) | `dien_giai_tung_buoc` |
| `phien-ma-dich-ma` | Phiên mã và dịch mã di truyền | 9–12 | ADN $3' \to 5'$ → mARN $5' \to 3'$ → chuỗi axit amin theo bảng mã chuẩn | `dien_giai_tung_buoc` |
| `he-co-quan` | Sơ đồ hệ cơ quan ở người | 8–11 | Hình giải phẫu nét sơ đồ học thuật sạch, chấm dòng chảy `EK.follow` | `so_do_quy_trinh` |
| `quang-hop-ho-hap` | Quang hợp và hô hấp tế bào | 7–11 | Đối chiếu lục lạp ↔ ti thể với 2 luồng trao đổi chất ngược chiều | `so_sanh_bang` |

## Tài liệu tham chiếu chuyên môn (`references/`)

- `references/thuat-ngu-sgk-2018.md` — Thuật ngữ Sinh học CTGDPT 2018 & phân tầng kiến thức THCS / THPT / Đại học.
- `references/quy-uoc-di-truyen.md` — Kí hiệu di truyền ($P, G_P, F_1, F_2, X^A Y\ldots$), bảng Punnett và bảng mã di truyền.
- `references/quy-uoc-ve-hinh-sinh-hoc.md` — Quy ước hình nét sơ đồ học thuật, bảng màu mù màu và đường dẫn chú thích.
