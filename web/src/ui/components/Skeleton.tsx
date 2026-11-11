import type { CSSProperties } from "react";

/** Khối giữ chỗ (cùng hình nội dung thật để không xô lệch khi dữ liệu về). */
export function Skeleton({ w, h = 12, circle, style, className }: { w?: number | string; h?: number | string; circle?: boolean; style?: CSSProperties; className?: string }) {
  return <span className={["skel", circle && "circle", className].filter(Boolean).join(" ")} aria-hidden="true" style={{ display: "block", width: w, height: h, ...style }} />;
}

const W1 = [72, 54, 64, 46];
const W2 = [38, 30, 44, 26];
/** Danh sách giữ chỗ: hàng = chấm + 2 dòng + giá trị (như mockup trạng thái "Đang tải"). */
export function SkeletonRows({ rows = 4, label = "Đang tải" }: { rows?: number; label?: string }) {
  return (
    <div className="skel-list" aria-busy="true" aria-label={label} role="status">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skel-row" key={i}>
          <Skeleton circle w={28} h={28} />
          <div style={{ flex: 1 }}>
            <Skeleton className="line" w={`${W1[i % 4]}%`} />
            <Skeleton className="line" w={`${W2[i % 4]}%`} h={8} />
          </div>
          <Skeleton className="line" w={56} />
        </div>
      ))}
    </div>
  );
}
