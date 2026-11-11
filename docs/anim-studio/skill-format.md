# Hợp đồng 1 — Định dạng skill hoạt hình (`anim-skills/`)

Phiên bản hợp đồng: **1** (2026-11-11). Nguồn: thiết kế `docs/research/2026-11-11-anim-studio-design.md` §4. Bộ kiểm: `node scripts/build-anim-skills.mjs --check` (CI) — sai hợp đồng là lỗi, không sinh `index.json`.

## 1. Thư mục

```
anim-skills/
  README.md
  index.json                         # SINH bằng scripts/build-anim-skills.mjs — không sửa tay
  <nhom>/<id>/                       # nhom ∈ chung|toan|ly|hoa|sinh|tin|van|su|dia|anh
    SKILL.md                         # bắt buộc
    checklist.json                   # bắt buộc (có thể {} rỗng các mục)
    thumb.png                        # bắt buộc, 640×360, nội dung tự dựng trung tính (không lấy từ clip/kho thật)
    evals/evals.json                 # bắt buộc, đúng 5 ca: 3 nên chọn + 2 không nên chọn
    examples/vi-du-1/scene.json      # bắt buộc ≥ 1 ví dụ
    examples/vi-du-1/plan.json       # kế hoạch beat vàng (AnimPlan, xem anim-plan.md)
    examples/vi-du-1/index.html      # bài dựng vàng (HF) — phải qua lint + hyperframes check
    examples/vi-du-1/frame.png       # tuỳ chọn: ảnh khung đẹp nhất (1920×1080 hoặc thu nhỏ)
    references/*.md                  # tuỳ chọn, sâu đúng 1 tầng, mỗi tệp ≤ 400 dòng
```

- `id` = tên thư mục = `name` trong SKILL.md: kebab-case ASCII `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 64 ký tự, **duy nhất toàn kho**.
- Engine Manim: `examples/vi-du-1/scene.py` thay cho `index.html` (đợt 2).

## 2. `SKILL.md`

Frontmatter YAML (chuẩn agentskills.io) — chỉ các khoá dưới đây, `metadata` là map **chuỗi → chuỗi**:

```yaml
---
name: ban-do-chien-dich
description: <≤ 1024 ký tự; tiếng Việt có dấu + vài từ khoá tiếng Anh ở cuối>
license: Proprietary (EDUVN)
metadata:
  ten: "Bản đồ chiến dịch"          # tên hiển thị tiếng Việt, ≤ 60 ký tự (bắt buộc)
  engine: hf                        # hf | manim (bắt buộc)
  mon: su,dia                       # khoá môn, phẩy; "*" = mọi môn (bắt buộc)
  lop: 6-12                         # a-b, 1..13 (13 = đại học) (bắt buộc)
  loai: ban-do,dien-bien,thoi-gian  # đặc trưng nội dung (bảng §4) mà skill phục vụ (bắt buộc, ≥ 1)
  can: dia-danh>=2,moc-thoi-gian>=1 # điều kiện dữ liệu tối thiểu (tuỳ chọn; §5)
  tranh: "định nghĩa,khái niệm"     # từ khoá "không dùng khi" — trúng thì trừ điểm (tuỳ chọn)
  tuKhoa: "chiến dịch,trận,tiến công,mũi tên"  # từ khoá mở rộng cho BM25 (tuỳ chọn)
  thoiLuong: 12-45                  # giây a-b, 3..60 (bắt buộc)
  fallback: dong_thoi_gian          # 1 trong 28 khuôn cũ (server/src/services/anim/spec.ts) hoặc "none" (bắt buộc)
  kit: map,arrow,mark,focus,count   # tên hàm EK.* / nhóm data-ek-* dùng (bắt buộc; tên theo kit-api.md)
  version: "1"                      # tăng khi sửa nội dung → cache cũ bỏ (bắt buộc)
  nguon: "hf:us-map-flow,hf:hw-arrow,NaturalEarth vnm"  # ghi nguồn ý tưởng/mã (bắt buộc)
  vaiTro: chinh                     # chinh | phu (tuỳ chọn, mặc định chinh; "phu" = skill bổ trợ như nhan-manh-tu-khoa)
---
```

Khoá môn: `toan ly hoa sinh tin van su dia anh gdcd cong-nghe` hoặc `*`.

Thân SKILL.md: < 500 dòng, < 5 000 token (ước 4 ký tự/token). **Bắt buộc đúng các tiêu đề cấp 2 sau, đúng thứ tự** (bộ kiểm so khớp chuỗi):

```markdown
## Khi dùng
## Không dùng
## Ý sư phạm
## Dữ liệu lấy từ lời giảng
## Bố cục
## Chuyển động
## Ví dụ
## Lỗi hay gặp
## Checklist
```

- `## Khi dùng` / `## Không dùng`: gạch đầu dòng, mỗi dòng 1 tình huống. Bộ chọn đọc 2 mục này vào thẻ ứng viên.
- `## Ý sư phạm`: 3–6 beat mẫu, dạng `- Beat k (câu i–j): việc`.
- `## Dữ liệu lấy từ lời giảng`: liệt kê trường lấy từ lời giảng/slide (không bịa); địa danh phải là id trong `services/anim-kit/assets/geo/dia-danh.json`.
- `## Bố cục`: theo lưới 12 cột của kit (`.ek-col-*`), sân khấu y 150–900, dải lời giảng y ≥ 936 để trống.
- `## Chuyển động`: chỉ các lệnh `EK.*` có trong kit-api.md + thứ tự.
- `## Checklist`: một dòng "xem checklist.json" + các điểm người kiểm bằng mắt.
- Câu đầu tiên của `## Ý sư phạm` + `## Chuyển động` được bộ sinh index rút thành **tóm tắt thân ≤ 60 từ**; viết câu đầu cô đọng.

