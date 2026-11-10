# P5 — Kiểm kê OpenMAIC (cee7b7f ≈ v1.4.2, MIT) cho giáo viên EDUVN

Nguyên tắc: dùng `@openmaic/generation@0.3.31` làm thư viện sinh bài (prompt, parser, builder, retry, post-process interactive) — KHÔNG chạy app Next/Postgres của họ. Phần còn lại tự viết gọn trong `server/` + `web/`, ghi nguồn ý tưởng.

| # | Tính năng OpenMAIC | Quyết định | Lý do / cách làm trong EDUVN |
|---|---|---|---|
| 1 | Dàn ý từ yêu cầu (`generateSceneOutlinesFromRequirements`) | GIỮ | gọi qua `ai.chat("slide_dan_y")`, `languageDirective` tiếng Việt |
| 2 | Nội dung cảnh slide (`generateSceneContent`, template slide-content) | GIỮ | task `slide_noi_dung` |
| 3 | Cảnh quiz (quiz-content) | GIỮ | task `slide_noi_dung`; nút "Lưu vào ngân hàng câu hỏi" |
| 4 | Cảnh interactive: simulation / diagram / code / game / visualization3d / procedural-skill (`generateWidgetContent`, `postProcessInteractiveHtml`) | GIỮ | task `slide_noi_dung` (hoặc `slide_tuong_tac`); chạy trong `<iframe sandbox="allow-scripts">`; vendor ở `/vendor/interactive` |
| 5 | Hành động + lời giảng (`generateSceneActions`: speech, spotlight, laser, widget_*) | GIỮ | task `loi_giang` |
| 6 | `withGenerationRetry`, `buildCompleteScene`, `parseJsonResponse` | GIỮ | thư viện |
| 7 | Tài liệu đầu vào PDF/DOCX → `pdfText` (lib/server/material-extraction) | GIỮ (rút gọn) | PDF: `pdftotext`; DOCX: bóc `word/document.xml` bằng jszip; giáo án EDUVN (`lessonPlanId`) → văn bản từ domain/lesson. Ảnh trong PDF: BỎ (cần vision/ảnh, ít lợi) |
| 8 | TTS lời giảng (lib/audio, 15+ provider) | THAY | ~~Edge TTS~~ → (P5b) VieNeu `vieneu-say` giọng "Giọng dạy", đọc cả loạt một lần, cắt mp3 từng câu; `TTS_PROVIDER=vieneu\|off`. Bỏ azure/openai/qwen/voxcpm/clone/ASR |
| 9 | Trình phát lớp học (lib/playback engine, components/stage) | GIỮ (viết lại gọn) | hàng đợi hành động theo cảnh: phát audio speech → hiệu ứng spotlight/laser trên phần tử → cảnh kế; dừng/tiếp/tua, phụ đề |
| 10 | Renderer slide (packages/@openmaic/renderer, React) | GIỮ ý, viết gọn | `SlideView.tsx`: text (HTML), shape (SVG path), image, line, table, chart (SVG đơn giản), latex (KaTeX), code |
| 11 | Quiz làm thử trong lớp (quiz-grade) | GIỮ (chấm cục bộ) | chấm single/multiple tại trình duyệt; short_answer hiện đáp án gợi ý |
| 12 | Sửa nhanh (packages/@openmaic/editor, lib/edit) | GIỮ lõi | sửa chữ phần tử, kéo vị trí, xoá/thêm cảnh, sinh lại 1 cảnh (editDirective) |
| 13 | Xuất PPTX (lib/export/use-export-pptx.ts, 1600 dòng) | GIỮ lõi, port thành hàm thuần server | `pptxgenjs`; lời giảng → speaker notes; công thức: ảnh/chữ LaTeX (KHÔNG chép `mathml2omml` LGPL); interactive/quiz → trang chữ |
| 14 | Xuất MP4 (lib/video-export + render-service sidecar) | GIỮ lõi, viết gọn | compile → timeline IR (thuần) → chụp từng khung bằng Chrome headless (playwright-core + google-chrome có sẵn) → ffmpeg ghép audio. Không dùng sidecar/docker. Một việc dựng mỗi lúc |
| 15 | Phụ đề (lib/video-export/subtitles) | GIỮ lõi | hiển thị trong trình phát + SRT kèm video |
| 16 | Xuất HTML độc lập / ZIP lớp học (use-export-html, classroom-zip) | BỎ | GV dùng trình phát web + PPTX + MP4 |
| 17 | PBL (pbl, pbl-v3, planner) | BỎ | theo yêu cầu |
| 18 | Chat đa agent trong lớp, orchestration, hồ sơ agent, discussion | BỎ | theo yêu cầu |
| 19 | Pro workbench (lib/workbench) | BỎ | theo yêu cầu |
| 20 | Web search, web-fetch | BỎ | theo yêu cầu |
| 21 | Sinh ảnh/video AI, ComfyUI, media providers | BỎ | theo yêu cầu (slide chỉ chữ/hình khối/công thức) |
| 22 | Whiteboard AI vẽ (wb_* actions) | BỎ khỏi lời giảng; bỏ qua nếu mô hình trả | giữ lõi gọn; trình phát bỏ qua wb_* |
| 23 | Sandbox, storage/identity/access-code/Postgres, usage, model-settings | BỎ | EDUVN có auth, DB, cổng AI riêng |
| 24 | i18n khác vi, brand, live, adaptive, rag | BỎ | chỉ tiếng Việt |
| 25 | Lưu quiz vào ngân hàng | THÊM MỚI | map QuizQuestion → QuestionInput (mcq / short_answer), qua `service.addQuestion` |
| 26 | Hàng đợi sinh bài + tiến độ | THÊM MỚI | bộ nhớ + `ai_lessons.progress`; tối đa 2 bài, 3 cảnh song song; khởi động lại → `loi`, cho "sinh tiếp" |
