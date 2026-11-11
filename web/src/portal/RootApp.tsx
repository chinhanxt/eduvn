import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router";
import { api, ApiError, type Me } from "../api";
import { useAuth } from "../auth";
import { Callback, Login } from "../pages/Login";
import { loadSession } from "../student/session";
import { legacyRedirect, portalForRole } from "./entries";
import { GoTo } from "./Redirect";

const Play = lazy(() => import("../live/Play").then((m) => ({ default: m.Play })));

/** "/": đăng nhập Keycloak → theo vai trò (GV/owner/admin/assistant → /gv, còn lại → /hoc); chỉ có phiên HS P9a → /hoc/hs; chưa có → Đăng nhập. */
function Landing() {
  const { user, ready } = useAuth();
  const [to, setTo] = useState<string | null>(null);
  const [anon, setAnon] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      if (loadSession()) setTo("/hoc/hs");
      else setAnon(true);
      return;
    }
    let live = true;
    api<Me>("/api/me")
      .then((me) => live && setTo(portalForRole(me.role)))
      .catch((e: unknown) => {
        if (!live) return;
        // 401: phiên hỏng → đăng nhập lại; 403: không thuộc tổ chức nào với vai trò GV → cổng Học; lỗi khác: báo + thử lại.
        if (e instanceof ApiError && e.status === 401) setAnon(true);
        else if (e instanceof ApiError && e.status === 403) setTo("/hoc");
        else setErr(e instanceof Error ? e.message : "Lỗi");
      });
    return () => {
      live = false;
    };
  }, [ready, user]);
  if (to) return <GoTo here="index.html" to={to} />;
  if (anon) return <Login />;
  if (err)
    return (
      <div className="center">
        <p>Không tải được thông tin tài khoản: {err}</p>
        <button className="btn" onClick={() => window.location.reload()}>Thử lại</button>
      </div>
    );
  return <div className="center">…</div>;
}

function Fallback() {
  const { pathname, search, hash } = useLocation();
  const to = legacyRedirect(pathname);
  return <GoTo here="index.html" to={to ? `${to}${search}${hash}` : "/"} />;
}

/** Entry gốc index.html: đăng nhập, /callback, /choi (công khai, P11) và chuyển hướng đường cũ. */
export function RootApp() {
  return (
    <Suspense fallback={<div className="center">…</div>}>
      <Routes>
        <Route path="/callback" element={<Callback />} />
        <Route path="/choi" element={<Play />} />
        <Route index element={<Landing />} />
        <Route path="*" element={<Fallback />} />
      </Routes>
    </Suspense>
  );
}
