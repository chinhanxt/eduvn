import { type ButtonHTMLAttributes, type MouseEvent, type ReactNode, forwardRef, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

export type ButtonVariant = "default" | "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
type Own = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  /** Icon sau chữ (vd mũi tên "Làm tiếp"). */
  iconEnd?: string;
  /** Phím tắt in mờ trong nút. */
  kbd?: string;
  /** Đang xử lý do nơi gọi điều khiển (vd từ useAction). */
  busy?: boolean;
  /** Nhãn hiện 1,4 s sau khi xong (✓ + nhãn). */
  doneLabel?: string;
  pressed?: boolean;
  /** onClick trả promise → nút tự khoá đến khi xong (bấm lặp bị bỏ qua). */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => unknown;
  children?: ReactNode;
};
export type ButtonProps = Own & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Own>;

export const DONE_MS = 1400;

/** Nút v2: khoá khi đang xử lý (aria-busy, giữ bề rộng, vòng quay), trạng thái xong ✓ rồi trở lại. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "default", size = "md", icon, iconEnd, kbd, busy, doneLabel, pressed, onClick, className, children, type = "button", disabled, style, ...rest },
  ref,
) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [minW, setMinW] = useState<number | undefined>();
  const self = useRef<HTMLButtonElement | null>(null);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  const isBusy = !!busy || pending;
  useEffect(() => {
    if (isBusy && self.current) setMinW(self.current.offsetWidth);
    if (!isBusy) setMinW(undefined);
  }, [isBusy]);

  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    if (isBusy || done) {
      e.preventDefault();
      return;
    }
    const r = onClick?.(e);
    if (r && typeof (r as Promise<unknown>).then === "function") {
      if (self.current) setMinW(self.current.offsetWidth);
      setPending(true);
      (r as Promise<unknown>).then(
        () => {
          if (!alive.current) return;
          setPending(false);
          if (doneLabel) {
            setDone(true);
            setTimeout(() => alive.current && setDone(false), DONE_MS);
          }
        },
        () => alive.current && setPending(false),
      );
    }
  };
  const cls = ["btn", variant !== "default" && variant, size !== "md" && size, !children && (icon || iconEnd) && "icon", done && "is-done", className].filter(Boolean).join(" ");
  return (
    <button
      {...rest}
      ref={(el) => {
        self.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      }}
      type={type}
      className={cls}
      disabled={disabled}
      aria-busy={isBusy || undefined}
      aria-pressed={pressed}
      style={minW ? { ...style, minWidth: minW } : style}
      onClick={handle}
    >
      {done ? (
        <>
          <Icon name="check" size="sm" />
          <span>{doneLabel}</span>
        </>
      ) : (
        <>
          {icon && <Icon name={icon} size={size === "lg" ? "md" : "sm"} />}
          {children !== undefined && children !== null && children !== false && (typeof children === "string" ? <span>{children}</span> : children)}
          {iconEnd && <Icon name={iconEnd} size="sm" />}
          {kbd && <kbd className="k">{kbd}</kbd>}
        </>
      )}
    </button>
  );
});

/** Nút chỉ có icon: bắt buộc nhãn cho trình đọc màn hình. */
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, "children" | "icon"> & { icon: string; label: string }>(function IconButton({ icon, label, variant = "ghost", ...rest }, ref) {
  return <Button ref={ref} {...rest} variant={variant} icon={icon} aria-label={label} title={rest.title ?? label} />;
});
