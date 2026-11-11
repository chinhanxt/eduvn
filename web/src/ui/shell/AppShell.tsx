import { createContext, lazy, type ReactNode, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, ViewTransition } from "react";
import { Link, NavLink, useHref, useLocation, useNavigate, useNavigationType } from "react-router";
import { Icon } from "../Icon";
import type { Command } from "../components/CommandPalette";
import { useOnline } from "../data/online";
import { type Crumb, defaultCrumbs, isItem, matchNav, type MenuItem, type NavEntry, type NavItem, type Notice } from "./nav";

export type { Crumb, MenuItem, NavEntry, NavItem, Notice } from "./nav";
import { toggleTheme, useTheme } from "./theme";

// Bảng lệnh tải riêng (không nằm trong JS lần đầu): tải trước lúc rảnh, mở bằng Ctrl K hoặc ô Tìm nhanh.
const loadCmdk = () => import("../components/CommandPalette").then((m) => ({ default: m.CommandPalette }));
const CommandPalette = lazy(loadCmdk);
const NoticeList = lazy(() => import("./ShellMenus").then((m) => ({ default: m.NoticeList })));
const AccountMenu = lazy(() => import("./ShellMenus").then((m) => ({ default: m.AccountMenu })));
const OfflineBanner = lazy(() => import("../components/States").then((m) => ({ default: m.OfflineBanner })));
const ChartTooltipLazy = lazy(() => import("../components/Tooltip").then((m) => ({ default: m.ChartTooltip })));
const onIdle = (f: () => void): (() => void) => {
  if (window.requestIdleCallback) {
    const id = window.requestIdleCallback(f, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(f, 800);
  return () => window.clearTimeout(id);
};
/** Tooltip biểu đồ: gắn lúc trình duyệt rảnh (không nằm trong JS lần đầu). */
function Tooltips() {
  const [on, setOn] = useState(false);
  useEffect(() => onIdle(() => setOn(true)), []);
  return on ? (
    <Suspense fallback={null}>
      <ChartTooltipLazy />
    </Suspense>
  ) : null;
}

type Ctx = { setCrumbs: (c: Crumb[] | null) => void; ctxSlot: HTMLDivElement | null; setCompact: (on: boolean) => void; portal: "gv" | "hoc" };
const ShellCtx = createContext<Ctx | null>(null);
export const useShell = () => useContext(ShellCtx);

/** Trang tự đặt tiêu đề tab + breadcrumb (mặc định: lấy theo mục điều hướng đang khớp). */
export function usePageMeta(title: string | null, crumbs?: Crumb[]): void {
  const shell = useContext(ShellCtx);
  const sig = crumbs ? JSON.stringify(crumbs) : "";
  useEffect(() => {
    if (title) document.title = `${title} · EDUVN ${shell?.portal === "hoc" ? "Học sinh" : "Giáo viên"}`;
  }, [title, shell?.portal]);
  useEffect(() => {
    if (!shell || !crumbs) return;
    shell.setCrumbs(crumbs);
    return () => shell.setCrumbs(null);
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps
}

function useDismiss(open: boolean, close: () => void, box: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close();
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open, close, box]);
}

function Pop({ icon, label, badge, children, wide }: { icon: ReactNode; label: string; badge?: boolean; children: (close: () => void) => ReactNode; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, box);
  const { pathname } = useLocation();
  useEffect(close, [pathname, close]);
  return (
    <div className="pop-wrap" ref={box}>
      <button type="button" className={typeof icon === "string" ? "avatar avatar-btn" : "btn ghost icon"} aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} style={{ position: "relative" }}>
        {icon}
        {badge && <i className="dot-badge" />}
      </button>
      {open && <div className={wide ? "menu-pop wide" : "menu-pop"} role="menu">{children(close)}</div>}
    </div>
  );
}

function NavA({ n, onNavigate }: { n: NavItem; onNavigate?: () => void }) {
  const inner = (
    <>
      {n.dot ? <i className="dot" style={{ ["--c" as string]: n.dot }} /> : <Icon name={n.icon ?? "book"} />}
      <span>{n.label}</span>
      {n.count != null && n.count !== 0 && n.count !== "" && <em className={n.hot ? "count hot" : "count"} style={{ fontStyle: "normal" }}>{n.count}</em>}
      {n.kbd && <kbd className="nk">{n.kbd}</kbd>}
    </>
  );
  if (n.dot)
    // mục môn học: lối tắt, không tô "đang chọn" (trùng đường với Giáo trình)
    return (
      <Link to={n.to} title={n.label} className="subj-link" onClick={onNavigate}>
        {inner}
      </Link>
    );
  if (n.href)
    return (
      <a href={n.href} title={n.label} className={n.dot ? "subj-link" : undefined}>
        {inner}
      </a>
    );
  return (
    <NavLink to={n.to} end={n.end ?? n.to === "/"} title={n.label} className={n.dot ? "subj-link" : undefined} onClick={onNavigate}>
      {inner}
    </NavLink>
  );
}

/** Ẩn route của trang trước khi chụp View Transition mới; trình duyệt không có API → chạy Web Animations nhẹ. */
function usePageMotion(main: React.RefObject<HTMLElement | null>, pathname: string) {
  const first = useRef(true);
  const navType = useNavigationType();
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (navType === "PUSH") window.scrollTo({ top: 0 });
    const d = document as Document & { startViewTransition?: unknown };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!d.startViewTransition && !reduce && main.current?.animate) {
      main.current.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Phím tắt "G rồi chữ" (cổng GV): G H Hôm nay, G L Lớp… — bỏ qua khi đang gõ trong ô nhập. */
function useGoKeys(items: readonly NavItem[]) {
  const navigate = useNavigate();
  useEffect(() => {
    let armed = 0;
    const key = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toUpperCase();
      if (armed && Date.now() - armed < 1200) {
        armed = 0;
        const hit = items.find((n) => n.kbd === `G ${k}`);
        if (hit) {
          e.preventDefault();
          if (hit.href) window.location.assign(hit.href);
          else navigate(hit.to);
        }
        return;
      }
      if (k === "G") armed = Date.now();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [items, navigate]);
}

export type AppShellProps = {
  portal: "gv" | "hoc";
  /** basename của router ("/gv" cho cổng GV, "" cho cổng Học). */
  base: string;
  tag: string;
  nav: readonly NavEntry[];
  /** Tab dưới (≤ 720 px, cổng Học). */
  tabs?: readonly NavItem[];
  sideExtra?: ReactNode;
  sideFoot?: readonly NavItem[];
  topExtra?: ReactNode;
  user: { initials: string; name: string; sub: string };
  menu: readonly MenuItem[];
  notices: readonly Notice[];
  commands: readonly Command[];
  /** Chế độ tập trung (phòng làm bài) hoặc màn không cần khung: chỉ nội dung. */
  bare?: boolean;
  children: ReactNode;
};

/** Khung cổng dùng chung (shell2.js của mockup): thanh bên cố định cao hết màn, thanh trên đặc, breadcrumb, Ctrl K, chuông, tài khoản. */
export function AppShell(p: AppShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const theme = useTheme();
  const [mini, setMini] = useState(() => window.localStorage.getItem("eduvn-side") === "mini");
  const [drawer, setDrawer] = useState(false);
  const [cmdk, setCmdk] = useState(false);
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);
  const [ctxSlot, setCtxSlot] = useState<HTMLDivElement | null>(null);
  const [compact, setCompact] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const main = useRef<HTMLElement>(null);
  const items = useMemo(() => [...p.nav.filter(isItem), ...(p.sideFoot ?? [])], [p.nav, p.sideFoot]);
  const homeHref = useHref("/");

  const [cmdkUsed, setCmdkUsed] = useState(false);
  useEffect(() => {
    if (cmdk) setCmdkUsed(true);
  }, [cmdk]);
  useEffect(() => {
    if (cmdkUsed) return; // đã gắn bảng lệnh: nó tự bắt Ctrl K
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk(true);
      }
    };
    window.addEventListener("keydown", key);
    const stop = onIdle(() => void loadCmdk());
    return () => {
      window.removeEventListener("keydown", key);
      stop();
    };
  }, [cmdkUsed]);

  usePageMotion(main, pathname);
  useEffect(() => {
    let off: (() => void) | null = null;
    let live = true;
    const stop = onIdle(() => void import("./prefetch").then((m) => live && (off = m.installPrefetch(p.base))));
    return () => {
      live = false;
      stop();
      off?.();
    };
  }, [p.base]);
  useGoKeys(items);
  useEffect(() => setDrawer(false), [pathname]);
  useEffect(() => {
    if (online) setSavedAt(new Date());
  }, [online, pathname]);
  useEffect(() => {
    if (!p.tabs || p.bare) return;
    document.body.classList.add("has-tabbar");
    return () => document.body.classList.remove("has-tabbar");
  }, [p.tabs, p.bare]);
  useEffect(() => {
    document.documentElement.dataset.portal = p.portal;
  }, [p.portal]);
  useEffect(() => {
    if (!drawer) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [drawer]);

  const ctx = useMemo<Ctx>(() => ({ setCrumbs, ctxSlot, setCompact, portal: p.portal }), [ctxSlot, p.portal]);
  const shownCrumbs = crumbs ?? defaultCrumbs(items, pathname, items[0] ?? null);
  const current = matchNav(items, pathname);
  useEffect(() => {
    if (!crumbs && current) document.title = `${current.label} · EDUVN ${p.portal === "hoc" ? "Học sinh" : "Giáo viên"}`;
  }, [crumbs, current, p.portal]);

  const commands = useMemo<Command[]>(
    () => [
      ...items.map((n) => ({ group: "Trang", title: n.label, icon: n.icon ?? "book", href: n.href ?? n.to })),
      ...p.commands,
      { group: "Thao tác", title: theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối", icon: theme === "dark" ? "sun" : "moon", run: toggleTheme, keywords: "sang toi dark light giao dien" },
    ],
    [items, p.commands, theme],
  );
  const go = useCallback(
    (href: string) => {
      if (/^https?:|^\/(gv|hoc|choi)(\/|$)/.test(href) && !(p.base && href.startsWith(p.base))) {
        // khác cổng (bundle khác) → tải trang; cùng cổng → điều hướng trong app
        const sameHoc = p.portal === "hoc" && /^\/hoc(\/|$)/.test(href);
        if (!sameHoc) {
          window.location.assign(href);
          return;
        }
      }
      navigate(href);
    },
    [navigate, p.base, p.portal],
  );

  if (p.bare)
    return (
      <ShellCtx value={ctx}>
        <main id="main" className="bare">
          {p.children}
        </main>
        <Tooltips />
      </ShellCtx>
    );

  return (
    <ShellCtx value={ctx}>
      <div
        className={["app", mini && "mini", drawer && "drawer"].filter(Boolean).join(" ")}
        onClick={(e) => {
          if (drawer && !(e.target as Element).closest(".side, [data-act='drawer']")) setDrawer(false);
        }}
      >
        <a className="skip" href="#main">Tới nội dung</a>
        <aside className="side" aria-label="Điều hướng">
          <a className="brand" href={homeHref} onClick={(e) => { e.preventDefault(); navigate("/"); }}>
            <span className="mark"><Icon name="cap" /></span>
            <span className="txt">EDUVN</span>
            <span className="tag">{p.tag}</span>
          </a>
          <nav className="nav">
            {p.nav.map((n, i) =>
              isItem(n) ? (
                <NavA key={n.label + n.to} n={n} onNavigate={() => setDrawer(false)} />
              ) : (
                <div key={`g${i}`} style={{ display: "contents" }}>
                  <div className="grp eyebrow">{n.group}</div>
                  <div className="grp-line" />
                </div>
              ),
            )}
          </nav>
          {p.sideExtra}
          <div className="side-foot">
            {p.sideFoot?.map((n) => <NavA key={n.to} n={n} />)}
            <button
              type="button"
              className="collapse-btn"
              title={mini ? "Mở rộng" : "Thu gọn"}
              aria-pressed={mini}
              onClick={() => {
                const v = !mini;
                setMini(v);
                window.localStorage.setItem("eduvn-side", v ? "mini" : "");
              }}
            >
              <Icon name="panel" />
              <span>{mini ? "Mở rộng" : "Thu gọn"}</span>
            </button>
          </div>
        </aside>
        <div className="content" style={{ minWidth: 0 }}>
          <header className={compact ? "top compact" : "top"}>
            <button type="button" className="btn ghost icon menu-btn" data-act="drawer" aria-label="Mở menu" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}>
              <Icon name="menu" />
            </button>
            <nav className="crumb" aria-label="Vị trí">
              {shownCrumbs.map((c, i) =>
                i < shownCrumbs.length - 1 ? (
                  <span key={i} style={{ display: "contents" }}>
                    {c.to ? <Link to={c.to} className={i === shownCrumbs.length - 2 ? "parent" : undefined}>{c.label}</Link> : <span className={i === shownCrumbs.length - 2 ? "parent" : undefined}>{c.label}</span>}
                    <span className="sep">/</span>
                  </span>
                ) : (
                  <span key={i} aria-current="page">{c.label}</span>
                ),
              )}
            </nav>
            <div className="grow" />
            <div className="ctx" aria-hidden={!compact} ref={setCtxSlot} />
            <button type="button" className="cmd-trigger" aria-label="Tìm nhanh" onClick={() => setCmdk(true)}>
              <Icon name="search" size="sm" />
              <span className="txt">Tìm nhanh…</span>
              <kbd>Ctrl K</kbd>
            </button>
            {p.topExtra}
            <button type="button" className="btn ghost icon hide-sm" aria-label={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"} title="Đổi sáng/tối" onClick={toggleTheme}>
              <Icon name={theme === "dark" ? "sun" : "moon"} />
            </button>
            <Pop icon={<Icon name="bell" />} label={p.notices.length ? `Thông báo (${p.notices.length} mới)` : "Thông báo"} badge={p.notices.some((n) => n.hot)} wide>
              {(close) => (
                <Suspense fallback={null}>
                  <NoticeList notices={p.notices} close={close} />
                </Suspense>
              )}
            </Pop>
            <Pop icon={p.user.initials} label={`Tài khoản: ${p.user.name}`}>
              {(close) => (
                <Suspense fallback={null}>
                  <AccountMenu user={p.user} items={[{ label: theme === "dark" ? "Giao diện sáng" : "Giao diện tối", icon: theme === "dark" ? "sun" : "moon", run: toggleTheme }, ...p.menu]} close={close} />
                </Suspense>
              )}
            </Pop>
          </header>
          {!online && (
            <Suspense fallback={null}>
              <OfflineBanner savedAt={savedAt} onRetry={() => window.location.reload()} />
            </Suspense>
          )}
          <ViewTransition default="vt-page">
            <main id="main" className="page" ref={main} tabIndex={-1}>
              {p.children}
            </main>
          </ViewTransition>
        </div>
      </div>
      {p.tabs && (
        <nav className="tabbar" aria-label="Điều hướng chính">
          {p.tabs.map((n) =>
            n.href ? (
              <a key={n.to} href={n.href}>
                <Icon name={n.icon ?? "book"} />
                <span>{n.label}</span>
              </a>
            ) : (
              <NavLink key={n.to} to={n.to} end={n.end}>
                <Icon name={n.icon ?? "book"} />
                <span>{n.label}</span>
              </NavLink>
            ),
          )}
        </nav>
      )}
      {cmdkUsed && (
        <Suspense fallback={null}>
          <CommandPalette commands={commands} open={cmdk} onOpenChange={setCmdk} onNavigate={go} />
        </Suspense>
      )}
      <Tooltips />
    </ShellCtx>
  );
}
