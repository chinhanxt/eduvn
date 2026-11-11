import { Link } from "react-router";
import { Icon } from "../Icon";
import type { MenuItem, Notice } from "./nav";

// Nội dung menu bật (tài khoản, thông báo): chỉ tải khi mở lần đầu — không nằm trong JS lần đầu của cổng.

export function MenuList({ items, close }: { items: readonly MenuItem[]; close: () => void }) {
  return (
    <>
      {items.map((m, i) =>
        "sep" in m ? (
          <div className="sep" key={i} role="separator" />
        ) : m.to ? (
          <Link key={i} to={m.to} role="menuitem" onClick={close} className={m.danger ? "danger" : undefined}>
            <Icon name={m.icon} size="sm" />
            <span>{m.label}</span>
          </Link>
        ) : m.href ? (
          <a key={i} href={m.href} role="menuitem" className={m.danger ? "danger" : undefined}>
            <Icon name={m.icon} size="sm" />
            <span>{m.label}</span>
          </a>
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={m.danger ? "danger" : undefined}
            onClick={() => {
              close();
              void m.run?.();
            }}
          >
            <Icon name={m.icon} size="sm" />
            <span>{m.label}</span>
          </button>
        ),
      )}
    </>
  );
}


export function NoticeList({ notices, close }: { notices: readonly Notice[]; close: () => void }) {
  return (
    <>
      <div className="hd">Thông báo</div>
      {notices.length === 0 && <div className="none">Không có gì cần làm gấp.</div>}
      {notices.slice(0, 6).map((n, i) => (
        <Link key={i} to={n.to} role="menuitem" onClick={close} className="notice">
          <i className={n.hot ? "nd hot" : "nd"} />
          <span>
            <b>{n.title}</b>
            {n.sub && <small>{n.sub}</small>}
          </span>
        </Link>
      ))}
    </>
  );
}

export function AccountMenu({ user, items, close }: { user: { name: string; sub: string }; items: readonly MenuItem[]; close: () => void }) {
  return (
    <>
      <div className="who">
        <b>{user.name}</b>
        <small>{user.sub}</small>
      </div>
      <MenuList items={items} close={close} />
    </>
  );
}
