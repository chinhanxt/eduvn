import type { ReactNode } from "react";

/** Khung tạm của cổng GV — GvShell thật (web/src/ui/) sẽ thay. */
export function GvLayout({ children }: { children: ReactNode }) {
  return <div data-portal="gv">{children}</div>;
}

/** Khung tạm của cổng Học — HocShell thật (web/src/ui/) sẽ thay. */
export function HocLayout({ children }: { children: ReactNode }) {
  return <div data-portal="hoc">{children}</div>;
}
