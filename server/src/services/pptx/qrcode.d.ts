// Kiểu tối thiểu cho qrcode@1.5.4 (chỉ dùng create → ma trận điểm).
declare module "qrcode" {
  export function create(text: string, opts?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }): { modules: { size: number; get(row: number, col: number): number | boolean } };
}
