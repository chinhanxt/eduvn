# P3 F4–F5 report (Giáo án CV 5512, Ma trận + đặc tả CV 7991)

Status: done end-to-end (domain + DB + service + REST + MCP + web + docx).

## Built
- F4 domain `server/src/domain/lesson.ts`: zod shape + `validateLessonPlan` returns Vietnamese issues ("Hoạt động 3 thiếu c) Sản phẩm", "Thiếu 3. Phẩm chất…", "Hoạt động 1 thiếu d) Tổ chức thực hiện, bước 3 (Báo cáo, thảo luận)", "Cần đúng 4 hoạt động…"). Hoạt động 2 may use `subs` (2.1, 2.2…) each with a–d. `LESSON_SHAPE_HELP` is embedded in the luu_giao_an description.
- DB `lesson_plans` (migration 0003); `src/services/lessons.ts` (invalid save -> ValidationError -> HTTP 400 {issues}, nothing stored); authz lesson:manage (owner/admin/teacher), lesson:read (+assistant).
- REST: GET/POST /api/lessons, GET/PUT/DELETE /api/lessons/:id, POST /api/lessons/:id/export. MCP: luu_giao_an (create/update), danh_sach_giao_an (list, or full JSON by id), xuat_giao_an.
- `src/export/lesson.ts`: Times New Roman 13, bold headings, I/II/III, a–d, d) as 4 numbered steps.
- F5: `MatrixCell.yccd?`; `domain/matrixReport.ts` (ma trận topic × dạng câu × NB/TH/VD, totals row số câu / số điểm / tỉ lệ %, bản đặc tả topic × level with YCCĐ + số câu, level ratio, warning if total ≠ 10). Points from real questions of variant 1 (essay points right); mcq 0.25, tf 1.0, short 0.25 / Toán 0.5.
- `src/export/matrix.ts`: landscape .docx (matrix page + spec page + ratio + warnings). Link kind "matrix": POST /api/exams/:id/matrix, MCP `xuat_ma_tran` (url, totals, levelRatio, warnings); `ExamLinks` (xuat_word, /links) gains `matrix`.
- Web: Giáo án page (/giao-an cards, /giao-an/:id read-only viewer + Tải Word), sidebar Soạn bài > Giáo án (new `pen` icon); Đề thi: optional "Yêu cầu cần đạt" per matrix row, "Ma trận" tag beside mã đề/Đáp án.

## Verification
- pnpm -C server test: 22 files, 126 tests pass (new: domain/lesson, domain/matrixReport, http/lessons, mcp/lessons incl. xuat_ma_tran). typecheck + web build clean.
- Web smoke: SMOKE PASS (ma trận download, giáo án thiếu phẩm chất bị từ chối, lưu, 4 hoạt động hiển thị, tải Word).
- Screenshots: /tmp/eduvn-web-giao-an.png, /tmp/eduvn-web-giao-an-chi-tiet.png, /tmp/eduvn-web-de-thi.png
- Files: /tmp/eduvn-giao-an.docx, /tmp/eduvn-ma-tran.docx; LibreOffice -> PDF OK (/tmp/eduvn-giao-an.pdf, /tmp/eduvn-ma-tran.pdf; pdftotext shows headers, totals, ratio, warning, spec with YCCĐ).

## Deviations / gaps
- d) is numbered steps, not a 2-column GV/HS | Sản phẩm table.
- Tỉ lệ % in matrix is by points.
- No web editing of lesson plans (MCP/REST write; web reads + downloads); no home tile for Giáo án.
