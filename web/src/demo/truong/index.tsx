import { lazy, Suspense, useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router";
import { Icon, ToastProvider } from "../../ui";
import { THEME_KEY, toggleTheme, useTheme } from "../../ui/shell/theme";
import { MockBadge, SCHOOL } from "../kit";
import "./tr.css";

const ToanTruong = lazy(() => import("./ToanTruong"));
const SucKhoe = lazy(() => import("./SucKhoe"));
const QuanTri = lazy(() => import("./QuanTri"));

const NAV = [
  { to: "/truong", label: "Toàn trường", icon: "chart", end: true },
  { to: "/truong/suc-khoe", label: "Sức khoẻ", icon: "shield" },
  { to: "/truong/quan-tri", label: "Quản trị", icon: "users" },
  { to: "/truong/tro-ly", label: "Trợ lý AI", icon: "bot" },
];

function Skel() {
  return (
    <div className="tr-skel" aria-busy="true">
      <i /><i /><i />
    </div>
  );
}

/** Cổng Nhà trường (ban giám hiệu) — mô phỏng, công khai: /truong/*. */
export default function TruongApp() {
  const theme = useTheme();
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      const t = localStorage.getItem(THEME_KEY);
      if (t === "dark" || t === "light") document.documentElement.dataset.theme = t;
    } catch {
      /* bỏ qua */
    }
  }, []);
  useEffect(() => {
    const it = NAV.find((n) => (n.end ? pathname.replace(/\/$/, "") === n.to : pathname.startsWith(n.to)));
    document.title = `${it?.label ?? "Nhà trường"} · ${SCHOOL.name}`;
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <ToastProvider>
      <div className="tr">
        <div className="tr-side">
          <div className="tr-brand">
            <span className="tr-mark" aria-hidden="true" />
            <span className="tr-bname">
              <b>Bình Minh</b>
              <small>Nhà trường</small>
            </span>
          </div>
          <div className="tr-nav" role="navigation" aria-label="Cổng nhà trường">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}>
                <Icon name={n.icon} />
                <span>{n.label}</span>
              </NavLink>
            ))}
          </div>
          <div className="tr-me">
            <span className="tr-av" aria-hidden="true">TC</span>
            <span className="tr-mename">
              <b>Lý Thành Công</b>
              <small>Hiệu trưởng</small>
            </span>
          </div>
        </div>
        <div className="tr-body">
          <header className="tr-top">
            <span className="tr-school">{SCHOOL.name}</span>
            <span className="grow" />
            <MockBadge />
            <button type="button" className="btn ghost icon" onClick={toggleTheme} aria-label="Đổi nền sáng tối">
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
          </header>
          <main className="tr-main">
            <Suspense fallback={<Skel />}>
              <Routes>
                <Route index element={<ToanTruong />} />
                <Route path="suc-khoe" element={<SucKhoe />} />
                <Route path="quan-tri" element={<QuanTri />} />
                <Route path="*" element={<ToanTruong />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
