# Hợp đồng 2 — Bộ thành phần `services/anim-kit` (EK) cho bài HyperFrames do AI viết

Phiên bản kit: **1** (`EK.version === "1"`, `services/anim-kit/kit.js`). Khung 1920×1080, 30 fps. Token màu/chữ/nhịp: `services/video-theme/tokens.json` (không có hệ token thứ hai).

Nguyên tắc: AI **không tính hình học, không tạo DOM bằng script, không gọi mạng**. AI viết (a) HTML khai báo dùng lớp `.ek-*` và thuộc tính `data-ek-*`, (b) **một** khối `<script>` chỉ gọi `EK.*` và tween GSAP trên `tl`. Máy chủ tiền xử lý `data-ek-*` thành SVG/HTML đúng tỉ lệ rồi mới mở Chrome.

## 1. Bài AI viết (đầu vào lint + tiền xử lý)

```html
<div id="root" data-composition-id="main" data-start="0" data-duration="15.2" data-width="1920" data-height="1080">
  <div class="ek-world">                      <!-- tuỳ chọn: chỉ khi dùng EK.camera -->
    <div class="ek-meta ek-col-1 ek-span-8" style="top:64px">ĐỊA LÝ 12 · KHÍ HẬU</div>
    <h1 id="tt" class="ek-title ek-col-1 ek-span-6" style="top:150px" data-ek-words>Biểu đồ nhiệt–ẩm Hà Nội</h1>
    <div class="ek-stage">                    <!-- sân khấu y 150–900; EK.focus làm mờ các con trực tiếp -->
      <svg id="bd" class="ek-col-7 ek-span-6" style="top:200px" width="900" height="620"
           data-ek-chart="nhiet-am" data-ek-values='{"nhan":["T1",…],"chuoi":[…]}'></svg>
      <div id="n1" class="ek-card ek-col-1 ek-span-5" style="top:420px" data-ek-beat="1">…</div>
    </div>
  </div>
</div>
<style>/* tuỳ chọn; chỉ màu var(--…), font var(--ui)/var(--read), cỡ ≥ 36px */</style>
<script>
const tl = gsap.timeline({ paused: true });
EK.enter(tl, "#tt", EK.b(0));
EK.grow(tl, "#bd .ek-bar", EK.cue(1), 1.2, { stagger: 0.06 });
window.__timelines["main"] = tl;
</script>
```

- Máy chủ **bỏ mọi `<head>`/`<script src>`/`<link>`** AI viết, dựng lại tài liệu chuẩn: phông tự host, `katex.min.css`, `kit.css`, `gsap.min.js` + DrawSVG + MorphSVG + MotionPath (vendor cục bộ), `window.EK_CFG` (beat, màu, nhịp), `kit.js`, rồi khối `<style>` và `<script>` của AI.
- Gốc: đúng 1 phần tử có `data-composition-id="main"`, `data-start="0"`, `data-duration` = thời lượng kế hoạch ±0,05 s, `data-width="1920"`, `data-height="1080"`.
- Phần tử có `data-start`/`data-duration` (ngoài gốc) phải có `class="clip"` và `id` duy nhất. Mọi `id` duy nhất.
- Định vị: `position:absolute` qua lớp lưới `.ek-col-N` (mép trái cột N, 1..12) + `.ek-span-K` (rộng K cột) + `style="top:…px"`. Được dùng `left/top/width/height` trong **style tĩnh**; **cấm tween** các thuộc tính này (dùng `x`, `y`, `scale`, `opacity`).
- Danh sách cấm đầy đủ: `finding.md` §3 (lint trả lỗi kèm dòng "Sửa:").

## 2. `kit.css` — biến và lớp

Biến (sinh từ `tokens.json`, test giữ đồng bộ):

| Biến | Giá trị | Biến | Giá trị |
|---|---|---|---|
| `--bg` | #FDFCF9 nền giấy | `--ink` | #1C1B1A mực |
| `--surface` | #FFFFFF thẻ | `--ink2` | #3E3B37 |
| `--sunken` / `--fill` | #F5F2EA | `--ink3` | #6D645A phụ (AA) |
| `--line` | #E6DECC viền | `--grid` | #EEE8DC lưới |
| `--accent` | #2F5D8A xanh học thuật | `--accent-soft` | #E8EEF5 |
| `--ok` | #2B7A3B | `--bad` | #B42318 |
| `--c-lam` `--c-lucLam` `--c-xanhLa` `--c-tim` `--c-doSon` `--c-vangDam` `--c-hong` `--c-cam` | bảng phân loại (cam chỉ phụ hiếm) | `--mark` | nền dạ quang (accent, alpha 0,13) |
| `--ui` | Inter | `--read` | Source Serif 4 |

