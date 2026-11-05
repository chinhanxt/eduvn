# Khảo sát tính năng dành cho giáo viên: 6 repo mã nguồn mở (2026-11-05)

Mục đích: chọn tính năng nên làm tiếp cho trợ lý giáo viên Việt Nam. Kiến trúc của ta: LLM nằm ở chat AI của người dùng (Claude/ChatGPT qua MCP), server chỉ lưu / cấu trúc hoá / kiểm tra / xuất file. Vì vậy mỗi tính năng được gắn nhãn "LLM sinh nội dung" hay "thuần dữ liệu/xuất file".

Phương pháp: đọc README, cây thư mục và một số file mã nguồn qua `gh api` (không clone). Chỗ nào chưa đọc tới tận mã sẽ ghi rõ "theo README".

Nguồn:
1. https://github.com/luonghaianh1208/2anh-zalo-bot (MIT)
2. https://github.com/GarethManning/education-agent-skills (CC BY-SA 4.0)
3. https://github.com/THU-MAIC/OpenMAIC (MIT)
4. https://github.com/HKUDS/DeepTutor (Apache-2.0)
5. https://github.com/DaRL-GenAI/instructional_agents (MIT)
6. https://github.com/oaknational/oak-ai-lesson-assistant (MIT)

---

## 1. 2anh-zalo-bot (tiếng Việt, sát nhu cầu nhất)

Bản chất: sidecar Node giữ phiên Zalo + plugin Hermes Agent (Python). Phần giáo viên nằm ở "Xưởng tạo sản phẩm" (`hermes-plugin/zalo_tools/studio/`, danh mục ở `recipes.py`) và các skill Hermes. Chủ bot bật/tắt từng loại theo nhóm/người, có hạn mức mỗi người mỗi ngày (mặc định 3).
Lưu ý: bộ dựng giáo án 5512, đề tiếng Anh, thí nghiệm ảo, video nằm ở repo ngoài "2Anh Studio" (`ZALO_STUDIO_DIR`), không có trong repo này. Skill SKILL.md (de-kiem-tra, skkn-writer, soan-van-ban-*) cũng nằm ngoài; repo chỉ có mô tả ở `dashboard/public/skills-vi-data.js`.

Mô hình thiết kế đáng học: mô hình chỉ viết dữ liệu có cấu trúc (Markdown/JSON), bộ dựng cố định tạo file; `validate.py` kiểm nội dung trước khi dựng; không bao giờ để chữ của LLM thành mã chạy.

| Tính năng (recipe/skill) | Input (LLM viết) | Output | Ai dùng |
|---|---|---|---|
| `giao_an`: giáo án CV 5512 | `giao-an.md` (Markdown) qua `tools/vi/giao_an.py xuat` | .docx | GV |
| `de_kiem_tra`: đề kiểm tra GDPT 2018 | `de.md` (skill `de-kiem-tra`: ma trận + đề + đáp án) | .docx (qua `file_maker.build_docx`) | GV |
| `de_tieng_anh`: đề KHTN bằng tiếng Anh | `de.md` qua `tools/vi/de_thi.py` | .docx | GV |
| `skkn`: sáng kiến kinh nghiệm | `skkn.md` (skill `skkn-writer`, `cautruc-chuan.md`: bìa, nội dung, TLTK) | .docx | GV |
| `van_ban`: văn bản hành chính NĐ30 (24 loại: công văn, quyết định, kế hoạch, báo cáo, biên bản, tờ trình...) | `noi-dung.json` (khoá cố định: số ký hiệu, trích yếu, căn cứ, nơi nhận, quyền hạn ký...) | .docx đúng thể thức, bộ sinh Node (`engine/generate_*_nd30.js`) | GV, văn phòng |
| `van_ban_doan`: văn bản Đoàn (BCH Đoàn trường, `Số: …/KH-ĐTN`) | `noi-dung.json`, `doan_docx.py` | .docx, kèm "Chưa ký, chưa đóng dấu" | GV TPT Đoàn |
| `van_ban_dang`: văn bản Đảng (HD 05-HD/VPTW; 14 loại) | `noi-dung.json` | .docx | Bí thư chi bộ |
| `slide`: PowerPoint (5 loại: bài giảng, báo cáo tổng kết, hoạt động Đoàn, poster mạng xã hội, tập huấn) | trang SVG (kiểm bằng `check_svg`), có thể theo MẪU .pptx người dùng gửi (`mau.py`: ô chữ tự ngắt dòng/co chữ) | .pptx có ảnh minh hoạ | GV |
| `tro_choi`: 6 trò chơi (quiz, ghép đôi, ô chữ, vòng quay, thẻ lật, đếm ngược) | `tro-choi.json` | 1 file .html chơi offline trên điện thoại, hỗ trợ công thức | GV, HS |
| `thi_nghiem`: thí nghiệm ảo | `thi-nghiem.md` | .html + phiếu .docx | GV KHTN |
| `video`: video giải thích (viết tay, cắt dán, Vox, ngắn) và video bài giảng từ slide (<=3 phút, 720p) | `video.md` | .mp4 | GV |
| `bao-cao-khkt`: báo cáo/đề cương KHKT THPT | skill | .docx | GV hướng dẫn |
| `soan-van-ban-phat-ra`, `khao-sat-doan-truong` | skill | .docx (mẫu khảo sát, kịch bản MC) | GV Đoàn |
| `content-giao-duc`, `content-fanpage-doan` | skill | bài đăng Facebook, tuyển sinh, truyền thông | GV, Đoàn |
| `che-do-chinh-sach-giao-vien` | câu hỏi | tra cứu lương, ngạch, hạng, thăng hạng | GV |
| `memento-flashcards`, `concept-diagrams`, `canvas` (LMS) | skill | thẻ ôn tập, sơ đồ SVG/HTML, danh sách khoá/bài tập Canvas | GV, HS |
| `zalo_pdf` | PDF | PDF -> Word, gộp, tách | GV |
| Kho tri thức (`zalo_kb_list`, upload .docx/.pdf/.md) | tài liệu của tổ/trường | bot trả lời dựa trên tài liệu | Tổ chuyên môn |
| Cron/nhắc hẹn trong nhóm, tóm tắt nhóm (`zalo_read_history`), Insight nhóm, broadcast | lịch, nhóm | nhắc lịch, tổng hợp thảo luận | GV, GVCN |
| Phân quyền theo nhóm + hạn mức/người/ngày | cấu hình | bật/tắt từng sản phẩm | Quản trị |
| `zalo_academic_search` (PubMed, OpenAlex, CORE, Crossref, DOAJ), `zalo_dictionary`, `zalo_web_read` | từ khoá/DOI | tài liệu, trích dẫn APA/IEEE/Vancouver | GV viết SKKN/KHKT |

