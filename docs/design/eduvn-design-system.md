# EDUVN v2 — Hệ thiết kế + kiến trúc frontend

> Bản 2026-11-10, chờ chinhan duyệt. Token: `web/mockup/v2/tokens.css` · thành phần: `web/mockup/v2/ui.css`, `ui.js`, `charts.js`, `icons.js` · mockup: `web/mockup/v2/index.html`.
> Căn cứ số đo: `docs/research/2026-11-10-ui-survey.md` (26 trang, REA + Playwright). Mỗi quyết định dưới đây ghi **vì sao**.

## 0. Quyết định chính

| # | Quyết định | Vì sao |
|---|---|---|
| D1 | **Hai cổng riêng**: `/gv/*` (Giáo viên/Giảng viên) và `/hoc/*` (Học sinh/Sinh viên), hai layout, hai entry build, chung gói `ui/` | Hai nhóm khác thiết bị (GV máy tính, HS điện thoại), khác mật độ (GV bảng dày, HS một việc mỗi lúc), khác điều hướng (GV ~12 công cụ → thanh bên; HS 5 điểm đến → tab dưới). Ẩn/hiện theo quyền buộc HS tải code GV và giữ khung GV. |
| D2 | **Nhấn theo cổng**: GV chàm `#3346D1`, Học xanh lục lam `#0B7466`; mọi thứ khác dùng chung | Người dùng (nhất là GV kiêm xem bài HS) biết ngay mình đang ở cổng nào; một biến `--accent` đổi cả cổng. |
| D3 | **Inter** cho giao diện, **Source Serif 4** cho tiêu đề trang + nội dung đọc (đề thi, lời gia sư, lời giải) | Đo: Be Vietnam Pro không có số tabular (bật `tnum` không đổi bề rộng); Inter có, biến thiên 1 tệp/subset, có subset tiếng Việt. Serif cho nội dung theo mẫu Distill/colah/OWID — tách "đang đọc" khỏi "đang thao tác". |
| D4 | **Phẳng, viền sợi tóc, bo nhỏ** (4/6/10/14), bóng chỉ cho lớp nổi | ĐH/lab bo 2–6 px; thẻ bóng đổ + bo 16 px của bản cũ làm mọi khối "nổi" như nhau → mất thứ bậc. |
| D5 | **Thanh bên sáng** (nền lõm `#F5F6F8`) thay thanh bên chàm đậm | Khối đậm 240 px chiếm sự chú ý hơn nội dung; trang lab/ĐH đều để khung nhạt, dữ liệu đậm. Màu nhấn dồn cho mục đang chọn. |
| D6 | **Full width có khung đọc**: bảng/biểu đồ dùng hết chiều ngang, đoạn văn chặn 68ch | Trung vị khảo sát 60 ký tự/dòng; GV cần nhiều cột. |
| D7 | **Một nút chính mỗi vùng**; thao tác đảo ngược được → Hoàn tác (toast), không hộp thoại | Ít ma sát; hộp thoại chỉ cho việc không đảo ngược (xoá lớp, nộp bài). |
| D8 | **Biểu đồ tự vẽ SVG**, không thư viện; mỗi biểu đồ có "Hình n", một câu kết luận, bản bảng | Tiết kiệm ~60–200 KB JS; quy tắc dataviz (cột ≤ 24 px, lưới sợi tóc, nhãn chọn lọc, tooltip + bàn phím). |
| D9 | **URL là trạng thái**: lọc, sắp xếp, trang, tab nằm trong query; chi tiết nằm trong path | Gửi link cho đồng nghiệp ra đúng màn; nút Back đúng; reload không mất. |

## 1. Hai cổng

