import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { trapTab } from "./focus";

/** Hộp thoại xác nhận — chỉ cho việc không đảo ngược (xoá lớp, nộp bài). Esc/bấm nền đóng, giữ Tab trong hộp, trả tiêu điểm khi đóng. */
export function Dialog({ open, title, children, onClose, footer, labelledBy }: { open: boolean; title: ReactNode; children?: ReactNode; onClose: () => void; footer?: ReactNode; labelledBy?: string }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = requestAnimationFrame(() => {
      const el = box.current?.querySelector<HTMLElement>("[data-autofocus]") ?? box.current?.querySelector<HTMLElement>("button, input, select, textarea");
      el?.focus();
    });
    return () => {
      cancelAnimationFrame(t);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy ?? id}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
          trapTab(e, box.current);
        }}
      >
        <div className="hd">
          <h2 id={id}>{title}</h2>
        </div>
        {children && <div className="bd">{children}</div>}
        {footer && <div className="ft">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Xác nhận nguy hiểm: nút an toàn bên trái, nút nguy hiểm đỏ bên phải; onConfirm trả promise → nút khoá đến khi xong. */
export function ConfirmDialog({ open, title, text, confirmLabel, cancelLabel = "Huỷ", danger = true, onConfirm, onClose }: { open: boolean; title: ReactNode; text?: ReactNode; confirmLabel: string; cancelLabel?: string; danger?: boolean; onConfirm: () => unknown; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose} data-autofocus>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            className={danger ? "danger-solid" : undefined}
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {text}
    </Dialog>
  );
}
