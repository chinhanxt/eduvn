# OpenMAIC & DeepTutor: phương án tinh giản (strip-down) cho EDUVN

Ngày: 2026-11-09. Phạm vi: nghiên cứu chỉ đọc. Đọc mã bản mới nhất (shallow clone `/tmp/rs`, đã xoá sau khi viết).
Bản đã đọc: **THU-MAIC/OpenMAIC v1.4.2** (MIT, 2026-11-09) và **HKUDS/DeepTutor v1.7.2** (Apache-2.0, 2026-11-06).
Quy ước: `[CV]` = chưa kiểm chứng bằng chạy thật, suy từ mã/tài liệu. Đường dẫn tính từ gốc từng repo.

## 0. Kết luận một màn hình

| | OpenMAIC (giáo viên) | DeepTutor (học sinh) |
|---|---|---|
| Cỡ | ~860K dòng TS/TSX gồm cả packages (lib 216K, components 98K, packages ~150K); Next.js + Postgres | ~330K dòng Python lõi (+228K test) + ~340K dòng TS/TSX web; FastAPI + SQLite/file |
| Khuyến nghị | **(b) dùng như thư viện, không chạy cả app.** Lấy `@openmaic/generation` (14K dòng, MIT, đã trên npm, chỉ cần một hàm `AICallFn`) + `@openmaic/dsl`; xuất PPTX và biên dịch video lấy mã ra port. **(a) chỉ cho `render-service/`** (MP4) chạy sidecar | **(a) sidecar cho gia sư + kho tri thức (RAG) + Book**; **(b) port** phần luyện câu + ôn giãn cách (SM-2 ~100 dòng) sang TS dùng ngân hàng câu hỏi của ta |
| Cần embedding? | Không (RAG là chỉ mục từ vựng trong bộ nhớ) | Có nếu dùng pipeline mặc định `llamaindex`; **tránh được** bằng `pageindex-oss` (chỉ dùng LLM) hoặc Ollama/endpoint `/v1/embeddings` riêng |
| Việt hoá | Prompt viết tiếng Anh, ngôn ngữ dạy do `languageDirective` sinh ra, nên **gần như 0 file prompt phải dịch**; UI đã có `vi-VN` | Prompt chỉ có `en` + `zh`; trả lời bằng tiếng Việt qua chỉ thị ngôn ngữ (`vi` có sẵn); UI đã có `vi` |
| Giấy phép | MIT, kèm LGPL-3.0 cho `packages/mathml2omml` | Apache-2.0, không có file NOTICE (chỉ `THIRD_PARTY_NOTICES.md`) |
| Công sức tổng | L (P5) | L (P6) |

Số loại tác vụ LLM: OpenMAIC có **18 khoá stage** (`lib/server/model-routes.ts` `LLM_STAGES`), phần ta giữ ≈ 8; DeepTutor có **khoảng 35 nhóm lệnh gọi** (64 file prompt `en`, 10 `TaskKind`), phần ta giữ ≈ 18. Tổng cần ánh xạ model + effort: **≈ 26** (bảng ở mục 2).

---

## 1. Bản đồ kiến trúc

### 1.1 OpenMAIC v1.4.2

| Hạng mục | Chi tiết (bằng chứng) |
|---|---|
| Thư mục cấp 1 | `app/` (Next App Router + `app/api/*`), `lib/` (216K dòng: `ai`, `server/generation`, `audio`, `media`, `export`, `video-export`, `rag`, `prompts`, `i18n`, `server/identity`...), `components/` (98K), `packages/@openmaic/{dsl,generation,renderer,editor,importer,storage,geometry}` + `packages/pptxgenjs` (fork) + `packages/mathml2omml` + `packages/docs`, `render-service/` (5.4K dòng), `skills/`, `e2e/`, `eval/`, `tests/` |
| Tiến trình | (1) `openmaic`: Next.js server chạy lâu (Node >= 22.19, pnpm 10.28), chứa luôn worker sinh lớp học (`lib/server/generation/run/*`, nhặt lại việc sau khi khởi động lại) và agent runtime (`OPENMAIC_AGENT_RUNTIME_ENABLED`). (2) `postgres:16` (bắt buộc từ v1.2, `DATABASE_URL`, thiếu thì server thoát). (3) `render-service` (tuỳ chọn, profile `video-export`): Node 22 + Chromium headless shell + FFmpeg. (4) Sandbox (tuỳ chọn, PBL v3). |
| Lưu trữ | Postgres: khoá học, thư mục, lịch sử, tài liệu (`/api/persistence`, schema versioned qua `@openmaic/storage` 47K dòng); media tuỳ chọn S3 (`ASSET_*`); volume `openmaic-data:/app/data`. |
| Việc nền | Generation run (lease + heartbeat trong DB), thu gom asset (`ASSET_COLLECTION_GRACE_MS`, tối thiểu 45 phút từ 1.4.2), trích tài liệu (`lib/server/material-extraction`), agent runner. Từ 1.4.0 replica cũ tự thoát khi DB được migrate lên bản mới. |
| Cổng | App `3000` (compose bind `127.0.0.1`), render-service `9000` (mạng nội bộ `render`), Postgres không publish. |
| Docker | `Dockerfile` (Node 22), `docker-compose.yml` (openmaic + postgres + render-service profile), `docker-compose.defaults.env` (`OWNER_SINGLE_USER=true`). |
| Cỡ theo ngôn ngữ | TS ≈ 750K, TSX ≈ 110K, MD ≈ 26K, JSON ≈ 66K (kể cả locale). Phần giữ lại thực tế nhỏ hơn nhiều (mục 6). |

### 1.2 DeepTutor v1.7.2

