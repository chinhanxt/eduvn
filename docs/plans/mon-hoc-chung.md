# Gói môn học (Văn · Sử · Địa · Hoá · Sinh): luật chung

Từ 2026-11-23, mỗi môn do một agent riêng làm.

Phạm vi thay thế:
- Các gói này **thay cho Giai đoạn D (P15)**.
- Các gói này **thay cho các skill của 5 môn trong danh sách 20 skill ★ của S2**: `tho-chu-dong-ngam`, `bien-phap-tu-tu`, `so-do-nhan-vat`, `ban-do-chien-dich`, `dong-thoi-gian-su-kien`, `bieu-do-nhiet-am`, `thap-dan-so`, `ban-do-chu-de`, `can-bang-phuong-trinh`.
- S2 không làm lại các skill này.

## 1. Bối cảnh
- **EDUVN:** nền tảng trường học trực tuyến Việt Nam, dùng cho GV và HS (phổ thông + đại học).
  - pnpm workspace gồm `server/` (Fastify 5, Drizzle, Postgres; test bằng PGlite), `web/` (React 19, Vite 8, 2 cổng `/gv` và `/hoc`) và `gateway/` (cổng AI tương thích OpenAI ở :4340, `model: "task:<tên>"`).
  - Repo: github.com/chinhanxt/eduvn.
- **Thiết kế Studio hoạt hình AI:** `docs/research/2026-11-11-anim-studio-design.md`.
  - AI tự viết hoạt hình HyperFrames bằng kit `EK.*`.
  - Kho skill theo chuẩn Agent Skills, bộ chọn skill 2 bước.
  - Có lint, hộp cát bwrap và QA khung hình.
  - Mục §5 là danh mục skill theo môn.
- **Hợp đồng và kit:** nằm trên nhánh **`origin/anim-s1`** (gói S1, chưa vào main): `docs/anim-studio/{skill-format,kit-api,anim-plan,finding}.md`, `services/anim-kit/{kit.js,kit.css,README.md}`.
  - Cách đọc: `git show origin/anim-s1:<đường dẫn>`.
  - Code theo đúng các hợp đồng này. KHÔNG sửa chúng.
  - Nếu kit thiếu tính năng: ghi vào mục "Đề xuất cho kit" trong báo cáo. Có thể viết tạm trong thư mục skill của môn mình, có đánh dấu.
  - Nếu S1 chưa có `lintHf`/`qaHf` chạy được: kiểm bằng `npx hyperframes check --json` (CLI HyperFrames, đã có trong cache npx trên máy) cùng checklist của skill.
- **Phong cách hình ảnh "Giấy học thuật" (chinhan đã duyệt):**
  - Nền trắng ngà `#FDFCF9`, chữ mực đậm `#1C1B1A`, xanh dương học thuật `#2F5D8A` làm trục.
  - Vật thể dùng bảng 6–8 màu đa dạng, đạt tương phản AA, phân biệt được với người mù màu.
  - **KHÔNG dùng cam làm màu chủ đạo.**
  - Chữ Inter (UI, nhãn) + Source Serif 4 (tiêu đề).
  - Chữ trong video ≥ 36 px ở 1080p. Bố cục theo lưới 12 cột.
  - Mỗi cảnh 3–6 nhịp khớp lời giảng, không đứng yên quá 4 s.
  - Nhãn không đè, không rớt một chữ lẻ xuống dòng.
  - Mỗi cảnh chỉ một chuyển động camera chậm, không zoom giật.
  - Token: `services/video-theme/tokens.json` (đã ở main).
- **Giao diện web:** dùng thành phần v2 trong `web/src/ui/`, gồm skeleton, nút chặn bấm lặp, toast, trạng thái trên URL, chữ AI hiện dần, motion, sáng/tối, đủ 1440/1024/390.
  - Cách gắn trang: `web/README.md` hoặc `web/src/portal/{gv,hoc}/` (`GvApp.tsx`/`HocApp.tsx` + `nav.ts`, chỉ được thêm dòng).
  - Màn mới chưa có mockup: làm mockup HTML tĩnh `/tmp/<mon>-mockup.html` và dừng hỏi chinhan trước khi code UI thật.

## 2. Ranh giới file
| Môn | Sở hữu (chỉ môn đó sửa) |
|---|---|
| Văn | `anim-skills/van/`, `server/src/subjects/van/`, `web/src/subjects/van/` |
| Sử | `anim-skills/su/`, `server/src/subjects/su/`, `web/src/subjects/su/`, `services/anim-kit-data/dia-danh-lich-su.json` |
| Địa | `anim-skills/dia/`, `server/src/subjects/dia/`, `web/src/subjects/dia/`, `services/anim-kit-data/geo/` (lớp nền: Natural Earth `_vnm`, 34 tỉnh, 63 tỉnh, sông hồ, `dia-danh.json`) |
| Hoá | `anim-skills/hoa/`, `server/src/subjects/hoa/`, `web/src/subjects/hoa/` |
| Sinh | `anim-skills/sinh/`, `server/src/subjects/sinh/`, `web/src/subjects/sinh/` |