Màu vật thể theo **tổ hợp** (`EK.combo('coDien')` → `['lam','xanhLa','tim','doSon']`): mỗi đại lượng giữ một màu suốt cảnh. Không dùng cam làm màu chủ đạo/tiêu đề.

| Lớp | Ý nghĩa |
|---|---|
| `.ek-col-1` … `.ek-col-12` | `left` = mép trái cột (lề 120, rãnh 24, cột 117 px) |
| `.ek-span-1` … `.ek-span-12` | `width` = K cột + (K−1) rãnh |
| `.ek-meta` | dòng phân loại in hoa xám 30 px (ngoại lệ cỡ chữ duy nhất < 36, chỉ cho dòng này) |
| `.ek-eyebrow` | nhãn mục in hoa, màu nhấn, 36 px |
| `.ek-title` | tiêu đề serif 66 px, `text-wrap: balance`; con `.kw` tô màu nhấn |
| `.ek-lead` / `.ek-body` | thân 40 px |
| `.ek-read` | chữ đọc serif 46 px (thơ, trích dẫn) |
| `.ek-label` | nhãn 44 px đậm; kèm `data-ek-for="#id"` khi gắn vào vật |
| `.ek-card` | thẻ ghi chú: nền trắng, viền trái 6 px màu nhấn; `.ek-card h3`, `.ek-card p` |
| `.ek-note` | ghi chú 38 px |
| `.ek-num` | số lớn (tabular), dùng với `EK.count` |
| `.ek-math` | khối KaTeX 52 px; `.ek-math-big` 68 px |
| `.ek-stage` | sân khấu (con trực tiếp là đơn vị của `EK.focus`) |
| `.ek-world` | lớp camera (đúng 1, chỉ khi dùng `EK.camera`) |
| `.ek-c-<mau>` / `.ek-fill-<mau>` / `.ek-stroke-<mau>` | chữ / tô / nét theo màu token (`lam`, `lucLam`, `xanhLa`, `tim`, `doSon`, `vangDam`, `hong`, `accent`, `ink`, `ink3`) |
| `.ek-soft-<mau>` | tô nền nhạt (alpha 0,12) cho vùng/khối |
| `.ek-hidden` | ẩn ban đầu (opacity 0) — để `EK.enter` hiện |
| `.ek-line` / `.ek-line-bold` | nét SVG 4 / 6 px, `fill:none` |

Dải lời giảng y ≥ 936 (đường kẻ `ruleY` + phụ đề) **để trống**; máy chủ tự vẽ nếu bật phụ đề. `check` chặn chữ lấn vào dải này (`caption_zone_collision`).

## 3. `kit.js` — `window.EK`

Mọi hàm nhận `tl` (timeline GSAP dừng), `sel` (chuỗi CSS selector), thời điểm `t` (giây tuyệt đối trên dòng thời gian của cảnh). Trả `tl`. Thời lượng mặc định lấy từ `tokens.motion`. Lỗi gọi sai (selector không khớp, màu ngoài token, camera lần 2) **ném Error** → `check` báo `runtime`.

