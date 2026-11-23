# Quy ước vẽ hình nét sơ đồ học thuật Sinh học (EDUVN)

Áp dụng cho tất cả bài hoạt hình HyperFrames (`anim-skills/sinh/`) và giao diện phòng thí nghiệm (`web/src/subjects/sinh/`).

## 1. Phong cách hình ảnh "Giấy học thuật"

- **Nền và nét:** Nền trắng ngà `var(--bg)` (`#FDFCF9`), nét chính mực đậm `var(--ink)` (`#1C1B1A`), nét phụ `var(--ink3)` (`#6D645A`), màu trục nhấn xanh dương học thuật `var(--accent)` (`#2F5D8A`).
- **KHÔNG dùng màu cam làm màu chủ đạo** (chỉ dùng `var(--c-cam)` hiếm khi phân loại phụ thứ 8).
- **Giải phẫu & sinh lí cơ thể:** BẮT BUỘC dùng **hình nét sơ đồ học thuật** (đường viền rõ, mảng tô nhạt `ek-soft-*` với độ trong 12% hoặc nét mảnh 3–6 px). TUYỆT ĐỐI KHÔNG dùng ảnh chụp nội tạng, máu me hay mổ xẻ gây khó chịu cho học sinh.

## 2. Bảng màu phân loại đạt WCAG AA & thân thiện mù màu

Dùng cố định theo vai trò sinh học để học sinh dễ nhận diện xuyên suốt các bài:

| Vai trò sinh học | Biến CSS token | Lớp kit | Ghi chú |
|---|---|---|---|
| Thành phần chính / trục / máu nghèo $\text{O}_2$ / NST cặp 1 | `var(--c-lam)` | `.ek-c-lam`, `.ek-stroke-lam`, `.ek-soft-lam` | Xanh dương học thuật `#2F5D8A` |
| Lục lạp / thực vật / sinh vật sản xuất / alen A | `var(--c-xanhLa)` | `.ek-c-xanhLa`, `.ek-stroke-xanhLa`, `.ek-soft-xanhLa` | Xanh lá `#2B7A3B` |
| Nhân / NST cặp 2 / mARN / dị hợp Aa | `var(--c-tim)` | `.ek-c-tim`, `.ek-stroke-tim`, `.ek-soft-tim` | Tím học thuật `#6F42C1` |
| Máu giàu $\text{O}_2$ / tâm động / bộ ba kết thúc / điểm nhấn cảnh báo | `var(--c-doSon)` | `.ek-c-doSon`, `.ek-stroke-doSon`, `.ek-soft-doSon` | Đỏ son `#B42318` |
| Ti thể / năng lượng ATP / dòng nước | `var(--c-lucLam)` | `.ek-c-lucLam`, `.ek-stroke-lucLam`, `.ek-soft-lucLam` | Lục lam `#0B7285` |
| Bậc tiêu thụ trung gian / sản phẩm phụ (NADH, FADH2) | `var(--c-vangDam)` | `.ek-c-vangDam`, `.ek-stroke-vangDam`, `.ek-soft-vangDam` | Vàng đậm `#8A6200` (đạt AA ≥ 4,5:1) |
| Giới tính cái ♀ / điểm nhấn đặc biệt | `var(--c-hong)` | `.ek-c-hong`, `.ek-stroke-hong`, `.ek-soft-hong` | Hồng đậm `#B8336A` |

**Không bao giờ chỉ dựa vào màu sắc:** Mọi vật thể phân biệt (cặp NST, máu giàu/nghèo $\text{O}_2$, kiểu hình Punnett) đều phải có thêm **hình dáng, kí hiệu chữ hoặc mũi tên hướng**.

## 3. Quy ước chú thích và đường dẫn (Callout & Leader lines)

1. Nhãn chú thích dùng lớp `.ek-label` (cỡ 44 px) hoặc `.ek-note` (cỡ 38 px), tối đa **60 ký tự**, KHÔNG để rớt 1 từ lẻ xuống dòng cuối.
2. Mọi nhãn gắn vào bộ phận hình vẽ đặt `data-ek-for="#id-bo-phan"` và nối bằng đường dẫn `<line class="ek-leader">` (nét 2 px `var(--ink3)`) có chấm đầu nhỏ trên bộ phận.
3. Các đường dẫn **không được cắt chéo nhau**, ưu tiên xếp thẳng hàng theo cột trái hoặc cột phải của sân khấu (lưới 12 cột: hình cột 1–7, chú thích cột 8–12 hoặc đối xứng hai bên).
4. Khoảng cách nhãn tới khung viền tối thiểu 24 px; tuyệt đối không chạm dải phụ đề `y ≥ 936`.

## 4. Quy ước vẽ chính xác định lượng

- **Phân bào:** Số lượng NST vẽ trong SVG PHẢI bằng chính xác giá trị công thức ($2n$ đơn, $2n$ kép, $4n$ đơn, $n$ kép, $n$ đơn). Mỗi NST kép vẽ rõ 2 nhánh crômatit chụm tại chấm tròn tâm động; NST đơn vẽ 1 nhánh hình chữ V/I có 1 chấm tâm động.
- **Tháp năng lượng:** Bề rộng thanh tỉ lệ hợp lí giảm dần từ đáy lên đỉnh (hoặc thang logarit có ghi rõ số liệu năng lượng từng bậc bằng đơn vị kcal/kJ).
- **Camera:** Tối đa **1 chuyển động `EK.camera` chậm (≥ 1,5 s)** mỗi cảnh (dùng cho phóng vào 1 bào quan trong `cau-tao-te-bao`); không phóng to/thu nhỏ giật lặp.
