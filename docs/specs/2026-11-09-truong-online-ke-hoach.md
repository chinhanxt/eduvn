# EDUVN thành trường online hai phía — kế hoạch tổng (chinhan duyệt 2026-11-09)

Ngày: 2026-11-09. Gộp từ:
- `docs/research/2026-11-09-online-school-pain-points.md`: nỗi khổ của GV và HS, bản đồ chức năng, top 10.
- `docs/research/2026-11-09-openmaic-deeptutor-strip-down.md`: tinh giản OpenMAIC và DeepTutor.
- `docs/research/2026-11-09-p7-p8-repos.md`: repo nước ngoài để tái chế cho P7 và P8.
- Mockup `web/mockup/so-do.html`: sơ đồ tư duy và lưu đồ dựng bằng maxGraph.
- Số đo thật của `agyxt` trên máy dev (mục 2).

## 1. Hai phía và hành trình

| Hành trình | Giáo viên / giảng viên | Học sinh / sinh viên |
|---|---|---|
| Chuẩn bị khoá | Đề cương học phần, giáo án 5512, giáo trình, slide + video bài giảng (**OpenMAIC**), sơ đồ tư duy | Trang khoá học: chương, bài, tài liệu, video, tiến độ |
| Dạy | Bảng giảng (đã có), chiếu câu hỏi, trò chơi ôn tập | Xem lại bài, sơ đồ, video |
| Giao bài | Giao bài/đề, hạn nộp, phòng thi online | Làm và nộp bài trên web |
| Đánh giá | Chấm tự động trắc nghiệm (đã có), chấm ảnh phiếu và tự luận (P7) | Xem điểm, lời giải, chỗ sai |
| Phản hồi | Nhận xét TT22/27 (đã có), thống kê câu sai/chủ đề yếu | **Gia sư AI theo tài liệu môn + luyện câu, ôn giãn cách (DeepTutor)** |
| Báo cáo | Sổ điểm (đã có), xuất mẫu VNEdu/SMAS | Phụ huynh xem (chỉ đọc), thông báo |

Khối còn thiếu chặn mọi thứ ở phía học sinh: **tài khoản HS + vào lớp bằng mã + giao bài + nộp + tự chấm**. Khối này dùng lại ngân hàng câu hỏi, ra đề và chấm đã có.

## 2. Cổng AI EDUVN (`services/llm-gateway`)

Một cổng duy nhất mà lõi, OpenMAIC và DeepTutor cùng gọi. Người dùng không cầm khoá; lõi gọi cổng bằng token dịch vụ.

**Số đo `agyxt` (2026-11-09, câu hỏi một dòng):**

| Model qua `agyxt` | Tổng thời gian | Trong đó agy xử lý | Token đầu vào |
|---|---|---|---|
| `claude-sonnet-5-5` | 20 s | 11 s | ~10,5k (phần hệ thống của agy) |
| `gemini-3.8-flash-medium` | 45 s | 35 s | ~10,6k |

Kết luận:
- Mỗi lần gọi phải khởi động lại agent, nên tốn 10–35 giây chỉ để khởi động.
- Mức này **hợp việc theo lô**: slide, giáo trình, đề, chấm bài, sơ đồ.
- Mức này **không hợp chat trực tiếp** với học sinh, vốn cần trả lời trong vài giây và có stream.

**Thiết kế:**
1. **API nội bộ kiểu OpenAI:** `POST /v1/chat/completions` (có SSE giả cho DeepTutor), `POST /v1/jobs` + `GET /v1/jobs/:id` cho việc dài.
2. **Bảng định tuyến tác vụ** (file cấu hình): mỗi tác vụ gồm `{ backend, model, effort, timeout, songSong }`. Ví dụ:

| Nhóm tác vụ | Model | Effort |
|---|---|---|
| Soạn giáo án/giáo trình/đề cương, dàn ý bài OpenMAIC | Claude Sonnet 5.5 | high |
| Nội dung từng slide, lời giảng, câu hỏi trong bài | Gemini 3.8 Flash | medium |
| Chấm tự luận, đọc ảnh bài làm (vision) | Claude Sonnet 5.5 (khó thì Opus) | high |
| Sinh câu hỏi theo YCCĐ, sơ đồ tư duy từ bài học | Gemini 3.8 Flash | medium |
| Giám khảo kiểm chất lượng | Claude Sonnet 5.5 | low |
| Gia sư chat cho học sinh | **backend nhanh (API chính thức, có stream)** | low–medium |

