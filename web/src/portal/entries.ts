/**
 * Bản đồ đường dẫn của 3 entry Vite (thuần, không DOM — dùng cả trong vite.config.ts và test).
 * index.html: đăng nhập + chuyển theo vai trò + trang công khai (/choi, /loi-giai) + chuyển hướng đường cũ.
 * gv.html: cổng giáo viên /gv/*. hoc.html: cổng học sinh /hoc/* (Keycloak + phiên HS P9a ở /hoc/hs/*).
 */
export type Entry = "index.html" | "gv.html" | "hoc.html";

export function entryFor(pathname: string): Entry {
  if (/^\/gv(\/|$)/.test(pathname)) return "gv.html";
  if (/^\/hoc(\/|$)/.test(pathname)) return "hoc.html";
  return "index.html";
}

/** Đường cũ của cổng GV (trước UI v2), phục vụ ở gốc. */
export const GV_LEGACY = [
  "ngan-hang", "de-thi", "cham-bai", "cham-anh", "lop-hoc", "so-diem", "giao-an", "de-cuong", "slide", "bai-giang-ai",
  "bang-giang", "so-do", "tro-choi", "dau-truong", "van-ban", "ket-noi", "kho-tri-thuc", "to-chuc", "video",
] as const;
const GV_RE = new RegExp(`^/(${GV_LEGACY.join("|")})(/.*)?$`);

/** Vai trò vào cổng GV; còn lại (student…) vào cổng Học. */
export const GV_ROLES = new Set(["owner", "admin", "teacher", "assistant"]);
export const portalForRole = (role: string | null | undefined): "/gv" | "/hoc" => (role && GV_ROLES.has(role) ? "/gv" : "/hoc");

/**
 * Đường cũ → đường mới (giữ nguyên query/hash do người gọi nối thêm). null = không phải đường cũ.
 * /ngan-hang → /gv/ngan-hang, /bang-giang/:id → /gv/bang-giang/:id, /hs/* (P9a) → /hoc/hs/*,
 * /gia-su, /giao-trinh (P6) → /hoc/…, /gv/hoc/* (link P6 cũ trong cổng GV) → /hoc/*.
 */
export function legacyRedirect(pathname: string): string | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const gv = GV_RE.exec(p);
  if (gv) return `/gv${p}`;
  if (p === "/hs" || p.startsWith("/hs/")) return `/hoc${p}`;
  if (p === "/gia-su" || p === "/giao-trinh" || p === "/luyen-tap" || p === "/lo-trinh") return `/hoc${p}`;
  const inGv = /^\/gv\/(hoc|hs)(\/.*)?$/.exec(p);
  if (inGv) return `/${inGv[1] === "hs" ? "hoc/hs" : "hoc"}${inGv[2] ?? ""}`;
  return null;
}
