import { useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { entryFor } from "./entries";

/** Chuyển tới URL đầy đủ: cùng entry → điều hướng trong app, khác entry → tải trang (bundle khác). */
export function GoTo({ to, here }: { to: string; here: "index.html" | "gv.html" | "hoc.html" }) {
  const path = to.split(/[?#]/)[0] ?? to;
  const hard = entryFor(path) !== here;
  useEffect(() => {
    if (hard) window.location.replace(to);
  }, [hard, to]);
  return hard ? <div className="center">…</div> : <Navigate to={to} replace />;
}

/** Nối query + hash hiện tại vào đường mới. */
export function useWithSearch(path: string): string {
  const l = useLocation();
  return `${path}${l.search}${l.hash}`;
}
