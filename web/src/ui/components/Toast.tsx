import { type ReactNode, createContext, lazy, Suspense, useCallback, useContext, useRef, useState } from "react";

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
export type Item = ToastInput & { id: number; out?: boolean };
// Phần vẽ toast tải khi có toast đầu tiên (không nằm trong JS lần đầu của cổng).
const ToastView = lazy(() => import("./ToastView").then((m) => ({ default: m.ToastView })));

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
        {shown.length > 0 && (
          <Suspense fallback={null}>
            {shown.map((t) => (
              <ToastView key={t.id} t={t} onClose={() => close(t.id)} onGone={() => gone(t.id)} />
            ))}
          </Suspense>
        )}
      </div>
    </Ctx>
  );
}

