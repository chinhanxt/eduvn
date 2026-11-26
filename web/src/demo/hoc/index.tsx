import type { ComponentType } from "react";
import { Route } from "react-router";
import { lazyPage, registerPreload, type Page } from "../../ui/shell/routes";

/** Gói C (mô phỏng): tự học + AI hồ sơ ở cổng Học. Mỗi màn tải lười, không gọi server. */
const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));

const PAGES: [path: string, page: Page][] = [
  ["/hoc/ho-so", pick(() => import("./HoSo"), (m) => m.HoSo)],
  ["/hoc/gia-su-hieu-minh", pick(() => import("./GiaSuHieuMinh"), (m) => m.GiaSuHieuMinh)],
  ["/hoc/lo-hong", pick(() => import("./LoHong"), (m) => m.LoHong)],
  ["/hoc/so-tay", pick(() => import("./SoTay"), (m) => m.SoTay)],
  ["/hoc/nghien-cuu", pick(() => import("./NghienCuu"), (m) => m.NghienCuu)],
  ["/hoc/doc-xem", pick(() => import("./DocXem"), (m) => m.DocXem)],
  ["/hoc/lich", pick(() => import("./Lich"), (m) => m.Lich)],
  ["/hoc/huong-nghiep", pick(() => import("./HuongNghiep"), (m) => m.HuongNghiep)],
  ["/hoc/tat-ca", pick(() => import("./TatCa"), (m) => m.TatCa)],
];

registerPreload(PAGES.map(([path, p]) => ({ path, preload: p.preload })));

/** Các Route mô phỏng, đặt trong <Route element={<HocShell />}>. */
export const hocDemoRoutes = () =>
  PAGES.map(([path, p]) => {
    const C = p.Component;
    return <Route key={path} path={path} element={<C />} />;
  });
