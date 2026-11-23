# Mô hình dữ liệu sự kiện lịch sử kiểu TimelineJS — EDUVN

Tài liệu chuẩn hoá dữ liệu cho skill `dong-thoi-gian-su-kien`, bộ dữ liệu trang `/hoc/su/dong-thoi-gian`, và bộ tự kiểm `server/src/subjects/su/verify.ts`.

Học theo cấu trúc JSON của [Knight Lab TimelineJS3](https://timeline.knightlab.com/docs/json-format.html) (MPL-2.0 — chỉ dùng mô hình dữ liệu, không dùng runtime tương tác của TimelineJS trong video), mở rộng thêm trường định vị bản đồ (`location_ids`), nhân vật (`figures`), và nguồn kiểm chứng (`wikidata_qid`, `sources`).

## 1. Cấu trúc tổng thể (`TimelineDataset`)

```json
{
  "title": {
    "text": {
      "headline": "Tiến trình Lịch sử Việt Nam theo CTGDPT 2018",
      "text": "Từ buổi đầu dựng nước đến công cuộc Đổi mới."
    }
  },
  "scale": "human",
  "eras": [
    {
      "id": "khang-chien-chong-phap",
      "start_date": { "year": 1945, "month": 9, "day": 2 },
      "end_date": { "year": 1954, "month": 7, "day": 21 },
      "text": { "headline": "Kháng chiến chống thực dân Pháp (1945–1954)" },
      "color": "doSon"
    }
  ],
  "events": [
    {
      "id": "chien-dich-dien-bien-phu-1954",
      "start_date": { "year": 1954, "month": 3, "day": 13, "display_date": "13/3/1954" },
      "end_date": { "year": 1954, "month": 5, "day": 7, "display_date": "7/5/1954" },
      "text": {
        "headline": "Chiến dịch Điện Biên Phủ",
        "text": "56 ngày đêm tiến công qua 3 đợt, kết thúc thắng lợi cuộc kháng chiến chống thực dân Pháp."
      },
      "group": "Kháng chiến chống Pháp",
      "era_id": "khang-chien-chong-phap",
      "grade": 12,
      "importance": 3,
      "location_ids": ["tuan-giao", "him-lam", "doi-doc-lap", "doi-a1", "muong-thanh", "dien-bien-phu"],
      "figures": ["vo-nguyen-giap", "ho-chi-minh"],
      "wikidata_qid": "Q604897",
      "sources": [
        { "kind": "wikidata", "qid": "Q604897", "label": "Battle of Dien Bien Phu" },
        { "kind": "sgk", "label": "SGK Lịch sử 12 (CTGDPT 2018), Chủ đề 3" }
      ]
    }
  ]
}
```

## 2. Quy ước trường thời gian (`TimelineDate`)

| Trường | Kiểu | Ý nghĩa | Quy tắc |
|---|---|---|---|
| `year` | số nguyên | Năm dương lịch; **năm âm** cho Trước Công nguyên (vd `-208` = 208 TCN, `-40` = 40 SCN dùng `+40`) | Bắt buộc. Không dùng năm 0 |
| `month` | `1..12` | Tháng (tuỳ chọn) | Chỉ ghi khi có nguồn xác thực |
| `day` | `1..31` | Ngày (tuỳ chọn) | Chỉ ghi khi có nguồn xác thực |
| `display_date` | chuỗi | Cách hiển thị chuẩn tiếng Việt (vd `"13/3 – 7/5/1954"`, `"Năm 938"`, `"Thế kỷ III TCN"`) | Ưu tiên định dạng `ngày/tháng/năm` Việt Nam |

## 3. Tính vị trí đúng tỉ lệ thật trên trục năm

- **Trục tuyến tính thật** (dùng cho video `dong-thoi-gian-su-kien`):
  - Chuyển mỗi `TimelineDate` sang năm thập phân: `y = year + ((month ?? 1) - 1) / 12 + ((day ?? 1) - 1) / 365`.
  - Toạ độ ngang: `x(y) = x0 + ((y - tu) / (den - tu)) * W`.
  - Mọi khoảng cách trên trục phải phản ánh đúng độ dài thời gian thật (ví dụ khoảng 1945–1954 = 9 năm phải hẹp hơn một nửa khoảng 1954–1975 = 21 năm).
  - Nếu có 2 mốc quá gần nhau trên cùng một trục (khoảng cách < 120 px ở 1080p), **giữ đúng vị trí chấm trên trục**, chỉ so le nhánh nhãn trên/dưới hoặc dùng đường dẫn ngắn để tránh chồng chữ.
- **Trục kéo/zoom trên trang web `/hoc/su/dong-thoi-gian`**:
  - Cho phép đổi tỉ lệ `pxPerYear` mượt theo con trỏ chuột (zoom từ toàn cảnh thiên niên kỷ ~0,4 px/năm đến cận cảnh từng tháng ~180 px/năm).
  - Đổi dải vạch chia tự động theo mức zoom: 500 năm → 100 năm → 50 năm → 10 năm → 5 năm → 1 năm → theo tháng.

## 4. Ánh xạ sang `data-ek-timeline` (kit v1)

Trong bài dựng HyperFrames (`anim-skills/su/dong-thoi-gian-su-kien`), dữ liệu sự kiện được rút gọn sang định dạng `data-ek-timeline` của `kit-api.md` §4.2:

```json
{
  "tu": 1945,
  "den": 1975,
  "buoc": 5,
  "thoiKy": [
    { "tu": 1945, "den": 1954, "nhan": "Kháng chiến chống Pháp" },
    { "tu": 1954, "den": 1975, "nhan": "Kháng chiến chống Mỹ" }
  ],
  "moc": [
    { "nam": 1945, "nhan": "Cách mạng tháng Tám" },
    { "nam": 1954, "nhan": "Điện Biên Phủ" },
    { "nam": 1968, "nhan": "Mậu Thân" },
    { "nam": 1975, "nhan": "Đại thắng mùa Xuân" }
  ]
}
```

## 5. Ràng buộc nguồn và kiểm chứng

- Mọi sự kiện trong bộ dữ liệu đều phải có ít nhất một nguồn trong `sources[]` (`wikidata` kèm QID, hoặc `sgk` / `tai-lieu-gv`).
- AI không bao giờ tự đặt năm tháng hay toạ độ mới ngoài nguồn; mọi sự kiện sinh bởi AI phải đi qua `server/src/subjects/su/verify.ts` để gắn trạng thái `"verified"` ("Đã kiểm"), `"mismatch"` ("Lệch — cần xem lại"), hoặc `"unchecked"`.
