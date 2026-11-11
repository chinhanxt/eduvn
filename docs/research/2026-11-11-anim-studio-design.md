# EDUVN — Studio hoạt hình AI: khảo sát + thiết kế

Ngày 2026-11-11. Chỉ là nghiên cứu và thiết kế, không sửa code EDUVN. Code tham chiếu: `~/projects/eduvn-wt/integ` (HEAD 80dc2aa). Token "Giấy học thuật" đang làm dở ở `~/projects/eduvn-wt/tham-my` (`services/video-theme/tokens.json`, `server/src/services/anim/studio.ts`, `services/manim/studio.py`), chưa commit.

---

## 0. Tóm tắt quyết định

1. **AI viết bài dựng, nhưng chỉ bằng thư viện của ta.** AI viết HTML khai báo cùng một kịch bản GSAP, và chỉ được gọi `EK.*` (eduvn-kit). Phần hình học (đồ thị, bản đồ, bố cục đồ thị, KaTeX) do máy chủ dựng sẵn bằng thư viện đã kiểm (d3-geo, dagre, KaTeX, bộ phân tích biểu thức `expr.ts`). AI không bao giờ tự tính toạ độ bản đồ, không tự viết `<script src>`, không gọi mạng.
2. **Kho skill theo chuẩn Agent Skills** (agentskills.io), gồm 87 skill trong 10 nhóm. Mỗi skill có `SKILL.md`, bài mẫu vàng đã qua lint và kiểm khung, checklist máy đọc được, ảnh mẫu trung tính và ca eval.
3. **System one chọn skill** đi hai bước. Bước 1 tất định: luật cứng, đặc trưng nội dung và BM25 tiếng Việt dùng lại `server/src/domain/tutorSearch.ts`, ra tối đa 8 ứng viên. Bước 2 là một lần gọi LLM: chọn 1–3 skill và viết kế hoạch beat theo lời giảng. Mỗi thẻ ứng viên kèm "tóm tắt thân skill", vì SkillRouter cho thấy chỉ dùng tên + mô tả thì độ chính xác tụt 37–44 điểm. Có ngưỡng tin cậy và có phản hồi của GV (giữ/bỏ) để xếp hạng lại.
4. **Kiểm trước, dựng sau.** QA dùng `hyperframes check --json`, vốn đã có sẵn các kiểm: chữ đè, tràn, tương phản WCAG AA, dải phụ đề, khoảng chết, chữ dưới ngưỡng, và kiểm chuyển động qua `*.motion.json`. Ta thêm 4 kiểm riêng: màu phải thuộc token, chữ không rớt lẻ một từ, nhãn không xa vật, beat khớp lời. Ta tự sinh `motion.json` từ kế hoạch beat. Chỉ dựng MP4 1080p khi đã qua kiểm. AI sửa tối đa 2 lần, sau đó lùi về khuôn cũ.
5. **Manim do AI viết làm sau HyperFrames.** Chạy trong bubblewrap không mạng, có systemd scope giới hạn RAM/CPU/thời gian, kèm lint AST và hook audit của Python. Lưới QA lấy khung bao (bounding box) thật của mobject ngay lúc chạy, không đoán bằng VLM.
6. **Điều kiện tiên quyết trên máy này: bubblewrap đang bị AppArmor chặn** (Ubuntu 24.04, `apparmor_restrict_unprivileged_userns=1`). Cần bật một lần bằng root (xem §6.3). Nếu `sandbox doctor` không qua thì chế độ "AI tự viết" tự tắt và chỉ còn đường khuôn cũ.

---

## 1. Hiện trạng EDUVN (đã đọc mã)

| Phần | Hiện tại | Ý nghĩa cho Studio |
|---|---|---|
| 28 khuôn | `server/src/services/anim/spec.ts` (zod), `catalog.ts`, `hfHtml.ts` + `hfHtmlMore.ts` (11 HF), `services/manim/templates*.py` (17 Manim) | Đây là **đường lùi**. Mỗi skill mới có `fallback` trỏ về 1 khuôn. |
| Bộ lọc sơ bộ | `catalog.ts: prefilter()`: môn +4/lệch −3, lớp +1/−2, từ khoá +2 (trần +8), ≥1 từ khoá trúng và điểm ≥3, lấy top 6 | Giữ ý tưởng. Thay đếm `includes` bằng BM25 + đặc trưng nội dung. |
| Task AI | `gateway/tasks.json → hoat_hinh_toan` (json, model `claude-sonnet-5-5-medium` → `gemini-3.8-flash-medium` → `claude-sonnet-4-6`), trả `{template, params, reason, confidence}`, ngưỡng 0,6 | Thêm 5 task mới (§7.1), giữ `hoat_hinh_toan` cho đường lùi. |
| Dựng | `anim/index.ts`: hàng đợi 1 việc, bọc `heavy run`, cache `DATA_DIR/anim/<băm>.mp4`, chuẩn hoá ffmpeg; HF chạy bằng `npx --yes hyperframes@0.9.28` | **Lỗ hổng**: `npx --yes` có thể tải gói qua mạng lúc chạy, và `hfHtml.ts` nạp GSAP từ `cdn.jsdelivr.net`. Studio phải ghim `hyperframes` vào `node_modules` và để GSAP/KaTeX nằm sẵn trong `assets/`. |
| Khung | 1280×720, nền navy (bản cũ); tham-my chuyển sang 1920×1080, 12 cột, `tokens.json` v2 | Studio dùng thẳng `tokens.json`, không tạo hệ token thứ hai. |
| Lời giảng | `aiLessons/types.ts`: `StoredAction` speech có `durationMs` từng câu; `SceneAnim` lưu trong JSON cảnh | Mốc beat lấy từ tổng dồn `durationMs` từng câu. Mốc từng từ thì nội suy theo âm tiết (tiếng Việt đơn âm tiết) hoặc dùng căn chỉnh cưỡng bức MMS_FA khi cần karaoke. |
| Skill sư phạm (P8) | `skills/*/SKILL.md` + `references/` + `evals/evals.json`, loader `server/src/services/skills.ts`, MCP `lay_skill` | Kho skill hoạt hình theo cùng khuôn, nhưng để ở thư mục riêng `anim-skills/` với `metadata` cho bộ chọn. |
| Truy hồi | `server/src/domain/tutorSearch.ts`: lớp `Bm25` (k1=1,5, b=0,75), chuẩn hoá NFC + bỏ dấu, không dùng embedding | Bộ chọn skill dùng lại lớp này. Không cần thêm hạ tầng embedding. |
| DB | drizzle, migration mới nhất `0015_solutions.sql` (không có 0013) | Migration Studio dự kiến `0024_anim_studio.sql`; kiểm lại số lúc làm. |

---

## 2. Khảo sát trên máy

### 2.1 `~/hyperframes` (commit 841195653, Apache-2.0)

- `registry/registry.json`: **456 mục = 210 block + 238 component + 8 example**. `catalog` lập chỉ mục 448 mục (block + component). Con số "471" trong yêu cầu không khớp bản đang có trên máy.
- CLI chạy được offline từ cache npx: `~/.npm/_npx/702923228c2ce1e6/node_modules/hyperframes` (0.9.28).
  - `hyperframes catalog --query "<tiếng Anh>" --json [--type block|component] [--tag t]`: tìm theo từ, cục bộ, không gửi gì ra ngoài. Tầng `--on-device` (tải ~33 MB) xếp theo nghĩa. Truy vấn phải bằng tiếng Anh. Đã thử 14 truy vấn, đều trả kết quả, ví dụ `"map route arrows"` → `us-map-flow, world-map, hw-arrow…`.
  - `hyperframes add <name> --json`: chép mã nguồn vào `compositions/`. **Lệnh này cần mạng**, nên chỉ chạy lúc soạn skill, không chạy lúc dựng.
- `check --json` là cổng kiểm duy nhất: lint, lỗi runtime/mạng, layout (`content_overlap`, tràn khung, chữ bị cắt, `escaped_container`, `connector_detached`), tương phản WCAG AA (có `suggestedColor`), craft (`dead_stretch` > 3 s, `text_below_floor` < 28 px, `line_unread`, `first_frame_empty`), `sweep_static`, `--caption-zone`, và **sidecar `*.motion.json`** (`appearsBy`, `before`, `staysInFrame`, `keepsMoving{maxStaticSec}`). Đây gần như đủ QA mà chinhan yêu cầu.
- Runtime adapter (`packages/core/src/runtime/adapters/`): gsap, animejs, d3, maplibre, leaflet, lottie, three, waapi, css, typegpu. Nghĩa là bản đồ MapLibre/d3 tua (seek) được theo khung.
- `skills/`: `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `slideshow`, `remotion-to-hyperframes`, `figma`. Bản cài ở `~/.claude_shared/skills/hyperframes*`. Phần đáng học: `references/types/explainer.md` ("một sơ đồ lớn dần, mỗi phần hiện khi được gọi tên", "biến đổi liên tục", "nhãn nằm trên vật, có đường dẫn, không chú giải rời"), `motion.md`, `review.md`, `captions.md`, `types/data.md`, `film.md` (bản đồ: dùng Natural Earth cho viền và nhãn, nướng camera trước bằng `scripts/bake-basemap.mjs`, việc này cần mạng).
- `DESIGN.md`, `themes/{bold,editorial,neutral}.css` + `CONTRACT.md`: cấu trúc biến chủ đề. Ta chỉ học cấu trúc, màu lấy từ `tokens.json`.
- **Cảnh báo phụ thuộc**: các block `data-chart`, `world-map`, `flowchart`… nạp `gsap`, `d3@7`, `topojson-client` từ jsDelivr. Khi đưa vào kit phải tải về `services/anim-kit/vendor/`, đổi đường dẫn và đổi màu sang token.

**Các mục hợp giáo dục** (lọc từ 448; bỏ marketing, mock-UI, WebGL/shader vì nặng RAM và chậm trên GPU phần mềm của Linux):

| Nhóm | Mục registry | Dùng cho skill |
|---|---|---|
| Vẽ nét, ghi chú tay | `svg-stroke-trace`, `svg-line-draw-loader`, `whiteboard-ink`, `outline-draw`, `hw-arrow`, `hw-underline`, `hw-callout-circle`, `hw-box-label`, `hw-pipeline`, `hw-path-text`, `marker-highlight`, `vox-annotate`, `cursor-annotate`, `inline-highlight`, `mk-callout-highlight` | nhấn mạnh, dựng hình, tu từ, chú thích sơ đồ |
| Số, biểu đồ | `count-up`, `number-wheel`, `mk-progress-stat`, `mk-usage-arc`, `conic-progress-ring`, `data-chart`, `chart-story`, `mk-line-graph`, `animated-bar-chart`, `bar-chart-race`, `decline-chart` | số liệu, nhiệt-ẩm, tháp dân số, cơ cấu |
| Bản đồ | `world-map` (d3 Natural Earth), `us-map-flow` (cung nối), `us-map-bubble`, `us-map-hex`, `spain-map` (choropleth) | bản đồ chủ đề, luồng di chuyển, chiến dịch (đổi dữ liệu sang VN) |
| Sơ đồ | `flowchart`, `flowchart-vertical`, `constellation-hub`, `radial-surround`, `locked-nucleus-orbit`, `examples/decision-tree` | quy trình, nhân vật, cây phân loại, cấu hình electron |
| Chữ động | `per-word-rise`, `per-word-crossfade`, `staggered-fade-up`, `line-by-line-slide`, `kinetic-center-build`, `typewriter`, `strikethrough-replace`, `text-match-cut`, `kinetic-type-swap`, `caption-pill-karaoke`, `caption-clip-wipe`, `caption-editorial-emphasis` | thơ, trích dẫn, phụ đề, sai→đúng, ngữ pháp |
| Code | `code-highlight`, `code-typing`, `code-diff`, `code-morph`, `code-scroll` | Tin học |
| Chuyển cảnh, camera | `match-cut`, `text-match-cut`, `morph-swap`, `modal-morph`, `fade-through`, `iris-reveal`, `pan-stations`, `pull-back-reveal`, `push-in`, `scroll-camera-story`, `beat-timeline` | chuyển cảnh giữ vật, camera kể chuyện (mỗi cảnh 1 chuyển động chậm) |
| Thẻ, bố cục | `titlecard-calm`, `titlecard-lockup`, `split-tilt-cards`, `grid-card-assemble`, `stagger-cascade`, `mk-specs-list`, `marker-checklist-card` | mở đầu, chương, kết, so sánh |
| Vật lý giả lập | `pendulum-swing`, `arc-motion-path` | dao động, ném xiên (vẽ minh hoạ; khi cần đúng định lượng thì dùng Manim) |

Mọi mục khi đưa vào kit đều phải **viết lại theo token** (nền `#FDFCF9`, mực `#1C1B1A`, nhấn `#2F5D8A`, bảng phân loại `lam/lucLam/xanhLa/tim/doSon/vangDam/hong`, `cam` chỉ là màu phụ hiếm), dùng font Inter + Source Serif 4 tự host, cỡ chữ ≥ 36 px, và bỏ `elastic`/`bounce`.

