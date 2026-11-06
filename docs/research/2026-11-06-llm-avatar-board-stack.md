# LLM, avatar trợ giảng, bảng giảng AI — khảo sát (2026-11-06)

Nguồn: 2 lượt khảo sát web (GitHub/HF/ToS, kiểm bằng `gh api`) + đo thử trên máy dev. `[CV]` = chưa kiểm chứng.

## 1. Đo thử LLM qua CLI trên máy dev

| Phép thử | Kết quả | Thời gian |
|---|---|---|
| `codex exec` (gpt-6.1-sol, effort low) đọc ảnh chữ viết tay trên bảng → LaTeX | Đúng cả 3: `y = x^2 - 3`, `y = A \sin x + B`, `y = 2 \sin x` (≈16k token) | 19 s |
| `codex exec` giảng "vì sao thiết diện là lục giác đều" | Đúng, tiếng Việt tự nhiên, có 120° và nửa đường chéo mặt | 29 s |
| `agy -p` (1.5.1) | Treo, quá 90–180 s không trả lời (kể cả câu "7*8") | — |

Kết luận: model đủ giỏi về nội dung; gọi qua CLI quá chậm cho bảng/avatar trực tiếp (cần < 2 s, có stream), chỉ hợp việc soạn theo lô (giáo trình, slide, đề).

**ToS:** OpenAI Terms (2026-01-01) cấm cho người khác dùng tài khoản và cấm lấy output tự động; Google Antigravity Additional Terms §6 coi truy cập bằng phần mềm bên thứ ba là vi phạm (từ 02/2026 có làn sóng khoá 403). Proxy kiểu CLIProxyAPI (MIT), codex-lb, ChatMock chỉ dùng dev/nội bộ. Production: API key trả theo lượt (OpenAI API / Gemini API / Anthropic API).

## 2. Chỗ nào trong mockup cần LLM

| Chức năng | Cần LLM? | Cách làm |
|---|---|---|
| Vẽ tay → hình 2D | Không | $Q/$P recognizer (BSD) |
| Vẽ tay → khối 3D | Không / tuỳ chọn | Heuristic tách góc; khó thì gửi ảnh cho vision LLM |
| Viết tay → công thức | Tuỳ chọn | Pix2Text MFR (MIT, ONNX ~120 MB, CPU) trước; độ tin thấp → vision LLM |
| Đồ thị, thanh trượt, hình 3D, cắt, đo góc | Không | JSXGraph/Mafs, three.js + three-bvh-csg |
| Gợi ý bài liên quan | Không | Ngân hàng câu hỏi theo chủ đề/YCCĐ |
| Trợ giảng ảo hội thoại | Có (API stream) | STT → LLM → TTS → avatar |
| Chấm phát âm tiếng Anh | Không (model riêng) | OpenPronounce (MIT, CPU) / Azure PA |
| Sinh giáo trình, slide, đề | Có (theo lô) | Qua MCP từ AI chat (không cần khoá) hoặc API |
| Kiểm đáp án AI sinh ra | Không | CortexJS Compute Engine (MIT); SymPy đối chiếu |

## 3. Repo chọn dùng

| Phần | Chọn | License | Ghi chú |
|---|---|---|---|
| Avatar 3D nói | met4citizen/TalkingHead (1.7k★) | MIT | three.js, blendshape ARKit + viseme, mood/cử chỉ |
| Nhép miệng từ âm thanh | met4citizen/HeadAudio | MIT | AudioWorklet, 50–100 ms, không cần văn bản; **chưa ai đo với tiếng Việt** |
| Avatar anime (phương án B) | pixiv/three-vrm (2.3k★) | MIT | Tự viết lip-sync |
| Tham khảo app hoàn chỉnh | moeru-ai/airi (51k★), lobe-vidol | MIT / Apache | VRM + Live2D |
| TTS tiếng Việt | pnnbao97/VieNeu-TTS v3-Turbo (3.1k★) | Apache-2.0 | 48 kHz, 25 giọng, clone giọng 3–8 s, CPU ONNX RTF ~0.5, API kiểu OpenAI |
| STT tiếng Việt | sherpa-onnx Zipformer vi 30M int8 | Apache-2.0 | CPU, có WASM; ghép VAD |
| Nối STT→LLM→TTS | livekit/agents-js | Apache-2.0 | Node/TS, WebRTC, ngắt lời |
| Chấm phát âm | Halleck45/OpenPronounce | MIT | Wav2Vec2 + DTW, CPU, điểm 0–100 + âm sai |
| Bảng vẽ | excalidraw (135k★) + perfect-freehand | MIT | Có thư viện hình |
| Sơ đồ (giáo trình) | maxGraph / drawio | Apache-2.0 | "draw.io" là nhãn hiệu |
| Đồ thị | JSXGraph (MIT/LGPL) hoặc Mafs (MIT) | | |
| Hình 3D | three.js + gkjohnson/three-bvh-csg | MIT | Tự viết mặt cắt, đo góc |
| Ô công thức | MathLive + Compute Engine | MIT | Đã dùng trong mockup |
| Xuất Word công thức thật | docx 9.15.2 `docx/math` `latexToMath` | MIT | Đã kiểm có trong bản EDUVN đang dùng |
| Nhập MathType từ Word | transpect/docx2tex (Java) hoặc LibreOffice headless | BSD-2 | Job riêng `[CV]` |

Có GPU về sau: NVIDIA Audio2Face-3D (biểu cảm, giấy phép cho thương mại), MuseTalk/Ditto (mặt người thật).

## 4. Tránh

- Cấm thương mại: ChunkFormer-vi weights, F5-TTS VN fine-tune (hynt, EraX), viXTTS, Google MathWriting, model InsightFace trong LivePortrait `[CV]`.
- Ràng buộc: tldraw (cần key trả phí), GeoGebra (hợp đồng thương mại), Desmos (key partner), TEN Framework (điều khoản riêng), Piper bản mới GPL, Giac/texify GPL, Live2D Cubism SDK (độc quyền).
- Không license: CoMER, PosFormer, TAMER.
- Bỏ dở: SadTalker, mathbox, PhoWhisper (2024-11), GOPT.
- GPU bắt buộc: Audio2Face-3D, nhóm talking head ảnh thật, TexTeller/UniMERNet.

## 5. Rủi ro cần làm thử trước khi code thật

1. Avatar nói tiếng Việt: TalkingHead + HeadAudio + VieNeu-TTS trên CPU — miệng có khớp không, trễ bao nhiêu.
2. Chữ viết tay GV VN: Pix2Text vs vision LLM trên ~50 mẫu thật.
3. Nguồn avatar 3D (Ready Player Me có thể đã đóng `[CV]`) → tự làm GLB hoặc dùng VRM.
