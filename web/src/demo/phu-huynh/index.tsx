import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router";
import { Icon } from "../../ui/Icon";
import { viewFor } from "./data";
import { HomNay } from "./HomNay";
import { useSpeak } from "./speak";
import { applyStoredTheme } from "./theme";
import "./ph.css";

// Tab phụ, kèm con và cài đặt tải sau: JS lần đầu chỉ có màn Hôm nay.
const Tuan = lazy(() => import("./Tuan"));
const HoiCo = lazy(() => import("./HoiCo"));
const KemNgay = lazy(() => import("./KemNgay"));
const CaiDat = lazy(() => import("./CaiDat"));

const BIG_KEY = "eduvn-ph-big";
const readBig = () => {
  try {
    return localStorage.getItem(BIG_KEY) === "1";
  } catch {
    return false;
  }
};

function Shell() {
  const { con } = useParams();
  const v = viewFor(con);
  const sp = useSpeak();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const base = `/phu-huynh/${v.slug}`;
  const kem = pathname.endsWith("/kem-con");
  const [big, setBig] = useState(readBig);
  const [set, setSet] = useState(false);

  useEffect(() => {
    sp.stop();
    document.title = `${v.child.short} hôm nay`;
    window.scrollTo(0, 0);
    // sp ổn định (useCallback): chỉ dừng đọc khi đổi trang
  }, [pathname]);

  const flipBig = () =>
    setBig((b) => {
      try {
        localStorage.setItem(BIG_KEY, b ? "0" : "1");
      } catch {
        /* chỉ đổi trong phiên */
      }
      return !b;
    });

  return (
    <div className={big ? "ph xl" : "ph"}>
      <div className="ph-app">
        <header className="ph-top">
          <p className="ph-hello">Chào {v.hi}</p>
          <button type="button" className="ph-set" onClick={() => setSet(true)}>
            <Icon name="sliders" />
            <span>Cài đặt</span>
          </button>
        </header>

        <main className="ph-main">
          <Suspense fallback={<div className="ph-wait" />}>
            <Routes>
              <Route index element={<HomNay v={v} sp={sp} onKem={() => nav(`${base}/kem-con`)} />} />
              <Route path="kem-con" element={<HomNay v={v} sp={sp} onKem={() => nav(`${base}/kem-con`)} />} />
              <Route path="tuan" element={<Tuan v={v} sp={sp} />} />
              <Route path="hoi-co" element={<HoiCo v={v} sp={sp} />} />
              <Route path="*" element={<Navigate to={base} replace />} />
            </Routes>
          </Suspense>
        </main>

        <nav className="ph-tabs" aria-label="Các mục">
          <NavLink to={base} end>
            <Icon name="home" />
            <span>Hôm nay</span>
          </NavLink>
          <NavLink to={`${base}/tuan`}>
            <Icon name="cal" />
            <span>Tuần này</span>
          </NavLink>
          <NavLink to={`${base}/hoi-co`}>
            <Icon name="mic" />
            <span>Hỏi cô</span>
          </NavLink>
        </nav>
      </div>

      {kem && (
        <Suspense fallback={null}>
          <KemNgay v={v} sp={sp} onClose={() => nav(base, { replace: true })} />
        </Suspense>
      )}
      {set && (
        <Suspense fallback={null}>
          <CaiDat v={v} big={big} onBig={flipBig} onClose={() => setSet(false)} />
        </Suspense>
      )}
    </div>
  );
}

/** Cổng Phụ huynh (công khai, vào bằng link/QR): /phu-huynh/:con[/tuan|/hoi-co|/kem-con]. */
export default function PhuHuynhApp() {
  useEffect(applyStoredTheme, []);
  return (
    <Routes>
      <Route index element={<Navigate to={`/phu-huynh/${viewFor(undefined).slug}`} replace />} />
      <Route path=":con/*" element={<Shell />} />
    </Routes>
  );
}