| | Cổng GV `/gv` | Cổng Học `/hoc` |
|---|---|---|
| Thiết bị chính | Máy tính 1280–1920 | Điện thoại 360–430 |
| Điều hướng | Thanh bên 240 px → 64 px (≤ 1180 px tự thu) → ngăn kéo (≤ 720 px) · breadcrumb · `Ctrl K` | Thanh trên 5 mục (≥ 721 px) · **tab dưới 5 mục** (≤ 720 px) · `Ctrl K` |
| Mục | Hôm nay · Lớp học · Chấm bài · Kết quả · *Soạn:* Ngân hàng · Đề thi · Bài giảng AI · Giáo án · Bảng giảng · Sơ đồ | Hôm nay · Bài tập · Luyện tập · Gia sư · Kết quả |
| Mật độ | Hàng bảng 44 px (dày 36), chữ 14 | Vùng chạm ≥ 44 px, chữ đọc 17–20 |
| Màn đặc biệt | Soạn đề: 2 cột (đầu vào | kết quả đang viết) | Phòng làm bài: **chế độ tập trung** — không menu, chỉ đề + đồng hồ + nộp |
| Nhấn | `#3346D1` | `#0B7466` |

Đăng nhập chung `/dang-nhap`; sau đăng nhập chuyển theo vai trò (teacher/assistant/admin/owner → `/gv`, student → `/hoc`). Người có cả hai vai trò thấy công tắc cổng trong menu tài khoản.

## 2. Token (giá trị đầy đủ trong `tokens.css`)

### 2.1 Màu giao diện — tương phản WCAG (đã tính)

| Token | Sáng | Trên `#FFF` | Tối | Trên nền tối |
|---|---|---|---|---|
| `--ink` | `#121826` | 17,7:1 | `#E9ECF3` | 16,0:1 |
| `--ink-2` | `#4A5266` | 7,8:1 | `#B3B9C7` | 9,6:1 |
| `--ink-3` | `#646C80` | 5,3:1 (4,9:1 trên `--bg-sunken`) | `#8E96A8` | 5,9:1 |
| `--line-input` (viền ô nhập) | `#8C93A3` | 3,1:1 (≥ 3:1 cho thành phần UI) | `#646C82` | ≥ 3:1 |
| `--accent` GV | `#3346D1` | 7,2:1 · chữ trắng trên nó 7,2:1 · trên `--accent-bg` 6,3:1 | `#8B97FF` | 6,7:1 |
| `--accent` Học | `#0B7466` | 5,7:1 · chữ trắng 5,7:1 · trên nền nhạt 5,0:1 | `#3CC2AE` | 8,0:1 |
| `--ok` | `#137A43` | 5,4:1 (4,8:1 trên `--ok-bg`) | `#4FC285` | 7,9:1 |
| `--warn` | `#9A5800` | 5,6:1 (5,1:1 trên `--warn-bg`) | `#E6A23C` | 8,0:1 |
| `--danger` | `#C0302E` | 5,7:1 (5,0:1 trên `--danger-bg`) | `#FF7B72` | 7,0:1 |

Quy tắc: trạng thái luôn **icon + chữ** (không chỉ màu); chữ không bao giờ mang màu dữ liệu; tối là bậc riêng được chọn, không đảo máy móc; `data-theme` thắng `prefers-color-scheme` cả hai chiều.

### 2.2 Màu dữ liệu (chạy `validate_palette.js`)

- **Phân loại** 8 màu, thứ tự cố định (lam, cam, lục lam, vàng, hồng, lục, tím, đỏ). Sáng trên `#FFF`: CVD kề nhau tệ nhất ΔE 9,1 (đạt ≥ 8), thường ΔE 19,6 (≥ 15). Tối trên `#151922`: CVD 8,4, thường 19,3, mọi màu ≥ 3:1. 3 màu đầu đạt cả khi xét mọi cặp (scatter). Lục lam/vàng/hồng < 3:1 trên nền sáng → bắt buộc nhãn trực tiếp hoặc bảng.
- **Tuần tự** một sắc lam `--seq-100…700`. **Thứ bậc NB → TH → VD → VDC** `--lvl-1…4` (bắt đầu từ bước 250 để đầu nhạt ≥ 2:1; đạt kiểm `--ordinal` cả hai chế độ).
- **Phân kỳ** lam ↔ đỏ, giữa xám trung tính. **Giảm nhấn** `--seq-dim` (sáng: lam nhạt; tối: lam đậm — để vẫn lùi về sau).
- Biểu đồ dùng bảng màu dữ liệu, **không** dùng màu nhấn cổng → biểu đồ đọc giống nhau ở hai cổng.

