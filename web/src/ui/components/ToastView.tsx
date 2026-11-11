import { useCallback, useEffect, useRef } from "react";
import { Icon } from "../Icon";
import { type Item, TOAST_LIFE, TOAST_UNDO_LIFE } from "./Toast";

/** Một toast: tự tắt (4 s / 8 s nếu có Hoàn tác), dừng khi rê/tiêu điểm, mờ ra 200 ms. */
export function ToastView({ t, onClose, onGone }: { t: Item; onClose: () => void; onGone: () => void }) {
  const life = t.life ?? (t.undo ? TOAST_UNDO_LIFE : TOAST_LIFE);
  const left = useRef(life);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const goneRef = useRef(onGone);
  goneRef.current = onGone;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const arm = useCallback(() => {
    clearTimeout(timer.current);
    started.current = Date.now();
    timer.current = setTimeout(() => closeRef.current(), Math.max(0, left.current));
  }, []);
  const pause = () => {
    clearTimeout(timer.current);
    left.current -= Date.now() - started.current;
  };
  useEffect(() => {
    if (t.out) return;
    arm();
    return () => clearTimeout(timer.current);
  }, [arm, t.out]);
  useEffect(() => {
    if (!t.out) return;
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => goneRef.current(), reduce ? 0 : 200);
    return () => clearTimeout(id);
  }, [t.out]);
  const kind = t.kind ?? "ok";
  const act = t.undo ? { label: "Hoàn tác", run: t.undo } : t.action;
  return (
    <div data-testid="toast" className={["toast", kind !== "ok" && kind, t.out && "out"].filter(Boolean).join(" ")} title={t.msg ? `${t.title} — ${t.msg}` : t.title} onMouseEnter={pause} onMouseLeave={arm} onFocus={pause} onBlur={arm}>
      <Icon name={kind} />
      <div className="msg">
        <b>{t.title}</b>
        {t.msg && <span>{t.msg}</span>}
      </div>
      {act && (
        <button
          type="button"
          className="act"
          onClick={() => {
            void act.run();
            onClose();
          }}
        >
          {act.label}
        </button>
      )}
      <button type="button" className="close" aria-label="Đóng" onClick={onClose}>
        <Icon name="x" size="sm" />
      </button>
    </div>
  );
}
