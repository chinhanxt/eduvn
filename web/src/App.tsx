import { Navigate, Route, Routes } from "react-router";
import { useAuth } from "./auth";
import { Shell } from "./Shell";
import { Login, Callback } from "./pages/Login";
import { Home } from "./pages/Home";
import { Bank } from "./pages/Bank";
import { Exams } from "./pages/Exams";
import { Grade } from "./pages/Grade";
import { Classes, ClassDetailPage } from "./pages/Classes";
import { Gradebook } from "./pages/Gradebook";
import { LessonDetailPage, Lessons } from "./pages/Lessons";
import { Connect } from "./pages/Connect";
import { Placeholder } from "./pages/Placeholder";
import { TOOLS } from "./tools";

export function App() {
  const { user, ready } = useAuth();
  return (
    <Routes>
      <Route path="/callback" element={<Callback />} />
      {!ready ? (
        <Route path="*" element={<div className="center">…</div>} />
      ) : !user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="ngan-hang" element={<Bank />} />
          <Route path="de-thi" element={<Exams />} />
          <Route path="cham-bai" element={<Grade />} />
          <Route path="lop-hoc" element={<Classes />} />
          <Route path="lop-hoc/:id" element={<ClassDetailPage />} />
          <Route path="so-diem" element={<Gradebook />} />
          <Route path="giao-an" element={<Lessons />} />
          <Route path="giao-an/:id" element={<LessonDetailPage />} />
          <Route path="ket-noi" element={<Connect />} />
          {TOOLS.filter((t) => t.pill).map((t) => (
            <Route key={t.to} path={t.to.slice(1)} element={<Placeholder tool={t} />} />
          ))}
          <Route path="to-chuc" element={<Placeholder tool={{ to: "/to-chuc", name: "Tổ chức", icon: "org", color: "amber", pill: "Sắp có" }} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      )}
    </Routes>
  );
}
