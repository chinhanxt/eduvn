import { type ComponentType, lazy, type ReactNode, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "../../auth";
import { ToastProvider } from "../../ui/components/Toast";
import { prefetch } from "../../ui/data/query";
import { PageSkeleton } from "../../ui/shell/PageSkeleton";
import { lazyPage, preloadPath, registerPreload, type Page } from "../../ui/shell/routes";
import { LazyMathKeyboard } from "../MathKeyboardLazy";
import { goLogin } from "../needLogin";
import { fetchHocToday, HOC_TODAY_KEY } from "./data";
import { HocShell, useLearner } from "./HocShell";

const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));
// Trang P6 dùng hoc.css (trước đây nạp qua HocLayout cũ).
const p6 = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => pick(() => Promise.all([load(), import("../../hoc/hoc.css")]).then(([m]) => m), f);

const P = {
  homNay: pick(() => import("./HomNay"), (m) => m.HomNay),
  student: pick(() => import("../../student/StudentApp"), (m) => m.StudentApp),
  tutor: p6(() => import("../../hoc/Tutor"), (m) => m.Tutor),
  practice: p6(() => import("../../hoc/Practice"), (m) => m.Practice),
  paths: p6(() => import("../../hoc/Paths"), (m) => m.Paths),
  books: p6(() => import("../../hoc/Books"), (m) => m.Books),
};

registerPreload([
  {
    path: "/hoc",
    preload: P.homNay.preload,
    data: () => {
      const s = window.localStorage.getItem("eduvn.hs");
      // tài khoản Keycloak ưu tiên; không thì phiên mã lớp
      const auth = Object.keys(window.localStorage).some((k) => k.startsWith("oidc.user:")) ? "user" : s ? "hs" : null;
      if (auth) void prefetch(`${HOC_TODAY_KEY}:${auth}`, fetchHocToday(auth));
    },
  },
  { path: "/hoc/hs/*", preload: P.student.preload },
  { path: "/hoc/gia-su", preload: P.tutor.preload },
  { path: "/hoc/luyen-tap", preload: P.practice.preload },
  { path: "/hoc/lo-trinh", preload: P.paths.preload },
  { path: "/hoc/giao-trinh", preload: P.books.preload },
]);

// Mở thẳng /hoc: tải code + dữ liệu Hôm nay ngay khi entry chạy.
if (/^\/hoc\/?$/.test(window.location.pathname)) preloadPath("/hoc");

const L = ({ children }: { children: ReactNode }) => <div className="legacy">{children}</div>;

/** Hôm nay: cần tài khoản hoặc phiên mã lớp; chưa có → đăng nhập bằng mã lớp (P9a, có nút tài khoản). */
function NeedLearner({ children }: { children: ReactNode }) {
  const { ready, auth } = useLearner();
  if (!ready) return <PageSkeleton />;
  if (!auth) return <Navigate to="/hoc/hs" replace />;
  return <>{children}</>;
}

/** Trang P6 cần Keycloak; chỉ có phiên mã lớp → khu Bài tập; chưa đăng nhập → đăng nhập. */
function NeedUser({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const { session } = useLearner();
  useEffect(() => {
    if (ready && !user && !session) goLogin();
  }, [ready, user, session]);
  if (ready && !user && session) return <Navigate to="/hoc/hs" replace />;
  if (!ready || !user) return <PageSkeleton />;
  return <L>{children}</L>;
}

const Legacy = lazy(() => import("./LegacyHoc").then((m) => ({ default: m.LegacyHoc })));

/** Cổng học sinh /hoc: Hôm nay + P6 (gia sư, luyện tập, lộ trình, giáo trình) cho tài khoản, P9a (/hoc/hs/…) cho cả phiên mã lớp. */
export function HocApp() {
  const H = P.homNay.Component;
  const S = P.student.Component;
  const T = P.tutor.Component;
  const Pr = P.practice.Component;
  const Pa = P.paths.Component;
  const B = P.books.Component;
  return (
    <ToastProvider>
      <Routes>
        <Route element={<HocShell />}>
          <Route path="/hoc" element={<NeedLearner><H /></NeedLearner>} />
          <Route path="/hoc/hs/*" element={<L><S /></L>} />
          <Route path="/hoc/gia-su" element={<NeedUser><T /></NeedUser>} />
          <Route path="/hoc/luyen-tap" element={<NeedUser><Pr /></NeedUser>} />
          <Route path="/hoc/lo-trinh" element={<NeedUser><Pa /></NeedUser>} />
          <Route path="/hoc/giao-trinh" element={<NeedUser><B /></NeedUser>} />
        </Route>
        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><Legacy /></Suspense>} />
      </Routes>
      <LazyMathKeyboard />
    </ToastProvider>
  );
}