### 2.3 Chữ

| Token | px / dòng | Dùng |
|---|---|---|
| `--fs-xs` | 12/16 | nhãn chữ hoa (eyebrow), chữ trục |
| `--fs-sm` | 13/20 | chú thích, phụ đề hàng |
| `--fs-md` | **14/22** | giao diện mặc định |
| `--fs-lg` | 16/24 | tiêu đề khối, ô soạn tin |
| `--fs-read` | **17/28** | đoạn đọc (serif), `max-width: 68ch` |
| `--fs-xl` | 18/26 | h2 |
| `--fs-2xl` | 22/30 | tiêu đề thẻ lớn |
| `--fs-3xl` | 28/36 | h1 (serif) |
| `--fs-4xl` | 36/44 | con số chính — tối đa 1/màn, số tỉ lệ (không tabular) |

Số trong bảng/trục: `font-variant-numeric: tabular-nums`. Số Việt: dấu phẩy thập phân (6,5), chấm nghìn (1.284). Dòng ≥ 1,3 lần cỡ chữ cho tiêu đề để dấu chồng (Ặ, Ỗ) không chạm dòng trên. Công thức trong app thật: MathLive/KaTeX (font serif không đủ ký hiệu toán, vd ≠ hiển thị kém).

### 2.4 Khoảng cách · lưới · hình khối · lớp · chuyển động

- **Khoảng cách** bước 4, nhịp 8: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64.
- **Lưới** 12 cột, gutter 24 (16 trên di động), lề trang `clamp(16px, 2.5vw, 40px)`; ≤ 1180: cột 7/5 → 12; ≤ 720: mọi khối 12.
- **Bo** 4 chip · 6 nút/ô nhập · 10 thẻ · 14 hộp thoại · 999 chip lọc. **Viền** 1 px.
- **Bóng** chỉ 3 bậc cho popover / hộp thoại / toast.
- **Lớp** sticky 10 · thanh bên 20 · thanh trên 30 · popover 40 · màn che 50 · hộp thoại 60 · toast 70 · tooltip 80.
- **Chuyển động** 90 ms (phản hồi bấm) · 160 ms (popover, toast) · 240 ms (panel, thanh bên) · 320 ms (chuyển trang); `cubic-bezier(.2,.8,.2,1)` vào, `(.4,0,1,1)` ra; danh sách hiện lần đầu trễ 30 ms/hàng, tối đa 6 hàng. `prefers-reduced-motion` → mọi thời lượng 1 ms, tắt shimmer/nháy con trỏ, streaming hiện cả đoạn.
- **Icon** Lucide (ISC), 90 icon trong `icons.js` (kế thừa `web/src/sprite.ts`); id có tiền tố `i-` (tránh trùng id phần tử — đã gặp lỗi `#stop`); cỡ 16 trong nút nhỏ/nhãn, 20 mặc định, 24 trạng thái trống; nét 1,75 (1,5 ở 24).

## 3. Thành phần & trạng thái (`thanh-phan.html`)

