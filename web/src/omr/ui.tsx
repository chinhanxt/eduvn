// web/src/omr/ui.tsx — mảnh giao diện dùng trong trang /cham-anh: toast, nút khoá theo promise, vùng thả ảnh.
// Theo hệ thiết kế v2 (Toast: góc phải dưới, tối đa 2, 4 s; Nút: aria-busy, giữ bề rộng, bấm lặp không gửi thêm).
import { type ReactNode, createContext, useCallback, useContext, useRef, useState } from "react";
import { errText } from "../api";
import { Icon } from "../Icon";

type ToastKind = "ok" | "err" | "info";
type ToastItem = { id: number; kind: ToastKind; text: string };
type ToastFn = (kind: ToastKind, text: string) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback<ToastFn>((kind, text) => {
    const id = ++seq.current;
    setItems((l) => [...l, { id, kind, text }].slice(-2));
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), kind === "err" ? 6000 : 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pg-toasts" aria-live="polite" role="status">
        {items.map((t) => (
          <div key={t.id} className={`pg-toast ${t.kind}`} data-testid="pg-toast">
            <Icon name={t.kind === "ok" ? "checkc" : t.kind === "err" ? "alert" : "spark"} size={16} />
            <span>{t.text}</span>
            <button className="pg-btn quiet icon sm" aria-label="Đóng" onClick={() => setItems((l) => l.filter((x) => x.id !== t.id))}><Icon name="x" size={14} /></button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Khoá theo promise: đang chạy thì bấm thêm bị bỏ qua (chặn gửi lặp). Lỗi → toast. */
export function useLock() {
  const toast = useToast();
  const live = useRef(false);
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (f: () => Promise<void>) => {
      if (live.current) return;
      live.current = true;
      setBusy(true);
      try {
        await f();
      } catch (e) {
        toast("err", e instanceof Error && !("status" in e) ? e.message : errText(e));
      } finally {
        live.current = false;
        setBusy(false);
      }
    },
    [toast],
  );
  return [run, busy] as const;
}

export function Btn({ busy, kind, children, ...p }: { busy?: boolean; kind?: "pri" | "quiet" | "sm" | string; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={`pg-btn ${kind ?? ""} ${p.className ?? ""}`} aria-busy={busy || undefined} disabled={p.disabled}>
      {busy && <i className="pg-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Vùng kéo thả nhiều ảnh + nút chọn ảnh / chụp. */
export function Dropzone({ title, hint, onFiles, compact, capture, testId }: { title: string; hint: string; onFiles: (f: File[]) => void; compact?: boolean; capture?: boolean; testId: string }) {
  const [over, setOver] = useState(false);
  const pick = (l: FileList | null) => {
    const files = [...(l ?? [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };
  return (
    <div
      className={`pg-drop${over ? " over" : ""}${compact ? " compact" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      data-testid={`${testId}-drop`}
    >
      <span className="ic"><Icon name="camera" /></span>
      <div><b>{title}</b><p>{hint}</p></div>
      <div className="acts">
        <label className="pg-btn pri">
          <Icon name="upload" />Chọn ảnh
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} data-testid={`${testId}-file`} />
        </label>
        {capture && (
          <label className="pg-btn">
            <Icon name="camera" />Chụp
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
    </div>
  );
}

export const num = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);