| Hạng mục | Chi tiết (bằng chứng) |
|---|---|
| Thư mục cấp 1 | `deeptutor/` (lõi Python ~328K dòng), `deeptutor_cli/`, `web/` (Next.js 340K TS/TSX: `features` 53K, `app` 15K), `packages/chat-engine` (đường TS thử nghiệm), `apps/desktop` (Electron), `requirements/modules/*.txt`, `docs-for-dev/`, `tests/` (229K) |
| Kiến trúc | `docs-for-dev/ARCHITECTURE.md`: CLI / WebSocket / SDK (`deeptutor/app/facade.py` `DeepTutorApp`) cùng đi qua `TurnApplicationService` (`deeptutor/app/service.py`) -> `TurnEngine` -> `ChatOrchestrator` -> capability (chat, deep_question, mastery_path, immersive_reading, deep_solve, visualize...). |
| Mô-đun hoá (từ 1.7.0) | `deeptutor/modules/manifests/*.json`: `core, server, web, knowledge, parsing, questions, mastery, books, reading, memory, notebook, co-writer, research, solve, visualize, audio-overview, video-lesson, renderer-manim, partners, calendar, providers, parser-*`. Có thể `deeptutor module disable <id>` (docs-for-dev/MODULES.md). Rất hợp ý "chỉ lấy cái cần". |
| Tiến trình | Một image GHCR chạy `supervisord`: uvicorn backend (`:8001`) + Next.js frontend (`:3782`); Redis (compose, điều phối); PocketBase (tuỳ chọn). Sandbox-runner sidecar tuỳ chọn. |
| Lưu trữ | **Không có Postgres**: SQLite (`data/user/chat_history.db`, `workspaces.sqlite3`) + file JSON/YAML + chỉ mục KB (`data/knowledge_bases/`, FAISS + BM25 cho `llamaindex`) + parse cache. `DATABASE_URL` bị bỏ qua (docs-for-dev/DATA_STORAGE.md). Đa người dùng = cây thư mục `data/users/<id>/`. |
| Việc nền | Worker lease (`runtime/coordination`), indexing run có checkpoint (`knowledge/indexing_run.py`), cron/calendar, consolidator bộ nhớ, update worker. |
| Ghép nối | Chat qua **WebSocket** `unified_ws.py` (`/ws`, auth `public` rồi tự xác thực token) [CV tiền tố đường dẫn]; KB, practice, book là REST (`/api/knowledge...`, `/api/question-notebook/practice/*`, `/api/books/*`). Không có endpoint REST một-lượt cho chat; SDK Python `DeepTutorApp.start_turn/stream_turn` là cách khác. |
| Cỡ theo module (không tính test) | `services/rag` 21K, `learning` 14K, `services/session` 18K, `services/llm` 13K, `runtime` 13K, `book` 11K, `mastery` 6K, `services/parsing` 5.8K, `knowledge` 5.6K, `multi_user` 4.3K, `agents/question` 3.6K, `services/practice` 0.8K, `api` 33K |

---

## 2. Tầng LLM

### 2.1 OpenMAIC

- **Điểm gọi duy nhất**: `lib/ai/llm.ts` (`callLLM`/`streamLLM`, "all LLM interactions should go through"), Vercel AI SDK v6 (`ai`, `@ai-sdk/openai|anthropic|google|azure|amazon-bedrock`) + `@earendil-works/pi-ai` cho agent có tool-calling. Danh mục provider `lib/ai/providers.ts`.
- **Cấu hình theo tác vụ**: có, rất tốt. `openmaic.yml` (mẫu `openmaic.example.yml`, tài liệu `packages/docs/content/docs/configuration.mdx`): `providers` (preset `openai-compatible` với `baseUrl` bắt buộc) + `slots` dạng cây, mỗi slot nhận `model`, `fallback`, `thinking` (mode/effort `none|minimal|low|medium|high|xhigh|max`, budget). `lock: all` + `allowUserKeys: false` cố định phía server. Danh sách model phải khai báo (`models: [...]`) vì là allowlist.
- **Streaming**: outline dùng stream (`scene-outlines-stream`, parse `languageDirective` ngay khi đang stream, `lib/server/generation/steps/outline.ts`). Thư viện `@openmaic/generation` thì **không** cần stream (xem dưới).
- **Tool-calling**: chỉ ở agent Pro workbench (`agent`, "Requires tool calling") và chat lớp học (`chat-adapter`, từ chối model không có tool). Pipeline sinh bài **không** cần tool-calling.
- **Vision**: tuỳ chọn; `scene-content.ts` gửi ảnh tài liệu khi `capabilities.vision` (`prepareVisionImages`). Có thể tắt.
- **Embedding**: **không có**. `lib/rag/providers/in-memory-lexical-index.ts` là chỉ mục từ vựng trong bộ nhớ (token `[\p{L}\p{N}_]+`, dùng được cho tiếng Việt có dấu). Không cần giải pháp thay thế.
- **Điểm vào quan trọng**: `packages/@openmaic/generation/README.md`: *"`AICallFn` is the package's model seam ... does not select a provider, read environment, or own persistence"*; `type AICallFn = (system, user, images?) => Promise<string>` (`src/pipeline-types.ts`). Có `generateSceneOutlinesFromRequirements`, `generateSceneContent`, `generateSceneActions`, `buildCompleteScene`, `parseJsonResponse`, `postProcessInteractiveHtml`. Mỗi lần gọi là text vào/text ra: **khớp hoàn toàn với gateway CLI Claude/Gemini của ta**.

Danh sách tác vụ LLM (18 khoá `LLM_STAGES`, `lib/server/model-routes.ts`; cột "Giữ" cho bản tinh giản dành giáo viên):

