# services/video-theme — hệ token video "Giấy học thuật"

Một nguồn cho mọi thứ có hình trong video bài giảng: mẫu HyperFrames (`server/src/services/anim/studio.ts`, `hfStudio.ts`), mẫu Manim (`services/manim/studio.py`, `studio_toan.py`), cảnh slide. Đổi `tokens.json` là đổi cả hai engine.

## Nội dung `tokens.json`
- **canvas** 1920×1080, 30 fps. **grid** 12 cột, lề 120 px, rãnh 24 px; đầu cảnh (dòng phân loại y 64, nhãn nhấn y 118, tiêu đề từ y 168); thân cảnh tới y 900; đường kẻ mảnh y 936 + dòng lời giảng y 962 (vùng phụ đề, không đặt hình).
- Bố cục: `split` (cột 1–5 chữ + thẻ ghi chú, cột 7–12 hình) hoặc `wide` (tiêu đề một dòng, hình cả bề ngang).
- **type**: Inter (giao diện, nhãn, số) + Source Serif 4 (tiêu đề, dòng giảng); tối thiểu 36 px (trừ dòng phân loại in hoa 30 px chỉ để định hướng). Công thức KaTeX/LaTeX cùng màu mực.
- **themes.giay**: nền giấy trắng ngà `#FDFCF9`, ô/hình nền `#F5F2EA`, viền `#E6DECC`, mực `#1C1B1A` (17,0:1), mực phụ `#3E3B37`, chữ mờ `#6D645A` (5,9:1), nhấn xanh dương học thuật `#2F5D8A` (6,7:1).
- **palette** (màu vật thể, tất cả ≥ 4,5:1 trên nền): lam `#2F5D8A` 6,7 · lục lam `#0B7285` 5,4 · xanh lá `#2B7A3B` 5,2 · tím `#6F42C1` 6,4 · đỏ son `#B42318` 6,4 · vàng đậm `#8A6200` 5,4 · hồng `#B8336A` 5,5 · cam `#B4530A` 4,9 (chỉ màu phụ hiếm, không có trong tổ hợp).
- **combos** (mỗi đại lượng giữ một màu suốt cảnh; mỗi khuôn chọn một tổ hợp khác nhau cho đỡ đơn điệu). Khoảng cách màu nhỏ nhất giữa mọi cặp khi mô phỏng mù màu đỏ–lục (Machado 2009, deuteranopia/protanopia, ΔE CIELAB): `coDien` [lam, xanhLa, tim, doSon] 16,1 · `bienLam` [lucLam, tim, doSon, xanhLa] 16,1 · `hoaTim` [lam, tim, xanhLa, hong] 15,3.
- **motion**: vào `expo.out` 0,75 s + trượt 22 px; nút/nhãn số kiểu lò xo nhẹ `back.out(1.4)`; biến đổi `power3.inOut` 1,2 s; vẽ nét 1,1 s; chữ hiện theo từng từ (stagger 0,05 s); làm mờ phần không giảng còn 0,3–0,5; mỗi cảnh một chuyển động chậm (tia quay, đường cong vẽ, đường nối bước lớn dần) — không zoom, không nháy. Lịch beat: chia phần thân (trừ ~0,9 s mở đầu và ≤ 2,6 s giữ kết) theo trọng số beat; trong beat rải 2–4 hành động để không có khoảng lặng > 4 s.

## Phông
`fonts/`: Inter 4.001 (400/600/700) và Source Serif 4 4.004 (400/600) cắt từ phông biến thiên google/fonts (tải 2026-11-11), giữ Latin + tiếng Việt + ký hiệu toán. Giấy phép SIL OFL 1.1 (`fonts/OFL-*.txt`).
