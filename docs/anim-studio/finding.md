# Hợp đồng 4 — `Finding` (lỗi lint / QA) và `QaReport`

Mã nguồn chân lý: `server/src/domain/animFinding.ts`.

## 1. Kiểu

```ts
type Finding = {
  code: string;                         // mã ổn định, snake_case ASCII (bảng §3–§5)
  severity: "error" | "warning" | "info";
  source: "lint" | "preprocess" | "check" | "eduvn" | "video";
  message: string;                      // tiếng Việt có dấu, 1 câu, nêu cái sai + giá trị đo
  fix: string;                          // bắt đầu bằng "Sửa: …" — việc AI phải làm
  selector?: string;                    // CSS selector của phần tử (nếu có)
  line?: number; col?: number;          // vị trí trong bài AI viết (1-based)
  t?: number;                           // giây trên dòng thời gian (QA)
  bbox?: { x: number; y: number; w: number; h: number };
  measured?: string | number;           // giá trị đo (vd "#FF6600", 6.2, "12 px")
  expected?: string | number;           // ngưỡng/giá trị đúng
  suggested?: string;                   // gợi ý thay (vd suggestedColor của check, tên biến token)
};

type QaReport = {
  ok: boolean;                          // không còn Finding severity "error"
  findings: Finding[];
  ms: { lint?: number; preprocess?: number; check?: number; eduvn?: number; render?: number; video?: number };
  peakMemBytes?: number;                // đỉnh RAM cgroup của lượt chạy hộp cát
  frames?: string[];                    // ảnh khung (đường dẫn trong thư mục lượt chạy)
};
```

- Chỉ `severity: "error"` chặn dựng. `warning` ghi log + gửi AI ở lượt sửa nếu còn chỗ (tối đa 12 Finding/lượt, error trước).
- **Rút gọn cho lượt sửa** (`compactForRepair`): bỏ trùng theo `(code, selector)`, giữ `code, selector|line, measured, expected, suggested, fix`, cắt `message` 160 ký tự.

## 2. Nguồn

| `source` | Bộ phát | Khi |
|---|---|---|
| `lint` | `lintHf(html, ctx)` — parse5 + acorn | trước mọi thứ, không mở trình duyệt |
| `preprocess` | `preprocess.ts` | dữ liệu `data-ek-*` sai (biểu thức, JSON, địa danh) |
| `check` | `hyperframes check --json` (đổi từ mã của HF, giữ `code` gốc) | trong hộp cát |
| `eduvn` | kiểm CDP riêng (`services/anim-kit/qa/eduvn-check.mjs`) | trong hộp cát, cùng dự án |
| `video` | ffprobe + dò khung trống | sau khi dựng MP4 |

## 3. Mã lint (`source: "lint"`, đều là `error` trừ khi ghi khác)