| # | Stage | Làm gì | Giữ | Gợi ý model / effort [CV] |
|---|---|---|---|---|
| 1 | `scene-outlines-stream` | Đề cương bài + `languageDirective` (template `requirements-to-outlines`) | Có | mạnh, effort cao |
| 2 | `scene-content:slide` | Nội dung slide (template `slide-content`, 939 dòng) | Có | mạnh, medium-high |
| 3 | `scene-content:quiz` | Câu hỏi trắc nghiệm trong bài (`quiz-content`) | Có | trung bình, medium |
| 4 | `scene-content:interactive` | Trang tương tác HTML: `code/diagram/game/simulation/visualization3d/procedural-skill-content` | Tuỳ chọn (giai đoạn sau) | mạnh, high |
| 5 | `scene-content` (gốc) | Mặc định cho loại cảnh không có slot riêng | Có | = slide |
| 6 | `scene-actions` | Lời giảng + hành động (`slide-actions`, `quiz-actions`, `interactive-actions`, `pbl-actions`) | Có | trung bình, medium |
| 7 | `quiz-grade` | Chấm câu trả lời mở của HS (`app/api/quiz-grade/route.ts`, prompt nội tuyến rẽ nhánh `isZh`) | Không (HS dùng DeepTutor) | - |
| 8 | `agent-profiles` | Hồ sơ GV/bạn học ảo | Không | - |
| 9 | `scene-content:pbl` | Cảnh học theo dự án | Không | - |
| 10 | `pbl-v2-runtime` (+ `:instructor`, `:open-task`, `:evaluate`, `:simulator`) | Chạy PBL v2 (5 khoá) | Không | - |
| 11 | `chat-adapter` | Thảo luận đa agent trong lớp (cần tool) | Không | - |
| 12 | `web-search-query-rewrite` | Viết lại truy vấn tìm web | Không | - |
| 13 | `maic-agent-driver` | Agent Pro workbench (cần tool) | Không | - |
| 14 | `conversation-title` | Đặt tên hội thoại | Không | - |

Ghi chú: khi dùng trực tiếp thư viện, phần giữ chỉ còn **#1, #2, #3, #5, #6 (+ #4 tuỳ chọn)**, cộng thêm **một tác vụ ngoài danh sách**: phân tích/tóm tài liệu đầu vào (`lib/server/generation/steps/material-analysis.ts`, `research.ts`) nếu cho GV tải PDF. Dòng 10 gộp 5 khoá nên bảng 14 dòng = 18 khoá.

### 2.2 DeepTutor

- **Điểm gọi**: `deeptutor/services/llm/` (13K dòng): `factory.py`, `client.py`, `provider_registry.py`, `provider_core/*` (OpenAI-compat, Anthropic, Azure, OpenAI Responses, Codex, Copilot, CodeBuddy, **`claude_code_provider.py` chạy qua Claude Agent SDK + CLI `claude` cục bộ**). Vòng agent: `deeptutor/runtime/agentic/client.py` (SDK `openai` thuần cho đường chat/loop).
- **base_url + model theo tác vụ**: có ở hai tầng. (i) Catalog model (`services/config/model_catalog.py`): service `llm`, `task` (model riêng cho việc phụ), `embedding`...; binding `custom` = OpenAI-compatible với `base_url`. (ii) Chọn theo từng lượt: `services/model_selection/llm.py` (`LLMSelection`, `VALID_REASONING_EFFORTS`) nên **effort chọn được theo request**. (iii) `services/model_selection/tasks.py`: 10 `TaskKind` ghim được model nhỏ (`session_title`, `chat_starters`, `chat_ask_hint`, `mastery_ask_hint`, `mastery_goal_name`, `reading_*` x4).
- **Streaming**: có, chat/loop stream token (`LabeledStep`, `StreamBus`). Gateway của ta phải trả SSE `/v1/chat/completions` [CV: nếu chỉ trả một khối thì chat vẫn chạy nhưng mất hiệu ứng gõ chữ].
- **Tool-calling**: mặc định tự nhận (`can_use_native_tool_calling`, `runtime/agentic/client.py:786`). Có đường lùi sang giao thức nhãn dạng văn bản (``THINK/TOOL/FINISH``) khi khai báo `supports_tools=false` trên model ("declared capability wins outright"). Gateway CLI không chắc có tool-calling gốc, nên khai `supports_tools=false` và kiểm đường lùi [CV, cần chạy thử: mastery_path dùng nhiều tool].
- **Vision**: có (`services/llm/multimodal.py`, `image_description.py`, caption ảnh trong tài liệu khi index); tắt được.
- **Embedding** (quan trọng cho gateway):
  - `services/embedding/adapters/`: `openai_compatible`, `openai_sdk`, `ollama`, `jina`, `cohere`, `gemini`, `dashscope_native`, `nvidia_nim`. **Không có mô hình embedding chạy trong tiến trình**; "local" nghĩa là Ollama hoặc server `/v1/embeddings` bên ngoài. (`sentence-transformers` chỉ nằm trong `requirements/rag-rerank.txt`, để rerank.)
  - Pipeline RAG (`services/rag/factory.py`): `llamaindex` (mặc định; FAISS + BM25 lai, **cần embedding**), `pageindex-oss` (**không embedding**: cây mục lục do LLM dựng, đọc qua vòng agent dùng chính LLM chat; phụ thuộc gói `pageindex>=0.2.10` trong `requirements/modules/knowledge.txt`), `pageindex` (cloud), `lightrag`/`graphrag` (cần embedding + nhiều lệnh gọi LLM), và các mẫu chỉ-trỏ-tới-ngoài (`ima`, `weknora`, `kiwix`, `lightrag-server`).
  - Lựa chọn cho ta: (1) `pageindex-oss` nếu tài liệu môn có cấu trúc chương mục (giáo trình), chi phí là nhiều lệnh gọi LLM mỗi câu hỏi; (2) `llamaindex` + Ollama `bge-m3` hoặc `multilingual-e5` (~1-2 GB RAM, CPU chạy được) [CV chất lượng tiếng Việt]; (3) thêm `/v1/embeddings` vào gateway trỏ về một mô hình embedding cục bộ. Khuyến nghị bắt đầu bằng (1) cho PoC, chuyển (2) khi cần tốc độ.

Danh sách tác vụ LLM (đếm theo file prompt `en/*.yaml`, 64 file; `[CV]` vì chưa lập đồ thị gọi đầy đủ). Cột "Giữ" cho bản tinh giản dành học sinh:

