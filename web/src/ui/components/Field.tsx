import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, cloneElement, forwardRef, isValidElement, useId } from "react";
import { Icon } from "../Icon";

/** Khung ô nhập: nhãn luôn hiện (không dùng placeholder làm nhãn), gợi ý, lỗi nói cách sửa. */
export function Field({ label, hint, error, children }: { label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-h` : undefined;
  const errId = error ? `${id}-e` : undefined;
  const control = isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(children)
    ? cloneElement(children, { id, "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined, "aria-invalid": error ? true : undefined })
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? (
        <span className="err" id={errId} role="alert">
          <Icon name="alert" size="sm" />
          {error}
        </span>
      ) : hint ? (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: string }>(function Input({ icon, className, ...rest }, ref) {
  const el = <input ref={ref} {...rest} className={["input", className].filter(Boolean).join(" ")} />;
  return icon ? (
    <span className="input-ic">
      <Icon name={icon} size="sm" />
      {el}
    </span>
  ) : (
    el
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, ...rest }, ref) {
  return <select ref={ref} {...rest} className={["select", className].filter(Boolean).join(" ")} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} {...rest} className={["textarea", className].filter(Boolean).join(" ")} />;
});
