import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Routes, useLocation, useParams } from "react-router";
import { Icon } from "../../ui/Icon";
import { MockBadge } from "../kit/MockBadge";
import { SCHOOL } from "../kit/world";
import { ConHomNay, ToiNay } from "./ConHomNay";
import { VIEWS, viewFor } from "./data";
import { useSpeak } from "./speak";
import { applyStoredTheme, toggleDark, useDark } from "./theme";

// Phần dưới màn (tuần, hỏi cô, Zalo, kèm ngay) tải sau để JS lần đầu nhẹ.
const Tuan = lazy(() => import("./KemCon").then((m) => ({ default: m.Tuan })));
const HoiCo = lazy(() => import("./KemCon").then((m) => ({ default: m.HoiCo })));
const Zalo = lazy(() => import("./KemCon").then((m) => ({ default: m.Zalo })));
const KemNgay = lazy(() => import("./KemCon").then((m) => ({ default: m.KemNgay })));
import "./ph.css";

const BIG_KEY = "eduvn-ph-big";

function ParentPage() {
  const { con } = useParams();
  const v = viewFor(con);
  const sp = useSpeak();
  const dark = useDark();
  const [big, setBig] = useState(() => {
    try {
      return localStorage.getItem(BIG_KEY) === "1";
    } catch {
      return false;
    }
  });
  const flipBig = () =>
    setBig((b) => {
      try {
        localStorage.setItem(BIG_KEY, b ? "0" : "1");
      } catch {
        /* bỏ qua */
      }
      return !b;
    });
  const [run, setRun] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    if (pathname.endsWith("/kem-con")) document.getElementById("kem-con")?.scrollIntoView({ block: "start" });
  }, [pathname]);
  useEffect(() => {
    setRun(false);
    sp.stop();
    document.title = `${v.child.short} hôm nay · EDUVN`;
  }, [v.slug]);

  return (
    <div className={big ? "ph xl" : "ph"}>
      <header className="ph-top">
        <span className="ph-brand">
          <span className="ph-mark" aria-hidden="true" />
          <span>{SCHOOL.name.replace("Trường ", "")}</span>
        </span>
        <span className="grow" />
        <button type="button" className="ph-tool aa" aria-pressed={big} onClick={flipBig} title="Chữ thật to">
          <span aria-hidden="true">A</span><span aria-hidden="true">A</span>
          <span className="sr">Chữ thật to</span>
        </button>
        <button type="button" className="ph-tool" onClick={toggleDark} title={dark ? "Nền sáng" : "Nền tối"}>
          <Icon name={dark ? "sun" : "moon"} />
          <span className="sr">Đổi nền sáng tối</span>
        </button>
      </header>

      <main className="ph-main">
        <div className="ph-c1">
          <ConHomNay v={v} sp={sp} />
          <Suspense fallback={null}>
            <Tuan v={v} />
          </Suspense>
        </div>
        <div className="ph-c2">
          <ToiNay v={v} sp={sp} onStart={() => setRun(true)} />
          <Suspense fallback={null}>
            <HoiCo v={v} sp={sp} />
            <Zalo v={v} />
          </Suspense>
        </div>
      </main>
      {run && (
        <Suspense fallback={null}>
          <KemNgay
            v={v}
            sp={sp}
            onClose={() => {
              sp.stop();
              setRun(false);
            }}
          />
        </Suspense>
      )}

      <footer className="ph-foot">
        <MockBadge />
        <nav aria-label="Xem như phụ huynh khác (bản mô phỏng)">
          {VIEWS.map((x) => (
            <Link key={x.slug} to={`/phu-huynh/${x.slug}`} aria-current={x.slug === v.slug ? "page" : undefined}>
              {x.relation} {x.child.short}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}

/** Cổng Phụ huynh (công khai, vào bằng link/QR): /phu-huynh/:con. */
export default function PhuHuynhApp() {
  useEffect(applyStoredTheme, []);
  return (
    <Routes>
      <Route index element={<ParentPage />} />
      <Route path=":con" element={<ParentPage />} />
      <Route path=":con/*" element={<ParentPage />} />
    </Routes>
  );
}