| # | Nhóm tác vụ | Nơi định nghĩa | Giữ | Tool? | Gợi ý model / effort [CV] |
|---|---|---|---|---|---|
| 1 | Chat có agent (khám phá + trả lời) | `agents/chat/prompts/en/agentic_chat.yaml`, `chat_agent.yaml` | Có | tuỳ chọn | trung bình-mạnh, medium |
| 2 | Tóm tắt ngữ cảnh | `agents/chat/prompts/en/context_summary_agent.yaml` | Có | không | rẻ, low |
| 3 | Viết lại truy vấn RAG | `services/rag/query_rewrite.py` | Có | không | rẻ, low |
| 4 | Đọc cây PageIndex (nếu dùng `pageindex-oss`) | `services/rag/pipelines/pageindex/reasoning.py` | Tuỳ chọn | vòng nhãn | trung bình, medium |
| 5 | Sinh câu hỏi: ý tưởng | `agents/question/prompts/en/idea_agent.yaml` | Có | không | trung bình |
| 6 | Sinh câu hỏi: viết câu | `deep_question.yaml`, `pipeline.yaml` | Có | không | mạnh, medium |
| 7 | Câu hỏi nối tiếp | `followup_agent.yaml` | Có | không | rẻ |
| 8 | Chấm tự luận / đánh giá ngữ nghĩa | `learning/semantic_assessment.py`, `api/routers/quiz_judge.py`, `learning/grading.py` | Có (hoặc chấm bằng hàm của ta) | không | trung bình, medium |
| 9 | Lộ trình thành thạo: chẩn đoán/giải thích/Feynman/luyện/chẩn lỗi/ôn | `learning/prompts/en.yaml` (8 mục: `diagnostic, explain, feynman, practice, error_diagnosis, review, notebook, topic`) | Có | không | trung bình, medium |
| 10 | Vòng agent mastery | `capabilities/mastery/prompts/en/mastery_loop.yaml` (+ 19 tool) | Tuỳ chọn (nặng) | **có** | mạnh, high |
| 11 | Book: ý tưởng, kế hoạch trang, khám phá nguồn, xương sống (spine), tổng hợp spine | `book/prompts/en/{ideation_agent,page_planner,source_explorer,spine_agent,spine_synthesizer}.yaml` | Có | một phần | mạnh, high |
| 12 | Book: biên dịch khối nội dung (10 loại: `text, section, callout, code, deep_dive, figure, flash_cards, animation, interactive, timeline`) | `book/prompts/en/*.yaml` | Có (bỏ `animation`, `interactive` giai đoạn đầu) | không | trung bình, medium |
| 13 | Việc phụ rẻ (10 `TaskKind`): tên phiên, gợi ý, tên mục tiêu... | `services/model_selection/tasks.py` | Có (ghim model nhỏ) | không | rẻ, low/none |
| 14 | Trình bày hình/biểu đồ | `agents/visualize/prompts/en/*` (4) | Không | không | - |
| 15 | Nghiên cứu sâu, giải bài đa bước, đọc tài liệu | `agents/research`, `capabilities/solve`, `capabilities/reading` | Không | có | - |
| 16 | Bộ nhớ dài hạn (consolidator) | `services/memory/consolidator/prompts/en/*` (6) | Không (giai đoạn đầu) | không | - |
| 17 | Âm thanh tổng quan, video lesson, Manim, co-writer, notebook, partners | các module tương ứng | Không | - | - |

Phần giữ = dòng 1,2,3,(4),5,6,7,8,9,(10),11,12,13 -> **≈ 13-15 nhóm** (11 và 12 gồm 5 + 10 prompt riêng).

---

## 3. TTS / STT / video / render

### OpenMAIC

| Mảng | Nhà cung cấp (bằng chứng) | Tiếng Việt | GPU / trình duyệt / RAM |
|---|---|---|---|
| TTS | `lib/audio/types.ts` `BuiltInTTSProviderId`: `openai-tts, azure-tts, glm-tts, qwen-tts, voxcpm-tts, doubao-tts, elevenlabs-tts, minimax-tts, xiaomi-tts, google-tts, lemonade-tts, browser-native-tts` + `custom-tts-*` | Azure có giọng `vi-VN` (`lib/audio/azure.json`, 63 mục `vi-`); OpenAI/ElevenLabs/Google đa ngữ [CV chất lượng]. **Preset `openai-tts` + `baseUrl` tuỳ biến** (ví dụ `openmaic.example.yml` `custom-tts`) cho phép cắm server TTS tiếng Việt cục bộ của ta qua `/v1/audio/speech` mà không sửa mã | Cloud thì không cần. VoxCPM2 tự host cần GPU (vLLM-Omni) [CV hỗ trợ tiếng Việt] |
| STT | `openai-whisper, browser-native, qwen-asr, funasr-asr, lemonade-asr, azure-asr, xiaomi-asr` + custom | Whisper có `vi` (`lib/audio/constants.ts:1438`) | Chỉ cho nhập giọng/phiên âm; **giáo viên không cần ở bản tinh giản** |
| Ảnh / video AI | `app/api/generate/{image,video,tts,voice}`, ComfyUI | - | Bỏ (không cần) |
| Xuất PPTX | **Chạy trong trình duyệt**: `lib/export/use-export-pptx.ts` (1.606 dòng, hook React gắn `useStageStore`), dùng fork `packages/pptxgenjs` (MIT) và `packages/mathml2omml` (LGPL) | Phụ thuộc phông | Không cần GPU. Không có API phía server |
| Xuất MP4 | Hai nửa: (1) biên dịch **thuần** trong `lib/video-export/` (compile -> IR `VideoTimeline` -> `emit-hyperframes`) nhận `TimingProbe` (thời lượng audio) và `AssetSource` qua DI, hiện chạy ở trình duyệt, ra ZIP dự án HyperFrames; (2) `render-service/` nhận ZIP, dựng bằng `@hyperframes/producer` (Chromium headless shell + FFmpeg) | Có gói phông (`gen:video-export-noto-script-fonts`, KaTeX) [CV phủ dấu tiếng Việt] | **Không cần GPU** (SwiftShader). Profile `standard` cần **8 GiB**, `low-memory` **4 GiB** (một việc/lần); mỗi job ~768 MiB task (resource-config) [CV]. Container cần `CAP_NET_ADMIN` cho khoá egress |
| Lưu ý máy dev | Quy tắc "một tiến trình nặng mỗi lúc" (ARCHITECTURE.md nguyên tắc 5) khớp với `RENDER_MAX_CONCURRENCY=1` | | |

