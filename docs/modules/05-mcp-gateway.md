# 05 · MCP Gateway (P1 local, P3 công khai)

**Mục tiêu:** GV ra lệnh bằng lời trong Claude.ai/ChatGPT; mọi tính năng của lõi đều có tool.

| | |
|---|---|
| **Đầu vào** | JSON-RPC MCP qua `POST /mcp` + Bearer token |
| **Đầu ra** | Kết quả tool (JSON text); lỗi quyền/thiếu câu trả về `isError` có giải thích tiếng Việt |
| **Tool P1** | `tim_cau_hoi`, `them_cau_hoi`, `tao_de`, `lay_dap_an`, `cham_bai`, `xuat_word` |
| **Code** | `server/src/mcp/server.ts`, route trong `server/src/http/app.ts` |

**P3 cần kiểm khi viết plan (chưa xác minh):**
- Keycloak: đăng ký client động (DCR) ẩn danh bị chính sách *Trusted Hosts* chặn mặc định → phải cấu hình cho domain của Claude.ai/ChatGPT, hoặc tạo client tĩnh nếu connector cho nhập client ID.
- URL công khai HTTPS (domain riêng / tunnel), CORS, giới hạn tần suất.

**Xong khi (P1):** MCP client SDK liệt kê đủ 6 tool, gọi được luồng thêm câu → tạo đề → chấm; không token → 401 có `resource_metadata`.
