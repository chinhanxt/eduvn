import { lazy, Suspense, useSyncExternalStore } from "react";
import { mathStore } from "./math/mathStore";
import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth";
import { Shell } from "./Shell";
import { Login, Callback } from "./pages/Login";
import { Home } from "./pages/Home";
import { Placeholder } from "./pages/Placeholder";
import { TOOLS } from "./tools";

const Bank = lazy(() => import("./pages/Bank").then((m) => ({ default: m.Bank })));
const Exams = lazy(() => import("./pages/Exams").then((m) => ({ default: m.Exams })));
const Grade = lazy(() => import("./pages/Grade").then((m) => ({ default: m.Grade })));
const Classes = lazy(() => import("./pages/Classes").then((m) => ({ default: m.Classes })));
const ClassDetailPage = lazy(() => import("./pages/Classes").then((m) => ({ default: m.ClassDetailPage })));
const Gradebook = lazy(() => import("./pages/Gradebook").then((m) => ({ default: m.Gradebook })));
const LessonDetailPage = lazy(() => import("./pages/Lessons").then((m) => ({ default: m.LessonDetailPage })));
const Lessons = lazy(() => import("./pages/Lessons").then((m) => ({ default: m.Lessons })));
const DeCuong = lazy(() => import("./pages/DeCuong").then((m) => ({ default: m.DeCuong })));
const VanBan = lazy(() => import("./pages/VanBan").then((m) => ({ default: m.VanBan })));
const Slides = lazy(() => import("./pages/Slides").then((m) => ({ default: m.Slides })));
const AiLessons = lazy(() => import("./pages/AiLessons").then((m) => ({ default: m.AiLessons })));
const AiLessonPage = lazy(() => import("./pages/AiLessonPage").then((m) => ({ default: m.AiLessonPage })));
const Boards = lazy(() => import("./pages/Boards").then((m) => ({ default: m.Boards })));
const BoardPage = lazy(() => import("./board/BoardPage").then((m) => ({ default: m.BoardPage })));
const Diagrams = lazy(() => import("./pages/Diagrams").then((m) => ({ default: m.Diagrams })));
const DiagramPage = lazy(() => import("./diagram/DiagramPage").then((m) => ({ default: m.DiagramPage })));
const Games = lazy(() => import("./pages/Games").then((m) => ({ default: m.Games })));
const Arena = lazy(() => import("./live/Host").then((m) => ({ default: m.Arena })));
const SessionPage = lazy(() => import("./live/Host").then((m) => ({ default: m.SessionPage })));
const HostScreen = lazy(() => import("./live/HostScreen").then((m) => ({ default: m.HostScreen })));
const Play = lazy(() => import("./live/Play").then((m) => ({ default: m.Play })));
const Connect = lazy(() => import("./pages/Connect").then((m) => ({ default: m.Connect })));
const MathKeyboard = lazy(() => import("./math/MathKeyboard").then((m) => ({ default: m.MathKeyboard })));
const Books = lazy(() => import("./hoc/Books").then((m) => ({ default: m.Books })));
const HocLayout = lazy(() => import("./hoc/HocLayout").then((m) => ({ default: m.HocLayout })));
const KhoTriThuc = lazy(() => import("./hoc/KhoTriThuc").then((m) => ({ default: m.KhoTriThuc })));
const Paths = lazy(() => import("./hoc/Paths").then((m) => ({ default: m.Paths })));
const Practice = lazy(() => import("./hoc/Practice").then((m) => ({ default: m.Practice })));
const Tutor = lazy(() => import("./hoc/Tutor").then((m) => ({ default: m.Tutor })));

export function App() {
  const { user, ready } = useAuth();
  return (
    <>
    <Suspense fallback={<div className="center">…</div>}>
    <Routes>
      <Route path="/callback" element={<Callback />} />
      <Route path="/choi" element={<Play />} />
      {!ready ? (
        <Route path="*" element={<div className="center">…</div>} />
      ) : !user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <>
        <Route path="bang-giang/:id" element={<BoardPage />} />
        <Route path="so-do/:id" element={<DiagramPage />} />
        <Route path="dau-truong/:pin" element={<HostScreen />} />
        <Route element={<Shell />}>
          <Route path="bang-giang" element={<Boards />} />
          <Route path="so-do" element={<Diagrams />} />
          <Route index element={<Home />} />
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
          <Route path="hoc" element={<HocLayout />}>
            <Route index element={<Navigate to="gia-su" replace />} />
            <Route path="gia-su" element={<Tutor />} />
            <Route path="luyen-tap" element={<Practice />} />
            <Route path="lo-trinh" element={<Paths />} />
            <Route path="giao-trinh" element={<Books />} />
          </Route>
          {TOOLS.filter((t) => t.pill && !["/gia-su", "/giao-trinh"].includes(t.to)).map((t) => (
            <Route key={t.to} path={t.to.slice(1)} element={<Placeholder tool={t} />} />
          ))}
          <Route path="to-chuc" element={<Placeholder tool={{ to: "/to-chuc", name: "Tổ chức", icon: "org", color: "amber", pill: "Sắp có" }} />} />
          <Route path="gia-su" element={<Navigate to="/hoc/gia-su" replace />} />
          <Route path="giao-trinh" element={<Navigate to="/hoc/giao-trinh" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        </>
      )}
    </Routes>
    </Suspense>
    {user && <LazyMathKeyboard />}
    </>
  );
}

/** Bàn phím toán chỉ tải (kèm MathLive) khi có ô toán đầu tiên được mở. */
let mathUsed = false;
function LazyMathKeyboard() {
  const active = useSyncExternalStore(mathStore.subscribe, mathStore.get);
  if (active) mathUsed = true;
  if (!mathUsed) return null;
  return (
    <Suspense fallback={null}>
      <MathKeyboard />
    </Suspense>
  );
}