## 3. `checklist.json`

```json
{
  "requires": [{ "selector": "[data-ek-map]", "min": 1 }, { "selector": ".ek-arrow", "min": 1, "max": 8 }],
  "motion": [
    { "kind": "before", "a": "[data-ek-map]", "b": ".ek-arrow" },
    { "kind": "staysInFrame", "selector": ".ek-place" }
  ],
  "limits": { "cameraMoves": 1, "labels": 14, "minFontPx": 36 },
  "data": { "placesFromGazetteer": true, "numbersFromSpeech": true }
}
```

| Khoá | Kiểu | Ai kiểm |
|---|---|---|
| `requires[]` | `{selector, min?, max?}` | lint (đếm trên HTML sau tiền xử lý) → mã `skill_thieu_phan_tu` / `skill_qua_nhieu` |
| `motion[]` | assertion `*.motion.json` của HyperFrames (`appearsBy` `before` `staysInFrame` `keepsMoving`) | `hyperframes check` (gộp với assertion sinh từ kế hoạch beat) |
| `limits.cameraMoves` | số, mặc định 1 | lint |
| `limits.labels` | số tối đa phần tử `.ek-label`/`[data-ek-for]` | lint |
| `limits.minFontPx` | số, ≥ 36 | QA EDUVN (cỡ chữ tính toán) |
| `data.placesFromGazetteer` | bool | lint (`data-ek-place` phải có trong gazetteer) — luôn bật mặc định |
| `data.numbersFromSpeech` | bool, mặc định true | lint (số hiển thị phải có trong slide/lời giảng) |

Mọi khoá tuỳ chọn; `{}` hợp lệ.

## 4. `evals/evals.json`

```json
{
  "skill": "ban-do-chien-dich",
  "evals": [
    { "id": "dbp-3-dot", "nenChon": true,  "scene": { "subject": "su", "grade": 12, "title": "…", "slideText": "…", "speech": [{ "text": "…", "durationMs": 5200 }] }, "tieuChi": ["mũi tên đi từ Tuần Giáo vào Him Lam", "3 đợt đúng thứ tự"] },
    { "id": "dinh-nghia",  "nenChon": false, "scene": { … }, "tieuChi": ["không chọn: cảnh chỉ định nghĩa"] }
  ]
}
```

Đúng 5 ca: 3 `nenChon: true`, 2 `nenChon: false`. `scene` theo `SceneInfo` (anim-plan.md §1). Bộ đo bộ chọn (`scripts/anim-router-eval.mjs`) gom mọi ca này thành tập vàng.

## 5. Đặc trưng nội dung (`loai`) và điều kiện (`can`)

`loai` chỉ dùng các giá trị sau (bộ chọn bước 1 tính trên chữ đã bỏ dấu của tiêu đề + slide + lời giảng; định nghĩa đầy đủ trong `server/src/domain/animRouter.ts`):

`cong-thuc` `ham-so` `so-lieu` `nhiet-am` `thoi-gian` `dia-danh` `ban-do` `dien-bien` `tho` `tu-tu` `nhan-vat` `quy-trinh` `so-sanh` `nhan-qua` `code` `phuong-trinh-hoa` `xac-suat` `tap-hop` `tieu-de` `tong-ket` `tu-khoa` `dinh-nghia` `chuyen-canh`

`can`: danh sách `khoa>=n` (phẩy, tất cả phải đạt). Khoá đếm được:

| Khoá | Đếm |
|---|---|
| `dia-danh` | số địa danh khác nhau trong gazetteer xuất hiện trong chữ |
| `moc-thoi-gian` | số năm khác nhau (1000–2099) + "thế kỷ …" |
| `so` | số giá trị số khác nhau |
| `cau-tho` | số dòng 4–8 âm tiết liên tiếp (thơ) |
| `ten-rieng` | số cụm tên riêng (chữ hoa đầu, không đầu câu) |
| `buoc` | số dấu hiệu bước ("bước", "đầu tiên", "sau đó", "cuối cùng", liệt kê 1. 2. 3.) |
| `cong-thuc` | số biểu thức (`$…$`, `=`, `^`) |
| `thang` | số tên tháng/"T1…T12" khác nhau |

## 6. `index.json` (sinh)

```json
{
  "version": 1,
  "kitVersion": "1",
  "skills": [{
    "id": "ban-do-chien-dich", "nhom": "su", "path": "su/ban-do-chien-dich",
    "ten": "Bản đồ chiến dịch", "description": "…",
    "engine": "hf", "mon": ["su", "dia"], "lop": [6, 12], "loai": ["ban-do", "dien-bien", "thoi-gian"],
    "can": [{ "k": "dia-danh", "n": 2 }], "tranh": ["định nghĩa"], "tuKhoa": ["chiến dịch"],
    "thoiLuong": [12, 45], "fallback": "dong_thoi_gian", "kit": ["map", "arrow"], "version": "1", "vaiTro": "chinh",
    "khiDung": ["…"], "khongDung": ["…"], "tomTat": "≤ 60 từ",
    "bodyText": "thân SKILL.md (cho BM25)", "bodyHash": "sha256 16 ký tự",
    "examples": ["examples/vi-du-1"], "thumb": "thumb.png"
  }]
}
```

`registry.ts` chỉ đọc `index.json` (tầng 1 + tóm tắt) và nạp `SKILL.md`/ví dụ (tầng 2–3) khi đã chọn. Đổi thân skill mà không chạy lại bộ sinh → CI hỏng vì `bodyHash` lệch.
