import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

export type ToastKind = "ok" | "err" | "info";
export type ToastInput = {
  title: string;
  msg?: string;
  kind?: ToastKind;
  /** Có → nút "Hoàn tác", sống 8 s. */
  undo?: () => unknown;
  /** Nút khác (vd "Thử lại"). */
  action?: { label: string; run: () => unknown };
  life?: number;
};
type Item = ToastInput & { id: number; out?: boolean };

export const MAX_TOASTS = 2;
export const TOAST_LIFE = 4000;
export const TOAST_UNDO_LIFE = 8000;

const Ctx = createContext<((t: ToastInput) => void) | null>(null);
/** toast({ title, msg, kind, undo }) — nhẹ, một dòng, tối đa 2 cái, còn lại xếp hàng. */
export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast ngoài <ToastProvider>");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Item[]>([]);
  const queue = useRef<Item[]>([]);
  const seq = useRef(0);
  const pump = useCallback(() => {
    setShown((cur) => {
      const live = cur.filter((t) => !t.out).length;
      if (live >= MAX_TOASTS || !queue.current.length) return cur;
      const add = queue.current.splice(0, MAX_TOASTS - live);
      return [...cur, ...add];
    });
  }, []);
  const push = useCallback(
    (t: ToastInput) => {
      queue.current.push({ ...t, id: ++seq.current });
      pump();
    },
    [pump],
  );
  const close = useCallback((id: number) => setShown((cur) => cur.map((t) => (t.id === id ? { ...t, out: true } : t))), []);
  const gone = useCallback(
    (id: number) => {
      setShown((cur) => cur.filter((t) => t.id !== id));
      queueMicrotask(pump);
    },
    [pump],
  );
  return (
    <Ctx value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {shown.map((t) => (
          <ToastView key={t.id} t={t} onClose={() => close(t.id)} onGone={() => gone(t.id)} />
        ))}
      </div>
    </Ctx>
  );
}

function ToastView({ t, onClose, onGone }: { t: Item; onClose: () => void; onGone: () => void }) {
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
    <div className={["toast", kind !== "ok" && kind, t.out && "out"].filter(Boolean).join(" ")} title={t.msg ? `${t.title} — ${t.msg}` : t.title} onMouseEnter={pause} onMouseLeave={arm} onFocus={pause} onBlur={arm}>
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
