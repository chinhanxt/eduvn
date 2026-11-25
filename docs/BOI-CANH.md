# EDUVN: bối cảnh dự án (nguồn chuẩn duy nhất)

> Mọi agent và mọi profile (Claude, Codex, agy/Gemini) **đọc file này trước tiên**. Thay đổi quyết định nào thì sửa ngay ở đây và commit. Cập nhật lần cuối: 2026-11-23 (thêm AI hồ sơ, kho công cụ 3 tầng, AI local).

## 1. Dự án là gì
- **Môi trường, công cụ dạy và học có AI** theo chương trình Việt Nam (CTGDPT 2018, CV 7991, SGK). **KHÔNG phải LMS** (quản lý lớp, hành chính).
- Dùng cho **mọi môn, mọi cấp** (cấp 2, cấp 3, đại học). Đầu dự án thiên về Toán, nên mọi chức năng mới phải **trung lập môn**: dữ liệu mẫu, ví dụ, nhãn phải trải đủ nhiều môn.
- **Người dùng:** giáo viên, học sinh/sinh viên, **phụ huynh không rành công nghệ**, ban giám hiệu và tổ trưởng.
- **Ý tưởng lõi:** vòng lặp khép kín **Phát hiện → Cá nhân hoá → Báo đúng người**.
  - HS làm bài, AI tìm lỗ hổng.
  - AI tự sinh bài luyện vừa sức và video riêng cho từng em.
  - GV thấy ngay em nào cần giúp.
  - Phụ huynh nhận một tin dễ hiểu kèm cách kèm con.
  - Nhà trường thấy bức tranh chung.

## 2. Phạm vi: dự án ĐEM ĐI THI, làm "bán mockup"
- **Lõi chạy thật**, để demo trực tiếp và khi bị hỏi không vỡ.
- **Phần mở rộng là mockup đẹp**: có dữ liệu mẫu, tự thao tác như thật, chạy không cần server hay AI. **Mockup chỉ làm frontend**: không viết backend, API, migration hay test sâu (chủ dự án dặn 2026-11-25: "đừng làm quá kỹ backend").
- **Trọng tâm là video demo và bài thuyết trình.** Sản phẩm là bằng chứng cho câu chuyện.
- **Không** đặt mục tiêu làm thật toàn bộ 452 chức năng OpenMAIC/DeepTutor. **395 mục còn lại làm mockup**, gom khoảng 45–55 màn; bảng mục ở `docs/research/2026-11-11-p14-parity.md`.

## 3. 11 nỗi đau phải có (chủ dự án yêu cầu thêm đủ)
1. Lớp đông: giao bài phân hoá tự động theo trình độ.
2. HS không biết mình hổng chỗ nào: vòng lặp lỗ hổng tự chạy.
3. Đổi mới CTGDPT 2018: dạy theo năng lực, học tích cực.
4. Mạng yếu, vùng khó: dùng offline.
5. **Giấy tờ GV:** kế hoạch bài dạy theo CV 5512, sổ đầu bài, báo cáo, nhập VNEdu/SMAS.
6. **Phụ huynh:** biết con học ra sao, được hướng dẫn kèm con bằng lời dễ hiểu, có đọc to.
7. HS dùng ChatGPT làm hộ: bài tập chống AI, nhận diện bài làm bằng AI.
8. Ban giám hiệu: dữ liệu ra quyết định, so sánh lớp, cảnh báo sớm.
9. Áp lực thi: ôn THPT/ĐH theo năng lực, hướng nghiệp và chọn ngành.
10. Sức khoẻ tinh thần HS: phát hiện sớm khi quá tải.
11. Chia sẻ học liệu giữa GV và giữa các tổ.

## 4. Thẩm mỹ: ưu tiên số 1
- **Web:** theo `docs/design/chuan-dep.md`. Hình nói thay chữ, rất ít chữ, thoáng, ít khung, mỗi màn một nút chính, không có màn trống xấu.
  - Cổng GV skin B "Công cụ chính xác", màu `#3346D1`.
  - Cổng HS skin C "Học đường hiện đại", màu `#0B7466`, có đủ bố cục laptop.
  - Font Inter + Source Serif 4. Hệ thiết kế: `docs/design/eduvn-design-system.md`.