| Mã | Luật |
|---|---|
| `html_parse` | HTML hỏng không đọc được |
| `mang_tai_ngoai` | `src/href/srcset/poster/xlink:href/url()/@import` không phải `assets/…` (http, //, data:, javascript:, ../) |
| `the_cam` | có `<script src>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `<meta http-equiv>`, `<base>`, `<form>`, `<img>`/`<video>`/`<audio>` ngoài `assets/` |
| `thuoc_tinh_su_kien` | thuộc tính `on*=` (onclick, onload…) |
| `script_so_luong` | ≠ 1 khối `<script>` |
| `js_parse` | script không phân tích được (acorn, ES2022, script) |
| `js_cam` | gọi/tham chiếu tên bị cấm: `fetch XMLHttpRequest WebSocket EventSource navigator Worker SharedWorker importScripts eval Function setTimeout setInterval requestAnimationFrame Date performance localStorage sessionStorage indexedDB open postMessage location history alert prompt confirm require process globalThis self top parent frames` |
| `js_import` | `import(…)` / `import` / `export` |
| `js_ngau_nhien` | `Math.random` → dùng `EK.rand(seed)` |
| `js_dom_ghi` | gán/gọi `innerHTML outerHTML insertAdjacentHTML createElement appendChild cookie write writeln` … |
| `js_thuoc_tinh_cam` | truy cập `__proto__ constructor prototype` hoặc `with` |
| `js_chi_so_dong` | chỉ số động trên `window`/`document` (`window[x]`) |
| `js_bien_toan_cuc` | tên toàn cục ngoài danh sách cho phép: `gsap EK tl document window Math Number String Array JSON Object parseInt parseFloat isFinite isNaN undefined NaN Infinity` |
| `js_document` | `document.*` ngoài `querySelector querySelectorAll getElementById` |
| `js_window` | `window.*` ngoài `__timelines` |
| `js_vong_lap` | `while`, `do…while`, `for(;;)` không điều kiện |
| `hf_goc` | gốc thiếu/sai `data-composition-id/start/duration/width=1920/height=1080` |
| `hf_thoi_luong` | `data-duration` lệch thời lượng kế hoạch > 0,05 s (`measured`, `expected`) |
| `hf_timeline` | không có `gsap.timeline({ paused: true })` gán cho `tl` hoặc thiếu `window.__timelines["main"] = tl` |
| `hf_clip` | phần tử có `data-start`/`data-duration` thiếu `class="clip"` hoặc `id` |
| `hf_id_trung` | `id` trùng |
| `hf_repeat` | `repeat: -1` (vòng vô hạn) |
| `hf_tween_cam` | tween `display visibility autoAlpha left top width height right bottom` |
| `mau_literal` | màu viết thẳng (`#hex`, `rgb()`, `hsl()`, tên màu) trong style/thuộc tính/script → `suggested` = biến token gần nhất |
| `font_cam` | `font-family` ngoài `var(--ui)`, `var(--read)`, Inter, Source Serif 4, KaTeX |
| `chu_nho` | `font-size` < 36 px (trừ `.ek-meta`) |
| `ease_cam` | ease ngoài danh sách kit-api §3 (`elastic`, `bounce`, `rough`, `steps`, `slow`…) |
| `camera_nhieu` | `EK.camera` gọi > `limits.cameraMoves` (mặc định 1) |
| `zoom_lap` | > 2 tween `scale` trực tiếp (phóng to/thu nhỏ lặp) |
| `kich_thuoc` | HTML > 60 KB; > 400 phần tử; > 40 `.clip`; > 300 lệnh tween/EK; `data-ek-*` > 4 KB; thời lượng ngoài 3–60 s |
| `so_khong_nguon` | số hiển thị không có trong slide/lời giảng (trừ số nguyên 0–12) — `measured` = số |
| `dia_danh_la` | `data-ek-place` / `data-ek-arrow` / `data-ek-fit` dùng id không có trong gazetteer |
| `nhan_dai` | nhãn (`.ek-label`, `[data-ek-for]`, `.ek-place`) > 60 ký tự |
| `nhan_nhieu` | số nhãn > `limits.labels` |
| `skill_thieu_phan_tu` / `skill_qua_nhieu` | `checklist.requires` không đạt |
| `ek_ham_la` | gọi `EK.<tên>` không có trong kit-api |
| `beat_thieu_phan_tu` | beat i không có phần tử `[data-ek-beat=i]` |

## 4. Mã `check` (giữ nguyên mã HyperFrames, map severity)

`content_overlap` (giữ qua nhiều mẫu = lỗi), `text_overflow`, `text_clipped`, `canvas_overflow`, `escaped_container`, `panel_out_of_canvas`, `connector_detached`, `contrast_aa` (lỗi, có `suggested`), `caption_zone_collision` (lỗi do cờ `severity=error`), `motion_appears_late`, `motion_out_of_order`, `motion_off_frame`, `motion_frozen` (lỗi), `motion_selector_missing`, `sweep_static`, `dead_stretch` (cảnh báo; nâng thành lỗi qua `keepsMoving maxStaticSec 4`), `text_below_floor`, `first_frame_empty`, `check_runtime_failure`, `runtime_error`, `network_request_failed` (lỗi: hộp cát cắt mạng). Mã HF khác: giữ `severity` gốc.

## 5. Mã EDUVN (`source: "eduvn"`, đều `error`)

| Mã | Luật |
|---|---|
| `mau_ngoai_token` | màu tính toán (`color fill stroke background-color border-color`) của phần tử hiện (opacity > 0,05) cách mọi màu token > ΔE2000 3 (xét cả bản pha alpha `fillAlpha/markAlpha` trên nền) — `measured` = màu, `suggested` = token gần nhất |
| `rot_chu_le` | dòng cuối của khối chữ chỉ có 1 từ (đo `Range.getClientRects`) |
| `nhan_xa_vat` | `[data-ek-for]` cách vật > 120 px và không có `.ek-leader` nối |
| `beat_lech_loi` | phần tử `[data-ek-beat=i]` hiện (opacity ≥ 0,5) lệch `cue(i)` > 0,8 s — `measured` = giây hiện, `expected` = cue |
| `chu_nho_tinh` | cỡ chữ tính toán < 36 px trên phần tử hiện (trừ `.ek-meta`, KaTeX con) |
| `dung_yen` | khoảng > 4 s (ngoài 3 s cuối) không có thay đổi hình (so dấu vân tay khung) |

## 6. Mã video (`source: "video"`)

| Mã | Luật |
|---|---|
| `video_thoi_luong` | ffprobe lệch thời lượng kế hoạch > 0,2 s |
| `video_trong` | đoạn ≥ 1 s mà vùng sân khấu (y 150–900) chỉ còn nền (không điểm ảnh tối hơn ngưỡng) |
| `video_hong` | không đọc được tệp / không có luồng hình |