Điểm cần lưu ý cho ta: toàn bộ danh mục văn bản VN (NĐ30, Đoàn, Đảng) là phần nên học nhất: danh sách loại văn bản, danh sách khoá JSON được phép, `Số: …/KH-ĐTN`. Repo không có luồng chấm điểm/nhận xét học sinh hay sổ sách.

---

## 2. education-agent-skills (Gareth Manning): 165 skill, 20 domain

License: **CC BY-SA 4.0** (`LICENSE`; GitHub báo NOASSERTION). Nếu ta chép/dịch nội dung skill thì sản phẩm phái sinh phải giữ BY-SA và ghi công; chỉ lấy ý tưởng/cấu trúc thì không bị ràng buộc. Định dạng Agent Skills (SKILL.md), có MCP server tự host (stdio). Không bám chương trình Việt Nam (Anh/IB là chính).
Link: https://github.com/GarethManning/education-agent-skills/tree/main/skills

| # | Domain (thư mục) | Skill giảm tải giáo viên đáng chú ý |
|---|---|---|
| 1 | Memory & Learning Science (`memory-learning-science`, 8) | `retrieval-practice-generator` (câu hỏi truy hồi); `spaced-practice-scheduler` (lịch ôn giãn cách theo tuần); `interleaving-unit-planner`; `cognitive-load-analyser`; `dual-coding-designer`; `feedback-quality-analyser` (chấm chất lượng lời phê); `worked-example-fading-designer` |
| 2 | Self-Regulated Learning (`self-regulated-learning`, 5) | `error-analysis-protocol` (phân tích lỗi sai sau bài kiểm tra); `goal-setting-protocol-designer`; `study-strategy-selector`; `metacognitive-prompt-library` |
| 3 | Explicit Instruction (`explicit-instruction`, 5) | `explicit-instruction-sequence-builder` (trình tự bài dạy); `lesson-opening-designer` (khởi động); `checking-for-understanding-protocol-designer`; `practice-problem-sequence-designer` (dãy bài tập); `think-aloud-script-generator` |
| 4 | Questioning & Dialogue (`questioning-discussion`, 5) | `hinge-question-designer`; `socratic-questioning-sequence-generator`; `discussion-protocol-selector`; `dialogic-teaching-move-generator` |
| 5 | Literacy & Critical Thinking (`literacy-critical-thinking`, 7) | `text-complexity-analyser`; `reading-comprehension-strategy-selector`; `argument-structure-scaffold-generator`; `disciplinary-writing-scaffold`; `source-credibility-evaluation-protocol`; `media-literacy-deconstruction-protocol` |
| 6 | EAL/D (`eal-language-development`, 5) | `academic-language-sentence-frame-generator`; `vocabulary-tiering-tool`; `language-demand-analyser`; `scaffolded-task-modifier` |
| 7 | Curriculum Design & Assessment (`curriculum-assessment`, 13) | **`backwards-design-unit-planner`** (thiết kế ngược); **`criterion-referenced-rubric-generator`** (rubric); `competency-unpacker` (bóc tách năng lực); `assessment-validity-checker` (kiểm tra độ giá trị đề); `formative-assessment-technique-selector`; `differentiation-adapter` (phân hoá); `gap-analysis-from-student-work`; `learning-progression-builder`; `scope-and-sequence-designer`; `project-brief-designer`; `kud-knowledge-type-mapper` |
| 8 | Wellbeing, Motivation & Agency (`wellbeing-motivation-agency`, 12) | `belonging-classroom-culture-designer`; `restorative-practice-protocol-designer`; `motivation-diagnostic-task-redesign`; `self-efficacy-builder-sequence`; `trauma-informed-practice-designer`; `perma-based-lesson-designer` |
| 9 | Professional Learning (`professional-learning`, 10) | `lesson-observation-protocol-designer` (dự giờ); `lesson-study-cycle-designer` (nghiên cứu bài học); `reflective-practice-prompt-generator`; `instructional-coaching-conversation-guide`; `professional-development-session-designer` (chuyên đề / sinh hoạt tổ); `teacher-inquiry-cycle-designer`; `competency-framework-translator` |
| 10 | Global & Cross-Cultural (`global-cross-cultural-pedagogies`, 9) | variation theory, CPA (concrete-pictorial-abstract), culturally responsive teaching, place-based inquiry |
| 11 | Environmental & Experiential (`environmental-experiential-learning`, 6) | outdoor learning, experiential cycle, service learning (gần hoạt động trải nghiệm) |
| 12 | AI Learning Science (`ai-learning-science`, 14) | adaptive hints, AI feedback, learning analytics, formative assessment loops (nền cho tính năng tutor/phản hồi) |
| 13 | AI Literacy (`ai-literacy`, 7) | AI output auditing, hallucination fact-checking, prompt literacy (dạy HS dùng AI) |
| 14 | Montessori (`montessori-alternative-approaches`, 4) | three-part lessons, prepared environment (ít dùng ở VN) |
| 15 | Original Frameworks (`original-frameworks`, 17) | `learning-target-authoring-guide` (viết mục tiêu bài học); `single-point-rubric` (rubric một cột); composite: assessment design, inclusive design |
| 16 | Curriculum Alignment (`curriculum-alignment`, 4) | `coverage-audit` (rà phủ chuẩn); `curriculum-crosswalk` (đối chiếu hai chương trình); `kud-chart-author`; `developmental-band-translator` |
| 17 | Historical Thinking (`historical-thinking`, 10) | document-based lesson design, source adaptation (đặc thù môn Sử) |
| 18 | Systems Thinking (`systems-thinking`, 8) | iceberg, leverage mapping (chuyên đề, ít ưu tiên) |
| 19 | Inclusive Design (`inclusive-design`, 3) | `udl-lesson-auditor`; `udl-options-designer`; `udl-barrier-anticipator` (giáo dục hoà nhập) |
| 20 | Student-Facing (`student-learning`, 13) | `retrieve-first-gate`; `progressive-hint-ladder` (gợi ý từng nấc); `stuck-and-error-diagnosis-coach`; `confidence-calibration-check`; `teach-back-evaluator`; `srl-session-wrapper`; `weekly-agency-review` (chạy trực tiếp với HS) |