Tổng khoảng 26 loại tác vụ (8 bên OpenMAIC, khoảng 18 bên DeepTutor) được ánh xạ trong một file.

3. **Chia subagent:** việc lớn được tách thành dàn ý, rồi nhiều phần chạy song song (mỗi slide, mỗi chương, mỗi bài làm), rồi gộp và kiểm. Có giới hạn số tiến trình chạy cùng lúc (mặc định 2) theo quy tắc một việc nặng mỗi lúc. JSON do cổng tự kiểm bằng zod, vì `--json-schema` của agy trả về không đáng tin. Mỗi job có biên nhận và thời gian chạy.
4. **Hai backend cùng một giao diện:** `agyxt` (mặc định) và khoá API chính thức (Anthropic/Google). Đổi backend theo từng tác vụ chỉ cần sửa cấu hình, không sửa code.
5. **Thử trước khi chốt:** chạy `agy acp` thành tiến trình sống lâu (bộ phiên giữ sẵn) để bỏ chi phí khởi động mỗi lần gọi. Nếu được thì một câu ngắn có thể xuống còn vài giây `[CV]`.

**Rủi ro cần chinhan biết:**
- Bản khảo sát 6/11 ghi: điều khoản Antigravity §6 coi việc truy cập bằng phần mềm bên thứ ba là vi phạm, và từ 02/2026 đã có làn sóng khoá 403.
- Khi cổng phục vụ nhiều GV và HS cùng lúc, nếu tài khoản bị khoá thì mọi chức năng AI ngừng.
- Vì vậy backend khoá API chính thức phải có sẵn ngay từ đầu, để đổi được trong vài phút.

## 3. Các đợt

| Đợt | Nội dung | Lấy từ đâu | Cỡ |
|---|---|---|---|
| **G** — Cổng AI | Mục 2 | Tự viết, gọi `agyxt` như EM BÔNG đang làm | M |
| **P9** — Lớp học trực tuyến (top 10, không cần LLM) | Tài khoản HS, vào lớp bằng mã/QR, giao bài + hạn nộp, làm/nộp trên web, tự chấm + xem lời giải, thống kê câu sai, trang khoá học, thông báo trong app, góc phụ huynh, xuất VNEdu/SMAS, phòng thi cơ bản | Lõi hiện có | L |
| **P10** — Vẽ hình & sơ đồ | Sơ đồ tư duy + lưu đồ (theo mockup `so-do.html`, maxGraph Apache-2.0). Bảng giảng thêm: hình phẳng (đoạn, mũi tên, tam giác, đường tròn, đa giác), ô chữ và ô công thức đặt trên bảng, chèn ảnh, xuất PNG/PDF, nón/trụ/cầu, nối điểm và đo độ dài, đồ thị đường tròn/ẩn/bất phương trình. Sau đó: nhận dạng nét tay thành hình ($Q) và chữ viết tay thành công thức (Pix2Text), bản đồ khái niệm, sơ đồ xương cá | maxGraph, perfect-freehand (đang dùng), $Q/$P (BSD), Pix2Text (MIT) | L |
| **P5** — OpenMAIC cho GV, Việt hoá | Dùng `@openmaic/generation` làm thư viện (giữ 6 stage: dàn ý, slide, quiz, mặc định, lời giảng, tuỳ chọn trang tương tác); port phần xuất PPTX sang server; `render-service` (Chromium + FFmpeg, 4–8 GB RAM) chạy sidecar để ra MP4; giọng tiếng Việt qua Edge-TTS/Azure; giao diện của EDUVN | THU-MAIC/OpenMAIC v1.4.2 (MIT; riêng `mathml2omml` là LGPL, không chép vào repo) | L |
| **P6** — DeepTutor cho HS, Việt hoá | Chạy sidecar cho gia sư chat + kho tri thức (pipeline `pageindex-oss`, không cần embedding) + Book; port luyện câu + ôn giãn cách SM-2 sang TS, dùng ngân hàng câu hỏi của ta; viết bản `vi` cho khoảng 10 file prompt; một tài khoản dịch vụ, lõi map lớp sang kho tri thức | HKUDS/DeepTutor v1.7.2 (Apache-2.0) | L |
| **P7** — Chấm từ ảnh | Phiếu trả lời theo đúng 3 phần của CV 7991 (có mốc góc + QR); quét bằng điện thoại ngay trên trình duyệt; tự luận: AI đọc ảnh, GV duyệt chữ phiên âm rồi mới chấm theo rubric | TechStark/opencv-js, OMRChecker, sjreeves/bubble-sheet-omr, zxing-js (MIT/Apache); PaddleOCR, VietOCR, Pix2Text | L |
| **P8** — Skill sư phạm VN | Ma trận 7991, câu hỏi theo YCCĐ, giáo án 5512, nhận xét TT22/27, đề cương học phần; mỗi skill có bộ kiểm (eval) | anthropics/k12-teacher-skills (Apache), instructional_agents (MIT), Oak aila + autoeval-tools (MIT), BloomLLM/AEQG (MIT). education-agent-skills là CC BY-SA: chỉ lấy ý tưởng | M |

