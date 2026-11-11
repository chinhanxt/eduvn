import { type ComponentType, type ReactNode, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { useAuth } from "../../auth";
import type { Tool } from "../../tools";
import { ToastProvider } from "../../ui/components/Toast";
import { prefetch } from "../../ui/data/query";
import { PageSkeleton } from "../../ui/shell/PageSkeleton";
import { lazyPage, preloadPath, registerPreload, type Page } from "../../ui/shell/routes";
import { LazyMathKeyboard } from "../MathKeyboardLazy";
import { goLogin } from "../needLogin";
import { fetchGvToday, GV_TODAY_KEY } from "./data";
import { GvShell } from "./GvShell";

const pick = <M,>(load: () => Promise<M>, f: (m: M) => ComponentType): Page => lazyPage(() => load().then(f));

const P = {
  homNay: pick(() => import("./HomNay"), (m) => m.HomNay),
  home: pick(() => import("../../pages/Home"), (m) => m.Home),
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
  kho: pick(() => Promise.all([import("../../hoc/KhoTriThuc"), import("../../hoc/hoc.css")]), ([m]) => m.KhoTriThuc),
  placeholder: lazyPage(() => import("../../pages/Placeholder").then((m) => m.Placeholder as ComponentType)),
  books: pick(() => Promise.all([import("../../hoc/Books"), import("../../hoc/hoc.css")]), ([m]) => m.Books),
};

/** Đường trong cổng (sau basename /gv) → trang: dùng cho Routes, tải trước khi rê link. */
/** legacy: trang chưa chuyển sang v2 (bọc .legacy giữ kiểu cũ). */
const SHELL_ROUTES: { path: string; page: Page; legacy?: true }[] = [
  { path: "/cong-cu", page: P.home, legacy: true },
  { path: "/ngan-hang", page: P.bank },
  { path: "/de-thi", page: P.exams },
  { path: "/cham-bai", page: P.grade },
  { path: "/cham-anh", page: P.photoGrade },
  { path: "/lop-hoc", page: P.classes },
  { path: "/lop-hoc/:id", page: P.classDetail },
  { path: "/so-diem", page: P.gradebook },
  { path: "/giao-an", page: P.lessons, legacy: true },
  { path: "/giao-an/:id", page: P.lessonDetail, legacy: true },
  { path: "/de-cuong", page: P.deCuong, legacy: true },
  { path: "/slide", page: P.slides, legacy: true },
  { path: "/bai-giang-ai", page: P.aiLessons, legacy: true },
  { path: "/bai-giang-ai/:id", page: P.aiLesson, legacy: true },
  { path: "/bang-giang", page: P.boards, legacy: true },
  { path: "/so-do", page: P.diagrams, legacy: true },
  { path: "/tro-choi", page: P.games, legacy: true },
  { path: "/dau-truong", page: P.arena, legacy: true },
  { path: "/dau-truong/phien/:id", page: P.session, legacy: true },
  { path: "/van-ban", page: P.vanBan, legacy: true },
  { path: "/ket-noi", page: P.connect, legacy: true },
  { path: "/kho-tri-thuc", page: P.kho, legacy: true },
  { path: "/giao-trinh", page: P.books, legacy: true },
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
  const Ph = P.placeholder.Component as unknown as ComponentType<{ tool: Tool }>;
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
          {/* công cụ chưa xong (trước đây sinh từ TOOLS có nhãn "Thử") */}
          <Route path="/video" element={<Legacy><Ph tool={{ to: "/video", name: "Video bài giảng", icon: "video", color: "violet", pill: "Thử" }} /></Legacy>} />
          <Route path="/to-chuc" element={<Legacy><Ph tool={{ to: "/to-chuc", name: "Tổ chức", icon: "org", color: "amber", pill: "Sắp có" }} /></Legacy>} />
        </Route>
        <Route path="*" element={<OutOfGv />} />
      </Routes>
      <LazyMathKeyboard />
    </ToastProvider>
  );
}