Giá trị cho ta: kho "phương pháp" để nhúng vào prompt/MCP prompts của từng tính năng (rubric, phân hoá, hỏi đáp, dự giờ, nghiên cứu bài học). Không phải kho dữ liệu hay công cụ xuất file.

---

## 3. OpenMAIC (THU-MAIC): lớp học đa agent

Next.js + PostgreSQL, tự gọi LLM (không phù hợp trực tiếp với kiến trúc MCP của ta, nhưng có nhiều ý hay về cấu trúc dữ liệu và xuất file).

- **Sinh bài học một lần bấm** (chủ đề hoặc tài liệu PDF/Word/PPT/xlsx/ảnh/audio/video -> dàn ý có thể sửa -> các "scene"): input chủ đề + tài liệu; output lớp học (slide + quiz + mô phỏng + PBL); GV.
- **Scene Quiz** (một/nhiều lựa chọn, tự luận ngắn, AI chấm + phản hồi, `lib/quiz/grading.ts`): output quiz tương tác; HS, GV.
- **Slide có lời giảng (TTS) + whiteboard + laser pointer**: GV giảng/HS tự học.
- **Deep Interactive Mode**: 3D, mô phỏng, mini-game, mind map, lập trình online (HTML responsive): GV các môn khoa học.
- **PBL (v1.4.0, 2026-11-04)**: dự án có vai trò, mốc (milestone), sản phẩm; AI tutor đi kèm; HS.
- **Xuất**: `.pptx` giữ mọi scene, 1 file `.html` offline phát cả bài, ZIP lớp học, **MP4 một cú bấm**; import `.pptx` giữ layout; GV.
- **Edit with AI / chỉnh slide trực tiếp / Workbench (Pro)**: agent sửa từng scene bằng tool có kiểm tra (đọc DSL, vá nguyên tử một scene, thêm/xoá/sắp xếp trang, sửa lời giảng): GV.
- **24 skill dựng sẵn** (lập kế hoạch nhiều bài, nghiên cứu sâu, phong cách tương tác/giảng/workshop/nghề...) và skill do người dùng tự viết; chạy được từ OpenClaw/Codex qua `skills/openmaic/`.
- **Kho kiến thức theo người dùng** (thư mục, `@` nhắc tài liệu), web search/fetch, import Word/PPT/PDF: GV.
- **Thảo luận / tranh luận bàn tròn nhiều agent, hỏi đáp**: dùng cho HS, ít liên quan tới giảm tải GV.

