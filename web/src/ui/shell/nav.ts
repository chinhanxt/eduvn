// Kiểu + hàm thuần của khung cổng (mục điều hướng, breadcrumb) — tách khỏi AppShell.tsx để test không cần DOM.

export type NavItem = {
  /** Đường trong router (đã bỏ basename). `href` thay thế khi trỏ sang cổng khác (tải trang mới). */
  to: string;
  href?: string;
  label: string;
  icon?: string;
  count?: number | string | null;
  hot?: boolean;
  /** Phím tắt "G H"… (cổng GV). */
  kbd?: string;
  /** Chấm màu môn học (nhóm Môn học cổng Học). */
  dot?: string;
  end?: boolean;
};
export type NavEntry = NavItem | { group: string };
export type Crumb = { label: string; to?: string };
export type MenuItem = { label: string; icon: string; to?: string; href?: string; run?: () => unknown; danger?: boolean } | { sep: true };
export type Notice = { title: string; sub?: string; to: string; hot?: boolean };

export const isItem = (n: NavEntry): n is NavItem => "to" in n;
/** Mục điều hướng khớp dài nhất với đường hiện tại (để tô mục đang chọn + breadcrumb mặc định). */
export function matchNav(items: readonly NavItem[], pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const n of items) {
    if (n.href || n.dot) continue;
    const to = n.to.replace(/\/+$/, "") || "/";
    const hit = n.end || to === "/" ? pathname === to || pathname === `${to}/` : pathname === to || pathname.startsWith(`${to}/`);
    if (hit && (!best || to.length > best.to.length)) best = n;
  }
  return best;
}
export function defaultCrumbs(items: readonly NavItem[], pathname: string, home: NavItem | null): Crumb[] {
  const m = matchNav(items, pathname);
  if (!m) return home ? [{ label: home.label }] : [];
  const exact = pathname.replace(/\/+$/, "") === m.to.replace(/\/+$/, "") || (m.to === "/" && pathname === "/");
  return exact ? [{ label: m.label }] : [{ label: m.label, to: m.to }, { label: "Chi tiết" }];
}

