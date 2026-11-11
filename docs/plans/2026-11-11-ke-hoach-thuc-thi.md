# EDUVN — Kế hoạch thực thi chi tiết (từ 2026-11-11 tối)

Mốc xuất phát: `main = 8796e52`. Đã có trên main:
- P1–P13
- P7 chấm ảnh, P13 lời giải
- UI v2: đợt 1, cổng GV đợt 2
- Phong cách "Giấy học thuật": 5 khuôn
- Sửa 9 lỗi demo
- Cổng AI tự bật lại proxy
- Tài liệu P14 (`docs/research/2026-11-11-p14-parity.md`, 452 chức năng)
- Thiết kế Studio hoạt hình (`docs/research/2026-11-11-anim-studio-design.md`)

chinhan đã duyệt (2026-11-11):
- Phong cách nền trắng.
- P14 lấy đủ OpenMAIC + DeepTutor. Chỉ loại 3 thứ: các nhà cung cấp LLM; Feishu/Slack/Telegram/Discord; ngôn ngữ khác.
- ppt-master vào phần xuất bản.
- P15 Văn/Sử/Địa.
- Hoạt hình do AI tự sáng tác, kèm kho skill và bộ chọn skill.
- Thứ tự cuối: P9b → deploy HTTPS + Zalo.

## 0. Luật vận hành (mọi giai đoạn)

