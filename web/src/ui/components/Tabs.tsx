import { type KeyboardEvent, type ReactNode, useRef } from "react";

export type TabItem<T extends string> = { value: T; label: ReactNode; count?: number };
/** Tab (role=tablist), ← → chuyển tab. Đường dẫn/URL do nơi gọi giữ (pushState khi đổi tab). */
export function Tabs<T extends string>({ label, items, value, onChange, className }: { label: string; items: readonly TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const j = (i + d + items.length) % items.length;
    refs.current[j]?.focus();
    onChange(items[j]!.value);
  };
  return (
    <div className={["tabs", className].filter(Boolean).join(" ")} role="tablist" aria-label={label}>
      {items.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => void (refs.current[i] = el)}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => key(e, i)}
        >
          {t.label}
          {t.count !== undefined && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
