import { NavLink, Outlet } from "react-router";
import "./hoc.css";

const TABS = [
  { to: "/hoc/gia-su", label: "Gia sư" },
  { to: "/hoc/luyen-tap", label: "Luyện tập & ôn" },
  { to: "/hoc/lo-trinh", label: "Lộ trình" },
  { to: "/hoc/giao-trinh", label: "Giáo trình" },
];

export function HocLayout() {
  return (
    <>
      <div className="hoc-tabs" role="tablist">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? "on" : "")} role="tab">{t.label}</NavLink>
        ))}
      </div>
      <Outlet />
    </>
  );
}
