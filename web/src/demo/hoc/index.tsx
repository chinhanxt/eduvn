import type { ComponentType } from "react";
import { Route } from "react-router";
import type { NavEntry } from "../../ui/shell/nav";
import { lazyPage, registerPreload, type Page } from "../../ui/shell/routes";

/** Gói C (mô phỏng): tự học + AI hồ sơ ở cổng Học. Mỗi màn tải lười, không gọi server. */
const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));

const PAGES: [path: string, page: Page][] = [
  ["/hoc/ho-so", pick(() => import("./HoSo"), (m) => m.HoSo)],
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
];
