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

Copyright (c) OpenMAIC contributors (Tsinghua University MAIC)

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
