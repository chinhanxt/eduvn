import type { ComponentType } from "react";
import { lazyPage, type Page } from "../../ui/shell/routes";

/** Gói B (mô phỏng): Lớp học AI, công cụ, trợ lý ở cổng GV. Mỗi màn tải lười, không gọi server. */
const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));

/** Đường trong cổng GV (sau basename /gv) → trang mô phỏng; GvApp trải vào SHELL_ROUTES (tự có preload khi rê link). */
export const GV_LOP_ROUTES: { path: string; page: Page }[] = [
  { path: "/lop-hoc-ai", page: pick(() => import("./LopHocAi"), (m) => m.LopHocAi) },
  { path: "/ban-dong-hanh", page: pick(() => import("./BanDongHanh"), (m) => m.BanDongHanh) },
  { path: "/workbench", page: pick(() => import("./Workbench"), (m) => m.Workbench) },
  { path: "/kho-cong-cu", page: pick(() => import("./KhoCongCu"), (m) => m.KhoCongCu) },
  { path: "/giao-phan-hoa", page: pick(() => import("./GiaoPhanHoa"), (m) => m.GiaoPhanHoa) },
  { path: "/chong-chatgpt", page: pick(() => import("./ChongChatGpt"), (m) => m.ChongChatGpt) },
];
