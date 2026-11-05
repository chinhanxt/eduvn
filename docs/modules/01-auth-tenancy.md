# 01 · Tài khoản, tổ chức, phân quyền (P1, mở rộng P3/P4)

**Mục tiêu:** một danh tính duy nhất cho mọi kênh (AI chat, Zalo, web); GV tự do dùng ngay, trường/trung tâm quản lý được thành viên.

| | |
|---|---|
| **Đầu vào** | Access token OIDC từ Keycloak (Bearer); header `x-org-id` (tuỳ chọn) |
| **Đầu ra** | `Actor { userId, orgId, role }` cho mọi request; 401/403 rõ ràng |
| **Dữ liệu** | `users(sub, email, name)`, `organizations(name)`, `memberships(org_id, user_id, role)` |
| **Code** | `server/src/auth/*`, `server/src/domain/authz.ts`, `server/src/db/*` |

**P1 làm:** xác thực JWT (JWKS), tự tạo tổ chức cá nhân, ma trận quyền, Keycloak dev (docker).
**Để sau:** mời thành viên / đổi vai trò (P4), đăng nhập Google/Microsoft qua Keycloak identity brokering (P3), liên kết danh tính kênh `zalo:<uid>` (P2).

**Xong khi:** token sai/hết hạn → 401; khác tổ chức → 403; người mới → có tổ chức `owner`; test xanh.
