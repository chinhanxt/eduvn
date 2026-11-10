# P6 — Kiểm kê DeepTutor v1.7.2 (Apache-2.0, commit 60fb3bd) cho học sinh EDUVN

Nguyên tắc: lấy đủ phần học sinh cần để tự học; port sang TypeScript trong lõi EDUVN (không sidecar Python). Bảng dưới là kết quả đọc `deeptutor/{agents,capabilities,learning,book,services,api,modules}`.

## GIỮ

| # | DeepTutor | Cách giữ trong EDUVN (`server/src/tutor/`, `domain/tutor*.ts`) |
|---|---|---|
| 1 | `agents/chat` (chat_agent, agentic_chat, context_summary_agent) | `tutor/chat.ts`: chat stream SSE, trả lời theo kho tri thức có trích dẫn [n], tóm tắt ngữ cảnh khi dài. Bỏ vòng tool/agentic nhiều bước (một lượt truy hồi + một lượt trả lời là đủ cho HS). |
| 2 | `services/rag/query_rewrite.py` | `tutor/chat.ts` `rewriteQuery`: viết lại truy vấn khi câu hỏi nối tiếp (đại từ "nó/đó/vậy…"), fail-open. |
| 3 | `services/chat_hints.py`, `services/mastery_hints.py` | `askHint` (đoán câu HS sắp hỏi, chỉ là câu hỏi, không lộ đáp án) + chế độ **Socratic** (gợi ý từng bước, 3 mức) trong chat. |
| 4 | `services/rag` (+ `parsing`, `knowledge`) | `tutor/ingest.ts` (PDF/DOCX/TXT/MD → trang → đoạn), `domain/tutorSearch.ts` (BM25 + tiếng Việt NFC/bỏ dấu), kho theo lớp/môn; GV tải, HS chỉ đọc. Bỏ embedding/LlamaIndex/MinerU/docling (không cần, tốn ổ đĩa). |
| 5 | `services/session` (lưu phiên, tên phiên, lịch sử) | Bảng `tutor_sessions/tutor_messages`; tên phiên tự động (TaskKind rẻ). Bỏ migration SQLite/PocketBase, usage statistics. |
| 6 | `services/practice` (scheduler SM-2, answers, analytics) | `domain/tutorLearning.ts` `schedule()` y hệt bảng again/hard/good/easy; `tutor/practice.ts` dùng ngân hàng câu hỏi EDUVN + `scoreItem`; câu mở chấm qua AI; thống kê 7/30/90 ngày. Bỏ importing từ notebook. |
| 7 | `learning/scheduler.py` | Giữ bảng khoảng cách theo loại tri thức (memory/concept/procedure/design) cho ôn chủ đề trong lộ trình; bỏ mô hình quên mũ/retrievability/replay. |
| 8 | `learning/prompts` (diagnostic, explain, feynman, practice, error_diagnosis, review, topic) + `capabilities/mastery` | `tutor/mastery.ts`: luồng tuần tự chẩn đoán → giải thích → luyện → chẩn lỗi → ôn, mức thành thạo từng chủ đề (ngưỡng 0,8). Bỏ vòng agent 19 tool, outline revise, profile, memory, defer/skip UI. |
| 9 | `agents/question` (idea_agent → deep_question → followup_agent) | `tutor/questions.ts`: ý tưởng → câu hỏi đúng schema ngân hàng EDUVN (mcq/đúng-sai/trả lời ngắn/tự luận) → bản nháp GV duyệt hoặc luyện ngay; hỏi tiếp về một câu. Bỏ explore/plan nhiều tool, mimic đề từ PDF. |
| 10 | `book/` (ideation, page_planner, spine, source_explorer, blocks: text, section, callout, deep_dive, figure, flash_cards, timeline, code) | `tutor/book.ts`: đề xuất → dàn chương → từng trang (hoạch định khối, truy hồi KB, biên dịch khối) lưu `tutor_books/tutor_book_pages`; HS đọc theo chương + hỏi gia sư trên trang. Bỏ animation (Manim), interactive HTML, concept_graph, user_note, export, event_hub streaming. |
| 11 | `services/model_selection` TaskKind phụ (title, chat_starters, goal name) | Task cổng AI `gia_su_phu` (rẻ): tên phiên, câu gợi mở, tên mục tiêu, tóm tắt, viết lại truy vấn. |
| 12 | `services/prompt` + prompts zh | `tutor/prompts/vi/*.ts` (12 file prompt tiếng Việt, giọng thầy cô, CTGDPT 2018). |
| 13 | Vision (`agents/vision_solver`) phần hỏi kèm ảnh | Chat nhận `images[]` (data URL) → `image_url` gửi cổng; không giữ ảnh trong DB. |

## BỎ

| DeepTutor | Lý do |
|---|---|
| research / deep research | Không phải nhu cầu HS lớp phổ thông; tốn token và công cụ web. |
| solve đa bước, math_animator, visualize, vision_solver (giải hộ) | Trái hướng Socratic; đã có sơ đồ ở P10. |
| video_lesson, audio_overview, imagegen | Nặng, ngoài phạm vi; EDUVN có slide/OpenMAIC. |
| co_writer, notes/notebook, reading, marginnote4, obsidian | Công cụ người lớn/nghiên cứu; HS chưa cần. |
| partners, partner_group, partner_authoring | Chưa có mô hình đa người dùng (P9a tạm dừng). |
| calendar, cron, learning_journal | EDUVN có lịch riêng; ôn hạn dùng bảng `tutor_review_state`. |
| memory consolidator, `capabilities/{handoff,explore_context,creator,subagent,setup,ima}` | Bộ nhớ/điều phối riêng của họ; tóm tắt phiên đã đủ. |
| plugins, skills, mcp, cli_apps, github_source, codex/copilot/codebuddy auth, keypool | Hạ tầng của họ; ta dùng cổng AI chung. |
| desktop, deeptutor_web, web Next, i18n web | UI mới viết bằng web EDUVN. |
| multi_user/auth, pocketbase | Dùng Keycloak + `learner` map sang StudentActor sau. |
| embedding/rerank providers, docling/mineru/tika | BM25 đủ cho tài liệu giáo khoa tiếng Việt, không tải model. |
| Book `animation`, `interactive`, `concept_graph`, `user_note`, `quiz` block | Nặng/không cần; quiz đã có ở Luyện tập. |
| `learning/` review replay, objective_relations, outline_revision, visual_practice, lesson_evidence | Độ phức tạp cao, ít giá trị cho HS phổ thông. |
