import { useLocation } from "react-router";
import { hocV2Path } from "../../student/oldPaths";
import { legacyRedirect } from "../entries";
import { GoTo } from "../Redirect";

/** Đường cũ: /hoc/hs/… (P9a, thẻ QR cũ) → đường v2 trong cổng; /hs/… và đường lạ → theo bản đồ đường cũ (tải riêng — hiếm khi cần). */
export function LegacyHoc() {
  const { pathname, search, hash } = useLocation();
  const to = hocV2Path(pathname) ?? legacyRedirect(pathname);
  return <GoTo here="hoc.html" to={to ? `${to}${search}${hash}` : "/hoc"} />;
}
