import { useContext, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router";
import { Icon } from "../Icon";
import { InShellCtx } from "../portal/inShell";
import { ExamRoom } from "./ExamRoom";
import { MyAssignments } from "./MyAssignments";
import { QrLogin, StudentLogin } from "./StudentLogin";
import { ResultPage } from "./ResultPage";
import { type StoredSession, clearSession, loadSession } from "./studentApi";
import "./hs.css";

/** Khu học sinh /hs: bố cục riêng, ưu tiên điện thoại; chỉ dùng phiên HS (không cần Keycloak). */
export function StudentApp() {
  return (
    <div className="hs">
      <Routes>
        <Route index element={<HsHome />} />
        <Route path="qr" element={<QrLogin />} />
        <Route path="bai/:id" element={<Need><ExamRoom /></Need>} />
        <Route path="ket-qua/:sid" element={<Need><HsHead /><ResultPage /></Need>} />
        <Route path="*" element={<Navigate to="/hs" replace />} />
      </Routes>
    </div>
  );
}

function Need({ children }: { children: ReactNode }) {
  return loadSession() ? <>{children}</> : <Navigate to="/hs" replace />;
}

function HsHome() {
  const [s, setS] = useState<StoredSession | null>(loadSession);
  if (!s) return <StudentLogin onLogin={setS} />;
  return (
    <>
      <HsHead onLogout={() => setS(null)} />
      <MyAssignments />
    </>
  );
}

export function HsHead({ onLogout }: { onLogout?: () => void }) {
  const s = loadSession();
  // Trong khung cổng Học v2: tên, lớp và Đăng xuất đã nằm ở thanh trên.
  const inShell = useContext(InShellCtx);
  if (!s || inShell) return null;
  const given = s.student.fullName.trim().split(/\s+/).pop() ?? "";
  const out = () => {
    clearSession();
    if (onLogout) onLogout();
    else window.location.assign("/hs");
  };
  return (
    <header className="hs-head">
      <div className="hs-in">
        <span className="mark"><Icon name="cap" /></span>
        <b className="hs-brand">EDUVN</b>
        <div className="hs-me">
          <div><b>{s.student.fullName}</b><small>Lớp {s.class.name}{s.student.seat ? ` · STT ${s.student.seat}` : ""}</small></div>
          <span className="avatar">{given.charAt(0).toUpperCase()}</span>
          <button className="hs-btn sm" onClick={out} aria-label="Đăng xuất" data-testid="hs-logout"><Icon name="logout" /></button>
        </div>
      </div>
    </header>
  );
}
