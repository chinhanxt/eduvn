import { useLocation } from "react-router";
import { legacyRedirect } from "../entries";
import { GoTo } from "../Redirect";

/** Link P9a cũ (/hs/…) bên trong StudentApp và đường lạ: đổi sang đường mới (tải riêng — hiếm khi cần). */
export function LegacyHoc() {
  const { pathname, search, hash } = useLocation();
  const to = legacyRedirect(pathname);
  return <GoTo here="hoc.html" to={to ? `${to}${search}${hash}` : "/hoc"} />;
}