### 2.2 Skill ở `~/.claude_shared/skills/`

`hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`. Đây là hợp đồng render, vòng làm việc và cách đọc JSON của `check`. **Lấy cho EDUVN**: 12 điều khoản hợp đồng (Contract) đưa vào lint (§6.1), vòng "lint → check → snapshot → render" (§5), và các cờ đánh dấu ý đồ (`data-layout-allow-*`, `data-hold`).

### 2.3 Môi trường hộp cát (đã thử thật)

| Thử | Kết quả |
|---|---|
| `bwrap --ro-bind / / --unshare-net … true` | **Hỏng**: `setting up uid map: Permission denied` / `loopback: Failed RTM_NEWADDR`. AppArmor 24.04 chặn userns không đặc quyền (`/proc/sys/kernel/apparmor_restrict_unprivileged_userns = 1`); có profile cho `chrome` nhưng không có cho `bwrap`. |
| `unshare -rn` | Hỏng, cùng lý do. |
| `systemd-run --user --scope -p MemoryMax=300M -p CPUQuota=100% -p RuntimeMaxSec=10` | **Chạy được** (cgroup user có `cpu memory pids`). |
| `systemd-run --user … -p IPAddressDeny=any` | **Không chặn mạng** (curl vẫn trả 200) vì user manager không có quyền BPF. |
| Manim | venv `~/Apps/manim`, Manim CE 0.22.1. |

Kết luận: giới hạn tài nguyên làm bằng systemd user scope. Cách ly mạng cần bwrap, và bwrap cần một profile AppArmor cài bằng root một lần (§6.3).

---

## 3. Khảo sát trên mạng

Số sao, giấy phép và ngày push lấy bằng `gh api` hôm 2026-11-11. Các repo được clone nông vào `/tmp/anim-src` và đã xoá sau khi đọc.

### 3.1 Agent sinh video Manim / mã hoạt hình

