import { Navigate, useLocation } from "react-router";

/** /cham-anh (P7) gộp vào /cham-bai: giữ link cũ, giữ ?de= &lop= &che-do=. */
export function PhotoGrade() {
  const { search } = useLocation();
  const p = new URLSearchParams(search);
  if (!p.get("che-do")) p.set("che-do", "quet");
  return <Navigate to={`/cham-bai?${p.toString()}`} replace />;
}
