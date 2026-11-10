import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { loadSession } from "../../student/studentApi";
import { legacyRedirect } from "../entries";
import { HocLayout } from "../layouts";
import { LazyMathKeyboard } from "../MathKeyboardLazy";
import { goLogin } from "../needLogin";
import { GoTo } from "../Redirect";

const StudentApp = lazy(() => import("../../student/StudentApp").then((m) => ({ default: m.StudentApp })));
const P6Layout = lazy(() => import("../../hoc/HocLayout").then((m) => ({ default: m.HocLayout })));
const Books = lazy(() => import("../../hoc/Books").then((m) => ({ default: m.Books })));
const Paths = lazy(() => import("../../hoc/Paths").then((m) => ({ default: m.Paths })));
const Practice = lazy(() => import("../../hoc/Practice").then((m) => ({ default: m.Practice })));
const Tutor = lazy(() => import("../../hoc/Tutor").then((m) => ({ default: m.Tutor })));

/** Trang P6 cần Keycloak; chưa đăng nhập mà có phiên HS (mã lớp/PIN) → khu bài tập P9a, không thì đăng nhập. */
function NeedUser({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const hs = !user && ready && !!loadSession();
  useEffect(() => {
    if (ready && !user && !hs) goLogin();
  }, [ready, user, hs]);
  if (hs) return <Navigate to="/hoc/hs" replace />;
  if (!ready || !user) return <div className="center">…</div>;
  return <>{children}</>;
}

/** Link P9a cũ (/hs/…) bên trong StudentApp và đường lạ: đổi sang đường mới. */
function Legacy() {
  const { pathname, search, hash } = useLocation();
  const to = legacyRedirect(pathname);
  return <GoTo here="hoc.html" to={to ? `${to}${search}${hash}` : "/hoc"} />;
}

function PortalNav() {
  return (
    <nav className="hoc-tabs" aria-label="Cổng học">
      <NavLink to="/hoc/gia-su">Học</NavLink>
      <NavLink to="/hoc/hs">Bài tập</NavLink>
      <a href="/choi">Vào đấu trường</a>
    </nav>
  );
}

/** Cổng học sinh: P6 (/hoc/gia-su…) cho HS Keycloak, P9a (/hoc/hs/…) cho phiên HS. */
export function HocApp() {
  const { user } = useAuth();
  return (
    <HocLayout>
      {user && <PortalNav />}
      <Suspense fallback={<div className="center">…</div>}>
        <Routes>
          <Route path="/hoc/hs/*" element={<StudentApp />} />
          <Route path="/hoc" element={<NeedUser><P6Layout /></NeedUser>}>
            <Route index element={<Navigate to="gia-su" replace />} />
            <Route path="gia-su" element={<Tutor />} />
            <Route path="luyen-tap" element={<Practice />} />
            <Route path="lo-trinh" element={<Paths />} />
            <Route path="giao-trinh" element={<Books />} />
          </Route>
          <Route path="*" element={<Legacy />} />
        </Routes>
      </Suspense>
      <LazyMathKeyboard />
    </HocLayout>
  );
}
