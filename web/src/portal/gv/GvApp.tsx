import { type ComponentType, type ReactNode, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { ToastProvider } from "../../ui/components/Toast";
import { prefetch } from "../../ui/data/query";
import { PageSkeleton } from "../../ui/shell/PageSkeleton";
import { lazyPage, preloadPath, registerPreload, type Page } from "../../ui/shell/routes";
import { GV_LOP_ROUTES } from "../../demo/gv-lop";
import { LazyMathKeyboard } from "../MathKeyboardLazy";
import { goLogin } from "../needLogin";
import { fetchGvToday, GV_TODAY_KEY } from "./data";
import { GvShell } from "./GvShell";

const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));

const P = {
  homNay: pick(() => import("./HomNay"), (m) => m.HomNay),
  congCu: pick(() => import("./CongCu"), (m) => m.CongCu),
  bank: pick(() => import("../../pages/Bank"), (m) => m.Bank),
  exams: pick(() => import("../../pages/Exams"), (m) => m.Exams),
  grade: pick(() => import("../../pages/Grade"), (m) => m.Grade),
  photoGrade: pick(() => import("../../pages/PhotoGrade"), (m) => m.PhotoGrade),
  classes: pick(() => import("../../pages/Classes"), (m) => m.Classes),
  classDetail: pick(() => import("../../pages/Classes"), (m) => m.ClassDetailPage),
  gradebook: pick(() => import("../../pages/Gradebook"), (m) => m.Gradebook),
  lessons: pick(() => import("../../pages/Lessons"), (m) => m.Lessons),
  lessonDetail: pick(() => import("../../pages/Lessons"), (m) => m.LessonDetailPage),
  deCuong: pick(() => import("../../pages/DeCuong"), (m) => m.DeCuong),
  vanBan: pick(() => import("../../pages/VanBan"), (m) => m.VanBan),
  slides: pick(() => import("../../pages/Slides"), (m) => m.Slides),
  aiLessons: pick(() => import("../../pages/AiLessons"), (m) => m.AiLessons),
  aiLesson: pick(() => import("../../pages/AiLessonPage"), (m) => m.AiLessonPage),
  boards: pick(() => import("../../pages/Boards"), (m) => m.Boards),
  board: pick(() => import("../../board/BoardPage"), (m) => m.BoardPage),
  diagrams: pick(() => import("../../pages/Diagrams"), (m) => m.Diagrams),
  diagram: pick(() => import("../../diagram/DiagramPage"), (m) => m.DiagramPage),
  games: pick(() => import("../../pages/Games"), (m) => m.Games),
  arena: pick(() => import("../../live/Host"), (m) => m.Arena),
  session: pick(() => import("../../live/Host"), (m) => m.SessionPage),
  hostScreen: pick(() => import("../../live/HostScreen"), (m) => m.HostScreen),
  connect: pick(() => import("../../pages/Connect"), (m) => m.Connect),
  // trang P6 dùng hoc.css (trước đây nạp qua HocLayout)
  kho: pick(() => import("./KhoTriThuc"), (m) => m.KhoTriThuc),
  sapCo: pick(() => import("./CongCu"), (m) => m.SapCo),
  books: pick(() => import("./GiaoTrinh"), (m) => m.GiaoTrinh),
  // Gói A mô phỏng: Soạn, bài giảng, giấy tờ (web/src/demo/gv-soan)
  gsTao: pick(() => import("../../demo/gv-soan/TaoBaiGiang"), (m) => m.TaoBaiGiang),
  gsSua: pick(() => import("../../demo/gv-soan/SuaBaiGiang"), (m) => m.SuaBaiGiang),
  gsXuat: pick(() => import("../../demo/gv-soan/XuatBan"), (m) => m.XuatBan),
  gsStudio: pick(() => import("../../demo/gv-soan/Studio"), (m) => m.Studio),
  gsInfo: pick(() => import("../../demo/gv-soan/Infographic"), (m) => m.InfographicPage),
  gsGiayTo: pick(() => import("../../demo/gv-soan/GiayTo"), (m) => m.GiayTo),
  gsTo: pick(() => import("../../demo/gv-soan/ToChuyenMon"), (m) => m.ToChuyenMon),
  gsNangLuc: pick(() => import("../../demo/gv-soan/NangLuc"), (m) => m.NangLuc),
};

