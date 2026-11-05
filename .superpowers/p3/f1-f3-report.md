# P3 F1–F3 report (Lớp & học viên, Sổ điểm & điểm danh, Nhận xét TT22/TT27)

Status: done, end-to-end (DB + domain + service + REST + MCP + web + xlsx export).

## Built
- DB (migration server/drizzle/0001_regular_jazinda.sql): classes (name, school_year, subject, scale TT22|TT27, columns jsonb), students, scores (pk student+column), attendance (pk student+date), comments (pk student+term HK1|HK2).
- Domain (pure): src/domain/roster.ts (paste/sheet parsing, dd/mm/yyyy dob, gender, duplicate split), gradebook.ts (columns TX1-3 x1, GK x2, CK x3 default; parseScore accepts "8,5", 0-10, 1 decimal; ĐTB integer-exact half-up; attendance), comments.ts (levels per scale, 20-400 chars).
- Service: src/services/classes.ts (createClassService). Class ref accepts id or name ("10A1"); student ref accepts id, full name or code. All batch ops are atomic and reject with a Vietnamese issues list (ValidationError -> HTTP 400 {error, issues[]}; MCP isError text).
- Authz (authz.ts): class:manage (owner/admin/teacher), class:read + grade:write (also assistant); student none. Assistant: read, scores, attendance; comments/roster/columns need class:manage.
- Export: src/export/xlsx.ts (exceljs, Times New Roman 13): class list; gradebook (STT, Mã, tên, columns, ĐTB, vắng P/K, nhận xét+mức HK1/HK2) + "Điểm danh" sheet. Download links via /dl (DownloadClaims extended with classId + kind class_list|gradebook).
- MCP (src/mcp/classes.ts): tao_lop, them_hoc_vien, danh_sach_lop, nhap_diem, diem_danh, xuat_so_diem, xem_ho_so_hs, luu_nhan_xet.
- REST: /api/classes (GET/POST), /:id (GET/PATCH incl. columns+scale), /:id/students (POST text|students), /students/xlsx (POST {contentBase64}), /students/:sid DELETE, /gradebook, /profile?student=, /scores PUT, /attendance GET?date + PUT, /comments PUT, /export POST {kind}.
- Web: pages Classes.tsx (cards -> detail: student table, paste, upload .xlsx, export) and Gradebook.tsx (class select, tabs Điểm grid / Điểm danh by date / Nhận xét with level select per class scale, export). Sidebar "Lớp học": Lớp & học viên, Sổ điểm, Gia sư AI; home tile "Lớp học". Smoke extended.

## Verification
- pnpm -C server test: 18 files, 111 tests pass (new: tests/domain/classes, tests/service-classes, tests/http/classes, tests/mcp/classes; mcp tool-list test updated to 14 tools).
- pnpm -C server typecheck, pnpm -C web build: clean.
- Web smoke (Keycloak+Postgres+server+vite): SMOKE PASS incl. paste dup-warning, xlsx upload, score entry ĐTB 8,4, rejected score 11, rejected short comment, both exports.
- Screenshots: /tmp/eduvn-web-lop-hoc.png, /tmp/eduvn-web-so-diem.png, /tmp/eduvn-web-so-diem-diem-danh.png, /tmp/eduvn-web-so-diem-nhan-xet.png
- Exported files: /tmp/eduvn-danh-sach-lop.xlsx, /tmp/eduvn-so-diem.xlsx; LibreOffice -> PDF OK (/tmp/eduvn-so-diem.pdf, pdftotext shows headers, scores, names).

## Deviations / gaps
- xlsx upload is JSON base64 (no multipart dependency).
- Scores are per class (one gradebook per school year), not per term; comments are per term (HK1/HK2). ĐTB is a single môn average.
- Duplicate policy: same code or same name+dob -> skipped with warning; same name only -> added with warning.
- Student order: bulk-inserted rows share created_at so list falls back to name order (not paste order).
- Gradebook xlsx numbers are real numbers (format 0.0); decimal comma display depends on the viewer's locale.
- No UI for editing grade columns (PATCH /api/classes/:id supports it; MCP has no tool for it).
- Other P3 sidebar groups (Giáo án, Văn bản…) left for their features.

## Fix round (controller review)
- Errors now name the student: "Nguyễn Văn An (STT 2): điểm 11 ngoài thang 0–10" (scores, attendance, comments; REST issues, MCP text and web banner). STT = position in the sorted list.
- `compareVietnameseNames` (server/src/domain/roster.ts, Intl.Collator("vi"), tên -> họ đệm). New `students.position` (migration 0002, assigned at insert); order = name, then position. Used by every list (service -> REST/MCP/web grid/both xlsx). Web has no own sort: it renders the server order (single source).
- Expected order asserted: Đỗ Minh An, Nguyễn Văn An, Trần Thị Bình, Lê Văn Cường, Phạm Thị Dung (Đ sorts after D; Bình < Cường < Dung). Paste-order tie test for two "Nguyễn Văn An".
- 114 server tests pass, typecheck + web build clean, smoke PASS, screenshot refreshed: /tmp/eduvn-web-so-diem.png.
