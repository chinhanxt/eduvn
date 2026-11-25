import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { Icon } from "../../ui/Icon";
import { MockBadge } from "../kit/MockBadge";
import { LIGHTS, VIEWS, type ParentView } from "./data";
import { toggleDark, useDark } from "./theme";

function Switch({ on, label, icon, onClick }: { on: boolean; label: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" className="ph-row" role="switch" aria-checked={on} onClick={onClick}>
      <Icon name={icon} />
      <span className="lbl">{label}</span>
      <span className={on ? "sw on" : "sw"} aria-hidden="true"><i /></span>
      <span className="state">{on ? "Bật" : "Tắt"}</span>
    </button>
  );
}

/** Cài đặt (tấm trượt từ dưới): chữ to, nền tối, xem trước tin Zalo, đổi hồ sơ mẫu. */
export default function CaiDat({ v, big, onBig, onClose }: { v: ParentView; big: boolean; onBig: () => void; onClose: () => void }) {
  const dark = useDark();
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    box.current?.focus();
    const k = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className="ph-sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ph-sheet" role="dialog" aria-modal="true" aria-label="Cài đặt" ref={box} tabIndex={-1}>
        <h2 className="ph-h2">Cài đặt</h2>
        <Switch on={big} label="Chữ to" icon="eye" onClick={onBig} />
        <Switch on={dark} label="Nền tối" icon="moon" onClick={toggleDark} />

        <p className="ph-sub">Tin Zalo mỗi tối</p>
        <div className="ph-zalo">
          <span className="zav" aria-hidden="true">BM</span>
          <div className="zmsg">
            <b className={`is-${v.light}`}>
              <Icon name={LIGHTS[v.light].icon} />
              {v.child.short}: {LIGHTS[v.light].word}
            </b>
            <p>{v.zalo}</p>
          </div>
        </div>

        <p className="ph-sub">Xem như</p>
        <div className="ph-who">
          {VIEWS.map((x) => (
            <Link key={x.slug} to={`/phu-huynh/${x.slug}`} aria-current={x.slug === v.slug ? "page" : undefined} onClick={onClose}>
              {x.relation} {x.child.short}
            </Link>
          ))}
        </div>

        <button type="button" className="ph-big fill wide" onClick={onClose}>
          <Icon name="check" />
          <span>Xong</span>
        </button>
        <MockBadge className="ph-badge" />
      </div>
    </div>
  );
}