- **Video, slide, hoạt hình, sơ đồ:** phong cách **"Giấy học thuật"** (đã duyệt).
  - Nền trắng ngà `#FDFCF9`, chữ mực đậm, xanh dương học thuật `#2F5D8A` làm trục.
  - Bảng màu đa dạng cho vật thể. **Không dùng cam làm màu chủ đạo, không nền navy.**
  - Motion tối đa: vẽ nét, morph, đếm số, chuyển cảnh liền mạch. Mỗi cảnh một chuyển động chậm, không zoom giật.
  - Token: `services/video-theme/tokens.json`.
- Màn hoặc phong cách **hoàn toàn mới** (ví dụ phụ huynh, ban giám hiệu) phải có mockup cho chủ dự án duyệt trước khi code.

## 5. Quyết định đã chốt
- **AI hồ sơ (bộ não của vòng lặp):** mỗi HS/SV, GV, phụ huynh, nhà trường có một AI riêng nắm hồ sơ chủ nhân (năng lực, đường quên, lỗi đặc trưng, nhịp học, mục tiêu), các AI phối hợp có quyền, hồ sơ theo suốt cấp 2 → ĐH. Chi tiết: `docs/design/ai-ho-so.md`.
- **Chia AI:** trò chuyện cá nhân và hồ sơ dùng **AI local** trên máy chủ riêng (chủ dự án sẽ giới thiệu máy chủ sau; dữ liệu HS không rời trường). Việc nặng/tự động (soạn bài, video, đề, chấm, nghiên cứu, tạo công cụ) vẫn qua **cổng AI :4340**.
- **Kho công cụ 3 tầng (động, không bao giờ thiếu):** (1) **AI tạo công cụ theo yêu cầu** từ khối dựng sẵn, tự kiểm rồi lưu vào kho; (2) **kho mở** ghép từ nguồn có giấy phép phù hợp (PhET, 3Dmol/smilesDrawer, Pyodide/Blockly, bản đồ, Stellarium, nhạc lý, Infographic), Việt hoá và gắn môn/cấp/chủ đề CTGDPT 2018; (3) **30–40 công cụ chuẩn làm tay** để demo. Màn kho có ô "Bạn cần công cụ gì?" + nút "Để AI tạo", nhãn nguồn Chuẩn/Mở/AI tạo/Cộng đồng GV.
- **Kho công cụ là ĐỘNG, mọi môn mọi cấp, không cố định số môn.** Công cụ môn học là phụ kiện cắm thêm ("Kho công cụ"), tự hiện đúng chỗ (bài giảng, bài tập, gia sư, bảng giảng). **Không** làm trang môn cố định trên menu. 5 gói Văn/Sử/Địa/Hoá/Sinh chỉ là vài công cụ chuẩn đầu tiên, không phải giới hạn; code nằm ở `server/src/subjects/`, `anim-skills/`, `services/anim-kit-data/`.
- **Repo ngoài: lấy codebase rồi tinh chỉnh, không tự xây lại.**
  - `antvis/Infographic` (MIT): dùng gói npm `@antv/infographic` + skills/templates, làm theme EDUVN, gắn vào slide, gia sư, báo cáo, tin gửi phụ huynh.
  - `lfnovo/open-notebook` (MIT): chạy nguyên codebase làm dịch vụ "Sổ tay học tập", trỏ AI sang cổng :4340, giọng VieNeu, đổi giao diện theo chuẩn đẹp, dùng chung đăng nhập.
  - Ngoài ra đã dùng/khảo sát: OpenMAIC, DeepTutor, ppt-master, HyperFrames.
- **Hoạt hình:** đi theo hướng AI tự sáng tác bằng kho skill + bộ chọn skill (thiết kế `docs/research/2026-11-11-anim-studio-design.md`, nền ở nhánh `anim-s1`). 28 khuôn cũ giữ làm dự phòng.
- **Bộ máy demo** (con trỏ tự bấm, kịch bản tự chạy) làm **sau cùng**, khi các màn đã chốt.
- **Deploy HTTPS và Zalo:** làm cuối cùng.