| Luật | Cụ thể |
|---|---|
| Song song | Tối đa **4 agent** cùng lúc. Swap < 1 GB thì không thêm agent mới. Mỗi agent chỉ bật server/Chrome khi cần và tắt ngay. |
| Việc nặng | Test, build, render, TTS, ASR đi qua `heavy run eduvn -- flock /tmp/eduvn-heavy.lock`. Vitest chạy 2 worker. GPU 6 GB dùng chung: mỗi lúc một việc. |
| Ổ đĩa | /home còn khoảng 2 GB. Ảnh, video, bản build để ở `/tmp`. Model và dữ liệu lớn (SearXNG, ComfyUI, bản đồ) để ở `/` hoặc `~/MayNha-1TB`. Xoá worktree ngay khi đã gộp. |
| Gộp | Agent chỉ commit trên nhánh của mình. Điều phối viên tự: gộp main vào nhánh, chạy lại toàn bộ test (server, web, gateway, typecheck, build), rồi fast-forward main và push. File nóng chỉ được **thêm dòng**. |
| Migration | Số đã giữ: GX 0016 · G1 0017 · G6 0018 · G2 0019 · G3 0020 · G5 0021 · G7 0022 · G4 0023 · Studio 0024 · P15 0025 · P9b 0026. |
| Task cổng AI | Khai báo trong `gateway/tasks.d/<goi>.json` (G1 làm bộ nạp). Chưa nạp thì dùng `AI_TASK_OVERRIDES`. |
| Chất lượng | Mỗi đợt gồm: test hồi quy, chạy thật qua cổng :4340, ảnh `/tmp/<goi>-*.png`, báo cáo. Giao diện mới (màn chưa có mockup) phải có mockup cho chinhan duyệt trước khi code. |
| Thẩm mỹ | UI v2 (GV skin B #3346D1, HS skin C #0B7466, Inter + Source Serif 4). Video, slide, sơ đồ dùng "Giấy học thuật" nền trắng, bảng màu đa dạng, **không dùng cam làm màu chủ đạo**, motion tối đa, mỗi cảnh một chuyển động chậm. |
| Trang xem | `/tmp/eduvn-xem` phục vụ ở :5193 (dựng lại sau mỗi lần khởi động). Mỗi kết quả mới đều đưa lên đó cho chinhan xem. |

## Giai đoạn A — Khởi động lại + chốt các nhánh dở (~½ ngày)

| # | Việc | Ai | Xong khi |
|---|---|---|---|
| A1 | Bật cổng AI (`integ/gateway`, `env -u PORT`), mockup :5190; dựng lại trang xem :5193 (copy ảnh và clip từ các worktree) | điều phối | `/health` ok, gọi thử 1 task |
| A2 | Dọn ổ: xoá các worktree đã gộp (`sua-demo`, `tham-my`, `ui2-gv` sau A4); kiểm tra `~/.cache/uv` (MCP tự tải lại) | điều phối | /home ≥ 4 GB trống |
| A3 | **ui2-hoc**: chạy lại toàn bộ test sau khi đã gộp main (lần trước bị ngắt) → ff main | điều phối | test xanh, đã push |
| A4 | **Giao diện đợt 2, phần cuối:** (a) cổng HS: Gia sư + Giáo trình theo skin C; (b) cổng GV: trình phát + trình sửa bài giảng AI, kéo ngân sách JS GV về < 100 KB (đang vượt 0,1 KB do chunk `urlState`) | 1 agent (gộp ui2-hoc + ui2-gv) | ảnh 1440/1024/390 sáng/tối, ngân sách đạt |

## Giai đoạn B — Nền móng P14 + Studio (chạy song song, ~2–3 ngày)

Làm tiếp từ các commit `wip` đã push. Agent mới phải đọc `git log` nhánh và báo cáo cũ trước khi làm.

| Gói | Đợt | Nội dung (mã OM/DT trong tài liệu P14) | Nghiệm thu |
|---|---|---|---|
| **G1** nhà cung cấp | 0–1 | `providers/types.ts` + bản giả; bộ nạp `tasks.d`; TTS registry (VieNeu, OmniVoice, trình duyệt) + thư viện giọng/clone; ASR faster-whisper; parse LibreOffice/xlsx/ảnh; trang `/gv/cai-dat/nha-cung-cap`; migration 0017 | Đọc mẫu ra wav; nhận dạng 30 s tiếng Việt; chuyển PPTX, XLSX sang chữ; khởi động lại cổng thì nạp được `tasks.d` |
| **G6** tác tử | 1 | `server/src/agent/*` (giao thức nhãn, registry công cụ, SSE nối lại, `ask_user`, nén ngữ cảnh, huỷ) + `web/src/ui/agent/*`; migration 0018 | ≥ 95 % bước parse được qua 2 model thật; ghi API đăng ký công cụ cho gói khác dùng |
| **GX** xuất bản | 1 | ppt-master: PPTX gốc + Office Math + QR + audio lời đọc + mẫu .pptx của trường; nhập PPTX; HTML offline; gói .zip; OM-809…813 (kịch bản, tuỳ chọn và huỷ khi xuất video, QR trong video, menu xuất); migration 0016 | 15 công thức OMML đúng; LibreOffice mở PPTX → PNG; HTML chạy khi tắt mạng |
| **S1** Studio nền | 1 | 4 hợp đồng `docs/anim-studio/*`, kit (EK.*), `preprocess`, `lintHf`, `sandbox` (bwrap đã bật), `qaHf` + 4 kiểm riêng, bộ chọn 2 bước, pipeline, migration 0024, mockup tab "Kho skill" | Test HTML xấu bị chặn 100 %; chạy đầu–cuối 3 cảnh |

Thứ tự gộp: G1 → G6 → GX → S1. Gộp xong G1 thì **khởi động lại cổng AI**, để các task `tasks.d` có hiệu lực.

## Giai đoạn C — Tính năng lớn (song song 4 agent, xoay vòng, ~5–7 ngày)

| Gói | Đợt | Nội dung chính | Phụ thuộc |
|---|---|---|---|
| **S2** nội dung skill | 1 | 20 skill ★, gồm: tiêu đề/chương/kết, chuyển cảnh giữ vật, đồ thị, biến đổi đại số, cây xác suất, cân bằng phương trình hoá học, chữ thơ theo giọng ngâm, tu từ, sơ đồ nhân vật, bản đồ chiến dịch, dòng thời gian, nhiệt-ẩm, tháp dân số, bản đồ 34 tỉnh… Mỗi skill có ví dụ vàng qua lint + check, thumb, eval | S1 hợp đồng |
| **Studio đợt 2** | — | Áp phong cách nền trắng cho **23 khuôn cũ** (dùng làm đường lùi); thẻ mở đầu/chương/kết + phụ đề cho video bài giảng; video **1080p**; slide và sơ đồ cùng hệ màu; Manim do AI tự viết chạy trong hộp cát + QA bằng khung bao; 67 skill còn lại | S1, S2 |
| **G2** bài giảng AI | 1–3 | Máy trạng thái + SSE, duyệt/sửa dàn ý, nhiều tài liệu, nghiên cứu web, làn media (ảnh/video), đủ phần tử slide, editor đầy đủ (đổi cỡ, xoay, phím tắt, hoàn tác 100 bước, đọc lại từng câu); migration 0019 | G1 |
| **G3** lớp học đa tác tử | 1–4 | Trình phát (tốc độ, tự chạy, phím tắt, quiz chấm AI, tiến độ HS, thẻ kết khoá); GV, trợ giảng, bạn học AI; director chọn lượt; hỏi bằng chữ/giọng; ngắt lời; bàn tròn; **AI vẽ bảng trắng** (dùng lại `w/board`); điều khiển widget; bạn đồng hành + nhóm tranh luận; migration 0020 | G1, G6 |
| **G5** PBL + sandbox | 1–3 | `exec` chạy trong bwrap (Python/C/C++/Java); PBL v2 (planner, nhập vai, chấm); PBL v3 (Monaco, xterm, test, preview, checkpoint, báo cáo); Pyodide; migration 0021 | — |
| **G7** học liệu | 1–5 | Loại câu mới (`mcq_nhieu`…); kho hợp nhất; nhập câu CSV/XLSX; sổ câu sai; giáo trình đủ khối; lộ trình đầy đủ + bản đồ chủ đề; đọc nhập vai + học qua video; lịch/cron/bảng việc; **phụ huynh**, quyền chi tiết, nhật ký kiểm toán; Kiwix/Obsidian/GitHub/web; vòng thành thạo 21 công cụ; migration 0022 | G6 (đợt 5) |
| **G6** đợt 2–4 | — | Công cụ chat, nhánh hội thoại, persona, Deep Research (SearXNG), bộ nhớ dài hạn, skill/MCP/plugin, audio overview (podcast 2 giọng VieNeu), visualize, sổ ghi + ghi chú khối + Co-Writer, CLI | G1, G5 |
| **G1** đợt 2–3 | — | Ảnh minh hoạ (agy image-generator → kho ảnh mở → ComfyUI); SearXNG + đọc web + lọc nguồn cho học sinh; video; theo dõi lượng dùng; trang trạng thái/doctor | — |
| **G4** workbench | 1–2 | Thư viện khoá học, thư mục, công bố/nhân bản, tour, PWA; workbench chat-để-soạn với ~45 công cụ + 24 skill | G6, G2, GX |

**Xoay vòng 4 slot** (mỗi đợt xong thì gộp, rồi giao đợt tiếp):
1. S2 · G2 · G5 · G1 đợt 2
2. Studio đợt 2 · G3 · G7 đợt 1–2 · G6 đợt 2
3. G3 đợt 3–4 · G7 đợt 3–4 · G6 đợt 3–4 · G5 đợt 3
4. G4 · G7 đợt 5 · các mục ưu tiên thấp (MarginNote, IMA, CLI-Anything…)

## Giai đoạn D — P15 Văn/Sử/Địa (~2–3 ngày, sau khi S2 có khuôn bản đồ/thơ)

1. **Dữ liệu:**
   - Natural Earth `_vnm`; kiểm bằng mắt rằng Hoàng Sa, Trường Sa thuộc Việt Nam.
   - Lớp 34 tỉnh (OSM, có ghi nguồn) và lớp 63 tỉnh (dùng cho Atlat).
   - `dia-danh.json` khoảng 500 địa danh, có nguồn.
   - Wikidata/Wikimedia Commons cho sự kiện và ảnh công cộng.
2. **Trang tương tác cho HS:** bản đồ bấm được, dòng thời gian kéo được, biểu đồ nhiệt-ẩm, tháp dân số.
3. **Câu hỏi:** đọc bản đồ, đọc biểu đồ (vào ngân hàng câu hỏi).
4. **Tự kiểm sự kiện:** năm, địa danh, nhân vật đối chiếu với Wikidata hoặc kho tài liệu của GV, cùng cơ chế "Đã kiểm" như P13.
5. **Video:** bản đồ chiến dịch, thơ có giọng ngâm (cần chinhan chọn giọng mẫu "ngâm" bằng tai), sơ đồ nhân vật.
6. Migration 0025. Chạy thật mỗi môn 1 bài.

## Giai đoạn E — P9b (~2 ngày)

Trang khoá học, thông báo, cổng phụ huynh (nối với phần phụ huynh của G7), ôn lại câu làm sai, xuất điểm sang VNEdu/SMAS. **Cần chinhan gửi 1 file mẫu thật.** Migration 0026.

## Giai đoạn F — Nghiệm thu tổng (~1 ngày)

- Chạy lại demo đầy đủ (OpenMAIC + DeepTutor + Studio + P15), đối chiếu với checklist 452 dòng (đánh dấu ✅).
- Đo hiệu năng: JS lần đầu < 100 KB mỗi cổng, LCP < 1,5 s, INP < 100 ms; tải 1000 HS trên Postgres thật (P9a).
- Sửa các lỗi tồn:
  - Phòng P11 mất khi khởi động lại.
  - Word không hiện công thức trong `foreignObject` (P10b).
  - Thử P7 với ảnh điện thoại thật.

## Giai đoạn G — Deploy HTTPS + Zalo (cuối cùng)

**Cần chinhan:** tên miền, máy chủ/VPS, Zalo OA (hoặc SIM/nick riêng nếu đi đường 2anh).

Phần tui làm:
- Docker compose: Postgres, Keycloak, server, web, cổng AI, SearXNG, Caddy (HTTPS tự động).
- Sao lưu.
- Bật bwrap AppArmor trên máy chủ.
- `/chia-se` cho OG.
- Zalo: thông báo bài tập, điểm, nhắc phụ huynh.

## Việc cần chinhan (theo thời điểm)

| Khi | Việc |
|---|---|
| Giai đoạn B | Duyệt mockup tab "Kho skill" (S1) |
| Giai đoạn C | Duyệt mockup các màn mới chưa có mockup: workbench, lớp học đa tác tử, PBL, đọc nhập vai, lịch, cổng phụ huynh |
| Giai đoạn D | Chọn giọng ngâm thơ bằng tai; xem bản đồ (Hoàng Sa, Trường Sa) |
| Giai đoạn E | Gửi file mẫu VNEdu/SMAS |
| Giai đoạn G | Tên miền, VPS, Zalo OA |

## Rủi ro chính

- **RAM và ổ đĩa** khiến máy tắt hoặc treo → giới hạn 4 agent, theo dõi swap, mọi việc nặng tuần tự.
- **Cổng AI** (hạn mức agy, proxy) → watchdog đã có; quá tải thì thêm khoá Anthropic dự phòng (cần chinhan quyết vì tốn tiền).
- **Gộp nhiều gói** → luật "chỉ thêm dòng" + đánh số migration giữ trước + điều phối viên tự chạy lại test sau mỗi lần gộp.
- **AI sinh sai nội dung** (số liệu, sự kiện) → tự kiểm (P13, P15) + kiểm số trong tham số hoạt hình (đã có).
