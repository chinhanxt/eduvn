# services/anim-kit — bộ thành phần EK cho Studio hoạt hình AI

Hợp đồng API: `docs/anim-studio/kit-api.md` (phiên bản kit **1**). Tệp:

| Tệp | Nội dung |
|---|---|
| `kit.js` | `window.EK` — lệnh hoạt cảnh trên timeline GSAP (enter/exit/draw/arrow/grow/morph/count/mark/focus/camera/words/swap/follow/fill/tint, mốc beat `EK.b/cue/end`, `EK.rand`) |
| `kit.css` | biến CSS sinh từ `services/video-theme/tokens.json` + lớp `.ek-*` (lưới 12 cột, chữ, thẻ, phần tử sinh bởi tiền xử lý). Sửa token → chạy lại đoạn sinh trong `scripts/build-anim-kit-css.py`; test `kit.test.ts` bắt lệch |
| `qa/eduvn-check.mjs` | kiểm CDP riêng của EDUVN (màu token, rớt chữ lẻ, nhãn xa vật, beat khớp lời, cỡ chữ, đứng yên) — chạy trong hộp cát |
| `assets/geo/` | bản đồ (Natural Earth `_vnm`, 34 tỉnh, 63 tỉnh) + `dia-danh.json`; nguồn và giấy phép: `assets/geo/NGUON.md` |

Phụ thuộc trình duyệt **không nằm trong repo**: máy chủ chép từ `node_modules` đã ghim trong `server/package.json` vào dự án tạm lúc dựng:
`gsap@3.15.1` (`gsap.min.js`, `DrawSVGPlugin`, `MorphSVGPlugin`, `MotionPathPlugin`; GSAP Standard License — xem thiết kế §3.3/§9.6), `katex@0.16.38` (MIT), phông `services/video-theme/fonts` (OFL). Không có tải ngoài lúc dựng (jsDelivr bị cắt bởi hộp cát).

Đổi engine: mọi bài AI chỉ gọi `EK.*` + tween `tl.*` cơ bản; thay GSAP bằng anime.js chỉ cần viết lại `kit.js` + bộ chuyển `tl` (thiết kế §3.3).
