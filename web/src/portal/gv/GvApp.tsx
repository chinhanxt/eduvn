import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { Shell } from "../../Shell";
import { Home } from "../../pages/Home";
import { Placeholder } from "../../pages/Placeholder";
import { TOOLS } from "../../tools";
import { GvLayout } from "../layouts";
import { LazyMathKeyboard } from "../MathKeyboardLazy";
import { goLogin } from "../needLogin";

const Bank = lazy(() => import("../../pages/Bank").then((m) => ({ default: m.Bank })));
const Exams = lazy(() => import("../../pages/Exams").then((m) => ({ default: m.Exams })));
const Grade = lazy(() => import("../../pages/Grade").then((m) => ({ default: m.Grade })));
const Classes = lazy(() => import("../../pages/Classes").then((m) => ({ default: m.Classes })));
const ClassDetailPage = lazy(() => import("../../pages/Classes").then((m) => ({ default: m.ClassDetailPage })));
const Gradebook = lazy(() => import("../../pages/Gradebook").then((m) => ({ default: m.Gradebook })));
const LessonDetailPage = lazy(() => import("../../pages/Lessons").then((m) => ({ default: m.LessonDetailPage })));
const Lessons = lazy(() => import("../../pages/Lessons").then((m) => ({ default: m.Lessons })));
const DeCuong = lazy(() => import("../../pages/DeCuong").then((m) => ({ default: m.DeCuong })));
const VanBan = lazy(() => import("../../pages/VanBan").then((m) => ({ default: m.VanBan })));
const Slides = lazy(() => import("../../pages/Slides").then((m) => ({ default: m.Slides })));
const AiLessons = lazy(() => import("../../pages/AiLessons").then((m) => ({ default: m.AiLessons })));
const AiLessonPage = lazy(() => import("../../pages/AiLessonPage").then((m) => ({ default: m.AiLessonPage })));
const Boards = lazy(() => import("../../pages/Boards").then((m) => ({ default: m.Boards })));
const BoardPage = lazy(() => import("../../board/BoardPage").then((m) => ({ default: m.BoardPage })));
const Diagrams = lazy(() => import("../../pages/Diagrams").then((m) => ({ default: m.Diagrams })));
const DiagramPage = lazy(() => import("../../diagram/DiagramPage").then((m) => ({ default: m.DiagramPage })));
const Games = lazy(() => import("../../pages/Games").then((m) => ({ default: m.Games })));
const Arena = lazy(() => import("../../live/Host").then((m) => ({ default: m.Arena })));
const SessionPage = lazy(() => import("../../live/Host").then((m) => ({ default: m.SessionPage })));
const HostScreen = lazy(() => import("../../live/HostScreen").then((m) => ({ default: m.HostScreen })));
const Connect = lazy(() => import("../../pages/Connect").then((m) => ({ default: m.Connect })));
const KhoTriThuc = lazy(() => import("../../hoc/KhoTriThuc").then((m) => ({ default: m.KhoTriThuc })));

/** Đường ngoài cổng GV (link P6 /hoc/*, /hs/*, /choi): tải entry khác. Còn lại về trang chủ GV. */
function OutOfGv() {
  const { pathname, search, hash } = useLocation();
  const out = /^\/(hoc|hs|choi)(\/|$)/.test(pathname);
  useEffect(() => {
    if (out) window.location.replace(`${pathname}${search}${hash}`);
  }, [out, pathname, search, hash]);
  return out ? <div className="center">…</div> : <Navigate to="/" replace />;
}

/** Cổng giáo viên — BrowserRouter basename="/gv": link cũ "/ngan-hang" trong trang hiện có tự thành /gv/ngan-hang. */
export function GvApp() {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready && !user) goLogin();
  }, [ready, user]);
  if (!ready || !user) return <div className="center">…</div>;
  return (
    <GvLayout>
      <Suspense fallback={<div className="center">…</div>}>
        <Routes>
          <Route path="bang-giang/:id" element={<BoardPage />} />
          <Route path="so-do/:id" element={<DiagramPage />} />
          <Route path="dau-truong/:pin" element={<HostScreen />} />
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="bang-giang" element={<Boards />} />
            <Route path="so-do" element={<Diagrams />} />
            <Route path="ngan-hang" element={<Bank />} />
            <Route path="de-thi" element={<Exams />} />
            <Route path="cham-bai" element={<Grade />} />
            <Route path="lop-hoc" element={<Classes />} />
            <Route path="lop-hoc/:id" element={<ClassDetailPage />} />
            <Route path="so-diem" element={<Gradebook />} />
            <Route path="giao-an" element={<Lessons />} />
            <Route path="giao-an/:id" element={<LessonDetailPage />} />
            <Route path="de-cuong" element={<DeCuong />} />
            <Route path="slide" element={<Slides />} />
            <Route path="bai-giang-ai" element={<AiLessons />} />
            <Route path="bai-giang-ai/:id" element={<AiLessonPage />} />
            <Route path="tro-choi" element={<Games />} />
            <Route path="dau-truong" element={<Arena />} />
            <Route path="dau-truong/phien/:id" element={<SessionPage />} />
            <Route path="van-ban" element={<VanBan />} />
            <Route path="ket-noi" element={<Connect />} />
            <Route path="kho-tri-thuc" element={<KhoTriThuc />} />
            {TOOLS.filter((t) => t.pill && !t.to.startsWith("/hoc/")).map((t) => (
              <Route key={t.to} path={t.to.slice(1)} element={<Placeholder tool={t} />} />
            ))}
            <Route path="to-chuc" element={<Placeholder tool={{ to: "/to-chuc", name: "Tổ chức", icon: "org", color: "amber", pill: "Sắp có" }} />} />
          </Route>
          <Route path="*" element={<OutOfGv />} />
        </Routes>
      </Suspense>
      <LazyMathKeyboard />
    </GvLayout>
  );
}
