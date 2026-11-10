# services/manim — mẫu hoạt hình toán cố định

`templates.py`: 4 cảnh Manim Community (MIT) — `DoThiHamSo`, `BienDoiCongThuc`, `HinhHocDienTich`, `TrucSo`.
Máy chủ (`server/src/services/anim/`) chỉ sinh `spec.json` đã kiểm zod rồi chạy `manim render` với biến `EDUVN_SPEC`; mã Python do AI viết không bao giờ được chạy.

Môi trường ngoài repo: venv `~/Apps/manim` (`pip install manim`), TinyTeX bản user ở `~/Apps/tinytex` (gói: standalone preview doublestroke relsize fundus-calligra wasysym physics rsfs wasy cm-super babel-vietnamese dvisvgm). Công thức dùng `MathTex`; chữ tiếng Việt dùng `Text` (Pango), nên mọi chữ tiếng Việt nằm ở `tieuDe`/`nhan`/`ghiChu`, không nằm trong LaTeX.

Bản Manim đang dùng: xem `~/Apps/manim/bin/manim --version`.
