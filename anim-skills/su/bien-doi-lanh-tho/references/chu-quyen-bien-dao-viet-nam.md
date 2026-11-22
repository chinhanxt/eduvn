# Quy ước thể hiện chủ quyền biển đảo Việt Nam trên bản đồ Lịch sử

Tài liệu bắt buộc cho mọi skill có bản đồ (`ban-do-chien-dich`, `bien-doi-lanh-tho`) và trang tương tác `/hoc/su/dong-thoi-gian`.

## 1. Nguồn dữ liệu địa lý bắt buộc

- **Bắt buộc** dùng bản Natural Earth theo góc nhìn Việt Nam: `ne_10m_admin_0_countries_vnm` (Public Domain, từ kho `nvkelso/natural-earth-vector`).
- Không dùng bản mặc định (`ne_10m_admin_0_countries`) hay bản bản đồ thế giới chưa tách góc nhìn Việt Nam, vì bản mặc định thể hiện theo hiện trạng tranh chấp.
- Lớp nền chính thức của EDUVN thuộc gói Địa (`services/anim-kit-data/geo/`). Gói Sử chỉ đọc lớp nền này; trong giai đoạn gói Địa chưa cung cấp, bản tạm đặt trong `/tmp/su-geo/` và ghi rõ trong báo cáo.

## 2. Yêu cầu hiển thị trực quan trên mọi bản đồ

1. **Quần đảo Hoàng Sa** (vùng 15°45′B–17°15′B, 111°00′Đ–113°00′Đ, thuộc TP. Đà Nẵng) và **Quần đảo Trường Sa** (vùng 6°30′B–12°00′B, 111°30′Đ–117°20′Đ, thuộc tỉnh Khánh Hoà) phải luôn hiện rõ ràng, đồng bộ màu chủ quyền với đất liền Việt Nam.
2. Nhãn hiển thị: `QĐ. Hoàng Sa` và `QĐ. Trường Sa` (kèm `(Việt Nam)` ở bản đồ khu vực Đông Nam Á / Biển Đông). Cỡ chữ đạt ≥ 36 px trong video 1080p, không bị cắt khỏi khung.
3. Ghi rõ tên **Biển Đông** (chữ nghiêng `Source Serif 4`, màu `--accent`).
4. Với bản đồ phóng lớn vào một địa phương/chiến trường cụ thể (không chứa trực tiếp toạ độ Biển Đông trong khung chính), phải kèm **khung bản đồ Việt Nam thu nhỏ (inset)** ở một góc trống, thể hiện trọn vẹn đất liền cùng Hoàng Sa, Trường Sa.
5. Với bản đồ lịch sử biến đổi lãnh thổ qua các triều đại (`bien-doi-lanh-tho`), luôn giữ đường viền mảnh đường bờ lãnh thổ Việt Nam hiện nay làm nền tham chiếu địa lý, và thể hiện rõ quá trình xác lập, thực thi chủ quyền của nhà nước phong kiến Việt Nam (đội Hoàng Sa, đội Bắc Hải từ thế kỷ XVII thời chúa Nguyễn; cắm cờ, đo đạc thời vua Minh Mạng năm 1816/1836 theo sử liệu).

## 3. Kiểm chứng bắt buộc bằng ảnh chụp

Trước khi giao bất kỳ bản đồ hoặc clip nào có bản đồ, phải xuất ảnh tĩnh (`/tmp/su-*.png`) và kiểm bằng mắt 4 mục:
- [ ] Đất liền Việt Nam liền mạch, không biến dạng tỉ lệ.
- [ ] Có đủ hai quần đảo **Hoàng Sa** và **Trường Sa** đúng vị trí địa lý.
- [ ] Nhãn `QĐ. Hoàng Sa`, `QĐ. Trường Sa`, `Biển Đông` rõ ràng, không đè nhau và không ra ngoài khung.
- [ ] Không có đường đứt nét hay ký hiệu chủ quyền sai lệch trên Biển Đông.
