# services/manim — mẫu hoạt hình toán cố định

`templates.py`: 4 cảnh Manim Community (MIT) — `DoThiHamSo`, `BienDoiCongThuc`, `HinhHocDienTich`, `TrucSo`.
Máy chủ (`server/src/services/anim/`) chỉ sinh `spec.json` đã kiểm zod rồi chạy `manim render` với biến `EDUVN_SPEC`; mã Python do AI viết không bao giờ được chạy.

Môi trường ngoài repo: venv `~/Apps/manim` (`pip install manim`), TinyTeX bản user ở `~/Apps/tinytex` (gói: standalone preview doublestroke relsize fundus-calligra wasysym physics rsfs wasy cm-super babel-vietnamese dvisvgm). Công thức dùng `MathTex`; chữ tiếng Việt dùng `Text` (Pango), nên mọi chữ tiếng Việt nằm ở `tieuDe`/`nhan`/`ghiChu`, không nằm trong LaTeX.

Bản Manim đang dùng: xem `~/Apps/manim/bin/manim --version`.

## Phong cách "Giấy học thuật" (Đợt Thẩm mỹ, 2026-11-11)
`studio.py` (khung chung: token `services/video-theme/tokens.json`, phông Inter + Source Serif 4 đăng ký qua `manimpango`, đầu cảnh, dòng lời giảng `EDUVN_CAPTIONS`, lịch beat như bản HyperFrames) và `studio_toan.py` (`DoThiHamSo`, `VongTronLuongGiac` bố cục 2 cột). Máy chủ truyền `EDUVN_THEME`, `EDUVN_TOKENS`, `EDUVN_FONTS`. Các mẫu còn lại vẫn dùng `common.py` cũ cho tới giai đoạn 2.
