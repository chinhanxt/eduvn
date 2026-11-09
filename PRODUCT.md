# EDUVN — Sản phẩm

> Tên `eduvn` là tên tạm (codename). Đổi tên thương mại sau, không ảnh hưởng code.

## 1. Mục tiêu

Một hệ thống **giảm hàng giờ việc tay của giáo viên Việt Nam**: soạn câu hỏi, ra đề, chấm, làm slide, video bài giảng, giáo trình, quản lý học viên — đúng chuẩn Bộ GD&ĐT, dùng được từ:

1. **AI chat web** (Claude.ai, ChatGPT…) qua **MCP** + đăng nhập **SSO**.
2. **Zalo** (nhóm lớp, nhắn riêng) qua cầu nối kiểu `2anh-zalo-bot`.
3. **Web app riêng** (giai đoạn sau).

Dùng được cho **cả tổ chức nhỏ**: 1 giáo viên tự do → trung tâm 5 người → trường/khoa. Người mới đăng nhập lần đầu tự có "Không gian cá nhân" (một tổ chức 1 người), không cần ai cấp.

## 2. Người dùng & vai trò

| Vai trò | Ai | Được làm |
|---|---|---|
| `owner` | Chủ không gian / chủ trung tâm | Mọi thứ, kể cả quản lý thành viên |
| `admin` | Quản trị trường/khoa | Như owner |
| `teacher` | Giáo viên / giảng viên | Ngân hàng câu hỏi, ra đề, xem đáp án, chấm, lớp của mình |
| `assistant` | Trợ giảng | Xem câu hỏi, xem đáp án, chấm |
| `student` | Học sinh / sinh viên | Làm bài, xem kết quả của mình, hỏi gia sư (giai đoạn sau) |

## 3. Đầu vào → Đầu ra của sản phẩm

| # | Module | Đầu vào (GV/SV đưa gì) | Đầu ra (hệ thống trả gì) | Đợt |
|---|---|---|---|---|
| 1 | Tài khoản & tổ chức | Đăng nhập SSO (Google/Microsoft/email qua Keycloak) | Tài khoản, không gian cá nhân, vai trò theo tổ chức | P1 |
| 2 | Ngân hàng câu hỏi | Câu hỏi nhập tay / AI soạn từ SGK, giáo trình / file Word | Câu hỏi chuẩn hoá: môn, lớp, chủ đề, mức độ NB/TH/VD, 4 dạng câu | P1 |
| 3 | Ra đề | Ma trận đề (chủ đề × mức độ × dạng câu × số câu), số mã đề | N mã đề trộn câu + trộn phương án, đáp án, file **.docx** | P1 |
| 4 | Chấm trắc nghiệm | Bài làm (JSON / sau này: ảnh phiếu) | Điểm theo quy tắc CV 7991 (đúng/sai bậc thang 0,1–0,25–0,5–1) | P1 |
| 5 | MCP | Câu lệnh tự nhiên trong AI chat | Tool `tim_cau_hoi`, `them_cau_hoi`, `tao_de`, `lay_dap_an`, `cham_bai`, `xuat_word` | P1 |
| 6 | Kênh Zalo | Tin nhắn Zalo (nhóm lớp / riêng) | Bot trả lời, gửi đề, nhắc lịch, thông báo lớp | P2 |
| 7 | Kết nối AI chat công khai | URL MCP công khai (HTTPS) | Connector trên Claude.ai / ChatGPT, đăng nhập SSO | P3 |
| 8 | Quản lý học viên | Danh sách lớp (Excel), điểm danh | Lớp, sổ điểm, nhận xét theo TT22/TT27 | P4 |
| 9 | Slide & video bài giảng (cho GV) | Chủ đề / giáo án / tài liệu | Slide PPTX, video MP4 có giọng đọc tiếng Việt (qua OpenMAIC) | P5 |
| 10 | Gia sư & giáo trình cho học sinh | Tài liệu môn học, SGK | Gia sư hỏi đáp theo tài liệu, luyện câu + ôn giãn cách, giáo trình nhiều chương (qua DeepTutor) | P6 |
| 11 | Chấm bài giấy | Ảnh phiếu trả lời / bài tự luận | Điểm + nhận xét (OCR tiếng Việt + mô hình đọc ảnh) | P7 |
| 12 | Skill sư phạm VN | — | Giáo án CV 5512, ma trận/đặc tả CV 7991, nhận xét TT22/27 cho agent | P8 |

## 4. Chuẩn Việt Nam phải bám

- **CV 7991/BGDĐT-GDTrH (17/12/2024)**: ma trận + bản đặc tả; đề 3 phần trắc nghiệm:
  - Phần I: nhiều lựa chọn (4 phương án), 0,25đ/câu.
  - Phần II: đúng/sai (4 ý a–d), đúng 1 ý 0,1đ · 2 ý 0,25đ · 3 ý 0,5đ · 4 ý 1đ.
  - Phần III: trả lời ngắn, 0,25đ/câu (môn Toán 0,5đ/câu).
  - (Tự luận nếu môn có.)
- **CV 5512**: mẫu kế hoạch bài dạy (P8).
- **TT22 (THCS/THPT) / TT27 (Tiểu học)**: nhận xét, đánh giá (P4).

Quy tắc điểm để **cấu hình được** (`PointRules`), mặc định như trên.

## 5. Không làm (ít nhất tới hết P3)

- Không thanh toán / billing.
- Không app mobile riêng (Zalo + AI chat là kênh mobile).
- Không tự viết lại slide/video/gia sư — dùng OpenMAIC và DeepTutor làm dịch vụ phía sau.
- Không công thức MathType trong .docx ở P1 (LaTeX giữ dạng chữ; nâng cấp ở đợt sau).

## 6. Thước đo thành công

- GV tạo **đề 4 mã + đáp án .docx trong < 3 phút** từ AI chat (hiện nay: 1–3 giờ).
- Chấm 40 bài trắc nghiệm trong < 1 phút.
- Một GV tự do đăng nhập lần đầu tới khi có đề đầu tiên: < 10 phút, không cần quản trị cấp quyền.
