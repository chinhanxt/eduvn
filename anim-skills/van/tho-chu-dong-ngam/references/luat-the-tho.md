# Luật thể thơ tiếng Việt (số chữ, vần, thanh điệu, ngắt nhịp)

Tài liệu quy ước chuyên môn cho skill `tho-chu-dong-ngam` và bộ tự kiểm tất định `server/src/subjects/van/poemVerify.ts`.

## 1. Phân loại thanh điệu tiếng Việt (luật Bằng – Trắc)

| Nhóm | Ký hiệu | Thanh điệu | Dấu chữ Quốc ngữ |
|---|---|---|---|
| **Bằng** | **B** | Thanh ngang (không dấu), thanh huyền | không dấu, dấu huyền (`à, è, ì, ò, ù, ỳ...`) |
| **Trắc** | **T** | Thanh sắc, hỏi, ngã, nặng | sắc (`á`), hỏi (`ả`), ngã (`ã`), nặng (`ạ`) |

## 2. Quy ước gieo vần tiếng Việt

- **Phần vần** của một tiếng = âm đệm (`o/u`) + âm chính (nguyên âm đơn/đôi) + âm cuối (`m, n, ng, nh, p, t, c, ch, i/y, o/u`), không phân biệt phụ âm đầu (âm đầu `qu-` đi cùng `u` là âm đầu; `gi-` trước nguyên âm khác thì `gi` là âm đầu, riêng `gi` đơn hoặc `gìn` thì `i` thuộc phần vần).
- **Vần chính**: giống hệt phần vần và cùng nhóm thanh (B–B hoặc T–T), ví dụ: *trời – mươi* (vần thông `ơi – ươi`), *hoa – ba* (vần chính `oa – a` / vần thông), *thanh – anh* (vần chính `anh – anh`).
- **Vần thông**: gần nhau về âm sắc nguyên âm hoặc âm đệm (`ơi / ươi`, `oi / oai`, `a / oa`, `an / oan`, `en / oen`, `inh / ênh`, `uôn / ôn`, `ương / ơng`, `i / y`, `ao / au`, `ai / ay`), cùng nhóm thanh B–B hoặc T–T.
- **Vần chân**: gieo ở tiếng cuối dòng thơ.
- **Vần lưng**: tiếng cuối dòng trên gieo vào tiếng ở giữa dòng dưới (đặc trưng của lục bát và song thất lục bát).

## 3. Bảng 5 thể thơ trọng tâm CTGDPT 2018

### 3.1 Lục bát (6 – 8)
- **Số tiếng**: từng cặp luân phiên **6 tiếng** (câu lục) – **8 tiếng** (câu bát); tổng số câu là số chẵn (≥ 2).
- **Gieo vần**:
  - Tiếng thứ **6** câu lục (vần bằng) gieo vần với tiếng thứ **6** câu bát (vần lưng, thanh bằng).
  - Tiếng thứ **8** câu bát (vần bằng) gieo vần với tiếng thứ **6** câu lục kế tiếp (vần chân, thanh bằng).
  - *Biến thể hợp lệ*: lục bát biến thể có thể gieo tiếng 6 câu lục vào tiếng 4 câu bát (như *“Gần bùn mà chẳng hôi tanh mùi bùn”*), hoặc sai lệch số chữ ở lục bát hiện đại (ghi chú riêng).
- **Luật thanh điệu (2–4–6–8)**:
  - Câu lục: tiếng 2 **B**, tiếng 4 **T**, tiếng 6 **B**.
  - Câu bát: tiếng 2 **B**, tiếng 4 **T**, tiếng 6 **B**, tiếng 8 **B** (tiếng 6 và tiếng 8 khác bậc thanh: một ngang – một huyền).
- **Ngắt nhịp chủ đạo**: nhịp chẵn **2/2/2**, **2/4**, **4/2** (câu lục); **4/4**, **2/2/2/2**, **2/2/4** (câu bát). Một số câu phá cách ngắt lẻ **3/3** để tạo điểm nhấn.
- **Ví dụ công cộng**: *Truyện Kiều* (Nguyễn Du):
  - *Ngày xuân / con én đưa thoi,* (6 · 2/4 · **thoi**)
  - *Thiều quang chín chục / đã ngoài sáu mươi.* (8 · 4/4 · **ngoài** ↔ *thoi*, **mươi**)
  - *Cỏ non / xanh tận / chân trời,* (6 · 2/2/2 · **trời** ↔ *mươi*)
  - *Cành lê / trắng điểm / một vài bông hoa.* (8 · 2/2/4 · **hoa**)

