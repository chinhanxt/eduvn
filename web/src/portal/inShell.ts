import { createContext } from "react";

/** true khi trang nằm trong khung cổng v2 (HocShell/GvShell) — đầu trang riêng của trang cũ (vd HsHead P9a) tự ẩn. */
export const InShellCtx = createContext(false);