## 4. DeepTutor (HKUDS)

Python + Next.js, workspace theo môn/dự án. Hướng học sinh là chính; GV dùng được phần tài nguyên.

- **Quiz / Ask Questions**: tạo câu hỏi từ kho kiến thức; output bộ câu hỏi lưu vào **Question Bank** (câu hỏi, đáp án, giải thích, lỗi sai); GV, HS.
- **Question Bank + Practice**: ôn câu sai, đánh giá mức nhớ, ngày ôn kế tiếp (giãn cách); HS (GV có thể chọn bộ đề giao).
- **Book (giáo trình sống)**: chọn nguồn -> đề xuất mục lục để duyệt -> chương gồm block có kiểu (text, callout, quiz, flashcard, timeline, code, hình, HTML tương tác, concept graph); Page Chat; GV soạn tài liệu, HS đọc.
- **Mastery Path**: chia mục tiêu thành bản đồ điểm kiến thức, hội thoại theo chủ đề, bằng chứng thành thạo; HS.
- **Knowledge Center (RAG nhiều engine)**: LlamaIndex, PageIndex (trích dẫn theo trang), GraphRAG, LightRAG; `deeptutor kb eval` chấm chất lượng truy hồi; GV, tổ.
- **Immersive Reading**: đọc cạnh tài liệu/web/video/audio, trích dẫn xác thực, ghi chú; HS.
- **Learning notebook**: trang -> khối, nhập Word, xuất Markdown/Word; **flashcard xuất Anki (.txt)**; GV, HS.
- **Task Board + Calendar (.ics)**: việc cần làm, lịch, nhắc; xuất .ics; GV, HS.
- **Video Lesson / Visualize / Solve / Research**: video bài giảng đã kiểm, hình minh hoạ, lời giải từng bước, báo cáo có trích dẫn.
- **Partners** (agent bền vững có trí nhớ, kênh IM), **Personas**, **Skills** (SKILL.md), **MCP**, **Memory 3 tầng** (L1 dấu vết, L2 sự kiện, L3 tổng hợp; sửa được); **guardian controls** (phụ huynh); admin/chia sẻ tài khoản (mục "Administration & Shared Deployments").

## 5. instructional_agents (ADDIE, EACL'26)

Python + FastAPI, tự gọi OpenAI; có plugin Claude Code (`instructional_agents-skills`). Mục tiêu: cả khoá đại học. Pipeline ADDIE: Analysis -> Design -> Development -> Evaluation.

Output theo thư mục `exp/{tên}/`:
- `result_instructional_goals.md` (mục tiêu học tập), `result_resource_assessment.md`, `result_target_audience.md` (phân tích người học)
- `result_syllabus_design.md` (đề cương, file quan trọng nhất), `result_assessment_planning.md` (kế hoạch đánh giá), `result_final_exam_project.md` (đề thi cuối kỳ/dự án), `result_presentation_design.md` (phong cách trình chiếu cả khoá)
- mỗi chương `chapter_N/`: `slides.tex` + `slides.pdf` (Beamer), `html/slides.html` (offline, có presenter notes), `slides.pptx` (chỉnh sửa được), `script.md` (kịch bản giảng, kiểm 1-1 với slide), `assessment.md` (đánh giá của chương)
- **Catalog mode**: file JSON đầu vào (hồ sơ người học, sở thích GV, ràng buộc, yêu cầu của trường, phong cách trình chiếu); **Copilot mode**: GV duyệt/phản hồi ở từng pha ADDIE; **Evaluation** (`evaluate.py`): chấm tự động các tài liệu sinh ra (vai trò kiểu "Program Chair"); chuyển LaTeX -> PPTX.
Ý đáng lấy: "catalog" (hồ sơ GV/lớp/trường làm ngữ cảnh) + "duyệt từng pha" + bộ chấm chất lượng tài liệu. Đối tượng đại học nên ít khớp thẳng với phổ thông.

## 6. Oak AI Lesson Assistant (Aila)

Oak National Academy (Anh). Next.js + Postgres + RAG trên kho bài Oak; chủ yếu dùng nội bộ. Link: https://github.com/oaknational/oak-ai-lesson-assistant

