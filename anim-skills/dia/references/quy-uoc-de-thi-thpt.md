# Quy ước vẽ biểu đồ và làm bài thi TN THPT môn Địa lí (CTGDPT 2018)

Tài liệu chuẩn hoá quy tắc chọn dạng biểu đồ, đơn vị, khoảng cách năm và tính toán số liệu theo chương trình GDPT 2018 và đề thi tốt nghiệp THPT từ năm 2025.

## 1. Quy tắc chọn dạng biểu đồ thích hợp

| Dạng biểu đồ | Dấu hiệu nhận biết trong đề bài & bảng số liệu | Lưu ý bắt buộc |
|---|---|---|
| **Tròn** | Thể hiện **cơ cấu** (tỉ trọng, quy mô và cơ cấu) của **1 đến 3 năm** (hoặc 1–3 đối tượng), số thành phần thường $\le 5$. | Chuyển về **%** trước khi vẽ; tổng mỗi hình tròn **= 100%**. Nếu thể hiện "quy mô và cơ cấu" qua 2–3 năm thì bán kính $R_2 / R_1 = \sqrt{S_2 / S_1}$. Vẽ từ tia 12 giờ theo chiều kim đồng hồ. |
| **Miền** | Thể hiện **sự chuyển dịch cơ cấu** (thay đổi cơ cấu) qua **nhiều năm** (thường **$\ge 4$ mốc năm**). | Bắt buộc xử lý sang **%** (tổng mỗi năm **= 100%**); trục tung 0–100%; **khoảng cách năm trên trục hoành đúng tỉ lệ thật**; năm đầu sát trục tung. |
| **Đường** | Thể hiện **tốc độ tăng trưởng** (lấy năm gốc = 100%) hoặc **diễn biến / xu hướng biến động** của một hay nhiều đối tượng qua **nhiều năm** ($\ge 4$ mốc năm). | **Khoảng cách năm trên trục hoành phải giãn đúng tỉ lệ thật**; năm đầu nằm ngay trên trục tung (hoặc cách đều chuẩn xác). Khi vẽ tốc độ tăng trưởng: tất cả các đường xuất phát từ **100%** tại năm gốc. |
| **Cột** (đơn / ghép / chồng) | Thể hiện **quy mô, sản lượng, diện tích, dân số**, **so sánh** giữa các địa phương/ngành hoặc qua các năm (1–5 mốc). Cột chồng dùng cho quy mô + cơ cấu tuyệt đối hoặc 100% khi không nhấn mạnh chuyển dịch liên tục. | Trục tung **luôn bắt đầu từ 0** (không cắt chân cột làm sai lệch tỉ lệ). Các cột cùng năm/đối tượng ghép sát nhau; giữa các mốc năm giãn đúng khoảng cách năm thật nếu là chuỗi thời gian. |
| **Kết hợp (Cột – Đường)** | Thể hiện **2 đại lượng có đơn vị khác nhau** (VD: diện tích `nghìn ha` và sản lượng `nghìn tấn`, lượng mưa `mm` và nhiệt độ `°C`, tổng dân số và tỉ lệ dân thành thị) nhưng có mối liên hệ qua các năm. | Có **2 trục tung** ghi rõ 2 đơn vị khác nhau; 1 đại lượng vẽ cột, 1 đại lượng vẽ đường; có bảng chú giải rõ ràng. |

## 2. Quy tắc vàng tránh mất điểm (dùng cho tự kiểm tất định)

1. **Khoảng cách năm đúng tỉ lệ thật:**
   - Ví dụ chuỗi năm `2010, 2015, 2018, 2023` có khoảng cách lần lượt là `5 năm — 3 năm — 5 năm`.
   - Toạ độ $x_i$ của năm $y_i$ phải thoả:
     $$\frac{x_i - x_0}{x_{\text{cuối}} - x_0} = \frac{y_i - y_0}{y_{\text{cuối}} - y_0}$$
   - **Lỗi nghiêm trọng:** Chia các năm không đều nhau thành các khoảng bằng nhau trên trục hoành.
2. **Tổng cơ cấu = 100 %:**
   - Mọi bảng tỉ trọng / biểu đồ tròn / miền / cột chồng 100% phải có tổng từng năm bằng **100,0 %** (chấp nhận sai số làm tròn $\le 0,2\%$ nếu mỗi thành phần đã làm tròn 1 chữ số thập phân; ưu tiên hiệu chỉnh số dư ở thành phần lớn nhất hoặc giữ 1 chữ số thập phân chuẩn xác).
3. **Đơn vị rõ ràng, đồng nhất khi tính toán:**
   - Mật độ dân số ($\text{người/km}^2$): đổi dân số về **người** (nghìn người $\times 1000$, triệu người $\times 10^6$) trước khi chia cho diện tích ($\text{km}^2$).
   - Năng suất ($\text{tạ/ha}$): đổi sản lượng về **tạ** (1 tấn = 10 tạ; nghìn tấn $\times 10.000$ tạ) và diện tích về **ha** (nghìn ha $\times 1000$ ha), tức $\text{tạ/ha} = \frac{\text{nghìn tấn} \times 10}{\text{nghìn ha}}$.
   - GDP bình quân đầu người ($\text{USD/người}$ hoặc $\text{triệu đồng/người}$): quy đổi cùng bậc đơn vị trước khi chia.
4. **Số liệu trung thực:** Mọi con số ghi trên biểu đồ và trong bài nhận xét phải có trong bảng nguồn hoặc tính ra được trực tiếp từ bảng nguồn.

## 3. Công thức tính toán Địa lí trọng tâm (chấm tất định)

- **Tỉ trọng (%):** $\text{Tỉ trọng}_i = \frac{x_i}{\sum x} \times 100$
- **Tốc độ tăng trưởng (%):** $I_t = \frac{x_t}{x_0} \times 100$ (với $x_0$ là năm gốc, $I_0 = 100\%$). Mức tăng (%) so với năm gốc: $I_t - 100\%$.
- **Mật độ dân số (người/km²):** $D = \frac{\text{Dân số (người)}}{\text{Diện tích (km}^2\text{)}}$
- **Cán cân xuất nhập khẩu:** $\text{Cán cân} = \text{Xuất khẩu} - \text{Nhập khẩu}$ (dương = xuất siêu, âm = nhập siêu).
- **Tổng trị giá xuất nhập khẩu:** $\text{Tổng XNK} = \text{Xuất khẩu} + \text{Nhập khẩu}$.
- **Biên độ nhiệt năm (°C):** $\Delta T = T_{\max} - T_{\min}$.
- **Tỉ suất gia tăng dân số tự nhiên (%):** $T_g = \frac{S - T}{10}$ (khi $S, T$ tính theo ‰).
- **Độ che phủ rừng (%):** $\frac{\text{Diện tích rừng}}{\text{Tổng diện tích đất tự nhiên}} \times 100$.