| Hàm | Mô tả |
|---|---|
| `EK.b(i, f = 0)` | thời điểm trong beat i: `t0 + f·(t1 − t0)` |
| `EK.cue(i)` | thời điểm cue của beat i (từ khoá được đọc; mặc định = t0). **Phần tử chính của beat phải hiện tại `EK.cue(i)`** (QA kiểm lệch ≤ 0,8 s) |
| `EK.end(i)` | `t1` của beat i |
| `EK.T` | tổng thời lượng cảnh |
| `EK.enter(tl, sel, t, {from='up', dur=0.75, stagger=0, ease='enter'})` | hiện: `from` ∈ `up` `down` `left` `right` `fade` `scale` |
| `EK.exit(tl, sel, t, {dur=0.5, to='fade'})` | ẩn: `to` ∈ `fade` `up` `down` |
| `EK.draw(tl, sel, t, dur = 1.1, {from='start'})` | vẽ nét SVG (DrawSVG); `from` ∈ `start` `center` `end` |
| `EK.arrow(tl, sel, t, dur = 1.2)` | vẽ mũi tên `.ek-arrow` (thân rồi đầu mũi tên) |
| `EK.grow(tl, sel, t, dur = 1, {stagger=0.06, from='bottom'})` | cột/thanh mọc từ đáy (`from` ∈ `bottom` `left`) |
| `EK.morph(tl, a, b, t, dur = 1.2)` | biến hình path `a` thành hình của path `b` (MorphSVG; `b` có thể `.ek-hidden`) |
| `EK.count(tl, sel, a, b, t, dur = 0.9, {decimals, prefix='', suffix=''})` | số đếm a → b, định dạng Việt (phẩy thập phân, chấm nghìn) |
| `EK.mark(tl, sel, t, kind = 'highlight', {color='accent', dur=0.6})` | nhấn: `highlight` (dạ quang) `underline` `circle` `box` |
| `EK.unmark(tl, sel, t)` | bỏ nhấn |
| `EK.focus(tl, sel, t, {dur=0.5, within='.ek-stage'})` | làm mờ các con trực tiếp khác của `within` về `motion.dim` (0,3), giữ `sel` rõ |
| `EK.unfocus(tl, t, {within='.ek-stage'})` | trả mọi con về rõ |
| `EK.camera(tl, t, dur, {x=0, y=0, scale=1})` | lia/phóng chậm `.ek-world` (power3.inOut). **Tối đa 1 lần/cảnh** |
| `EK.words(tl, sel, cues, {karaoke=false})` | chữ đã tách từ (`data-ek-words`) hiện theo mốc: `cues` = mảng thời điểm từng từ, hoặc `{t, per}` (bắt đầu + giây/từ); `karaoke` tô từ đang đọc |
| `EK.swap(tl, a, b, t, {dur=0.7})` | sai → đúng: gạch ngang `a`, `a` lùi mờ, `b` hiện đúng chỗ |
| `EK.follow(tl, sel, pathSel, t, dur, {align=false})` | vật đi theo đường (MotionPath) |
| `EK.fill(tl, sel, t, mau, {alpha=1, dur=0.6})` | tô `fill` SVG (vùng bản đồ, miền Venn) bằng màu token |
| `EK.tint(tl, sel, t, mau, {prop='color', dur=0.5})` | đổi màu chữ/nét (`prop` ∈ `color` `stroke` `fill`) |
| `EK.color(mau)` | hex của màu token (ném lỗi nếu không phải token) |
| `EK.combo(ten)` | mảng tên màu của tổ hợp `coDien` `bienLam` `hoaTim` |
| `EK.rand(seed)` | hàm ngẫu nhiên có hạt giống (mulberry32) → `[0,1)`; thay `Math.random` |

Tween GSAP trực tiếp được phép: `tl.to/from/fromTo/set` với `x y xPercent yPercent scale scaleX scaleY rotation opacity drawSVG morphSVG motionPath strokeDashoffset color fill stroke backgroundColor`. Ease cho phép: `expo.out` `back.out(1.4)` `power3.inOut` `power2.in` `power2.inOut` `power2.out` `power1.out` `power1.inOut` `sine.inOut` `sine.out` `none`.

Nhịp (tokens.motion): vào 0,75 s; ra 0,5 s; nhấn 0,6 s; di chuyển 1,2 s; vẽ 1,1 s; stagger 0,05 s; mờ 0,3. **Mỗi beat ≥ 1 thay đổi; không đứng yên > 4 s; một chuyển động camera chậm; không phóng to/thu nhỏ lặp; không elastic/bounce.**

## 4. Thuộc tính `data-ek-*` (máy chủ tiền xử lý, `server/src/services/animStudio/preprocess.ts`)

Mỗi giá trị ≤ 4 KB. Lỗi dữ liệu → Finding `ek_*` (finding.md). Phần tử sinh ra có lớp cố định dưới đây để AI nhắm selector.