### Yêu cầu nét vẽ cho P10 (chinhan dặn khi duyệt mockup)

Trong mockup, mũi tên đứt nét "là tung độ đỉnh" chạy xuyên qua đám mây ghi chú, chữ trên mũi tên đè lên mép đám mây, và đường dọc từ đám mây xuống chủ đề chính cắt ngang các nhánh. Bản thật phải đạt các yêu cầu sau:
- **Đường nối không đi xuyên qua hình nào** ngoài hai hình nó nối. Đường cong hay vuông góc đều phải tự né (định tuyến tránh vật cản), kể cả mũi tên đứt nét và mũi tên liên hệ chéo.
- **Chữ trên mũi tên đặt ở chỗ trống**: không chồng lên hình, lên chữ khác hay lên đường nối khác. Chữ có nền trắng mờ để đọc được khi đi qua lưới chấm.
- **Đường nối không cắt ngang nhánh** của sơ đồ tư duy nếu còn đường khác. Đường nối từ ghi chú tới nút đi theo hướng ngắn nhất ra mép hình.
- Khi kéo hình hay sắp xếp lại, đường nối và chữ trên mũi tên **tự tính lại**, không để sót đoạn đè.
- Cách làm: tự viết bộ định tuyến (lưới + A* cho đường vuông góc; cong Bézier có điểm điều khiển né hình) và bộ đặt chữ (thử nhiều vị trí dọc đường, chọn chỗ ít va chạm nhất), kèm test thuần ở `web/src/diagram/`. Không dùng libavoid (LGPL).

## 4. Thứ tự đề xuất

1. **G: Cổng AI.** Đây là nền cho P5–P8. Làm nhỏ trước: một backend `agyxt` + bảng định tuyến + job.
2. **P9: Lớp học trực tuyến**, tối thiểu là mục 1–4 của top 10. Không có học sinh trong hệ thống thì DeepTutor và phía học sinh không có chỗ dùng.
3. **P10: Sơ đồ tư duy + lưu đồ** sau khi chinhan duyệt mockup, rồi tới phần nâng bảng giảng.
4. **P5: OpenMAIC.**
5. **P6: DeepTutor**, cần backend nhanh cho chat.
6. **P7: Chấm ảnh.**
7. **P8**: làm xen kẽ, mỗi skill đi kèm đợt dùng nó.

Mỗi đợt vẫn đi đúng quy trình cũ: plan riêng, rồi TDD, review từng task, review cuối, chạy thử toàn bộ, rồi chinhan duyệt.

## 5. Đã chốt / còn mở

- Đã chốt 2026-11-09: mockup sơ đồ (kèm yêu cầu nét vẽ ở trên), thứ tự ở mục 4.
- Còn mở: điểm 3 (cách chạy gia sư chat) và điểm 4 (phổ thông / đại học).

Các câu hỏi ban đầu:

1. Mockup sơ đồ `web/mockup/so-do.html`: đạt chưa, cần sửa gì.
2. Thứ tự ở mục 4.
3. Rủi ro tài khoản của `agyxt` (mục 2): chấp nhận dùng `agyxt` làm backend mặc định và chuẩn bị sẵn khoá API dự phòng? Gia sư chat cho HS có cần khoá API ngay từ P6 không?
4. Phía học sinh: phổ thông, đại học, hay cả hai ngay từ đầu (ảnh hưởng đề cương học phần, phụ huynh, phòng thi).
