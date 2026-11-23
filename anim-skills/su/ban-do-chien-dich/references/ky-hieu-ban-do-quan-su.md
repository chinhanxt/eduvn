# Quy ước ký hiệu bản đồ quân sự — Môn Lịch sử (EDUVN)

Tài liệu tham chiếu cho skill `ban-do-chien-dich` và dạng câu hỏi `doc_luoc_do`. Bám chuẩn lược đồ Lịch sử theo CTGDPT 2018 và hệ token **Giấy học thuật** (`services/video-theme/tokens.json`).

## 1. Bảng màu hai lực lượng và các đối tượng bản đồ

Mọi màu phải lấy từ biến CSS trong `services/anim-kit/kit.css` (không viết mã màu cứng). Chọn tổ hợp đạt tương phản WCAG AA trên nền giấy `#FDFCF9` và phân biệt được với người mù màu đỏ–lục (luôn kết hợp **màu + kiểu nét + hình dạng**).

| Đối tượng | Màu token | Kiểu nét / hình dạng | Ghi chú sư phạm |
|---|---|---|---|
| Nền đất liền Việt Nam | `--surface` (`#FFFFFF`), viền `--accent` (`#2F5D8A`, 2,2 px) | Đường biên giới rõ, tách với nước láng giềng | Dùng lớp Natural Earth `_vnm` |
| Nước láng giềng | `--sunken` (`#F5F2EA`), viền `--line` (`#E6DECC`, 1,2 px) | Nền giấy ấm nhẹ, lùi về sau | Không lấn át chiến trường chính |
| Biển Đông & sông lớn | `--accent-soft` (`#E8EEF5`) cho mặt biển; `--accent` mờ 35 % cho sông | Nhãn biển chữ nghiêng `Source Serif 4` (`--accent`) | Luôn ghi *Biển Đông* |
| Mũi tên tiến công chủ lực (quân ta) | `--c-doSon` (`#B42318`) | Nét liền đậm 8 px, đầu tam giác đặc (`EK.arrow`) | Vẽ dần từ điểm xuất phát → mục tiêu |
| Mũi tên bao vây / vu hồi / chia cắt | `--c-vangDam` (`#8A6200`) hoặc `--c-tim` (`#6F42C1`) | Nét liền 6 px hoặc nét gạch dài `14 8` | Dùng khi cần phân biệt các mũi/đợt |
| Mũi tên địch rút lui / tháo chạy / phản kích bị đẩy lùi | `--c-lam` (`#2F5D8A`) hoặc `--ink3` (`#6D645A`) | **Nét đứt** `stroke-dasharray="14 10"`, đầu rỗng hoặc chữ V | Dễ phân biệt với tiến công ngay cả khi in đen trắng |
| Tuyến tiếp vận / đường hành quân | `--c-xanhLa` (`#2B7A3B`) | Nét chấm gạch `12 6 3 6`, rộng 5 px | Vd: đường tiếp tế Điện Biên Phủ, đường Trường Sơn |
| Vùng giải phóng / khu kiểm soát | `--c-xanhLa` hoặc `--c-doSon` tô nhạt (`alpha 0,14–0,18`) | Nét viền nét đứt mảnh + tô dần bằng `EK.fill` | Không che mờ địa danh và mũi tên |

## 2. Ký hiệu điểm trên lược đồ chiến dịch

Mỗi địa danh **bắt buộc** lấy toạ độ từ `services/anim-kit-data/dia-danh-lich-su.json` (`data-ek-place="<id>"`). Tuyệt đối không đặt điểm ước lượng bằng mắt hoặc tự bịa toạ độ.

| Loại điểm | Ký hiệu vector | Màu token | Kích thước ở 1080p |
|---|---|---|---|
| Kinh đô / trung tâm chính trị | Hình vuông có chấm tâm hoặc ngôi sao 5 cánh | `--c-doSon` (viền `--surface`) | 22–26 px |
| Sở chỉ huy / căn cứ địa | Hình lá cờ đuôi nheo hoặc ngũ giác đặc | `--c-xanhLa` hoặc `--c-doSon` | 24 px |
| Tập đoàn cứ điểm / đồn địch | Vòng tròn viền đôi hoặc hình bán nguyệt phòng ngự (răng cưa hướng ra ngoài) | `--c-lam` (đang giữ) → gạch chéo / đổi `--c-xanhLa` khi bị tiêu diệt | 22–26 px |
| Trận đánh / điểm giao tranh | Hai thanh kiếm chéo (✕ đậm) hoặc tia nổ 6 cánh | `--c-doSon` | 24–28 px |
| Sân bay / cầu / bến cảng | Biểu tượng đường băng / cầu đơn giản, tối đa 2 nét | `--ink2` | 20–22 px |
| Địa danh thông thường | Chấm tròn `.ek-place-dot` đường kính 18 px, viền trắng 3 px | `--c-doSon` hoặc `--accent` | 18 px |

## 3. Quy tắc trình tự theo đợt chiến dịch

1. **Khung mở đầu (Beat 0)**: Hiện bản đồ nền toàn cảnh hoặc khu vực tác chiến, đặt địa danh chủ chốt và chú giải ngắn (tối đa 4 mục).
2. **Mỗi đợt tiến công = 1 beat riêng**:
   - Đợt mới vẽ mũi tên đậm và làm sáng thẻ tóm tắt đợt đó.
   - Đợt trước lùi về độ mờ `0,45` (hoặc giữ nét mảnh) để HS thấy được **tổng thể vận động** của cả chiến dịch mà không bị rối mắt.
   - Mũi tên rút lui chỉ vẽ **sau** khi mũi tên tiến công chạm cứ điểm.
3. **Vùng giải phóng**: Chỉ tô nền (`EK.fill`) ở bước kết thúc đợt hoặc cuối chiến dịch, tránh tô đè làm giảm tương phản chữ nhãn (luôn giữ tỷ lệ tương phản chữ ≥ 4,5:1).
4. **Nhãn địa danh**:
   - Cỡ chữ ≥ 36 px ở khung 1920×1080 (chỉ riêng `.ek-meta` được 30 px).
   - Không đặt nhãn đè lên mũi tên hoặc đường biên; khi 2 địa danh gần nhau (vd Him Lam – Độc Lập – Đồi A1 – Mường Thanh), dùng khung phóng lớn lòng chảo kết hợp đường dẫn mảnh `.ek-leader` (≤ 120 px).

## 4. Chủ quyền lãnh thổ Việt Nam (BẮT BUỘC)

- Mọi bản đồ toàn cảnh Việt Nam đều phải thể hiện đầy đủ **Quần đảo Hoàng Sa** và **Quần đảo Trường Sa** thuộc chủ quyền Việt Nam (từ bộ dữ liệu Natural Earth góc nhìn Việt Nam `ne_10m_admin_0_countries_vnm`), kèm nhãn rõ ràng và không bị cắt mất.
- Khi bản đồ phóng lớn vào một chiến trường cục bộ (ví dụ: lòng chảo Điện Biên Phủ ở Tây Bắc, hay cửa sông Bạch Đằng), **bắt buộc** kèm một **ô bản đồ định vị Việt Nam thu nhỏ (inset)** ở góc khung, thể hiện đất liền Việt Nam cùng hai quần đảo Hoàng Sa, Trường Sa và chấm đánh dấu vị trí chiến trường.