- **Aila lesson plan** (`packages/aila/src/protocol/schema.ts`): các phần: title, subject, key stage, topic, **based on** (bài gốc Oak), **learning outcome**, **learning cycles** (outcomes), **prior knowledge**, **key learning points**, **misconceptions** (+ mô tả), **keywords** (+ định nghĩa), **starter quiz**, **exit quiz**, **cycles** (mỗi cycle: title, thời lượng, explanation = lời giảng + chi tiết slide + prompt ảnh + chữ trên slide; check for understanding >= 2 câu có đáp án + distractor; practice; feedback), **additional materials**. Input: hội thoại (agent theo từng section, planner); output: JSON theo schema -> xuất Google Docs/Slides.
- **Quiz**: pipeline 3 tầng nguồn -> bổ sung -> chọn: nguồn câu hỏi từ bài "based on", bài tương tự, tìm ngữ nghĩa nhiều truy vấn + rerank (Cohere); enricher mô tả ảnh; composer LLM chọn câu; có báo cáo chất lượng (`reporting`).
- **Teaching materials**: loại `additional-starter-quiz`, `additional-exit-quiz`, `additional-comprehension` (đọc hiểu), `additional-glossary` (từ vựng); có **refinement** (chỉnh bản sinh ra); output .docx/Slides.
- **Lesson adapters**: phân loại ý định (đổi độ khó đọc `changeReadingAge`, dịch bài, bỏ nội dung không thiết yếu, xoá slide, sửa chữ slide, bỏ key learning point), agent sửa slide, **pedagogy validator**.
- **Exports** (`packages/exports`): lesson plan, quiz, worksheet, full lesson slides, additional materials -> Google Docs/Slides qua Drive, theo mẫu (`templates.ts`).
- **Moderation** (`moderationCategories.json`): nhóm Language and discrimination, Violence and crime, Upsetting/sensitive, Nudity and sex, Physical (an toàn thí nghiệm...), Toxic (tự hại, vũ khí, hoạt động bất hợp pháp); chấm điểm từng bài, chặn nội dung độc hại; **threat detection** (chống prompt injection) cho teaching materials; ban người dùng vi phạm.

---

## 7. DANH MỤC TÍNH NĂNG TỔNG HỢP cho sản phẩm giáo viên Việt Nam

Cách đọc:
- **Repo**: 1=2anh-zalo-bot, 2=education-agent-skills, 3=OpenMAIC, 4=DeepTutor, 5=instructional_agents, 6=Oak Aila.
- **LLM?** "Có" = cần sinh nội dung (LLM ở chat người dùng; server cấp prompt, schema, ví dụ). "Không" = thuần dữ liệu/xuất file/kiểm tra (làm hoàn toàn ở server). "Lai" = LLM viết JSON, server kiểm + dựng file (mô hình tốt nhất cho ta).
- **Giảm tải** = mức giảm việc cho GV Việt Nam (cao/vừa/thấp), theo đánh giá của tôi (không phải số liệu đo).
- Chuẩn VN do tôi ghi từ hiểu biết nghiệp vụ, **chưa kiểm lại văn bản gốc**; cần đối chiếu khi triển khai.

### 7.1 Soạn bài

| Tính năng | GV nhận được | Repo | LLM? | Chuẩn VN | Giảm tải |
|---|---|---|---|---|---|
| Kế hoạch bài dạy (giáo án) theo CV 5512 | file Word đúng 4 hoạt động (Mở đầu / Hình thành kiến thức / Luyện tập / Vận dụng), mục tiêu năng lực-phẩm chất, thiết bị, sản phẩm | 1, 6 (mô hình section), 2 | Lai: LLM viết Markdown/JSON, server dựng .docx | CV 5512/BGDĐT-GDTrH (Phụ lục 4) | cao |
| Kế hoạch dạy học môn học của tổ / kế hoạch giáo dục của GV | bảng phân phối chương trình, số tiết, thiết bị dạy học theo bài | 2 (scope-and-sequence-designer), 5 (syllabus) | Lai | CV 5512 (Phụ lục 1, 2, 3) | cao |
| Kế hoạch bài dạy điều chỉnh (phân hoá, đổi độ khó, dịch, rút gọn) | bản bài dạy sửa nhanh theo trình độ lớp, HS cần hỗ trợ | 6 (lesson-adapters), 2 (differentiation-adapter, scaffolded-task-modifier) | Có | CTGDPT 2018 | vừa |
| Thiết kế ngược / mục tiêu bài học / bóc tách năng lực | mục tiêu đo được, chuẩn đầu ra, chuỗi hoạt động | 2 (backwards-design, learning-target-authoring, competency-unpacker), 5 | Có | CTGDPT 2018 (yêu cầu cần đạt) | vừa |
| Khung bài chuẩn: khởi động, check for understanding, practice, phản hồi, hiểu lầm thường gặp, từ khoá | các mục sư phạm đủ, theo schema có kiểm | 6, 2 (explicit-instruction, hinge-question) | Có (schema ở server) | - | vừa |
| Thư viện mẫu / ngân hàng bài dạy của GV, tái dùng "dựa trên bài cũ" | tìm bài đã soạn, sao chép và chỉnh | 6 (basedOn), 3, 4 (kho kiến thức) | Không (lưu/tìm); chỉnh thì Có | - | cao |
| Hoạt động trải nghiệm, chủ đề STEM, dự án (PBL) | kế hoạch dự án có vai trò, mốc, sản phẩm, rubric | 3 (PBL), 2 (project-brief-designer, service learning) | Có | CV 5512 (HĐ trải nghiệm, HĐ giáo dục), STEM | vừa |
| Phiếu học tập / bài tập phân bậc / dãy bài luyện | phiếu .docx theo mức độ nhận biết-thông hiểu-vận dụng | 6 (worksheet), 2 (practice-problem-sequence) | Lai | CV 7991 (mức độ) | cao |
| Đối chiếu năng lực số / AI trong giáo án | mục năng lực số điền sẵn | 1 (`nang-luc-so-va-ai.md`) | Có | khung năng lực số GD | thấp |