Trùng hợp có lợi: render-service dùng cùng bộ HyperFrames mà ta đã có kỹ năng/công cụ sẵn.

### DeepTutor

| Mảng | Chi tiết | Tiếng Việt | Tài nguyên |
|---|---|---|---|
| TTS (đọc to, audio overview) | `services/voice/adapters`: `edge, openai_compat, gemini, dashscope, volcengine, minimax, mimo, mistral, xai`; `requirements/edge-tts.txt` | Edge-TTS có giọng `vi-VN` (HoaiMy/NamMinh) miễn phí, không GPU [CV: điều khoản dùng endpoint không chính thức]; `openai_compat` cắm được TTS của ta | Nhẹ |
| STT | `partners/transcription.py`, `services/voice` | Tuỳ provider | Không cần |
| Video lesson (Remotion), Manim | `agents/video_lesson`, `renderer-manim` | - | Cần Node 22 + npm, có khung WASM; **bỏ** |
| Phân tích tài liệu | `services/parsing/engines`: mặc định + tuỳ chọn Docling/LiteParse/MarkItDown/PyMuPDF4LLM | OCR/VN [CV] | Docling nặng, mặc định thì nhẹ |
| RAM ước tính | App + FAISS + Redis | | ~1-2 GB nhàn rỗi + Ollama embedding ~1-2 GB nếu dùng [CV, chưa đo] |

---

## 4. i18n và prompt

### OpenMAIC
- Bản địa hoá UI: `lib/i18n/locales/*.json` 12 ngôn ngữ gồm **`vi-VN`** (+ `lib/i18n/workbench-locales/vi-VN.json`); đăng ký ở `lib/i18n/locales.ts`; hướng dẫn `lib/i18n/TRANSLATION_GUIDE.md`; kiểm khoá `pnpm check:i18n-keys`.
- Prompt: file Markdown có biến `{{x}}`, `{{snippet:...}}`, `{{#if}}` (`lib/prompts/README.md`, `packages/@openmaic/generation/templates/*/{system,user}.md`). 13 thư mục sinh nội dung + 3 thư mục app (`interactive-outlines`, `task-engine-outlines`, `web-search-query-rewrite`) + 2 snippet. Phần lớn thân prompt là **tiếng Anh**, vài chỗ lẫn ví dụ tiếng Trung (đếm ký tự CJK: `interactive-outlines/system.md` 12 dòng, `simulation-content` 9, còn lại 0-5).
- Ngôn ngữ đầu ra không nằm ở file prompt mà ở `languageDirective` do bước outline suy ra từ yêu cầu (`requirements-to-outlines/system.md` dòng 19-44: "requirement language = teaching language", "foreign language learning -> teach in native language"); thư viện còn có `DEFAULT_LANGUAGE_DIRECTIVE` (`outline-generator.ts:20`).
- **Số file prompt phải có bản tiếng Việt: 0 bắt buộc.** Truyền yêu cầu bằng tiếng Việt hoặc ghi đè directive ("Dạy bằng tiếng Việt, thuật ngữ theo SGK/CTGDPT 2018...") là đủ. Nên thêm tuỳ chọn: 1 khối `languageDirective` mẫu cho từng môn (S). Cần dọn ví dụ tiếng Trung trong ≈ 5-6 template nếu thấy model bị kéo sang tiếng Trung [CV].
- Còn lại **nội tuyến trong TS** (không phải file): prompt chat lớp, `lib/orchestration`, `quiz-grade` (nhánh `isZh`), `lib/server/pbl-v3/ui-labels.ts`. Không thuộc phần ta giữ.

### DeepTutor
- UI: `web/locales/{de,en,fr,ja,ko,pl,pt,tr,uk,vi,zh}` (mỗi ngôn ngữ `app.json` + `common.json`), `web/i18n/languages.ts` có `vi`. Có `docs-for-dev/I18N.md`.
- Ngôn ngữ trả lời: `deeptutor/core/response_languages.py` có `vi`; `services/prompt/language.py` có nhãn `vi: Tiếng Việt` và chỉ thị "giữ đúng ngôn ngữ" chèn vào prompt; người dùng có thể đổi ngôn ngữ giữa chừng.
- Prompt: YAML, **chỉ có `en/` và `zh/`** (104 file YAML tổng cộng, 64 file `en`; `learning/prompts/en.yaml|zh.yaml`, `book/prompts/{en,zh}` mỗi bên 15 file, `agents/question/prompts` 4, `agents/chat/prompts` 3...).
- **Số file cần bản tiếng Việt: 0 bắt buộc; khuyến nghị làm bản `vi` cho ≈ 10-12 file** nhạy với giọng điệu/sư phạm: `learning/prompts` (1 file nhiều mục), `agents/question/prompts` (4), `book/prompts` (5 agent chính; 10 khối kia theo chỉ thị ngôn ngữ), `agents/chat` (2). Cần thêm mã `vi` vào bộ nạp prompt (hiện rẽ nhánh `en`/`zh` qua `is_chinese()`; nên kiểm `services/prompt/manager.py`) [CV].
- BM25 trong pipeline lai: token theo khoảng trắng; tiếng Việt tách theo âm tiết nên chấp nhận được, chưa chuẩn hoá dấu [CV].

---

## 5. Xác thực / đa người dùng

