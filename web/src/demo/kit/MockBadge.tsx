import "./demo.css";
/** Nhãn kín đáo cho màn mô phỏng (dữ liệu mẫu, không gọi server). */
export function MockBadge({ className }: { className?: string }) {
  return <span className={`demo-badge ${className ?? ""}`} title="Màn mô phỏng với dữ liệu mẫu">Bản mô phỏng</span>;
}
