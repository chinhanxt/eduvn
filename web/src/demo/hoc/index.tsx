import type { ComponentType } from "react";
import { Route } from "react-router";
import type { NavEntry } from "../../ui/shell/nav";
import { lazyPage, registerPreload, type Page } from "../../ui/shell/routes";

/** Gói C (mô phỏng): tự học + AI hồ sơ ở cổng Học. Mỗi màn tải lười, không gọi server. */
const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));

const PAGES: [path: string, page: Page][] = [
  ["/hoc/ho-so", pick(() => import("./HoSo"), (m) => m.HoSo)],
  ["/hoc/gia-su-hieu-minh", pick(() => import("./GiaSuHieuMinh"), (m) => m.GiaSuHieuMinh)],
  ["/hoc/lo-hong", pick(() => import("./LoHong"), (m) => m.LoHong)],
  ["/hoc/so-tay", pick(() => import("./SoTay"), (m) => m.SoTay)],
  ["/hoc/nghien-cuu", pick(() => import("./NghienCuu"), (m) => m.NghienCuu)],
];

registerPreload(PAGES.map(([path, p]) => ({ path, preload: p.preload })));

/** Các Route mô phỏng, đặt trong <Route element={<HocShell />}>. */
export const hocDemoRoutes = () =>
  PAGES.map(([path, p]) => {
    const C = p.Component;
    return <Route key={path} path={path} element={<C />} />;
  });

/** Nhóm điều hướng "Tự học cùng AI" (thanh bên + ngăn kéo di động). */
export const HOC_DEMO_NAV: NavEntry[] = [
  { group: "Tự học cùng AI" },
  { to: "/hoc/ho-so", label: "Hồ sơ AI", icon: "user" },
  { to: "/hoc/gia-su-hieu-minh", label: "Gia sư hiểu mình", icon: "bot" },
  { to: "/hoc/lo-hong", label: "Vòng lỗ hổng", icon: "repeat" },
  { to: "/hoc/so-tay", label: "Sổ tay", icon: "book" },
  { to: "/hoc/nghien-cuu", label: "Nghiên cứu sâu", icon: "search" },
];