### OpenMAIC
- Mô hình **owner**: mỗi request quy về `OwnerPrincipal {ownerId, kind: anonymous|user|device|shared|service, roles, assurance}` (`lib/server/identity/types.ts`, `resolve.ts`, `registry.ts`). Bốn chế độ (README mục "Who owns a course"): single-user (`OWNER_SINGLE_USER=true`, mặc định compose), shared team (`PERSISTENCE_SHARED_OWNER_ID` + `ACCESS_CODE`), anonymous (cookie), **tài khoản riêng**: đăng ký `OwnerAuthMethod` trong `instrumentation.ts` (`configureOwnerAuthentication({methods})`, thư mục trống `lib/server/identity/host/README.md`; công thức "signed-JWT gateway" trong `packages/docs/content/docs/hosting.mdx`).
- Khoá học thuộc owner; không có khái niệm tổ chức/lớp (workspace chỉ là thư viện của owner; có `folders/members`).
- Độ khó: **chạy sau auth của ta như tài khoản dịch vụ = dễ (S)**: một phương thức xác thực nhận JWT Keycloak hoặc service token và đặt `ownerId = <orgId>` (mỗi tổ chức một thư viện). Nhưng đó chỉ cần nếu chạy cả app. Với hướng (b) (dùng thư viện) thì không có owner nào cả, tenancy hoàn toàn thuộc lõi ta.
- Lưu ý bảo mật đã ghi trong repo: `ACCESS_CODE` rỗng thì mọi route mở; render-service tin header `x-openmaic-render-owner`, phải để trong mạng nội bộ (`render-service/README.md`).

### DeepTutor
- `services/auth.py`: tắt mặc định; bật thì JWT riêng, người dùng lưu `data/system/auth/users.json` (băm bcrypt), vai trò `admin|user` (`multi_user/models.py`), người đầu tiên đăng ký là admin. Có `AccountPreset`, quyền theo tài nguyên (`multi_user/knowledge_access.py`, `book_access.py`, `grants.py`, `guardians.py`), mỗi người một cây `data/users/<id>/`. PocketBase tuỳ chọn nhưng **chỉ đơn người dùng**. Không có OIDC/SSO.
- Router `auth` có `/session-handoff` (`create_session_handoff`) [CV: có thể tạo token cho user cụ thể].
- Cách chạy sau auth ta: (1) **một tài khoản dịch vụ admin** + lõi tự quản lý tenancy (map lớp/môn -> tên KB `eduvn_<org>_<lop>_<mon>`; lịch sử chat lưu bên ta). Đơn giản nhưng mọi HS dùng chung sổ học tập/bộ nhớ của DeepTutor. (2) **một tài khoản DeepTutor mỗi HS**, tạo lười qua API admin (`api/routers/multi_user.py`), lõi giữ bảng ánh xạ `users.sub -> deeptutor_user` và xin token thay mặt; mất: phải giữ đồng bộ, chi phí RAM/ổ đĩa theo người, đa-worker còn race (`USERS_WRITE_LOCK` chỉ trong tiến trình, docs ghi rõ). Khuyến nghị: bắt đầu bằng (1) cho RAG + gia sư; trạng thái luyện tập/ôn giãn cách port sang lõi (mục 6) để tránh phụ thuộc kiểu (2).
- Độ khó: dịch vụ dùng chung tài khoản dịch vụ = S-M; ép DeepTutor hiểu tổ chức/lớp của ta = L (không nên).

---

## 6. Khuyến nghị tinh giản

### 6.1 OpenMAIC (P5, giáo viên)

| Mô-đun | Đường dẫn | Quyết định | Cách | Công sức |
|---|---|---|---|---|
| **Giữ** Pipeline sinh bài | `packages/@openmaic/generation` (src + `templates/` + `snippets/`) | Giữ | **(b)** `npm i @openmaic/generation` trong lõi TS, cung cấp `AICallFn` gọi gateway. Không cần Next/Postgres. Ghim phiên bản, chép `templates/` nếu muốn sửa prompt | S-M |
| Giữ DSL slide | `packages/@openmaic/dsl` (8.7K) | Giữ | (b) cùng npm; là schema slide/scene lưu trong DB của ta | S |
| Giữ xuất PPTX | `lib/export/use-export-pptx.ts` + `lib/export/{html-parser,latex-to-omml,pptx-rich-text,svg*,narration}.ts`, `packages/pptxgenjs`, `packages/mathml2omml` | Giữ, đã có exporter .pptx riêng ở P3, chỉ port nếu cần bám DSL | **(b)** tách hook React thành hàm thuần `slideDsl -> pptx` (chạy Node). Lưu ý LGPL ở mathml2omml (mục 7) | M |
| Giữ biên dịch video | `lib/video-export/` (compile, passes, emit-hyperframes) + `lib/video-export-app/{build-export-zip,package-zip,collect}.ts` | Giữ | **(b)** port; cắm `TimingProbe` bằng thời lượng audio từ TTS của ta (`lib/video-export/deps.ts`) | M |
| Giữ dựng MP4 | `render-service/` (Node 22, Chromium, FFmpeg) | Giữ | **(a) sidecar** nguyên bản (HTTP `POST /owner-bound/render` + poll + download; header `x-openmaic-render-owner` đặt = orgId); hàng đợi bên lõi ta; 1 job/lần | S |
| Giữ TTS lời giảng | `lib/audio/{tts-providers,narration-tts,tts-utils,pcm-wav,audio-duration}.ts` + preset `openai-tts` | Giữ phần cần | **(b)** viết lại mỏng: lời giảng -> `/v1/audio/speech` (TTS tiếng Việt của ta) -> wav + thời lượng | M |
| Tuỳ chọn Trình phát/biên tập | `packages/@openmaic/renderer` (9K), `editor` (29K), `importer` (29, nhập PPTX) | Sau | (b) dùng `renderer` để xem trước/phát trong web React của ta; `editor` chỉ khi buộc phải sửa tại chỗ | M-L |
| **Bỏ** | `components/`, `app/` (UI Next), `lib/{chat,orchestration,agent,pbl,live,whiteboard,workbench...}`, `lib/server/{agent-runtime,pbl-v3,sandbox,identity}`, `packages/@openmaic/storage` (47K, lớp Postgres của họ), `lib/web-search`, `lib/media` (sinh ảnh/video AI), `comfyui*`, `skills/`, `e2e/`, `eval/` | Bỏ | - | - |

