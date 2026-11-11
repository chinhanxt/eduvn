import type { ReactNode } from "react";
import { Icon } from "../Icon";

/** Chip lọc bật/tắt (aria-pressed); onRemove → nút bỏ ×. */
export function Chip({ pressed, onClick, onRemove, children, count }: { pressed?: boolean; onClick?: () => void; onRemove?: () => void; children: ReactNode; count?: number }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onRemove && pressed ? onRemove : onClick}>
      {children}
      {count !== undefined && <span className="num muted">{count}</span>}
      {onRemove && pressed && <Icon name="x" size="sm" className="x" />}
    </button>
  );
}

export type ChipOption<T extends string> = { value: T; label: ReactNode; count?: number };
/** Nhóm chip: một lựa chọn (single) hoặc nhiều lựa chọn (multiple). */
export function ChipGroup<T extends string>(p: { label: string; options: readonly ChipOption<T>[] } & ({ multiple?: false; value: T | null; onChange: (v: T | null) => void } | { multiple: true; value: readonly T[]; onChange: (v: T[]) => void })) {
  return (
    <div className="row wrap" role="group" aria-label={p.label}>
      {p.options.map((o) => {
        const on = p.multiple ? p.value.includes(o.value) : p.value === o.value;
        const toggle = () => {
          if (p.multiple) p.onChange(on ? p.value.filter((v) => v !== o.value) : [...p.value, o.value]);
          else p.onChange(on ? null : o.value);
        };
        return (
          <Chip key={o.value} pressed={on} onClick={toggle} count={o.count}>
            {o.label}
          </Chip>
        );
      })}
    </div>
  );
}

/** Nhãn trạng thái: luôn có icon + chữ, không chỉ màu. */
export function Badge({ tone = "neutral", icon, children }: { tone?: "neutral" | "ok" | "warn" | "danger" | "accent" | "outline"; icon?: string; children: ReactNode }) {
  const def = { ok: "ok", warn: "alert", danger: "err", accent: "info", neutral: undefined, outline: undefined }[tone];
  const ic = icon ?? def;
  return (
    <span className={tone === "neutral" ? "badge" : `badge ${tone}`}>
      {ic && <Icon name={ic} size="sm" />}
      {children}
    </span>
  );
}

/** Điều khiển phân đoạn (2–4 lựa chọn loại trừ nhau). */
export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
