import type { ReactNode } from "react";
import { MockBadge } from "../kit";
import { usePageMeta } from "../../ui/shell/AppShell";
import "./hoc-demo.css";

/** Đầu màn mô phỏng: tiêu đề serif lớn + nhãn Bản mô phỏng; bên phải là điều khiển/nút chính. */
export function DemoHead({ title, eyebrow, lead, children }: { title: string; eyebrow?: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  usePageMeta(title);
  return (
    <header className="dm-head">
      <div className="dm-head-t">
        {lead}
        <div>
          {eyebrow && <div className="dm-eyebrow">{eyebrow}</div>}
          <h1 className="dm-title">
            {title}
            <MockBadge />
          </h1>
        </div>
      </div>
      {children && <div className="dm-head-acts">{children}</div>}
    </header>
  );
}

/** Thanh mức tin cậy mảnh. */
export function Conf({ v, label = true }: { v: number; label?: boolean }) {
  return (
    <span className="dm-conf" title={`Tin cậy ${Math.round(v * 100)}%`}>
      <span className="tr"><i style={{ width: `${v * 100}%` }} /></span>
      {label && <b className="num">{Math.round(v * 100)}%</b>}
    </span>
  );
}

