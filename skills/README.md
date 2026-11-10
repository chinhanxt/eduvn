# skills/ — bộ skill sư phạm Việt Nam (P8)

Mỗi skill: `SKILL.md` (frontmatter name/description + quy trình + định dạng đầu ra JSON khớp schema EDUVN), `references/` (trích quy định, viết lại ngắn), `evals/evals.json` (5 ca đầu vào + tiêu chí chấm cho LLM-judge).

| Skill | Dùng để | Nút trong app / API |
|---|---|---|
| `ma-tran-dac-ta-7991` | Ma trận + bản đặc tả đề (CV 7991) | Đề thi → "AI lập ma trận" · `POST /api/ai-skills/ma-tran` |
| `cau-hoi-theo-yccd` | Câu hỏi 4 dạng bám YCCĐ | Ngân hàng → "AI tạo câu hỏi" · `POST /api/ai-skills/cau-hoi` |
| `giao-an-5512` | Giáo án CV 5512, sinh từng mục | Giáo án → "AI soạn giáo án" · `POST /api/ai-skills/giao-an` |
| `nhan-xet-tt22-tt27` | Nhận xét TT22/TT27 | Sổ điểm → "AI gợi ý nhận xét" · `POST /api/ai-skills/nhan-xet` |
| `de-cuong-hoc-phan` | Đề cương học phần đại học (ADDIE) | trang `/de-cuong` · `POST /api/ai-skills/de-cuong` |
| `rubric-tu-luan` | Rubric chấm tự luận (cho P7b) | `rubricFor()` · `POST /api/ai-skills/rubric` |

- Server nạp `SKILL.md` làm system prompt (`server/src/services/skills.ts`), gọi cổng AI, kiểm đầu ra bằng zod/validate sẵn có.
- MCP: tool `lay_skill` và prompt cùng tên skill để AI ngoài đọc được.
- Chạy eval thật: `node scripts/eval-skills.mjs [--skill tên] [--limit n]` (cần `GATEWAY_URL`, `GATEWAY_TOKEN`; `AI_TASK_OVERRIDES` ánh xạ task chưa có trên cổng).
- Ý tưởng tham khảo GarethManning/education-agent-skills (CC BY-SA 4.0): tự viết lại, không chép. Nguồn tái chế khác xem `THIRD_PARTY_LICENSES.md`.