| Repo | ★ | Giấy phép | Push gần nhất | Lấy gì cho EDUVN | Dùng được? |
|---|---|---|---|---|---|
| TIGER-AI-Lab/TheoremExplainAgent | 1 514 | MIT | 2025-07-27 (chậm lại) | Chuỗi planner → kế hoạch cảnh → code → render → sửa lỗi (`max_retries=3`); RAG trên tài liệu Manim (Chroma); **prompt phát hiện plugin** (`prompt_detect_plugins.txt`: chỉ chọn plugin thực sự cần cho hoạt cảnh lõi, đúng tinh thần bước 2 của bộ chọn); prompt tự soi hình (`prompt_visual_self_reflection.txt`: đè, ra ngoài khung, căn lề, gom nhóm); luật vùng an toàn 0,5 đơn vị, khoảng cách tối thiểu 0,3; bộ đề TheoremExplainBench | Có: học prompt + cấu trúc, tự viết lại |
| showlab/Code2Video (ICML 2026) | 2 356 | MIT | 2026-08-24 | **Visual Anchor**: lưới 6×6 bên phải + cột bài giảng bên trái, `place_at_grid`/`place_in_area` (ta dùng lưới 12 cột của token thay vào); **ScopeRefine** sửa lỗi từ dòng → khối → toàn bài, có dry-run (`construct` thoát sớm) để bắt lỗi rẻ; critic VLM chỉ về bố cục kèm bảng chiếm ô; thước đo TeachQuiz | Có: học kiến trúc sửa lỗi + neo bố cục |
| marcelo-earth/generative-manim (Animo) | 941 | Apache-2.0 | 2026-09-17 | ~670 cặp prompt→mã Manim (`datasets/edoh-dataset*.jsonl` 599 cặp, ghi ở 3 định dạng, + `physics-01` 39 + 30) làm kho few-shot/RAG; kiểm tên lớp Scene là định danh thuần (`validation.py`) | Có (Apache): dữ liệu few-shot, lọc trước |
| HarleyCoops/Math-To-Manim | 2 851 | MIT | 2026-11-10 (rất sôi động) | Chuỗi Mythos: 6 bước suy luận, mỗi bước ghi 1 JSON → codegen → verify → render → repair (mặc định ≤3); trạng thái `outcome ∈ {film_ready, validation_failed, render_failed, render_timed_out, render_blocked…}`; **SceneSpec có ngân sách** (≤1280×720, 30 fps, 60 s) và biểu thức qua danh sách cho phép, "spec không thể chạy mã"; tự ghi nhận hạn chế "không có critic → mũi tên chạm nhau, vật vào dải phụ đề" | Có: mô hình trạng thái + ngân sách |
| makefinks/manim-generator (Manim Bench) | 120 | MIT | 2026-09-04 | Cặp Code Writer / Code Reviewer, reviewer nhận khung hình + log; "không lặp lại góp ý cũ trừ khi chưa sửa" | Có: mẫu prompt sửa |
| mathifylabs/ManimAgentPrompts | 18 | MIT | 2026-01-14 | 24 phiên bản "prompt trình biên dịch": bất biến bố cục (đệm 0,2; đáy ≥ −3,2), "sửa bố cục ưu tiên cao nhất", giao thức gỡ lỗi chồng lấn, mẫu bố cục nghi vấn phải viết lại, quy tắc dấu `\` trong LaTeX | Có: chép ý vào checklist Manim |
| abm-dungtq/abm-video-bgdt | 1 | MIT | 2026-10-03 | **Rất sát EDUVN**: bài giảng tiếng Việt bằng HyperFrames + VieNeu; `scripts/align-words.py` (torchaudio **MMS_FA** + uroman, lùi về nội suy âm tiết); ngữ pháp cue `word:`/`kw:` ghim beat vào từ khoá (dung sai 1,2 s); `visible-check.mjs` (CDP, không thêm phụ thuộc: chữ phải hiện, trong khung, trên dải karaoke); `blank-check.mjs` (blackdetect vùng sân khấu); scorecard đa dạng (Jaccard giữa chương); `motion-craft.md` ("mỗi beat có thay đổi, không đứng yên > 2 s", camera 1,5–3 s `sine.inOut`, cấm elastic/bounce/hạt/glow); ≤15 % khung tự dựng | Có: học + có thể port script (MIT, ghi nguồn) |
| qnguyen3/STEMViz | 80 | PUND (chỉ dùng cá nhân) | 2025-10-04 | — | **Không** dùng |
| helblazer811/ManimML | 3 531 | MIT | 2024-06 (ngưng) | Lớp mạng nơ-ron, CNN, biến đổi cho Tin học/ĐH | Tham khảo |
| ManimCommunity/manim | 42 403 | MIT | 2026-11-09 | Engine | Đang dùng |
| ManimCommunity/manim-voiceover | 327 | MIT | 2026-06-15 | Ý tưởng `with self.voiceover(...)` + bookmark từ: đồng bộ hoạt cảnh theo từ. Ta làm bằng mốc cue của kế hoạch beat | Học ý |
| Matheart/manim-physics | 413 | MIT | 2026-10-15 | Con lắc, quang hình (thấu kính, tia), điện trường, sóng | Có (sau khi duyệt mã, ghim bản) |
| UnMolDeQuimica/manim-Chemistry | 96 | MIT | 2026-09-11 | Bảng tuần hoàn, phân tử 2D, orbital | Có (ghim bản) |
| jeertmans/manim-slides | 982 | MIT | 2026-11-09 | Không cần cho video | Bỏ qua |
| 3b1b/videos | 11 482 | riêng (không OSI) | 2026-11-10 | Chỉ học kỹ thuật (biến đổi liên tục, tô phần đang nói); không chép mã, phong cách hay nhận diện | Chỉ học |
| 3b1b/manim (ManimGL) | 96 339 | MIT | 2026-09-09 | Khác API với CE; không dùng | — |

### 3.2 Kho skill cho agent

| Repo | ★ | Giấy phép | Lấy gì |
|---|---|---|---|
| anthropics/skills | 192 452 | Apache-2.0 từng skill (`LICENSE.txt`) | `skill-creator` (vòng eval, `run_eval.py`, `improve_description.py` tối ưu mô tả cho kích hoạt, `quick_validate.py`); `theme-factory`, `algorithmic-art`, `canvas-design` (cách đóng gói chủ đề + mã mẫu) |
| agentskills.io (chuẩn) | — | mở | `name` ≤ 64 ký tự kebab trùng tên thư mục; `description` ≤ 1 024 ký tự; `metadata` là map chuỗi→chuỗi; thân SKILL.md < 5 000 token, < 500 dòng; `scripts/ references/ assets/`; tham chiếu sâu 1 tầng; `skills-ref validate` |
| heygen-com/hyperframes | 82 374 | Apache-2.0 | 448 mục registry + 7 skill (đã có trên máy) |
| greensock/gsap-skills | 18 255 | MIT | `gsap-core`, `gsap-timeline`, `gsap-plugins` (DrawSVG, MorphSVG, SplitText), `gsap-utils`, `gsap-performance`: đưa vào `references/` cho tác vụ viết bài |
| emilkowalski/skills | 55 873 | MIT | Quy chuẩn chuyển động (easing, thời lượng, "chuyển động phải có lý do"); mẫu review hoạt hình |
| ChromeGenesis/hyperframes-skills | 1 | MIT + giấy phép thượng nguồn từng thư mục | Gom 134 skill; đáng đọc: `motion-doctrine` ("cả video như một chuyển động camera liền": hướng ra quyết định hướng vào), `animation-vocabulary`, `find-animation-opportunities`, `frame-data-chart-nyt` |
| remotion-dev/claude-code-plugin | 82 | không ghi | `remotion-markup/{text-highlights,measuring-text,timing,transitions}.md`: chỉ học ý. **Remotion có giấy phép công ty riêng → EDUVN không dùng runtime Remotion** |
| csthink/dashmotion | 196 | MIT | Sơ đồ kỹ thuật động từ Mermaid → HTML/SVG tự chứa |
| ComposioHQ/awesome-claude-skills | 79 232 | không ghi | Danh mục; có skill D3 (chrisvoncsefalvay/claude-d3js-skill, không ghi giấy phép → chỉ đọc) |
| VoltAgent/awesome-agent-skills | 37 058 | MIT | Danh mục hơn 1 000 skill; liên quan: `greensock/*`, `remotion-dev/remotion`, `swiftlysingh/excalidraw-cli`, `muthuishere/hand-drawn-diagrams` |
| GarethManning/education-agent-skills | 973 | CC BY-SA 4.0 | Đã tham khảo ở P8; skill sư phạm, không phải hoạt hình |

### 3.3 Bản đồ, dòng thời gian, dữ liệu cho Sử/Địa

| Nguồn | ★ / GP | Lấy gì | Lưu ý |
|---|---|---|---|
| nvkelso/natural-earth-vector | 2 280 · public domain | Đường bờ, sông, hồ, biên giới; **có bản theo góc nhìn Việt Nam `ne_10m_admin_0_countries_vnm`** (đã thấy trong thư mục `geojson/`) | Biên mặc định của NE theo hiện trạng thực tế, không theo pháp lý. Bắt buộc dùng bản `_vnm`, và **phải kiểm bằng mắt rằng Hoàng Sa, Trường Sa được thể hiện là của Việt Nam** trước khi đưa vào kho |
| topojson/world-atlas | 1 239 · ISC | TopoJSON gọn từ NE | Chỉ dùng phần thế giới, phần VN thay bằng bản `_vnm` |
| d3/d3-geo | 1 116 · ISC | Phép chiếu, chạy ở máy chủ (Node) để tính sẵn path SVG | Lõi của `EK.map` |
| maplibre/maplibre-gl-js | 12 063 · BSD-3 | Bản đồ địa hình/vệ tinh (HF có adapter seek) | Cần ô bản đồ offline (PMTiles), font glyph cục bộ. Để đợt sau; bản đồ "giấy" dùng d3-geo + SVG |
| OpenHistoricalMap | dữ liệu CC0; `maplibre-gl-dates` 17★ CC0 | Lọc đối tượng theo ngày, biên giới lịch sử | Dữ liệu VN thưa; chỉ dùng khi có, còn lại vẽ bằng bộ địa danh ta tự kiểm |
| wmgeolab/geoBoundaries | 434 · chủ yếu CC BY 4.0 | ADM1 Việt Nam | Là bản **63 tỉnh**. Từ 1/7/2025 VN có **34 tỉnh/thành** → phải dựng lớp 34 tỉnh (từ OSM, ODbL, ghi nguồn) và giữ lớp 63 tỉnh cho bài Atlat cũ |
| NUKnightLab/TimelineJS3 | 3 232 · MPL-2.0 | **Mô hình dữ liệu** sự kiện (`start_date`, `end_date`, `headline`, `group`, `eras`) | Không dùng runtime (tương tác, không tua được) |
| NUKnightLab/StoryMapJS | 253 · MPL-2.0 | Mô hình "slide gắn toạ độ" cho diễn biến chiến dịch | Chỉ học mô hình |
| Thư viện vẽ khác | mermaid 91k MIT · excalidraw 135k MIT · rough 21k MIT · markmap 13k MIT · dagre MIT · vega-lite 5,5k BSD-3 · echarts 67k Apache · smilesDrawer 621 MIT · 3Dmol 1k BSD-3 · JSXGraph LGPL-3 · KaTeX 20k MIT · motion-canvas 19,7k MIT | dagre (bố cục sơ đồ nhân vật, quy trình), smilesDrawer (phân tử 2D từ SMILES), rough (nét tay), KaTeX (đã dùng) | Tránh JSXGraph (LGPL). Không dùng echarts/vega trong khung: tự vẽ SVG để đúng token và tua được |
| GSAP (greensock/GSAP) | 30 429 · "Standard No-Charge License" (Webflow) | Mọi plugin (DrawSVG, MorphSVG, SplitText) miễn phí cả thương mại | **Giấy phép có điều khoản cấm sản phẩm cạnh tranh "trình dựng hoạt hình trực quan" kiểu Webflow.** Studio của EDUVN là AI sinh video bài giảng, nhiều khả năng không thuộc diện này, nhưng cần chinhan đọc điều khoản. Phương án dự phòng là anime.js (MIT, HF có adapter); kit nên bọc API để đổi engine được |

### 3.4 Kỹ thuật chọn skill

| Nguồn | Phát hiện | Áp dụng |
|---|---|---|
| SkillRouter (arXiv 2603.22455) | Truy hồi + xếp hạng lại (1,2 tỷ tham số) trên ~80 nghìn skill, Hit@1 74 %. **Chỉ dùng tên + mô tả thì tụt 37–44 điểm**; thân skill là tín hiệu quyết định | Chỉ mục BM25 gồm cả thân skill. Thẻ gửi cho LLM bước 2 có "tóm tắt thân" ≤ 60 từ |
| Skill Retrieval Augmentation (arXiv 2604.24594) | So BM25, TF-IDF, BGE, Contriever, lai BM25+BGE: **LLM rerank trên top-50 BM25 mạnh nhất** | Bước 2 là LLM chọn trên ≤ 8 ứng viên |
| SkillSeek (arXiv 2609.38822) | Trên SkillsBench, BM25 thuần ngang hoặc hơn các cách có LLM trung gian | BM25 + luật là đủ cho bước 1; chưa cần embedding |
| IBM, đồ thị phụ thuộc skill | Đồ thị không hơn truy hồi lai tinh chỉnh tốt; lợi nhất là LLM xếp danh sách chỉ bằng tên + mô tả 1 dòng | Kho ~90 skill thì không cần đồ thị |
| agentskills.io: tiết lộ dần | Tầng 1 metadata ~100 token, tầng 2 thân < 5 000 token, tầng 3 tài nguyên khi cần | Bước 2 nhận tầng 1 + tóm tắt; tác vụ viết bài nhận tầng 2 của 1–3 skill đã chọn + tầng 3 (`examples/`) khi cần |

---

## 4. Định dạng một skill

### 4.1 Thư mục

```
anim-skills/
  index.json                      # sinh bằng scripts/build-anim-skills.mjs, CI kiểm
  chung/chuyen-canh-giu-vat/
  toan/bien-doi-dai-so/
  su/ban-do-chien-dich/
    SKILL.md                      # chuẩn agentskills + metadata EDUVN
    examples/
      vi-du-1/scene.json          # cảnh mẫu: môn, lớp, slideText, speech[{text,durationMs}]
      vi-du-1/plan.json           # kế hoạch beat vàng
      vi-du-1/index.html          # (hoặc scene.py) bài dựng vàng: qua lint + check
    checklist.json                # kiểm máy riêng của skill (bổ sung cho kiểm chung)
    thumb.png                     # 640×360, nội dung tự dựng trung tính
    evals/evals.json              # 5 cảnh: 3 nên chọn, 2 không nên chọn + tiêu chí chấm
    references/                   # tuỳ chọn: quy ước chuyên môn (vd quy ước biểu đồ Atlat)
```

### 4.2 `SKILL.md`

```markdown
---
name: ban-do-chien-dich
description: Bản đồ chiến dịch quân sự Việt Nam: nền giấy, địa danh từ bộ địa danh đã kiểm, mũi tên tiến công/rút lui vẽ dần theo từng giai đoạn lời giảng, tô vùng giải phóng. Dùng khi lời giảng kể diễn biến chiến dịch/trận đánh có ≥2 địa danh và mốc thời gian (Điện Biên Phủ, Hồ Chí Minh 1975, Bạch Đằng…). Campaign map, troop movement arrows, battle phases.
license: Proprietary (EDUVN)
metadata:
  engine: hf
  mon: su,dia
  lop: 6-12
  loai: ban-do,dien-bien,thoi-gian
  can: dia-danh>=2,moc-thoi-gian>=1
  thoiLuong: 12-45
  fallback: dong_thoi_gian
  kit: map,arrowPath,mark,focus,count
  version: "1"
  nguon: hf:us-map-flow,hf:hw-arrow,StoryMapJS(mô hình),NaturalEarth vnm
---
## Khi dùng / Không dùng
## Ý sư phạm: 3–6 beat mẫu (beat ↔ câu lời giảng)
## Dữ liệu phải lấy từ lời giảng (không bịa): địa danh (mã trong bộ địa danh), ngày, lực lượng, kết quả
## Bố cục: lưới 12 cột (bản đồ cột 1–8, thẻ diễn biến cột 9–12), dải phụ đề y ≥ 936
## Chuyển động: các lệnh EK được phép + thứ tự (nền → địa danh → mũi tên theo giai đoạn → tô vùng → kết luận)
## Ví dụ: examples/vi-du-1 (Điện Biên Phủ 3 đợt)
## Lỗi hay gặp: nhãn đè mũi tên; mũi tên không bám địa danh; quá 1 chuyển động camera
## Checklist (người + máy): xem checklist.json
```

- `description` song ngữ (tiếng Việt có dấu + vài từ khoá tiếng Anh) để vừa khớp BM25 tiếng Việt vừa tìm được trong `hyperframes catalog`.
- `metadata` chỉ chứa chuỗi (đúng chuẩn). Bộ chọn đọc `mon`, `lop`, `loai`, `can` (điều kiện dữ liệu tối thiểu), `engine`, `fallback`.

### 4.3 `checklist.json` (ví dụ)

```json
{
  "requires": [
    { "selector": "[data-ek-map]", "min": 1 },
    { "selector": "[data-ek-arrow]", "min": 1, "max": 8 }
  ],
  "motion": [
    { "kind": "before", "a": "[data-ek-map]", "b": "[data-ek-arrow]" },
    { "kind": "staysInFrame", "selector": "[data-ek-place]" }
  ],
  "limits": { "cameraMoves": 1, "labels": 14, "minFontPx": 36 },
  "data": { "placesFromGazetteer": true, "numbersFromSpeech": true }
}
```

`motion` được ghép với các assertion sinh từ kế hoạch beat thành `index.motion.json` (§6.2). `data.*` là kiểm chéo tất định: mọi số/địa danh trên màn phải xuất hiện trong lời giảng/slide hoặc trong bộ địa danh.

### 4.4 Thư viện thành phần được phép: `services/anim-kit/`

AI không viết hình học và không viết DOM bằng script. Nó viết **HTML khai báo** cùng **một khối script** chỉ gọi `EK.*` và GSAP trên `tl`.

| Phần | Nội dung |
|---|---|
| `kit.css` | Biến CSS sinh từ `tokens.json` (`--bg`, `--ink`, `--accent`, `--c-lam`…), lớp `.ek-title/.ek-eyebrow/.ek-label/.ek-card/.ek-note`, lưới `.ek-col-{1..12}`, dải phụ đề |
| `kit.js` (`window.EK`) | `enter/exit(tl, sel, t, {from})` · `draw(tl, sel, t, dur)` (DrawSVG) · `morph(tl, a, b, t)` (MorphSVG) · `count(tl, sel, a, b, t, dur, fmt:'vn')` · `mark(tl, sel, t, kind: highlight|underline|circle|box)` · `focus(tl, sel, t)` (làm mờ phần còn lại về `motion.dim`) · `camera(tl, t, dur, {x,y,scale})` (tối đa 1/cảnh) · `words(tl, sel, cues[])` (karaoke/thơ theo mốc từ) · `swap(tl, a, b, t)` (sai→đúng) · `follow(tl, sel, pathSel, t, dur)` (đi theo đường) · `rand(seed)` |
| Bộ tiền xử lý phía máy chủ (`preprocess.ts`) | Đổi thuộc tính `data-ek-*` thành SVG/HTML **trước khi** vào Chrome: `data-ek-plot="x^2-2" data-ek-domain="-3,3"` → path (qua `expr.ts`, không eval) · `data-ek-axis` · `data-ek-map="vn34|vn63|the-gioi|dong-nam-a" data-ek-highlight="…"` → path d3-geo · `data-ek-place="dien-bien-phu"` → toạ độ lấy từ `assets/geo/dia-danh.json` · `data-ek-arrow="from:…;via:…;to:…"` → đường cong mũi tên · `data-ek-graph` (nút/cạnh JSON) → dagre · `data-ek-tex="…"` → KaTeX HTML · `data-ek-smiles` → smilesDrawer SVG · `data-ek-chart="cot|duong|cot-duong|thap|tron|nhiet-am"` + `data-ek-values` → SVG đúng tỉ lệ |
| `vendor/` | gsap 3.15 (+ DrawSVG, MorphSVG, SplitText), katex (css + font), các font tự host. Mọi thứ cục bộ, không còn jsDelivr |
| `assets/geo/` | `vn34.topo.json`, `vn63.topo.json`, `ne_vnm_admin0.topo.json`, `song-ho.topo.json`, `dia-danh.json` (≈ 500 địa danh lịch sử/địa lý: `id`, `ten`, `lat`, `lon`, `loai`, `nguon`) do người kiểm |

Lợi ích: AI không thể làm sai tỉ lệ biểu đồ hay toạ độ, mọi phép tính đều tất định và cache được, và bài dựng ngắn nên ít lỗi.

---

## 5. Danh mục skill (87 skill)

Cột "Nguồn" ghi tham khảo ý tưởng hoặc mã: `hf:` là mục registry HyperFrames (Apache-2.0, viết lại theo token), `cũ:` là khuôn EDUVN hiện có (cũng là đường lùi), `abm:` là template trong abm-video-bgdt (MIT). Engine: HF = HyperFrames, M = Manim. **Đợt 1** (★) gồm 20 skill làm trước.

### 5.1 Chung (18)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| ★ `tieu-de-mo-dau` | Tên bài + môn/lớp + GV, chữ hiện theo từ, đường kẻ vẽ ra | HF | 1–13 | hf:titlecard-calm, hf:per-word-rise |
| ★ `the-chuong` | Thẻ chương, số chương "02 / 05", giữ vật nối sang cảnh sau | HF | 1–13 | hf:titlecard-lockup, hf:text-match-cut |
| ★ `the-ket-tom-tat` | 3 ý chính hiện dần + 1 câu hỏi nhanh | HF | 1–13 | hf:mk-specs-list, abm:card-quiz |
| ★ `chuyen-canh-giu-vat` | Phần tử chung trượt/biến hình từ cảnh trước sang cảnh sau (match-move) | HF | 1–13 | hf:match-cut, hf:modal-morph, motion-doctrine |
| ★ `nhan-manh-tu-khoa` | Tô dạ quang, gạch chân, khoanh tay theo từ khoá đúng lúc được đọc | HF | 1–13 | hf:marker-highlight, hf:hw-underline, hf:vox-annotate |
| `phu-de-karaoke` | Dải phụ đề, tô từ đang đọc (khi bật ở video xuất) | HF | 1–13 | hf:caption-pill-karaoke, abm karaoke |
| ★ `so-sanh-hai-cot` | Hai cột, tiêu chí lần lượt, tô điểm khác | HF | 3–13 | hf:split-tilt-cards, cũ:so_sanh_bang |
| ★ `quy-trinh-buoc` | Hộp nối mũi tên vẽ dần, tô bước đang nói | HF | 1–13 | hf:flowchart, hf:hw-pipeline, cũ:so_do_quy_trinh |
| `dien-giai-tung-buoc` | Từng dòng lập luận/công thức, dòng cũ mờ đi | HF | 1–13 | cũ:dien_giai_tung_buoc |
| `the-dinh-nghia` | Thuật ngữ + định nghĩa + ví dụ, tô từ khoá | HF | 1–13 | cũ:the_ghi_nho |
| `so-lieu-dem` | Số lớn đếm lên + thanh tiến độ + chú thích nguồn | HF | 3–13 | hf:count-up, hf:mk-progress-stat |
| ★ `bieu-do-cot-duong` | Cột mọc / đường vẽ theo dữ liệu lời giảng, nhãn bám điểm | HF | 3–13 | hf:data-chart, hf:chart-story, cũ:bieu_do_so_lieu |
| `so-do-venn` | Vòng tròn, tô vùng giao, đếm phần tử | HF | 3–13 | cũ:so_do_venn |
| `so-do-tu-duy` | Gốc → nhánh mọc dần theo lời | HF | 3–13 | markmap (ý), hf:constellation-hub |
| `sai-dung` | Câu sai bị gạch → câu đúng thay vào | HF | 3–13 | hf:strikethrough-replace, abm:myth-fact |
| `cau-hoi-nhanh` | Câu hỏi + 4 phương án, tự co/2 cột, mở đáp án | HF | 1–13 | abm:card-quiz, quiz P5b |
| `camera-ke-chuyen` | Một khung lớn, camera lia chậm qua 3–5 trạm (1 chuyển động) | HF | 3–13 | hf:pan-stations, hf:pull-back-reveal |
| `bang-ma-tran` | Bảng hiện theo hàng/cột, tô ô đang nói | HF | 3–13 | cũ:so_sanh_bang |

### 5.2 Toán (16)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| ★ `do-thi-ham-so` | Hệ trục vẽ ra, đường cong vẽ theo x, điểm đặc biệt gắn nhãn | HF/M | 7–13 | cũ:do_thi_ham_so, hf:mk-line-graph |
| `bien-hinh-do-thi` | Đồ thị gốc → tịnh tiến/co giãn/đối xứng (morph liên tục) | M | 9–12 | 3b1b (kỹ thuật), Manim `Transform` |
| ★ `bien-doi-dai-so` | Biến đổi đẳng thức, ký hiệu trượt đúng chỗ, tô cặp khớp | M | 7–13 | cũ:bien_doi_cong_thuc, `TransformMatchingTex` |
| `vong-tron-luong-giac` | Điểm chạy trên vòng tròn, chiếu sin/cos, nối sang đồ thị | M | 9–12 | cũ:vong_tron_luong_giac |
| `dung-hinh-thuoc-compa` | Từng bước dựng hình, compa quay, nét vẽ ra | HF | 6–10 | hf:svg-stroke-trace, hf:whiteboard-ink |
| `chung-minh-hinh-hoc` | Tô các góc/cạnh bằng nhau cùng màu, tam giác đồng dạng chồng khớp | M | 7–10 | Code2Video (neo lưới), cũ:phep_bien_hinh |
| `dien-tich-cat-ghep` | Cắt hình, ghép lại chứng minh (Pythagore, hình thang) | M | 6–9 | cũ:hinh_hoc_dien_tich |
| `truc-so-bat-phuong-trinh` | Trục số, khoảng nghiệm tô dần, đầu mút mở/đóng | HF/M | 6–10 | cũ:truc_so |
| `giao-diem-he-phuong-trinh` | Hai đường vẽ ra, giao điểm nhấp nháy 1 lần, toạ độ | M | 8–12 | cũ:giao_diem_he_pt |
| `dao-ham-tiep-tuyen` | Cát tuyến → tiếp tuyến khi h → 0, số đếm hệ số góc | M | 11–13 | cũ:dao_ham_tiep_tuyen |
| `tich-phan-rieman` | Tổng Riemann, số hình chữ nhật tăng, diện tích hội tụ | M | 12–13 | cũ:tich_phan_dien_tich |
| `day-so-gioi-han` | Các số hạng hiện trên trục, tiến dần tới giới hạn | M | 11–13 | cũ:day_so |
| ★ `xac-suat-cay` | Cây nhánh vẽ dần, nhân xác suất dọc nhánh | HF | 9–12 | cũ:cay_xac_suat |
| `xac-suat-dieu-kien` | B thành "không gian mẫu mới", mờ phần ngoài B, công thức có số | HF | 10–12 | góp ý chinhan về so_do_venn |
| `thong-ke-bieu-do` | Tần số → histogram, trung vị/tứ phân vị, biểu đồ hộp | HF | 7–12 | hf:data-chart |
| `hinh-khong-gian` | Khối 3D xoay chậm, mặt cắt, thể tích | M | 8–12 | cũ:hinh_khong_gian_xoay |

### 5.3 Vật lý (9)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| `chuyen-dong-do-thi` | Vật chạy, đồ thị s–t / v–t vẽ đồng thời | M | 8–12 | cũ:chuyen_dong_thang |
| `phan-tich-luc` | Sơ đồ lực tự do, hợp lực quy tắc hình bình hành | M | 8–10 | cũ:tong_hop_luc |
| `dao-dong-con-lac` | Con lắc/lò xo + đồ thị li độ theo thời gian | M | 11–12 | cũ:dao_dong_dieu_hoa, manim-physics |
| `song-giao-thoa` | Hai nguồn, vân giao thoa, bước sóng | M | 11–12 | cũ:song_co, manim-physics |
| `quang-hinh-tia` | Tia tới, khúc xạ, thấu kính, ảnh | M | 9–11 | manim-physics (lenses/rays) |
| `mach-dien-dong` | Mạch điện, chấm dòng điện chạy, đồng hồ đo đếm | HF | 7–11 | hf:arc-motion-path |
| `duong-suc-dien-tu` | Đường sức điện/từ vẽ ra quanh điện tích/nam châm | M | 11–12 | manim-physics (fields) |
| `nhiet-dong-pittong` | Pittông, hạt khí, áp suất–thể tích | HF | 8–12 | hf:pendulum-swing (ý), d3 hạt có hạt giống |
| `nem-xien-quy-dao` | Quỹ đạo parabol, phân tích vận tốc từng điểm | M | 10 | Manim `TracedPath` |

### 5.4 Hoá học (6)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| ★ `can-bang-phuong-trinh` | Đếm nguyên tử hai vế, hệ số đổi dần tới cân bằng | HF | 8–12 | cũ:can_bang_phuong_trinh_hoa_hoc |
| `cau-hinh-electron` | Ô orbital điền dần theo nguyên lý vững bền | HF | 10 | hf:locked-nucleus-orbit, manim-Chemistry |
| `cau-truc-phan-tu` | Công thức cấu tạo 2D từ SMILES, tô nhóm chức | HF | 9–12 | smilesDrawer (MIT) |
| `phan-ung-va-cham` | Hạt va chạm, tốc độ phản ứng theo nhiệt độ/nồng độ | HF | 10–11 | d3 (hạt có hạt giống) |
| `bang-tuan-hoan-xu-huong` | Bảng tuần hoàn tô màu theo tính chất, mũi tên xu hướng | HF | 10 | manim-Chemistry (dữ liệu), hf:spain-map (choropleth) |
| `chuan-do-ph` | Đường cong chuẩn độ, điểm tương đương, đổi màu chỉ thị | HF | 11–12 | hf:mk-line-graph |

### 5.5 Sinh học (6)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| `chu-trinh-sinh-hoc` | Vòng tuần hoàn (Krebs, nitơ, nước), chấm chạy quanh vòng | HF | 6–12 | hf:constellation-hub |
| `phan-bao` | Các kỳ nguyên phân/giảm phân biến hình liên tục | HF | 9–12 | hf:morph-swap (MorphSVG) |
| `di-truyen-punnett` | Bảng Punnett điền dần, tỉ lệ kiểu hình đếm | HF | 9–12 | cũ:so_sanh_bang |
| `luoi-thuc-an` | Chuỗi/lưới thức ăn, tháp năng lượng | HF | 7–12 | hf:flowchart, dagre |
| `cau-tao-te-bao` | Hình nét có nhãn + đường dẫn, phóng 1 bào quan (1 camera) | HF | 6–10 | hf:hw-box-label, hf:push-in |
| `phien-ma-dich-ma` | Chuỗi nucleotide → mARN → axit amin (dải ký tự trượt) | HF | 9–12 | hf:code-typing (ý), hf:text-match-cut |

### 5.6 Tin học (5)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| `thuat-toan-sap-xep` | Mảng cột, so sánh và đổi chỗ từng bước, đếm bước | HF | 6–13 | hf:bar-chart-race (ý) |
| `duyet-do-thi` | BFS/DFS trên đồ thị, hàng đợi/ngăn xếp bên cạnh | HF | 10–13 | dagre, hf:constellation-hub |
| `code-tung-dong` | Mã nguồn, tô dòng đang chạy, bảng biến bên cạnh | HF | 6–13 | hf:code-highlight, hf:code-typing |
| `cau-truc-du-lieu` | Ngăn xếp/hàng đợi/danh sách liên kết thêm-bớt | HF | 10–13 | hf:stagger-cascade |
| `he-nhi-phan` | Chia 2 lấy dư, bit lật, mã hoá ký tự | HF | 6–11 | hf:number-wheel |

### 5.7 Ngữ văn (7)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| ★ `tho-chu-dong-ngam` | Câu thơ hiện theo từng chữ khớp **giọng ngâm** (mốc từ MMS_FA), tô vần/nhịp | HF | 1–12 | hf:per-word-crossfade, abm align-words |
| ★ `bien-phap-tu-tu` | Tô biện pháp tu từ (so sánh, ẩn dụ, hoán dụ, nhân hoá, điệp…), mũi tên nối vế, nhãn tên biện pháp | HF | 6–12 | hf:vox-annotate, hf:hw-callout-circle |
| ★ `so-do-nhan-vat` | Nhân vật là nút, quan hệ là cạnh có nhãn, mọc dần theo cốt truyện | HF | 6–12 | dagre, hf:constellation-hub |
| `cau-truc-van-ban` | Bố cục/đồ thị cốt truyện (mở đầu → cao trào → kết) | HF | 6–12 | hf:mk-line-graph (ý) |
| `trich-dan-phan-tich` | Trích dẫn lớn, từ được phân tích nổi lên + chú thích | HF | 6–12 | cũ:trich_dan_van_ban |
| `luan-diem-lap-luan` | Sơ đồ luận đề → luận điểm → luận cứ | HF | 8–12 | hf:flowchart-vertical |
| `tac-gia-thoi-ky` | Dòng thời gian tác giả/giai đoạn văn học + tác phẩm | HF | 6–12 | cũ:dong_thoi_gian |

### 5.8 Lịch sử (6)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| ★ `ban-do-chien-dich` | Bản đồ giấy, địa danh, mũi tên tiến công theo giai đoạn, tô vùng giải phóng | HF | 6–12 | hf:us-map-flow, hf:hw-arrow, StoryMapJS (mô hình), NE vnm |
| ★ `dong-thoi-gian-su-kien` | Trục năm tỉ lệ thật, thời kỳ (era) tô dải, sự kiện bật theo lời | HF | 4–12 | TimelineJS (mô hình dữ liệu), cũ:dong_thoi_gian, hf:beat-timeline |
| `nguyen-nhan-ket-qua` | Sơ đồ nguyên nhân → diễn biến → kết quả → ý nghĩa | HF | 6–12 | hf:flowchart |
| `bien-doi-lanh-tho` | Lãnh thổ/biên giới đổi theo năm (choropleth morph theo mốc) | HF | 6–12 | OHM (khi có dữ liệu), hf:world-map |
| `so-sanh-thoi-ky` | Hai thời kỳ/cuộc kháng chiến so sánh theo tiêu chí | HF | 8–12 | hf:split-tilt-cards |
| `chan-dung-nhan-vat` | Thẻ nhân vật + mốc đời + câu nói (ảnh công cộng nếu có) | HF | 4–12 | hf:titlecard-calm |

### 5.9 Địa lý (9)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| ★ `bieu-do-nhiet-am` | Biểu đồ nhiệt-ẩm kiểu Atlat: cột mưa 12 tháng + đường nhiệt hai trục, tô mùa mưa/khô | HF | 6–12 | hf:data-chart, quy ước Atlat (`references/`) |
| ★ `thap-dan-so` | Tháp dân số theo nhóm tuổi, biến hình giữa các năm | HF | 8–12 | hf:chart-story |
| ★ `ban-do-chu-de` | Choropleth 34 tỉnh (hoặc 63 tỉnh, theo Atlat), chú giải dạng nhãn trên vùng | HF | 6–12 | hf:spain-map, hf:us-map, NE vnm + OSM |
| `ban-do-luong` | Luồng di cư/thương mại/vận tải, độ dày theo giá trị | HF | 9–12 | hf:us-map-flow |
| `bieu-do-co-cau` | Cơ cấu (tròn/miền/cột 100 %) đổi giữa các năm | HF | 8–12 | hf:chart-story |
| `vong-tuan-hoan-tu-nhien` | Vòng tuần hoàn nước/khí, mũi tên chạy | HF | 6–10 | chung với `chu-trinh-sinh-hoc` |
| `mat-cat-dia-hinh` | Lát cắt độ cao A–B, đường dốc vẽ ra, gắn tên đỉnh | HF | 6–12 | hf:mk-line-graph |
| `gio-mua-khi-hau` | Gió mùa Đông Bắc/Tây Nam: mũi tên theo mùa trên bản đồ | HF | 6–12 | hf:us-map-flow, hf:arc-motion-path |
| `trai-dat-chuyen-dong` | Trái Đất tự quay/quay quanh Mặt Trời, ngày–đêm, mùa | M | 6–10 | Manim `ThreeDScene` |

### 5.10 Tiếng Anh (5)

| id | Hoạt cảnh chính | Engine | Lớp | Nguồn |
|---|---|---|---|---|
| `the-tu-vung` | Từ + IPA + nghĩa + câu ví dụ, tô trọng âm | HF | 1–13 | cũ:tu_vung |
| `cau-truc-ngu-phap` | Khối S–V–O màu theo vai, biến đổi chủ động → bị động | HF | 6–12 | hf:text-match-cut, hf:kinetic-type-swap |
| `thi-dong-thoi-gian` | Trục thời gian của các thì, mốc "now", khoảng kéo dài | HF | 6–12 | hf:beat-timeline |
| `hoi-thoai` | Bóng thoại xen kẽ khớp lời | HF | 3–12 | abm:dialogue, hf:hw-text-cloud |
| `nhan-tro-am` | Trọng âm/nối âm: âm tiết nhô lên theo nhịp đọc | HF | 6–12 | hf:weight-wave |

Tổng 18 + 16 + 9 + 6 + 6 + 5 + 7 + 6 + 9 + 5 = **87 skill**. Đợt 1 có 20 skill (★): 15 HF thuần, `do-thi-ham-so` chạy HF trước, và 1 Manim (`bien-doi-dai-so`) để sẵn cho đợt 2.

---

## 6. QA và hộp cát

### 6.1 Lint tĩnh cho bài HyperFrames do AI viết (`lintHf`)

Phân tích bằng `parse5` (HTML) và `acorn` (JS), trả `Finding[]` tiếng Việt có dòng "Sửa:".

| Nhóm | Luật |
|---|---|
| Mạng / tải ngoài | Mọi `src`, `href`, `url()`, `@import`, `srcset`, `poster` chỉ được là `assets/…`. Không có `<script src>` (máy chủ tự chèn kit). Không `<iframe>`, `<object>`, `<embed>`, `<link rel=preload>`, `<meta http-equiv>`, `<base>` |
| JS bị cấm (AST) | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator`, `Worker`, `importScripts`, `import()`, `eval`, `Function`, `setTimeout/Interval`, `requestAnimationFrame`, `Date`, `performance.now`, `Math.random` (dùng `EK.rand(seed)`), `localStorage`, `document.cookie`, `window.open`, `location`, `postMessage`, gán `innerHTML/outerHTML`, `createElement`, `__proto__`, `constructor`, `with`, chỉ số động trên `window`/`document`. Chỉ được dùng các biến toàn cục `gsap`, `EK`, `tl`, `document.querySelector(All)` |
| Hợp đồng HF | Gốc có `data-composition-id/start/duration/width=1920/height=1080`; `data-duration` = thời lượng kế hoạch ±0,05 s; mọi phần tử định thời có `class="clip"` + id duy nhất; một timeline `paused`, đăng ký `window.__timelines`; không `repeat:-1`; không tween `display/visibility/autoAlpha` trên `.clip`; không tween `left/top/width/height` |
| Phong cách | Màu chỉ qua `var(--…)` của token (cấm hex/rgb/hsl literal trong mã AI); font chỉ Inter / Source Serif 4 / KaTeX; `font-size` ≥ 36 px; ease nằm trong danh sách `tokens.motion.ease` (cấm `elastic`, `bounce`, `rough`); `EK.camera` ≤ 1 lần; không lặp phóng to/thu nhỏ |
| Kích thước | HTML ≤ 60 KB; ≤ 400 phần tử; ≤ 40 clip; ≤ 300 tween; mỗi `data-ek-*` ≤ 4 KB; thời lượng 3–60 s |
| Dữ liệu | Mọi số hiển thị phải có trong `slideText`/`speech` (chuẩn hoá dấu phẩy thập phân); `data-ek-place` chỉ được dùng id có trong `dia-danh.json`; nhãn ≤ 60 ký tự |

### 6.2 QA khung tự động (`qaHf`), chạy trước khi dựng MP4

1. **Tiền xử lý → dự án tạm**: `index.html` + `assets/` (kit, vendor, font, geo).
2. **Sinh `index.motion.json` từ kế hoạch beat**: mỗi beat `appearsBy(sel, t0 + 0,6)`, hai beat liền nhau `before(a, b)`, `staysInFrame` cho mọi nhãn, `keepsMoving{maxStaticSec: 4}`, rồi gộp `checklist.json → motion` của skill.
3. **`hyperframes check --json --samples 15 --at-transitions --caption-zone "x0=0;y0=0.8667;x1=1;y1=1;severity=error"`** (0,8667 = `ruleY 936 / 1080`). Cổng này đã bao gồm:
   - nhãn đè (`content_overlap` kéo dài), chữ tràn/bị cắt, ra ngoài khung, `connector_detached`;
   - tương phản WCAG AA (lỗi chặn, có `suggestedColor`);
   - `dead_stretch` (> 3 s là cảnh báo; ta nâng thành lỗi khi > 4 s qua `keepsMoving`), `sweep_static`, `text_below_floor`, `first_frame_empty`;
   - lỗi JS/mạng runtime (mọi request thất bại là lỗi vì hộp cát đã cắt mạng).
4. **Kiểm thêm của EDUVN** (một script CDP nhỏ chạy cùng Chrome của HF, như `visible-check.mjs` của abm):
   - **Đúng màu token**: ở 15 mẫu, lấy `color/fill/stroke/background-color` đã tính của phần tử hiện (opacity > 0,05); mỗi màu phải gần một màu token (ΔE2000 ≤ 3, có xét alpha của `fillAlpha/markAlpha`), nếu không thì lỗi `mau_ngoai_token`.
   - **Rớt chữ lẻ**: dòng cuối của khối chữ chỉ có 1 từ (đo bằng `Range.getClientRects()`) → lỗi `rot_chu_le`.
   - **Nhãn xa vật**: phần tử `[data-ek-for]` cách vật nó gắn > 120 px mà không có đường dẫn → lỗi.
   - **Beat khớp lời**: thời điểm hiện thực tế của phần tử beat (opacity ≥ 0,5) lệch cue > 0,8 s → lỗi.
5. **Dựng MP4** (1080p/30, `--quality looks`) chỉ khi bước 3–4 không còn lỗi. Sau đó `ffprobe` thời lượng, rồi `blackdetect` vùng sân khấu (y 150–900) để bắt đoạn chỉ còn nền.

### 6.3 Hộp cát Chrome (dựng HF)

Điều kiện tiên quyết, làm một lần bằng root:

```bash
sudo tee /etc/apparmor.d/bwrap >/dev/null <<'EOF'
abi <abi/4.0>,
include <tunables/global>
profile bwrap /usr/bin/bwrap flags=(unconfined) {
  userns,
  include if exists <local/bwrap>
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/bwrap
```

Lệnh chạy (`server/src/services/animStudio/sandbox.ts` dựng mảng tham số):

```bash
systemd-run --user --scope -q \
  -p MemoryMax=2G -p MemorySwapMax=0 -p CPUQuota=200% -p TasksMax=256 -p RuntimeMaxSec=600 \
  bwrap --unshare-all --die-with-parent --new-session \
    --ro-bind /usr /usr --ro-bind /lib /lib --ro-bind /lib64 /lib64 --ro-bind /bin /bin \
    --ro-bind /etc/fonts /etc/fonts --ro-bind /etc/ssl /etc/ssl \
    --ro-bind "$SERVER_NODE_MODULES" "$SERVER_NODE_MODULES" \
    --ro-bind "$HOME/.cache/hyperframes" "$HOME/.cache/hyperframes" \
    --bind "$WORK" "$WORK" --tmpfs /tmp --proc /proc --dev /dev \
    --setenv HOME "$WORK" --chdir "$WORK" \
    "$SERVER_NODE_MODULES/.bin/hyperframes" render "$WORK/proj" --output "$WORK/out.mp4" --fps 30 --quality looks --workers 2 --quiet
```

- `--unshare-all` cắt cả mạng; bwrap tự bật `lo`, nên máy chủ file cục bộ của HF vẫn chạy được.
- `hyperframes` **ghim vào `server/package.json`** (bỏ `npx --yes`). Chrome lấy từ `~/.cache/hyperframes` và chỉ được bind đọc.
- Lệnh `check` dùng cùng vỏ bọc này.
- `sandbox doctor` chạy lúc khởi động server và trong CI gồm 3 bước: (a) `curl https://example.com` bên trong vỏ phải **thất bại**; (b) ghi ra ngoài `$WORK` phải thất bại; (c) dựng một bài 2 s phải thành công. Có bước nào không đạt thì đặt `ANIM_STUDIO_MODE=khuon` (chỉ khuôn cũ) và ghi cảnh báo vào log.

### 6.4 Hộp cát Manim (đợt 2)

**Lint AST** (`services/manim/sandbox/lint.py`, chạy bằng `python -I`):

- Import chỉ được nằm trong `allowed.json`: `from manim import *`, `from eduvn_studio import *` (tức `studio.py` của tham-my), `import numpy as np`, `import math`. `manim_physics` và `manim_chemistry` chỉ được dùng khi đã ghim bản và đã duyệt.
- Cấm: `open`, `exec`, `eval`, `compile`, `__import__`, `globals`, `locals`, `vars`, `getattr`, `setattr`, `delattr`, `input`, `breakpoint`; mọi thuộc tính bắt đầu bằng `__`; các tên `os`, `sys`, `subprocess`, `socket`, `shutil`, `pathlib`, `importlib`, `ctypes`, `pickle`, `marshal`, `threading`, `multiprocessing`, `urllib`, `http`, `requests`; gán `config.*`; `SVGMobject`/`ImageMobject` với đường dẫn ngoài `assets/`; `self.renderer`; `while True`.
- Đúng một lớp kế thừa `StudioScene`, chỉ có `construct`; mã ≤ 30 KB.

**Runtime** (`runner.py`):

- Nạp `manim`, `numpy` và các module con hay dùng **trước**, rồi mới cài `sys.addaudithook`. Hook từ chối các sự kiện `socket.*`, `subprocess.Popen`, `os.system`, `os.exec*`, `os.posix_spawn`, `ctypes.dlopen`, `open` để ghi ra ngoài `/work`, và `import` có tên ngoài danh sách tiền tố cho phép (`manim.`, `numpy.`, `PIL.`, `cairo`, `manimpango`, `eduvn_studio`, `_*` của stdlib đã nạp).
- Kiểm tổng `run_time + wait` bằng thời lượng kế hoạch ±0,3 s.

**Vỏ chạy**:

```bash
systemd-run --user --scope -q -p MemoryMax=1500M -p MemorySwapMax=0 -p CPUQuota=100% -p TasksMax=64 -p RuntimeMaxSec=240 \
  bwrap --unshare-all --die-with-parent --new-session \
    --ro-bind /usr /usr --ro-bind /lib /lib --ro-bind /lib64 /lib64 --ro-bind /bin /bin --ro-bind /etc/fonts /etc/fonts \
    --ro-bind "$HOME/Apps/manim" "$HOME/Apps/manim" --ro-bind "$HOME/Apps/tinytex" "$HOME/Apps/tinytex" \
    --ro-bind "$REPO/services/manim" /opt/eduvn --ro-bind "$REPO/services/video-theme/fonts" /opt/fonts \
    --bind "$WORK" /work --tmpfs /tmp --proc /proc --dev /dev \
    --clearenv --setenv HOME /work --setenv PYTHONPATH /opt/eduvn \
    --setenv PATH "$HOME/Apps/tinytex/bin/x86_64-linux:$HOME/Apps/manim/bin:/usr/bin" \
    --setenv EDUVN_SPEC /work/spec.json --chdir /work \
    "$HOME/Apps/manim/bin/python" -I -B /opt/eduvn/sandbox/runner.py /work/scene.py --quality l
```

- venv được bind **đúng đường dẫn gốc**, vì `pyvenv.cfg` và shebang ghi đường dẫn tuyệt đối.
- `prlimit --fsize=300M --nofile=256` bọc bên trong.

**QA Manim bằng khung bao thật**: `StudioScene` (bản QA) ghi lại sau mỗi `play/wait` mọi `Text/MathTex/Tex/VMobject có nhãn`: bbox (`get_corner`), opacity, màu → `boxes.jsonl`. Từ dữ liệu này, kiểm tất định:

- chồng lấn chữ–chữ > 2 % diện tích → lỗi;
- ra ngoài vùng an toàn (lề 120 px quy đổi) hoặc vào dải phụ đề → lỗi;
- khoảng giữa hai `play` có thay đổi > 4 s → lỗi;
- màu ngoài token → lỗi;
- tương phản màu so với nền `#FDFCF9` < 4,5 (chữ thường) / 3 (chữ lớn) → lỗi;
- cỡ chữ quy đổi < 36 px → lỗi.

Lượt QA chạy ở 480p/15 fps. Qua thì dựng 1080p/30. Critic VLM (kiểu Code2Video/TEA) chỉ để chấm thẩm mỹ, ghi điểm vào log, **không** làm cổng chặn.

### 6.5 Sửa và lùi

- **Tối đa 2 lượt sửa mỗi cảnh**, tính chung cho lỗi lint, lỗi `check` và lỗi dựng.
- Mỗi lượt gửi AI: mã hiện tại, danh sách lỗi đã rút gọn (mã lỗi, selector/dòng, bbox, giá trị đo, `suggestedColor`, dòng "Sửa:"), kế hoạch beat. AI không thấy lại các lỗi đã sửa xong.
- Theo ScopeRefine: nếu mọi lỗi nằm trong ≤ 2 phần tử thì yêu cầu AI chỉ trả **bản vá khối** (id → HTML/tween mới), sau đó mới tới viết lại cả bài.
- Sau 2 lượt vẫn lỗi → **lùi về khuôn cũ**: lấy `metadata.fallback` của skill chính, gọi task `hoat_hinh_toan` với đúng 1 mẫu đó (luồng P5b hiện có). Không có khuôn phù hợp hoặc khuôn cũng hỏng → cảnh giữ slide và GV thấy nhãn "Chưa dựng được hoạt hình (lý do…)".

---

## 7. System one chọn skill

### 7.1 Bước 1: lọc tất định (`server/src/domain/animRouter.ts`, hàm thuần, không I/O)

**Đầu vào**: `SceneInfo {subject, grade, title, slideText, speech[{text,durationMs}]}` cùng `index.json` của kho.

**Đặc trưng nội dung** (regex/từ điển trên chữ đã bỏ dấu, kết quả lưu để giải thích):

| Đặc trưng | Dấu hiệu |
|---|---|
| `cong-thuc` | `$…$`, `=`, `^`, `\frac`, "biến đổi", "rút gọn" |
| `ham-so` | `y =`, `f(x)`, "đồ thị", "parabol" |
| `so-lieu` | ≥ 3 số + đơn vị/% hoặc chuỗi năm; `nhiet-am` = 12 tháng + (°C, mm) |
| `thoi-gian` | ≥ 2 năm (`1[0-9]{3}`, `20[0-9]{2}`) hoặc "thế kỷ", "giai đoạn" |
| `dia-danh` | trúng `dia-danh.json` (≥ 2 cho bản đồ) hoặc tên 34/63 tỉnh, sông, nước |
| `dien-bien` | "chiến dịch", "trận", "tiến công", "đợt", "bao vây", "rút lui" |
| `tho` | dòng 4–8 âm tiết lặp ≥ 4 dòng, "câu thơ", "khổ", "lục bát" |
| `tu-tu` | "so sánh", "ẩn dụ", "hoán dụ", "nhân hoá", "điệp", "nói quá" |
| `nhan-vat` | ≥ 3 tên riêng + quan hệ ("cha", "vợ", "bạn", "kẻ thù") |
| `quy-trinh` | "bước", "đầu tiên", "sau đó", "cuối cùng", liệt kê có thứ tự |
| `so-sanh` | "so sánh", "khác nhau", "giống nhau", "ưu/nhược" |
| `nhan-qua` | "nguyên nhân", "dẫn đến", "kết quả", "ý nghĩa" |
| `code` | khối code, từ khoá ngôn ngữ (`for`, `if`, `def`, `print`) |
| `phuong-trinh-hoa` | `→` cùng công thức hoá học (`H2O`, `NaCl`) |

**Điểm** (từng skill `s`):

```
loại cứng:  engine bị tắt (Manim chưa bật) | môn ∉ s.mon và "*" ∉ s.mon | lớp ngoài [lop0−1, lop1+1]
            | điều kiện s.can không đạt (vd dia-danh>=2) | s bị org tắt
điểm = 3·bm25n(q, s)                       // BM25 chuẩn hoá về [0,1] theo max của lượt
     + 2·|loai(s) ∩ dacTrung(q)|           // trần +6
     + (môn khớp đúng ? 2 : môn "*" ? 0,5 : 0)
     − 3·[trúng từ khoá "không dùng khi"]
     + 1,5·(prior(s, môn, khối) − 0,5)     // phản hồi GV, §7.3
```

- `q` = tiêu đề ×2 + slideText + lời giảng.
- Chỉ mục BM25 cho mỗi skill gồm `description` + "Khi dùng" + **thân SKILL.md** + từ khoá mở rộng.
- Lấy top 8, mỗi nhóm "chung" tối đa 3 slot. Luôn đính kèm `chuyen-canh-giu-vat` nếu cảnh trước có hoạt hình (ứng viên phụ, không tính vào 8).

**Ngưỡng**: không skill nào đạt `điểm ≥ 3,0` **và** `|đặc trưng| = 0` → trả rỗng, không gọi AI, cảnh giữ slide, giống hành vi P5b.

### 7.2 Bước 2: AI chọn 1–3 skill và lập kế hoạch beat (task `hoat_hinh_ke_hoach`)

**Đầu vào gửi AI**: ≤ 8 thẻ ứng viên, mỗi thẻ ≈ 120 token gồm id, tên, mô tả, khi dùng/không dùng, `can`, và **tóm tắt thân ≤ 60 từ** (sinh sẵn trong `index.json`); các câu lời giảng có `t0/t1` (giây, cộng dồn `durationMs`) và số thứ tự; slideText; tổng thời lượng.

**Đầu ra** (zod `AnimPlan`):

```json
{
  "skills": [{ "id": "ban-do-chien-dich", "vaiTro": "chinh" }, { "id": "nhan-manh-tu-khoa", "vaiTro": "phu" }],
  "confidence": 0.82,
  "lyDo": "Lời giảng kể 3 đợt tiến công với 4 địa danh và mốc ngày.",
  "beats": [
    { "i": 0, "t0": 0.0, "t1": 6.4, "cau": [0], "cue": "kw:Điện Biên Phủ", "viec": "hiện bản đồ Tây Bắc, đặt địa danh", "skill": "ban-do-chien-dich", "duLieu": { "places": ["dien-bien-phu", "muong-thanh"] } },
    { "i": 1, "t0": 6.4, "t1": 15.2, "cau": [1, 2], "cue": "kw:đợt 1", "viec": "mũi tên đợt 1 vào Him Lam, Độc Lập", "skill": "ban-do-chien-dich", "duLieu": { "arrows": [{ "from": "tuan-giao", "to": "him-lam" }] } }
  ],
  "khongCanHoatHinh": false
}
```

**Kiểm sau khi AI trả** (tất định):

- id phải thuộc danh sách ứng viên;
- beat phủ kín `[0, T]`, không chồng nhau, mỗi beat ≤ 12 s (vì khoảng chết ≤ 4 s và mỗi beat cần ≥ 1 thay đổi);
- 3–8 beat với cảnh ≤ 60 s;
- `duLieu` chỉ chứa số/địa danh có trong nguồn.

Sai → hỏi lại 1 lần kèm lý do (giống P5b).

**Ngưỡng tin cậy**:

| `confidence` | Hành động |
|---|---|
| ≥ 0,70 | AI tự viết bài (pipeline §8) |
| 0,50 – 0,70 | Đi đường khuôn cũ (`fallback` của skill chính + `hoat_hinh_toan`) |
| < 0,50 hoặc `khongCanHoatHinh` | Không làm hoạt hình |

Ngưỡng đọc từ cấu hình (`ANIM_CONF_AUTHOR=0.7`, `ANIM_CONF_TEMPLATE=0.5`) và chỉnh lại bằng dữ liệu phản hồi sau 2 tuần.

### 7.3 Ghi nhận phản hồi và xếp hạng lại

**Sự kiện** (bảng `anim_feedback`): `giu` (GV giữ đến lúc xuất video), `bo` (bấm "Bỏ hoạt hình"), `lam_lai` (bấm làm lại), `doi_skill` (chọn skill khác trong thư viện, ghi `skill_moi`), `sua_tham_so`. Mặc định "giữ" chỉ được tính khi bài được xuất, hoặc 7 ngày không đổi.

**Prior** cho từng (skill, môn, khối lớp `1-5 | 6-9 | 10-12 | dh`):

```
α = 1 + giu + 0,5·sua_tham_so        β = 1 + bo + lam_lai + doi_skill (của skill cũ)
prior = trung vị Beta(α, β) ≈ (α − 1/3) / (α + β − 2/3)
```

- Dữ liệu ít thì prior nằm quanh 0,5, nên không lệch điểm.
- `doi_skill` cộng thêm 1 vào α của `skill_moi` cho cùng bộ đặc trưng. Đây là tín hiệu nhãn vàng cho bộ chọn.

**Cập nhật**: bảng `anim_skill_stats` cập nhật ngay khi có sự kiện. Mỗi tuần, script `scripts/anim-router-eval.mjs` chạy tập vàng (log `doi_skill` + 150 cảnh gán tay) để đo recall@3 / Hit@1 và hồi quy logistic lại các trọng số `3 / 2 / 2 / 3 / 1,5`. Trọng số mới phải qua review mới được áp.

---

## 8. Pipeline đầy đủ

```
lời giảng (speech[] + durationMs) + slideText
  │
  ├─(1) Bộ chọn bước 1  domain/animRouter.ts ── rỗng ──► giữ slide
  ├─(2) Bộ chọn bước 2  task hoat_hinh_ke_hoach ── conf<0,7 ──► khuôn cũ / không
  │        (song song: mốc từ = nội suy âm tiết; skill thơ/karaoke → MMS_FA dưới heavy lock)
  ├─(3) AI viết bài     task hoat_hinh_viet_hf  (thân 1–3 SKILL.md + examples + kit API + plan)
  ├─(4) Lint tĩnh       lintHf ─ lỗi ─┐
  ├─(5) Tiền xử lý      preprocess.ts (d3-geo, dagre, KaTeX, expr) → dự án tạm
  ├─(6) check trong bwrap  hyperframes check + motion.json + kiểm EDUVN ─ lỗi ─┤
  │                                                   (7) sửa ≤ 2: hoat_hinh_sua_hf ◄┘
  │                                                        hết lượt → khuôn cũ → slide
  ├─(8) Dựng MP4 1080p trong bwrap (hàng đợi 1 việc + heavy lock)
  ├─(9) QA video        ffprobe thời lượng + blackdetect sân khấu
  └─(10) Lưu            cache DATA_DIR/anim/<băm>.mp4, anim_runs, SceneAnim{skill, runId}
```

- **Trạng thái** (`anim_runs.trang_thai`): `cho → chon → lap_ke_hoach → viet → lint → kiem → sua_1 → sua_2 → dung → qa_video → xong`. Kết cục: `xong_ai | xong_khuon | khong_can | loi_hop_cat | loi_khac`, theo mô hình outcome của Math-To-Manim.
- **Song song**: bước 1–3 (chỉ gọi LLM) chạy trước cho ≤ 2 cảnh kế tiếp. Bước 6 và 8 đi qua **hàng đợi 1 việc** và `heavy run … flock /tmp/eduvn-heavy.lock`, theo quy tắc "một việc nặng mỗi lúc" của máy này.
- **Cache**: `băm = sha256(phiên bản kit, phiên bản skill, plan, html)`. Lời giảng đổi chỉ làm thời lượng đổi ≤ 10 % → giữ bài, giãn mốc beat theo tỉ lệ, kiểm lại (bước 6) rồi dựng, không gọi AI.
- **Manim (đợt 2)**: bước 3 dùng `hoat_hinh_viet_manim`; bước 4 là lint AST; bước 6 là dựng 480p trong bwrap + kiểm `boxes.jsonl`; bước 7 dùng `hoat_hinh_sua_manim`.

---

## 9. Gắn vào EDUVN

### 9.1 Task cổng AI mới (`gateway/tasks.json`)

| Task | json | Model (thứ tự lùi) | Việc |
|---|---|---|---|
| `hoat_hinh_ke_hoach` | có | `claude-sonnet-5-5-medium`, `gemini-3.8-flash-medium`, `claude-sonnet-4-6` | Chọn 1–3 skill trong ≤ 8 ứng viên + kế hoạch beat (`AnimPlan`) |
| `hoat_hinh_viet_hf` | không (trả HTML trong khối `html`) | `claude-sonnet-5-5-medium` (hoặc `-high` khi chạy đêm), `claude-sonnet-4-6` | Viết `index.html` theo kit + skill + plan |
| `hoat_hinh_sua_hf` | không | như trên | Nhận lỗi rút gọn, trả bản vá khối hoặc bài mới |
| `hoat_hinh_viet_manim` | không (khối `python`) | `claude-sonnet-5-5-medium`, `claude-sonnet-4-6` | Đợt 2 |
| `hoat_hinh_sua_manim` | không | như trên | Đợt 2 |

`timeoutMs` cho task viết/sửa là 240 000. `system` tiếng Việt nêu: chỉ dùng `EK.*` + `tl`; danh sách cấm của lint (để AI tránh từ đầu); token; nguyên tắc "mỗi beat ≥ 1 thay đổi, không đứng yên > 4 s, một chuyển động camera chậm, nhãn bám vật, không bịa số". Khi cổng thật chưa có task thì dùng `AI_TASK_OVERRIDES` như P5b.

### 9.2 File và thư mục sẽ tạo

```
anim-skills/                                  # kho skill (87), README.md, index.json (sinh)
services/anim-kit/
  kit.js  kit.css  README.md (API, phiên bản)
  vendor/{gsap,katex}/  fonts -> ../video-theme/fonts
  assets/geo/{vn34,vn63,ne_vnm_admin0,song-ho}.topo.json  dia-danh.json  NGUON.md
services/manim/sandbox/{runner.py,lint.py,allowed.json,qa_boxes.py}
infra/sandbox/{apparmor-bwrap,doctor.sh,README.md}
server/src/domain/animRouter.ts               # bước 1 (thuần) + prior Beta
server/src/domain/animPlan.ts                 # zod AnimPlan + kiểm phủ beat + nội suy mốc âm tiết
server/src/services/animStudio/
  registry.ts        # đọc anim-skills/index.json, thẻ tầng 1, nạp thân tầng 2
  pipeline.ts        # máy trạng thái §8, hàng đợi, cache, lùi
  author.ts          # gọi task viet/sua, ghép prompt
  preprocess.ts      # data-ek-* → SVG/HTML (d3-geo, dagre, katex, expr.ts, smilesDrawer)
  lintHf.ts          # parse5 + acorn
  sandbox.ts         # systemd-run + bwrap, doctor
  qaHf.ts            # hyperframes check + motion.json + kiểm token/rớt chữ/beat (CDP)
  manim.ts           # đợt 2: lint py, chạy hộp cát, đọc boxes.jsonl
  align.ts           # gọi align-words (MMS_FA) dưới heavy lock, chỉ cho skill cần
server/src/http/routes/animStudio.ts          # POST …/canh/:id/hoat-hinh-ai, GET …/kho-skill, POST …/phan-hoi
server/src/db/schema.ts (+3 bảng)  server/drizzle/0024_anim_studio.sql
scripts/build-anim-skills.mjs                 # kiểm chuẩn + tóm tắt thân + index.json
scripts/eval-anim-studio.mjs                  # chạy tập vàng tuần tự (đêm)
scripts/anim-router-eval.mjs                  # recall@3/Hit@1 + hồi quy trọng số
web/src/…/AnimLibrary (tab "Kho skill") + nút Giữ/Bỏ/Đổi skill   # cần mockup chinhan duyệt trước
THIRD_PARTY_LICENSES.md                       # thêm HF registry (Apache-2.0), abm (MIT), NE (PD), OSM (ODbL), GSAP, d3, dagre, smilesDrawer
```

Cần thêm phụ thuộc vào `server/package.json`: `hyperframes@0.9.28` (ghim, bỏ `npx`), `parse5`, `acorn`, `d3-geo`, `topojson-client`, `dagre`, `smiles-drawer`, `gsap` (để chép vào `vendor/`).

### 9.3 Migration `0024_anim_studio.sql`

```sql
CREATE TABLE anim_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES ai_lessons(id) ON DELETE CASCADE,
  scene_id text NOT NULL,
  dac_trung jsonb NOT NULL,            -- đặc trưng bước 1 (giải thích + học lại trọng số)
  ung_vien jsonb NOT NULL,             -- [{id, diem, thanhPhan}]
  ke_hoach jsonb,                      -- AnimPlan
  skills text[] NOT NULL DEFAULT '{}',
  confidence real,
  engine text,                         -- hf | manim | khuon
  so_lan_sua smallint NOT NULL DEFAULT 0,
  qa jsonb,                            -- lỗi/cảnh báo từng lượt
  trang_thai text NOT NULL,
  ket_cuc text,                        -- xong_ai | xong_khuon | khong_can | loi_hop_cat | loi_khac
  hash text,
  ms jsonb,                            -- {chon, keHoach, viet, kiem, dung, tong}
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anim_runs_lesson_idx ON anim_runs (lesson_id, scene_id);

CREATE TABLE anim_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES anim_runs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hanh_dong text NOT NULL CHECK (hanh_dong IN ('giu','bo','lam_lai','doi_skill','sua_tham_so')),
  skill_moi text,
  ghi_chu text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anim_feedback_run_idx ON anim_feedback (run_id);

CREATE TABLE anim_skill_stats (
  skill_id text NOT NULL,
  mon text NOT NULL,
  khoi text NOT NULL,                  -- 1-5 | 6-9 | 10-12 | dh
  alpha real NOT NULL DEFAULT 1,
  beta real NOT NULL DEFAULT 1,
  so_lan integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (skill_id, mon, khoi)
);
```

Skill vẫn là file trong git (review được, có phiên bản). Không cần bảng skill. Bảng `organizations` chưa có cột cấu hình; khi cần bật/tắt skill theo trường thì thêm bảng `anim_skill_org (org_id, skill_id, bat, uu_tien)` sau.

### 9.4 Chia gói cho 3 agent làm song song

**Ngày 0** (điều phối viên, ~nửa ngày): chốt 4 hợp đồng trong `docs/anim-studio/`: `skill-format.md` (§4), `kit-api.md` (§4.4), `anim-plan.md` (zod `AnimPlan`), `finding.md` (định dạng lỗi lint/QA). Các gói chỉ dựa vào hợp đồng, không dựa vào mã của nhau.

| Gói | Agent | Phạm vi | Bàn giao | Phụ thuộc |
|---|---|---|---|---|
| **A: Nền dựng & kiểm** | 1 | `services/anim-kit` (kit.js/css, vendor, geo + địa danh có nguồn), `preprocess.ts`, `lintHf.ts`, `sandbox.ts` + `infra/sandbox` + doctor, `qaHf.ts` (check + motion.json + 4 kiểm EDUVN); đợt 2: `services/manim/sandbox/*`, `manim.ts` | `lintHf(html, plan): Finding[]`, `checkHf(dir, plan): QaReport`, `renderHf(dir): mp4`; test có HTML xấu cố ý (mạng, eval, màu lạ, nhãn đè, khoảng chết 6 s) phải bị bắt | Hợp đồng ngày 0; root bật AppArmor (§6.3) |
| **B: Chọn skill & điều phối** | 2 | `animRouter.ts`, `animPlan.ts`, `registry.ts`, `scripts/build-anim-skills.mjs`, 5 task `tasks.json`, `pipeline.ts`, `author.ts`, route + migration 0016 + repo, ghi phản hồi + prior, `anim-router-eval.mjs`; web: tab Kho skill + nút phản hồi (**mockup trước, chinhan duyệt rồi mới code UI**) | Pipeline chạy đầu–cuối với `lintHf/checkHf` giả rồi thật; test bộ chọn trên 40 cảnh mẫu 8 môn | Hợp đồng; gói A để chạy thật |
| **C: Nội dung skill** | 3 | Đợt 1: 20 skill ★ (SKILL.md, ví dụ vàng qua lint + check, checklist, thumb, evals); đợt 2: 67 skill còn lại (Manim sau khi A xong hộp cát Manim); `references/` chuyên môn (quy ước biểu đồ Atlat, cách vẽ mũi tên chiến dịch, bảng biện pháp tu từ) | `anim-skills/` + `index.json` hợp lệ; mỗi ví dụ vàng có ảnh khung | kit-api (dùng bản giả của A tới khi kit thật xong) |

Thứ tự tích hợp: A + B ghép (tuần 1) → C đổ 20 skill → chạy thật 1 bài mỗi môn (tuần tự, heavy lock) → đo số §9.5 → đợt 2 (Manim + 67 skill).

### 9.5 Số đo đích (đo bằng `scripts/eval-anim-studio.mjs` trên 40 cảnh vàng: 8 môn × 5, chạy tuần tự ban đêm)

| Chỉ số | Đích đợt 1 (HF) | Đích đợt 2 (+Manim) |
|---|---|---|
| Bộ chọn: recall@3 trên tập vàng | ≥ 90 % | ≥ 92 % |
| Bộ chọn: Hit@1 (skill chính đúng) | ≥ 70 % | ≥ 75 % |
| Tỉ lệ qua QA ngay lượt đầu | ≥ 55 % | ≥ 60 % |
| Tỉ lệ qua QA sau ≤ 2 lượt sửa | ≥ 85 % | ≥ 85 % |
| Tỉ lệ phải lùi về khuôn cũ | ≤ 15 % | ≤ 12 % |
| Thời gian một cảnh 15 s, p50 (chọn → MP4 1080p) | ≤ 3 phút | HF ≤ 3 phút; Manim ≤ 4 phút |
| p95 | ≤ 7 phút | ≤ 8 phút |
| `hyperframes check` mỗi lượt | ≤ 30 s | — |
| Đỉnh RAM một lượt dựng (đo cgroup) | ≤ 2 GB Chrome | ≤ 1,5 GB Manim |
| GV giữ (sau 2 tuần dùng thật) | ≥ 70 % | ≥ 75 % |
| Thoát mạng từ hộp cát (doctor + test xấu) | 0 | 0 |
| Lỗi QA lọt ra video (kiểm tay 40 clip: đè, tràn, chữ < 36 px, màu lạ) | ≤ 2 clip | ≤ 2 clip |

### 9.6 Rủi ro và việc cần chinhan quyết

1. **Bật AppArmor cho bwrap** (lệnh root một lần, §6.3). Chưa bật thì Studio chỉ chạy đường khuôn cũ. Máy chủ triển khai cũng cần bước này.
2. **Điều khoản GSAP Standard License** về sản phẩm "trình dựng hoạt hình trực quan" cạnh tranh với Webflow: cần đọc và quyết. Kit đã bọc API để có thể đổi sang anime.js (MIT) nếu cần.
3. **Dữ liệu bản đồ**: chỉ dùng bản Natural Earth `_vnm`; kiểm bằng mắt Hoàng Sa, Trường Sa; có cả lớp 34 tỉnh (từ 1/7/2025) và lớp 63 tỉnh (Atlat cũ); `dia-danh.json` phải có người kiểm từng toạ độ lịch sử. AI không được tạo toạ độ.
4. **Giọng ngâm thơ**: `tho-chu-dong-ngam` cần giọng mẫu "ngâm" cho VieNeu (chinhan chọn bằng tai) và MMS_FA (torchaudio). MMS_FA nặng RAM → chỉ chạy dưới heavy lock, chỉ cho skill thơ/karaoke. Các skill khác dùng nội suy âm tiết.
5. **RAM máy dev** (15 GB, swap gần đầy lúc khảo sát): mọi lệnh check/dựng đều qua hàng đợi 1 việc, systemd giới hạn bộ nhớ, không chạy song song với TTS.

---

## 10. Nguồn

**Trên máy**
- `~/hyperframes`: `registry/registry.json`, `registry/blocks/*`, `registry/components/*`, `packages/core/src/runtime/adapters/`, `DESIGN.md`, `themes/`
- `~/.claude_shared/skills/hyperframes*`: `SKILL.md`, `hyperframes-cli/references/lint-validate-inspect.md`, `hyperframes/references/types/explainer.md`
- EDUVN: `~/projects/eduvn/.superpowers/sdd/2026-11-10-p5b-video/report.md`, `…/2026-11-11-tham-my/brief.md`, `~/projects/eduvn-wt/integ/{server/src/services/anim/*, services/manim/*, gateway/tasks.json, server/src/services/skills.ts, server/src/domain/tutorSearch.ts, server/src/services/aiLessons/types.ts, server/src/db/schema.ts}`, `~/projects/eduvn-wt/tham-my/{services/video-theme/tokens.json, server/src/services/anim/studio.ts, services/manim/studio.py}` (chỉ đọc)

**GitHub**
- https://github.com/TIGER-AI-Lab/TheoremExplainAgent · https://github.com/showlab/Code2Video · https://github.com/marcelo-earth/generative-manim · https://github.com/HarleyCoops/Math-To-Manim · https://github.com/makefinks/manim-generator · https://github.com/mathifylabs/ManimAgentPrompts · https://github.com/abm-dungtq/abm-video-bgdt · https://github.com/helblazer811/ManimML · https://github.com/ManimCommunity/manim · https://github.com/ManimCommunity/manim-voiceover · https://github.com/Matheart/manim-physics · https://github.com/UnMolDeQuimica/manim-Chemistry · https://github.com/3b1b/videos · https://github.com/qnguyen3/STEMViz
- https://github.com/anthropics/skills · https://github.com/heygen-com/hyperframes · https://github.com/greensock/gsap-skills · https://github.com/emilkowalski/skills · https://github.com/ChromeGenesis/hyperframes-skills · https://github.com/remotion-dev/claude-code-plugin · https://github.com/csthink/dashmotion · https://github.com/ComposioHQ/awesome-claude-skills · https://github.com/VoltAgent/awesome-agent-skills · https://github.com/GarethManning/education-agent-skills
- https://github.com/nvkelso/natural-earth-vector · https://github.com/topojson/world-atlas · https://github.com/d3/d3-geo · https://github.com/maplibre/maplibre-gl-js · https://github.com/OpenHistoricalMap/maplibre-gl-dates · https://github.com/wmgeolab/geoBoundaries · https://github.com/NUKnightLab/TimelineJS3 · https://github.com/NUKnightLab/StoryMapJS · https://github.com/reymond-group/smilesDrawer · https://github.com/greensock/GSAP · https://github.com/KaTeX/KaTeX

**Chuẩn và bài báo**
- Agent Skills specification: https://agentskills.io/specification.md
- SkillRouter: https://arxiv.org/abs/2603.22455
- Skill Retrieval Augmentation for Agentic AI: https://arxiv.org/pdf/2604.24594
- SkillSeek: https://papers.cool/arxiv/2609.38822
- SkillDAG: https://arxiv.org/html/2606.03056
- IBM, skill dependency graphs: https://research.ibm.com/publications/what-skill-dependency-graphs-are-really-good-for-an-empirical-study
- Natural Earth, chính sách biên giới tranh chấp và bản theo góc nhìn quốc gia: https://www.naturalearthdata.com/about/disputed-boundaries-policy/ · https://www.naturalearthdata.com/?p=5118
- GSAP Standard License: https://gsap.com/community/standard-license/ · README: https://cdn.jsdelivr.net/npm/gsap@3.15.0/README.md
