// web/src/omr/ui.tsx — mảnh giao diện dùng trong trang /cham-anh: toast, nút khoá theo promise, vùng thả ảnh.
// Theo hệ thiết kế v2 (Toast: góc phải dưới, tối đa 2, 4 s; Nút: aria-busy, giữ bề rộng, bấm lặp không gửi thêm).
import { type ReactNode, useCallback, useRef, useState } from "react";
import { useToast as useUiToast } from "../ui/components/Toast";
import { errText } from "../api";
import { Icon } from "../Icon";

type ToastKind = "ok" | "err" | "info";
type ToastFn = (kind: ToastKind, text: string) => void;
/** Toast của trang dùng gói ui/ chung (một vùng toast cho cả cổng GV: tối đa 2, 4 s; lỗi 6 s). */
export function useToast(): ToastFn {
  const toast = useUiToast();
  return useCallback<ToastFn>((kind, text) => toast({ title: text, kind, life: kind === "err" ? 6000 : undefined }), [toast]);
}
/** Giữ API cũ của trang: vùng toast nay do ToastProvider của cổng GV dựng. */
export function ToastHost({ children }: { children: ReactNode }) {
  return <>{children}</>;
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
    <button {...p} className={`pg-btn ${kind ?? ""} ${p.className ?? ""}`} aria-busy={busy || undefined} disabled={p.disabled || busy}>
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
