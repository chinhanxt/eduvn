/** Mảnh dùng chung của Gói B: đầu trang có nhãn mô phỏng (nhịp chuyển động ở demo/kit/motion). */
import type { ReactNode } from "react";
import { usePageMeta } from "../../ui/shell/AppShell";
import { PageHead, type Primary } from "../../ui/shell/PageHead";
import { MockBadge } from "../kit";
import "./gv-lop.css";

export function Head({ title, tabs, primary, children }: { title: string; tabs?: ReactNode; primary?: Primary; children?: ReactNode }) {
  usePageMeta(title);
  return (
    <PageHead
      title={
        <span className="gl-h1">
          {title}
          <MockBadge />
        </span>
      }
      tabs={tabs}
      primary={primary}
    >
      {children}
    </PageHead>
  );
}
