import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { ApiError, api, getOrgId, setOrgId, type Me } from "./api";
import { useAuth } from "./auth";
import { Icon } from "./Icon";

const ROLE_VI: Record<string, string> = { owner: "Chủ sở hữu", admin: "Quản trị", teacher: "Giáo viên", assistant: "Trợ giảng", student: "Học viên" };

const MeCtx = createContext<Me | null>(null);
export const useMe = () => useContext(MeCtx);

const NAV: ({ group: string } | { to: string; label: string; icon: string; soon?: boolean; end?: boolean })[] = [
  { to: "/", label: "Trang chủ", icon: "home", end: true },
  { group: "Đánh giá" },
  { to: "/ngan-hang", label: "Ngân hàng câu hỏi", icon: "bank" },
  { to: "/de-thi", label: "Đề thi", icon: "exam" },
  { to: "/cham-bai", label: "Chấm bài", icon: "grade" },
  { group: "Soạn bài" },
  { to: "/giao-an", label: "Giáo án", icon: "pen" },
  { to: "/slide", label: "Slide", icon: "slide" },
  { to: "/video", label: "Video bài giảng", icon: "video" },
  { to: "/giao-trinh", label: "Giáo trình", icon: "book" },
  { group: "Lớp học" },
  { to: "/lop-hoc", label: "Lớp & học viên", icon: "users" },
  { to: "/so-diem", label: "Sổ điểm", icon: "clip" },
  { to: "/gia-su", label: "Gia sư AI", icon: "cap" },
  { group: "Văn bản" },
  { to: "/van-ban", label: "Văn bản hành chính", icon: "exam" },
  { group: "Hệ thống" },
  { to: "/ket-noi", label: "Kết nối", icon: "plug" },
  { to: "/to-chuc", label: "Tổ chức", icon: "org", soon: true },
];

export function Shell() {
  const { logout } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Me>("/api/me")
      .then(setMe)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Không kết nối được máy chủ"));
  }, []);

  if (error) return <div className="center">{error}</div>;
  if (!me) return <div className="center">…</div>;

  const initial = (me.user.name ?? me.user.email ?? "?").trim().charAt(0).toUpperCase();
  const pick = (id: string) => {
    setOrgId(id);
    window.location.reload();
  };

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <span className="mark"><Icon name="cap" /></span>EDUVN
        </div>
        <nav>
          {NAV.map((n) =>
            "group" in n ? (
              <div className="grp" key={n.group}>{n.group}</div>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? "nav-link on" : "nav-link")}>
                <Icon name={n.icon} />
                {n.label}
                {n.soon && <span className="soon" />}
              </NavLink>
            ),
          )}
        </nav>
        <div className="me">
          <div className="avatar">{initial}</div>
          <div>
            {me.user.name ?? me.user.email}
            <small>{ROLE_VI[me.role] ?? me.role}</small>
          </div>
          <button className="out" onClick={logout} aria-label="Đăng xuất"><Icon name="logout" size={18} /></button>
        </div>
      </aside>
      <div>
        <div className="top">
          <div className="search"><Icon name="search" /><input placeholder="Tìm đề, câu hỏi, lớp…" readOnly /></div>
          <div className="iconbtn"><Icon name="bell" /></div>
          <div className="org" style={{ marginLeft: 0 }}>
            <select value={getOrgId() ?? me.org.id} onChange={(e) => pick(e.target.value)} aria-label="Tổ chức">
              {me.orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <Icon name="chev" size={16} />
          </div>
        </div>
        <main>
          <MeCtx value={me}>
            <Outlet />
          </MeCtx>
        </main>
      </div>
    </div>
  );
}