### 7.2 Đánh giá

| Tính năng | GV nhận được | Repo | LLM? | Chuẩn VN | Giảm tải |
|---|---|---|---|---|---|
| Ma trận và bản đặc tả đề kiểm tra | bảng ma trận (chủ đề x mức độ x dạng câu), bản đặc tả; server kiểm tổng điểm, tỉ lệ | 1 (`de-kiem-tra`), 2 (assessment-validity-checker) | Lai (LLM đề xuất, server tính + kiểm) | CV 7991/BGDĐT-GDTrH (ma trận, đặc tả), TT 22/2021 | cao |
| Đề kiểm tra + đáp án + hướng dẫn chấm (Word) | đề .docx, đáp án, thang điểm bám ma trận | 1, 6 | Lai | CV 7991, CTGDPT 2018 | cao |
| Ngân hàng câu hỏi có gắn thẻ (chủ đề, mức độ, dạng, nguồn) + trộn đề | kho câu hỏi tái dùng, sinh nhiều mã đề, đảo đáp án | 4 (Question Bank), 6 (nguồn câu hỏi) | Không (CRUD, trộn, xuất) | CV 7991 (mức độ) | cao |
| Rubric / thang chấm / rubric một cột | rubric cho bài tập, dự án, bài viết | 2 (criterion-referenced-rubric-generator, single-point-rubric) | Có | TT 22/2021 (đánh giá thường xuyên) | vừa |
| Kiểm tra nhanh đầu/cuối tiết (starter / exit quiz) | 3-5 câu trắc nghiệm, đáp án và distractor | 6, 3 | Lai | - | vừa |
| Chấm trắc nghiệm / nhập điểm / thống kê phổ điểm | bảng điểm, phân tích câu khó/dễ, độ phân biệt | 4 (đánh giá), 6 (reporting) | Không | TT 22/2021 | cao |
| Phân tích lỗi sai / khoảng trống kiến thức từ bài làm | danh sách lỗi phổ biến, gợi ý dạy lại | 2 (gap-analysis-from-student-work, error-analysis-protocol) | Có | - | vừa |
| Kiểm tra độ giá trị / bám chuẩn của đề | cảnh báo đề lệch mục tiêu, thiếu mức độ | 2 (assessment-validity-checker, coverage-audit), 5 (evaluate) | Lai | CV 7991 | vừa |
| Chấm tự luận có gợi ý (AI chấm theo rubric, GV duyệt) | điểm đề xuất và nhận xét | 3 (quiz grading), 2 (feedback-quality-analyser) | Có | - | vừa (rủi ro: GV phải duyệt) |
| Trò chơi / ôn tập tương tác (ô chữ, vòng quay, ghép đôi, thẻ lật) | 1 file HTML chơi trên điện thoại, offline | 1, 3, 4 | Lai (LLM viết JSON, khuôn HTML cố định) | - | vừa |
| Flashcard + lịch ôn giãn cách, xuất Anki | bộ thẻ, lịch ôn | 1 (memento), 4, 2 (spaced-practice-scheduler) | Lai / Không (lịch, xuất) | - | thấp-vừa |

### 7.3 Lớp học

