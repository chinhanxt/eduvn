// web/src/omr/ui.tsx — mảnh giao diện dùng trong trang /cham-anh: toast, nút khoá theo promise, vùng thả ảnh.
// Theo hệ thiết kế v2 (Toast: góc phải dưới, tối đa 2, 4 s; Nút: aria-busy, giữ bề rộng, bấm lặp không gửi thêm).
import { type ReactNode, useCallback, useRef, useState } from "react";
import { useToast as useUiToast } from "../ui/components/Toast";
import { errText } from "../api";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/components/Button";

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

/** Nút của trang chấm = Button v2 (khoá khi đang xử lý, giữ bề rộng, vòng quay). kind: "pri" | "quiet" | "icon" (ghép bằng dấu cách; mọi nút cao 30 px như skin B). */
export function Btn({ busy, kind = "", children, className, onClick, ...p }: { busy?: boolean; kind?: string; children: ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  const k = kind.split(/\s+/);
  return (
    <Button
      {...p}
      onClick={onClick}
      busy={busy}
      variant={k.includes("pri") ? "primary" : k.includes("quiet") ? "ghost" : "default"}
      size="sm"
      className={[k.includes("icon") && "icon", className].filter(Boolean).join(" ") || undefined}
    >
      {children}
    </Button>
  );
}

/** Vùng kéo thả nhiều ảnh + nút chọn ảnh / chụp. */
export function Dropzone({ title, hint, onFiles, compact, capture, testId, hero }: { title: string; hint: string; onFiles: (f: File[]) => void; compact?: boolean; capture?: boolean; testId: string; hero?: ReactNode }) {
  const [over, setOver] = useState(false);
  const pick = (l: FileList | null) => {
    const files = [...(l ?? [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) onFiles(files);
  };
  return (
    <div
      className={`pg-drop${over ? " over" : ""}${compact ? " compact" : ""}${hero && !compact ? " hero" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
      data-testid={`${testId}-drop`}
    >
      {hero && !compact ? <div className="art" aria-hidden="true">{hero}</div> : <span className="ic"><Icon name="camera" /></span>}
      <div className="txt"><b>{title}</b><p>{hint}</p></div>
      <div className="acts">
        <label className="btn primary sm">
          <Icon name="upload" />Chọn ảnh
          <input type="file" accept="image/*" multiple hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} data-testid={`${testId}-file`} />
        </label>
        {capture && (
          <label className="btn sm">
            <Icon name="camera" />Chụp
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
    </div>
  );
}

export const num = (n: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(n);

/** Hình phiếu trắc nghiệm → ảnh chụp → điểm (trạng thái trống của "Quét phiếu"). */
export function SheetArt() {
  const rows = [1, 3, 0, 2, 1, 3, 2, 0];
  return (
    <svg viewBox="0 0 320 200" className="pg-art">
      <g className="sheet" transform="rotate(-4 90 100)">
        <rect x="20" y="14" width="140" height="180" rx="4" className="paper" />
        {[[26, 20], [146, 20], [26, 180], [146, 180]].map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" className="ink" />)}
        <rect x="44" y="26" width="60" height="5" rx="2.5" className="ln" />
        <rect x="118" y="24" width="20" height="20" className="qr" />
        {rows.map((on, r) => (
          <g key={r} transform={`translate(44 ${56 + r * 15})`}>
            <text x="-8" y="4" className="no">{r + 1}</text>
            {[0, 1, 2, 3].map((c) => <circle key={c} cx={c * 22 + 6} cy="0" r="5" className={c === on ? "on" : "off"} style={{ ["--d" as string]: `${r * 60 + c * 10}ms` }} />)}
          </g>
        ))}
      </g>
      <path d="M176 100h34" className="arrow" />
      <path d="M204 94l8 6-8 6" className="arrow" />
      <g transform="translate(222 52)">
        <rect width="84" height="96" rx="10" className="card" />
        <text x="42" y="26" className="lbl">Điểm</text>
        <text x="42" y="64" className="score">8,5</text>
        <rect x="16" y="76" width="52" height="5" rx="2.5" className="ok" />
      </g>
    </svg>
  );
}
