import { type ComponentType, lazy, type ReactNode, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { HOC_PATH, hocV2Path } from "../../student/paths";
import { ToastProvider } from "../../ui/components/Toast";
import { prefetch } from "../../ui/data/query";
import { request } from "../../ui/data/http";
import { PageSkeleton } from "../../ui/shell/PageSkeleton";
import { lazyPage, preloadPath, registerPreload, type Page } from "../../ui/shell/routes";
import { LazyMathKeyboard } from "../MathKeyboardLazy";
import { goLogin } from "../needLogin";
import { fetchHocToday, HOC_TODAY_KEY } from "./data";
import { HocShell, useLearner } from "./HocShell";

const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));
// Trang P6 chưa restyle dùng hoc.css (trước đây nạp qua HocLayout cũ).
const p6 = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => pick(() => Promise.all([load(), import("../../hoc/hoc.css")]).then(([m]) => m), f);

const P = {
  homNay: pick(() => import("./HomNay"), (m) => m.HomNay),
  baiTap: pick(() => import("../../student/StudentApp"), (m) => m.BaiTap),
  qr: pick(() => import("../../student/StudentLogin"), (m) => m.QrLogin),
  lamBai: pick(() => import("../../student/ExamRoom"), (m) => m.ExamRoom),
  ketQua: pick(() => import("./KetQua"), (m) => m.KetQua),
  ketQuaBai: pick(() => import("../../student/ResultPage"), (m) => m.ResultPage),
  tutor: p6(() => import("../../hoc/Tutor"), (m) => m.Tutor),
  practice: pick(() => import("../../hoc/Practice"), (m) => m.Practice),
  paths: pick(() => import("../../hoc/Paths"), (m) => m.Paths),
  books: p6(() => import("../../hoc/Books"), (m) => m.Books),
};

const hasHs = () => !!window.localStorage.getItem("eduvn.hs");
const ASG = "hoc/bai-tap"; // = student/data.ts ASG_KEY (không import để khỏi kéo cả module vào entry)
const prefetchAsg = () => hasHs() && void prefetch(ASG, (signal) => request("/api/student/assignments", { signal, auth: "hs" }));
registerPreload([
  {
    path: "/hoc",
    preload: P.homNay.preload,
    data: () => {
      // tài khoản Keycloak ưu tiên; không thì phiên mã lớp
      const auth = Object.keys(window.localStorage).some((k) => k.startsWith("oidc.user:")) ? "user" : hasHs() ? "hs" : null;
      if (auth) void prefetch(`${HOC_TODAY_KEY}:${auth}`, fetchHocToday(auth));
    },
  },
  { path: HOC_PATH.baiTap, preload: P.baiTap.preload, data: prefetchAsg },
  { path: "/hoc/lam-bai/:id", preload: P.lamBai.preload },
  { path: "/hoc/ket-qua", preload: P.ketQua.preload, data: prefetchAsg },
  { path: "/hoc/ket-qua/:sid", preload: P.ketQuaBai.preload },
  { path: "/hoc/gia-su", preload: P.tutor.preload },
  { path: "/hoc/luyen-tap", preload: P.practice.preload },
  { path: "/hoc/lo-trinh", preload: P.paths.preload },
  { path: "/hoc/giao-trinh", preload: P.books.preload },
]);

// Mở thẳng một trang: tải code + dữ liệu ngay khi entry chạy.
if (/^\/hoc(\/(bai-tap|ket-qua))?\/?$/.test(window.location.pathname)) preloadPath(window.location.pathname.replace(/\/$/, "") || "/hoc");

const L = ({ children }: { children: ReactNode }) => <div className="legacy">{children}</div>;

/** Hôm nay: cần tài khoản hoặc phiên mã lớp; chưa có → vào lớp bằng mã lớp (có nút tài khoản). */
function NeedLearner({ children }: { children: ReactNode }) {
  const { ready, auth } = useLearner();
  if (!ready) return <PageSkeleton />;
  if (!auth) return <Navigate to={HOC_PATH.baiTap} replace />;
  return <>{children}</>;
}

/** Làm bài + kết quả: cần phiên mã lớp (tài khoản vào lớp bằng mã tham gia cũng nhận phiên này). */
function NeedHs({ children }: { children: ReactNode }) {
  const { session } = useLearner();
  if (!session) return <Navigate to={HOC_PATH.baiTap} replace />;
  return <>{children}</>;
}

/** Trang P6 cần Keycloak; chỉ có phiên mã lớp → khu Bài tập; chưa đăng nhập → đăng nhập. */
function NeedUser({ children, legacy }: { children: ReactNode; legacy?: boolean }) {
  const { user, ready } = useAuth();
  const { session } = useLearner();
  useEffect(() => {
    if (ready && !user && !session) goLogin();
  }, [ready, user, session]);
  if (ready && !user && session) return <Navigate to={HOC_PATH.baiTap} replace />;
  if (!ready || !user) return <PageSkeleton />;
  return legacy ? <L>{children}</L> : <>{children}</>;
}

/** /hoc/hs/… (P9a, link cũ + thẻ QR cũ qua /hs/qr) → đường v2, giữ query + hash. */
function OldHs() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={`${hocV2Path(pathname) ?? HOC_PATH.baiTap}${search}${hash}`} replace />;
}

const Legacy = lazy(() => import("./LegacyHoc").then((m) => ({ default: m.LegacyHoc })));

/** Cổng học sinh /hoc: Hôm nay, Bài tập/Làm bài/Kết quả (phiên mã lớp), Luyện tập, Gia sư, Giáo trình, Lộ trình (tài khoản). */
export function HocApp() {
  const H = P.homNay.Component;
  const BT = P.baiTap.Component;
  const QR = P.qr.Component;
  const LB = P.lamBai.Component;
  const KQ = P.ketQua.Component;
  const KQB = P.ketQuaBai.Component;
  const T = P.tutor.Component;
  const Pr = P.practice.Component;
  const Pa = P.paths.Component;
  const B = P.books.Component;
  return (
    <ToastProvider>
      <Routes>
        <Route element={<HocShell />}>
          <Route path="/hoc" element={<NeedLearner><H /></NeedLearner>} />
          <Route path={HOC_PATH.baiTap} element={<BT />} />
          <Route path={HOC_PATH.qr} element={<QR />} />
          <Route path="/hoc/lam-bai/:id" element={<NeedHs><LB /></NeedHs>} />
          <Route path="/hoc/ket-qua" element={<NeedLearner><KQ /></NeedLearner>} />
          <Route path="/hoc/ket-qua/:sid" element={<NeedHs><KQB /></NeedHs>} />
          <Route path="/hoc/hs/*" element={<OldHs />} />
          <Route path="/hoc/hs" element={<OldHs />} />
          <Route path="/hoc/gia-su" element={<NeedUser legacy><T /></NeedUser>} />
          <Route path="/hoc/luyen-tap" element={<NeedUser><Pr /></NeedUser>} />
          <Route path="/hoc/lo-trinh" element={<NeedUser><Pa /></NeedUser>} />
          <Route path="/hoc/giao-trinh" element={<NeedUser legacy><B /></NeedUser>} />
        </Route>
        <Route path="*" element={<Suspense fallback={<PageSkeleton />}><Legacy /></Suspense>} />
      </Routes>
      <LazyMathKeyboard />
    </ToastProvider>
  );
}