Hai phương án so sánh:
- **(a) chạy cả OpenMAIC làm sidecar**: ưu điểm là có đủ editor/player có sẵn, gọi `POST /api/generate-classroom {requirement, materialIds}` -> `GET /api/generate-classroom/[jobId]`. Nhược: Next + Postgres riêng (860K dòng, lên phiên bản hằng tuần, migration DB một chiều), UI không theo kiểu EDUVN, **PPTX và MP4 vẫn phải có trình duyệt** (xuất ở client) nên không gọi được thuần HTTP, owner đơn. Chỉ nên dùng làm demo nhanh (`OWNER_SINGLE_USER=true`, `lock: all`, `allowUserKeys: false`, provider `openai-compatible` trỏ gateway).
- **(b) thư viện (khuyến nghị)**: phù hợp ARCHITECTURE.md nguyên tắc 1 và 4 (lõi giữ danh tính; không fork khi chưa cần: ở đây "không fork", chỉ phụ thuộc npm `@openmaic/*` đã phát hành).

Công sức P5 tổng thể: **L** (S-M sinh bài + M PPTX + M video/TTS + S sidecar render + việc Việt hoá chỉ thị ngôn ngữ/phông; chưa tính editor).

### 6.2 DeepTutor (P6, học sinh)

| Mô-đun | Đường dẫn | Quyết định | Cách | Công sức |
|---|---|---|---|---|
| **Giữ** Gia sư chat | `deeptutor/agents/chat`, `runtime/*`, `app/*`, `services/session`, `api/routers/unified_ws.py` | Giữ | **(a) sidecar** (Python, gắn rất chặt với `runtime/`, `services/session` 18K, WebSocket); lõi làm cầu nối WS/SSE nội bộ sang web/Zalo | M |
| Giữ Kho tri thức + RAG | `deeptutor/knowledge`, `services/rag` (21K), `services/parsing`, `services/embedding`, `api/routers/knowledge.py` (5.2K) | Giữ (module `knowledge`, `parsing`) | **(a)**; pipeline `pageindex-oss` (không embedding) hoặc `llamaindex` + Ollama; nạp tài liệu qua REST, 1 KB/lớp-môn | M |
| Giữ Book (giáo trình sống) | `deeptutor/book` (11K), `api/routers/book.py`; module `books` kéo theo `knowledge, parsing, questions, visualize, mastery` | Giữ | **(a)**; phức tạp, nhiều agent + khối; port là L và không đáng | M |
| Giữ Sinh câu hỏi | `deeptutor/agents/question` (3.6K), module `questions` | Giữ | **(a)** ban đầu; kết quả đẩy về ngân hàng câu hỏi (02). Về sau thay bằng **(b)** dùng prompt `idea_agent/deep_question` chép sang skill của ta | S -> M |
| **Port** Luyện câu + ôn giãn cách | `deeptutor/services/practice/{scheduler,storage,answers,analytics}.py` (0.8K, SM-2 xác định, `schedule(state, rating, now)` with `again/hard/good/easy`), phần xác thực trắc nghiệm phía server | Port | **(b)** sang TS trong `server/src/domain/`; dữ liệu nằm trong Postgres + ngân hàng câu hỏi của ta (đúng yêu cầu "our question bank"); dùng sổ điểm/lớp có sẵn | S-M |
| Cân nhắc Mastery path | `deeptutor/learning` (14K), `capabilities/mastery` (6K) | Tuỳ chọn (sau) | Quá lớn, nhiều tool; nếu cần chỉ mượn `learning/scheduler.py` (khoảng cách theo loại tri thức `MEMORY/CONCEPT/PROCEDURE/DESIGN`) và prompt | M-L |
| **Bỏ** | `reading`, `co_writer`/notebook, `research`, `solve`, `visualize`+`renderer-manim`, `video-lesson`, `audio-overview`, `partners`, `calendar`, `memory`, `mcp/cli_apps`, `plugins`, `apps/desktop`, `video_learning`, `capabilities/{obsidian,marginnote4,ima}`, `deeptutor_cli` | Bỏ | Tắt bằng `deeptutor module disable <id>` thay vì xoá mã | S |
| UI | `web/` | Bỏ (dùng UI React của EDUVN) | Gọi API; chỉ giữ web gốc cho debug nội bộ | - |

Công sức P6: **L** (sidecar + cầu WS + cổng nạp tài liệu + port luyện tập). Rủi ro chính: gateway cần stream + (hoặc khai `supports_tools=false` và kiểm giao thức nhãn), tài khoản dịch vụ chung, embedding.

### 6.3 Yêu cầu đặt ra cho gateway LLM

| Nhu cầu | OpenMAIC (thư viện) | DeepTutor (sidecar) |
|---|---|---|
| `/v1/chat/completions` văn bản | Có (qua `AICallFn`) | Có |
| SSE streaming | Không bắt buộc | Nên có (chat, loop) |
| Tool-calling | Không | Có thể tắt (`supports_tools=false`) [CV] |
| Vision | Tuỳ chọn | Tuỳ chọn (caption ảnh khi index) |
| Embedding `/v1/embeddings` | Không | Cần nếu `llamaindex`; không cần nếu `pageindex-oss` |
| Effort theo tác vụ | Ghép vào `AICallFn` (ta chọn) | `LLMSelection` + `TaskKind` + header/field effort của gateway [CV] |
| Tên model theo tác vụ | Khai theo stage trong cấu hình ta | Catalog `llm`/`task` + override `TaskKind` |

---

## 7. Giấy phép