| Thành phần | Trạng thái | Quy tắc |
|---|---|---|
| **Nút** | mặc định · rê · tiêu điểm · **đang xử lý** · **xong** · tắt | Đang xử lý: `aria-busy`, khoá con trỏ, giữ bề rộng, vòng quay; xong: ✓ 1,4 s rồi trở lại. Thật: khoá theo promise + gửi `Idempotency-Key` → bấm 5 lần chỉ 1 request. Cỡ 30/36/44. |
| **Ô nhập** | mặc định · rê · tiêu điểm (vòng 3 px nhấn) · lỗi (viền đỏ + câu nói cách sửa) · tắt | Nhãn luôn hiện (không dùng placeholder làm nhãn). |
| **Chip lọc** | tắt · bật (`aria-pressed`) · có nút bỏ | Đổi chip → `history.replaceState` (không làm đầy lịch sử); đổi trang → `pushState`. |
| **Nhãn trạng thái** | ok · warn · danger · accent · trung tính · viền | Luôn có icon 13 px. |
| **Bảng** | đầu bảng dính · hàng rê · hàng chọn · thanh thao tác hàng loạt · sắp xếp (`aria-sort`) · số căn phải | 44 px/hàng (36 dày). Di động: gộp cột phụ vào dòng phụ dưới tên. |
| **Phân trang** | trước/sau tắt · trang hiện tại · "…" | Hiện "21–40 trong 96"; cỡ trang 20/50 trong URL. |
| **Skeleton** | lần tải đầu | Đúng hình nội dung thật; **làm tươi** giữ dữ liệu cũ mờ 55% (không nháy). |
| **Toast** | ok · lỗi · thông tin · có Hoàn tác · có Thử lại | Góc phải dưới (di động: trên thanh tab); tối đa 3, còn lại xếp hàng; 5 s (8 s nếu có Hoàn tác); dừng khi rê; `aria-live=polite`. |
| **Hộp thoại** | xác nhận nguy hiểm | Chỉ cho việc không đảo ngược; nút nguy hiểm màu đỏ, nút an toàn bên trái; Esc đóng. |
| **Bảng lệnh** `Ctrl K` | rỗng · có kết quả · không thấy | Tìm không dấu ("lop" ra "Lớp"); ↑↓ Enter; nhóm Trang/Lớp/Thao tác. |
| **Trống / lỗi / mất mạng** | trống · lọc không ra · lỗi máy chủ · mất mạng | Một câu chuyện gì xảy ra + một việc làm tiếp. Mất mạng: băng vàng dưới thanh trên, dữ liệu lưu máy. |
| **Streaming AI** | chưa rõ độ dài (thanh chạy) · có tiến độ · các bước · con trỏ nháy · đã dừng | Luôn có **Dừng**, giữ phần đã viết; `aria-busy` trên vùng; chữ đến theo cụm mỗi khung hình. |
| **Điều hướng** | thanh bên đầy/thu/ngăn kéo · tab dưới · breadcrumb | Thu gọn nhớ trong `localStorage`; mục hiện tại `aria-current`. |
| **Biểu đồ** | rê · tiêu điểm bàn phím · tooltip · bảng tương đương | Cột ≤ 24 px đầu bo 4 px đáy vuông; lưới 1 px liền; nhãn chọn lọc (cực trị/cuối); chú thích "Hình n" + một câu kết luận. |

## 4. Kiến trúc frontend đề xuất (code sau khi duyệt mockup)

### 4.1 Cấu trúc

```
web/
  gv.html  hoc.html  dang-nhap.html     ← 3 entry Vite (build.rollupOptions.input)
  src/
    ui/            ← gói chung: tokens.css, ui.css, Icon, Button, Table, Toast, Dialog, Cmdk, Skeleton, charts/
    data/          ← query.ts (cache + SWR), sse.ts, action.ts, urlState.ts
    gv/            ← main.tsx, Shell.tsx, routes, pages/
    hoc/           ← main.tsx, Shell.tsx, routes, pages/
```

- Một `vite.config.ts`, ba entry → mỗi cổng một bundle; Rollup tự tách phần chung `ui/` thành chunk dùng chung (cache trình duyệt giữa hai cổng). Server trả `gv.html` cho `/gv/*`, `hoc.html` cho `/hoc/*`. Không cần tên miền con (có thể thêm sau, không đổi code).
- Mã trang hiện có (`web/src/pages/*`, `web/src/hoc/*`) chuyển dần vào `gv/pages`, `hoc/pages` — giữ logic, thay lớp vỏ.

### 4.2 Lớp dữ liệu — tự viết ~150 dòng, không thêm thư viện

