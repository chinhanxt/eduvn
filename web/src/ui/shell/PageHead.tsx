import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { Icon } from "../Icon";
import { useShell } from "./AppShell";

export type Primary = { label: string; icon?: string; kbd?: string; to?: string; onClick?: () => unknown };

function PrimaryBtn({ p, small, tabIndex }: { p: Primary; small?: boolean; tabIndex?: number }) {
  const cls = small ? "btn primary sm" : "btn primary sm";
  const inner = (
    <>
      {p.icon && <Icon name={p.icon} size="sm" />}
      <span>{p.label}</span>
      {p.kbd && <kbd className="k">{p.kbd}</kbd>}
    </>
  );
  return p.to ? (
    <Link className={cls} to={p.to} tabIndex={tabIndex}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={() => void p.onClick?.()} tabIndex={tabIndex}>
      {inner}
    </button>
  );
}

/**
 * Đầu trang cổng GV (skin B, một dòng: tiêu đề · tab lọc · nút chính). Khi khối nút cuộn khuất dưới thanh trên,
 * nút chính được nhân bản lên thanh trên (thanh gọn) — như shell2.js của mockup.
 */
export function PageHead({ title, tabs, primary, children, className = "page-head bar" }: { title: ReactNode; tabs?: ReactNode; primary?: Primary; children?: ReactNode; className?: string }) {
  const shell = useShell();
  const acts = useRef<HTMLDivElement>(null);
  const compact = useRef(false);
  useEffect(() => {
    const el = acts.current;
    if (!el || !shell || !primary) return;
    const topH = (document.querySelector(".top") as HTMLElement | null)?.offsetHeight ?? 48;
    const io = new IntersectionObserver(
      ([en]) => {
        const on = !!en && !en.isIntersecting;
        compact.current = on;
        shell.setCompact(on);
      },
      { rootMargin: `-${topH}px 0px 0px 0px` },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      shell.setCompact(false);
    };
  }, [shell, primary]);
  return (
    <div className={className}>
      <h1>{title}</h1>
      {tabs}
      {(primary || children) && (
        <div className="acts" ref={acts}>
          {children}
          {primary && <PrimaryBtn p={primary} />}
        </div>
      )}
      {primary && shell?.ctxSlot && createPortal(<PrimaryBtn p={primary} small tabIndex={-1} />, shell.ctxSlot)}
    </div>
  );
}
