import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { Icon } from "../../ui/Icon";
import { LIGHTS, VIEWS, type ParentView } from "./data";
import { toggleDark, useDark } from "./theme";

function Switch({ on, label, icon, tone, onClick }: { on: boolean; label: string; icon: string; tone: string; onClick: () => void }) {
  return (
    <button type="button" className="ph-cell" role="switch" aria-checked={on} onClick={onClick}>
      <span className={`ico ${tone}`} aria-hidden="true"><Icon name={icon} /></span>
      <span className="lbl">{label}</span>
      <span className={on ? "ph-switch on" : "ph-switch"} aria-hidden="true"><i /></span>
    </button>
  );
}

/** Cài đặt dạng bảng Settings iOS: chữ to, nền tối, xem trước tin Zalo, đổi hồ sơ mẫu. */
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
        <div className="ph-nav">
          <span />
          <h2>Cài đặt</h2>
          <button type="button" className="ph-link strong" onClick={onClose}>Xong</button>
        </div>

        <div className="ph-group">
          <div className="ph-card list">
            <Switch on={big} label="Chữ to" icon="eye" tone="blue" onClick={onBig} />
            <Switch on={dark} label="Nền tối" icon="moon" tone="indigo" onClick={toggleDark} />
          </div>
        </div>

        <div className="ph-group">
          <p className="ph-sec">Tin Zalo mỗi tối</p>
          <div className="ph-card ph-zalo">
            <span className="zav" aria-hidden="true">BM</span>
            <div className="zmsg">
              <b>Trường Bình Minh</b>
              <p className={`zst is-${v.light}`}><i className="pip" aria-hidden="true" />{v.child.short}: {LIGHTS[v.light].word}</p>
              <p>{v.zalo}</p>
            </div>
          </div>
        </div>

        <div className="ph-group">
          <p className="ph-sec">Xem như</p>
          <div className="ph-card list plain">
            {VIEWS.map((x) => (
              <Link key={x.slug} className="ph-cell" to={`/phu-huynh/${x.slug}`} aria-current={x.slug === v.slug ? "page" : undefined} onClick={onClose}>
                <span className="lbl">
                  {x.relation} {x.child.short}
                  <small>{x.hi[0]!.toUpperCase() + x.hi.slice(1)}</small>
                </span>
                {x.slug === v.slug && <Icon name="check" className="tick" />}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