| | Nghĩa vụ |
|---|---|
| OpenMAIC (MIT, `LICENSE`: "Copyright (c) 2026 THU-MAIC") | Giữ nguyên thông báo bản quyền + văn bản giấy phép trong mọi bản sao đáng kể. Không có file NOTICE. Gói `@openmaic/*` trên npm cũng MIT (có `LICENSE` riêng, kiểm `packages/@openmaic/*/package.json`). `packages/pptxgenjs` là MIT của bên thứ ba (fork, giữ giấy phép gốc). **`packages/mathml2omml` là LGPL-3.0-or-later** (README mục "Third-Party Components"): nếu chỉ gọi như thư viện liên kết động qua npm thì được, nhưng nếu chép vào kho EDUVN hoặc sửa thì phải giữ LGPL cho phần đó và cho phép thay thế thư viện; cân nhắc dùng lại bộ chuyển LaTeX -> OMML của P3/P4 để né LGPL. README nói rõ khi phân phối lại cả repo thì mỗi gói giữ điều khoản riêng. |
| DeepTutor (Apache-2.0, `LICENSE`) | Kèm bản Apache-2.0, giữ thông báo bản quyền/ghi công, **đánh dấu file đã sửa**, giữ nguyên phần NOTICE nếu repo có; **repo không có file `NOTICE`** (chỉ `THIRD_PARTY_NOTICES.md` ghi CSSwitch/MIT), nên giữ cả `THIRD_PARTY_NOTICES.md` khi phân phối. Có điều khoản cấp bằng sáng chế (an toàn hơn MIT cho ta). Dependency đi kèm giữ giấy phép riêng [CV: chưa rà `requirements/*` cho GPL/AGPL; ví dụ `pageindex`, `lightrag`, `docling`]. |
| Với docs/modules/07 | Ghi "Giữ nguyên LICENSE/NOTICE" là đúng; thêm: gắn `THIRD_PARTY_NOTICES.md`. |
| Chung | Tạo file `THIRD_PARTY_LICENSES.md` ở gốc EDUVN liệt kê hai dự án + phiên bản + giấy phép; ghi chú "đã sửa" tại file port (TS) có nguồn gốc từ OpenMAIC/DeepTutor. Logo/tên "OpenMAIC", "DeepTutor" không có điều khoản cấp nhãn hiệu: không dùng làm tên sản phẩm. |

---

## 8. Điều đáng chú ý ở bản mới

### OpenMAIC
- **v1.4.2 (2026-11-09)**: undo/redo cấp khoá học (trong bộ nhớ tab); Director không còn thử lại vô hạn agent con lỗi; `ALLOW_LOCAL_NETWORKS` cover dải `198.18.0.0/15`; bản vá PBL v3; `@openmaic/generation` 0.3.31, `@openmaic/renderer` 0.2.1. Không đổi schema so với 1.4.1.
- **v1.4.0 (11-04)**: PBL v3; **schema v4 một chiều** và replica cũ tự thoát (`SchemaVersionAheadError`). Rủi ro nâng cấp nếu chạy cả app; ít ảnh hưởng nếu chỉ dùng npm.
- **v1.3.x**: knowledge base, Pro workbench, Google TTS Gemini mới, DeepSeek Token Plan; từ 1.2 bắt buộc Postgres; định dạng `.maic.zip` v2 cho PBL v3.
- Nhịp phát hành rất nhanh (4 bản trong 10 ngày) nên ghim phiên bản `@openmaic/generation` và chạy bộ test snapshot prompt riêng.
- Sandbox: từ 1.4.2 mọi owner (kể cả ẩn danh) dùng được sandbox nếu bật (cảnh báo trong CHANGELOG); ta không bật.

### DeepTutor
- **v1.7.2 (11-06)**: đọc to đoạn chọn; khám phá model sau khi sửa credential và import nhiều model cùng lúc; nhà cung cấp tuỳ biến mặc định tự chọn giao thức; NVIDIA NIM embedding; Mastery Path chọn model trước khi dựng outline; **tiếng Hàn UI (một phần)**; BM25 giữ định danh có dấu chấm; có thể thử lại một lần với ngân sách lớn hơn khi suy luận hết token mà chưa có câu trả lời (opt-in). Bản desktop đủ Apple Silicon/Intel/Windows.
- **v1.7.0 (10-28)**: **chia module** (`deeptutor[full]`, `deeptutor module enable/disable/install`); Notebook dạng khối với Dito; Video lesson (Remotion) + Edge TTS. Từ 1.7.0 phải gỡ `deeptutor-cli` cũ trước khi nâng cấp.
- Có `claude_code_provider.py` (chạy turn qua CLI `claude` đã đăng nhập) [CV]: một đường tắt nếu muốn bỏ qua gateway, nhưng ta ưu tiên gateway để thống nhất effort/chi phí.
- Có đường TS thử nghiệm `packages/chat-engine` + `runtime/ts_engine` (`DEEPTUTOR_CHAT_ENGINE`), nhưng tài liệu nói rõ Python vẫn là mặc định, không phải bằng chứng backend đã chuyển sang TS.

---

## 9. Việc làm tiếp theo gợi ý (chưa làm, chờ chinhan duyệt)

1. PoC OpenMAIC-thư-viện: một script Node gọi `generateSceneOutlinesFromRequirements` + `generateSceneContent` + `generateSceneActions` với `AICallFn` -> gateway giả, chủ đề Toán 8 bằng tiếng Việt; đo số lệnh gọi và token (S).
2. PoC DeepTutor: docker chạy 1 KB `pageindex-oss` với một chương SGK, chat qua WS, model = gateway giả khai `supports_tools=false`; xem đường lùi giao thức nhãn có chạy ổn (S-M).
3. Chốt cách tạo giọng TTS tiếng Việt cho P5 (server `/v1/audio/speech` cục bộ) trước khi port narration.
4. Quyết định embedding: pageindex-oss hay Ollama bge-m3.
5. Rà giấy phép dependency của DeepTutor (`requirements/full.txt`) trước khi triển khai thật.
