import type React from "react";
import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

/** Số kiểu Việt: dấu phẩy thập phân. */
export const vn = (x: number, d = 1): string => x.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
/** 6,50 → "6,5"; 7,00 → "7". */
export const vnShort = (x: number): string => vn(x, 2).replace(/,?0+$/, "") || "0";
/** Cột có đầu bo 4 px, đáy vuông. */
export const colPath = (x: number, y: number, w: number, h: number, r = 4): string => {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
};
/** Thanh ngang đầu bo 4 px phía phải. */
export const barPath = (x: number, y: number, w: number, h: number, r = 4): string => {
  r = Math.min(r, w, h / 2);
  return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
};

/** Đo bề rộng thật của khung (ResizeObserver) để chữ trục luôn 12 px, không co giãn theo viewBox. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Khung biểu đồ: giữ chỗ đúng chiều cao trước khi đo (không xô lệch trang) + bản bảng tương đương. */
export function ChartFrame({ height, children, table, className }: { height: number; children: (w: number) => ReactNode; table?: ReactNode; className?: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  return (
    <div className={["chart-box", className].filter(Boolean).join(" ")}>
      <div ref={ref} style={{ minHeight: height }}>
        {w > 0 && children(w)}
      </div>
      {table}
    </div>
  );
}

/** <details> "Xem dạng bảng": cùng số liệu với biểu đồ cho trình đọc màn hình và người cần số chính xác. */
export function ChartTable({ caption, head, rows }: { caption: string; head: readonly string[]; rows: readonly (readonly (string | number)[])[] }) {
  return (
    <details className="chart-table">
      <summary>Xem dạng bảng</summary>
      <table>
        <caption className="sr">{caption}</caption>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={i ? "r" : undefined} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (j ? <td key={j} className="r">{c}</td> : <th key={j} scope="row" style={{ fontWeight: 400 }}>{c}</th>))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
