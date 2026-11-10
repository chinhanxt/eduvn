# web/ — Web app (từ P4)

**Mục tiêu:** giao diện cho việc không tiện làm bằng chat: sổ điểm, danh sách lớp, duyệt ngân hàng câu hỏi, cài đặt tổ chức.
**Đầu vào:** đăng nhập OIDC (Keycloak) → gọi REST của `server/`. **Đầu ra:** UI. Chưa có code tới P4; màn mới cần mockup được duyệt trước.

## Ba entry (UI v2)

| Entry | Đường dẫn | Nội dung |
|---|---|---|
| `index.html` → `src/main.tsx` | `/`, `/callback`, `/choi`, mọi đường cũ | Đăng nhập Keycloak, chuyển theo vai trò (owner/admin/teacher/assistant → `/gv`, còn lại → `/hoc`; chỉ có phiên HS mã lớp/PIN → `/hoc/hs`), trò chơi công khai `/choi`, chuyển hướng đường cũ (`src/portal/entries.ts` → `legacyRedirect`). |
| `gv.html` → `src/portal/gv/main.tsx` | `/gv/*` | Cổng giáo viên (router `basename="/gv"`). |
| `hoc.html` → `src/portal/hoc/main.tsx` | `/hoc/*` | Cổng Học: P6 `/hoc/gia-su…` (Keycloak), P9a `/hoc/hs/…` (phiên HS). |

Đường cũ → mới: `/ngan-hang`, `/de-thi`, `/cham-bai`, `/lop-hoc/:id`, `/bang-giang/:id`, `/so-do/:id`, `/dau-truong/…` … → `/gv/…`; `/hs/*` → `/hoc/hs/*`; `/gia-su`, `/giao-trinh` → `/hoc/…`.

**Dev:** `pnpm dev` — plugin `portalFallback` (vite.config.ts) trả `gv.html` cho `/gv/*`, `hoc.html` cho `/hoc/*` (chỉ yêu cầu HTML, không đụng asset/module); `vite preview` dùng cùng plugin.

**Prod:** `pnpm build` → `web/dist/` gồm `index.html`, `gv.html`, `hoc.html`, `assets/` (tên có hash). Chép nguyên `dist/` lên máy chủ tĩnh; `/api`, `/dl`, `/mcp`, `/vendor` chuyển về `server/`. Chọn Caddy/nginx đứng trước (đơn giản nhất: một khối cấu hình, nén + cache tĩnh sẵn, không thêm code vào server):

```caddy
eduvn.example.vn {
  encode zstd gzip
  root * /srv/eduvn/web/dist
  @api path /api/* /dl/* /mcp* /vendor/*
  reverse_proxy @api 127.0.0.1:4310
  @assets path /assets/*
  header @assets Cache-Control "public, max-age=31536000, immutable"
  @gv path /gv /gv/*
  rewrite @gv /gv.html
  @hoc path /hoc /hoc/*
  rewrite @hoc /hoc.html
  try_files {path} /index.html
  file_server
}
```

```nginx
root /srv/eduvn/web/dist;
location ~ ^/(api|dl|mcp|vendor)(/|$) { proxy_pass http://127.0.0.1:4310; proxy_buffering off; }  # SSE AI cần proxy_buffering off
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }
location ~ ^/gv(/|$)  { try_files $uri /gv.html; }
location ~ ^/hoc(/|$) { try_files $uri /hoc.html; }
location / { try_files $uri /index.html; }
```

Không cache `*.html` dài hạn (để lấy bản build mới).
