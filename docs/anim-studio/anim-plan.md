# Hợp đồng 3 — `SceneInfo` và kế hoạch beat `AnimPlan`

Mã nguồn chân lý: `server/src/domain/animPlan.ts` (zod, thuần). Tài liệu này mô tả đúng mã đó.

## 1. `SceneInfo` (đầu vào bộ chọn + tác vụ AI)

```ts
SceneInfo = {
  subject: string;        // khoá môn: toan ly hoa sinh tin van su dia anh … ("" nếu chưa rõ)
  grade: number | null;   // 1..12, 13 = đại học
  title: string;          // tiêu đề cảnh
  slideText: string;      // chữ trên slide (đã bỏ thẻ HTML; công thức dạng $…$)
  speech: { text: string; durationMs: number }[];   // từng câu lời giảng, thời lượng đã đọc (hoặc ước)
  prevAnimated?: boolean; // cảnh trước có hoạt hình (đính kèm chuyen-canh-giu-vat)
}
```

Mốc câu: `t0(k) = Σ durationMs[0..k−1] / 1000`, `t1(k) = t0(k) + durationMs[k]/1000`. Tổng `T = t1(last)`, làm tròn 0,01 s, kẹp 3–60 s.

## 2. `AnimPlan` (đầu ra tác vụ `hoat_hinh_ke_hoach`)

```json
{
  "skills": [{ "id": "ban-do-chien-dich", "vaiTro": "chinh" }, { "id": "nhan-manh-tu-khoa", "vaiTro": "phu" }],
  "confidence": 0.82,
  "lyDo": "Lời giảng kể 3 đợt tiến công với 4 địa danh và mốc ngày.",
  "beats": [
    { "i": 0, "t0": 0, "t1": 6.4, "cau": [0], "cue": "kw:Điện Biên Phủ", "viec": "hiện bản đồ Tây Bắc, đặt địa danh", "skill": "ban-do-chien-dich", "duLieu": { "places": ["dien-bien-phu"] } }
  ],
  "khongCanHoatHinh": false
}
```

| Trường | Ràng buộc zod |
|---|---|
| `skills` | 1–3 phần tử `{id, vaiTro: "chinh"|"phu"}`, đúng 1 `chinh`; rỗng chỉ khi `khongCanHoatHinh` |
| `confidence` | 0..1 |
| `lyDo` | 1–300 ký tự |
| `beats[]` | `i` = chỉ số liên tục từ 0; `t0 < t1` (giây, 2 chữ số lẻ); `cau` = chỉ số câu lời giảng (≥ 1, tăng dần); `cue` = `"t"` (đầu beat) hoặc `"kw:<cụm từ>"` (cụm có trong các câu của beat) hoặc `"word:<n>"` (âm tiết thứ n của beat); `viec` 1–200 ký tự; `skill` ∈ `skills[].id`; `duLieu` object tuỳ chọn (≤ 2 KB) |
| `khongCanHoatHinh` | bool; `true` → `skills`/`beats` có thể rỗng |

## 3. Kiểm sau khi AI trả (`validatePlan(plan, ctx)`, tất định)

Trả danh sách lỗi tiếng Việt; rỗng = hợp lệ. Có lỗi → hỏi lại AI 1 lần kèm danh sách lỗi.

1. `skills[].id` thuộc danh sách ứng viên đã gửi.
2. Beat phủ kín `[0, T]`: `beats[0].t0 = 0`, `beats[k].t0 = beats[k−1].t1` (dung sai 0,05 s), `beats[last].t1 = T` (±0,3 s, sau đó được chuẩn hoá đúng T).
3. Mỗi beat ≤ 12 s và ≥ 1 s.
4. Số beat: 3–8 khi T ≥ 9 s; 1–8 khi T < 9 s.
5. `cau` nằm trong số câu; `kw:` phải có trong chữ (bỏ dấu, không phân biệt hoa) của các câu thuộc beat.
6. `duLieu`: mọi số (kể cả trong mảng/đối tượng lồng) phải có trong `slideText`/`speech` (chuẩn hoá phẩy/chấm thập phân, chấm nghìn); mọi chuỗi ở khoá `places`/`from`/`to`/`via` phải là id trong gazetteer.

## 4. Mốc cue (`cueTimes(plan, scene)`)

- `t` → `t0` của beat.
- `kw:X` → nội suy theo âm tiết: thời điểm câu chứa X + (số âm tiết đứng trước X trong câu / tổng âm tiết của câu) × thời lượng câu (tiếng Việt đơn âm tiết; mỗi dấu câu `, . ; :` tính thêm 1 âm tiết nghỉ).
- `word:n` → thời điểm âm tiết thứ n tính từ đầu beat.
- Kẹp trong `[t0, t1 − 0,3]`.

Máy chủ tiêm `EK_CFG.beats = [{i, t0, t1, cue}]` để bài AI dùng `EK.b(i)`, `EK.cue(i)`, `EK.end(i)`.

## 5. Sinh `index.motion.json` từ kế hoạch

```json
{ "duration": T, "assertions": [
  { "kind": "appearsBy", "selector": "[data-ek-beat=\"0\"]", "bySec": cue0 + 0.6 },
  { "kind": "before", "a": "[data-ek-beat=\"0\"]", "b": "[data-ek-beat=\"1\"]" },
  { "kind": "staysInFrame", "selector": ".ek-label" },
  { "kind": "keepsMoving", "maxStaticSec": 4 },
  …checklist.json.motion của các skill đã chọn
]}
```

Chỉ sinh `appearsBy`/`before` cho beat có phần tử `data-ek-beat` trong bài (thiếu phần tử → Finding `beat_thieu_phan_tu`, lỗi).

## 6. Ngưỡng tin cậy (cấu hình `ANIM_CONF_AUTHOR=0.7`, `ANIM_CONF_TEMPLATE=0.5`)

| `confidence` | Hành động |
|---|---|
| ≥ 0,70 | AI viết bài (pipeline) |
| 0,50 – 0,70 | khuôn cũ: `fallback` của skill chính → tác vụ `hoat_hinh_toan` với đúng 1 mẫu |
| < 0,50 hoặc `khongCanHoatHinh` | không làm hoạt hình (`ket_cuc = khong_can`) |
