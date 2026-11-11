# services/pptmaster — PowerPoint gốc (ppt-master) cho gói "Xuất bản & Nhập" (P14/GX)

Upstream: [hugohe3/ppt-master](https://github.com/hugohe3/ppt-master) (MIT), commit `3c6ffd0ee6d6e31aa9ca316bd157173802e3526f` (2026-11-09).
Dùng nguyên bản thư mục `skills/ppt-master` (không sửa code upstream), cài ngoài repo bằng `setup.sh`:

- venv `~/Apps/pptmaster` (python-pptx, XlsxWriter, skia-pathops, uharfbuzz, PyYAML; Pillow đi kèm python-pptx)
- mã upstream ở `~/Apps/pptmaster/src/ppt-master` (biến `PPTMASTER_SKILL` để đổi chỗ)

`eduvn_pptx.py` (của EDUVN) là lớp vỏ máy chủ gọi:

| Lệnh | Việc |
|---|---|
| `build <job.json>` | dự án SVG do `server/src/services/pptx` sinh → `svg_to_pptx.py` (hình gốc sửa được, Office Math gốc, biểu đồ/bảng gốc, chuyển trang, hiệu ứng theo lời, giọng đọc nhúng từng trang, ghi chú). Công thức không biên dịch được → để chữ xem trước (không chặn cả bài). Trang qua cổng kiểm Quick thì xuất đường `--quick-generate`, trang tự do (cảnh AI chồng lớp) xuất đường tương thích. Có mẫu → đổ bài vào mẫu: giữ nguyên master/layout/theme/logo của tệp mẫu, tiêu đề/nội dung thành placeholder của mẫu |
| `omml` | stdin danh sách LaTeX → OMML (bộ biên dịch `formula_compiler.py` của ppt-master, không dùng mathml2omml LGPL) |
| `analyze <mau.pptx>` | màu theme, phông, kích thước, các layout + placeholder |
| `import <bai.pptx>` | `import_pptx.py`: .pptx → phần tử canvas OpenMAIC (giữ vị trí, chữ giàu định dạng, hình preset qua `pptx_to_svg/prstgeom_to_svg.py`, ảnh, bảng, biểu đồ, đường, nền, hình của master/layout, công thức OMML → LaTeX qua `source_to_md/_omml_latex.py`, ghi chú) |

Máy chủ gọi qua `server/src/services/pptx/sidecar.ts` (một việc mỗi lúc, bọc `heavy run eduvn-pptx --` khi có `HEAVY_BIN`).
Biến môi trường: `PPTMASTER_HOME` (mặc định `~/Apps/pptmaster`), `PPTMASTER_PYTHON`, `PPTMASTER_SKILL`, `PPTMASTER_TIMEOUT_MS`.
