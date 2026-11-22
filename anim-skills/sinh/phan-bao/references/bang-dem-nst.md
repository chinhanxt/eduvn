# Bảng đếm nhanh NST, crômatit và tâm động qua các kì phân bào

Quy chuẩn đối chiếu cho skill `phan-bao` (tính toán tất định khớp `server/src/subjects/sinh/cellDivision.ts`).

## Nguyên phân (từ 1 tế bào mẹ lưỡng bội $2n$)

| Kì | Số NST / tế bào | Trạng thái | Số crômatit | Số tâm động | Hàm lượng ADN | Số tế bào |
|---|---:|---|---:|---:|---:|---:|
| Trung gian (G1) | $2n$ | Đơn | $0$ | $2n$ | $2C$ | 1 |
| Trung gian (S–G2) | $2n$ | Kép | $4n$ | $2n$ | $4C$ | 1 |
| Kì đầu | $2n$ | Kép | $4n$ | $2n$ | $4C$ | 1 |
| Kì giữa | $2n$ | Kép | $4n$ | $2n$ | $4C$ | 1 |
| Kì sau | $4n$ | Đơn | $0$ | $4n$ | $4C$ | 1 |
| Kì cuối | $2n$ | Đơn | $0$ | $2n$ | $2C$ | 2 |

## Giảm phân (từ 1 tế bào mẹ lưỡng bội $2n$)

| Kì | Số NST / tế bào | Trạng thái | Số crômatit | Số tâm động | Hàm lượng ADN | Số tế bào |
|---|---:|---|---:|---:|---:|---:|
| Kì đầu I | $2n$ | Kép | $4n$ | $2n$ | $4C$ | 1 |
| Kì giữa I | $2n$ | Kép (2 hàng) | $4n$ | $2n$ | $4C$ | 1 |
| Kì sau I | $2n$ | Kép | $4n$ | $2n$ | $4C$ | 1 |
| Kì cuối I | $n$ | Kép | $2n$ | $n$ | $2C$ | 2 |
| Kì đầu II | $n$ | Kép | $2n$ | $n$ | $2C$ | 2 |
| Kì giữa II | $n$ | Kép (1 hàng) | $2n$ | $n$ | $2C$ | 2 |
| Kì sau II | $2n$ | Đơn | $0$ | $2n$ | $2C$ | 2 |
| Kì cuối II | $n$ | Đơn | $0$ | $n$ | $1C$ | 4 |
