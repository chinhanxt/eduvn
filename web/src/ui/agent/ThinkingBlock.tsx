import { useEffect, useState } from "react";
import { Icon } from "../Icon";

/** Khối "đang suy nghĩ": chữ suy nghĩ của model, mở khi đang viết, tự thu lại khi xong (người dùng bấm thì giữ theo ý họ). */
export function ThinkingBlock({ text, active, label }: { text: string; active: boolean; label?: string }) {
  const [open, setOpen] = useState(active);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setOpen(active);
  }, [active, touched]);
  if (!text.trim() && !active) return null;
  return (
    <div className={`ag-think${active ? " is-active" : ""}`}>
      <button type="button" className="ag-think-hd" aria-expanded={open} onClick={() => (setTouched(true), setOpen((o) => !o))}>
        <Icon name="bulb" size="sm" />
        <span className={active ? "ag-shimmer" : undefined}>{label ?? (active ? "Đang suy nghĩ…" : "Suy nghĩ")}</span>
        <Icon name="chev" size="sm" className="ag-chev" />
      </button>
      {open && text.trim() && <div className="ag-think-body">{text.trim()}</div>}
    </div>
  );
}
