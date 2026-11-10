# Giấy phép bên thứ ba

## OpenMAIC — MIT

Bài giảng AI (P5) dùng và port một phần từ [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) (commit cee7b7f ≈ v1.4.2).

- `@openmaic/generation@0.3.31` và `@openmaic/dsl@0.13.0` (gói npm, MIT) — dùng làm thư viện, ghim phiên bản.
- Port ý tưởng, đã sửa và viết lại (đầu mỗi file ghi rõ nguồn):
  - `server/src/export/aiLessonPptx.ts` ← `lib/export/use-export-pptx.ts`
  - `server/src/export/aiLessonTimeline.ts`, `server/src/export/aiLessonVideo.ts` ← `lib/video-export/*`
  - `server/src/export/slideHtml.ts`, `web/src/ailesson/*` ← `packages/@openmaic/renderer`, `lib/playback`, `packages/@openmaic/editor`
  - `server/src/services/aiLessons/material.ts` ← `lib/server/material-extraction`
- Thư viện cho cảnh interactive phục vụ ở `/vendor/interactive` đúng danh mục `INTERACTIVE_LIBRARIES` của gói: katex 0.16.38 (MIT), three 0.160.0 (MIT), chart.js 4.4.8 (MIT), @tailwindcss/browser 4.1.18 (MIT).
- Không dùng `mathml2omml` (LGPL) của OpenMAIC.

```
MIT License

Copyright (c) 2026 THU-MAIC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Edge TTS (`msedge-tts`, MIT)

Giọng đọc lời giảng (vi-VN-HoaiMyNeural / vi-VN-NamMinhNeural) qua dịch vụ đọc của Microsoft Edge.

## DeepTutor v1.7.2 (HKUDS/DeepTutor, commit 60fb3bd) — Apache License 2.0

EDUVN port sang TypeScript (đã sửa, không dùng nguyên mã Python) các phần sau; mỗi file port ghi rõ "Port từ DeepTutor <đường dẫn> (Apache-2.0), đã sửa":

- `server/src/domain/tutorLearning.ts` ← `deeptutor/services/practice/scheduler.py`, `deeptutor/learning/scheduler.py`
- `server/src/domain/tutorSearch.ts` ← `deeptutor/services/rag/*`
- `server/src/tutor/*.ts` ← `deeptutor/agents/{chat,question}`, `deeptutor/learning`, `deeptutor/capabilities/mastery`, `deeptutor/book`, `deeptutor/services/{practice,session,chat_hints,mastery_hints,rag}`
- `server/src/tutor/prompts/vi/*.ts` ← prompt YAML của các module trên (dịch và viết lại sang tiếng Việt)

Toàn văn Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0 (cũng có trong `LICENSE` của DeepTutor). Không cung cấp bảo đảm; các thay đổi so với bản gốc được đánh dấu "đã sửa" ở đầu mỗi file.

### THIRD_PARTY_NOTICES.md của DeepTutor (nguyên văn)

# Third-party notices

## CSSwitch

- Project: [SuperJJ007/CSSwitch](https://github.com/SuperJJ007/CSSwitch)
- Source commit: `4e0af6ba7909dca22f1257b168172ecbe4af4836`
- License: MIT
- Copyright: Copyright (c) 2026 shanjunjie
- Adapted concepts: PKCE loopback login, auth generations, atomic credential updates, model-catalog cache invalidation, and redacted operation states.

DeepTutor's Codex OAuth support draws on the design concepts listed above and
implements them independently against DeepTutor's own settings directory, model
catalog, and provider lifecycle. The MIT license text from that source commit
follows:

```text
MIT License

Copyright (c) 2026 shanjunjie

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Hermes Agent

- Project: [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)
- Source commit: `7d6db4efb885856078e4d19f804035226df81e0d`
- License: MIT
- Copyright: Copyright (c) 2025 Nous Research
- Adapted concepts: Feishu/Lark device-code bot registration and the WeCom AI
  Bot QR creation flow, including their retry and terminal-error semantics.

DeepTutor implements these protocols with its own async HTTP service, in-memory
session model, partner configuration merge, and Web administration interface.
The MIT license text from that source commit follows:

```text
MIT License

Copyright (c) 2025 Nous Research

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## thinking-orbs

- Project: [Jakubantalik/Libraries](https://github.com/Jakubantalik/Libraries) (`packages/thinking-orbs`)
- Source commit: `3862ffa345217443b63696a8c331a0664eea4b04`
- License: MIT
- Copyright: Copyright (c) 2026 Jakub Antalik
- Vendored files: `web/vendor/thinking-orbs/`

DeepTutor vendors this package's source rather than depending on the published
`thinking-orbs` npm package, so the dotted thought-orbs can take the host row's
`currentColor` instead of a flat greyscale ramp. Those local changes are listed at the top of
`web/vendor/thinking-orbs/index.ts` and marked at each site. Everything else is
upstream's, unmodified. The MIT license text from that source commit follows:

```text
MIT License

Copyright (c) 2026 Jakub Antalik

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Bộ skill sư phạm `skills/` (P8) — nguồn tái chế

Các skill được EDUVN tự viết bằng tiếng Việt; chỉ mượn **khung cấu trúc và ý tưởng quy trình** từ các dự án sau (không chép nguyên văn):

- **anthropics/k12-teacher-skills** — Apache License 2.0. Khung `SKILL.md` (frontmatter, quy trình từng bước), cách dùng tiêu chí chấm dạng LLM-judge cho `evals/`. Theo điều 4 của Apache-2.0 giữ nguyên NOTICE dưới đây (cũng có ở `skills/NOTICE`):

  ```
  Agent Skills for K-12 Teachers
  Copyright 2026 Anthropic, PBC
  Copyright 2026 Learning Commons
  Portions of this product were co-developed by Anthropic, PBC
  and Learning Commons under a collaboration agreement.
  ```

  Toàn văn: https://www.apache.org/licenses/LICENSE-2.0. Thay đổi: dịch và viết lại theo CV 5512, 7991, TT22, TT27; không dùng nội dung tiêu chuẩn Mỹ.
- **DaRL-GenAI/instructional_agents** — MIT. Luồng ADDIE và phân vai (giảng viên, nhà thiết kế, trợ giảng, điều phối) cho `de-cuong-hoc-phan`.
- **oaknational/oak-ai-lesson-assistant** và **oak-ai-autoeval-tools** — MIT. Ý tưởng sinh giáo án theo từng mục có schema và chấm tự động bằng LLM-judge (`scripts/eval-skills.mjs`).
- **duongtrung/BloomLLM**, **nicyscaria/AEQG_Blooms_Evaluation_LLMs** — MIT. Ý tưởng bảng động từ Bloom và tiêu chí đánh giá câu hỏi.
- **Khalidsyfullah/Vision-Language-Models-for-Outcome-Based-Assessment** — Apache-2.0. Ý tưởng chấm theo từng tiêu chí (`rubric-tu-luan`).
- **GarethManning/education-agent-skills** — CC BY-SA 4.0. Chỉ tham khảo ý tưởng cấp cao (thiết kế ngược, nhận xét theo thang, rubric theo tiêu chí); **không sao chép văn bản** nên không phát sinh nghĩa vụ ShareAlike.

Văn bản pháp quy (CV 5512, CV 7991, TT22/2021, TT27/2020, CT GDPT 2018) được tóm lược lại bằng lời của EDUVN trong `references/`.
