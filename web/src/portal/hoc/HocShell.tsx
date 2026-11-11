import { type ReactNode, Suspense, useMemo, useSyncExternalStore } from "react";
import { Outlet, useLocation } from "react-router";
import { useAuth } from "../../auth";
import { clearSession, loadSession, SESSION_EVENT, type StoredSession } from "../../student/session";
import type { Command } from "../../ui/components/CommandPalette";
import { Icon } from "../../ui/Icon";
import { useQuery } from "../../ui/data/query";
import { AppShell, type MenuItem, type Notice } from "../../ui/shell/AppShell";
import { PageSkeleton } from "../../ui/shell/PageSkeleton";
import { GV_ROLES } from "../entries";
import { fetchMe, ME_KEY } from "../gv/data";
import { InShellCtx } from "../inShell";
import { initialsOf, MeCtx } from "../me";
import { fetchHocToday, HOC_TODAY_KEY } from "./data";
import { hocNav } from "./nav";

/** Phiên HS (mã lớp/PIN, P9a) theo dõi được: đổi khi đăng nhập/đăng xuất ở tab này hoặc tab khác. */
let cached: { raw: string | null; s: StoredSession | null } = { raw: null, s: null };
function snapshot(): StoredSession | null {
  const raw = window.localStorage.getItem("eduvn.hs");
  if (raw !== cached.raw) cached = { raw, s: loadSession() };
  return cached.s;
}
function subscribe(cb: () => void) {
  window.addEventListener(SESSION_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(SESSION_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
export const useHsSession = () => useSyncExternalStore(subscribe, snapshot, () => null);

/** Ai đang học: tài khoản Keycloak (ưu tiên) hoặc phiên mã lớp. */
export function useLearner(): { ready: boolean; auth: "user" | "hs" | null; session: StoredSession | null } {
  const { user, ready } = useAuth();
  const session = useHsSession();
  return { ready, auth: user ? "user" : session ? "hs" : null, session };
}

/** Phòng làm bài + quét QR + màn đăng nhập: chế độ tập trung (không menu). */
const BARE = [/^\/hoc\/hs\/bai\/[^/]+/, /^\/hoc\/hs\/qr$/];

/** Khung cổng Học (skin C): ≥ 1181 px thanh bên 248 px + nhóm Môn học + ô chuỗi ngày; 721–1180 px thanh bên icon; ≤ 720 px tab dưới 5 mục. */
export function HocShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const { ready, auth, session } = useLearner();
  const { pathname } = useLocation();
  const me = useQuery(user ? ME_KEY : null, fetchMe, { staleMs: 5 * 60_000 });
  const today = useQuery(auth ? `${HOC_TODAY_KEY}:${auth}` : null, fetchHocToday(auth ?? "hs"));
  const d = today.data;
  const { nav, tabs } = useMemo(() => hocNav(auth === "user", d), [auth, d]);
  const notices = useMemo<Notice[]>(
    () => (d?.upcoming ?? []).filter((u) => u.canStart).slice(0, 5).map((u) => ({ title: u.title, sub: `${u.subject} · ${u.day} ${u.dayNum}`, to: `/hoc/hs/bai/${u.assignmentId}`, hot: u.hot })),
    [d],
  );
  const commands = useMemo<Command[]>(
    () => [
      ...(d?.next?.canStart ? [{ group: "Thao tác", title: `Làm tiếp ${d.next.title}`, icon: "play", href: `/hoc/hs/bai/${d.next.assignmentId}` }] : []),
      ...(auth === "user" ? [{ group: "Thao tác", title: "Hỏi gia sư", icon: "chat", href: "/hoc/gia-su" }, { group: "Thao tác", title: "Ôn thẻ đến hạn", icon: "layers", href: "/hoc/luyen-tap" }] : []),
      ...(me.data && GV_ROLES.has(me.data.role) ? [{ group: "Thao tác", title: "Sang cổng Giáo viên", icon: "users", href: "/gv" }] : []),
    ],
    [d, auth, me.data],
  );
  const bare = !ready || !auth || BARE.some((re) => re.test(pathname));
  const content = children ?? (
    <Suspense fallback={<PageSkeleton />}>
      <Outlet />
    </Suspense>
  );
  if (bare)
    return (
      <AppShell portal="hoc" base="" tag="Học sinh" nav={nav} user={{ initials: "", name: "", sub: "" }} menu={[]} notices={[]} commands={[]} bare>
        {ready ? content : <PageSkeleton variant="full" />}
      </AppShell>
    );

  const name = d?.student.name || me.data?.user.name || session?.student.fullName || user?.profile.name || "Học sinh";
  const cls = d?.student.className ?? session?.class.name ?? null;
  const out = () => {
    clearSession();
    if (user) logout();
    else window.location.assign("/hoc/hs");
  };
  const menu: MenuItem[] = [
    ...(me.data && GV_ROLES.has(me.data.role) ? [{ label: "Sang cổng Giáo viên", icon: "users", href: "/gv" }, { sep: true } as const] : []),
    { label: "Đăng xuất", icon: "logout", run: out, danger: true },
  ];
  const streak = d?.streak;
  return (
    <MeCtx value={me.data ?? null}>
      <InShellCtx value>
        <AppShell
          portal="hoc"
          base=""
          tag="Học sinh"
          nav={nav}
          tabs={tabs}
          sideExtra={
            streak && (
              <div className="streak-mini">
                <Icon name="flame" />
                <div>
                  <b>{streak.current} ngày</b>
                  <small>học liên tiếp · dài nhất {streak.longest}</small>
                </div>
              </div>
            )
          }
          topExtra={
            streak && (
              <span className="streak show-sm" title="Chuỗi ngày học">
                <Icon name="flame" size="sm" />
                {streak.current}
              </span>
            )
          }
          user={{ initials: initialsOf(name), name, sub: cls ? `Lớp ${cls}` : "Học sinh" }}
          menu={menu}
          notices={notices}
          commands={commands}
        >
          {content}
        </AppShell>
      </InShellCtx>
    </MeCtx>
  );
}