- **Chỉ đọc:** `services/anim-kit/` (của S1), `server/src/services/anim/*` (khuôn cũ), mọi thư mục của môn khác.
- **File nóng, chỉ được THÊM dòng:** `server/src/http/app.ts`, `server/src/db/schema.ts` (bảng mới đặt ở `server/src/db/schema/<mon>.ts` rồi `export *`), `server/src/domain/authz.ts`, `web/src/portal/*/nav.ts`, `GvApp.tsx`, `HocApp.tsx`, `THIRD_PARTY_LICENSES.md`.
- **Task cổng AI:** khai báo ở `gateway/tasks.d/<mon>.json`. Nếu cổng chưa nạp được tasks.d thì chạy thật với `AI_TASK_OVERRIDES='{"<task>":"soan_giao_an"}'`. KHÔNG sửa `gateway/tasks.json`.
- **Migration:** tránh tạo bảng nếu lưu được trong JSON có sẵn. Nếu bắt buộc phải tạo thì dùng số đã giữ: Văn **0027**, Sử **0028**, Địa **0029**, Hoá **0030**, Sinh **0031**. Lệnh: `pnpm exec drizzle-kit generate --name <ten>` trong `server/`. Ra số khác thì đổi tên file và tag journal về số của môn.

## 3. Máy và quy trình
- **Worktree riêng:** `git worktree add ~/projects/eduvn-wt/mon-<mon> -b mon-<mon> origin/main`, sau đó `pnpm install --offline` (thiếu gói thì `pnpm add`).
- **KHÔNG merge vào main, KHÔNG force push.** Commit theo phần, message tiếng Việt, cuối message có dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Push nhánh lên origin: `gh auth switch -h github.com -u chinhanxt`, push xong thì `gh auth switch -h github.com -u xT-chinhan`.
- **Việc nặng** (test, build, render): bọc `~/video-studio/bin/heavy run eduvn -- flock /tmp/eduvn-heavy.lock <lệnh>`. Không có lệnh `heavy` (máy khác) thì vẫn chạy **tuần tự** qua `flock`. Vitest dùng `--maxWorkers=2`.
- **Tài nguyên:** RAM 15 GB và 1 GPU dùng chung, /home còn khoảng 2 GB.
  - Ảnh, video, bản build và dữ liệu tải về đặt ở `/tmp`.
  - Bật server, vite hay Chrome thì tắt ngay theo PID khi xong.
  - Shell có sẵn `PORT=3300` của app khác, nên luôn đặt PORT tường minh hoặc chạy `env -u PORT`.
- **Chạy thật:**
  - Cổng AI :4340 do điều phối bật. KHÔNG tắt, KHÔNG khởi động lại.
  - Token là dòng `GATEWAY_TOKEN` trong `~/projects/eduvn-wt/integ/gateway/.env`. Không in token ra.
  - Server thử dùng PGlite: `server/scripts/serve-demo-v2.ts` hoặc `serve-pglite.ts`. Cổng cho từng môn: Văn 4361/5261, Sử 4362/5262, Địa 4363/5263, Hoá 4364/5264, Sinh 4365/5265.
- **Không đọc/scan:** `~/tool-app/cookie-manager`, `~/.cookie_manager`, `~/.sys-core`, `~/cookie-exports`, `~/Documents/sh.txt`.

## 4. Mỗi gói phải giao
1. **Skill hoạt hình** trong `anim-skills/<mon>/`. Danh sách lấy từ design §5 của môn, cộng thêm skill nếu thấy cần.
   - Mỗi skill gồm: `SKILL.md` (chuẩn Agent Skills + `metadata` cho bộ chọn), `examples/vi-du-1/{scene.json,plan.json,index.html}` vàng (qua lint + check), `checklist.json`, `thumb.png` 640×360 tự dựng trung tính, `evals/evals.json` (3 cảnh nên chọn + 2 cảnh không nên chọn), `references/` cho quy ước chuyên môn.
2. **Trang tương tác cho HS** ở cổng `/hoc`, ít nhất 1 trang, đúng phong cách. Có mockup trước nếu là màn mới.
3. **Dạng câu hỏi đặc thù của môn** vào ngân hàng câu hỏi. Nếu được thì dùng schema câu có sẵn trong `server/src/domain/question.ts` (không có thì ghi đề xuất). Kèm prompt AI soạn câu.
4. **Tự kiểm nội dung** theo cơ chế huy hiệu "Đã kiểm" của P13 (`server/src/domain/verify.ts` là mẫu): kiểm tất định, AI không tự chấm nội dung của mình.
5. **Kiểm thử:** test cho phần tất định; render ít nhất 3 clip 1080p từ ví dụ vàng; ảnh `/tmp/<mon>-*.png`; chạy thật 1 bài qua cổng :4340.
6. **Báo cáo** `docs/reports/mon-<mon>.md` (commit vào nhánh): đã làm, test, số đo, ảnh, đề xuất cho kit, việc còn lại. Sau đó **DỪNG**, chờ điều phối gộp.
