# 08 · Kênh Zalo — theo cách 2anh-zalo-bot (P2)

**Upstream:** https://github.com/luonghaianh1208/2anh-zalo-bot (MIT). Thư mục: `services/zalo-bridge/`.

## Cách nó chạy
```
Nick Zalo riêng của bot (quét QR như Zalo Web)
  ⇄ sidecar Node `zca-js` (giữ cookie, tự nối lại, rate limit 5 tin liền → ~20 tin/phút)
  ⇄ WebSocket 127.0.0.1 (token, chặn header Origin)
  ⇄ plugin Python trong Hermes Agent (phân quyền, lọc @tag nhóm)
  ⇄ Hermes Agent (LLM + tools + skills + cron)
  ⇄ [EDUVN] tool plugin `eduvn_*` → REST lõi
```

**Mục tiêu:** GV/SV dùng EDUVN ngay trong nhóm Zalo lớp: "tạo đề 15 phút Toán 10 chương 1, 2 mã" → bot gửi file .docx; nhắc lịch, thông báo lớp.

| | |
|---|---|
| **Đầu vào** | Tin nhắn Zalo (riêng / nhóm khi được @tag), file đính kèm |
| **Đầu ra** | Trả lời, file .docx (`zalo_send_file`), nhắc lịch (cron Hermes), thông báo lớp |

## Danh tính (điểm thiết kế quan trọng)
- Hermes gọi lõi bằng **một service token** (Keycloak client credentials, scope `channel:zalo`).
- Tool plugin `eduvn_*` lấy **UID người gửi đã xác minh tại thời điểm gọi** (cùng cơ chế `_owner_only` trong `hermes-plugin/zalo_tools/tools.py` của 2anh) và gửi header `x-channel-user: zalo:<uid>`. Không để LLM tự điền UID.
- Lõi map `zalo:<uid>` → user qua bảng `channel_links`; liên kết một lần: GV lấy mã 6 số trên AI chat/web → nhắn `/lienket 123456` cho bot.

## Vận hành demo
- SIM + nick Zalo **riêng** cho bot. Vài nhóm nhỏ, không gửi hàng loạt.
- Chạy theo hướng dẫn cài của 2anh (`install:hermes`, `doctor`).

## Cần kiểm khi viết plan P2 (đọc code upstream, chưa xác minh)
1. API plugin Hermes để lấy danh tính người gửi trong tool call.
2. Skill soạn đề / giáo án 5512 của 2anh có nằm trong repo không, giấy phép của skill.
3. Bản Hermes Agent tương thích (2anh ghi yêu cầu riêng).

**Xong khi:** demo thật trên nhóm Zalo thử: GV đã liên kết tạo đề và nhận .docx; người chưa liên kết bị từ chối lịch sự; nhật ký thao tác ghi đủ.

**Đường lui khi bán thật:** thay lớp kênh bằng Zalo Bot Platform chính thức (`bot-api.zaloplatforms.com`) + Zalo OA/ZNS; lõi không đổi vì chỉ nhận `x-channel-user`.
