import { lazy, Suspense, useEffect } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router";
import { ToastProvider } from "../../ui/components/Toast";
import { Icon } from "../../ui/Icon";
import { SCHOOL } from "../kit/world";
import { applyStoredTheme, toggleDark, useDark } from "../phu-huynh/theme";
import "./tr.css";

const PRINCIPAL = SCHOOL.principal.replace(/^thầy /, "");

const ToanTruong = lazy(() => import("./ToanTruong"));
const SucKhoe = lazy(() => import("./SucKhoe"));
const QuanTri = lazy(() => import("./QuanTri"));
const TroLy = lazy(() => import("./TroLy"));

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
  const dark = useDark();
  const { pathname } = useLocation();
  useEffect(applyStoredTheme, []);
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
              <b>{SCHOOL.name.replace("Trường Liên cấp ", "")}</b>
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
            <span className="tr-av" aria-hidden="true">{PRINCIPAL.split(" ").slice(-2).map((w) => w[0]).join("")}</span>
            <span className="tr-mename">
              <b>{PRINCIPAL}</b>
              <small>Hiệu trưởng</small>
            </span>
          </div>
        </div>
        <div className="tr-body">
          <header className="tr-top">
            <span className="tr-school">{SCHOOL.name}</span>
            <span className="grow" />
            <button type="button" className="btn ghost icon" onClick={toggleDark} aria-label="Đổi nền sáng tối">
              <Icon name={dark ? "sun" : "moon"} />
            </button>
          </header>
          <main className="tr-main">
            <Suspense fallback={<Skel />}>
              <Routes>
                <Route index element={<ToanTruong />} />
                <Route path="suc-khoe" element={<SucKhoe />} />
                <Route path="quan-tri" element={<QuanTri />} />
                <Route path="tro-ly" element={<TroLy />} />
                <Route path="*" element={<ToanTruong />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