| Thuộc tính | Đặt trên | Sinh ra |
|---|---|---|
| `data-ek-words` | khối chữ | mỗi từ thành `<span class="ek-w">` (giữ khoảng trắng) |
| `data-ek-tex="LaTeX"` (+ `data-ek-display`) | `div/span` | HTML KaTeX (không `\href`, không macro lạ) |
| `data-ek-plot="biểu thức[; biểu thức 2]"` + `data-ek-domain="a,b"` + `data-ek-range="c,d"` (tuỳ chọn) + `data-ek-ticks="1"` + `data-ek-points="x[,y][:nhãn];…"` | `<svg width height>` | `g.ek-axis` (`.ek-axis-x` `.ek-axis-y` `.ek-tick` `.ek-tick-label`), `path.ek-curve.ek-curve-<k>` (màu tổ hợp k), `g.ek-point.ek-point-<i>` (chấm `.ek-dot` + `.ek-point-label`). Biểu thức qua `expr.ts` (không eval): `+ - * / ^ ( )`, `x`, `pi`, `e`, `sin cos tan sqrt abs ln log exp` |
| `data-ek-chart="cot\|duong\|cot-duong\|nhiet-am\|thap\|tron"` + `data-ek-values='JSON'` | `<svg width height>` | xem §4.1 |
| `data-ek-timeline='JSON'` | `<svg width height>` | trục năm tỉ lệ thật: `.ek-tl-axis`, `.ek-tl-tick`, `.ek-era.ek-era-<i>` (dải thời kỳ + nhãn), `.ek-event.ek-event-<i>` (chấm + năm + nhãn) |
| `data-ek-graph='JSON'` + `data-ek-dir="LR\|TB"` | `div` (có `width/height` trong style) | bố cục dagre: `.ek-node[data-node=id]` (thẻ chữ), `svg.ek-edges` chứa `path.ek-edge[data-from][data-to]` + `.ek-edge-head`, `.ek-edge-label` |
| `data-ek-map="vn34\|vn63\|dong-nam-a\|the-gioi"` + `data-ek-highlight="id,id"` + `data-ek-fit="id-dia-danh,…"` hoặc `data-ek-view="lon0,lat0,lon1,lat1"` | `<svg width height>` | `path.ek-region[data-ek-region=id]` (`.ek-on` nếu trong highlight), `path.ek-coast`, `g.ek-islands` (Hoàng Sa, Trường Sa — luôn vẽ, có nhãn), nhãn tỉnh khi `data-ek-names` |
| `data-ek-place="id"` | phần tử con trong khung bản đồ (cùng cha với svg bản đồ) | đặt `left/top` theo toạ độ gazetteer + chấm `.ek-place-dot`; chữ trong phần tử là nhãn (`.ek-place`). id phải có trong `assets/geo/dia-danh.json` |
| `data-ek-arrow="from:id;via:id;to:id"` (+ `data-ek-bend="0.2"`) | `<path>` trong svg bản đồ | `d` đường cong mượt qua các điểm + `path.ek-arrow-head` liền sau; lớp `.ek-arrow` |
| `data-ek-beat="i"` | phần tử chính của beat i | QA đo thời điểm hiện (opacity ≥ 0,5) so với `EK.cue(i)` |
| `data-ek-for="#id"` | nhãn | QA đo khoảng cách nhãn ↔ vật (> 120 px mà không có `.ek-leader` → lỗi) |

### 4.1 `data-ek-chart`

```json
{
  "nhan": ["T1","T2","…","T12"],
  "chuoi": [
    { "ten": "Lượng mưa", "donVi": "mm", "giaTri": [18,26,…], "kieu": "cot",   "truc": "trai" },
    { "ten": "Nhiệt độ",  "donVi": "°C", "giaTri": [16.4,17.0,…], "kieu": "duong", "truc": "phai" }
  ],
  "mien": [{ "tu": 4, "den": 9, "nhan": "Mùa mưa" }]
}
```

- `cot` / `duong` / `cot-duong`: trục y bắt đầu từ 0 (cột) hoặc làm tròn đẹp (đường); vạch chia 4–6; nhãn giá trị `.ek-val`.
- `nhiet-am` (quy ước Atlat): cột mưa (trục trái, mm, màu `lam`) + đường nhiệt (trục phải, °C, màu `doSon`), `mien[]` tô dải mùa mưa (`.ek-season`). Chỉ số tháng `tu/den` tính từ 1.
- `thap`: `nhan` = nhóm tuổi (dưới → trên), 2 chuỗi (nam trái, nữ phải), đơn vị %.
- `tron`: 1 chuỗi, vẽ vành khuyên (`.ek-slice` là nét cung để `EK.draw`), nhãn % trên vành.
- Phần tử sinh: `.ek-bar.ek-bar-<chuỗi>-<i>`, `.ek-line-<chuỗi>`, `.ek-dot`, `.ek-val`, `.ek-axis`, `.ek-cat` (nhãn trục x), `.ek-series-label`.

### 4.2 `data-ek-timeline`

`{"tu":1945,"den":1975,"moc":[{"nam":1954,"nhan":"Điện Biên Phủ"}],"thoiKy":[{"tu":1945,"den":1954,"nhan":"Kháng chiến chống Pháp"}],"buoc":5}`

### 4.3 `data-ek-graph`

`{"nodes":[{"id":"a","nhan":"Chí Phèo","mau":"lam"}],"edges":[{"from":"a","to":"b","nhan":"bị lừa"}]}` — ≤ 16 nút, ≤ 24 cạnh, nhãn ≤ 40 ký tự.

## 5. Tài nguyên (máy chủ chép vào dự án tạm; AI chỉ được tham chiếu `assets/…`)

| Đường dẫn trong dự án | Nguồn |
|---|---|
| `assets/fonts/*.ttf` | `services/video-theme/fonts` (OFL) |
| `assets/vendor/gsap/*.min.js` | `gsap@3.15.x` ghim trong `server/package.json` |
| `assets/vendor/katex/` | `katex` ghim trong `server/package.json` |
| `assets/kit/kit.js`, `kit.css` | `services/anim-kit` |
| `assets/geo/*` | `services/anim-kit/assets/geo` (Natural Earth `_vnm`, 34 tỉnh, 63 tỉnh, `dia-danh.json`) — chỉ đọc qua `data-ek-map/place/arrow`, không nạp trực tiếp |