| Tính năng | GV nhận được | Repo | LLM? | Chuẩn VN | Giảm tải |
|---|---|---|---|---|---|
| Nhận xét học sinh định kỳ (theo mẫu, theo mức đạt) | nhận xét cá nhân hoá từ dữ liệu quan sát/điểm, GV sửa | (không repo nào làm trực tiếp; gần nhất 2: feedback-quality-analyser) | Lai | **TT 22/2021 (THCS, THPT), TT 27/2020 (tiểu học)** | **cao** |
| Sổ theo dõi lớp: danh sách HS, điểm danh, ghi chú quan sát, điểm thường xuyên | dữ liệu lớp có cấu trúc, xuất Excel | (khoảng trống: không repo nào) | Không | TT 22/2021, TT 27/2020; quy định sổ sách | cao |
| Học bạ / sổ chủ nhiệm / nhập liệu VNEDU-SMAS (xuất file khớp mẫu) | file nhập hàng loạt | (khoảng trống) | Không | quy định hồ sơ nhà trường | cao |
| Phân nhóm HS, chỗ ngồi, phân công nhóm dự án | sơ đồ lớp, nhóm cân bằng | 3 (PBL vai trò) | Không / Lai | - | thấp |
| Giao bài và theo dõi nộp bài (liên kết LMS) | danh sách bài tập, hạn nộp | 1 (`canvas`), 4 (Task Board) | Không | - | vừa |
| Lịch dạy / nhắc việc / xuất .ics | lịch tuần, nhắc hạn nộp hồ sơ | 4 (Calendar .ics), 1 (cron nhóm Zalo) | Không | - | vừa |
| Tutor cho HS (gợi ý từng nấc, giải thích, Mastery Path) | HS tự học có kiểm soát; GV xem tiến độ | 4, 2 (domain 20), 3 | Có (chat của HS) | - | vừa (nằm ngoài kiến trúc MCP của GV) |

### 7.4 Nội dung

| Tính năng | GV nhận được | Repo | LLM? | Chuẩn VN | Giảm tải |
|---|---|---|---|---|---|
| Slide bài giảng (.pptx) theo mẫu của GV/trường | bộ slide đẹp, chữ tự co theo ô, giữ mẫu | 1 (`mau.py`), 3, 5, 6 | Lai (LLM viết nội dung từng ô, server dựng) | - | cao |
| Xuất slide từ kế hoạch bài dạy (1 nguồn -> giáo án + slide + phiếu) | một lần soạn, ra nhiều file | 6 (`exportSlidesFullLesson`), 5, 3 | Lai | CV 5512 | cao |
| Lời giảng / kịch bản kèm slide (script) | script từng slide | 5 (`script.md`), 3 (narration) | Có | - | vừa |
| Video bài giảng từ slide (TTS, <=3 phút) | file .mp4 | 1, 3, 4 | Lai (render ở server, chậm và tốn tài nguyên) | - | vừa |
| Mô phỏng/thí nghiệm ảo HTML, sơ đồ tư duy | 1 file HTML tương tác | 1, 3 | Lai | CT môn KHTN, Lý, Hoá, Sinh | vừa |
| Giáo trình / tài liệu dạng sách sống từ nguồn của GV | chương, block (quiz, flashcard, timeline) | 4 (Book), 3 | Có | - | vừa |
| Tài liệu đọc hiểu, bảng từ vựng/thuật ngữ, câu mẫu cho HS yếu | bài đọc theo trình độ, glossary | 6 (comprehension, glossary), 2 (EAL skills) | Có | - | vừa |
| Kiểm duyệt nội dung (an toàn thí nghiệm, nội dung nhạy cảm, độ tuổi) | cảnh báo trước khi dùng với HS | 6 (moderation) | Lai (quy tắc + LLM) | quy định nội dung dạy học | vừa |
| Kho tài liệu của tổ/trường, hỏi đáp có trích dẫn trang | tìm trong đề cương, văn bản, SGK đã tải | 1 (kb), 3, 4 (RAG, PageIndex) | Không (index) + Có (trả lời) | - | vừa |

### 7.5 Giao tiếp (phụ huynh, học sinh, hành chính)

| Tính năng | GV nhận được | Repo | LLM? | Chuẩn VN | Giảm tải |
|---|---|---|---|---|---|
| Văn bản hành chính (công văn, kế hoạch, báo cáo, biên bản, quyết định, tờ trình, giấy mời...) | .docx đúng thể thức (quốc hiệu, số/ký hiệu, nơi nhận, chữ ký) | 1 (24 loại) | Lai (LLM viết JSON, server dựng .docx) | **NĐ 30/2020/NĐ-CP** | **cao** |
| Văn bản Đoàn, Đội, Công đoàn, chi bộ | mẫu đúng cơ quan ban hành | 1 (Đoàn, Đảng) | Lai | thể thức Đoàn; HD 05-HD/VPTW (Đảng) | vừa-cao (với GV kiêm nhiệm) |
| Thông báo cho phụ huynh, họp phụ huynh (biên bản, kịch bản), thư gửi riêng | tin soạn sẵn có xưng hô đúng; lên lịch gửi qua Zalo | 1 (broadcast, cron Zalo) | Có (viết), Không (gửi, lịch) | - | cao |
| Báo cáo học tập định kỳ gửi phụ huynh | báo cáo cá nhân từ dữ liệu điểm và nhận xét | (khoảng trống) | Lai | TT 22/2021, TT 27/2020 | cao |
| Tóm tắt thảo luận nhóm Zalo/lớp, tổng hợp ý kiến | bản tổng hợp theo chủ đề | 1 (`zalo_read_history`, Insight) | Có | - | vừa |
| Bài truyền thông, fanpage, tuyển sinh | caption và bài đăng đúng giọng | 1 (content-giao-duc, fanpage-doan) | Có | - | thấp-vừa |
| Quản trị: phân quyền theo nhóm/người, hạn mức ngày, nhật ký | kiểm soát ai dùng gì | 1 (dashboard), 3, 4 (admin) | Không | - | thấp (cần khi bán cho trường) |