## 6. Hiện trạng (2026-11-25)
- `main` có phần lõi chạy thật (ngân hàng câu hỏi, đề CV 7991, giáo án, slide, bảng giảng, sơ đồ, hình không gian, bài giảng AI ra MP4, lớp học, phòng thi, chấm ảnh, sổ điểm, Hôm nay, đấu trường, gia sư, lời giải từng bước, luyện tập, lộ trình, giáo trình, OCR, 2 cổng GV/HS, cổng AI :4340, server + skill 5 gói môn).
- **Mockup frontend đã xong 4 gói** (`docs/demo/ke-hoach-mockup.md`, code ở `web/src/demo/`, thế giới mẫu `docs/demo/the-gioi-mau.md`):
  - A `/gv` (nhóm "Soạn bằng AI"): tạo bài giảng, trình sửa, xuất bản, Studio hoạt hình, Infographic (@antv thật), giấy tờ CV 5512/VNEdu, tổ chuyên môn, dạy theo năng lực.
  - B `/gv` (nhóm "Lớp học AI"): lớp học AI đa tác tử, kho công cụ động (AI tạo công cụ, 32 công cụ, 15 môn, mọi cấp), bạn đồng hành, workbench, giao bài phân hoá, chống ChatGPT, trợ lý lớp, cài đặt AI local/offline.
  - C `/hoc` (nhóm "Tự học cùng AI"): hồ sơ AI + "AI biết gì về em" + học bạ sống, gia sư hiểu mình (2 em 2 cách giảng), vòng lặp lỗ hổng, sổ tay học tập + podcast, nghiên cứu sâu, đọc nhập vai/video, lịch, hướng nghiệp.
  - D cổng mới công khai `/phu-huynh` (làm lại cho ông bà: 3 khối, nút to, 3 tab) và `/truong` (toàn trường, sức khoẻ & AI phối hợp, quản trị, trợ lý AI).
- JS lần đầu (gzip): GV 96,6 KB · Học 95,8 KB · gốc 90,0 KB (ngân sách 100 KB).
- Nhánh dở chưa gộp: `p14-xuat`, `p14-g1`, `p14-g6`, `anim-s1` (làm thật; nay phạm vi là mockup nên để sau).
- Ảnh xem nhanh: `.superpowers/xem/` (cục bộ, :5193): `mock-a/ mock-b/ mock-c/ mock-d/`, sơ đồ `toan-bo.html`, `luong.html`.

## 7. Lộ trình tiếp theo
1. Làm đẹp toàn bộ màn hiện có, rà tính trung lập môn, gọn nav (nhiều nhóm mới), đồng bộ số liệu thế giới mẫu giữa các gói.
2. Infographic + Sổ tay học tập (open-notebook) + Kho công cụ 3 tầng + AI hồ sơ.
3. 11 nỗi đau. Ưu tiên giấy tờ GV, phụ huynh, vòng lặp lỗ hổng, ban giám hiệu.
4. Mockup đủ 395 mục mở rộng.
5. Bộ máy demo, mạch trình diễn theo vòng lặp lõi, rồi video 2–3 phút, slide, link demo.
6. (Cuối) Deploy HTTPS và Zalo.

## 8. Cách làm việc
- **Tìm code bằng graphify trước khi mở file** (đỡ tốn token): `graphify query "<câu hỏi>"`, `graphify explain "X"`, `graphify path A B`, chạy trong thư mục có `graphify-out/` (hiện là `~/projects/eduvn-wt/integ`; dựng mới bằng `graphify update .`, `graphify-out/` không commit).
- **Nhánh và worktree:** mỗi việc một worktree `~/projects/eduvn-wt/<tên>` từ `origin/main`. Agent không merge vào main; điều phối viên gộp sau khi chạy lại toàn bộ test. Push repo `chinhanxt/eduvn`: `gh auth switch -h github.com -u chinhanxt` → push → `gh auth switch -h github.com -u xT-chinhan`.
- **Commit** viết tiếng Việt, cuối message có `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (agent Claude).
- **Máy yếu:** RAM 15 GB, 1 GPU dùng chung, /home hay gần đầy.
  - Việc nặng (test, build, render, TTS) chạy **tuần tự** qua `~/video-studio/bin/heavy run eduvn -- flock /tmp/eduvn-heavy.lock <lệnh>`; vitest `--maxWorkers=2`.
  - Tối đa khoảng 3 agent cùng lúc. File tạm, ảnh, build để ở `/tmp`.
  - Shell có sẵn `PORT=3300` của app khác: luôn đặt PORT tường minh hoặc `env -u PORT`.
- **Cổng AI:** chạy từ `~/projects/eduvn-wt/integ/gateway` bằng `env -u PORT -u HOST pnpm start` (:4340, proxy :8900 tự bật lại). Token ở `.env` trong đó, không in ra.
- **Chủ dự án làm việc theo kiểu:** câu hỏi chỉ cần trả lời, chờ duyệt rồi mới làm. Trả lời ngắn, bằng tiếng Việt. Tự quyết chuyện kỹ thuật; chỉ hỏi khi tốn tiền, ra bên ngoài hoặc khó đảo ngược.
