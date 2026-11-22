# Quy ước vẽ biểu đồ kiểu Atlat Địa lí Việt Nam

Tài liệu chuyên môn dành cho kho skill hoạt hình `anim-skills/dia/` và công cụ vẽ biểu đồ môn Địa lí (CTGDPT 2018).

## 1. Biểu đồ nhiệt – ẩm (khí hậu) theo Atlat Địa lí Việt Nam (trang 9)

- **Hai đại lượng, hai trục tung độc lập:**
  - **Trục tung bên trái (hoặc bên phải tuỳ bố cục, EDUVN chuẩn hoá theo `kit-api.md`):** **Lượng mưa** (đơn vị **mm**), vẽ bằng **cột màu xanh lam** (`--c-lam` `#2F5D8A`). Trục luôn bắt đầu từ **0**.
  - **Trục tung còn lại:** **Nhiệt độ** (đơn vị **°C**), vẽ bằng **đường màu đỏ son** (`--c-doSon` `#B42318`), có chấm tròn tại từng tháng.
  - **Quy ước tỉ lệ nhiệt – ẩm (quy tắc Gaussen / Atlat):** 1 °C tương ứng 2 mm mưa (hoặc ghi chú tỉ lệ trục rõ ràng khi mưa > 400 mm/tháng ở trạm mưa lớn như Huế, Đà Nẵng để cột không che khuất đường nhiệt).
- **Trục hoành:** 12 tháng trong năm (`T1` đến `T12` hoặc `1` đến `12`), giãn đều nhau.
- **Đánh dấu mùa mưa / mùa khô:**
  - Theo quy ước khí hậu Việt Nam (SGK Địa lí 12 & Atlat): **tháng mưa** có lượng mưa $\ge 100\text{ mm}$ (hoặc vượt đường $P = 2T$); **mùa mưa** gồm tối thiểu 3 tháng liên tiếp có $P \ge 100\text{ mm}$ (VD Hà Nội: T5–T10; Huế: T9–T12; TP.HCM: T5–T11).
  - Tô dải nền nhạt (`--accent-soft`) vùng mùa mưa (`.ek-season`), kèm nhãn "Mùa mưa" không đè lên đỉnh cột hay đường nhiệt.
- **Các chỉ số tóm tắt bắt buộc kiểm từ bảng 12 tháng:**
  - Nhiệt độ trung bình năm: $\bar{T} = \frac{1}{12}\sum_{i=1}^{12} T_i$ (°C, làm tròn 1 chữ số thập phân).
  - Biên độ nhiệt năm: $\Delta T = T_{\max} - T_{\min}$ (°C).
  - Tổng lượng mưa năm: $P_{\text{năm}} = \sum_{i=1}^{12} P_i$ (mm).

## 2. Tháp dân số (Atlat trang 15)

- **Trục tung ở giữa:** Các nhóm tuổi từ dưới lên trên (0–4, 5–9, …, 80+ hoặc 85+), mỗi nhóm cách nhau 5 tuổi; có thể phân 3 nhóm lớn (0–14, 15–64, 65+) bằng dải màu hoặc đường kẻ phụ.
- **Trục hoành hai phía đối xứng từ 0:**
  - Bên trái: **Nam** (màu `--c-lam` `#2F5D8A`), đơn vị **%** (hoặc triệu người).
  - Bên phải: **Nữ** (màu `--c-hong` `#B8336A` hoặc `--c-lucLam` `#0B7285`), đơn vị **%**.
  - Hai phía **bắt buộc cùng tỉ lệ chia vạch** để học sinh so sánh trực tiếp tỉ số giới tính theo từng nhóm tuổi.
- **So sánh hai năm:** Biến hình thanh ngang (`EK.morph` hoặc thanh ghép/viền đứt của năm gốc chồng lên năm mới) để thấy rõ xu hướng **đáy thu hẹp – thân phình – đỉnh mở rộng** (già hoá dân số).

## 3. Bản đồ chuyên đề (Choropleth) và bản đồ luồng

- **Chủ quyền lãnh thổ (BẮT BUỘC):** Mọi bản đồ Việt Nam (dù lớp 34 tỉnh sau 01/07/2025 hay lớp 63 tỉnh theo Atlat cũ) **phải thể hiện đầy đủ quần đảo Hoàng Sa (TP. Đà Nẵng) và quần đảo Trường Sa (tỉnh Khánh Hòa)** cùng nhãn rõ ràng, đường bờ lấy từ Natural Earth `_vnm`.
- **Thang màu tuần tự:** Tối đa 4–5 bậc màu từ nhạt đến đậm trong cùng một họ màu (họ lam hoặc lục lam), đảm bảo phân biệt được ở người mù màu và đạt độ tương phản chữ/nền WCAG AA.
- **Chú giải trực tiếp:** Đặt tên vùng/tỉnh tiêu biểu và giá trị gần vùng hoặc qua đường dẫn mảnh `.ek-leader`, không nhồi quá 12 nhãn trong một cảnh video.
- **Bản đồ luồng:** Độ dày mũi tên **tỉ lệ thuận** với lưu lượng (khối lượng hàng hoá, lượt di cư), thân cong mượt tránh cắt chồng chữ, mũi tên hướng rõ từ nơi xuất đi đến nơi đến.

## 4. Mặt cắt địa hình (Atlat trang 13–14)

- **Trục tung:** Độ cao (m), bắt đầu từ 0 m (mực nước biển), ghi rõ đơn vị `m` ở đầu trục.
- **Trục hoành:** Khoảng cách ngang dọc tuyến cắt A–B (km), ghi rõ hướng tuyến (VD: Tây Bắc – Đông Nam).
- **Kí hiệu địa danh:** Gắn đúng toạ độ đỉnh núi, thung lũng, sông lớn dọc tuyến cắt; ghi độ cao tuyệt đối đúng nguồn (VD: Fansipan 3.143 m, sông Đà, sông Hồng).
