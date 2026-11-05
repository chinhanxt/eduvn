# F7 + F8 — Slide bài giảng (.pptx) và Trò chơi ôn tập (.html)

## Đã làm
**F7 Slide**
- Domain `server/src/domain/slides.ts`: zod + validator tiếng Việt (1–60 slide, ≤8 dòng/slide/cột, ≤140 ký tự/dòng, tiêu đề bắt buộc, quiz cần question + 2–6 options + answer, two_column cần left+right). `slidesFromLessonPlan`: bìa, Mục tiêu, mỗi hoạt động = slide chuyển mục + slide nội dung (hoạt động có subs → mỗi sub một slide), kết thúc; 4 bước tổ chức đưa vào ghi chú; dòng dài tự cắt ≤140.
- Export `server/src/export/slides.ts` (pptxgenjs 4.0.1, 16:9): thanh tiêu đề navy #1e2340 + vạch xanh #4f6bed, nền trắng, font "Be Vietnam Pro" (máy không có font sẽ tự thay), `fit:"shrink"` + tự ước lượng cỡ chữ (kiểu mau.py), ghi chú người trình bày, số slide, thẻ bo góc đổ bóng cho 2 cột / phương án quiz; đáp án quiz nằm trong ghi chú.
- DB `decks` (org, owner, title, source_lesson_plan_id, body jsonb, timestamps) — migration `0005_wild_anthem.sql` (chung với `games`).
- Service `services/slides.ts`; REST `/api/slides` (GET, GET :id, POST JSON hoặc `{lessonPlanId}`, PUT, DELETE, POST :id/export); link ký `kind:"slide"` ở `/dl/:token`.
- MCP `tao_slide` (deck JSON hoặc lessonPlanId, trả link .pptx), `danh_sach_slide`.
- Web: trang `/slide` (thay giữ chỗ): danh sách + "Từ giáo án" (chọn giáo án → tạo) + Tải .pptx + xoá.

**F8 Trò chơi**
- Domain `server/src/domain/games.ts`: nguồn = `{examId, code?}` | `{questionIds}` | bộ lọc ngân hàng; mcq → 1 mục, true_false → mỗi ý thành mục Đúng/Sai, short_answer → mục gõ đáp án (quiz) / thẻ (flashcards); tự luận bị bỏ; cần ≥4 câu dùng được. Câu hỏi lưu dạng ảnh chụp trong `games.body`.
- Export `server/src/export/game.ts`: 1 file .html tự chứa (CSS+JS nhúng, 0 request ngoài), tiếng Việt, navy/xanh, bo góc đổ bóng, nút ≥56px. Quiz: xáo câu, điểm (100/câu + thưởng nhanh tới 50 khi bật giờ), hẹn giờ tuỳ chọn, hiện đáp án đúng + giải thích sau mỗi câu, màn điểm cuối + "Chơi lại". Flashcards: thẻ lật, "Đã nhớ/Chưa nhớ", màn cuối + "Ôn thẻ chưa nhớ" + "Chơi lại". Chống chèn HTML: dữ liệu nhúng dạng JSON đã thoát `< > & U+2028/9`, mọi chữ vào DOM bằng `textContent`, tiêu đề escape; kèm header CSP `default-src 'none'` + sandbox.
- DB `games`; service `services/games.ts`; REST `/api/games` (GET, POST, DELETE, POST :id/export); `/dl/:token?mo=1` mở inline để chơi ngay.
- MCP `tao_tro_choi`, `danh_sach_tro_choi`.
- Web: trang `/tro-choi` (sidebar Soạn bài: Giáo án · Slide · Trò chơi · Video · Giáo trình): danh sách + tạo (nguồn ngân hàng hoặc đề, loại, giây/câu) + Mở / Tải .html / xoá.

Chung: quyền `slide:manage|read`, `game:manage|read` (teacher/admin/owner quản lý; assistant chỉ đọc); `DownloadClaims` viết lại bằng kiểu `Only<>` (hành vi cũ giữ nguyên) và thêm `slide`, `game`.

## Lệnh / kết quả
- `pnpm -C server test`: 30 file, 150 test xanh (mới: domain slides 5 + games 3, HTTP 3, MCP 2; test danh sách tool cập nhật). `pnpm -C server typecheck`: sạch. `pnpm -C web build`: OK.
- `pnpm -C web smoke`: SMOKE PASS (thêm: tạo slide từ giáo án + tải .pptx; trò chơi <4 câu bị từ chối, tạo, mở chơi 1 câu, tải .html).
- LibreOffice → PDF (`/tmp/eduvn-slide.pdf`, deck 12 slide từ giáo án qua web) mở được, pdftotext đọc đúng tiếng Việt.
- Chrome headless 390x844 (playwright-core, `/tmp/f7/play.mjs`): quiz chơi hết 8 câu (mcq, 4 ý đúng/sai, gõ đáp án, hẹn giờ 20 giây) → 900 điểm, "Chơi lại" về Câu 1/8; thẻ lật → "4/8 thẻ đã nhớ", nút "Ôn 4 thẻ chưa nhớ"; 0 request ngoài, 0 lỗi trang.

## File / ảnh
- Slide: /tmp/eduvn-slide-1.png (bìa), /tmp/eduvn-slide-2.png (8 dòng), /tmp/eduvn-slide-3.png (2 cột), /tmp/f7/rich-4.png (quiz), /tmp/eduvn-slide-lesson-2-4.png (từ giáo án); /tmp/f7/lesson.pptx, rich.pptx
- Trò chơi: /tmp/eduvn-game-quiz.png, /tmp/eduvn-game-quiz-final.png, /tmp/eduvn-game-cards.png, /tmp/eduvn-game-cards-final.png; /tmp/f7/game-quiz.html, game-cards.html
- Web: /tmp/eduvn-web-slide.png, /tmp/eduvn-web-tro-choi.png, /tmp/eduvn-web-tro-choi-choi.png

## Sai khác / thiếu sót
- Font Be Vietnam Pro không nhúng được vào .pptx/.html: máy không có font thì tự thay; ảnh kiểm dùng font thay thế của LibreOffice.
- Cỡ chữ slide dựa ước lượng ký tự; PowerPoint chỉ áp `fit:"shrink"` khi sửa chữ. Slide ít dòng thì thẻ 2 cột còn trống nhiều.
- Chỉ xem bằng mắt slide 1–4 của hai deck; chưa kiểm quiz 6 phương án và deck 60 slide.
- Điểm quiz là 100/câu + thưởng nhanh (không thang 10). Phương án mcq không xáo lại trong game (chỉ xáo thứ tự câu).
- Web chưa có chọn "id câu hỏi" (REST/MCP có), chưa sửa slide trên web (sửa qua MCP: id + deck), không có trang chi tiết.
- Game lưu ảnh chụp câu hỏi nên không tự cập nhật khi ngân hàng đổi.