/** Đường trong cổng (sau basename /gv) → trang: dùng cho Routes, tải trước khi rê link. */
/** legacy: trang chưa chuyển sang v2 (bọc .legacy giữ kiểu cũ). */
const SHELL_ROUTES: { path: string; page: Page; legacy?: true }[] = [
  ...GV_LOP_ROUTES, // Gói B mô phỏng (web/src/demo/gv-lop)
  { path: "/cong-cu", page: P.congCu },
  { path: "/video", page: P.sapCo },
  { path: "/to-chuc", page: P.sapCo },
  { path: "/ngan-hang", page: P.bank },
  { path: "/de-thi", page: P.exams },
  { path: "/cham-bai", page: P.grade },
  { path: "/cham-anh", page: P.photoGrade },
  { path: "/lop-hoc", page: P.classes },
  { path: "/lop-hoc/:id", page: P.classDetail },
  { path: "/so-diem", page: P.gradebook },
  { path: "/giao-an", page: P.lessons },
  { path: "/giao-an/:id", page: P.lessonDetail },
  { path: "/de-cuong", page: P.deCuong },
  { path: "/slide", page: P.slides },
  { path: "/bai-giang-ai", page: P.aiLessons, legacy: true },
  { path: "/bai-giang-ai/:id", page: P.aiLesson, legacy: true },
  { path: "/bang-giang", page: P.boards },
  { path: "/so-do", page: P.diagrams },
  { path: "/tro-choi", page: P.games },
  { path: "/dau-truong", page: P.arena },
  { path: "/dau-truong/phien/:id", page: P.session },
  { path: "/van-ban", page: P.vanBan },
  { path: "/ket-noi", page: P.connect },
  { path: "/kho-tri-thuc", page: P.kho },
  { path: "/giao-trinh", page: P.books },
  { path: "/bai-giang-ai/tao", page: P.gsTao },
  { path: "/bai-giang-ai/sua", page: P.gsSua },
  { path: "/xuat-ban", page: P.gsXuat },
  { path: "/studio", page: P.gsStudio },
  { path: "/infographic", page: P.gsInfo },
  { path: "/giay-to", page: P.gsGiayTo },
  { path: "/to-chuyen-mon", page: P.gsTo },
  { path: "/day-theo-nang-luc", page: P.gsNangLuc },
];
/** Màn toàn màn hình (không khung): bảng giảng, sơ đồ, màn chiếu đấu trường. */
const FULL_ROUTES: { path: string; page: Page }[] = [
  { path: "/bang-giang/:id", page: P.board },
  { path: "/so-do/:id", page: P.diagram },
  { path: "/dau-truong/:pin", page: P.hostScreen },
];

registerPreload([
  { path: "/", preload: P.homNay.preload, data: () => void prefetch(GV_TODAY_KEY, fetchGvToday) },
  ...SHELL_ROUTES.map((r) => ({ path: r.path, preload: r.page.preload })),
  ...FULL_ROUTES.map((r) => ({ path: r.path, preload: r.page.preload })),
]);

// Mở thẳng trang chủ cổng: tải code + dữ liệu Hôm nay ngay khi entry chạy (song song với khởi động React).
if (/^\/gv\/?$/.test(window.location.pathname)) preloadPath("/");

/** Trang cũ (P1–P12) trong khung v2: lớp vỏ .legacy giữ kiểu cũ nhưng theo token/màu cổng. */
function Legacy({ children, full }: { children: ReactNode; full?: boolean }) {
  return <div className={full ? "legacy legacy-full" : "legacy"}>{children}</div>;
}

/** Đường ngoài cổng GV (link P6 /hoc/*, /hs/*, /choi): tải entry khác. Còn lại về Hôm nay. */
function OutOfGv() {
  const { pathname, search, hash } = useLocation();
  const out = /^\/(hoc|hs|choi)(\/|$)/.test(pathname);
  useEffect(() => {
    if (out) window.location.replace(`${pathname}${search}${hash}`);
  }, [out, pathname, search, hash]);
  return out ? <PageSkeleton /> : <Navigate to="/" replace />;
}

/** Cổng giáo viên — BrowserRouter basename="/gv": link cũ "/ngan-hang" trong trang hiện có tự thành /gv/ngan-hang. */
export function GvApp() {
  const { user, ready } = useAuth();
  useEffect(() => {
    if (ready && !user) goLogin();
  }, [ready, user]);
  if (!ready || !user) return <PageSkeleton variant="full" />;
  const Home = P.homNay.Component;
  return (
    <ToastProvider>
      <Routes>
        {FULL_ROUTES.map(({ path, page: { Component: C } }) => (
          <Route
            key={path}
            path={path}
            element={
              <Legacy full>
                <Suspense fallback={<PageSkeleton variant="full" />}>
                  <C />
                </Suspense>
              </Legacy>
            }
          />
        ))}
        <Route element={<GvShell />}>
          <Route index element={<Home />} />
          {SHELL_ROUTES.map(({ path, legacy, page: { Component: C } }) => (
            <Route key={path} path={path} element={legacy ? <Legacy><C /></Legacy> : <C />} />
          ))}
        </Route>
        <Route path="*" element={<OutOfGv />} />
      </Routes>
      <LazyMathKeyboard />
    </ToastProvider>
  );
}