`query.ts`: `Map<key, {data, error, ts, promise}>`.
- **Gộp request trùng**: cùng key đang bay → trả cùng promise.
- **SWR**: có dữ liệu → trả ngay, quá `staleMs` (mặc định 30 s) → làm tươi nền (UI mờ nhẹ, không skeleton).
- **Làm tươi** khi tab lấy lại tiêu điểm / có mạng lại; huỷ bằng `AbortController` khi rời màn.
- **Tải trước khi rê/tiêu điểm** link 80 ms (`<Link prefetch>` gọi cùng loader) → mở màn tức thì.
- **Mutation** `action.ts`: khoá nút theo promise, `Idempotency-Key`, cập nhật lạc quan + hoàn tác, toast.
- **Ít request**: mỗi màn **một endpoint gộp** (vd `GET /api/gv/hom-nay` trả việc + lớp + bài chờ chấm + số liệu) thay vì 4–6 lệnh; danh sách phân trang phía server; `ETag`/`304`; font/icon/CSS cache dài hạn theo hash.
- Khi nhu cầu vượt (infinite query phức tạp, devtools) → chuyển TanStack Query (~13 KB gzip); API `useQuery` giữ tương thích.

### 4.3 URL

| Màn | URL |
|---|---|
| Ngân hàng | `/gv/ngan-hang?lop=10&chu-de=ham-so-bac-hai&muc=TH,VD&sap=-ti-le&trang=2` |
| Soạn đề | `/gv/de-thi/moi` → sau lưu `/gv/de-thi/kt-giua-ky-1-toan-10` |
| Kết quả lớp | `/gv/lop/10a1/bai/kt-15p-bpt/ket-qua?to=1` |
| Gia sư | `/hoc/gia-su/dau-tam-thuc-bac-hai` |
| Phòng làm bài | `/hoc/bai/kt-15p-tich-vo-huong/cau/4` |

`useSearchState(key, default)` đồng bộ state ↔ query (replace khi lọc, push khi đổi trang/tab). Slug tiếng Việt không dấu.

### 4.4 Streaming

- Gateway G đã stream SSE; client dùng `fetch` + `ReadableStream` (hỗ trợ POST + header auth, hơn `EventSource`), parse `data:` theo dòng, gom chữ và cập nhật DOM **mỗi khung hình** (`requestAnimationFrame`) để không re-render từng token.
- Nút Dừng = `AbortController.abort()`; server giữ phần đã sinh. Sự kiện `step` cho thanh các bước (Đọc ma trận → Lấy câu → Soạn → Kiểm → Trộn).

### 4.5 Chuyển trang, motion, offline

- React Router `viewTransition` (dùng `document.startViewTransition`) — thanh bên/thanh trên có `view-transition-name` nên đứng yên, chỉ nội dung mờ-trượt 4 px.
- Phòng làm bài: đáp án ghi `localStorage`/IndexedDB mỗi lần chọn, hàng đợi gửi lại với backoff; băng "Mất kết nối" khi `offline` hoặc fetch lỗi mạng.

### 4.6 Ngân sách hiệu năng (đo trong CI bằng báo cáo kích thước `vite build` + Lighthouse cục bộ)

| Chỉ số | Mục tiêu |
|---|---|
| JS lần đầu mỗi cổng | **< 100 KB gzip** (React + router + ui + trang đầu); MathLive, bảng giảng, sơ đồ tải theo màn |
| CSS | < 20 KB gzip |
| Font | Inter biến thiên latin + vietnamese (2 tệp, preload), Source Serif 4 chỉ khi màn có nội dung đọc; `font-display: swap` + `size-adjust` fallback |
| Request lần đầu | ≤ 25; 0 bên thứ ba ở cổng Học |
| LCP | < 1,5 s (điện thoại tầm trung, 4G) |
| INP | < 100 ms |
| CLS | < 0,05 |

## 5. Kiểm đã chạy với mockup

- 11 màn × 1440/1024/390: không tràn ngang (`scrollWidth − innerWidth = 0`), không lỗi console.
- Chế độ tối: Kết quả lớp, Hôm nay (Học) — đã sửa cột "giảm nhấn" bị sáng hơn cột chính ở nền tối (`--seq-dim`).
- Bảng màu dữ liệu: `validate_palette.js` đạt mọi cổng cứng ở cả hai chế độ; ordinal đạt.
