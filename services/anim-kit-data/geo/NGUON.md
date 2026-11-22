# Nguồn và giấy phép dữ liệu bản đồ (`services/anim-kit-data/geo/`)

Thư mục này thuộc sở hữu của gói môn Địa lí (`mon-dia`) và được dùng chung với gói môn Lịch sử (`mon-su`) cùng hệ Studio hoạt hình (`services/anim-kit`).

## 1. Danh mục tệp

| Tệp | Nội dung | Nguồn gốc | Giấy phép |
|---|---|---|---|
| `ne_vnm_admin0.topo.json` | Biên giới quốc gia thế giới theo góc nhìn Việt Nam (`ne_10m_admin_0_countries_vnm`), giữ nguyên 19 đa giác quần đảo Hoàng Sa & Trường Sa thuộc Việt Nam (`VNM`) + lớp `islands` riêng | Natural Earth v5.1.2 (`nvkelso/natural-earth-vector`, `geojson/ne_10m_admin_0_countries_vnm.geojson`) | Public Domain (CC0 / PD) |
| `vn34.topo.json` | 34 tỉnh, thành phố trực thuộc Trung ương sau sắp xếp từ 01/07/2025 (6 TP trực thuộc TW + 28 tỉnh), gộp ranh giới chính xác từ 63 tỉnh cũ kèm Đặc khu Hoàng Sa (TP. Đà Nẵng) và Đặc khu Trường Sa (tỉnh Khánh Hòa) | Ranh giới gốc: geoBoundaries VNM ADM1 (`gbOpen/VNM/ADM1`, Public Domain) + Natural Earth `_vnm` (PD); danh mục, diện tích, dân số, trung tâm hành chính: Nghị quyết 202/2025/QH15 của Quốc hội khóa XV | Public Domain (ranh giới) + văn bản quy phạm pháp luật Việt Nam |
| `vn63.topo.json` | 63 tỉnh, thành phố theo Atlat Địa lí Việt Nam cũ (gộp Côn Đảo về Bà Rịa – Vũng Tàu; gắn Hoàng Sa vào Đà Nẵng, Trường Sa vào Khánh Hòa) | geoBoundaries VNM ADM1 (`gbOpen/VNM/ADM1`, Public Domain) + Natural Earth `_vnm` (PD); số liệu Niên giám Thống kê (Tổng cục Thống kê) | Public Domain |
| `song-ho.topo.json` | Hệ thống sông chính (30 nhánh sông vùng Việt Nam & lưu vực Mê Kông/Hồng) và 10 hồ tiêu biểu (Ba Bể, Thác Bà, Hòa Bình, Tây, Biển Hồ Pleiku, Dầu Tiếng, Trị An, Tonlé Sap…) | Sông & hồ lớn: Natural Earth `ne_10m_rivers_lake_centerlines`, `ne_10m_lakes` (PD). Hồ Việt Nam chi tiết: OpenStreetMap qua Overpass API | Public Domain (Natural Earth) + ODbL 1.0 (OpenStreetMap, © OpenStreetMap contributors) |
| `dia-danh.json` | Bộ địa danh đã kiểm chứng (thành phố, đỉnh núi, đèo, cửa khẩu, đảo/quần đảo, cực địa lý, vịnh biển, di tích, hồ thủy điện), mỗi mục có trường `nguon` riêng | Cục Đo đạc, Bản đồ và Thông tin địa lý Việt Nam; Nghị quyết 202/2025/QH15; Atlat Địa lí Việt Nam (NXB Giáo dục Việt Nam); Natural Earth `_vnm`; OpenStreetMap | Ghi rõ trong từng mục (`nguon`) |

## 2. Xác minh chủ quyền lãnh thổ (BẮT BUỘC)

- Quần đảo **Hoàng Sa** (7 đa giác trích trực tiếp từ `ne_10m_admin_0_countries_vnm.geojson`, Đặc khu Hoàng Sa, TP. Đà Nẵng) và quần đảo **Trường Sa** (12 đa giác trích trực tiếp từ `ne_10m_admin_0_countries_vnm.geojson`, Đặc khu Trường Sa, tỉnh Khánh Hòa) **luôn** thuộc Việt Nam (`VNM`) trong cả 3 tệp bản đồ `ne_vnm_admin0.topo.json`, `vn34.topo.json`, `vn63.topo.json`, đồng thời có trong `dia-danh.json`.
- Không có quốc gia nào khác trong `ne_vnm_admin0.topo.json` chứa đa giác thuộc hai quần đảo này.
- Mọi thao tác giản lược TopoJSON đều giữ nguyên hình học quần đảo Hoàng Sa và Trường Sa (không loại bỏ theo ngưỡng diện tích).
- Kiểm chứng trực quan bằng ảnh chụp: `/tmp/dia-geo-sovereignty.png` và ghi nhận trong `docs/reports/mon-dia.md`.

## 3. Quy chuẩn kỹ thuật

- Chuẩn TopoJSON 1.0, lượng tử hoá `100.000` (delta-encoded arcs), bảo toàn tô-pô chia sẻ cung biên chung giữa các tỉnh giáp ranh (không hở khe).
- Tổng dung lượng toàn bộ tệp trong thư mục < 1 MB (ngưỡng cho phép ≤ 3 MB).