### 7.6 Phát triển chuyên môn

| Tính năng | GV nhận được | Repo | LLM? | Chuẩn VN | Giảm tải |
|---|---|---|---|---|---|
| Sáng kiến kinh nghiệm (SKKN): dàn ý chuẩn, viết từng phần, tài liệu tham khảo | file Word đủ bìa, mục lục, nội dung, TLTK | 1 (`skkn-writer`) | Lai (LLM viết Markdown, server dựng) | cấu trúc SKKN (đề tài, thực trạng, giải pháp, hiệu quả); thi đua khen thưởng | cao |
| Tra cứu học thuật, trích dẫn APA/IEEE/Vancouver | bài báo mở, DOI, trích dẫn | 1 (academic), 4 (paper_search) | Không (API công khai) | - | vừa |
| Báo cáo KHKT học sinh (đề cương) | đề cương và báo cáo đúng mẫu thi KHKT | 1 (`bao-cao-khkt`) | Lai | cuộc thi KHKT cấp trường/tỉnh | vừa |
| Dự giờ, nhận xét tiết dạy, bảng quan sát | phiếu dự giờ, mẫu nhận xét | 2 (lesson-observation-protocol-designer) | Lai | TT 20/2018 (chuẩn nghề nghiệp GV); sinh hoạt chuyên môn | vừa |
| Nghiên cứu bài học, sinh hoạt chuyên môn theo NCBH | kế hoạch chu trình NCBH, biên bản | 2 (lesson-study-cycle-designer, teacher-inquiry-cycle-designer) | Lai | CV 5555/BGDĐT-GDTrH (sinh hoạt chuyên môn theo NCBH) | vừa-cao |
| Thiết kế chuyên đề bồi dưỡng thường xuyên | chuyên đề, slide, tài liệu | 2 (professional-development-session-designer) | Lai | CTBD thường xuyên (mô-đun 1-9), TT 20/2018 | vừa |
| Tự đánh giá theo chuẩn nghề nghiệp, minh chứng | bảng tự đánh giá, danh mục minh chứng | 2 (competency-framework-translator); 1 (`che-do-chinh-sach-giao-vien` cho tra cứu) | Lai | TT 20/2018/TT-BGDĐT | vừa |
| Hồ sơ cá nhân và sổ minh chứng (lưu bài đã soạn, SKKN, giấy khen) | một nơi lưu tập trung, xuất danh mục | (khoảng trống) | Không | thi đua khen thưởng, đánh giá viên chức | vừa |
| Tra cứu chính sách (lương, ngạch, hạng, thăng hạng) | trả lời có nguồn | 1 | Có (RAG văn bản) | các văn bản chức danh nghề nghiệp | vừa |

---

## 8. Nhận xét cho kiến trúc "LLM ở chat người dùng, server cấu trúc + xuất file"

1. Mẫu "LLM viết dữ liệu có schema, server kiểm + dựng file cố định" (repo 1 và Oak) khớp trọn với MCP: tool nhận JSON, `validate`, trả file .docx/.pptx/.xlsx/.html. Không cho LLM viết mã chạy.
2. Phần **thuần server, không cần LLM** mà GV rất cần: ngân hàng câu hỏi + trộn đề, ma trận/đặc tả có kiểm tổng điểm, sổ lớp + nhận xét theo mẫu TT22/27, xuất Excel nhập SMAS/VNEDU, lịch .ics, kho tài liệu của tổ. Cả 6 repo hầu như bỏ trống nhóm "lớp học/sổ sách/nhận xét" (khoảng trống thị trường).
3. Kho prompt/phương pháp của repo 2 (CC BY-SA) dùng làm prompt có sẵn trong MCP; nếu sao chép nguyên văn thì phải ghi công và giữ BY-SA, nên viết lại theo chương trình Việt Nam.
4. Chuẩn VN (5512, 7991, TT22/TT27, NĐ30, SKKN) chỉ repo 1 chạm tới, và chỉ ở khâu soạn; các khâu kiểm tra tuân thủ (kiểm đề có đủ mức độ theo 7991, kiểm giáo án đủ cấu phần 5512) chưa ai làm, đây là chỗ server có thể kiểm bằng quy tắc.
5. Chưa kiểm: nội dung SKILL.md thật của `de-kiem-tra`, `skkn-writer` và mã `giao_an.py` (nằm ở repo 2Anh Studio / skill ngoài); số liệu ở mục 1 lấy từ `recipes.py`, README và `skills-vi-data.js`.