### 3.2 Song thất lục bát (7 – 7 – 6 – 8)
- **Số tiếng**: mỗi khổ 4 dòng theo chu kỳ **7 – 7 – 6 – 8**.
- **Gieo vần**:
  - Tiếng **7** câu thất 1 (thanh **trắc**) gieo vần lưng với tiếng **5** câu thất 2 (thanh **trắc**).
  - Tiếng **7** câu thất 2 (thanh **bằng**) gieo vần chân với tiếng **6** câu lục (thanh **bằng**).
  - Tiếng **6** câu lục (bằng) gieo với tiếng **6** câu bát (bằng).
  - Tiếng **8** câu bát (bằng) gieo với tiếng **5** câu thất 1 khổ sau (vần lưng, bằng) hoặc chuyển sang khổ mới.
- **Ngắt nhịp**: câu thất ngắt **3/4** (hoặc **3/2/2**); câu lục bát ngắt nhịp chẵn **2/2/2**, **4/4**.
- **Ví dụ công cộng**: *Chinh phụ ngâm* (Đặng Trần Côn – bản diễn Nôm Đoàn Thị Điểm):
  - *Thuở trời đất / nổi cơn gió bụi,* (7 · 3/4 · **bụi** T)
  - *Khách má hồng / nhiều nỗi truân chuyên.* (7 · 3/4 · **nỗi** / **chuyên** B)
  - *Xanh kia / thăm thẳm từng trên,* (6 · 2/4 · **trên** B ↔ *chuyên*)
  - *Vì ai gây dựng / cho nên nỗi này.* (8 · 4/4 · **nên** B ↔ *trên*)

### 3.3 Thất ngôn (Đường luật: Tứ tuyệt 4×7 & Bát cú 8×7)
- **Số tiếng**: mỗi dòng đúng **7 tiếng**; tứ tuyệt gồm 4 câu (Khai – Thừa – Chuyển – Hợp), bát cú gồm 8 câu (Đề – Thực – Luận – Kết).
- **Gieo vần**: độc vận (một vần bằng duy nhất) ở tiếng cuối các câu **1 (tuỳ chọn), 2, 4** (tứ tuyệt) hoặc **1 (tuỳ chọn), 2, 4, 6, 8** (bát cú).
- **Đối (bát cú)**: câu 3 đối câu 4 (hai câu thực), câu 5 đối câu 6 (hai câu luận).
- **Ngắt nhịp**: chủ đạo **4/3** (hoặc **2/2/3**); đôi khi **2/3/2** để tạo điểm nhấn.
- **Ví dụ công cộng**: *Bánh trôi nước* (Hồ Xuân Hương — thất ngôn tứ tuyệt):
  - *Thân em vừa trắng / lại vừa tròn,* (7 · 4/3 · **tròn**)
  - *Bảy nổi ba chìm / với nước non.* (7 · 4/3 · **non**)
  - *Rắn nát mặc dầu / tay kẻ nặn,* (7 · 4/3)
  - *Mà em vẫn giữ / tấm lòng son.* (7 · 4/3 · **son**)

### 3.4 Thơ năm chữ (Ngũ ngôn)
- **Số tiếng**: mỗi dòng đúng **5 tiếng**, thường chia khổ 4 câu (hoặc liên tục).
- **Gieo vần**: linh hoạt hơn Đường luật — vần chân (liền aabb, cách abab/abcb hoặc ôm abba), có thể dùng cả vần bằng hoặc vần trắc.
- **Ngắt nhịp**: chủ đạo **2/3** hoặc **3/2** (đôi khi **1/4** hoặc **2/1/2**).

### 3.5 Thơ tự do
- **Số tiếng**: không cố định số chữ giữa các dòng, không ràng buộc cứng số câu mỗi khổ; có thể dài ngắn xen kẽ theo mạch cảm xúc.
- **Gieo vần & nhịp**: có vần hoặc không vần, ngắt nhịp linh hoạt theo ý và hơi thở đọc.
- **Kiểm tất định**: xác nhận các dòng có độ dài biến thiên (không đồng đều thành thể cách luật cứng) và ghi chú đặc điểm nhịp tự do.

## 4. Quy ước hiển thị trên sân khấu hoạt hình (`tho-chu-dong-ngam`)

- Câu thơ dùng font serif `.ek-read` (Source Serif 4, ≥ 46 px ở 1080p); câu lục thụt vào 0 px, câu bát thụt lùi phải hoặc căn đều theo cột lưới.
- Dấu ngắt nhịp `/` hiển thị mảnh, màu phụ `--ink3` hoặc `--c-tim`, cỡ ≥ 36 px.
- Chữ gieo vần tô đồng màu (1 cặp vần = 1 màu trong `EK.combo('coDien')`), có đường cung mảnh nối giữa hai tiếng gieo vần sau khi cả hai dòng đã đọc xong.
- Mốc hiện từng từ: **mặc định nội suy theo âm tiết** từ `durationMs` từng câu (dấu `, . ; :` cộng 1 âm tiết nghỉ); chỉ chạy căn chỉnh cưỡng bức `MMS_FA` dưới khoá `heavy` khi cần karaoke sát giọng ngâm thật.
