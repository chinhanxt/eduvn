import { Suspense, useEffect, useMemo } from "react";
import { Outlet } from "react-router";
import { ApiError, getOrgId, setOrgId } from "../../apiCore";
import { useAuth } from "../../auth";
import { ErrorState } from "../../ui/components/States";
import type { Command } from "../../ui/components/CommandPalette";
import { useQuery } from "../../ui/data/query";
import { AppShell, type MenuItem, type Notice } from "../../ui/shell/AppShell";
import { PageSkeleton } from "../../ui/shell/PageSkeleton";
import { initialsOf, MeCtx, ROLE_VI } from "../me";
import { goLogin } from "../needLogin";
import { fetchGvToday, fetchMe, GV_TODAY_KEY, ME_KEY } from "./data";
import { GV_FOOT, gvNav } from "./nav";

/** Khung cổng GV (skin B): lấy /api/me (vai trò, tổ chức) + dữ liệu Hôm nay (đếm trên thanh bên, chuông, Ctrl K). */
export function GvShell() {
  const { logout } = useAuth();
  const me = useQuery(ME_KEY, fetchMe, { staleMs: 5 * 60_000 });
  // Không chờ /api/me: dữ liệu Hôm nay (đã tải trước lúc mở trang) và nội dung trang vẽ song song.
  const today = useQuery(GV_TODAY_KEY, fetchGvToday);
  const status = me.error instanceof ApiError ? me.error.status : 0;
  useEffect(() => {
    if (status === 401) goLogin();
    // Tài khoản không có vai trò GV ở tổ chức nào → cổng Học.
    if (status === 403) window.location.replace("/hoc");
  }, [status]);

  const d = today.data;
  const nav = useMemo(() => gvNav({ classes: d?.classes.length, grading: d?.kpis.pendingGrading.value }), [d]);
  const notices = useMemo<Notice[]>(
    () => (d?.tasks ?? []).filter((t) => t.group === "today" || t.hot).slice(0, 6).map((t) => ({ title: t.title, sub: `${t.className} · ${t.dueLabel}`, to: t.href, hot: t.hot })),
    [d],
  );
  const commands = useMemo<Command[]>(
    () => [
      ...(d?.classes ?? []).map((c) => ({ group: "Lớp", title: `${c.name}${c.subject ? ` · ${c.subject}` : ""}`, icon: "users", href: `/lop-hoc/${c.id}` })),
      ...(d?.tasks ?? []).slice(0, 6).map((t) => ({ group: "Việc", title: t.title, icon: t.kind === "grade" ? "grade" : t.kind === "lesson" ? "board" : "clock", href: t.href, keywords: `${t.id} ${t.className}` })),
      { group: "Thao tác", title: "Tạo đề mới", icon: "plus", href: "/de-thi", kbd: "N" },
      { group: "Thao tác", title: "Soạn giáo án", icon: "pen", href: "/giao-an" },
      { group: "Thao tác", title: "Sang cổng Học", icon: "cap", href: "/hoc", keywords: "hoc sinh gia su" },
    ],
    [d],
  );

  if (me.error && status !== 401 && status !== 403)
    return (
      <div className="page">
        <ErrorState title="Không tải được tài khoản" text={me.error instanceof Error ? me.error.message : undefined} onRetry={() => me.refetch()} />
      </div>
    );
  const m = me.data;
  const menu: MenuItem[] = [
    ...(m && m.orgs.length > 1
      ? [
          { sep: true } as const,
          ...m.orgs.map((o) => ({
            label: `${o.id === (getOrgId() ?? m.org.id) ? "✓ " : ""}${o.name}`,
            icon: "org",
            run: () => {
              setOrgId(o.id);
              window.location.reload();
            },
          })),
        ]
      : []),
    { sep: true },
    { label: "Sang cổng Học", icon: "cap", href: "/hoc" },
    { label: "Kết nối AI", icon: "plug", to: "/ket-noi" },
    { sep: true },
    { label: "Đăng xuất", icon: "logout", run: logout, danger: true },
  ];
  return (
    <MeCtx value={m ?? null}>
      <AppShell
        portal="gv"
        base="/gv"
        tag="Giáo viên"
        nav={nav}
        sideFoot={GV_FOOT}
        user={{ initials: m ? initialsOf(m.user.name ?? m.user.email) : "…", name: m?.user.name ?? m?.user.email ?? "Đang tải…", sub: m ? `${ROLE_VI[m.role] ?? m.role} · ${m.org.name}` : "" }}
        menu={menu}
        notices={notices}
        commands={commands}
      >
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </MeCtx>
  );
}
